// Testes de js/validacao.js e js/erros.js.
// Como rodar, na pasta do projeto: node --test

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { validarAssinatura, valorParaOCampo } from '../js/validacao.js';
import { mensagemDeErro, MENSAGEM_SEM_CONEXAO } from '../js/erros.js';

const valida = {
  nome: 'Netflix',
  valor: '44,90',
  ciclo: 'mensal',
  proximaCobranca: '2026-10-05',
  categoria: '',
};

describe('validarAssinatura', () => {
  test('formulário completo passa e converte os valores', () => {
    const resultado = validarAssinatura(valida);
    assert.equal(resultado.valido, true);
    assert.deepEqual(resultado.erros, {});
    assert.deepEqual(resultado.campos, {
      nome: 'Netflix',
      valor: 44.9,
      ciclo: 'mensal',
      proximaCobranca: '2026-10-05',
      categoria: null,
    });
  });

  // Teste 5 da spec: formulário vazio e valor negativo são recusados

  test('formulário vazio: aponta nome, valor e data', () => {
    const resultado = validarAssinatura({ ciclo: 'mensal' });
    assert.equal(resultado.valido, false);
    assert.deepEqual(Object.keys(resultado.erros).sort(), ['nome', 'proximaCobranca', 'valor']);
  });

  test('valor negativo é recusado com mensagem clara', () => {
    assert.equal(validarAssinatura({ ...valida, valor: '-10' }).erros.valor, 'O valor precisa ser maior que zero.');
  });

  test('valor zero é recusado', () => {
    assert.equal(validarAssinatura({ ...valida, valor: '0' }).erros.valor, 'O valor precisa ser maior que zero.');
    assert.equal(validarAssinatura({ ...valida, valor: '0,00' }).erros.valor, 'O valor precisa ser maior que zero.');
  });

  test('valor com texto é recusado', () => {
    assert.match(validarAssinatura({ ...valida, valor: 'quarenta' }).erros.valor, /Use só números/);
    assert.match(validarAssinatura({ ...valida, valor: '44,9,0' }).erros.valor, /Use só números/);
  });

  test('valor aceita vírgula, ponto, sem centavos e com "R$"', () => {
    assert.equal(validarAssinatura({ ...valida, valor: '44,90' }).campos.valor, 44.9);
    assert.equal(validarAssinatura({ ...valida, valor: '44.90' }).campos.valor, 44.9);
    assert.equal(validarAssinatura({ ...valida, valor: '300' }).campos.valor, 300);
    assert.equal(validarAssinatura({ ...valida, valor: 'R$ 21,90' }).campos.valor, 21.9);
  });

  test('valor com mais de 2 casas decimais é recusado', () => {
    assert.match(validarAssinatura({ ...valida, valor: '44,999' }).erros.valor, /Use só números/);
  });

  test('valor maior do que cabe no banco é recusado', () => {
    assert.equal(validarAssinatura({ ...valida, valor: '100000000' }).erros.valor, 'Valor alto demais.');
  });

  test('nome só com espaços é recusado', () => {
    assert.equal(validarAssinatura({ ...valida, nome: '   ' }).erros.nome, 'Informe o nome da assinatura.');
  });

  test('nome com mais de 100 caracteres é recusado', () => {
    assert.match(validarAssinatura({ ...valida, nome: 'a'.repeat(101) }).erros.nome, /100 caracteres/);
  });

  test('nome e categoria perdem os espaços das pontas', () => {
    const { campos } = validarAssinatura({ ...valida, nome: '  Netflix ', categoria: ' streaming ' });
    assert.equal(campos.nome, 'Netflix');
    assert.equal(campos.categoria, 'streaming');
  });

  test('data incompleta pede a data completa', () => {
    assert.match(validarAssinatura({ ...valida, proximaCobranca: '' }).erros.proximaCobranca, /data completa/);
  });

  test('data com ano fora de 2000 a 2099 é recusada', () => {
    assert.match(validarAssinatura({ ...valida, proximaCobranca: '0026-08-05' }).erros.proximaCobranca, /entre 2000 e 2099/);
    assert.match(validarAssinatura({ ...valida, proximaCobranca: '20262-08-05' }).erros.proximaCobranca, /entre 2000 e 2099/);
  });

  test('ciclo fora da lista é recusado', () => {
    assert.equal(validarAssinatura({ ...valida, ciclo: 'semanal' }).erros.ciclo, 'Escolha o ciclo.');
  });

  test('categoria com mais de 50 caracteres é recusada', () => {
    assert.match(validarAssinatura({ ...valida, categoria: 'b'.repeat(51) }).erros.categoria, /50 caracteres/);
  });
});

describe('valorParaOCampo', () => {
  test('escreve com vírgula e duas casas', () => {
    assert.equal(valorParaOCampo(44.9), '44,90');
    assert.equal(valorParaOCampo(300), '300,00');
  });
});

describe('mensagemDeErro', () => {
  test('sem internet no login', () => {
    assert.equal(mensagemDeErro({ name: 'AuthRetryableFetchError', status: 0 }), MENSAGEM_SEM_CONEXAO);
  });

  test('sem internet no banco (formato real devolvido pela biblioteca)', () => {
    const erro = { message: 'TypeError: Failed to fetch', details: 'TypeError: Failed to fetch', hint: '', code: '' };
    assert.equal(mensagemDeErro(erro), MENSAGEM_SEM_CONEXAO);
  });

  test('senha errada e conta inexistente têm a mesma frase', () => {
    assert.equal(mensagemDeErro({ code: 'invalid_credentials' }), 'E-mail ou senha incorretos.');
  });

  test('regra do banco recusou o dado', () => {
    assert.match(mensagemDeErro({ code: '23514', message: 'violates check constraint' }), /não foi aceito/);
  });

  test('erro desconhecido tem frase genérica, sem detalhe técnico', () => {
    assert.equal(mensagemDeErro({ code: 'XYZ', message: 'stack trace...' }), 'Algo deu errado. Tente de novo em instantes.');
  });
});
