/* ============================================================================
 * share-plan.js — C5 · la pieza deja de vivir SOLO en este navegador
 * ----------------------------------------------------------------------------
 * Hasta ahora todo lo autorado en studio.html (cast, keyframes, marcas del Score,
 * items del Stage y reglas XPL) vivía únicamente en el localStorage de quien lo
 * hizo: no se compartía, no se publicaba, no llegaba a un player, y se perdía al
 * limpiar la caché. Eso bloquea el bloque B entero (publicar a la Xperience).
 *
 * Aquí se empaqueta la pieza en un ENLACE, reutilizando el patrón ?b= que ya
 * usaba studio-live.html (encodeBrief/decodeBrief) pero con dos diferencias que
 * el plan del Director impone:
 *
 *   1. La pieza NO es solo el plan: las marcas del Score y las etiquetas viven
 *      en claves de localStorage aparte, y sin ellas goToMarker no apunta a nada.
 *   2. Un plan con media importada pesa mucho más que un brief, así que se
 *      comprime (deflate-raw) antes de pasarlo a base64url.
 *
 * MEDIA NO PORTABLE: un `src` que sea data:/blob: pertenece al navegador que lo
 * importó y no cabe en una URL. Esos miembros viajan SIN src y marcados, y al
 * generar el enlace se DICE cuántos se han quedado por el camino — nunca se
 * recorta en silencio.
 * ========================================================================== */
(function () {
  "use strict";

  const PARAM = "p";
  const PLAN_KEY = "ainimation-film-plan";
  // Lo que forma parte de LA PIEZA. Fuera quedan las preferencias de quien mira
  // (tema, zoom, vista del Cast): esas son del navegador, no de la obra.
  const EXTRA_KEYS = ["ainimation-timeline-markers", "ainimation-score-labels"];
  // Un enlace mucho más largo que esto lo parten proxies y clientes de mensajería.
  const LINK_WARN = 8000;

  const isPortableSrc = (src) => !src || /^(https?:)?\/\//i.test(src);

  /* ---------------------------------------------------------------------------
   * Empaquetado — qué viaja y qué se queda.
   * ------------------------------------------------------------------------- */
  function packPiece() {
    const plan = window.currentPlan?.();
    if (!plan) return null;
    const dropped = [];

    const stripCast = (member) => {
      if (isPortableSrc(member?.src)) return member;
      dropped.push(member.name || "cast");
      const { src, ...rest } = member;
      return { ...rest, srcMissing: true };
    };

    const piece = {
      v: 1,
      plan: { ...plan, cast: (plan.cast || []).map(stripCast) },
      extras: {},
      dropped: dropped.length,
    };
    EXTRA_KEYS.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (raw) piece.extras[key] = raw;
    });
    return { piece, dropped };
  }

  function applyPiece(piece) {
    if (!piece?.plan) return false;
    Object.entries(piece.extras || {}).forEach(([key, raw]) => {
      if (EXTRA_KEYS.includes(key)) localStorage.setItem(key, raw);
    });
    const plan = window.normalizeFilmPlan
      ? window.normalizeFilmPlan(piece.plan)
      : piece.plan;
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    window.renderFilmPlan?.(plan);
    return true;
  }

  /* ---------------------------------------------------------------------------
   * Codificación — deflate-raw + base64url, con respaldo en claro.
   * El primer carácter dice cómo está codificado, para poder cambiarlo sin
   * romper los enlaces ya repartidos: "1" = comprimido, "0" = en claro.
   * ------------------------------------------------------------------------- */
  const toB64url = (bytes) => {
    let bin = "";
    bytes.forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const fromB64url = (text) => {
    const pad = text.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(pad + "=".repeat((4 - (pad.length % 4)) % 4));
    return Uint8Array.from(bin, (c) => c.charCodeAt(0));
  };

  async function encodePiece(piece) {
    const json = JSON.stringify(piece);
    if (typeof CompressionStream === "function") {
      try {
        const stream = new Blob([new TextEncoder().encode(json)]).stream()
          .pipeThrough(new CompressionStream("deflate-raw"));
        const buf = await new Response(stream).arrayBuffer();
        return "1" + toB64url(new Uint8Array(buf));
      } catch { /* sin compresión: seguimos en claro */ }
    }
    return "0" + toB64url(new TextEncoder().encode(json));
  }

  async function decodePiece(token) {
    if (!token) return null;
    const bytes = fromB64url(token.slice(1));
    let json;
    if (token[0] === "1") {
      const stream = new Blob([bytes]).stream()
        .pipeThrough(new DecompressionStream("deflate-raw"));
      json = await new Response(stream).text();
    } else {
      json = new TextDecoder().decode(bytes);
    }
    return JSON.parse(json);
  }

  /* ---------------------------------------------------------------------------
   * API pública + entrada de menú.
   * ------------------------------------------------------------------------- */
  async function buildLink() {
    const packed = packPiece();
    if (!packed) return null;
    const token = await encodePiece(packed.piece);
    const url = `${location.origin}${location.pathname}?${PARAM}=${token}`;
    return { url, dropped: packed.dropped, tooLong: url.length > LINK_WARN };
  }

  async function copyLink(button) {
    const made = await buildLink();
    if (!made) return null;
    try { await navigator.clipboard.writeText(made.url); }
    catch {
      const area = document.createElement("textarea");
      area.value = made.url;
      document.body.append(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    if (button) {
      const original = button.textContent;
      button.textContent = made.tooLong ? "⚠ Enlace muy largo"
        : made.dropped.length ? `✓ Copiado (sin ${made.dropped.length} media)`
          : "✓ Enlace copiado";
      window.setTimeout(() => { button.textContent = original; }, 2600);
    }
    // Lo que no ha viajado se DICE, no se calla.
    if (made.dropped.length) {
      console.warn("[share] media local que no viaja en el enlace:", made.dropped);
    }
    if (made.tooLong) {
      console.warn(`[share] enlace de ${made.url.length} caracteres: puede que lo parta un proxy o un cliente de mensajería.`);
    }
    return made;
  }

  async function openFromLink() {
    const token = new URLSearchParams(location.search).get(PARAM);
    if (!token) return false;
    try {
      const piece = await decodePiece(token);
      return applyPiece(piece);
    } catch (error) {
      console.warn("[share] el enlace no se ha podido abrir:", error);
      return false;
    }
  }

  window.ainShare = { buildLink, copyLink, openFromLink, packPiece, applyPiece, encodePiece, decodePiece };

  function bind() {
    document.querySelector("[data-share-piece]")
      ?.addEventListener("click", (event) => copyLink(event.currentTarget));
    // El plan ya está pintado cuando esto corre (app.js va con defer y antes que
    // nosotros), así que aplicar el enlace es sobrescribir y repintar.
    openFromLink();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
