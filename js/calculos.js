// Funções puras de cálculo: recebem valores e devolvem valores.
// Não sabem nada de tela nem de banco, e por isso dá para testar sozinhas.
// Testes em testes/calculos.test.js (rodar com: node --test).

// Quantos meses cada ciclo cobre.
const MESES_POR_CICLO = {
  mensal: 1,
  trimestral: 3,
  anual: 12,
};

function mesesDoCiclo(ciclo) {
  // Object.hasOwn evita aceitar nomes que todo objeto do JavaScript tem por
  // dentro, como "constructor".
  if (!Object.hasOwn(MESES_POR_CICLO, ciclo)) {
    // Melhor parar com erro do que somar um valor errado sem ninguém perceber.
    throw new Error(`Ciclo desconhecido: "${ciclo}"`);
  }
  return MESES_POR_CICLO[ciclo];
}

// Quanto o valor cobrado por ciclo pesa por mês.
// Ex: R$ 300 por ano pesam R$ 25 por mês.
//
// Não arredonda. O arredondamento para centavos fica para a hora de mostrar na
// tela; arredondar antes de somar faria o total errar por alguns centavos.
export function valorMensalEquivalente(valor, ciclo) {
  return valor / mesesDoCiclo(ciclo);
}

// ---------------------------------------------------------------------------
// Datas
//
// As datas andam como texto no mesmo formato do banco: "AAAA-MM-DD".
// De propósito, sem usar o Date do JavaScript para ler essas datas:
// new Date("2026-08-05") é interpretado como meia-noite no horário universal,
// que no Brasil ainda é dia 4 às 21h. Esse tipo de erro faria cobranças
// aparecerem um dia antes.

function lerData(texto) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
  const ano = Number(partes?.[1]);
  const mes = Number(partes?.[2]);
  const dia = Number(partes?.[3]);

  if (!partes || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    throw new Error(`Data em formato inesperado: "${texto}" (esperado AAAA-MM-DD)`);
  }
  return { ano, mes, dia };
}

function escreverData({ ano, mes, dia }) {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function anoBissexto(ano) {
  return (ano % 4 === 0 && ano % 100 !== 0) || ano % 400 === 0;
}

function ultimoDiaDoMes(ano, mes) {
  if (mes === 2) return anoBissexto(ano) ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

// Soma meses a uma data. Se o dia não existir no mês de destino (31 de
// setembro, por exemplo), usa o último dia desse mês.
function somarMeses(data, meses) {
  const mesesDesdeOAnoZero = data.ano * 12 + (data.mes - 1) + meses;
  const ano = Math.floor(mesesDesdeOAnoZero / 12);
  const mes = (mesesDesdeOAnoZero % 12) + 1;
  const dia = Math.min(data.dia, ultimoDiaDoMes(ano, mes));
  return { ano, mes, dia };
}

// Se a data gravada já passou, avança de ciclo em ciclo até chegar em hoje ou
// no futuro. Cobrança marcada para hoje ainda não passou.
//
// Cada tentativa soma ciclos à data gravada original, e não à tentativa
// anterior. Assim, uma assinatura do dia 31 cai em 28 de fevereiro, mas volta
// para 31 em março, em vez de ficar presa no dia 28 para sempre.
export function proximaDataValida(dataGravada, ciclo, hoje) {
  const meses = mesesDoCiclo(ciclo);
  const original = lerData(dataGravada);
  lerData(hoje); // só confere o formato

  for (let ciclos = 0; ; ciclos++) {
    const candidata = escreverData(somarMeses(original, ciclos * meses));

    // No formato AAAA-MM-DD, comparar os textos é o mesmo que comparar as datas.
    if (candidata >= hoje) return candidata;
  }
}
