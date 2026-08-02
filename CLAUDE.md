# CLAUDE.md — AInimation Studio

> **AInimation Studio** — the Director-style face of an AI video production engine.
> Live: https://www.ainimation.studio (GitHub Pages, repo `csilvasantin/ainimation`).

## Qué es
Sitio estático (GitHub Pages) que presenta **AInimation Studio**: un entorno de
autoría *"Admira Director, powered by AI"* — la metáfora clásica de Macromedia
Director (cast / stage / score / script) reconstruida para producción generativa
(imagen, vídeo, música, voz).

- `index.html` — landing (idea, formats, process, **engine**, contact).
- `studio.html` — la superficie de autoría (clon de Director en AI: menús,
  timeline/Score, Stage, Cast, modos Studio / Publicity / Digital Twin,
  export Markdown/JSON). Hoy es **maqueta interactiva**, aún no genera media real.
- `assets/` — `styles.css`, `app.js`, imágenes hero.

## El motor: OpenMontage
El "AI Director" se apoya en **OpenMontage** (https://github.com/calesthio/OpenMontage),
sistema agéntico open-source de producción de vídeo que se conduce desde un
asistente de código (Claude Code / Morfeo). 12 pipelines, camino sin API keys
(Piper + Archive.org/NASA/Wikimedia + Remotion / HyperFrames), vídeo real barato.

**Licencia — IMPORTANTE:** OpenMontage es **AGPLv3**. NO fusionar su código en
este repo (público) para no arrastrar copyleft a toda la web. OpenMontage se
mantiene como **motor separado** (instalado aparte, p.ej. `~/Claude/OpenMontage`);
a este repo solo llegan los **vídeos producidos** y la integración/branding propios.

## Modelo de capas Admira
AInimation.studio es la **capa marca (vida propia, filo)** emparejada con su
espejo de producción **admira.tv** (–1 día). Capa "Emitir/Animar". Ver la memoria
`admira-trilogy`.

## Deploy
GitHub Pages sirve `main` (raíz). CNAME = `www.ainimation.studio`.
- Al tocar cualquier cosa de `assets/`, **`npm run stamp`**: reescribe todos los
  `?v=` de los `.html` con el sha del último commit que tocó `assets/`, así que
  el token cambia solo cuando cambian los assets y es el MISMO en todas las
  páginas (antes iba a mano y cada HTML llevaba el suyo → dos copias cacheadas
  del mismo `app.js`). `npm run verify:stamp` comprueba sin escribir.
- Preview local: `python3 -m http.server 9134` → http://127.0.0.1:9134/
- HTTPS: el cert de Pages se aprovisiona solo tras fijar el custom domain; si
  `https_enforced` sigue en false, re-setear el cname vía API fuerza reintento.
