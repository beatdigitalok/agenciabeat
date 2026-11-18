# Agencia Beat 2.0

Rama de desarrollo: `agencia-beat-2.0`. Producción permanece en `main`.

## Arquitectura

Fuentes/RSS → IA/editor → Blogger → Supabase → Diario → Centro Multimedia → Distribución.

## Módulos

- `index.html`: diario 2.0.
- `noticia.html`: lectura individual.
- `panel.html`: Panel Central.
- `multimedia.html`: generador de placas 4:5 y 9:16.
- `video.html`: laboratorio de video vertical 9:16.
- `distribucion.html`: borradores multired.
- `portal-config.js`: configuración del medio.
- `social-config.js`: canales y reglas sociales.
- `conector.js`: acceso público de lectura a Supabase.

## Formatos

- Instagram/feed: 1080×1350 (4:5).
- Stories/vertical: 1080×1920 (9:16).
- Video vertical: 1080×1920 (9:16), pendiente de motor de render real.

## Destinos previstos

Instagram, Facebook, X, Threads, Bluesky, Mastodon, Telegram, LinkedIn, TikTok y YouTube Shorts. WhatsApp Channel permanece manual.

## Seguridad

La clave pública/publishable de Supabase puede utilizarse para lectura desde navegador sólo bajo políticas RLS adecuadas. Tokens de Groq, Meta, X, Telegram, etc. NO deben incluirse en JavaScript del frontend. Las operaciones IA, publicación y render deben pasar por backend/Worker.

## Multi-diario

El motor usa `sitioId`. Cada diario debe definir nombre, dominio, identidad y reglas en configuración, evitando clonar lógica. Objetivo: Agencia Beat + Región Centro/Norte/Sur/Este/Oeste compartiendo el mismo núcleo.

## Bloqueos antes de producción

1. Preview desplegado de la rama.
2. QA desktop/móvil.
3. Validar imágenes externas y CORS del Canvas.
4. Comparar placas contra la plantilla oficial.
5. Probar títulos largos/cortos y noticias sin imagen.
6. Definir backend seguro para IA y redes.
7. Definir motor de render MP4.
8. Recién después evaluar merge a `main` y autopublicación.