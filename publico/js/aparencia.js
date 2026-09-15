// Tema do app (paleta e claro ou escuro): aplica na página, guarda no aparelho
// e monta a escolha da página Aparência. A lista de paletas e a leitura do que
// foi guardado ficam no temas.js; o tema-inicial.js aplica o tema guardado
// antes de a página aparecer.

import { PALETAS, MODOS, CHAVE_DO_TEMA, TEMA_PADRAO, textoDoTema, temaValido } from './temas.js';

const raiz = document.documentElement;

export function temaAtual() {
  const tema = { paleta: raiz.dataset.paleta, modo: raiz.dataset.modo };
  return temaValido(tema) ? tema : { ...TEMA_PADRAO };
}

// A barra do navegador no celular acompanha o fundo da paleta.
function atualizarCorDaBarra() {
  const cor = getComputedStyle(raiz).getPropertyValue('--fundo').trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cor);
}

export function aplicarTema(tema) {
  raiz.dataset.paleta = tema.paleta;
  raiz.dataset.modo = tema.modo;
  atualizarCorDaBarra();
  try {
    localStorage.setItem(CHAVE_DO_TEMA, textoDoTema(tema));
  } catch {
    // Navegador que não deixa guardar nada: o tema vale só até fechar o app.
  }
}

// Uma opção da escolha: botão de rádio de verdade (teclado e leitor de tela),
// desenhado como cartão, com bolinhas de amostra das cores quando houver.
function criarOpcao({ grupo, valor, nome, marcada, amostras = [] }) {
  const rotulo = document.createElement('label');
  rotulo.className = 'opcao-tema';

  const entrada = document.createElement('input');
  entrada.type = 'radio';
  entrada.name = grupo;
  entrada.value = valor;
  entrada.checked = marcada;

  const texto = document.createElement('span');
  texto.textContent = nome;
  rotulo.append(entrada, texto);

  if (amostras.length > 0) {
    const bolinhas = document.createElement('span');
    bolinhas.className = 'amostras';
    bolinhas.setAttribute('aria-hidden', 'true');
    for (const cor of amostras) {
      const bolinha = document.createElement('span');
      bolinha.className = 'amostra';
      bolinha.style.background = cor;
      bolinhas.append(bolinha);
    }
    rotulo.append(bolinhas);
  }
  return rotulo;
}

export function prepararAparencia() {
  const atual = temaAtual();
  const opcoesPaleta = document.querySelector('#opcoes-paleta');
  const opcoesModo = document.querySelector('#opcoes-modo');

  opcoesPaleta.replaceChildren(...PALETAS.map((paleta) => criarOpcao({
    grupo: 'paleta', valor: paleta.id, nome: paleta.nome, marcada: paleta.id === atual.paleta, amostras: paleta.amostras,
  })));
  opcoesModo.replaceChildren(...MODOS.map((modo) => criarOpcao({
    grupo: 'modo', valor: modo.id, nome: modo.nome, marcada: modo.id === atual.modo,
  })));

  const aoEscolher = () => aplicarTema({
    paleta: opcoesPaleta.querySelector('input:checked')?.value ?? TEMA_PADRAO.paleta,
    modo: opcoesModo.querySelector('input:checked')?.value ?? TEMA_PADRAO.modo,
  });
  opcoesPaleta.addEventListener('change', aoEscolher);
  opcoesModo.addEventListener('change', aoEscolher);

  atualizarCorDaBarra();
}
