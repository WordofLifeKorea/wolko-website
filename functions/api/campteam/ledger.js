import { moneyGate, getPeriod, closedMsg, entryFields, json, badRequest } from '../../lib/campteamLedger.js';
import { uuid, nowIso, text, audit, likeOf } from '../../lib/campteamDb.js';

/**
 * 거래(실제 수입·지출) 장부.
 *  GET ?periodId=&kind=&category=&q=&month=YYYY-MM  목록 + 줄마다 "그때까지의 잔액" (금액 조회 권한자)
 *  POST / PATCH ?id= / DELETE ?id=                  캠프 재정 담당·디렉터. 마감된 기간은 고칠 수 없다.
 * 이월금(carry) 줄은 기간을 마감할 때만 자동으로 생기고 직접 고치거나 지울 수 없다. 경비 리포트에서 온 줄(expense)은 금액·날짜를 고칠 수 없다.
 */
const COLS = 'id, periodId, entryDate, kind, amount, category, description, note, campId, source, externalKey, srcRow, editedLocal, needsReview, createdBy, updatedBy, updatedAt, isTest';

export async function onRequestGet({ env, request }) {
  const { res } = await moneyGate(env, request, 'read'); if (res) return res;
  const p = new URL(request.url).searchParams, period = await getPeriod(env, p.get('periodId'));
  if (!period) return json({ error: '기간을 찾을 수 없습니다.' }, 404);
  // 잔액은 기간 전체 순서(날짜 → 입력 순서)로 계산한 뒤 필터를 적용한다
  const all = (await env.DB.prepare(`SELECT ${COLS}, createdAt FROM ledger_entries WHERE periodId = ?1 AND deletedAt IS NULL ORDER BY entryDate, createdAt, id`).bind(period.id).all()).results;
  let bal = 0; const rows = all.map((e) => { bal += e.kind === 'income' ? e.amount : -e.amount; const { createdAt, ...rest } = e; return { ...rest, balance: bal }; });
  const kind = p.get('kind'), cat = p.get('category'), q = text(p.get('q'), 60).toLowerCase(), month = p.get('month');
  const items = rows.filter((e) => (!kind || e.kind === kind) && (!cat || e.category === cat) && (!month || e.entryDate.startsWith(month)) && (!q || `${e.description} ${e.note} ${e.category}`.toLowerCase().includes(q)));
  return json({ period: { id: period.id, name: period.name, status: period.status, startDate: period.startDate, endDate: period.endDate }, items, count: items.length, total: rows.length });
}

export async function onRequestPost({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const period = await getPeriod(env, b.periodId); if (!period) return json({ error: '기간을 찾을 수 없습니다.' }, 404);
  if (period.status === 'closed') return json({ error: closedMsg(period) }, 409);
  const f = await entryFields(env, b, {}, period); if (f.error) return badRequest(f.error);
  const id = uuid(), now = nowIso(), v = f.v;
  await env.DB.prepare(`INSERT INTO ledger_entries (id,periodId,entryDate,kind,amount,category,description,note,campId,source,createdAt,updatedAt,createdBy,updatedBy) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,'manual',?10,?10,?11,?11)`)
    .bind(id, period.id, v.entryDate, v.kind, v.amount, v.category, v.description, v.note, v.campId, now, s.email).run();
  await audit(env, s.email, 'create', 'ledger_entry', id, `${v.kind} ${v.category} ${v.amount}`);
  return json({ id }, 201);
}

export async function onRequestPatch({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  const id = new URL(request.url).searchParams.get('id');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const e = await env.DB.prepare('SELECT * FROM ledger_entries WHERE id = ?1 AND deletedAt IS NULL').bind(String(id || '')).first();
  if (!e) return json({ error: '찾을 수 없습니다.' }, 404);
  const period = await getPeriod(env, e.periodId);
  if (period.status === 'closed') return json({ error: closedMsg(period) }, 409);
  if (e.source === 'carry') return json({ error: '이전 기간에서 넘어온 이월금은 직접 고칠 수 없어요. 이전 기간을 다시 열어 마감하면 자동으로 바뀝니다.' }, 409);
  let body = b;
  if (e.source === 'expense') { // 경비 리포트에서 온 줄: 금액·날짜·구분은 리포트가 정한다. 항목·내용·메모만 고칠 수 있다.
    for (const k of ['amount', 'entryDate', 'kind']) if (k in b) return json({ error: '경비 리포트에서 가져온 줄은 금액·날짜를 고칠 수 없어요. 항목·내용·메모만 바꿀 수 있어요.' }, 409);
    body = { category: b.category, description: b.description, note: b.note, campId: b.campId };
    for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];
  }
  const f = await entryFields(env, body, e, period); if (f.error) return badRequest(f.error);
  const v = f.v;
  await env.DB.prepare(`UPDATE ledger_entries SET entryDate=?2, kind=?3, amount=?4, category=?5, description=?6, note=?7, campId=?8, editedLocal=1, needsReview=0, updatedAt=?9, updatedBy=?10 WHERE id=?1`)
    .bind(id, v.entryDate, v.kind, v.amount, v.category, v.description, v.note, v.campId, nowIso(), s.email).run();
  await audit(env, s.email, 'update', 'ledger_entry', id, `${v.kind} ${v.category} ${v.amount}`);
  return json({ ok: true });
}

export async function onRequestDelete({ env, request }) {
  const { s, res } = await moneyGate(env, request, 'write'); if (res) return res;
  const id = new URL(request.url).searchParams.get('id');
  const e = await env.DB.prepare('SELECT * FROM ledger_entries WHERE id = ?1 AND deletedAt IS NULL').bind(String(id || '')).first();
  if (!e) return json({ error: '찾을 수 없습니다.' }, 404);
  const period = await getPeriod(env, e.periodId);
  if (period.status === 'closed') return json({ error: closedMsg(period) }, 409);
  if (e.source === 'carry') return json({ error: '이월금 줄은 지울 수 없어요.' }, 409);
  await env.DB.prepare('UPDATE ledger_entries SET deletedAt = ?2, updatedBy = ?3 WHERE id = ?1').bind(id, nowIso(), s.email).run();
  await audit(env, s.email, 'delete', 'ledger_entry', id, `${e.kind} ${e.category} ${e.amount} ${e.description}`);
  return json({ ok: true });
}
