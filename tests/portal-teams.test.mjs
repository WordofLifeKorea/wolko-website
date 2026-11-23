import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as api from '../functions/api/portal/teams.js';
import { teamsOf, TEAMS_KEY } from '../functions/lib/portalTeams.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';

function setup() {
  const store = new Map();
  const CAMP_KV = {
    async get(k, t) { const v = store.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); },
    async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  const env = { CAMP_KV, ADMIN_PASSWORD: 'secret' };
  const acc = (email, role = 'counselor', name = '') => store.set(`hub:account:${email}`, JSON.stringify({ email, name: name || email, role, status: 'approved' }));
  const call = async (method, who, body) => {
    const headers = { 'Content-Type': 'application/json' };
    if (who) headers.Authorization = 'Bearer ' + await createHubSessionToken('secret', who[0], who[1]);
    const request = new Request('https://t.co/api/portal/teams', { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const res = await { GET: api.onRequestGet, POST: api.onRequestPost }[method]({ env, request });
    return { status: res.status, ...(await res.json()) };
  };
  return { store, env, acc, call };
}
const admin = ['hkim3@wol.org', 'admin'], anna = ['anna@wol.org', 'counselor'];

test('팀: 마스터 · 관리자만 만들고 배정하며, 한 사람이 여러 팀에 들어간다', async () => {
  const t = setup(); t.acc(admin[0], 'admin', '관리자'); t.acc(anna[0], 'counselor', 'Anna');
  assert.equal((await t.call('GET', null)).status, 401);
  assert.equal((await t.call('POST', anna, { action: 'create', name: '캠프팀' })).status, 403, '일반 멤버는 팀을 만들 수 없다');
  const a = await t.call('POST', admin, { action: 'create', name: '캠프팀' });
  const b = await t.call('POST', admin, { action: 'create', name: '미디어팀' });
  assert.equal(a.status, 200); assert.equal(b.teams.length, 2);
  assert.equal((await t.call('POST', admin, { action: 'create', name: '캠프팀' })).status, 409, '같은 이름은 거절');
  const ids = b.teams.map(x => x.id);
  const as = await t.call('POST', admin, { action: 'assign', email: 'Anna@WOL.org', teams: [...ids, 'tnope1234'] });
  assert.deepEqual(as.assigned.sort(), ids.sort(), '없는 팀은 빼고 저장');
  assert.deepEqual((await teamsOf(t.env, 'anna@wol.org')).sort(), ids.sort());
  const view = await t.call('GET', anna);
  assert.equal(view.canManage, false); assert.equal(view.people, undefined, '일반 멤버에게는 사람 목록을 주지 않는다');
  assert.deepEqual(view.mine.sort(), ids.sort());
  const adminView = await t.call('GET', admin);
  assert.ok(adminView.people.some(p => p.email === 'anna@wol.org' && p.teams.length === 2));
  await t.call('POST', admin, { action: 'rename', id: ids[0], name: '캠프 & 아웃리치' });
  await t.call('POST', admin, { action: 'delete', id: ids[1] });
  assert.deepEqual(await teamsOf(t.env, 'anna@wol.org'), [ids[0]], '지운 팀은 멤버에게서도 빠진다');
  assert.equal(JSON.parse(t.store.get(TEAMS_KEY)).teams[0].name, '캠프 & 아웃리치');
});

test('팀 관리 단추는 마스터 · 관리자에게만, 화면 스크립트를 불러온다', () => {
  const hub = readFileSync(new URL('../src/pages/portal.astro', import.meta.url), 'utf8');
  assert.match(hub, /id="teamsBtn"[^>]*hidden/);
  assert.match(hub, /\$\('teamsBtn'\)\.hidden = !\['master', 'admin'\]\.includes/);
  assert.match(hub, /\/portal-teams\.js\?v=\d+/);
  const js = readFileSync(new URL('../public/portal-teams.js', import.meta.url), 'utf8');
  assert.match(js, /function esc\(/);
  assert.doesNotMatch(js, /innerHTML = [^;]*\+ (p|t)\.name \+/, '이름은 esc() 를 거쳐 넣는다');
});
