import test from 'node:test';
import assert from 'node:assert/strict';
import {compareProjects,conflictVersions} from '../assets/interactive-conflicts.mjs';
import {template} from '../assets/interactive-project.mjs';

test('comparar conserva entradas y detecta textos, botones, imágenes y diseño',()=>{
 const a=template(),b=structuredClone(a);b.scenes[0].body='Oferta del iPhone';b.scenes[0].buttons[0].target='final';b.scenes[0].image='data:image/png;base64,YQ==';b.scenes[0].directorLayout={title:{x:10,y:20,w:30,h:40}};
 const before=JSON.stringify([a,b]),diff=compareProjects(a,b),paths=diff.map(d=>d.path.join('.'));
 assert.ok(paths.includes('scenes.0.body'));assert.ok(paths.includes('scenes.0.buttons.0.target'));assert.ok(paths.includes('scenes.0.image'));assert.ok(paths.includes('scenes.0.directorLayout'));assert.equal(JSON.stringify([a,b]),before);
});
test('comparar detecta pantallas añadidas o quitadas y no depende del orden de las claves',()=>{
 const a=template(),b=structuredClone(a);b.scenes.pop();assert.ok(compareProjects(a,b).some(d=>d.path.join('.')==='scenes.4'));
 assert.deepEqual(compareProjects({title:'A',start:'x'},{start:'x',title:'A'}),[]);
});
test('las dos versiones se identifican por ID incluso si hay títulos duplicados',()=>{
 const lib={projects:[{id:'cloud',project:{title:'Igual'}},{id:'copy',project:{title:'Igual'}},{id:'other',project:{title:'Igual'}}]};
 const before=JSON.stringify(lib),out=conflictVersions(lib,{projectId:'cloud',copyId:'copy'});
 assert.equal(out.cloud.id,'cloud');assert.equal(out.local.id,'copy');assert.equal(JSON.stringify(lib),before);
 assert.equal(conflictVersions(lib,{projectId:'cloud',copyId:'missing'}),null);assert.equal(conflictVersions(lib,{projectId:'cloud',copyId:'cloud'}),null);
});
