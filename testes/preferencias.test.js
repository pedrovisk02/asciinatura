// Testes da leitura das escolhas da tela inicial guardadas no aparelho
// (publico/js/preferencias.js).
// Como rodar, na pasta do projeto: node --test

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { lerValoresEscondidos, lerDiasDoChegando, lerOrdemDaLista } from '../publico/js/preferencias.js';

describe('lerValoresEscondidos', () => {
  test('só "sim" esconde; nada guardado ou qualquer outra coisa mostra os valores', () => {
    assert.equal(lerValoresEscondidos('sim'), true);
    for (const texto of [null, '', 'nao', 'true', 'SIM']) assert.equal(lerValoresEscondidos(texto), false, `texto: ${texto}`);
  });
});

describe('lerDiasDoChegando', () => {
  test('7, 15 e 30 são lidos como número', () => {
    assert.equal(lerDiasDoChegando('7'), 7);
    assert.equal(lerDiasDoChegando('15'), 15);
    assert.equal(lerDiasDoChegando('30'), 30);
  });

  test('nada guardado ou número que não é opção voltam para 30', () => {
    for (const texto of [null, '', '10', '-7', 'sete', '7.5']) assert.equal(lerDiasDoChegando(texto), 30, `texto: ${texto}`);
  });
});

describe('lerOrdemDaLista', () => {
  test('ordens conhecidas são lidas como estão', () => {
    for (const ordem of ['nome', 'valor', 'proxima']) assert.equal(lerOrdemDaLista(ordem), ordem);
  });

  test('nada guardado ou ordem desconhecida voltam para o nome', () => {
    for (const texto of [null, '', 'Valor', 'sorteio']) assert.equal(lerOrdemDaLista(texto), 'nome', `texto: ${texto}`);
  });
});
