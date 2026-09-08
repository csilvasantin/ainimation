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

export const NOMBRE = 'ainimation';
const limpiar = (s) => String(s || '').replace(/\/+$/, '');
const texto = (o) => ({ content: [{ type: 'text', text: typeof o === 'string' ? o : JSON.stringify(o, null, 2) }] });
const fallo = (e) => ({ isError: true, content: [{ type: 'text', text: 'Error: ' + (e && e.message || e) }] });
const seguro = (fn) => async (args) => { try { return await fn(args || {}); } catch (e) { return fallo(e); } };
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
      que_es: 'MCP de ainimation.studio: las Xperiencias del estudio como herramientas (listar, leer, item de canal, stock, publicar).',
      auth: 'lecturas abiertas; xperiencia_publicar con clave de flota AdmiraNeXT (Authorization: Bearer)', secretos: { MCP_FLOTA_SEED: !!env.MCP_FLOTA_SEED },
      herramientas: ['quien_soy', 'sitio_estado', 'xperiencias_listar', 'xperiencia_detalle', 'xperiencia_canal_item', 'stock_animaciones', 'xperiencia_publicar'],
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
  return json({ ok: false, error: 'ruta desconocida', rutas: ['/', '/salud', '/mcp'] }, 404);
}

export default { fetch: (request, env) => manejar(request, env) };
