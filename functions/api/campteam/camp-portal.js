import { campSession, json, needLogin, needPerm, badRequest, noDb, canView } from '../../lib/campteamAuth.js';
import { audit } from '../../lib/campteamDb.js';
import { listRegs, summarize, PORTAL_ID } from '../../lib/campteamPortal.js';
import { WINTER_CAMP_POLICY, REGISTRATION_WINDOWS, GENDER_CAPACITY, APPLICANT_NOTICE_INFO, usesWinterCampPolicy } from '../../lib/winterCampPolicy.js';

/** 포털 신청 코드에 상수로 정해 둔 캠프비·장학(할인) 제도·신청 일정·성별 정원 — 읽기만 한다. 해당 캠프가 아니면 null */
export function policyFor(portalId) {
  if (!usesWinterCampPolicy(portalId)) return null;
  const P = WINTER_CAMP_POLICY;
  return { fee: P.fee, deposit: P.deposit, earlyBirdUntil: P.earlyBirdUntil, balanceDue: APPLICANT_NOTICE_INFO[portalId]?.balanceDueEarlyBird || '',
    discounts: Object.entries(P.discounts).map(([key, d]) => ({ key, ko: d.ko, en: d.en, amount: d.amount || 0, reward: d.reward || 0, note: d.note_ko || '' })),
    windows: (REGISTRATION_WINDOWS[portalId] || []).map((w) => ({ round: w.round, from: w.from, to: w.to })), capacity: GENDER_CAPACITY[portalId] || null };
}

/**
 * 캠프별 공간 ↔ 월코 포털 "캠프 관리자" 연동 (읽기 전용).
 *
 * GET  ?campId=<캠프팀 캠프 id>[&deposit=<1인 예약금>]
 *   캠프에 연결된 포털 캠프의 신청 현황을 요약해 준다 — 인원·상태·금액 시나리오(확정만 / 예약금 수납 이상 / 신청 전부)·할인·캠퍼 명단·스태프 지원 현황.
 *   캠프팀 명단에 있는 사람만 볼 수 있고, 연락처·계좌 같은 개인정보는 디렉터·캠프 재정·관리자에게만 내려간다(조회 기록을 남긴다).
 * POST ?campId=...  { portalCampId }   연결 설정/해제 — 디렉터·캠프 재정·관리자만 (기존 포털 데이터는 바뀌지 않는다)
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.campRole) return needPerm('캠프팀 명단에 있는 계정만 신청 정보를 볼 수 있어요.');
  if (!canView(s.perms, 'camps')) return needPerm('캠프별 공간을 볼 권한이 없어요. 관리자에게 요청해 주세요.');
  const p = new URL(request.url).searchParams, campId = p.get('campId');
  if (!campId) return badRequest('campId 가 필요합니다.');
  const camp = await env.DB.prepare('SELECT id, nameKo, nameEn, startDate, endDate, capacity, registrationCampId FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(campId).first();
  if (!camp) return json({ error: '찾을 수 없습니다.' }, 404);
  const perms = { moneyRead: s.perms.moneyRead, sensitive: !!s.perms.personal, canLink: s.perms.moneyWrite };
  const base = { camp: { id: camp.id, nameKo: camp.nameKo, nameEn: camp.nameEn, startDate: camp.startDate, endDate: camp.endDate, capacity: camp.capacity }, portalCampId: camp.registrationCampId || '', perms };
  if (!camp.registrationCampId) return json({ ...base, linked: false });
  let regs; try { regs = await listRegs(env, camp.registrationCampId); } catch (e) { console.error('camp-portal read failed:', e); return json({ ...base, linked: true, unavailable: true }); }
  if (regs == null) return json({ ...base, linked: true, unavailable: true });
  const policy = policyFor(camp.registrationCampId), depositPerHead = Math.min(10_000_000, Math.max(0, parseInt(p.get('deposit'), 10) || policy?.deposit || 0));
  const out = summarize(regs, { sensitive: perms.sensitive, depositPerHead });
  if (!perms.moneyRead) { delete out.scenarios; delete out.feeRows; delete out.discounts; for (const c of out.campers) delete c.scholarship; }
  if (perms.sensitive && (out.campers.length || out.staff.items.length)) await audit(env, s.email, 'view', 'camp_portal', camp.id, `개인정보 포함 신청 현황 조회 (${camp.registrationCampId})`);
  return json({ ...base, linked: true, depositPerHead, policy, ...out });
}

export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!s.perms.moneyWrite) return needPerm('연결은 디렉터·캠프 재정 담당·관리자만 바꿀 수 있어요.');
  const campId = new URL(request.url).searchParams.get('campId');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const id = String(b.portalCampId ?? '').trim();
  if (id && !PORTAL_ID.test(id)) return badRequest('포털 캠프 ID 는 영문·숫자·-·_ 만 쓸 수 있어요.');
  const camp = await env.DB.prepare('SELECT id, nameKo, registrationCampId FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(campId || '').first();
  if (!camp) return json({ error: '찾을 수 없습니다.' }, 404);
  await env.DB.prepare('UPDATE camps SET registrationCampId = ?2, updatedAt = ?3 WHERE id = ?1').bind(camp.id, id, new Date().toISOString()).run();
  await audit(env, s.email, 'update', 'camp', camp.id, id ? `포털 캠프 연결: ${id}` : '포털 캠프 연결 해제');
  return json({ ok: true, portalCampId: id });
}
