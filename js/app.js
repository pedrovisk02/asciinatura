// Ponto de entrada: monta a tela.
// Por enquanto (Passo 1) só confirma que o navegador alcança o Supabase.

// Importar de config.js também cria o cliente do Supabase. Se a biblioteca
// não tiver carregado (CDN fora do ar ou arquivo adulterado), o erro aparece
// no console já nesta linha.
import { SUPABASE_URL, SUPABASE_CHAVE_PUBLICA } from './config.js';

async function verificarConexao() {
  const status = document.querySelector('#status-conexao');

  try {
    // Pede as configurações públicas de login do projeto. Responde 200 se o
    // endereço e a chave estão certos, e 401 se a chave for recusada.
    const resposta = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_CHAVE_PUBLICA },
    });

    if (!resposta.ok) {
      throw new Error(`o Supabase respondeu com código ${resposta.status}`);
    }

    status.textContent = 'Conectado ao Supabase.';
    console.log('Conexão com o Supabase OK');
  } catch (erro) {
    status.textContent = 'Não foi possível conectar ao Supabase.';
    console.error('Falha na conexão com o Supabase:', erro);
  }
}

verificarConexao();
