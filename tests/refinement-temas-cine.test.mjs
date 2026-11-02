import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {TEMAS,TEMA_IDS,contraste,pintarCineCanvas,sonarTema} from '../presentaciones/editor/temas-cine.mjs';
import {generatorProject,nativeEdits,confirmSaved} from '../presentaciones/editor/generator.mjs';
import {editField,changesBetween} from '../presentaciones/editor/project.mjs';
const read=f=>readFile(new URL('../'+f,import.meta.url),'utf8');
const PROHIBIDO=/netflix|stranger\s*things|wednesday|merlina|al\s+este\s+del\s+ed[eé]n|east\s+of\s+eden|reina\s+del\s+flow|bridgerton|logo\s+oficial/i;
const ideas=()=>({client:'sample-proposal',updatedAt:'r1',accent:'#00aa11',hero:{title:'Título'},objective:'O',skeleton:[{id:'a',title:'A',message:'m',align:'center'},{id:'b',title:'B'}],closing:{title:'C',action:'X'},translations:{}});
test('5 temas, lista cerrada y AA',()=>{
  assert.deepEqual(TEMA_IDS,['ochenta-mundo-del-reves','academia-gotica','epica-familiar-1950','urbano-colombiano-neon','regencia-romantica']);
  for(const t of Object.values(TEMAS)){assert.ok(contraste(t.colores.texto,t.colores.fondo)>=4.5);assert.ok(contraste(t.colores.textoSuave,t.colores.fondo)>=4.5);assert.ok(!('acento' in t.colores));}
});
test('ningún texto visible nombra la plataforma ni las series',async()=>{
  for(const t of Object.values(TEMAS))for(const s of [t.nombre,t.descripcion,t.sonido?.descripcion||''])assert.doesNotMatch(s,PROHIBIDO,t.id);
  for(const f of ['presentaciones/editor/index.html','presentaciones/editor/editor.mjs','presentaciones/editor/preview.mjs','presentaciones/editor/cine.css'])assert.doesNotMatch(await read(f),PROHIBIDO,f);
});
test('el conector lee y envía tema aparte; textos, acento y alineación intactos',()=>{
  const p=generatorProject({...ideas(),tema:'academia-gotica'});assert.equal(p.document.components.style.tema,'academia-gotica');assert.equal(p.document.components.style.accent,'#00aa11');
  assert.equal(generatorProject({...ideas(),tema:'inventado'}).document.components.style.tema,'ninguno');
  const q=generatorProject(ideas()),out=nativeEdits(q,changesBetween(q,editField(q,'style-tema','urbano-colombiano-neon')));
  assert.deepEqual(out.layout,{tema:'urbano-colombiano-neon'});assert.equal(out.edits.length,0);
  const ack={ok:true,revision:'r2'},after={...ideas(),updatedAt:'r2',tema:'urbano-colombiano-neon'};
  const actual=confirmSaved(q,changesBetween(q,editField(q,'style-tema','urbano-colombiano-neon')),ack,after);
  assert.equal(actual.document.components['block-0'].align,'center');assert.equal(actual.document.components.style.accent,'#00aa11');assert.equal(actual.document.components['block-0'].title,'A');
  assert.throws(()=>editField(q,'style-tema','otro'));
});
test('la capa de canvas pinta y el sonido es sintético y solo bajo demanda',async()=>{
  const ops=[];const ctx=new Proxy({},{get:(_,k)=>k==='createRadialGradient'?()=>({addColorStop(){}}):(...a)=>ops.push(k),set:()=>true});
  assert.equal(pintarCineCanvas(ctx,'ninguno'),false);assert.equal(pintarCineCanvas(ctx,'academia-gotica',1280,720,()=>.5),true);assert.ok(ops.includes('fillRect'));
  assert.equal(typeof sonarTema('academia-gotica',undefined),'function');
  const html=await read('presentaciones/editor/index.html');assert.match(html,/id="tema-sound"[^>]*aria-pressed="false"/);assert.doesNotMatch(html,/<audio|autoplay/i);
  const mod=await read('presentaciones/editor/temas-cine.mjs');assert.doesNotMatch(mod,/\.mp3|\.ogg|\.wav|new Audio\(/);
});
