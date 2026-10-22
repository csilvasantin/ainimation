// Registered virtual receivers. IDs are the exact public inventory identities.
export const TOUCH_RECEIVERS=Object.freeze([
 {
  "location": "xtanco-bcn",
  "name": "Xtanco Barcelona",
  "screen": "JTIXtanco_PortaldelAngel_20_Mostrador_1",
  "label": "Mostrador panel",
  "orientation": "landscape"
 },
 {
  "location": "xtanco",
  "name": "Xtanco",
  "screen": "JTIXtanco_CalledeSantaRosa_4_Mostrador_1",
  "label": "Mostrador panel",
  "orientation": "landscape"
 },
 {
  "location": "xtanco-valencia",
  "name": "Xtanco Valencia",
  "screen": "JTIXtanco_CarrerdeColon_22_Mostrador_1",
  "label": "Mostrador panel",
  "orientation": "landscape"
 },
 {
  "location": "admira-loterias",
  "name": "Admira Loterías",
  "screen": "SinProyecto_GranVia_32_Mostrador_1",
  "label": "Boletos kiosk",
  "orientation": "portrait"
 },
 {
  "location": "admira-prensa",
  "name": "Admira Prensa",
  "screen": "SinProyecto_PlazadeCibeles_Mostrador_1",
  "label": "Mostrador revista",
  "orientation": "landscape"
 }
].map(Object.freeze));
export const receiverFor=(location,screen)=>TOUCH_RECEIVERS.find(r=>r.location===location&&r.screen===screen);
