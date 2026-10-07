-- Segundo paso, SÓLO agencia-beat-preview (tqxbwgirsytlplmxswyt).
-- Noticias propias independientes de Blogger. No publica ni ejecuta IA.
begin;
create table public.beat_manual_preview (
 id uuid primary key default gen_random_uuid(),
 sitio_id text not null default 'agenciabeat' check (sitio_id='agenciabeat'),
 titulo text not null check (length(trim(titulo)) between 1 and 1000),
 bajada text not null default '',
 contenido text not null default '',
 categoria text not null default 'informacion general',
 imagen_url text not null default '' check (imagen_url='' or imagen_url ~ '^https://'),
 imagen_tipo text not null default 'sin_imagen' check (imagen_tipo in ('sin_imagen','foto','ilustracion_ia')),
 fuentes jsonb not null default '[]'::jsonb check (jsonb_typeof(fuentes)='array'),
 estado text not null default 'borrador' check (estado in ('borrador','revision')),
 revision bigint not null default 1,
 deleted_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.beat_manual_preview enable row level security;
revoke all on public.beat_manual_preview from public,anon,authenticated;
grant select,insert,update on public.beat_manual_preview to service_role;
-- Sin DELETE ni política de acceso público. Publicación se implementará por separado.
commit;
