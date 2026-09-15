// Testes da aparência: leitura do tema e do tamanho do texto guardados, listas
// iguais nos dois scripts, cada paleta completa no temas.css, contraste de
// todas as combinações e letras que acompanham o tamanho do texto.
// Como rodar, na pasta do projeto: node --test

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PALETAS, MODOS, TEMA_PADRAO, lerTemaSalvo, textoDoTema, temaValido,
  TAMANHOS_DO_TEXTO, TAMANHO_PADRAO, lerTamanhoSalvo,
} from '../publico/js/temas.js';

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), 'utf8');
const estilo = ler('../publico/css/estilo.css');
const temas = ler('../publico/css/temas.css');
const temaInicial = ler('../publico/js/tema-inicial.js');

describe('lerTemaSalvo', () => {
  test('tema válido é lido como está', () => {
    assert.deepEqual(lerTemaSalvo('{"paleta":"cafe","modo":"escuro"}'), { paleta: 'cafe', modo: 'escuro' });
  });

  test('nada guardado, texto quebrado ou paleta inexistente voltam para o padrão', () => {
    for (const texto of [null, '', 'azul', '{"paleta":"neon","modo":"claro"}', '{"paleta":"cafe","modo":"sepia"}', '[]']) {
      assert.deepEqual(lerTemaSalvo(texto), TEMA_PADRAO, `texto: ${texto}`);
    }
  });

  test('guardar e ler de volta dá o mesmo tema', () => {
    const tema = { paleta: 'ameixa', modo: 'claro' };
    assert.deepEqual(lerTemaSalvo(textoDoTema(tema)), tema);
  });

  test('o padrão é a Pôster verde clara, e ele é válido', () => {
    assert.deepEqual(TEMA_PADRAO, { paleta: 'poster-verde', modo: 'claro' });
    assert.equal(temaValido(TEMA_PADRAO), true);
  });
});

describe('lerTamanhoSalvo', () => {
  test('tamanho conhecido é lido como está', () => {
    for (const { id } of TAMANHOS_DO_TEXTO) assert.equal(lerTamanhoSalvo(id), id);
  });

  test('nada guardado ou valor estranho voltam para o normal', () => {
    for (const texto of [null, undefined, '', 'gigante', 'MAIOR', '"maior"']) {
      assert.equal(lerTamanhoSalvo(texto), 'normal', `texto: ${texto}`);
    }
    assert.equal(TAMANHO_PADRAO, 'normal');
  });
});

describe('listas do script inicial', () => {
  const lista = (nome) => JSON.parse(temaInicial.match(new RegExp(`var ${nome} = (\\[[^\\]]*\\])`))[1].replaceAll("'", '"'));

  test('o script inicial conhece exatamente as mesmas paletas e modos', () => {
    assert.deepEqual(lista('PALETAS'), PALETAS.map((paleta) => paleta.id));
    assert.deepEqual(lista('MODOS'), MODOS.map((modo) => modo.id));
  });

  test('o script inicial conhece exatamente os mesmos tamanhos do texto', () => {
    assert.deepEqual(lista('TAMANHOS'), TAMANHOS_DO_TEXTO.map((tamanho) => tamanho.id));
  });
});

describe('tamanho do texto no estilo', () => {
  test('todo tamanho de letra usa rem, para acompanhar a escolha', () => {
    const emPixels = [...estilo.matchAll(/font-size:\s*[^;]*\dpx[^;]*;/g), ...temas.matchAll(/font-size:\s*[^;]*\dpx[^;]*;/g)]
      .map(([declaracao]) => declaracao);
    assert.deepEqual(emPixels, []);
  });

  test('cada tamanho diferente do normal tem sua regra no estilo', () => {
    for (const { id } of TAMANHOS_DO_TEXTO.filter((tamanho) => tamanho.id !== TAMANHO_PADRAO)) {
      assert.match(estilo, new RegExp(`:root\\[data-tamanho-do-texto='${id}'\\]\\s*\\{\\s*font-size:\\s*\\d+%;`), id);
    }
  });
});

// Cores ------------------------------------------------------------------------------

// Declarações de um bloco do CSS, como { '--fundo': '#ededed', ... }.
function declaracoes(corpo) {
  const mapa = {};
  for (const [, nome, valor] of corpo.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) mapa[nome] = valor.trim();
  return mapa;
}

const raiz = declaracoes(estilo.match(/:root\s*\{([\s\S]*?)\n\}/)[1]);

function blocoDaPaleta(paleta, modo) {
  const seletor = `:root[data-paleta='${paleta}'][data-modo='${modo}']`;
  const inicio = temas.indexOf(`${seletor} {`);
  if (inicio === -1) return null;
  return declaracoes(temas.slice(inicio, temas.indexOf('\n}', inicio)));
}

// Variáveis de cor com valor próprio no estilo.css: toda paleta precisa
// redefinir todas, senão herda sem querer uma cor da Pôster verde clara.
const CORES = Object.entries(raiz)
  .filter(([, valor]) => /^(#|rgb)/.test(valor))
  .map(([nome]) => nome);

function coresDoTema(paleta, modo) {
  const proprias = paleta === 'poster-verde' && modo === 'claro' ? {} : blocoDaPaleta(paleta, modo);
  const todas = { ...raiz, ...proprias };
  const resolver = (valor, profundidade = 0) => {
    const referencia = /^var\((--[a-z0-9-]+)\)$/.exec(valor);
    if (!referencia) return valor;
    assert.ok(profundidade < 5, `referência circular em ${valor}`);
    return resolver(todas[referencia[1]], profundidade + 1);
  };
  return (nome) => resolver(todas[nome]);
}

function luminancia(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((canal) => (canal <= 0.03928 ? canal / 12.92 : ((canal + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(cor1, cor2) {
  const [clara, escura] = [luminancia(cor1), luminancia(cor2)].sort((a, b) => b - a);
  return (clara + 0.05) / (escura + 0.05);
}

// [texto, fundo, mínimo]: 4,5 para texto comum e 3 para números grandes.
const PARES = [
  ['--texto', '--fundo', 4.5],
  ['--texto', '--superficie', 4.5],
  ['--texto', '--campo', 4.5],
  ['--texto', '--realce', 4.5],
  ['--texto-suave', '--superficie', 4.5],
  ['--texto-suave', '--fundo', 4.5],
  ['--texto-suave', '--campo', 4.5],
  ['--erro', '--superficie', 4.5],
  ['--erro', '--fundo', 4.5],
  ['--destaque', '--fundo', 4.5],
  ['--destaque', '--superficie', 4.5],
  ['--sobre-destaque', '--destaque', 4.5],
  ['--sobre-destaque-suave', '--destaque', 4.5],
  ['--sobre-cartaz', '--cartaz', 4.5],
  ['--numero-total', '--cartaz', 3],
  ['--sobre-forte', '--forte', 4.5],
  ['--sobre-forte-suave', '--forte', 4.5],
  ['--sobre-bloco-1', '--bloco-1', 4.5],
  ['--info-bloco-1', '--bloco-1', 4.5],
  ['--dias-bloco-1', '--bloco-1', 3],
  ['--sobre-bloco-2', '--bloco-2', 4.5],
  ['--dias-bloco-2', '--bloco-2', 3],
];

describe('paletas', () => {
  for (const paleta of PALETAS) {
    for (const modo of MODOS) {
      const nome = `${paleta.nome} ${modo.nome.toLowerCase()}`;

      if (!(paleta.id === 'poster-verde' && modo.id === 'claro')) {
        test(`${nome}: tem bloco no temas.css com todas as cores`, () => {
          const bloco = blocoDaPaleta(paleta.id, modo.id);
          assert.ok(bloco, 'bloco não encontrado');
          const faltando = CORES.filter((cor) => !(cor in bloco));
          assert.deepEqual(faltando, []);
        });
      }

      test(`${nome}: contraste suficiente em todos os textos`, () => {
        const cor = coresDoTema(paleta.id, modo.id);
        const fracos = PARES
          .map(([texto, fundo, minimo]) => ({ texto, fundo, minimo, valor: contraste(cor(texto), cor(fundo)) }))
          .filter(({ valor, minimo }) => valor < minimo)
          .map(({ texto, fundo, minimo, valor }) => `${texto} sobre ${fundo}: ${valor.toFixed(2)} (mínimo ${minimo})`);
        assert.deepEqual(fracos, []);
      });
    }
  }
});
