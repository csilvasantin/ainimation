/*
 * ainimation-mcp — el MCP de ainimation.studio (Carlos, 8-sep-2026, vía 3 de la ventana 0124):
 * «creando el MCP y el help del sitio». Hasta hoy /mcp declaraba honradamente que no había
 * servidor: era el único sitio de la suite sin puerta de silicio de verdad.
 *
 * Qué expone: las XPERIENCIAS del estudio (piezas interactivas con plan.json + rules.json que
 * viven en el repo estático) como herramientas para los agentes de la flota:
 *   lecturas (sin clave): quien_soy, sitio_estado, xperiencias_listar, xperiencia_detalle,
 *                         xperiencia_canal_item, stock_animaciones
 *   escritura (clave de flota): xperiencia_publicar → la pieza entra en el stock de Pixeria
 *                         (api.admira.store/stock/publish), de donde admira.tv la emite.
 * La fuente de la lista es UNA: https://www.ainimation.studio/xperiencias/index.json (la misma
 * que pinta la galería). Este worker no guarda nada: lee el sitio y escribe en Pixeria.
 * Identidad: clave de flota derivada (identidad-flota.mjs, MCP_FLOTA_SEED), como en XpaceOS.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import * as z from 'zod/v4';
import { identidadPorClave, claveDeRequest } from './identidad-flota.mjs';
import { ColaTienda, STORE } from './cola.js';
export { ColaTienda };
import { Admingo, PLANTILLAS, proyectoVacio, compilar, validarEsquema, coherenciaMenu, urlKiosko, TWIN_BASE, TWIN_STARBUCKS, MARCAS } from './suite.js';

export const NOMBRE = 'ainimation';
export const HERRAMIENTAS = ['quien_soy', 'sitio_estado', 'xperiencias_listar', 'xperiencia_detalle', 'xperiencia_canal_item', 'stock_animaciones', 'xperiencia_publicar', 'listar_xperiencias', 'plantillas', 'crear_proyecto', 'validar_admingo', 'compilar_admingo', 'publicar_xperiencia', 'menu_validar', 'enviar_a_admiratv', 'fijar_en_totem', 'marca_aplicar', 'cola_estado', 'cola_avanzar', 'cola_avisos'];
const limpiar = (s) => String(s || '').replace(/\/+$/, '');
const texto = (o) => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });
const fallo = (e) => ({ isError: true, content: [{ type: 'text', text: 'Error: ' + (e && e.message || e) }] });
const seguro = (fn) => async (args) => { try { return await fn(args || {}); } catch (e) { return fallo(e); } };
const Admingo_fromFile = (t) => Admingo.fromFile(t);
const SLUG = z.string().min(2).max(80).regex(/^[a-z0-9-]+$/, 'slug en minúsculas, dígitos y guiones');

export function crearServidor(env = {}, deps = {}, identidad = null) {
  const sitio = limpiar(env.SITIO || 'https://www.ainimation.studio');
  const stock = limpiar(env.STOCK_API || 'https://api.admira.store');
  const doFetch = deps.fetch || globalThis.fetch;

  async function llamar(url, init = {}, { timeoutMs = 15_000 } = {}) {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), timeoutMs);
    let r;
    try { r = await doFetch(url, { ...init, signal: ctl.signal, headers: { accept: 'application/json', 'user-agent': 'ainimation-mcp/1.0', ...(init.headers || {}) } }); }
    catch (e) { throw new Error(`no se pudo llegar a ${url}: ${e && e.message || e}`); }
    finally { clearTimeout(t); }
    const text = await r.text();
    let body; try { body = text ? JSON.parse(text) : null; } catch { body = { raw: text }; }
    if (!r.ok) { const err = new Error(`${r.status} en ${url}: ${(body && (body.error || body.raw)) || r.statusText}`); err.status = r.status; throw err; }
    return body;
  }
  const url = (slug) => `${sitio}/xperiencias/${slug}/`;

  async function indice() {
    const d = await llamar(`${sitio}/xperiencias/index.json`);
    const lista = d && Array.isArray(d.xperiencias) ? d.xperiencias : [];
    return { actualizado: d && d.actualizado || null, xperiencias: lista };
  }
  async function plan(slug) { return llamar(`${sitio}/xperiencias/${slug}/plan.json`); }
  async function reglas(slug) { return llamar(`${sitio}/xperiencias/${slug}/rules.json`).catch(() => null); }
  async function entrada(slug) {
    const { xperiencias } = await indice();
    const x = xperiencias.find((e) => e.slug === slug);
    if (!x) throw new Error(`«${slug}» no está en ${sitio}/xperiencias/index.json (hay: ${xperiencias.map((e) => e.slug).join(', ') || 'ninguna'})`);
    return x;
  }
  const resumenPlan = (p) => p ? { titulo: p.title, fps: p.fps, frames: p.totalFrames, duracion_s: p.durationSeconds, marcadores: (p.markers || []).length, cast: (p.cast || []).length, elementos: (p.stageItems || []).length } : null;
  /** El mismo JSON que copia el botón «Emit on admira.tv» de la galería. */
  const canalItem = (x, p) => ({ id: 'xp-' + x.slug, type: 'interactive', title: 'Admira · ' + (x.title || (p && p.title) || x.slug), url: url(x.slug), tags: ['horizontal'], ...(p && p.durationSeconds ? { durationSeconds: p.durationSeconds } : {}) });

  const server = new McpServer({ name: NOMBRE, version: env.VERSION || '1.0.0', websiteUrl: sitio }, {
    instructions: [
      `Eres el acceso MCP a AInimation Studio (${sitio}), la capa de autoría de la suite AdmiraNeXT: piezas interactivas («Xperiencias», plan.json + rules.json) que se crean en /studio.html, se guardan en Pixeria y se emiten en admira.tv.`,
      'Lecturas sin clave: sitio_estado, xperiencias_listar, xperiencia_detalle, xperiencia_canal_item, stock_animaciones. Escritura con clave de flota AdmiraNeXT (Authorization: Bearer): xperiencia_publicar. quien_soy te dice con qué identidad entras.',
      'Este servidor no guarda estado: lee el sitio (index.json es la única fuente de la galería) y escribe en el stock de Pixeria. Crear una Xperiencia nueva sigue siendo trabajo del repo (carpeta + entrada en index.json): el MCP te dice qué hay y publica lo que ya existe.',
      'Suite (desde 7-oct-2026): listar_xperiencias, plantillas, crear_proyecto (proyecto del Director desde plantilla), validar_admingo y compilar_admingo (el Lingo de AdmiraNeXT → reglas XPL), publicar_xperiencia (URL + ficheros; ZIP próximamente), menu_validar (carta de quiosco), enviar_a_admiratv (item de playlist type interactive), fijar_en_totem (comando /totem del gemelo) y marca_aplicar (marcablanca de admiranext). Son cálculos y lecturas: no escriben.',
      'Gestor de colas (7-oct-2026): cola_estado (pedidos en preparación / listos de una tienda) y cola_avanzar (el barista de la demo) y cola_avisos (pedidos listos con el texto que dicen Admirito, el móvil y la taza: «NOMBRE, tu pedido Starbucks está preparado»). Los pedidos llevan «nombre» si el cliente lo dio en el quiosco. Pago siempre simulado; relé público en /cola/* de este mismo worker.',
      'Ritual de la flota: lo que hagas aquí se declara en yokup (mcp.admira.live · yokup_alta/yokup_paso) — este MCP no puntúa por sí mismo.',
    ].join(' '),
  });

  server.registerTool('quien_soy', {
    title: 'Quién soy en este MCP',
    description: 'Con qué identidad entras (clave de flota → persona y equipo) o anónimo de solo lectura.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, seguro(async () => texto(identidad ? { ...identidad, escritura: true } : { identidad: null, escritura: false, nota: 'sin clave: solo lecturas. Para xperiencia_publicar manda tu clave de flota (Authorization: Bearer).' })));

  server.registerTool('sitio_estado', {
    title: 'Estado del sitio',
    description: 'Sello vivo de ainimation.studio (version.json: versión, firma agente · máquina, commit) y si responden sus puertas /help, /mcp y el índice de Xperiencias.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, seguro(async () => {
    const v = await llamar(`${sitio}/version.json`).catch((e) => ({ error: String(e.message || e) }));
    const puertas = {};
    for (const p of ['/help/', '/mcp/', '/mcp/manifest.json', '/xperiencias/index.json']) {
      try { const r = await doFetch(sitio + p, { headers: { 'user-agent': 'ainimation-mcp/1.0' } }); puertas[p] = r.status; } catch { puertas[p] = 0; }
    }
    return texto({ sitio, version: v.version || null, firma: v.signature || null, commit: v.gitShort || null, publicado: v.deployedAt || null, puertas, mcp: 'https://mcp-ainimation.admira.store/mcp' });
  }));

  server.registerTool('xperiencias_listar', {
    title: 'Listar Xperiencias',
    description: 'Las Xperiencias publicadas en ainimation.studio (fuente: /xperiencias/index.json) con su duración, fps, marcadores y URL viva.',
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, seguro(async () => {
    const { actualizado, xperiencias } = await indice();
    const lista = await Promise.all(xperiencias.map(async (x) => ({ slug: x.slug, titulo: x.title, resumen: x.blurb || '', url: url(x.slug), plan: resumenPlan(await plan(x.slug).catch(() => null)) })));
    return texto({ sitio, actualizado, total: lista.length, xperiencias: lista, siguiente: 'xperiencia_detalle(slug) para plan y reglas; xperiencia_publicar(slug) para llevarla al stock de Pixeria' });
  }));

  server.registerTool('xperiencia_detalle', {
    title: 'Detalle de una Xperiencia',
    description: 'plan.json (cast, score, marcadores, duración) y rules.json (reglas XPL) de una Xperiencia, con sus URLs.',
    inputSchema: { slug: SLUG },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, seguro(async ({ slug }) => {
    const x = await entrada(slug);
    const [p, r] = await Promise.all([plan(slug), reglas(slug)]);
    return texto({ slug, titulo: x.title, resumen: x.blurb || '', url: url(slug), plan: p, reglas: r, reglas_total: r ? (Array.isArray(r) ? r.length : (r.rules || []).length) : 0, readme: `${sitio}/xperiencias/${slug}/README.md` });
  }));

  server.registerTool('xperiencia_canal_item', {
    title: 'Item de canal para admira.tv',
    description: 'El JSON de item de canal (type interactive) que admira.tv entiende para emitir esta Xperiencia en su bucle — el mismo que copia el botón «Emit on admira.tv» de la galería.',
    inputSchema: { slug: SLUG },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, seguro(async ({ slug }) => {
    const x = await entrada(slug);
    const p = await plan(slug).catch(() => null);
    return texto({ item: canalItem(x, p), como_emitir: 'admira.tv/mcp → channel_url / airtime_report; el item se añade al canal desde el CMS de admira.tv' });
  }));

  server.registerTool('stock_animaciones', {
    title: 'Animaciones en el stock de Pixeria',
    description: 'Lo que ainimation ya publicó en la biblioteca de Pixeria (categoría animaciones / motor ainimation), vía api.admira.store/stock/list.',
    inputSchema: { limite: z.number().int().min(1).max(100).optional().describe('Máximo de piezas a mirar (por defecto 50).') },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, seguro(async ({ limite = 50 }) => {
    const d = await llamar(`${stock}/stock/list?limit=${limite}`);
    const items = (d && (d.items || d.assets)) || (Array.isArray(d) ? d : []);
    const mias = items.filter((i) => /anima/i.test(String(i.category || '')) || /ainimation/i.test(String(i.motor || '')) || String(i.type || '') === 'animation' || /ainimation\.studio/.test(String(i.prompt || i.sourceUrl || '')));
    return texto({ fuente: `${stock}/stock/list`, miradas: items.length, animaciones: mias.map((i) => ({ id: i.id, titulo: i.title, tipo: i.type, motor: i.motor, categoria: i.category, mime: i.mime, url: i.url || i.sourceUrl || null })) });
  }));

  server.registerTool('xperiencia_publicar', {
    title: 'Publicar una Xperiencia en Pixeria',
    description: 'ESCRITURA (clave de flota). Lleva una Xperiencia ya existente al stock de Pixeria (api.admira.store/stock/publish) como pieza «animation» de motor ainimation, con su URL viva como fuente, para que admira.tv y el resto de la casa la usen. No crea la Xperiencia: solo la publica.',
    inputSchema: { slug: SLUG, titulo: z.string().max(120).optional().describe('Título en el stock (por defecto el de la Xperiencia).'), etiquetas: z.array(z.string().max(30)).max(10).optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, seguro(async ({ slug, titulo, etiquetas = [] }) => {
    if (!identidad) throw new Error('no autorizado: xperiencia_publicar exige la clave de flota AdmiraNeXT (Authorization: Bearer <clave>). Las lecturas siguen abiertas.');
    const x = await entrada(slug);
    const p = await plan(slug).catch(() => null);
    const body = {
      type: 'animation', motor: 'ainimation', category: 'animaciones',
      title: titulo || x.title || (p && p.title) || slug,
      prompt: url(slug), sourceUrl: url(slug), mime: 'text/html',
      comment: [p && p.durationSeconds ? `${p.durationSeconds} s` : '', p && p.fps ? `${p.fps} fps` : '', 'Xperiencia interactiva · ainimation.studio'].filter(Boolean).join(' · '),
      tags: [...new Set(['xperiencia', 'interactivo', 'ainimation', ...etiquetas])],
      by: identidad.agente, via: 'ainimation-mcp',
    };
    const r = await llamar(`${stock}/stock/publish`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }, { timeoutMs: 30_000 });
    return texto({ ok: true, publicado_por: identidad.agente, slug, stock: r, siguiente: 'declara el trabajo en yokup (mcp.admira.live · yokup_paso) y, si toca emitir, xperiencia_canal_item(slug) para admira.tv' });
  }));

  // ── Suite (7-oct-2026): Director, Admingo, carta, admira.tv, tótem del gemelo y marca ──────────
  const ESC = z.object({ movie: z.string().max(60000).optional(), frames: z.record(z.string(), z.string().max(30000)).optional(), sprites: z.record(z.string(), z.string().max(30000)).optional() });
  const scriptsDe = (fuente, scripts) => { if (scripts) return scripts; if (typeof fuente === 'string') return (fuente.includes('--@') ? Admingo_fromFile(fuente) : fuente); throw new Error('manda «fuente» (texto Admingo o fichero .admingo) o «scripts» {movie, frames, sprites}'); };
  const listar = seguro(async () => {
    const { actualizado, xperiencias } = await indice();
    const lista = await Promise.all(xperiencias.map(async (x) => ({ slug: x.slug, titulo: x.title, resumen: x.blurb || '', url: url(x.slug), plan: resumenPlan(await plan(x.slug).catch(() => null)) })));
    return texto({ sitio, actualizado, total: lista.length, xperiencias: lista, siguiente: 'xperiencia_detalle(slug) · publicar_xperiencia(slug) · enviar_a_admiratv(slug) · fijar_en_totem(slug)' });
  });

  server.registerTool('listar_xperiencias', {
    title: 'Listar Xperiencias (nombre de suite)',
    description: 'Igual que xperiencias_listar: las Xperiencias publicadas (fuente única /xperiencias/index.json) con duración, fps, marcadores y URL viva.',
    inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: true },
  }, listar);

  server.registerTool('plantillas', {
    title: 'Plantillas del Director',
    description: 'Las plantillas del menú «Plantillas» del Studio (p. ej. «Quiosco de pedidos», tótem vertical 1080×1920 con su lógica Admingo) con el enlace que las abre editables.',
    inputSchema: {}, annotations: { readOnlyHint: true, openWorldHint: false },
  }, seguro(async () => texto({ plantillas: PLANTILLAS.map((t) => ({ ...t, proyecto: t.proyecto && sitio + t.proyecto, studio: sitio + t.studio, pieza: t.pieza && sitio + t.pieza })), siguiente: 'crear_proyecto(plantilla)' })));

  server.registerTool('crear_proyecto', {
    title: 'Crear proyecto desde plantilla',
    description: 'Devuelve un proyecto del Director ({format:"ainimation-project", plan}) a partir de una plantilla, listo para Archivo → Abrir JSON en /studio.html, más el enlace que abre la plantilla directamente. No guarda nada en servidor.',
    inputSchema: { plantilla: z.enum(PLANTILLAS.map((t) => t.id)), titulo: z.string().max(120).optional(), marca: z.string().max(40).regex(/^[a-z0-9-]+$/).optional() },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, seguro(async ({ plantilla, titulo, marca }) => {
    const t = PLANTILLAS.find((x) => x.id === plantilla);
    const proyecto = t.proyecto ? await llamar(sitio + t.proyecto) : proyectoVacio(titulo);
    if (titulo) proyecto.plan.title = titulo;
    if (marca) proyecto.plan.marca = marca;
    proyecto.savedAt = new Date().toISOString();
    return texto({ plantilla, abrir_en_studio: sitio + t.studio, como_abrir: 'Studio → Archivo → Abrir JSON con este «proyecto»', proyecto });
  }));

  server.registerTool('validar_admingo', {
    title: 'Validar Admingo',
    description: 'Comprueba scripts Admingo (ES/EN, como en la ventana Script del Director) y devuelve los errores con línea y columna en castellano e inglés. Mismo compilador que el Studio.',
    inputSchema: { fuente: z.string().max(200000).optional().describe('Texto Admingo (script de película) o fichero .admingo con marcas --@'), scripts: ESC.optional() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, seguro(async ({ fuente, scripts }) => { const r = compilar(scriptsDe(fuente, scripts)); return texto({ ok: r.ok, errores: r.errores, manejadores: r.manejadores }); }));

  server.registerTool('compilar_admingo', {
    title: 'Compilar Admingo a XPL',
    description: 'Compila Admingo: los manejadores simples salen como reglas XPL (origin "admingo", las que el motor de reglas ejecuta) y el resto queda para la VM con sandbox de la pieza. Devuelve reglas, globales y manejadores.',
    inputSchema: { fuente: z.string().max(200000).optional(), scripts: ESC.optional() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, seguro(async ({ fuente, scripts }) => texto(compilar(scriptsDe(fuente, scripts)))));

  server.registerTool('publicar_xperiencia', {
    title: 'Publicar Xperiencia (URL y paquete)',
    description: 'Para una Xperiencia ya en el sitio: URL viva, ficheros (index.html, plan.json, rules.json, menu.json si hay) y el item de admira.tv. Con clave de flota y pixeria:true también la lleva al stock de Pixeria (como xperiencia_publicar). El ZIP de un proyecto propio se genera en el Studio (Publicar Xperiencia); el ZIP desde el MCP está próximamente.',
    inputSchema: { slug: SLUG, pixeria: z.boolean().optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
  }, seguro(async ({ slug, pixeria = false }) => {
    const x = await entrada(slug);
    const p = await plan(slug).catch(() => null);
    const base = url(slug);
    const ficheros = { 'index.html': base, 'plan.json': base + 'plan.json', 'rules.json': base + 'rules.json' };
    try { const r = await doFetch(base + 'menu.json', { method: 'HEAD' }); if (r.ok) ficheros['menu.json'] = base + 'menu.json'; } catch { /* sin carta */ }
    let stockR = null;
    if (pixeria) {
      if (!identidad) throw new Error('no autorizado: pixeria:true exige la clave de flota (Authorization: Bearer). Sin ella, publicar_xperiencia solo devuelve la URL.');
      stockR = await llamar(`${stock}/stock/publish`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'animation', motor: 'ainimation', category: 'animaciones', title: x.title || slug, prompt: base, sourceUrl: base, mime: 'text/html', tags: ['xperiencia', 'interactivo', 'ainimation'], by: identidad.agente, via: 'ainimation-mcp' }) }, { timeoutMs: 30_000 });
    }
    return texto({ slug, url: base, ficheros, zip: { estado: 'próximamente', hoy: `${sitio}/studio.html → Publicar Xperiencia (descarga el ZIP)` }, admiratv_item: canalItem(x, p), pixeria: stockR });
  }));

  server.registerTool('menu_validar', {
    title: 'Validar carta (menu.json)',
    description: 'Valida una carta de quiosco contra el esquema publicado (/xperiencias/kiosko-pedido/menu.schema.json) y su coherencia (ids únicos, categorías existentes, precios). Sin carta, valida la de ejemplo de Starbucks.',
    inputSchema: { menu: z.record(z.string(), z.any()).optional(), url_menu: z.string().url().optional() },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, seguro(async ({ menu, url_menu }) => {
    const esquema = await llamar(`${sitio}/xperiencias/kiosko-pedido/menu.schema.json`);
    const m = menu || await llamar(url_menu || `${sitio}/xperiencias/kiosko-pedido/menu.starbucks.json`);
    const e1 = validarEsquema(esquema, m); const { errs, avisos } = coherenciaMenu(m);
    return texto({ ok: !e1.length && !errs.length, esquema: esquema.$id, errores: [...e1, ...errs], avisos, resumen: { establecimiento: m.establishment && m.establishment.name, categorias: (m.categories || []).length, productos: (m.items || []).length, moneda: m.establishment && m.establishment.currency } });
  }));

  server.registerTool('enviar_a_admiratv', {
    title: 'Item de playlist para admira.tv',
    description: 'El item de playlist (type "interactive") de una Xperiencia, o de cualquier URL https de ainimation.studio, para emitirla en admira.tv, con el relevo a XpaceOS (playlist_add) que lo añade. El envío directo desde este MCP está próximamente: hoy entrega el JSON y la llamada exacta.',
    inputSchema: { slug: SLUG.optional(), url: z.string().url().optional(), titulo: z.string().max(120).optional(), orientacion: z.enum(['horizontal', 'vertical']).optional(), duracion_s: z.number().int().min(5).max(3600).optional() },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, seguro(async ({ slug, url: u, titulo, orientacion, duracion_s }) => {
    let item;
    if (slug) { const x = await entrada(slug); const p = await plan(slug).catch(() => null); item = canalItem(x, p); }
    else if (u) { if (!/^https:\/\//.test(u)) throw new Error('url https'); item = { id: 'xp-' + u.replace(/^https:\/\//, '').replace(/[^a-z0-9]+/gi, '-').slice(0, 60), type: 'interactive', title: 'Admira · ' + (titulo || u), url: u, tags: ['horizontal'] }; }
    else throw new Error('manda slug o url');
    if (titulo) item.title = 'Admira · ' + titulo;
    if (orientacion) item.tags = [orientacion];
    if (duracion_s) item.durationSeconds = duracion_s;
    return texto({ item, envio_directo: 'próximamente', relevo: { mcp: 'https://mcp.admira.store/mcp', herramienta: 'playlist_add', nota: 'con clave de flota; o pégalo en el CMS de admira.tv' }, comprobar: { mcp: 'https://mcp-tv.admira.store/mcp', herramienta: 'on_air' } });
  }));

  server.registerTool('fijar_en_totem', {
    title: 'Fijar en el tótem del gemelo',
    description: 'El comando del gemelo XpaceOS/admira.store para poner en el tótem vertical el Quiosco de pedido (/totem kiosko) o cualquier Xperiencia/URL https (/totem url …), con el enlace que abre el gemelo ya con el quiosco. Se ejecuta en Experto del gemelo; este MCP no lo pulsa por ti.',
    inputSchema: { slug: SLUG.optional(), url: z.string().url().optional(), store: z.string().max(80).optional(), marca: z.string().max(40).optional(), lang: z.enum(['es', 'en']).optional() },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, seguro(async ({ slug, url: u, store, marca, lang }) => {
    const kiosko = !u && (!slug || slug === 'kiosko-pedido');
    const destino = kiosko ? urlKiosko(sitio, { store: store || 'starbucks-paseo-de-gracia', marca: marca || 'starbucks', lang }) : (u || url(slug));
    if (!/^https:\/\//.test(destino)) throw new Error('el tótem solo acepta https');
    const twin = kiosko ? `${TWIN_BASE}?autostart=xtanco&visual=matrix&${TWIN_STARBUCKS}&kiosko=1` : `${TWIN_BASE}?autostart=xtanco&visual=matrix&${TWIN_STARBUCKS}`;
    return texto({ comando: kiosko ? '/totem kiosko' : `/totem url ${destino}`, url_en_totem: destino, gemelo: twin, espejo: twin.replace('https://www.xpaceos.com', 'https://admira.store'), quitar: '/totem off', contrato_postmessage: { pedido: "{source:'ainimation-xperiencia', event:'order', order}", voz: "{source:'admingo', type:'say', id, text, lang} → {type:'say-ack', id}", origen: 'solo https://www.ainimation.studio' } });
  }));

  server.registerTool('marca_aplicar', {
    title: 'Aplicar marca blanca',
    description: 'Lee la ficha de la marca en el catálogo marcablanca de admiranext (colores, logo, tipografía, modo) y devuelve la URL de la Xperiencia/quiosco con ?marca=… y el comando /marca del gemelo.',
    inputSchema: { marca: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/), slug: SLUG.optional() },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, seguro(async ({ marca, slug }) => {
    const idx = await llamar(MARCAS + 'index.json');
    const e = (idx.clientes || []).find((c) => c.id === marca);
    if (!e) throw new Error(`«${marca}» no está en el catálogo (${(idx.clientes || []).map((c) => c.id).join(', ')})`);
    const f = await llamar(MARCAS + marca + '.json').catch(() => null);
    const base = slug ? url(slug) : `${sitio}/xperiencias/kiosko-pedido/`;
    return texto({ marca, nombre: (f && f.nombre) || e.nombre, sector: e.sector, colores: f && (f.colores || f.colors) || null, logo: f && f.logo ? new URL(f.logo.svg || '', MARCAS).href : null, modo: f && f.modo, tipografia: f && f.tipografia, url: base + (base.includes('?') ? '&' : '?') + 'marca=' + marca, gemelo: `/marca ${marca}`, ficha: MARCAS + marca + '.json' });
  }));

  // ── Gestor de colas (7-oct-2026): el mismo relé que usan el quiosco, el móvil y la pantalla /cola/ ─
  const relevo = (env.COLA_API || 'https://mcp-ainimation.admira.store').replace(/\/+$/, '');
  // Dentro del worker se habla con el Durable Object directamente: pedirse a sí mismo por su dominio da 522.
  const cola = async (op, store, { query = '', body } = {}) => {
    if (!env.COLA) return llamar(`${relevo}/cola/${op}?store=${store}${query}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
    const r = await env.COLA.get(env.COLA.idFromName(store)).fetch(new Request(`https://cola/cola/${op}?store=${store}${query}`, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}));
    const d = await r.json(); if (!r.ok) throw new Error(d.error || r.status); return d;
  };
  const STO = z.string().regex(/^[a-z0-9-]{2,80}$/).default('starbucks-paseo-de-gracia');
  server.registerTool('cola_estado', {
    title: 'Estado de la cola de pedidos',
    description: 'Pedidos de una tienda en tres fases —«Recibido» (1 min), «En preparación» (1 min) y «Preparado» (listo; recogido solo a los 2 min)— cada uno con estado y fase (ES/EN), (gestor de colas del quiosco; pago siempre SIMULADO), cada uno con su «nombre» si lo dio en el quiosco, y las URL de la pantalla pública, el iPad de Admirito y la taza. Con «pedido» (A001 o id) devuelve solo ese.',
    inputSchema: { store: STO, pedido: z.string().max(64).optional() },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, seguro(async ({ store = 'starbucks-paseo-de-gracia', pedido }) => {
    const r = pedido ? await cola('pedido', store, { query: '&pedido=' + encodeURIComponent(pedido) }) : await cola('estado', store);
    return texto({ store, ...r, pantalla: `${sitio}/cola/?store=${store}`, barista: `${sitio}/cola/barista.html?store=${store}`, ipad: `${sitio}/cola/ipad.html?store=${store}`, ipad_mostrador: { url: `${sitio}/cola/ipad.html?store=${store}`, dispositivo: 'starbucks-ipad-01', gemelo: 'https://www.xpaceos.com/admira-xp/ (iPad del mostrador; pulsarlo lo abre en grande; /ipad off vuelve a la playlist)' }, taza: `${sitio}/taza/?store=${store}` });
  }));
  server.registerTool('cola_avanzar', {
    title: 'Avanzar un pedido en la cola',
    description: 'El «barista» de la demo: pasa un pedido (A001 o id) a la siguiente fase (recibido → preparando → listo «preparado» → recogido) o al que digas. Pedidos de demostración, sin dinero real.',
    inputSchema: { store: STO, pedido: z.string().min(1).max(64), a: z.enum(['recibido', 'preparando', 'listo', 'recogido']).optional() },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, seguro(async ({ store = 'starbucks-paseo-de-gracia', pedido, a }) => texto(await cola('avanzar', store, { body: { numero: pedido, a } }))));

  server.registerTool('cola_avisos', {
    title: 'Avisos de pedido listo',
    description: 'Pedidos «listos» de una tienda con el aviso que anuncian Admirito (iPad /cola/ipad.html y gemelo), la cola del móvil y la taza: «NOMBRE, tu pedido Starbucks está preparado» (sin nombre, con el número). Solo lectura; cada pantalla anuncia cada pedido una vez. Sin pedidos en recibido/preparando/listo, el iPad muestra a Admirito a pantalla completa; cualquier fase activa recupera las columnas. Empty received/preparing/ready queues show full-screen Admirito; any active phase restores queue columns. El quiosco exige el nombre antes de pagar.',
    inputSchema: { store: STO },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, seguro(async ({ store = 'starbucks-paseo-de-gracia' }) => {
    const r = await cola('estado', store);
    const avisos = (r.listo || []).map((p) => ({ numero: p.numero, nombre: p.nombre || null, fase: p.fase || 'Preparado', fase_en: p.fase_en || 'Ready', aviso: p.nombre ? `${p.nombre}, tu pedido Starbucks está preparado` : `Pedido ${p.numero}, tu pedido Starbucks está preparado`, recoger: 'en barra' }));
    return texto({ store, fases: { recibido: (r.recibido || []).length, preparando: (r.preparando || []).length, preparado: (r.listo || []).length, segundos: { recibido: r.recibido_s, preparando: r.prep_s, recoger: r.recoger_s } }, avisos, pantallas: { ipad: `${sitio}/cola/ipad.html?store=${store}`, ipad_sin_toque: `${sitio}/cola/ipad.html?store=${store}&voz=1`, movil: `${sitio}/cola/?store=${store}&pedido=<numero>`, taza: `${sitio}/taza/?store=${store}`, ipad_mostrador: { url: `${sitio}/cola/ipad.html?store=${store}`, dispositivo: 'starbucks-ipad-01', nota: 'el iPad del mostrador del gemelo enseña esta cola y al pulsarlo abre esta URL en grande' }, gemelo: 'https://www.xpaceos.com/admira-xp/ (Starbucks en escena)' }, simulado: true });
  }));

  return server;
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization, Mcp-Session-Id, Mcp-Protocol-Version' };
const json = (o, status = 200, extra = {}) => new Response(JSON.stringify(o, null, 2), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...CORS, ...extra } });

export async function manejar(request, env = {}, deps = {}) {
  const u = new URL(request.url);
  const ruta = u.pathname.replace(/\/+$/, '') || '/';
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  const sitio = limpiar(env.SITIO || 'https://www.ainimation.studio');
  if (ruta === '/' || ruta === '/salud') {
    return json({ nombre: NOMBRE, version: env.VERSION || '', sitio, endpoint_mcp: `${u.origin}/mcp`, transport: 'streamable-http',
      que_es: 'MCP de ainimation.studio: Xperiencias, plantillas del Director, Admingo, carta, admira.tv, tótem del gemelo y marca blanca como herramientas.',
      auth: 'lecturas abiertas; xperiencia_publicar con clave de flota AdmiraNeXT (Authorization: Bearer)', secretos: { MCP_FLOTA_SEED: !!env.MCP_FLOTA_SEED },
      herramientas: HERRAMIENTAS,
      documentacion: `${sitio}/mcp/`, llms: `${sitio}/mcp/llms.txt`, help_humanos: `${sitio}/help/` });
  }
  if (ruta === '/mcp') {
    if (request.method === 'GET' || request.method === 'HEAD') return new Response(null, { status: 405, headers: { ...CORS, allow: 'POST, OPTIONS', 'x-documentacion': `${sitio}/mcp/` } });
    let identidad = null;
    try { identidad = await identidadPorClave(claveDeRequest(request), env.MCP_FLOTA_SEED); } catch { identidad = null; }
    const server = crearServidor(env, deps, identidad);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    try {
      await server.connect(transport);
      const res = await transport.handleRequest(request);
      const h = new Headers(res.headers); for (const [k, v] of Object.entries(CORS)) h.set(k, v);
      return new Response(res.body, { status: res.status, headers: h });
    } finally { Promise.resolve().then(() => server.close()).catch(() => {}); }
  }
  if (ruta.startsWith('/cola/')) {
    const store = u.searchParams.get('store') || '';
    if (!STORE.test(store)) return json({ ok: false, error: 'store inválida (slug)' }, 400);
    if (!env.COLA) return json({ ok: false, error: 'cola no configurada' }, 503);
    // llamar / reiniciar (gestor de colas de admira.tv/gestorColas): solo con la clave de servicio compartida.
    if (/\/(llamar|reiniciar)$/.test(ruta) && (!env.COLA_ADMIN || request.headers.get('x-cola-admin') !== env.COLA_ADMIN)) return json({ ok: false, error: 'requiere clave de servicio' }, 403);
    const stub = env.COLA.get(env.COLA.idFromName(store));
    const r = await stub.fetch(new Request('https://cola' + ruta + u.search, { method: request.method, headers: { 'content-type': 'application/json' }, body: request.method === 'POST' ? await request.text() : undefined }));
    return new Response(r.body, { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...CORS } });
  }
  return json({ ok: false, error: 'ruta desconocida', rutas: ['/', '/salud', '/mcp', '/cola/estado', '/cola/pedido', '/cola/pagar', '/cola/avanzar', '/cola/llamar', '/cola/reiniciar'] }, 404);
}

export default { fetch: (request, env) => manejar(request, env) };
