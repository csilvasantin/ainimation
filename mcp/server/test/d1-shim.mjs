// D1 mínimo sobre node:sqlite para probar las consultas reales de audiencia (solo tests).
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function d1() {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../migrations/0001_audiencia.sql', import.meta.url), 'utf8'));
  const stmt = (sql, args = []) => ({
    bind: (...a) => stmt(sql, a),
    run: async () => { const r = db.prepare(sql).run(...args); return { meta: { changes: Number(r.changes) } }; },
    all: async () => ({ results: db.prepare(sql).all(...args).map((x) => ({ ...x })) }),
    first: async () => { const r = db.prepare(sql).get(...args); return r ? { ...r } : null; },
  });
  return { prepare: (sql) => stmt(sql), batch: async (l) => Promise.all(l.map((s) => s.run())), _db: db };
}
