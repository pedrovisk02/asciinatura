// Testes das funções de js/calculos.js.
// Como rodar, na pasta do projeto: node --test

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { valorMensalEquivalente, proximaDataValida } from '../js/calculos.js';

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
