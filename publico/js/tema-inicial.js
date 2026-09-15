// Aplica o tema guardado no aparelho antes de a página aparecer, para a cor
// padrão não piscar. É um script comum, e não um módulo, porque módulos só
// rodam depois de a página ser desenhada; por isso a lista de paletas se
// repete aqui (testes/temas.test.js confere que ela é igual à do temas.js).

(function () {
  var PALETAS = ['poster-verde', 'luxo-dourado', 'indigo-salvia', 'jade-vermelho', 'terracota-pessego', 'cafe', 'ameixa', 'concreto-metal'];
  var MODOS = ['claro', 'escuro'];

  try {
    var tema = JSON.parse(localStorage.getItem('asciinatura:tema'));
    if (tema && PALETAS.indexOf(tema.paleta) !== -1 && MODOS.indexOf(tema.modo) !== -1) {
      document.documentElement.setAttribute('data-paleta', tema.paleta);
      document.documentElement.setAttribute('data-modo', tema.modo);
    }
  } catch (erro) {
    // Navegador que não deixa guardar nada, ou texto quebrado: fica o padrão.
  }
})();
