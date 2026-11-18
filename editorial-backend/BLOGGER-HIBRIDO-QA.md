# Agencia Beat 2.0 — arquitectura híbrida aprobada (QA)

## Decisión
Blogger permanece como sitio público y archivo histórico en https://www.agenciabeat.com. No cambiar DNS, plantillas, URLs, publicación, SEO ni credenciales de producción. El CMS QA puede preparar contenido y registrar su procedencia, pero no publicar sin autorización específica.

## Separación de responsabilidades
- **Origen público actual:** Blogger. Las URL existentes siguen siendo las canónicas.
- **Control Central:** edición, revisión, RSS, IA, multimedia, auditoría y preparación de distribución.
- **Base editorial propia:** registros normalizados con ID interno, URL de origen, título, bajada, contenido, fecha, categoría, imágenes, estado, revisiones, autoría y derechos; nunca asumir que una nota RSS se puede republicar íntegra.
- **Portal QA futuro:** Cloudflare Pages/Workers con HTML generado en servidor. Hasta definir la migración, las reproducciones de notas públicas deberán llevar canonical a Blogger o noindex, según corresponda; no emitir sitemaps públicos de duplicados.
- **Migración:** solo después de inventario de URL, respaldo comprobado, análisis Search Console, pruebas de redirecciones 1:1 y autorización explícita.

## Fases
1. Inventariar entradas y páginas de Blogger **sin modificar nada**, mediante exportación autorizada o API de solo lectura. Paginación, deduplicación, preservación de permalink, fecha y autor. No usar cifras de estadísticas como recuento técnico exacto sin conciliación.
2. Diseñar esquema de datos editorial independiente, con Blogger ID y URL canónica única, revisión y origen de imágenes.
3. Crear portal QA con portada, secciones, fichas de noticia, metadatos, Open Graph, datos estructurados y renderizado HTML del lado del servidor. En QA noindex.
4. Pruebas de rendimiento, indexación y migración. No cambiar el dominio de producción.
5. Evaluar, con datos de Search Console, si Blogger continúa como backend permanente o se migra la publicación.

## Primer componente implementado
`blogger-hybrid.mjs` genera un inventario normalizado de URL públicas del dominio oficial, sin red ni escrituras. `blogger-hybrid.test.mjs` cubre URL válidas, dominios ajenos, HTTP, duplicados y protección de canónicas. Este módulo **no importa todavía** las 18.476 entradas ni despliega un portal.

## Reglas no negociables
- Sin tocar main, Blogger público, DNS, producción Supabase ni Worker de producción.
- Sin credenciales en GitHub ni en enlaces.
- Sin duplicar indexación de noticias en el portal nuevo.
- No usar Blogger como almacenamiento ilimitado garantizado.
- Autonomía editorial solo con reglas aprobadas, fuentes verificadas, auditoría y excepciones.
