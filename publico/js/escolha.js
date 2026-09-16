// Escolhas rápidas da tela inicial, abertas por um ícone: quantos dias mostrar
// em "Chegando" e a ordem de "Todas". No celular abre a gaveta verde
// (#dialogo-escolha), como a da Conta; no computador, um menu suspenso preso
// ao ícone, como o da Conta.

import { prepararDialogo, abrirDialogo, fecharDialogo, menuAberto, mostrarMenu, esconderMenu } from './dialogos.js';
import { decifrarTextos } from './interacoes.js';

const computador = window.matchMedia('(min-width: 880px)');
const gaveta = document.querySelector('#dialogo-escolha');
const ICONE_CERTO = '<svg class="icone certo" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>';

prepararDialogo(gaveta);
gaveta.querySelector('[data-fechar-escolha]').addEventListener('click', () => fecharDialogo(gaveta));

// Uma opção: botão com o nome e um sinal de "certo" na escolhida. aria-pressed
// diz ao leitor de tela qual está valendo.
function criarOpcao(opcao, marcada, classe, aoClicar) {
  const botao = document.createElement('button');
  botao.type = 'button';
  botao.className = classe;
  botao.setAttribute('aria-pressed', String(marcada));
  const nome = document.createElement('span');
  nome.textContent = opcao.nome;
  botao.append(nome);
  botao.insertAdjacentHTML('beforeend', ICONE_CERTO);
  botao.addEventListener('click', aoClicar);
  return botao;
}

// botao: o ícone que abre. etiqueta e titulo: textos da gaveta e do menu.
// opcoes: [{ valor, nome }]. valorAtual(): a opção valendo agora.
// aoEscolher(valor): o que fazer com a escolha.
export function ligarEscolha({ botao, etiqueta, titulo, opcoes, valorAtual, aoEscolher }) {
  const menu = document.createElement('div');
  menu.className = 'menu-conta menu-escolha';
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', titulo);
  menu.hidden = true;
  botao.after(menu);

  function fecharMenu({ devolverFoco = false } = {}) {
    if (!menuAberto(menu)) return Promise.resolve();
    botao.setAttribute('aria-expanded', 'false');
    if (devolverFoco) botao.focus();
    return esconderMenu(menu);
  }

  // Primeiro o menu ou a gaveta termina de fechar; só então a tela muda, para
  // a pessoa ver os itens deslizando para o novo lugar.
  async function escolher(valor) {
    if (gaveta.open) await fecharDialogo(gaveta);
    else await fecharMenu({ devolverFoco: true });
    if (valor !== valorAtual()) aoEscolher(valor);
  }

  function montarOpcoes(classe) {
    return opcoes.map((opcao) => criarOpcao(opcao, opcao.valor === valorAtual(), classe, () => escolher(opcao.valor)));
  }

  function abrirMenu({ peloTeclado }) {
    const cabeca = document.createElement('p');
    cabeca.className = 'menu-conta-email';
    cabeca.textContent = titulo;
    menu.replaceChildren(cabeca, ...montarOpcoes('menu-conta-item'));
    mostrarMenu(menu);
    botao.setAttribute('aria-expanded', 'true');
    decifrarTextos(menu);
    // Quem abriu pelo teclado já cai na opção que está valendo.
    if (peloTeclado) menu.querySelector('[aria-pressed="true"]')?.focus();
  }

  function abrirGaveta() {
    gaveta.querySelector('#dialogo-escolha-etiqueta').textContent = etiqueta;
    gaveta.querySelector('#dialogo-escolha-titulo').textContent = titulo;
    const lista = gaveta.querySelector('#dialogo-escolha-opcoes');
    lista.replaceChildren(...montarOpcoes('botao botao-contorno botao-largo botao-gaveta'));
    abrirDialogo(gaveta);
    lista.querySelector('[aria-pressed="true"]')?.focus();
    decifrarTextos(gaveta);
  }

  botao.addEventListener('click', (evento) => {
    if (!computador.matches) {
      abrirGaveta();
    } else if (!menuAberto(menu)) {
      // detail 0: o clique veio do teclado (Enter ou Espaço), e não do mouse.
      abrirMenu({ peloTeclado: evento.detail === 0 });
    } else {
      fecharMenu();
    }
  });

  // Clicar fora, Esc ou sair do menu com o Tab fecham o menu.
  document.addEventListener('pointerdown', (evento) => {
    if (menuAberto(menu) && !menu.contains(evento.target) && !botao.contains(evento.target)) fecharMenu();
  });
  menu.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      fecharMenu({ devolverFoco: true });
    }
  });
  menu.addEventListener('focusout', (evento) => {
    const destino = evento.relatedTarget;
    if (destino && !menu.contains(destino) && destino !== botao) fecharMenu();
  });

  // Virar o celular ou mudar o tamanho da janela troca o formato: fecha tudo.
  // Trocar de página (o endereço muda) também fecha o menu.
  computador.addEventListener('change', () => {
    fecharMenu();
    fecharDialogo(gaveta);
  });
  window.addEventListener('hashchange', () => fecharMenu());
}
