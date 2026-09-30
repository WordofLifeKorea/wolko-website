/**
 * 경비 리포트(Expense Report) 공용 헬퍼.
 *
 * 흐름:  submitted(제출) → approved(승인) → processed(장부 반영 완료)
 *                       ↘ rejected(반려)
 *
 * 권한 (경비 리포트 전용 — 포탈 계정의 role(master/admin/counselor)과는 무관하며, 아래 목록으로만 결정):
 *  - 제출자   : 승인된 포탈 계정이면 누구나 (본인 리포트만 조회/철회)
 *  - 승인자   : EXPENSE_ADMIN_EMAILS 의 '관리자' 등급만 (본인이 제출한 건은 승인 불가).
 *               Developer / Owner / Member 등급은 승인도, 다른 사람 리포트 조회도 할 수 없다.
 *  - 회계담당 : 아래 ACCOUNTANT_EMAILS 목록의 계정. 화면에서 지정하지 않고,
 *               관리자가 Claude에게 요청하면 이 목록을 코드에서 수정해 배포한다.
 *               장부 반영 처리를 하고 승인 알림 메일을 받는다.
 *  - 전체 조회 : 승인자(master/admin)와 회계담당만 모든 사람의 리포트를 볼 수 있다.
 *               그 외 계정은 본인 리포트만 조회 가능.
 *
 * 저장소(CAMP_KV):
 *  - expense:report:{id}            리포트 JSON
 *  - expense:receipt:{id}:{fileId}  영수증 바이너리 (메타데이터에 파일명/타입)
 */
import {
  parseHubSessionToken, getAccount, normalizeEmail,
} from './hubAccounts.js';

/**
 * 경비 '관리자' 등급 — 리포트 승인 + 모든 사람의 리포트 조회 권한 (소문자 이메일).
 * 등급 변경은 관리자가 Claude에게 요청 → 이 목록을 수정해 배포한다.
 *   관리자 : 사무엘(samuelsong) · Jacob Morse · Jeremy Rodgers · 손진영(회계 겸임)
 *   임시  : Owner(wolkorea1@gmail.com) — 홈페이지 개발이 끝날 때까지 회계 관리자 권한 (끝나면 제거)
 *   그 외  : Developer(hkim3) · Member(ychae, joemin, peterchae …) → 본인 것만
 */
export const EXPENSE_ADMIN_EMAILS = [
  'samuelsong@wol.org',
  'jacobmorse@wol.org',
  'jeremyrodgers@wol.org',
  'jennyson@wol.org',
  'wolkorea1@gmail.com', // 임시: 홈페이지 개발 종료 시 제거
];

/** 장부 회계 담당 포탈 로그인 이메일(소문자). 예: 손진영(Jenny) */
export const ACCOUNTANT_EMAILS = [
  'jennyson@wol.org',
  'wolkorea1@gmail.com', // 임시: 홈페이지 개발 종료 시 제거
];

export const REPORT_PREFIX = 'expense:report:';
export const RECEIPT_PREFIX = 'expense:receipt:';
export const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };

export const MAX_ROWS = 30;
export const MAX_RECEIPTS_PER_ROW = 5;
export const MAX_RECEIPT_BYTES = 8 * 1024 * 1024;
export const ALLOWED_RECEIPT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];

export function err(message, status = 400) {
  return Response.json({ error: message }, { status, headers: CORS });
}

export function clip(value, max) {
  return String(value ?? '').trim().slice(0, max);
}

/** 요청의 포탈 토큰 → { email, name, role, isApprover, isAccountant } 또는 null */
export async function expenseSession(request, env) {
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) return null;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const session = await parseHubSessionToken(env.ADMIN_PASSWORD, token);
  if (!session) return null;

  const account = await getAccount(env, session.email);
  const isMaster = session.role === 'master';
  // master는 하드코딩 계정이라 KV 계정이 없을 수 있다(제출은 가능, 승인/전체조회는 위 목록에 있어야만)
  if (!isMaster && (!account || account.status !== 'approved')) return null;

  return {
    email: normalizeEmail(session.email),
    name: account?.name || session.email,
    role: session.role,
    isApprover: EXPENSE_ADMIN_EMAILS.includes(normalizeEmail(session.email)),
    isAccountant: ACCOUNTANT_EMAILS.includes(normalizeEmail(session.email)),
  };
}

/** 승인 요청 알림을 받을 사람들: 경비 관리자 등급 */
export async function approverEmails() {
  return [...EXPENSE_ADMIN_EMAILS];
}

/** 회계 승인 알림을 받을 사람들 */
export async function accountantEmails() {
  return [...ACCOUNTANT_EMAILS];
}

export async function listReports(env) {
  const items = [];
  let cursor;
  do {
    const result = await env.CAMP_KV.list({ prefix: REPORT_PREFIX, ...(cursor ? { cursor } : {}), limit: 1000 });
    const values = await Promise.all(result.keys.map(k => env.CAMP_KV.get(k.name, 'json')));
    items.push(...values.filter(Boolean));
    cursor = result.list_complete ? null : result.cursor;
  } while (cursor);
  return items.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));
}

export function totalOf(rows) {
  return Math.round(rows.reduce((sum, r) => sum + (Number(r.amountKrw) || 0), 0));
}

export function formatKrw(amount) {
  return '₩' + Math.round(Number(amount) || 0).toLocaleString('ko-KR');
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** 알림 메일 공통 본문 */
export function reportEmailHtml({ heading, intro, report, url, ctaLabel }) {
  const rows = (report.rows || []).map(r => `
    <tr>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;">${esc(r.account)}</td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;"><strong>${esc(r.item || '')}</strong>${r.item ? '<br>' : ''}<span style="color:#5a7585;">${esc(r.ministryPurpose)}</span></td>
      <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${formatKrw(r.amountKrw)}</td>
    </tr>`).join('');
  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;">
      <h2 style="color:#004f68;margin:0 0 12px;">${esc(heading)}</h2>
      <p style="margin:0 0 16px;">${intro}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:8px;">
        <tr><td style="color:#5a7585;width:110px;padding:4px 0;">제출자</td><td>${esc(report.submitterName)} (${esc(report.submitterEmail)})</td></tr>
        <tr><td style="color:#5a7585;padding:4px 0;">설명</td><td>${esc(report.description || '—')}</td></tr>
        <tr><td style="color:#5a7585;padding:4px 0;">합계</td><td><strong>${formatKrw(report.total)}</strong></td></tr>
      </table>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">${rows}</table>
      <p style="margin:24px 0;">
        <a href="${url}" style="background:#004f68;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:700;display:inline-block;">${esc(ctaLabel)}</a>
      </p>
    </div>`;
}

/**
 * 제출/수정 시점에 임시 영수증(3일 만료)을 리포트 소유의 영구 키로 옮긴다.
 * 이미 영구 키에 있는 파일은 그대로 두고, 어디에도 없는 id는 목록에서 제거한다.
 */
export async function finalizeReceipts(env, report) {
  for (const row of report.rows) {
    const kept = [];
    for (const f of row.receipts) {
      const finalKey = `${RECEIPT_PREFIX}${report.id}:${f.id}`;
      const tmpKey = `${RECEIPT_PREFIX}tmp:${report.submitterEmail}:${f.id}`;
      const already = await env.CAMP_KV.getWithMetadata(finalKey, 'arrayBuffer');
      if (already.value) { kept.push(f); continue; }
      const tmp = await env.CAMP_KV.getWithMetadata(tmpKey, 'arrayBuffer');
      if (!tmp.value) continue;
      await env.CAMP_KV.put(finalKey, tmp.value, { metadata: tmp.metadata });
      await env.CAMP_KV.delete(tmpKey);
      kept.push(f);
    }
    row.receipts = kept;
  }
}
