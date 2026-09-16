// "Deslizar para o lugar" (rascunho T2 escolhido pelo Pedro): a animação ao
// trocar os dias do "Chegando" e a ordem de "Todas".
//
// A técnica tem o apelido de FLIP. Antes de redesenhar, anota onde cada item
// estava. Depois de redesenhar, cada item que continuou na tela começa
// desenhado na posição antiga e escorrega até a nova. Quem chegou entra
// deslizando, quem saiu desliza para fora a partir de onde estava, e o painel
// muda de altura devagar, levando junto o que fica embaixo dele.
//
// Os itens precisam de data-chave (a mesma chave antes e depois). Quem pediu
// "reduzir movimento" vê a troca na hora, sem animação.

import { reduzirMovimento } from './ascii.js';

const DURACAO = 480;
const SUAVE = 'cubic-bezier(0.2, 0.8, 0.2, 1)';
const DESLOCAMENTO = 18; // pixels que quem entra ou sai anda para o lado

// Animações em andamento de cada painel, para uma troca no meio da outra
// terminar a anterior antes de começar.
const emAndamento = new WeakMap();

// Estilos que prendem um item no lugar durante a troca (e saem no fim).
const PROPRIEDADES_DE_QUEM_FICA_PRESO = ['position', 'top', 'left', 'width', 'height', 'margin', 'z-index'];

function itensVisiveis(painel) {
  return [...painel.querySelectorAll('[data-chave]')].filter((item) => item.getClientRects().length > 0);
}

// Tudo volta ao normal no mesmo instante (animações, cópias e itens presos),
// para não sobrar nenhum quadro com metade desfeita.
function terminar(painel) {
  const andamento = emAndamento.get(painel);
  if (!andamento) return;
  emAndamento.delete(painel);
  for (const animacao of andamento.animacoes) animacao.cancel();
  for (const copia of andamento.copias) copia.remove();
  for (const item of andamento.presos) {
    for (const propriedade of PROPRIEDADES_DE_QUEM_FICA_PRESO) item.style.removeProperty(propriedade);
  }
  painel.classList.remove('deslizando');
}

// Abrir e recolher deslizando ----------------------------------------------------------
//
// Para caixas que abrem no meio da página (o calendário do formulário, o
// "Alterar senha" de Minha conta). Ao abrir, a caixa vai de altura zero (sem
// margem, borda e espaço interno) até a altura cheia, e o que está embaixo
// desce junto; ao fechar, recolhe do mesmo jeito e só então some.

const aberturasEmAndamento = new WeakMap();

export function deslizarAbertura(caixa, abrindo) {
  aberturasEmAndamento.get(caixa)?.cancel();
  aberturasEmAndamento.delete(caixa);
  caixa.hidden = false;
  // Sem animação para quem pediu, ou com a caixa numa tela escondida.
  if (reduzirMovimento() || caixa.getClientRects().length === 0) {
    caixa.hidden = !abrindo;
    return;
  }

  const estilo = getComputedStyle(caixa);
  // O espaço entre a caixa e o que vem antes também fecha, para nada pular.
  const vaoAcima = parseFloat(getComputedStyle(caixa.parentElement).rowGap) || 0;
  const cheia = {
    height: `${caixa.offsetHeight}px`,
    paddingTop: estilo.paddingTop,
    paddingBottom: estilo.paddingBottom,
    borderTopWidth: estilo.borderTopWidth,
    borderBottomWidth: estilo.borderBottomWidth,
    marginTop: estilo.marginTop,
    opacity: 1,
  };
  const recolhida = {
    height: '0px',
    paddingTop: '0px',
    paddingBottom: '0px',
    borderTopWidth: '0px',
    borderBottomWidth: '0px',
    marginTop: `${-vaoAcima}px`,
    opacity: 0,
  };

  // "clip" corta sem virar área de rolagem: o foco num campo de dentro não
  // empurra o conteúdo para cima enquanto a caixa ainda está baixa.
  caixa.style.overflow = 'clip';
  const animacao = caixa.animate(abrindo ? [recolhida, cheia] : [cheia, recolhida], {
    duration: abrindo ? 340 : 240,
    easing: abrindo ? SUAVE : 'ease-in',
    fill: 'forwards',
  });
  aberturasEmAndamento.set(caixa, animacao);
  animacao.finished.then(() => {
    aberturasEmAndamento.delete(caixa);
    if (!abrindo) caixa.hidden = true;
    caixa.style.removeProperty('overflow');
    animacao.cancel();
  }, () => {
    // Interrompida por outra abertura ou fechamento: a nova cuida do resto.
  });
}

// Deslizar para o lugar -------------------------------------------------------------

// Chame antes de redesenhar. Devolve a função que faz a animação, para chamar
// logo depois de redesenhar.
export function prepararDeslize(painel) {
  if (reduzirMovimento() || painel.getClientRects().length === 0) return () => {};
  terminar(painel);

  const caixaDoPainel = painel.getBoundingClientRect();
  const alturaAntes = painel.offsetHeight;
  const antes = new Map();
  for (const item of itensVisiveis(painel)) {
    antes.set(item.dataset.chave, { caixa: item.getBoundingClientRect(), copia: item.cloneNode(true) });
  }

  return function deslizar() {
    const animacoes = [];
    const copias = [];
    const presos = [];
    painel.classList.add('deslizando');
    const caixaDoPainelDepois = painel.getBoundingClientRect();

    // Primeiro mede tudo no desenho novo, antes de mexer em qualquer coisa.
    const itens = itensVisiveis(painel).map((item) => ({
      item,
      caixa: item.getBoundingClientRect(),
      anterior: antes.get(item.dataset.chave),
    }));
    for (const { item } of itens) antes.delete(item.dataset.chave);

    // Fileiras em que um item continua mas muda de largura (o bloco da
    // próxima cobrança, sozinho ou com o "Depois" ao lado).
    const fileirasQueMudamDeLargura = new Set(itens
      .filter(({ anterior, caixa }) => anterior && Math.abs(anterior.caixa.width - caixa.width) > 1)
      .map(({ item }) => item.parentElement));

    // O painel cresce ou encolhe devagar, no lugar de pular de tamanho.
    const alturaDepois = painel.offsetHeight;
    if (alturaDepois !== alturaAntes) {
      animacoes.push(painel.animate(
        [{ height: `${alturaAntes}px` }, { height: `${alturaDepois}px` }],
        { duration: DURACAO, easing: SUAVE, fill: 'forwards' },
      ));
    }

    let chegadas = 0;
    for (const { item, caixa, anterior } of itens) {
      // Chegou numa fileira que muda de largura (o "Depois" voltando): fica
      // preso no tamanho e no lugar finais, por baixo do vizinho, e aparece
      // enquanto o vizinho encolhe e abre espaço. Solto na fileira, ele
      // começaria estreito, com o texto quebrado, e esticaria a altura de tudo.
      if (!anterior && fileirasQueMudamDeLargura.has(item.parentElement)) {
        Object.assign(item.style, {
          position: 'absolute',
          top: `${caixa.top - caixaDoPainelDepois.top}px`,
          left: `${caixa.left - caixaDoPainelDepois.left}px`,
          width: `${caixa.width}px`,
          height: `${caixa.height}px`,
          margin: '0',
          zIndex: '-1',
        });
        presos.push(item);
        animacoes.push(item.animate(
          [{ opacity: 0, transform: `translateX(${DESLOCAMENTO}px)` }, { opacity: 1, transform: 'none' }],
          { duration: DURACAO, delay: 80, easing: SUAVE, fill: 'both' },
        ));
        continue;
      }

      // Chegou agora: entra deslizando, depois de os outros começarem a abrir espaço.
      if (!anterior) {
        animacoes.push(item.animate(
          [{ opacity: 0, transform: `translateX(-${DESLOCAMENTO}px)` }, { opacity: 1, transform: 'none' }],
          { duration: 380, delay: 180 + Math.min(chegadas * 45, 360), easing: SUAVE, fill: 'both' },
        ));
        chegadas += 1;
        continue;
      }

      // Continuou: sai da posição antiga e escorrega até a nova. Se mudou de
      // largura, a largura também muda devagar.
      const dx = anterior.caixa.left - caixa.left;
      const dy = anterior.caixa.top - caixa.top;
      const mudouLargura = Math.abs(anterior.caixa.width - caixa.width) > 1;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && !mudouLargura) continue;

      const de = { transform: `translate(${dx}px, ${dy}px)` };
      const para = { transform: 'none' };
      if (mudouLargura) {
        Object.assign(de, { flexGrow: 0, flexShrink: 0, flexBasis: `${anterior.caixa.width}px` });
        Object.assign(para, { flexGrow: 0, flexShrink: 0, flexBasis: `${caixa.width}px` });
      }
      animacoes.push(item.animate([de, para], { duration: DURACAO, easing: SUAVE, fill: 'forwards' }));
    }

    // Saiu: uma cópia fica onde o item estava, por baixo dos outros, e desliza
    // para fora sumindo. A cópia é só desenho: sem id, fora do teclado e do
    // leitor de tela.
    for (const { caixa, copia } of antes.values()) {
      copia.removeAttribute('id');
      for (const comId of copia.querySelectorAll('[id]')) comId.removeAttribute('id');
      copia.removeAttribute('data-chave');
      copia.classList.add('saindo-do-lugar');
      copia.setAttribute('aria-hidden', 'true');
      copia.inert = true;
      Object.assign(copia.style, {
        top: `${caixa.top - caixaDoPainel.top}px`,
        left: `${caixa.left - caixaDoPainel.left}px`,
        width: `${caixa.width}px`,
        height: `${caixa.height}px`,
      });
      painel.append(copia);
      copias.push(copia);
      animacoes.push(copia.animate(
        [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${DESLOCAMENTO}px)` }],
        { duration: 280, easing: 'ease-in', fill: 'forwards' },
      ));
    }

    const andamento = { animacoes, copias, presos };
    emAndamento.set(painel, andamento);
    Promise.all(animacoes.map((animacao) => animacao.finished.catch(() => {}))).then(() => {
      if (emAndamento.get(painel) === andamento) terminar(painel);
    });
  };
}
