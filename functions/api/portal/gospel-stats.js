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
import { portalSession } from '../../lib/hubAccounts.js';
import {
  GOSPEL_SECTIONS, LOCATIONS, SCOPES, MONTH_RE, MONTHS_BACK, currentMonthKst, shiftMonth, reportableMonth,
  cleanValues, cleanChurchEntries, churchEvents, cleanText, unitId, reportKey, loadMonth, summarize, toCsv,
} from '../../lib/gospelStats.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });
const canReview = session => session.role === 'master' || session.role === 'admin';
const displayName = session => cleanText(session.name, 80) || session.email.split('@')[0];

/** 마스터·관리자용 — 이 달 보고를 아직 안 낸 사람과 보고 제외 목록 */
async function submissionStatus(env, reports) {
  const roster = await reporterRoster(env), done = submittedEmails(reports);
  const expected = roster.filter(p => !p.exempt), missing = missingReporters(roster, reports);
  return { expected: expected.length, submitted: expected.filter(p => done.has(p.email)).length, missing: missing.map(({ email, name }) => ({ email, name })), exempt: roster.filter(p => p.exempt).map(({ email, name, fixed }) => ({ email, name, fixed })) };
}

export async function onRequestGet({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  const url = new URL(request.url);
  const current = currentMonthKst();
  const month = url.searchParams.get('month') || current;
  if (!MONTH_RE.test(month)) return fail('달 형식이 올바르지 않습니다. (예: 2026-10)');
  const reports = await loadMonth(env, month);

  if (url.searchParams.get('format') === 'csv') {
    if (!canReview(session)) return fail('내려받을 권한이 없습니다.', 403);
    return new Response(toCsv(month, reports), { headers: { ...H, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="gospel-stats-${month}.csv"` } });
  }

  // 최근 6개월(선택한 달 기준) 추이 — 숫자 합계만
  const trendMonths = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5));
  const camps = await monthCamps(env, request, month);
  const withCamps = async (m, list, monthCampList) => addCampsToSummary(summarize(list), monthCampList ?? await monthCamps(env, request, m));
  const trend = await Promise.all(trendMonths.map(async m => ({ month: m, ...(m === month ? await withCamps(m, reports, camps) : await withCamps(m, await loadMonth(env, m))) })));

  if (url.searchParams.get('format') === 'xlsx') {
    if (!canReview(session)) return fail('내려받을 권한이 없습니다.', 403);
    const bytes = buildGospelXlsx({ month, summary: addCampsToSummary(summarize(reports), camps), trend, reports, camps });
    return new Response(bytes, { headers: { ...H, 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="WOLKO-Gospel-Report-${month}.xlsx"` } });
  }

  const review = canReview(session);
  return Response.json({
    me: { email: session.email, name: displayName(session), role: session.role, canReview: review },
    month, current, earliest: shiftMonth(current, -MONTHS_BACK),
    schema: { sections: GOSPEL_SECTIONS, locations: LOCATIONS, scopes: SCOPES },
    summary: addCampsToSummary(summarize(reports), camps),
    campAuto: camps,
    canEditStaff: review,
    churchEvents: churchEvents(reports),
    trend,
    mine: reports.filter(r => r.email === session.email),
    // 보고별 목록(이름·이메일 포함)은 마스터·관리자만. 그 밖의 계정에는 합계만 준다 — 사람별 숫자는 익명이어도 누구의 것인지 알아낼 수 있다
    ...(review ? { submission: await submissionStatus(env, reports) } : {}),
    ...(review ? { rows: reports.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))) } : {}),
  }, { headers: H });
}

export async function onRequestPost({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const month = String(body?.month || '');
  if (!reportableMonth(month)) return fail(`보고할 수 있는 달은 이번 달부터 ${MONTHS_BACK}개월 전까지입니다.`);
  const scope = SCOPES.includes(body?.scope) ? body.scope : null;
  if (!scope) return fail('개인 또는 팀을 선택해 주세요.');
  const location = LOCATIONS.includes(body?.location) ? body.location : null;
  if (!location) return fail('위치(평택 또는 제주)를 선택해 주세요.');
  const teamName = scope === 'team' ? cleanText(body?.teamName, 60) : '';
  if (scope === 'team' && !teamName) return fail('팀 이름을 입력해 주세요.');
  let values;
  try { values = cleanValues(body?.values); } catch { return fail('숫자는 0 이상의 정수로 입력해 주세요.'); }
  let churchEntries;
  try { churchEntries = cleanChurchEntries(body?.churchEntries); } catch (error) { return fail(String(error.message).includes('churchName') ? '교회 행사 기록에는 교회 이름이 필요합니다.' : '교회 행사 기록의 숫자는 0 이상의 정수로 입력해 주세요.'); }

  const id = await unitId(session.email, scope, teamName);
  const key = reportKey(month, id);
  const previous = await env.CAMP_KV.get(key, 'json');
  const now = new Date().toISOString();
  const report = {
    id, month, email: session.email, name: displayName(session), scope, teamName, location, values, churchEntries,
    createdAt: previous?.createdAt || now, updatedAt: now,
  };
  await env.CAMP_KV.put(key, JSON.stringify(report));
  return Response.json({ report, updated: !!previous }, { headers: H });
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
  if (report.email !== session.email && session.role !== 'master') return fail('내 보고만 지울 수 있습니다.', 403);
  await env.CAMP_KV.delete(key);
  return Response.json({ ok: true }, { headers: H });
}
