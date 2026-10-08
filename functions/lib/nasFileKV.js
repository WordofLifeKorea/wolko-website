import { nasStorageConfig, nasFileRequest, PRIVATE_NAS_FILE_KEY } from './teachNasStorage.js';

export const PRIVATE_FILE_PREFIXES = [
  'portal:resource-file:', 'portal:resource-file-version:',
  'expense:receipt:', 'expense:trashfile:',
  'car:usage:photo:', 'car:usage:trash:photo:', 'qt-book-file-',
];
export const isNasBackedKey = key => PRIVATE_FILE_PREFIXES.some(prefix => String(key).startsWith(prefix));
export const privateMigrationKey = key => `nas:migrated:${key}`;
export function nasFileGroup(key) {
  if (key.startsWith('portal:resource-file-version:')) return 'versions';
  if (key.startsWith('portal:resource-file:')) return 'documents';
  if (key.startsWith('expense:trashfile:')) return 'receipt-trash';
  if (key.startsWith('expense:receipt:tmp:')) return 'receipt-temp';
  if (key.startsWith('expense:receipt:')) return 'receipts';
  if (key.startsWith('car:usage:trash:photo:')) return 'photo-trash';
  if (key.startsWith('car:usage:photo:')) return 'photos';
  if (key.startsWith('qt-book-file-')) return 'qt';
  throw new Error('Invalid file namespace');
}
export async function fileHash(bytes) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
}
async function convert(value, type = 'text') {
  if (value == null) return null;
  const response = new Response(value);
  if (type === 'stream') return response.body;
  if (type === 'arrayBuffer') return response.arrayBuffer();
  if (type === 'json') return response.json();
  return response.text();
}
function originalMetadata(metadata) {
  if (!metadata) return null;
  const { nasFileReference, ...original } = metadata;
  return Object.keys(original).length ? original : null;
}
export function fileKV(env) {
  const kv = env.CAMP_KV;
  if (!kv) return kv;
  const config = nasStorageConfig(env);
  if (!config) return kv;
  async function read(key, options) {
    if (!isNasBackedKey(key)) return kv.getWithMetadata(key, options);
    const type = typeof options === 'string' ? options : options?.type || 'text';
    const source = await kv.getWithMetadata(key, { type:'stream' });
    if (source.value == null) return { value:null, metadata:null };
    let record;
    if (source.metadata?.nasFileReference === 1) {
      record = await convert(source.value, 'json');
    } else {
      record = await kv.get(privateMigrationKey(key), 'json');
      if (!record) return { value:await convert(source.value, type), metadata:source.metadata };
      await source.value?.cancel?.();
    }
    if (!PRIVATE_NAS_FILE_KEY.test(record.nasKey || '')) throw new Error('Invalid file reference');
    const response = await nasFileRequest(config, record.nasKey);
    if (response.status !== 200) throw new Error('NAS file unavailable');
    return { value:await convert(response.body, type), metadata:originalMetadata(source.metadata) };
  }
  return {
    get:async (key, options) => isNasBackedKey(key) ? (await read(key, options)).value : kv.get(key, options),
    getWithMetadata:read,
    put:async (key, value, options = {}) => {
      if (!isNasBackedKey(key)) return kv.put(key, value, options);
      const bytes = await convert(value, 'stream');
      const nasKey = `private-${crypto.randomUUID()}.bin`;
      const response = await nasFileRequest(config, nasKey, { method:'PUT', body:bytes,
        headers:{ 'Content-Type':'application/octet-stream', 'X-Wolko-Group':nasFileGroup(key),
          'X-Wolko-Filename':encodeURIComponent(options.metadata?.fileName || options.metadata?.name || options.metadata?.filename || '자료.bin') } });
      if (response.status !== 201) throw new Error('NAS upload unavailable');
      // One KV write publishes a reference; expiration and original metadata stay unchanged.
      return kv.put(key, JSON.stringify({ nasKey }), { ...options, metadata:{ ...options.metadata, nasFileReference:1 } });
    },
    delete:async key => {
      await kv.delete(key);
      if (isNasBackedKey(key)) await kv.delete(privateMigrationKey(key));
      // Physical NAS files are retained; application trash/version rules still govern access.
    },
    list:options => kv.list(options),
  };
}

export async function migratePrivateFile(env, config, key) {
  if (!isNasBackedKey(key)) throw new Error('Invalid file namespace');
  const source = await env.CAMP_KV.getWithMetadata(key, { type:'arrayBuffer' });
  if (source.value == null) throw new Error('Source missing');
  // Live NAS edits publish their own primary reference, which always wins over migration mappings.
  if (source.metadata?.nasFileReference === 1) {
    const bytes = await fileKV(env).get(key, 'arrayBuffer');
    return { alreadyNas:true, bytes:bytes.byteLength, sha256:await fileHash(bytes) };
  }
  const bytes = await convert(source.value, 'arrayBuffer');
  const sha256 = await fileHash(bytes);
  const identity = (await fileHash(new TextEncoder().encode(`${key}:${sha256}`))).slice(0, 32);
  const nasKey = `private-${identity.slice(0,8)}-${identity.slice(8,12)}-${identity.slice(12,16)}-${identity.slice(16,20)}-${identity.slice(20)}.bin`;
  const upload = await nasFileRequest(config, nasKey, { method:'PUT', body:bytes,
    headers:{ 'Content-Type':'application/octet-stream' } });
  if (![201, 409].includes(upload.status)) throw new Error(`NAS upload failed (${upload.status})`);
  const downloaded = await nasFileRequest(config, nasKey);
  if (downloaded.status !== 200) throw new Error('NAS verification unavailable');
  const returned = await downloaded.arrayBuffer();
  if (returned.byteLength !== bytes.byteLength || await fileHash(returned) !== sha256) throw new Error('NAS verification mismatch');
  const record = { nasKey, sha256, bytes:bytes.byteLength, verifiedAt:new Date().toISOString() };
  await env.CAMP_KV.put(privateMigrationKey(key), JSON.stringify(record));
  const readable = await fileKV(env).get(key, 'arrayBuffer');
  return { ...record, readableBytes:readable?.byteLength || 0 };
}
