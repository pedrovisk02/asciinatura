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
    mostrarTela('entrar');
  } else if (definindoNovaSenha) {
    mostrarTela('novaSenha');
  } else {
    mostrarInicio(sessao.user.email);
  }
});
