import { campSession, json, needLogin, noDb, denyView } from '../../lib/campteamAuth.js';

/**
 * 월코 포털 「캠프 자료실」 자료를 캠프팀 자료실에서 찾고 열 수 있게 **읽기만** 한다 (한 방향: 캠프팀 자료는 포털에 나가지 않는다).
 * 원래 포털 자료는 D1 이 아니라 공용 저장소(CAMP_KV)의 `teach:data:v1`(자료 목록)·`teach:camps:v1`(캠프 목록)에 있다.
 * 여기서는 그 두 값을 읽기(get)만 하고, 포털의 코드·데이터는 바꾸지 않는다. 포털의 /api/teach/data 는 호출하지 않는다(그 길은 썸네일을 저장한다).
 *
 * GET ?q= &limit= &offset=   →  { items, total }  (최신 순)
 *   캠프팀 명단에 있는 사람만 볼 수 있다(명단 밖 월코 팀원은 빈 목록). 업로더 이메일은 내려주지 않고 이름만 준다.
 *   파일 열기: 포털이 정한 주소(https)로 그대로 연결한다 — 보관 파일은 /api/teach/file/<키>, 아니면 외부 링크.
 */
const TABS = { teacher: ['수업자료', 'Class Materials'], program: ['프로그램팀', 'Program Team'], counselor: ['상담자', 'Counselors'], preacher: ['설교자', 'Preachers'], general: ['일반 자료', 'General Files'] };
const str = (v, n = 200) => String(v ?? '').trim().slice(0, n);
const https = (u) => { try { return new URL(String(u)).protocol === 'https:' ? String(u) : ''; } catch { return ''; } };
// 옛 자료는 tab 이 없다 — 포털과 같은 기준(팀·사람이 있으면 수업자료)으로 읽는다
const tabOf = (it) => (it.team || it.person ? 'teacher' : (TABS[it.tab] ? it.tab : 'general'));

export function mapPortalItems(data, campsData) {
  const camps = new Map((Array.isArray(campsData && campsData.camps) ? campsData.camps : []).map((c) => [String(c.id), c]));
  const campName = (c) => (c ? [c.year, c.season === 'winter' ? 'Winter' : c.season === 'summer' ? 'Summer' : '', str(c.name, 80)].filter(Boolean).join(' ') : '');
  return (Array.isArray(data && data.items) ? data.items : []).map((it) => {
    const tab = tabOf(it || {}), openUrl = https(it.archiveUrl) || https(it.url);
    if (!it || !it.id || !openUrl) return null;
    return { id: 'portal:' + str(it.id, 80), source: 'portal', readOnly: true, title: str(it.title, 160) || '(제목 없음)', tab, tabKo: TABS[tab][0], tabEn: TABS[tab][1],
      team: str(it.team, 60), person: str(it.person, 80), uploadedBy: str(it.uploaderName, 80), openUrl, isArchive: !!https(it.archiveUrl),
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
  let data = null, camps = null;
  try { [data, camps] = await Promise.all([env.CAMP_KV.get('teach:data:v1', 'json'), env.CAMP_KV.get('teach:camps:v1', 'json')]); } catch (e) { console.error('portal-files read failed:', e && e.message); return json({ items: [], total: 0, unavailable: true }); }
  const all = searchPortalItems(mapPortalItems(data, camps), p.get('q')).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const limit = Math.min(Math.max(parseInt(p.get('limit'), 10) || 200, 1), 300), offset = Math.max(parseInt(p.get('offset'), 10) || 0, 0);
  return json({ items: all.slice(offset, offset + limit), total: all.length });
}
