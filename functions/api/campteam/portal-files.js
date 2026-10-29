import { campSession, json, needLogin, noDb, denyView } from '../../lib/campteamAuth.js';
import { DEFAULT_TEACH_FOLDERS } from '../../lib/teachFolders.js'; // 포털 기본 폴더 이름(상수만 가져온다)

/**
 * 월코 포털 「캠프 자료실」 자료를 캠프팀 자료실에서 찾고 열 수 있게 **읽기만** 한다 (한 방향: 캠프팀 자료는 포털에 나가지 않는다).
 * 원래 포털 자료는 D1 이 아니라 공용 저장소(CAMP_KV)의 `teach:data:v1`(자료 목록)·`teach:camps:v1`(캠프 목록)에 있다.
 * 여기서는 그 두 값을 읽기(get)만 하고, 포털의 코드·데이터는 바꾸지 않는다. 포털의 /api/teach/data 는 호출하지 않는다(그 길은 썸네일을 저장한다).
 *
 * GET ?q= &limit= &offset=   →  { items, total, camps, teamOrder }  (최신 순; 한 번에 최대 2000개 = 포털 한도)
 *   camps: 포털의 캠프 목록, teamOrder: 캠프별 팀(폴더) 이름 순서 — 화면이 캠프 → 형식(탭) → 팀 순으로 나눠 보여 주는 데 쓴다
 *   캠프팀 명단에 있는 사람만 볼 수 있다(명단 밖 월코 팀원은 빈 목록). 업로더 이메일은 내려주지 않고 이름만 준다.
 *   파일 열기: 포털이 정한 주소(https)로 그대로 연결한다 — 보관 파일은 /api/teach/file/<키>, 아니면 외부 링크.
 */
const TABS = { teacher: ['수업자료', 'Class Materials'], program: ['프로그램팀', 'Program Team'], counselor: ['상담자', 'Counselors'], preacher: ['설교자', 'Preachers'], general: ['일반 자료', 'General Files'] };
const str = (v, n = 200) => String(v ?? '').trim().slice(0, n);
const https = (u) => { try { return new URL(String(u)).protocol === 'https:' ? String(u) : ''; } catch { return ''; } };
// 옛 자료는 tab 이 없다 — 포털과 같은 기준(팀·사람이 있으면 수업자료)으로 읽는다
const tabOf = (it) => (it.team || it.person ? 'teacher' : (TABS[it.tab] ? it.tab : 'general'));

const campName = (c) => (c ? [c.year, c.season === 'winter' ? 'Winter' : c.season === 'summer' ? 'Summer' : '', str(c.name, 80)].filter(Boolean).join(' ') : '');
/** 포털의 캠프 목록(분류 기준) — 최신 연도 먼저, 같은 해에는 겨울 → 여름 */
export function mapPortalCamps(campsData) {
  return (Array.isArray(campsData && campsData.camps) ? campsData.camps : []).filter((c) => c && c.id)
    .map((c) => ({ id: str(c.id, 80), name: campName(c), year: Number(c.year) || 0, season: str(c.season, 10) }))
    .sort((a, b) => b.year - a.year || (a.season === b.season ? a.name.localeCompare(b.name) : a.season === 'winter' ? -1 : 1));
}
/** 포털의 팀(폴더) 이름 순서 — 캠프마다 기본 폴더 + 직접 만든 폴더. 항목에 있는 이름은 클라이언트가 뒤에 덧붙인다 */
export function mapPortalTeamOrder(foldersData, campsData) {
  const removed = Array.isArray(foldersData && foldersData.removedDefaults) ? foldersData.removedDefaults : [], custom = Array.isArray(foldersData && foldersData.folders) ? foldersData.folders : [], out = {};
  for (const c of mapPortalCamps(campsData)) {
    out[c.id] = [...DEFAULT_TEACH_FOLDERS.filter((n) => !removed.some((r) => String(r.campId) === c.id && r.name === n)), ...custom.filter((f) => String(f.campId) === c.id).map((f) => str(f.name, 60))].filter((n, i, a) => n && a.indexOf(n) === i);
  }
  return out;
}
export function mapPortalItems(data, campsData) {
  const camps = new Map((Array.isArray(campsData && campsData.camps) ? campsData.camps : []).map((c) => [String(c.id), c]));
  return (Array.isArray(data && data.items) ? data.items : []).map((it) => {
    const tab = tabOf(it || {}), openUrl = https(it.archiveUrl) || https(it.url);
    if (!it || !it.id || !openUrl) return null;
    return { id: 'portal:' + str(it.id, 80), source: 'portal', readOnly: true, title: str(it.title, 160) || '(제목 없음)', tab, tabKo: TABS[tab][0], tabEn: TABS[tab][1],
      team: str(it.team, 60), person: str(it.person, 80), uploadedBy: str(it.uploaderName, 80), openUrl, isArchive: !!https(it.archiveUrl),
      campIds: (Array.isArray(it.campIds) ? it.campIds : []).map((id) => str(id, 80)).filter(Boolean),
      camps: (Array.isArray(it.campIds) ? it.campIds : []).map((id) => campName(camps.get(String(id)))).filter(Boolean), createdAt: str(it.createdAt, 40), updatedAt: str(it.updatedAt, 40) };
  }).filter(Boolean);
}
export function searchPortalItems(items, q) {
  const t = str(q, 80).toLowerCase(); if (!t) return items;
  return items.filter((i) => [i.title, i.team, i.person, i.uploadedBy, i.tabKo, i.tabEn, ...i.camps].join(' ').toLowerCase().includes(t));
}

export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'files', '자료실'); if (dv) return dv; }
  if (!s.campRole || !env.CAMP_KV) return json({ items: [], total: 0 }); // 캠프팀 명단에 있는 사람만
  const p = new URL(request.url).searchParams;
  let data = null, camps = null, folders = null;
  try { [data, camps, folders] = await Promise.all([env.CAMP_KV.get('teach:data:v1', 'json'), env.CAMP_KV.get('teach:camps:v1', 'json'), env.CAMP_KV.get('teach:folders:v1', 'json').catch(() => null)]); } catch (e) { console.error('portal-files read failed:', e && e.message); return json({ items: [], total: 0, unavailable: true }); }
  const all = searchPortalItems(mapPortalItems(data, camps), p.get('q')).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const limit = Math.min(Math.max(parseInt(p.get('limit'), 10) || 2000, 1), 2000), offset = Math.max(parseInt(p.get('offset'), 10) || 0, 0);
  return json({ items: all.slice(offset, offset + limit), total: all.length, camps: mapPortalCamps(camps), teamOrder: mapPortalTeamOrder(folders, camps) }); // 분류 정보(캠프·탭·팀 폴더)도 함께 준다
}
