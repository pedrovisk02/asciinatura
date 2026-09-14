// Animações de letras (estilo ASCII), desenhadas em <canvas>.
//
// São só enfeite: os canvas ficam com aria-hidden no HTML, e quem pediu
// "reduzir movimento" nas configurações do aparelho vê um quadro parado.
// Nenhuma biblioteca: tudo com o canvas que o navegador já tem.

export const FONTE_ASCII = '500 12px "JetBrains Mono", ui-monospace, monospace';
// As letras sorteadas e as das manchas vêm do nome do app, Asciinatura.
export const LETRAS_SORTEIO = 'ASCINTUR$0123456789#%&*+=';
export const ALGARISMOS = '0123456789R$';
const LETRAS_MANCHAS = 'ASCIINATURA';
const LETRAS_BORDA = '.:-+';
const ALTURA_DA_CELULA = 14;

const preferenciaDeMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

export function reduzirMovimento() {
  return preferenciaDeMovimento.matches;
}

// Lê uma cor definida no estilo.css. Assim as animações seguem a paleta, e
// continuam seguindo quando os temas existirem. Lendo do próprio cartaz, as
// letras também invertem de cor quando o cartaz inverte (ao passar o mouse).
export function corDoTema(nome, elemento = document.documentElement) {
  return getComputedStyle(elemento).getPropertyValue(nome).trim();
}

// O círculo e as manchas se deslocam um pouco na direção do mouse. O alvo vem
// das variáveis --circulo-x e --circulo-y que o interacoes.js coloca no
// cartaz; aqui o desenho anda só uma parte do caminho por quadro, para o
// movimento sair suave, "devagar".
function acompanharMouse(estado, cartaz) {
  const alvoX = parseFloat(cartaz.style.getPropertyValue('--circulo-x')) || 0;
  const alvoY = parseFloat(cartaz.style.getPropertyValue('--circulo-y')) || 0;
  estado.x += (alvoX - estado.x) * 0.15;
  estado.y += (alvoY - estado.y) * 0.15;
}

// Ajusta o canvas ao tamanho em que aparece na tela. Multiplicar pela
// densidade de pixels deixa as letras nítidas em telas de celular.
export function prepararCanvas(canvas) {
  const { width, height } = canvas.getBoundingClientRect();
  const densidade = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.round(width * densidade));
  canvas.height = Math.max(1, Math.round(height * densidade));

  const ctx = canvas.getContext('2d');
  ctx.setTransform(densidade, 0, 0, densidade, 0, 0);
  ctx.font = FONTE_ASCII;
  ctx.textBaseline = 'top';

  // A tela vira uma grade de células, uma letra por célula.
  return { ctx, largura: width, altura: height, celulaL: ctx.measureText('0').width, celulaA: ALTURA_DA_CELULA };
}

// Laço de animação ------------------------------------------------------------

const animacoes = [];
let ultimoQuadro = 0;
let lacoIniciado = false;

// Registra um desenho que se repete. Ele só roda enquanto o canvas está
// visível, a cerca de 30 quadros por segundo (o bastante para o efeito e
// leve para a bateria), e se refaz quando o canvas muda de tamanho.
function animar(canvas, desenhar) {
  const animacao = { canvas, desenhar, area: null, precisaPreparar: true, desenhado: false };
  new ResizeObserver(() => { animacao.precisaPreparar = true; }).observe(canvas);
  animacoes.push(animacao);

  if (!lacoIniciado) {
    lacoIniciado = true;
    // Quando a fonte das letras terminar de carregar, a largura das células muda.
    document.fonts?.ready.then(() => animacoes.forEach((a) => { a.precisaPreparar = true; }));
    requestAnimationFrame(quadro);
  }
}

function quadro(agora) {
  requestAnimationFrame(quadro);
  if (agora - ultimoQuadro < 33) return;
  ultimoQuadro = agora;

  const parado = reduzirMovimento();
  for (const animacao of animacoes) {
    // offsetParent vazio: o canvas está numa tela escondida.
    if (animacao.canvas.offsetParent === null) continue;

    if (animacao.precisaPreparar) {
      animacao.area = prepararCanvas(animacao.canvas);
      animacao.precisaPreparar = false;
      animacao.desenhado = false;
    }
    if (parado && animacao.desenhado) continue;

    animacao.desenhar(animacao.area, parado ? 2 : agora / 1000);
    animacao.desenhado = true;
  }
}

// Manchas (telas de acesso) -------------------------------------------------------

// Manchas feitas das letras de "Asciinatura", que flutuam devagar e trocam de
// letra em onda. "evitar" são os elementos de texto do cartaz: as letras não
// passam por trás deles, para não atrapalhar a leitura.
export function animarManchas(canvas, evitar = []) {
  const cartaz = canvas.parentElement;
  const deslocamento = { x: 0, y: 0 };

  animar(canvas, ({ ctx, largura, altura, celulaL, celulaA }, t) => {
    ctx.clearRect(0, 0, largura, altura);
    acompanharMouse(deslocamento, cartaz);

    // Com o cartaz inclinado, as medidas de tela mudam; as zonas a evitar são
    // calculadas pelo tamanho sem inclinação (offsetLeft e offsetTop).
    const zonas = evitar.map((elemento) => ({
      x0: elemento.offsetLeft - 10,
      y0: elemento.offsetTop - 8,
      x1: elemento.offsetLeft + elemento.offsetWidth + 10,
      y1: elemento.offsetTop + elemento.offsetHeight + 8,
    }));
    const tons = ['--manchas-1', '--manchas-2', '--manchas-3', '--manchas-4'].map((nome) => corDoTema(nome, cartaz));

    // Cada mancha é um "ímã": posição (x, y), tamanho, velocidade e fase.
    // Juntas, formam um campo; onde o campo é forte, aparece letra. Ficam
    // mais à direita e embaixo, longe do título, que fica no alto à esquerda.
    const escala = Math.min(largura, altura);
    const manchas = [[0.82, 0.3, 0.18, 0.9, 0], [0.96, 0.78, 0.15, 0.7, 1.7], [0.66, 1.04, 0.21, 0.5, 3.1], [0.3, 1.1, 0.14, 1.1, 4.4]]
      .map(([x, y, tamanho, velocidade, fase]) => [
        largura * (x + 0.12 * Math.sin(t * velocidade * 0.5 + fase)) + deslocamento.x,
        altura * (y + 0.08 * Math.cos(t * velocidade * 0.4 + fase)) + deslocamento.y,
        escala * tamanho,
      ]);

    const colunas = Math.ceil(largura / celulaL);
    const linhas = Math.ceil(altura / celulaA);
    for (let j = 0; j < linhas; j++) {
      for (let i = 0; i < colunas; i++) {
        const x = i * celulaL;
        const y = j * celulaA;
        const cx = x + celulaL / 2;
        const cy = y + celulaA / 2;
        if (zonas.some((z) => cx > z.x0 && cx < z.x1 && cy > z.y0 && cy < z.y1)) continue;

        let campo = 0;
        for (const [mx, my, raio] of manchas) {
          const dx = cx - mx;
          const dy = cy - my;
          campo += (raio * raio) / (dx * dx + dy * dy + 1);
        }
        if (campo < 0.9) continue;

        // A "onda" faz as letras trocarem em diagonal, e não todas de uma vez.
        const onda = Math.floor(t * 3 + (i + j) * 0.18);
        if (campo < 1.2) {
          ctx.fillStyle = tons[0];
          ctx.fillText(LETRAS_BORDA[(i * 3 + j * 5 + onda) % LETRAS_BORDA.length], x, y);
        } else {
          ctx.fillStyle = tons[Math.min(3, Math.floor((campo - 1.2) * 1.8) + 1)];
          ctx.fillText(LETRAS_MANCHAS[(i * 5 + j * 11 + onda) % LETRAS_MANCHAS.length], x, y);
        }
      }
    }
  });
}

// Círculo do total ---------------------------------------------------------------

// O círculo do cartaz feito de algarismos e "R$", girando devagar. Posição e
// tamanho vêm do próprio CSS (.cartaz-total::before): o círculo de letras fica
// exatamente onde o círculo sólido ficaria, no celular e no computador.
export function animarCirculo(canvas, cartaz) {
  cartaz.classList.add('circulo-em-letras');
  const deslocamento = { x: 0, y: 0 };

  animar(canvas, ({ ctx, largura, altura, celulaL, celulaA }, t) => {
    ctx.clearRect(0, 0, largura, altura);
    acompanharMouse(deslocamento, cartaz);

    const circulo = getComputedStyle(cartaz, '::before');
    const raio = parseFloat(circulo.width) / 2;
    const cx = cartaz.clientWidth - parseFloat(circulo.right) - raio + deslocamento.x;
    const cy = parseFloat(circulo.top) + raio + deslocamento.y;
    if (!(raio > 0)) return;

    const tons = [corDoTema('--ascii-circulo', cartaz), corDoTema('--ascii-circulo-brilho', cartaz)];
    const primeiraColuna = Math.max(0, Math.floor((cx - raio) / celulaL));
    const ultimaColuna = Math.min(Math.ceil(largura / celulaL), Math.ceil((cx + raio) / celulaL));
    const primeiraLinha = Math.max(0, Math.floor((cy - raio) / celulaA));
    const ultimaLinha = Math.min(Math.ceil(altura / celulaA), Math.ceil((cy + raio) / celulaA));

    for (let j = primeiraLinha; j < ultimaLinha; j++) {
      for (let i = primeiraColuna; i < ultimaColuna; i++) {
        const dx = i * celulaL + celulaL / 2 - cx;
        const dy = j * celulaA + celulaA / 2 - cy;
        const distancia = Math.hypot(dx, dy) / raio;
        if (distancia > 1) continue;

        // Três "raios" claros que giram: o ângulo e a distância ao centro
        // decidem a cor e qual algarismo aparece em cada célula.
        const brilho = 0.5 + 0.5 * Math.sin(Math.atan2(dy, dx) * 3 - t * 1.4 + distancia * 7);
        ctx.fillStyle = brilho > 0.5 ? tons[1] : tons[0];
        ctx.fillText(ALGARISMOS[(i * 7 + j * 3 + Math.floor(brilho * 5)) % ALGARISMOS.length], i * celulaL, j * celulaA);
      }
    }
  });
}
