/*
 * Herramientas de suite de ainimation-mcp (Carlos, 7-oct-2026): el Director y la carta como
 * herramientas, para que el resto de la Galaxia Admira (admira.tv, XpaceOS/admira.store, Pixeria,
 * marcablanca de admiranext) conecte con ainimation.studio sin abrir el navegador.
 * Todo aquí es CÁLCULO o LECTURA: no se escribe en ningún sitio (la única escritura sigue siendo
 * xperiencia_publicar → Pixeria, con clave de flota). Admingo compila con el MISMO assets/admingo.js
 * que corre en el Studio y en las piezas publicadas.
 */
import AdmingoMod from '../../../assets/admingo.js';
export const Admingo = AdmingoMod || globalThis.Admingo;

export const TWIN_BASE = 'https://www.xpaceos.com/admira-xp/';
export const TWIN_STARBUCKS = 'loc=alsea-sbux-021';
export const MARCAS = 'https://www.admiranext.com/marcablanca/clientes/';

/** Plantillas del Director (menú «Plantillas» del Studio). Fuente del proyecto: /plantillas/<id>.json */
export const PLANTILLAS = [
  { id: 'quiosco-de-pedidos', titulo: { es: 'Quiosco de pedidos', en: 'Ordering kiosk' }, escenario: '1080x1920', marca: 'starbucks',
    resumen: { es: 'Atracción → categorías → producto con tamaño → carrito → pago QR SIMULADO → número de pedido → reposo. Lógica en Admingo.', en: 'Attract → categories → item with size → cart → SIMULATED QR pay → order number → idle reset. Logic in Admingo.' },
    proyecto: '/plantillas/quiosco-de-pedidos.json', studio: '/studio.html?plantilla=quiosco', pieza: '/xperiencias/kiosko-pedido/' },
  { id: 'vacio', titulo: { es: 'Proyecto vacío', en: 'Blank project' }, escenario: '1920x1080', marca: null,
    resumen: { es: 'Archivo → Nuevo: escenario 16:9, sin cast ni marcas.', en: 'File → New: 16:9 stage, no cast or markers.' },
    proyecto: null, studio: '/studio.html', pieza: null },
];

export function proyectoVacio(titulo = 'Proyecto nuevo') {
  return { format: 'ainimation-project', version: 1, plan: { title: titulo, stage: { w: 1920, h: 1080 }, totalFrames: 240, durationSeconds: 10, cast: [], stageItems: [], markers: [], rules: [], scripts: { movie: '', frames: {}, sprites: {} } } };
}

/** Admingo: errores con línea/columna y, si compila, reglas XPL + manejadores interpretados. */
export function compilar(scripts) {
  const s = typeof scripts === 'string' ? { movie: scripts, frames: {}, sprites: {} } : { movie: scripts.movie || '', frames: scripts.frames || {}, sprites: scripts.sprites || {} };
  const prog = Admingo.compileScripts(s);
  const manejadores = {};
  const nombres = (o) => Object.keys((o && o.handlers) || {});
  manejadores.movie = nombres(prog.movie);
  for (const [k, v] of Object.entries(prog.frames || {})) manejadores['frame:' + k] = nombres(v);
  for (const [k, v] of Object.entries(prog.sprites || {})) manejadores['sprite:' + k] = nombres(v);
  return { ok: !prog.errors.length, errores: prog.errors, globales: prog.globals, manejadores, reglas_xpl: prog.rules, reglas_total: prog.rules.length };
}

/** Validador JSON Schema mínimo (type, required, properties, items, enum, const, $ref local). */
export function validarEsquema(schema, data) {
  const errs = [];
  const tipo = (v) => Array.isArray(v) ? 'array' : v === null ? 'null' : Number.isInteger(v) ? 'integer' : typeof v;
  const ref = (r) => r.replace(/^#\//, '').split('/').reduce((o, k) => o && o[k], schema);
  function v(s, d, p) {
    if (!s || errs.length > 50) return;
    if (s.$ref) return v(ref(s.$ref), d, p);
    if ('const' in s && d !== s.const) errs.push(`${p}: debe ser ${JSON.stringify(s.const)}`);
    if (s.enum && !s.enum.includes(d)) errs.push(`${p}: debe ser uno de ${s.enum.join(', ')}`);
    if (s.type) { const t = tipo(d); const ok = [].concat(s.type).some((x) => x === t || (x === 'number' && t === 'integer')); if (!ok) return errs.push(`${p}: se esperaba ${s.type} y llega ${t}`); }
    if (tipo(d) === 'object') {
      for (const k of s.required || []) if (!(k in d)) errs.push(`${p}: falta «${k}»`);
      for (const [k, sub] of Object.entries(s.properties || {})) if (k in d) v(sub, d[k], `${p}.${k}`);
    }
    if (Array.isArray(d) && s.items) d.forEach((x, i) => v(s.items, x, `${p}[${i}]`));
    if (typeof d === 'number' && typeof s.minimum === 'number' && d < s.minimum) errs.push(`${p}: mínimo ${s.minimum}`);
  }
  v(schema, data, '$');
  return errs;
}

/** Coherencia de carta que el esquema no ve: ids únicos y categorías/grupos referenciados. */
export function coherenciaMenu(m) {
  const errs = [], avisos = [];
  const cats = new Set((m.categories || []).map((c) => c.id));
  const ids = new Set();
  for (const it of m.items || []) {
    if (ids.has(it.id)) errs.push(`items: id repetido «${it.id}»`); ids.add(it.id);
    const cs = [].concat(it.category || it.categories || []);
    for (const c of cs) if (!cats.has(c)) errs.push(`items.${it.id}: categoría «${c}» no existe`);
    if (typeof it.price === 'number' && it.price < 0) errs.push(`items.${it.id}: precio negativo`);
    if (it.name && !it.name.en) avisos.push(`items.${it.id}: falta el nombre en inglés`);
  }
  if (m.example !== false) avisos.push('carta de EJEMPLO (precios ficticios): example ≠ false');
  return { errs, avisos };
}

export function urlKiosko(sitio, { store, marca, lang, host } = {}) {
  const q = new URLSearchParams();
  if (store) q.set('store', store); if (marca) q.set('marca', marca); if (lang) q.set('lang', lang); if (host) q.set('host', host);
  const s = q.toString();
  return `${sitio}/xperiencias/kiosko-pedido/${s ? '?' + s : ''}`;
}
