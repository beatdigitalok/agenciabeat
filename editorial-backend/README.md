# Backend editorial aislado — Agencia Beat 2.0

Preparado en agencia-beat-2.0. NO desplegado. NO ejecutar SQL en opnuuhnjdbczevvgtnbw. NO reemplazar rbd-api ni el Worker de imágenes. El editor actual sigue usando copias locales; no está conectado a este servicio.

## Qué resuelve

- Identidad estable sitio + blog + post, sin duplicar copias en una resincronización.
- Lee un post existente de Blogger con GET view=ADMIN; nunca crea, publica, edita o borra en Blogger.
- LIVE → publicado, DRAFT → borrador, SCHEDULED → programado. Sin status se rechaza. El modelo de visibilidad excluye borradores/programados/papelera; no se expone endpoint público todavía.
- Categorías normalizadas según etiquetas actuales de Blogger. Si hay cero o varias categorías reconocidas, marca requiere_revision_categoria; no decide por el orden de etiquetas ni por la base RSS.
- Correcciones manuales de Supabase guardadas en overrides prevalecen sobre la fuente; reset vuelve a Blogger. Cambiar categoría en Blogger actualiza source en el próximo sync, salvo override manual explícito.
- Papelera con deleted_at. Resincronizar conserva el borrado; restore es explícito. No hay borrado definitivo.
- Cambios con expected_revision; conflicto devuelve 409. Sync rechaza versiones anteriores/iguales por updated. El SQL serializa operaciones por identidad y registra acción/revisión en auditoría.

## Despliegue de prueba pendiente

1. Crear un proyecto Supabase independiente o usar uno existente dedicado a QA. El Worker bloquea el host de producción actual.
2. Revisar y ejecutar preview.sql sólo allí. Crea tablas nuevas, RLS y RPC SECURITY INVOKER exclusiva de service_role. Ningún grant para anon/authenticated. No altera noticias ni sus políticas.
3. Desplegar worker.mjs con core.mjs como módulos en un NUEVO Worker beat-editorial-preview. Sin rutas/dominos/cron de producción.
4. Variables: ENVIRONMENT=preview, PREVIEW_ORIGIN=https://agenciabeat-preview.pages.dev, BLOGGER_BLOG_ID (ID real), SUPABASE_PREVIEW_URL (proyecto separado), PREVIEW_WRITES_ENABLED=false inicialmente.
5. Secrets sólo del Worker: EDITORIAL_ADMIN_TOKEN (mínimo 32 caracteres aleatorios), BLOGGER_ACCESS_TOKEN (OAuth para lectura ADMIN), SUPABASE_PREVIEW_SERVICE_KEY (del proyecto QA). Nunca subir secretos a GitHub ni portal-config ni localStorage. OAuth refresh todavía no implementado; expiración produce error sin cambiar la copia.
6. /health no requiere token. Toda operación editorial requiere Authorization: Bearer <token>. /api/editorial/validate recibe {post: recurso Blogger} y siempre dry-run. /api/editorial/sync recibe {post_id:"..."}, lee Blogger y devuelve dry-run mientras writes=false. No recibir status del capturador como evidencia autoritativa para sync.
7. Tras verificar destinos de prueba, activar escrituras sólo allí. /api/editorial/list devuelve hasta100 copias privadas. /api/editorial/change recibe {action:"edit"|"trash"|"restore"|"reset",post_id,expected_revision,fields?}. Campos editables título/categoría/imagen/contenido; no puede publicar ni cambiar identidad.

El token administrativo es un puente de QA para llamadas privadas, no autenticación final de usuarios. No conectarlo a frontend público mediante un secreto compartido. Integración de panel requiere Supabase Auth/JWT y permisos por sitio antes de abandonar modo local. El contenido HTML se transporta como dato; la futura vista pública debe sanitizarlo antes de insertarlo en DOM.

## Capturador actual: integración posterior

El archivo del propietario hace POST a Blogger y POST a noticias independientemente del estado. No modificarlo todavía. La ruta propuesta evita repetir el POST de Blogger: capturador registra responseData.id y blog.id como pendiente de sincronización; backend consulta ese ID al publicar/corregir. El fallo de Supabase debe quedar pendiente y reintentarse sin crear otro post de Blogger.

No se implementó barrido automático de todo Blogger, paginación de reconciliación ni detección de borrado remoto. Un 404/401 en Blogger no borra ni restaura registros. Registros históricos de noticias sin ID requieren conciliación supervisada; no emparejar automáticamente sólo por título. Una futura transición del diario a copias publicadas requiere autorización de producción.

## Validación ejecutada

node --test editorial-backend/test.mjs: 13 casos pasaron. Node syntax check pasó. Fetch simulado: sync sólo hace GET Blogger, dry-run no toca Supabase; errores de auth/origen/entorno bloquean. SQL ejecutado con éxito en PostgreSQL embebido (PGlite) local. Ver sql-test.mjs: migración, sync idempotente, ediciones, revisión obsoleta409, papelera, conservación de tombstone/override, rechazo de fuente antigua, restauración, reset, auditoría, RLS y roles anon/authenticated sin permisos. No se conectó a Supabase. Concurrencia, RLS y transacciones deben probarse en el proyecto QA real antes de habilitar escrituras. No hay evidencia de despliegue ni prueba E2E persistente.

Fuentes verificadas: https://developers.google.com/blogger/docs/3.0/reference/posts y /posts/get (status sólo admin, view ADMIN); https://supabase.com/docs/guides/database/functions (privilegios de funciones y security invoker).

Para auditar la base actual sin cambios, ejecutar audit-current-readonly.sql y compartir únicamente sus resultados de metadatos. Permite diseñar la migración histórica sin adivinar columnas/RLS.

Reproducir prueba SQL: instalar @electric-sql/pglite en un directorio temporal y ejecutar sql-test.mjs con PGLITE_MODULE apuntando al módulo instalado, o instalarlo localmente y usar node editorial-backend/sql-test.mjs. Versión usada: 0.5.8. PGlite usa una instancia embebida; no demuestra carreras entre varias conexiones PostgreSQL ni el gateway PostgREST real.
