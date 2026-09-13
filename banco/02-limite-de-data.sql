-- Passo 8: limite de datas também no banco
--
-- Como rodar: colar no SQL Editor do Supabase e clicar em Run. Roda uma vez só.
--
-- O formulário do app já só aceita datas entre 2000 e 2099. Esta regra repete
-- a trava no banco, para valer também para qualquer gravação feita fora do app
-- (direto pela API, por exemplo). Motivo: no Passo 6, uma data com ano "0027"
-- chegou a ser gravada e travou a tela inicial.
--
-- Se o Supabase recusar este comando, é porque já existe alguma assinatura com
-- data fora do limite: corrija-a no app (botão "Corrigir") e rode de novo.

alter table public.assinaturas
  add constraint assinaturas_proxima_cobranca_entre_2000_e_2099
  check (proxima_cobranca between date '2000-01-01' and date '2099-12-31');
