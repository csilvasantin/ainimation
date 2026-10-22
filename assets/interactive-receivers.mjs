// Exact inventory IDs and explicit bindings to the venue’s native 3D furniture.
export const TOUCH_RECEIVERS=Object.freeze([
 {
  "location": "xtanco-bcn",
  "name": "Xtanco Barcelona",
  "screen": "JTIXtanco_PortaldelAngel_20_Mostrador_1",
  "label": "Mostrador panel",
  "orientation": "landscape",
  "scene": {
   "item": "counter",
   "type": "counter",
   "aperture": "customer-panel"
  }
 },
 {
  "location": "xtanco",
  "name": "Xtanco",
  "screen": "JTIXtanco_CalledeSantaRosa_4_Mostrador_1",
  "label": "Mostrador panel",
  "orientation": "landscape",
  "scene": {
   "item": "counter",
   "type": "counter",
   "aperture": "customer-panel"
  }
 },
 {
  "location": "xtanco-valencia",
  "name": "Xtanco Valencia",
  "screen": "JTIXtanco_CarrerdeColon_22_Mostrador_1",
  "label": "Mostrador panel",
  "orientation": "landscape",
  "scene": {
   "item": "counter",
   "type": "counter",
   "aperture": "customer-panel"
  }
 },
 {
  "location": "admira-loterias",
  "name": "Admira Loterías",
  "screen": "SinProyecto_GranVia_32_Mostrador_1",
  "label": "Boletos kiosk",
  "orientation": "portrait",
  "scene": {
   "item": "turnKiosk",
   "type": "turnKiosk",
   "aperture": "portrait-kiosk"
  }
 },
 {
  "location": "admira-prensa",
  "name": "Admira Prensa",
  "screen": "SinProyecto_PlazadeCibeles_Mostrador_1",
  "label": "Mostrador revista",
  "orientation": "landscape",
  "scene": {
   "item": "counter",
   "type": "counter",
   "aperture": "customer-panel"
  }
 }
].map(r=>Object.freeze({...r,scene:Object.freeze(r.scene)})));
export const receiverFor=(location,screen)=>TOUCH_RECEIVERS.find(r=>r.location===location&&r.screen===screen);
