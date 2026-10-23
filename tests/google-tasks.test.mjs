import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync } from 'node:crypto';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { listTaskBoard, addTask, setTaskCompleted } from '../functions/lib/googleTasks.js';
import { onRequestGet, onRequestPost } from '../functions/api/todo.js';

const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
// 토큰은 같은 isolate 안에서 재사용되므로 테스트마다 다른 서비스 계정 이메일을 쓴다.
let accountSeq = 0;
function newAccount() {
  return JSON.stringify({ client_email: `tasks-test-${++accountSeq}@example.iam.gserviceaccount.com`, private_key: privateKey });
}

const KEY = 'display-key-0123456789abcdef';
const jsonResponse = (data, status = 200) => new Response(JSON.stringify(data), { status });

/** fetch를 가짜로 바꿔 호출을 기록한다. 토큰 요청은 항상 성공시킨다. */
async function withFakeGoogle(handler, run) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    url = String(url);
    calls.push({ url, init });
    if (url === 'https://oauth2.googleapis.com/token') return jsonResponse({ access_token: 'tok', expires_in: 3600 });
    return handler(url, init);
  };
  try {
    await run(calls);
  } finally {
    globalThis.fetch = original;
  }
}

function tokenClaims(call) {
  const assertion = new URLSearchParams(call.init.body).get('assertion');
  return JSON.parse(Buffer.from(assertion.split('.')[1], 'base64url').toString());
}

test('token request impersonates the delegated user with only the tasks scope and is reused', async () => {
  const serviceAccountJson = newAccount();
  await withFakeGoogle(() => jsonResponse({ items: [] }), async (calls) => {
    await listTaskBoard({ serviceAccountJson, delegatedUser: 'me@wolko.org' });
    await listTaskBoard({ serviceAccountJson, delegatedUser: 'me@wolko.org' });
    const tokenCalls = calls.filter(c => c.url === 'https://oauth2.googleapis.com/token');
    assert.equal(tokenCalls.length, 1);
    const claims = tokenClaims(tokenCalls[0]);
    assert.equal(claims.sub, 'me@wolko.org');
    assert.equal(claims.scope, 'https://www.googleapis.com/auth/tasks');
    assert.match(claims.iss, /^tasks-test-\d+@example\.iam\.gserviceaccount\.com$/);
    assert.equal(calls.find(c => c.url.includes('/users/@me/lists')).init.headers.Authorization, 'Bearer tok');
  });
});

test('board lists every task list, skips completed/blank tasks and keeps only the due date', async () => {
  await withFakeGoogle((url) => {
    if (url.includes('/users/@me/lists')) {
      return jsonResponse({ items: [{ id: 'L1', title: '내 할 일' }, { id: 'L2', title: '캠프' }] });
    }
    assert.match(url, /showCompleted=false/);
    if (url.includes('/lists/L1/tasks')) {
      return jsonResponse({ items: [
        { id: 't1', title: '예산 보고', notes: '재무팀 확인\n2줄', due: '2026-10-25T00:00:00.000Z', status: 'needsAction' },
        { id: 't2', title: '   ', status: 'needsAction' },
        { id: 't3', title: '하위 작업', parent: 't1', status: 'needsAction' },
      ] });
    }
    return jsonResponse({});
  }, async () => {
    const board = await listTaskBoard({ serviceAccountJson: newAccount(), delegatedUser: 'me@wolko.org' });
    assert.deepEqual(board, [
      { id: 'L1', title: '내 할 일', tasks: [
        { id: 't1', title: '예산 보고', notes: '재무팀 확인\n2줄', due: '2026-10-25', status: 'needsAction', parent: null },
        { id: 't3', title: '하위 작업', notes: '', due: null, status: 'needsAction', parent: 't1' },
      ] },
      { id: 'L2', title: '캠프', tasks: [] },
    ]);
  });
});

test('board follows nextPageToken until the list is exhausted', async () => {
  await withFakeGoogle((url) => {
    if (url.includes('/users/@me/lists')) return jsonResponse({ items: [{ id: 'L1', title: 'A' }] });
    return url.includes('pageToken=p2')
      ? jsonResponse({ items: [{ id: 'b', title: 'B' }] })
      : jsonResponse({ items: [{ id: 'a', title: 'A1' }], nextPageToken: 'p2' });
  }, async () => {
    const [list] = await listTaskBoard({ serviceAccountJson: newAccount(), delegatedUser: 'me@wolko.org' });
    assert.deepEqual(list.tasks.map(t => t.id), ['a', 'b']);
  });
});

test('adding sets a UTC-midnight due date; reopening clears the completed time', async () => {
  await withFakeGoogle((url, init) => jsonResponse({ id: 'x', title: JSON.parse(init.body).title || 'x', status: 'needsAction' }), async (calls) => {
    const base = { serviceAccountJson: newAccount(), delegatedUser: 'me@wolko.org', listId: 'L1' };
    await addTask({ ...base, title: '새 일', due: '2026-11-01' });
    const add = calls.find(c => c.init.method === 'POST' && c.url.endsWith('/lists/L1/tasks'));
    assert.deepEqual(JSON.parse(add.init.body), { title: '새 일', due: '2026-11-01T00:00:00.000Z' });

    await setTaskCompleted({ ...base, taskId: 't9', completed: true });
    await setTaskCompleted({ ...base, taskId: 't9', completed: false });
    const patches = calls.filter(c => c.init.method === 'PATCH');
    assert.equal(patches[0].url, 'https://tasks.googleapis.com/tasks/v1/lists/L1/tasks/t9');
    assert.deepEqual(JSON.parse(patches[0].init.body), { status: 'completed' });
    assert.deepEqual(JSON.parse(patches[1].init.body), { status: 'needsAction', completed: null });
  });
});

function request(method, { key = KEY, body } = {}) {
  const headers = {};
  if (key) headers.Authorization = `Bearer ${key}`;
  return new Request('https://wolko.org/api/todo', { method, headers, body: body ? JSON.stringify(body) : undefined });
}
const baseEnv = () => ({ TODO_DISPLAY_KEY: KEY, GOOGLE_TASKS_USER: 'me@wolko.org', GOOGLE_SERVICE_ACCOUNT_JSON: newAccount() });

test('api refuses requests with a wrong or missing key and an unconfigured key', async () => {
  assert.equal((await onRequestGet({ request: request('GET', { key: 'wrong-key-wrong-key-123' }), env: baseEnv() })).status, 401);
  assert.equal((await onRequestGet({ request: request('GET', { key: '' }), env: baseEnv() })).status, 401);
  assert.equal((await onRequestPost({ request: request('POST', { key: 'nope', body: {} }), env: baseEnv() })).status, 401);
  // 키가 없거나 너무 짧으면 아무도 통과시키지 않는다.
  assert.equal((await onRequestGet({ request: request('GET'), env: { ...baseEnv(), TODO_DISPLAY_KEY: undefined } })).status, 503);
  assert.equal((await onRequestGet({ request: request('GET', { key: 'short' }), env: { ...baseEnv(), TODO_DISPLAY_KEY: 'short' } })).status, 503);
});

test('api reports which google settings are missing only after the key checks out', async () => {
  const res = await onRequestGet({ request: request('GET'), env: { TODO_DISPLAY_KEY: KEY } });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { error: 'not_configured', missing: ['GOOGLE_SERVICE_ACCOUNT_JSON', 'GOOGLE_TASKS_USER'] });
});

test('api GET returns the board without caching', async () => {
  await withFakeGoogle((url) => jsonResponse(url.includes('/users/@me/lists') ? { items: [{ id: 'L1', title: 'A' }] } : { items: [{ id: 't', title: '할 일' }] }), async () => {
    const res = await onRequestGet({ request: request('GET'), env: baseEnv() });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Cache-Control'), 'no-store');
    const data = await res.json();
    assert.equal(data.lists[0].tasks[0].title, '할 일');
    assert.ok(Date.parse(data.fetchedAt));
  });
});

test('api POST validates input before calling google', async () => {
  await withFakeGoogle(() => jsonResponse({ id: 'new', title: 'ok', status: 'needsAction' }), async (calls) => {
    const env = baseEnv();
    const bad = [
      { action: 'add', listId: 'L1', title: '   ' },
      { action: 'add', listId: 'L1', title: 'x'.repeat(1025) },
      { action: 'add', listId: 'L1', title: 'ok', due: '2026-02-30' },
      { action: 'add', listId: 'L1', title: 'ok', due: '내일' },
      { action: 'add', listId: '../evil', title: 'ok' },
      { action: 'complete', listId: 'L1', taskId: 't1', completed: 'yes' },
      { action: 'complete', listId: 'L1', taskId: 't1/../x', completed: true },
      { action: 'delete', listId: 'L1', taskId: 't1' },
    ];
    for (const body of bad) {
      assert.equal((await onRequestPost({ request: request('POST', { body }), env })).status, 400, JSON.stringify(body));
    }
    const notJson = new Request('https://wolko.org/api/todo', { method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: 'nope' });
    assert.equal((await onRequestPost({ request: notJson, env })).status, 400);
    assert.equal(calls.length, 0);

    const ok = await onRequestPost({ request: request('POST', { body: { action: 'add', listId: 'L1', title: ' 새 일 ', due: '2026-11-01' } }), env });
    assert.equal(ok.status, 200);
    assert.equal(JSON.parse(calls.find(c => c.init.method === 'POST' && c.url.includes('/tasks')).init.body).title, '새 일');
  });
});

test('api maps a missing delegation to google_error without leaking google text', async () => {
  const original = globalThis.fetch;
  const errors = console.error;
  console.error = () => {};
  globalThis.fetch = async () => jsonResponse({ error: 'unauthorized_client', error_description: 'Client is unauthorized to retrieve access tokens' }, 401);
  try {
    const res = await onRequestGet({ request: request('GET'), env: baseEnv() });
    assert.equal(res.status, 502);
    const text = await res.text();
    assert.deepEqual(JSON.parse(text), { error: 'google_error', code: 'unauthorized_client' });
    assert.ok(!text.includes('Client is unauthorized'));
  } finally {
    globalThis.fetch = original;
    console.error = errors;
  }
});

// ── 화면 로직(public/todo.js) ──
const pageSource = readFileSync(new URL('../public/todo.js', import.meta.url), 'utf8');
const pageHtml = readFileSync(new URL('../src/pages/todo.astro', import.meta.url), 'utf8');
const page = (() => {
  const window = {};
  vm.runInNewContext(pageSource, { window });
  return window.WolkoTodo;
})();
const plain = (value) => JSON.parse(JSON.stringify(value));

test('seoulToday rolls over at Korean midnight', () => {
  assert.equal(page.seoulToday(Date.parse('2026-10-23T14:59:00Z')), '2026-10-23');
  assert.equal(page.seoulToday(Date.parse('2026-10-23T15:01:00Z')), '2026-10-24');
});

test('due state and label are relative to the Korean date', () => {
  const today = '2026-10-23';
  assert.equal(page.dueState(null, today), null);
  assert.equal(page.dueState('2026-10-22', today), 'overdue');
  assert.equal(page.dueState('2026-10-23', today), 'today');
  assert.equal(page.dueState('2026-10-24', today), 'upcoming');
  assert.equal(page.dueLabel('2026-10-21', today), '10/21 · 2일 지남');
  assert.equal(page.dueLabel('2026-10-23', today), '오늘');
  assert.equal(page.dueLabel('2026-10-24', today), '내일');
  assert.equal(page.dueLabel('2026-11-03', today), '11/3');
  assert.equal(page.dueLabel('2027-01-02', '2026-12-31'), '1/2');
});

test('subtasks follow their parent and orphans move to the top level', () => {
  const tasks = [
    { id: 'a', parent: null }, { id: 'a1', parent: 'a' }, { id: 'b', parent: null },
    { id: 'a2', parent: 'a' }, { id: 'orphan', parent: 'completed-parent' }, { id: 'a1x', parent: 'a1' },
  ];
  assert.deepEqual(plain(page.nestTasks(tasks)).map(({ task, depth }) => `${task.id}:${depth}`),
    ['a:0', 'a1:1', 'a1x:2', 'a2:1', 'b:0', 'orphan:0']);
});

test('every element the script looks up exists in the page', () => {
  const ids = [...pageSource.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]);
  assert.ok(ids.length >= 10);
  for (const id of new Set(ids)) assert.ok(pageHtml.includes(`id="${id}"`), `missing #${id}`);
});
