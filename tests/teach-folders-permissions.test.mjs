import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { generateTeachToken, teachSession } from '../functions/lib/teachAuth.js';
import * as Folders from '../functions/api/teach/folders.js';
import * as Data from '../functions/api/teach/data.js';
import * as Upload from '../functions/api/teach/upload.js';
import { foldersForCamp } from '../functions/lib/teachFolders.js';

async function setup() {
  const values = new Map();
  const env = { ADMIN_PASSWORD: 'secret', CAMP_KV: {
    get: async (key, type) => values.has(key) ? (type === 'json' ? JSON.parse(values.get(key)) : values.get(key)) : null,
    put: async (key, value) => values.set(key, value),
  } };
  const token = async (email, role = 'member', master = false) => generateTeachToken(env.ADMIN_PASSWORD, role, { email, name: email, role: master ? 'master' : 'counselor' });
  return { env, values, owner: await token('owner@example.com'), other: await token('other@example.com'), manager: await token('manager@example.com', 'admin'), master: await token('master@example.com', 'admin', true) };
}
function req(token, method = 'GET', body, path = 'folders') {
  return new Request('https://wolko.org/api/teach/' + path, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

test('ordinary members can create folders; only creator or master can delete', async () => {
  const { env, owner, other, manager, master } = await setup();
  const added = await Folders.onRequestPost({ env, request: req(owner, 'POST', { name: 'Materials', campId: 'camp-1', ownerEmail: 'forged@example.com' }) });
  assert.equal(added.status, 200);
  const folder = (await added.json()).folders[0];
  assert.equal(folder.ownerEmail, 'owner@example.com');
  const remove = token => Folders.onRequestDelete({ env, request: req(token, 'DELETE', null, `folders?campId=camp-1&id=${folder.id}`) });
  assert.equal((await remove(other)).status, 403);
  assert.equal((await remove(manager)).status, 403);
  assert.equal((await remove(owner)).status, 200);
  const builtin = token => Folders.onRequestDelete({ env, request: req(token, 'DELETE', null, 'folders?campId=camp-1&id=default:WOLKO') });
  assert.equal((await builtin(owner)).status, 403);
  assert.equal((await builtin(master)).status, 200);
  const state = await (await Folders.onRequestGet({ env, request: req(owner) })).json();
  assert.equal(foldersForCamp(state, 'camp-1').some(f => f.name === 'WOLKO'), false);
  assert.equal(foldersForCamp(state, 'camp-2').some(f => f.name === 'WOLKO'), true);
});

test('resource ownership is signed, not client-supplied; own delete works without admin role', async () => {
  const { env, owner, other, manager, master } = await setup();
  const item = { id: 'forged-id', tab: 'teacher', team: 'WOLKO', campIds: ['camp-1'], title: 'Lesson', archiveUrl: 'https://example.com/lesson.pdf', uploaderEmail: 'other@example.com' };
  const added = await Data.onRequestPost({ env, request: req(owner, 'POST', { item }, 'data') });
  const saved = (await added.json()).items[0];
  assert.notEqual(saved.id, 'forged-id');
  assert.equal(saved.uploaderEmail, 'owner@example.com');
  const remove = token => Data.onRequestDelete({ env, request: req(token, 'DELETE', null, `data?id=${saved.id}`) });
  assert.equal((await remove(other)).status, 403);
  assert.equal((await remove(manager)).status, 403);
  assert.equal((await remove(owner)).status, 200);
  await env.CAMP_KV.put('teach:data:v1', JSON.stringify({ items: [{ ...item, id: 'legacy', uploaderEmail: '' }] }));
  assert.equal((await Data.onRequestDelete({ env, request: req(owner, 'DELETE', null, 'data?id=legacy') })).status, 403);
  assert.equal((await Data.onRequestDelete({ env, request: req(master, 'DELETE', null, 'data?id=legacy') })).status, 200);
});

test('nonempty folders cannot be deleted; removed folders cannot receive new uploads', async () => {
  const { env, master, owner } = await setup();
  const item = { id: 'existing', tab: 'teacher', team: 'WOLKO', campIds: ['camp-1'], title: 'Lesson', archiveUrl: 'https://example.com/lesson.pdf' };
  await env.CAMP_KV.put('teach:data:v1', JSON.stringify({ items: [item] }));
  const remove = () => Folders.onRequestDelete({ env, request: req(master, 'DELETE', null, 'folders?campId=camp-1&id=default:WOLKO') });
  assert.equal((await remove()).status, 409);
  await env.CAMP_KV.put('teach:data:v1', JSON.stringify({ items: [] }));
  assert.equal((await remove()).status, 200);
  assert.equal((await Data.onRequestPost({ env, request: req(owner, 'POST', { item }, 'data') })).status, 400);
});

test('custom folders accept member uploads and owner edits cannot forge ownership', async () => {
  const { env, owner, other } = await setup();
  assert.equal((await Folders.onRequestPost({ env, request: req(owner, 'POST', { name: 'New Folder', campId: 'camp-1' }) })).status, 200);
  const item = { tab: 'teacher', team: 'New Folder', campIds: ['camp-1'], title: 'Custom Lesson', archiveUrl: 'https://example.com/lesson.pdf' };
  const created = await Data.onRequestPost({ env, request: req(owner, 'POST', { item }, 'data') });
  assert.equal(created.status, 200);
  const saved = (await created.json()).items[0];
  assert.equal((await Data.onRequestPut({ env, request: req(other, 'PUT', { item: saved }, 'data') })).status, 403);
  const edited = await Data.onRequestPut({ env, request: req(owner, 'PUT', { item: { ...saved, title: 'Edited', uploaderEmail: 'other@example.com' } }, 'data') });
  assert.equal(edited.status, 200);
  assert.equal((await edited.json()).items[0].uploaderEmail, 'owner@example.com');
});

test('duplicate folders, anonymous writes and signed master spoofing are rejected', async () => {
  const { env, owner } = await setup();
  assert.equal((await Folders.onRequestPost({ env, request: req(owner, 'POST', { name: 'WOLKO', campId: 'camp-1' }) })).status, 409);
  assert.equal((await Folders.onRequestPost({ env, request: req('', 'POST', { name: 'A', campId: 'camp-1' }) })).status, 401);
  const forged = btoa(atob(owner).replace(encodeURIComponent('"isMaster":false'), encodeURIComponent('"isMaster":true')));
  assert.equal(await teachSession(req(forged), env), null);
});

test('ordinary members can upload files into storage', async () => {
  const { env, owner } = await setup();
  const stored = [];
  env.TEACH_FILES = { put: async (...args) => stored.push(args) };
  const body = new FormData();
  body.append('file', new File(['test'], 'lesson.pdf', { type: 'application/pdf' }));
  body.append('kind', 'presentation');
  const response = await Upload.onRequestPost({ env, request: new Request('https://wolko.org/api/teach/upload', { method: 'POST', headers: { Authorization: `Bearer ${owner}` }, body }) });
  assert.equal(response.status, 200);
  assert.equal(stored.length, 1);
});

test('add buttons do not require edit mode and the resource script parses', () => {
  const page = readFileSync(new URL('../src/pages/camp-resources/index.astro', import.meta.url), 'utf8');
  assert.match(page, /id="folderManageBtn"/);
  assert.match(page, /hasStaffAccess\(\) && selectedCampId \? addButtonHtml/);
  assert.doesNotMatch(page, /editMode \? addButtonHtml/);
  for (const [, script] of page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    if (!script.trim()) continue;
    const result = spawnSync(process.execPath, ['--check', '--input-type=module'], { input: script, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});
