-- Sólo lectura. Puede ejecutarse sobre proyecto actual para devolver metadatos.
-- No extrae contenido de noticias, claves ni datos personales.
begin transaction read only;
select table_schema,table_name,column_name,data_type,is_nullable,column_default
from information_schema.columns
where table_schema='public' and table_name in ('noticias','config')
order by table_name,ordinal_position;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check
from pg_catalog.pg_policies where schemaname='public' and tablename in ('noticias','config');
select n.nspname as schema,c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as rls_forced
from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname in ('noticias','config');
select grantee,table_name,privilege_type from information_schema.role_table_grants
where table_schema='public' and table_name in ('noticias','config') and grantee in ('anon','authenticated','service_role')
order by table_name,grantee,privilege_type;
select tablename,indexname,indexdef from pg_catalog.pg_indexes
where schemaname='public' and tablename='noticias';
commit;
