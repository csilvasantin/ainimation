import test from 'node:test';
import assert from 'node:assert/strict';
import {rememberVerifiedSession, clearSiteSession, sessionExpiry, mountSessionNavigation} from '../assets/site-session.mjs';

function fixture() {
  const win = new EventTarget(), values = new Map(), timers = new Map();
  let timerId = 0;
  win.sessionStorage = {getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key)};
  win.setTimeout = fn => { timers.set(++timerId, fn); return timerId; };
  win.clearTimeout = id => timers.delete(id);
  const links = [{hidden: true}, {hidden: true}];
  return {win, values, timers, links, doc: {querySelectorAll: () => links}};
}
const token = exp => 'test.' + Buffer.from(JSON.stringify({exp, email:'private@example.test'})).toString('base64url') + '.test';

test('el menú parte cerrado y sólo conserva la caducidad de una sesión verificada', () => {
  const f = fixture(), exp = Math.floor(Date.now()/1000) + 1800;
  mountSessionNavigation(f.doc, f.win);
  assert.ok(f.links.every(link => link.hidden));
  const credential = token(exp);
  rememberVerifiedSession(credential, f.win);
  assert.ok(f.links.every(link => !link.hidden));
  assert.equal(sessionExpiry(f.win), exp * 1000);
  const saved = [...f.values.values()].join();
  assert.doesNotMatch(saved, /private@example|test\./);
  assert.deepEqual(JSON.parse(saved), {expiresAt: exp * 1000});
  clearSiteSession(f.win);
  assert.ok(f.links.every(link => link.hidden));
  assert.equal(f.values.size, 0);
});

test('al caducar o volver desde el historial se ocultan de nuevo las entradas de sesión', t => {
  const f = fixture(), now = 2000000000000;
  t.mock.method(Date, 'now', () => now);
  rememberVerifiedSession(token(now/1000 + 30), f.win);
  mountSessionNavigation(f.doc, f.win);
  assert.ok(f.links.every(link => !link.hidden));
  t.mock.method(Date, 'now', () => now + 31000);
  const refresh = [...f.timers.values()][0];
  refresh();
  assert.ok(f.links.every(link => link.hidden));
  f.win.dispatchEvent(new Event('pageshow'));
  assert.ok(f.links.every(link => link.hidden));
});

test('datos caducados, malformados o almacenamiento bloqueado mantienen el menú público', () => {
  for (const credential of ['bad-token', token(1)]) {
    const f = fixture();
    rememberVerifiedSession(credential, f.win);
    assert.equal(sessionExpiry(f.win), 0);
  }
  const f = fixture();
  Object.defineProperty(f.win, 'sessionStorage', {get() { throw Error('blocked'); }});
  assert.doesNotThrow(() => rememberVerifiedSession(token(Date.now()/1000+30), f.win));
  assert.equal(sessionExpiry(f.win), 0);
  assert.doesNotThrow(() => mountSessionNavigation(f.doc, f.win));
  assert.ok(f.links.every(link => link.hidden));
});
