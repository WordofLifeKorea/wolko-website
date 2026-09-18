const MAX_EDIT_VERSIONS = 10;

export const resourceFileKey = (id, fileId) => `portal:resource-file:${id}:${fileId}`;
export const resourceVersionKey = (id, fileId, versionId) => `portal:resource-file-version:${id}:${fileId}:${versionId}`;
export const versionsOf = file => Array.isArray(file?.versions) ? file.versions : [];

function base64ToBytes(dataUrl) {
  const value = String(dataUrl || '');
  const binary = atob(value.slice(value.indexOf(',') + 1));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export async function readStoredResourceFile(env, id, fileId) {
  const stored = await env.CAMP_KV.getWithMetadata(resourceFileKey(id, fileId), 'arrayBuffer');
  if (!stored.value) return null;
  if (stored.metadata?.fileName) {
    return { bytes: new Uint8Array(stored.value), metadata: stored.metadata };
  }
  try {
    const legacy = JSON.parse(new TextDecoder().decode(stored.value));
    return {
      bytes: base64ToBytes(legacy.fileData),
      metadata: { fileName: legacy.fileName, fileType: legacy.fileType },
    };
  } catch {
    return null;
  }
}

export async function readStoredResourceVersion(env, id, fileId, versionId) {
  const stored = await env.CAMP_KV.getWithMetadata(resourceVersionKey(id, fileId, versionId), 'arrayBuffer');
  if (!stored.value) return null;
  return { bytes: new Uint8Array(stored.value), metadata: stored.metadata || {} };
}

export async function sha256Hex(bytes) {
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function trimVersions(versions) {
  const original = versions.find(version => version.isOriginal);
  const regular = versions.filter(version => !version.isOriginal);
  if (regular.length <= MAX_EDIT_VERSIONS) return { kept: versions, removed: [] };
  const kept = regular.slice(0, MAX_EDIT_VERSIONS);
  if (original) kept.push(original);
  const keptIds = new Set(kept.map(version => version.id));
  return { kept, removed: versions.filter(version => !keptIds.has(version.id)) };
}

export async function ensureOriginalVersion(env, { id, file, bytes }) {
  const currentVersions = versionsOf(file);
  if (currentVersions.some(version => version.isOriginal)) {
    const { kept, removed } = trimVersions(currentVersions);
    if (!removed.length) return { file, created: false, pruned: false };
    await Promise.all(removed.map(version => env.CAMP_KV.delete(resourceVersionKey(id, file.id, version.id))));
    return { file: { ...file, versions: kept }, created: false, pruned: true };
  }
  const versionId = 'original';
  const record = {
    id: versionId,
    label: '원본',
    fileName: file.fileName,
    fileType: file.fileType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: bytes.byteLength,
    createdAt: file.uploadedAt || new Date().toISOString(),
    createdBy: file.uploadedBy || '',
    createdByName: file.uploadedByName || file.uploadedBy || '',
    isOriginal: true,
    hash: await sha256Hex(bytes),
  };
  await env.CAMP_KV.put(resourceVersionKey(id, file.id, versionId), bytes, {
    metadata: { fileName: record.fileName, fileType: record.fileType },
  });
  const { kept, removed } = trimVersions([...currentVersions, record]);
  await Promise.all(removed.map(version => env.CAMP_KV.delete(resourceVersionKey(id, file.id, version.id))));
  return { file: { ...file, versions: kept }, created: true, pruned: removed.length > 0 };
}

export async function archiveCurrentFile(env, { id, file, bytes, actorEmail, actorName, label }) {
  const currentVersions = versionsOf(file);
  const currentHash = await sha256Hex(bytes);
  const untouchedOriginal = !label
    && Number(file.editVersion || 0) === 0
    && currentVersions.some(version => version.isOriginal && version.hash === currentHash);
  if (untouchedOriginal) return currentVersions;
  const versionId = crypto.randomUUID();
  const record = {
    id: versionId,
    label: label || (currentVersions.length ? `수정 전 버전 ${Number(file.editVersion || 0)}` : '원본'),
    fileName: file.fileName,
    fileType: file.fileType || 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: bytes.byteLength,
    createdAt: new Date().toISOString(),
    createdBy: actorEmail || '',
    createdByName: actorName || actorEmail || '',
    isOriginal: currentVersions.length === 0,
    hash: currentHash,
  };
  await env.CAMP_KV.put(resourceVersionKey(id, file.id, versionId), bytes, {
    metadata: { fileName: record.fileName, fileType: record.fileType },
  });
  const { kept, removed } = trimVersions([record, ...currentVersions]);
  await Promise.all(removed.map(version => env.CAMP_KV.delete(resourceVersionKey(id, file.id, version.id))));
  return kept;
}

export async function replaceWithEditedFile(env, { id, file, currentBytes, editedBytes, actorEmail, actorName, saveId, finalSave = false }) {
  const currentHash = await sha256Hex(currentBytes);
  const editedHash = await sha256Hex(editedBytes);
  const duplicate = currentHash === editedHash || (saveId && file.lastOnlyOfficeSaveId === saveId);
  if (duplicate) {
    if (!finalSave) return { file, changed: false, finalized: false };
    return {
      file: { ...file, documentRevision: Number(file.documentRevision || 0) + 1 },
      changed: false,
      finalized: true,
    };
  }
  const documentRevision = Number(file.documentRevision || 0);
  const sessionAlreadyArchived = Number(file.versionedDocumentRevision ?? -1) === documentRevision;
  const versions = sessionAlreadyArchived
    ? versionsOf(file)
    : await archiveCurrentFile(env, { id, file, bytes: currentBytes, actorEmail, actorName });
  const nextFile = {
    ...file,
    fileSize: editedBytes.byteLength,
    editedAt: new Date().toISOString(),
    editedBy: actorEmail || '',
    editedByName: actorName || actorEmail || '',
    editVersion: Number(file.editVersion || 0) + 1,
    documentRevision: documentRevision + (finalSave ? 1 : 0),
    versionedDocumentRevision: documentRevision,
    lastOnlyOfficeSaveId: saveId || '',
    versions,
  };
  await env.CAMP_KV.put(resourceFileKey(id, file.id), editedBytes, {
    metadata: { fileName: file.fileName, fileType: file.fileType },
  });
  return { file: nextFile, changed: true, finalized: finalSave };
}

export async function deleteFileVersions(env, id, file) {
  await Promise.all(versionsOf(file).map(version => env.CAMP_KV.delete(resourceVersionKey(id, file.id, version.id))));
}
