# Campañas RSS Preview — configuración y pruebas
## Activar una vez
1. Ejecutar rss-sources-preview.sql si aún no se hizo.
2. Ejecutar rss-automation-preview.sql sólo en Supabase QA tqxbwgirsytlplmxswyt.
3. Actualizar beat-editorial-preview con worker-cloudflare-preview.mjs.
4. Agregar RSS_AUTOMATION_ENABLED=true. Conservar AI_PREVIEW_ENABLED=true,
   PREVIEW_WRITES_ENABLED=true, ENVIRONMENT=preview y secretos actuales.
5. Cloudflare -> Worker -> Settings -> Cron Triggers: */15 * * * *.
6. Panel -> Fuentes RSS: crear/elegir, proveedor, categoría, activa,
   captura automática, intervalo (15–1440min), máximo 1–3 borradores, guardar.
El reloj es configuración inicial única. Fuentes y campañas se administran desde el panel.
## Comportamiento
Un máximo de una fuente por tick, con turno por última ejecución y fecha de creación.
La frecuencia es un mínimo entre consultas, no un SLA: muchas fuentes pueden esperar turno.
Se revisan las primeras 10 entradas normalizadas del feed. No captura todo el histórico.
Deduplicación persistente por sitio+URL. No vuelve a capturar notas en papelera.
Máximo 1–3 intentos IA por campaña según el límite elegido.
Feed sin cuerpo de al menos80 caracteres: se omite para evitar reescribir sólo un titular.
Si IA devuelve datos pendientes: no guarda automáticamente esa entrada; deja registro.
Siempre crea borradores, nunca publica Blogger/redes ni genera imágenes IA.
El botón Capturar y reescribir ahora ejecuta una fuente activa aunque su automatización esté pausada.
Cambiar la campaña durante IA descarta la propuesta antes de guardarla.
## Concurrencia
RPC privado toma una fuente con FOR UPDATE SKIP LOCKED y un lease10min.
Cron y ejecución manual usan el mismo lease; una fuente ocupada no se procesa en paralelo.
Índice único previene inserción simultánea de la misma noticia.
El resultado libera el lease condicionado al token, sin liberar leases de otra ejecución.
Una falla fatal puede dejar lease hasta10min; la campaña vuelve a ser elegible al vencer.
Los reintentos ocurren según frecuencia en el siguiente turno, sin bucles inmediatos.
## Diagnóstico
El panel muestra última ejecución, borradores creados, entradas omitidas y error.
29 pruebas JS/backend pasaron; SQL validado con PGlite: migraciones, claim único, pausa, vencimiento, frecuencia y permisos.
QA real pendiente: fuenteRSS/Atom, claves reales, CloudflareCron, móvil, exportaciónPNG.
No usar main, rbd-api ni Supabase de producción.
## Límites actuales
No hay cola duradera por noticia, ni extracción del artículo completo.
No se salta automáticamente entre proveedores ante cuota. Elegir otro proveedor en panel.
No es un SaaS multiusuario listo: acceso actual tokenprivado de preview.
DNS público verificado, pero no hay pinning de IP de conexión.
Evitar presentar interfaz anterior de noticias importadas como sincronización Blogger activa.
