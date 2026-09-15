// Aplica o tema e o tamanho do texto guardados no aparelho antes de a página
// aparecer, para a cor padrão não piscar e o texto não mudar de tamanho na
// frente da pessoa. É um script comum, e não um módulo, porque módulos só
// rodam depois de a página ser desenhada; por isso as listas se repetem aqui
// (testes/temas.test.js confere que elas são iguais às do temas.js).

(function () {
  var PALETAS = ['poster-verde', 'luxo-dourado', 'indigo-salvia', 'jade-vermelho', 'terracota-pessego', 'cafe', 'ameixa', 'concreto-metal'];
  var MODOS = ['claro', 'escuro'];
  var TAMANHOS = ['menor', 'normal', 'maior'];
  var raiz = document.documentElement;

  try {
    var tema = JSON.parse(localStorage.getItem('asciinatura:tema'));
    if (tema && PALETAS.indexOf(tema.paleta) !== -1 && MODOS.indexOf(tema.modo) !== -1) {
      raiz.setAttribute('data-paleta', tema.paleta);
      raiz.setAttribute('data-modo', tema.modo);
    }
  } catch (erro) {
    // Navegador que não deixa guardar nada, ou texto quebrado: fica o padrão.
  }

  try {
    var tamanho = localStorage.getItem('asciinatura:tamanho-do-texto');
    if (TAMANHOS.indexOf(tamanho) !== -1) raiz.setAttribute('data-tamanho-do-texto', tamanho);
  } catch (erro) {
    // Mesmo caso: fica o tamanho normal.
  }
})();
