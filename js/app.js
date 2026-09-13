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
import { resumoDoInicio, dataDeHoje } from './calculos.js';

const telas = {
  carregando: document.querySelector('#tela-carregando'),
  entrar: document.querySelector('#tela-entrar'),
  criarConta: document.querySelector('#tela-criar-conta'),
  pedirNovaSenha: document.querySelector('#tela-pedir-nova-senha'),
  novaSenha: document.querySelector('#tela-nova-senha'),
  inicio: document.querySelector('#tela-inicio'),
  formulario: document.querySelector('#tela-formulario'),
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
  carregarInicio();
}

// Tela inicial ----------------------------------------------------------------

const formatoReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const estadoInicio = document.querySelector('#estado-inicio');
const inicioVazio = document.querySelector('#inicio-vazio');
const inicioConteudo = document.querySelector('#inicio-conteudo');
const blocoCanceladas = document.querySelector('#bloco-canceladas');
const blocoComProblema = document.querySelector('#bloco-com-problema');
const listas = {
  comProblema: document.querySelector('#lista-com-problema'),
  chegando: document.querySelector('#lista-chegando'),
  ativas: document.querySelector('#lista-ativas'),
  canceladas: document.querySelector('#lista-canceladas'),
};

const PERIODO_DO_CICLO = { mensal: 'por mês', trimestral: 'por trimestre', anual: 'por ano' };

// Conta as cargas da tela inicial. Se uma resposta antiga chegar depois de uma
// nova, ou depois de a pessoa sair, ela é descartada em vez de aparecer na tela.
let numeroDaCarga = 0;

// "2026-10-05" vira "05/10", sem passar pelo Date (ver calculos.js).
function formatarDiaEMes(texto) {
  const [, mes, dia] = texto.split('-');
  return `${dia}/${mes}`;
}

// "2026-10-05" vira "05/10/2026". Funciona até com datas estranhas, como
// "20262-08-05", para a pessoa enxergar exatamente o que foi gravado.
function formatarDataCompleta(texto) {
  const [ano, mes, dia] = texto.split('-');
  return `${dia}/${mes}/${ano}`;
}

function quandoCobra(dias) {
  if (dias === 0) return 'hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}

// Mensal mostra só o valor. Trimestral e anual mostram o equivalente mensal,
// marcado como tal, e o valor realmente cobrado entre parênteses.
function textoDoValorMensal(assinatura) {
  const porMes = `${formatoReais.format(assinatura.valorMensal)} por mês`;
  if (assinatura.ciclo === 'mensal') return porMes;

  const cobrado = `${formatoReais.format(assinatura.valor)} ${PERIODO_DO_CICLO[assinatura.ciclo]}`;
  return `${porMes}, equivalente a ${cobrado}`;
}

// Troca o conteúdo de uma lista por um item de texto para cada assinatura.
function preencherLista(lista, assinaturas, textoDoItem) {
  const itens = assinaturas.map((assinatura) => {
    const item = document.createElement('li');
    // textContent: um nome como "<b>teste</b>" aparece escrito, sem virar código.
    item.textContent = textoDoItem(assinatura);
    return item;
  });
  lista.replaceChildren(...itens);
}

function limparInicio() {
  numeroDaCarga++;
  estadoInicio.textContent = '';
  inicioVazio.hidden = true;
  inicioConteudo.hidden = true;
  blocoCanceladas.hidden = true;
  blocoComProblema.hidden = true;
  for (const lista of Object.values(listas)) {
    lista.replaceChildren();
  }
}

async function carregarInicio() {
  const estaCarga = ++numeroDaCarga;
  estadoInicio.textContent = 'Carregando...';

  try {
    const assinaturas = await listarAssinaturas();
    if (estaCarga !== numeroDaCarga) return;

    estadoInicio.textContent = '';
    mostrarResumo(resumoDoInicio(assinaturas, dataDeHoje()), assinaturas.length);
  } catch (falha) {
    if (estaCarga !== numeroDaCarga) return;
    console.error(falha);
    estadoInicio.textContent = 'Não foi possível carregar as assinaturas. Recarregue a página para tentar de novo.';
  }
}

function mostrarResumo(resumo, quantidadeTotal) {
  // Sem nenhuma assinatura (nem cancelada), a tela orienta em vez de mostrar zero.
  inicioVazio.hidden = quantidadeTotal > 0;
  inicioConteudo.hidden = quantidadeTotal === 0;

  blocoComProblema.hidden = resumo.comProblema.length === 0;
  preencherLista(listas.comProblema, resumo.comProblema, (assinatura) =>
    `${assinatura.nome}: data gravada ${formatarDataCompleta(assinatura.proxima_cobranca)}`);

  document.querySelector('#total-mensal').textContent = formatoReais.format(resumo.totalMensal);
  document.querySelector('#quantidade-ativas').textContent =
    resumo.quantidadeAtivas === 1 ? '1 assinatura ativa' : `${resumo.quantidadeAtivas} assinaturas ativas`;

  preencherLista(listas.chegando, resumo.chegando, (assinatura) =>
    `${assinatura.nome}: ${quandoCobra(assinatura.diasAteCobranca)} ` +
    `(${formatarDiaEMes(assinatura.dataDaCobranca)}), ${formatoReais.format(assinatura.valor)}`);
  document.querySelector('#chegando-vazio').hidden = resumo.chegando.length > 0;

  preencherLista(listas.ativas, resumo.ativas, (assinatura) =>
    `${assinatura.nome}: ${textoDoValorMensal(assinatura)}`);
  document.querySelector('#ativas-vazio').hidden = resumo.ativas.length > 0;

  blocoCanceladas.hidden = resumo.canceladas.length === 0;
  document.querySelector('#quantidade-canceladas').textContent = resumo.canceladas.length;
  preencherLista(listas.canceladas, resumo.canceladas, (assinatura) =>
    `${assinatura.nome}: ${formatoReais.format(assinatura.valor)} ${PERIODO_DO_CICLO[assinatura.ciclo]}`);
}

// Formulários -----------------------------------------------------------------

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
  // A troca para a tela inicial acontece em acompanharSessao, no fim do arquivo.
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

const formularioAssinatura = document.querySelector('#form-assinatura');

ligarFormulario('#form-assinatura', async (dados, formulario) => {
  await criarAssinatura({
    nome: dados.get('nome').trim(),
    valor: Number(dados.get('valor')),
    ciclo: dados.get('ciclo'),
    proximaCobranca: dados.get('proxima_cobranca'),
    categoria: dados.get('categoria').trim() || null,
  });

  // Só limpa o formulário depois de salvar. Se der erro, o que foi digitado fica.
  formulario.reset();
  mostrarTela('inicio');
  mostrarAviso('Assinatura salva.');
  // Relê do banco em vez de só acrescentar na tela: assim a tela mostra o que
  // realmente ficou gravado.
  await carregarInicio();
});

// Botões ------------------------------------------------------------------------

document.querySelector('#botao-adicionar').addEventListener('click', () => {
  formularioAssinatura.reset();
  formularioAssinatura.querySelector('.erro').textContent = '';
  mostrarAviso('');
  mostrarTela('formulario');
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

// Sessão ------------------------------------------------------------------------

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
    limparInicio();
    // Só ao sair de fato: ao abrir o app sem sessão, pode haver um aviso que
    // precisa continuar visível (como o de link vencido).
    if (evento === 'SIGNED_OUT') mostrarAviso('');
    mostrarTela('entrar');
  } else if (definindoNovaSenha) {
    mostrarTela('novaSenha');
  } else {
    mostrarInicio(sessao.user.email);
  }
});
