-- ============================================================================
-- Infraestrutura de conteúdo público (SEO programático)
-- ============================================================================
-- JÁ APLICADO em produção (projeto nrizmanwdipuowpkmqqm) em 21/07/2026, em três
-- migrations: seo_pages · seo_pages_seguranca · seo_pages_grant_status.
-- Este arquivo é o estado final consolidado — serve de documentação e para
-- recriar o esquema do zero. Rodar de novo é seguro (é idempotente).
--
-- Uma linha = uma página pública indexável.
--
-- Decisões que valem explicar:
--  * O HTML fica no banco, não no repositório. São milhares de páginas; versionar
--    isso no git tornaria o repo inutilizável e o deploy lento.
--  * `html_previa` é gravado na geração, não calculado no build. Assim o corte é
--    determinístico: a página que o Google indexou hoje é a mesma amanhã.
--  * `status` controla o ritmo de publicação. Despejar 2.000 páginas de uma vez
--    dispara filtro de qualidade do Google; publicamos em fatias diárias.
-- ============================================================================

create table if not exists public.seo_pages (
  id           uuid primary key default gen_random_uuid(),

  -- Identidade da página
  slug         text not null,
  tipo         text not null check (tipo in ('estudo', 'tema', 'sermao')),

  -- O que originou a página (permite regerar e auditar)
  termo        text not null,               -- a busca real que a página atende
  modo_id      text not null,               -- MODOS da edge function `gerar`
  publico_id   text not null,               -- PUBLICOS da edge function `gerar`
  referencia   text not null,               -- o que foi pedido ao modelo

  -- Conteúdo
  titulo            text not null,
  meta_description  text not null,
  html_previa       text not null,          -- aberto ao público e ao Google
  html_completo     text not null,          -- atrás do cadastro
  palavras_previa   integer not null default 0,
  palavras_total    integer not null default 0,
  meta              jsonb not null default '{}'::jsonb,   -- fontes, profundidade, tempo

  -- Grafo de links internos (slugs relacionados) — é o que faz o Google
  -- engolir milhares de páginas em vez de tratá-las como ilhas órfãs.
  relacionados text[] not null default '{}',

  -- Publicação
  status       text not null default 'rascunho'
               check (status in ('rascunho', 'publicado', 'arquivado')),
  publicado_em timestamptz,

  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),

  constraint seo_pages_slug_tipo_unico unique (tipo, slug)
);

create index if not exists seo_pages_status_idx    on public.seo_pages (status, publicado_em desc);
create index if not exists seo_pages_tipo_slug_idx on public.seo_pages (tipo, slug);
create index if not exists seo_pages_termo_idx     on public.seo_pages (termo);

-- atualizado_em automático. SECURITY INVOKER de propósito: é gatilho, não RPC.
create or replace function public.seo_pages_touch()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

revoke all on function public.seo_pages_touch() from public, anon, authenticated;

drop trigger if exists seo_pages_touch_trg on public.seo_pages;
create trigger seo_pages_touch_trg
  before update on public.seo_pages
  for each row execute function public.seo_pages_touch();

-- ---------------------------------------------------------------------------
-- Segurança: duas camadas, porque uma só não resolve
-- ---------------------------------------------------------------------------
--  RLS  filtra LINHAS  → o público só enxerga o que está publicado.
--  GRANT filtra COLUNAS → `html_completo` (o material pago) nunca sai da service_role.
--
-- A primeira versão usava uma view SECURITY DEFINER para esconder a coluna. O
-- linter do Supabase reprovou, e com razão: view definer contorna a RLS de quem
-- consulta. RLS + grant por coluna é o caminho idiomático e passa limpo.
alter table public.seo_pages enable row level security;

drop policy if exists "leitura publica de paginas publicadas" on public.seo_pages;
create policy "leitura publica de paginas publicadas"
  on public.seo_pages
  for select
  to anon, authenticated
  using (status = 'publicado');

revoke all on public.seo_pages from anon, authenticated;

-- `status` entra na lista porque a view filtra por ele e, com privilégio por
-- coluna, o invocador precisa poder ler TODA coluna citada na consulta —
-- inclusive a do WHERE. Não vaza nada: a RLS já esconde as linhas não publicadas,
-- então a única coisa visível nessa coluna é o texto 'publicado'.
grant select (
  slug, tipo, titulo, meta_description, html_previa,
  palavras_previa, palavras_total, meta, relacionados, publicado_em, status
) on public.seo_pages to anon, authenticated;

drop view if exists public.seo_pages_publicas;
create view public.seo_pages_publicas
with (security_invoker = true) as
  select slug, tipo, titulo, meta_description, html_previa,
         palavras_previa, palavras_total, meta, relacionados, publicado_em
  from public.seo_pages
  where status = 'publicado';

grant select on public.seo_pages_publicas to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Publicação em fatias: promove N rascunhos por vez, os mais antigos primeiro.
-- Uso (com a service_role): select * from publicar_lote(40);
-- ---------------------------------------------------------------------------
create or replace function public.publicar_lote(p_quantidade integer default 40)
returns table (slug text, tipo text)
language sql security definer set search_path = public as $$
  with alvo as (
    select id from public.seo_pages
    where status = 'rascunho'
    order by criado_em asc
    limit greatest(p_quantidade, 0)
  )
  update public.seo_pages s
     set status = 'publicado', publicado_em = now()
    from alvo
   where s.id = alvo.id
  returning s.slug, s.tipo;
$$;

-- ATENÇÃO: o `revoke ... from anon, authenticated` sozinho NÃO basta. No Postgres
-- o EXECUTE é concedido a PUBLIC por padrão, e anon herda de PUBLIC — sem o
-- `from public` abaixo, qualquer visitante podia publicar todos os rascunhos
-- chamando /rest/v1/rpc/publicar_lote.
revoke all on function public.publicar_lote(integer) from public, anon, authenticated;
