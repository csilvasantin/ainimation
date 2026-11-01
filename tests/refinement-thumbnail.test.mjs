import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceThumbnail,validateThumbnail,thumbnailAssetMap,THUMBNAIL_ART} from '../presentaciones/editor/thumbnail-model.mjs';
import {generatorProject,nativeEdits,confirmSaved} from '../presentaciones/editor/generator.mjs';
import {editField,changesBetween} from '../presentaciones/editor/project.mjs';
const source=()=>({client:'sample-proposal',updatedAt:'r1',displayName:'Órbita',hero:{title:'Las ideas merecen un escenario'},skeleton:[],closing:{},translations:{en:{hero:{title:'Ideas deserve a stage'},skeleton:[],closing:{}}}});
test('every proposal has a usable thumbnail without changing its original script',()=>{
  const ideas=source(),before=structuredClone(ideas),p=generatorProject(ideas);
  assert.equal(p.document.components.thumbnail.title,ideas.hero.title);assert.equal(p.document.components.thumbnail.image,THUMBNAIL_ART);assert.deepEqual(ideas,before);
  assert.equal(generatorProject(ideas,'en').document.components.thumbnail.title,'Ideas deserve a stage');
});
test('thumbnail adjustments save as a separate design and require an exact reread',()=>{
  const ideas=source(),p=generatorProject(ideas);let draft=editField(p,'thumbnail-title','Otra órbita para tus ideas');draft=editField(draft,'thumbnail-accent','#aa55ff');draft=editField(draft,'thumbnail-layout','editorial');
  const changes=changesBetween(p,draft),payload=nativeEdits(p,changes);assert.deepEqual(payload.edits,[]);assert.equal(payload.thumbnail.title,'Otra órbita para tus ideas');
  const after={...ideas,updatedAt:'r2',thumbnails:{es:payload.thumbnail}};
  assert.equal(confirmSaved(p,changes,{ok:true,revision:'r2'},after).document.components.thumbnail.accent,'#aa55ff');
  after.thumbnails.es.title='Otra cosa';assert.throws(()=>confirmSaved(p,changes,{ok:true,revision:'r2'},after),/no coincide/);
});
test('thumbnail image references stay bound to their own source and asset messages cannot fetch arbitrary URLs',()=>{
  const ideas=source(),image='/presentaciones/sample-proposal/images/slide-01-cover.jpg';ideas.thumbnailMedia=[{url:image,label:'Portada'}];
  const p=generatorProject(ideas);assert.equal(sourceThumbnail(ideas).image,image);
  for(const bad of ['https://evil.test/a.jpg','data:image/svg+xml,x','/presentaciones/other-client/images/slide-01-cover.jpg','/presentaciones/sample-proposal/images/../secrets'])assert.throws(()=>validateThumbnail({...p.document.components.thumbnail,image:bad},ideas.client));
  assert.deepEqual(thumbnailAssetMap({[image]:'data:image/jpeg;base64,YQ==','https://evil.test':'data:image/jpeg;base64,YQ=='},p),{[image]:'data:image/jpeg;base64,YQ=='});
  assert.deepEqual(thumbnailAssetMap({[image]:'data:image/svg+xml;base64,YQ=='},p),{});
});
