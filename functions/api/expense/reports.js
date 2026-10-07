/**
 * GET    /api/expense/reports?scope=mine|approve|accounting|all|trash|counts  (all = 모든 사람의 리포트, 승인자/회계담당만 · trash = 삭제(백업)된 리포트, 회계담당만)
 * POST   /api/expense/reports                     — 새 경비 리포트 제출
 * PATCH  /api/expense/reports                     — body: { id, action, note? }
 *          action: 'approve' | 'reject'  (승인자)   submitted → approved | rejected
 *                    approve 는 body.withdrawals(항목별 출금 계좌 id, rows와 같은 길이)로 출금 계좌를 확정해야 한다.
 *                    계정과목(코드)은 승인자가 바꿀 필요 없이 회계 담당자가 마지막에 확인한다(body.categories 는 선택). 계좌번호는 회계 담당자에게만 내려간다.
 *                  'process'             (회계담당) approved → processed (송금 처리 완료)
 *                  'trash'               (회계담당) 어떤 상태의 리포트든 삭제 — 영수증 포함 통째로 백업되어 복구 가능
 *                  'restore'             (회계담당) 삭제(백업)된 리포트를 원래대로 복구
 * DELETE /api/expense/reports?id=                 — 제출자가 아직 승인 전인 본인 리포트 철회
 *
 * 인증: Authorization: Bearer <포탈 세션 토큰>  (권한 규칙은 lib/expenses.js 참고)
 */
import { sendEmail, listAccounts } from '../../lib/hubAccounts.js';
import { ACCOUNTS, CAMPUSES, DEFAULT_CAMPUS, CAMPUS_OVERRIDES, FOREIGN_CURRENCIES, WITHDRAW_NOTE_REQUIRED, canonAccount } from '../../../src/lib/expense-config.js';
import { DEFAULT_CODE_FOR, isWithdrawId, withAccountNumbers } from '../../lib/expenseAccounts.js';
import {
  CORS, REPORT_PREFIX, RECEIPT_PREFIX, MAX_ROWS, MAX_RECEIPTS_PER_ROW,
  EXPENSE_REPLY_TO, EXPENSE_EMAIL_ENABLED, NEW_REPORT_EMAIL_ENABLED, SUBMITTER_EMAIL_ENABLED, err, clip, expenseSession, approverEmails, accountantEmails, listReports,
  bustReportCache, totalOf, reportEmailHtml, formatKrw, finalizeReceipts, trashReport, restoreReport, listTrash,
} from '../../lib/expenses.js';

const reportKey = id => `${REPORT_PREFIX}${id}`;

function cleanRows(rawRows) {
  if (!Array.isArray(rawRows) || rawRows.length === 0) return { error: '경비 항목을 한 줄 이상 입력해 주세요.' };
  if (rawRows.length > MAX_ROWS) return { error: `항목은 최대 ${MAX_ROWS}줄까지 입력할 수 있습니다.` };

  const rows = [];
  for (const [i, r] of rawRows.entries()) {
    const n = i + 1;
    const currency = FOREIGN_CURRENCIES[r?.currency] ? r.currency : 'KRW'; // 기준 통화는 KRW
    const fx = FOREIGN_CURRENCIES[currency];
    const amount = Math.round(Number(r?.amount) * 100) / 100; // 입력한 통화 기준 원금액
    const source = clip(r?.source, 160); // 작성자가 직접 적은 '어떤 선교 항목/계좌인지' (카테고리는 승인자가 확정)
    const rawAccount = clip(r?.account, 120);
    const account = canonAccount(rawAccount); // 작성자가 고른 카테고리 — 예전 이름은 새 이름으로 읽고, 목록에 없는 값은 비운다(예전 화면에서 온 값은 '작성자 입력'으로만 쓴다)
    const item = clip(r?.item, 120); // 구매 품목명
    const ministryPurpose = clip(r?.ministryPurpose, 500); // 구매 목적
    const memo = clip(r?.memo, 300); // 모든 카테고리에서 쓸 수 있는 메모(부가 설명)
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1e10) return { error: `${n}번째 줄의 금액을 확인해 주세요.` };
    if (!source && !rawAccount) return { error: `${n}번째 줄에 어떤 선교 항목·계좌의 지출인지 적어 주세요.` };
    if (!item) return { error: `${n}번째 줄의 구매 품목명을 입력해 주세요.` };

    // USD 항목: 영수 날짜 기준 환율(KRW per USD)로 원화 환산. 환율은 화면에서 자동 조회 후 수정 가능.
    const rate = Number(r?.rate);
    if (fx && !(rate >= fx.min && rate <= fx.max)) return { error: `${n}번째 줄의 환율을 확인해 주세요.` };
    const amountKrw = fx ? Math.round(amount * rate) : Math.round(amount);
    if (amountKrw <= 0 || amountKrw > 1e10) return { error: `${n}번째 줄의 금액을 확인해 주세요.` };

    const receipts = (Array.isArray(r?.receipts) ? r.receipts : [])
      .slice(0, MAX_RECEIPTS_PER_ROW)
      .map(f => ({ id: clip(f?.id, 64), name: clip(f?.name, 160), type: clip(f?.type, 60) }))
      .filter(f => f.id);

    rows.push({
      project: clip(r?.project, 160), // 비어 있으면 리포트 상단 Project를 따른다
      source: source || rawAccount, account, currency, amount, amountKrw,
      rate: fx ? Math.round(rate * 10 ** fx.dp) / 10 ** fx.dp : null,
      item,
      ministryPurpose,
      memo,
      when: clip(r?.when, 20),
      where: clip(r?.where, 160),
      receipts,
    });
  }
  return { rows };
}

function cleanCampus(value) {
  return CAMPUSES.includes(value) ? value : DEFAULT_CAMPUS;
}

// 소속 캠퍼스(평택|제주)는 작성자가 고르지 않고, 포탈 가입 때 정한 제출자 계정의 값을 따른다.
// 값이 없는 기존 계정은 모두 평택(wolko)이다.
let campusMapCache = { at: 0, map: null };
export function resetCampusCache() { campusMapCache = { at: 0, map: null }; }
async function getCampusMap(env) {
  if (campusMapCache.map && Date.now() - campusMapCache.at < 120000) return campusMapCache.map;
  const map = {};
  for (const a of await listAccounts(env)) if (a?.email) map[a.email] = cleanCampus(a.campus);
  Object.assign(map, CAMPUS_OVERRIDES);
  campusMapCache = { at: Date.now(), map };
  return map;
}
const applyCampus = (reports, map) => reports.map(r => ({ ...r, campus: cleanCampus(map[r.submitterEmail]) }));

async function notify(context, to, subject, html, { newReport = false, toSubmitter = false } = {}) {
  const { env } = context;
  // 새 리포트 알림은 따로 켜져 있고, 나머지 메일은 EXPENSE_EMAIL_ENABLED(또는 환경변수 EXPENSE_EMAIL=on)일 때만 보낸다
  const allowed = (newReport && NEW_REPORT_EMAIL_ENABLED) || (toSubmitter && SUBMITTER_EMAIL_ENABLED) || EXPENSE_EMAIL_ENABLED || env.EXPENSE_EMAIL === 'on';
  if (!allowed || !env.RESEND_API_KEY || !to.length) return;
  context.waitUntil(
    sendEmail(env, { to, subject, html, replyTo: EXPENSE_REPLY_TO }).catch(e => console.error('expense notification failed:', e))
  );
}

export async function onRequestGet(context) {
  const { env, request } = context;
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);

  const scope = new URL(request.url).searchParams.get('scope') || 'mine';
  const campusMap = await getCampusMap(env);
  const all = applyCampus(await listReports(env), campusMap);

  const view = list => list.map(r => withAccountNumbers(r, session));
  const mine = all.filter(r => r.submitterEmail === session.email);
  const toApprove = session.isApprover
    ? all.filter(r => r.status === 'submitted' && r.submitterEmail !== session.email)
    : [];
  const accounting = session.isAccountant ? all.filter(r => r.status === 'approved' || r.status === 'processed') : [];
  const canViewAll = session.isApprover || session.isAccountant;

  if (scope === 'counts') {
    return Response.json({
      me: { email: session.email, name: session.name, role: session.role, isApprover: session.isApprover, isAccountant: session.isAccountant, canViewAll, campus: cleanCampus(CAMPUS_OVERRIDES[session.email] || session.campus) },
      mine: mine.filter(r => r.status === 'rejected' || r.status === 'submitted').length,
      approve: toApprove.length,
      accounting: accounting.filter(r => r.status === 'approved').length,
      // 내 리포트의 결과 알림(송금 완료/반려) — 화면에서 마지막으로 확인한 시각과 비교해 배지로 표시
      alerts: mine.filter(r => r.status === 'processed' || r.status === 'rejected')
        .map(r => ({ id: r.id, status: r.status, at: r.status === 'processed' ? r.processedAt : r.reviewedAt }))
        .filter(a => a.at && Date.now() - new Date(a.at).getTime() < 14 * 864e5),
    }, { headers: CORS });
  }

  if (scope === 'approve') {
    if (!session.isApprover) return err('승인 권한이 없습니다.', 403);
    // 승인 화면에서는 대기 건과 함께 최근 처리 이력도 보여준다
    const history = all.filter(r => r.status !== 'submitted' && r.reviewedBy === session.email).slice(0, 30);
    return Response.json({ reports: view([...toApprove, ...history]) }, { headers: CORS });
  }
  if (scope === 'all') {
    if (!canViewAll) return err('전체 리포트는 관리자와 회계 담당자만 볼 수 있습니다.', 403);
    // 승인 권한이 없는 회계 담당자에게는 승인 대기(submitted) 상태의 리포트를 보여주지 않는다
    return Response.json({ reports: view(session.isApprover ? all : all.filter(r => r.status !== 'submitted')) }, { headers: CORS });
  }
  if (scope === 'trash') {
    if (!session.isAccountant) return err('회계 담당자만 볼 수 있습니다.', 403);
    return Response.json({ trash: await listTrash(env) }, { headers: CORS });
  }
  if (scope === 'accounting') {
    if (!session.isAccountant) return err('회계 담당자만 볼 수 있습니다.', 403);
    return Response.json({ reports: view(accounting) }, { headers: CORS });
  }
  return Response.json({ reports: view(mine) }, { headers: CORS });
}

async function handlePost(context) {
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
    campus: cleanCampus(CAMPUS_OVERRIDES[session.email] || session.campus),
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
    }), { newReport: true });

  return Response.json({ ok: true, report }, { headers: CORS });
}

async function handlePatch(context) {
  const { env, request } = context;
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);

  let body;
  try { body = await request.json(); } catch { return err('잘못된 요청입니다.'); }

  const id = clip(body.id, 80);
  const action = body.action;

  if (action === 'trash-all') {
    if (!session.isAccountant) return err('회계 담당자만 삭제할 수 있습니다.', 403);
    if (body.confirm !== 'DELETE-ALL') return err('확인 값이 필요합니다.');
    // 한 번에 몇 건만 처리한다(요청당 KV 호출 수 제한 때문). 남은 건수를 돌려주면 화면이 끝날 때까지 반복 호출한다.
    const reports = await listReports(env);
    const batch = reports.slice(0, 4);
    for (const r of batch) await trashReport(env, r, session); // 백업 후 이동 — 삭제됨 목록에서 하나씩 복구 가능
    return Response.json({ ok: true, count: batch.length, remaining: reports.length - batch.length }, { headers: CORS });
  }

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

  // 회계 담당: 승인된(아직 송금 전) 리포트를 승인자에게 되돌린다. 작성자가 아니라 승인자가 다시 검토·승인해야 한다.
  if (action === 'return') {
    if (!session.isAccountant) return err('회계 담당자만 반려할 수 있습니다.', 403);
    if (report.status !== 'approved') return err('승인되었고 아직 송금 전인 리포트만 승인자에게 되돌릴 수 있습니다.', 409);
    const note = clip(body.note, 300);
    if (!note) return err('되돌리는 사유를 입력해 주세요.');
    report.status = 'submitted';
    report.returnedBy = session.email;
    report.returnedByName = session.name;
    report.returnedAt = now;
    report.returnNote = note;
    report.log.push({ at: now, by: session.email, action: 'return', note });
    await env.CAMP_KV.put(reportKey(id), JSON.stringify(report));
    await notify(context, await approverEmails(),
      `[경비 재승인 요청] ${report.submitterName} · ${formatKrw(report.total)}`,
      reportEmailHtml({
        heading: '회계 담당자가 승인된 리포트를 되돌렸습니다',
        intro: `<strong>${session.name}</strong> 님: ${note.replace(/</g, '&lt;')} — 확인 후 다시 승인하거나 반려해 주세요.`,
        report, url: `${new URL(request.url).origin}/expense`, ctaLabel: '경비 리포트 확인',
      }));
    return Response.json({ ok: true, report }, { headers: CORS });
  }

  if (action === 'approve' || action === 'reject') {
    if (!session.isApprover) return err('승인 권한이 없습니다.', 403);
    if (report.submitterEmail === session.email) return err('본인이 제출한 리포트는 직접 승인할 수 없습니다.', 403);
    if (report.status !== 'submitted') return err('이미 처리된 리포트입니다.', 409);
    const note = clip(body.note, 300);
    if (action === 'reject' && !note) return err('반려 사유를 입력해 주세요.');

    if (action === 'approve') {
      // 승인자는 모든 항목의 출금 계좌(별칭)를 확정해야 승인된다. 계정과목(코드)은 승인자가 바꿀 필요 없이 회계 담당자가 마지막에 확인한다.
      const withdrawals = Array.isArray(body.withdrawals) ? body.withdrawals : [];
      if (withdrawals.length !== report.rows.length || withdrawals.some(w => !isWithdrawId(w))) {
        return err('승인하려면 모든 항목의 출금 계좌를 확인해 주세요.');
      }
      // 예전 화면이 보낸 계정과목은 선택 사항 — 값이 있으면 유효해야 하고, 비어 있으면 건너뛴다
      const given = Array.isArray(body.categories) ? body.categories : [];
      if (given.length && (given.length !== report.rows.length || given.some(c => c && !canonAccount(c)))) {
        return err('계정과목을 확인해 주세요.');
      }
      const cats = given.length ? given.map(c => canonAccount(c)) : report.rows.map(() => '');
      // 제출자가 메모를 남긴 항목은 승인자가 하나씩 확인(체크)해야 한다
      // 위임하면 확인하지 않은 항목은 자동으로 확인 처리된다(autoChecks) — 기록에는 자동 확인으로 남긴다.
      const checks = Array.isArray(body.checks) ? body.checks : [];
      if (report.rows.some((row, i) => row.memo && checks[i] !== true)) return err('메모가 있는 항목을 모두 확인해 주세요.');
      const aMemos = Array.isArray(body.approverMemos) ? body.approverMemos : [];
      // 'Others' 출금 계좌는 어디에 쓰는 돈인지 승인자의 메모가 꼭 있어야 한다
      if (withdrawals.some((w, i) => WITHDRAW_NOTE_REQUIRED.includes(w) && !clip(aMemos[i], 300))) return err('“Others” 출금 계좌를 고른 항목은 승인 메모가 꼭 필요합니다.');
      report.rows.forEach((row, i) => {
        row.withdrawAccount = withdrawals[i];
        if (cats[i]) {
          if (row.account && row.account !== cats[i]) { row.submittedAccount = row.account; row.categoryChanged = true; }
          row.account = cats[i];
        } else if (!canonAccount(row.account) && DEFAULT_CODE_FOR[withdrawals[i]]) {
          row.account = DEFAULT_CODE_FOR[withdrawals[i]];   // 출금 계좌로 짐작되는 코드를 미리 채워 두고, 회계가 마지막에 확인한다
          row.accountSuggested = true;
        }
        const am = clip(aMemos[i], 300);
        if (am) row.approverMemo = am; else delete row.approverMemo;
        if (row.memo) {
          delete row.memoAutoChecked;
          row.memoCheckedBy = session.email;
        }
      });
      report.withdrawConfirmedBy = session.email;
      report.withdrawConfirmedAt = now;
      // 승인자가 계정과목까지 직접 정한 경우(예전 화면)에만 승인자 확정으로 남긴다. 그 밖에는 회계 담당자가 확인한다.
      delete report.categoryDelegated; delete report.categoryDelegatedBy; delete report.categoryDelegatedAt;
      if (given.length && report.rows.every(r => canonAccount(r.account))) { report.categoriesConfirmedBy = session.email; report.categoriesConfirmedAt = now; }
      else { delete report.categoriesConfirmedBy; delete report.categoriesConfirmedAt; }
    }

    report.status = action === 'approve' ? 'approved' : 'rejected';
    if (report.returnNote) { report.returnHistory = [...(report.returnHistory || []), { by: report.returnedBy, at: report.returnedAt, note: report.returnNote }]; }
    delete report.returnNote; delete report.returnedBy; delete report.returnedByName; delete report.returnedAt;
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
          intro: `<strong>${report.reviewedByName}</strong> 님이 승인한 경비 리포트입니다. 출금 계좌는 승인자가 확정했고, 계정과목(코드)은 회계 담당자가 확인합니다. 송금을 마친 뒤 포탈에서 "송금 처리 완료"로 처리해 주세요.`,
          report, url: `${origin}/expense`, ctaLabel: '회계 업무 열기',
        }));
      await notify(context, [report.submitterEmail],
        `[경비 승인됨] ${formatKrw(report.total)}`,
        reportEmailHtml({ heading: '경비 리포트가 승인되었습니다', intro: '회계 담당자에게 전달되었습니다. 송금이 완료되면 다시 알려드릴게요.', report, url: `${origin}/expense`, ctaLabel: '내 리포트 보기' }), { toSubmitter: true });
    } else {
      await notify(context, [report.submitterEmail],
        `[경비 반려됨] ${formatKrw(report.total)}`,
        reportEmailHtml({
          heading: '경비 리포트가 반려되었습니다',
          intro: `사유: ${note.replace(/</g, '&lt;')}`,
          report, url: `${origin}/expense`, ctaLabel: '내 리포트 보기',
        }), { toSubmitter: true });
    }
    return Response.json({ ok: true, report: withAccountNumbers(report, session) }, { headers: CORS });
  }

  // 회계 담당: 승인·송금 단계의 리포트에서 카테고리(코드)만 마지막으로 고칠 수 있다. 금액·품목 등 내용은 고정.
  if (action === 'recategorize') {
    if (!session.isAccountant) return err('회계 담당자만 카테고리를 수정할 수 있습니다.', 403);
    if (report.status !== 'approved' && report.status !== 'processed') return err('승인된 리포트만 카테고리를 수정할 수 있습니다.', 409);
    const cats = Array.isArray(body.categories) ? body.categories : [];
    if (cats.length !== report.rows.length || cats.some(c => !canonAccount(c))) return err('모든 항목의 카테고리(계정과목)를 선택해 주세요.');
    // 출금 계좌: 회계 담당자가 마지막에 확인하면서 바꿀 수 있다(예전에 승인되어 비어 있던 항목은 채운다). 바꾼 기록은 항목에 남는다.
    const wds = Array.isArray(body.withdrawals) && body.withdrawals.length === report.rows.length ? body.withdrawals : [];
    if (wds.some(w => w && !isWithdrawId(w))) return err('출금 계좌를 확인해 주세요.');
    let changed = 0;
    report.rows.forEach((row, i) => {
      const next = canonAccount(cats[i]);
      if (row.account === next) return;
      if (canonAccount(row.account) === next) { row.account = next; return; }   // 예전 이름을 새 이름으로 읽는 것뿐이면 변경 기록을 남기지 않는다
      row.categoryHistory = [...(row.categoryHistory || []), { from: row.account || '', to: next, by: session.email, at: now }];
      if (row.account) row.categoryChanged = true;
      row.account = next;
      changed++;
    });
    let wdSet = 0;
    report.rows.forEach((row, i) => {
      if (!wds[i] || row.withdrawAccount === wds[i]) return;
      if (row.withdrawAccount) {
        row.withdrawHistory = [...(row.withdrawHistory || []), { from: row.withdrawAccount, to: wds[i], by: session.email, at: now }];
        row.withdrawChanged = true;
      } else row.withdrawSetBy = session.email;
      row.withdrawAccount = wds[i]; wdSet++;
    });
    let confirmedNow = false;
    if (report.rows.every(r => canonAccount(r.account))) {
      confirmedNow = report.categoriesConfirmedBy !== session.email || report.rows.some(r => r.accountSuggested);
      report.categoryDelegated = false;
      report.categoriesConfirmedBy = session.email;
      report.categoriesConfirmedAt = now;
      report.rows.forEach(r => { delete r.accountSuggested; });
    }
    // 회계 노트(항목별) — 송금 처리 전(승인 상태)에만 남기거나 고칠 수 있다
    let noted = 0;
    if (report.status === 'approved' && Array.isArray(body.accountantMemos)) {
      report.rows.forEach((row, i) => {
        const m = clip(body.accountantMemos[i], 300);
        if ((row.accountantMemo || '') === m) return;
        if (m) { row.accountantMemo = m; row.accountantMemoBy = session.email; } else { delete row.accountantMemo; delete row.accountantMemoBy; }
        noted++;
      });
    }
    if (!changed && !noted && !confirmedNow && !wdSet) return Response.json({ ok: true, report: withAccountNumbers(report, session), changed, noted, withdrawSet: 0 }, { headers: CORS });
    report.log.push({ at: now, by: session.email, action: 'recategorize', note: `${changed}개 항목` + (noted ? `, 노트 ${noted}개` : '') + (wdSet ? `, 출금 계좌 ${wdSet}개` : '') });
    await env.CAMP_KV.put(reportKey(id), JSON.stringify(report));
    return Response.json({ ok: true, report: withAccountNumbers(report, session), changed, noted, withdrawSet: wdSet }, { headers: CORS });
  }

  if (action === 'process') {
    if (!session.isAccountant) return err('회계 담당자만 처리할 수 있습니다.', 403);
    if (report.status !== 'approved') return err('승인된 리포트만 송금 처리할 수 있습니다.', 409);
    if (report.rows.some(r => !canonAccount(r.account))) {
      return err('모든 항목의 계정과목(코드)을 선택·저장한 뒤 송금 처리할 수 있습니다.', 409);
    }
    report.status = 'processed';
    report.processedBy = session.email;
    report.processedByName = session.name;
    report.processedAt = now;
    report.processNote = clip(body.note, 300);
    report.log.push({ at: now, by: session.email, action: 'process', note: report.processNote });
    await env.CAMP_KV.put(reportKey(id), JSON.stringify(report));
    await notify(context, [report.submitterEmail],
      `[경비 송금 처리 완료] ${formatKrw(report.total)}`,
      reportEmailHtml({ heading: '경비 송금 처리가 완료되었습니다', intro: '승인된 경비 리포트의 송금이 완료되었습니다.', report, url: `${origin}/expense`, ctaLabel: '내 리포트 보기' }), { toSubmitter: true });
    return Response.json({ ok: true, report: withAccountNumbers(report, session) }, { headers: CORS });
  }

  if (action === 'trash') {
    if (!session.isAccountant) return err('회계 담당자만 삭제할 수 있습니다.', 403);
    await trashReport(env, report, session);
    return Response.json({ ok: true }, { headers: CORS });
  }

  return err('알 수 없는 작업입니다.');
}

async function handlePut(context) {
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
  if (report.returnNote) return err('회계 담당자가 되돌려 승인자가 다시 검토 중인 리포트는 수정할 수 없습니다.', 409);

  const cleaned = cleanRows(body.rows);
  if (cleaned.error) return err(cleaned.error);

  const wasRejected = report.status === 'rejected';
  const now = new Date().toISOString();
  Object.assign(report, {
    status: 'submitted',
    description: clip(body.description, 200),
    project: clip(body.project, 160),
    campus: cleanCampus(CAMPUS_OVERRIDES[session.email] || session.campus),
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
      }), { newReport: true });
  }
  return Response.json({ ok: true, report }, { headers: CORS });
}

async function handleDelete(context) {
  const { env, request } = context;
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);

  const id = clip(new URL(request.url).searchParams.get('id'), 80);
  const report = id ? await env.CAMP_KV.get(reportKey(id), 'json') : null;
  if (!report) return err('리포트를 찾을 수 없습니다.', 404);
  if (report.submitterEmail !== session.email) return err('본인 리포트만 철회할 수 있습니다.', 403);
  if (report.returnNote) return err('회계 담당자가 되돌려 승인자가 다시 검토 중인 리포트는 철회할 수 없습니다.', 409);
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

// 쓰기 요청이 끝나면 목록 캐시를 비워 방금 바뀐 내용이 바로 보이게 한다
const withFreshList = fn => async context => { try { return await fn(context); } finally { bustReportCache(); } };
export const onRequestPost = withFreshList(handlePost);
export const onRequestPatch = withFreshList(handlePatch);
export const onRequestPut = withFreshList(handlePut);
export const onRequestDelete = withFreshList(handleDelete);

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
