import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import * as Prefs from '../functions/api/campteam/ui-prefs.js';
import { fakeD1, makeEnv, req, root, U } from './helpers/campteam-fakes.mjs';

/* 사용법 카드: 글(howto-data.js)이 화면에 실제로 있는 탭·글자와 어긋나지 않는지, howto.js 가 켜진 탭에 맞춰 카드를 바꾸고
   접은 상태를 탭마다 기억하는지, 접은 상태 키가 서버에서 받아들여지는지를 확인한다. 화면 파일은 글자 검색만 한다(브라우저 없이). */
const read = (p) => readFileSync(root + p, 'utf8');
const PUB = 'public/portal/campteam/', PAGES = 'src/pages/portal/campteam/';
const dataSrc = read(PUB + 'howto-data.js'), howtoSrc = read(PUB + 'howto.js'), layoutSrc = read('src/layouts/CampTeamLayout.astro');
const D = (() => { const sb = { window: {} }; vm.runInNewContext(dataSrc, sb); return sb.window.CT_HOWTO; })();

/* 화면 이름 → 주소 · 화면 파일 · 글자를 찾아볼 파일들 */
const PAGE = {
  tasks: { astro: 'tasks', js: ['tasks.js'] },
  meetings: { astro: 'meetings', js: ['meetings.js'] },
  files: { astro: 'files', js: ['files.js', 'files-tree.js', 'files-tidy.js'] },
  library: { astro: 'library', js: ['library.js'] },
  prep: { astro: 'prep', js: ['prep.js', 'prep-extra.js', 'prep-survey.js', 'prep-assign.js', 'prep-forms.js'] },
  calendar: { astro: 'calendar', js: ['calendar.js'] },
  alerts: { astro: 'alerts', js: ['alerts-page.js'] },
  trash: { astro: 'trash', js: ['trash.js'] },
  settings: { astro: 'settings', js: ['settings.js', 'settings-extra.js', 'owners-admin.js', 'office-admin.js'] },
  finance: { astro: 'finance', js: ['finance.js', 'finance-import.js', 'finance-extra.js', 'finance-calc.js'] },
  budget: { astro: 'budget', js: ['budget.js'] },
  camps: { astro: 'camps', js: ['camps.js'] },
  space: { astro: 'space', js: ['space.js', 'space-portal.js'] },
  translate: { astro: 'translate', js: ['translate.js'] },
  search: { astro: 'search', js: ['search.js'] },
  tv: { astro: 'tv', js: ['tv-editor.js', 'tv-core.js'] },
  home: { astro: 'index', js: ['home.js'] }
};
const srcOf = (page) => [read(PAGES + PAGE[page].astro + '.astro'), ...PAGE[page].js.map((f) => read(PUB + f))].join('\n');
/* 다른 갈래(tasks-check)에서 들어올 탭: 그 갈래가 합쳐지기 전에는 화면 파일에 아직 없다. 합쳐진 뒤에는 이 목록에서 지워도 되고, 남겨 둬도 통과한다. */
const PENDING = new Set(['tasks:check']);
const allSrc = readdirSync(root + PUB).filter((f) => f.endsWith('.js') && f !== 'howto-data.js').map((f) => read(PUB + f)).concat(readdirSync(root + PAGES).filter((f) => f.endsWith('.astro')).map((f) => read(PAGES + f)), [layoutSrc]).join('\n');
const cards = [];
for (const [page, tabs] of Object.entries(D)) for (const [tab, c] of Object.entries(tabs)) cards.push({ page, tab, c, key: `howto:${page}:${tab}` });

test('등록된 화면: 모두 화면 파일이 있고, 주소 표(howto.js)에도 있다', () => {
  assert.ok(Object.keys(D).length >= 17);
  for (const page of Object.keys(D)) {
    assert.ok(PAGE[page], page + ' 의 화면 정보가 시험에 없어요');
    assert.ok(existsSync(root + PAGES + PAGE[page].astro + '.astro'), page);
    const url = '/portal/campteam/' + (page === 'home' ? '' : PAGE[page].astro);
    assert.ok(new RegExp(`'${url.replace(/\/$/, '')}'\\s*:\\s*'${page}'`).test(howtoSrc), page + ' 주소가 howto.js 에 없어요');
  }
  for (const page of Object.keys(PAGE)) assert.ok(D[page], page + ' 카드가 없어요');
});

test('사용법 카드가 붙는 화면: 캠프팀 공통 틀을 쓰고(= howto.js 가 불러와짐), 틀이 howto-data.js 를 howto.js 앞에 불러온다', () => {
  const i = layoutSrc.indexOf('/portal/campteam/howto-data.js'), j = layoutSrc.indexOf('/portal/campteam/howto.js');
  assert.ok(i > 0 && j > i, '글 파일이 howto.js 보다 먼저여야 해요');
  for (const page of Object.keys(D)) assert.match(read(PAGES + PAGE[page].astro + '.astro'), /import CampTeamLayout from/, page);
  /* 공통 틀을 쓰는 화면은 모두 카드가 있다 (새 화면을 만들고 카드를 빠뜨리는 일을 막는다). 공개 화면(설문 답하기·메일 끄기)과 옛 포털을 감싼 자료 화면은 틀이 달라 제외 */
  const withLayout = readdirSync(root + PAGES).filter((f) => f.endsWith('.astro') && /import CampTeamLayout from/.test(read(PAGES + f))).map((f) => f.replace('.astro', ''));
  const have = new Set(Object.values(PAGE).map((p) => p.astro));
  for (const f of withLayout) assert.ok(have.has(f), f + ' 화면에 사용법 카드가 없어요');
  for (const f of ['survey', 'email-off', 'resources']) assert.doesNotMatch(read(PAGES + f + '.astro'), /import CampTeamLayout from/, f + ' 는 카드를 붙이지 않는 화면이에요');
});

test('모든 카드: 한국어·영어 제목·탭 이름 + 순서 3~4줄 + 예시 두 줄이 비어 있지 않다', () => {
  assert.ok(cards.length >= 55, '카드 수 ' + cards.length);
  for (const { page, tab, c } of cards) for (const lang of ['ko', 'en']) {
    const d = c[lang], who = `${page}/${tab}/${lang}`;
    assert.ok(d, who + ' 없음');
    for (const f of ['l', 't']) assert.ok(typeof d[f] === 'string' && d[f].trim().length >= 2, `${who} ${f}`);
    assert.ok(Array.isArray(d.s) && d.s.length >= 3 && d.s.length <= 4, `${who} 순서는 3~4줄 (${d.s && d.s.length})`);
    for (const s of d.s) { assert.ok(typeof s === 'string' && s.trim().length >= 8, who + ' 빈 줄'); assert.ok(s.length <= (lang === 'ko' ? 110 : 190), `${who} 너무 길어요: ${s}`); }
    assert.ok(Array.isArray(d.ex) && d.ex.length === 2 && d.ex.every((x) => typeof x === 'string' && x.trim()), who + ' 예시');
    assert.ok(!/undefined|\[object/.test(JSON.stringify(d)), who + ' 이상한 글자');
  }
  /* 한국어 카드에 영어 문장이 섞이거나 그 반대가 되지 않는지 가볍게 (순서 줄 기준) */
  for (const { page, tab, c } of cards) { assert.ok(/[가-힣]/.test(c.ko.s.join('')), `${page}/${tab} ko`); assert.ok(!/[가-힣]/.test(c.en.s.join('').replace(/“[^”]*”/g, '')), `${page}/${tab} en 에 한글이 섞였어요`); }
});

test('키가 겹치지 않고, 접기 키는 「howto:화면:탭」 꼴이며 서버 규칙(KEY_RE)에 맞다', () => {
  const keys = cards.map((x) => x.key); assert.equal(new Set(keys).size, keys.length);
  for (const k of keys) assert.ok(Prefs.KEY_RE.test(k), k);
  for (const { page, c } of cards) assert.equal(c.ko.t === '', false, page);
  /* 같은 화면 안에서 카드 제목은 서로 달라야 탭을 옮겼을 때 바뀐 게 보인다 */
  for (const page of Object.keys(D)) { const t = Object.values(D[page]).map((c) => c.ko.t); assert.equal(new Set(t).size, t.length, page + ' 제목이 겹쳐요'); const e = Object.values(D[page]).map((c) => c.en.t); assert.equal(new Set(e).size, e.length, page + ' 영어 제목이 겹쳐요'); }
});

test('카드가 가리키는 탭 id·이름이 그 화면 파일에 실제로 있다 (어긋나면 바로 알 수 있게)', () => {
  const missing = [];
  for (const { page, tab, c } of cards) {
    const src = srcOf(page), pending = PENDING.has(page + ':' + tab);
    const idOk = tab === 'main' || new RegExp(`['"]${tab}['"]|data-tab="${tab}"|\\b${tab}\\s*:`).test(src);
    if (pending && !idOk) { assert.ok(!idOk, 'pending'); continue; } // 아직 합쳐지지 않은 탭
    if (!idOk) missing.push(`${page}/${tab} id`);
    for (const lang of ['ko', 'en']) if (!src.includes(c[lang].l)) missing.push(`${page}/${tab} ${lang} 이름 「${c[lang].l}」`);
    /* 제목에는 탭 이름이 들어 있어야 한다 (직접 지은 제목 예외: 휴지통·캠프별 공간·홈) */
    if (!['trash', 'space', 'home'].includes(page)) for (const lang of ['ko', 'en']) assert.ok(c[lang].t.includes(c[lang].l), `${page}/${tab} ${lang} 제목에 탭 이름이 없어요`);
  }
  assert.deepEqual(missing, []);
});

test('한국어 순서 줄의 「버튼 이름」은 캠프팀 화면 어딘가에 실제로 있는 글자다 (없는 기능을 쓰지 않는다)', () => {
  /* 예시 글(「감사 인사 보내기」 같은 지어낸 이름)은 ex 라서 검사하지 않는다. 아직 합쳐지지 않은 탭은 건너뛴다 */
  const bad = [];
  for (const { page, tab, c } of cards) { if (PENDING.has(page + ':' + tab)) continue; for (const s of c.ko.s) for (const m of s.matchAll(/「([^」]+)」/g)) if (!allSrc.includes(m[1])) bad.push(`${page}/${tab}: 「${m[1]}」`); }
  assert.deepEqual(bad, []);
});

test('화면 파일에 카드가 매달리는 곳(탭 줄 id·기준 글자)이 그대로 있다', () => {
  /* howto.js 가 켜진 탭을 찾는 방법과 같은 곳을 본다: [화면, 탭 줄 id, 탭에 붙는 data- 이름] */
  const spots = [['tasks', 'id="tabs"', 'data-tab'], ['meetings', 'id="tabs"', 'data-tab'], ['files', 'id="viewBar"', 'data-view'], ['library', 'id="libTabs"', 'data-k'], ['prep', 'id="pTabs"', 'ptabs-sub'],
    ['alerts', 'id="apTabs"', 'data-ptab'], ['trash', 'id="trTabs"', 'data-k'], ['finance', 'id="fnTabs"', 'data-tab'], ['finance', 'id="fnMain"', 'fnMain'], ['budget', 'id="bdMain"', 'bdMain']];
  for (const [page, idAttr, marker] of spots) { assert.ok(read(PAGES + PAGE[page].astro + '.astro').includes(idAttr), page + ' ' + idAttr); assert.ok(srcOf(page).includes(marker), page + ' ' + marker); }
  for (const f of ['trash', 'alerts', 'files', 'library', 'finance']) assert.match(srcOf(f), /class="tab[^"]*' \+|class="tab /, f + ' 탭 모양');
  assert.match(read(PUB + 'prep.js'), /ptabs-sub/); assert.match(read(PUB + 'finance.js'), /data-tab/);
  for (const sel of ["'#tabs .tab.on'", "'#viewBar .tab.on'", "'#libTabs .tab.on'", "'#pTabs .ptabs-sub .on'", "'#apTabs .tab.on'", "'#trTabs .tab.on'", "'#fnTabs [data-tab].on'"]) assert.ok(howtoSrc.includes(sel), sel);
});

/* ───────── howto.js 를 가짜 화면에서 돌려 본다 ───────── */
function boot({ path = '/portal/campteam/tasks/', tab = 'list', lang = 'ko', store = {}, serverPrefs = null } = {}) {
  const calls = [], handlers = {}, observers = [], rafs = [], ls = Object.assign({}, store), state = { tab };
  const mkBox = () => ({ className: '', id: '', hidden: false, innerHTML: '', isConnected: true, attrs: {}, cls: new Set(), handlers: {}, setAttribute(k, v) { this.attrs[k] = v; }, get classList() { const s = this.cls; return { toggle: (n, on) => { on ? s.add(n) : s.delete(n); } }; }, addEventListener(t, fn) { this.handlers[t] = fn; } });
  const top = { insertAdjacentElement(_where, el) { top.next = el; } };
  const strip = { addEventListener() {} };
  const lookup = {
    'main .top': () => top, '#tabs': () => strip, '#viewBar': () => strip, '#libTabs': () => strip, '#pTabs': () => strip, '#apTabs': () => strip, '#trTabs': () => strip, '#fnTabs': () => strip,
    '#tabs .tab.on': () => (state.tab ? { dataset: { tab: state.tab } } : null), '#trTabs .tab.on': () => (state.tab ? { dataset: { k: state.tab } } : null),
    '#pTabs .ptabs-sub .on': () => (state.tab ? { dataset: { tab: state.tab } } : null), '#fnTabs [data-tab].on': () => (state.tab ? { dataset: { tab: state.tab } } : null),
    '#viewBar .tab.on': () => (state.tab ? { dataset: { view: state.tab } } : null), '#libTabs .tab.on': () => (state.tab ? { dataset: { k: state.tab } } : null), '#apTabs .tab.on': () => (state.tab ? { dataset: { ptab: state.tab } } : null),
    '#fnMain': () => ({ hidden: !!state.locked }), '#bdMain': () => ({ hidden: !!state.locked })
  };
  const dict = { ko: {}, en: {} }; let L = lang;
  const CT = { addDict(d) { Object.assign(dict.ko, d.ko); Object.assign(dict.en, d.en); }, lang: () => L, t: (k) => dict[L][k] ?? k, esc: (x) => String(x == null ? '' : x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    api: async (url, o) => { calls.push({ url, method: (o && o.method) || 'GET', body: o && o.body ? JSON.parse(JSON.stringify(o.body)) : undefined }); if (!o) { if (!serverPrefs) throw new Error('offline'); return { prefs: serverPrefs }; } return { ok: true }; } };
  const box = mkBox();
  const document = { querySelector: (s) => (lookup[s] ? lookup[s]() : null), createElement: () => box, addEventListener(t, fn) { (handlers[t] = handlers[t] || []).push(fn); } };
  const win = { CT, CT_HOWTO: D, addEventListener() {}, requestAnimationFrame: (f) => { rafs.push(f); }, localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } } };
  const sb = { window: win, document, location: { pathname: path }, localStorage: win.localStorage, MutationObserver: class { constructor(cb) { observers.push({ cb }); } observe() {} }, setTimeout: () => 0, Math, String, Array, Object, JSON };
  vm.runInNewContext(howtoSrc, sb);
  const flush = () => { rafs.splice(0).forEach((f) => f()); };
  return {
    box, calls, ls, state, dict,
    /* 탭을 눌렀다: 켜진 탭이 바뀌고, 탭 줄 변화 신호가 온다 */
    pick(t) { state.tab = t; observers.forEach((x) => x.cb()); flush(); },
    ready: async () => { (handlers['ct-ready'] || []).forEach((f) => f()); flush(); await new Promise((r) => setTimeout(r, 0)); },
    setLang(l) { L = l; (handlers['ct-lang'] || []).forEach((f) => f()); },
    click(what) { const el = { closest: (s) => (s === '[data-ht]' ? { dataset: { ht: what } } : null) }; box.handlers.click({ target: el }); },
    title() { const m = /<b>💡 ([^<]*)<\/b>|ht-bt">💡 ([^<]*)</.exec(box.innerHTML); return m ? (m[1] || m[2]) : ''; },
    folded() { return box.cls.has('is-min'); }
  };
}

test('howto.js: 처음엔 기본 탭 카드가 펼쳐져 보이고, 예시 줄과 「예시 카드」 표시가 붙는다', () => {
  const h = boot();
  assert.equal(h.box.hidden, false); assert.equal(h.title(), '업무 목록 사용법');
  assert.match(h.box.innerHTML, /<ol class="ht-steps">(<li>[^<]+<\/li>){4}<\/ol>/); assert.match(h.box.innerHTML, /class="ht-tag">예시</); assert.match(h.box.innerHTML, /예시 카드/); assert.match(h.box.innerHTML, /버스 예약하기/);
  assert.equal(h.box.id, 'ctHowto'); assert.equal(h.box.className, 'ct-howto'); assert.equal(h.folded(), false);
});

test('howto.js: 탭을 바꾸면 카드가 바뀌고, 제목에 탭 이름이 들어간다 (업무: 목록 → 템플릿 → 시트 → 목록)', () => {
  const h = boot();
  h.pick('tpl'); assert.equal(h.title(), '체크리스트 템플릿 사용법'); assert.match(h.box.innerHTML, /캠프에 적용/);
  h.pick('imp'); assert.equal(h.title(), '시트에서 가져오기 사용법'); assert.match(h.box.innerHTML, /미리보기/);
  h.pick('check'); assert.equal(h.title(), '팀 점검 사용법'); assert.match(h.box.innerHTML, /체크박스/);
  h.pick('list'); assert.equal(h.title(), '업무 목록 사용법');
  h.pick('없는탭'); assert.equal(h.box.hidden, true, '카드가 없는 탭이면 숨긴다'); h.pick('tpl'); assert.equal(h.box.hidden, false);
});

test('howto.js: 접은 상태는 탭마다 따로 — 서버(howto:화면:탭)와 이 브라우저에 기억하고, 다른 탭은 그대로 펼침', () => {
  const h = boot();
  h.pick('tpl'); h.click('hide'); assert.equal(h.folded(), true); assert.match(h.box.innerHTML, /ht-bar/); assert.match(h.box.innerHTML, /체크리스트 템플릿 사용법 · 예시/, '접힌 막대 제목에 탭 이름');
  assert.deepEqual(h.calls.filter((c) => c.method === 'PUT').map((c) => c.body), [{ key: 'howto:tasks:tpl', value: '1' }]); assert.equal(h.ls['ct-howto:tasks:tpl'], '1');
  h.pick('list'); assert.equal(h.folded(), false, '목록 탭은 따로라 펼쳐져 있다'); assert.equal(h.title(), '업무 목록 사용법');
  h.pick('tpl'); assert.equal(h.folded(), true, '템플릿 탭으로 돌아오면 접힌 채');
  h.click('show'); assert.equal(h.folded(), false); assert.deepEqual(h.calls.filter((c) => c.method === 'PUT').pop().body, { key: 'howto:tasks:tpl', value: '0' }, '펼친 것도 값으로 남긴다');
  h.pick('imp'); h.pick('tpl'); assert.equal(h.folded(), false);
  for (const c of h.calls.filter((x) => x.method === 'PUT')) assert.ok(Prefs.KEY_RE.test(c.body.key), c.body.key);
});

test('howto.js: 예전 화면 단위 접기 기억(ct-howto:tasks)은 무시하고, 이 브라우저에 남은 탭별 기억은 따른다', () => {
  assert.equal(boot({ store: { 'ct-howto:tasks': '1' } }).folded(), false);
  const h = boot({ store: { 'ct-howto:tasks:list': '1' } }); assert.equal(h.folded(), true); assert.match(h.box.innerHTML, /펼치기/);
});

test('howto.js: 서버 기억이 오면 그 값을 따르고, 서버에 없으면 이 브라우저 기억을 올려 둔다 · 서버가 안 되어도 동작', async () => {
  const a = boot({ serverPrefs: { 'howto:tasks:list': '1' } }); await a.ready(); assert.equal(a.folded(), true, '서버 값이 접힘이면 접는다'); a.pick('tpl'); assert.equal(a.folded(), false);
  const b = boot({ store: { 'ct-howto:tasks:list': '1' }, serverPrefs: {} }); await b.ready(); assert.deepEqual(b.calls.filter((c) => c.method === 'PUT').map((c) => c.body), [{ key: 'howto:tasks:list', value: '1' }]);
  const c = boot({ store: { 'ct-howto:tasks:list': '1' }, serverPrefs: null }); await c.ready(); assert.equal(c.folded(), true, '서버를 못 써도 브라우저 기억으로 접힌 채'); assert.equal(c.calls.filter((x) => x.method === 'PUT').length, 0);
  const d = boot({ serverPrefs: { 'howto:tasks:list': '0' }, store: { 'ct-howto:tasks:list': '1' } }); await d.ready(); assert.equal(d.folded(), false, '다른 기기에서 펼쳤다면 서버가 이긴다');
});

test('howto.js: 언어를 바꾸면 영어 카드로 다시 그린다', () => {
  const h = boot(); h.pick('tpl'); h.setLang('en'); assert.equal(h.title(), 'Checklist templates: how to use'); assert.match(h.box.innerHTML, /Example card/); assert.doesNotMatch(h.box.innerHTML, /[가-힣]/);
  h.click('hide'); assert.match(h.box.innerHTML, /Checklist templates: how to use · example/);
});

test('howto.js: 화면마다 켜진 탭을 읽는다 — 보관함·휴지통·알림공지·캠프 준비·회계 장부·자료실', () => {
  const lib = boot({ path: '/portal/campteam/library/', tab: 'game' }); assert.equal(lib.title(), '게임·활동 사용법'); lib.pick('venue'); assert.equal(lib.title(), '장소·시설 사용법');
  const tr = boot({ path: '/portal/campteam/trash/', tab: 'camp_types' }); assert.equal(tr.title(), '휴지통 · 캠프 유형 사용법'); tr.pick('tasks'); assert.match(tr.title(), /휴지통 · 업무/);
  const none = boot({ path: '/portal/campteam/trash/', tab: '' }); assert.equal(none.box.hidden, true, '휴지통은 탭이 정해지기 전에는 숨김');
  const al = boot({ path: '/portal/campteam/alerts/', tab: 'team' }); assert.equal(al.title(), '팀 공지 사용법');
  const pr = boot({ path: '/portal/campteam/prep/', tab: 'forms' }); assert.equal(pr.title(), '신청서 사용법'); pr.pick('wizard'); assert.equal(pr.title(), '시작 마법사 사용법'); pr.pick('survey'); assert.equal(pr.title(), '평가 설문 사용법');
  const fn = boot({ path: '/portal/campteam/finance/', tab: 'recon' }); assert.equal(fn.title(), '잔액 대조 사용법'); fn.pick('cats'); assert.equal(fn.title(), '항목 목록 사용법');
  const fi = boot({ path: '/portal/campteam/files/', tab: 'all' }); assert.equal(fi.title(), '전체 파일 보기 사용법'); fi.pick('folders'); assert.equal(fi.title(), '폴더별 보기 사용법');
  const fiDefault = boot({ path: '/portal/campteam/files/', tab: '', store: { 'ct-files-view': 'all' } }); assert.equal(fiDefault.title(), '전체 파일 보기 사용법', '탭 줄이 비어 있어도 기억해 둔 보기를 따른다');
});

test('howto.js: 탭이 없는 화면은 카드 한 장(main), 잠긴 회계 화면에서는 카드를 숨긴다', () => {
  for (const [p, t] of [['calendar', '달력 사용법'], ['settings', '설정 · 팀 명단 사용법'], ['camps', '캠프별 공간 사용법'], ['space', '캠프 한 곳의 공간 사용법'], ['translate', '번역 도우미 사용법'], ['search', '통합 검색 사용법'], ['tv', 'TV 대시보드 사용법'], ['budget', '캠프 예산 사용법']]) {
    const h = boot({ path: `/portal/campteam/${p}/`, tab: '' }); assert.equal(h.title(), t, p); h.click('hide'); assert.equal(h.calls.filter((c) => c.method === 'PUT').pop().body.key, `howto:${p}:main`);
  }
  assert.equal(boot({ path: '/portal/campteam/', tab: '' }).title(), '홈 화면 사용법');
  const locked = boot({ path: '/portal/campteam/finance/', tab: 'summary' }); assert.equal(locked.box.hidden, false); locked.state.locked = true; locked.pick('summary'); assert.equal(locked.box.hidden, true, '권한이 없어 잠긴 화면에는 카드를 보이지 않는다');
  const bl = boot({ path: '/portal/campteam/budget/', tab: '' }); assert.equal(bl.box.hidden, false); bl.state.locked = true; bl.pick(''); assert.equal(bl.box.hidden, true);
  assert.equal(boot({ path: '/portal/campteam/survey/' }).box.next, undefined, '공개 설문 화면에는 카드를 붙이지 않는다');
});

test('접기 키 저장: 「howto:화면:탭」 은 받고, 엉뚱한 키는 거절 · 탭마다 따로 저장된다', async () => {
  const env = makeEnv(fakeD1());
  const call = async (m, who, o = {}) => { const r = await m({ env, request: await req(who, { method: o.method || 'GET', url: 'http://localhost/api/campteam/ui-prefs', body: o.body }) }); return { status: r.status, body: await r.json() }; };
  for (const key of ['howto:tasks:tpl', 'howto:trash:camp_types', 'howto:prep:timeline', 'howto:tasks']) assert.equal((await call(Prefs.onRequestPut, U.mem, { method: 'PUT', body: { key, value: '1' } })).body.ok, true, key);
  for (const key of ['howto:tasks:a:b', 'howto:Tasks:tpl', 'howto:tasks:', 'howto:t:tpl', 'admin:secret', 'howto:tasks:UPPER']) assert.equal((await call(Prefs.onRequestPut, U.mem, { method: 'PUT', body: { key, value: '1' } })).status, 400, key);
  assert.deepEqual((await call(Prefs.onRequestGet, U.mem)).body.prefs, { 'howto:tasks:tpl': '1', 'howto:trash:camp_types': '1', 'howto:prep:timeline': '1', 'howto:tasks': '1' });
  await call(Prefs.onRequestPut, U.mem, { method: 'PUT', body: { key: 'howto:tasks:tpl', value: '0' } });
  assert.equal((await call(Prefs.onRequestGet, U.mem)).body.prefs['howto:tasks:tpl'], '0', '펼침(0)도 값으로 남는다');
  assert.deepEqual((await call(Prefs.onRequestGet, U.dir)).body.prefs, {}, '다른 계정은 못 본다');
  /* 카드 전체의 접기 키를 한 계정이 모두 저장해도 한 번에 읽혀 온다 */
  for (const { key } of cards) assert.equal((await call(Prefs.onRequestPut, U.fin, { method: 'PUT', body: { key, value: '1' } })).body.ok, true, key);
  assert.equal(Object.keys((await call(Prefs.onRequestGet, U.fin)).body.prefs).length, cards.length);
});
