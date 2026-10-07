// Regenera /plantillas/quiosco-de-pedidos.json desde el editor real (lo sirve el MCP crear_proyecto).
// Uso: python3 -m http.server 8765 &  →  node scripts/plantillas-export.mjs [http://127.0.0.1:8765]
import { chromium } from 'playwright';
import fs from 'node:fs';
const base = process.argv[2] || 'http://127.0.0.1:8765';
const exe = ['/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].find((p) => fs.existsSync(p));
const b = await chromium.launch(exe ? { executablePath: exe } : {}); const p = await b.newPage();
p.on('dialog', (d) => d.accept());
await p.goto(base + '/studio.html?plantilla=quiosco');
await p.waitForFunction(() => window.ainDirector && window.currentPlan?.()?.template === 'quiosco-de-pedidos', null, { timeout: 30000 });
const proj = await p.evaluate(() => { const x = window.ainDirector.exportProject(); return typeof x === 'string' ? JSON.parse(x) : x; });
fs.writeFileSync('plantillas/quiosco-de-pedidos.json', JSON.stringify(proj, null, 1));
await b.close(); console.log('plantillas/quiosco-de-pedidos.json', proj.plan.stageItems.length, 'sprites');
