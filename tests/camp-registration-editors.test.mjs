import test from 'node:test';
import assert from 'node:assert/strict';
import * as admin from '../functions/api/admin/registrations.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { isCampRegistrationEditor, CAMP_REGISTRATION_EDITORS } from '../functions/lib/campRegistrationAccess.js';

const campId = '2027-wolko-winter';
const reg = { regId: 'r1', campId, registrationType: 'individual', name: 'Kim', phone: '010-1111-2222', email: 'a@wol.org', gender: 'male', status: 'deposit', registeredAt: '2026-10-16T00:00:00.000Z' };

function setup() {
  const store = new Map();
  const kv = {
    get: async (k, type) => { const v = store.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
    put: async (k, v) => { store.set(k, v); },
    delete: async k => { store.delete(k); },
    list: async ({ prefix }) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }),
  };
  const env = { CAMP_KV: kv, ADMIN_PASSWORD: 'secret' };
  const account = (email, status = 'approved') => store.set(`hub:account:${email}`, JSON.stringify({ email, name: email, role: 'counselor', status }));
  const as = email => async (fn, url, init = {}) => {
    const token = await createHubSessionToken('secret', email, 'counselor');
    const res = await fn({ env, request: new Request(url, { headers: { Authorization: `Bearer ${token}` }, ...init }) });
    return { status: res.status, body: await res.json() };
  };
  const seed = () => { store.set(`camp:${campId}:reg:r1`, JSON.stringify(reg)); };
  return { store, account, as, seed };
}
const del = `https://x/api/admin/registrations?regId=r1&campId=${campId}`;
const post = action => ({ method: 'POST', body: JSON.stringify({ action, regId: 'r1', campId }) });

test('편집 담당 목록: hlim@wol.org 만 (대소문자 무시)', () => {
  assert.deepEqual(CAMP_REGISTRATION_EDITORS, ['hlim@wol.org']);
  assert.equal(isCampRegistrationEditor('HLim@WOL.org'), true);
  assert.equal(isCampRegistrationEditor('other@wol.org'), false);
  assert.equal(isCampRegistrationEditor(''), false);
});

test('편집 담당(hlim)은 신청을 삭제(휴지통)하고 휴지통을 보고 복원할 수 있다 — 영구 삭제는 못 한다', async () => {
  const t = setup(); t.account('hlim@wol.org'); t.seed();
  const hlim = t.as('hlim@wol.org');
  assert.equal((await hlim(admin.onRequestDelete, del, { method: 'DELETE' })).status, 200);
  assert.equal(t.store.has(`camp:${campId}:reg:r1`), false);
  assert.equal((await hlim(admin.onRequestGet, 'https://x/api/admin/registrations?trash=1')).body.trash.length, 1);
  assert.equal((await hlim(admin.onRequestPost, 'https://x/api/admin/registrations', post('purge'))).status, 403, '영구 삭제는 관리자만');
  assert.equal(t.store.has(`trash:camp:${campId}:reg:r1`), true, '영구 삭제가 막혔으니 휴지통에 그대로');
  assert.equal((await hlim(admin.onRequestPost, 'https://x/api/admin/registrations', post('restore'))).status, 200);
  assert.equal(t.store.has(`camp:${campId}:reg:r1`), true);
});

test('편집 담당이 아닌 일반 멤버는 삭제·휴지통을 쓸 수 없다 · 승인되지 않은 계정은 목록에 있어도 안 된다', async () => {
  const t = setup(); t.account('other@wol.org'); t.account('hlim@wol.org', 'pending'); t.seed();
  const other = t.as('other@wol.org');
  assert.equal((await other(admin.onRequestDelete, del, { method: 'DELETE' })).status, 401);
  assert.equal((await other(admin.onRequestGet, 'https://x/api/admin/registrations?trash=1')).status, 403);
  assert.equal((await other(admin.onRequestPost, 'https://x/api/admin/registrations', post('restore'))).status, 401);
  assert.equal((await t.as('hlim@wol.org')(admin.onRequestDelete, del, { method: 'DELETE' })).status, 401, '승인 전 계정');
  assert.equal(t.store.has(`camp:${campId}:reg:r1`), true, '아무것도 지워지지 않았다');
});

test('예약금 확인·최종 확정은 편집 담당에게 열리지 않는다(회계 담당만)', async () => {
  const t = setup(); t.account('hlim@wol.org'); t.seed();
  const res = await t.as('hlim@wol.org')(admin.onRequestPatch, 'https://x/api/admin/registrations', { method: 'PATCH', body: JSON.stringify({ regId: 'r1', campId, action: 'confirm' }) });
  assert.ok([401, 403].includes(res.status), String(res.status));
});

test('관리자·마스터는 영구 삭제도 그대로 할 수 있다', async () => {
  const t = setup(); t.seed();
  const token = await createHubSessionToken('secret', 'admin@wolko.org', 'master');
  const call = (fn, url, init = {}) => fn({ env: { CAMP_KV: { get: async (k, ty) => { const v = t.store.get(k); return v === undefined ? null : (ty === 'json' ? JSON.parse(v) : v); }, put: async (k, v) => t.store.set(k, v), delete: async k => t.store.delete(k), list: async ({ prefix }) => ({ keys: [...t.store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }) }, ADMIN_PASSWORD: 'secret' }, request: new Request(url, { headers: { Authorization: `Bearer ${token}` }, ...init }) }).then(async r => ({ status: r.status, body: await r.json() }));
  assert.equal((await call(admin.onRequestDelete, del, { method: 'DELETE' })).status, 200);
  assert.equal((await call(admin.onRequestPost, 'https://x/api/admin/registrations', post('purge'))).status, 200);
  assert.equal(t.store.has(`trash:camp:${campId}:reg:r1`), false);
});
