// Entrar, criar conta, sair, recuperar senha e acompanhar a sessão.
// Este arquivo conversa com o Supabase e não mexe na tela.

import { supabase } from './config.js';

// Para onde os links enviados por e-mail (confirmação e nova senha) levam de
// volta. Usa o endereço atual, então serve tanto para localhost quanto para o
// endereço publicado, desde que ele esteja liberado no painel do Supabase.
const ENDERECO_DO_APP = window.location.origin + window.location.pathname;

// Link de e-mail vencido ou já usado volta com o erro no endereço da página,
// depois do "#". Lido assim que o app abre.
const parametrosDoLink = new URLSearchParams(window.location.hash.slice(1));

export async function entrar(email, senha) {
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) throw error;
}

// O nome vai junto, nos dados do usuário do Supabase (user_metadata). Serve só
// para exibir ("Olá, Pedro!"): nenhuma regra de acesso depende dele, porque a
// própria pessoa pode mudar esse campo.
export async function criarConta(email, senha, nome) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { emailRedirectTo: ENDERECO_DO_APP, data: { nome } },
  });
  if (error) throw error;

  // Com a confirmação de e-mail ligada, a conta nasce sem sessão: a pessoa só
  // entra depois de clicar no link.
  return { precisaConfirmarEmail: !data.session };
}

export async function sair() {
  // "local" sai só deste aparelho. O padrão da biblioteca ("global")
  // desconectaria também o celular e o computador ao mesmo tempo.
  const { error } = await supabase.auth.signOut({ scope: 'local' });
  if (error) throw error;
}

export async function enviarLinkDeNovaSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: ENDERECO_DO_APP,
  });
  if (error) throw error;
}

// Nome guardado na conta, ou texto vazio para contas criadas antes do nome.
export function nomeDoUsuario(usuario) {
  const nome = usuario?.user_metadata?.nome;
  return typeof nome === 'string' ? nome.trim() : '';
}

export async function alterarNome(nome) {
  const { data, error } = await supabase.auth.updateUser({ data: { nome } });
  if (error) throw error;
  return data.user;
}

// Troca a senha de quem já está conectado. Antes, confere a senha atual
// entrando de novo com ela: sem isso, qualquer pessoa com o app aberto num
// aparelho esquecido poderia trocar a senha e tomar a conta.
export async function trocarSenha(email, senhaAtual, novaSenha) {
  const { error: erroDaConferencia } = await supabase.auth.signInWithPassword({ email, password: senhaAtual });
  if (erroDaConferencia) {
    if (erroDaConferencia.code === 'invalid_credentials') {
      throw Object.assign(new Error('Senha atual incorreta'), { code: 'senha_atual_incorreta' });
    }
    throw erroDaConferencia;
  }

  const { error } = await supabase.auth.updateUser({ password: novaSenha });
  if (error) throw error;
}

export async function definirNovaSenha(senha) {
  const { data, error } = await supabase.auth.updateUser({ password: senha });
  if (error) throw error;
  return data.user;
}

// Chama "aoMudar" sempre que a sessão muda: ao abrir o app (com ou sem sessão
// guardada), ao entrar, ao sair e ao chegar pelo link de nova senha.
export function acompanharSessao(aoMudar) {
  supabase.auth.onAuthStateChange((evento, sessao) => {
    // A biblioteca recomenda não fazer outras chamadas ao Supabase dentro
    // deste aviso, porque elas podem travar esperando umas pelas outras.
    // O setTimeout joga o trabalho para logo depois.
    setTimeout(() => aoMudar(evento, sessao), 0);
  });
}

// Devolve o erro do link de e-mail, se o app foi aberto por um link com
// problema, e limpa o endereço para o erro não reaparecer ao recarregar.
export function erroNoLinkRecebido() {
  const codigo = parametrosDoLink.get('error_code');
  if (!codigo) return null;

  history.replaceState(null, '', window.location.pathname);
  return { code: codigo };
}

// A tradução dos erros para frases fica em erros.js.
