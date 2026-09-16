// Escolhas da tela inicial guardadas no aparelho: esconder valores, quantos
// dias mostrar em "Chegando" e a ordem de "Todas". Ficam no aparelho, como o
// tema, porque dizem respeito a quem está olhando para esta tela.
//
// As funções "ler..." são puras (testes em testes/preferencias.test.js):
// qualquer valor estranho volta para o padrão.

import {
  JANELAS_DO_CHEGANDO, JANELA_PADRAO_DO_CHEGANDO, ORDENS_DA_LISTA, ORDEM_PADRAO_DA_LISTA,
} from './calculos.js';

const CHAVES = {
  valoresEscondidos: 'asciinatura:esconder-valores',
  diasDoChegando: 'asciinatura:dias-do-chegando',
  ordem: 'asciinatura:ordem-da-lista',
};

export function lerValoresEscondidos(texto) {
  return texto === 'sim';
}

export function lerDiasDoChegando(texto) {
  const dias = Number(texto);
  return JANELAS_DO_CHEGANDO.includes(dias) ? dias : JANELA_PADRAO_DO_CHEGANDO;
}

export function lerOrdemDaLista(texto) {
  return ORDENS_DA_LISTA.some((ordem) => ordem.id === texto) ? texto : ORDEM_PADRAO_DA_LISTA;
}

function lerGuardado(chave) {
  try {
    return localStorage.getItem(chave);
  } catch {
    // Navegador que não deixa guardar nada: vale o padrão.
    return null;
  }
}

export function lerPreferenciasDoInicio() {
  return {
    valoresEscondidos: lerValoresEscondidos(lerGuardado(CHAVES.valoresEscondidos)),
    diasDoChegando: lerDiasDoChegando(lerGuardado(CHAVES.diasDoChegando)),
    ordem: lerOrdemDaLista(lerGuardado(CHAVES.ordem)),
  };
}

export function guardarPreferenciasDoInicio({ valoresEscondidos, diasDoChegando, ordem }) {
  try {
    localStorage.setItem(CHAVES.valoresEscondidos, valoresEscondidos ? 'sim' : 'nao');
    localStorage.setItem(CHAVES.diasDoChegando, String(diasDoChegando));
    localStorage.setItem(CHAVES.ordem, ordem);
  } catch {
    // Sem onde guardar: a escolha vale só até fechar o app.
  }
}
