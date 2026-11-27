-- Ejecutar SÓLO en agencia-beat-preview, tqxbwgirsytlplmxswyt.
-- Permite publicación únicamente en el sitio de prueba mediante el Worker.
begin;
alter table public.beat_manual_preview drop constraint beat_manual_preview_estado_check;
alter table public.beat_manual_preview add constraint beat_manual_preview_estado_check check (estado in ('borrador','revision','publicado'));
-- Se mantienen RLS y permisos privados; no se concede lectura directa a anon.
commit;
