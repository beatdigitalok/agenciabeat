# Despliegue seguro del diagnóstico RSS — Agencia Beat QA

Estado: **preparado, no desplegado desde GitHub**. Rama: `agencia-beat-2.0`. No usar en producción pública.

## Infraestructura verificada visualmente el 15/11/2026

- Worker Cloudflare: `beat-editorial-preview` (versión activa observada `0ace5618`).
- Supabase QA: `https://tqxbwgirsytlplmxswyt.supabase.co`. **Nunca** apuntar al proyecto productivo `opnuuhnjdbczevvgtnbw`.
- Cron existente: cada 15 minutos. `RSS_AUTOMATION_ENABLED=true`, `PREVIEW_WRITES_ENABLED=true`, `ENVIRONMENT=preview`, `PREVIEW_ORIGIN=https://agenciabeat-preview.pages.dev`.
- En Supabase QA: una fuente activa `LETRA P - Economía`. Resultado previo: `created=0`, `skipped=10`, `errors=[]`.
- Cloudflare conserva versiones anteriores; su disponibilidad no equivale a un rollback probado.

## Qué cambia

`worker.mjs` agrega `skip_reasons` al JSON `last_result`: `short_content`, `duplicate`, `needs_review`. No altera el número de intentos, deduplicación, cron, guardado como borrador, autenticación ni secretos. Los registros antiguos no tendrán `skip_reasons`.

## Condiciones obligatorias antes de actualizar

1. Comprobar el resultado de GitHub Actions del commit elegido y la integridad de **los tres módulos**: `worker.mjs`, `rss-core.mjs` y `core.mjs`.
2. **No pegar `worker.mjs` solo en el editor de Cloudflare**: usa imports relativos que deben resolverse mediante un bundler o despliegue de módulos.
3. Obtener copia/exportación verificable del código desplegado y registrar versión activa `0ace5618`; revisar diferencias funcionales con GitHub. El endpoint `/health` no informa versión de código.
4. Confirmar el procedimiento de recuperación y preservar las variables, secretos, rutas, dominios y cron existentes. Un despliegue con configuración incompleta puede cambiar los triggers o bindings.
5. Validar en entorno local/CI que el bundle compila. Un ejemplo de compilación **sin despliegue** desde la raíz del repositorio es:

```sh
npx --yes esbuild editorial-backend/worker.mjs --bundle --format=esm --platform=browser --target=es2022 --outfile=worker-qa-bundle.mjs
node --check worker-qa-bundle.mjs
```

6. Revisar el bundle y comparar su comportamiento con la versión actual; obtener autorización explícita para reemplazar el Worker QA. No subir ni registrar secretos en GitHub.

## Verificación posterior al despliegue autorizado

- `GET /` y `GET /health` siguen respondiendo sin exponer credenciales.
- En Cloudflare, el cron y variables siguen intactos.
- Tras la **siguiente ejecución natural** (no forzar capturas), consultar en Supabase QA:

```sql
SELECT nombre, last_checked_at, last_error,
       last_result -> 'skip_reasons' AS motivos,
       last_result ->> 'created' AS creadas,
       last_result ->> 'skipped' AS omitidas
FROM public.beat_rss_sources_preview
WHERE nombre = 'LETRA P - Economía';
```

- La suma de motivos debe coincidir con `skipped` cuando se haya ejecutado el nuevo código. Si hay errores, conservar la evidencia y recuperar la versión anterior por el procedimiento verificado.

## Límites

- `skip_reasons` explica las **causas clasificadas por el código**, no demuestra por sí solo que el RSS externo sea correcto.
- No se verificó aquí la equivalencia entre código desplegado y rama GitHub. **No implementar a ciegas**.
- No tocar Blogger, `main`, el Worker `rbd-api`, el Worker de imágenes ni Supabase productivo.
