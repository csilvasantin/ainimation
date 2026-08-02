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
After changing anything under `assets/`, run `npm run stamp` — it rewrites every
`?v=` in the HTML with the sha of the last commit that touched `assets/`, so all
pages share one cache token. `npm run verify:stamp` checks without writing.

## Note on OpenMontage (AGPLv3)
OpenMontage powers the engine but is **not vendored into this repo** — it stays a
separate tool. Only produced videos and this site's own integration live here.
See [`CLAUDE.md`](CLAUDE.md).
