// ============================================================
// 🔌 CONECTOR SUPABASE v3.1 — UNIFICADO
// ============================================================

const SUPABASE_URL = "https://opnuuhnjdbczevvgtnbw.supabase.co";
const SUPABASE_KEY = "sb_publishable__IyI5r0eYrGzS7amcaGapg_AUZR9KbE";
const SITIO_ID = "agenciabeat";  // <--- UNIFICADO
const NOTICIAS_POR_PAGINA = 9;

let paginaActual = 1;
let categoriaActual = null;
let totalNoticias = 0;
let configPortal = {};

// ==================== CONFIGURACIÓN ====================
async function obtenerConfiguracion() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/config?sitio_id=eq.${SITIO_ID}`;
    const res = await fetch(url, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    if (!res.ok) throw new Error("Error al obtener configuración");
    const data = await res.json();
    configPortal = data[0] || {};
    return configPortal;
  } catch (e) {
    console.warn("Usando configuración por defecto", e);
    return {};
  }
}

// ==================== NOTICIAS ====================
async function obtenerNoticias(pagina = 1, categoria = null) {
  const desde = (pagina - 1) * NOTICIAS_POR_PAGINA;
  const hasta = desde + NOTICIAS_POR_PAGINA - 1;

  let url = `${SUPABASE_URL}/rest/v1/noticias?select=*&sitio_id=eq.${SITIO_ID}&order=created_at.desc`;
  if (categoria) {
    url += `&categoria=eq.${categoria.toLowerCase().trim()}`;
  }

  const respuesta = await fetch(url, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Range": `${desde}-${hasta}`,
      "Prefer": "count=exact"
    }
  });

  if (!respuesta.ok) throw new Error("Error al obtener noticias");
  const noticias = await respuesta.json();
  const rango = respuesta.headers.get("content-range");
  totalNoticias = rango ? parseInt(rango.split("/")[1]) : 0;
  return noticias;
}

async function obtenerNoticiaPorId(id) {
  const url = `${SUPABASE_URL}/rest/v1/noticias?id=eq.${id}`;
  const respuesta = await fetch(url, {
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`
    }
  });
  if (!respuesta.ok) throw new Error("Error al obtener la noticia");
  const data = await respuesta.json();
  return data[0] || null;
}

// ==================== RENDERIZADO ====================
function renderizarNoticias(noticias) {
  const contenedor = document.getElementById("bloqueNoticias");
  if (!contenedor) return;

  if (!noticias || noticias.length === 0) {
    contenedor.innerHTML = `<p class="cargando">No hay noticias publicadas en esta sección.</p>`;
    return;
  }

  contenedor.innerHTML = noticias.map(noticia => {
    const fecha = new Date(noticia.created_at).toLocaleDateString('es-AR', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
    const resumen = noticia.contenido ? noticia.contenido.replace(/<[^>]*>/g, '').substring(0, 140) + '…' : '';

    return `
      <article class="tarjeta-noticia">
        <img src="${noticia.imagen_url || '/img/default.jpg'}" alt="${noticia.titulo}" loading="lazy">
        <div class="tarjeta-body">
          <span class="categoria">${noticia.categoria || 'General'}</span>
          <h2><a href="noticia.html?id=${noticia.id}">${noticia.titulo}</a></h2>
          <p class="resumen">${resumen}</p>
          <span class="fecha">${fecha}</span>
        </div>
      </article>
    `;
  }).join('');
}

async function renderizarNoticiaCompleta() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    document.getElementById("noticiaCompleta").innerHTML = '<p>No se especificó una noticia.</p>';
    return;
  }

  try {
    const noticia = await obtenerNoticiaPorId(id);
    if (!noticia) {
      document.getElementById("noticiaCompleta").innerHTML = '<p>Noticia no encontrada.</p>';
      return;
    }

    document.title = noticia.titulo + ' — AGENCIA BEAT';
    document.getElementById("categoriaNoticia").textContent = noticia.categoria || 'General';
    document.getElementById("tituloNoticiaContenido").textContent = noticia.titulo;
    const fecha = new Date(noticia.created_at).toLocaleDateString('es-AR', {
      day: 'numeric', month: 'long', year: 'numeric'
    });
    document.getElementById("fechaNoticia").textContent = fecha;
    const imgContainer = document.getElementById("imagenNoticia");
    if (noticia.imagen_url) {
      imgContainer.innerHTML = `<img src="${noticia.imagen_url}" alt="${noticia.titulo}">`;
    } else {
      imgContainer.innerHTML = '';
    }
    document.getElementById("cuerpoNoticia").innerHTML = noticia.contenido || '<p>Contenido no disponible.</p>';

  } catch (error) {
    console.error(error);
    document.getElementById("noticiaCompleta").innerHTML = '<p>Error al cargar la noticia.</p>';
  }
}

// ==================== WIDGETS Y DESTACADOS ====================
function renderizarDestacados() {
  const cont = document.getElementById("destacadoPrincipal");
  if (!cont) return;
  const destacados = configPortal.destacados || [];
  if (destacados.length === 0) {
    cont.innerHTML = `<div class="destacado-item principal"><p>No hay destacados configurados.</p></div>`;
    return;
  }

  // Tomar el primero como principal
  const principal = destacados[0];
  const secundarios = destacados.slice(1, 4);

  let html = `
    <div class="destacado-item principal">
      <a href="noticia.html?id=${principal.id}">
        <img src="${principal.imagen_url || '/img/default.jpg'}" alt="${principal.titulo}">
        <h2>${principal.titulo}</h2>
      </a>
    </div>
    <div class="destacado-item secundario">
      ${secundarios.map(s => `
        <h3><a href="noticia.html?id=${s.id}">${s.titulo}</a></h3>
        <span class="fecha">${new Date(s.created_at).toLocaleDateString('es-AR')}</span>
      `).join('')}
    </div>
  `;
  cont.innerHTML = html;
}

function renderizarSidebar() {
  const cont = document.getElementById("barraLateral");
  if (!cont) return;

  const widgets = configPortal.widgets || {};

  let html = '';

  if (widgets.publicidad && widgets.publicidad.sidebar) {
    html += `
      <div class="widget widget-publicidad">
        <h3>Publicidad Patrocinada</h3>
        <div class="banner-cuadrado">${widgets.publicidad.sidebar}</div>
      </div>
    `;
  }

  html += `
    <div class="widget widget-redes">
      <h3>Unite a nuestra comunidad</h3>
      <div class="botones-redes">
        <a href="#" class="red wa">📱 WhatsApp</a>
        <a href="#" class="red tg">📲 Telegram</a>
        <a href="#" class="red bs">🦋 Bluesky</a>
      </div>
    </div>
  `;

  if (widgets.mas_leidas) {
    html += `
      <div class="widget widget-popular">
        <h3>Más leídas</h3>
        <ul id="listaMasLeidas">
          <li>Cargando...</li>
        </ul>
      </div>
    `;
  }

  cont.innerHTML = html;

  if (widgets.mas_leidas) {
    cargarMasLeidas();
  }
}

async function cargarMasLeidas() {
  try {
    const noticias = await obtenerNoticias(1, null);
    const top = noticias.slice(0, 5);
    const lista = document.getElementById("listaMasLeidas");
    if (!lista) return;
    lista.innerHTML = top.map(n => `
      <li><a href="noticia.html?id=${n.id}">${n.titulo}</a></li>
    `).join('');
  } catch (e) {
    console.warn("Error cargando más leídas", e);
  }
}

function actualizarWidgetsCabecera() {
  const config = configPortal.widgets || {};
  if (config.dolar) {
    document.getElementById("dolarBlue").textContent = "1545";
    document.getElementById("dolarOficial").textContent = "1510";
  }
  if (config.clima) {
    document.getElementById("climaTemp").textContent = "18°C";
    document.getElementById("climaCiudad").textContent = "La Plata";
  }
}

// ==================== PAGINACIÓN ====================
function actualizarPaginacion() {
  const totalPaginas = Math.ceil(totalNoticias / NOTICIAS_POR_PAGINA) || 1;
  document.getElementById("controlPaginas").textContent = `Página ${paginaActual} de ${totalPaginas}`;
  document.getElementById("btnAnterior").disabled = paginaActual === 1;
  document.getElementById("btnSiguiente").disabled = paginaActual >= totalPaginas;
}

async function cargarNoticias() {
  const contenedor = document.getElementById("bloqueNoticias");
  if (!contenedor) return;
  contenedor.innerHTML = '<p class="cargando">Cargando noticias...</p>';

  try {
    const noticias = await obtenerNoticias(paginaActual, categoriaActual);
    renderizarNoticias(noticias);
    actualizarPaginacion();
    const tituloSeccion = document.getElementById("nombreSeccion");
    if (tituloSeccion) {
      tituloSeccion.textContent = categoriaActual ? `Categoría: ${categoriaActual}` : 'Últimas Noticias';
    }
  } catch (error) {
    console.error(error);
    contenedor.innerHTML = '<p class="cargando" style="color:red;">Error al cargar noticias. Intenta de nuevo.</p>';
  }
}

// ==================== INICIALIZACIÓN ====================
async function init() {
  await obtenerConfiguracion();

  const fechaElem = document.getElementById("fechaActual");
  if (fechaElem) {
    const ahora = new Date();
    fechaElem.textContent = ahora.toLocaleDateString('es-AR', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
  }

  actualizarWidgetsCabecera();
  renderizarDestacados();
  renderizarSidebar();

  if (document.getElementById("noticiaCompleta")) {
    renderizarNoticiaCompleta();
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const cat = params.get("cat");
  if (cat) {
    categoriaActual = cat;
    document.querySelectorAll('.menu-principal ul li a').forEach(link => {
      link.classList.remove('activo');
      if (link.getAttribute('href') === `?cat=${cat}`) {
        link.classList.add('activo');
      }
    });
  }

  document.getElementById("btnAnterior").addEventListener("click", () => {
    if (paginaActual > 1) { paginaActual--; cargarNoticias(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  });
  document.getElementById("btnSiguiente").addEventListener("click", () => {
    paginaActual++; cargarNoticias(); window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  cargarNoticias();
}

document.addEventListener("DOMContentLoaded", init);