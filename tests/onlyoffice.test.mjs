import assert from 'node:assert/strict';
import test from 'node:test';

import { createFileAccessToken, signJwt, verifyJwt } from '../functions/lib/onlyoffice.js';
import { readStoredResourceFile, readStoredResourceVersion, replaceWithEditedFile, resourceFileKey, resourceVersionKey } from '../functions/lib/portalResourceVersions.js';

function memoryKv() {
  const values = new Map();
  const metadata = new Map();
  return {
    values,
    async put(key, value, options = {}) {
      const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value);
      values.set(key, bytes.slice());
      metadata.set(key, options.metadata || null);
    },
    async delete(key) { values.delete(key); metadata.delete(key); },
    async getWithMetadata(key) {
      const bytes = values.get(key);
      return { value: bytes ? bytes.slice().buffer : null, metadata: metadata.get(key) || null };
    },
  };
}

test('ONLYOFFICE access tokens verify and expire', async () => {
  const secret = 'test-secret';
  const token = await createFileAccessToken({ id: 'resource', fileId: 'file', expires: Date.now() + 60_000 }, secret);
  const payload = await verifyJwt(token, secret);
  assert.equal(payload.id, 'resource');
  assert.equal(payload.fileId, 'file');
  assert.equal(await verifyJwt(token, 'wrong-secret'), null);
  const expired = await signJwt({ exp: Math.floor(Date.now() / 1000) - 1 }, secret);
  assert.equal(await verifyJwt(expired, secret), null);
});

test('forced saves keep the editor revision and final save closes it', async () => {
  const CAMP_KV = memoryKv();
  const file = { id: 'file', fileName: 'lesson.docx', fileType: 'application/docx', editVersion: 0, documentRevision: 3 };
  const first = new TextEncoder().encode('first');
  const second = new TextEncoder().encode('second');
  await CAMP_KV.put(resourceFileKey('resource', 'file'), first, { metadata: { fileName: file.fileName, fileType: file.fileType } });

  const forced = await replaceWithEditedFile({ CAMP_KV }, {
    id: 'resource', file, currentBytes: first, editedBytes: second,
    actorEmail: 'editor@wol.org', actorName: 'Editor', saveId: 'save-1', finalSave: false,
  });
  assert.equal(forced.changed, true);
  assert.equal(forced.file.editVersion, 1);
  assert.equal(forced.file.documentRevision, 3);

  const finalized = await replaceWithEditedFile({ CAMP_KV }, {
    id: 'resource', file: forced.file, currentBytes: second, editedBytes: second,
    actorEmail: 'editor@wol.org', actorName: 'Editor', saveId: 'save-2', finalSave: true,
  });
  assert.equal(finalized.changed, false);
  assert.equal(finalized.finalized, true);
  assert.equal(finalized.file.documentRevision, 4);
  assert.equal((await readStoredResourceFile({ CAMP_KV }, 'resource', 'file')).metadata.fileName, 'lesson.docx');
});

test('archived DOCX versions remain independently readable', async () => {
  const CAMP_KV = memoryKv();
  const bytes = new TextEncoder().encode('original');
  await CAMP_KV.put(resourceVersionKey('resource', 'file', 'version'), bytes, {
    metadata: { fileName: 'lesson.docx', fileType: 'application/docx' },
  });
  const stored = await readStoredResourceVersion({ CAMP_KV }, 'resource', 'file', 'version');
  assert.equal(new TextDecoder().decode(stored.bytes), 'original');
  assert.equal(stored.metadata.fileName, 'lesson.docx');
});
