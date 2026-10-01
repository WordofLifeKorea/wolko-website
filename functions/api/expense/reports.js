/**
 * GET    /api/expense/reports?scope=mine|approve|accounting|all|trash|counts  (all = 모든 사람의 리포트, 승인자/회계담당만 · trash = 삭제(백업)된 리포트, 회계담당만)
 * POST   /api/expense/reports                     — 새 경비 리포트 제출
 * PATCH  /api/expense/reports                     — body: { id, action, note? }
 *          action: 'approve' | 'reject'  (승인자)   submitted → approved | rejected
 *                  'process'             (회계담당) approved → processed (송금 처리 완료)
 *                  'trash'               (회계담당) 어떤 상태의 리포트든 삭제 — 영수증 포함 통째로 백업되어 복구 가능
 *                  'restore'             (회계담당) 삭제(백업)된 리포트를 원래대로 복구
 * DELETE /api/expense/reports?id=                 — 제출자가 아직 승인 전인 본인 리포트 철회
 *
 * 인증: Authorization: Bearer <포탈 세션 토큰>  (권한 규칙은 lib/expenses.js 참고)
 */
import { sendEmail } from '../../lib/hubAccounts.js';
import {
  CORS, REPORT_PREFIX, RECEIPT_PREFIX, MAX_ROWS, MAX_RECEIPTS_PER_ROW,
  EXPENSE_REPLY_TO, err, clip, expenseSession, approverEmails, accountantEmails, listReports,
  totalOf, reportEmailHtml, formatKrw, finalizeReceipts, trashReport, restoreReport, listTrash,
} from '../../lib/expenses.js';

const reportKey = id => `${REPORT_PREFIX}${id}`;

function cleanRows(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return { error: '경비 항목을 한 줄 이상 입력해 주세요.' };
  if (rawRows.length > MAX_ROWS) return { error: `항목은 최대 ${MAX_ROWS}줄까지 입력할 수 있습니다.` };

  const rows = [];
  for (const [i, r] of rawRows.entries()) {
    const n = i + 1;
    const currency = r?.currency === 'USD' ? 'USD' : 'KRW'; // 기준 통화는 KRW
    const amount = Math.round(Number(r?.amount) * 100) / 100; // 입력한 통화 기준 원금액
    const account = clip(r?.account, 120);
    const item = clip(r?.item, 120); // 구매 품목명
    const ministryPurpose = clip(r?.ministryPurpose, 500); // 구매 목적
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e10) return { error: `${n}번째 줄의 금액을 확인해 주세요.` };
    if (!account) return { error: `${n}번째 줄의 Account를 선택해 주세요.` };
    if (!item) return { error: `${n}번째 줄의 구매 품목명을 입력해 주세요.` };
    if (!ministryPurpose) return { error: `${n}번째 줄의 구매 목적을 입력해 주세요.` };

    // USD 항목: 영수 날짜 기준 환율(KRW per USD)로 원화 환산. 환율은 화면에서 자동 조회 후 수정 가능.
    const rate = Number(r?.rate);
    if (currency === 'USD' && !(rate > 100 && rate < 10000)) return { error: `${n}번째 줄의 환율을 확인해 주세요.` };
    const amountKrw = currency === 'USD' ? Math.round(amount * rate) : Math.round(amount);
    if (amountKrw <= 0 || amountKrw > 1e10) return { error: `${n}번째 줄의 금액을 확인해 주세요.` };

    const receipts = (Array.isArray(r?.receipts) ? r.receipts : [])
      .slice(0, MAX_RECEIPTS_PER_ROW)
      .map(f => ({ id: clip(f?.id, 64), name: clip(f?.name, 160), type: clip(f?.type, 60) }))
      .filter(f => f.id);

    rows.push({
      project: clip(r?.project, 160), // 비어 있으면 리포트 상단 Project를 따른다
      account, currency, amount, amountKrw,
      rate: currency === 'USD' ? Math.round(rate * 100) / 100 : null,
      item,
      ministryPurpose,
      when: clip(r?.when, 20),
      where: clip(r?.where, 160),
      receipts,
    });
  }
  return { rows };
}

async function notify(context, to, subject, html) {
  const { env } = context;
  if (!env.RESEND_API_KEY || !to.length) return;
  context.waitUntil(
    sendEmail(env, { to, subject, html, replyTo: EXPENSE_REPLY_TO }).catch(e => console.error('expense notification failed:', e))
  );
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);

  const scope = new URL(request.url).searchParams.get('scope') || 'mine';
  const all = await listReports(env);

  const mine = all.filter(r => r.submitterEmail === session.email);
  const toApprove = session.isApprover
    ? all.filter(r => r.status === 'submitted' && r.submitterEmail !== session.email)
    : [];
  const accounting = session.isAccountant ? all.filter(r => r.status === 'approved' || r.status === 'processed') : [];
  const canViewAll = session.isApprover || session.isAccountant;

  if (scope === 'counts') {
    return Response.json({
      me: { email: session.email, name: session.name, role: session.role, isApprover: session.isApprover, isAccountant: session.isAccountant, canViewAll },
      mine: mine.filter(r => r.status === 'rejected' || r.status === 'submitted').length,
      approve: toApprove.length,
      accounting: accounting.filter(r => r.status === 'approved').length,
    }, { headers: CORS });
  }

  if (scope === 'approve') {
    if (!session.isApprover) return err('승인 권한이 없습니다.', 403);
    // 승인 화면에서는 대기 건과 함께 최근 처리 이력도 보여준다
    const history = all.filter(r => r.status !== 'submitted' && r.reviewedBy === session.email).slice(0, 30);
    return Response.json({ reports: [...toApprove, ...history] }, { headers: CORS });
  }
  if (scope === 'all') {
    if (!canViewAll) return err('전체 리포트는 관리자와 회계 담당자만 볼 수 있습니다.', 403);
    return Response.json({ reports: all }, { headers: CORS });
  }
  if (scope === 'trash') {
    if (!session.isAccountant) return err('회계 담당자만 볼 수 있습니다.', 403);
    return Response.json({ trash: await listTrash(env) }, { headers: CORS });
  }
  if (scope === 'accounting') {
    if (!session.isAccountant) return err('회계 담당자만 볼 수 있습니다.', 403);
    return Response.json({ reports: accounting }, { headers: CORS });
  }
  return Response.json({ reports: mine }, { headers: CORS });
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);

  let body;
  try { body = await request.json(); } catch { return err('잘못된 요청입니다.'); }

  const cleaned = cleanRows(body.rows);
  if (cleaned.error) return err(cleaned.error);

  const id = `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const report = {
    id,
    status: 'submitted',
    submitterEmail: session.email,
    submitterName: session.name,
    description: clip(body.description, 200),
    project: clip(body.project, 160),
    rows: cleaned.rows,
    total: totalOf(cleaned.rows),
    submittedAt: new Date().toISOString(),
    log: [{ at: new Date().toISOString(), by: session.email, action: 'submit' }],
  };
  await finalizeReceipts(env, report);
  await env.CAMP_KV.put(reportKey(id), JSON.stringify(report));

  const origin = new URL(request.url).origin;
  const approvers = (await approverEmails()).filter(e => e !== session.email);
  await notify(context, approvers,
    `[경비 승인 요청] ${report.submitterName} · ${formatKrw(report.total)}`,
    reportEmailHtml({
      heading: '새 경비 리포트 승인 요청',
      intro: `<strong>${report.submitterName}</strong> 님이 경비 리포트를 제출했습니다. 포탈에서 검토 후 승인 또는 반려해 주세요.`,
      report, url: `${origin}/expense`, ctaLabel: '경비 리포트 확인',
    }));

  return Response.json({ ok: true, report }, { headers: CORS });
}

export async function onRequestPatch(context) {
  const { env, request } = context;
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);

  let body;
  try { body = await request.json(); } catch { return err('잘못된 요청입니다.'); }

  const id = clip(body.id, 80);
  const action = body.action;

  if (action === 'restore') {
    if (!session.isAccountant) return err('회계 담당자만 복구할 수 있습니다.', 403);
    const restored = id ? await restoreReport(env, id, session) : { error: 'notfound' };
    if (restored.error === 'notfound') return err('백업된 리포트를 찾을 수 없습니다.', 404);
    if (restored.error === 'exists') return err('같은 ID의 리포트가 이미 있습니다.', 409);
    return Response.json({ ok: true, report: restored.report }, { headers: CORS });
  }

  const report = id ? await env.CAMP_KV.get(reportKey(id), 'json') : null;
  if (!report) return err('리포트를 찾을 수 없습니다.', 404);

  const now = new Date().toISOString();
  const origin = new URL(request.url).origin;

  if (action === 'approve' || action === 'reject') {
    if (!session.isApprover) return err('승인 권한이 없습니다.', 403);
    if (report.submitterEmail === session.email) return err('본인이 제출한 리포트는 직접 승인할 수 없습니다.', 403);
    if (report.status !== 'submitted') return err('이미 처리된 리포트입니다.', 409);
    const note = clip(body.note, 300);
    if (action === 'reject' && !note) return err('반려 사유를 입력해 주세요.');

    report.status = action === 'approve' ? 'approved' : 'rejected';
    report.reviewedBy = session.email;
    report.reviewedByName = session.name;
    report.reviewedAt = now;
    report.reviewNote = note;
    report.log.push({ at: now, by: session.email, action, note });
    await env.CAMP_KV.put(reportKey(id), JSON.stringify(report));

    if (action === 'approve') {
      await notify(context, await accountantEmails(),
        `[경비 송금 처리 요청] ${report.submitterName} · ${formatKrw(report.total)}`,
        reportEmailHtml({
          heading: '승인된 경비 리포트 — 송금 처리 요청',
          intro: `<strong>${report.reviewedByName}</strong> 님이 승인한 경비 리포트입니다. 송금을 마친 뒤 포탈에서 "송금 처리 완료"로 처리해 주세요.`,
          report, url: `${origin}/expense`, ctaLabel: '회계 업무 열기',
        }));
      await notify(context, [report.submitterEmail],
        `[경비 승인됨] ${formatKrw(report.total)}`,
        reportEmailHtml({ heading: '경비 리포트가 승인되었습니다', intro: '회계 담당자에게 전달되었습니다.', report, url: `${origin}/expense`, ctaLabel: '내 리포트 보기' }));
    } else {
      await notify(context, [report.submitterEmail],
        `[경비 반려됨] ${formatKrw(report.total)}`,
        reportEmailHtml({
          heading: '경비 리포트가 반려되었습니다',
          intro: `사유: ${note.replace(/</g, '&lt;')}`,
          report, url: `${origin}/expense`, ctaLabel: '내 리포트 보기',
        }));
    }
    return Response.json({ ok: true, report }, { headers: CORS });
  }

  if (action === 'process') {
    if (!session.isAccountant) return err('회계 담당자만 처리할 수 있습니다.', 403);
    if (report.status !== 'approved') return err('승인된 리포트만 송금 처리할 수 있습니다.', 409);
    report.status = 'processed';
    report.processedBy = session.email;
    report.processedByName = session.name;
    report.processedAt = now;
    report.processNote = clip(body.note, 300);
    report.log.push({ at: now, by: session.email, action: 'process', note: report.processNote });
    await env.CAMP_KV.put(reportKey(id), JSON.stringify(report));
    return Response.json({ ok: true, report }, { headers: CORS });
  }

  if (action === 'trash') {
    if (!session.isAccountant) return err('회계 담당자만 삭제할 수 있습니다.', 403);
    await trashReport(env, report, session);
    return Response.json({ ok: true }, { headers: CORS });
  }

  return err('알 수 없는 작업입니다.');
}

export async function onRequestPut(context) {
  const { env, request } = context;
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);

  let body;
  try { body = await request.json(); } catch { return err('잘못된 요청입니다.'); }

  const id = clip(body.id, 80);
  const report = id ? await env.CAMP_KV.get(reportKey(id), 'json') : null;
  if (!report) return err('리포트를 찾을 수 없습니다.', 404);
  if (report.submitterEmail !== session.email) return err('본인 리포트만 수정할 수 있습니다.', 403);
  if (report.status !== 'rejected' && report.status !== 'submitted') return err('승인된 리포트는 수정할 수 없습니다.', 409);

  const cleaned = cleanRows(body.rows);
  if (cleaned.error) return err(cleaned.error);

  const wasRejected = report.status === 'rejected';
  const now = new Date().toISOString();
  Object.assign(report, {
    status: 'submitted',
    description: clip(body.description, 200),
    project: clip(body.project, 160),
    rows: cleaned.rows,
    total: totalOf(cleaned.rows),
    submittedAt: now,
    reviewedBy: null, reviewedByName: null, reviewedAt: null, reviewNote: '',
  });
  report.log.push({ at: now, by: session.email, action: wasRejected ? 'resubmit' : 'edit' });
  await finalizeReceipts(env, report);
  await env.CAMP_KV.put(reportKey(id), JSON.stringify(report));

  if (wasRejected) {
    const origin = new URL(request.url).origin;
    const approvers = (await approverEmails()).filter(e => e !== session.email);
    await notify(context, approvers,
      `[경비 재제출] ${report.submitterName} · ${formatKrw(report.total)}`,
      reportEmailHtml({
        heading: '수정된 경비 리포트 재제출',
        intro: `<strong>${report.submitterName}</strong> 님이 반려된 리포트를 수정해 다시 제출했습니다.`,
        report, url: `${origin}/expense`, ctaLabel: '경비 리포트 확인',
      }));
  }
  return Response.json({ ok: true, report }, { headers: CORS });
}

export async function onRequestDelete(context) {
  const { env, request } = context;
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);

  const id = clip(new URL(request.url).searchParams.get('id'), 80);
  const report = id ? await env.CAMP_KV.get(reportKey(id), 'json') : null;
  if (!report) return err('리포트를 찾을 수 없습니다.', 404);
  if (report.submitterEmail !== session.email) return err('본인 리포트만 철회할 수 있습니다.', 403);
  if (report.status !== 'submitted' && report.status !== 'rejected') {
    return err('승인된 리포트는 철회할 수 없습니다. 회계 담당자에게 문의해 주세요.', 409);
  }

  const receiptIds = report.rows.flatMap(r => r.receipts.map(f => f.id));
  await Promise.all([
    env.CAMP_KV.delete(reportKey(id)),
    ...receiptIds.map(fid => env.CAMP_KV.delete(`${RECEIPT_PREFIX}${id}:${fid}`)),
  ]);
  return Response.json({ ok: true }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
