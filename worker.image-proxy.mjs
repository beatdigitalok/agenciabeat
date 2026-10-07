// Worker independiente de pruebas. No reemplazar rbd-api con este archivo.
const MAX_BYTES = 8 * 1024 * 1024;
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const DEFAULT_HOSTS = ['media.c5n.com'];

function targetURL(value, hosts) {
  let u;
  try { u = new URL(value); } catch { throw new Error('URL inválida'); }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443') || !hosts.includes(u.hostname)) {
    throw new Error('Destino no permitido');
  }
  return u;
}

export default {
  async fetch(request, env = {}) {
    const origin = request.headers.get('Origin');
    const origins = (env.ALLOWED_ORIGINS || 'https://agenciabeat-preview.pages.dev').split(',').map(s => s.trim()).filter(Boolean);
    const headers = { 'Vary': 'Origin', 'X-Content-Type-Options': 'nosniff' };
    if (origin && origins.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
    const error = (message, status) => new Response(JSON.stringify({ ok: false, error: message }), {
      status, headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
    if (origin && !origins.includes(origin)) return error('Origen no permitido', 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      ...headers, 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Max-Age': '600'
    } });
    if (request.method !== 'GET') return error('Método no permitido', 405);
    const url = new URL(request.url);
    if (url.pathname === '/health') return new Response(JSON.stringify({ ok: true, service: 'agencia-beat-image-preview' }), {
      headers: { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
    if (url.pathname !== '/api/image-proxy') return error('Ruta no encontrada', 404);
    const hosts = (env.IMAGE_ALLOWED_HOSTS || DEFAULT_HOSTS.join(',')).split(',').map(s => s.trim()).filter(Boolean);
    let target;
    try { target = targetURL(url.searchParams.get('url'), hosts); } catch (e) { return error(e.message, 400); }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      let response;
      for (let hop = 0; hop <= 3; hop++) {
        response = await fetch(target.href, { redirect: 'manual', signal: controller.signal, headers: { Accept: 'image/avif,image/webp,image/png,image/jpeg,image/gif' } });
        if (![301, 302, 303, 307, 308].includes(response.status)) break;
        await response.body?.cancel();
        if (hop === 3 || !response.headers.get('Location')) return error('Redirección no permitida', 502);
        try { target = targetURL(new URL(response.headers.get('Location'), target).href, hosts); }
        catch { return error('Redirección no permitida', 400); }
      }
      if (!response.ok) { await response.body?.cancel(); return error('Imagen no disponible', 502); }
      const type = (response.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
      if (!TYPES.has(type)) { await response.body?.cancel(); return error('Tipo de imagen no permitido', 415); }
      if (Number(response.headers.get('Content-Length')) > MAX_BYTES) { await response.body?.cancel(); return error('Imagen demasiado grande', 413); }
      if (!response.body) return error('Imagen vacía', 502);
      const reader = response.body.getReader();
      const chunks = [];
      let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); return error('Imagen demasiado grande', 413); }
        chunks.push(value);
      }
      if (!size) return error('Imagen vacía', 502);
      return new Response(new Blob(chunks, { type }), { headers: {
        ...headers, 'Content-Type': type, 'Cache-Control': 'public, max-age=3600'
      } });
    } catch { return error('No se pudo obtener la imagen', 502); }
    finally { clearTimeout(timer); }
  }
};
