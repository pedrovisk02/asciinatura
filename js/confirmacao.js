// Janela de confirmação antes de apagar, no visual do app, no lugar da
// janelinha padrão do navegador.
//
// Usa o elemento <dialog>, que já resolve o que é difícil de fazer à mão:
// prende o foco dentro da janela, fecha com a tecla Esc e devolve o foco ao
// botão que abriu.

import { decifrarTextos } from './interacoes.js';

const dialogo = document.querySelector('#dialogo-apagar');

// Clicar no fundo escurecido, fora da janela, também fecha sem apagar.
dialogo.addEventListener('click', (evento) => {
  if (evento.target === dialogo) dialogo.close('voltar');
});

// O Esc também é tratado aqui, e não só pelo navegador: nos testes, um
// navegador embutido deixou a janela aberta ao apertar Esc.
dialogo.addEventListener('keydown', (evento) => {
  if (evento.key === 'Escape') {
    evento.preventDefault();
    dialogo.close('voltar');
  }
});

// Devolve o que a pessoa escolheu: "apagar", "cancelar" (marcar como
// cancelada, em vez de apagar) ou "voltar" (inclusive ao fechar com Esc).
export function confirmarApagar({ nome, podeCancelar }) {
  document.querySelector('#dialogo-apagar-nome').textContent = nome;
  document.querySelector('#dialogo-apagar-cancelar').hidden = !podeCancelar;
  dialogo.returnValue = '';

  return new Promise((resolver) => {
    dialogo.addEventListener('close', () => resolver(dialogo.returnValue || 'voltar'), { once: true });
    dialogo.showModal();
    decifrarTextos(dialogo);
  });
}
