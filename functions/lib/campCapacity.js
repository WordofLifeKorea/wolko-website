/**
 * 캠프 정원 — 서버가 캠프 일정 데이터에서 직접 정한다.
 *  - 기준은 src/content/camp_schedules/<campId>.json 의 capacity (스키마 기본값 40).
 *  - 빌드 때 같은 콘텐츠에서 만든 /camp-schedules.json 을 ASSETS 로 읽는다(gospelCamps.js 와 같은 방식).
 *    CMS 로 새 캠프를 추가해도 다음 배포 때 자동으로 따라오고, 신청 페이지가 보여 주는 정원과 항상 같다.
 *  - 신청 요청 본문에 들어 있는 capacity 는 믿지 않는다(직접 요청을 보내 정원·예비 검사를 건너뛸 수 있으므로).
 */
export const DEFAULT_CAMP_CAPACITY = 40;            // src/content/config.ts 의 capacity 기본값과 같다
const CACHE_MS = 300000;

let cache = { at: 0, map: null };

/** /camp-schedules.json → Map(campId → 정원). 읽지 못하면 null (실패는 캐시하지 않는다). */
async function loadCapacities(env, request) {
  if (cache.map && Date.now() - cache.at < CACHE_MS) return cache.map;
  try {
    if (!env?.ASSETS?.fetch) return null;
    const res = await env.ASSETS.fetch(new Request(new URL('/camp-schedules.json', request.url)));
    if (!res.ok) return null;
    const list = await res.json();
    if (!Array.isArray(list)) return null;
    const map = new Map();
    for (const c of list) {
      if (!c || typeof c.id !== 'string' || !c.id) continue;
      map.set(c.id, Math.max(parseInt(c.capacity, 10) || DEFAULT_CAMP_CAPACITY, 1));
    }
    cache = { at: Date.now(), map };
    return map;
  } catch { return null; }
}

/**
 * campId 의 정원.
 *  - { ok: true, capacity }
 *  - { ok: false, reason: 'unknown-camp' } — 캠프 일정에 없는 campId. 40 으로 받아 주지 않고 거절한다:
 *    신청 페이지는 같은 캠프 일정에서 만든 campId 만 보내므로 없는 campId 는 위조된 요청이고,
 *    받아 주면 아무 이름의 KV 키(camp:<campId>:…)가 생긴다.
 *  - { ok: false, reason: 'unavailable' } — 일정 파일을 읽지 못함. 40 으로 짐작하면 정원 70 인 캠프는 41번째부터
 *    잘못 예비가 되고 정원 14 인 캠프는 넘치게 받으므로, 짐작하지 않고 잠시 후 다시 시도하게 한다.
 */
export async function campCapacityFor(env, request, campId) {
  const map = await loadCapacities(env, request);
  if (!map) return { ok: false, reason: 'unavailable' };
  if (!map.has(String(campId))) return { ok: false, reason: 'unknown-camp' };
  return { ok: true, capacity: map.get(String(campId)) };
}

export const resetCampCapacityCache = () => { cache = { at: 0, map: null }; };
