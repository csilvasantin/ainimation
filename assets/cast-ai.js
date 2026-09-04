/* ============================================================================
 * cast-ai.js — ✨ Cast con IA real (mejora 2 del generador, 13-ago-2026)
 * ----------------------------------------------------------------------------
 * El Studio montaba solo con media importada o del Stock: el botón de IA de la
 * paleta era maqueta. Este módulo abre la puerta real: un prompt entra, el
 * worker pixer-eleven (el mismo puente de imagen del resto del ecosistema:
 * anonimizador, MUPI del gemelo) devuelve una imagen, y esa imagen se convierte
 * en un miembro del Cast normal y corriente — se arrastra al Stage, se programa
 * en el Timeline y viaja EMPAQUETADA (data URI) en la Xperiencia exportada.
 *
 * Deliberadamente NO reutiliza el flujo de import por fichero: aquí no hay
 * fichero, hay un prompt, y el prompt se guarda en el miembro (aiPrompt) para
 * poder regenerar o auditar de dónde salió cada asset.
 * ========================================================================== */
(function () {
  "use strict";

  // dominio propio: LaLiga bloquea workers.dev en horas de fútbol, FLT-1633
  const WORKER = "https://api.admira.store";
  let busy = false;

  // Misma tabla de motivos humanos que el anonimizador de Pixeria: el motor
  // rechaza cosas y el usuario merece saber por qué en su idioma.
  const ERR_MAP = {
    "image-declined": "El motor no pudo generar la imagen. Prueba otro prompt.",
    safety: "El motor rechazó el prompt por contenido sensible.",
    copyright: "Bloqueado por posible copyright. Prueba otro prompt.",
    empty: "El motor no devolvió imagen. Reinténtalo.",
    network: "Sin conexión con el motor de imagen.",
  };

  async function generateImage(prompt) {
    let response;
    try {
      response = await fetch(WORKER + "/xai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, b64: true, model: "grok-imagine-image" }),
      });
    } catch (_) {
      const e = new Error(ERR_MAP.network);
      e.reason = "network";
      throw e;
    }
    const data = await response.json().catch(() => ({}));
    const item = data && Array.isArray(data.data) && data.data[0];
    if (!response.ok || !item || !item.b64_json) {
      const reason = (data && data.reason) || "empty";
      const e = new Error(ERR_MAP[reason] || (data && (data.detail || data.error)) || ("HTTP " + response.status));
      e.reason = reason;
      throw e;
    }
    return "data:" + (item.mime || "image/jpeg") + ";base64," + item.b64_json;
  }

  function addGeneratedMember(src, prompt) {
    const plan = window.currentPlan?.();
    if (!plan) return null;
    const existing = plan.cast || [];
    const timelineMemberCount = existing.filter((m) => m.imported && m.src).length;
    const shortName = prompt.replace(/\s+/g, " ").trim().slice(0, 28) || "AI image";
    const member = {
      role: "Generated",
      name: shortName + " " + String(existing.length + 1).padStart(2, "0"),
      type: "Image member",
      mediaType: "image",
      fileName: "ai-generated.jpg",
      src,
      imported: true,
      generated: true,
      aiPrompt: prompt,
      source: "pixer-eleven (grok-imagine-image)",
      onStage: false,
      startFrame: 1 + timelineMemberCount * 24,
      durationFrames: 96,
      durationPending: false,
      aspectPending: true,
      prompt: "AI-generated image member. Place in Cast, schedule on Timeline. Prompt: " + prompt,
    };
    plan.cast = [...existing, member];
    window.saveFilmPlan?.(plan);
    window.renderFilmPlan?.(plan);
    return member;
  }

  function closeDialog() {
    document.querySelector(".cast-ai-dialog")?.remove();
  }

  function openDialog() {
    closeDialog();
    const dialog = document.createElement("div");
    dialog.className = "stage-properties-menu cast-ai-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-label", "Generate AI cast member");
    dialog.innerHTML = `
      <p class="stage-properties-title">✨ Generate image<small>pixer-eleven · grok-imagine-image</small></p>
      <label class="stage-properties-row cast-ai-row">
        <span>Prompt</span>
        <textarea class="cast-ai-prompt" rows="3" placeholder="A neon street market at night, cinematic, 16:9"></textarea>
      </label>
      <button class="stage-properties-action" type="button" data-cast-ai-go>Generate</button>
      <p class="stage-properties-hint" data-cast-ai-status>The image lands in the Cast, ready for the Stage — and it travels inside the exported Xperiencia.</p>
    `;
    dialog.style.left = "50%";
    dialog.style.top = "38%";
    dialog.style.transform = "translate(-50%, -50%)";
    document.body.append(dialog);

    const promptField = dialog.querySelector(".cast-ai-prompt");
    const goButton = dialog.querySelector("[data-cast-ai-go]");
    const status = dialog.querySelector("[data-cast-ai-status]");
    promptField.focus();

    async function run() {
      const prompt = promptField.value.trim();
      if (!prompt || busy) return;
      busy = true;
      goButton.disabled = true;
      status.textContent = "Generating…";
      try {
        const src = await generateImage(prompt);
        const member = addGeneratedMember(src, prompt);
        status.textContent = member ? "✓ Added to Cast: " + member.name : "✓ Generated";
        promptField.value = "";
        window.setTimeout(closeDialog, 1400);
        document.querySelector('[data-open-window="cast"]')?.click();
      } catch (e) {
        status.textContent = "✖ " + (e.message || "Error");
      } finally {
        busy = false;
        goButton.disabled = false;
      }
    }

    goButton.addEventListener("click", run);
    promptField.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) run();
      if (event.key === "Escape") closeDialog();
    });
    const dismiss = (event) => {
      if (dialog.contains(event.target)) return;
      closeDialog();
      document.removeEventListener("pointerdown", dismiss, true);
    };
    document.addEventListener("pointerdown", dismiss, true);
  }

  function init() {
    document.querySelectorAll("[data-cast-generate]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openDialog();
      });
    });
    // El botón «AI» de la paleta de herramientas era decorativo; ahora abre el
    // mismo generador. Se engancha en fase de captura para ganarle al menú
    // genérico de import que app.js le puso antes.
    document.querySelectorAll('[data-import-trigger="ai"]').forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        openDialog();
      }, true);
    });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
