/**
 * 교재 내려받기 현황 — 포탈 admin/master 만 (이름 · 이메일이 들어 있다)
 * GET    /api/portal/material-downloads[?month=YYYY-MM]   집계 + 최근 기록 (JSON)
 * GET    /api/portal/material-downloads?format=csv[&month=] 전체 기록을 엑셀(CSV)로
 * DELETE /api/portal/material-downloads?email=…           그 이메일의 기록을 모두 지움(삭제 요청용)
 * DELETE /api/portal/material-downloads?code=WL-XXXXXX      확인번호 한 줄을 지움(이메일을 적지 않은 개인의 삭제 요청용)
 */
import { sessionFor, canWrite, readData, filesOf, error } from '../../lib/portalResources.js';
import { readDownloadLogs, summarizeLogs, logsToCsv, deleteLogsByEmail, deleteLogsByCode, pubKey } from '../../lib/materials.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
const RECENT = 300;

async function guard(env, request) {
  if (!env.CAMP_KV) return { res: error('서버 설정이 필요합니다.', 500) };
  const session = await sessionFor(request, env);
  if (!session) return { res: error('포탈 로그인이 필요합니다.', 401) };
  if (!canWrite(session)) return { res: error('교재 배포 현황은 관리자만 볼 수 있습니다.', 403) };
  return { session };
}

async function titlesOf(env) {
  const data = await readData(env);
  const titles = {};
  for (const item of data.items) for (const f of filesOf(item)) titles[pubKey(item.id, f.id)] = `${item.title || ''}${item.title && f.fileName ? ' — ' : ''}${f.fileName || ''}`.slice(0, 120);
  return titles;
}

export async function onRequestGet({ env, request }) {
  const g = await guard(env, request);
  if (g.res) return g.res;
  const url = new URL(request.url);
  const month = /^\d{4}-\d{2}$/.test(url.searchParams.get('month') || '') ? url.searchParams.get('month') : '';
  const wantsCsv = url.searchParams.get('format') === 'csv';
  const { rows, truncated } = await readDownloadLogs(env, { month, max: wantsCsv ? 1_000_000 : 20000 });   // 엑셀(CSV)에는 전체를 담는다
  const titles = await titlesOf(env);
  if (url.searchParams.get('format') === 'csv') {
    return new Response(logsToCsv(rows, titles), { headers: {
      'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'private, no-store',
      'Content-Disposition': `attachment; filename="wolko-material-downloads${month ? '-' + month : ''}.csv"`,
    } });
  }
  const summary = summarizeLogs(rows, titles);
  return Response.json({
    month, truncated, ...summary,
    recent: rows.slice(0, RECENT).map((r) => ({ t: r.t, code: r.code, title: r.title || titles[`${r.itemId}:${r.fileId}`] || '', kind: r.kind, name: r.name, church: r.church, email: r.email, lang: r.lang, stamp: r.stamp })),
  }, { headers: CORS });
}

export async function onRequestDelete({ env, request }) {
  const g = await guard(env, request);
  if (g.res) return g.res;
  const params = new URL(request.url).searchParams;
  const code = params.get('code') || '';
  if (code) {
    if (!/^WL-[A-Za-z0-9]{6}$/.test(code)) return error('확인번호를 확인해 주세요(WL- 뒤에 영문·숫자 6글자).', 400);
    return Response.json({ removed: await deleteLogsByCode(env, code) }, { headers: CORS });
  }
  const email = params.get('email') || '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return error('이메일 주소를 확인해 주세요.', 400);
  const removed = await deleteLogsByEmail(env, email);
  return Response.json({ removed }, { headers: CORS });
}
