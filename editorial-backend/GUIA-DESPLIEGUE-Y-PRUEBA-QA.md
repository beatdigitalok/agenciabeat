# Puesta en marcha controlada — CMS QA Agencia Beat 2.0

**Estado:** procedimiento pendiente de ejecución real. No equivale a un despliegue ni a una prueba E2E.

## Aislamiento obligatorio
- Rama `agencia-beat-2.0`; no modificar `main`.
- Proyecto Supabase QA identificado previamente: `tqxbwgirsytlplmxswyt`. Confirmar su identidad y acceso antes de ejecutar SQL. **Prohibido ejecutar en producción `opnuuhnjdbczevvgtnbw`.**
- Worker nuevo `beat-editorial-preview`, sin rutas de producción ni cron. No sustituir `rbd-api`, Blogger ni el proxy de imágenes.
- Usar solamente credenciales del proyecto QA como secretos del Worker, nunca en GitHub ni en mensajes de chat.

## Preparación (operador con acceso a Cloudflare y Supabase)
1. Confirmar que el proyecto QA existe y está separado de producción. Registrar su URL, sin revelar claves.
2. Revisar `preview.sql`, `manual-preview.sql` y `manual-publish-preview.sql` antes de ejecutar **en ese orden** en SQL Editor del proyecto QA. Si las tablas ya existen, inspeccionar esquema y migraciones antes de repetir: estos scripts no son necesariamente idempotentes.
3. Preparar el Worker con `worker.mjs` y `core.mjs` del mismo commit; comprobar configuración de módulo/importación antes de desplegar. No confundirlo con `worker-cloudflare-preview.mjs` (automatización RSS), que es otro flujo.
4. Variables de entorno: `ENVIRONMENT=preview`, `PREVIEW_ORIGIN=https://agenciabeat-preview.pages.dev`, `PREVIEW_WRITES_ENABLED=false`, `SUPABASE_PREVIEW_URL` (QA), `BLOGGER_BLOG_ID` si se prueba sincronización.
5. Secrets del Worker: `EDITORIAL_ADMIN_TOKEN` (aleatorio, 32+ caracteres), `SUPABASE_PREVIEW_SERVICE_KEY` del QA y `BLOGGER_ACCESS_TOKEN` solo si se prueba lectura privada de Blogger. Nunca copiar secretos al frontend público.
6. Probar `/health`, preflight CORS desde origen autorizado, rechazo de token inválido, rechazo de escrituras con `PREVIEW_WRITES_ENABLED=false`. Confirmar que no se han tocado recursos de producción.

## Pruebas de escritura en QA (solo tras validar lo anterior)
1. Habilitar `PREVIEW_WRITES_ENABLED=true` **únicamente en el Worker QA**.
2. Desde `cms-qa.html` servido en origen autorizado, conectar URL raíz del Worker y token temporal. La página no debe quedar públicamente disponible con credenciales incrustadas.
3. Crear una noticia propia. Verificar en base QA: `estado=borrador`, `revision=1`, `deleted_at IS NULL`. No debe aparecer en `/api/public/manual`.
4. Editar título y contenido; verificar incremento de revisión.
5. Cambiar a `publicado` solo en QA y comprobar que aparece en `/api/public/manual`.
6. Enviar a papelera; verificar que desaparece de vista pública. Restaurar; verificar que reaparece si sigue publicada.
7. Repetir edición con revisión obsoleta; esperar HTTP 409 sin sobrescritura.
8. Desactivar escrituras y comprobar HTTP 403; cerrar sesión y retirar token de prueba del navegador.

## Criterios para aprobar
- Evidencia de respuesta HTTP, registro QA y consulta pública en cada paso.
- Ninguna noticia borrador o en papelera visible públicamente.
- Ningún efecto en Blogger, Supabase de producción, Worker existente ni dominio público.
- Si falla cualquier paso, detener; no migrar ni conectar Fábrica Federal.

## Estado verificado a 2026-11-15
- GitHub Actions ejecución 43735706221: success, sintaxis y pruebas automatizadas.
- **Sin evidencia confirmada** de despliegue del Worker editorial QA ni prueba end-to-end con Supabase QA.
