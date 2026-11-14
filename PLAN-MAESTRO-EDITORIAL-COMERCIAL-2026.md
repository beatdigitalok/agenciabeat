# Agencia Beat 2.0 — Decisiones de producto y plan de ejecución (2026-11-14)

## Dirección
Operación unipersonal. No AdSense ni empleados requeridos. Ingresos objetivo: publicidad directa, publinotas claramente identificadas, distribución B2B y servicios de comunicación. El usuario dirige y conserva control editorial; automatización de tareas repetitivas y noticias de bajo riesgo con controles. Ninguna promesa de rentabilidad.

## Sistemas existentes
- Fábrica Federal de Medios (capturador actual externo al repositorio): RSS -> Groq -> Blogger -> Supabase. Conservar, no reemplazar hasta integrar y probar.
- Portal Agencia Beat 2.0 y Centro Multimedia en rama agencia-beat-2.0; preview documentado https://agenciabeat-preview.pages.dev/ .
- Backend editorial de QA en editorial-backend; NO desplegado según README. Editor actual localStorage; NO afirmar que edita Blogger o Supabase.
- Worker de imágenes independiente; no confundir con rbd-api ni el backend editorial.
- Producción: main, Blogger, Supabase opnuuhnjdbczevvgtnbw y Worker rbd-api. No tocar sin aprobación específica.

## Riesgos bloqueantes
1. El capturador inserta en noticias de Supabase incluso cuando Blogger guarda DRAFT. El portal no filtra estado editorial. No habilitar autopublicación hasta corregir la separación de borradores.
2. Tabla noticias de producción sin status ni identidad Blogger; INSERT público todavía abierto según auditoría. Migrar a ingesta backend autenticada y RLS en transición controlada. Nunca exponer service_role o secretos en frontend.
3. RSS de medios ajenos no concede licencia para republicar artículos ni fotografías. Distinguir hechos de expresiones protegidas; fuentes oficiales/licenciadas y atribución; evitar duplicación de contenido y plagio.
4. Temas sensibles (acusaciones, salud, fallecimientos, elecciones, justicia) requieren revisión. Auto sólo fuentes/categorías de bajo riesgo con validaciones.
5. Borrado: papelera lógica, tombstone persistente, restauración, auditoría, sincronización por blogger_post_id, sin resurrección por RSS. Propagación de despublicación a canales propios con registro de fallos.
6. Autenticación real de administrador y permisos por sitio antes de edición remota. No usar token QA en navegador público.
7. APIs sociales: distinguir texto/imagen generados de publicación efectivamente confirmada. WhatsApp Channel manual.

## Diseño de producto
Unificar en un solo Control Central la navegación y capacidades de las capturas de Fábrica Federal de Medios y Agencia Beat anterior. Mantener identidad azul oscuro/azul eléctrico y UI limpia móvil primero.
Secciones: Dashboard; Noticias (lista, filtros, editar, estados, papelera, restaurar); Campañas RSS; Fuentes; Centro Multimedia (4:5, 9:16, video); Distribución; Publicaciones/Historial; Comercial (clientes, tarifas, publinotas, campañas); Ajustes y alertas.
Ficha de noticia: artículo, datos, imagen, distribución, trazabilidad de fuente, enlaces de publicación y errores.
Modos por campaña: AUTOMÁTICO BAJO RIESGO / REVISIÓN / SOLO BORRADORES. Interruptor global de emergencia que detiene nuevas publicaciones. Una noticia paga siempre requiere aprobación y rótulo comercial.

## Ejecución por fases y criterios de aceptación
Fase 0 — auditoría: inventario del capturador real, schema, grants, RLS, destinos y permisos; backups. Ningún cambio producción.
Fase 1 — QA backend: Supabase QA separado, Worker QA, auth, estados DRAFT/LIVE/SCHEDULED/TRASH, sync idempotente por sitio/blog/post, overrides, auditoría, reintentos. Pruebas E2E.
Fase 2 — CMS conectado: CRUD editorial autenticado, papelera/restore, preview, categorías y SEO. Verificar que borradores no aparezcan públicos ni reaparezcan eliminados.
Fase 3 — automatización: campañas con políticas por fuente, deduplicación, chequeos, cola duradera, retry/backoff, alertas, pausa global y revisión de alto riesgo.
Fase 4 — distribución: Blogger y portal, imágenes, redes autorizadas, estados confirmados; MP4 sólo cuando exista render y QA.
Fase 5 — monetización: media kit, presupuestos, contratos/licencias, métricas de campañas y clientes; piloto de un segundo diario antes de expansión regional.

## Reglas de despliegue
No desplegar main ni modificar Blogger/Supabase/Workers de producción sin aprobación. Cambios de desarrollo en agencia-beat-2.0 permitidos. No incluir credenciales, client secrets, tokens ni datos personales en commits. Distinguir documentación, código implementado, QA local y funcionalidad verificada en vivo.
