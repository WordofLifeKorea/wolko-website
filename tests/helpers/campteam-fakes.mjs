// 캠프팀 테스트 공통 모의 객체: Cloudflare D1 / R2 와 같은 모양을 내장 SQLite·메모리로 흉내 낸다
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { createHubSessionToken } from '../../functions/lib/hubAccounts.js';

export const root = fileURLToPath(new URL('../..', import.meta.url));
export const SECRET = 'test-secret';

export function fakeD1({ seed = true, spy } = {}) {
  const sqlite = new DatabaseSync(':memory:');
  const dir = root + 'camp-team/db/';
  for (const f of readdirSync(dir).filter(n => /^\d{4}_.*\.sql$/.test(n)).sort()) sqlite.exec(readFileSync(dir + f, 'utf8'));
  if (seed) for (const f of readdirSync(dir).filter(n => /^seed-dummy.*\.sql$/.test(n)).sort()) sqlite.exec(readFileSync(dir + f, 'utf8')); // seed-dummy.sql 다음에 seed-dummy-ledger.sql
  return {
    sqlite,
    prepare(sql) {
      spy?.(sql);
      const st = sqlite.prepare(sql);
      const bound = (a) => ({
        first: async () => st.get(...a) ?? null,
        all: async () => ({ results: st.all(...a) }),
        run: async () => { const r = st.run(...a); return { meta: { changes: Number(r.changes) } }; },
      });
      return { ...bound([]), bind: (...a) => bound(a) };
    },
    // D1 의 batch(): 한 묶음은 한 번의 트랜잭션
    async batch(list) { const out = []; sqlite.exec('BEGIN'); try { for (const st of list) out.push(await st.run()); sqlite.exec('COMMIT'); } catch (e) { sqlite.exec('ROLLBACK'); throw e; } return out; },
  };
}

export function fakeR2() {
  const m = new Map();
  return {
    m,
    async put(key, body, opts) { m.set(key, { bytes: new Uint8Array(await new Response(body).arrayBuffer()), opts }); },
    async get(key) { const o = m.get(key); return o ? { body: new Response(o.bytes).body, size: o.bytes.length } : null; },
  };
}

export const makeEnv = (db, extra = {}) => ({ DB: db, ADMIN_PASSWORD: SECRET, CAMPTEAM_DEV_AUTH: '1', ...extra });

export async function req(email, { method = 'GET', body, url = 'http://localhost:8788/api/campteam/x', headers = {} } = {}) {
  const h = { ...headers };
  if (email) h.Authorization = 'Bearer ' + await createHubSessionToken(SECRET, email, 'counselor');
  if (body && typeof body === 'object' && !(body instanceof Uint8Array)) { h['Content-Type'] = 'application/json'; body = JSON.stringify(body); }
  return new Request(url, { method, headers: h, body });
}
export const U = { admin: 'test-admin@wolko.org', dir: 'test-director@wolko.org', fin: 'test-finance@wolko.org', tre: 'test-treasurer@wolko.org', mem: 'test-member@wolko.org', view: 'test-viewer@wolko.org' };
