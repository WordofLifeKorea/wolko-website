/**
 * 캠프팀 홈 화면 배치: 섹션 목록(순서·표시 여부·너비). 화면 모양만 정하며 데이터 권한과는 무관하다
 * (예산 섹션은 배치에 있어도 금액 권한이 없으면 서버가 금액을 아예 내려주지 않는다).
 */
export const SECTION_IDS = ['stats', 'camps', 'deadlines', 'attention', 'agenda', 'meetings', 'files', 'budget'];
const FULL_BY_DEFAULT = new Set(['stats', 'budget']);
export const SIZES = ['half', 'full'];

export function defaultHomeLayout() {
  return { sections: SECTION_IDS.map((id) => ({ id, show: true, size: FULL_BY_DEFAULT.has(id) ? 'full' : 'half' })) };
}

/** 받은 값을 검사해 깨끗한 배치로 돌려준다. 빠진 섹션은 끝에 기본값으로 붙인다(나중에 섹션이 늘어도 안전). */
export function sanitizeHomeLayout(input) {
  const list = input && Array.isArray(input.sections) ? input.sections : null;
  if (!list) return { error: '배치 형식이 올바르지 않습니다.' };
  if (list.length > SECTION_IDS.length) return { error: '섹션이 너무 많습니다.' };
  const seen = new Set(), out = [];
  for (const s of list) {
    if (!s || typeof s !== 'object' || !SECTION_IDS.includes(s.id)) return { error: '알 수 없는 섹션입니다.' };
    if (seen.has(s.id)) return { error: '같은 섹션이 두 번 들어 있습니다.' };
    if (!SIZES.includes(s.size)) return { error: '섹션 너비가 올바르지 않습니다.' };
    seen.add(s.id); out.push({ id: s.id, show: s.show !== false && s.show !== 0, size: s.size });
  }
  for (const d of defaultHomeLayout().sections) if (!seen.has(d.id)) out.push(d);
  if (!out.some((s) => s.show)) return { error: '보이는 섹션이 하나는 있어야 합니다.' };
  return { layout: { sections: out } };
}

export const userScope = (email) => 'u:' + String(email || '').trim().toLowerCase();

function parse(row) {
  if (!row) return null;
  try { const r = sanitizeHomeLayout(JSON.parse(row.json)); return r.layout || null; } catch { return null; }
}

/** { default, mine, effective } — 저장값이 깨졌으면 한 단계 아래(기본)로 자연스럽게 물러난다 */
export async function loadHomeLayouts(env, email) {
  const rows = (await env.DB.prepare('SELECT scope, json, updatedAt FROM home_layout WHERE scope IN (?1, ?2)').bind('default', userScope(email)).all()).results;
  const by = Object.fromEntries(rows.map((r) => [r.scope, r]));
  const adminDefault = parse(by.default), mine = parse(by[userScope(email)]);
  return { builtIn: defaultHomeLayout(), default: adminDefault, mine, effective: mine || adminDefault || defaultHomeLayout(), defaultUpdatedAt: by.default?.updatedAt || null };
}
