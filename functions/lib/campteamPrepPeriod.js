import { isDate } from './campteamDb.js';

/**
 * 준비기간(캠프 시작 전에 스태프가 먼저 모이는 기간) 규칙 — camps.js / calendar / 신청서가 같이 쓴다.
 *  - prepStart · prepEnd 는 둘 다 있거나 둘 다 없어야 한다. 끝이 시작보다 빠르면 안 된다. 비우면 "준비기간 없음".
 */

/** body(b)에 prepStart/prepEnd 가 있으면 그 값, 없으면 base(기존 행) 값으로 합쳐서 검사한다. 돌려주는 값: { prepStart, prepEnd, touched } 또는 { error } */
export function cleanPrep(b = {}, base = {}) {
  const has = (k) => k in b, touched = has('prepStart') || has('prepEnd');
  const pick = (k) => { const v = has(k) ? b[k] : base[k]; const s = v == null ? '' : String(v).trim(); return s || null; };
  const prepStart = pick('prepStart'), prepEnd = pick('prepEnd');
  if ((prepStart && !isDate(prepStart)) || (prepEnd && !isDate(prepEnd))) return { error: '준비기간 날짜 형식이 올바르지 않아요.' };
  if (!!prepStart !== !!prepEnd) return { error: '준비기간은 시작일과 종료일을 함께 넣거나, 둘 다 비워 주세요.' };
  if (prepStart && prepEnd < prepStart) return { error: '준비기간 종료일이 시작일보다 빨라요.' };
  return { prepStart, prepEnd, touched };
}

/** 캠프 행 → { start, end } 또는 null (준비기간이 없거나 한쪽만 있으면 null) */
export function prepOf(camp) {
  const s = camp && camp.prepStart, e = camp && camp.prepEnd;
  return s && e && isDate(s) && isDate(e) && e >= s ? { start: s, end: e } : null;
}

/** 아직 0039 를 적용하지 않은 DB 에서 나는 오류인지 */
export const isMissingColumn = (e) => /no such column|has no column named/i.test(String(e && e.message));
/** primary() 가 "no such column"(0039 전의 DB)으로 실패하면 fallback() 으로 되돌아간다. 다른 오류는 그대로 던진다. (동기·비동기 오류 모두 잡는다) */
export async function withFallback(primary, fallback) {
  try { return await primary(); } catch (e) { if (!isMissingColumn(e)) throw e; return fallback(); }
}
export const NOT_MIGRATED = '준비기간 저장을 위한 DB 업데이트(0039)가 아직 적용되지 않았어요. 관리자에게 알려 주세요.';

/**
 * 신청서가 보여 줄 준비기간 — 그 신청서가 가리키는 캠프 하나의 { start, end } 만 돌려준다(캠프 이름·메모·연락처 같은 다른 정보는 나가지 않는다).
 *  content.prepCampId 가 있으면 그 캠프, 없으면 신청서의 「캠프 시작 일시」 날짜와 시작일이 같은 캠프(취소 제외). 준비기간이 없거나 칸(0039)이 아직 없으면 null.
 */
export async function prepForForm(env, content) {
  try {
    const id = content && content.prepCampId, day = String((content && content.card && content.card.startDate) || '').slice(0, 10);
    let row = null;
    if (id) row = await env.DB.prepare('SELECT prepStart, prepEnd FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(String(id)).first();
    else if (isDate(day)) row = await env.DB.prepare(`SELECT prepStart, prepEnd FROM camps WHERE deletedAt IS NULL AND status <> 'canceled' AND startDate = ?1 AND prepStart IS NOT NULL AND prepEnd IS NOT NULL ORDER BY createdAt LIMIT 1`).bind(day).first();
    return prepOf(row);
  } catch (e) { if (isMissingColumn(e)) return null; throw e; }
}
