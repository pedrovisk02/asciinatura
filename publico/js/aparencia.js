// Página Aparência: tema (paleta e claro ou escuro) e tamanho do texto. Aplica
// na página, guarda no aparelho e monta as escolhas ("A1 · Cartões e botões").
// As listas e a leitura do que foi guardado ficam no temas.js; o
// tema-inicial.js aplica o que foi guardado antes de a página aparecer.

import {
  PALETAS, MODOS, CHAVE_DO_TEMA, TEMA_PADRAO, textoDoTema, temaValido,
  TAMANHOS_DO_TEXTO, TAMANHO_PADRAO, CHAVE_DO_TAMANHO, lerTamanhoSalvo,
} from './temas.js';

const raiz = document.documentElement;

// Ícones fixos, escritos aqui mesmo (nunca texto de fora).
const ICONES_DO_MODO = {
  claro: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  escuro: '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
};

// O que aparece em cada botão do tamanho; o nome ("Menor"...) fica para o
// leitor de tela.
const SINAIS_DO_TAMANHO = { menor: 'A−', normal: 'A', maior: 'A+' };

export function temaAtual() {
  const tema = { paleta: raiz.dataset.paleta, modo: raiz.dataset.modo };
  return temaValido(tema) ? tema : { ...TEMA_PADRAO };
}

export function tamanhoAtual() {
  return lerTamanhoSalvo(raiz.dataset.tamanhoDoTexto);
}

// A barra do navegador no celular acompanha o fundo da paleta.
function atualizarCorDaBarra() {
  const cor = getComputedStyle(raiz).getPropertyValue('--fundo').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cor);
}

function guardar(chave, valor) {
  try {
    localStorage.setItem(chave, valor);
  } catch {
    // Navegador que não deixa guardar nada: a escolha vale só até fechar o app.
  }
}

export function aplicarTema(tema) {
  raiz.dataset.paleta = tema.paleta;
  raiz.dataset.modo = tema.modo;
  atualizarCorDaBarra();
  guardar(CHAVE_DO_TEMA, textoDoTema(tema));
}

export function aplicarTamanhoDoTexto(tamanho) {
  raiz.dataset.tamanhoDoTexto = tamanho;
  guardar(CHAVE_DO_TAMANHO, tamanho);
}

// Uma opção: botão de rádio de verdade (teclado e leitor de tela), invisível,
// dentro de um rótulo desenhado como cartão ou como botão.
function criarOpcao({ classe, grupo, valor, marcada }) {
  const rotulo = document.createElement('label');
  rotulo.className = classe;

  const entrada = document.createElement('input');
  entrada.type = 'radio';
  entrada.name = grupo;
  entrada.value = valor;
  entrada.checked = marcada;
  rotulo.append(entrada);
  return rotulo;
}

function criarTexto(texto, classe) {
  const pedaco = document.createElement('span');
  if (classe) pedaco.className = classe;
  pedaco.textContent = texto;
  return pedaco;
}

// Cartão da paleta: nome e três bolinhas com as cores dela.
function criarOpcaoDePaleta(paleta, marcada) {
  const rotulo = criarOpcao({ classe: 'opcao-tema opcao-paleta', grupo: 'paleta', valor: paleta.id, marcada });
  const bolinhas = document.createElement('span');
  bolinhas.className = 'amostras';
  bolinhas.setAttribute('aria-hidden', 'true');
  for (const cor of paleta.amostras) {
    const bolinha = document.createElement('span');
    bolinha.className = 'amostra';
    bolinha.style.background = cor;
    bolinhas.append(bolinha);
  }
  rotulo.append(criarTexto(paleta.nome), bolinhas);
  return rotulo;
}

function criarOpcaoDeModo(modo, marcada) {
  const rotulo = criarOpcao({ classe: 'opcao-segmento', grupo: 'modo', valor: modo.id, marcada });
  rotulo.insertAdjacentHTML('beforeend', ICONES_DO_MODO[modo.id]);
  rotulo.append(criarTexto(modo.nome));
  return rotulo;
}

function criarOpcaoDeTamanho(tamanho, marcada) {
  const rotulo = criarOpcao({ classe: 'opcao-segmento', grupo: 'tamanho-do-texto', valor: tamanho.id, marcada });
  const sinal = criarTexto(SINAIS_DO_TAMANHO[tamanho.id], `sinal-do-tamanho sinal-${tamanho.id}`);
  sinal.setAttribute('aria-hidden', 'true');
  rotulo.append(sinal, criarTexto(tamanho.nome, 'so-leitor'));
  return rotulo;
}

const valorMarcado = (grupo, padrao) => grupo.querySelector('input:checked')?.value ?? padrao;

export function prepararAparencia() {
  const tema = temaAtual();
  const tamanho = tamanhoAtual();
  const opcoesPaleta = document.querySelector('#opcoes-paleta');
  const opcoesModo = document.querySelector('#opcoes-modo');
  const opcoesTamanho = document.querySelector('#opcoes-tamanho');

  opcoesPaleta.replaceChildren(...PALETAS.map((paleta) => criarOpcaoDePaleta(paleta, paleta.id === tema.paleta)));
  opcoesModo.replaceChildren(...MODOS.map((modo) => criarOpcaoDeModo(modo, modo.id === tema.modo)));
  opcoesTamanho.replaceChildren(...TAMANHOS_DO_TEXTO.map((opcao) => criarOpcaoDeTamanho(opcao, opcao.id === tamanho)));

  // A cor e o tamanho mudam no clique, sem botão de salvar.
  const aoEscolherTema = () => aplicarTema({
    paleta: valorMarcado(opcoesPaleta, TEMA_PADRAO.paleta),
    modo: valorMarcado(opcoesModo, TEMA_PADRAO.modo),
  });
  opcoesPaleta.addEventListener('change', aoEscolherTema);
  opcoesModo.addEventListener('change', aoEscolherTema);
  opcoesTamanho.addEventListener('change', () => aplicarTamanhoDoTexto(valorMarcado(opcoesTamanho, TAMANHO_PADRAO)));

  atualizarCorDaBarra();
}
