export const NAS_FILE_KEY = /^nas-[a-f0-9-]{36}\.[a-z0-9]{1,16}$/;
export const PRIVATE_NAS_FILE_KEY = /^private-[a-f0-9-]{36}\.[a-z0-9]{1,16}$/;

export function nasStorageConfig(env) {
  if (!env.TEACH_NAS_URL && !env.TEACH_NAS_TOKEN) return null;
  const url = new URL(env.TEACH_NAS_URL);
  if (url.protocol !== 'https:' || url.username || url.password || url.pathname !== '/' || url.search || url.hash
    || !env.TEACH_NAS_TOKEN || env.TEACH_NAS_TOKEN.length < 32) throw new Error('Invalid NAS storage configuration');
  return { origin:url.origin, token:env.TEACH_NAS_TOKEN };
}

export async function nasFileRequest(config, key, options = {}, fetcher = fetch) {
  if (!NAS_FILE_KEY.test(key) && !PRIVATE_NAS_FILE_KEY.test(key)) throw new Error('Invalid NAS file key');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${config.token}`);
  return fetcher(`${config.origin}/files/${key}`, {
    ...options, headers, redirect:'manual', signal:AbortSignal.timeout(120000),
  });
}
