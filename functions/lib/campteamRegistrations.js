/**
 * 기존 신청 시스템의 "신청 인원 숫자"만 읽는 어댑터 (읽기 전용).
 *  - 기존 CAMP_KV 에서 `camp:{캠프ID}:submissions` 한 값만 get 한다. 이름·연락처 같은 개인정보가 들어 있는 `camp:{ID}:reg:*` 는 읽지 않는다.
 *  - put / delete / list 는 절대 호출하지 않는다 (테스트가 확인).
 *  - 기존 신청 코드는 수정하지 않는다. 캠프에 "신청 시스템 캠프 ID"를 적어 둔 캠프만 대상.
 */
const ID = /^[A-Za-z0-9_-]{1,60}$/;
export async function readSubmissionCount(env, regCampId) {
  if (!env.CAMP_KV || typeof env.CAMP_KV.get !== 'function' || !ID.test(String(regCampId || ''))) return null;
  const raw = await env.CAMP_KV.get(`camp:${regCampId}:submissions`);
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : null;
}
