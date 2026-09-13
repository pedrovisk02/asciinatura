// Confere o formulário de assinatura antes de mandar para o banco.
// Função pura: recebe o que foi digitado e devolve os erros por campo e os
// valores já convertidos. Testes em testes/validacao.test.js.
//
// O banco também confere (tamanho, valor positivo, ciclo, data). Esta
// conferência existe para a mensagem aparecer ao lado do campo, em português,
// antes de qualquer envio.

const CICLOS = ['mensal', 'trimestral', 'anual'];

// Maior valor que cabe na coluna do banco: numeric(10, 2).
const VALOR_MAXIMO = 99_999_999.99;

// Aceita "44,90", "44.90", "44" e "R$ 44,90". Devolve o número, ou uma
// mensagem de erro se não der para entender.
function lerValor(texto) {
  const limpo = texto.replace(/R\$/i, '').replace(/\s/g, '');

  if (limpo === '') return { erro: 'Informe o valor.' };
  if (limpo.startsWith('-')) return { erro: 'O valor precisa ser maior que zero.' };

  // Só números, com vírgula ou ponto e até 2 casas para os centavos.
  if (!/^\d+([.,]\d{1,2})?$/.test(limpo)) {
    return { erro: 'Use só números, com vírgula para os centavos. Ex: 44,90' };
  }

  const valor = Number(limpo.replace(',', '.'));
  if (valor === 0) return { erro: 'O valor precisa ser maior que zero.' };
  if (valor > VALOR_MAXIMO) return { erro: 'Valor alto demais.' };
  return { valor };
}

function erroDaData(texto) {
  // O campo de data devolve texto vazio enquanto a data estiver incompleta.
  if (texto === '') return 'Informe a data completa: dia, mês e ano.';

  const partes = /^(\d{4})-\d{2}-\d{2}$/.exec(texto);
  const ano = Number(partes?.[1]);
  if (!partes || ano < 2000 || ano > 2099) return 'Use uma data entre 2000 e 2099.';
  return null;
}

export function validarAssinatura({ nome = '', valor = '', ciclo = '', proximaCobranca = '', categoria = '' }) {
  const erros = {};
  const nomeLimpo = nome.trim();
  const categoriaLimpa = categoria.trim();

  if (nomeLimpo === '') erros.nome = 'Informe o nome da assinatura.';
  else if (nomeLimpo.length > 100) erros.nome = 'Use no máximo 100 caracteres.';

  const leitura = lerValor(valor);
  if (leitura.erro) erros.valor = leitura.erro;

  if (!CICLOS.includes(ciclo)) erros.ciclo = 'Escolha o ciclo.';

  const erroData = erroDaData(proximaCobranca);
  if (erroData) erros.proximaCobranca = erroData;

  if (categoriaLimpa.length > 50) erros.categoria = 'Use no máximo 50 caracteres.';

  return {
    valido: Object.keys(erros).length === 0,
    erros,
    campos: {
      nome: nomeLimpo,
      valor: leitura.valor,
      ciclo,
      proximaCobranca,
      categoria: categoriaLimpa || null,
    },
  };
}

// Valor do banco (44.9) no jeito brasileiro de escrever no campo ("44,90").
export function valorParaOCampo(valor) {
  return valor.toFixed(2).replace('.', ',');
}
