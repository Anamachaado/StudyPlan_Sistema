"""
Curso e disciplinas na edição de perfil.

- montar_dados_academicos(aluno): dados que a página de perfil mostra e que o
  passo a passo de troca usa como ponto de partida.
- atualizar_disciplinas: salva o novo curso e as novas disciplinas do aluno.

As notas (Atividade) NÃO são apagadas quando uma disciplina sai da lista: elas
ficam guardadas e voltam a aparecer se o aluno escolher a disciplina de novo.
"""

import logging

from django.db import transaction
from django.db.models import Q
from django.http import JsonResponse
from django.views.decorators.http import require_POST

from sistema.models import Curso, Disciplina

logger = logging.getLogger(__name__)


def montar_dados_academicos(aluno):
    """Curso atual, todos os cursos e as disciplinas que o aluno escolheu."""

    cursos = list(Curso.objects.order_by("nome").values("id", "nome"))

    disciplinas = [
        {
            "id": d.id,
            "nome": d.nome,
            # ano da série (1, 2 ou 3); None = Formação Geral
            "serie": d.serie.ano if d.serie_id else None,
        }
        for d in aluno.disciplinas_escolhidas.select_related("serie").all()
    ]

    disciplinas.sort(key=lambda d: (d["serie"] is None, d["serie"] or 0, d["nome"]))

    return {
        "curso_id": aluno.curso_id,
        "curso_nome": aluno.curso.nome if aluno.curso_id else None,
        "cursos": cursos,
        "disciplinas": disciplinas,
    }


def _ids_validos(valores):
    """Converte a lista de ids recebida em números, sem repetir. Devolve None se algum for inválido."""
    ids = set()

    for valor in valores:
        try:
            ids.add(int(valor))
        except (TypeError, ValueError):
            return None

    return ids


@require_POST
def atualizar_disciplinas(request):

    # Chamada feita pela tela (fetch): responde em JSON, sem redirecionar
    if not request.user.is_authenticated:
        return JsonResponse({"erro": "Faça login para continuar."}, status=401)

    aluno = request.user

    try:
        curso = Curso.objects.get(id=request.POST.get("curso"))
    except (Curso.DoesNotExist, ValueError, TypeError):
        return JsonResponse({"erro": "Escolha um curso válido."}, status=400)

    ids = _ids_validos(request.POST.getlist("disciplinas"))

    if ids is None:
        return JsonResponse({"erro": "Disciplina inválida."}, status=400)

    if not ids:
        return JsonResponse({"erro": "Selecione pelo menos uma disciplina."}, status=400)

    # Só vale Formação Geral (sem série) ou disciplina do curso escolhido:
    # as mesmas que o cadastro oferece.
    permitidas = list(
        Disciplina.objects
        .filter(id__in=ids)
        .filter(Q(serie__isnull=True) | Q(cursos__id=curso.id))
        .distinct()
    )

    if len(permitidas) != len(ids):
        return JsonResponse(
            {"erro": "Algumas disciplinas não pertencem ao curso escolhido."},
            status=400,
        )

    try:
        with transaction.atomic():
            aluno.curso = curso
            aluno.save(update_fields=["curso"])
            aluno.disciplinas_escolhidas.set(permitidas)

    except Exception:
        logger.exception("Erro ao salvar curso e disciplinas do aluno %s", aluno.pk)

        return JsonResponse(
            {"erro": "Não foi possível salvar. Tente novamente."},
            status=500,
        )

    return JsonResponse({
        "ok": True,
        "curso": curso.nome,
        "total": len(permitidas),
    })