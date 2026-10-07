import test from 'node:test';
import assert from 'node:assert/strict';
import * as A from '../src/audiencia.js';
import { manejar, HERRAMIENTAS } from '../src/index.js';
import { d1 } from './d1-shim.mjs';

const T0 = Date.UTC(2026, 9, 8, 9, 0, 0); // 11:00 en Madrid
const caras = (...l) => l.map((x) => ({ g: x[0], gc: 0.9, e: x.slice(2), dc: 0.95 }));

test('franjas de edad y horarias (Madrid)', () => {
  assert.deepEqual([5, 12.9, 13, 29, 30, 59, 60, 80].map(A.bandaEdad), ['nino', 'nino', 'joven', 'joven', 'adulto', 'adulto', 'senior', 'senior']);
  assert.equal(A.bandaEdad(NaN), null);
  assert.equal(A.franjaDe(T0), 'manana');
  assert.equal(A.franjaDe(Date.UTC(2026, 9, 8, 11, 0)), 'mediodia'); // 13:00 Madrid
  assert.equal(A.franjaDe(Date.UTC(2026, 9, 8, 21, 0)), 'noche');
});

test('segmento: individuo/grupo, género por mayoría (o mixto) y edad dominante', () => {
  assert.deepEqual(A.segmentoDe([], T0).personas, 0);
  const s1 = A.segmentoDe(caras('m_joven'), T0); assert.equal(s1.grupo, 'individuo'); assert.equal(s1.genero, 'm'); assert.equal(s1.edad, 'joven');
  const s2 = A.segmentoDe(caras('m_adulto', 'f_adulto'), T0); assert.equal(s2.grupo, 'grupo'); assert.equal(s2.genero, 'mixto'); assert.equal(s2.edad, 'adulto');
  assert.equal(A.segmentoDe(caras('f_joven', 'f_adulto', 'm_joven'), T0).genero, 'f');
});

test('semilla Starbucks: hombre/mujer, joven/adulto, individuo/grupo y caída a la general', () => {
  const doc = A.semilla('starbucks-paseo-de-gracia');
  const v = (...c) => A.elegir(doc, A.segmentoDe(caras(...c), T0)).variante;
  assert.equal(v('m_adulto', 'f_joven'), 'grupo');
  assert.equal(v('f_joven'), 'joven');
  assert.equal(v('m_senior'), 'senior');
  assert.equal(v('f_adulto'), 'mujer');
  assert.equal(v('m_adulto'), 'hombre');
  assert.equal(A.elegir(doc, { personas: 0 }).variante, 'general');
  assert.equal(A.elegir(doc, { personas: 1, grupo: 'individuo', genero: null, edad: 'adulto', franja: 'tarde' }).variante, 'adulto');
  for (const id of Object.values(doc.variantes).flatMap((x) => x.destacados)) assert.match(id, /^[a-z-]+$/);
});

test('validarReglas normaliza, rechaza variantes inexistentes y respeta prioridad', () => {
  const r = A.validarReglas({ variantes: { promo: { nombre: 'Promo <b>x</b>', destacados: ['latte', '../x'] } }, reglas: [{ id: 'a', prioridad: 10, genero: 'zz', variante: 'promo' }, { id: 'b', variante: 'nope' }] }, 'sb-qa');
  assert.equal(r.ok, false); assert.match(r.errores[0], /nope/);
  assert.equal(r.doc.variantes.promo.nombre.es, 'Promo x');
  assert.deepEqual(r.doc.variantes.promo.destacados, ['latte', '..x']);
  assert.equal(r.doc.reglas[0].genero, 'any'); assert.ok(r.doc.variantes.general);
  const d = A.validarReglas({ reglas: [{ id: 'baja', prioridad: 1, variante: 'general' }, { id: 'alta', prioridad: 5, genero: 'f', variante: 'general' }] }).doc;
  assert.equal(A.elegir(d, { personas: 1, grupo: 'individuo', genero: 'f' }).regla, 'alta');
});

test('PRIVACIDAD: lista blanca estricta; imágenes, descriptores o campos de más → error', () => {
  const base = { tipo: 'visita', id: crypto.randomUUID(), tienda: 'starbucks-qa', dispositivo: 'totem-1', origen: 'qa', inicio: T0, fin: T0 + 20000, personas: 1, caras: caras('f_joven') };
  assert.equal(A.validarEvento(base, T0 + 30000).joven, 1);
  assert.throws(() => A.validarEvento({ ...base, imagen: 'data:image/jpeg;base64,AAAA' }, T0 + 30000), /no admitidos/);
  assert.throws(() => A.validarEvento({ ...base, caras: [{ g: 'f', e: 'joven', descriptor: [0.1, 0.2] }] }, T0 + 30000), /solo \{g, gc, e, dc\}/);
  assert.throws(() => A.validarEvento({ ...base, caras: Array(11).fill({ g: 'm' }) }, T0 + 30000), /0 a 10/);
  // QA/demo nunca en la tienda real; una tienda -qa nunca guarda «real»
  assert.throws(() => A.validarEvento({ ...base, tienda: 'starbucks-paseo-de-gracia' }, T0 + 30000), /solo en tiendas de pruebas/);
  assert.equal(A.validarEvento({ ...base, origen: 'real' }, T0 + 30000).origen, 'qa');
  assert.equal(A.validarEvento({ ...base, origen: 'real', tienda: 'starbucks-paseo-de-gracia' }, T0 + 30000).origen, 'real');
});

test('simular: solo *-qa, origen demo, visitas válidas', () => {
  assert.throws(() => A.simular({ tienda: 'starbucks-paseo-de-gracia' }), /solo escribe en tiendas de pruebas/);
  const s = A.simular({ tienda: 'starbucks-qa', n: 40, horas: 10, semilla: 7, ahora: T0 });
  assert.equal(s.visitas.length, 40);
  for (const v of s.visitas) { const e = A.validarEvento(v, T0); assert.equal(e.origen, 'demo'); assert.equal(e.tienda, 'starbucks-qa'); }
});

test('D1: guardar visitas, enlazar pedido, estado, reglas y agregados por hora de Madrid', async () => {
  const db = d1();
  const id = crypto.randomUUID();
  await A.guardarEvento(db, A.validarEvento({ tipo: 'visita', id, tienda: 'starbucks-qa', dispositivo: 'totem-1', origen: 'qa', inicio: T0, fin: T0 + 30000, personas: 2, caras: caras('m_adulto', 'f_joven'), regla: 'r-grupo', variante: 'grupo' }, T0 + 60000), T0 + 60000);
  const r = await A.guardarEvento(db, A.validarEvento({ tipo: 'pedido', visita: id, tienda: 'starbucks-qa', pedido: 'ped-xyz1', pedido_num: 'A007' }), T0 + 70000);
  assert.equal(r.enlazado, true);
  await A.guardarEvento(db, A.validarEvento({ tipo: 'estado', tienda: 'starbucks-qa', dispositivo: 'totem-1', origen: 'qa', camara: 'simulada', personas: 1, grupo: 'individuo', genero: 'f', edad: 'joven', variante: 'joven', regla: 'r-joven' }, T0), T0);
  const st = await A.leerEstado(db, 'starbucks-qa', T0 + 1000); assert.equal(st.en_vivo[0].variante, 'joven'); assert.equal(st.ultimas_visitas[0].pedido_num, 'A007');
  const f = A.filtrosDe({ tienda: 'starbucks-qa', dias: 2, origen: 'qa', hasta: T0 + 3600_000 }, T0);
  const ag = A.agregar(await A.visitas(db, f), f);
  assert.equal(ag.kpis.visitas, 1); assert.equal(ag.kpis.con_pedido, 1); assert.equal(ag.kpis.conversion, 100); assert.equal(ag.genero.m, 1); assert.equal(ag.edad.joven, 1);
  assert.equal(ag.por_hora[11].visitas, 1, '09:00Z = 11:00 en Madrid'); assert.equal(ag.tamano['2'], 1); assert.equal(ag.por_variante[0].variante, 'grupo');
  assert.match(A.aCSV(await A.visitas(db, f)), /^id,tienda,.*\n.*starbucks-qa.*A007/s);
  assert.equal((await A.leerReglas(db, 'starbucks-qa')).semilla, true);
  const g = await A.guardarReglas(db, 'starbucks-qa', { reglas: [{ id: 'todo', variante: 'general' }] }, 'test', T0); assert.equal(g.ok, true);
  assert.equal((await A.leerReglas(db, 'starbucks-qa')).reglas[0].id, 'todo');
  // retención 90 días
  await A.purgar(db, T0 + 91 * A.DIA); assert.equal((await A.visitas(db, A.filtrosDe({ dias: 90, origen: 'qa' }, T0 + 91 * A.DIA))).length, 0);
});

test('HTTP /audiencia/*: reglas públicas, evento con lista blanca y origen de la casa, resumen *-qa abierto y real cerrado', async () => {
  const env = { AUDIENCIA_DB: d1() };
  const rg = await manejar(new Request('https://w.test/audiencia/reglas?tienda=starbucks-paseo-de-gracia'), env);
  assert.equal(rg.status, 200); assert.equal((await rg.json()).variantes.grupo.destacados[0], 'caffe-latte');
  const post = (p, b, origin = 'https://www.ainimation.studio') => manejar(new Request('https://w.test' + p, { method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(b) }), env);
  const ahora = Date.now();
  const ok = await post('/audiencia/evento', { tipo: 'visita', id: crypto.randomUUID(), tienda: 'starbucks-qa', dispositivo: 'totem-1', origen: 'qa', inicio: ahora - 20000, fin: ahora, personas: 1, caras: caras('f_joven'), variante: 'joven', regla: 'r-joven' });
  assert.equal(ok.status, 200);
  assert.equal((await post('/audiencia/evento', { tipo: 'visita', foto: 'x' })).status, 400);
  assert.equal((await post('/audiencia/evento', { tipo: 'estado', tienda: 'starbucks-qa', dispositivo: 'x' }, 'https://evil.example')).status, 403);
  const rs = await manejar(new Request('https://w.test/audiencia/resumen?tienda=starbucks-qa&dias=1'), env);
  assert.equal(rs.status, 200); const j = await rs.json(); assert.equal(j.kpis.visitas, 1); assert.equal(j.recientes[0].caras[0].e, 'joven');
  assert.equal((await manejar(new Request('https://w.test/audiencia/resumen?tienda=starbucks-paseo-de-gracia'), env)).status, 401);
  assert.equal((await post('/audiencia/simular', { tienda: 'starbucks-paseo-de-gracia' })).status, 400);
  const sim = await (await post('/audiencia/simular', { tienda: 'starbucks-qa', visitas: 5 })).json(); assert.equal(sim.insertadas, 5);
  assert.ok(['audiencia_estado', 'audiencia_reglas', 'audiencia_resumen', 'audiencia_simular'].every((h) => HERRAMIENTAS.includes(h)));
});
