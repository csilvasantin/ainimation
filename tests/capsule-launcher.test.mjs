import test from 'node:test';
import assert from 'node:assert/strict';
import {capsuleEditorPath} from '../assets/capsule-launcher.mjs';

test('el enlace del editor y el enlace compartido del Stock abren la pieza elegida', () => {
  const expected = '/studio.html?mode=capsula&admiraStockId=1792700022035-lho8uh';
  assert.equal(capsuleEditorPath('1792700022035-lho8uh'), expected);
  assert.equal(capsuleEditorPath('https://www.ainimation.studio/studio.html?mode=capsula&admiraStockId=1792700022035-lho8uh'), expected);
  assert.equal(capsuleEditorPath('https://admira.studio/stock.html?highlight=1792700022035-lho8uh'), expected);
  assert.equal(capsuleEditorPath('https://www.ainimation.studio/studio.html?admiraCapsuleRef=capsula-url:aa519cf8a50173ad'), '/studio.html?admiraCapsuleRef=capsula-url%3Aaa519cf8a50173ad');
});

test('un número visible o un enlace sin cápsula no abre un editor vacío ni un destino externo', () => {
  for (const value of ['', '1815', '#1815', 'https://', 'javascript:alert(1)', 'https://example.test/', 'https://example.test/?highlight=../../elsewhere']) {
    assert.equal(capsuleEditorPath(value), null);
  }
});
