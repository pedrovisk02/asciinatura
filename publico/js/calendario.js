// Calendário do app para escolher a data da próxima cobrança, no lugar do
// calendário do navegador, que não dá para deixar no visual do Asciinatura.
//
// Segue o padrão de acessibilidade de seletor de data: o botão abre o
// calendário; as setas andam pelos dias; Page Up e Page Down trocam de mês;
// Home e End vão ao começo e ao fim da semana; Enter escolhe; Esc fecha.
//
// A data escolhida vai para um campo escondido no formato AAAA-MM-DD, o mesmo
// que o campo de data do navegador usava, então a validação e o envio ao
// banco continuam iguais.

import { dataDeHoje } from './calculos.js';
import { deslizarAbertura } from './deslizar.js';

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAS_DA_SEMANA = [['D', 'domingo'], ['S', 'segunda-feira'], ['T', 'terça-feira'], ['Q', 'quarta-feira'], ['Q', 'quinta-feira'], ['S', 'sexta-feira'], ['S', 'sábado']];

// Os mesmos limites do banco (banco/02-limite-de-data.sql).
const ANO_MINIMO = 2000;
const ANO_MAXIMO = 2099;

const doisDigitos = (numero) => String(numero).padStart(2, '0');

// Data do JavaScript montada pelas partes, sem ler texto: evita o erro de fuso
// horário explicado no calculos.js. setFullYear, e não o construtor, porque o
// construtor transforma anos como 27 em 1927.
function criarData(ano, mes, dia) {
  const data = new Date(2000, 0, 1);
  data.setFullYear(ano, mes, dia);
  return data;
}

function deTexto(texto) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto ?? '');
  return partes ? criarData(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])) : null;
}

function paraTexto(data) {
  return `${String(data.getFullYear()).padStart(4, '0')}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

function mesmoDia(a, b) {
  return a && b && paraTexto(a) === paraTexto(b);
}

function dentroDoLimite(data) {
  return data.getFullYear() >= ANO_MINIMO && data.getFullYear() <= ANO_MAXIMO;
}

function somarDias(data, dias) {
  return criarData(data.getFullYear(), data.getMonth(), data.getDate() + dias);
}

// Troca de mês mantendo o dia; se ele não existir no mês novo (31 de
// setembro), usa o último dia desse mês.
function somarMeses(data, meses) {
  const ultimoDia = criarData(data.getFullYear(), data.getMonth() + meses + 1, 0).getDate();
  return criarData(data.getFullYear(), data.getMonth() + meses, Math.min(data.getDate(), ultimoDia));
}

function criarElemento(tag, atributos = {}, ...conteudo) {
  const elemento = document.createElement(tag);
  for (const [nome, valor] of Object.entries(atributos)) {
    if (nome === 'className') elemento.className = valor;
    else elemento.setAttribute(nome, valor);
  }
  elemento.append(...conteudo);
  return elemento;
}

const ICONE_ESQUERDA = '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6"/></svg>';
const ICONE_DIREITA = '<svg class="icone" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>';

export function criarCalendario({ gatilho, textoDoGatilho, entrada, painel }) {
  let aberto = false;
  let mesVisivel = null; // primeiro dia do mês que aparece
  let diaEmFoco = null;  // dia que as setas movem

  // Estrutura fixa: só a grade de dias e o título mudam ao trocar de mês.
  // Assim os botões de mês anterior e próximo não perdem o foco ao clicar.
  const titulo = criarElemento('p', { className: 'calendario-mes', id: 'calendario-titulo', 'aria-live': 'polite' });
  const botaoAnterior = criarElemento('button', { type: 'button', className: 'calendario-nav', 'aria-label': 'Mês anterior' });
  const botaoProximo = criarElemento('button', { type: 'button', className: 'calendario-nav', 'aria-label': 'Próximo mês' });
  // Ícones escritos à mão: são SVG fixos do próprio app, sem texto de fora.
  botaoAnterior.innerHTML = ICONE_ESQUERDA;
  botaoProximo.innerHTML = ICONE_DIREITA;

  const cabecalho = criarElemento('tr', {}, ...DIAS_DA_SEMANA.map(([letra, nome]) =>
    criarElemento('th', { scope: 'col', abbr: nome }, letra)));
  const corpo = criarElemento('tbody');
  const grade = criarElemento('table', { className: 'calendario-grade', role: 'grid', 'aria-labelledby': 'calendario-titulo' },
    criarElemento('thead', {}, cabecalho), corpo);

  const botaoLimpar = criarElemento('button', { type: 'button', className: 'botao-mini' }, 'Limpar');
  const botaoHoje = criarElemento('button', { type: 'button', className: 'botao-mini botao-mini-cheio' }, 'Hoje');

  painel.append(
    criarElemento('div', { className: 'calendario-topo' }, botaoAnterior, titulo, botaoProximo),
    grade,
    criarElemento('div', { className: 'calendario-rodape' }, botaoLimpar, botaoHoje),
  );

  function mostrarValor() {
    const data = entrada.value;
    gatilho.classList.toggle('sem-data', !data);
    if (!data) {
      textoDoGatilho.textContent = 'Escolha a data';
      return;
    }
    // Mostra o que está gravado, mesmo uma data estranha (ano "0027"), para a
    // pessoa ver o que precisa corrigir.
    const [ano, mes, dia] = data.split('-');
    textoDoGatilho.textContent = `${dia}/${mes}/${ano}`;
  }

  function desenhar() {
    const hoje = deTexto(dataDeHoje());
    const escolhida = deTexto(entrada.value);
    const ano = mesVisivel.getFullYear();
    const mes = mesVisivel.getMonth();

    titulo.textContent = `${MESES[mes].charAt(0).toUpperCase()}${MESES[mes].slice(1)} ${ano}`;
    botaoAnterior.disabled = !dentroDoLimite(somarMeses(mesVisivel, -1));
    botaoProximo.disabled = !dentroDoLimite(somarMeses(mesVisivel, 1));

    // Semanas começando no domingo, como nos calendários brasileiros. Os dias
    // de outros meses ficam em branco, para não confundir.
    const linhas = [];
    let linha = criarElemento('tr');
    for (let vazio = 0; vazio < mesVisivel.getDay(); vazio++) linha.append(criarElemento('td'));

    const diasNoMes = criarData(ano, mes + 1, 0).getDate();
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const data = criarData(ano, mes, dia);
      const celula = criarElemento('td', { role: 'gridcell', 'aria-selected': String(mesmoDia(data, escolhida)) });
      const botao = criarElemento('button', {
        type: 'button',
        className: 'calendario-dia',
        tabindex: mesmoDia(data, diaEmFoco) ? '0' : '-1',
        'aria-label': `${dia} de ${MESES[mes]} de ${ano}`,
        'data-data': paraTexto(data),
      }, String(dia));
      if (mesmoDia(data, hoje)) botao.setAttribute('aria-current', 'date');
      celula.append(botao);
      linha.append(celula);

      if (linha.children.length === 7) {
        linhas.push(linha);
        linha = criarElemento('tr');
      }
    }
    if (linha.children.length > 0) linhas.push(linha);
    corpo.replaceChildren(...linhas);
  }

  function focarDia() {
    corpo.querySelector(`[data-data="${paraTexto(diaEmFoco)}"]`)?.focus();
  }

  function irPara(data) {
    if (!dentroDoLimite(data)) return;
    diaEmFoco = data;
    if (data.getMonth() !== mesVisivel.getMonth() || data.getFullYear() !== mesVisivel.getFullYear()) {
      mesVisivel = criarData(data.getFullYear(), data.getMonth(), 1);
    }
    desenhar();
    focarDia();
  }

  function abrir() {
    const escolhida = deTexto(entrada.value);
    diaEmFoco = escolhida && dentroDoLimite(escolhida) ? escolhida : deTexto(dataDeHoje());
    mesVisivel = criarData(diaEmFoco.getFullYear(), diaEmFoco.getMonth(), 1);
    aberto = true;
    gatilho.setAttribute('aria-expanded', 'true');
    desenhar();
    // Desliza para baixo ao abrir, e os campos de baixo descem junto.
    deslizarAbertura(painel, true);
    focarDia();
  }

  function fechar({ devolverFoco = true } = {}) {
    if (!aberto) return;
    aberto = false;
    deslizarAbertura(painel, false);
    gatilho.setAttribute('aria-expanded', 'false');
    if (devolverFoco) gatilho.focus();
  }

  function mudarValor(valor) {
    entrada.value = valor;
    mostrarValor();
    // Avisa o formulário, que apaga a mensagem de erro do campo.
    entrada.dispatchEvent(new Event('input', { bubbles: true }));
  }

  gatilho.addEventListener('click', () => (aberto ? fechar() : abrir()));

  botaoAnterior.addEventListener('click', () => {
    diaEmFoco = somarMeses(diaEmFoco, -1);
    mesVisivel = somarMeses(mesVisivel, -1);
    desenhar();
  });

  botaoProximo.addEventListener('click', () => {
    diaEmFoco = somarMeses(diaEmFoco, 1);
    mesVisivel = somarMeses(mesVisivel, 1);
    desenhar();
  });

  corpo.addEventListener('click', (evento) => {
    const botao = evento.target.closest('.calendario-dia');
    if (!botao) return;
    mudarValor(botao.dataset.data);
    fechar();
  });

  botaoLimpar.addEventListener('click', () => {
    mudarValor('');
    fechar();
  });

  botaoHoje.addEventListener('click', () => {
    mudarValor(dataDeHoje());
    fechar();
  });

  grade.addEventListener('keydown', (evento) => {
    const botao = evento.target.closest('.calendario-dia');
    if (!botao) return;
    // As setas sempre partem do dia que está com o foco, mesmo que ele tenha
    // chegado lá por outro caminho.
    diaEmFoco = deTexto(botao.dataset.data);

    // Enter e Espaço escolhem o dia. O navegador já faria isso sozinho num
    // botão, mas tratar aqui deixa garantido em qualquer navegador.
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      mudarValor(botao.dataset.data);
      fechar();
      return;
    }

    const passos = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let nova = null;

    if (evento.key in passos) nova = somarDias(diaEmFoco, passos[evento.key]);
    else if (evento.key === 'Home') nova = somarDias(diaEmFoco, -diaEmFoco.getDay());
    else if (evento.key === 'End') nova = somarDias(diaEmFoco, 6 - diaEmFoco.getDay());
    else if (evento.key === 'PageUp') nova = somarMeses(diaEmFoco, evento.shiftKey ? -12 : -1);
    else if (evento.key === 'PageDown') nova = somarMeses(diaEmFoco, evento.shiftKey ? 12 : 1);
    else return;

    evento.preventDefault();
    irPara(nova);
  });

  painel.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      fechar();
    }
  });

  // Clicar fora do calendário fecha sem mudar nada.
  document.addEventListener('pointerdown', (evento) => {
    if (aberto && !painel.contains(evento.target) && !gatilho.contains(evento.target)) {
      fechar({ devolverFoco: false });
    }
  });

  // Sair do calendário com o Tab (para o campo de categoria, por exemplo) também
  // fecha sem mudar nada. Só vale quando se sabe para onde o foco foi: ao trocar
  // de mês, o dia com o foco é redesenhado e o foco some sem destino, e isso
  // não deve fechar o calendário.
  function aoSairDoCalendario(evento) {
    const destino = evento.relatedTarget;
    if (aberto && destino && !painel.contains(destino) && destino !== gatilho) {
      fechar({ devolverFoco: false });
    }
  }
  painel.addEventListener('focusout', aoSairDoCalendario);
  gatilho.addEventListener('focusout', aoSairDoCalendario);

  mostrarValor();

  return {
    // Coloca uma data (AAAA-MM-DD) ou apaga (texto vazio), como ao abrir o
    // formulário para uma assinatura nova ou para editar uma existente.
    definir(valor) {
      entrada.value = valor ?? '';
      mostrarValor();
      fechar({ devolverFoco: false });
    },
  };
}
