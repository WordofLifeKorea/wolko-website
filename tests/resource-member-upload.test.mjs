import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestPost as uploadFile, onRequestGet as getFile, onRequestPut as editFile, onRequestDelete as deleteFile } from '../functions/api/portal/resource-file.js';
import { onRequestGet as listResources, onRequestPost as createItem } from '../functions/api/portal/resources.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { KV_KEY } from '../functions/lib/portalResources.js';

function env() {
  const store = new Map(), metadata = new Map();
  store.set(KV_KEY, JSON.stringify({ items: [{ id: 'r1', title: 'Lesson', files: [{ id: 'f1', fileName: 'old.pdf', fileType: 'application/pdf' }] }], updatedAt: 'x' }));
  store.set('hub:account:member@x.com', JSON.stringify({ email: 'member@x.com', name: 'Member', status: 'approved' }));
  return {
    ADMIN_PASSWORD: 'secret',
    CAMP_KV: {
      async get(k, t) { const v = store.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; },
      async getWithMetadata(k, opts) {
        const v = store.get(k), type = typeof opts === 'string' ? opts : opts?.type;
        return { value:v == null ? null : type === 'stream' ? new Response(v).body : v, metadata:metadata.get(k) || null };
      },
      async put(k, v, options) { store.set(k, v); metadata.set(k, options?.metadata); },
      async delete(k) { store.delete(k); },
    },
  };
}
const call = (fn, e, token, { method = 'POST', body, query = '' } = {}) => fn({ env: e, request: new Request('https://wolko.org/api/portal/x' + query, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }) });
const upload = { id: 'r1', fileName: 'new.txt', fileType: 'text/plain', fileData: 'data:text/plain;base64,' + btoa('hello') };

test('NAS resource uploads above 40MB stream, retain identity and download as binary', async t => {
  const e = { ...env(), TEACH_NAS_URL:'https://files.example.com', TEACH_NAS_TOKEN:'a'.repeat(64) };
  const member = await createHubSessionToken(e.ADMIN_PASSWORD, 'member@x.com', 'counselor');
  let stored;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.headers.get('Authorization'), 'Bearer ' + e.TEACH_NAS_TOKEN);
    if (options.method === 'PUT') {
      assert.equal(options.headers.get('X-Wolko-Group'), 'documents');
      assert.ok(options.body instanceof ReadableStream);
      stored = await new Response(options.body).arrayBuffer();
      return new Response('', { status:201 });
    }
    return new Response(stored);
  });
  const size = 41 * 1024 * 1024;
  const raw = meta => new Request('https://wolko.org/api/portal/resource-file', { method:'POST',
    headers:{ Authorization:`Bearer ${member}`, 'X-Wolko-Upload':encodeURIComponent(JSON.stringify(meta)) },
    body:new Uint8Array(size) });
  const request = raw({ id:'r1', fileName:'large.zip', fileType:'application/zip' });
  request.arrayBuffer = () => assert.fail('upload must stream');
  const response = await uploadFile({ env:e, request });
  assert.equal(response.status, 200);
  const file = (await response.json()).item.files.at(-1);
  assert.equal(file.fileSize, size);
  assert.equal(file.uploadedByName, 'Member');
  assert.equal(stored.byteLength, size);
  const download = await call(getFile, e, member, { method:'GET', query:`?id=r1&fileId=${file.id}&binary=1` });
  assert.equal(download.status, 200);
  assert.equal(download.headers.get('Content-Type'), 'application/zip');
  assert.equal((await download.arrayBuffer()).byteLength, size);
  assert.equal((await uploadFile({ env:e, request:raw({ id:'r1', fileId:'f1', fileName:'replace.zip' }) })).status, 403);
  assert.equal((await call(getFile, e, 'invalid', { method:'GET', query:`?id=r1&fileId=${file.id}&binary=1` })).status, 401);
});

test('raw Word uploads retain their original and legacy binary downloads remain readable', async () => {
  const e = env();
  const member = await createHubSessionToken(e.ADMIN_PASSWORD, 'member@x.com', 'counselor');
  const response = await uploadFile({ env:e, request:new Request('https://wolko.org/api/portal/resource-file', {
    method:'POST', headers:{ Authorization:`Bearer ${member}`,
      'X-Wolko-Upload':encodeURIComponent(JSON.stringify({ id:'r1', fileName:'lesson.docx', fileType:'application/docx' })) },
    body:'Word bytes' }) });
  assert.equal(response.status, 200);
  const file = (await response.json()).item.files.at(-1);
  assert.equal(file.versions[0].isOriginal, true);
  const download = await call(getFile, e, member, { method:'GET', query:`?id=r1&fileId=${file.id}&binary=1` });
  assert.equal(await download.text(), 'Word bytes');
  await e.CAMP_KV.put('portal:resource-file:r1:legacy', JSON.stringify({ fileName:'old.txt', fileType:'text/plain', fileData:'data:text/plain;base64,aGVsbG8=' }));
  assert.equal(await (await call(getFile, e, member, { method:'GET', query:'?id=r1&fileId=legacy&binary=1' })).text(), 'hello');
});

test('a general member can add a new file to a resource, but cannot replace, edit or delete files or create items', async () => {
  const e = env();
  const member = await createHubSessionToken(e.ADMIN_PASSWORD, 'member@x.com', 'counselor');
  const admin = await createHubSessionToken(e.ADMIN_PASSWORD, 'hkim3@wol.org', 'admin');

  const list = await (await call(listResources, e, member, { method: 'GET' })).json();
  assert.equal(list.canWrite, false);
  assert.equal(list.canUpload, true, '멤버에게 파일 추가 버튼이 보인다');

  const added = await call(uploadFile, e, member, { body: upload });
  assert.equal(added.status, 200, '새 파일 추가');
  const item = (await added.json()).item;
  assert.equal(item.files.length, 2);
  assert.equal(item.files[1].uploadedBy, 'member@x.com');

  assert.equal((await call(uploadFile, e, member, { body: { ...upload, fileId: 'f1' } })).status, 403, '기존 파일 교체는 관리자만');
  assert.equal((await call(editFile, e, member, { method: 'PUT', body: { id: 'r1', fileId: 'f1', reviewerSlug: 'x' } })).status, 403);
  assert.equal((await call(deleteFile, e, member, { method: 'DELETE', query: '?id=r1&fileId=f1' })).status, 403);
  assert.equal((await call(createItem, e, member, { body: { item: { title: 'New' } } })).status, 403, '항목 만들기는 관리자만');

  assert.equal((await call(uploadFile, e, admin, { body: { ...upload, fileId: 'f1' } })).status, 200, '관리자는 교체 가능');
  assert.equal((await call(uploadFile, e, 'bad-token', { body: upload })).status, 401);
});
