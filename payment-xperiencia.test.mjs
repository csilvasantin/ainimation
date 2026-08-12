import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const live=fs.readFileSync('studio-live.html','utf8');
const studio=fs.readFileSync('studio.html','utf8');
const publish=fs.readFileSync('assets/publish-xperiencia.js','utf8');
const app=fs.readFileSync('assets/app.js','utf8');
const payment=fs.readFileSync('assets/payment-authoring.js','utf8');

test('Contact se sustituye por Payment en las dos superficies',()=>{
  assert.match(live,/>Payment<\/a>/); assert.match(studio,/>Payment<\/a>/);
  assert.doesNotMatch(live,/>Contact<\/a>/); assert.doesNotMatch(studio,/>Contact<\/a>/);
});
test('Payment solo acepta checkout HTTPS alojado y no contiene campos de tarjeta',()=>{
  assert.match(studio,/Hosted checkout · PCI-safe/); assert.match(live,/URL HTTPS del checkout/);
  assert.doesNotMatch(studio+live,/\b(?:PAN|CVV|card number|número de tarjeta)\b/i);
});
test('la Xperiencia exporta Payment y pide al player abrirlo tras clic',()=>{
  assert.match(publish,/event:"payment"/); assert.match(publish,/button\.addEventListener\("click"/);
  assert.match(publish,/payment: payment\?\.enabled && payment\.checkoutUrl/);
});
test('las capas posteriores reciben el contrato público del plan',()=>{
  for(const name of ['currentPlan','saveFilmPlan','normalizeFilmPlan','loadTimelineMarkers']) assert.match(app,new RegExp(`window\\.${name} = ${name}`));
});
test('Live conserva el Payment ya hidratado y Pixeria tiene endpoint canónico con fallback',()=>{
  assert.match(payment,/else if\(!form\.dataset\.paymentHydrated\)/);
  assert.match(publish,/https:\/\/api\.pixeria\.com\/stock\/interactive/);
  assert.match(publish,/https:\/\/api\.admira\.store\/stock\/interactive/);
  assert.match(publish,/AbortController/);
});
