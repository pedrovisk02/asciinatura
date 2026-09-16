// Janela de confirmação antes de apagar, no visual do app, no lugar da
// janelinha padrão do navegador. Os jeitos de fechar (Esc, clique fora) vêm
// do dialogos.js.

import { decifrarTextos } from './interacoes.js';
import { prepararDialogo, abrirDialogo, fecharDialogo } from './dialogos.js';

const dialogo = document.querySelector('#dialogo-apagar');
prepararDialogo(dialogo);

// Os botões da janela enviam o formulário com a escolha (value). Em vez de o
// navegador fechar a janela de uma vez, ela fecha com a animação.
dialogo.querySelector('form').addEventListener('submit', (evento) => {
  evento.preventDefault();
  fecharDialogo(dialogo, evento.submitter?.value ?? 'voltar');
});

// Devolve o que a pessoa escolheu: "apagar", "cancelar" (marcar como
// cancelada, em vez de apagar) ou "voltar" (inclusive ao fechar com Esc).
export function confirmarApagar({ nome, podeCancelar }) {
  document.querySelector('#dialogo-apagar-nome').textContent = nome;
  document.querySelector('#dialogo-apagar-cancelar').hidden = !podeCancelar;
  dialogo.returnValue = '';

  return new Promise((resolver) => {
    dialogo.addEventListener('close', () => resolver(dialogo.returnValue || 'voltar'), { once: true });
    abrirDialogo(dialogo);
    decifrarTextos(dialogo);
  });
}
