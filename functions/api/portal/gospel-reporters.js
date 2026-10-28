/**
 * 복음 통계 보고 담당자 지정 — 마스터만.
 *   GET  /api/portal/gospel-reporters            지정된 사람 [{ email, name }] + 고를 수 있는 포탈 계정 목록
 *   POST /api/portal/gospel-reporters { emails } 지정 목록을 통째로 저장
 */
import { portalSession, listAccounts, normalizeEmail } from '../../lib/hubAccounts.js';
import { loadReporters, saveReporters } from '../../lib/gospelReporters.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

async function view(env, emails) {
  const accounts = (await listAccounts(env)).filter(a => a?.status === 'approved' && a.email);
  const nameOf = new Map(accounts.map(a => [normalizeEmail(a.email), String(a.name || '').trim() || String(a.email).split('@')[0]]));
  return {
    reporters: emails.map(email => ({ email, name: nameOf.get(email) || email.split('@')[0] })),
    candidates: accounts.map(a => ({ email: normalizeEmail(a.email), name: nameOf.get(normalizeEmail(a.email)) })).sort((a, b) => a.name.localeCompare(b.name, 'ko')),
  };
}

export async function onRequestGet({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  if (session.role !== 'master') return fail('마스터만 볼 수 있습니다.', 403);
  return Response.json(await view(env, await loadReporters(env)), { headers: H });
}

export async function onRequestPost({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  if (session.role !== 'master') return fail('마스터만 지정할 수 있습니다.', 403);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  if (!Array.isArray(body?.emails)) return fail('이메일 목록이 필요합니다.');
  return Response.json(await view(env, await saveReporters(env, body.emails)), { headers: H });
}
