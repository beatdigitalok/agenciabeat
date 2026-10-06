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
- Exportación PNG con imagen cargada directamente a través del Worker: canvas.toBlob produjo 1080x1350 (2097 KB) y 1080x1920 (2723 KB), sin SecurityError/CORS. Estado visible: PNG generado y descarga solicitada. El evento download del navegador remoto agotó su tiempo de espera, pero el propietario posteriormente envió ambos PNG de la noticia 1409; recepción efectiva confirmada.
- Exportación actualizada para usar Blob, enlace temporal conectado al DOM y revocación de URL a los 60 segundos. Estado explícito de éxito/error. Guard de generación evita que cargas antiguas sobrescriban el formato más reciente; descarga deshabilitada mientras se genera. Node --check multimedia.js pasó; despliegue Pages verificado por los nuevos estados de UI.
- Políticas RLS de Supabase y QA móvil: pendientes; la lectura pública funcional no demuestra aislamiento de permisos.

## Proxy independiente desplegado y conectado

worker.image-proxy.mjs es un Worker independiente y contiene únicamente /health y /api/image-proxy. No reemplazar el Worker rbd-api con este archivo.

El propietario creó y desplegó el Worker separado agencia-beat-image-preview. Endpoint: https://agencia-beat-image-preview.beatdigitalok-bac.workers.dev. /health respondió HTTP 200 con ok:true y service:agencia-beat-image-preview. El proxy de una imagen de media.c5n.com respondió HTTP 200, image/avif y Access-Control-Allow-Origin para el preview. No se auditó desde sesión autenticada la totalidad de bindings/rutas del dashboard.

Variables opcionales:
- ALLOWED_ORIGINS: https://agenciabeat-preview.pages.dev
- IMAGE_ALLOWED_HOSTS: media.c5n.com (lista de hosts exactos, separados por coma; ampliar solamente con fuentes de imágenes verificadas).

Controles: HTTPS, hosts exactos, sin credenciales en URL, redirecciones manuales validadas, máximo 3 saltos, tipos raster, máximo 8 MiB y timeout de 10 segundos. No transmite cookies o Authorization del cliente al origen. CORS para el preview autorizado; CORS no sustituye autenticación ni un límite de tráfico.

Validación local con fetch simulado: salud; rechazo de HTTP/IP local; rechazo de host externo; rechazo de Origin externo; imagen aceptada con CORS; redirección a IP bloqueada; HTML rechazado; tamaño declarado excesivo rechazado. El comprobador sintáctico de Node pasó.

portal-config.js de agencia-beat-2.0 ya configura apiBase con la URL del Worker independiente; configuración publicada en Pages comprobada por HTTP. La integración con rbd-api y cualquier migración del dominio requieren autorización expresa del propietario.

## Pendientes y límites

- Recepción efectiva de PNG confirmada por archivos enviados por el propietario: noticia 1409, 1080x1350 (1887025 bytes) y 1080x1920 (2330128 bytes), PNG válidos y texto legible. No prueba por sí sola si esa noticia usó fallback proxy o CORS del origen directo.
- Auditar RLS/políticas/buckets de Supabase con acceso autorizado: no se dispone de sesión administrativa. No se realizaron escrituras de prueba en la base de producción.
- QA móvil real pendiente. CSS incluye breakpoint de 900px, pero no equivale a prueba en dispositivo.
- Inventario completo de DNS, rutas y bindings de producción pendiente de acceso al dashboard Cloudflare; el navegador remoto no pudo superar la verificación de inicio de sesión.


## Flujo editorial

POLÍTICA es categoría predeterminada del RSS, no fallo del generador. El propietario corrige borradores en Blogger. Editor local de prueba preparado en editorial.html, con edición y papelera restaurable e integración al Centro Multimedia. Sin escrituras en Supabase. Ver EDITORIAL-PREVIEW.md para límites y requisitos de sincronización.
