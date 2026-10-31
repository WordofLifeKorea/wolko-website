/**
 * GET /api/portal/dashboard — 포탈 첫 화면: 이번 주 공지 · 오늘 키친 듀티 · 오늘 차량 운행 · 다가오는 일정 · 최근 업데이트된 교회.
 * 포탈 로그인한 계정 누구나. 개인정보(연락처 등)는 담지 않고 이름과 날짜만 내려준다.
 * 소속(평택/제주)에 따라 공지·일정·주방·차량·교회가 다르게 내려간다(배너·기도제목은 공용). 마스터·관리자는 ?campus=wolko|jeju 로 다른 소속 화면을 미리 볼 수 있다.
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { buildDashboard, translateMissingNotices } from '../../lib/portalDashboard.js';
import { campusOf, CAMPUSES } from '../../lib/campus.js';
import { toolsFor } from '../../lib/portalAccess.js';
import { translateMissingPrayers } from '../../lib/prayers.js';
import { needsTranslation, fixTranslation, applyGlossary } from '../../lib/prayerTranslate.js';

const H = { 'Cache-Control': 'no-store' };

export async function onRequestGet({ env, request, waitUntil }) {
  const session = await portalSession(request, env);
  if (!session) return Response.json({ error: '포탈 로그인이 필요합니다.' }, { status: 401, headers: H });
  const isAdmin = session.role === 'master' || session.role === 'admin';
  const asked = new URL(request.url).searchParams.get('campus');
  const campus = isAdmin && CAMPUSES.includes(asked) ? asked : await campusOf(env, session);   // 다른 소속 화면 미리 보기는 관리자만
  const body = await buildDashboard(env, session, Date.now(), { campus, canSwitchCampus: isAdmin, tools: await toolsFor(env, session) });
  if (waitUntil) {   // 번역이 없거나 잘못 저장된 공지·기도제목은 뒤에서 번역해 둔다(다음에 열 때 보인다)
    if ((body.notices || []).some(n => needsTranslation(n.title || '', n.body || '', n.tr?.lang))) waitUntil(translateMissingNotices(env).catch(() => 0));
    if ((body.prayers || []).some(p => needsTranslation(p.title || '', p.text || '', p.trLang))) waitUntil(translateMissingPrayers(env).catch(() => 0));
  }
  // 예전에 저장된 번역도 호칭 용어집대로 바로잡아 보여 준다(예: Mrs. Han → 한권사님)
  (body.notices || []).forEach(n => { if (n.tr) n.tr = fixTranslation(n.tr); });
  (body.prayers || []).forEach(p => { if (p.trLang) { p.trTitle = applyGlossary(p.trTitle, p.trLang); p.trText = applyGlossary(p.trText, p.trLang); } });
  return Response.json(body, { headers: H });
}
