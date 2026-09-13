// Carrega o app. Se algo essencial não carregar (por exemplo, a biblioteca do
// Supabase, sem internet ou com o arquivo adulterado), mostra uma explicação
// em vez de deixar a tela parada em "Carregando..." para sempre.

try {
  await import('./app.js');
} catch (falha) {
  console.error(falha);

  // A abertura sai na hora, para a explicação logo abaixo aparecer.
  document.querySelector('#abertura')?.setAttribute('hidden', '');

  const telaCarregando = document.querySelector('#tela-carregando');
  telaCarregando.textContent =
    'Não foi possível abrir o app. Confira a conexão com a internet e tente de novo.';

  const botao = document.createElement('button');
  botao.type = 'button';
  // O estilo carrega mesmo quando o JavaScript do app falha.
  botao.className = 'botao botao-contorno';
  botao.textContent = 'Tentar de novo';
  botao.addEventListener('click', () => window.location.reload());
  telaCarregando.append(' ', botao);
}
