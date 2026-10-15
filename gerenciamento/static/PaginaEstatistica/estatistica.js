/* =========================================================
   ESTATÍSTICAS  -  Cartões por disciplina + gráfico nota x média
   Arquivo: static/PaginaEstatistica/estatistica.js

   Lê os dados que a view envia em <script id="dados-estatisticas">
   e monta a tela. Nenhuma biblioteca externa: os gráficos são SVG.
   ========================================================= */

(function () {

    "use strict";

    const fonte = document.getElementById("dados-estatisticas");

    const raiz = document.getElementById("est-raiz");

    if (!fonte || !raiz) {
        return;
    }


    let dados;

    try {
        dados = JSON.parse(fonte.textContent);
    } catch (erro) {
        return;
    }


    const disciplinas = dados.disciplinas || [];

    const resumo = dados.resumo || {};

    const NS = "http://www.w3.org/2000/svg";

    const COR_ACIMA = "#7ea05e";

    const COR_ABAIXO = "#dc2626";

    const COR_MEDIA = "#9db9f2";

    // No celular o gráfico é mais estreito e mais alto
    const celular = window.matchMedia("(max-width: 600px)");


    // ---------- Utilitários ----------

    function numero(valor) {

        return Number(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 });

    }

    function comSinal(valor) {

        if (valor > 0) {
            return "+" + numero(valor);
        }

        if (valor < 0) {
            return "−" + numero(Math.abs(valor));
        }

        return "0";

    }

    function pontos(valor) {

        return numero(valor) + (Math.abs(valor) === 1 ? " ponto" : " pontos");

    }

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

    function criarSvg(tag, atributos) {

        const elemento = document.createElementNS(NS, tag);

        Object.keys(atributos || {}).forEach((chave) => {
            elemento.setAttribute(chave, atributos[chave]);
        });

        return elemento;

    }


    const ROTULO_STATUS = {
        aprovado: "Meta atingida",
        na_media: "Estável",
        abaixo: "Abaixo do desejável",
        sem_notas: "Sem notas"
    };


    function textoBimestre(bimestre) {

        if (bimestre.status === "sem_notas") {
            return "Sem notas lançadas";
        }

        if (bimestre.status === "abaixo") {
            return "Abaixo da média (" + comSinal(bimestre.diferenca) + ")";
        }

        if (bimestre.status === "acima") {
            return "Acima da média (" + comSinal(bimestre.diferenca) + ")";
        }

        return "Na média";

    }

    function frase(disciplina) {

        const diferenca = disciplina.diferenca;

        if (disciplina.status === "aprovado") {
            return "Você já atingiu os " + disciplina.meta + " pontos para ser aprovado.";
        }

        if (disciplina.status === "sem_notas") {
            return "Ainda não há notas lançadas nesta disciplina.";
        }

        if (disciplina.status === "na_media") {
            return diferenca > 0
                ? "Até o momento você está " + pontos(diferenca) + " acima da média." + " Faltam " + pontos(disciplina.falta) + " para chegar a " + disciplina.meta + "."
                : "Até o momento você está exatamente na média.";
        }

        return "Até o momento você está " + pontos(Math.abs(diferenca)) + " abaixo da média. ";

    }


    // ---------- Resumo no topo ----------

    function criarResumo() {

        const grade = criar("div", "est-resumo");

        const itens = [
            { valor: resumo.total_disciplinas || 0, rotulo: "Disciplinas", tipo: "" },
            { valor: resumo.na_media || 0, rotulo: "Na média ou acima", tipo: "bom" },
            { valor: resumo.abaixo || 0, rotulo: "Abaixo da média", tipo: "ruim" },
            { valor: resumo.sem_notas || 0, rotulo: "Sem notas lançadas", tipo: "neutro" }
        ];

        itens.forEach((item) => {

            const caixa = criar("div", "est-resumo-item " + item.tipo);

            caixa.appendChild(criar("span", "est-resumo-valor", String(item.valor)));

            caixa.appendChild(criar("span", "est-resumo-rotulo", item.rotulo));

            grade.appendChild(caixa);

        });

        return grade;

    }


    // ---------- Gráfico de barras: sua nota x média ----------

    function criarGrafico(disciplina, compacto) {

        const LARGURA = compacto ? 440 : 640;
        const ALTURA = compacto ? 330 : 310;

        const margem = {
            esquerda: compacto ? 36 : 46,
            direita: 10,
            topo: 24,
            base: 58
        };

        const areaLargura = LARGURA - margem.esquerda - margem.direita;
        const areaAltura = ALTURA - margem.topo - margem.base;

        const maiorValor = Math.max.apply(null, disciplina.bimestres.map((b) => Math.max(b.maximo, b.nota)));

        const topoEscala = Math.ceil(maiorValor / 10) * 10;

        function y(valor) {
            return margem.topo + areaAltura - (valor / topoEscala) * areaAltura;
        }

        const resumoTexto = disciplina.bimestres.map((b) => {
            return b.numero + "º bimestre: "
                + (b.lancado ? "nota " + numero(b.nota) : "sem notas")
                + ", média " + numero(b.media);
        }).join("; ");

        const svg = criarSvg("svg", {
            viewBox: "0 0 " + LARGURA + " " + ALTURA,
            role: "img",
            "aria-label": "Gráfico de barras com a nota e a média de cada bimestre em " + disciplina.nome + ". " + resumoTexto + "."
        });

        svg.setAttribute("class", "est-grafico" + (compacto ? " compacto" : ""));


        // Linhas de grade e valores do eixo
        for (let valor = 0; valor <= topoEscala; valor += 10) {

            svg.appendChild(criarSvg("line", {
                x1: margem.esquerda,
                x2: LARGURA - margem.direita,
                y1: y(valor),
                y2: y(valor),
                class: valor === 0 ? "est-eixo" : "est-grade"
            }));

            const rotulo = criarSvg("text", {
                x: margem.esquerda - 10,
                y: y(valor) + 4,
                "text-anchor": "end",
                class: "est-texto-eixo"
            });

            rotulo.textContent = String(valor);

            svg.appendChild(rotulo);

        }


        const larguraGrupo = areaLargura / disciplina.bimestres.length;

        const larguraBarra = Math.min(compacto ? 26 : 40, larguraGrupo * 0.32);

        const espaco = 8;

        disciplina.bimestres.forEach((bimestre, indice) => {

            const centro = margem.esquerda + larguraGrupo * indice + larguraGrupo / 2;

            const xNota = centro - larguraBarra - espaco / 2;

            const xMedia = centro + espaco / 2;


            // Barra da nota do aluno
            if (bimestre.lancado) {

                const altura = Math.max(areaAltura * bimestre.nota / topoEscala, 2);

                const cor = bimestre.status === "abaixo" ? COR_ABAIXO : COR_ACIMA;

                const barra = criarSvg("rect", {
                    x: xNota,
                    y: margem.topo + areaAltura - altura,
                    width: larguraBarra,
                    height: altura,
                    rx: 5,
                    fill: cor,
                    class: "est-barra"
                });

                const dica = criarSvg("title");

                dica.textContent = bimestre.numero + "º bimestre: sua nota " + numero(bimestre.nota)
                    + " de " + bimestre.maximo + " (" + textoBimestre(bimestre) + ")";

                barra.appendChild(dica);

                svg.appendChild(barra);

                const valorNota = criarSvg("text", {
                    x: xNota + larguraBarra / 2,
                    y: margem.topo + areaAltura - altura - 6,
                    "text-anchor": "middle",
                    class: "est-valor",
                    fill: cor
                });

                valorNota.textContent = numero(bimestre.nota);

                svg.appendChild(valorNota);

            } else {

                const semNota = criarSvg("text", {
                    x: xNota + larguraBarra / 2,
                    y: margem.topo + areaAltura - 6,
                    "text-anchor": "middle",
                    class: "est-valor est-valor-vazio"
                });

                semNota.textContent = "-";

                svg.appendChild(semNota);

            }


            // Barra da média do bimestre
            const alturaMedia = areaAltura * bimestre.media / topoEscala;

            const barraMedia = criarSvg("rect", {
                x: xMedia,
                y: margem.topo + areaAltura - alturaMedia,
                width: larguraBarra,
                height: alturaMedia,
                rx: 5,
                fill: COR_MEDIA,
                class: "est-barra"
            });

            const dicaMedia = criarSvg("title");

            dicaMedia.textContent = bimestre.numero + "º bimestre: média " + numero(bimestre.media)
                + " de " + bimestre.maximo;

            barraMedia.appendChild(dicaMedia);

            svg.appendChild(barraMedia);

            const valorMedia = criarSvg("text", {
                x: xMedia + larguraBarra / 2,
                y: margem.topo + areaAltura - alturaMedia - 6,
                "text-anchor": "middle",
                class: "est-valor est-valor-media"
            });

            valorMedia.textContent = numero(bimestre.media);

            svg.appendChild(valorMedia);


            // Nome do bimestre e pontos possíveis
            const nome = criarSvg("text", {
                x: centro,
                y: ALTURA - margem.base + 24,
                "text-anchor": "middle",
                class: "est-texto-bimestre"
            });

            nome.textContent = bimestre.numero + "º bimestre";

            svg.appendChild(nome);

            const maximo = criarSvg("text", {
                x: centro,
                y: ALTURA - margem.base + 42,
                "text-anchor": "middle",
                class: "est-texto-maximo"
            });

            maximo.textContent = "vale " + bimestre.maximo + " pts";

            svg.appendChild(maximo);

        });

        return svg;

    }


    function criarLegenda() {

        const legenda = criar("div", "est-legenda");

        [
            { cor: COR_ACIMA, texto: "Sua nota (na média ou acima)" },
            { cor: COR_ABAIXO, texto: "Sua nota (abaixo da média)" },
            { cor: COR_MEDIA, texto: "Média do bimestre" }
        ].forEach((item) => {

            const linha = criar("span", "est-legenda-item");

            const quadrado = criar("span", "est-legenda-cor");

            quadrado.style.backgroundColor = item.cor;

            linha.appendChild(quadrado);

            linha.appendChild(document.createTextNode(item.texto));

            legenda.appendChild(linha);

        });

        return legenda;

    }


    // ---------- Cartões dos bimestres ----------

    function criarBimestres(disciplina) {

        const grade = criar("div", "est-bimestres");

        disciplina.bimestres.forEach((bimestre) => {

            const cartao = criar("div", "est-bimestre " + bimestre.status);

            cartao.appendChild(criar("span", "est-bimestre-nome", bimestre.numero + "º bimestre"));

            const valor = criar("span", "est-bimestre-nota");

            valor.appendChild(document.createTextNode(bimestre.lancado ? numero(bimestre.nota) : "-"));

            valor.appendChild(criar("small", "", " / " + bimestre.maximo + " pts"));

            cartao.appendChild(valor);

            cartao.appendChild(criar("span", "est-bimestre-media", "Média: " + numero(bimestre.media) + " pts"));

            cartao.appendChild(criar("span", "est-chip " + bimestre.status, textoBimestre(bimestre)));

            grade.appendChild(cartao);

        });

        return grade;

    }


    function criarIndicadores(disciplina) {

        const grade = criar("div", "est-indicadores");

        const itens = [
            { rotulo: "Total do ano", valor: numero(disciplina.total) + " / 100 pts" },
            {
                rotulo: "Para chegar a " + disciplina.meta,
                valor: disciplina.falta > 0 ? "Faltam " + numero(disciplina.falta) + " pts" : "Meta atingida"
            },


        ];

        itens.forEach((item) => {

            const caixa = criar("div", "est-indicador");

            caixa.appendChild(criar("span", "est-indicador-rotulo", item.rotulo));

            caixa.appendChild(criar("strong", "", item.valor));

            grade.appendChild(caixa);

        });

        return grade;

    }


    // ---------- Cartão (sanfona) de cada disciplina ----------

    function criarCartao(disciplina, indice) {

        const cartao = criar("article", "est-card");

        const idCorpo = "est-corpo-" + indice;

        const idBotao = "est-botao-" + indice;


        const titulo = criar("h2", "est-card-titulo");

        const botao = criar("button", "est-card-botao");

        botao.type = "button";

        botao.id = idBotao;

        botao.setAttribute("aria-expanded", "false");

        botao.setAttribute("aria-controls", idCorpo);


        const nome = criar("span", "est-card-nome");

        nome.appendChild(criar("strong", "", disciplina.nome));

        nome.appendChild(criar("small", "", numero(disciplina.total) + " de 100 pontos"));

        botao.appendChild(nome);


        const progresso = criar("span", "est-progresso");

        progresso.setAttribute("aria-hidden", "true");

        const preenchido = criar("span", "est-progresso-preenchido " + disciplina.status);

        preenchido.style.width = disciplina.progresso_meta + "%";

        progresso.appendChild(preenchido);

        botao.appendChild(progresso);


        botao.appendChild(criar("span", "est-chip " + disciplina.status, ROTULO_STATUS[disciplina.status]));


        const seta = criar("span", "est-seta");

        const iconeSeta = document.createElement("i");

        iconeSeta.setAttribute("data-lucide", "chevron-down");

        seta.appendChild(iconeSeta);

        botao.appendChild(seta);


        titulo.appendChild(botao);

        cartao.appendChild(titulo);


        const corpo = criar("div", "est-corpo");

        corpo.id = idCorpo;

        corpo.setAttribute("role", "region");

        corpo.setAttribute("aria-labelledby", idBotao);

        const interno = criar("div", "est-corpo-interno");

        const conteudo = criar("div", "est-corpo-conteudo");

        conteudo.appendChild(criar("p", "est-frase", frase(disciplina)));

        conteudo.appendChild(criarGrafico(disciplina, celular.matches));

        conteudo.appendChild(criarLegenda());

        conteudo.appendChild(criarBimestres(disciplina));

        conteudo.appendChild(criarIndicadores(disciplina));

        interno.appendChild(conteudo);

        corpo.appendChild(interno);

        cartao.appendChild(corpo);


        botao.addEventListener("click", () => {

            const abrir = !cartao.classList.contains("aberto");

            cartao.classList.toggle("aberto", abrir);

            botao.setAttribute("aria-expanded", abrir ? "true" : "false");

        });

        return cartao;

    }


    // ---------- Montagem da página ----------

    if (disciplinas.length === 0) {

        const vazio = criar("div", "est-vazio");

        const iconeVazio = document.createElement("i");

        iconeVazio.setAttribute("data-lucide", "graduation-cap");

        vazio.appendChild(iconeVazio);

        vazio.appendChild(criar("p", "est-vazio-titulo", "Nenhuma disciplina cadastrada."));

        vazio.appendChild(criar("p", "est-vazio-texto", "Adicione disciplinas para ver suas estatísticas de desempenho."));

        raiz.appendChild(vazio);

    } else {

        raiz.appendChild(criarResumo());

        const lista = criar("div", "est-lista");

        disciplinas.forEach((disciplina, indice) => {
            lista.appendChild(criarCartao(disciplina, indice));
        });

        raiz.appendChild(lista);

        // A primeira disciplina já abre, para a tela não parecer vazia
        const primeiro = lista.querySelector(".est-card-botao");

        if (primeiro) {
            primeiro.click();
        }

    }


    celular.addEventListener("change", () => {

        raiz.querySelectorAll(".est-card").forEach((cartao, indice) => {

            const antigo = cartao.querySelector(".est-grafico");

            if (antigo) {
                antigo.replaceWith(criarGrafico(disciplinas[indice], celular.matches));
            }

        });

    });


    if (window.lucide) {
        window.lucide.createIcons();
    }

})();
