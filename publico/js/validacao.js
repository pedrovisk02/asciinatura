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

// Aceita "44,90", "44.90", "44", "R$ 44,90" e "1.299,90". Devolve o número, ou
// uma mensagem de erro se não der para entender. Também usada pelos cartões de
// ciclo, que mostram o valor por mês enquanto a pessoa digita.
export function lerValor(texto) {
  const limpo = texto.replace(/R\$/i, '').replace(/\s/g, '');

  if (limpo === '') return { erro: 'Informe o valor.' };
  if (limpo.startsWith('-')) return { erro: 'O valor precisa ser maior que zero.' };

  let numero;
  if (/^\d+([.,]\d{1,2})?$/.test(limpo)) {
    // Sem milhar: vírgula ou ponto seguido de 1 ou 2 algarismos são os centavos.
    numero = limpo.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(limpo)) {
    // Com milhar, do jeito brasileiro: pontos separando grupos de 3
    // algarismos e vírgula para os centavos ("1.299,90").
    numero = limpo.replaceAll('.', '').replace(',', '.');
  } else {
    return { erro: 'Use só números, com vírgula para os centavos. Ex: 44,90' };
  }

  const valor = Number(numero);
  if (valor === 0) return { erro: 'O valor precisa ser maior que zero.' };
  if (valor > VALOR_MAXIMO) return { erro: 'Valor alto demais.' };
  return { valor };
}

function erroDaData(texto) {
  // Sem data escolhida no calendário.
  if (texto === '') return 'Escolha a data da próxima cobrança.';

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

// Conta ---------------------------------------------------------------------------

// Nome ou apelido: obrigatório, até 30 caracteres, sem os espaços das pontas.
export const TAMANHO_MAXIMO_DO_NOME = 30;

export function validarNome(texto = '') {
  const nome = (texto ?? '').trim();
  if (nome === '') return { erro: 'Informe como quer ser chamado.' };
  if ([...nome].length > TAMANHO_MAXIMO_DO_NOME) return { erro: `Use no máximo ${TAMANHO_MAXIMO_DO_NOME} caracteres.` };
  return { nome };
}

// Troca de senha: a atual é conferida pelo login antes de trocar (auth.js).
export const TAMANHO_MINIMO_DA_SENHA = 8;

export function validarTrocaDeSenha({ atual = '', nova = '' } = {}) {
  const erros = {};
  if (!atual) erros.atual = 'Informe a senha atual.';
  if (!nova) erros.nova = 'Informe a nova senha.';
  else if (nova.length < TAMANHO_MINIMO_DA_SENHA) erros.nova = `Use pelo menos ${TAMANHO_MINIMO_DA_SENHA} caracteres.`;
  else if (nova === atual) erros.nova = 'A nova senha precisa ser diferente da atual.';
  return { valido: Object.keys(erros).length === 0, erros };
}

// Valor do banco (44.9) no jeito brasileiro de escrever no campo ("44,90").
export function valorParaOCampo(valor) {
  return valor.toFixed(2).replace('.', ',');
}
