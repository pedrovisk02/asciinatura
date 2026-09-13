// Credenciais do projeto no Supabase e criação do cliente.
//
// A chave publicável (sb_publishable_...) foi feita para ficar visível no
// navegador. O que protege os dados é a regra de acesso (RLS) no banco,
// não o segredo desta chave. A chave secreta (sb_secret_...) nunca entra aqui.

// A biblioteca é carregada no index.html, com verificação de integridade,
// e fica disponível em window.supabase.
const { createClient } = window.supabase;

export const SUPABASE_URL = 'https://wqwldmcacnpsotnrecur.supabase.co';
export const SUPABASE_CHAVE_PUBLICA = 'sb_publishable_4yNC3QN6SDTSXb00YSxc4Q_prd-gGtr';

export const supabase = createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICA);
