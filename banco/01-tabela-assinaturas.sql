-- Passo 2: tabela de assinaturas e regras de acesso
--
-- Como rodar: colar no SQL Editor do Supabase e clicar em Run. Roda uma vez só.
--
-- A proteção tem duas travas, e as duas são necessárias:
--   1. GRANT decide quem pode tocar na tabela: só quem está logado.
--      Visitante sem login não tem acesso nenhum.
--   2. RLS decide quais linhas cada pessoa alcança: só as dela.


-- Tabela --------------------------------------------------------------------

create table public.assinaturas (
  id               uuid primary key default gen_random_uuid(),

  -- Dono da assinatura. O próprio banco preenche com o usuário logado, então
  -- o app não precisa (e não consegue) informar. Se a conta for apagada, as
  -- assinaturas dela vão junto.
  user_id          uuid not null default auth.uid()
                   references auth.users (id) on delete cascade,

  -- Os limites de tamanho impedem que alguém use a API para gravar textos
  -- enormes no banco.
  nome             text not null
                   check (char_length(trim(nome)) between 1 and 100),

  -- Valor cobrado por ciclo (não o mensal equivalente), em reais.
  valor            numeric(10, 2) not null check (valor > 0),

  ciclo            text not null
                   check (ciclo in ('mensal', 'trimestral', 'anual')),

  proxima_cobranca date not null,

  categoria        text check (char_length(categoria) <= 50),

  -- Falso significa cancelada: sai do total, mas o registro fica e pode ser
  -- reativado.
  ativa            boolean not null default true,

  criado_em        timestamptz not null default now()
);

-- Toda leitura filtra pelo dono; o índice mantém isso rápido.
create index assinaturas_user_id_idx on public.assinaturas (user_id);


-- Trava 1: quem pode tocar na tabela ----------------------------------------

-- Começa fechado para todo mundo...
revoke all on table public.assinaturas from anon, authenticated;

-- ...e libera só o necessário para quem está logado.
grant select, delete on table public.assinaturas to authenticated;

-- Criar e editar só nos campos do formulário. id, user_id e criado_em ficam
-- por conta do banco e não podem ser escritos pelo app: isso impede, por
-- exemplo, criar uma assinatura em nome de outra pessoa ou transferir uma.
grant insert (nome, valor, ciclo, proxima_cobranca, categoria, ativa)
  on table public.assinaturas to authenticated;

grant update (nome, valor, ciclo, proxima_cobranca, categoria, ativa)
  on table public.assinaturas to authenticated;


-- Trava 2: quais linhas cada pessoa alcança (RLS) ---------------------------

alter table public.assinaturas enable row level security;

-- "(select auth.uid())" entre parênteses faz o banco descobrir quem está
-- logado uma vez por consulta, em vez de uma vez por linha.

create policy "Ler as próprias assinaturas"
  on public.assinaturas for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Criar assinaturas só para si"
  on public.assinaturas for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- "using" filtra quais linhas podem ser alteradas; "with check" confere como
-- a linha fica depois da alteração. Sem o segundo, daria para mudar o dono.
create policy "Alterar as próprias assinaturas"
  on public.assinaturas for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Remover as próprias assinaturas"
  on public.assinaturas for delete
  to authenticated
  using ((select auth.uid()) = user_id);
