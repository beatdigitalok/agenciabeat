# Fuentes RSS administradas en el panel
## Activación inicial (una vez)
- Supabase de prueba tqxbwgirsytlplmxswyt: ejecutar rss-sources-preview.sql.
- Cloudflare: actualizar únicamente beat-editorial-preview con worker-cloudflare-preview.mjs.
- No hace falta RSS_ALLOWED_HOSTS para las fuentes registradas. Puede quitarse.
- No modificar rbd-api, Blogger, main ni producción.
## Uso
Fuentes RSS -> Actualizar fuentes -> Nueva fuente -> nombre, URL, categoría,
motor (Groq/Gemini), activa/desactivada -> Guardar configuración.
Elegir fuente -> Consultar RSS -> Preparar reescritura -> Generar -> Aplicar -> Guardar.
Las fuentes se guardan en Supabase privado y están disponibles desde cualquier equipo.
Cambiar URLs, proveedor, categoría o actividad no requiere cambiar Cloudflare.
## Protección
Token privado obligatorio. ENVIRONMENT=preview y DB producción rechazada.
Fuentes con HTTPS sin credenciales, puertos ni destinos IP/locales.
La consulta usa el ID de una fuente activa guardada, nunca una URL arbitraria del cliente.
Redirecciones limitadas al host registrado y variante www; otros hosts requieren cambiar
la URL en el panel al destino final. DNS A/AAAA comprobado antes de cada acceso.
Sólo direcciones públicas admitidas. La comprobación DNS no fija la IP del fetch:
revisar pinning/egress antes de ofrecer una plataforma pública multiusuario.
No reenviar tokens editoriales ni claves Supabase a las fuentes.
15 segundos, 1MB, XML sin DTD; clasificación RSS provisional; borradores obligatorios al crear.
Índice único mantiene control de duplicados incluso en papelera.
Ediciones de fuente usan expected_revision y devuelven409 ante conflicto.
## Estado
Fuentes persistentes y consulta manual implementadas.
Última consulta y errores de red guardados en Supabase.
Errores de parseo XML frontend se muestran en el panel, no se registran en servidor aún.
No hay cron, cola ni campañas automáticas en esta fase.
No hay publicación automática en Blogger ni redes.
Sincronización Blogger original y auditoría visual completa pendientes.
Backend: 25 pruebas pasan. QA con fuente real y en navegador pendiente.
