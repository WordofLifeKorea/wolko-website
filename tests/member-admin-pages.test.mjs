import assert from 'node:assert/strict';
import test from 'node:test';
import * as Rsvp from '../functions/api/rsvp.js';
import * as Reg from '../functions/api/admin/registrations.js';
import * as Team from '../functions/api/admin/team-overview.js';
import { createHubSessionToken, putAccount } from '../functions/lib/hubAccounts.js';

function env() {
  const values = new Map();
  return {
    ADMIN_PASSWORD: 'secret',
    CAMP_KV: {
      async get(k, t) { const v = values.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); },
      async put(k, v) { values.set(k, v); },
      async delete(k) { values.delete(k); },
      async list({ prefix = '' } = {}) { return { keys: [...values.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
    },
  };
}
const call = (fn, e, token, path = '/api/x', method = 'GET') =>
  fn({ env: e, request: new Request('https://wolko.org' + path, { method, headers: token ? { Authorization: `Bearer ${token}` } : {} }) });

test('이벤트 관리 · 캠프 관리자는 승인된 일반 멤버도 열 수 있고, 삭제는 관리자만', async () => {
  const e = env();
  await putAccount(e, { email: 'm@x.com', name: 'M', role: 'counselor', status: 'approved' });
  await putAccount(e, { email: 'hkim3@wol.org', name: 'A', role: 'admin', status: 'approved' });
  await putAccount(e, { email: 'w@x.com', name: 'W', role: 'counselor', status: 'pending' });
  const member = await createHubSessionToken(e.ADMIN_PASSWORD, 'm@x.com', 'counselor');
  const admin = await createHubSessionToken(e.ADMIN_PASSWORD, 'hkim3@wol.org', 'admin');
  const pending = await createHubSessionToken(e.ADMIN_PASSWORD, 'w@x.com', 'counselor');

  assert.equal((await call(Rsvp.onRequestGet, e, member, '/api/rsvp?eventId=thanksgiving-night')).status, 200);
  assert.equal((await call(Rsvp.onRequestGet, e, pending, '/api/rsvp?eventId=thanksgiving-night')).status, 401);
  assert.equal((await call(Rsvp.onRequestGet, e, null, '/api/rsvp?eventId=thanksgiving-night')).status, 401);
  assert.equal((await call(Rsvp.onRequestDelete, e, member, '/api/rsvp?eventId=thanksgiving-night&rsvpId=x', 'DELETE')).status, 401, '신청 삭제는 관리자만');

  assert.equal((await call(Reg.onRequestGet, e, member, '/api/admin/registrations')).status, 200);
  assert.equal((await call(Reg.onRequestGet, e, pending, '/api/admin/registrations')).status, 401);
  assert.equal((await call(Reg.onRequestDelete, e, member, '/api/admin/registrations?regId=a&campId=b', 'DELETE')).status, 401, '캠프 신청 삭제는 관리자만');
  assert.notEqual((await call(Reg.onRequestDelete, e, admin, '/api/admin/registrations?regId=a&campId=b', 'DELETE')).status, 401);

  assert.equal((await call(Team.onRequestGet, e, member, '/api/admin/team-overview?campId=wolko-2026')).status, 200);
  assert.equal((await call(Team.onRequestGet, e, null, '/api/admin/team-overview?campId=wolko-2026')).status, 401);
});

test('예약금 수납 · 확정(PATCH)은 관리자/마스터/회계 담당자만, 일반 멤버는 거절', async () => {
  const e = env();
  await putAccount(e, { email: 'm@x.com', name: 'M', role: 'counselor', status: 'approved' });
  await putAccount(e, { email: 'hkim3@wol.org', name: 'A', role: 'admin', status: 'approved' });
  await putAccount(e, { email: 'jennyson@wol.org', name: 'Jenny', role: 'counselor', status: 'approved' });
  const tok = async (email, role) => createHubSessionToken(e.ADMIN_PASSWORD, email, role);
  const patch = async token => (await Reg.onRequestPatch({ env: e, request: new Request('https://wolko.org/api/admin/registrations', { method: 'PATCH', headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify({ regId: 'r', campId: 'c', action: 'deposit' }) }) })).status;
  assert.equal(await patch(await tok('m@x.com', 'counselor')), 401, '일반 멤버 거절');
  assert.notEqual(await patch(await tok('jennyson@wol.org', 'counselor')), 401, '회계 담당자 허용');
  assert.notEqual(await patch(await tok('hkim3@wol.org', 'admin')), 401, '관리자 허용');
  assert.notEqual(await patch(await tok('wolkorea1@gmail.com', 'master')), 401, '마스터 허용');
});
