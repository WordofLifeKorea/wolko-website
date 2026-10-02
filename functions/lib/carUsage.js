import { getAccount, isMasterEmail, normalizeEmail, parseHubSessionToken } from './hubAccounts.js';

export const ENTRY_PREFIX = 'car:usage:entry:';
export const PHOTO_PREFIX = 'car:usage:photo:';
const VEHICLES_KEY = 'car:vehicles:missionary';
const BUILTIN_VEHICLES = { 'silver-van': 'Silver Van', 'santa-fe': 'Santa Fe' };

export function fail(message, status = 400) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function usageSession(request, env) {
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) return null;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const signed = await parseHubSessionToken(env.ADMIN_PASSWORD, token);
  if (!signed) return null;
  const email = normalizeEmail(signed.email);
  const account = await getAccount(env, email);
  if (account ? account.status !== 'approved' : !isMasterEmail(email)) return null;
  return { email, name: account?.name || email, role: signed.role };
}

export async function vehicleLabels(env) {
  const vehicles = (await env.CAMP_KV.get(VEHICLES_KEY, 'json')) || [];
  return new Map([...Object.entries(BUILTIN_VEHICLES), ...vehicles.map(v => [v.id, `${v.name} 선교사 차량`])]);
}

export async function listEntries(env) {
  const entries = [];
  let cursor;
  do {
    const page = await env.CAMP_KV.list({ prefix: ENTRY_PREFIX, limit: 1000, ...(cursor ? { cursor } : {}) });
    const values = await Promise.all(page.keys.map(key => env.CAMP_KV.get(key.name, 'json')));
    entries.push(...values.filter(Boolean));
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return entries.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
}
