// Comportamento comum das janelas do app (<dialog>: apagar, gavetas da conta,
// do nome e das escolhas) e dos menus suspensos do computador.
//
// O <dialog> do navegador já prende o foco dentro da janela e devolve o foco
// ao botão que abriu. Aqui entram os dois jeitos extras de fechar e o
// fechamento com animação: janelas e menus saem com a animação de abrir ao
// contrário, e só depois somem de verdade.

import { reduzirMovimento } from './ascii.js';

// Tempo máximo de espera pelo fim da animação de fechar. Se o navegador não
// avisar que ela acabou, a janela fecha assim mesmo.
const ESPERA_MAXIMA = 450;

// Espera a animação de saída do elemento acabar (ou o tempo máximo passar).
function depoisDaAnimacao(elemento) {
  return new Promise((resolver) => {
    let terminou = false;
    const terminar = () => {
      if (terminou) return;
      terminou = true;
      elemento.removeEventListener('animationend', aoTerminarAnimacao);
      resolver();
    };
    // O fundo escurecido (::backdrop) também avisa quando anima; só vale o
    // aviso do próprio elemento.
    const aoTerminarAnimacao = (evento) => {
      if (evento.target === elemento && !evento.pseudoElement) terminar();
    };
    elemento.addEventListener('animationend', aoTerminarAnimacao);
    setTimeout(terminar, ESPERA_MAXIMA);
  });
}

// Janelas ----------------------------------------------------------------------

export function abrirDialogo(dialogo) {
  // Reaberta no meio da animação de fechar: só desiste de fechar.
  if (dialogo.open) {
    dialogo.classList.remove('fechando');
    return;
  }
  dialogo.showModal();
}

// "valor" vira o returnValue da janela (como em dialogo.close(valor)).
export async function fecharDialogo(dialogo, valor) {
  if (!dialogo.open) return;
  if (reduzirMovimento()) {
    dialogo.close(valor);
    return;
  }
  if (dialogo.classList.contains('fechando')) return;

  dialogo.classList.add('fechando');
  await depoisDaAnimacao(dialogo);
  // Se alguém reabriu a janela no meio do caminho, ela fica aberta.
  if (!dialogo.classList.contains('fechando')) return;
  dialogo.classList.remove('fechando');
  dialogo.close(valor);
}

export function prepararDialogo(dialogo) {
  // Clicar no fundo escurecido, fora da janela, fecha.
  dialogo.addEventListener('click', (evento) => {
    if (evento.target === dialogo) fecharDialogo(dialogo, 'voltar');
  });

  // O Esc também é tratado aqui, e não só pelo navegador: nos testes, um
  // navegador embutido deixou a janela aberta ao apertar Esc.
  dialogo.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      fecharDialogo(dialogo, 'voltar');
    }
  });
}

// Menus suspensos ----------------------------------------------------------------

// Aberto e sem estar no meio da animação de fechar.
export function menuAberto(menu) {
  return !menu.hidden && !menu.classList.contains('fechando');
}

export function mostrarMenu(menu) {
  menu.classList.remove('fechando');
  menu.hidden = false;
}

export async function esconderMenu(menu) {
  if (!menuAberto(menu)) return;
  if (reduzirMovimento()) {
    menu.hidden = true;
    return;
  }
  menu.classList.add('fechando');
  await depoisDaAnimacao(menu);
  if (!menu.classList.contains('fechando')) return;
  menu.classList.remove('fechando');
  menu.hidden = true;
}
