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

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.slice(2).some((a) => a === "-c" || a === "--check");

// Sha del último commit que tocó assets/. Si el árbol está sucio lo marcamos
// como -dirty: así en local nunca se sirve un token que miente sobre el commit.
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
let version = git("log", "-1", "--format=%h", "--", "assets");
if (!version) version = "dev";
if (git("status", "--porcelain", "--", "assets")) version += "-dirty";

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
let changed = 0;
let stale = [];

for (const file of htmlFiles) {
  const path = join(root, file);
  const before = readFileSync(path, "utf8");
  // Solo los assets propios versionados; no tocamos enlaces externos.
  const after = before.replace(
    /(\bhref="\/?assets\/[^"?]+|\bsrc="\/?assets\/[^"?]+)\?v=[^"]*/g,
    (_m, head) => `${head}?v=${version}`,
  );
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
