# Auditoría inicial del preview

Fecha: 2026-10-06 UTC.

- Preview: https://agenciabeat-preview.pages.dev/
- agenciabeat.com continúa en Blogger (confirmado por el propietario).
- rbd-api.beatdigitalok-bac.workers.dev continúa en Cloudflare Workers. No se modificó.
- No se modificó main.
- Home responde HTTP 200 y carga noticias desde Supabase. El paginador muestra 141 páginas.
- Centro Multimedia carga las 60 noticias previstas por obtenerNoticiasMultimedia.
- Noticia 1407: imagen de media.c5n.com carga con crossOrigin=anonymous; estado imagen OK en 1080x1350 (5 líneas) y 1080x1920 (6 líneas).
- Caso sin imagen: se genera fondo y texto 1080x1920. El mensaje mezcla ausencia de imagen con error CORS: pendiente de mejorar.
- Descarga PNG: no confirmada. La espera de download agotó el tiempo del navegador de prueba. No es prueba de fallo del producto ni de éxito de exportación.
- Políticas RLS de Supabase y QA móvil: pendientes; la lectura pública funcional no demuestra aislamiento de permisos.

## Proxy preparado, NO desplegado

worker.image-proxy.mjs es un Worker independiente y contiene únicamente /health y /api/image-proxy. No reemplazar el Worker rbd-api con este archivo.

Crear un Worker separado llamado agencia-beat-image-preview, sin dominios personalizados, sin rutas, sin cron ni bindings de producción. Copiar worker.image-proxy.mjs como módulo. No necesita secretos.

Variables opcionales:
- ALLOWED_ORIGINS: https://agenciabeat-preview.pages.dev
- IMAGE_ALLOWED_HOSTS: media.c5n.com (lista de hosts exactos, separados por coma; ampliar solamente con fuentes de imágenes verificadas).

Controles: HTTPS, hosts exactos, sin credenciales en URL, redirecciones manuales validadas, máximo 3 saltos, tipos raster, máximo 8 MiB y timeout de 10 segundos. No transmite cookies o Authorization del cliente al origen. CORS para el preview autorizado; CORS no sustituye autenticación ni un límite de tráfico.

Validación local con fetch simulado: salud; rechazo de HTTP/IP local; rechazo de host externo; rechazo de Origin externo; imagen aceptada con CORS; redirección a IP bloqueada; HTML rechazado; tamaño declarado excesivo rechazado. El comprobador sintáctico de Node pasó.

Cuando el Worker independiente esté desplegado y validado, configurar apiBase del frontend de prueba con su URL. Actualmente apiBase permanece vacío. La integración con rbd-api y cualquier migración del dominio requieren autorización expresa del propietario.
