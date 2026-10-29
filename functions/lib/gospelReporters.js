/**
 * 복음 통계 — 보고 담당자(지정된 사람).
 *  팀 보고 · 캠프 · 제자훈련 · 지역교회(CRS 연동) 보고는 담당자만 쓴다. 담당자는
 *    - 마스터(늘 담당자),
 *    - 홈페이지 인원 소개의 풀타임 선교사(category: missionary) — 자동. 단기 사역자(stw)는 해당 없음,
 *    - 마스터가 따로 지정한 사람.
 *  개인 전도 보고와 전도 행사 칸은 포탈 계정이 있으면 누구나.
 *  저장: KV gospel:reporters = { emails: [...] } (마스터가 직접 지정한 사람만 — 풀타임 선교사는 인원 소개에서 매번 가져온다)
 */
import { normalizeEmail } from './hubAccounts.js';
import { isFulltimeMissionary } from './fulltimeMissionaries.js';

export const REPORTERS_KEY = 'gospel:reporters';
export const MAX_REPORTERS = 60;

export async function loadReporters(env) {
  const stored = await env.CAMP_KV.get(REPORTERS_KEY, 'json');
  return Array.isArray(stored?.emails) ? stored.emails.map(normalizeEmail).filter(Boolean) : [];
}

/** 마스터이거나, 직접 지정된 담당자이거나, 풀타임 선교사인가 */
export async function isDesignated(env, session) {
  if (!session) return false;
  if (session.role === 'master') return true;
  if ((await loadReporters(env)).includes(normalizeEmail(session.email))) return true;
  return isFulltimeMissionary(env, { name: session.name, email: session.email });
}

export async function saveReporters(env, emails) {
  const list = [...new Set((emails || []).map(normalizeEmail).filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))].slice(0, MAX_REPORTERS);
  await env.CAMP_KV.put(REPORTERS_KEY, JSON.stringify({ emails: list }));
  return list;
}
