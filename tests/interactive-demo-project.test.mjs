import test from 'node:test';
import assert from 'node:assert/strict';
import {demoProject,createDemoCopy} from '../assets/interactive-demo-project.mjs';
import {loadLibrary,readLibrary,createProject,updateProject,LIBRARY_KEY} from '../assets/interactive-library.mjs';
import {validate,KEY,template} from '../assets/interactive-project.mjs';
const memory=()=>{const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};

test('el ejemplo del vídeo tiene tres pantallas, cuatro botones y recorrido completo',()=>{
  const p=validate(demoProject());assert.equal(p.scenes.length,3);assert.equal(p.scenes.reduce((n,s)=>n+s.buttons.length,0),4);
  const go=(id,label)=>p.scenes.find(s=>s.id===id).buttons.find(b=>b.label===label).target;
  assert.equal(go(go(go(go(p.start,'Ver la carta'),'Descubrir Espresso'),'Volver a la carta'),'Volver al inicio'),p.start);
  p.scenes[0].title='Solo esta instancia';assert.equal(demoProject().scenes[0].title,'Tu pausa empieza aquí');
});
test('crear y recargar añade una copia sin revisar ni alterar ningún registro anterior',()=>{
  const s=memory();s.setItem(KEY,JSON.stringify(template()));loadLibrary(s);createProject(s,template('blank'));
  const before=readLibrary(s).data;before.extra={keep:true};before.projects[0].extra='campo ajeno';s.setItem(LIBRARY_KEY,JSON.stringify(before));
  const draft=s.getItem(KEY),result=createDemoCopy(s);assert.ok(result.ok);
  assert.deepEqual(result.data.projects.slice(0,-1),before.projects);assert.deepEqual(result.data.extra,before.extra);assert.equal(s.getItem(KEY),draft);
  const copy=result.data.projects.at(-1);assert.equal(result.data.activeId,copy.id);assert.notEqual(copy.id,before.activeId);assert.equal(copy.revision,1);assert.equal(copy.project.title,'Demo · Mi cafetería · copia');
  assert.deepEqual(loadLibrary(s).data,result.data);
});
test('las copias se nombran por separado y editar una conserva el ejemplo y el resto',()=>{
  const s=memory();loadLibrary(s);const a=createDemoCopy(s).data.projects.at(-1);const b=createDemoCopy(s).data.projects.at(-1);
  assert.notEqual(a.id,b.id);assert.equal(b.project.title,'Demo · Mi cafetería · copia 2');
  const edited=structuredClone(b.project);edited.scenes[0].body='Mi propia bienvenida';assert.ok(updateProject(s,b.id,edited,b.revision).ok);
  assert.deepEqual(readLibrary(s).data.projects.find(x=>x.id===a.id),a);assert.equal(demoProject().scenes[0].body,'Crea tu momento. Descubre nuestra carta de café.');
});
test('cambios pendientes, cuota agotada, corrupción y límite de biblioteca conservan los datos',()=>{
  const s=memory();loadLibrary(s);const before=s.getItem(LIBRARY_KEY);
  assert.equal(createDemoCopy(s,{hasUnsavedWork:true}).ok,false);assert.equal(s.getItem(LIBRARY_KEY),before);
  const put=s.setItem;s.setItem=()=>{throw Error('quota');};assert.equal(createDemoCopy(s).ok,false);assert.equal(s.getItem(LIBRARY_KEY),before);s.setItem=put;
  s.setItem(LIBRARY_KEY,'corrupto');assert.equal(createDemoCopy(s).ok,false);assert.equal(s.getItem(LIBRARY_KEY),'corrupto');
  const data=JSON.parse(before);data.projects=Array.from({length:100},(_,i)=>({...structuredClone(data.projects[0]),id:'p'+i}));data.activeId='p0';s.setItem(LIBRARY_KEY,JSON.stringify(data));
  const full=s.getItem(LIBRARY_KEY);assert.equal(createDemoCopy(s).ok,false);assert.equal(s.getItem(LIBRARY_KEY),full);
});
