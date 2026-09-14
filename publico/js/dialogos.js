// Comportamento comum das janelas do app (<dialog>): a de apagar e a gaveta
// da conta.
//
// O <dialog> do navegador já prende o foco dentro da janela e devolve o foco
// ao botão que abriu. Aqui entram os dois jeitos extras de fechar.

export function prepararDialogo(dialogo) {
  // Clicar no fundo escurecido, fora da janela, fecha.
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
}
