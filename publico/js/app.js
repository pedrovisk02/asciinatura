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
import {
  resumoDoInicio, dataDeHoje, dataParaGravarNaEdicao, valorMensalEquivalente, JANELAS_DO_CHEGANDO, ORDENS_DA_LISTA,
} from './calculos.js';
import { lerPreferenciasDoInicio, guardarPreferenciasDoInicio } from './preferencias.js';
import { ligarEscolha } from './escolha.js';
import { validarAssinatura, valorParaOCampo, lerValor, validarNome } from './validacao.js';
import { criarCalendario } from './calendario.js';
import { mensagemDeErro, ehFalhaDeConexao, MENSAGEM_SEM_CONEXAO } from './erros.js';
import { fecharAbertura } from './abertura.js';
import { animarManchas, animarCirculo, reduzirMovimento, zonaDaForma } from './ascii.js';
import { confirmarApagar } from './confirmacao.js';
import { decifrarTextos, decifrarElementos, ligarInteracoes } from './interacoes.js';
import { prepararDeslize, deslizarAbertura } from './deslizar.js';
import { lerRota, enderecoDaRota, rotaPai, ROTAS_DE_AJUSTES } from './rotas.js';
import { prepararMenuConta, atualizarMenuConta, fecharTudoDaConta } from './menu-conta.js';
import { prepararMinhaConta, mostrarConta, fecharEdicoesDaConta } from './minha-conta.js';
import { prepararAparencia } from './aparencia.js';

const telas = {
  carregando: document.querySelector('#tela-carregando'),
  entrar: document.querySelector('#tela-entrar'),
  criarConta: document.querySelector('#tela-criar-conta'),
  pedirNovaSenha: document.querySelector('#tela-pedir-nova-senha'),
  novaSenha: document.querySelector('#tela-nova-senha'),
  inicio: document.querySelector('#tela-inicio'),
  formulario: document.querySelector('#tela-formulario'),
  ajustes: document.querySelector('#tela-ajustes'),
};

const aviso = document.querySelector('#aviso');
// O olho do topo só aparece na tela inicial, que é onde os valores ficam.
const botaoValores = document.querySelector('#botao-valores');

// Verdadeiro enquanto a pessoa, vinda do link de nova senha, ainda não salvou
// a senha nova. Nesse meio tempo ela já tem sessão, mas não deve ir para o início.
let definindoNovaSenha = false;

// A tela que está aparecendo, onde a pessoa estava na lista da tela inicial ao
// abrir o formulário, e o botão que abriu o formulário ("Editar" ou
// "Adicionar"), para devolver a pessoa ao mesmo ponto quando ela voltar.
let telaAtual = null;
let rolagemDoInicio = 0;
let origemDoFormulario = null;

// Com "animar", a tela entra com o efeito de decodificação. A tela inicial
// tem a própria entrada (tocarEntrada), que espera a lista carregar.
function mostrarTela(nome, { animar = true } = {}) {
  const telaAnterior = telaAtual;
  if (nome === 'formulario' && telaAnterior === 'inicio') rolagemDoInicio = window.scrollY;

  for (const [chave, tela] of Object.entries(telas)) {
    tela.hidden = chave !== nome;
  }
  botaoValores.hidden = nome !== 'inicio';

  if (nome !== telaAnterior) {
    telaAtual = nome;
    // Cada tela começa do topo. Sem isso, o formulário aberto pelo "Editar" do
    // fim da lista aparecia no celular já rolado, sem o título e o nome. Ao
    // voltar do formulário, a tela inicial volta para onde a pessoa estava.
    window.scrollTo(0, nome === 'inicio' && telaAnterior === 'formulario' ? rolagemDoInicio : 0);
  }

  if (focoPerdido()) {
    const voltouDoFormulario = nome === 'inicio' && estaNaTela(origemDoFormulario);
    focar(voltouDoFormulario ? origemDoFormulario : primeiroTituloVisivel(telas[nome]));
  }

  if (animar && nome !== 'inicio' && nome !== 'carregando') {
    animarEntradaDaTela(telas[nome]);
  }
}

// Foco ----------------------------------------------------------------------------
//
// Quem usa teclado ou leitor de tela fica "no nada" quando o elemento com o
// foco some junto com a tela antiga: o próximo Tab recomeça do topo e o leitor
// não avisa que a tela mudou. Nesses casos o foco vai para o título da tela
// nova (ou de volta ao botão que abriu o formulário).

// Elemento existe e aparece (sem nenhum pai escondido).
function estaNaTela(elemento) {
  return Boolean(elemento?.isConnected && elemento.getClientRects().length > 0);
}

function focoPerdido() {
  const ativo = document.activeElement;
  return !ativo || ativo === document.body || !estaNaTela(ativo);
}

function primeiroTituloVisivel(raiz) {
  return [...raiz.querySelectorAll('h2')].find(estaNaTela);
}

function focar(elemento) {
  if (!elemento) return;
  // Um título não é botão: tabindex -1 deixa o código colocar o foco nele sem
  // que ele entre na ordem do Tab.
  if (elemento.tagName === 'H2') elemento.tabIndex = -1;
  // preventScroll: quem cuida da rolagem é o mostrarTela.
  elemento.focus({ preventScroll: true });
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

async function mostrarInicio() {
  mostrarTela('inicio');
  await carregarInicio();
  // Os títulos só aparecem com a lista carregada.
  if (focoPerdido()) focar(primeiroTituloVisivel(telas.inicio));
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
    // Aviso de validação do próprio app é esperado; só erro de verdade vai
    // para o console.
    if (!falha?.mensagemPronta) console.error(falha);
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

// Quantas linhas cada lista mostra antes do "Mostrar mais" (desenho do Pedro).
// Com esses números, as duas colunas do computador terminam quase juntas.
const LINHAS_ANTES_DE_MOSTRAR_MAIS = { chegando: 4, todas: 5 };
const listaAberta = { chegando: false, todas: false };
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

// Primeira letra maiúscula, para textos montados a partir de partes (como a
// categoria que a pessoa digitou em minúsculas) começarem sempre em maiúscula.
function comPrimeiraMaiuscula(texto) {
  return texto.charAt(0).toLocaleUpperCase('pt-BR') + texto.slice(1);
}

// Conta as cargas da tela inicial. Se uma resposta antiga chegar depois de uma
// nova, ou depois de a pessoa sair, ela é descartada em vez de aparecer na tela.
let numeroDaCarga = 0;

// A data usada para montar a tela inicial pela última vez (null antes da
// primeira carga e depois de sair).
let diaDaTela = null;

// Escolhas da tela inicial (olho, dias do "Chegando" e ordem de "Todas"),
// guardadas no aparelho, e as assinaturas da última carga: com elas, mudar
// uma escolha redesenha a tela sem buscar tudo de novo no banco.
let preferencias = lerPreferenciasDoInicio();
let assinaturasNaTela = null;

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

// Valores escondidos (o olho do topo): "••••" no lugar do número. O leitor de
// tela ouve "valor escondido" em vez dos pontinhos. A classe valor-dinheiro
// marca o que se embaralha ao tocar no olho.
function valorEscondido() {
  const pontos = criar('span', 'valor-dinheiro', '••••');
  pontos.setAttribute('aria-hidden', 'true');
  return criar('span', 'valor-escondido', criar('span', 'so-leitor', 'valor escondido'), pontos);
}

// "44,90", ou os pontinhos com os valores escondidos.
function numeroNaTela(numero) {
  return preferencias.valoresEscondidos ? valorEscondido() : criar('span', 'valor-dinheiro', formatoNumero.format(numero));
}

// "R$ 44,90", ou "R$ ••••" com os valores escondidos. O "R$" fica fora do
// efeito de embaralhar; só o número muda.
function reaisNaTela(valor) {
  return criar('span', '', 'R$\u00a0', numeroNaTela(valor));
}

function criarValor(numero, sufixo = '') {
  const valor = criar('span', 'linha-valor', numeroNaTela(numero));
  if (sufixo) valor.append(criar('small', '', sufixo));
  return valor;
}

// Uma linha de lista: nome, detalhe embaixo, valor à direita e botões de ação
// (cada um com um texto e o que fazer ao clicar). O detalhe pode ser um texto
// ou uma lista de pedaços (textos e valores que podem estar escondidos).
function criarLinha(assinatura, { detalhe = '', valor = null, botoes = [] } = {}) {
  const texto = criar('span', 'linha-texto', criar('span', 'linha-nome', assinatura.nome));
  const pedacosDoDetalhe = [detalhe].flat().filter((pedaco) => pedaco !== '');
  if (pedacosDoDetalhe.length > 0) texto.append(criar('span', 'linha-detalhe', ...pedacosDoDetalhe));

  const linha = criar('li', 'linha', texto);
  // Para achar a linha depois de salvar e acendê-la (ver destacarLinha) e para
  // ela deslizar até o novo lugar quando a lista muda (deslizar.js).
  linha.dataset.id = assinatura.id;
  linha.dataset.chave = `linha-${assinatura.id}`;
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
// da referência). Cada paleta escolhe as cores do primeiro e do segundo bloco.
function criarCobrancaEmDestaque(assinatura, principal) {
  const dias = assinatura.diasAteCobranca;
  const numero = dias === 0 ? 'Hoje' : String(dias).padStart(2, '0');
  const legenda = dias === 0 ? 'Cobrança' : dias === 1 ? 'Dia · amanhã' : 'Dias';

  const bloco = criar(
    'article',
    `painel cobranca ${principal ? 'cobranca-principal' : 'cobranca-secundaria'}`,
    criar('p', 'cobranca-rotulo', principal ? 'Próxima cobrança' : 'Depois'),
    criar('p', dias === 0 ? 'cobranca-dias cobranca-dias-palavra' : 'cobranca-dias', numero),
    criar(
      'p',
      'cobranca-info',
      `${legenda} · ${formatarDiaEMes(assinatura.dataDaCobranca)}`,
      criar('br', ''),
      assinatura.nome,
      criar('br', ''),
      reaisNaTela(assinatura.valor),
    ),
  );
  bloco.dataset.chave = `bloco-${assinatura.id}`;
  return bloco;
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

  // Escondido: pontinhos sempre do mesmo tamanho, para o tamanho da letra não
  // dar pista de quanto é o total.
  if (preferencias.valoresEscondidos) {
    numeroTotal.parentElement.style.setProperty('--largura-do-total', larguraEmLetras('000,00'));
    numeroTotal.replaceChildren(valorEscondido());
    return;
  }

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
  if (telas.inicio.hidden) return;
  if (!inicioConteudo.hidden) animarEntradaDaTela(inicioConteudo);
  // Sem nenhuma assinatura, quem entra é o cartaz de boas-vindas.
  else if (!inicioVazio.hidden) animarEntradaDaTela(telas.inicio);
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

  // A linha pode estar escondida: a cancelada fica na barra fechada, e uma
  // ativa pode estar além do "Mostrar mais". Nos dois casos, abre para ela
  // aparecer.
  if (selo === 'cancelada') alternarCanceladas(true);
  else if (linha.hidden) {
    listaAberta.todas = true;
    aplicarLimiteDaLista('todas');
  }

  const marca = criar('span', 'selo', comPrimeiraMaiuscula(selo));
  linha.querySelector('.linha-nome').append(marca);
  linha.classList.add('destacada');
  linha.scrollIntoView({ block: 'nearest', behavior: reduzirMovimento() ? 'auto' : 'smooth' });

  setTimeout(() => {
    linha.classList.remove('destacada');
    marca.remove();
  }, 3000);
}

// Valores alinhados numa coluna: a lista reserva a largura do maior valor
// dela, e o estilo encosta todos à direita dessa largura.
function alinharValores(lista) {
  lista.style.removeProperty('--largura-do-valor');
  let maior = 0;
  for (const numero of lista.querySelectorAll('.linha-valor .valor-dinheiro')) {
    maior = Math.max(maior, numero.getBoundingClientRect().width);
  }
  if (maior > 0) lista.style.setProperty('--largura-do-valor', `${Math.ceil(maior)}px`);
}

// Altura natural da primeira linha de uma lista (sem a altura combinada).
function alturaDeUmaLinha(lista) {
  const primeira = [...lista.children].find((linha) => linha.getClientRects().length > 0);
  return primeira ? primeira.getBoundingClientRect().height : 0;
}

// Linhas cinzas das duas colunas na mesma altura (pedido do Pedro). Duas
// coisas fazem isso: as linhas das duas listas passam a ter a mesma altura, e
// os blocos do "Chegando" ocupam uma altura múltipla dela, de modo que a lista
// da esquerda comece exatamente onde uma linha da direita termina.
function alinharLinhasDasColunas() {
  inicioConteudo.style.removeProperty('--altura-da-linha');
  destaqueChegando.style.removeProperty('--altura-dos-blocos');

  const altura = Math.max(alturaDeUmaLinha(listas.ativas), alturaDeUmaLinha(listas.chegando));
  if (altura === 0) return;
  inicioConteudo.style.setProperty('--altura-da-linha', `${altura}px`);

  // No celular as listas ficam uma embaixo da outra, então não há o que alinhar.
  if (!computador.matches || destaqueChegando.hidden || listas.chegando.children.length === 0) return;

  // Quanto a lista da esquerda começa abaixo da lista da direita. Os blocos
  // crescem só o necessário para essa distância virar um número inteiro de
  // linhas: aí as linhas cinzas das duas colunas caem na mesma altura.
  const distancia = listas.chegando.getBoundingClientRect().top - listas.ativas.getBoundingClientRect().top;
  if (distancia <= 0) return;
  const blocos = destaqueChegando.getBoundingClientRect().height;
  const aumento = Math.ceil(distancia / altura) * altura - distancia;
  destaqueChegando.style.setProperty('--altura-dos-blocos', `${Math.round(blocos + aumento)}px`);
}

// Os últimos pixels: com as listas fechadas, as duas colunas do computador
// terminam na mesma altura. A sobra vai para a barra das canceladas (quando a
// esquerda é mais alta) ou para o "Mostrar mais" do "Chegando".
function acertarFimDasColunas() {
  blocoCanceladas.style.removeProperty('--sobra-da-barra');
  painelChegando.style.removeProperty('--sobra-do-chegando');
  if (!computador.matches || listaAberta.chegando || listaAberta.todas) return;

  const colunaDaDireita = painelTodas.parentElement;
  const sobra = Math.round(
    painelChegando.getBoundingClientRect().bottom - colunaDaDireita.getBoundingClientRect().bottom,
  );
  // Diferença grande é caso de mudar a quantidade de linhas, e não de empurrar
  // pixels; aí as colunas ficam como estão.
  if (sobra === 0 || Math.abs(sobra) > 40) return;

  if (sobra > 0 && !blocoCanceladas.hidden) blocoCanceladas.style.setProperty('--sobra-da-barra', `${sobra}px`);
  else if (sobra < 0) painelChegando.style.setProperty('--sobra-do-chegando', `${-sobra}px`);
}

// Quantas linhas o "Chegando" mostra fechado. No celular é o número fixo; no
// computador, quantas couberem para a coluna da esquerda terminar junto com a
// da direita (pelo menos duas), que é a simetria que o Pedro desenhou.
function linhasDoChegando() {
  const padrao = LINHAS_ANTES_DE_MOSTRAR_MAIS.chegando;
  const linhas = [...listas.chegando.children];
  const primeiraVisivel = linhas.find((linha) => linha.getClientRects().length > 0);
  if (!computador.matches || !primeiraVisivel) return padrao;

  const colunaDaDireita = painelTodas.parentElement;
  const sobra = colunaDaDireita.getBoundingClientRect().height
    - (painelChegando.getBoundingClientRect().height - listas.chegando.getBoundingClientRect().height);
  // Arredonda para a quantidade mais próxima: uma linha a mais que passe um
  // pouco deixa as colunas mais parelhas do que uma linha a menos sobrando.
  const cabem = Math.round(sobra / primeiraVisivel.getBoundingClientRect().height);
  return Math.min(Math.max(cabem, 2), linhas.length);
}

// Mostra só as primeiras linhas; o resto abre no "Mostrar mais". O botão some
// quando a lista já cabe inteira.
function aplicarLimiteDaLista(qual) {
  const lista = listas[qual === 'todas' ? 'ativas' : 'chegando'];
  const botao = document.querySelector(`#mostrar-mais-${qual}`);
  const limite = qual === 'chegando' ? linhasDoChegando() : LINHAS_ANTES_DE_MOSTRAR_MAIS.todas;
  const linhas = [...lista.children];
  const aberta = listaAberta[qual];

  linhas.forEach((linha, posicao) => {
    linha.hidden = !aberta && posicao >= limite;
  });

  const escondidas = Math.max(0, linhas.length - limite);
  botao.hidden = escondidas === 0;
  botao.setAttribute('aria-expanded', String(aberta));
  botao.querySelector('span').textContent = aberta ? 'Mostrar menos' : `Mostrar mais ${escondidas}`;
}

function mostrarChegando(chegando) {
  const dias = preferencias.diasDoChegando;
  document.querySelector('#titulo-chegando').textContent = `Chegando · próximos ${dias} dias`;
  document.querySelector('#chegando-vazio').textContent = `Nenhuma cobrança nos próximos ${dias} dias.`;

  destaqueChegando.hidden = chegando.length === 0;
  destaqueChegando.replaceChildren(
    ...chegando.slice(0, 2).map((assinatura, posicao) => criarCobrancaEmDestaque(assinatura, posicao === 0)),
  );

  listas.chegando.replaceChildren(
    ...chegando.slice(2).map((assinatura) =>
      criarLinha(assinatura, {
        detalhe: `${quandoCobra(assinatura.diasAteCobranca)} · ${formatarDiaEMes(assinatura.dataDaCobranca)}`,
        // Com "R$", igual aos blocos grandes logo acima.
        valor: criar('span', 'linha-valor', reaisNaTela(assinatura.valor)),
      })),
  );

  document.querySelector('#chegando-vazio').hidden = chegando.length > 0;
  alinharValores(listas.chegando);
}

function limparInicio() {
  numeroDaCarga++;
  cancelAnimationFrame(contagemDoTotal);
  totalNaTela = null;
  diaDaTela = null;
  assinaturasNaTela = null;
  listaAberta.chegando = false;
  listaAberta.todas = false;
  origemDoFormulario = null;
  rolagemDoInicio = 0;
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
    diaDaTela = dataDeHoje();
    // A etiqueta do total diz de qual mês é o valor: "Total de setembro".
    document.querySelector('#titulo-total').textContent = `Total de ${MESES[Number(diaDaTela.split('-')[1]) - 1]}`;
    assinaturasNaTela = assinaturas;
    mostrarResumo(resumoDoInicio(assinaturas, diaDaTela, preferencias), assinaturas.length, contarDe);
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

// App deixado aberto de um dia para o outro (a aba esquecida no celular, por
// exemplo): ao voltar para ele, a tela inicial é refeita com a data nova, para
// os dias que faltam, o "Chegando" e o mês do total não ficarem com a de ontem.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && diaDaTela && diaDaTela !== dataDeHoje()) {
    carregarInicio();
  }
});

const botaoEditar = { texto: 'Editar', aoClicar: (assinatura, botao) => abrirFormulario(assinatura, botao) };

const botaoReativar = {
  texto: 'Reativar',
  aoClicar: ({ id, nome }, botao) =>
    comBotaoTravado(botao, mostrarAviso, async () => {
      await atualizarAssinatura(id, { ativa: true });
      await carregarInicio({ destaque: { id, nome, selo: 'reativada' }, contar: true });
      focarLinhaSePerdido(id);
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
      const detalhe = [];
      if (assinatura.ciclo !== 'mensal') detalhe.push(reaisNaTela(assinatura.valor), ` ${PERIODO_DO_CICLO[assinatura.ciclo]}`);
      if (assinatura.categoria) {
        detalhe.push(detalhe.length > 0 ? ` · ${assinatura.categoria}` : comPrimeiraMaiuscula(assinatura.categoria));
      }
      return criarLinha(assinatura, {
        detalhe,
        valor: criarValor(assinatura.valorMensal, '/mês'),
        botoes: [botaoEditar],
      });
    }),
  );
  document.querySelector('#ativas-vazio').hidden = resumo.ativas.length > 0;
  alinharValores(listas.ativas);

  blocoCanceladas.hidden = resumo.canceladas.length === 0;
  document.querySelector('#quantidade-canceladas').textContent = resumo.canceladas.length;
  listas.canceladas.replaceChildren(
    ...resumo.canceladas.map((assinatura) =>
      criarLinha(assinatura, {
        detalhe: [reaisNaTela(assinatura.valor), ` ${PERIODO_DO_CICLO[assinatura.ciclo]}`],
        botoes: [botaoReativar, botaoEditar],
      })),
  );

  // Com as duas listas montadas: linhas na mesma altura, depois quantas linhas
  // cada uma mostra e, por fim, os últimos pixels para as colunas terminarem
  // juntas.
  alinharLinhasDasColunas();
  aplicarLimiteDaLista('todas');
  aplicarLimiteDaLista('chegando');
  acertarFimDasColunas();
}

// "Mostrar mais" e canceladas -------------------------------------------------------

const abrirCanceladas = document.querySelector('#abrir-canceladas');


for (const botao of document.querySelectorAll('.mostrar-mais')) {
  botao.addEventListener('click', () => {
    const qual = botao.dataset.lista;
    const painel = botao.closest('.painel');
    // As linhas que chegam (ou que saem) deslizam até o lugar, como nas
    // outras trocas da tela inicial.
    const deslizar = prepararDeslize(painel);
    listaAberta[qual] = !listaAberta[qual];
    aplicarLimiteDaLista(qual);
    acertarFimDasColunas();
    deslizar();
  });
}

function alternarCanceladas(abrir) {
  abrirCanceladas.setAttribute('aria-expanded', String(abrir));
  deslizarAbertura(listas.canceladas, abrir);
  if (abrir) acompanharAsCanceladas();
}

// Ao abrir, a tela desce junto com as canceladas, acompanhando a abertura
// quadro a quadro. De uma vez só não funciona: no meio da animação a página
// ainda é curta e a rolagem para no fim dela.
function acompanharAsCanceladas() {
  // No celular, o botão de adicionar fica preso no pé e taparia a última linha.
  const folgaEmbaixo = computador.matches ? 24 : 96;
  const quantoFalta = () => blocoCanceladas.getBoundingClientRect().bottom + folgaEmbaixo - window.innerHeight;

  if (reduzirMovimento()) {
    const faltando = quantoFalta();
    if (faltando > 0) window.scrollBy(0, faltando);
    return;
  }

  const comecou = performance.now();
  const passo = () => {
    const faltando = quantoFalta();
    // Desce no máximo um pedaço por quadro, para a tela acompanhar a abertura
    // em vez de pular direto para o fim.
    if (faltando > 0) window.scrollBy(0, Math.min(faltando, 24));
    if (performance.now() - comecou < 600) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

abrirCanceladas.addEventListener('click', () => {
  alternarCanceladas(abrirCanceladas.getAttribute('aria-expanded') !== 'true');
});

// Escolhas da tela inicial ---------------------------------------------------------

const painelChegando = document.querySelector('.painel-chegando');
const painelTodas = document.querySelector('#lista-ativas').closest('.painel');
const tituloChegando = document.querySelector('#titulo-chegando');

// Redesenha a tela inicial com as escolhas novas, sem buscar as assinaturas de
// novo. "deslizarEm": o painel cujos itens deslizam até o novo lugar.
function redesenharInicio({ deslizarEm = null } = {}) {
  if (!assinaturasNaTela || !diaDaTela) return;
  const tituloAntes = tituloChegando.textContent;
  const deslizar = deslizarEm ? prepararDeslize(deslizarEm) : null;

  mostrarResumo(resumoDoInicio(assinaturasNaTela, diaDaTela, preferencias), assinaturasNaTela.length);

  deslizar?.();
  // "próximos 30 dias" virou "próximos 7 dias": o título novo aparece suave.
  if (tituloChegando.textContent !== tituloAntes && !reduzirMovimento()) {
    tituloChegando.animate(
      [{ opacity: 0, transform: 'translateY(-4px)' }, { opacity: 1, transform: 'none' }],
      { duration: 300, easing: 'ease-out' },
    );
  }
}

function mudarPreferencias(mudanca, frase, opcoesDoRedesenho) {
  preferencias = { ...preferencias, ...mudanca };
  guardarPreferenciasDoInicio(preferencias);
  redesenharInicio(opcoesDoRedesenho);
  anunciar(frase);
}

// Os valores em reais da tela inicial, na ordem em que aparecem (o total
// primeiro), para se embaralharem e se decifrarem ao tocar no olho.
function valoresDaTelaInicial() {
  const valores = [...inicioConteudo.querySelectorAll('.valor-dinheiro')];
  if (!preferencias.valoresEscondidos) valores.unshift(document.querySelector('#total-mensal'));
  return valores;
}

// O olho fica "apertado" (verde cheio, olho fechado) com os valores escondidos.
function atualizarBotaoValores() {
  const escondidos = preferencias.valoresEscondidos;
  botaoValores.setAttribute('aria-pressed', String(escondidos));
  botaoValores.title = escondidos ? 'Mostrar valores' : 'Esconder valores';
}

atualizarBotaoValores();

// Ao tocar no olho, os valores se embaralham em letras e se decifram já na
// forma nova (rascunho V1 escolhido pelo Pedro).
botaoValores.addEventListener('click', () => {
  const escondidos = !preferencias.valoresEscondidos;
  mudarPreferencias({ valoresEscondidos: escondidos }, escondidos ? 'Valores escondidos.' : 'Valores à mostra.');
  atualizarBotaoValores();
  decifrarElementos(valoresDaTelaInicial());
});

ligarEscolha({
  botao: document.querySelector('#botao-dias-chegando'),
  etiqueta: 'Chegando',
  titulo: 'Quantos dias mostrar?',
  opcoes: JANELAS_DO_CHEGANDO.map((dias) => ({ valor: dias, nome: `Próximos ${dias} dias` })),
  valorAtual: () => preferencias.diasDoChegando,
  aoEscolher: (dias) => mudarPreferencias(
    { diasDoChegando: dias },
    `Chegando mostra os próximos ${dias} dias.`,
    { deslizarEm: painelChegando },
  ),
});

ligarEscolha({
  botao: document.querySelector('#botao-ordem'),
  etiqueta: 'Todas',
  titulo: 'Ordenar por',
  opcoes: ORDENS_DA_LISTA.map((ordem) => ({ valor: ordem.id, nome: ordem.nome })),
  valorAtual: () => preferencias.ordem,
  aoEscolher: (ordem) => mudarPreferencias(
    { ordem },
    `Todas em ordem de ${ORDENS_DA_LISTA.find((opcao) => opcao.id === ordem).nome.toLowerCase()}.`,
    { deslizarEm: painelTodas },
  ),
});

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

// "origem": o botão que abriu o formulário, para o foco voltar a ele.
function abrirFormulario(assinatura = null, origem = null) {
  assinaturaEmEdicao = assinatura;
  origemDoFormulario = origem;
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
  // A tela troca quando o endereço muda (aplicarRota), e assim o voltar do
  // celular fecha o formulário em vez de sair do app.
  formularioPedido = true;
  navegar('assinatura');
}

async function voltarAoInicio(destaque = null) {
  assinaturaEmEdicao = null;
  formularioAssinatura.reset();
  mostrarAviso('');
  // Tira o formulário do histórico: depois de salvar, o voltar do celular não
  // reabre o formulário já salvo.
  voltar();
  // Relê do banco em vez de só mexer na tela: assim a tela mostra o que
  // realmente ficou gravado.
  await carregarInicio({ destaque, contar: true });
  focarLinhaSePerdido(destaque?.id);
}

// Depois de salvar, a lista é refeita e o botão que tinha o foco é trocado por
// um novo. O foco vai para o botão da mesma assinatura na lista nova ("Editar"
// ou "Corrigir", o último da linha); se ela foi apagada, para o título da tela.
function focarLinhaSePerdido(id) {
  if (!focoPerdido()) return;
  const botaoDaLinha = id && document.querySelector(`.linha[data-id="${id}"] .botao-mini:last-child`);
  focar(estaNaTela(botaoDaLinha) ? botaoDaLinha : primeiroTituloVisivel(telas.inicio));
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

// Depois de entrar ou criar conta, os campos são limpos. A tela de acesso só
// fica escondida, e sem limpar ela guardaria o e-mail e a senha: depois de
// "Sair da conta", a próxima pessoa no mesmo computador entraria na conta
// anterior só apertando "Entrar".
ligarFormulario('#form-entrar', async (dados, formulario) => {
  await entrar(dados.get('email'), dados.get('senha'));
  formulario.reset();
  // A troca para a tela inicial acontece em acompanharSessao, no fim do arquivo.
});

ligarFormulario('#form-criar-conta', async (dados, formulario) => {
  const { nome, erro } = validarNome(dados.get('nome'));
  if (erro) {
    formulario.elements.namedItem('nome').focus();
    throw Object.assign(new Error(erro), { mensagemPronta: erro });
  }
  const email = dados.get('email');
  const { precisaConfirmarEmail } = await criarConta(email, dados.get('senha'), nome);
  formulario.reset();

  // Com a confirmação de e-mail desligada no Supabase, a conta já nasce com
  // sessão e a pessoa entra direto (acompanharSessao). Este caminho fica para
  // o caso de a confirmação ser religada.
  if (precisaConfirmarEmail) {
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
  await definirNovaSenha(dados.get('senha'));
  definindoNovaSenha = false;
  formulario.reset();
  history.replaceState({ anterior: null }, '', enderecoDaRota('inicio'));
  rotaAtual = 'inicio';
  mostrarInicio();
  mostrarAviso('Senha alterada.');
});

// Botões de navegação -------------------------------------------------------------

// Dois botões de adicionar: o preso ao pé da tela (celular) e o do cartaz do
// total (computador). O CSS mostra só um de cada vez.
for (const botao of document.querySelectorAll('[data-acao="adicionar"]')) {
  botao.addEventListener('click', () => abrirFormulario(null, botao));
}

for (const botao of document.querySelectorAll('[data-voltar]')) {
  botao.addEventListener('click', () => voltar());
}

for (const botao of document.querySelectorAll('[data-ir-para]')) {
  botao.addEventListener('click', () => {
    mostrarAviso('');
    mostrarTela(botao.dataset.irPara);
  });
}

// Menu da conta, Minha conta e Aparência ------------------------------------------

prepararMenuConta({
  aoSair: async () => {
    try {
      await sair();
      // A troca para a tela de entrar acontece em acompanharSessao.
    } catch (falha) {
      console.error(falha);
      mostrarAviso(mensagemDeErro(falha));
    }
  },
});

prepararMinhaConta({
  // O nome novo aparece também no menu da conta ("Olá, Pedro!").
  aoMudarNome: (usuario) => {
    if (sessaoAtual) {
      sessaoAtual = { ...sessaoAtual, user: usuario };
      atualizarMenuConta(sessaoAtual);
      // O "Olá, Nome" do topo também se decifra com o nome novo.
      decifrarElementos([document.querySelector('#botao-conta-texto')]);
    }
  },
  anunciarNaTela: anunciar,
});

prepararAparencia();

// Endereços das páginas ------------------------------------------------------------
//
// Cada página tem um endereço (#/conta, #/configuracoes/aparencia,
// #/assinatura...). Trocar de página é mudar o endereço; quem troca a tela é
// aplicarRota. Assim o voltar do celular, os botões de voltar e o F5 levam à
// página certa. Cada item do histórico guarda de qual página se veio
// ("anterior"), para o botão "Voltar" do app saber se pode voltar no histórico.

const computador = window.matchMedia('(min-width: 880px)');

// Virar o celular ou mudar o tamanho da janela troca o formato das colunas:
// a lista do "Chegando" se acerta de novo, para elas terminarem juntas.
computador.addEventListener('change', () => {
  if (telas.inicio.hidden || inicioConteudo.hidden) return;
  alinharLinhasDasColunas();
  aplicarLimiteDaLista('todas');
  aplicarLimiteDaLista('chegando');
  acertarFimDasColunas();
});
const areas = {
  conta: document.querySelector('#area-conta'),
  configuracoes: document.querySelector('#area-configuracoes'),
  aparencia: document.querySelector('#area-aparencia'),
};

let rotaAtual = null;
let sessaoAtual = null;
// Verdadeiro só entre abrirFormulario e a troca de tela: sem ele, chegar em
// #/assinatura pelo histórico (sem um formulário preparado) volta ao início.
let formularioPedido = false;

function navegar(nome, { substituir = false } = {}) {
  const endereco = enderecoDaRota(nome);
  if (location.hash === endereco) {
    aplicarRota(nome);
  } else if (substituir) {
    location.replace(endereco);
  } else {
    location.hash = endereco;
  }
}

function voltar() {
  if (typeof history.state?.anterior === 'string') {
    history.back();
  } else {
    navegar(rotaPai(rotaAtual) ?? 'inicio', { substituir: true });
  }
}

window.addEventListener('hashchange', () => {
  const nome = lerRota(location.hash);
  // "#" que não é do app (link de e-mail do Supabase): não mexe.
  if (nome === null) return;
  // Item novo no histórico: anota de onde se veio.
  if (history.state === null) history.replaceState({ anterior: rotaAtual }, '');
  aplicarRota(nome);
});

// No computador a lista das configurações não existe: o menu verde faz esse
// papel, então #/configuracoes abre direto a primeira área.
computador.addEventListener('change', () => {
  if (rotaAtual === 'configuracoes' && computador.matches) navegar('aparencia', { substituir: true });
});

function mostrarAjustes(area, { animar = true } = {}) {
  const trocouDeTela = telaAtual !== 'ajustes';
  for (const [nome, elemento] of Object.entries(areas)) elemento.hidden = nome !== area;
  for (const item of document.querySelectorAll('.menu-ajustes-item')) {
    if (item.dataset.area === area) item.setAttribute('aria-current', 'page');
    else item.removeAttribute('aria-current');
  }
  if (area === 'conta' && sessaoAtual) mostrarConta(sessaoAtual.user);
  else fecharEdicoesDaConta();

  mostrarTela('ajustes', { animar: animar && trocouDeTela });
  if (!trocouDeTela) {
    // Trocando de área no computador: a área nova começa do topo e entra com
    // o efeito, sem repetir a entrada da tela inteira.
    window.scrollTo(0, 0);
    if (animar) animarEntradaDaTela(areas[area]);
  }
  // O leitor de tela anuncia a página nova pelo título dela.
  focar(primeiroTituloVisivel(areas[area]));
}

async function aplicarRota(nome) {
  // Sem ninguém conectado (ou criando a senha nova), quem manda são as telas
  // de acesso. O endereço fica guardado e é aberto depois de entrar.
  if (!sessaoAtual || definindoNovaSenha) return;

  fecharTudoDaConta();
  rotaAtual = nome;

  if (nome === 'assinatura') {
    if (!formularioPedido) {
      navegar('inicio', { substituir: true });
      return;
    }
    formularioPedido = false;
    mostrarTela('formulario');
    return;
  }

  if (ROTAS_DE_AJUSTES.includes(nome)) {
    if (nome === 'configuracoes' && computador.matches) {
      navegar('aparencia', { substituir: true });
      return;
    }
    mostrarAjustes(nome);
    return;
  }

  fecharEdicoesDaConta();
  const voltandoDeOutraTela = telaAtual !== null && telaAtual !== 'inicio';
  mostrarTela('inicio');
  // Entrou direto numa página de conta e agora foi para o início: a lista
  // ainda não foi carregada.
  if (diaDaTela === null && !carregandoPrimeiraVez) {
    carregandoPrimeiraVez = true;
    await carregarInicio();
    carregandoPrimeiraVez = false;
    if (focoPerdido()) focar(primeiroTituloVisivel(telas.inicio));
    tocarEntrada();
  } else if (voltandoDeOutraTela) {
    // Voltando com a lista já carregada (do formulário, de Minha conta ou das
    // configurações): a tela entra como na primeira abertura, com os blocos
    // aparecendo em sequência e os textos se decifrando, em vez de surgir de
    // uma vez.
    tocarEntrada();
  }
}

let carregandoPrimeiraVez = false;

// Primeira tela depois de entrar (ou de abrir o app já conectado): a do
// endereço, se houver um; senão a inicial.
async function abrirRotaDaSessao() {
  const pedida = lerRota(location.hash);
  const nome = pedida === 'assinatura' || pedida === null ? 'inicio' : pedida;
  const final = nome === 'configuracoes' && computador.matches ? 'aparencia' : nome;
  history.replaceState({ anterior: null }, '', enderecoDaRota(final));
  rotaAtual = final;

  if (final === 'inicio') {
    mostrarInicio();
    return;
  }
  mostrarAjustes(final, { animar: false });
  await fecharAbertura();
  if (!telas.ajustes.hidden) animarEntradaDaTela(telas.ajustes);
}

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
const carteirinha = document.querySelector('#carteirinha');
// As letras ficam fora dos textos e de dentro da curva do cantinho do lápis,
// mas passam em volta dele (pedido do Pedro: nada de quadrado escondendo a
// animação). Com o cantinho fechado, para editar o nome, o canto fica livre.
const cantinhoDoLapis = carteirinha.querySelector('.cantinho');
animarManchas(carteirinha.querySelector('canvas'), [
  ...[...carteirinha.children].filter((filho) => filho.tagName !== 'CANVAS' && filho !== cantinhoDoLapis),
  zonaDaForma(cantinhoDoLapis.querySelector('.cantinho-area'), cantinhoDoLapis, {
    ativa: () => !carteirinha.classList.contains('cantinho-fechado'),
  }),
]);

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

  // A sessão mais nova, mesmo quando é a mesma pessoa (o nome pode ter mudado).
  sessaoAtual = sessao;
  atualizarMenuConta(sessao);

  const usuario = sessao?.user.id ?? null;
  if (usuario === usuarioNaTela) return;
  usuarioNaTela = usuario;

  if (!sessao) {
    definindoNovaSenha = false;
    assinaturaEmEdicao = null;
    fecharEdicoesDaConta();
    rotaAtual = null;
    // Ao sair, o endereço volta ao início: quem entrar depois começa pela
    // tela inicial, e não pela página em que a outra pessoa estava.
    if (evento === 'SIGNED_OUT') history.replaceState(null, '', location.pathname + location.search);
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
    abrirRotaDaSessao();
  }
});
