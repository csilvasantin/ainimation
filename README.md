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
- `capsulas/` — opens an existing capsule in its editor from a Stock link or asset ID.

Before Google sign-in, the home navigation shows Interactives, Presentations,
Sites, Capsules and Login, alongside the language control. Other links appear
after server-verified Google sign-in in the same tab, and hide on sign-out or
expiry. This navigation preference stores only an expiry time in sessionStorage;
credentials remain in memory and API authorization is unchanged.

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
