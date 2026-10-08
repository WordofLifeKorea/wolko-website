/**
 * 캠프 자료실 권한
 *  - member : 승인된 포탈 멤버 누구나 — 보기 · 추가(업로드 포함) · 본인 자료 수정/삭제
 *  - admin  : 마스터 + 지정 관리자 — 수정 · 순서 변경 · 캠프 관리
 * 타인 자료 삭제는 서명된 마스터 신원만 허용한다.
 * 토큰: wolko-teach:{admin|member}:{expires}[:{encoded identity}]:{sig}
 * 관리자 명단은 KV `teach:managers` (이메일 배열)에 두고 마스터가 자료실 화면에서 지정한다.
 */
import { normalizeEmail } from './hubAccounts.js';

export const MANAGERS_KEY = 'teach:managers';

const hex = bytes => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
const hmacKey = (secret, usage) => crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usage);

export async function generateTeachToken(secret, role = 'member', identity = null) {
  const owner = identity ? ':' + encodeURIComponent(JSON.stringify({ name: identity.name || '', email: normalizeEmail(identity.email), isMaster: identity.role === 'master' })) : '';
  const data = `wolko-teach:${role === 'admin' ? 'admin' : 'member'}:${Date.now() + 24 * 60 * 60 * 1000}${owner}`;
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), new TextEncoder().encode(data));
  return btoa(`${data}:${hex(new Uint8Array(sig))}`);
}

/** 서명을 검증한 자료실 세션. 이름 없는 기존 토큰도 지원한다. */
export async function teachSession(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !env.ADMIN_PASSWORD) return null;
  try {
    const decoded = atob(token);
    const i = decoded.lastIndexOf(':');
    const data = decoded.slice(0, i);
    const parts = data.split(':');
    if (parts[0] !== 'wolko-teach' || (parts[1] !== 'admin' && parts[1] !== 'member')) return null;
    const expires = parseInt(parts[2], 10);
    if (!expires || Date.now() > expires) return null;
    const sig = new Uint8Array(decoded.slice(i + 1).match(/.{2}/g).map(p => parseInt(p, 16)));
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(env.ADMIN_PASSWORD, ['verify']), sig, new TextEncoder().encode(data));
    if (!ok) return null;
    const identity = parts[3] ? JSON.parse(decodeURIComponent(parts[3])) : {};
    return { role: parts[1], name: identity.name || '', email: normalizeEmail(identity.email), isMaster: identity.isMaster === true };
  } catch {
    return null;
  }
}

export async function teachRole(request, env) {
  return (await teachSession(request, env))?.role || null;
}

export function canDeleteTeachItem(session, item) {
  return Boolean(session?.isMaster || (session?.email && item?.uploaderEmail && normalizeEmail(item.uploaderEmail) === session.email));
}

export async function managerEmails(env) {
  const list = await env.CAMP_KV.get(MANAGERS_KEY, 'json');
  return Array.isArray(list) ? list.map(normalizeEmail) : [];
}

export async function isTeachManager(env, session) {
  if (!session) return false;
  if (session.role === 'master') return true;
  return (await managerEmails(env)).includes(normalizeEmail(session.email));
}

export const deniedManage = headers => Response.json({ error: '자료 수정·삭제와 캠프 관리는 자료실 관리자만 할 수 있어요.' }, { status: 403, headers });
