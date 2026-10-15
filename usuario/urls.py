from django.urls import path
from . import views, EdicaoPerfil

urlpatterns = [
    path('', views.login, name='login'),

    path('cadastro/', views.cadastro, name='cadastro'),

    path(
        'disciplinas/',
        views.filtrar_disciplinas,
        name='filtrar_disciplinas'
    ),

    path(
        'formacao-geral/',
        views.filtrar_formacao_geral,
        name='filtrar_formacao_geral'
    ),

    path('home/', views.home, name='home'),

    path('perfil/', views.perfil, name='perfil'),

    path('tarefas/', views.tarefas, name='tarefas'),

    path('duvidas/', views.duvidas, name='duvidas'),

    path('estatisticas/', views.estatisticas, name='estatisticas'),

    path('manual/', views.manual, name='manual'),

    path('atualizar_disciplinas/', EdicaoPerfil.atualizar_disciplinas, name='atualizar_disciplinas'),

    path(
        'criar-atividade/',
        views.criar_atividade,
        name='criar_atividade'
    ),

    path(
        'listar-atividades/',
        views.listar_atividades,
        name='listar_atividades'
    ),

    path(
        'editar-atividade/',
        views.editar_atividade,
        name='editar_atividade'
    ),

    path(
        'excluir-atividade/',
        views.excluir_atividade,
        name='excluir_atividade'
    ),

    path(
    'perfil/atualizar/',
    views.atualizar_perfil,
    name='atualizar_perfil'
    ),

    path('salvar-cadastro/', views.salvar_cadastro, name='salvar_cadastro'),
]