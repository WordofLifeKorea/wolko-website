/**
 * 홈페이지 "월코와 함께 협력하는 교회" — CRS 교회 중 진행 단계를 1개 이상 마친 교회의 이름만 공개한다.
 * 이름 말고는 아무것도(연락처·목사님·방문 기록·단계 수 등) 꺼내지 않는다.
 */
import { CRS_DATABASE, doneSteps } from './portalDashboard.js';
import { firebaseDatabaseToken } from './firebaseCrsDatabase.js';

export const PARTNER_CHURCH_KEY = 'public:partner-churches';
export const PARTNER_CHURCH_SECONDS = 3600;

const cleanName = v => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, 120);   // 영문 병기 이름(예: "…교회 (Global … Church)")이 중간에서 잘리지 않을 만큼

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

/** 저장해 둔 목록이 있으면 그것을, 없으면 CRS 에서 읽어 저장한다. CRS 연결이 없으면 null */
export async function loadPartnerChurches(env) {
  const cached = await env.CAMP_KV.get(PARTNER_CHURCH_KEY, 'json');
  if (cached && Array.isArray(cached.names)) return cached.names;
  if (!env.FIREBASE_CRS_SERVICE_ACCOUNT) return null;
  const token = await firebaseDatabaseToken(env.FIREBASE_CRS_SERVICE_ACCOUNT);
  const res = await fetch(`${CRS_DATABASE}/churches.json`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`CRS ${res.status}`);
  const names = partnerChurchNames(await res.json());
  await env.CAMP_KV.put(PARTNER_CHURCH_KEY, JSON.stringify({ names }), { expirationTtl: PARTNER_CHURCH_SECONDS });
  return names;
}
