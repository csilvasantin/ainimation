import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("./studio.html", import.meta.url), "utf8");
const css = await readFile(new URL("./assets/styles.css", import.meta.url), "utf8");
const js = await readFile(new URL("./assets/app.js", import.meta.url), "utf8");

// Cortes 1+2 (FLT-100150): una sola superficie /studio con Cast · Stage · Score · inspector.
test("Corte 1 · el estudio arranca en Modo Director (fijo) y se puede volver a ventanas flotantes", () => {
  assert.match(html, /<div class="director-workbench is-docked" data-layout="docked">/, "fijo por defecto, sin parpadeo");
  assert.match(html, /data-layout-toggle/); assert.match(html, /data-inspector-toggle/, "el inspector de la derecha se pliega");
  assert.match(css, /\.director-workbench\.is-docked \{[\s\S]*grid-template-areas: "tools cast stage side" "tools score score score"/, "herramientas · Cast izq · Stage centro · inspector der · Score abajo full-width");
  assert.match(css, /\.director-workbench\.is-docked\.is-inspector-collapsed/);
  assert.match(js, /function applyLayoutMode\(mode\)/); assert.match(js, /localStorage\.getItem\(layoutStorageKey\)/);
  assert.match(js, /if \(isStackedLayout\(\) \|\| workbench\.classList\.contains\("is-docked"\)\) return;/, "en modo fijo no hay geometría inline ni arrastre");
  assert.match(js, /dockedSideWindows = \["inspector", "prompt", "script", "payment"\]/, "AI Director, Behaviour y Payment viven en el inspector; no se rehace el board");
});

test("Corte 1 · Produce vive detrás de ▶ Play, no como segunda web", () => {
  assert.match(html, /data-produce-video/);
  assert.match(js, /produceWorkerBase = "https:\/\/ainimation\.admira\.store"/);
  assert.match(js, /function briefFromPlan\(plan\)/); assert.match(js, /\/api\/produce/); assert.match(js, /\/api\/job\//);
  assert.match(js, /no hay ningún renderizador activo/, "si la sala está apagada se dice con el id, no se gira para siempre");
});

test("Corte 2 · el Score es canales × fotogramas con playhead y sprites del Cast", () => {
  assert.match(js, /<b class="score-channel-number" aria-label="Canal \$\{channelIndex \+ 1\}">\$\{channelIndex \+ 1\}<\/b>/, "cada fila lleva su número de canal");
  assert.match(css, /calc\(100% \/ var\(--timeline-display-frames, 240\)\)/, "una línea por fotograma, calculada del zoom del Score");
  assert.match(css, /calc\(500% \/ var\(--timeline-display-frames, 240\)\)/, "y una marcada cada cinco");
  assert.match(js, /scoreGrid\.style\.setProperty\("--timeline-display-frames", displayFrames\)/);
  assert.match(js, /class="score-playhead" role="slider"/); assert.match(js, /class="score-sprite/);
  assert.match(js, /function castDropTargetAt\(clientX, clientY\)[\s\S]*type: "timeline",[\s\S]*startFrame: frameFromTimelineClientX/, "arrastrar un miembro del Cast al Score lo coloca en ese fotograma");
  assert.match(js, /function syncStageToFrame\(/, "▶ Play y el scrub mueven el Stage según el Score (verdad Stage = Score)");
  assert.match(js, /function interpolateStageKeyframe\(member, frame/, "sprite = instancia del Cast con propiedades en el tiempo");
  assert.match(js, /function saveFilmPlan\(plan\)/, "persistencia JSON de la película");
});

// Corrección de Jobs (#2906 · FLT-100152): no reinventar, y cinco puntos concretos.
test("Corrección · sin tope de 6 en el Stage, sprites multi-instancia desde el Cast y el inspector ya no se llama Score", () => {
  assert.doesNotMatch(js, /importedStageMembers\.slice\(0, 6\)/, "el Stage pinta todos los miembros");
  assert.match(js, /function addCastInstance\(plan, sourceIndex/); assert.match(js, /instanceOf: key/);
  assert.match(js, /current\.onStage !== false && current\.imported\s*\? addCastInstance/, "soltar otra vez un miembro que ya está en el Stage crea otro sprite");
  assert.match(js, /if \(plan\.cast\[castIndex\]\.instanceOf\) \{[\s\S]*plan\.cast\.splice\(castIndex, 1\)/, "quitar una instancia la elimina, no la devuelve al Cast");
  assert.match(js, /if \(member\.instanceOf\) return "";/, "las instancias no son tarjetas nuevas del Cast");
  assert.match(js, /data-cast-instance=/); assert.match(js, /name: member\.instanceOf \? `\$\{member\.name\} ·\$\{member\.instanceIndex \|\| 2\}` : member\.name/, "cada instancia es un canal propio del Score");
  assert.match(html, /data-window-title="Brief"/); assert.match(html, /<strong>Brief<\/strong>/); assert.doesNotMatch(html, /data-open-window="inspector">Score</);
});
