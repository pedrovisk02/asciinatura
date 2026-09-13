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
import { resumoDoInicio, dataDeHoje, dataParaGravarNaEdicao, valorMensalEquivalente } from './calculos.js';
import { validarAssinatura, valorParaOCampo, lerValor } from './validacao.js';
import { criarCalendario } from './calendario.js';
import { mensagemDeErro, ehFalhaDeConexao, MENSAGEM_SEM_CONEXAO } from './erros.js';
import { fecharAbertura } from './abertura.js';
import { animarManchas, animarCirculo, reduzirMovimento } from './ascii.js';
import { confirmarApagar } from './confirmacao.js';
import { decifrarTextos, ligarInteracoes } from './interacoes.js';
import { prepararDialogo } from './dialogos.js';

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

// Com "animar", a tela entra com o efeito de decodificação. A tela inicial
// tem a própria entrada (tocarEntrada), que espera a lista carregar.
function mostrarTela(nome, { animar = true } = {}) {
  for (const [chave, tela] of Object.entries(telas)) {
    tela.hidden = chave !== nome;
  }
  if (animar && nome !== 'inicio' && nome !== 'carregando') {
    animarEntradaDaTela(telas[nome]);
  }
}

// Os blocos da tela aparecem em sequência e os textos se decifram.
function animarEntradaDaTela(elemento) {
  if (reduzirMovimento()) return;
  elemento.classList.remove('entrando');
  void elemento.offsetWidth; // força o navegador a reiniciar a animação
  elemento.classList.add('entrando');
  decifrarTextos(elemento);
  setTimeout(() => elemento.classList.remove('entrando'), 1200);
}

function mostrarAviso(texto) {
  // textContent, e nunca innerHTML: o texto aparece como texto, mesmo que
  // contenha algo parecido com código.
  aviso.textContent = texto;
  aviso.hidden = !texto;
}

const anuncio = document.querySelector('#anuncio');

// Conta a leitores de tela o que acabou de mudar.
function anunciar(texto) {
  anuncio.textContent = texto;
}

async function mostrarInicio(email) {
  document.querySelector('#conta-email').textContent = email;
  mostrarTela('inicio');
  await carregarInicio();
  // Com a lista pronta, a abertura sai e os blocos entram em sequência.
  await fecharAbertura();
  tocarEntrada();
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
// Sem "R$": para os números grandes, que já dizem "reais" na legenda.
const formatoNumero = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const estadoInicio = document.querySelector('#estado-inicio');
const esqueletoInicio = document.querySelector('#esqueleto-inicio');
const destaqueChegando = document.querySelector('#destaque-chegando');
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
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Primeira letra maiúscula, para textos montados a partir de partes (como a
// categoria que a pessoa digitou em minúsculas) começarem sempre em maiúscula.
function comPrimeiraMaiuscula(texto) {
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1);
}

// A etiqueta do total diz de qual mês é o valor: "Total de setembro".
const mesAtual = Number(dataDeHoje().split('-')[1]);
document.querySelector('#titulo-total').textContent = `Total de ${MESES[mesAtual - 1]}`;

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
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Amanhã';
  return `Em ${dias} dias`;
}

// Cria um elemento com classe e conteúdo. O conteúdo entra sempre como texto,
// nunca como HTML: um nome como "<b>teste</b>" aparece escrito, sem virar código.
function criar(tag, classe, ...conteudo) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  elemento.append(...conteudo);
  return elemento;
}

function criarValor(numero, sufixo = '') {
  const valor = criar('span', 'linha-valor', formatoNumero.format(numero));
  if (sufixo) valor.append(criar('small', '', sufixo));
  return valor;
}

// Uma linha de lista: nome, detalhe embaixo, valor à direita e botões de ação
// (cada um com um texto e o que fazer ao clicar).
function criarLinha(assinatura, { detalhe = '', valor = null, botoes = [] } = {}) {
  const texto = criar('span', 'linha-texto', criar('span', 'linha-nome', assinatura.nome));
  if (detalhe) texto.append(criar('span', 'linha-detalhe', detalhe));

  const linha = criar('li', 'linha', texto);
  // Para achar a linha depois de salvar e acendê-la (ver destacarLinha).
  linha.dataset.id = assinatura.id;
  if (valor) linha.append(valor);

  if (botoes.length > 0) {
    const grupo = criar('span', 'linha-botoes');
    for (const { texto: rotulo, aoClicar } of botoes) {
      const botao = criar('button', 'botao-mini', rotulo);
      botao.type = 'button';
      // Para leitor de tela: "Editar Netflix", e não só "Editar".
      botao.setAttribute('aria-label', `${rotulo} ${assinatura.nome}`);
      botao.addEventListener('click', () => aoClicar(assinatura, botao));
      grupo.append(botao);
    }
    linha.append(grupo);
  }
  return linha;
}

// Bloco grande de "Chegando", com o número de dias em destaque (como o "04"
// da referência). A primeira cobrança vem em verde; a segunda, em branco.
function criarCobrancaEmDestaque(assinatura, principal) {
  const dias = assinatura.diasAteCobranca;
  const numero = dias === 0 ? 'Hoje' : String(dias).padStart(2, '0');
  const legenda = dias === 0 ? 'Cobrança' : dias === 1 ? 'Dia · amanhã' : 'Dias';

  return criar(
    'article',
    `painel cobranca ${principal ? 'painel-verde cobranca-principal' : 'painel-branco'}`,
    criar('p', 'cobranca-rotulo', principal ? 'Próxima cobrança' : 'Depois'),
    criar('p', dias === 0 ? 'cobranca-dias cobranca-dias-palavra' : 'cobranca-dias', numero),
    criar(
      'p',
      'cobranca-info',
      `${legenda} · ${formatarDiaEMes(assinatura.dataDaCobranca)}`,
      criar('br', ''),
      assinatura.nome,
      criar('br', ''),
      formatoReais.format(assinatura.valor),
    ),
  );
}

// Largura, em "letras" (em), de cada caractere do total na fonte Montserrat
// 800, medida no navegador. Usa a do algarismo mais largo ("4") para todos, e
// assim o cálculo nunca subestima o espaço, seja qual for o número.
const LARGURA_DO_ALGARISMO = 0.66;
const LARGURA_DO_SEPARADOR = 0.24;
// O "R$" pequeno antes do número, com o espaço até ele (ver .numero-total-moeda).
const LARGURA_DA_MOEDA = 0.6;

function larguraEmLetras(texto) {
  const algarismos = texto.replace(/\D/g, '').length;
  return LARGURA_DA_MOEDA + algarismos * LARGURA_DO_ALGARISMO + (texto.length - algarismos) * LARGURA_DO_SEPARADOR;
}

// O número que está no cartaz agora, para a próxima contagem partir dele.
let totalNaTela = null;
let contagemDoTotal = 0;

// Mostra o total e informa ao CSS quanto ele ocupa, para a letra diminuir
// quando o número for longo (ver .numero-total no estilo.css).
// Com "contarDe", o número conta até o valor novo em vez de trocar de uma vez.
function mostrarTotal(valor, contarDe = null) {
  const numeroTotal = document.querySelector('#total-mensal');
  const textoFinal = formatoNumero.format(valor);
  cancelAnimationFrame(contagemDoTotal);
  totalNaTela = valor;

  // Durante a contagem o texto muda de tamanho: reserva espaço para o maior
  // dos dois, para o número nunca sair do bloco no meio do caminho.
  const textoInicial = contarDe === null ? textoFinal : formatoNumero.format(contarDe);
  numeroTotal.parentElement.style.setProperty('--largura-do-total', Math.max(larguraEmLetras(textoFinal), larguraEmLetras(textoInicial)));

  if (contarDe === null || contarDe === valor || reduzirMovimento()) {
    numeroTotal.textContent = textoFinal;
    return;
  }

  const inicio = performance.now();
  const passo = (agora) => {
    const p = Math.min(1, (agora - inicio) / 900);
    const suave = 1 - (1 - p) ** 3;
    numeroTotal.textContent = formatoNumero.format(contarDe + (valor - contarDe) * suave);
    if (p < 1) contagemDoTotal = requestAnimationFrame(passo);
  };
  contagemDoTotal = requestAnimationFrame(passo);
}

// Entrada da tela inicial: os blocos aparecem em sequência e os textos e
// números se decifram. Só quando a tela aparece, não a cada clique.
function tocarEntrada() {
  if (telas.inicio.hidden || inicioConteudo.hidden) return;
  animarEntradaDaTela(inicioConteudo);
}

// Depois de salvar, a própria linha avisa: acende e ganha um selo ("nova",
// "editada", "reativada" ou "cancelada") que some sozinho.
const FRASE_DO_SELO = {
  nova: (nome) => `"${nome}" foi salva.`,
  editada: (nome) => `Alterações em "${nome}" salvas.`,
  reativada: (nome) => `"${nome}" foi reativada e voltou a contar no total.`,
  cancelada: (nome) => `"${nome}" foi cancelada e saiu do total.`,
};

function destacarLinha({ id, nome, selo }) {
  anunciar(FRASE_DO_SELO[selo](nome));

  const lista = selo === 'cancelada' ? listas.canceladas : listas.ativas;
  const linha = [...lista.children].find((item) => item.dataset.id === String(id));
  if (!linha) return;

  // A cancelada vai para "Ver canceladas": abre o bloco para ela aparecer.
  if (selo === 'cancelada') blocoCanceladas.open = true;

  const marca = criar('span', 'selo', comPrimeiraMaiuscula(selo));
  linha.querySelector('.linha-nome').append(marca);
  linha.classList.add('destacada');
  linha.scrollIntoView({ block: 'nearest', behavior: reduzirMovimento() ? 'auto' : 'smooth' });

  setTimeout(() => {
    linha.classList.remove('destacada');
    marca.remove();
  }, 3000);
}

function mostrarChegando(chegando) {
  destaqueChegando.hidden = chegando.length === 0;
  destaqueChegando.replaceChildren(
    ...chegando.slice(0, 2).map((assinatura, posicao) => criarCobrancaEmDestaque(assinatura, posicao === 0)),
  );

  listas.chegando.replaceChildren(
    ...chegando.slice(2).map((assinatura) =>
      criarLinha(assinatura, {
        detalhe: `${quandoCobra(assinatura.diasAteCobranca)} · ${formatarDiaEMes(assinatura.dataDaCobranca)}`,
        // Com "R$", igual aos blocos grandes logo acima.
        valor: criar('span', 'linha-valor', formatoReais.format(assinatura.valor)),
      })),
  );

  document.querySelector('#chegando-vazio').hidden = chegando.length > 0;
}

function limparInicio() {
  numeroDaCarga++;
  cancelAnimationFrame(contagemDoTotal);
  totalNaTela = null;
  estadoInicio.textContent = '';
  esqueletoInicio.hidden = true;
  botaoTentarDeNovo.hidden = true;
  inicioVazio.hidden = true;
  inicioConteudo.hidden = true;
  blocoCanceladas.hidden = true;
  blocoComProblema.hidden = true;
  destaqueChegando.replaceChildren();
  for (const lista of Object.values(listas)) {
    lista.replaceChildren();
  }
}

// "destaque": a assinatura que acabou de ser salva, para a linha acender.
// "contar": o total conta do valor antigo até o novo (depois de salvar ou apagar).
async function carregarInicio({ destaque = null, contar = false } = {}) {
  const estaCarga = ++numeroDaCarga;
  const jaHaviaAlgoNaTela = !inicioConteudo.hidden || !inicioVazio.hidden;
  estadoInicio.textContent = '';
  botaoTentarDeNovo.hidden = true;
  // Sem nada na tela, os blocos piscando mostram o formato do que vem. Se já
  // havia algo (voltando depois de salvar), fica o que estava, sem piscar.
  esqueletoInicio.hidden = jaHaviaAlgoNaTela;

  try {
    const assinaturas = await listarAssinaturas();
    if (estaCarga !== numeroDaCarga) return;

    esqueletoInicio.hidden = true;
    const contarDe = contar ? totalNaTela : null;
    mostrarResumo(resumoDoInicio(assinaturas, dataDeHoje()), assinaturas.length, contarDe);
    if (destaque) destacarLinha(destaque);
  } catch (falha) {
    if (estaCarga !== numeroDaCarga) return;
    console.error(falha);
    esqueletoInicio.hidden = true;
    // Se já havia algo na tela, ele continua visível, com a explicação e o
    // botão para tentar de novo em cima.
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
  aoClicar: ({ id, nome }, botao) =>
    comBotaoTravado(botao, mostrarAviso, async () => {
      await atualizarAssinatura(id, { ativa: true });
      await carregarInicio({ destaque: { id, nome, selo: 'reativada' }, contar: true });
    }),
};

function mostrarResumo(resumo, quantidadeTotal, contarDe = null) {
  // Sem nenhuma assinatura (nem cancelada), a tela orienta em vez de mostrar zero.
  inicioVazio.hidden = quantidadeTotal > 0;
  inicioConteudo.hidden = quantidadeTotal === 0;

  blocoComProblema.hidden = resumo.comProblema.length === 0;
  listas.comProblema.replaceChildren(
    ...resumo.comProblema.map((assinatura) =>
      criarLinha(assinatura, {
        detalhe: `Data gravada ${formatarDataCompleta(assinatura.proxima_cobranca)}`,
        botoes: [{ ...botaoEditar, texto: 'Corrigir' }],
      })),
  );

  mostrarTotal(resumo.totalMensal, contarDe);
  document.querySelector('#quantidade-ativas').textContent =
    resumo.quantidadeAtivas === 1 ? '1 assinatura ativa' : `${resumo.quantidadeAtivas} assinaturas ativas`;

  mostrarChegando(resumo.chegando);

  // Mensal mostra o próprio valor. Trimestral e anual mostram o equivalente
  // mensal à direita, marcado com "/mês", e o valor realmente cobrado embaixo.
  listas.ativas.replaceChildren(
    ...resumo.ativas.map((assinatura) => {
      const cobrado = assinatura.ciclo === 'mensal'
        ? ''
        : `${formatoReais.format(assinatura.valor)} ${PERIODO_DO_CICLO[assinatura.ciclo]}`;
      return criarLinha(assinatura, {
        detalhe: comPrimeiraMaiuscula([cobrado, assinatura.categoria].filter(Boolean).join(' · ')),
        valor: criarValor(assinatura.valorMensal, '/mês'),
        botoes: [botaoEditar],
      });
    }),
  );
  document.querySelector('#ativas-vazio').hidden = resumo.ativas.length > 0;

  blocoCanceladas.hidden = resumo.canceladas.length === 0;
  document.querySelector('#quantidade-canceladas').textContent = resumo.canceladas.length;
  listas.canceladas.replaceChildren(
    ...resumo.canceladas.map((assinatura) =>
      criarLinha(assinatura, {
        detalhe: `${formatoReais.format(assinatura.valor)} ${PERIODO_DO_CICLO[assinatura.ciclo]}`,
        botoes: [botaoReativar, botaoEditar],
      })),
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

// O calendário do app, no lugar do calendário do navegador.
const calendario = criarCalendario({
  gatilho: document.querySelector('#campo-data'),
  textoDoGatilho: document.querySelector('#campo-data-texto'),
  entrada: formularioAssinatura.elements.namedItem('proxima_cobranca'),
  painel: document.querySelector('#calendario-data'),
});

// O elemento que representa cada campo na tela: é nele que ficam o aviso de
// erro para leitores de tela (aria-invalid) e o foco. O ciclo são três botões
// de rádio agrupados, e a data é o botão que abre o calendário.
function elementoDoCampo(nomeDoCampo) {
  if (nomeDoCampo === 'ciclo') return document.querySelector('#campo-ciclo');
  if (nomeDoCampo === 'proxima_cobranca') return document.querySelector('#campo-data');
  return formularioAssinatura.elements.namedItem(nomeDoCampo);
}

function focarCampo(nomeDoCampo) {
  if (nomeDoCampo === 'ciclo') {
    (formularioAssinatura.querySelector('[name="ciclo"]:checked') ?? formularioAssinatura.querySelector('[name="ciclo"]')).focus();
  } else {
    elementoDoCampo(nomeDoCampo).focus();
  }
}

// Mostra cada mensagem embaixo do seu campo e marca o campo como inválido
// (aria-invalid), o que leitores de tela anunciam.
function mostrarErrosDosCampos(erros) {
  for (const [chave, nomeDoCampo] of Object.entries(CAMPOS_DO_FORMULARIO)) {
    const mensagem = erros[chave] ?? '';
    document.querySelector(`#erro-campo-${nomeDoCampo}`).textContent = mensagem;
    elementoDoCampo(nomeDoCampo).setAttribute('aria-invalid', String(Boolean(mensagem)));
  }
}

// Ao corrigir um campo, a mensagem dele some, sem esperar o próximo "Salvar".
// Um só ouvinte para o formulário todo: o evento diz qual campo mudou.
formularioAssinatura.addEventListener('input', (evento) => {
  const nomeDoCampo = evento.target.name;
  if (!Object.values(CAMPOS_DO_FORMULARIO).includes(nomeDoCampo)) return;
  document.querySelector(`#erro-campo-${nomeDoCampo}`).textContent = '';
  elementoDoCampo(nomeDoCampo).setAttribute('aria-invalid', 'false');
});

// Cartões de ciclo: cada um mostra quanto o valor digitado pesa por mês.
// Com o valor vazio ou inválido, a linha pequena some.
function atualizarValoresPorMes() {
  const { valor } = lerValor(formularioAssinatura.elements.namedItem('valor').value);
  for (const legenda of formularioAssinatura.querySelectorAll('.opcao-por-mes')) {
    legenda.textContent = valor ? `${formatoReais.format(valorMensalEquivalente(valor, legenda.dataset.ciclo))}/mês` : '';
  }
}

formularioAssinatura.elements.namedItem('valor').addEventListener('input', atualizarValoresPorMes);

function abrirFormulario(assinatura = null) {
  assinaturaEmEdicao = assinatura;
  formularioAssinatura.reset();
  mostrarErroDoFormulario('');
  mostrarErrosDosCampos({});
  mostrarAviso('');

  document.querySelector('#titulo-formulario').textContent = assinatura ? 'Editar assinatura' : 'Nova assinatura';
  acoesEdicao.hidden = !assinatura;
  calendario.definir('');

  if (assinatura) {
    const campo = (nome) => formularioAssinatura.elements.namedItem(nome);
    campo('nome').value = assinatura.nome;
    campo('valor').value = valorParaOCampo(assinatura.valor);
    // Com os botões de rádio, dar o valor ao grupo marca o cartão certo.
    campo('ciclo').value = assinatura.ciclo;
    campo('categoria').value = assinatura.categoria ?? '';

    // Ativas mostram a próxima cobrança já avançada; canceladas e com problema,
    // a data gravada.
    dataMostradaNoFormulario = assinatura.dataDaCobranca ?? assinatura.proxima_cobranca;
    calendario.definir(dataMostradaNoFormulario);

    botaoAlternarAtiva.textContent = assinatura.ativa ? 'Marcar como cancelada' : 'Reativar assinatura';
  }

  atualizarValoresPorMes();
  mostrarTela('formulario');
}

async function voltarAoInicio(destaque = null) {
  assinaturaEmEdicao = null;
  formularioAssinatura.reset();
  mostrarTela('inicio');
  mostrarAviso('');
  // Relê do banco em vez de só mexer na tela: assim a tela mostra o que
  // realmente ficou gravado.
  await carregarInicio({ destaque, contar: true });
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
    focarCampo(CAMPOS_DO_FORMULARIO[primeiro]);
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
    const { id } = assinaturaEmEdicao;
    await atualizarAssinatura(id, campos);
    await voltarAoInicio({ id, nome: campos.nome, selo: 'editada' });
  } else {
    const nova = await criarAssinatura(campos);
    await voltarAoInicio({ id: nova.id, nome: nova.nome, selo: 'nova' });
  }
});

botaoAlternarAtiva.addEventListener('click', () =>
  comBotaoTravado(botaoAlternarAtiva, mostrarErroDoFormulario, async () => {
    const { id, nome, ativa } = assinaturaEmEdicao;
    await atualizarAssinatura(id, { ativa: !ativa });
    await voltarAoInicio({ id, nome, selo: ativa ? 'cancelada' : 'reativada' });
  }));

botaoApagar.addEventListener('click', async () => {
  const { id, nome, ativa } = assinaturaEmEdicao;
  // Única ação sem volta do app, por isso a confirmação. Para uma assinatura
  // ativa, a janela oferece também só cancelar, que é o que muitas vezes se quer.
  const escolha = await confirmarApagar({ nome, podeCancelar: ativa });

  if (escolha === 'cancelar') {
    botaoAlternarAtiva.click();
    return;
  }
  if (escolha !== 'apagar') return;

  comBotaoTravado(botaoApagar, mostrarErroDoFormulario, async () => {
    await apagarAssinatura(id);
    // A linha some e o total conta para baixo; o leitor de tela ouve a frase.
    anunciar(`"${nome}" foi apagada.`);
    await voltarAoInicio();
  });
});

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

// Dois botões de adicionar: o preso ao pé da tela (celular) e o do cartaz do
// total (computador). O CSS mostra só um de cada vez.
for (const botao of document.querySelectorAll('[data-acao="adicionar"]')) {
  botao.addEventListener('click', () => abrirFormulario());
}

for (const botao of document.querySelectorAll('[data-ir-para]')) {
  botao.addEventListener('click', () => {
    mostrarAviso('');
    mostrarTela(botao.dataset.irPara);
  });
}

// Gaveta da conta ---------------------------------------------------------------

const botaoConta = document.querySelector('#botao-conta');
const dialogoConta = document.querySelector('#dialogo-conta');
prepararDialogo(dialogoConta);

botaoConta.addEventListener('click', () => {
  dialogoConta.showModal();
  decifrarTextos(dialogoConta);
});

document.querySelector('#botao-fechar-conta').addEventListener('click', () => dialogoConta.close());

document.querySelector('#botao-sair').addEventListener('click', async () => {
  dialogoConta.close();
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

// Animações de letras: manchas nas telas de acesso e o círculo do total.
for (const cartaz of document.querySelectorAll('.cartaz-ascii')) {
  const textosDoCartaz = [...cartaz.children].filter((filho) => filho.tagName !== 'CANVAS');
  animarManchas(cartaz.querySelector('canvas'), textosDoCartaz);
}
const cartazTotal = document.querySelector('.cartaz-total');
animarCirculo(cartazTotal.querySelector('canvas'), cartazTotal);

// Inclinação 3D, círculo que acompanha o mouse e onda ao clicar, em todas as telas.
ligarInteracoes();

// Mostra uma tela assim que a abertura começa a sumir, com o efeito de entrada
// nesse momento (e não escondido atrás da abertura).
async function mostrarDepoisDaAbertura(nome) {
  mostrarTela(nome, { animar: false });
  await fecharAbertura();
  if (!telas[nome].hidden) animarEntradaDaTela(telas[nome]);
}

acompanharSessao((evento, sessao) => {
  if (evento === 'PASSWORD_RECOVERY') {
    definindoNovaSenha = true;
    mostrarDepoisDaAbertura('novaSenha');
    return;
  }

  const usuario = sessao?.user.id ?? null;
  if (usuario === usuarioNaTela) return;
  usuarioNaTela = usuario;

  // O botão da conta só existe para quem está conectado.
  botaoConta.hidden = !sessao;
  document.querySelector('#conta-email').textContent = sessao?.user.email ?? '';
  if (!sessao && dialogoConta.open) dialogoConta.close();

  if (!sessao) {
    definindoNovaSenha = false;
    assinaturaEmEdicao = null;
    // Apaga da página as assinaturas de quem saiu, para a próxima pessoa que
    // usar este navegador não ver nada que não é dela.
    limparInicio();
    // Só ao sair de fato: ao abrir o app sem sessão, pode haver um aviso que
    // precisa continuar visível (como o de link vencido).
    if (evento === 'SIGNED_OUT') mostrarAviso('');
    mostrarDepoisDaAbertura('entrar');
  } else if (definindoNovaSenha) {
    mostrarDepoisDaAbertura('novaSenha');
  } else {
    mostrarInicio(sessao.user.email);
  }
});
