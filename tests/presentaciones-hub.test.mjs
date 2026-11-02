import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';
const html=readFileSync(new URL('../presentaciones/index.html',import.meta.url),'utf8');
test('cuatro tarjetas en orden A, B, C, D',()=>{assert.deepEqual([...html.matchAll(/data-option="([A-Z])"/g)].map(m=>m[1]),['A','B','C','D']);});
test('B, C y D son próximamente y A disponible',()=>{const cards=html.split('data-option=').slice(1);assert.match(cards[0],/Disponible/);for(const c of cards.slice(1))assert.match(c,/Próximamente/);});
test('enlace visible al editor y enlaces vivos',()=>{assert.match(html,/id="open-editor"[^>]*href="\.\/editor\/"|href="\.\/editor\/"[^>]*id="open-editor"/);for(const p of ['editor','reproductor']){assert.ok(html.includes(`href="./${p}/"`));assert.ok(existsSync(new URL(`../presentaciones/${p}/index.html`,import.meta.url)));}});
test('sin claves ni tokens',()=>{assert.doesNotMatch(html,/anmcp_|sk-[A-Za-z0-9]|api[_-]?key|secret|token|password|Bearer /i);});
