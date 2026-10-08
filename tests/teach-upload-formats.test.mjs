import assert from 'node:assert/strict';
import test from 'node:test';
import { generateTeachToken } from '../functions/lib/teachAuth.js';
import { onRequestPost } from '../functions/api/teach/upload.js';
import { onRequestGet } from '../functions/api/teach/file/[key].js';

async function setup(storageType) {
  const stored = new Map();
  const storage = { async put(key, stream, options) {
    stored.set(key, { body:await new Response(stream).arrayBuffer(), metadata:options.metadata || options.httpMetadata });
  } };
  if (storageType === 'r2') storage.get = async key => {
    const item = stored.get(key);
    return item && { body:item.body, writeHttpMetadata(headers) {
      headers.set('Content-Type', item.metadata.contentType);
      headers.set('Content-Disposition', item.metadata.contentDisposition);
    } };
  };
  else storage.getWithMetadata = async key => {
    const item = stored.get(key);
    return { value:item?.body, metadata:item?.metadata };
  };
  const env = { ADMIN_PASSWORD:'secret', [storageType === 'r2' ? 'TEACH_FILES' : 'CAMP_KV']:storage };
  const token = await generateTeachToken(env.ADMIN_PASSWORD, 'member', { name:'Member', email:'member@example.com' });
  const upload = async (name, { type='', kind='presentation', authenticated=true, contents='file contents' } = {}) => {
    const form = new FormData();
    form.append('file', new File([contents], name, { type }));
    form.append('kind', kind);
    return onRequestPost({ env, request:new Request('https://wolko.org/api/teach/upload', {
      method:'POST', headers:authenticated ? { Authorization:`Bearer ${token}` } : {}, body:form,
    }) });
  };
  return { env, stored, upload };
}

for (const store of ['r2', 'kv']) {
  test(`${store}: documents, archives, arbitrary and extensionless files upload and download safely`, async () => {
    const { env, upload } = await setup(store);
    for (const name of ['lesson.docx', 'budget.xlsx', 'archive.zip', 'data.csv', 'notes.hwp', 'app.exe', 'index.html', 'image.svg', 'README', '파일.특수형식']) {
      const response = await upload(name, { type:'text/html' });
      assert.equal(response.status, 200, name);
      const data = await response.json();
      assert.equal(data.filename, name);
      const key = decodeURIComponent(new URL(data.url).pathname.split('/').at(-1));
      const download = await onRequestGet({ env, params:{ key } });
      assert.equal(download.status, 200);
      assert.equal(download.headers.get('Content-Type'), 'application/octet-stream');
      assert.match(download.headers.get('Content-Disposition'), /^attachment;/);
      assert.ok(download.headers.get('Content-Disposition').includes(encodeURIComponent(name)));
      assert.equal(download.headers.get('X-Content-Type-Options'), 'nosniff');
      assert.equal(await download.text(), 'file contents');
    }
  });
}

test('existing PDF preview uses a trusted content type instead of the supplied MIME type', async () => {
  const { env, upload } = await setup('r2');
  const response = await upload('lesson.PDF', { type:'text/html' });
  const { url } = await response.json();
  const key = new URL(url).pathname.split('/').at(-1);
  const download = await onRequestGet({ env, params:{ key } });
  assert.equal(download.headers.get('Content-Type'), 'application/pdf');
  assert.match(download.headers.get('Content-Disposition'), /^inline;/);
});

test('unrestricted resource formats still require login and stay within 20MB', async () => {
  const { upload, stored } = await setup('r2');
  assert.equal((await upload('document.docx', { authenticated:false })).status, 401);
  assert.equal((await upload('archive.zip', { contents:new Uint8Array(20 * 1024 * 1024 + 1) })).status, 400);
  assert.equal(stored.size, 0);
});

test('the dedicated BGM field remains limited to playable audio files', async () => {
  const { upload } = await setup('r2');
  assert.equal((await upload('document.docx', { kind:'bgm' })).status, 400);
  assert.equal((await upload('music.mp3', { kind:'bgm' })).status, 200);
  assert.equal((await upload('music.flac')).status, 200);
});
