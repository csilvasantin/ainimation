// Xperiencias en Admira Director: lógica pura + ventana con jsdom. node --test tests/xperiencia-director.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { XPERIENCIAS, urlVentana, aceptaMensaje, tipoMensaje, valorCampo, normalizar, diferencia, resumenEstado, PREFIJO } from '../assets/xperiencia-ajuste.mjs';
import { mountXperienciaWindow } from '../assets/director-xperiencia.mjs';

const ESQUEMA = {
  id: 'vuelta-al-95', version: 1, grupos: [
    { id: 'general', titulo: { es: 'General', en: 'General' }, campos: [
      { ruta: 'visitor', tipo: 'text', max: 40, etiqueta: { es: 'Visita', en: 'Visitor' } },
      { ruta: 'idleSeconds', tipo: 'number', min: 10, max: 900, entero: true, etiqueta: { es: 'Segundos', en: 'Seconds' } },
      { ruta: 'names.player', tipo: 'text', max: 40, etiqueta: { es: 'Reproductor', en: 'Player' } },
      { ruta: 'mediaPlayer.tags', tipo: 'tags', max: 6, etiqueta: { es: 'Hashtags', en: 'Hashtags' } },
      { ruta: 'icqgram.enabled', tipo: 'bool', etiqueta: { es: 'En línea', en: 'Online' } },
    ] },
    { id: 'pistas', titulo: { es: 'Pistas', en: 'Tracks' }, campos: [
      { ruta: 'tracks', tipo: 'list', min: 1, max: 3, etiqueta: { es: 'Pistas', en: 'Tracks' }, item: [
        { ruta: 'title', tipo: 'text', max: 60, etiqueta: { es: 'Título', en: 'Title' } },
        { ruta: 'style', tipo: 'select', opciones: ['chill', 'house'], etiqueta: { es: 'Estilo', en: 'Style' } },
        { ruta: 'bpm', tipo: 'number', min: 60, max: 200, entero: true, etiqueta: { es: 'BPM', en: 'BPM' } },
      ] },
    ] },
  ],
};
const FABRICA = { visitor: '', idleSeconds: 60, names: { player: 'Winamp' }, mediaPlayer: { tags: ['win95', 'genero95'] }, icqgram: { enabled: true }, tracks: [{ title: 'Ambient', style: 'chill', bpm: 92 }] };

test('la ventana se abre con director=1 y el origen del Director; sólo se escucha a esa ventana y origen', () => {
  const xp = XPERIENCIAS[0];
  const u = new URL(urlVentana(xp, 'https://www.ainimation.studio'));
  assert.equal(u.origin + u.pathname, 'https://www.admira.live/windows95');
  assert.equal(u.searchParams.get('director'), '1');
  assert.equal(u.searchParams.get('origen'), 'https://www.ainimation.studio');
  const ventana = {};
  const ok = { source: ventana, origin: 'https://www.admira.live', data: { type: PREFIJO + 'estado', id: 'vuelta-al-95' } };
  assert.equal(aceptaMensaje(ok, { ventana, origen: xp.origen, id: xp.id }), true);
  assert.equal(aceptaMensaje({ ...ok, source: {} }, { ventana, origen: xp.origen, id: xp.id }), false);
  assert.equal(aceptaMensaje({ ...ok, origin: 'https://evil.example' }, { ventana, origen: xp.origen, id: xp.id }), false);
  assert.equal(aceptaMensaje({ ...ok, data: { type: 'otra:cosa' } }, { ventana, origen: xp.origen, id: xp.id }), false);
  assert.equal(aceptaMensaje({ ...ok, data: { type: PREFIJO + 'estado', id: 'otra' } }, { ventana, origen: xp.origen, id: xp.id }), false);
  assert.equal(tipoMensaje(ok.data), 'estado');
});

test('valores, normalización y diferencia respecto a fábrica', () => {
  const campo = ESQUEMA.grupos[0].campos[1];
  assert.equal(valorCampo(campo, {}, FABRICA), 60);
  assert.equal(valorCampo(campo, { idleSeconds: 45 }, FABRICA), 45);
  assert.equal(valorCampo(ESQUEMA.grupos[1].campos[0], {}, {}).length, 0);
  assert.equal(normalizar(campo, ' 45.6 '), 46);
  assert.equal(normalizar(campo, 'x'), 10);
  assert.deepEqual(normalizar(ESQUEMA.grupos[0].campos[3], '#win95, genero95,, '), ['win95', 'genero95']);
  assert.equal(normalizar(ESQUEMA.grupos[0].campos[4], 'on'), true);
  assert.deepEqual(normalizar(ESQUEMA.grupos[1].campos[0], [{ title: ' A ', style: 'house', bpm: '120' }]), [{ title: 'A', style: 'house', bpm: 120 }]);
  const d = diferencia({ visitor: 'Carlos', idleSeconds: 60, names: { player: 'Winamp' }, mediaPlayer: { tags: ['win95', 'genero95'] }, icqgram: { enabled: false }, tracks: FABRICA.tracks }, FABRICA, ESQUEMA);
  assert.deepEqual(d, { visitor: 'Carlos', icqgram: { enabled: false } });
  assert.match(resumenEstado({ at: null }, 'es'), /fábrica/);
  assert.match(resumenEstado({ at: '2026-11-25T18:00:00Z', by: 'Carlos', borrador: true }, 'en'), /Saved by Carlos .* draft/);
});

function montar() {
  const dom = new JSDOM('<!doctype html><html lang="es"><body><section data-window="xperiencia"><div class="xperiencia-editor"></div></section></body></html>', { url: 'https://www.ainimation.studio/studio.html' });
  const { window: win } = dom;
  const enviados = [];
  const ventana = { closed: false, postMessage: (data, origen) => enviados.push({ data, origen }), focus() {} };
  const abiertas = [];
  const panel = mountXperienciaWindow({ doc: win.document, win, abrir: (url, nombre) => { abiertas.push({ url, nombre }); return ventana; } });
  const mensaje = (data, over = {}) => { const ev = new win.MessageEvent('message', { data, origin: 'https://www.admira.live', ...over }); Object.defineProperty(ev, 'source', { value: over.source ?? ventana }); win.dispatchEvent(ev); };
  return { win, panel, enviados, abiertas, ventana, mensaje, q: (s) => win.document.querySelector(s), qa: (s) => [...win.document.querySelectorAll(s)] };
}

test('Director abre la ventana, pide el estado al «hola», pinta el esquema y manda sólo lo que cambia', () => {
  const f = montar();
  f.q('.xp-head .button').click();
  assert.equal(f.abiertas.length, 1);
  assert.match(f.abiertas[0].url, /windows95\?director=1&origen=https%3A%2F%2Fwww\.ainimation\.studio/);
  f.mensaje({ type: PREFIJO + 'hola', id: 'vuelta-al-95' });
  assert.deepEqual(f.enviados.at(-1), { data: { type: PREFIJO + 'estado?', id: 'vuelta-al-95' }, origen: 'https://www.admira.live' });
  f.mensaje({ type: PREFIJO + 'estado', id: 'vuelta-al-95', esquema: ESQUEMA, fabrica: FABRICA, guardado: { visitor: 'Jobs' }, ajuste: { visitor: 'Jobs' }, at: '2026-11-25T18:00:00Z', by: 'Carlos', borrador: false });
  assert.equal(f.q('.xp-form').hidden, false);
  assert.equal(f.q('[data-ruta="visitor"]').value, 'Jobs');
  assert.equal(f.q('[data-ruta="idleSeconds"]').value, '60');
  assert.equal(f.q('[data-ruta="mediaPlayer.tags"]').value, 'win95, genero95');
  assert.equal(f.qa('.xp-row').length, 1);
  assert.match(f.q('.xp-status').textContent, /Guardado por Carlos/);
  f.q('[data-ruta="visitor"]').value = 'Carlos';
  f.q('[data-ruta="idleSeconds"]').value = '120';
  f.q('[data-ruta="icqgram.enabled"]').checked = false;
  f.q('.xp-list .xp-add').click(); // + Añadir
  const fila = f.qa('.xp-row')[1];
  fila.querySelector('[data-ruta="tracks.title"]').value = 'Nueva';
  fila.querySelector('[data-ruta="tracks.style"]').value = 'house';
  fila.querySelector('[data-ruta="tracks.bpm"]').value = '122';
  assert.deepEqual(f.panel.recoger(), { visitor: 'Carlos', idleSeconds: 120, icqgram: { enabled: false }, tracks: [{ title: 'Ambient', style: 'chill', bpm: 92 }, { title: 'Nueva', style: 'house', bpm: 122 }] });
  f.qa('.xp-foot .button')[0].click(); // Aplicar
  assert.equal(f.enviados.at(-1).data.type, PREFIJO + 'aplicar');
  assert.deepEqual(f.enviados.at(-1).data.ajuste, f.panel.recoger());
  f.qa('.xp-foot button')[1].click(); // Guardar
  assert.equal(f.enviados.at(-1).data.type, PREFIJO + 'guardar');
  f.mensaje({ type: PREFIJO + 'guardado', id: 'vuelta-al-95', ok: true, at: '2026-11-25T18:05:00Z', by: 'Carlos', errores: [] });
  assert.match(f.q('.xp-status').textContent, /Guardado en admira.live · Carlos/);
  f.mensaje({ type: PREFIJO + 'guardado', id: 'vuelta-al-95', ok: false, error: 'sesion' });
  assert.match(f.q('.xp-status').textContent, /No se pudo guardar: sesion/);
  f.panel.cerrar(); f.win.close();
});

test('mensajes de otra ventana u origen no tocan el formulario; Deshacer vuelve al estado recibido', () => {
  const f = montar();
  f.q('.xp-head .button').click();
  f.mensaje({ type: PREFIJO + 'estado', id: 'vuelta-al-95', esquema: ESQUEMA, fabrica: FABRICA, ajuste: {}, at: null });
  f.mensaje({ type: PREFIJO + 'estado', id: 'vuelta-al-95', esquema: ESQUEMA, fabrica: FABRICA, ajuste: { visitor: 'Intruso' }, at: null }, { origin: 'https://evil.example' });
  f.mensaje({ type: PREFIJO + 'estado', id: 'vuelta-al-95', esquema: ESQUEMA, fabrica: FABRICA, ajuste: { visitor: 'Otro' }, at: null }, { source: {} });
  assert.equal(f.q('[data-ruta="visitor"]').value, '');
  f.q('[data-ruta="visitor"]').value = 'Cambio';
  f.qa('.xp-foot button')[2].click(); // Deshacer
  assert.equal(f.q('[data-ruta="visitor"]').value, '');
  assert.equal(f.enviados.filter((m) => m.data.type === PREFIJO + 'aplicar').length, 0);
  f.panel.cerrar(); f.win.close();
});
