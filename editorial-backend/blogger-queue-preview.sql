-- QA only: tqxbwgirsytlplmxswyt. No external requests.
begin;
create table public.beat_blogger_settings_preview (
 id boolean primary key default true check(id),
 mode text not null default 'manual' check(mode in ('manual','drafts','publish')),
 enabled boolean not null default false,
 daily_limit integer not null default 20 check(daily_limit between 1 and 100),
 interval_seconds integer not null default 900 check(interval_seconds between 60 and 86400),
 paused_until timestamptz
);
insert into public.beat_blogger_settings_preview(id) values(true);
create table public.beat_blogger_queue_preview (
 article_id uuid primary key references public.beat_manual_preview(id),
 state text not null default 'pending' check(state in ('pending','sending','draft','published','reconcile','cancelled')),
 post_id text unique,
 attempted_at timestamptz,
 created_at timestamptz not null default now(),
 last_error text
);
alter table public.beat_blogger_settings_preview enable row level security;
alter table public.beat_blogger_queue_preview enable row level security;
revoke all on public.beat_blogger_settings_preview,public.beat_blogger_queue_preview from public,anon,authenticated;
grant select,insert,update on public.beat_blogger_queue_preview to service_role;
grant select,update on public.beat_blogger_settings_preview to service_role;
create function public.beat_blogger_claim_preview() returns setof public.beat_blogger_queue_preview
language plpgsql security invoker set search_path=public as $$
declare cfg public.beat_blogger_settings_preview%rowtype;
begin
 select * into cfg from public.beat_blogger_settings_preview where id=true for update;
 if not found or not cfg.enabled or cfg.mode='manual' or cfg.paused_until>now() then return; end if;
 -- Uncertain requests must be reconciled, never automatically repeated.
 if exists(select 1 from public.beat_blogger_queue_preview where state in ('sending','reconcile')) then return; end if;
 if (select count(*) from public.beat_blogger_queue_preview where attempted_at>now()-interval '24 hours')>=cfg.daily_limit then return; end if;
 if exists(select 1 from public.beat_blogger_queue_preview where attempted_at>now()-make_interval(secs=>cfg.interval_seconds)) then return; end if;
 return query update public.beat_blogger_queue_preview q set state='sending',attempted_at=now()
 where q.article_id=(select p.article_id from public.beat_blogger_queue_preview p join public.beat_manual_preview a on a.id=p.article_id where p.state='pending' and a.deleted_at is null and a.estado='borrador' order by p.created_at,p.article_id limit 1 for update of p skip locked)
 returning q.*;
end; $$;
revoke all on function public.beat_blogger_claim_preview() from public,anon,authenticated;
grant execute on function public.beat_blogger_claim_preview() to service_role;
-- Atomic enqueue: RSS article and dispatch record share the same transaction.
create function public.beat_blogger_enqueue_rss_preview() returns trigger
language plpgsql security invoker set search_path=public as $
begin
 if new.estado='borrador' and new.deleted_at is null and new.fuentes->0->>'tipo'='rss'
 and exists(select 1 from public.beat_blogger_settings_preview where id=true and enabled and mode in ('drafts','publish')) then
 insert into public.beat_blogger_queue_preview(article_id) values(new.id) on conflict(article_id) do nothing;
 end if;
 return new;
end; $;
revoke all on function public.beat_blogger_enqueue_rss_preview() from public,anon,authenticated;
grant execute on function public.beat_blogger_enqueue_rss_preview() to service_role;
create trigger beat_blogger_enqueue_rss_preview after insert on public.beat_manual_preview
for each row execute function public.beat_blogger_enqueue_rss_preview();
commit;
