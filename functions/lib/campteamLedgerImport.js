/**
 * 엑셀(장부) 가져오기: 올린 줄들을 지금 장부와 비교해 "새 줄 / 바뀐 줄 / 파일에서 빠진 줄 / 그대로인 줄"로 나눈다.
 * 엑셀 장부에는 줄마다 고유 번호가 없어서 다음 순서로 같은 줄을 찾는다.
 *   0) 포털에서 내려받은 파일에 들어 있는 "ID" 열 — 가장 정확하다 (엑셀에서 금액을 고쳐도 같은 줄로 인식)
 *   1) 날짜·구분·금액·항목·내용·비고가 완전히 같은 줄 (어느 출처의 거래든 — 직접 입력한 것·경비 리포트에서 온 것과의 중복도 막는다)
 *   2) 엑셀에서 가져왔던 줄 중 같은 줄 번호이면서 날짜·금액·내용 중 하나가 같은 줄
 *   3) 엑셀에서 가져왔던 줄 중 날짜·금액·내용·항목 가운데 둘 이상이 같은 줄 (점수가 높은 것부터)
 * 그 밖의 줄은 새 줄이고, 엑셀에서 가져왔던 줄 중 짝이 없는 것은 "파일에서 빠진 줄"로 알려 준다(자동으로 지우지 않는다).
 */
import { isDate, text } from './campteamDb.js';
import { parseAmount } from './campteamMoney.js';

export const MAX_ROWS = 3000;
const norm = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
export const fp = (r) => [r.entryDate, r.kind, r.amount, norm(r.category), norm(r.description), norm(r.note)].join('|');
const FIELDS = ['entryDate', 'kind', 'amount', 'category', 'description', 'note'];

/** 올라온 줄 검사·정리. periodStart 는 날짜가 비어 있는 줄(예: 처음의 이월금 줄)에 쓸 기본 날짜 */
export function normalizeRows(rows, period) {
  const ok = [], skipped = [];
  let lastDate = null;
  for (const raw of Array.isArray(rows) ? rows.slice(0, MAX_ROWS) : []) {
    const row = Number.isInteger(raw?.row) ? raw.row : null, why = (reason) => skipped.push({ row, reason, raw: { date: raw?.date, kind: raw?.kind, amount: raw?.amount, category: raw?.category, description: raw?.description } });
    const kind = raw.kind === 'income' || raw.kind === 'expense' ? raw.kind : null;
    const amount = parseAmount(raw.amount, 'KRW');
    if (!kind) { why('구분(수입/지출)을 알 수 없어요'); continue; }
    if (amount === null || Number.isNaN(amount) || amount <= 0) { why('금액이 없거나 올바르지 않아요'); continue; }
    const category = text(raw.category, 60); if (!category) { why('항목이 비어 있어요'); continue; }
    let entryDate = raw.date ? String(raw.date).slice(0, 10) : '', guessed = false;
    if (!entryDate) { entryDate = lastDate || period.startDate; guessed = true; }
    else if (!isDate(entryDate)) { why('날짜를 읽을 수 없어요'); continue; }
    if (entryDate < period.startDate || entryDate > period.endDate) { why(`날짜(${entryDate})가 이 기간(${period.startDate} ~ ${period.endDate}) 밖이에요`); continue; }
    lastDate = entryDate;
    ok.push({ row, id: typeof raw.id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(raw.id) ? raw.id : null, entryDate, kind, amount, category, description: text(raw.description, 200), note: text(raw.note, 300), dateGuessed: guessed });
  }
  return { ok, skipped };
}

const changedFields = (u, e) => FIELDS.filter((f) => (f === 'amount' ? u.amount !== e.amount : norm(u[f]) !== norm(e[f])));

/**
 * U: 정리된 올린 줄들, existing: 이 기간의 지금 거래들(이월금 줄 제외, 삭제 안 된 것)
 * 돌려주는 값: { unchanged, added, changed, missing, idMissing }
 */
export function diffRows(U, existing) {
  const usedE = new Set(), pair = new Map(), skip = new Set(); // pair: u 인덱스 → { e, how }
  const byId = new Map(existing.filter((e) => e.source !== 'carry').map((e) => [e.id, e])); // 이월금 줄은 ID 로 찾지 않는다(내려받은 파일에도 ID 를 넣지 않음)
  const unchanged = [], changed = [], added = [], idMissing = [];
  // 0) ID — 이 기간에 있는 줄이면 그 줄, 없으면(지운 줄·다른 기간 줄) 따로 알려 주고 새 줄로 만들지 않는다
  U.forEach((u, i) => {
    if (!u.id) return;
    const e = byId.get(u.id);
    if (e && !usedE.has(e.id)) { usedE.add(e.id); pair.set(i, { e, how: 'id' }); } else { idMissing.push(u); skip.add(i); }
  });
  // 1) 완전히 같은 줄 (출처가 달라도 같으면 같은 줄 — 직접 입력·경비 리포트에서 온 줄과의 중복을 막는다)
  const byFp = new Map(); for (const e of existing) { if (usedE.has(e.id)) continue; const k = fp(e); (byFp.get(k) || byFp.set(k, []).get(k)).push(e); }
  U.forEach((u, i) => { if (pair.has(i) || skip.has(i)) return; const list = byFp.get(fp(u)); if (list && list.length) { const e = list.shift(); usedE.add(e.id); pair.set(i, { e, how: 'same' }); } });
  // 2) 엑셀에서 가져온 줄끼리: 같은 줄 번호 + 날짜·금액·내용 중 하나가 같음
  const sim = (u, e) => (u.entryDate === e.entryDate ? 1 : 0) + (u.amount === e.amount ? 1 : 0) + (norm(u.description) && norm(u.description) === norm(e.description) ? 1 : 0) + (u.category === e.category ? 1 : 0);
  const freeExcel = () => existing.filter((e) => e.source === 'excel' && !usedE.has(e.id));
  U.forEach((u, i) => {
    if (pair.has(i) || skip.has(i)) return;
    const e = freeExcel().find((x) => x.srcRow != null && x.srcRow === u.row && (x.entryDate === u.entryDate || x.amount === u.amount || (norm(u.description) && norm(x.description) === norm(u.description))));
    if (e) { usedE.add(e.id); pair.set(i, { e, how: 'row' }); }
  });
  // 3) 점수 2 이상 (높은 것부터, 줄 번호가 가까운 것 우선)
  const cand = []; U.forEach((u, i) => { if (pair.has(i) || skip.has(i)) return; for (const e of freeExcel()) { const sc = sim(u, e); if (sc >= 2) cand.push({ i, e, sc, d: Math.abs((u.row ?? 0) - (e.srcRow ?? 0)) }); } });
  cand.sort((a, b) => b.sc - a.sc || a.d - b.d);
  for (const c of cand) if (!pair.has(c.i) && !usedE.has(c.e.id)) { usedE.add(c.e.id); pair.set(c.i, { e: c.e, how: 'similar' }); }
  // 결과 나누기
  U.forEach((u, i) => {
    if (skip.has(i)) return;
    const p = pair.get(i);
    if (!p) { added.push(u); return; }
    const fields = changedFields(u, p.e);
    if (!fields.length) unchanged.push({ row: u, id: p.e.id, srcRow: p.e.srcRow, source: p.e.source });
    else changed.push({ row: u, id: p.e.id, how: p.how, fields, before: pick(p.e), after: pick(u), source: p.e.source, conflict: !!p.e.editedLocal });
  });
  const missing = existing.filter((e) => e.source === 'excel' && !usedE.has(e.id)).map((e) => ({ id: e.id, ...pick(e), srcRow: e.srcRow, editedLocal: !!e.editedLocal }));
  return { unchanged, added, changed, missing, idMissing };
}
const pick = (e) => ({ entryDate: e.entryDate, kind: e.kind, amount: e.amount, category: e.category, description: e.description, note: e.note });
