-- CONTENCIÓN PROPUESTA. NO APLICADA. Requiere autorización del propietario.
-- Conserva SELECT/INSERT actuales. No activa RLS ni cambia filas/esquema.
-- Antes de aplicar: conservar export de grants actuales y verificar consumidores UPDATE/DELETE.
begin;
revoke update, delete, truncate on table public.noticias from public, anon, authenticated;
-- Abortará si el permiso persiste por pertenencia a otro rol.
do $$
begin
 if has_table_privilege('anon','public.noticias','UPDATE,DELETE,TRUNCATE') or
    has_table_privilege('authenticated','public.noticias','UPDATE,DELETE,TRUNCATE') then
  raise exception 'Permisos heredados persisten: no se aplicó contención';
 end if;
 if not has_table_privilege('anon','public.noticias','SELECT') or
    not has_table_privilege('anon','public.noticias','INSERT') then
  raise exception 'Lectura/ingesta no disponibles: abortando';
 end if;
end $$;
commit;
-- INSERT anónimo sigue habilitado: contención parcial, NO seguridad final.
