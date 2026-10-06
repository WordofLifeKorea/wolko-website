import assert from 'node:assert/strict';
import test from 'node:test';
import { onRequestPost as uploadFile, onRequestPut as editFile, onRequestDelete as deleteFile } from '../functions/api/portal/resource-file.js';
import { onRequestGet as listResources, onRequestPost as createItem } from '../functions/api/portal/resources.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { KV_KEY } from '../functions/lib/portalResources.js';

function env() {
  const store = new Map();
  store.set(KV_KEY, JSON.stringify({ items: [{ id: 'r1', title: 'Lesson', files: [{ id: 'f1', fileName: 'old.pdf', fileType: 'application/pdf' }] }], updatedAt: 'x' }));
  store.set('hub:account:member@x.com', JSON.stringify({ email: 'member@x.com', name: 'Member', status: 'approved' }));
  return {
    ADMIN_PASSWORD: 'secret',
    CAMP_KV: {
      async get(k, t) { const v = store.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; },
      async getWithMetadata(k) { const v = store.get(k); return { value: v ?? null, metadata: null }; },
      async put(k, v) { store.set(k, v); },
      async delete(k) { store.delete(k); },
    },
  };
}
const call = (fn, e, token, { method = 'POST', body, query = '' } = {}) => fn({ env: e, request: new Request('https://wolko.org/api/portal/x' + query, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }) });
const upload = { id: 'r1', fileName: 'new.txt', fileType: 'text/plain', fileData: 'data:text/plain;base64,' + btoa('hello') };

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
