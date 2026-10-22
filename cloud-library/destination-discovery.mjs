// Inventory evidence is separate from an implemented scene receiver. A catalog
// description never grants permission to write to a physical player.
export const CATALOG_URL='https://brain.digitalavatar.ai/locations';
const explicitTouch=value=>/\bt[aá]ctil(?:es)?\b|\btouch(?:screen)?\b/i.test(value)&&!/(?:no|sin|non)[ -]?(?:t[aá]ctil|touch)/i.test(value);
export function reconcileDestinations(connected,catalog){
 if(!Array.isArray(catalog?.locations))throw Error('Invalid location catalog');
 const destinations=structuredClone(connected),known=new Map(destinations.map(d=>[d.id,d]));
 let surfaces=0,declaredTouch=0;
 for(const location of catalog.locations){
  for(const surface of Array.isArray(location.surfaces)?location.surfaces:[]){
   surfaces++;const evidence=[surface.name,surface.desc].filter(x=>typeof x==='string').join(' ');
   const touch=surface.touch??surface.capabilities?.touch;
   if(touch===false||(touch!==true&&!explicitTouch(evidence)))continue;declaredTouch++;
   if(typeof surface.idIoT!=='string'||!surface.idIoT||typeof location.id!=='string')continue;
   let destination=known.get(location.id);
   if(!destination){destination={id:location.id,name:String(location.name||location.id),kind:'virtual',screens:[]};known.set(location.id,destination);destinations.push(destination);}
   // Match actual registered IDs only; never substitute another screen of the venue.
   if(destination.screens.some(s=>s.id===surface.idIoT))continue;
   destination.screens.push({id:surface.idIoT,name:String(surface.name||surface.idIoT),touch:true,available:false,reason:'receiver_not_connected',evidence:touch===true?'catalog-capability':'catalog-description'});
  }
 }
 return {destinations,coverage:{locations:catalog.locations.length,surfaces,declaredTouch,connectedTouch:connected.reduce((n,d)=>n+d.screens.filter(s=>s.touch===true).length,0),unconnectedTouch:destinations.reduce((n,d)=>n+d.screens.filter(s=>s.touch===true&&s.available===false).length,0),catalogUpdatedAt:catalog.updatedAt||null}};
}
export async function discoverDestinations(connected,fetcher=fetch){
 const response=await fetcher(CATALOG_URL,{signal:AbortSignal.timeout(15000),cf:{cacheTtl:300,cacheEverything:true}});
 if(!response.ok)throw Error('Catalog unavailable');return reconcileDestinations(connected,await response.json());
}
