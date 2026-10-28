/**
 * GET /api/portal/dashboard — 포탈 첫 화면: 이번 주 공지 · 오늘 키친 듀티 · 오늘 차량 운행 · 다가오는 일정 · 최근 업데이트된 교회.
 * 포탈 로그인한 계정 누구나. 개인정보(연락처 등)는 담지 않고 이름과 날짜만 내려준다.
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { buildDashboard, translateMissingNotices } from '../../lib/portalDashboard.js';
import { translateMissingPrayers } from '../../lib/prayers.js';
import { needsTranslation } from '../../lib/prayerTranslate.js';

const H = { 'Cache-Control': 'no-store' };

export async function onRequestGet({ env, request, waitUntil }) {
  const session = await portalSession(request, env);
  if (!session) return Response.json({ error: '포탈 로그인이 필요합니다.' }, { status: 401, headers: H });
  const body = await buildDashboard(env, session);
  if (waitUntil) {   // 번역이 없거나 잘못 저장된 공지·기도제목은 뒤에서 번역해 둔다(다음에 열 때 보인다)
    if ((body.notices || []).some(n => needsTranslation(n.title || '', n.body || '', n.tr?.lang))) waitUntil(translateMissingNotices(env).catch(() => 0));
    if ((body.prayers || []).some(p => needsTranslation(p.title || '', p.text || '', p.trLang))) waitUntil(translateMissingPrayers(env).catch(() => 0));
  }
  return Response.json(body, { headers: H });
}
