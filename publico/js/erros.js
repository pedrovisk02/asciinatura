// Traduz erros técnicos (do login, do banco ou da internet) em frases para a
// pessoa. Usa o código do erro, e não o texto em inglês, porque o texto pode
// mudar entre versões da biblioteca.

// Sem internet, ou servidor fora do alcance.
export function ehFalhaDeConexao(erro) {
  // Se o próprio navegador sabe que está desconectado, não precisa adivinhar.
  if (globalThis.navigator?.onLine === false) return true;

  // No login, a biblioteca usa um tipo de erro próprio para isso.
  if (erro?.name === 'AuthRetryableFetchError') return true;

  // No banco, a biblioteca devolve um erro sem código cuja mensagem começa
  // com "TypeError" (a falha do fetch do navegador).
  if (erro?.code === '' && /^TypeError\b/.test(erro?.message ?? '')) return true;

  // A falha do fetch, se chegar crua.
  return erro instanceof TypeError;
}

export const MENSAGEM_SEM_CONEXAO = 'Sem conexão com a internet. Confira a rede e tente de novo.';

export function mensagemDeErro(erro) {
  if (ehFalhaDeConexao(erro)) return MENSAGEM_SEM_CONEXAO;

  switch (erro?.code) {
    // Login ---------------------------------------------------------------

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

    // Banco ----------------------------------------------------------------

    // Alteração ou exclusão que não encontrou a linha.
    case 'PGRST116':
      return 'Essa assinatura não foi encontrada. Ela pode ter sido apagada em outro aparelho.';
    // Sessão vencida ou inválida.
    case 'PGRST301':
    case 'PGRST303':
      return 'Sua sessão expirou. Saia e entre de novo.';
    // Regra da tabela recusou o dado (valor não positivo, data fora do limite...).
    // O formulário confere antes, então isso só aparece se algo escapar.
    case '23514':
      return 'Algum dado não foi aceito. Confira os campos e tente de novo.';
    // Número grande demais para a coluna.
    case '22003':
      return 'Valor alto demais.';

    default:
      return 'Algo deu errado. Tente de novo em instantes.';
  }
}
