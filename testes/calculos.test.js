// Testes das funções de publico/js/calculos.js.
// Como rodar, na pasta do projeto: node --test

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  valorMensalEquivalente,
  proximaDataValida,
  diasEntre,
  dataDeHoje,
  resumoDoInicio,
  dataParaGravarNaEdicao,
  textoMembroDesde,
} from '../publico/js/calculos.js';

// Compara valores em reais ignorando a imprecisão minúscula das contas com
// vírgula no computador (44,90 + 25 pode dar 69,899999999999...).
function quaseIgual(obtido, esperado) {
  assert.ok(Math.abs(obtido - esperado) < 1e-9, `esperado ${esperado}, obtido ${obtido}`);
}

describe('valorMensalEquivalente', () => {
  // Casos do plano (Passo 4)

  test('300 anual vira 25 por mês', () => {
    assert.equal(valorMensalEquivalente(300, 'anual'), 25);
  });

  test('90 trimestral vira 30 por mês', () => {
    assert.equal(valorMensalEquivalente(90, 'trimestral'), 30);
  });

  test('44,90 mensal continua 44,90', () => {
    assert.equal(valorMensalEquivalente(44.9, 'mensal'), 44.9);
  });

  // Casos extras

  test('não arredonda: 100 trimestral dá 33,333...', () => {
    assert.equal(valorMensalEquivalente(100, 'trimestral'), 100 / 3);
  });

  test('ciclo desconhecido dá erro em vez de somar errado', () => {
    assert.throws(() => valorMensalEquivalente(10, 'semanal'), /Ciclo desconhecido/);
    assert.throws(() => valorMensalEquivalente(10, 'constructor'), /Ciclo desconhecido/);
  });
});

describe('proximaDataValida', () => {
  const HOJE = '2026-09-13';

  // Casos do plano (Passo 4)

  test('05/08 mensal, hoje 13/09: vai para 05/10', () => {
    assert.equal(proximaDataValida('2026-08-05', 'mensal', HOJE), '2026-10-05');
  });

  test('05/08 anual, hoje 13/09: vai para 05/08 do ano seguinte', () => {
    assert.equal(proximaDataValida('2026-08-05', 'anual', HOJE), '2027-08-05');
  });

  test('dia 31, próximo mês com 30 dias: cai no dia 30', () => {
    assert.equal(proximaDataValida('2026-08-31', 'mensal', HOJE), '2026-09-30');
  });

  test('data futura fica inalterada, em qualquer ciclo', () => {
    for (const ciclo of ['mensal', 'trimestral', 'anual']) {
      assert.equal(proximaDataValida('2026-12-01', ciclo, HOJE), '2026-12-01');
    }
  });

  // Casos extras

  test('cobrança marcada para hoje ainda não passou', () => {
    assert.equal(proximaDataValida(HOJE, 'mensal', HOJE), HOJE);
  });

  test('dia 31 cai em 28/02, mas volta para 31 em março', () => {
    assert.equal(proximaDataValida('2026-01-31', 'mensal', '2026-02-10'), '2026-02-28');
    assert.equal(proximaDataValida('2026-01-31', 'mensal', '2026-03-01'), '2026-03-31');
  });

  test('29/02 anual: 28/02 em ano comum, 29/02 de novo em ano bissexto', () => {
    assert.equal(proximaDataValida('2024-02-29', 'anual', '2025-01-01'), '2025-02-28');
    assert.equal(proximaDataValida('2024-02-29', 'anual', '2027-03-01'), '2028-02-29');
  });

  test('trimestral atravessando a virada do ano', () => {
    assert.equal(proximaDataValida('2026-11-15', 'trimestral', '2027-01-20'), '2027-02-15');
  });

  test('ano digitado com 2 dígitos ("0026") avança sem se confundir com o futuro', () => {
    assert.equal(proximaDataValida('0026-08-05', 'mensal', HOJE), '2026-10-05');
  });

  test('data de anos atrás avança até a próxima cobrança certa', () => {
    assert.equal(proximaDataValida('2020-01-10', 'mensal', HOJE), '2026-10-10');
  });

  test('data em formato inesperado dá erro', () => {
    assert.throws(() => proximaDataValida('05/08/2026', 'mensal', HOJE), /formato inesperado/);
    assert.throws(() => proximaDataValida('2026-13-01', 'mensal', HOJE), /formato inesperado/);
  });

  test('ciclo desconhecido dá erro', () => {
    assert.throws(() => proximaDataValida('2026-08-05', 'semanal', HOJE), /Ciclo desconhecido/);
  });
});

describe('diasEntre', () => {
  test('conta os dias entre duas datas', () => {
    assert.equal(diasEntre('2026-09-13', '2026-10-05'), 22);
  });

  test('mesma data dá zero', () => {
    assert.equal(diasEntre('2026-09-13', '2026-09-13'), 0);
  });

  test('atravessa a virada do ano', () => {
    assert.equal(diasEntre('2026-12-31', '2027-01-01'), 1);
  });

  test('data anterior dá número negativo', () => {
    assert.equal(diasEntre('2026-09-13', '2026-09-10'), -3);
  });
});

describe('dataDeHoje', () => {
  test('usa o dia do relógio local, mesmo tarde da noite', () => {
    // 23h30 de 13/09. No horário universal já seria 14/09 no Brasil.
    assert.equal(dataDeHoje(new Date(2026, 8, 13, 23, 30)), '2026-09-13');
  });

  test('completa mês e dia com zero à esquerda', () => {
    assert.equal(dataDeHoje(new Date(2026, 0, 5, 0, 5)), '2026-01-05');
  });
});

describe('dataParaGravarNaEdicao', () => {
  test('sem mexer na data, mantém a gravada (o dia 31 não vira 28)', () => {
    const resultado = dataParaGravarNaEdicao({
      gravada: '2026-01-31',
      mostrada: '2026-02-28',
      digitada: '2026-02-28',
    });
    assert.equal(resultado, undefined);
  });

  test('data que já passou, sem mexer: mantém a gravada', () => {
    const resultado = dataParaGravarNaEdicao({
      gravada: '2026-08-05',
      mostrada: '2026-10-05',
      digitada: '2026-10-05',
    });
    assert.equal(resultado, undefined);
  });

  test('a pessoa mudou a data: grava a nova', () => {
    const resultado = dataParaGravarNaEdicao({
      gravada: '2026-08-05',
      mostrada: '2026-10-05',
      digitada: '2026-10-20',
    });
    assert.equal(resultado, '2026-10-20');
  });

  test('ano gravado fora do limite ("0027"): conserta com a data mostrada', () => {
    const resultado = dataParaGravarNaEdicao({
      gravada: '0027-03-01',
      mostrada: '2027-03-01',
      digitada: '2027-03-01',
    });
    assert.equal(resultado, '2027-03-01');
  });

  test('ano gravado com 5 dígitos: grava a data corrigida pela pessoa', () => {
    const resultado = dataParaGravarNaEdicao({
      gravada: '20262-08-05',
      mostrada: '20262-08-05',
      digitada: '2026-08-05',
    });
    assert.equal(resultado, '2026-08-05');
  });
});

describe('resumoDoInicio', () => {
  const HOJE = '2026-09-13';

  const netflix = { nome: 'Netflix', valor: 44.9, ciclo: 'mensal', proxima_cobranca: '2026-08-05', ativa: true };
  const adobe = { nome: 'Adobe', valor: 300, ciclo: 'anual', proxima_cobranca: '2027-01-10', ativa: true };
  const academia = { nome: 'academia', valor: 90, ciclo: 'trimestral', proxima_cobranca: '2026-09-13', ativa: true };
  const spotify = { nome: 'Spotify', valor: 21.9, ciclo: 'mensal', proxima_cobranca: '2026-09-20', ativa: false };

  const resumo = resumoDoInicio([netflix, adobe, academia, spotify], HOJE);

  test('total do mês soma o equivalente mensal das ativas: 44,90 + 25 + 30', () => {
    quaseIgual(resumo.totalMensal, 99.9);
  });

  test('conta só as ativas', () => {
    assert.equal(resumo.quantidadeAtivas, 3);
  });

  test('cancelada fica fora do total e de "Chegando", mas aparece nas canceladas', () => {
    assert.ok(!resumo.chegando.some((a) => a.nome === 'Spotify'));
    assert.ok(!resumo.ativas.some((a) => a.nome === 'Spotify'));
    assert.deepEqual(resumo.canceladas.map((a) => a.nome), ['Spotify']);
  });

  test('"Chegando" traz só os próximos 30 dias, da mais próxima para a mais distante', () => {
    assert.deepEqual(
      resumo.chegando.map((a) => [a.nome, a.diasAteCobranca]),
      [['academia', 0], ['Netflix', 22]],
    );
  });

  test('"Chegando" usa a data já avançada, e não a gravada no banco', () => {
    const cobrancaNetflix = resumo.chegando.find((a) => a.nome === 'Netflix');
    assert.equal(cobrancaNetflix.dataDaCobranca, '2026-10-05');
  });

  test('limite de 30 dias: dia 30 entra, dia 31 fica de fora', () => {
    const dia30 = { nome: 'Dia 30', valor: 10, ciclo: 'mensal', proxima_cobranca: '2026-10-13', ativa: true };
    const dia31 = { nome: 'Dia 31', valor: 10, ciclo: 'mensal', proxima_cobranca: '2026-10-14', ativa: true };
    const nomes = resumoDoInicio([dia30, dia31], HOJE).chegando.map((a) => a.nome);
    assert.deepEqual(nomes, ['Dia 30']);
  });

  test('todas as ativas em ordem alfabética, sem separar maiúsculas de minúsculas', () => {
    assert.deepEqual(resumo.ativas.map((a) => a.nome), ['academia', 'Adobe', 'Netflix']);
  });

  test('assinatura anual mostra o equivalente mensal', () => {
    quaseIgual(resumo.ativas.find((a) => a.nome === 'Adobe').valorMensal, 25);
  });

  test('sem nenhuma assinatura, tudo zerado e vazio', () => {
    assert.deepEqual(resumoDoInicio([], HOJE), {
      totalMensal: 0,
      quantidadeAtivas: 0,
      chegando: [],
      ativas: [],
      comProblema: [],
      canceladas: [],
    });
  });

  test('data que não dá para calcular não trava o resto: fica fora do total e é apontada', () => {
    const quebrada = { nome: 'Data quebrada', valor: 20, ciclo: 'mensal', proxima_cobranca: '20262-08-05', ativa: true };
    const resultado = resumoDoInicio([netflix, quebrada], HOJE);

    quaseIgual(resultado.totalMensal, 44.9);
    assert.equal(resultado.quantidadeAtivas, 1);
    assert.deepEqual(resultado.ativas.map((a) => a.nome), ['Netflix']);
    assert.deepEqual(resultado.chegando.map((a) => a.nome), ['Netflix']);
    assert.deepEqual(resultado.comProblema.map((a) => a.nome), ['Data quebrada']);
  });

  test('não altera a lista recebida', () => {
    const lista = [netflix, adobe];
    resumoDoInicio(lista, HOJE);
    assert.deepEqual(lista.map((a) => a.nome), ['Netflix', 'Adobe']);
    assert.equal(netflix.proxima_cobranca, '2026-08-05');
  });
});

describe('textoMembroDesde', () => {
  test('mês por extenso e ano', () => {
    // Meio do mês, para o fuso horário de quem roda o teste não mudar o mês.
    assert.equal(textoMembroDesde('2026-09-13T15:00:00Z'), 'Membro desde setembro de 2026');
    assert.equal(textoMembroDesde('2025-03-15T12:00:00Z'), 'Membro desde março de 2025');
  });

  test('data inválida não mostra nada', () => {
    assert.equal(textoMembroDesde('ontem'), '');
    assert.equal(textoMembroDesde(undefined), '');
  });
});
