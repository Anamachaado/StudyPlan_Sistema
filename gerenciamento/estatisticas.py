"""
Dados da tela de Estatísticas: notas do aluno x média de cada bimestre.

Usa só as disciplinas que o aluno escolheu no cadastro e só as notas que ele
realmente lançou (as mesmas somas da página inicial). Nada é inventado: se não
há atividade lançada, o bimestre aparece como "sem notas".
"""

# Pontos de cada bimestre no CEFET-MG (o ano vale 100) e média de cada um (60%).
MAXIMO_BIMESTRE = {"1": 20, "2": 30, "3": 20, "4": 30}
MEDIA_BIMESTRE = {"1": 12, "2": 18, "3": 12, "4": 18}
META_ANO = 60

BIMESTRES = ("1", "2", "3", "4")


def _numero(valor):
    """Arredonda e devolve inteiro quando possível (14.0 vira 14)."""
    valor = round(float(valor or 0), 2)
    return int(valor) if valor == int(valor) else valor


def _status_bimestre(lancado, nota, media):
    if not lancado:
        return "sem_notas"

    if nota > media:
        return "acima"

    if nota == media:
        return "na_media"

    return "abaixo"


def _montar_disciplina(disciplina_id, nome, por_bimestre):
    """
    por_bimestre: {"1": (total, quantidade), ...} só com os bimestres que têm atividade.
    """
    bimestres = []
    total = 0
    lancados_nota = 0
    lancados_media = 0
    lancados_maximo = 0

    for bim in BIMESTRES:
        soma, quantidade = por_bimestre.get(bim, (0, 0))

        lancado = quantidade > 0
        nota = _numero(soma) if lancado else 0
        media = MEDIA_BIMESTRE[bim]
        maximo = MAXIMO_BIMESTRE[bim]

        total += nota

        if lancado:
            lancados_nota += nota
            lancados_media += media
            lancados_maximo += maximo

        bimestres.append({
            "numero": int(bim),
            "nota": nota,
            "maximo": maximo,
            "media": media,
            "lancado": lancado,
            "status": _status_bimestre(lancado, nota, media),
            "diferenca": _numero(nota - media) if lancado else None,
        })

    total = _numero(total)
    falta = _numero(max(META_ANO - total, 0))
    diferenca = _numero(lancados_nota - lancados_media)
    com_notas = any(b["lancado"] for b in bimestres)

    if total >= META_ANO:
        status = "aprovado"
    elif not com_notas:
        status = "sem_notas"
    elif diferenca >= 0:
        status = "na_media"
    else:
        status = "abaixo"

    return {
        "id": disciplina_id,
        "nome": nome,
        "bimestres": bimestres,
        "total": total,
        "meta": META_ANO,
        "falta": falta,
        "progresso_meta": round(min(total / META_ANO * 100, 100), 1),
        "aproveitamento": (
            round(lancados_nota / lancados_maximo * 100, 1)
            if lancados_maximo else None
        ),
        "diferenca": diferenca,
        "status": status,
    }


def _montar(disciplinas, linhas):
    """
    Parte sem banco de dados (fácil de testar).
    disciplinas: [(id, nome), ...]
    linhas: [{"disciplina_id": 1, "bimestre": "2", "total": 14.5, "quantidade": 3}, ...]
    """
    por_disciplina = {}

    for linha in linhas:
        por_disciplina.setdefault(linha["disciplina_id"], {})[str(linha["bimestre"])] = (
            linha["total"] or 0,
            linha["quantidade"] or 0,
        )

    resultado = [
        _montar_disciplina(disc_id, nome, por_disciplina.get(disc_id, {}))
        for disc_id, nome in disciplinas
    ]

    resumo = {
        "total_disciplinas": len(resultado),
        "na_media": sum(1 for d in resultado if d["status"] in ("aprovado", "na_media")),
        "abaixo": sum(1 for d in resultado if d["status"] == "abaixo"),
        "sem_notas": sum(1 for d in resultado if d["status"] == "sem_notas"),
    }

    return {"disciplinas": resultado, "resumo": resumo}


def montar_estatisticas(aluno):
    """Lê o banco e devolve {"disciplinas": [...], "resumo": {...}} para o aluno."""
    from django.db.models import Count, Sum
    from sistema.models import Atividade

    disciplinas = list(
        aluno.disciplinas_escolhidas.order_by("nome").values_list("id", "nome")
    )

    linhas = (
        Atividade.objects
        .filter(aluno=aluno, disciplina_id__in=[d[0] for d in disciplinas])
        .values("disciplina_id", "bimestre")
        .annotate(total=Sum("valor"), quantidade=Count("id"))
    )

    return _montar(disciplinas, list(linhas))
