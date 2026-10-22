// Usage: node scripts/audit-touch-destinations.mjs <Store checkout> [catalog JSON]
// Reads public inventory and scene definitions; does not write to any device.
import {readFile,writeFile,readdir} from 'node:fs/promises';
import {resolve,relative} from 'node:path';
import vm from 'node:vm';
import {DESTINATIONS} from '../cloud-library/deliveries.mjs';
import {CATALOG_URL,reconcileDestinations} from '../cloud-library/destination-discovery.mjs';
const root=resolve(process.argv[2]),catalog=process.argv[3]?JSON.parse(await readFile(process.argv[3],'utf8')):await(await fetch(CATALOG_URL)).json();
const coverage=reconcileDestinations(DESTINATIONS,catalog);
const html=await readFile(resolve(root,'admira-xp/index.html'),'utf8');
const source=html.slice(html.indexOf('const FACTORY_LAYOUTS=')+'const FACTORY_LAYOUTS='.length);const end=source.indexOf('\n};');
if(end<0)throw Error('Scene definitions changed; audit must be updated');
const layouts=vm.runInNewContext('('+source.slice(0,end+2)+')',{}, {timeout:1000});
const assets=JSON.parse(await readFile(resolve(root,'inventario/catalog.json'),'utf8'));
const registry=JSON.parse(await readFile(resolve(root,'inventario/registry.json'),'utf8'));
const stock=JSON.parse(await readFile(resolve(root,'inventario/pixeria-cache.json'),'utf8'));
const itil=await Promise.all(['starbucks','cafebreria'].map(async space=>({space,...JSON.parse(await readFile(resolve(root,'inventario/'+space+'/manifest.json'),'utf8'))})));
const touchKinds=new Set(['tablet','ipadLandscape','metahuman']);
const sceneCandidates=Object.entries(layouts).flatMap(([scene,layout])=>layout.filter(item=>touchKinds.has(item.type)||item.type==='turnKiosk').map(item=>({scene,instance:item.id,model:'native:'+item.type,number:registry.numbers['native:'+item.type],label:item.label,classification:item.type==='turnKiosk'?'queue_display_touch_unconfirmed':'interactive_virtual_scene',assignable:false,reason:'no_destination_receiver_binding',source:'admira-xp/index.html#FACTORY_LAYOUTS'})));
const hardwareCandidates=catalog.locations.flatMap(location=>(location.surfaces||[]).filter(s=>/\bipad\b|\btablet\b/i.test([s.name,s.desc].join(' '))).map(s=>({location:location.id,name:location.name,surface:s.name,screen:s.screen||null,status:s.status,assignable:false,reason:'hardware_touch_input_and_receiver_not_verified'})));
async function jsonFiles(dir){const out=[];for(const entry of await readdir(dir,{withFileTypes:true})){const file=resolve(dir,entry.name);if(entry.isDirectory())out.push(...await jsonFiles(file));else if(entry.name.endsWith('.json'))out.push(file);}return out;}
const planPaths=[...await jsonFiles(resolve(root,'data/xpacios')),...await jsonFiles(resolve(root,'xpacios/altadis-18/planos'))];
const plans=[];for(const path of planPaths){const plan=JSON.parse(await readFile(path,'utf8'));plans.push({file:relative(root,path),id:plan.id||null,screens:(plan.pantallas||[]).length,declaredTouch:(plan.pantallas||[]).filter(s=>s.touch===true||s.tactil===true).length});}
const report={checkedAt:new Date().toISOString(),source:CATALOG_URL,catalogUpdatedAt:catalog.updatedAt,coverage:coverage.coverage,connected:DESTINATIONS.flatMap(d=>d.screens.filter(s=>s.touch===true).map(s=>({location:d.id,name:d.name,screen:s.id,label:s.name,kind:'virtual',assignable:true}))),missing:coverage.destinations.flatMap(d=>d.screens.filter(s=>s.available===false).map(s=>({location:d.id,name:d.name,screen:s.id,label:s.name,assignable:false,reason:s.reason}))),hardwareCandidates,sceneCandidates,inventory:{nativeModels:assets.native.length,stockModels:stock.items.length,registeredModels:Object.keys(registry.numbers).length,itilUnits:itil.reduce((n,x)=>n+x.units.length,0),sceneLayouts:Object.keys(layouts),plans},limits:['The public catalog has no structured touch capability flag. Explicit touch descriptions are evidence, not physical input or delivery receipts.','Demo scene furniture is not automatically a registered installation in every venue.','Absent screen/renderer bindings cannot be replaced by a different screen or a generic demo.']};
const output=new URL('../docs/touch-destination-audit.json',import.meta.url);await writeFile(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({coverage:report.coverage,nativeModels:report.inventory.nativeModels,plans:plans.length,sceneCandidates:sceneCandidates.length,hardwareCandidates:hardwareCandidates.length,missing:report.missing.map(s=>s.location),output:output.pathname}));
