/** TV 대시보드: 위젯 종류, 배치 검사, 토큰 */
export const TV_APP_VERSION = '1.1.1'; // TV 화면이 이 값이 바뀐 것을 보면 스스로 완전히 새로고침한다
export const COLS = 16, ROWS = 9;
// 위젯 종류와 최소 크기 (편집기와 같은 값)
export const WIDGETS = {
  brand: [2, 1], weather: [1, 1], clock: [2, 1], stats: [4, 1], dday: [2, 2], progress: [3, 2], theme: [2, 1], campers: [3, 2],
  tasks: [3, 2], events: [3, 2], meetings: [3, 2], notices: [3, 2], late: [3, 2],
  hero: [4, 2], pnotices: [3, 2], duty: [3, 2], pevents: [3, 2],   // 포털 정보: 인사·날씨, 월코 이번 주 공지, 팀원의 오늘 듀티, 월코 일정
};
export const LIST_WIDGETS = ['tasks', 'events', 'meetings', 'notices', 'late', 'pnotices', 'pevents'];

/** 기본 배치: 기존 TV 대시보드와 같은 위치(메인) + 전체 업무 화면 */
export function defaultLayout() {
  const w = (type, x, y, w, h, opts = {}) => ({ uid: type + '-' + x + '-' + y, type, x, y, w, h, opts });
  return { pages: [
    { id: 'p1', name: 'Main', secs: 30, items: [w('hero', 0, 0, 11, 2), w('clock', 11, 0, 5, 2), w('stats', 0, 2, 16, 1), w('tasks', 0, 3, 8, 3, { secs: 10 }), w('pnotices', 8, 3, 8, 3, { secs: 12 }), w('duty', 0, 6, 5, 3), w('events', 5, 6, 6, 3, { secs: 10 }), w('meetings', 11, 6, 5, 3, { secs: 8 })] },
    { id: 'p2', name: 'All tasks', secs: 30, items: [w('brand', 0, 0, 6, 1), w('weather', 6, 0, 4, 1), w('clock', 10, 0, 6, 1), w('tasks', 0, 1, 10, 8, { secs: 12, compact: 1 }), w('late', 10, 1, 6, 3, { secs: 10 }), w('dday', 10, 4, 6, 2), w('progress', 10, 6, 6, 3)] },
    { id: 'p3', name: 'WOLKO', secs: 30, items: [w('hero', 0, 0, 16, 2), w('pnotices', 0, 2, 10, 7, { secs: 14 }), w('duty', 10, 2, 6, 3), w('pevents', 10, 5, 6, 4, { secs: 10 })] },
  ] };
}

const int = (v, a, b) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(a, Math.min(b, n)) : null; };

/** 편집기가 보낸 배치를 검사·정리한다: 알 수 없는 위젯/키는 버리고 범위를 맞춘다. 겹치는 위젯이 있으면 오류. */
export function sanitizeLayout(input) {
  if (!input || !Array.isArray(input.pages)) return { error: '화면 목록이 필요합니다.' };
  if (input.pages.length < 1 || input.pages.length > 10) return { error: '화면은 1~10개까지 만들 수 있어요.' };
  const pages = [];
  for (const [pi, p] of input.pages.entries()) {
    if (!Array.isArray(p.items) || p.items.length > 30) return { error: `화면 ${pi + 1}: 위젯은 30개까지예요.` };
    const items = [];
    for (const it of p.items) {
      const min = WIDGETS[it.type]; if (!min) return { error: `알 수 없는 위젯: ${String(it.type).slice(0, 20)}` };
      const x = int(it.x, 0, COLS - 1), y = int(it.y, 0, ROWS - 1), w = int(it.w, min[0], COLS), h = int(it.h, min[1], ROWS);
      if (x == null || y == null || w == null || h == null || x + w > COLS || y + h > ROWS) return { error: `화면 ${pi + 1}: 위젯 위치/크기가 화면 밖이에요.` };
      const o = it.opts && typeof it.opts === 'object' ? it.opts : {}, opts = {};
      if (o.fs != null) { const v = int(o.fs, 40, 260); if (v != null) opts.fs = v; }
      if (o.n != null && LIST_WIDGETS.includes(it.type)) { const v = int(o.n, 1, 12); if (v != null) opts.n = v; }
      if (o.secs != null) { const v = int(o.secs, 3, 120); if (v != null) opts.secs = v; }
      if (o.compact) opts.compact = 1; if (o.noTitle) opts.noTitle = 1;
      items.push({ uid: String(it.uid || it.type + '-' + x + '-' + y).replace(/[^\w-]/g, '').slice(0, 40) || it.type, type: it.type, x, y, w, h, opts });
    }
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const a = items[i], b = items[j];
      if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) return { error: `화면 ${pi + 1}: 위젯이 서로 겹쳐요.` };
    }
    pages.push({ id: String(p.id || 'p' + (pi + 1)).replace(/[^\w-]/g, '').slice(0, 20) || 'p' + (pi + 1), name: String(p.name || 'Screen ' + (pi + 1)).trim().slice(0, 30), secs: int(p.secs, 5, 600) ?? 30, items });
  }
  return { layout: { pages } };
}

const strict = (v, a, b) => { const n = Number(v); return Number.isInteger(n) && n >= a && n <= b ? n : null; }; // 설정은 범위를 벗어나면 맞춰 주지 않고 거부한다
export const SETTING_KEYS = { theme: ['dark', 'light'], language: ['en', 'ko', 'both'], sky: ['on', 'off'] };
export function cleanSettings(b) {
  const out = {};
  if (b.theme !== undefined) { if (!SETTING_KEYS.theme.includes(b.theme)) return { error: '테마가 올바르지 않습니다.' }; out.theme = b.theme; }
  if (b.language !== undefined) { if (!SETTING_KEYS.language.includes(b.language)) return { error: '언어가 올바르지 않습니다.' }; out.language = b.language; }
  if (b.sky !== undefined) { if (!SETTING_KEYS.sky.includes(b.sky)) return { error: '하늘 배경 설정이 올바르지 않습니다.' }; out.sky = b.sky; }
  if (b.refreshSec !== undefined) { const v = strict(b.refreshSec, 30, 600); if (v == null) return { error: '새로고침 주기는 30~600초예요.' }; out.refreshSec = String(v); }
  if (b.reloadHours !== undefined) { const v = strict(b.reloadHours, 1, 48); if (v == null) return { error: '완전 새로고침 간격은 1~48시간이에요.' }; out.reloadHours = String(v); }
  if (b.weatherLabel !== undefined) out.weatherLabel = String(b.weatherLabel).trim().slice(0, 40);
  for (const k of ['weatherLat', 'weatherLon']) if (b[k] !== undefined) { const n = Number(b[k]); if (!Number.isFinite(n) || Math.abs(n) > 180) return { error: '위도/경도가 올바르지 않습니다.' }; out[k] = String(n); }
  return { settings: out };
}
export const DEFAULT_SETTINGS = { theme: 'dark', language: 'en', sky: 'on', refreshSec: '60', reloadHours: '6', weatherLabel: 'Pyeongtaek', weatherLat: '36.9921', weatherLon: '127.1129' };

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'; // 헷갈리는 글자(0 o 1 l i) 제외 — TV 리모컨으로 입력하기 쉽게
export function newToken(len = 10) {
  const b = crypto.getRandomValues(new Uint8Array(len)); let s = '';
  for (const n of b) s += ALPHABET[n % ALPHABET.length];
  return s;
}
/** 길이가 같을 때 시간 차이로 추측할 수 없게 비교 */
export function safeEqual(a, b) {
  a = String(a || ''); b = String(b || ''); if (a.length !== b.length || !a) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i); return r === 0;
}
