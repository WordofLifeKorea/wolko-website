/**
 * 캠프 자료실 관리자 명단
 * GET /api/teach/managers   (승인된 포탈 멤버) → { isManager }  — 마스터는 { managers:[{email,name}], accounts:[...] } 도 받는다
 * PUT /api/teach/managers   { emails: [...] }  (마스터만) 관리자 명단을 통째로 저장
 */
import { portalSession, listAccounts, normalizeEmail, isValidEmail } from '../../lib/hubAccounts.js';
import { MANAGERS_KEY, managerEmails, isTeachManager } from '../../lib/teachAuth.js';

const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const fail = (error, status) => Response.json({ error }, { status, headers: H });

export async function onRequestGet({ env, request }) {
  const s = await portalSession(request, env);
  if (!s) return fail('포탈 로그인이 필요합니다.', 401);
  const body = { isManager: await isTeachManager(env, s), isMaster: s.role === 'master' };
  if (s.role === 'master') {
    const accounts = await listAccounts(env);
    const byEmail = new Map(accounts.map(a => [normalizeEmail(a.email), a]));
    body.managers = (await managerEmails(env)).map(email => ({ email, name: byEmail.get(email)?.name || '' }));
    body.accounts = accounts.filter(a => a.status === 'approved' && a.email)
      .map(a => ({ email: normalizeEmail(a.email), name: a.name && !String(a.name).includes('@') ? a.name : '' }))
      .sort((a, b) => (a.name || a.email).localeCompare(b.name || b.email, 'ko'));
  }
  return Response.json(body, { headers: H });
}

export async function onRequestPut({ env, request }) {
  const s = await portalSession(request, env);
  if (!s) return fail('포탈 로그인이 필요합니다.', 401);
  if (s.role !== 'master') return fail('마스터만 관리자를 지정할 수 있어요.', 403);
  let b; try { b = await request.json(); } catch { return fail('잘못된 요청입니다.', 400); }
  const emails = [...new Set((Array.isArray(b?.emails) ? b.emails : []).map(normalizeEmail).filter(isValidEmail))].slice(0, 30);
  await env.CAMP_KV.put(MANAGERS_KEY, JSON.stringify(emails));
  return Response.json({ ok: true, emails }, { headers: H });
}
