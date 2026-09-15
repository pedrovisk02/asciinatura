// Página Minha conta: carteirinha (nome, e-mail e "membro desde"), o cantinho
// do lápis para alterar o nome e a troca de senha.

import { alterarNome, trocarSenha, nomeDoUsuario } from './auth.js';
import { validarNome, validarTrocaDeSenha } from './validacao.js';
import { textoMembroDesde } from './calculos.js';
import { mensagemDeErro } from './erros.js';
import { reduzirMovimento } from './ascii.js';
import { prepararDialogo } from './dialogos.js';

const computador = window.matchMedia('(min-width: 880px)');

const carteirinha = document.querySelector('#carteirinha');
const nomeNaCarteirinha = document.querySelector('#carteirinha-nome');
const emailNaCarteirinha = document.querySelector('#carteirinha-email');
const membroDesde = document.querySelector('#carteirinha-desde');
const cantinho = document.querySelector('#cantinho-lapis');

const formNomeCartao = document.querySelector('#form-nome-cartao');
const campoNomeCartao = document.querySelector('#campo-nome-cartao');
const erroNomeCartao = document.querySelector('#erro-nome-cartao');

const gavetaNome = document.querySelector('#dialogo-nome');
const formNomeGaveta = document.querySelector('#form-nome-gaveta');
const campoNomeGaveta = document.querySelector('#campo-nome-gaveta');
const erroNomeGaveta = document.querySelector('#erro-nome-gaveta');

const abrirSenha = document.querySelector('#abrir-senha');
const formSenha = document.querySelector('#form-senha');
const avisoSenha = document.querySelector('#aviso-senha');

let usuario = null;
let avisarMudancaDeNome = () => {};
let anunciar = () => {};

// Mostra os dados de quem está conectado.
export function mostrarConta(novoUsuario) {
  usuario = novoUsuario;
  const nome = nomeDoUsuario(usuario);
  // Contas criadas antes do nome existir: um convite no lugar do nome.
  nomeNaCarteirinha.textContent = nome || 'Como quer ser chamado?';
  nomeNaCarteirinha.classList.toggle('sem-nome', !nome);
  emailNaCarteirinha.textContent = usuario?.email ?? '';
  membroDesde.textContent = textoMembroDesde(usuario?.created_at);
  membroDesde.hidden = !membroDesde.textContent;
  formSenha.elements.namedItem('usuario').value = usuario?.email ?? '';
}

// Cantinho do lápis ---------------------------------------------------------------

// O cantinho encolhe para dentro do canto; a edição só abre depois, para as
// duas coisas não acontecerem ao mesmo tempo.
function fecharCantinho() {
  carteirinha.classList.add('cantinho-fechado');
  return new Promise((resolver) => setTimeout(resolver, reduzirMovimento() ? 0 : 380));
}

function abrirCantinho({ devolverFoco }) {
  carteirinha.classList.remove('cantinho-fechado');
  if (devolverFoco) cantinho.focus();
}

function abrirEdicaoNoCartao() {
  campoNomeCartao.value = nomeDoUsuario(usuario);
  erroNomeCartao.textContent = '';
  nomeNaCarteirinha.hidden = true;
  formNomeCartao.hidden = false;
  campoNomeCartao.focus();
  campoNomeCartao.select();
}

function fecharEdicaoNoCartao({ devolverFoco }) {
  if (formNomeCartao.hidden) return;
  formNomeCartao.hidden = true;
  nomeNaCarteirinha.hidden = false;
  abrirCantinho({ devolverFoco });
}

function abrirGavetaDoNome() {
  campoNomeGaveta.value = nomeDoUsuario(usuario);
  erroNomeGaveta.textContent = '';
  gavetaNome.showModal();
}

async function salvarNome(texto, elementoDoErro, botao) {
  const { nome, erro } = validarNome(texto);
  elementoDoErro.textContent = erro ?? '';
  if (erro) return false;

  botao.disabled = true;
  try {
    const atualizado = await alterarNome(nome);
    mostrarConta(atualizado);
    avisarMudancaDeNome(atualizado);
    anunciar('Nome salvo.');
    return true;
  } catch (falha) {
    console.error(falha);
    elementoDoErro.textContent = mensagemDeErro(falha);
    return false;
  } finally {
    botao.disabled = false;
  }
}

// Troca de senha ------------------------------------------------------------------

function mostrarErrosDaSenha(erros) {
  for (const campo of ['atual', 'nova']) {
    const mensagem = erros[campo] ?? '';
    document.querySelector(`#erro-senha-${campo}`).textContent = mensagem;
    formSenha.elements.namedItem(campo).setAttribute('aria-invalid', String(Boolean(mensagem)));
  }
}

function alternarFormularioDeSenha(abrir) {
  formSenha.hidden = !abrir;
  abrirSenha.setAttribute('aria-expanded', String(abrir));
  if (abrir) {
    avisoSenha.textContent = '';
    formSenha.elements.namedItem('atual').focus();
  } else {
    formSenha.reset();
    mostrarErrosDaSenha({});
    formSenha.querySelector('.erro').textContent = '';
  }
}

// Fecha o que estiver aberto ao sair da página ou da conta.
export function fecharEdicoesDaConta() {
  fecharEdicaoNoCartao({ devolverFoco: false });
  if (gavetaNome.open) gavetaNome.close();
  if (!formSenha.hidden) alternarFormularioDeSenha(false);
  avisoSenha.textContent = '';
}

export function prepararMinhaConta({ aoMudarNome, anunciarNaTela }) {
  avisarMudancaDeNome = aoMudarNome;
  anunciar = anunciarNaTela;
  prepararDialogo(gavetaNome);

  cantinho.addEventListener('click', async () => {
    await fecharCantinho();
    if (computador.matches) abrirEdicaoNoCartao();
    else abrirGavetaDoNome();
  });

  formNomeCartao.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const salvou = await salvarNome(campoNomeCartao.value, erroNomeCartao, formNomeCartao.querySelector('[type="submit"]'));
    if (salvou) fecharEdicaoNoCartao({ devolverFoco: true });
  });
  formNomeCartao.querySelector('[data-cancelar-nome]').addEventListener('click', () => fecharEdicaoNoCartao({ devolverFoco: true }));
  campoNomeCartao.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      fecharEdicaoNoCartao({ devolverFoco: true });
    }
  });

  formNomeGaveta.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const salvou = await salvarNome(campoNomeGaveta.value, erroNomeGaveta, formNomeGaveta.querySelector('[type="submit"]'));
    if (salvou) gavetaNome.close();
  });
  formNomeGaveta.querySelector('[data-cancelar-nome]').addEventListener('click', () => gavetaNome.close());
  // Fechando a gaveta de qualquer jeito (salvar, cancelar, Esc, clique fora),
  // o cantinho volta.
  gavetaNome.addEventListener('close', () => abrirCantinho({ devolverFoco: carteirinha.offsetParent !== null }));

  abrirSenha.addEventListener('click', () => alternarFormularioDeSenha(formSenha.hidden));

  formSenha.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const atual = formSenha.elements.namedItem('atual').value;
    const nova = formSenha.elements.namedItem('nova').value;
    const erroGeral = formSenha.querySelector('.erro');
    const botao = formSenha.querySelector('[type="submit"]');

    const { valido, erros } = validarTrocaDeSenha({ atual, nova });
    mostrarErrosDaSenha(erros);
    erroGeral.textContent = '';
    if (!valido) {
      formSenha.elements.namedItem(erros.atual ? 'atual' : 'nova').focus();
      return;
    }

    botao.disabled = true;
    try {
      await trocarSenha(usuario.email, atual, nova);
      alternarFormularioDeSenha(false);
      avisoSenha.textContent = 'Senha alterada.';
      abrirSenha.focus();
    } catch (falha) {
      console.error(falha);
      erroGeral.textContent = mensagemDeErro(falha);
    } finally {
      botao.disabled = false;
    }
  });

  // Mudou de celular para computador (ou o contrário) no meio da edição.
  computador.addEventListener('change', () => fecharEdicoesDaConta());
}
