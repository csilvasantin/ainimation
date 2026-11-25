#!/usr/bin/env node
/* ============================================================================
 * stamp-version.mjs — un solo token de caché para todo el sitio (C6)
 * ----------------------------------------------------------------------------
 * Antes cada HTML llevaba su propio `?v=` a mano: index.html pedía
 * `app.js?v=7723205` y studio.html `app.js?v=aidirector-20260530-r47`, o sea DOS
 * copias cacheadas del MISMO fichero — y el bump había que acordarse de hacerlo.
 * En un kiosko eso acaba en JS caducado.
 *
 * Aquí el token se DERIVA del sha del último commit que tocó `assets/`: cambia
 * exactamente cuando cambian los assets, y ni antes ni después.
 *
 *   npm run stamp        # reescribe los ?v= de los .html
 *   npm run stamp -- -c  # solo comprueba (sale 1 si algo está desfasado)
 * ========================================================================== */
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { stampPageRevision } from './page-revision.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.slice(2).some((a) => a === "-c" || a === "--check");

// Sha del último commit que tocó assets/. Si el árbol está sucio lo marcamos
// como -dirty: así en local nunca se sirve un token que miente sobre el commit.
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
let version = git("log", "-1", "--format=%h", "--", "assets");
if (!version) version = "dev";
if (git("status", "--porcelain", "--", "assets")) version += "-dirty";
// Gemelos digitales (24-nov-2026): su JS/CSS vive en digital-twins/, no en assets/, así que con el sha de assets/
// el ?v= no cambiaba nunca (692590f) y Chrome podía quedarse con piezas viejas. Token propio: sha del último
// commit que tocó algo de digital-twins/ que NO sea .html (el sello sólo toca .html → sin bucle).
const TWIN_SPEC = ["--", "digital-twins", ":(exclude,glob)digital-twins/**/*.html", ":(exclude)digital-twins/index.html"];
let twinVersion = git("log", "-1", "--format=%h", ...TWIN_SPEC) || version;
if (git("status", "--porcelain", ...TWIN_SPEC)) twinVersion += "-dirty";

// La galería vive en subcarpeta y referencia los assets con ruta absoluta
// (/assets/…): entra en el mismo token único. Las PIEZAS (xperiencias/<slug>/)
// quedan fuera a propósito — son la salida literal del Studio, autocontenidas,
// y no se reescriben.
const htmlFiles = readdirSync(root).filter((f) => f.endsWith(".html"));
try {
  if (readdirSync(join(root, "xperiencias")).includes("index.html")) {
    htmlFiles.push("xperiencias/index.html");
  }
} catch {}
try {
  if (readdirSync(join(root, "interactivos")).includes("index.html")) htmlFiles.push("interactivos/index.html");
} catch {}
try {
  if (readdirSync(join(root, "capsulas")).includes("index.html")) htmlFiles.push("capsulas/index.html");
} catch {}
for (const directory of ['presentaciones', 'presentaciones/editor', 'presentaciones/reproductor', 'sites', 'digital-twins', 'digital-twins/help', 'digital-twins/galleon-100', 'digital-twins/apple-watch-ultra', 'digital-twins/iphone-pro-max', 'digital-twins/eink-sy11-ab', 'digital-twins/samsung-fold', 'digital-twins/iphone-duo', 'digital-twins/iphone-duo-fisico', 'digital-twins/trio', 'digital-twins/stream-deck', 'digital-twins/admiranext01', 'digital-twins/admiranext05']) {
  try { if (readdirSync(join(root, directory)).includes('index.html')) htmlFiles.push(directory + '/index.html'); } catch {}
}
let changed = 0;
let stale = [];

for (const file of htmlFiles) {
  const path = join(root, file);
  const before = readFileSync(path, "utf8");
  // Solo los assets propios versionados; no tocamos enlaces externos.
  let after = before.replace(
    /(\bhref="\/?assets\/[^"?]+|\bsrc="\/?assets\/[^"?]+)\?v=[^"]*/g,
    (_m, head) => `${head}?v=${version}`,
  );
  // These shared entry modules used to load without a token. A cached i18n
  // dictionary otherwise leaves new navigation labels untranslated after deploy.
  after = after.replace(
    /(\b(?:src|href)="\/?assets\/(?:director-twin\.(?:mjs|css)|i18n\.js|site-session\.mjs|capsule-launcher\.mjs|site-language\.js|site-shell\.(?:mjs|css)|meta-style\.css|update-notice\.(?:mjs|css)|capsula-editor\.js))(?:\?v=[^"]*)?"/g,
    (_m, head) => `${head}?v=${version}"`,
  );
  if (file === "interactivos/index.html") after = after.replace(
    /(\b(?:href|src)="\.\.\/assets\/[^"?]+)(?:\?v=[^"]*)?/g,
    (_m, head) => `${head}?v=${version}`,
  );
  if (file.startsWith('digital-twins/')) {
    after = after.replace(/(\b(?:href|src)="\/digital-twins\/[^"?]+\.(?:mjs|js|css))(?:\?v=[^"]*)?"/g, (_m, head) => `${head}?v=${twinVersion}"`);
    if (file === 'digital-twins/galleon-100/index.html' || file === 'digital-twins/apple-watch-ultra/index.html' || file === 'digital-twins/iphone-pro-max/index.html' || file === 'digital-twins/eink-sy11-ab/index.html' || file === 'digital-twins/samsung-fold/index.html' || file === 'digital-twins/iphone-duo/index.html' || file === 'digital-twins/iphone-duo-fisico/index.html' || file === 'digital-twins/trio/index.html') after = after.replace(/(\bsrc="\.\/twin\.mjs)(?:\?v=[^"]*)?"/g, (_m, head) => `${head}?v=${twinVersion}"`);
  }
  if (file === 'index.html') after = stampPageRevision(after);
  if (after === before) continue;
  stale.push(file);
  if (!checkOnly) {
    writeFileSync(path, after);
    changed += 1;
  }
}

if (checkOnly) {
  if (stale.length) {
    console.error(`✗ ?v= desfasado (esperado ${version}) en: ${stale.join(", ")}`);
    console.error("  arréglalo con: npm run stamp");
    process.exit(1);
  }
  console.log(`✓ todos los ?v= al día (${version})`);
} else {
  console.log(changed ? `✓ ${changed} fichero(s) sellados con ?v=${version}` : `✓ ya estaban al día (${version})`);
}
