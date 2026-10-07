-- SÓLO agencia-beat-preview (tqxbwgirsytlplmxswyt).
begin;
create table if not exists public.beat_rss_sources_preview (
 id uuid primary key default gen_random_uuid(),
 sitio_id text not null default 'agenciabeat' check (sitio_id='agenciabeat'),
 nombre text not null check (length(trim(nombre)) between 1 and 150),
 url text not null check (url ~ '^https://'),
 categoria text not null default 'informacion general',
 provider text not null default 'groq' check (provider in ('groq','gemini')),
 active boolean not null default true,
 revision bigint not null default 1,
 last_checked_at timestamptz,
 last_error text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (sitio_id,url)
);
alter table public.beat_rss_sources_preview enable row level security;
revoke all on public.beat_rss_sources_preview from public,anon,authenticated;
grant select,insert,update on public.beat_rss_sources_preview to service_role;
create unique index if not exists beat_manual_rss_source_unique
 on public.beat_manual_preview (sitio_id, ((fuentes->0->>'url')))
 where fuentes->0->>'tipo'='rss';
commit;
