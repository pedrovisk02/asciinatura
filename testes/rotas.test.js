// Testes de publico/js/rotas.js.
// Como rodar, na pasta do projeto: node --test

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { lerRota, enderecoDaRota, rotaPai, ROTAS_DE_AJUSTES } from '../publico/js/rotas.js';

describe('lerRota', () => {
  test('endereço vazio é a tela inicial', () => {
    for (const hash of ['', '#', '#/']) assert.equal(lerRota(hash), 'inicio');
  });

  test('cada página do app', () => {
    assert.equal(lerRota('#/conta'), 'conta');
    assert.equal(lerRota('#/configuracoes'), 'configuracoes');
    assert.equal(lerRota('#/configuracoes/aparencia'), 'aparencia');
    assert.equal(lerRota('#/assinatura'), 'assinatura');
  });

  test('barra sobrando no fim não atrapalha', () => {
    assert.equal(lerRota('#/conta/'), 'conta');
  });

  test('página que não existe volta para a tela inicial', () => {
    assert.equal(lerRota('#/nao-existe'), 'inicio');
  });

  test('o "#" do link de e-mail do Supabase não é uma rota do app', () => {
    assert.equal(lerRota('#access_token=abc&type=recovery'), null);
    assert.equal(lerRota('#error=access_denied&error_code=otp_expired'), null);
  });
});

describe('enderecoDaRota e rotaPai', () => {
  test('ida e volta: o endereço de cada rota é lido como a mesma rota', () => {
    for (const nome of ['inicio', 'assinatura', 'conta', 'configuracoes', 'aparencia']) {
      assert.equal(lerRota(enderecoDaRota(nome)), nome);
    }
  });

  test('rota desconhecida tem o endereço da tela inicial', () => {
    assert.equal(enderecoDaRota('qualquer'), '#/');
  });

  test('"Voltar" sem histórico sobe um nível', () => {
    assert.equal(rotaPai('aparencia'), 'configuracoes');
    assert.equal(rotaPai('configuracoes'), 'inicio');
    assert.equal(rotaPai('conta'), 'inicio');
    assert.equal(rotaPai('assinatura'), 'inicio');
    assert.equal(rotaPai('inicio'), null);
  });

  test('conta e configurações abrem a tela de ajustes', () => {
    assert.deepEqual(ROTAS_DE_AJUSTES, ['conta', 'configuracoes', 'aparencia']);
  });
});
