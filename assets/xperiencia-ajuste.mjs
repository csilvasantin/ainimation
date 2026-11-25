// Xperiencias en Admira Director · lógica pura (DeepAgent Neo, 25-nov-2026). Probado en node
// (tests/xperiencia-director.test.mjs). Una Xperiencia es una página viva de otro dominio (la primera:
// «Vuelta al 95» en admira.live/windows95) que publica un esquema de ajuste; el Director la abre en una
// ventana, pinta un formulario con ese esquema y le devuelve el ajuste por postMessage. La página guarda
// con su propia sesión: el Director nunca ve credenciales ni habla con la API de la otra casa.
export const PREFIJO = 'admira:xperiencia:';

export const XPERIENCIAS = Object.freeze([
  { id: 'vuelta-al-95', nombre: { es: 'Vuelta al 95 · admira.live/windows95', en: 'Back to 95 · admira.live/windows95' }, url: 'https://www.admira.live/windows95', origen: 'https://www.admira.live' },
]);

export function xperiencia(id) {
  return XPERIENCIAS.find((x) => x.id === id) || XPERIENCIAS[0];
}

/** URL con la que el Director abre la ventana: la página sabe así a qué origen contestar. */
export function urlVentana(xp, origenDirector) {
  const u = new URL(xp.url);
  u.searchParams.set('director', '1');
  u.searchParams.set('origen', origenDirector);
  return u.toString();
}

/** Sólo se escucha a la ventana que abrimos, desde el origen de la Xperiencia, con mensajes de su id. */
export function aceptaMensaje(event, { ventana, origen, id }) {
  if (!event || event.origin !== origen) return false;
  const d = event.data;
  if (!d || typeof d.type !== 'string' || !d.type.startsWith(PREFIJO)) return false;
  if (d.id && d.id !== id) return false;
  // Sin ventana propia (la abrió la persona por el enlace, o el navegador bloqueó window.open) sólo se
  // admite el «hola» de una ventana del origen de la Xperiencia: el Director la adopta como suya.
  if (!ventana) return d.type === PREFIJO + 'hola' && !!event.source;
  return event.source === ventana;
}

export function tipoMensaje(data) {
  return String(data?.type || '').slice(PREFIJO.length);
}

export function texto(obj, lang) {
  if (obj == null) return '';
  if (typeof obj === 'string') return obj;
  return obj[lang === 'en' ? 'en' : 'es'] || obj.es || obj.en || '';
}

export function leerRuta(obj, ruta) {
  return String(ruta).split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
}

export function escribirRuta(obj, ruta, valor) {
  const partes = String(ruta).split('.');
  let o = obj;
  for (const k of partes.slice(0, -1)) {
    if (!o[k] || typeof o[k] !== 'object' || Array.isArray(o[k])) o[k] = {};
    o = o[k];
  }
  o[partes[partes.length - 1]] = valor;
  return obj;
}

export function campos(esquema) {
  return (esquema?.grupos || []).flatMap((g) => g.campos || []);
}

function vacio(campo) {
  switch (campo.tipo) {
    case 'number': return campo.min ?? 0;
    case 'bool': return false;
    case 'select': return campo.opciones?.[0] ?? '';
    case 'tags': case 'list': return [];
    default: return '';
  }
}

/** Valor que enseña el formulario: el ajuste vigente, si no el de fábrica, si no el vacío del tipo. */
export function valorCampo(campo, ajuste, fabrica) {
  const v = leerRuta(ajuste, campo.ruta);
  if (v !== undefined) return v;
  const f = leerRuta(fabrica, campo.ruta);
  return f !== undefined ? f : vacio(campo);
}

/** Convierte lo que escribe la persona (cadenas del formulario) al tipo del campo. */
export function normalizar(campo, bruto) {
  switch (campo.tipo) {
    case 'number': {
      const n = Number(String(bruto ?? '').trim());
      return Number.isFinite(n) ? (campo.entero ? Math.round(n) : n) : vacio(campo);
    }
    case 'bool': return bruto === true || bruto === 'true' || bruto === 'on' || bruto === 1;
    case 'tags': return (Array.isArray(bruto) ? bruto : String(bruto ?? '').split(/[,\n]+/)).map((s) => String(s).trim().replace(/^#/, '')).filter(Boolean);
    case 'list': return (Array.isArray(bruto) ? bruto : []).map((fila) => Object.fromEntries((campo.item || []).map((ci) => [ci.ruta, normalizar(ci, fila?.[ci.ruta])])));
    default: return String(bruto ?? '').trim();
  }
}

const igual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Lo que de verdad cambia respecto a fábrica: eso es el ajuste que se aplica y se guarda. Fábrica se compara
 *  normalizada por el mismo camino que el formulario (las pistas de fábrica llevan parámetros de síntesis y
 *  los contactos pueden no tener «status»): si la persona no toca una lista, no viaja. */
export function diferencia(valores, fabrica, esquema) {
  const out = {};
  for (const c of campos(esquema)) {
    const v = leerRuta(valores, c.ruta);
    if (v === undefined) continue;
    const f = leerRuta(fabrica, c.ruta);
    if (!igual(v, f === undefined ? undefined : normalizar(c, f))) escribirRuta(out, c.ruta, v);
  }
  return out;
}

export function hayCambios(a, b) {
  return !igual(a, b);
}

export function resumenEstado(estado, lang) {
  const t = (es, en) => (lang === 'en' ? en : es);
  if (!estado) return t('Sin señal de la Xperiencia', 'No signal from the Xperience');
  const partes = [];
  if (estado.at) {
    const fecha = new Date(estado.at);
    const cuando = Number.isNaN(fecha.getTime()) ? String(estado.at) : fecha.toLocaleString(lang === 'en' ? 'en-GB' : 'es-ES', { dateStyle: 'short', timeStyle: 'short' });
    partes.push(t('Guardado por ' + (estado.by || '—') + ' el ' + cuando, 'Saved by ' + (estado.by || '—') + ' on ' + cuando));
  } else partes.push(t('Sin ajuste guardado: valores de fábrica', 'Nothing saved: factory values'));
  if (estado.borrador) partes.push(t('borrador aplicado sin guardar', 'draft applied, not saved'));
  return partes.join(' · ');
}
