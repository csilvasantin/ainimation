import test from 'node:test';
import assert from 'node:assert/strict';
import {syncLibrary} from '../assets/interactive-cloud.mjs';
import {createDemoCopy} from '../assets/interactive-demo-project.mjs';
import {loadLibrary,readLibrary,createProject,updateProject,openProject} from '../assets/interactive-library.mjs';
import {template} from '../assets/interactive-project.mjs';
const memory=()=>{const data=new Map();return{getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};};

test('copia de demo: ordenador → nube → móvil → ordenador; sin subir ni revisar proyectos ajenos',async()=>{
  const desktop=memory(),mobile=memory();loadLibrary(desktop);createProject(desktop,template('blank'));
  const originals=readLibrary(desktop).data.projects,cloud=new Map(originals.map(r=>[r.id,structuredClone(r)])),writes=[];
  const request=async(url,options)=>{
    if(!options.method)return Response.json({account:'carlos',projects:[...cloud.values()]});
    const data=JSON.parse(options.body),id=url.split('/').at(-1),old=cloud.get(id);
    assert.equal(data.baseRevision,old?.revision||0);writes.push(id);
    const revision=data.baseRevision+1;cloud.set(id,{id,revision,project:data.project,updatedAt:'2026-10-21T20:00:00Z'});
    return Response.json({revision});
  };
  const copy=createDemoCopy(desktop).data.projects.at(-1),endpoint='https://cloud.test';
  await syncLibrary(desktop,endpoint,'google',request,{projectId:copy.id});
  const localMobile=loadLibrary(mobile).data.projects[0];
  const recovered=await syncLibrary(mobile,endpoint,'google',request,{upload:false});
  assert.equal(writes.length,1);assert.deepEqual(recovered.projects.find(r=>r.id===localMobile.id),localMobile);
  assert.ok(openProject(mobile,copy.id).ok);
  let selected=readLibrary(mobile).data.projects.find(r=>r.id===copy.id);
  const fromMobile=structuredClone(selected.project);fromMobile.scenes[0].body='Editado desde móvil';
  assert.ok(updateProject(mobile,copy.id,fromMobile,selected.revision).ok);
  await syncLibrary(mobile,endpoint,'google',request,{projectId:copy.id});
  let received=await syncLibrary(desktop,endpoint,'google',request,{projectId:copy.id});
  selected=received.projects.find(r=>r.id===copy.id);assert.equal(selected.project.scenes[0].body,'Editado desde móvil');
  const fromDesktop=structuredClone(selected.project);fromDesktop.scenes[0].body='Revisado desde ordenador';
  assert.ok(updateProject(desktop,copy.id,fromDesktop,selected.revision).ok);
  await syncLibrary(desktop,endpoint,'google',request,{projectId:copy.id});
  received=await syncLibrary(mobile,endpoint,'google',request,{upload:false});
  assert.equal(received.projects.find(r=>r.id===copy.id).project.scenes[0].body,'Revisado desde ordenador');
  assert.deepEqual(writes,[copy.id,copy.id,copy.id]);
  for(const original of originals){assert.deepEqual(cloud.get(original.id),original);assert.deepEqual(readLibrary(desktop).data.projects.find(r=>r.id===original.id),original);}
  assert.deepEqual(readLibrary(mobile).data.projects.find(r=>r.id===localMobile.id),localMobile);
});

test('un conflicto del proyecto seleccionado sube su copia y conserva el resto local y remoto',async()=>{
  const s=memory();loadLibrary(s);const other=readLibrary(s).data.projects[0],copy=createDemoCopy(s).data.projects.at(-1);
  const cloud=structuredClone(copy);cloud.project.scenes[0].body='Cambio remoto';cloud.revision++;
  const writes=[];
  await syncLibrary(s,'https://cloud.test','google',async(url,options)=>{
    if(!options.method)return Response.json({account:'carlos',projects:[cloud]});
    writes.push(JSON.parse(options.body));return Response.json({revision:1});
  },{projectId:copy.id});
  assert.equal(writes.length,1);assert.notEqual(writes[0].id,copy.id);assert.equal(writes[0].baseRevision,0);
  assert.equal(writes[0].project.scenes[0].body,copy.project.scenes[0].body);
  assert.deepEqual(readLibrary(s).data.projects.find(r=>r.id===other.id),other);
  assert.equal(readLibrary(s).data.projects.find(r=>r.id===copy.id).project.scenes[0].body,'Cambio remoto');
});

test('seleccionar un proyecto inexistente no realiza peticiones ni escrituras',async()=>{
  const s=memory();loadLibrary(s);const before=readLibrary(s).data;
  await assert.rejects(syncLibrary(s,'https://cloud.test','google',()=>{throw Error('no llamar');},{projectId:'missing'}),/disponible/);
  assert.deepEqual(readLibrary(s).data,before);
});
