// Ponto de entrada: decide qual tela mostrar e liga os formulários às ações.

import {
  entrar,
  criarConta,
  sair,
  enviarLinkDeNovaSenha,
  definirNovaSenha,
  acompanharSessao,
  erroNoLinkRecebido,
} from './auth.js';
import { listarAssinaturas, criarAssinatura, atualizarAssinatura, apagarAssinatura } from './dados.js';
import { resumoDoInicio, dataDeHoje, dataParaGravarNaEdicao } from './calculos.js';
import { validarAssinatura, valorParaOCampo } from './validacao.js';
import { mensagemDeErro, ehFalhaDeConexao, MENSAGEM_SEM_CONEXAO } from './erros.js';

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

// Trava o botão enquanto a ação espera resposta, para um clique duplo não
// salvar duas vezes, e mostra o erro, se houver, em linguagem de gente.
async function comBotaoTravado(botao, mostrarErro, acao) {
  mostrarErro('');
  botao.disabled = true;

  try {
    await acao();
  } catch (falha) {
    console.error(falha);
    mostrarErro(mensagemDeErro(falha));
  } finally {
    botao.disabled = false;
  }
}

// Tela inicial ----------------------------------------------------------------

const formatoReais = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const estadoInicio = document.querySelector('#estado-inicio');
const botaoTentarDeNovo = document.querySelector('#botao-tentar-de-novo');
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
// marcado como tal, e o valor realmente cobrado.
function textoDoValorMensal(assinatura) {
  const porMes = `${formatoReais.format(assinatura.valorMensal)} por mês`;
  if (assinatura.ciclo === 'mensal') return porMes;

  const cobrado = `${formatoReais.format(assinatura.valor)} ${PERIODO_DO_CICLO[assinatura.ciclo]}`;
  return `${porMes}, equivalente a ${cobrado}`;
}

// Troca o conteúdo de uma lista: um item por assinatura, com o texto e, se
// houver, botões de ação (cada um com um texto e o que fazer ao clicar).
function preencherLista(lista, assinaturas, textoDoItem, botoes = []) {
  const itens = assinaturas.map((assinatura) => {
    const item = document.createElement('li');
    // textContent: um nome como "<b>teste</b>" aparece escrito, sem virar código.
    item.append(textoDoItem(assinatura));

    for (const { texto, aoClicar } of botoes) {
      const botao = document.createElement('button');
      botao.type = 'button';
      botao.textContent = texto;
      botao.addEventListener('click', () => aoClicar(assinatura, botao));
      item.append(' ', botao);
    }
    return item;
  });
  lista.replaceChildren(...itens);
}

function limparInicio() {
  numeroDaCarga++;
  estadoInicio.textContent = '';
  botaoTentarDeNovo.hidden = true;
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
  botaoTentarDeNovo.hidden = true;

  try {
    const assinaturas = await listarAssinaturas();
    if (estaCarga !== numeroDaCarga) return;

    estadoInicio.textContent = '';
    mostrarResumo(resumoDoInicio(assinaturas, dataDeHoje()), assinaturas.length);
  } catch (falha) {
    if (estaCarga !== numeroDaCarga) return;
    console.error(falha);
    // Se já havia algo na tela, ele continua visível, com a explicação e o
    // botão para tentar de novo em cima.
    const jaHaviaAlgoNaTela = !inicioConteudo.hidden || !inicioVazio.hidden;
    const explicacao = ehFalhaDeConexao(falha) ? MENSAGEM_SEM_CONEXAO : 'Não foi possível carregar as assinaturas.';
    estadoInicio.textContent = jaHaviaAlgoNaTela
      ? `${explicacao} As informações abaixo podem estar desatualizadas.`
      : explicacao;
    botaoTentarDeNovo.hidden = false;
  }
}

botaoTentarDeNovo.addEventListener('click', () => carregarInicio());

const botaoEditar = { texto: 'Editar', aoClicar: (assinatura) => abrirFormulario(assinatura) };

const botaoReativar = {
  texto: 'Reativar',
  aoClicar: (assinatura, botao) =>
    comBotaoTravado(botao, mostrarAviso, async () => {
      await atualizarAssinatura(assinatura.id, { ativa: true });
      mostrarAviso(`"${assinatura.nome}" foi reativada e voltou a contar no total.`);
      await carregarInicio();
    }),
};

function mostrarResumo(resumo, quantidadeTotal) {
  // Sem nenhuma assinatura (nem cancelada), a tela orienta em vez de mostrar zero.
  inicioVazio.hidden = quantidadeTotal > 0;
  inicioConteudo.hidden = quantidadeTotal === 0;

  blocoComProblema.hidden = resumo.comProblema.length === 0;
  preencherLista(
    listas.comProblema,
    resumo.comProblema,
    (assinatura) => `${assinatura.nome}: data gravada ${formatarDataCompleta(assinatura.proxima_cobranca)}`,
    [{ ...botaoEditar, texto: 'Corrigir' }],
  );

  document.querySelector('#total-mensal').textContent = formatoReais.format(resumo.totalMensal);
  document.querySelector('#quantidade-ativas').textContent =
    resumo.quantidadeAtivas === 1 ? '1 assinatura ativa' : `${resumo.quantidadeAtivas} assinaturas ativas`;

  preencherLista(listas.chegando, resumo.chegando, (assinatura) =>
    `${assinatura.nome}: ${quandoCobra(assinatura.diasAteCobranca)} ` +
    `(${formatarDiaEMes(assinatura.dataDaCobranca)}), ${formatoReais.format(assinatura.valor)}`);
  document.querySelector('#chegando-vazio').hidden = resumo.chegando.length > 0;

  preencherLista(
    listas.ativas,
    resumo.ativas,
    (assinatura) => `${assinatura.nome}: ${textoDoValorMensal(assinatura)}`,
    [botaoEditar],
  );
  document.querySelector('#ativas-vazio').hidden = resumo.ativas.length > 0;

  blocoCanceladas.hidden = resumo.canceladas.length === 0;
  document.querySelector('#quantidade-canceladas').textContent = resumo.canceladas.length;
  preencherLista(
    listas.canceladas,
    resumo.canceladas,
    (assinatura) => `${assinatura.nome}: ${formatoReais.format(assinatura.valor)} ${PERIODO_DO_CICLO[assinatura.ciclo]}`,
    [botaoReativar, botaoEditar],
  );
}

// Formulário de assinatura (nova ou edição) --------------------------------------

const formularioAssinatura = document.querySelector('#form-assinatura');
const erroDoFormulario = formularioAssinatura.querySelector('.erro');
const acoesEdicao = document.querySelector('#acoes-edicao');
const botaoAlternarAtiva = document.querySelector('#botao-alternar-ativa');
const botaoApagar = document.querySelector('#botao-apagar');

// A assinatura aberta no formulário (null quando é uma nova) e a data que o
// formulário mostrou ao abrir, para saber depois se a pessoa mexeu nela.
let assinaturaEmEdicao = null;
let dataMostradaNoFormulario = null;

function mostrarErroDoFormulario(texto) {
  erroDoFormulario.textContent = texto;
}

// Nome de cada campo no validacao.js e o nome do campo no formulário.
const CAMPOS_DO_FORMULARIO = {
  nome: 'nome',
  valor: 'valor',
  ciclo: 'ciclo',
  proximaCobranca: 'proxima_cobranca',
  categoria: 'categoria',
};

// Mostra cada mensagem embaixo do seu campo e marca o campo como inválido
// (aria-invalid), o que leitores de tela anunciam.
function mostrarErrosDosCampos(erros) {
  for (const [chave, nomeDoCampo] of Object.entries(CAMPOS_DO_FORMULARIO)) {
    const mensagem = erros[chave] ?? '';
    document.querySelector(`#erro-campo-${nomeDoCampo}`).textContent = mensagem;
    formularioAssinatura.elements.namedItem(nomeDoCampo).setAttribute('aria-invalid', String(Boolean(mensagem)));
  }
}

// Ao corrigir um campo, a mensagem dele some, sem esperar o próximo "Salvar".
for (const nomeDoCampo of Object.values(CAMPOS_DO_FORMULARIO)) {
  formularioAssinatura.elements.namedItem(nomeDoCampo).addEventListener('input', (evento) => {
    document.querySelector(`#erro-campo-${nomeDoCampo}`).textContent = '';
    evento.target.setAttribute('aria-invalid', 'false');
  });
}

function abrirFormulario(assinatura = null) {
  assinaturaEmEdicao = assinatura;
  formularioAssinatura.reset();
  mostrarErroDoFormulario('');
  mostrarErrosDosCampos({});
  mostrarAviso('');

  document.querySelector('#titulo-formulario').textContent = assinatura ? 'Editar assinatura' : 'Nova assinatura';
  acoesEdicao.hidden = !assinatura;

  if (assinatura) {
    const campo = (nome) => formularioAssinatura.elements.namedItem(nome);
    campo('nome').value = assinatura.nome;
    campo('valor').value = valorParaOCampo(assinatura.valor);
    campo('ciclo').value = assinatura.ciclo;
    campo('categoria').value = assinatura.categoria ?? '';

    // Ativas mostram a próxima cobrança já avançada; canceladas e com problema,
    // a data gravada.
    dataMostradaNoFormulario = assinatura.dataDaCobranca ?? assinatura.proxima_cobranca;
    campo('proxima_cobranca').value = dataMostradaNoFormulario;

    botaoAlternarAtiva.textContent = assinatura.ativa ? 'Marcar como cancelada' : 'Reativar assinatura';
  }

  mostrarTela('formulario');
}

async function voltarAoInicio(mensagem) {
  assinaturaEmEdicao = null;
  formularioAssinatura.reset();
  mostrarTela('inicio');
  mostrarAviso(mensagem);
  // Relê do banco em vez de só mexer na tela: assim a tela mostra o que
  // realmente ficou gravado.
  await carregarInicio();
}

// Liga um formulário a uma ação. Se der errado, o erro aparece dentro do
// próprio formulário e o que foi digitado continua lá.
function ligarFormulario(seletor, acao) {
  const formulario = document.querySelector(seletor);
  const botao = formulario.querySelector('button[type="submit"]');
  const erro = formulario.querySelector('.erro');

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    comBotaoTravado(botao, (texto) => { erro.textContent = texto; }, () =>
      acao(new FormData(formulario), formulario));
  });
}

ligarFormulario('#form-assinatura', async (dados) => {
  const { valido, erros, campos } = validarAssinatura({
    nome: dados.get('nome'),
    valor: dados.get('valor'),
    ciclo: dados.get('ciclo'),
    proximaCobranca: dados.get('proxima_cobranca'),
    categoria: dados.get('categoria'),
  });

  mostrarErrosDosCampos(erros);
  if (!valido) {
    // Leva o cursor ao primeiro campo com problema. Nada é enviado ao banco.
    const primeiro = Object.keys(CAMPOS_DO_FORMULARIO).find((chave) => erros[chave]);
    formularioAssinatura.elements.namedItem(CAMPOS_DO_FORMULARIO[primeiro]).focus();
    return;
  }

  // Se salvar falhar (sem internet, por exemplo), o erro aparece embaixo do
  // formulário e tudo o que foi digitado continua nos campos: é só clicar em
  // "Salvar" de novo.
  if (assinaturaEmEdicao) {
    campos.proximaCobranca = dataParaGravarNaEdicao({
      gravada: assinaturaEmEdicao.proxima_cobranca,
      mostrada: dataMostradaNoFormulario,
      digitada: campos.proximaCobranca,
    });
    await atualizarAssinatura(assinaturaEmEdicao.id, campos);
    await voltarAoInicio('Alterações salvas.');
  } else {
    await criarAssinatura(campos);
    await voltarAoInicio('Assinatura salva.');
  }
});

botaoAlternarAtiva.addEventListener('click', () =>
  comBotaoTravado(botaoAlternarAtiva, mostrarErroDoFormulario, async () => {
    const { id, nome, ativa } = assinaturaEmEdicao;
    await atualizarAssinatura(id, { ativa: !ativa });
    await voltarAoInicio(ativa
      ? `"${nome}" foi cancelada. Ela saiu do total e continua em "Ver canceladas".`
      : `"${nome}" foi reativada e voltou a contar no total.`);
  }));

botaoApagar.addEventListener('click', () =>
  comBotaoTravado(botaoApagar, mostrarErroDoFormulario, async () => {
    const { id, nome } = assinaturaEmEdicao;
    // Única ação sem volta do app, por isso a confirmação.
    if (!window.confirm(`Apagar "${nome}" de vez? Isso não pode ser desfeito.`)) return;

    await apagarAssinatura(id);
    await voltarAoInicio(`"${nome}" foi apagada.`);
  }));

// Formulários de acesso ----------------------------------------------------------

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

// Botões de navegação -------------------------------------------------------------

document.querySelector('#botao-adicionar').addEventListener('click', () => abrirFormulario());

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
    assinaturaEmEdicao = null;
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
