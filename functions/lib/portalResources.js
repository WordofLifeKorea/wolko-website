/**
 * 포탈의 "Resource & Media" 작업 현황 리포트 — 항목 목록/파일 첨부가 공유하는
 * KV 접근 헬퍼. resources.js(항목 CRUD)와 resource-file.js(작업 파일 첨부)가
 * 같은 로직을 중복하지 않도록 여기 모아둔다.
 */
import { parseHubSessionToken } from './hubAccounts.js';

export const KV_KEY = 'portal:resources:v1';
export const MAX_ITEMS = 120;

export async function sessionFor(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token && env.ADMIN_PASSWORD ? parseHubSessionToken(env.ADMIN_PASSWORD, token) : null;
}

export function canWrite(session) {
  return session && (session.role === 'admin' || session.role === 'master');
}

export function text(value, max) {
  return String(value || '').trim().slice(0, max);
}

export async function readData(env) {
  const data = await env.CAMP_KV.get(KV_KEY, 'json');
  return data && Array.isArray(data.items) ? data : { items: [] };
}

export async function saveData(env, items) {
  const data = { items: items.slice(0, MAX_ITEMS), updatedAt: new Date().toISOString() };
  await env.CAMP_KV.put(KV_KEY, JSON.stringify(data));
  return data;
}

export function error(message, status) {
  return Response.json({ error: message }, { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}
