import { campSession, json, needLogin, needPerm, noDb, canView } from '../../lib/campteamAuth.js';

/**
 * 팀 활동 피드: 캠프팀 팀원(관리자·재정 담당·팀원)이 서로 "방금 올린 파일 확인해줘" 같은 소통을 할 수 있게
 * 최근에 누가 무엇을 바꿨는지 보여준다. 변경 기록(audit_log)에서 업무 자료 관련 항목만 골라 제목을 붙여 준다.
 * 명단에 없는 조회 전용 사용자는 볼 수 없고, 명단·TV 열쇠·홈 배치·시트 연동 같은 관리 기록은 아예 포함하지 않는다.
 * 금액 자료(예산, 금액 파일)는 금액 권한이 있을 때만 나온다.
 */
const FEED = new Set(['task', 'event', 'meeting', 'agenda_item', 'decision', 'file', 'camp', 'camp_type', 'notice', 'glossary', 'checklist_template', 'checklist_item']);
const MONEY = new Set(['budget_line', 'budget_target']);
// 제목을 붙일 수 있는 표 (표 이름·제목 열은 고정 목록 — 사용자 입력이 SQL에 들어가지 않는다)
const TITLE = {
  task: ['tasks', 'title', null], event: ['events', 'title', null], meeting: ['meetings', 'title', null], agenda_item: ['agenda_items', 'topic', null],
  decision: ['decisions', 'textKo', 'textEn'], file: ['files', 'title', null], camp: ['camps', 'nameKo', 'nameEn'], camp_type: ['camp_types', 'nameKo', 'nameEn'],
  notice: ['notices', 'message', null], glossary: ['glossary', 'termKo', 'termEn'],
};
export const isTeamMember = (s) => !!s && !!s.campRole; // 캠프팀 명단에 있는 모든 역할 (월코 재정 담당 포함)
const AREA = { task: 'tasks', event: 'calendar', checklist_template: 'tasks', checklist_item: 'tasks', meeting: 'meetings', agenda_item: 'meetings', decision: 'meetings', glossary: 'meetings', file: 'files', camp: 'camps', camp_type: 'camps', notice: 'camps' };

export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!isTeamMember(s)) return needPerm('캠프팀 팀원만 볼 수 있습니다.');
  const raw = (await env.DB.prepare(`SELECT at, actor, action, entity, entityId, detail FROM audit_log ORDER BY at DESC LIMIT 120`).all()).results;
  const rows = raw.filter((r) => (FEED.has(r.entity) && canView(s.perms, AREA[r.entity])) || (MONEY.has(r.entity) && s.perms.moneyRead)).slice(0, 40);
  const titles = {};
  for (const [entity, [table, c1, c2]] of Object.entries(TITLE)) {
    const ids = [...new Set(rows.filter((r) => r.entity === entity).map((r) => r.entityId))].slice(0, 40);
    if (!ids.length) continue;
    const marks = ids.map((_, i) => '?' + (i + 1)).join(',');
    const restricted = entity === 'file' && !s.perms.moneyRead ? ' AND restricted = 0' : ''; // 금액 파일 제목은 금액 권한자에게만
    const found = (await env.DB.prepare(`SELECT id, ${c1} AS a${c2 ? `, ${c2} AS b` : ''} FROM ${table} WHERE id IN (${marks})${restricted}`).bind(...ids).all()).results;
    for (const f of found) titles[entity + ':' + f.id] = String(f.a || f.b || '').slice(0, 120);
    if (restricted) for (const id of ids) if (!(entity + ':' + id in titles)) titles[entity + ':' + id] = null; // 숨김 표시
  }
  const items = [];
  for (const r of rows) {
    const t = titles[r.entity + ':' + r.entityId];
    if (t === null) continue;                                   // 보면 안 되는 금액 파일
    items.push({ at: r.at, actor: r.actor, action: r.action, entity: r.entity, entityId: r.entityId, title: t || (r.entity === 'file' ? String(r.detail || '').replace(/ v\d+$/, '') : '') });
  }
  return json({ items: items.slice(0, 30) });
}
