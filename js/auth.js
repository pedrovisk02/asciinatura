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

export async function criarConta(email, senha) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: { emailRedirectTo: ENDERECO_DO_APP },
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

// Traduz o erro técnico em uma frase para a pessoa. Usa o código do erro, e
// não o texto em inglês, porque o texto pode mudar entre versões.
export function mensagemDeErro(erro) {
  if (erro?.name === 'AuthRetryableFetchError') {
    return 'Sem conexão com o servidor. Confira a internet e tente de novo.';
  }

  switch (erro?.code) {
    // Mesma frase para senha errada e conta inexistente, de propósito:
    // assim ninguém descobre quais e-mails têm conta. Ver spec, "Tratamento de erro".
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.';
    case 'user_already_exists':
      return 'Não foi possível criar a conta com esse e-mail. Se você já tem conta, entre ou recupere a senha.';
    case 'email_not_confirmed':
      return 'Falta confirmar o e-mail. Procure a mensagem de confirmação na sua caixa de entrada.';
    case 'weak_password':
      return 'Senha fraca demais. Use pelo menos 8 caracteres.';
    case 'same_password':
      return 'A nova senha precisa ser diferente da anterior.';
    case 'otp_expired':
      return 'Esse link expirou ou já foi usado. Peça um novo.';
    case 'email_address_invalid':
    case 'validation_failed':
      return 'Confira o e-mail digitado.';
    case 'email_address_not_authorized':
      return 'Por enquanto o app só consegue enviar e-mails para endereços autorizados.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'Muitas tentativas em pouco tempo. Espere alguns minutos e tente de novo.';
    default:
      return 'Algo deu errado. Tente de novo em instantes.';
  }
}
