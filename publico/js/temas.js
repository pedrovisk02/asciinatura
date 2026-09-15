// Lista de paletas e de tamanhos do texto, e leitura do que ficou guardado no
// aparelho. Funções puras: não mexem na tela nem no navegador. Testes em
// testes/temas.test.js. Quem aplica na página é o aparencia.js, e quem aplica
// antes de a página aparecer é o tema-inicial.js.

// "amostras": três cores que representam a paleta nas bolinhas da escolha de
// tema (as cores de verdade de cada papel ficam no css/temas.css).
export const PALETAS = [
  { id: 'poster-verde', nome: 'Pôster verde', amostras: ['#2b4239', '#afafaf', '#ededed'] },
  { id: 'luxo-dourado', nome: 'Luxo dourado', amostras: ['#030303', '#2c2c2e', '#ffdb89'] },
  { id: 'indigo-salvia', nome: 'Índigo e sálvia', amostras: ['#3b3d66', '#ada49a', '#828e73'] },
  { id: 'jade-vermelho', nome: 'Jade e vermelho', amostras: ['#3ca081', '#b1302b', '#f5deb2'] },
  { id: 'terracota-pessego', nome: 'Terracota e pêssego', amostras: ['#bd433e', '#dc9960', '#ebc795'] },
  { id: 'cafe', nome: 'Café', amostras: ['#561c24', '#c7b7a3', '#e8d8c4'] },
  { id: 'ameixa', nome: 'Ameixa', amostras: ['#5b2d55', '#946a8c', '#d1b5c9'] },
  { id: 'concreto-metal', nome: 'Concreto e metal', amostras: ['#21262b', '#778899', '#f1f1f1'] },
];

export const MODOS = [
  { id: 'claro', nome: 'Claro' },
  { id: 'escuro', nome: 'Escuro' },
];

export const TEMA_PADRAO = Object.freeze({ paleta: 'poster-verde', modo: 'claro' });

// Nome da gaveta do navegador (localStorage) onde o tema fica guardado.
export const CHAVE_DO_TEMA = 'asciinatura:tema';

export function temaValido(tema) {
  return Boolean(
    tema
    && PALETAS.some((paleta) => paleta.id === tema.paleta)
    && MODOS.some((modo) => modo.id === tema.modo),
  );
}

// Lê o texto guardado. Qualquer coisa estranha (vazio, texto quebrado, paleta
// que não existe mais) volta para o padrão, em vez de deixar o app sem cor.
export function lerTemaSalvo(texto) {
  try {
    const tema = JSON.parse(texto);
    if (temaValido(tema)) return { paleta: tema.paleta, modo: tema.modo };
  } catch {
    // Texto que não é JSON: fica o padrão.
  }
  return { ...TEMA_PADRAO };
}

export function textoDoTema(tema) {
  return JSON.stringify({ paleta: tema.paleta, modo: tema.modo });
}

// Tamanho do texto -------------------------------------------------------------
// Guardado separado do tema: um valor estranho num não apaga a escolha do outro.
// Quanto cada tamanho aumenta ou diminui fica no estilo.css
// (:root[data-tamanho-do-texto]).

export const TAMANHOS_DO_TEXTO = [
  { id: 'menor', nome: 'Menor' },
  { id: 'normal', nome: 'Normal' },
  { id: 'maior', nome: 'Maior' },
];

export const TAMANHO_PADRAO = 'normal';

export const CHAVE_DO_TAMANHO = 'asciinatura:tamanho-do-texto';

export function lerTamanhoSalvo(texto) {
  return TAMANHOS_DO_TEXTO.some((tamanho) => tamanho.id === texto) ? texto : TAMANHO_PADRAO;
}
