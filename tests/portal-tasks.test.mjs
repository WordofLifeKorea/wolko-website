import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as api from '../functions/api/portal/tasks.js';
import { checkBoard, MAX_BOARD_BYTES } from '../functions/lib/tasksBoards.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';

function setup() {
  const store = new Map();
  const CAMP_KV = { async get(k, t) { const v = store.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { store.set(k, v); }, async delete(k) { store.delete(k); } };
  const env = { CAMP_KV, ADMIN_PASSWORD: 'secret' };
  const acc = (email, role = 'counselor') => store.set(`hub:account:${email}`, JSON.stringify({ email, name: email, role, status: 'approved' }));
  const call = async (method, who, { query = '', body } = {}) => {
    const headers = { 'Content-Type': 'application/json' };
    if (who) headers.Authorization = 'Bearer ' + await createHubSessionToken('secret', who, 'counselor');
    const request = new Request(`https://t.co/api/portal/tasks${query}`, { method, headers, ...(body ? { body: JSON.stringify(body) } : {}) });
    const res = await { GET: api.onRequestGet, PUT: api.onRequestPut, DELETE: api.onRequestDelete }[method]({ env, request });
    return { status: res.status, ...(await res.json()) };
  };
  return { store, acc, call };
}
const board = (id, rev, extra = {}) => ({ id, title: '보드 ' + id, note: '', nodes: [{ id: 'n1', x: 0, y: 0, kind: 'goal', title: '목표', status: 'todo' }], edges: [], rev, updatedAt: Date.now(), ...extra });

test('업무관리: 로그인한 사람만, 자기 보드만 저장 · 불러오기 · 지우기', async () => {
  const t = setup(); t.acc('anna@wol.org'); t.acc('ben@wol.org');
  assert.equal((await t.call('GET', null)).status, 401);
  assert.equal((await t.call('PUT', null, { body: { board: board('b1', 1) } })).status, 401);
  assert.equal((await t.call('PUT', 'anna@wol.org', { body: { board: board('b1', 1) } })).status, 200);
  assert.equal((await t.call('PUT', 'anna@wol.org', { body: { board: board('b2', 1) } })).status, 200);
  const mine = await t.call('GET', 'anna@wol.org');
  assert.deepEqual(mine.boards.map(b => b.id).sort(), ['b1', 'b2']);
  assert.deepEqual((await t.call('GET', 'ben@wol.org')).boards, [], '다른 사람 보드는 보이지 않는다');
  assert.ok(![...t.store.keys()].filter(k => k.startsWith('tasks:')).some(k => k.includes('anna')), '저장 키에 이메일이 드러나지 않는다');
  assert.equal((await t.call('DELETE', 'anna@wol.org', { query: '?id=b1' })).status, 200);
  assert.deepEqual((await t.call('GET', 'anna@wol.org')).boards.map(b => b.id), ['b2']);
});

test('업무관리: 저장 번호(rev)가 오르지 않으면 409 와 저장된 보드를 돌려준다', async () => {
  const t = setup(); t.acc('anna@wol.org');
  await t.call('PUT', 'anna@wol.org', { body: { board: board('b1', 3, { title: '서버 것' }) } });
  const stale = await t.call('PUT', 'anna@wol.org', { body: { board: board('b1', 3, { title: '옛 기기' }) } });
  assert.equal(stale.status, 409);
  assert.equal(stale.board.title, '서버 것');
  assert.equal((await t.call('PUT', 'anna@wol.org', { body: { board: board('b1', 4, { title: '새 것' }) } })).status, 200);
  assert.equal((await t.call('GET', 'anna@wol.org')).boards[0].title, '새 것');
});

test('업무관리: 이상한 보드는 거절(id · 모양 · 크기)', async () => {
  assert.ok(checkBoard(null).error);
  assert.ok(checkBoard({ id: 'a"><img', nodes: [], edges: [] }).error);
  assert.ok(checkBoard({ id: 'ok', nodes: {}, edges: [] }).error);
  assert.equal(checkBoard({ id: 'ok', nodes: [], edges: [], note: 'x'.repeat(MAX_BOARD_BYTES) }).status, 413);
  assert.ok(checkBoard({ id: 'ok', nodes: [], edges: [] }).ok);
  const t = setup(); t.acc('anna@wol.org');
  assert.equal((await t.call('DELETE', 'anna@wol.org', { query: '?id=..%2F' })).status, 400);
});

test('업무관리: 포탈 메뉴 · 첫 화면 · 페이지가 연결돼 있다', () => {
  const rail = readFileSync(new URL('../public/wolko-rail.js', import.meta.url), 'utf8');
  assert.match(rail, /href: '\/portal\/tasks'[^}]*label: '업무관리', label_en: 'Tasks'/);
  assert.match(rail, /'\/portal\/tasks': '<rect/, '메뉴 그림(ART)이 있어야 toolIcon 이 그린다');
  const hub = readFileSync(new URL('../src/pages/portal.astro', import.meta.url), 'utf8');
  assert.match(hub, /href: '\/portal\/tasks'[^}]*icon: 'branches'/);
  assert.match(hub, /branches: '<circle/);
  const page = readFileSync(new URL('../src/pages/portal/tasks/index.astro', import.meta.url), 'utf8');
  assert.match(page, /\/tasks\.js\?v=\d+/);
  assert.match(page, /\/tasks\.css\?v=\d+/);
  assert.match(page, /id="tkLoginForm"/);
  const js = readFileSync(new URL('../public/tasks.js', import.meta.url), 'utf8');
  assert.match(js, /const API = '\/api\/portal\/tasks'/);
  assert.doesNotMatch(js, /claude\.use/, 'claude.ai 저장소를 쓰지 않는다');
  const css = readFileSync(new URL('../public/tasks.css', import.meta.url), 'utf8');
  const bare = css.replace(/@font-face\s*\{[^}]*\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').split('}').map(r => r.split('{')[0].trim()).filter(r => r && !r.startsWith('@'));
  for (const sel of bare) for (const one of sel.split(',')) assert.match(one.trim(), /^(#tkApp|body\.sheet-open #tkApp)/, '모든 규칙이 #tkApp 아래: ' + one);
});

test('업무관리: 목록(index)은 새 보드일 때만 쓴다(같은 키를 연달아 쓰지 않게)', async () => {
  const t = setup(); t.acc('anna@wol.org');
  await t.call('PUT', 'anna@wol.org', { body: { board: board('b1', 1) } });
  const idxKey = [...t.store.keys()].find(k => k.endsWith(':index'));
  const before = t.store.get(idxKey);
  t.store.set(idxKey, before + ' ');   // 표시: 다시 쓰이면 사라진다
  await t.call('PUT', 'anna@wol.org', { body: { board: board('b1', 2) } });
  assert.equal(t.store.get(idxKey), before + ' ', '이미 있는 보드를 저장할 때 목록을 다시 쓰지 않는다');
});

test('업무관리: 포탈 공통 클래스와 겹치는 이름을 쓰지 않는다(.toolbar 는 wolko-header.css 가 덮어씀)', () => {
  const css = readFileSync(new URL('../public/tasks.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /\.toolbar\b/);
  const js = readFileSync(new URL('../public/tasks.js', import.meta.url), 'utf8');
  assert.match(js, /document\.documentElement\.lang = LANG/, '레일 · 서랍이 페이지 언어를 따른다');
  assert.match(js, /undoStack = \[\]; redoStack = \[\];   \/\/ 되돌리기가 다른 기기에서 고친 내용을 지우지 않게/);
});
