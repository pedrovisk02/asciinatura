// Botão "Conta" do topo. No celular abre a gaveta verde (#dialogo-conta); no
// computador, o menu suspenso preso ao botão (#menu-conta). Os dois mostram o
// e-mail e levam para Minha conta, Configurações ou Sair. Os links mudam o
// endereço (#/conta, #/configuracoes) e quem troca de tela é o app.js.

import { nomeDoUsuario } from './auth.js';
import { decifrarTextos } from './interacoes.js';
import { prepararDialogo, abrirDialogo, fecharDialogo, menuAberto, mostrarMenu, esconderMenu } from './dialogos.js';

const botao = document.querySelector('#botao-conta');
const menu = document.querySelector('#menu-conta');
const gaveta = document.querySelector('#dialogo-conta');
const computador = window.matchMedia('(min-width: 880px)');

function abrirMenu({ peloTeclado }) {
  mostrarMenu(menu);
  botao.setAttribute('aria-expanded', 'true');
  decifrarTextos(menu);
  // Quem abriu pelo teclado já cai na primeira opção.
  if (peloTeclado) menu.querySelector('.menu-conta-item').focus();
}

export function fecharMenuConta({ devolverFoco = false } = {}) {
  if (!menuAberto(menu)) return;
  botao.setAttribute('aria-expanded', 'false');
  if (devolverFoco) botao.focus();
  esconderMenu(menu);
}

export function fecharTudoDaConta() {
  fecharMenuConta();
  fecharDialogo(gaveta);
}

export function prepararMenuConta({ aoSair }) {
  prepararDialogo(gaveta);

  botao.addEventListener('click', (evento) => {
    if (computador.matches) {
      // detail 0: o clique veio do teclado (Enter ou Espaço), e não do mouse.
      if (!menuAberto(menu)) abrirMenu({ peloTeclado: evento.detail === 0 });
      else fecharMenuConta();
    } else {
      abrirDialogo(gaveta);
      decifrarTextos(gaveta);
    }
  });

  // Clicar fora, Esc ou sair do menu com o Tab fecham o menu.
  document.addEventListener('pointerdown', (evento) => {
    if (menuAberto(menu) && !menu.contains(evento.target) && !botao.contains(evento.target)) fecharMenuConta();
  });
  menu.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      fecharMenuConta({ devolverFoco: true });
    }
  });
  menu.addEventListener('focusout', (evento) => {
    const destino = evento.relatedTarget;
    if (destino && !menu.contains(destino) && destino !== botao) fecharMenuConta();
  });

  // Escolher uma opção fecha o menu ou a gaveta; os links seguem para a página.
  for (const link of menu.querySelectorAll('a')) link.addEventListener('click', () => fecharMenuConta());
  for (const link of gaveta.querySelectorAll('a')) link.addEventListener('click', () => fecharDialogo(gaveta));

  document.querySelector('#menu-conta-sair').addEventListener('click', () => {
    fecharMenuConta();
    aoSair();
  });
  document.querySelector('#botao-sair').addEventListener('click', () => {
    fecharDialogo(gaveta);
    aoSair();
  });

  // Virar o celular ou mudar o tamanho da janela troca o formato: fecha tudo.
  computador.addEventListener('change', fecharTudoDaConta);
}

// E-mail e nome de quem está conectado (sessão nula: ninguém).
export function atualizarMenuConta(sessao) {
  botao.hidden = !sessao;
  const email = sessao?.user.email ?? '';
  const nome = nomeDoUsuario(sessao?.user);
  document.querySelector('#conta-email').textContent = email;
  document.querySelector('#menu-conta-email').textContent = email;
  document.querySelector('#dialogo-conta-titulo').textContent = nome ? `Olá, ${nome}!` : 'Olá!';
  // A saudação da tela inicial fica no próprio botão. Sem nome, ele continua
  // "Conta", para ninguém ficar sem saber para que serve. O leitor de tela
  // ouve a saudação e também que o botão abre a conta.
  document.querySelector('#botao-conta-texto').textContent = nome ? `Olá, ${nome}` : 'Conta';
  botao.classList.toggle('com-nome', Boolean(nome));
  if (nome) botao.setAttribute('aria-label', `Olá, ${nome}. Menu da conta`);
  else botao.removeAttribute('aria-label');
  if (!sessao) fecharTudoDaConta();
}
