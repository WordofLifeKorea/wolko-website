import { nasFileRequest } from './teachNasStorage.js';

export const LEGACY_TEACH_KEY = /^(?:teach-file-)?[a-f0-9-]{36}\.[a-z0-9]{1,16}$/;
export const migrationMapKey = key => `teach:nas-migration:${key}`;
export function legacyTeachStore(env) {
  const bucket = env.TEACH_FILES || env.CAMP_RESOURCES_FILES || env.CAMP_FILES || env.R2_BUCKET || env.BUCKET;
  return bucket ? { type:'r2', storage:bucket } : { type:'kv', storage:env.CAMP_KV };
}
async function hash(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
}
export async function migrateTeachFile(env, config, key) {
  if (!LEGACY_TEACH_KEY.test(key)) throw new Error('Invalid legacy key');
  const store = legacyTeachStore(env);
  let bytes, metadata;
  if (store.type === 'r2') {
    const object = await store.storage.get(key);
    if (!object) throw new Error('Source missing');
    if (object.size > 20 * 1024 * 1024) throw new Error('Source exceeds gateway limit');
    bytes = await object.arrayBuffer(); metadata = object.httpMetadata;
  } else {
    const source = await store.storage.getWithMetadata(key, { type:'arrayBuffer' });
    bytes = source.value; metadata = source.metadata;
    if (!bytes) throw new Error('Source missing');
  }
  if (bytes.byteLength > 20 * 1024 * 1024) throw new Error('Source exceeds gateway limit');
  const digest = await hash(bytes);
  const identity = (await hash(new TextEncoder().encode(`${store.type}:${key}`))).slice(0, 32);
  const nasKey = `nas-${identity.slice(0,8)}-${identity.slice(8,12)}-${identity.slice(12,16)}-${identity.slice(16,20)}-${identity.slice(20)}.${key.split('.').at(-1)}`;
  const headers = { 'Content-Type':metadata?.contentType || 'application/octet-stream',
    'Content-Disposition':metadata?.contentDisposition || `attachment; filename*=UTF-8''${key}` };
  const uploaded = await nasFileRequest(config, nasKey, { method:'PUT', headers, body:bytes });
  // Deterministic destinations allow safe retries after an interrupted migration.
  if (![201, 409].includes(uploaded.status)) throw new Error(`NAS upload failed (${uploaded.status})`);
  const download = await nasFileRequest(config, nasKey);
  if (download.status !== 200) throw new Error('NAS verification unavailable');
  const returned = await download.arrayBuffer();
  if (returned.byteLength !== bytes.byteLength || await hash(returned) !== digest) throw new Error('NAS verification mismatch');
  const record = { nasKey, sha256:digest, bytes:bytes.byteLength, source:store.type, verifiedAt:new Date().toISOString() };
  await env.CAMP_KV.put(migrationMapKey(key), JSON.stringify(record));
  return record;
}
