# Recuperación de la fábrica RBD V8.2 (referencia histórica)

**Origen:** https://github.com/beatdigitalok/BEAT-DIGITAL-APP/blob/main/RBD_Autopublicador.html
**Archivo inspeccionado:** `RBD_Autopublicador.html` (1610 líneas). **Repositorio original: sin modificar.**
**Estado:** inventario, NO importación ejecutable. Integración únicamente en QA y en `agencia-beat-2.0`.

## Hallazgos verificados
- Un panel HTML completo, con sidebar, dashboard, categorías, campañas RSS, redacción manual y configuración.
- Campañas locales: alta, edición, activación, intervalo, proveedor de IA y ejecución forzada (`saveCampaign`, `toggleCamp`, `engineTick`, `forceEngineRun`).
- Groq y Hugging Face como proveedores, con generación/reformulación, prompts específicos por campaña y fallback.
- OAuth de Blogger en el navegador, prueba de borrador, envío de noticias, historial de publicación y estadísticas.
- Formulario manual, imagen RSS, publicación y escritura en Supabase.
- Importación/exportación de configuración, categorías, campañas e historial (`version: '8.2'`).

## Riesgos detectados — no trasladar el archivo sin depuración
- **Credenciales reales expuestas en el código** (`DEFAULTS.clientSecret`, `DEFAULTS.hfToken`, `DEFAULTS.groqKey`). **Requieren rotación/revocación por parte del titular, incluso si se elimina el archivo**. No copiar los valores, ni mostrarlos en registros ni documentación.
- `localStorage` almacena configuración sensible, token de acceso y refresh token de Blogger. Mover secretos a Worker; no conservar OAuth client secret ni refresh token en JS público.
- Hay referencias a una instancia Supabase de producción y peticiones directas desde navegador: prohibido ejecutar el archivo original desde el entorno QA como si fuera el nuevo editor.
- `setInterval`/campañas y estadísticas de `localStorage` dependen de la sesión y del equipo encendido; las campañas persistentes deben ejecutarse con cron/DB en Worker.
- La publicación antigua usa Blogger directamente. Mantener **bloqueado el blog de producción** y usar exclusivamente `BLOGGER_QA_BLOG_ID` (distinto de `BLOGGER_BLOG_ID`).
- La exportación histórica puede incluir tokens/credenciales. No importar JSON sin sanitización y confirmación explícita del destino.

## Correspondencia para integración SIN duplicar pantallas

| Función V8.2 | Destino Agencia Beat QA | Estado |
| --- | --- | --- |
| Dashboard e indicadores | Control Central `redactar-preview.html` | Reutilizar |
| RSS y campañas | `beat_rss_sources_preview`, Worker cron | Implementado parcialmente; verificar |
| Selector de IA y reescritura manual | `/api/manual/generate` + editor | Reutilizar |
| Categorías | Editor + normalización interna | Revisar esquema y compatibilidad Blogger |
| Redacción manual + imagen | Editor nativo + Mesa editorial | Reutilizar; evitar dos editores |
| Borradores de Blogger | `blogger-draft.mjs` + cola QA | Integración pendiente de pruebas |
| Historial y deduplicación | Tablas QA (no `localStorage`) | Reconciliar; pruebas |
| Importación/exportación | Backend con sanitización | Pendiente |
| Publicación integral | Backend sujeto a compuertas editoriales | NO habilitar todavía |
| Registro técnico y estadísticas | Control Central / diagnósticos | Fusionar |

## Próximo trabajo concreto
1. Rotar/revocar claves expuestas en el archivo original y trasladar el uso de credenciales a variables/secrets de Cloudflare. Evitar publicarlas en issues o commits.
2. Validar SQL de cola y scripts Node antes del primer despliegue. Configurar solo Supabase y Blogger **QA**.
3. Migrar exclusivamente las funciones diferenciales que falten, respetando configuración y campañas actuales.
4. Probar capturas, deduplicación, revisión, envío de borradores, estado remoto, reintentos y parada central antes de habilitar automatización.
5. Mantener el portal de producción de Agencia Beat y el repositorio BEAT-DIGITAL-APP sin cambios.

**No copiar el HTML antiguo al directorio servido por Cloudflare Pages.** Usarlo como referencia de implementación, no como aplicación paralela.
