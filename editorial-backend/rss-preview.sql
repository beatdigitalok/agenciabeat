-- Ejecutar SÓLO en agencia-beat-preview (tqxbwgirsytlplmxswyt).
-- No cambia producción, permisos ni notas existentes.
begin;
create unique index if not exists beat_manual_rss_source_unique
 on public.beat_manual_preview (sitio_id, ((fuentes->0->>'url')))
 where fuentes->0->>'tipo'='rss';
commit;
