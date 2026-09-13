// Ponto de entrada: decide qual tela mostrar e liga os formulários às ações.

import {
  entrar,
  criarConta,
  sair,
  enviarLinkDeNovaSenha,
  definirNovaSenha,
  acompanharSessao,
  erroNoLinkRecebido,
  mensagemDeErro,
} from './auth.js';
import { listarAssinaturas, criarAssinatura } from './dados.js';

const telas = {
  carregando: document.querySelector('#tela-carregando'),
  entrar: document.querySelector('#tela-entrar'),
  criarConta: document.querySelector('#tela-criar-conta'),
  pedirNovaSenha: document.querySelector('#tela-pedir-nova-senha'),
  novaSenha: document.querySelector('#tela-nova-senha'),
  inicio: document.querySelector('#tela-inicio'),
};

const aviso = document.querySelector('#aviso');

// Verdadeiro enquanto a pessoa, vinda do link de nova senha, ainda não salvou
// a senha nova. Nesse meio tempo ela já tem sessão, mas não deve ir para o início.
let definindoNovaSenha = false;

function mostrarTela(nome) {
  for (const [chave, tela] of Object.entries(telas)) {
    tela.hidden = chave !== nome;
  }
}

function mostrarAviso(texto) {
  // textContent, e nunca innerHTML: o texto aparece como texto, mesmo que
  // contenha algo parecido com código.
  aviso.textContent = texto;
  aviso.hidden = !texto;
}

function mostrarInicio(email) {
  document.querySelector('#email-usuario').textContent = email;
  mostrarTela('inicio');
  carregarLista();
}

// Lista de assinaturas -------------------------------------------------------

const lista = document.querySelector('#lista-assinaturas');
const estadoLista = document.querySelector('#estado-lista');
const formatoReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

// Conta as cargas da lista. Se uma resposta antiga chegar depois de uma nova,
// ou depois de a pessoa sair, ela é descartada em vez de aparecer na tela.
let numeroDaCarga = 0;

// "2026-10-05" vira "05/10/2026", sem passar pelo Date (ver calculos.js).
function formatarData(texto) {
  const [ano, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${ano}`;
}

function limparLista() {
  numeroDaCarga++;
  lista.replaceChildren();
  estadoLista.textContent = '';
}

async function carregarLista() {
  const estaCarga = ++numeroDaCarga;
  estadoLista.textContent = 'Carregando...';

  try {
    const assinaturas = await listarAssinaturas();
    if (estaCarga !== numeroDaCarga) return;

    lista.replaceChildren();
    estadoLista.textContent = assinaturas.length === 0 ? 'Nenhuma assinatura cadastrada ainda.' : '';

    for (const assinatura of assinaturas) {
      const item = document.createElement('li');
      // textContent: um nome como "<b>teste</b>" aparece escrito, sem virar código.
      item.textContent =
        `${assinatura.nome}: ${formatoReais.format(assinatura.valor)} (${assinatura.ciclo}), ` +
        `próxima cobrança em ${formatarData(assinatura.proxima_cobranca)}` +
        (assinatura.categoria ? `, categoria ${assinatura.categoria}` : '');
      lista.append(item);
    }
  } catch (falha) {
    if (estaCarga !== numeroDaCarga) return;
    console.error(falha);
    estadoLista.textContent = 'Não foi possível carregar as assinaturas. Recarregue a página para tentar de novo.';
  }
}

// Liga um formulário a uma ação: trava o botão enquanto espera a resposta e,
// se der errado, mostra o erro dentro do próprio formulário sem apagar o que
// foi digitado.
function ligarFormulario(seletor, acao) {
  const formulario = document.querySelector(seletor);
  const botao = formulario.querySelector('button[type="submit"]');
  const erro = formulario.querySelector('.erro');

  formulario.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    erro.textContent = '';
    botao.disabled = true;

    try {
      await acao(new FormData(formulario), formulario);
    } catch (falha) {
      console.error(falha);
      erro.textContent = mensagemDeErro(falha);
    } finally {
      botao.disabled = false;
    }
  });
}

ligarFormulario('#form-entrar', async (dados) => {
  await entrar(dados.get('email'), dados.get('senha'));
  // A troca para a tela inicial acontece em acompanharSessao, logo abaixo.
});

ligarFormulario('#form-criar-conta', async (dados, formulario) => {
  const email = dados.get('email');
  const { precisaConfirmarEmail } = await criarConta(email, dados.get('senha'));

  if (precisaConfirmarEmail) {
    formulario.reset();
    document.querySelector('#form-entrar [name="email"]').value = email;
    mostrarTela('entrar');
    // A frase não confirma se o e-mail já tinha conta, pelo mesmo motivo da
    // mensagem única de login.
    mostrarAviso('Se esse e-mail ainda não tiver conta, enviamos um link de confirmação. Clique nele para entrar.');
  }
});

ligarFormulario('#form-pedir-nova-senha', async (dados, formulario) => {
  await enviarLinkDeNovaSenha(dados.get('email'));
  formulario.reset();
  mostrarTela('entrar');
  mostrarAviso('Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha.');
});

ligarFormulario('#form-nova-senha', async (dados, formulario) => {
  const usuario = await definirNovaSenha(dados.get('senha'));
  definindoNovaSenha = false;
  formulario.reset();
  mostrarInicio(usuario.email);
  mostrarAviso('Senha alterada.');
});

ligarFormulario('#form-nova-assinatura', async (dados, formulario) => {
  await criarAssinatura({
    nome: dados.get('nome').trim(),
    valor: Number(dados.get('valor')),
    ciclo: dados.get('ciclo'),
    proximaCobranca: dados.get('proxima_cobranca'),
    categoria: dados.get('categoria').trim() || null,
  });

  // Só limpa o formulário depois de salvar. Se der erro, o que foi digitado fica.
  formulario.reset();
  // Relê do banco em vez de só acrescentar na tela: assim a lista mostra o que
  // realmente ficou gravado.
  await carregarLista();
});

for (const botao of document.querySelectorAll('[data-ir-para]')) {
  botao.addEventListener('click', () => {
    mostrarAviso('');
    mostrarTela(botao.dataset.irPara);
  });
}

document.querySelector('#botao-sair').addEventListener('click', async () => {
  try {
    await sair();
    // A troca para a tela de entrar acontece em acompanharSessao.
  } catch (falha) {
    console.error(falha);
    mostrarAviso(mensagemDeErro(falha));
  }
});

const erroDoLink = erroNoLinkRecebido();
if (erroDoLink) {
  mostrarAviso(mensagemDeErro(erroDoLink));
}

// Quem está com a tela aberta: id do usuário, null para ninguém, e undefined
// antes do primeiro aviso. A biblioteca também avisa em situações que não
// mudam nada (como a renovação automática do acesso, a cada hora), e a tela
// só deve trocar quando alguém entra ou sai de fato.
let usuarioNaTela;

acompanharSessao((evento, sessao) => {
  if (evento === 'PASSWORD_RECOVERY') {
    definindoNovaSenha = true;
    mostrarTela('novaSenha');
    return;
  }

  const usuario = sessao?.user.id ?? null;
  if (usuario === usuarioNaTela) return;
  usuarioNaTela = usuario;

  if (!sessao) {
    definindoNovaSenha = false;
    // Apaga da página as assinaturas de quem saiu, para a próxima pessoa que
    // usar este navegador não ver nada que não é dela.
    limparLista();
    mostrarTela('entrar');
  } else if (definindoNovaSenha) {
    mostrarTela('novaSenha');
  } else {
    mostrarInicio(sessao.user.email);
  }
});
