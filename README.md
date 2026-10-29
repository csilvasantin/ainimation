# AInimation Studio

**Admira Director, powered by AI.** — the Director-style face of an AI video
production engine. Live at **https://www.ainimation.studio**.

The classic Macromedia Director metaphor (cast · stage · score · script) rebuilt
for generative production: image, video, music, and voice in one authoring
surface. The production brain underneath is **[OpenMontage](https://github.com/calesthio/OpenMontage)**,
an open-source agentic video system.

## Pages
- `index.html` — landing (idea · formats · process · engine · contact)
- `studio.html` — **Author**: the Director surface (cast · stage · score · XPL
  behaviours). `?play=1` runs it as a projector, without the authoring chrome.
- `studio-live.html` — **Produce**: a brief in, a real 1080p video out.

## Local preview
```bash
python3 -m http.server 9134
# open http://127.0.0.1:9134/
```

## Deploy
GitHub Pages serves `main` at the root, custom domain `www.ainimation.studio`.
Cache tokens are stamped by the push, not by hand: `.github/workflows/stamp.yml`
stamps on every push (to `main` or to any branch) and commits the result, and only
verifies (failing on a stale token) on pull requests. The token is the sha of the
last commit that touched `assets/`, so every page shares one token and it changes
exactly when the assets do. Locally you can run `npm run stamp` to get ahead of it,
or `npm run verify:stamp` to check without writing — both are shortcuts, not chores.

## Note on OpenMontage (AGPLv3)
OpenMontage powers the engine but is **not vendored into this repo** — it stays a
separate tool. Only produced videos and this site's own integration live here.
See [`CLAUDE.md`](CLAUDE.md).

## Organizar el Cast

En Author (`studio.html`), el Cast permite buscar por nombre, archivo, tipo y origen; la búsqueda ignora tildes. Combina el texto con los filtros de tipo y con **En escena / Sin usar**, y ordena por nombre, tipo u orden original. La opción **Grupos por tipo** añade secciones con recuentos de visibles/total y funciona también en vista de listado. Sus encabezados permiten plegar y desplegar cada grupo con clic, Enter o Espacio; se conserva esa vista al buscar o filtrar, sin guardar cambios en el montaje. Restablecer vuelve a abrir todos los grupos. El contador muestra recursos originales, no sus sprites duplicados. Un recurso con alguna instancia activa cuenta como «En escena».

Son controles de vista: no reordenan el proyecto guardado, no cambian sus tiempos y no reinician la reproducción. **↺** restablece la búsqueda, los filtros y el orden, manteniendo el proyecto. La búsqueda vuelve vacía al recargar.

Verificación local, con datos ficticios y sin publicar: `npm run verify:cast`.
