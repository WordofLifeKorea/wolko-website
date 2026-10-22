/**
 * 캠프팀 홈 화면 배치 (대시보드): 12칸 격자 위에 위젯을 자유롭게 놓는다. TV 편집기와 같은 방식.
 * 화면 모양만 정하며 데이터 권한과는 무관하다 — 예산 위젯이 배치에 있어도 금액 권한이 없으면 서버가 금액을 아예 내려주지 않고,
 * 팀 전용 위젯(변경 기록)은 캠프팀 명단에 있는 사람이 아니면 화면에 나오지도 않고 데이터도 요청하지 못한다.
 */
export const COLS = 12, MAX_ROWS = 120, MAX_ITEMS = 24;

/** 위젯 종류: 기본 크기(w×h 칸), 최소 크기, 팀 전용(명단에 있는 팀원만) 여부, 한 화면에 여러 개 허용 개수 */
export const CATALOG = {
  stats:     { w: 12, h: 3,  minW: 3, minH: 2, max: 1 },
  camps:     { w: 6,  h: 8,  minW: 3, minH: 3, max: 1 },
  deadlines: { w: 6,  h: 8,  minW: 3, minH: 3, max: 1 },
  attention: { w: 6,  h: 8,  minW: 3, minH: 3, max: 1 },
  agenda:    { w: 6,  h: 8,  minW: 3, minH: 3, max: 1 },
  meetings:  { w: 6,  h: 6,  minW: 3, minH: 3, max: 1 },
  files:     { w: 6,  h: 6,  minW: 3, minH: 3, max: 1 },
  budget:    { w: 12, h: 5,  minW: 4, minH: 3, max: 1 },
  notices:   { w: 6,  h: 6,  minW: 3, minH: 3, max: 1 },
  links:     { w: 6,  h: 4,  minW: 3, minH: 2, max: 1 },
  mytasks:   { w: 6,  h: 8,  minW: 3, minH: 3, max: 1 },
  calendar:  { w: 6,  h: 12, minW: 4, minH: 8, max: 1 },
  dday:      { w: 3,  h: 5,  minW: 2, minH: 4, max: 4 },
  thisweek:  { w: 6,  h: 8,  minW: 3, minH: 3, max: 1 },
  overdue:   { w: 6,  h: 8,  minW: 3, minH: 3, max: 1 },
  decisions: { w: 6,  h: 8,  minW: 3, minH: 3, max: 1 },
  status:    { w: 6,  h: 7,  minW: 3, minH: 4, max: 1 },
  activity:  { w: 6,  h: 8,  minW: 3, minH: 3, max: 1, teamOnly: true },
};
export const TYPES = Object.keys(CATALOG);
export const catalogList = () => TYPES.map((type) => ({ type, ...CATALOG[type] }));

export function defaultHomeLayout() {
  const it = (type, x, y, w, h) => ({ uid: type, type, x, y, w: w ?? CATALOG[type].w, h: h ?? CATALOG[type].h, show: true, opts: {} });
  return { v: 2, items: [
    it('stats', 0, 0), it('camps', 0, 3), it('deadlines', 6, 3), it('attention', 0, 11), it('agenda', 6, 11),
    it('meetings', 0, 19), it('files', 6, 19), it('budget', 0, 25),
  ] };
}

const UID = /^[a-z0-9]{1,16}$/, CAMP_ID = /^[A-Za-z0-9_-]{1,64}$/;
const int = (v) => typeof v === 'number' && Number.isInteger(v);

/** 받은 값을 검사해 깨끗한 배치로 돌려준다. { layout } 또는 { error } */
export function sanitizeHomeLayout(input) {
  const list = input && input.v === 2 && Array.isArray(input.items) ? input.items : null;
  if (!list) return { error: '배치 형식이 올바르지 않습니다.' };
  if (list.length > MAX_ITEMS) return { error: `위젯은 ${MAX_ITEMS}개까지 놓을 수 있어요.` };
  const out = [], uids = new Set(), count = {};
  for (const w of list) {
    if (!w || typeof w !== 'object' || !CATALOG[w.type]) return { error: '알 수 없는 위젯입니다.' };
    const c = CATALOG[w.type], uid = String(w.uid ?? '');
    if (!UID.test(uid)) return { error: '위젯 번호가 올바르지 않습니다.' };
    if (uids.has(uid)) return { error: '같은 위젯 번호가 두 번 들어 있습니다.' };
    if (![w.x, w.y, w.w, w.h].every(int)) return { error: '위젯 위치·크기가 올바르지 않습니다.' };
    if (w.w < c.minW || w.h < c.minH) return { error: '위젯이 너무 작습니다.' };
    if (w.x < 0 || w.y < 0 || w.x + w.w > COLS || w.y + w.h > MAX_ROWS) return { error: '위젯이 화면 밖으로 나갔습니다.' };
    count[w.type] = (count[w.type] || 0) + 1;
    if (count[w.type] > c.max) return { error: '같은 위젯을 너무 많이 놓았습니다.' };
    uids.add(uid);
    const opts = {};
    if (w.type === 'dday' && w.opts && typeof w.opts.campId === 'string' && CAMP_ID.test(w.opts.campId)) opts.campId = w.opts.campId;
    out.push({ uid, type: w.type, x: w.x, y: w.y, w: w.w, h: w.h, show: w.show !== false && w.show !== 0, opts });
  }
  for (let i = 0; i < out.length; i++) for (let j = i + 1; j < out.length; j++) {
    const a = out[i], b = out[j];
    if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) return { error: '위젯이 서로 겹쳐 있어요.' };
  }
  if (!out.some((w) => w.show)) return { error: '보이는 위젯이 하나는 있어야 합니다.' };
  // 폰에서 보이는 순서(선택). 없거나 일부만 있으면 나머지는 위치(위→아래, 왼→오)순으로 이어진다. 배치에 없는 번호는 버린다.
  const m = [];
  if (Array.isArray(input.m)) for (const u of input.m.slice(0, MAX_ITEMS)) if (typeof u === 'string' && uids.has(u) && !m.includes(u)) m.push(u);
  return { layout: m.length ? { v: 2, items: out, m } : { v: 2, items: out } };
}

export const userScope = (email) => 'u:' + String(email || '').trim().toLowerCase();

function parse(row) {
  if (!row) return null;
  try { const r = sanitizeHomeLayout(JSON.parse(row.json)); return r.layout || null; } catch { return null; }
}

/** { default, mine, effective } — 저장값이 깨졌거나 예전 형식이면 한 단계 아래(기본)로 자연스럽게 물러난다 */
export async function loadHomeLayouts(env, email) {
  const rows = (await env.DB.prepare('SELECT scope, json, updatedAt FROM home_layout WHERE scope IN (?1, ?2)').bind('default', userScope(email)).all()).results;
  const by = Object.fromEntries(rows.map((r) => [r.scope, r]));
  const adminDefault = parse(by.default), mine = parse(by[userScope(email)]);
  return { builtIn: defaultHomeLayout(), default: adminDefault, mine, effective: mine || adminDefault || defaultHomeLayout(), defaultUpdatedAt: by.default?.updatedAt || null };
}
