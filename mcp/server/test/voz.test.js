import test from 'node:test'; import assert from 'node:assert/strict';
import { voz, vozId, VOZ_ADMIRITO, limpiaTexto } from '../src/voz.js';
function memCache(){ const m=new Map(); return { match: async k=>m.has(k.url)?new Response(m.get(k.url),{headers:{'content-type':'audio/mpeg'}}):undefined, put: async (k,r)=>{ m.set(k.url, await r.arrayBuffer()); } }; }
test('voz: genera, cachea y no repite la síntesis', async () => {
  let n=0; const deps={ cache: memCache(), sintetizar: async()=>{ n++; return new Uint8Array([1,2,3]).buffer; } };
  const req=()=>new Request('https://x/voz?texto=Hola%20Carlos', { headers:{ origin:'https://www.ainimation.studio' } });
  const a=await voz(req(),{},deps); assert.equal(a.status,200); assert.equal(a.headers.get('content-type'),'audio/mpeg'); assert.equal(a.headers.get('x-voz-cache'),'miss');
  const b=await voz(req(),{},deps); assert.equal(b.headers.get('x-voz-cache'),'hit'); assert.equal(n,1);
});
test('voz: origen ajeno no gasta créditos; sin motor → 503', async () => {
  const r=await voz(new Request('https://x/voz?texto=hola',{headers:{origin:'https://evil.example'}}),{},{cache:memCache()}); assert.equal(r.status,403);
  const s=await voz(new Request('https://x/voz?texto=hola',{headers:{origin:'https://www.admira.store'}}),{},{cache:memCache()}); assert.equal(s.status,503);
});
test('voz: ids y textos saneados', () => { assert.equal(vozId('raquel'),'1eHrpOW5l98cxiSRjbzJ'); assert.equal(vozId('<x>'),VOZ_ADMIRITO); assert.equal(limpiaTexto('a'.repeat(999)).length,240); });
