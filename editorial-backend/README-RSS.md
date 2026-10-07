# RSS Preview — captura asistida
## Activar
1. Ejecutar rss-preview.sql sólo en tqxbwgirsytlplmxswyt.
2. Desplegar worker-cloudflare-preview.mjs en beat-editorial-preview.
3. Variable RSS_ALLOWED_HOSTS: dominios exactos separados por comas, sin esquema ni rutas.
   Ejemplo de formato (no una fuente configurada): noticias.example.com,www.noticias.example.com.
4. Abrir redactar-preview, Fuentes RSS, ingresar URL HTTPS y categoría inicial.
5. Consultar -> Preparar reescritura -> elegir Groq/Gemini -> Generar -> Aplicar -> Guardar.
## Comportamiento
Consulta manual bajo token privado. 15 segundos, 1 MB, 3 redirecciones; cada destino debe estar autorizado.
No envía credenciales a fuentes. RSS/Atom XML; sin DTD ni entidades.
Máximo 40 entradas en pantalla, a partir de las primeras 80 del feed.
No scrapea el artículo completo. Puede recibir únicamente resúmenes: el editor debe completar y verificar.
Sólo toma imágenes enclosure/thumbnail/media indicadas por el feed; no infiere fotos de HTML.
Configuraciones de fuente guardadas únicamente en el navegador, máximo 20.
No hay cron, campañas automáticas ni consulta con la pestaña cerrada en esta fase.
No publica en Blogger ni redes.
## Persistencia
La captura seleccionada se guarda en beat_manual_preview como borrador, aunque el cliente pida publicado.
La fuente original y URL del feed se conservan en fuentes JSONB. Las ediciones conservan esa metadata.
Eliminar parámetros utm_,fbclid,gclid y fragmento para identificar URL canónica básica.
Índice único por sitio + URL: también incluye notas enviadas a papelera.
El usuario puede publicar posteriormente en preview con una acción explícita.
## Verificación
19 pruebas previas + 3 pruebas RSS backend pasaron.
Interfaz XML en navegador y consulta real pendientes; navegador local de prueba no disponible.
Probar RSS y Atom, feed vacío, imágenes ausentes, doble guardado y títulos largos.
## Siguiente fase
Campañas persistentes del lado servidor, captura programada, cola de reescritura,
registro de errores/reintentos y revisión editorial. Construir sin activar producción.
