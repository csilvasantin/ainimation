# AInimation Studio

**Admira Director, powered by AI.** — the Director-style face of an AI video
production engine. Live at **https://www.ainimation.studio**.

The classic Macromedia Director metaphor (cast · stage · score · script) rebuilt
for generative production: image, video, music, and voice in one authoring
surface. The production brain underneath is **[OpenMontage](https://github.com/calesthio/OpenMontage)**,
an open-source agentic video system.

## Pages
- `index.html` — landing (idea · formats · process · engine · contact)
- `studio.html` — the authoring surface (interactive prototype)

## Local preview
```bash
python3 -m http.server 9134
# open http://127.0.0.1:9134/
```

## Deploy
GitHub Pages serves `main` at the root, custom domain `www.ainimation.studio`.
Bump the `?v=` query on `styles.css` / `app.js` in the HTML when you change assets.

## Note on OpenMontage (AGPLv3)
OpenMontage powers the engine but is **not vendored into this repo** — it stays a
separate tool. Only produced videos and this site's own integration live here.
See [`CLAUDE.md`](CLAUDE.md).
