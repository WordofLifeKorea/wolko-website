/**
 * 복음 통계 — 월간 복음 전도 보고 (WOLKO Monthly Gospel Outreach Report)
 *   GET    /api/portal/gospel-stats?month=YYYY-MM          항목 정의 · 그 달 월코(본토)/제주/통합 합계 · 최근 6개월 추이 · 내 보고
 *                                                          (마스터·관리자는 보고별 목록도)
 *   GET    /api/portal/gospel-stats?month=…&format=csv     마스터·관리자 전용 CSV 내려받기
 *   POST   /api/portal/gospel-stats  { month, scope, teamName?, location, values }
 *                                                          내 보고 저장(같은 달·같은 개인/팀 단위는 고쳐 쓴다)
 *   DELETE /api/portal/gospel-stats?month=…&id=…           내 보고(또는 마스터는 누구의 것이든) 지우기
 * 인증: Authorization: Bearer <포탈 세션 토큰>. 숫자 합계는 포탈 계정 모두가 보고, 이름·이메일이 있는 보고별 목록은 마스터·관리자만 본다.
 */
import { buildGospelXlsx } from '../../lib/gospelReport.js';
import { monthCamps, addCampsToSummary } from '../../lib/gospelCamps.js';
import { reporterRoster, missingReporters, submittedEmails } from '../../lib/gospelReminder.js';
import { getAccount, portalSession } from '../../lib/hubAccounts.js';
import { isDesignated, loadReporters } from '../../lib/gospelReporters.js';
import { CAMPUS_OVERRIDES } from '../../../src/lib/expense-config.js';
import {
  GOSPEL_SECTIONS, LOCATIONS, SCOPES, MONTH_RE, MONTHS_BACK, currentMonthKst, reportMonth, shiftMonth, reportableMonth,
  cleanValues, allowedFieldIds, ministryId, cleanChurchEntries, churchEvents, cleanText, unitId, ownerOf, reportKey, loadMonth, summarize, mergeSummaries, toCsv, AGG_KEY, AGG_VERSION, aggTtlSeconds,
} from '../../lib/gospelStats.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });
const canReview = session => session.role === 'master' || session.role === 'admin';
/** 제출 현황(누가 아직 보고하지 않았는지)은 마스터에게만 — 보고 제외 설정도 마스터만 */
const canSeeSubmission = session => session.role === 'master';
/** 가입할 때 고른 소속(평택 wolko | 제주) → 보고 위치 기본값. 정보가 없으면 '' */
async function defaultLocation(env, session) {
  const campus = CAMPUS_OVERRIDES[session.email] || (await getAccount(env, session.email).catch(() => null))?.campus;
  return campus === 'jeju' ? 'jeju' : campus === 'wolko' ? 'mainland' : '';
}
/** 화면이 보내 주는 '나' — designated: 팀·캠프·행사·제자훈련·지역교회 보고를 쓸 수 있는지 */
async function meOf(env, session, review) {
  return { email: session.email, name: displayName(session), role: session.role, canReview: review, designated: await isDesignated(env, session), location: await defaultLocation(env, session) };
}
const displayName = session => cleanText(session.name, 80) || session.email.split('@')[0];

/** 마스터·관리자용 — 이 달 보고를 아직 안 낸 사람과 보고 제외 목록 */
async function submissionStatus(env, reports) {
  const roster = await reporterRoster(env), done = await submittedEmails(env, roster, reports);
  const expected = roster.filter(p => !p.exempt), missing = missingReporters(roster, done);
  return { expected: expected.length, submitted: expected.filter(p => done.has(p.email)).length, missing: missing.map(({ email, name }) => ({ email, name })), exempt: roster.filter(p => p.exempt).map(({ email, name, fixed }) => ({ email, name, fixed })) };
}

/** 한 달의 집계(합계 + 끝난 캠프 + 교회 행사) — 저장해 둔 값이 있으면 그것을, 없으면 새로 계산해서 저장한다. fresh 면 저장값을 쓰지 않는다 */
async function aggregateOf(env, request, month, current, { fresh = false, reports = null, camps = null } = {}) {
  if (!fresh) {
    const cached = await env.CAMP_KV.get(AGG_KEY(month), 'json');
    if (cached && cached.v === AGG_VERSION) return cached;
  }
  const list = reports || await loadMonth(env, month);
  const monthCampList = camps || await monthCamps(env, request, month);
  const agg = { v: AGG_VERSION, month, summary: addCampsToSummary(summarize(list), monthCampList), camps: monthCampList, churchEvents: churchEvents(list), at: new Date().toISOString() };
  await env.CAMP_KV.put(AGG_KEY(month), JSON.stringify(agg), { expirationTtl: aggTtlSeconds(month, current) });
  return agg;
}

/** 연간 보기 — 한 해(1월~그 해의 마지막으로 보고 가능한 달)의 보고·끝난 캠프를 합친 집계. ?view=year[&year=YYYY] */
async function yearView(env, request, session, url, current) {
  const requested = url.searchParams.get('year');
  const year = /^\d{4}$/.test(requested || '') ? requested : current.slice(0, 4);
  if (Number(year) > Number(current.slice(0, 4))) return fail('아직 오지 않은 해예요.');
  const last = year === current.slice(0, 4) ? Number(current.slice(5)) : 12;
  const months = Array.from({ length: last }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
  const fresh = url.searchParams.get('fresh') === '1';
  const memo = await Promise.all(months.map(m => aggregateOf(env, request, m, current, { fresh })));
  const summary = mergeSummaries(memo.map(x => x.summary));
  const review = canReview(session);
  return Response.json({
    view: 'year', year, month: months[months.length - 1], current, reportMonth: reportMonth(), earliest: shiftMonth(current, -MONTHS_BACK),
    me: await meOf(env, session, review),
    schema: { sections: GOSPEL_SECTIONS, locations: LOCATIONS, scopes: SCOPES },
    summary, ytd: { year, from: months[0], to: months[months.length - 1], summary },
    campAuto: memo.flatMap(x => x.camps.map(c => ({ ...c, month: x.month }))),
    churchEvents: memo.flatMap(x => x.churchEvents.map(e => ({ ...e, month: x.month }))),
    trend: memo.map(x => ({ month: x.month, ...x.summary })),
    mine: [],
  }, { headers: H });
}

export async function onRequestGet({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  const url = new URL(request.url);
  const current = currentMonthKst();
  if (url.searchParams.get('view') === 'year') return yearView(env, request, session, url, current);
  const month = url.searchParams.get('month') || reportMonth();
  if (!MONTH_RE.test(month)) return fail('달 형식이 올바르지 않습니다. (예: 2026-10)');
  const reports = await loadMonth(env, month);

  if (url.searchParams.get('format') === 'csv') {
    if (!canReview(session)) return fail('내려받을 권한이 없습니다.', 403);
    return new Response(toCsv(month, reports), { headers: { ...H, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="gospel-stats-${month}.csv"` } });
  }

  // 최근 6개월(선택한 달 기준) 추이 — 숫자 합계만
  const trendMonths = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const camps = await monthCamps(env, request, month);
  // 달마다 (보고 + 끝난 캠프) 합계를 한 번만 계산해서 6개월 추이와 연 누적이 함께 쓴다
  const selected = await aggregateOf(env, request, month, current, { fresh: true, reports, camps });   // 고른 달은 늘 새 보고로 계산하고 저장값도 갱신
  const summaries = new Map([[month, selected.summary]]);
  const summaryOf = async m => { if (!summaries.has(m)) summaries.set(m, (await aggregateOf(env, request, m, current)).summary); return summaries.get(m); };
  const trend = await Promise.all(trendMonths.map(async m => ({ month: m, ...(await summaryOf(m)) })));

  if (url.searchParams.get('format') === 'xlsx') {
    if (!canReview(session)) return fail('내려받을 권한이 없습니다.', 403);
    const bytes = buildGospelXlsx({ month, summary: summaries.get(month), trend, reports, camps });
    return new Response(bytes, { headers: { ...H, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="WOLKO-Gospel-Report-${month}.xlsx"` } });
  }

  const review = canReview(session), owner = await ownerOf(env, session.email), designated = await isDesignated(env, session);
  return Response.json({
    me: await meOf(env, session, review),
    month, current, reportMonth: reportMonth(), earliest: shiftMonth(current, -MONTHS_BACK),
    schema: { sections: GOSPEL_SECTIONS, locations: LOCATIONS, scopes: SCOPES },
    summary: summaries.get(month),
    campAuto: camps,
    churchEvents: churchEvents(reports),
    trend,
    mine: reports.filter(r => r.owner === owner && r.scope !== 'ministry').map(({ owner: _o, ...mine }) => mine),   // 내 보고만 — 표식은 내보내지 않는다
    // 사역 현황(제자훈련·지역교회)은 위치마다 한 건을 지정 담당자들이 함께 고친다 — 담당자에게만 보여 준다
    ...(designated ? { ministry: reports.filter(r => r.scope === 'ministry').map(({ owner: _o, ...m }) => m) } : {}),
    // 팀·사역 현황 보고 내역 — 누가 냈는지 포함. 지정 담당자와 관리자·마스터만
    ...(designated || review ? { teamReports: reports.filter(r => r.scope === 'team' || r.scope === 'ministry').map(r => ({ id: r.id, scope: r.scope, teamName: r.teamName || '', location: r.location, reporterName: r.reporterName || '', reporterEmail: r.reporterEmail || '', updatedAt: r.updatedAt || '' })) } : {}),
    // 보고 담당자 지정(마스터만)
    ...(session.role === 'master' ? { reporters: await loadReporters(env) } : {}),
    // 보고별 목록(이름·이메일 포함)은 마스터·관리자만. 그 밖의 계정에는 합계만 준다 — 사람별 숫자는 익명이어도 누구의 것인지 알아낼 수 있다
    ...(canSeeSubmission(session) ? { submission: await submissionStatus(env, reports) } : {}),
  }, { headers: H });
}

export async function onRequestPost({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const month = String(body?.month || '');
  if (!reportableMonth(month)) return fail(`보고는 끝난 달(지난달)부터 ${MONTHS_BACK}개월 전까지 낼 수 있어요.`);
  const scope = SCOPES.includes(body?.scope) ? body.scope : null;
  if (!scope) return fail('개인, 팀 또는 사역 현황을 선택해 주세요.');
  const designated = await isDesignated(env, session);
  if (scope !== 'individual' && !designated) return fail('팀·사역 현황 보고는 지정된 보고 담당자만 쓸 수 있어요. 마스터에게 담당자 지정을 요청해 주세요.', 403);
  const location = LOCATIONS.includes(body?.location) ? body.location : null;
  if (!location) return fail('위치(평택 또는 제주)를 선택해 주세요.');
  const teamName = scope === 'team' ? cleanText(body?.teamName, 60) : '';
  if (scope === 'team' && !teamName) return fail('팀 이름을 입력해 주세요.');
  let values;
  try { values = cleanValues(body?.values, allowedFieldIds(scope, designated)); } catch { return fail('숫자는 0 이상의 정수로 입력해 주세요.'); }
  let churchEntries;
  try { churchEntries = scope === 'ministry' || !designated ? [] : cleanChurchEntries(body?.churchEntries); } catch (error) { return fail(String(error.message).includes('churchName') ? '교회 행사 기록에는 교회 이름이 필요합니다.' : '교회 행사 기록의 숫자는 0 이상의 정수로 입력해 주세요.'); }

  const id = scope === 'ministry' ? await ministryId(env, location) : await unitId(env, session.email, scope, teamName);
  const key = reportKey(month, id);
  const previous = await env.CAMP_KV.get(key, 'json');
  const today = new Date().toISOString().slice(0, 10);      // 시각은 날짜까지만 남긴다
  const report = {
    id, month, owner: await ownerOf(env, session.email), scope, teamName, location, values, churchEntries,
    // 팀·사역 현황 보고는 누가 냈는지 남긴다(개인 보고는 익명) — 지정 담당자와 관리자만 본다
    ...(scope !== 'individual' ? { reporterName: displayName(session), reporterEmail: session.email.trim().toLowerCase() } : {}),
    createdAt: previous?.createdAt || today, updatedAt: today,
  };
  await env.CAMP_KV.put(key, JSON.stringify(report));
  await env.CAMP_KV.delete(AGG_KEY(month));          // 이 달 집계 저장값은 낡았으니 지운다
  const { owner: _owner, ...shown } = report;
  return Response.json({ report: shown, updated: !!previous }, { headers: H });
}

export async function onRequestDelete({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  const url = new URL(request.url);
  const month = url.searchParams.get('month') || '';
  const id = url.searchParams.get('id') || '';
  if (!MONTH_RE.test(month) || !/^[0-9a-f]{12}$/.test(id)) return fail('삭제할 보고를 찾을 수 없습니다.', 404);
  const key = reportKey(month, id);
  const report = await env.CAMP_KV.get(key, 'json');
  if (!report) return fail('삭제할 보고를 찾을 수 없습니다.', 404);
  const mineOrShared = report.scope === 'ministry' ? await isDesignated(env, session) : report.owner === await ownerOf(env, session.email);   // 사역 현황은 담당자 누구나
  if (!mineOrShared) return fail('내 보고만 지울 수 있습니다.', 403);
  await env.CAMP_KV.delete(key);
  await env.CAMP_KV.delete(AGG_KEY(month));
  return Response.json({ ok: true }, { headers: H });
}
