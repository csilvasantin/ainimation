// Voz de Admirito (7-oct-2026): TTS ElevenLabs vía proxy, con caché de frases.
// La clave NUNCA llega al navegador: o es un secret de este worker (ELEVENLABS_API_KEY,
// `wrangler secret put`), o se usa el binding de servicio OMNI (omnipublicity-api, que ya
// guarda el secret de la flota). Sin ninguno, 503 y el cliente usa la voz del navegador.
export const VOZ_ADMIRITO = 'ajOR9IDAaubDK5qtLUqQ'; // Daniela · joven, dulce y brillante
export const VOCES = {
  daniela: { id: 'ajOR9IDAaubDK5qtLUqQ', por: 'joven, cálida y expresiva; la más aguda y dulce de las probadas' },
  raquel: { id: '1eHrpOW5l98cxiSRjbzJ', por: 'joven, brillante y alegre' },
  santiago: { id: 'nuzVc5hpXBWZjFEe4izg', por: 'chico joven, voz masculina alternativa' },
};
export const MAX_TEXTO = 240;
const ORIGENES = /^https:\/\/([a-z0-9-]+\.)*(ainimation\.studio|admira\.store|xpaceos\.com|digitalavatar\.ai|admira\.biz|admira\.tv|clearchannel\.tv)(\/|$)/i;
const MP3 = { 'content-type': 'audio/mpeg', 'Access-Control-Allow-Origin': '*', 'cache-control': 'public, max-age=2592000' };

export function limpiaTexto(t) { return String(t || '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXTO); }
export function vozId(v) { const s = String(v || '').trim(); if (VOCES[s.toLowerCase()]) return VOCES[s.toLowerCase()].id; return /^[A-Za-z0-9]{16,32}$/.test(s) ? s : VOZ_ADMIRITO; }
export function origenPermitido(request) { const o = request.headers.get('origin') || request.headers.get('referer') || ''; return ORIGENES.test(o); }
async function clave(voz, texto) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(voz + '|' + texto.toLowerCase())); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }

async function sintetizar(env, voz, texto) {
  if (env.ELEVENLABS_API_KEY) {
    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + voz, { method: 'POST', headers: { 'xi-api-key': env.ELEVENLABS_API_KEY, 'content-type': 'application/json', accept: 'audio/mpeg' },
      body: JSON.stringify({ text: texto, model_id: env.ELEVENLABS_MODEL || 'eleven_multilingual_v2', voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true } }) });
    if (!r.ok) throw new Error('elevenlabs ' + r.status);
    return await r.arrayBuffer();
  }
  if (env.OMNI) {
    const r = await env.OMNI.fetch('https://omni/tts', { method: 'POST', headers: { 'content-type': 'application/json', origin: 'https://www.ainimation.studio' }, body: JSON.stringify({ text: texto, voiceId: voz }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.audioBase64) throw new Error(String(d.error || ('omni ' + r.status)).slice(0, 120));
    return Uint8Array.from(atob(d.audioBase64), c => c.charCodeAt(0)).buffer;
  }
  const e = new Error('sin clave de ElevenLabs'); e.status = 503; throw e;
}

export async function voz(request, env = {}, deps = {}) {
  const u = new URL(request.url);
  let texto = u.searchParams.get('texto') || u.searchParams.get('text') || '', v = u.searchParams.get('voz') || '';
  if (request.method === 'POST') { const b = await request.json().catch(() => ({})); texto = b.texto || b.text || texto; v = b.voz || b.voiceId || v; }
  texto = limpiaTexto(texto); const id = vozId(v);
  const cors = { 'Access-Control-Allow-Origin': '*', 'content-type': 'application/json; charset=utf-8' };
  if (u.searchParams.has('info') || !texto) return new Response(JSON.stringify({ ok: true, voz_por_defecto: VOZ_ADMIRITO, voces: VOCES, max_texto: MAX_TEXTO, motor: env.ELEVENLABS_API_KEY ? 'elevenlabs (secret)' : env.OMNI ? 'elevenlabs (servicio omnipublicity)' : 'ninguno', uso: 'GET /voz?texto=...&voz=daniela → audio/mpeg (caché 30 días); sin motor → 503 y el cliente usa la voz del navegador' }), { headers: cors });
  const cache = deps.cache || (typeof caches !== 'undefined' ? caches.default : null);
  const key = new Request('https://voz-cache.ainimation/' + await clave(id, texto));
  if (cache) { const hit = await cache.match(key); if (hit) { const h = new Headers(hit.headers); h.set('x-voz-cache', 'hit'); return new Response(hit.body, { status: 200, headers: h }); } }
  if (!deps.sinOrigen && !origenPermitido(request)) return new Response(JSON.stringify({ ok: false, error: 'origen no permitido para generar voz nueva' }), { status: 403, headers: cors });
  try {
    const audio = await (deps.sintetizar || sintetizar)(env, id, texto);
    const res = new Response(audio, { headers: { ...MP3, 'x-voz-cache': 'miss', 'x-voz': id } });
    if (cache) { const p = cache.put(key, res.clone()); if (deps.ctx?.waitUntil) deps.ctx.waitUntil(p); else await p; }
    return res;
  } catch (e) { return new Response(JSON.stringify({ ok: false, error: String(e.message || e) }), { status: e.status || 502, headers: cors }); }
}
