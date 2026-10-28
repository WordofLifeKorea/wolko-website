/**
 * 홈페이지 "월코와 함께 협력하는 교회" — CRS 교회 중 진행 단계를 1개 이상 마친 교회의 이름과 지역(시/군/구, 없으면 시/도)만 공개한다.
 * 그 밖의 것(연락처·목사님·주소·방문 기록·단계 수 등)은 아무것도 꺼내지 않는다.
 */
import { CRS_DATABASE, doneSteps } from './portalDashboard.js';
import { firebaseDatabaseToken } from './firebaseCrsDatabase.js';

export const PARTNER_CHURCH_KEY = 'public:partner-churches';
export const PARTNER_CHURCH_SECONDS = 3600;

const cleanName = v => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);

/** CRS churches 레코드 → 이름 목록(진행 단계가 있는 교회만, 중복 없이, 가나다순 · 영문은 뒤) */
export function partnerChurchNames(records) {
  const names = new Set();
  for (const church of Object.values(records || {})) {
    const name = cleanName(church?.churchName);
    if (name && doneSteps(church).length > 0) names.add(name);
  }
  const latin = n => (/^[A-Za-z]/.test(n) ? 1 : 0);   // 한글 이름이 먼저, 영문 이름은 뒤 (실행 환경과 상관없이 같은 순서)
  return [...names].sort((a, b) => latin(a) - latin(b) || a.localeCompare(b, 'ko'));
}

/** 지역 이름을 짧게 다듬는다 — 시/군/구가 있으면 그것, 없으면 시/도 ('경기도' → '경기') */
const cleanArea = v => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 20);
const shortProvince = v => cleanArea(v).replace(/(특별자치도|특별자치시|특별시|광역시|도)$/, '');

/** 이름 → 지역 (같은 이름이 여럿이면 지역이 있는 첫 번째). 지역을 모르는 교회는 빠진다 */
export function partnerChurchAreas(records) {
  const areas = {};
  for (const church of Object.values(records || {})) {
    const name = cleanName(church?.churchName);
    if (!name || doneSteps(church).length === 0 || areas[name]) continue;
    const area = cleanArea(church?.district) || shortProvince(church?.region);
    if (area) areas[name] = area;
  }
  return areas;
}

/** 저장해 둔 이름·지역이 있으면 그것을, 없으면 CRS 에서 읽어 저장한다. CRS 연결이 없으면 null */
export async function loadPartnerChurchData(env) {
  const cached = await env.CAMP_KV.get(PARTNER_CHURCH_KEY, 'json');
  if (cached && Array.isArray(cached.names) && cached.areas && typeof cached.areas === 'object') return { names: cached.names, areas: cached.areas };
  if (cached && Array.isArray(cached.names) && !env.FIREBASE_CRS_SERVICE_ACCOUNT) return { names: cached.names };   // 예전에 저장된 이름만 있는 목록
  if (!env.FIREBASE_CRS_SERVICE_ACCOUNT) return null;
  const token = await firebaseDatabaseToken(env.FIREBASE_CRS_SERVICE_ACCOUNT);
  const res = await fetch(`${CRS_DATABASE}/churches.json`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`CRS ${res.status}`);
  const records = await res.json();
  const data = { names: partnerChurchNames(records), areas: partnerChurchAreas(records) };
  await env.CAMP_KV.put(PARTNER_CHURCH_KEY, JSON.stringify(data), { expirationTtl: PARTNER_CHURCH_SECONDS });
  return data;
}

/** 이름만 필요한 곳용 — 저장해 둔 목록이 있으면 그것을, 없으면 CRS 에서 읽는다. CRS 연결이 없으면 null */
export async function loadPartnerChurches(env) {
  const data = await loadPartnerChurchData(env);
  return data ? data.names : null;
}
