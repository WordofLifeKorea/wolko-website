import { moneyGate, getPeriod, periodTotals, applyCarry, json, badRequest } from '../../lib/campteamLedger.js';
import { uuid, nowIso, text, isDate, audit } from '../../lib/campteamDb.js';

/**
 * 장부 기간. 디렉터(또는 캠프 재정 담당)가 시작·끝 날짜를 정하고, 마감하면 잠기며 남은 금액이 다음 기간의 "이월금"으로 넘어간다.
 *  GET            목록 (금액 조회 권한자)
 *  POST           { name, startDate, endDate } 만들기 · { action:'close', id, nextPeriodId | next:{name,startDate,endDate} | noCarry:true } 마감 · { action:'reopen', id } 다시 열기
 *  PATCH ?id=     이름·날짜·메모 (열려 있는 기간만)
 *  DELETE ?id=    열려 있고 거래가 없는 기간만
 */
export async function onRequestGet({ env, request }) {
  const { res } = await moneyGate(env, request, 'read'); if (res) return res;
  const rows = (await env.DB.prepare(`SELECT id, name, startDate, endDate, status, currency, closingBalance, closedAt, closedBy, carryPeriodId, note, isTest FROM ledger_periods WHERE deletedAt IS NULL ORDER BY startDate DESC`).all()).results;
  const out = [];
  for (const p of rows) out.push({ ...p, ...(await periodTotals(env, p.id)) });
  return json({ periods: out });
}

async function overlaps(env, start, end, exceptId) {
  return env.DB.prepare('SELECT name FROM ledger_periods WHERE deletedAt IS NULL AND id <> ?3 AND startDate <= ?2 AND endDate >= ?1').bind(start, end, exceptId || '').first();
}
function cleanDates(b, base = {}) {
  const startDate = 'startDate' in b ? b.startDate : base.startDate, endDate = 'endDate' in b ? b.endDate : base.endDate;
  if (!isDate(startDate) || !isDate(endDate)) return { error: '시작일과 끝나는 날을 YYYY-MM-DD 형식으로 입력해 주세요.' };
  if (startDate > endDate) return { error: '끝나는 날이 시작일보다 빠를 수 없어요.' };
  return { startDate, endDate };
}
async function create(env, s, b) {
  const name = text(b.name, 60); if (!name) return { error: '기간 이름을 입력해 주세요. (예: 2027 상반기)' };
  const d = cleanDates(b); if (d.error) return d;
  const clash = await overlaps(env, d.startDate, d.endDate); if (clash) return { error: `「${clash.name}」 기간과 날짜가 겹쳐요.`, status: 409 };
  const id = uuid(), now = nowIso();
  await env.DB.prepare(`INSERT INTO ledger_periods (id,name,startDate,endDate,status,currency,note,createdAt,updatedAt,createdBy) VALUES (?1,?2,?3,?4,'open','KRW',?5,?6,?6,?7)`).bind(id, name, d.startDate, d.endDate, text(b.note, 300), now, s.email).run();
  await audit(env, s.email, 'create', 'ledger_period', id, `${name} ${d.startDate}~${d.endDate}`);
  return { id };
}

export async function onRequestPost({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'admin'); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  if (!b.action) { const r = await create(env, s, b); return r.error ? json({ error: r.error }, r.status || 400) : json({ id: r.id }, 201); }

  const p = await getPeriod(env, b.id); if (!p) return json({ error: '기간을 찾을 수 없습니다.' }, 404);
  if (b.action === 'close') {
    if (p.status === 'closed') return json({ error: '이미 마감된 기간이에요.' }, 409);
    let next = null;
    if (b.nextPeriodId) next = await getPeriod(env, b.nextPeriodId);
    else if (b.next) { const r = await create(env, s, b.next); if (r.error) return json({ error: '다음 기간: ' + r.error }, r.status || 400); next = await getPeriod(env, r.id); }
    else if (!b.noCarry) return badRequest('남은 금액을 넘길 다음 기간을 고르거나 새로 만들어 주세요. (넘기지 않으려면 "넘기지 않음"을 선택)');
    if (b.nextPeriodId && !next) return badRequest('다음 기간을 찾을 수 없습니다.');
    if (next) {
      if (next.id === p.id) return badRequest('같은 기간으로 넘길 수 없어요.');
      if (next.status !== 'open') return json({ error: '다음 기간이 이미 마감되어 있어요.' }, 409);
      if (next.startDate <= p.endDate) return badRequest('다음 기간은 이 기간이 끝난 뒤에 시작해야 해요.');
    }
    const totals = await periodTotals(env, p.id), now = nowIso();
    await env.DB.prepare(`UPDATE ledger_periods SET status='closed', closingBalance=?2, closedAt=?3, closedBy=?4, carryPeriodId=?5, updatedAt=?3 WHERE id=?1`).bind(p.id, totals.balance, now, s.email, next ? next.id : null).run();
    if (next) await applyCarry(env, p, next, totals.balance, s.email);
    await audit(env, s.email, 'close', 'ledger_period', p.id, `잔액 ${totals.balance}${next ? ' → ' + next.name : ' (넘기지 않음)'}`);
    return json({ ok: true, closingBalance: totals.balance, nextPeriodId: next ? next.id : null });
  }
  if (b.action === 'reopen') {
    if (p.status !== 'closed') return json({ error: '마감된 기간만 다시 열 수 있어요.' }, 409);
    let next = null;
    if (p.carryPeriodId) { next = await getPeriod(env, p.carryPeriodId); if (next && next.status !== 'open') return json({ error: `다음 기간 「${next.name}」이 마감되어 있어요. 그 기간부터 먼저 다시 열어 주세요.` }, 409); }
    if (next) await applyCarry(env, p, next, 0, s.email);   // 넘어간 이월금 줄을 거둔다(다시 마감하면 새 금액으로 다시 생긴다)
    await env.DB.prepare(`UPDATE ledger_periods SET status='open', closingBalance=NULL, closedAt=NULL, closedBy=NULL, carryPeriodId=NULL, updatedAt=?2 WHERE id=?1`).bind(p.id, nowIso()).run();
    await audit(env, s.email, 'reopen', 'ledger_period', p.id, p.name);
    return json({ ok: true });
  }
  return badRequest('알 수 없는 작업이에요.');
}

export async function onRequestPatch({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'admin'); if (res) return res;
  const id = new URL(request.url).searchParams.get('id');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const p = await getPeriod(env, id); if (!p) return json({ error: '기간을 찾을 수 없습니다.' }, 404);
  if (p.status === 'closed') return json({ error: '마감된 기간은 고칠 수 없어요. 먼저 다시 열어 주세요.' }, 409);
  const name = 'name' in b ? text(b.name, 60) : p.name; if (!name) return badRequest('기간 이름을 입력해 주세요.');
  const d = cleanDates(b, p); if (d.error) return badRequest(d.error);
  const clash = await overlaps(env, d.startDate, d.endDate, p.id); if (clash) return json({ error: `「${clash.name}」 기간과 날짜가 겹쳐요.` }, 409);
  const out = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ledger_entries WHERE periodId = ?1 AND deletedAt IS NULL AND source <> 'carry' AND (entryDate < ?2 OR entryDate > ?3)`).bind(p.id, d.startDate, d.endDate).first();
  if (out.n) return json({ error: `바꾸려는 날짜 밖에 있는 거래가 ${out.n}건 있어요. 거래 날짜를 먼저 확인해 주세요.` }, 409);
  await env.DB.prepare('UPDATE ledger_periods SET name=?2, startDate=?3, endDate=?4, note=?5, updatedAt=?6 WHERE id=?1').bind(p.id, name, d.startDate, d.endDate, 'note' in b ? text(b.note, 300) : p.note, nowIso()).run();
  await audit(env, s.email, 'update', 'ledger_period', p.id, `${name} ${d.startDate}~${d.endDate}`);
  return json({ ok: true });
}

export async function onRequestDelete({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'admin'); if (res) return res;
  const p = await getPeriod(env, new URL(request.url).searchParams.get('id')); if (!p) return json({ error: '기간을 찾을 수 없습니다.' }, 404);
  if (p.status === 'closed') return json({ error: '마감된 기간은 지울 수 없어요.' }, 409);
  const from = await env.DB.prepare(`SELECT name FROM ledger_periods WHERE carryPeriodId = ?1 AND deletedAt IS NULL`).bind(p.id).first();
  if (from) return json({ error: `「${from.name}」에서 넘어온 이월금이 있어요. 그 기간을 다시 열어야 지울 수 있어요.` }, 409);
  const n = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ledger_entries WHERE periodId = ?1 AND deletedAt IS NULL`).bind(p.id).first()).n;
  if (n) return json({ error: `거래가 ${n}건 있어서 지울 수 없어요.` }, 409);
  await env.DB.prepare('UPDATE ledger_periods SET deletedAt = ?2 WHERE id = ?1').bind(p.id, nowIso()).run();
  await audit(env, s.email, 'delete', 'ledger_period', p.id, p.name);
  return json({ ok: true });
}
