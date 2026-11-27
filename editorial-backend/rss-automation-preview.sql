-- SÓLO proyecto QA tqxbwgirsytlplmxswyt. Ejecutar después de rss-sources-preview.sql.
begin;
alter table public.beat_rss_sources_preview
 add column if not exists auto_enabled boolean not null default false,
 add column if not exists interval_minutes integer not null default 60 check (interval_minutes in (15,30,60,180,360,1440)),
 add column if not exists max_items integer not null default 1 check (max_items between 1 and 3),
 add column if not exists last_run_at timestamptz,
 add column if not exists last_result jsonb,
 add column if not exists lease_until timestamptz,
 add column if not exists lease_token uuid;
create or replace function public.beat_rss_preview_claim(p_id uuid default null,p_force boolean default false)
 returns setof public.beat_rss_sources_preview language plpgsql security definer set search_path=public as $$
declare picked uuid;
begin
 if p_force and p_id is null then return;end if;
 select id into picked from public.beat_rss_sources_preview
 where sitio_id='agenciabeat' and active
 and (lease_until is null or lease_until<now())
 and (p_id is null or id=p_id)
 and ((p_force and p_id is not null) or
 (auto_enabled and (last_run_at is null or last_run_at + make_interval(mins=>interval_minutes)<=now())))
 order by last_run_at asc nulls first,created_at asc
 limit 1 for update skip locked;
 if picked is null then return;end if;
 return query update public.beat_rss_sources_preview
 set lease_until=now()+interval '10 minutes',lease_token=gen_random_uuid(),last_run_at=now()
 where id=picked returning *;
end $$;
revoke all on function public.beat_rss_preview_claim(uuid,boolean) from public,anon,authenticated;
grant execute on function public.beat_rss_preview_claim(uuid,boolean) to service_role;
commit;
