/**
 * 화면 꾸미기 — 포탈 페이지의 카드 순서 · 보이기 · 배치를 사람마다 바꿔 쓴다.
 * 저장은 이 기기(브라우저)에만, 화면 크기별로 따로 한다: 휴대폰(640px 미만) · 태블릿(1024px 미만) · 컴퓨터.
 * 그래서 같은 사람이라도 컴퓨터로 열 때와 휴대폰으로 열 때 다른 모양을 정해 둘 수 있다.
 *
 * 페이지 쪽 표시: 카드를 담은 묶음에 data-wl-cards 를 붙인다.
 *   data-wl-cards=""            → 묶음 바로 아래 자식 중 data-wl-card="이름" 이 붙은 것만 카드
 *   data-wl-cards="선택자"      → 묶음 바로 아래 자식 중 선택자에 맞는 것이 카드 (JS로 다시 그리는 묶음용)
 * 카드 이름(저장 키)은 data-wl-card → id → 대표 class 순으로 정한다. 제목은 data-wl-card-title(-en) 이 있으면 그것, 없으면 카드 안의 첫 제목 글자.
 * 패널에는 지금 보이는 카드(와 내가 숨긴 카드)만 나온다 — 권한이 없어 페이지가 감춘 카드는 목록에도 없다.
 * 꾸미지 않은 화면은 페이지 원래 모양 그대로 둔다(아무 스타일도 건드리지 않는다).
 *
 * 배치는 두 가지다.
 *   페이지 배치 — 페이지가 정한 격자 그대로 두고 순서와 보이기만 바꾼다. 휴대폰은 늘 이것(카드가 한 줄에 하나).
 *   블럭 배치 — 캠프 & 아웃리치 팀 홈 꾸미기와 같은 방식. 12칸 × 40px 줄 칸 위에 카드마다 자리(x, y)와 크기(w, h)를 정한다.
 *     카드를 끌면 칸에 맞춰 붙고, 옆 카드와 겹치면 그 카드가 아래로 밀려난다. 오른쪽 아래 모서리를 끌어 크기를 바꾸고, [빈틈 정리]로 빈 곳을 위로 모은다.
 *     카드 높이는 정한 칸 수로 고정되고, 내용이 더 길면 카드 안에서 스크롤된다. 처음 바꿀 때는 지금 페이지 모양(자리 · 폭 · 높이)을 그대로 옮겨 온다.
 * 좁은 블럭의 카드에는 컨테이너 쿼리를 걸어 안의 표 · 격자 · 버튼 줄이 카드 폭에 맞춰 다시 정렬된다(wolko-customize.css).
 */
(function () {
  if (window.WolkoCustomize) return;
  var PREFIX = 'wolko-cz:v1:';
  var SCREENS = [{ id: 'phone', max: 639 }, { id: 'tablet', max: 1023 }, { id: 'desktop', max: Infinity }];
  var COLS = 12, ROW = 40, MINW = 2, MINH = 2, MAXR = 400, SPARE = 8;   // 칸 수 · 줄 높이(px) · 가장 작은 크기(칸) · 가장 긴 줄 수 · 꾸미는 중 아래에 남기는 빈 줄
  var T = {
    ko: { open: '화면 꾸미기', title: '화면 꾸미기', close: '닫기', done: '완료', reset: '이 화면 처음 모양으로', copyFrom: function (s) { return s + ' 모양 가져오기'; },
      where: function (s, w) { return '지금 화면: ' + s + ' (' + w + 'px) · 이 기기에만 저장돼요. 다른 화면 크기는 그 크기로 열어서 따로 꾸며요.'; },
      phone: '휴대폰', tablet: '태블릿', desktop: '컴퓨터', up: '앞으로', down: '뒤로', show: '보이기', hide: '숨기기', hiddenTag: '숨김',
      card: '카드', needOne: '보이는 카드가 하나는 있어야 해요.', noSave: '이 브라우저에서는 저장할 수 없어서, 페이지를 다시 열면 원래 모양으로 돌아가요.',
      saved: '저장했어요.', resetDone: '처음 모양으로 돌렸어요.', copied: '가져왔어요.', phoneWidth: '휴대폰 화면에서는 카드가 한 줄에 하나씩 나와요. 순서와 보이기만 정할 수 있어요.',
      dragHint: '페이지에서 카드를 끌어 자리를 바꿀 수 있어요.', dragHintPhone: '카드 위쪽 손잡이를 끌어 자리를 바꿀 수 있어요.',
      dragHintGrid: '카드를 끌어 칸에 맞춰 놓고, 오른쪽 아래 모서리를 끌어 크기를 바꿔요.',
      dragMove: '끌어서 자리 옮기기', dragSize: '끌어서 크기 바꾸기',
      pageMode: '지금은 페이지 원래 배치예요. 블럭 배치로 바꾸면 캠프 & 아웃리치 팀 홈처럼 칸 위에 카드를 자유롭게 놓고 크기를 바꿀 수 있어요.',
      gridMode: '블럭 배치예요. 옆 카드와 겹치면 그 카드가 아래로 밀려나요. 내용이 카드보다 길면 카드 안에서 스크롤돼요.',
      mkGrid: '블럭 배치로 바꾸기', noGrid: '원래 배치로', tidy: '빈틈 정리', tidyDone: '빈 공간을 위로 모았어요.', noRoom: '자리가 모자라서 옮길 수 없어요.' },
    en: { open: 'Customize this page', title: 'Customize this page', close: 'Close', done: 'Done', reset: 'Reset this screen', copyFrom: function (s) { return 'Use the ' + s + ' layout'; },
      where: function (s, w) { return 'This screen: ' + s + ' (' + w + 'px) · saved on this device only. Open the page at another size to set that layout separately.'; },
      phone: 'phone', tablet: 'tablet', desktop: 'computer', up: 'Move earlier', down: 'Move later', show: 'Show', hide: 'Hide', hiddenTag: 'Hidden',
      card: 'Card', needOne: 'At least one card must stay visible.', noSave: 'This browser cannot save, so the page will go back to its original layout when reopened.',
      saved: 'Saved.', resetDone: 'Back to the original layout.', copied: 'Copied.', phoneWidth: 'On a phone, cards are shown one per row. You can set the order and which cards show.',
      dragHint: 'Drag a card on the page to move it.', dragHintPhone: 'Drag the handle at the top of a card to move it.',
      dragHintGrid: 'Drag a card to snap it to the grid, and drag its bottom-right corner to resize it.',
      dragMove: 'Drag to move', dragSize: 'Drag to resize',
      pageMode: 'This is the page’s own layout. Switch to blocks to place and resize cards freely on a grid, like the Camp & Outreach team home.',
      gridMode: 'Block layout. A card that would overlap is pushed down. If a card’s content is taller than the card, it scrolls inside.',
      mkGrid: 'Switch to blocks', noGrid: 'Original layout', tidy: 'Tidy gaps', tidyDone: 'Moved cards up to fill gaps.', noRoom: 'Not enough room to move it there.' },
  };
  var lang = function () { return /^en/i.test(document.documentElement.lang || '') ? 'en' : 'ko'; };
  var t = function (k, a, b) { var v = T[lang()][k]; return typeof v === 'function' ? v(a, b) : v; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var screenOf = function () { var w = window.innerWidth; for (var i = 0; i < SCREENS.length; i++) if (w <= SCREENS[i].max) return SCREENS[i].id; return 'desktop'; };
  var page = (location.pathname.replace(/\/index\.html?$/, '').replace(/\/+$/, '') || '/');
  var keyOf = function (screen) { return PREFIX + page + ':' + screen; };
  var canSave = true;
  function load(screen) { try { var v = JSON.parse(localStorage.getItem(keyOf(screen)) || 'null'); return v && typeof v === 'object' ? v : null; } catch (e) { return null; } }
  function save(screen, v) { try { localStorage.setItem(keyOf(screen), JSON.stringify(v)); canSave = true; } catch (e) { canSave = false; } }
  function drop(screen) { try { localStorage.removeItem(keyOf(screen)); } catch (e) {} }

  var GENERIC = { section: 1, card: 1, panel: 1, 'log-panel': 1, box: 1 };
  function boxes() { return [].slice.call(document.querySelectorAll('[data-wl-cards]')); }
  function boxId(box, i) { return box.id || box.getAttribute('data-wl-cards-id') || ('box' + i); }
  /** 묶음 안의 카드 목록 [{ el, key }] — 같은 이름이 겹치면 뒤에 #2, #3 을 붙인다 */
  function cardsOf(box) {
    var sel = box.getAttribute('data-wl-cards'), base = {};
    (sel.match(/\.[\w-]+/g) || []).forEach(function (c) { base[c.slice(1)] = 1; });
    var seen = {};
    return [].filter.call(box.children, function (el) { return sel ? el.matches(sel) : el.hasAttribute('data-wl-card'); }).map(function (el) {
      var cls = [].filter.call(el.classList, function (c) { return !base[c] && !GENERIC[c] && c.indexOf('wl-cz-') !== 0; })[0];
      var k = el.getAttribute('data-wl-card') || el.id || cls || el.tagName.toLowerCase();
      seen[k] = (seen[k] || 0) + 1;
      return { el: el, key: seen[k] > 1 ? k + '#' + seen[k] : k };
    });
  }
  function titleOf(el, i) {
    var x = (lang() === 'en' && el.getAttribute('data-wl-card-title-en')) || el.getAttribute('data-wl-card-title') || el.getAttribute('data-title');
    if (!x) {
      var h = el.querySelector('h1, h2, h3, legend, summary');
      if (h) { h = h.cloneNode(true); h.querySelectorAll('button, [aria-hidden="true"]').forEach(function (n) { n.remove(); }); }   // 제목 옆 설명 단추 글자는 뺀다
      x = h ? h.textContent : (el.getAttribute('aria-label') || '');
    }
    x = x.replace(/\s+/g, ' ').trim();
    return x ? (x.length > 40 ? x.slice(0, 39) + '…' : x) : t('card') + ' ' + (i + 1);
  }
  var shown = function (el) { return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length); };
  var listed = function (c) { return c.el.classList.contains('wl-cz-off') || shown(c.el); };   // 패널에 보일 카드
  var onPage = function (c) { return shown(c.el) && !c.el.classList.contains('wl-cz-off'); };   // 페이지에 지금 보이는 카드

  /* ── 블럭 배치의 자리 계산 (캠프 & 아웃리치 팀 홈과 같은 규칙) — 자리 하나 = { k: 카드 이름, x, y, w, h } (칸 단위) ── */
  var hitR = function (a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; };
  var byPos = function (a, b) { return a.y - b.y || a.x - b.x; };
  function collides(rs, r, skip) { return rs.some(function (o) { return o.k !== skip && hitR(r, o); }); }
  /** 카드 하나를 r 자리에 놓았을 때 나머지가 어떻게 밀려나는지 — 겹치는 카드는 그 아래로 밀리고, 그 아래 카드도 차례로 밀린다. { 이름: y }, 너무 길어지면 null */
  function reflow(rs, k, r) {
    var placed = [{ k: k, x: r.x, y: r.y, w: r.w, h: r.h }], out = {};
    if (r.y + r.h > MAXR) return null;
    var rest = rs.filter(function (o) { return o.k !== k; }).sort(byPos);
    for (var i = 0; i < rest.length; i++) {
      var o = rest[i], y = o.y;
      while (collides(placed, { x: o.x, y: y, w: o.w, h: o.h })) y++;
      if (y + o.h > MAXR) return null;
      out[o.k] = y; placed.push({ k: o.k, x: o.x, y: y, w: o.w, h: o.h });
    }
    return out;
  }
  /** 빈틈 정리: 위에 있는 카드부터 차례로, 다른 카드에 닿기 전까지 위로 올린다 */
  function tidy(rs) { var placed = []; rs.slice().sort(byPos).forEach(function (o) { var y = 0; while (y < o.y && collides(placed, { x: o.x, y: y, w: o.w, h: o.h })) y++; o.y = y; placed.push(o); }); }
  /** 겹쳐 있으면 아래로 밀어 놓는다 — 숨겼던 카드를 다시 보이거나, 권한에 따라 보이는 카드가 달라질 때 */
  function settle(rs) { var placed = []; rs.slice().sort(byPos).forEach(function (o) { while (collides(placed, o)) o.y++; placed.push(o); }); }
  /** 블럭 배치에서 지금 보이는 카드들의 자리 — 저장된 자리가 없는 카드(새로 생긴 카드)는 맨 아래에 전체 폭으로 붙이고, st.grid 에도 적어 둔다 */
  function gridRects(box, st, list) {
    var g = st.grid, hidden = st.hidden || [], rs = [], add = [], gap = box.__wlCzGapX || 16;
    st.order.forEach(function (k) {
      var c = list.filter(function (x) { return x.key === k; })[0];
      if (!c || hidden.indexOf(k) >= 0 || !shown(c.el)) return;
      var r = g[k];
      if (r && isFinite(r.x) && isFinite(r.y) && isFinite(r.w) && isFinite(r.h)) {
        var w = clamp(Math.round(r.w), MINW, COLS);
        rs.push({ k: k, el: c.el, x: clamp(Math.round(r.x), 0, COLS - w), y: clamp(Math.round(r.y), 0, MAXR), w: w, h: clamp(Math.round(r.h), MINH, MAXR) });
      } else add.push(c);
    });
    if (!drag) settle(rs);   // 끄는 동안에는 미리 보기 자리를 그대로 둔다
    var bottom = rs.reduce(function (m, o) { return Math.max(m, o.y + o.h); }, 0);
    add.forEach(function (c) { var h = clamp(Math.ceil((c.el.scrollHeight + gap) / (ROW + gap)), MINH, 30); rs.push({ k: c.key, el: c.el, x: 0, y: bottom, w: COLS, h: h }); bottom += h; });
    rs.forEach(function (o) { g[o.k] = { x: o.x, y: o.y, w: o.w, h: o.h }; });
    return rs;
  }
  /** 블럭 배치로 처음 바꿀 때: 지금 페이지에 보이는 카드의 자리 · 폭 · 높이를 칸으로 옮겨 온다(겹치면 아래로) */
  function deriveGrid(box, list) {
    var cs = getComputedStyle(box), br = box.getBoundingClientRect(), pl = parseFloat(cs.paddingLeft) || 0, gap = box.__wlCzGapX || 16;
    var x0 = br.left + box.clientLeft + pl, W = box.clientWidth - pl - (parseFloat(cs.paddingRight) || 0), sx = (W - gap * (COLS - 1)) / COLS + gap, sy = ROW + gap;
    var vis = list.filter(onPage).map(function (c) { return { k: c.key, r: c.el.getBoundingClientRect() }; }), out = {};
    if (!vis.length) return out;
    var top0 = Math.min.apply(null, vis.map(function (v) { return v.r.top; }));
    var rs = vis.map(function (v) {
      var x = clamp(Math.round((v.r.left - x0) / sx), 0, COLS - MINW), w = clamp(Math.round((v.r.width + gap) / sx), MINW, COLS - x);
      return { k: v.k, x: x, w: w, y: Math.max(0, Math.round((v.r.top - top0) / sy)), h: Math.max(MINH, Math.ceil((v.r.height + gap) / sy)) };
    });
    settle(rs);
    rs.forEach(function (o) { out[o.k] = { x: o.x, y: o.y, w: o.w, h: o.h }; });
    return out;
  }

  /* ── 적용: 꾸민 화면이면 순서 · 숨김 · 배치를 입히고, 아니면 원래대로 ── */
  var natural = {};   // 원래 격자 묶음에서 카드가 원래 차지하던 칸 수 (화면 크기가 바뀌면 다시 잰다)
  var applying = false;
  function cols(box) { var c = getComputedStyle(box).gridTemplateColumns; return c && c !== 'none' ? c.split(' ').length : 1; }
  function measure(box, bi, list) {
    var cs = getComputedStyle(box), tracks = (cs.gridTemplateColumns || '').split(' ').map(parseFloat).filter(function (n) { return n > 0; });
    var colW = tracks[0] || 0, gap = parseFloat(cs.columnGap) || 0, n = tracks.length || 1;
    list.forEach(function (c) {
      var id = boxId(box, bi) + '|' + c.key;
      if (natural[id] || !colW || !c.el.offsetWidth || c.el.style.gridColumn) return;
      natural[id] = Math.max(1, Math.min(n, Math.round((c.el.offsetWidth + gap) / (colW + gap))));
    });
  }
  function clear(box, list) {
    box.classList.remove('wl-cz-on', 'wl-cz-flow', 'wl-cz-grid');
    box.__wlCzGeo = null;
    [].forEach.call(box.children, function (el) {
      el.style.order = '';
      if (el.__wlCzSet) { el.__wlCzSet = 0; el.style.gridColumn = ''; el.style.gridRow = ''; }
    });
    list.forEach(function (c) { c.el.style.gridColumn = ''; c.el.style.gridRow = ''; c.el.classList.remove('wl-cz-off', 'wl-cz-narrow', 'wl-cz-cell'); });
  }
  var useGrid = function (st) { return !!(st && st.grid) && screenOf() !== 'phone'; };
  /** 묶음 하나에 설정(st)을 입힌다 — 저장된 설정이든, 끄는 동안의 임시 설정이든 같은 길로 그린다 */
  function layout(box, bi, st, screen) {
    var list = cardsOf(box);
    // 원래 격자인 묶음인지 · 원래 카드 사이 간격은 내가 바꾸기 전 모양에서 잰다
    var ours = box.classList.contains('wl-cz-flow') || box.classList.contains('wl-cz-grid');
    if (!ours) {
      var cs = getComputedStyle(box), grid = /grid/.test(cs.display), lay = grid || /flex/.test(cs.display);
      box.__wlCzNative = grid;
      box.__wlCzGapX = lay ? parseFloat(cs.columnGap) || 16 : 16;
      if (grid) measure(box, bi, list);
    }
    if (!st || !list.length) { clear(box, list); return; }
    var gridOn = screen !== 'phone' && !!st.grid, native = box.__wlCzNative;
    if (!gridOn && box.classList.contains('wl-cz-grid')) clear(box, list);   // 블럭 배치에서 페이지 배치로 돌아갈 때는 먼저 원래대로
    box.classList.add('wl-cz-on'); box.classList.toggle('wl-cz-flow', !gridOn && !native); box.classList.toggle('wl-cz-grid', gridOn);
    var kids = [].slice.call(box.children), byKey = {}, slots = [];
    kids.forEach(function (el, i) { el.style.order = String(i * 10); });
    list.forEach(function (c) { byKey[c.key] = c; slots.push(kids.indexOf(c.el)); });
    var order = (st.order || []).filter(function (k) { return byKey[k]; });
    list.forEach(function (c) { if (order.indexOf(c.key) < 0) order.push(c.key); });
    var hidden = st.hidden || [];
    order.forEach(function (k, i) {
      var c = byKey[k];
      c.el.style.order = String(slots[i] * 10);
      c.el.classList.toggle('wl-cz-off', hidden.indexOf(k) >= 0);
    });
    if (gridOn) { st.order = order; st.grid = st.grid || {}; placeGrid(box, st, list); return; }
    var n = native ? cols(box) : 6;
    order.forEach(function (k) {
      var c = byKey[k], span = native ? (natural[boxId(box, bi) + '|' + k] || n) : n;
      c.el.style.gridColumn = span >= n ? '1 / -1' : 'span ' + span;
      if (native) c.el.style.gridRow = 'auto';
      c.el.classList.remove('wl-cz-narrow', 'wl-cz-cell');
    });
  }
  /** 블럭 배치: 카드를 정한 칸에 놓는다. 카드가 아닌 자식(날짜 줄 같은 것)은 카드보다 앞에 있으면 맨 위, 뒤에 있으면 맨 아래에 전체 폭으로 둔다. */
  function placeGrid(box, st, list) {
    var kids = [].slice.call(box.children), cardEls = list.map(function (c) { return c.el; }), first = Math.min.apply(null, cardEls.map(function (el) { return kids.indexOf(el); }));
    var top = [], bottom = [];
    kids.forEach(function (el, i) {
      if (cardEls.indexOf(el) >= 0 || /^(SCRIPT|STYLE|TEMPLATE|LINK|META)$/.test(el.tagName)) return;
      el.__wlCzSet = 1; el.style.gridColumn = '1 / -1'; (i < first ? top : bottom).push(el);
    });
    var rs = gridRects(box, st, list), N = top.length, R = 0, byK = {};
    rs.forEach(function (o) { R = Math.max(R, o.y + o.h); byK[o.k] = o; });
    if (drag && drag.box === box && drag.ghost) R = Math.max(R, drag.ghost.y + drag.ghost.h);
    R = Math.max(1, R + (panel ? SPARE : 0));   // 꾸미는 중에는 아래로 끌어 놓을 빈 줄을 남긴다
    box.style.setProperty('--wl-cz-gap', box.__wlCzGapX + 'px');
    box.style.setProperty('--wl-cz-tracks', top.map(function () { return 'auto'; }).concat(['repeat(' + R + ', ' + ROW + 'px)'], bottom.map(function () { return 'auto'; })).join(' '));
    top.forEach(function (el, i) { el.style.gridRow = String(i + 1); });
    bottom.forEach(function (el, i) { el.style.gridRow = String(N + R + i + 1); });
    list.forEach(function (c) {
      var o = byK[c.key];
      c.el.classList.toggle('wl-cz-cell', !!o);
      if (!o) return;
      c.el.style.gridColumn = (o.x + 1) + ' / span ' + o.w;
      c.el.style.gridRow = (N + o.y + 1) + ' / span ' + o.h;
      c.el.classList.toggle('wl-cz-narrow', o.w <= 8);
    });
    box.__wlCzGeo = { N: N, R: R, rects: rs };
    if (panel) cellsBg(box);
  }
  /** 블럭 배치 묶음의 칸 크기와 화면 위 위치 */
  function metrics(box) {
    var geo = box.__wlCzGeo; if (!geo) return null;
    var cs = getComputedStyle(box), r = box.getBoundingClientRect(), gap = parseFloat(cs.columnGap) || 0, rgap = parseFloat(cs.rowGap) || 0;
    var pl = parseFloat(cs.paddingLeft) || 0, pt = parseFloat(cs.paddingTop) || 0, W = box.clientWidth - pl - (parseFloat(cs.paddingRight) || 0);
    var tr = cs.gridTemplateRows.split(' ').map(parseFloat), off = 0;
    for (var i = 0; i < geo.N; i++) off += (tr[i] || 0) + rgap;
    var colW = (W - gap * (COLS - 1)) / COLS;
    return { gap: gap, rgap: rgap, colW: colW, sx: colW + gap, sy: ROW + rgap, left: pl, top: pt + off, W: W, x0: r.left + box.clientLeft + pl, y0: r.top + box.clientTop + pt + off };
  }
  var cellRect = function (m, o) { return { left: m.x0 + o.x * m.sx, top: m.y0 + o.y * m.sy, width: o.w * m.sx - m.gap, height: o.h * m.sy - m.rgap }; };
  /** 꾸미는 중: 묶음 바탕에 점선 칸을 깐다(카드 뒤에 깔리도록 묶음의 ::before 로) */
  function cellsBg(box) {
    var m = metrics(box), geo = box.__wlCzGeo; if (!m || !(m.colW > 0)) return;
    var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='" + m.sx.toFixed(2) + "' height='" + m.sy + "'><rect x='.75' y='.75' width='" + (m.colW - 1.5).toFixed(2) + "' height='" + (ROW - 1.5) + "' rx='7' fill='rgba(255,255,255,.45)' stroke='#b9d3dc' stroke-width='1.2' stroke-dasharray='4 3'/></svg>";
    var s = box.style;
    s.setProperty('--wl-cz-cells', 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")');
    s.setProperty('--wl-cz-cx', m.left + 'px'); s.setProperty('--wl-cz-cy', m.top + 'px');
    s.setProperty('--wl-cz-cw', (m.W + m.gap) + 'px'); s.setProperty('--wl-cz-ch', (geo.R * m.sy - m.rgap) + 'px');
    s.setProperty('--wl-cz-sx', m.sx + 'px'); s.setProperty('--wl-cz-sy', m.sy + 'px');
  }
  function apply() {
    if (applying || drag) return; applying = true;
    var screen = screenOf(), saved = load(screen) || {};
    boxes().forEach(function (box, bi) {
      box.__wlCzShown = shown(box);
      if (!box.__wlCzShown) return;   // 아직 안 보이는 묶음(로그인 전 · 카드를 그리기 전)은 보일 때 입힌다
      var st = (saved.boxes || {})[boxId(box, bi)];
      layout(box, bi, st ? boxState({ boxes: (saved.boxes || {}) }, bi) : null, screen);
    });
    applying = false;
    syncFab();
  }

  /* ── 다시 그리는 페이지: 묶음 안이 바뀌면 다시 입힌다 ── */
  var pending = 0;
  var later = function () { if (pending) return; pending = requestAnimationFrame(function () { pending = 0; apply(); if (panel) paint(); }); };
  var observer = new MutationObserver(function (records) { if (records.some(function (r) { return r.type === 'childList'; })) later(); });
  // 묶음이나 그 위 요소의 hidden · class 가 바뀌면(로그인 뒤 화면이 나타날 때) 다시 입힌다
  var shownWatch = new MutationObserver(function () { if (boxes().some(function (b) { return shown(b) !== b.__wlCzShown; })) later(); });
  function watch() {
    boxes().forEach(function (box) {
      if (box.__wlCz) return; box.__wlCz = 1;
      observer.observe(box, { childList: true });
      for (var el = box; el && el !== document.documentElement; el = el.parentElement) shownWatch.observe(el, { attributes: true, attributeFilter: ['hidden', 'class'] });
    });
  }
  var lastScreen = null;
  window.addEventListener('resize', function () {
    var s = screenOf();
    if (s !== lastScreen) { lastScreen = s; natural = {}; boxes().forEach(function (b) { clear(b, cardsOf(b)); }); apply(); if (panel) paint(); }
    else if (panel) boxes().forEach(function (b) { if (b.classList.contains('wl-cz-grid')) cellsBg(b); });   // 같은 화면 크기 안에서 폭만 바뀌면 칸 바탕만 다시 맞춘다
  });

  /* ── 꾸미기 단추와 패널 ── */
  var fab = null, panel = null, note = '';
  var ICON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>';
  function visibleCards() { var n = 0; boxes().forEach(function (b) { cardsOf(b).forEach(function (c) { if (listed(c)) n++; }); }); return n; }
  function syncFab() {
    if (!fab) return;
    fab.hidden = !panel && visibleCards() < 2;   // 로그인 화면처럼 카드가 안 보일 때는 단추도 숨긴다
    fab.title = t('open'); fab.setAttribute('aria-label', t('open'));
  }
  function state(screen) { var v = load(screen) || {}; v.boxes = v.boxes || {}; return v; }
  /** 묶음 하나의 설정 — 저장된 것이 없으면 지금 모양 그대로(원래 순서 · 모두 보이기 · 페이지 배치) */
  function boxState(v, bi) {
    var box = boxes()[bi], list = cardsOf(box), st = v.boxes[boxId(box, bi)];
    st = st ? JSON.parse(JSON.stringify(st)) : { order: list.map(function (c) { return c.key; }), hidden: [] };
    st.order = st.order || []; st.hidden = st.hidden || [];
    delete st.width; delete st.blocks;   // 예전 너비(기본 · 전체 · 반 · 1/3) · 줄 블럭 설정은 지금 블럭 배치로 바뀌어 쓰지 않는다
    list.forEach(function (c) { if (st.order.indexOf(c.key) < 0) st.order.push(c.key); });
    st.order = st.order.filter(function (k) { return list.some(function (c) { return c.key === k; }); });
    if (!st.grid || typeof st.grid !== 'object' || Array.isArray(st.grid)) delete st.grid;
    return st;
  }
  function edit(bi, fn) {
    var screen = screenOf(), v = state(screen), box = boxes()[bi], list = cardsOf(box), st = boxState(v, bi);
    if (fn(st, list, box) === false) return;
    v.boxes[boxId(box, bi)] = st; save(screen, v); if (!note || note === t('saved') || note === t('noSave')) note = canSave ? t('saved') : t('noSave'); apply(); paint();
  }
  function paint() {
    if (!panel) return;
    var old = panel.querySelector('.wl-cz-list'), scroll = old ? old.scrollTop : 0;
    var screen = screenOf(), v = load(screen), vs = state(screen), all = boxes(), gridOn = false;
    var parts = all.map(function (box, bi) {
      var list = cardsOf(box), byKey = {};
      list.forEach(function (c, i) { c.title = titleOf(c.el, i); byKey[c.key] = c; });
      if (!list.some(listed)) return '';
      var st = boxState(vs, bi), ug = useGrid(st);
      if (ug) gridOn = true;
      var order = st.order.filter(function (k) { return listed(byKey[k]); });
      if (ug) {   // 블럭 배치: 자리는 페이지에서 끌어 정하고, 목록은 보이는 순서(위 → 아래, 왼쪽 → 오른쪽)대로 보이기만 고른다
        var g = st.grid || {}, pos = function (k) { var r = g[k] || { x: 0, y: 1e4 }; return r.y * COLS + r.x; };
        order.sort(function (a, b) { return pos(a) - pos(b); });
      }
      var row = function (k, i) {
        var off = st.hidden.indexOf(k) >= 0, c = byKey[k];
        return '<li class="wl-cz-row' + (off ? ' is-off' : '') + '" data-b="' + bi + '" data-k="' + esc(k) + '">' +
          '<button type="button" class="wl-cz-name" data-go>' + esc(c.title) + (off ? ' <small>' + esc(t('hiddenTag')) + '</small>' : '') + '</button>' +
          '<span class="wl-cz-btns">' +
            (ug ? '' : '<button type="button" data-mv="-1" aria-label="' + esc(t('up')) + '" title="' + esc(t('up')) + '"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
              '<button type="button" data-mv="1" aria-label="' + esc(t('down')) + '" title="' + esc(t('down')) + '"' + (i === order.length - 1 ? ' disabled' : '') + '>↓</button>') +
            '<button type="button" data-eye class="wl-cz-eye">' + esc(off ? t('show') : t('hide')) + '</button>' +
          '</span>' +
        '</li>';
      };
      var mode = screen === 'phone' ? '' : ug
        ? '<li class="wl-cz-mode" data-b="' + bi + '"><p>' + esc(t('gridMode')) + '</p><span class="wl-cz-modebtns"><button type="button" class="wl-cz-ghost" data-tidy>' + esc(t('tidy')) + '</button><button type="button" class="wl-cz-ghost" data-nogrid>' + esc(t('noGrid')) + '</button></span></li>'
        : '<li class="wl-cz-mode" data-b="' + bi + '"><p>' + esc(t('pageMode')) + '</p><span class="wl-cz-modebtns"><button type="button" class="wl-cz-ghost wl-cz-pri" data-mkgrid>' + esc(t('mkGrid')) + '</button></span></li>';
      return mode + order.map(row).join('');
    }).filter(Boolean).join('<li class="wl-cz-group" aria-hidden="true"></li>');
    var others = SCREENS.filter(function (s) { return s.id !== screen && load(s.id); }).map(function (s) { return '<button type="button" class="wl-cz-ghost" data-copy="' + s.id + '">' + esc(t('copyFrom', t(s.id))) + '</button>'; }).join('');
    panel.innerHTML = '<div class="wl-cz-head"><strong>' + esc(t('title')) + '</strong><button type="button" class="wl-cz-x" data-close aria-label="' + esc(t('close')) + '">×</button></div>' +
      '<p class="wl-cz-where">' + esc(t('where', t(screen), window.innerWidth)) + (screen === 'phone' ? '<br>' + esc(t('phoneWidth')) : '') + '</p>' +
      '<p class="wl-cz-hint">' + esc(t(screen === 'phone' ? 'dragHintPhone' : gridOn ? 'dragHintGrid' : 'dragHint')) + '</p>' +
      '<ol class="wl-cz-list">' + parts + '</ol>' +
      (note ? '<p class="wl-cz-note" role="status">' + esc(note) + '</p>' : '') +
      '<div class="wl-cz-foot">' + others + '<button type="button" class="wl-cz-ghost" data-reset' + (v ? '' : ' disabled') + '>' + esc(t('reset')) + '</button><button type="button" class="wl-cz-done" data-close>' + esc(t('done')) + '</button></div>';
    var list = panel.querySelector('.wl-cz-list'); if (list) list.scrollTop = scroll;   // 고칠 때마다 목록이 맨 위로 튀지 않게
  }
  function focusCard(bi, k, scroll) {
    document.querySelectorAll('.wl-cz-focus').forEach(function (el) { el.classList.remove('wl-cz-focus'); });
    if (k == null) return;
    var c = cardsOf(boxes()[bi]).filter(function (x) { return x.key === k; })[0];
    if (!c) return;
    c.el.classList.add('wl-cz-focus');
    if (scroll && shown(c.el)) c.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function openPanel() {
    if (panel) return closePanel();
    panel = document.createElement('div');
    panel.className = 'wl-cz-panel'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', t('title'));
    document.body.appendChild(panel);
    document.documentElement.classList.add('wl-cz-editing');
    note = ''; apply(); paint(); handlesOn();   // 꾸미는 중에는 아래에 빈 줄을 남기고 칸 바탕을 깐다
    fab.setAttribute('aria-expanded', 'true');
    panel.addEventListener('click', onPanelClick);
    panel.addEventListener('mouseover', function (e) { var r = e.target.closest('.wl-cz-row'); focusCard(r ? +r.dataset.b : 0, r ? r.dataset.k : null, false); });
    panel.addEventListener('mouseleave', function () { focusCard(0, null); });
  }
  function closePanel() {
    if (!panel) return;
    panel.remove(); panel = null; focusCard(0, null); handlesOff();
    document.documentElement.classList.remove('wl-cz-editing');
    apply();
    fab.setAttribute('aria-expanded', 'false'); fab.focus(); syncFab();
  }
  function onPanelClick(e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.hasAttribute('data-close')) return closePanel();
    var screen = screenOf();
    note = '';
    if (b.hasAttribute('data-reset')) { drop(screen); natural = {}; note = t('resetDone'); apply(); paint(); return; }
    if (b.dataset.copy) { var from = load(b.dataset.copy); if (from) { save(screen, from); note = canSave ? t('copied') : t('noSave'); apply(); paint(); } return; }
    var at = b.closest('[data-b]'); if (!at) return;
    var bi = +at.dataset.b, k = at.dataset.k;
    if (b.hasAttribute('data-mkgrid')) return edit(bi, function (st, list, box) { st.grid = deriveGrid(box, list); });
    if (b.hasAttribute('data-nogrid')) return edit(bi, function (st) { delete st.grid; });
    if (b.hasAttribute('data-tidy')) return edit(bi, function (st, list, box) { var rs = gridRects(box, st, list); tidy(rs); rs.forEach(function (o) { st.grid[o.k].y = o.y; }); note = t('tidyDone'); });
    if (k == null) return;
    if (b.hasAttribute('data-go')) { focusCard(bi, k, true); return; }
    if (b.dataset.mv) return edit(bi, function (st, list) {
      // 보이지 않는 카드는 건너뛰고, 보이는 바로 옆 카드와 자리를 바꾼다
      var d = +b.dataset.mv, i = st.order.indexOf(k), j = i + d;
      var vis = function (key) { return list.some(function (c) { return c.key === key && listed(c); }); };
      while (j >= 0 && j < st.order.length && !vis(st.order[j])) j += d;
      if (j < 0 || j >= st.order.length) return false;
      st.order.splice(i, 1); st.order.splice(j, 0, k);
    });
    if (b.hasAttribute('data-eye')) return edit(bi, function (st, list) {
      var i = st.hidden.indexOf(k);
      if (i >= 0) { st.hidden.splice(i, 1); return; }
      var left = list.filter(function (c) { return c.key !== k && st.hidden.indexOf(c.key) < 0 && shown(c.el); }).length;
      if (!left) { note = t('needOne'); paint(); return false; }
      st.hidden.push(k);
    });
  }

  /* ── 페이지에서 바로 끌기 (꾸미기 패널이 열려 있을 때만) ──
     카드 안의 내용은 건드리지 않도록, 손잡이와 놓일 자리 미리 보기는 화면 위에 따로 띄운 층에 그리고 카드 자리를 따라다니게 한다.
     컴퓨터: 카드 아무 데나(링크 · 단추 · 입력칸 빼고) 끌거나 위쪽 손잡이를 끈다. 휴대폰 · 태블릿 손가락: 위쪽 손잡이를 끈다(그래야 화면 스크롤과 안 섞인다).
     블럭 배치면 칸에 맞춰 붙고 겹치는 카드는 아래로 밀려나며, 오른쪽 아래 모서리를 끌어 크기를 바꾼다. 손을 떼면 저장한다. */
  var drag = null, layer = null, handleRaf = 0;
  var SKIP = 'a, button, input, select, textarea, label, summary, [contenteditable], [role="button"], .wl-cz-panel, .wl-cz-fab';
  var GRIP = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
  function cardAt(el) {
    var all = boxes();
    for (var bi = 0; bi < all.length; bi++) {
      var hit = cardsOf(all[bi]).filter(function (c) { return c.el === el || c.el.contains(el); })[0];
      if (hit) return { box: all[bi], bi: bi, card: hit };
    }
    return null;
  }
  function handlesOn() {
    if (!layer) { layer = document.createElement('div'); layer.className = 'wl-cz-layer'; document.body.appendChild(layer); }
    var tick = function () { placeHandles(); handleRaf = requestAnimationFrame(tick); };
    cancelAnimationFrame(handleRaf); tick();
  }
  function handlesOff() {
    cancelAnimationFrame(handleRaf); handleRaf = 0;
    if (layer) { layer.remove(); layer = null; }
    document.querySelectorAll('.wl-cz-card').forEach(function (el) { el.classList.remove('wl-cz-card'); });
  }
  /** 보이는 카드마다 위쪽 가운데에 옮기기 손잡이, 블럭 배치면 오른쪽 아래에 크기 손잡이와 끄는 동안 놓일 자리를 둔다(화면 좌표라 어떤 스크롤에서도 맞는다) */
  function placeHandles() {
    if (!layer) return;
    var vh = window.innerHeight, seen = {};
    var get = function (cls, id, html) {
      var h = layer.querySelector('[data-id="' + CSS.escape(id) + '"]');
      if (!h) { h = document.createElement('span'); h.className = cls; h.setAttribute('data-id', id); h.setAttribute('aria-hidden', 'true'); if (html) h.innerHTML = html; layer.appendChild(h); }
      seen[id] = 1; return h;
    };
    boxes().forEach(function (box, bi) {
      var grid = box.classList.contains('wl-cz-grid') && shown(box);
      if (grid && drag && drag.box === box && drag.ghost) {
        var m = metrics(box);
        if (m) {
          var r = cellRect(m, drag.ghost), gh = get('wl-cz-drop', 'h|' + bi);
          gh.style.transform = 'translate(' + Math.round(r.left) + 'px,' + Math.round(r.top) + 'px)';
          gh.style.width = Math.round(r.width) + 'px'; gh.style.height = Math.round(r.height) + 'px';
          gh.classList.toggle('bad', !!drag.bad);
        }
      }
      cardsOf(box).forEach(function (c) {
        var vis = onPage(c);
        c.el.classList.toggle('wl-cz-card', vis);
        if (!vis) return;
        var r = c.el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh || r.width < 40) return;
        var g = get('wl-cz-grip', 'g|' + bi + '|' + c.key, GRIP);
        g.title = t('dragMove');
        g.style.transform = 'translate(' + Math.round(r.left + r.width / 2 - 24) + 'px,' + Math.round(Math.max(r.top + 6, Math.min(r.bottom - 34, 6))) + 'px)';
        g.classList.toggle('is-drag', !!(drag && drag.el === c.el && drag.mode !== 'size'));
        if (!grid || r.bottom > vh + 20) return;
        var z = get('wl-cz-rz', 'z|' + bi + '|' + c.key);
        z.title = t('dragSize');
        z.style.transform = 'translate(' + Math.round(r.right - 24) + 'px,' + Math.round(r.bottom - 24) + 'px)';
        z.classList.toggle('is-drag', !!(drag && drag.el === c.el && drag.mode === 'size'));
      });
    });
    [].slice.call(layer.children).forEach(function (h) { if (!seen[h.getAttribute('data-id')]) h.remove(); });
  }
  /** 다른 카드가 새 자리로 스르륵 움직이게(FLIP) 하면서 설정을 다시 입힌다 */
  function relayout(box, bi, st, skip) {
    var els = cardsOf(box).map(function (c) { return c.el; }).filter(function (el) { return el !== skip && shown(el); });
    var before = els.map(function (el) { return el.getBoundingClientRect(); });
    layout(box, bi, st, screenOf());
    els.forEach(function (el, i) {
      var a = before[i], b = el.getBoundingClientRect(), dx = a.left - b.left, dy = a.top - b.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      el.style.transition = 'none'; el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; el.getBoundingClientRect();
      el.style.transition = 'transform .2s ease'; el.style.transform = '';
      setTimeout(function () { el.style.transition = ''; }, 220);
    });
  }
  /** 보이는 카드들의 순서를 새로 정한다 — 숨긴 카드는 원래 자리를 지킨다 */
  function setVisible(st, list, keys) {
    var vis = {}; list.forEach(function (c) { if (onPage(c)) vis[c.key] = 1; });
    var i = 0; st.order = st.order.map(function (k) { return vis[k] ? keys[i++] : k; });
  }
  /** 끌기 공통: 손가락 · 마우스를 따라 step 을 부르고(화면 가장자리면 저절로 스크롤), 손을 떼면 바뀐 설정을 저장한다 */
  function track(e, st, before, bi, box, step, done) {
    var v = state(screenOf()), timer = 0;
    var onMove = function (ev) { drag.x = ev.clientX; drag.y = ev.clientY; ev.preventDefault(); step(); };
    var onScroll = function () { step(); };   // 마우스 휠로 스크롤해도 카드가 커서를 따라간다
    var loop = function () {   // 화면 위 · 아래 가장자리 근처면 저절로 스크롤 (가까울수록 빠르게)
      var vh = window.innerHeight, edge = Math.min(100, vh * 0.18), sp = 0, y = drag.y;
      if (y < edge) sp = -Math.ceil((edge - Math.max(0, y)) / edge * 14) - 2; else if (y > vh - edge) sp = Math.ceil((Math.min(vh, y) - (vh - edge)) / edge * 14) + 2;
      if (sp) window.scrollBy(0, sp);
    };
    var end = function (commit) {
      clearInterval(timer);
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancel); window.removeEventListener('scroll', onScroll);
      if (done) done(commit);
      document.documentElement.classList.remove('wl-cz-dragging');
      drag = null;
      eatClick = true; setTimeout(function () { eatClick = false; }, 80);   // 손을 뗄 때 생기는 누르기는 무시한다
      if (commit && JSON.stringify(st) !== before) {
        v.boxes[boxId(box, bi)] = st; save(screenOf(), v); note = canSave ? t('saved') : t('noSave');
      }
      apply(); paint();
    };
    var up = function () { end(true); }, cancel = function () { end(false); };
    drag.x = e.clientX; drag.y = e.clientY;
    document.addEventListener('pointermove', onMove, { passive: false }); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', cancel);
    window.addEventListener('scroll', onScroll, { passive: true });
    timer = setInterval(loop, 16);
    step();
  }
  function startDrag(e, hit, mode) {
    var box = hit.box, bi = hit.bi, el = hit.card.el, key = hit.card.key, st = boxState(state(screenOf()), bi), list = cardsOf(box);
    if (useGrid(st)) return gridDrag(e, hit, mode || 'move', st);
    var before = JSON.stringify(st), r0 = el.getBoundingClientRect(), gx = e.clientX - r0.left, gy = e.clientY - r0.top;
    drag = { el: el, mode: 'move', box: box };
    document.documentElement.classList.add('wl-cz-dragging');
    el.classList.add('wl-cz-moving');
    layout(box, bi, st, screenOf());   // 아직 꾸민 적 없는 화면이면 여기서 꾸미기 모양으로 바뀐다
    var follow = function () {
      el.style.transform = ''; var b = el.getBoundingClientRect();
      el.style.transform = 'translate(' + (drag.x - gx - b.left) + 'px,' + (drag.y - gy - b.top) + 'px)';
    };
    var visKeys = function () { return st.order.filter(function (k) { return list.some(function (c) { return c.key === k && onPage(c); }); }); };
    track(e, st, before, bi, box, function () {   // 페이지 배치: 보이는 카드 사이에서 순서만 바꾼다
      var others = list.filter(function (c) { return c.el !== el && onPage(c); }).map(function (c) { return { key: c.key, r: c.el.getBoundingClientRect() }; });
      if (!others.length) return follow();
      var x = drag.x, y = drag.y, tgt = null;
      others.forEach(function (o) { if (x >= o.r.left && x <= o.r.right && y >= o.r.top && y <= o.r.bottom) tgt = o; });
      var ord = visKeys().filter(function (k) { return k !== key; }), at = -1;
      if (tgt) {
        var wide = tgt.r.width >= box.clientWidth * 0.9, first = wide ? y < tgt.r.top + tgt.r.height / 2 : x < tgt.r.left + tgt.r.width / 2;
        at = ord.indexOf(tgt.key) + (first ? 0 : 1);
      } else {
        var top = Math.min.apply(null, others.map(function (o) { return o.r.top; })), bottom = Math.max.apply(null, others.map(function (o) { return o.r.bottom; }));
        if (y > bottom) at = ord.length; else if (y < top) at = 0;
      }
      if (at >= 0) {
        ord.splice(at, 0, key);
        if (ord.join('\n') !== visKeys().join('\n')) { el.style.transform = ''; setVisible(st, list, ord); relayout(box, bi, st, el); }
      }
      follow();
    }, function () { el.style.transform = ''; el.classList.remove('wl-cz-moving'); });
  }
  /** 블럭 배치에서 끌기 — move: 칸에 맞춰 옮기기, size: 오른쪽 아래 모서리로 크기 바꾸기. 겹치는 카드는 아래로 밀려나는 모습을 미리 보여 주고, 자리가 모자라면 원래대로 */
  function gridDrag(e, hit, mode, st) {
    var box = hit.box, bi = hit.bi, el = hit.card.el, key = hit.card.key, list = cardsOf(box);
    layout(box, bi, st, screenOf());
    var before = JSON.stringify(st), base = JSON.parse(JSON.stringify(st.grid)), r0 = base[key], m = metrics(box);
    if (!r0 || !m) return;
    var x0 = e.clientX, y0 = e.clientY, s0 = window.scrollY, cur = { x: r0.x, y: r0.y, w: r0.w, h: r0.h }, pushed = null, last = '';
    drag = { el: el, mode: mode, box: box, ghost: cur, bad: false };
    document.documentElement.classList.add('wl-cz-dragging');
    el.classList.add(mode === 'move' ? 'wl-cz-moving' : 'wl-cz-sizing');
    var rectsOf = function () { return Object.keys(base).filter(function (k) { return list.some(function (c) { return c.key === k && onPage(c); }); }).map(function (k) { var r = base[k]; return { k: k, x: r.x, y: r.y, w: r.w, h: r.h }; }); };
    var rs = rectsOf();
    track(e, st, before, bi, box, function () {
      var px = drag.x - x0, py = drag.y - y0 + (window.scrollY - s0), dx = px / m.sx, dy = py / m.sy;   // 스크롤한 만큼도 움직인 것으로 센다
      if (mode === 'move') { cur = { x: clamp(Math.round(r0.x + dx), 0, COLS - r0.w), y: Math.max(0, Math.round(r0.y + dy)), w: r0.w, h: r0.h }; el.style.transform = 'translate(' + px + 'px,' + py + 'px)'; }
      else cur = { x: r0.x, y: r0.y, w: clamp(Math.round(r0.w + dx), MINW, COLS - r0.x), h: clamp(Math.round(r0.h + dy), MINH, MAXR) };
      drag.ghost = cur;
      var sig = cur.x + ',' + cur.y + ',' + cur.w + ',' + cur.h;
      if (sig === last) return; last = sig;
      pushed = reflow(rs, key, cur); drag.bad = !pushed;
      var g = JSON.parse(JSON.stringify(base));
      if (pushed) Object.keys(pushed).forEach(function (k) { g[k].y = pushed[k]; });
      g[key] = mode === 'size' ? { x: cur.x, y: cur.y, w: cur.w, h: cur.h } : r0;   // 옮기는 카드는 원래 칸에 둔 채 손을 따라 떠다닌다
      st.grid = g; relayout(box, bi, st, el);
    }, function (commit) {
      el.style.transform = ''; el.classList.remove('wl-cz-moving', 'wl-cz-sizing');
      var g = JSON.parse(JSON.stringify(base));
      if (commit && pushed) { Object.keys(pushed).forEach(function (k) { g[k].y = pushed[k]; }); g[key] = { x: cur.x, y: cur.y, w: cur.w, h: cur.h }; }
      else if (commit && drag.bad) note = t('noRoom');
      st.grid = g;
    });
  }
  var eatClick = false;
  document.addEventListener('click', function (e) { if (eatClick) { eatClick = false; e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('pointerdown', function (e) {
    if (!panel || drag || e.button > 0) return;
    var h = e.target.closest && e.target.closest('.wl-cz-grip, .wl-cz-rz');
    if (h) {
      e.preventDefault(); e.stopPropagation();
      var p = h.getAttribute('data-id').split('|'), bi = +p[1], box = boxes()[bi], k = p.slice(2).join('|');
      var card = box && cardsOf(box).filter(function (c) { return c.key === k; })[0];
      return card && startDrag(e, { box: box, bi: bi, card: card }, p[0] === 'z' ? 'size' : 'move');
    }
    if (e.pointerType !== 'mouse' || e.target.closest(SKIP)) return;
    var hit = cardAt(e.target); if (!hit || !onPage(hit.card)) return;
    // 마우스: 조금 움직였을 때만 끌기로 본다 — 그냥 누르면 원래 하던 일(펼치기 등)을 그대로 한다
    var x0 = e.clientX, y0 = e.clientY;
    var mv = function (ev) { if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 6) return; stop(); startDrag({ clientX: x0, clientY: y0 }, hit, 'move'); };
    var stop = function () { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', stop); };
    document.addEventListener('pointermove', mv); document.addEventListener('pointerup', stop);
  }, true);

  function start() {
    if (!boxes().length) return;
    lastScreen = screenOf();
    watch(); apply();
    fab = document.createElement('button');
    fab.type = 'button'; fab.className = 'wl-cz-fab'; fab.innerHTML = ICON; fab.setAttribute('aria-expanded', 'false');
    fab.addEventListener('click', openPanel);
    document.body.appendChild(fab);
    syncFab();
    // 로그인 뒤에 카드가 나타나는 페이지가 많아서, 보이는 카드 수를 가끔 다시 센다(단추를 보일지 정하는 데만 쓴다)
    setInterval(function () { watch(); if (boxes().some(function (b) { return shown(b) !== b.__wlCzShown; })) later(); syncFab(); }, 1500);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel) closePanel(); });
    // 언어를 바꾸면 패널 글자도 바꾼다
    new MutationObserver(function () { syncFab(); if (panel) paint(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }
  window.WolkoCustomize = { apply: apply };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
