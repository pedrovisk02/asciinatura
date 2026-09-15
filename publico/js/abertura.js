// Tela de abertura: cobre a tela enquanto o app carrega. Letras soltas se
// juntam formando o logo, o círculo fica sólido e o nome aparece letra a letra.
//
// Quando a animação completa roda (decisão do Pedro):
// - no computador, toda vez que o app abre;
// - no celular, só na primeira abertura do dia, para não virar uma espera no
//   uso rápido do dia a dia. Nas outras, o logo aparece parado por um instante.
// Quem pediu "reduzir movimento" sempre vê o logo parado.
//
// O app chama fecharAbertura() quando a primeira tela estiver pronta.

import { prepararCanvas, reduzirMovimento, corDoTema, LETRAS_SORTEIO, ALGARISMOS } from './ascii.js';
import { dataDeHoje } from './calculos.js';

const abertura = document.querySelector('#abertura');
const inicio = performance.now();

// A animação completa fica na tela até a última letra da frase aparecer, mais
// um tempo para ler. Calculado a partir do HTML (data-comeca e data-por-letra),
// para continuar certo se os textos mudarem.
const TEMPO_PARA_LER = 1.5; // segundos
const FIM_DOS_TEXTOS = Math.max(...[...abertura.querySelectorAll('[data-texto]')].map(
  (texto) => Number(texto.dataset.comeca) + texto.textContent.length * Number(texto.dataset.porLetra),
));
const DURACAO_COMPLETA = FIM_DOS_TEXTOS + TEMPO_PARA_LER;
const DURACAO_CURTA = 0.7;
// Se o app demorar demais (internet lenta), a abertura sai mesmo assim e a
// tela inicial mostra os blocos piscando enquanto termina de carregar.
const ESPERA_MAXIMA = Math.max(7, DURACAO_COMPLETA + 1.5);
const CHAVE_DO_DIA = 'asciinatura:abertura-completa';

// "Computador" aqui é o aparelho com mouse (ponteiro preciso que passa por
// cima das coisas). Celulares e tablets usam o dedo.
const ehComputador = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

function deveAnimarCompleta() {
  if (reduzirMovimento()) return false;
  if (ehComputador) return true;
  try {
    const hoje = dataDeHoje();
    if (localStorage.getItem(CHAVE_DO_DIA) === hoje) return false;
    localStorage.setItem(CHAVE_DO_DIA, hoje);
    return true;
  } catch {
    // Navegador que não deixa guardar nada (janela anônima, por exemplo).
    return false;
  }
}

const completa = deveAnimarCompleta();
let pedidoDeFechar = null;

// Devolve uma promessa que se cumpre quando a abertura começa a sumir, para a
// tela de baixo poder começar a própria animação ao mesmo tempo.
export function fecharAbertura() {
  if (!pedidoDeFechar) {
    pedidoDeFechar = new Promise((resolver) => {
      const minimo = (completa ? DURACAO_COMPLETA : DURACAO_CURTA) * 1000;
      const falta = Math.max(0, minimo - (performance.now() - inicio));

      setTimeout(() => {
        abertura.classList.add('saindo');
        resolver();
        setTimeout(() => { abertura.hidden = true; }, 400);
      }, falta);
    });
  }
  return pedidoDeFechar;
}

setTimeout(fecharAbertura, ESPERA_MAXIMA * 1000);

// Animação completa ----------------------------------------------------------------

const limitar = (valor) => Math.min(1, Math.max(0, valor));
const suavizar = (p) => (p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2);

// Mostra só as primeiras letras de um texto, com uma letra sorteada na ponta.
function trecho(texto, p, comeca, porLetra) {
  const quantas = Math.floor((p - comeca) / porLetra);
  if (quantas <= 0) return '';
  if (quantas >= texto.length) return texto;
  return texto.slice(0, quantas) + LETRAS_SORTEIO[Math.floor(Math.random() * LETRAS_SORTEIO.length)];
}

function caminhoArredondado(ctx, x, y, largura, altura, raio) {
  ctx.beginPath();
  ctx.roundRect(x, y, largura, altura, raio);
}

function animarAbertura() {
  abertura.classList.add('animada');

  const canvas = abertura.querySelector('canvas');
  const espacoDoLogo = abertura.querySelector('.abertura-logo');
  // Cada parte do texto (Ascii, natura, a frase) guarda o texto final e o
  // tempo em que começa a aparecer, lidos do próprio HTML.
  const textos = [...abertura.querySelectorAll('[data-texto]')].map((elemento) => {
    const final = elemento.textContent;
    elemento.textContent = '';
    return { elemento, final, comeca: Number(elemento.dataset.comeca), porLetra: Number(elemento.dataset.porLetra) };
  });

  let area;
  let logo;
  let letras;

  // O logo usa as mesmas medidas do SVG (de 0 a 64), escaladas para o espaço
  // que o CSS reserva no meio da tela.
  function preparar() {
    area = prepararCanvas(canvas);
    const origem = canvas.getBoundingClientRect();
    const r = espacoDoLogo.getBoundingClientRect();
    logo = { x: r.left - origem.left, y: r.top - origem.top, lado: r.width, escala: r.width / 64 };

    // Cada célula da grade que cai dentro do círculo recebe uma letra, que
    // sai de um ponto aleatório da tela.
    const { celulaL, celulaA, largura, altura } = area;
    const cx = logo.x + 46 * logo.escala;
    const cy = logo.y + 44 * logo.escala;
    const raio = 26 * logo.escala;
    letras = [];
    for (let j = 0; j * celulaA < logo.lado; j++) {
      for (let i = 0; i * celulaL < logo.lado; i++) {
        const x = logo.x + i * celulaL;
        const y = logo.y + j * celulaA;
        if (Math.hypot(x + celulaL / 2 - cx, y + celulaA / 2 - cy) > raio) continue;
        letras.push({ x, y, deX: Math.random() * largura, deY: Math.random() * altura, atraso: Math.random() * 0.3, n: letras.length });
      }
    }
  }

  function desenhar(p) {
    const { ctx, largura, altura } = area;
    const { x, y, lado, escala } = logo;
    // Cores por papel, para a abertura seguir a paleta escolhida: quadrado na
    // cor do cartaz, círculo na cor do texto sobre o fundo forte e etiqueta
    // na cor do próprio fundo forte.
    const cinza = corDoTema('--cartaz');
    const claro = corDoTema('--sobre-forte');
    const verde = corDoTema('--forte');
    ctx.clearRect(0, 0, largura, altura);

    // 1. O quadrado cinza surge crescendo.
    const surgir = suavizar(limitar(p / 0.4));
    ctx.save();
    ctx.globalAlpha = surgir;
    ctx.translate(x + lado / 2, y + lado / 2);
    ctx.scale(0.85 + 0.15 * surgir, 0.85 + 0.15 * surgir);
    ctx.translate(-(x + lado / 2), -(y + lado / 2));
    caminhoArredondado(ctx, x, y, lado, lado, 16 * escala);
    ctx.fillStyle = cinza;
    ctx.fill();
    ctx.clip();

    // 3. As letras que chegaram viram o círculo sólido.
    const solido = limitar((p - 1.45) / 0.45);
    if (solido > 0) {
      ctx.globalAlpha = surgir * solido;
      ctx.beginPath();
      ctx.arc(x + 46 * escala, y + 44 * escala, 26 * escala, 0, Math.PI * 2);
      ctx.fillStyle = claro;
      ctx.fill();
    }
    ctx.globalAlpha = surgir * (1 - solido);
    ctx.fillStyle = claro;
    for (const letra of letras) {
      if (p - 0.4 - letra.atraso < 0.9) continue;
      ctx.fillText(ALGARISMOS[(letra.n * 7) % ALGARISMOS.length], letra.x, letra.y);
    }

    // 4. A etiqueta verde se estica.
    const etiqueta = suavizar(limitar((p - 1.8) / 0.35));
    if (etiqueta > 0) {
      ctx.globalAlpha = 1;
      caminhoArredondado(ctx, x + 8 * escala, y + 10 * escala, 24 * escala * etiqueta, 9 * escala, 4.5 * escala);
      ctx.fillStyle = verde;
      ctx.fill();
    }
    ctx.restore();

    // 2. As letras voam dos pontos aleatórios até o círculo.
    ctx.fillStyle = corDoTema('--ascii-medio');
    for (const letra of letras) {
      const avanco = limitar((p - 0.4 - letra.atraso) / 0.9);
      if (avanco >= 1) continue;
      const e = suavizar(avanco);
      ctx.globalAlpha = 0.4 + 0.6 * e;
      ctx.fillText(
        LETRAS_SORTEIO[(Math.floor(p * 14) + letra.n) % LETRAS_SORTEIO.length],
        letra.deX + (letra.x - letra.deX) * e,
        letra.deY + (letra.y - letra.deY) * e,
      );
    }
    ctx.globalAlpha = 1;

    // 5. O nome e a frase aparecem letra a letra.
    for (const texto of textos) {
      texto.elemento.textContent = trecho(texto.final, p, texto.comeca, texto.porLetra);
    }
  }

  preparar();
  window.addEventListener('resize', () => { preparar(); desenhar(99); });

  function laco(agora) {
    if (abertura.hidden) return;
    const p = (agora - inicio) / 1000;
    desenhar(p);
    if (p < DURACAO_COMPLETA + 0.3) requestAnimationFrame(laco);
  }
  requestAnimationFrame(laco);
}

if (completa) animarAbertura();
