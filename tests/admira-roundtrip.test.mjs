import test from 'node:test';
import assert from 'node:assert/strict';
import {editContext,returnCatalogue,catalogueVersion,readEditorProject,portableProject} from '../assets/admira-roundtrip.mjs';
test('return links keep catalogue host and language, reject foreign and privileged paths',()=>{
 assert.equal(returnCatalogue('https://www.admira.studio/en/stock.html'),'https://www.admira.studio/en/stock.html');
 assert.equal(returnCatalogue('https://evil.test/stock.html'),'https://admira.studio/stock.html');
 assert.equal(returnCatalogue('https://admira.studio/auth/callback'),'https://admira.studio/stock.html');
 const context=editContext(new URLSearchParams({admiraStockId:'old-1',admiraReturnUrl:'https://www.admira.studio/stock.html?cliente=demo'}));
 const u=new URL(catalogueVersion(context,{ok:true,id:'new-2',versionRoot:'root-0',editorProjectUrl:'https://api.admira.store/stock/editor-project/new-2'}));
 assert.equal(u.searchParams.get('highlight'),'new-2');assert.equal(u.searchParams.get('origen'),'root-0');assert.equal(u.searchParams.get('cliente'),'demo');
 assert.throws(()=>catalogueVersion(context,{ok:true,id:'new-2'}));assert.throws(()=>catalogueVersion(context,{ok:false,id:'new-2',editorProjectUrl:'x'}));
});
test('editable load uses fixed Stock endpoint and stops on failure',async()=>{
 const project={schema:'ainimation.editor.v1',kind:'director',plan:{cast:[],stageItems:[]}};
 const loaded=await readEditorProject('asset-1',async url=>{assert.equal(url,'https://api.admira.store/stock/editor-project/asset-1');return Response.json(project);});assert.deepEqual(loaded,project);
 await assert.rejects(readEditorProject('../private'));await assert.rejects(readEditorProject('asset-1',async()=>new Response('',{status:404})));
});
test('snapshot is independent from subsequent changes',async()=>{
 const plan={cast:[],stageItems:[{type:'text',text:'Anterior'}],admiraEdit:{id:'old-1'}};
 const saved=await portableProject(plan);plan.stageItems[0].text='Posterior';assert.equal(saved.plan.stageItems[0].text,'Anterior');assert.equal(saved.plan.admiraEdit.id,'old-1');
});
