-- Sólo proyecto Supabase NUEVO de prueba. NO ejecutar en la base actual.
begin;
create table public.beat_editorial_preview (
 sitio_id text not null,
 blogger_blog_id text not null,
 blogger_post_id text not null,
 source jsonb not null,
 overrides jsonb not null default '{}'::jsonb,
 deleted_at timestamptz,
 revision bigint not null default 1,
 changed_at timestamptz not null default now(),
 primary key(sitio_id,blogger_blog_id,blogger_post_id)
);
create table public.beat_editorial_preview_audit (
 id bigint generated always as identity primary key,
 sitio_id text not null, blogger_blog_id text not null, blogger_post_id text not null,
 action text not null, revision bigint not null, happened_at timestamptz not null default now()
);
alter table public.beat_editorial_preview enable row level security;
alter table public.beat_editorial_preview_audit enable row level security;
revoke all on public.beat_editorial_preview, public.beat_editorial_preview_audit from public,anon,authenticated;
grant select,insert,update on public.beat_editorial_preview to service_role;
grant select,insert on public.beat_editorial_preview_audit to service_role;
grant usage,select on sequence public.beat_editorial_preview_audit_id_seq to service_role;
create function public.beat_editorial_preview_change(p_sitio text,p_blog text,p_post text,p_action text,p_payload jsonb,p_revision bigint default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.beat_editorial_preview; result jsonb;
begin
 if p_sitio <> 'agenciabeat' or p_blog !~ '^[0-9]+$' or p_post !~ '^[0-9]+$' or p_action not in ('sync','edit','trash','restore','reset') then raise exception 'invalid input'; end if;
 -- Serializa inserción/sync/edición de una misma identidad incluso si aún no existe.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_sitio||':'||p_blog||':'||p_post,0));
 select * into r from public.beat_editorial_preview where sitio_id=p_sitio and blogger_blog_id=p_blog and blogger_post_id=p_post for update;
 if p_action='sync' then
  if p_payload->>'blogger_blog_id' is distinct from p_blog or p_payload->>'blogger_post_id' is distinct from p_post or p_payload->>'estado' not in ('publicado','borrador','programado') or p_payload->>'source_updated_at' is null then raise exception 'invalid source'; end if;
  if r.revision is not null and (p_payload->>'source_updated_at')::timestamptz <= (r.source->>'source_updated_at')::timestamptz then return jsonb_build_object('ok',true,'unchanged',true,'row',to_jsonb(r)); end if;
  if r.revision is null then
   insert into public.beat_editorial_preview(sitio_id,blogger_blog_id,blogger_post_id,source) values(p_sitio,p_blog,p_post,p_payload) returning * into r;
  else
   -- Conserva overrides y tombstone. Una reimportación no restaura una noticia borrada.
   update public.beat_editorial_preview set source=p_payload,revision=revision+1,changed_at=now() where sitio_id=p_sitio and blogger_blog_id=p_blog and blogger_post_id=p_post returning * into r;
  end if;
 else
  if r.revision is null then return jsonb_build_object('error','not_found'); end if;
  if p_revision is null or p_revision<>r.revision then return jsonb_build_object('error','conflict','revision',r.revision); end if;
  if p_action='edit' then
   if jsonb_typeof(p_payload)<>'object' or exists(select 1 from jsonb_each(p_payload) f where f.key not in ('titulo','categoria','imagen_url','contenido') or jsonb_typeof(f.value)<>'string') then raise exception 'invalid fields'; end if;
   r.overrides:=r.overrides||p_payload;
  elsif p_action='trash' then r.deleted_at:=now();
  elsif p_action='restore' then r.deleted_at:=null;
  elsif p_action='reset' then r.overrides:='{}'::jsonb;
  end if;
  update public.beat_editorial_preview set overrides=r.overrides,deleted_at=r.deleted_at,revision=revision+1,changed_at=now() where sitio_id=p_sitio and blogger_blog_id=p_blog and blogger_post_id=p_post returning * into r;
 end if;
 insert into public.beat_editorial_preview_audit(sitio_id,blogger_blog_id,blogger_post_id,action,revision) values(p_sitio,p_blog,p_post,p_action,r.revision);
 return jsonb_build_object('ok',true,'row',to_jsonb(r));
end $$;
revoke all on function public.beat_editorial_preview_change(text,text,text,text,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.beat_editorial_preview_change(text,text,text,text,jsonb,bigint) to service_role;
commit;
