import assert from 'node:assert/strict';
import test from 'node:test';

import { createFileAccessToken, signJwt, verifyJwt } from '../functions/lib/onlyoffice.js';
import { ensureOriginalVersion, readStoredResourceFile, readStoredResourceVersion, replaceWithEditedFile, resourceFileKey, resourceVersionKey } from '../functions/lib/portalResourceVersions.js';

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
  const token = await createFileAccessToken({ id: 'resource', fileId: 'file', versionId: 'version-1', expires: Date.now() + 60_000 }, secret);
  const payload = await verifyJwt(token, secret);
  assert.equal(payload.id, 'resource');
  assert.equal(payload.fileId, 'file');
  assert.equal(payload.versionId, 'version-1');
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

test('the uploaded DOCX is preserved once as an immutable original', async () => {
  const CAMP_KV = memoryKv();
  const bytes = new TextEncoder().encode('original');
  const file = {
    id: 'file', fileName: 'lesson.docx', fileType: 'application/docx',
    uploadedAt: '2026-09-14T00:00:00.000Z', uploadedBy: 'owner@wol.org', uploadedByName: 'Owner',
  };
  const first = await ensureOriginalVersion({ CAMP_KV }, { id: 'resource', file, bytes });
  const second = await ensureOriginalVersion({ CAMP_KV }, { id: 'resource', file: first.file, bytes });
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.pruned, false);
  assert.equal(second.file.versions.length, 1);
  assert.equal(second.file.versions[0].isOriginal, true);
  assert.equal(second.file.versions[0].createdByName, 'Owner');
  assert.equal(new TextDecoder().decode((await readStoredResourceVersion({ CAMP_KV }, 'resource', 'file', 'original')).bytes), 'original');
});

test('the first tracked save does not duplicate the preserved original', async () => {
  const CAMP_KV = memoryKv();
  const original = new TextEncoder().encode('original');
  const edited = new TextEncoder().encode('edited');
  const ensured = await ensureOriginalVersion({ CAMP_KV }, {
    id: 'resource', file: { id: 'file', fileName: 'lesson.docx', fileType: 'application/docx' }, bytes: original,
  });
  const saved = await replaceWithEditedFile({ CAMP_KV }, {
    id: 'resource', file: ensured.file, currentBytes: original, editedBytes: edited,
    actorEmail: 'editor@wol.org', actorName: 'Editor', saveId: 'tracked-save', finalSave: false,
  });
  assert.equal(saved.file.versions.length, 1);
  assert.equal(saved.file.versions[0].isOriginal, true);
});

test('one editing session archives only its starting document', async () => {
  const CAMP_KV = memoryKv();
  const original = new TextEncoder().encode('original');
  const current = new TextEncoder().encode('current');
  const second = new TextEncoder().encode('second');
  const third = new TextEncoder().encode('third');
  const fourth = new TextEncoder().encode('fourth');
  const ensured = await ensureOriginalVersion({ CAMP_KV }, {
    id: 'resource',
    file: { id: 'file', fileName: 'lesson.docx', fileType: 'application/docx' },
    bytes: original,
  });
  let file = { ...ensured.file, editVersion: 1, documentRevision: 3 };
  await CAMP_KV.put(resourceFileKey('resource', 'file'), current);

  const firstSave = await replaceWithEditedFile({ CAMP_KV }, {
    id: 'resource', file, currentBytes: current, editedBytes: second,
    actorEmail: 'editor@wol.org', actorName: 'Editor', saveId: 'session-1-save-1',
  });
  assert.equal(firstSave.file.versions.length, 2);
  assert.equal(firstSave.file.versionedDocumentRevision, 3);

  const secondSave = await replaceWithEditedFile({ CAMP_KV }, {
    id: 'resource', file: firstSave.file, currentBytes: second, editedBytes: third,
    actorEmail: 'editor@wol.org', actorName: 'Editor', saveId: 'session-1-save-2',
  });
  assert.equal(secondSave.file.versions.length, 2);

  const firstFinal = await replaceWithEditedFile({ CAMP_KV }, {
    id: 'resource', file: secondSave.file, currentBytes: third, editedBytes: third,
    actorEmail: 'editor@wol.org', actorName: 'Editor', saveId: 'session-1-final', finalSave: true,
  });
  assert.equal(firstFinal.file.documentRevision, 4);

  const nextSession = await replaceWithEditedFile({ CAMP_KV }, {
    id: 'resource', file: firstFinal.file, currentBytes: third, editedBytes: fourth,
    actorEmail: 'editor@wol.org', actorName: 'Editor', saveId: 'session-2-save-1',
  });
  assert.equal(nextSession.file.versions.length, 3);
  assert.equal(nextSession.file.versionedDocumentRevision, 4);
});

test('version history keeps the original plus ten latest editing sessions', async () => {
  const CAMP_KV = memoryKv();
  const original = new TextEncoder().encode('version-0');
  const ensured = await ensureOriginalVersion({ CAMP_KV }, {
    id: 'resource',
    file: { id: 'file', fileName: 'lesson.docx', fileType: 'application/docx' },
    bytes: original,
  });
  let file = { ...ensured.file, editVersion: 1, documentRevision: 1 };
  let current = new TextEncoder().encode('version-1');
  await CAMP_KV.put(resourceFileKey('resource', 'file'), current);

  for (let session = 1; session <= 12; session++) {
    const edited = new TextEncoder().encode(`version-${session + 1}`);
    const saved = await replaceWithEditedFile({ CAMP_KV }, {
      id: 'resource', file, currentBytes: current, editedBytes: edited,
      actorEmail: 'editor@wol.org', actorName: 'Editor', saveId: `session-${session}`,
      finalSave: true,
    });
    file = saved.file;
    current = edited;
  }

  assert.equal(file.versions.length, 11);
  assert.equal(file.versions.filter(version => version.isOriginal).length, 1);
  assert.equal(file.versions.filter(version => !version.isOriginal).length, 10);
  assert.equal(CAMP_KV.values.size, 12);
});

test('opening a legacy document prunes old versions but preserves its original', async () => {
  const CAMP_KV = memoryKv();
  const original = new TextEncoder().encode('original');
  const regular = Array.from({ length: 12 }, (_, index) => ({
    id: `edit-${index + 1}`,
    label: `수정 전 버전 ${12 - index}`,
    isOriginal: false,
  }));
  const file = {
    id: 'file', fileName: 'lesson.docx', fileType: 'application/docx',
    versions: [...regular, { id: 'original', label: '원본', isOriginal: true }],
  };
  await Promise.all(file.versions.map(version => CAMP_KV.put(
    resourceVersionKey('resource', 'file', version.id),
    version.isOriginal ? original : new TextEncoder().encode(version.id),
  )));

  const result = await ensureOriginalVersion({ CAMP_KV }, { id: 'resource', file, bytes: original });
  assert.equal(result.created, false);
  assert.equal(result.pruned, true);
  assert.equal(result.file.versions.length, 11);
  assert.equal(result.file.versions.at(-1).id, 'original');
  assert.equal(CAMP_KV.values.has(resourceVersionKey('resource', 'file', 'edit-11')), false);
  assert.equal(CAMP_KV.values.has(resourceVersionKey('resource', 'file', 'edit-12')), false);
  assert.equal(CAMP_KV.values.has(resourceVersionKey('resource', 'file', 'original')), true);
});
