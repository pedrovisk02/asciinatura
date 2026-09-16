-- Bloco 1, parte 5: tabela das sugestões e problemas
--
-- Como rodar: colar no SQL Editor do Supabase e clicar em Run. Roda uma vez só.
--
-- Diferente da tabela de assinaturas, aqui ninguém lê pelo app: quem está
-- logado só consegue escrever. As mensagens são lidas no painel do Supabase
-- (Table Editor), que entra com a chave de administração e não passa pelas
-- regras abaixo.


-- Tabela --------------------------------------------------------------------

create table public.sugestoes (
  id         uuid primary key default gen_random_uuid(),

  -- Quem enviou. O próprio banco preenche com o usuário logado, então o app
  -- não precisa (e não consegue) informar. Conta apagada leva as mensagens
  -- dela junto.
  user_id    uuid not null default auth.uid()
             references auth.users (id) on delete cascade,

  -- O limite de tamanho impede que alguém use a API para gravar textos
  -- enormes no banco.
  mensagem   text not null
             check (char_length(trim(mensagem)) between 1 and 1000),

  -- Dados da tela que ajudam a entender o problema, montados pelo app:
  -- tamanho da janela, tamanho do texto e tema. Nada de valores ou de nomes
  -- de assinaturas.
  contexto   text check (char_length(contexto) <= 200),

  versao     text check (char_length(versao) <= 40),

  criado_em  timestamptz not null default now()
);

-- As mensagens são lidas da mais nova para a mais antiga.
create index sugestoes_criado_em_idx on public.sugestoes (criado_em desc);


-- Trava 1: quem pode tocar na tabela ----------------------------------------

-- Começa fechado para todo mundo...
revoke all on table public.sugestoes from anon, authenticated;

-- ...e libera só o envio, e só nos campos que o app escreve. Sem select,
-- update nem delete: nem quem enviou consegue reler, mudar ou apagar a
-- mensagem depois.
grant insert (mensagem, contexto, versao) on table public.sugestoes to authenticated;


-- Trava 2: quais linhas cada pessoa alcança (RLS) ---------------------------

alter table public.sugestoes enable row level security;

create policy "Enviar sugestão em nome próprio"
  on public.sugestoes for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Não existe política de leitura, de propósito: com a chave publicável, uma
-- consulta a esta tabela não devolve nada, nem para quem escreveu.
