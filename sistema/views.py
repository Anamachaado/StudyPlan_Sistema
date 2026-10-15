from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .models import Curso
from .serializers import CursoSerializer, DisciplinaSerializer


class CursoListView(APIView):

    def get(self, request):
        cursos = Curso.objects.all().order_by('nome')

        serializer = CursoSerializer(
            cursos,
            many=True
        )

        return Response(serializer.data)


class CursoDisciplinasView(APIView):

    def get(self, request, curso_id):

        serie_id = request.GET.get('serie')

        try:
            curso = Curso.objects.get(id=curso_id)
        except Curso.DoesNotExist:
            return Response(
                {'erro': 'Curso não encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )

        disciplinas = curso.disciplinas.filter(
            serie_id=serie_id
        ).order_by('nome')

        serializer = DisciplinaSerializer(
            disciplinas,
            many=True
        )

        return Response(serializer.data)