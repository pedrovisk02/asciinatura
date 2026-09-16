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
  // O ano sempre com 4 dígitos: "26" viraria um texto que, comparado com
  // "2026-09-13", parece ser depois de hoje.
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
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

// Quantos dias do primeiro dia até o segundo (negativo se o segundo vier antes).
export function diasEntre(inicio, fim) {
  const a = lerData(inicio);
  const b = lerData(fim);
  // Date.UTC só faz a conta, não lê texto; e no horário universal todo dia tem
  // exatamente 24 horas, então a divisão sempre dá um número inteiro de dias.
  const milissegundosPorDia = 24 * 60 * 60 * 1000;
  return (Date.UTC(b.ano, b.mes - 1, b.dia) - Date.UTC(a.ano, a.mes - 1, a.dia)) / milissegundosPorDia;
}

// A data de hoje no relógio de quem está usando o app, no formato AAAA-MM-DD.
// Não usa toISOString(), que devolve a data no horário universal: no Brasil,
// depois das 21h, isso já seria o dia seguinte.
export function dataDeHoje(agora = new Date()) {
  return escreverData({ ano: agora.getFullYear(), mes: agora.getMonth() + 1, dia: agora.getDate() });
}

// Limites aceitos para o ano da próxima cobrança (os mesmos do campo de data).
const ANO_MINIMO = 2000;
const ANO_MAXIMO = 2099;

// Decide que data gravar ao salvar uma edição. Devolve undefined para manter
// a data que já está no banco.
//
// O formulário mostra a próxima cobrança já avançada, que é o que a pessoa
// espera ver. Mas gravar essa data sem a pessoa ter mexido nela poderia perder
// o dia original: uma assinatura do dia 31 mostrada como 28/02 passaria a ser
// do dia 28 para sempre.
export function dataParaGravarNaEdicao({ gravada, mostrada, digitada }) {
  // A pessoa mudou a data: vale o que ela digitou.
  if (digitada !== mostrada) return digitada;

  // A data gravada tem um ano fora do limite (ex: "0027"): aproveita para
  // consertar com a data que o formulário mostrou.
  const anoGravado = Number(gravada.split('-')[0]);
  if (!(anoGravado >= ANO_MINIMO && anoGravado <= ANO_MAXIMO)) return digitada;

  return undefined;
}

// "Membro desde setembro de 2026", a partir da data em que a conta foi criada
// (vem do Supabase no formato ISO, com hora). Usa o mês no relógio de quem
// está usando o app, como o resto das datas da tela.
const NOMES_DOS_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function textoMembroDesde(dataIso) {
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return '';
  return `Membro desde ${NOMES_DOS_MESES[data.getMonth()]} de ${data.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Tela inicial

// Até quantos dias à frente uma cobrança aparece em "Chegando" (hoje incluído).
// A pessoa escolhe entre estas opções na tela inicial.
export const JANELAS_DO_CHEGANDO = [7, 15, 30];
export const JANELA_PADRAO_DO_CHEGANDO = 30;

// Ordens da lista "Todas", escolhidas na tela inicial.
export const ORDENS_DA_LISTA = [
  { id: 'nome', nome: 'Nome (A a Z)' },
  { id: 'valor', nome: 'Maior valor' },
  { id: 'proxima', nome: 'Próxima cobrança' },
];
export const ORDEM_PADRAO_DA_LISTA = 'nome';

// Ordem alfabética do jeito que uma pessoa espera: sem separar maiúsculas de
// minúsculas e com acentos no lugar certo.
function compararNomes(a, b) {
  return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
}

// Em empate (mesmo valor ou mesmo dia), o nome desempata, para a lista não
// trocar de lugar sozinha entre uma carga e outra.
const COMPARAR_POR_ORDEM = {
  nome: compararNomes,
  valor: (a, b) => b.valorMensal - a.valorMensal || compararNomes(a, b),
  proxima: (a, b) => a.diasAteCobranca - b.diasAteCobranca || compararNomes(a, b),
};

// Monta tudo o que a tela inicial mostra, a partir das assinaturas como vêm do
// banco. Assinatura cancelada (ativa = false) fica fora do total e de
// "Chegando", mas continua na lista de canceladas.
// "diasDoChegando" e "ordem" vêm das escolhas da pessoa; valores desconhecidos
// usam o padrão.
export function resumoDoInicio(assinaturas, hoje, { diasDoChegando = JANELA_PADRAO_DO_CHEGANDO, ordem = ORDEM_PADRAO_DA_LISTA } = {}) {
  const janela = JANELAS_DO_CHEGANDO.includes(diasDoChegando) ? diasDoChegando : JANELA_PADRAO_DO_CHEGANDO;
  const comparar = COMPARAR_POR_ORDEM[ordem] ?? compararNomes;
  const ativas = [];
  const comProblema = [];

  for (const assinatura of assinaturas.filter((a) => a.ativa)) {
    try {
      // Data já avançada, se a gravada no banco tiver passado.
      const dataDaCobranca = proximaDataValida(assinatura.proxima_cobranca, assinatura.ciclo, hoje);
      ativas.push({
        ...assinatura,
        valorMensal: valorMensalEquivalente(assinatura.valor, assinatura.ciclo),
        dataDaCobranca,
        diasAteCobranca: diasEntre(hoje, dataDaCobranca),
      });
    } catch {
      // Dado que não dá para calcular (ex: data com ano de 5 dígitos). Fica
      // fora do total e é apontado na tela, em vez de travar a tela inteira ou
      // entrar na soma com um valor errado.
      comProblema.push(assinatura);
    }
  }

  return {
    totalMensal: ativas.reduce((soma, assinatura) => soma + assinatura.valorMensal, 0),
    quantidadeAtivas: ativas.length,
    chegando: ativas
      .filter((assinatura) => assinatura.diasAteCobranca <= janela)
      .sort(COMPARAR_POR_ORDEM.proxima),
    ativas: ativas.sort(comparar),
    comProblema: comProblema.sort(compararNomes),
    canceladas: assinaturas.filter((assinatura) => !assinatura.ativa).sort(compararNomes),
  };
}
