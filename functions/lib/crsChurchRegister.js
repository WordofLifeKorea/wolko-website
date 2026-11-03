/**
 * 복음 통계 "교회 행사 기록"에 적은 교회 중 CRS 에 없는 교회를 CRS 에 새 교회로 등록한다.
 *   - 보고서에서 CRS 목록으로 고른 교회는 churchId 가 있다 → 건드리지 않는다.
 *   - 직접 적은 교회(churchId 없음)는 저장할 때 CRS(Firebase churches)를 다시 읽어,
 *     이름이 같은 교회(띄어쓰기·대소문자 무시)가 있으면 그 교회로 잇고, 없으면 새로 만든다.
 *   - 새 교회는 CRS 화면에서 "교회 추가"로 만든 것과 같은 모양으로 저장한다(src/pages/portal/crs 의 saveChurch).
 *     번호는 평택·제주 각각 이어서 붙고, 제주 보고에서 온 교회는 지역을 제주특별자치도로 둔다.
 *     메모에 어디서 왔는지 적어 두어, CRS 담당자가 주소·담임목사 등을 채울 수 있게 한다.
 *   - CRS 연결이 없거나 실패해도 보고 저장은 그대로 한다(교회는 이름만 남는다).
 */
import { firebaseDatabaseToken } from './firebaseCrsDatabase.js';

export const CRS_DATABASE = 'https://wolko-crs-default-rtdb.asia-southeast1.firebasedatabase.app';
/** 복음 통계 교회 목록 캐시(gospel-churches) — 새 교회를 만들면 지워서 바로 목록에 보이게 한다 */
export const CHURCH_CACHE_KEY = 'gospel:crs-churches';
/** CRS 화면의 STEPS_VERSION 과 같아야 한다 */
export const CRS_STEPS_VERSION = 3;

const nameKey = name => String(name || '').normalize('NFKC').toLowerCase().replace(/\s+/g, '');
const churchCampus = c => (/제주|jeju/i.test(String(c?.region || '')) ? 'jeju' : 'wolko');

export async function registerNewChurches(env, entries, { location, month, fetchImpl = fetch, getToken = firebaseDatabaseToken, now = Date.now() } = {}) {
  const list = Array.isArray(entries) ? entries.map(e => ({ ...e })) : [];
  const missing = list.filter(e => !e.churchId && nameKey(e.churchName));
  if (!missing.length || !env.FIREBASE_CRS_SERVICE_ACCOUNT) return { entries: list, created: [] };
  try {
    const token = await getToken(env.FIREBASE_CRS_SERVICE_ACCOUNT);
    const auth = { Authorization: `Bearer ${token}` };
    const res = await fetchImpl(`${CRS_DATABASE}/churches.json`, { headers: auth });
    if (!res.ok) throw new Error(`CRS read ${res.status}`);
    const all = (await res.json()) || {};
    const byName = new Map();
    for (const [id, c] of Object.entries(all)) { const k = nameKey(c?.churchName); if (k && !byName.has(k)) byName.set(k, id); }
    const campus = location === 'jeju' ? 'jeju' : 'wolko';
    let number = Object.values(all).filter(c => churchCampus(c) === campus).reduce((max, c) => Math.max(max, Number(c?.number) || 0), 0);
    const created = [];
    for (const e of missing) {
      const k = nameKey(e.churchName);
      let id = byName.get(k);
      if (!id) {
        const data = {
          churchName: e.churchName, pastorName: '', pastorPhone: '', website: '', denomination: '', assignedMissionary: '',
          region: campus === 'jeju' ? '제주특별자치도' : '', district: '', detailAddress: '', location: '',
          notes: `복음 통계 보고(${month}) 교회 행사 기록에서 자동으로 등록했어요${e.event ? ` — 행사: ${e.event}` : ''}. 주소·담임목사 등을 채워 주세요.`,
          steps: {}, stepsVersion: CRS_STEPS_VERSION, number: ++number,
          createdAt: now, createdBy: 'gospel-stats', updatedAt: now, updatedBy: 'gospel-stats', source: 'gospel-stats',
        };
        const put = await fetchImpl(`${CRS_DATABASE}/churches.json`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!put.ok) throw new Error(`CRS create ${put.status}`);
        id = (await put.json())?.name;
        if (!id) throw new Error('CRS create: no id');
        byName.set(k, id);
        created.push({ id, churchName: e.churchName });
      }
      e.churchId = id;
    }
    if (created.length) await env.CAMP_KV.delete(CHURCH_CACHE_KEY);
    return { entries: list, created };
  } catch (error) {
    console.error('CRS church register failed:', error.message);
    return { entries: Array.isArray(entries) ? entries : [], created: [] };
  }
}
