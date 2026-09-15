// Interações que dão vida às telas: textos que se "decifram" ao aparecer,
// blocos que inclinam na direção do mouse, o círculo dos cartazes que
// acompanha o mouse e a onda ao clicar ou tocar. Valem para todas as telas.
//
// Tudo aqui é só visual. Quem pediu "reduzir movimento" no aparelho não vê
// nada disso, e as ações do app funcionam igual sem estes efeitos.

import { reduzirMovimento } from './ascii.js';

// Decodificação ASCII ----------------------------------------------------------

const LETRAS_SORTEIO = 'ASCINTUR';
const ALGARISMOS = '0123456789';

// Onde há texto para decifrar, em qualquer tela.
const TEXTOS_DECIFRAVEIS = [
  '.titulo-cartaz', '.cartaz-sub', '.pilula', 'label', '.rotulo-campo', '.botao', '.botao-mini', '.botao-texto',
  '.numero-total', '.rotulo', '.titulo-painel',
  '.cobranca-rotulo', '.cobranca-dias', '.cobranca-info',
  '.linha-nome', '.linha-detalhe', '.linha-valor',
  '.canceladas summary', '.acoes-edicao h3', '.dialogo-titulo', '.dialogo-texto',
  '.menu-conta-email', '.menu-conta-item', '.menu-ajustes-grupo', '.menu-ajustes-item', '.linha-area',
  '.carteirinha-nome', '.carteirinha-email', '.acao-conta-cabeca', '.aviso-conta',
].join(', ');

const DURACAO_POR_TEXTO = 450; // milissegundos
const ATRASO_ENTRE_TEXTOS = 30;
const ATRASO_MAXIMO = 700;

// Pedaços de texto no meio do efeito, cada um com o texto certo, a hora em
// que começa e o último texto embaralhado que foi escrito.
const emEfeito = new Map();
let lacoRodando = false;

// Troca cada letra por uma sorteada. Algarismo vira algarismo, para o número
// grande do total não mudar de largura e sair do bloco no meio do efeito.
// Espaços e pontuação ficam como estão, para a frase manter o formato.
function embaralhar(texto) {
  return texto.replace(/[0-9]/g, () => ALGARISMOS[Math.floor(Math.random() * ALGARISMOS.length)])
    .replace(/[A-Za-zÀ-ÿ]/g, () => LETRAS_SORTEIO[Math.floor(Math.random() * LETRAS_SORTEIO.length)]);
}

// Os textos aparecem embaralhados e se decifram da esquerda para a direita,
// cada um um pouco depois do anterior, como na abertura.
export function decifrarTextos(raiz) {
  decifrarElementos(raiz.querySelectorAll(TEXTOS_DECIFRAVEIS));
}

// O mesmo efeito num elemento só, como um item de menu ao passar o mouse.
export function decifrarElemento(elemento) {
  decifrarElementos([elemento]);
}

function decifrarElementos(elementos) {
  if (reduzirMovimento()) return;
  const agora = performance.now();
  let posicao = 0;

  // Trabalha nos pedaços de texto, e não nos elementos: assim partes como o
  // "/mês" pequeno, os ícones e as quebras de linha continuam no lugar.
  for (const elemento of elementos) {
    const caminhante = document.createTreeWalker(elemento, NodeFilter.SHOW_TEXT);
    while (caminhante.nextNode()) {
      const no = caminhante.currentNode;
      if (!no.nodeValue.trim()) continue;

      // Se o pedaço já estava no meio do efeito, o texto certo é o guardado,
      // e não o embaralhado que está na tela agora.
      const final = emEfeito.get(no)?.final ?? no.nodeValue;
      const inicio = agora + Math.min(posicao * ATRASO_ENTRE_TEXTOS, ATRASO_MAXIMO);
      emEfeito.set(no, { final, inicio, escrito: undefined });
      posicao++;
    }
  }

  if (!lacoRodando && emEfeito.size > 0) {
    lacoRodando = true;
    requestAnimationFrame(quadroDoEfeito);
  }
}

function quadroDoEfeito(agora) {
  for (const [no, pedaco] of emEfeito) {
    // O app trocou o texto no meio (um valor novo, por exemplo): o pedaço sai
    // do efeito e fica com o texto novo.
    if (pedaco.escrito !== undefined && no.nodeValue !== pedaco.escrito) {
      emEfeito.delete(no);
      continue;
    }

    const avanco = (agora - pedaco.inicio) / DURACAO_POR_TEXTO;
    if (avanco >= 1) {
      no.nodeValue = pedaco.final;
      emEfeito.delete(no);
      continue;
    }

    const reveladas = Math.max(0, Math.floor(avanco * pedaco.final.length));
    no.nodeValue = pedaco.final.slice(0, reveladas) + embaralhar(pedaco.final.slice(reveladas));
    pedaco.escrito = no.nodeValue;
  }

  if (emEfeito.size > 0) {
    requestAnimationFrame(quadroDoEfeito);
  } else {
    lacoRodando = false;
  }
}

// Inclinação 3D e círculo que acompanha o mouse -----------------------------------

// Blocos que inclinam de leve na direção do mouse, como um cartão.
const INCLINAVEIS = '.cartaz, .cobranca, .inclina';

// Só com mouse: no toque não existe "passar por cima".
function ligarMovimentoDoMouse() {
  let blocoAtual = null;
  let cartazAtual = null;

  const soltarBloco = () => {
    if (blocoAtual) blocoAtual.style.transform = '';
    blocoAtual = null;
  };
  const soltarCartaz = () => {
    cartazAtual?.style.removeProperty('--circulo-x');
    cartazAtual?.style.removeProperty('--circulo-y');
    cartazAtual = null;
  };

  document.addEventListener('pointermove', (evento) => {
    if (evento.pointerType !== 'mouse' || reduzirMovimento()) return;

    const bloco = evento.target.closest(INCLINAVEIS);
    if (bloco !== blocoAtual) soltarBloco();
    if (bloco) {
      blocoAtual = bloco;
      const r = bloco.getBoundingClientRect();
      const x = (evento.clientX - r.left) / r.width - 0.5;
      const y = (evento.clientY - r.top) / r.height - 0.5;
      // Blocos largos (o total no computador) inclinam menos, para não exagerar.
      const angulo = r.width > 600 ? 3 : 6;
      bloco.style.transform = `perspective(800px) rotateX(${-y * angulo}deg) rotateY(${x * angulo}deg)`;
    }

    // O círculo (ou as manchas de letras) do cartaz vai um pouco na direção
    // do mouse. O CSS e o ascii.js leem estas duas variáveis.
    const cartaz = evento.target.closest('.cartaz');
    if (cartaz !== cartazAtual) soltarCartaz();
    if (cartaz) {
      cartazAtual = cartaz;
      const r = cartaz.getBoundingClientRect();
      cartaz.style.setProperty('--circulo-x', `${(evento.clientX - r.left - r.width / 2) * 0.08}px`);
      cartaz.style.setProperty('--circulo-y', `${(evento.clientY - r.top - r.height / 2) * 0.08}px`);
    }
  });

  document.documentElement.addEventListener('pointerleave', () => {
    soltarBloco();
    soltarCartaz();
  });
}

// Onda ao clicar ----------------------------------------------------------------

const COM_ONDA = '.botao, .botao-mini, .cartaz, .cobranca, .linha, .opcao-ciclo, .campo-data, '
  + '.menu-conta-item, .menu-ajustes-item, .linha-area, .acao-conta-cabeca, .opcao-tema';

// Um círculo cresce a partir do ponto do clique ou do toque, na cor contrária
// à do elemento: claro sobre o verde, verde sobre o claro.
function ligarOnda() {
  document.addEventListener('pointerdown', (evento) => {
    if (reduzirMovimento()) return;
    const elemento = evento.target.closest(COM_ONDA);
    if (!elemento) return;

    const r = elemento.getBoundingClientRect();
    const [vermelho, verde, azul] = getComputedStyle(elemento).backgroundColor.match(/\d+/g).map(Number);
    const fundoEscuro = (vermelho * 299 + verde * 587 + azul * 114) / 1000 < 128;
    const diametro = Math.max(r.width, r.height) * 2.2;

    // A onda fica dentro de uma "moldura" do tamanho do elemento, que corta o
    // que passa das bordas. Assim o elemento não precisa esconder o que
    // transborda, o que cortaria também o contorno de foco dos botões.
    const moldura = document.createElement('span');
    moldura.className = 'onda-moldura';
    const onda = document.createElement('span');
    onda.className = `onda ${fundoEscuro ? 'onda-clara' : 'onda-escura'}`;
    onda.style.width = `${diametro}px`;
    onda.style.height = `${diametro}px`;
    onda.style.left = `${evento.clientX - r.left}px`;
    onda.style.top = `${evento.clientY - r.top}px`;
    moldura.append(onda);
    elemento.append(moldura);
    onda.addEventListener('animationend', () => moldura.remove(), { once: true });
  });
}

// Embaralhar ao passar o mouse ------------------------------------------------------

// Nomes de menu (classe .embaralha-ao-passar) se embaralham e se decifram
// quando o mouse chega neles. Só com mouse: no celular, os textos já se
// decifram quando a página abre.
function ligarEmbaralharAoPassar() {
  document.addEventListener('mouseover', (evento) => {
    const alvo = evento.target.closest('.embaralha-ao-passar');
    // Andar de um pedaço para outro dentro do mesmo item não repete o efeito.
    if (!alvo || alvo.contains(evento.relatedTarget)) return;
    if (!document.documentElement.classList.contains('com-mouse')) return;
    decifrarElemento(alvo);
  });
}

export function ligarInteracoes() {
  // As cores invertidas por :hover só valem em aparelhos com mouse (ver
  // "Cores invertidas" no estilo.css). Acompanha a troca, como ao ligar um
  // mouse num tablet.
  const temMouse = window.matchMedia('(hover: hover)');
  const marcar = () => document.documentElement.classList.toggle('com-mouse', temMouse.matches);
  marcar();
  temMouse.addEventListener('change', marcar);

  ligarMovimentoDoMouse();
  ligarOnda();
  ligarEmbaralharAoPassar();
}
