/* analytics.js — Cloudflare Web Analytics (privacy-first, sin cookies).
 *
 * CÓMO ACTIVARLO (un solo paso, sin tocar nada más):
 *   1) dash.cloudflare.com → Web Analytics → Add a site → www.ainimation.studio
 *   2) copia el "beacon token" (una cadena hex) y pégalo abajo en TOKEN.
 *   Con TOKEN vacío este script NO hace nada (no carga el beacon, no rastrea).
 *
 * (Alternativa de flota: inyectar el token en el build desde s:AINIMATION_CF_BEACON.)
 */
(function () {
  "use strict";
  var TOKEN = ""; // <-- pega aquí el beacon token de Cloudflare Web Analytics
  if (!TOKEN) return; // inerte sin token
  var s = document.createElement("script");
  s.defer = true;
  s.src = "https://static.cloudflareinsights.com/beacon.min.js";
  s.setAttribute("data-cf-beacon", JSON.stringify({ token: TOKEN }));
  document.head.appendChild(s);
})();
