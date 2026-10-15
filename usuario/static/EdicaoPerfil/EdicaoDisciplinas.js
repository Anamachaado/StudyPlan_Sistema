/* =========================================================
   PERFIL  -  Trocar de curso e de disciplinas
   Arquivo: static/EdicaoPerfil/EdicaoDisciplinas.js

   Mostra o curso e as disciplinas do aluno e abre um passo a passo
   parecido com o do cadastro:
       1) curso   2) série + disciplinas do curso   3) formação geral
   Precisa da constante urlAtualizarDisciplinas (definida no HTML)
   e usa as rotas /disciplinas/ e /formacao-geral/ do cadastro.
   ========================================================= */

(function () {

    "use strict";

    const fonte = document.getElementById("dados-academicos");

    if (!fonte) {
        return;
    }

    let dados;

    try {
        dados = JSON.parse(fonte.textContent);
    } catch (erro) {
        return;
    }


    const NOME_SERIE = { 1: "1º ano", 2: "2º ano", 3: "3º ano" };

    const TITULOS = [
        "Escolha seu curso",
        "Escolha as disciplinas do curso",
        "Formação Geral"
    ];


    // ---------- Utilitários ----------

    function criar(tag, classe, texto) {

        const elemento = document.createElement(tag);

        if (classe) {
            elemento.className = classe;
        }

        if (texto !== undefined) {
            elemento.textContent = texto;
        }

        return elemento;

    }

    function porId(id) {

        return document.getElementById(id);

    }

    function obterCsrfToken() {

        const parte = document.cookie
            .split(";")
            .map((p) => p.trim())
            .find((p) => p.startsWith("csrftoken="));

        return parte ? decodeURIComponent(parte.substring("csrftoken=".length)) : "";

    }

    function iconeDoCurso(nome) {

        if (nome.indexOf("Mecatrônica") !== -1) {
            return "bot";
        }

        if (nome.indexOf("Informática") !== -1) {
            return "monitor";
        }

        if (nome.indexOf("Edificações") !== -1) {
            return "building-2";
        }

        return "book-open";

    }

    async function buscarLista(url) {

        const resposta = await fetch(url, { credentials: "same-origin" });

        if (!resposta.ok) {
            throw new Error("Erro ao buscar as disciplinas.");
        }

        return resposta.json();

    }

    function criarIcones() {

        if (window.lucide) {
            window.lucide.createIcons();
        }

    }


    // ---------- 1) O que o aluno tem hoje ----------

    function mostrarDisciplinasAtuais() {

        const caixa = porId("ed-disciplinas-atuais");

        // A lista não aparece mais na tela de perfil
        if (!caixa) {
            return;
        }

        caixa.textContent = "";

        if (dados.disciplinas.length === 0) {

            caixa.appendChild(criar("p", "ed-vazio", "Nenhuma disciplina selecionada"));

            return;

        }

        const grupos = [];

        dados.disciplinas.forEach((disciplina) => {

            const titulo = disciplina.serie === null
                ? "Formação geral"
                : "Formação técnica · " + (NOME_SERIE[disciplina.serie] || disciplina.serie + "º ano");

            let grupo = grupos.find((g) => g.titulo === titulo);

            if (!grupo) {
                grupo = { titulo: titulo, nomes: [] };
                grupos.push(grupo);
            }

            grupo.nomes.push(disciplina.nome);

        });

        grupos.forEach((grupo) => {

            const bloco = criar("div", "ed-grupo");

            bloco.appendChild(criar("p", "ed-grupo-titulo", grupo.titulo));

            const fichas = criar("div", "ed-fichas");

            grupo.nomes.forEach((nome) => fichas.appendChild(criar("span", "ed-ficha", nome)));

            bloco.appendChild(fichas);

            caixa.appendChild(bloco);

        });

    }

    mostrarDisciplinasAtuais();


    // Aviso depois de salvar (a página recarrega para atualizar o menu também)
    if (sessionStorage.getItem("ed-sucesso")) {

        sessionStorage.removeItem("ed-sucesso");

        const aviso = porId("aviso-sucesso");

        if (aviso) {
            aviso.hidden = false;
        }

    }


    // ---------- 2) Passo a passo ----------

    const janela = porId("modalDisciplinas");

    const botaoAbrir = porId("botao-alterar-curso");

    if (!janela || !botaoAbrir) {
        return;
    }

    const botaoVoltar = porId("ed-voltar");

    const botaoProximo = porId("ed-proximo");

    const aviso = porId("ed-aviso");

    let etapa = 1;

    let cursoEscolhido = "";

    let cursoDasSeries = "";

    let serieAtual = "1";

    let selecionadas = new Set();

    let cacheSeries = {};

    let listaFormacaoGeral = [];

    let idsFormacaoGeral = new Set();

    let formacaoGeralCarregada = false;

    let salvando = false;


    function mostrarAviso(texto) {

        aviso.textContent = texto || "";

    }


    function totalPorTipo() {

        let geral = 0;

        selecionadas.forEach((id) => {

            if (idsFormacaoGeral.has(id)) {
                geral += 1;
            }

        });

        return { geral: geral, tecnicas: selecionadas.size - geral };

    }


    // Etapa 1: cursos

    function desenharCursos() {

        const caixa = porId("ed-cursos");

        caixa.textContent = "";

        dados.cursos.forEach((curso) => {

            const rotulo = criar("label", "ed-curso");

            const radio = document.createElement("input");

            radio.type = "radio";

            radio.name = "ed-curso";

            radio.value = String(curso.id);

            radio.checked = String(curso.id) === cursoEscolhido;

            radio.addEventListener("change", () => {

                cursoEscolhido = radio.value;

                mostrarAviso("");

                atualizarNotaDeTroca();

            });

            const cartao = criar("span", "ed-curso-cartao");

            const icone = document.createElement("i");

            icone.setAttribute("data-lucide", iconeDoCurso(curso.nome));

            cartao.appendChild(icone);

            cartao.appendChild(criar("span", "ed-curso-nome", curso.nome));

            rotulo.appendChild(radio);

            rotulo.appendChild(cartao);

            caixa.appendChild(rotulo);

        });

        criarIcones();

        atualizarNotaDeTroca();

    }

    function atualizarNotaDeTroca() {

        const nota = porId("ed-nota-troca");

        const mudou = dados.curso_id !== null && cursoEscolhido !== "" && cursoEscolhido !== String(dados.curso_id);

        nota.hidden = !mudou;

    }


    // Etapa 2: séries e disciplinas do curso

    function marcarSerie() {

        document.querySelectorAll("#ed-series button").forEach((botao) => {

            const ativa = botao.dataset.serie === serieAtual;

            botao.classList.toggle("ativa", ativa);

            botao.setAttribute("aria-selected", ativa ? "true" : "false");

        });

    }

    function atualizarContador() {

        const total = totalPorTipo();

        porId("ed-contador").textContent =
            selecionadas.size + (selecionadas.size === 1 ? " disciplina selecionada" : " disciplinas selecionadas")
            + " (" + total.tecnicas + " técnicas e " + total.geral + " de formação geral)";

        atualizarBotoesTodas();

    }


    // Marcar / desmarcar todas as disciplinas da lista que está na tela

    function listaAtualTecnicas() {

        return cacheSeries[cursoEscolhido + "-" + serieAtual] || [];

    }

    function atualizarBotaoTodas(botao, disciplinas) {

        if (!botao) {
            return;
        }

        const todas = disciplinas.length > 0
            && disciplinas.every((d) => selecionadas.has(String(d.id)));

        botao.textContent = todas ? "Desmarcar todas" : "Marcar todas";

        botao.hidden = disciplinas.length === 0;

    }

    function atualizarBotoesTodas() {

        atualizarBotaoTodas(porId("ed-todas-tecnicas"), listaAtualTecnicas());

        atualizarBotaoTodas(porId("ed-todas-fg"), listaFormacaoGeral);

    }

    function alternarTodas(disciplinas, caixa) {

        const todas = disciplinas.every((d) => selecionadas.has(String(d.id)));

        disciplinas.forEach((d) => {

            const id = String(d.id);

            if (todas) {
                selecionadas.delete(id);
            } else {
                selecionadas.add(id);
            }

        });

        mostrarAviso("");

        desenharLista(caixa, disciplinas);

        atualizarContador();

    }


    function desenharLista(caixa, disciplinas) {

        caixa.textContent = "";

        disciplinas.forEach((disciplina) => {

            const id = String(disciplina.id);

            const rotulo = criar("label", "ed-disciplina");

            const caixaMarcar = document.createElement("input");

            caixaMarcar.type = "checkbox";

            caixaMarcar.value = id;

            caixaMarcar.checked = selecionadas.has(id);

            caixaMarcar.addEventListener("change", () => {

                if (caixaMarcar.checked) {
                    selecionadas.add(id);
                } else {
                    selecionadas.delete(id);
                }

                mostrarAviso("");

                atualizarContador();

            });

            rotulo.appendChild(caixaMarcar);

            rotulo.appendChild(criar("span", "ed-disciplina-nome", disciplina.nome));

            caixa.appendChild(rotulo);

        });

    }

    async function carregarSerie() {

        const caixa = porId("ed-lista-tecnicas");

        const chave = cursoEscolhido + "-" + serieAtual;

        marcarSerie();

        // Esconde o botão "Marcar todas" enquanto a nova série carrega
        atualizarBotoesTodas();

        if (!cacheSeries[chave]) {

            caixa.textContent = "";

            caixa.appendChild(criar("p", "ed-vazio", "Carregando disciplinas..."));

            try {

                cacheSeries[chave] = await buscarLista(
                    "/disciplinas/?curso=" + encodeURIComponent(cursoEscolhido)
                    + "&serie=" + encodeURIComponent(serieAtual)
                );

            } catch (erro) {

                caixa.textContent = "";

                caixa.appendChild(criar("p", "ed-vazio", "Não foi possível carregar as disciplinas. Tente de novo."));

                return;

            }

        }

        // O aluno pode ter trocado de série enquanto carregava
        if (chave !== cursoEscolhido + "-" + serieAtual) {
            return;
        }

        if (cacheSeries[chave].length === 0) {

            caixa.textContent = "";

            caixa.appendChild(criar("p", "ed-vazio", "Nenhuma disciplina encontrada para esta série."));

        } else {

            desenharLista(caixa, cacheSeries[chave]);

        }

        atualizarContador();

    }


    // Etapa 3: formação geral

    function desenharFormacaoGeral() {

        const caixa = porId("ed-lista-fg");

        if (listaFormacaoGeral.length === 0) {

            caixa.textContent = "";

            caixa.appendChild(criar("p", "ed-vazio", "Nenhuma disciplina de formação geral encontrada."));

        } else {

            desenharLista(caixa, listaFormacaoGeral);

        }

        atualizarContador();

    }


    // Navegação

    function irParaEtapa(numero) {

        etapa = numero;

        for (let i = 1; i <= 3; i++) {

            porId("ed-etapa-" + i).hidden = i !== etapa;

        }

        document.querySelectorAll("#ed-passos li").forEach((item, indice) => {

            item.classList.toggle("ativo", indice + 1 === etapa);

            item.classList.toggle("feito", indice + 1 < etapa);

            if (indice + 1 === etapa) {
                item.setAttribute("aria-current", "step");
            } else {
                item.removeAttribute("aria-current");
            }

        });

        porId("ed-titulo-etapa").textContent = TITULOS[etapa - 1];

        porId("ed-contador").hidden = etapa === 1;

        botaoVoltar.textContent = etapa === 1 ? "Cancelar" : "Voltar";

        botaoProximo.textContent = etapa === 3 ? "Salvar alterações" : "Próximo";

        mostrarAviso("");

    }

    function limparDisciplinasTecnicas() {

        // Troca de curso: as técnicas do curso antigo saem; a formação geral continua
        selecionadas = new Set(Array.from(selecionadas).filter((id) => idsFormacaoGeral.has(id)));

        cacheSeries = {};

    }

    function avancar() {

        if (etapa === 1) {

            if (!cursoEscolhido) {

                mostrarAviso("Escolha um curso para continuar.");

                return;

            }

            if (!formacaoGeralCarregada) {

                mostrarAviso("Carregando as disciplinas. Tente de novo em instantes.");

                return;

            }

            if (cursoEscolhido !== cursoDasSeries) {

                limparDisciplinasTecnicas();

                cursoDasSeries = cursoEscolhido;

            }

            irParaEtapa(2);

            carregarSerie();

            return;

        }

        if (etapa === 2) {

            irParaEtapa(3);

            desenharFormacaoGeral();

            return;

        }

        salvar();

    }

    function voltar() {

        if (etapa === 1) {

            fechar();

            return;

        }

        irParaEtapa(etapa - 1);

        if (etapa === 2) {
            carregarSerie();
        }

    }


    // Salvar

    async function salvar() {

        if (salvando) {
            return;
        }

        if (selecionadas.size === 0) {

            mostrarAviso("Selecione pelo menos uma disciplina.");

            return;

        }

        salvando = true;

        botaoProximo.disabled = true;

        botaoProximo.textContent = "Salvando...";

        const formulario = new FormData();

        formulario.append("curso", cursoEscolhido);

        selecionadas.forEach((id) => formulario.append("disciplinas", id));

        try {

            const resposta = await fetch(urlAtualizarDisciplinas, {
                method: "POST",
                body: formulario,
                credentials: "same-origin",
                headers: { "X-CSRFToken": obterCsrfToken() }
            });

            const resultado = await resposta.json().catch(() => ({}));

            if (!resposta.ok) {
                throw new Error(resultado.erro || "Não foi possível salvar as alterações.");
            }

            sessionStorage.setItem("ed-sucesso", "1");

            window.location.reload();

        } catch (erro) {

            mostrarAviso(erro.message || "Não foi possível salvar as alterações.");

            salvando = false;

            botaoProximo.disabled = false;

            botaoProximo.textContent = "Salvar alterações";

        }

    }


    // Abrir e fechar

    async function abrir() {

        cursoEscolhido = dados.curso_id === null ? "" : String(dados.curso_id);

        cursoDasSeries = cursoEscolhido;

        serieAtual = "1";

        selecionadas = new Set(dados.disciplinas.map((d) => String(d.id)));

        cacheSeries = {};

        salvando = false;

        botaoProximo.disabled = false;

        desenharCursos();

        marcarSerie();

        irParaEtapa(1);

        janela.classList.add("ativo");

        const marcado = janela.querySelector("input[name='ed-curso']:checked") || janela.querySelector("input");

        if (marcado) {
            marcado.focus();
        }

        // A lista de formação geral é necessária para saber o que é técnica
        // quando o aluno troca de curso.
        if (!formacaoGeralCarregada) {

            try {

                listaFormacaoGeral = await buscarLista("/formacao-geral/");

                idsFormacaoGeral = new Set(listaFormacaoGeral.map((d) => String(d.id)));

                formacaoGeralCarregada = true;

            } catch (erro) {

                mostrarAviso("Não foi possível carregar a formação geral. Feche e tente de novo.");

                botaoProximo.disabled = true;

            }

        }

    }

    function fechar() {

        janela.classList.remove("ativo");

        botaoAbrir.focus();

    }


    botaoAbrir.addEventListener("click", abrir);

    botaoVoltar.addEventListener("click", voltar);

    botaoProximo.addEventListener("click", avancar);

    porId("ed-fechar").addEventListener("click", fechar);

    const botaoTodasTecnicas = porId("ed-todas-tecnicas");

    if (botaoTodasTecnicas) {

        botaoTodasTecnicas.addEventListener("click", () => {

            alternarTodas(listaAtualTecnicas(), porId("ed-lista-tecnicas"));

        });

    }

    const botaoTodasFg = porId("ed-todas-fg");

    if (botaoTodasFg) {

        botaoTodasFg.addEventListener("click", () => {

            alternarTodas(listaFormacaoGeral, porId("ed-lista-fg"));

        });

    }

    janela.addEventListener("click", (evento) => {

        if (evento.target === janela) {
            fechar();
        }

    });

    document.addEventListener("keydown", (evento) => {

        if (evento.key === "Escape" && janela.classList.contains("ativo")) {
            fechar();
        }

    });

    document.querySelectorAll("#ed-series button").forEach((botao) => {

        botao.addEventListener("click", () => {

            serieAtual = botao.dataset.serie;

            carregarSerie();

        });

    });

    criarIcones();

})();