-- Teste das regras de acesso da tabela assinaturas
--
-- Simula duas pessoas (Ana e Bruno) e um visitante sem login, e confere o que
-- cada um consegue ver e fazer. Tudo o que o teste cria é apagado no final.
--
-- Como rodar: depois do 01-tabela-assinaturas.sql, colar no SQL Editor do
-- Supabase e clicar em Run. Pode rodar quantas vezes quiser.
-- Resultado esperado: uma linha por teste, com "passou" igual a true em todas.

drop table if exists pg_temp.resultado_teste;

create temp table resultado_teste (
  ordem   int,
  teste   text,
  passou  boolean,
  detalhe text
);

do $$
declare
  ana            uuid := gen_random_uuid();
  bruno          uuid := gen_random_uuid();
  papel_original text := current_user;
  id_da_ana      uuid;
  dono_correto   boolean;
  linhas         int;
begin
  -- Duas contas de teste, criadas direto no banco
  insert into auth.users (id, email)
  values (ana,   'teste-ana-'   || ana   || '@exemplo.invalid'),
         (bruno, 'teste-bruno-' || bruno || '@exemplo.invalid');

  -- Como "virar" alguém: dizer ao banco quem está logado (request.jwt.claims)
  -- e trocar o papel para o de usuário logado (authenticated). É exatamente o
  -- que acontece quando o app faz uma chamada com a sessão de alguém.
  -- Dentro de cada bloco, um erro desfaz a troca de papel automaticamente.

  -- 1 ------------------------------------------------------------------------
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    insert into public.assinaturas (nome, valor, ciclo, proxima_cobranca)
    values ('Netflix (teste)', 44.90, 'mensal', current_date + 10)
    returning id, user_id = ana into id_da_ana, dono_correto;

    perform set_config('role', papel_original, true);
    insert into resultado_teste values
      (1, 'Ana cria uma assinatura e vira a dona dela', dono_correto, 'dono preenchido pelo banco');
  exception when others then
    insert into resultado_teste values (1, 'Ana cria uma assinatura e vira a dona dela', false, sqlerrm);
  end;

  -- 2 ------------------------------------------------------------------------
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    select count(*) into linhas from public.assinaturas;

    perform set_config('role', papel_original, true);
    insert into resultado_teste values
      (2, 'Ana vê a própria assinatura', linhas = 1, linhas || ' linha(s) visível(is)');
  exception when others then
    insert into resultado_teste values (2, 'Ana vê a própria assinatura', false, sqlerrm);
  end;

  -- 3 ------------------------------------------------------------------------
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bruno, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    select count(*) into linhas from public.assinaturas;

    perform set_config('role', papel_original, true);
    insert into resultado_teste values
      (3, 'Bruno não vê a assinatura da Ana', linhas = 0, linhas || ' linha(s) visível(is)');
  exception when others then
    insert into resultado_teste values (3, 'Bruno não vê a assinatura da Ana', false, sqlerrm);
  end;

  -- 4 ------------------------------------------------------------------------
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bruno, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    update public.assinaturas set valor = 1 where id = id_da_ana;
    get diagnostics linhas = row_count;

    perform set_config('role', papel_original, true);
    insert into resultado_teste values
      (4, 'Bruno não consegue alterar a assinatura da Ana', linhas = 0, linhas || ' linha(s) alterada(s)');
  exception when others then
    insert into resultado_teste values (4, 'Bruno não consegue alterar a assinatura da Ana', true, 'recusado: ' || sqlerrm);
  end;

  -- 5 ------------------------------------------------------------------------
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bruno, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    delete from public.assinaturas where id = id_da_ana;
    get diagnostics linhas = row_count;

    perform set_config('role', papel_original, true);
    insert into resultado_teste values
      (5, 'Bruno não consegue apagar a assinatura da Ana', linhas = 0, linhas || ' linha(s) apagada(s)');
  exception when others then
    insert into resultado_teste values (5, 'Bruno não consegue apagar a assinatura da Ana', true, 'recusado: ' || sqlerrm);
  end;

  -- 6 ------------------------------------------------------------------------
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', bruno, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    insert into public.assinaturas (user_id, nome, valor, ciclo, proxima_cobranca)
    values (ana, 'Intrusa (teste)', 10, 'mensal', current_date);

    perform set_config('role', papel_original, true);
    insert into resultado_teste values (6, 'Bruno não consegue criar assinatura em nome da Ana', false, 'o banco aceitou');
  exception when others then
    insert into resultado_teste values (6, 'Bruno não consegue criar assinatura em nome da Ana', true, 'recusado: ' || sqlerrm);
  end;

  -- 7 ------------------------------------------------------------------------
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    update public.assinaturas set user_id = bruno where id = id_da_ana;

    perform set_config('role', papel_original, true);
    insert into resultado_teste values (7, 'Ana não consegue transferir a assinatura para o Bruno', false, 'o banco aceitou');
  exception when others then
    insert into resultado_teste values (7, 'Ana não consegue transferir a assinatura para o Bruno', true, 'recusado: ' || sqlerrm);
  end;

  -- 8 ------------------------------------------------------------------------
  begin
    perform set_config('request.jwt.claims', '', true);
    perform set_config('role', 'anon', true);

    select count(*) into linhas from public.assinaturas;

    perform set_config('role', papel_original, true);
    insert into resultado_teste values (8, 'Visitante sem login não acessa a tabela', false, 'o banco deixou ler ' || linhas || ' linha(s)');
  exception when others then
    insert into resultado_teste values (8, 'Visitante sem login não acessa a tabela', true, 'recusado: ' || sqlerrm);
  end;

  -- 9 ------------------------------------------------------------------------
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    insert into public.assinaturas (nome, valor, ciclo, proxima_cobranca)
    values ('Valor negativo (teste)', -10, 'mensal', current_date);

    perform set_config('role', papel_original, true);
    insert into resultado_teste values (9, 'Valor negativo é recusado', false, 'o banco aceitou');
  exception when others then
    insert into resultado_teste values (9, 'Valor negativo é recusado', true, 'recusado: ' || sqlerrm);
  end;

  -- 10 -----------------------------------------------------------------------
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    insert into public.assinaturas (nome, valor, ciclo, proxima_cobranca)
    values ('Ciclo inválido (teste)', 10, 'semanal', current_date);

    perform set_config('role', papel_original, true);
    insert into resultado_teste values (10, 'Ciclo fora da lista é recusado', false, 'o banco aceitou');
  exception when others then
    insert into resultado_teste values (10, 'Ciclo fora da lista é recusado', true, 'recusado: ' || sqlerrm);
  end;

  -- 11 (depende de 02-limite-de-data.sql) ------------------------------------
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', ana, 'role', 'authenticated')::text, true);
    perform set_config('role', 'authenticated', true);

    insert into public.assinaturas (nome, valor, ciclo, proxima_cobranca)
    values ('Ano 0027 (teste)', 10, 'anual', date '0027-03-01');

    perform set_config('role', papel_original, true);
    insert into resultado_teste values (11, 'Data com ano fora de 2000 a 2099 é recusada', false, 'o banco aceitou');
  exception when others then
    insert into resultado_teste values (11, 'Data com ano fora de 2000 a 2099 é recusada', true, 'recusado: ' || sqlerrm);
  end;

  -- Limpeza: apagar as contas de teste apaga as assinaturas delas junto -------
  perform set_config('role', papel_original, true);
  perform set_config('request.jwt.claims', '', true);
  delete from auth.users where id in (ana, bruno);

  select count(*) into linhas from public.assinaturas where user_id in (ana, bruno);
  insert into resultado_teste values
    (12, 'Nada do teste ficou no banco', linhas = 0, linhas || ' linha(s) restante(s)');
end
$$;

select ordem, teste, passou, detalhe
from resultado_teste
order by ordem;
