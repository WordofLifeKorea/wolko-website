/**
 * 복음 통계 — 보고 담당자(지정된 사람).
 *  팀 보고 · 캠프 · 전도 행사 · 제자훈련 · 지역교회(CRS 연동) 보고는 마스터가 지정한 사람만 쓴다.
 *  개인 전도 보고는 포탈 계정이 있으면 누구나. 마스터는 늘 담당자다.
 *  저장: KV gospel:reporters = { emails: [...] }
 */
import { normalizeEmail } from './hubAccounts.js';

export const REPORTERS_KEY = 'gospel:reporters';
export const MAX_REPORTERS = 60;

export async function loadReporters(env) {
  const stored = await env.CAMP_KV.get(REPORTERS_KEY, 'json');
  return Array.isArray(stored?.emails) ? stored.emails.map(normalizeEmail).filter(Boolean) : [];
}

/** 마스터이거나 지정된 담당자인가 */
export async function isDesignated(env, session) {
  if (!session) return false;
  if (session.role === 'master') return true;
  return (await loadReporters(env)).includes(normalizeEmail(session.email));
}

export async function saveReporters(env, emails) {
  const list = [...new Set((emails || []).map(normalizeEmail).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))].slice(0, MAX_REPORTERS);
  await env.CAMP_KV.put(REPORTERS_KEY, JSON.stringify({ emails: list }));
  return list;
}
