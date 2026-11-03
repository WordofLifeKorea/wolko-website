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
 *   블럭 배치 — 줄마다 블럭(칸)을 나누고(폭은 12칸 눈금 위에서 자유롭게), 카드를 블럭에 넣으면 그 블럭 안에서 위에서부터 쌓인다.
 *     옆 블럭 카드 높이에 끌려 빈 틈이 생기지 않도록 묶음을 아주 얇은 줄 격자로 바꾸고, 카드마다 제 높이만큼 줄을 차지하게 줄 번호를 정한다.
 *     카드 높이가 바뀌면(내용을 불러오거나 펼칠 때) ResizeObserver 로 다시 잰다.
 * 좁은 블럭의 카드에는 컨테이너 쿼리를 걸어 안의 표 · 격자 · 버튼 줄이 카드 폭에 맞춰 다시 정렬된다(wolko-customize.css).
 */
(function () {
  if (window.WolkoCustomize) return;
  var PREFIX = 'wolko-cz:v1:';
  var SCREENS = [{ id: 'phone', max: 639 }, { id: 'tablet', max: 1023 }, { id: 'desktop', max: Infinity }];
  var COLS = 12, MINW = 2, MAXB = 4, EMPTY_H = 120;   // 눈금 수 · 가장 좁은 블럭(눈금) · 한 줄의 블럭 수 · 꾸미는 중 빈 블럭 높이(px)
  var T = {
    ko: { open: '화면 꾸미기', title: '화면 꾸미기', close: '닫기', done: '완료', reset: '이 화면 처음 모양으로', copyFrom: function (s) { return s + ' 모양 가져오기'; },
      where: function (s, w) { return '지금 화면: ' + s + ' (' + w + 'px) · 이 기기에만 저장돼요. 다른 화면 크기는 그 크기로 열어서 따로 꾸며요.'; },
      phone: '휴대폰', tablet: '태블릿', desktop: '컴퓨터', up: '앞으로', down: '뒤로', show: '보이기', hide: '숨기기', hiddenTag: '숨김',
      card: '카드', needOne: '보이는 카드가 하나는 있어야 해요.', noSave: '이 브라우저에서는 저장할 수 없어서, 페이지를 다시 열면 원래 모양으로 돌아가요.',
      saved: '저장했어요.', resetDone: '처음 모양으로 돌렸어요.', copied: '가져왔어요.', phoneWidth: '휴대폰 화면에서는 카드가 한 줄에 하나씩 나와요. 순서와 보이기만 정할 수 있어요.',
      dragHint: '페이지에서 카드를 끌어 자리를 바꿀 수 있어요.', dragHintPhone: '카드 위쪽 손잡이를 끌어 자리를 바꿀 수 있어요.',
      dragHintBlocks: '카드를 끌어 블럭에 넣으면 그 블럭 안에 위에서부터 쌓여요. 블럭 사이 손잡이를 끌면 폭이 바뀌어요.',
      dragMove: '끌어서 자리 옮기기', dragSplit: '끌어서 블럭 폭 바꾸기',
      pageMode: '지금은 페이지 원래 배치예요. 블럭을 만들면 카드를 블럭마다 위에서부터 쌓을 수 있어요.', mkBlocks: '블럭 만들기', noBlocks: '블럭 없애기',
      blocks: '블럭', block: function (n) { return '블럭 ' + n; }, addBlock: '이 줄에 블럭 더하기', addRow: '줄 더하기', rmBlock: function (n) { return '블럭 ' + n + ' 지우기'; },
      empty: '비어 있어요. 카드를 끌어 넣거나 카드의 블럭 번호를 눌러요.', dropHere: '여기로 카드를 끌어 놓아요', moveTo: '블럭' },
    en: { open: 'Customize this page', title: 'Customize this page', close: 'Close', done: 'Done', reset: 'Reset this screen', copyFrom: function (s) { return 'Use the ' + s + ' layout'; },
      where: function (s, w) { return 'This screen: ' + s + ' (' + w + 'px) · saved on this device only. Open the page at another size to set that layout separately.'; },
      phone: 'phone', tablet: 'tablet', desktop: 'computer', up: 'Move earlier', down: 'Move later', show: 'Show', hide: 'Hide', hiddenTag: 'Hidden',
      card: 'Card', needOne: 'At least one card must stay visible.', noSave: 'This browser cannot save, so the page will go back to its original layout when reopened.',
      saved: 'Saved.', resetDone: 'Back to the original layout.', copied: 'Copied.', phoneWidth: 'On a phone, cards are shown one per row. You can set the order and which cards show.',
      dragHint: 'Drag a card on the page to move it.', dragHintPhone: 'Drag the handle at the top of a card to move it.',
      dragHintBlocks: 'Drag a card into a block and it stacks from the top of that block. Drag the handle between blocks to change their widths.',
      dragMove: 'Drag to move', dragSplit: 'Drag to change block widths',
      pageMode: 'This is the page’s own layout. Make blocks to stack cards from the top of each block.', mkBlocks: 'Make blocks', noBlocks: 'Remove blocks',
      blocks: 'Blocks', block: function (n) { return 'Block ' + n; }, addBlock: 'Add a block to this row', addRow: 'Add a row', rmBlock: function (n) { return 'Remove block ' + n; },
      empty: 'Empty. Drag a card here or press a card’s block number.', dropHere: 'Drag a card here', moveTo: 'Block' },
  };
  var lang = function () { return /^en/i.test(document.documentElement.lang || '') ? 'en' : 'ko'; };
  var t = function (k, a, b) { var v = T[lang()][k]; return typeof v === 'function' ? v(a, b) : v; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pct = function (w) { return Math.round(w / COLS * 100) + '%'; };
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
      var cls = [].filter.call(el.classList, function (c) { return !base[c] && !GENERIC[c]; })[0];
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

  /* ── 블럭: { rows: [[{ id, w }, …], …], at: { 카드 이름: 블럭 id } } — w 는 12칸 중 몇 칸, 블럭 번호는 읽는 순서(줄마다 왼쪽부터) ── */
  function flat(bl) {
    var out = [], n = 0;
    bl.rows.forEach(function (row, r) { var s = 0; row.forEach(function (b, j) { out.push({ id: b.id, w: b.w, r: r, j: j, start: s, num: ++n }); s += b.w; }); });
    return out;
  }
  function newId(bl) { var m = 0; bl.rows.forEach(function (row) { row.forEach(function (b) { m = Math.max(m, b.id); }); }); return m + 1; }
  /** 카드가 든 블럭 id — 정해 둔 블럭이 없거나 지워졌으면 첫 블럭 */
  function blockOf(bl, fl, k) { var id = bl.at[k]; return fl.some(function (b) { return b.id === id; }) ? id : fl[0].id; }
  /** 저장된 블럭이 망가졌으면 고친다: 줄마다 폭 합이 12, 블럭은 2칸 이상 · 한 줄에 4개까지(아니면 그 줄을 똑같이 나눈다) */
  function fixBlocks(bl) {
    if (!bl || !Array.isArray(bl.rows)) return null;
    var seen = {};
    var rows = bl.rows.map(function (row) {
      row = (Array.isArray(row) ? row : []).filter(function (b) { var ok = b && typeof b.id === 'number' && !seen[b.id]; if (ok) seen[b.id] = 1; return ok; }).slice(0, MAXB);
      if (!row.length) return null;
      var sum = 0, ok = true;
      row.forEach(function (b) { sum += b.w | 0; if ((b.w | 0) < MINW) ok = false; });
      ok = ok && sum === COLS;
      var even = Math.floor(COLS / row.length);
      return row.map(function (b, j) { return { id: b.id, w: ok ? b.w | 0 : (j < row.length - 1 ? even : COLS - even * (row.length - 1)) }; });
    }).filter(Boolean);
    return rows.length ? { rows: rows, at: bl.at && typeof bl.at === 'object' ? bl.at : {} } : null;
  }
  /** 블럭을 처음 만들 때: 지금 페이지 맨 윗줄 카드들의 폭을 그대로 블럭으로 삼고, 카드는 가운데가 들어가는 블럭에 넣는다 */
  function derive(box, list) {
    var one = { rows: [[{ id: 1, w: COLS }]], at: {} };
    var rs = list.filter(onPage).map(function (c) { return { key: c.key, r: c.el.getBoundingClientRect() }; });
    if (rs.length < 2) return one;
    var minTop = Math.min.apply(null, rs.map(function (x) { return x.r.top; }));
    var first = rs.filter(function (x) { return x.r.top - minTop < 12; }).sort(function (a, b) { return a.r.left - b.r.left; });
    if (first.length < 2 || first.length > MAXB) return one;
    var cs = getComputedStyle(box), br = box.getBoundingClientRect(), pl = parseFloat(cs.paddingLeft) || 0;
    var L = br.left + box.clientLeft + pl, W = box.clientWidth - pl - (parseFloat(cs.paddingRight) || 0);
    var cuts = first.slice(1).map(function (x, i) { return Math.round(((first[i].r.right + x.r.left) / 2 - L) / W * COLS); }).concat([COLS]);
    var ws = [], prev = 0;
    cuts.forEach(function (c) { ws.push(c - prev); prev = c; });
    if (ws.some(function (w) { return w < MINW; })) return one;
    var at = {}, edges = [], acc = 0;
    ws.forEach(function (w) { acc += w; edges.push(L + acc / COLS * W); });
    rs.forEach(function (x) { var cx = (x.r.left + x.r.right) / 2, i = 0; while (i < edges.length - 1 && cx > edges[i]) i++; at[x.key] = i + 1; });
    return { rows: [ws.map(function (w, i) { return { id: i + 1, w: w }; })], at: at };
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
  // 블럭 배치에서 카드 높이가 바뀌면 그 묶음을 다시 쌓는다(높이가 줄 칸에 맞춰 늘어나는 카드가 있어도 끝없이 돌지 않게 1초에 30번까지)
  var ro = window.ResizeObserver ? new ResizeObserver(function (entries) {
    var hit = [];
    entries.forEach(function (e) { var b = e.target.parentElement; if (b && b.__wlCzSt && hit.indexOf(b) < 0) hit.push(b); });
    hit.forEach(function (b) {
      b.__wlCzN = (b.__wlCzN || 0) + 1;
      if (b.__wlCzN === 1) setTimeout(function () { b.__wlCzN = 0; }, 1000);
      if (b.__wlCzN <= 30) stack(b, b.__wlCzSt);
    });
  }) : null;
  function clear(box, list) {
    box.classList.remove('wl-cz-on', 'wl-cz-flow', 'wl-cz-blocks');
    box.__wlCzSt = null; box.__wlCzGeo = null;
    [].forEach.call(box.children, function (el) {
      el.style.order = '';
      if (ro) ro.unobserve(el);
      if (el.__wlCzSet) { el.__wlCzSet = 0; el.style.gridColumn = ''; el.style.gridRow = ''; }
    });
    list.forEach(function (c) { c.el.style.gridColumn = ''; c.el.style.gridRow = ''; c.el.classList.remove('wl-cz-off', 'wl-cz-narrow'); });
  }
  /** 묶음 하나에 설정(st)을 입힌다 — 저장된 설정이든, 끄는 동안의 임시 설정이든 같은 길로 그린다 */
  function layout(box, bi, st, screen) {
    var list = cardsOf(box);
    // 원래 격자인 묶음인지 · 원래 카드 사이 간격은 내가 바꾸기 전 모양에서 잰다
    var ours = box.classList.contains('wl-cz-flow') || box.classList.contains('wl-cz-blocks');
    if (!ours) {
      var cs = getComputedStyle(box), grid = /grid/.test(cs.display), lay = grid || /flex/.test(cs.display);
      box.__wlCzNative = grid;
      box.__wlCzGapX = lay ? parseFloat(cs.columnGap) || 16 : 16;
      box.__wlCzGapY = lay ? parseFloat(cs.rowGap) || 0 : 0;
      if (grid) measure(box, bi, list);
    }
    if (!st || !list.length) { clear(box, list); return; }
    var blocks = screen !== 'phone' ? fixBlocks(st.blocks) : null, native = box.__wlCzNative;
    if (!blocks && box.classList.contains('wl-cz-blocks')) clear(box, list);   // 블럭 배치에서 페이지 배치로 돌아갈 때는 먼저 원래대로
    box.classList.add('wl-cz-on'); box.classList.toggle('wl-cz-flow', !blocks && !native); box.classList.toggle('wl-cz-blocks', !!blocks);
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
    if (blocks) { box.__wlCzSt = { order: order, blocks: blocks }; stack(box, box.__wlCzSt); return; }
    var n = native ? cols(box) : 6;
    order.forEach(function (k) {
      var c = byKey[k], span = native ? (natural[boxId(box, bi) + '|' + k] || n) : n;
      c.el.style.gridColumn = span >= n ? '1 / -1' : 'span ' + span;
      if (native) c.el.style.gridRow = 'auto';
      c.el.classList.remove('wl-cz-narrow');
    });
  }
  /** 블럭 배치: 카드를 제 블럭의 칸에 넣고, 블럭마다 위에서부터 제 높이만큼 줄을 차지하게 쌓는다(줄 하나 = 보통 1px).
      카드가 아닌 자식(날짜 줄 같은 것)은 카드보다 앞에 있으면 맨 위, 뒤에 있으면 맨 아래에 전체 폭으로 둔다. */
  function stack(box, s) {
    var list = cardsOf(box), fl = flat(s.blocks), kids = [].slice.call(box.children), gy = box.__wlCzGapY || 0;
    var cardEls = list.map(function (c) { return c.el; }), first = Math.min.apply(null, cardEls.map(function (el) { return kids.indexOf(el); }));
    var top = [], bottom = [], inBlock = {}, byKey = {}, byId = {};
    box.style.setProperty('--wl-cz-gap', box.__wlCzGapX + 'px');
    kids.forEach(function (el, i) { if (cardEls.indexOf(el) >= 0) return; el.__wlCzSet = 1; el.style.gridColumn = '1 / -1'; (i < first ? top : bottom).push(el); });
    fl.forEach(function (b) { inBlock[b.id] = []; byId[b.id] = b; });
    list.forEach(function (c) { byKey[c.key] = c; });
    s.order.forEach(function (k) {
      var c = byKey[k]; if (!c) return;
      var b = byId[blockOf(s.blocks, fl, k)];
      inBlock[b.id].push(c);
      c.el.style.gridColumn = (b.start + 1) + ' / span ' + b.w;
      c.el.classList.toggle('wl-cz-narrow', b.w <= 8);
    });
    // 폭을 정한 뒤에 높이를 잰다 — 아래 간격은 묶음의 원래 줄 간격, 없으면 카드 바깥 여백, 그것도 없으면 16px
    var hOf = function (el) {
      if (!shown(el)) return 0;
      var cs = getComputedStyle(el), m = (parseFloat(cs.marginTop) || 0) + (parseFloat(cs.marginBottom) || 0);
      return Math.max(1, Math.ceil(el.offsetHeight + m + (gy || (m > 0 ? 0 : 16))));
    };
    var heights = kids.map(hOf), hAt = function (el) { return heights[kids.indexOf(el)]; }, editing = !!panel;
    // 줄 하나의 높이: 브라우저가 격자 줄을 1000개 남짓까지만 그려서, 묶음이 길면 줄을 굵게 잡아 900줄 안에 들게 한다
    var est = 0;
    top.concat(bottom).forEach(function (el) { est += hAt(el); });
    s.blocks.rows.forEach(function (row, r) {
      var m = editing ? EMPTY_H : 0;
      fl.forEach(function (b) { if (b.r !== r) return; var sum = 0; inBlock[b.id].forEach(function (c) { sum += hAt(c.el); }); m = Math.max(m, sum); });
      est += m;
    });
    var U = Math.max(1, Math.ceil(est / 900)), span = function (el) { return Math.ceil(hAt(el) / U); };
    var y = 1, geo = { blocks: [], gapY: gy || 16, unit: U };
    var put = function (el) { var h = span(el); if (!h) return; el.style.gridRow = y + ' / span ' + h; y += h; };
    top.forEach(put);
    s.blocks.rows.forEach(function (row, r) {
      var y0 = y, end = y0, band = [];
      fl.filter(function (b) { return b.r === r; }).forEach(function (b) {
        var cy = y0, any = false;
        inBlock[b.id].forEach(function (c) { var h = span(c.el); if (!h) return; any = true; c.el.style.gridRow = cy + ' / span ' + h; cy += h; });
        if (!any && editing) cy = y0 + Math.ceil((EMPTY_H + geo.gapY) / U);   // 꾸미는 중에는 빈 블럭도 끌어 놓을 자리를 남긴다
        end = Math.max(end, cy);
        band.push({ id: b.id, num: b.num, r: r, j: b.j, start: b.start, w: b.w, y0: y0 - 1, empty: !any });
      });
      band.forEach(function (g) { g.y1 = end - 1; geo.blocks.push(g); });
      y = end;
    });
    bottom.forEach(put);
    box.style.setProperty('--wl-cz-rows', String(Math.max(1, y - 1)));
    box.style.setProperty('--wl-cz-unit', U + 'px');
    box.__wlCzGeo = geo;
    if (ro) kids.forEach(function (el) { ro.observe(el); });
  }
  function apply() {
    if (applying || drag) return; applying = true;
    var screen = screenOf(), saved = load(screen) || {};
    boxes().forEach(function (box, bi) {
      box.__wlCzShown = shown(box);
      if (!box.__wlCzShown) return;   // 아직 안 보이는 묶음(로그인 전 · 카드를 그리기 전)은 보일 때 입힌다
      layout(box, bi, (saved.boxes || {})[boxId(box, bi)], screen);
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
  window.addEventListener('resize', function () { var s = screenOf(); if (s !== lastScreen) { lastScreen = s; natural = {}; boxes().forEach(function (b) { clear(b, cardsOf(b)); }); apply(); if (panel) paint(); } });

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
    delete st.width;   // 예전 너비(기본 · 전체 · 반 · 1/3) 설정은 블럭으로 바뀌어 쓰지 않는다
    list.forEach(function (c) { if (st.order.indexOf(c.key) < 0) st.order.push(c.key); });
    st.order = st.order.filter(function (k) { return list.some(function (c) { return c.key === k; }); });
    st.blocks = fixBlocks(st.blocks); if (!st.blocks) delete st.blocks;
    return st;
  }
  var useBlocks = function (st) { return !!st.blocks && screenOf() !== 'phone'; };
  function edit(bi, fn) {
    var screen = screenOf(), v = state(screen), box = boxes()[bi], list = cardsOf(box), st = boxState(v, bi);
    if (fn(st, list, box) === false) return;
    v.boxes[boxId(box, bi)] = st; save(screen, v); note = canSave ? t('saved') : t('noSave'); apply(); paint();
  }
  /* 블럭 고치기 — 모두 st 를 바꾸고, 바꿀 게 없으면 false */
  function splitRow(bl, r) {   // 줄에 블럭 하나 더: 모두 같은 폭이면 다시 똑같이 나누고, 아니면 가장 넓은 블럭의 반을 떼어 오른쪽 끝에 붙인다
    var row = bl.rows[r]; if (!row || row.length >= MAXB) return false;
    var id = newId(bl), n = row.length + 1;
    if (row.every(function (b) { return b.w === row[0].w; }) && COLS % n === 0) { row.forEach(function (b) { b.w = COLS / n; }); row.push({ id: id, w: COLS / n }); return; }
    var m = 0; row.forEach(function (b, i) { if (b.w > row[m].w) m = i; });
    if (row[m].w < MINW * 2) return false;
    var half = Math.floor(row[m].w / 2); row[m].w -= half; row.push({ id: id, w: half });
  }
  function removeBlock(st, id) {   // 블럭을 지우면 그 안의 카드는 바로 앞 블럭(첫 블럭이면 다음 블럭)으로, 폭은 같은 줄 옆 블럭이 넘겨받는다
    var bl = st.blocks, fl = flat(bl), i = -1;
    fl.forEach(function (b, x) { if (b.id === id) i = x; });
    if (i < 0 || fl.length < 2) return false;
    var b = fl[i], to = (fl[i - 1] || fl[i + 1]).id, row = bl.rows[b.r];
    Object.keys(bl.at).forEach(function (k) { if (bl.at[k] === id) bl.at[k] = to; });
    if (row.length > 1) { (row[b.j - 1] || row[b.j + 1]).w += b.w; row.splice(b.j, 1); } else bl.rows.splice(b.r, 1);
  }
  /** 블럭 안 카드 이름들(쌓인 순서) */
  function keysIn(st, list, id, skip) {
    var fl = flat(st.blocks);
    return st.order.filter(function (k) { return k !== skip && blockOf(st.blocks, fl, k) === id && list.some(function (c) { return c.key === k && listed(c); }); });
  }
  function moveTo(st, list, k, id) {   // 다른 블럭의 맨 아래로
    if (blockOf(st.blocks, flat(st.blocks), k) === id) return false;
    var ks = keysIn(st, list, id, k);
    st.blocks.at[k] = id; st.order.splice(st.order.indexOf(k), 1);
    if (ks.length) st.order.splice(st.order.indexOf(ks[ks.length - 1]) + 1, 0, k); else st.order.push(k);
  }
  function moveInBlocks(st, list, k, d) {   // 블럭 안에서 한 칸, 블럭 끝이면 앞 블럭 맨 아래 · 다음 블럭 맨 위로 넘어간다
    var fl = flat(st.blocks), id = blockOf(st.blocks, fl, k), seq = keysIn(st, list, id), i = seq.indexOf(k), j = i + d;
    if (j >= 0 && j < seq.length) { var a = st.order.indexOf(k), b = st.order.indexOf(seq[j]); st.order[a] = seq[j]; st.order[b] = k; return; }
    var bi = -1; fl.forEach(function (b, x) { if (b.id === id) bi = x; });
    var nb = fl[bi + d]; if (!nb) return false;
    var ks = keysIn(st, list, nb.id, k);
    st.blocks.at[k] = nb.id; st.order.splice(st.order.indexOf(k), 1);
    if (!ks.length) st.order.push(k);
    else if (d < 0) st.order.splice(st.order.indexOf(ks[ks.length - 1]) + 1, 0, k);
    else st.order.splice(st.order.indexOf(ks[0]), 0, k);
  }

  /** 패널의 블럭 지도: 줄마다 블럭을 폭 비율대로 그리고, 사이 손잡이를 끌어 폭을 바꾼다 */
  function mapHtml(bi, st) {
    var fl = flat(st.blocks), many = fl.length > 1;
    var bands = st.blocks.rows.map(function (row, r) {
      var cells = fl.filter(function (b) { return b.r === r; }).map(function (b, j, arr) {
        return '<span class="wl-cz-mblk" style="flex:' + b.w + ' 1 0"><b>' + b.num + '</b><small>' + pct(b.w) + '</small>' +
          (many ? '<button type="button" data-rm="' + b.id + '" aria-label="' + esc(t('rmBlock', b.num)) + '" title="' + esc(t('rmBlock', b.num)) + '">×</button>' : '') + '</span>' +
          (j < arr.length - 1 ? '<span class="wl-cz-mdiv" data-div="' + bi + '|' + r + '|' + j + '" title="' + esc(t('dragSplit')) + '"></span>' : '');
      }).join('');
      return '<div class="wl-cz-band"><span class="wl-cz-cells" data-band="' + bi + '|' + r + '">' + cells + '</span>' +
        '<button type="button" class="wl-cz-add" data-split="' + r + '"' + (row.length >= MAXB ? ' disabled' : '') + ' aria-label="' + esc(t('addBlock')) + '" title="' + esc(t('addBlock')) + '">+</button></div>';
    }).join('');
    return '<li class="wl-cz-map" data-b="' + bi + '"><div class="wl-cz-maphead"><strong>' + esc(t('blocks')) + '</strong><button type="button" class="wl-cz-link" data-unblock>' + esc(t('noBlocks')) + '</button></div>' +
      bands + '<button type="button" class="wl-cz-ghost wl-cz-addrow" data-addrow>+ ' + esc(t('addRow')) + '</button></li>';
  }
  function paint() {
    if (!panel) return;
    var old = panel.querySelector('.wl-cz-list'), scroll = old ? old.scrollTop : 0;
    var screen = screenOf(), v = load(screen), vs = state(screen), all = boxes(), blocksOn = false;
    var parts = all.map(function (box, bi) {
      var list = cardsOf(box), byKey = {};
      list.forEach(function (c, i) { c.title = titleOf(c.el, i); byKey[c.key] = c; });
      if (!list.some(listed)) return '';
      var st = boxState(vs, bi), ub = useBlocks(st);
      if (ub) blocksOn = true;
      var row = function (k, first, last, extra) {
        var off = st.hidden.indexOf(k) >= 0, c = byKey[k];
        return '<li class="wl-cz-row' + (off ? ' is-off' : '') + '" data-b="' + bi + '" data-k="' + esc(k) + '">' +
          '<button type="button" class="wl-cz-name" data-go>' + esc(c.title) + (off ? ' <small>' + esc(t('hiddenTag')) + '</small>' : '') + '</button>' +
          '<span class="wl-cz-btns">' +
            '<button type="button" data-mv="-1" aria-label="' + esc(t('up')) + '" title="' + esc(t('up')) + '"' + (first ? ' disabled' : '') + '>↑</button>' +
            '<button type="button" data-mv="1" aria-label="' + esc(t('down')) + '" title="' + esc(t('down')) + '"' + (last ? ' disabled' : '') + '>↓</button>' +
            '<button type="button" data-eye class="wl-cz-eye">' + esc(off ? t('show') : t('hide')) + '</button>' +
          '</span>' + (extra || '') +
        '</li>';
      };
      if (!ub) {
        var order = st.order.filter(function (k) { return listed(byKey[k]); });
        return (screen === 'phone' ? '' : '<li class="wl-cz-mode" data-b="' + bi + '"><p>' + esc(t('pageMode')) + '</p><button type="button" class="wl-cz-ghost" data-mk>' + esc(t('mkBlocks')) + '</button></li>') +
          order.map(function (k, i) { return row(k, i === 0, i === order.length - 1); }).join('');
      }
      var fl = flat(st.blocks);
      return mapHtml(bi, st) + fl.map(function (b, bx) {
        var ks = keysIn(st, list, b.id);
        return '<li class="wl-cz-bhead">' + esc(t('block', b.num)) + ' <small>' + pct(b.w) + '</small></li>' +
          (ks.length ? ks.map(function (k, i) {
            var to = fl.length < 2 ? '' : '<span class="wl-cz-to" role="group" aria-label="' + esc(t('moveTo')) + '"><span>' + esc(t('moveTo')) + '</span>' + fl.map(function (x) {
              return '<button type="button" data-to="' + x.id + '" class="' + (x.id === b.id ? 'on' : '') + '" aria-pressed="' + (x.id === b.id) + '">' + x.num + '</button>';
            }).join('') + '</span>';
            return row(k, bx === 0 && i === 0, bx === fl.length - 1 && i === ks.length - 1, to);
          }).join('') : '<li class="wl-cz-empty">' + esc(t('empty')) + '</li>');
      }).join('');
    }).filter(Boolean).join('<li class="wl-cz-group" aria-hidden="true"></li>');
    var others = SCREENS.filter(function (s) { return s.id !== screen && load(s.id); }).map(function (s) { return '<button type="button" class="wl-cz-ghost" data-copy="' + s.id + '">' + esc(t('copyFrom', t(s.id))) + '</button>'; }).join('');
    panel.innerHTML = '<div class="wl-cz-head"><strong>' + esc(t('title')) + '</strong><button type="button" class="wl-cz-x" data-close aria-label="' + esc(t('close')) + '">×</button></div>' +
      '<p class="wl-cz-where">' + esc(t('where', t(screen), window.innerWidth)) + (screen === 'phone' ? '<br>' + esc(t('phoneWidth')) : '') + '</p>' +
      '<p class="wl-cz-hint">' + esc(t(screen === 'phone' ? 'dragHintPhone' : blocksOn ? 'dragHintBlocks' : 'dragHint')) + '</p>' +
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
    note = ''; apply(); paint(); handlesOn();   // 꾸미는 중에는 빈 블럭도 자리를 차지하게 다시 쌓는다
    fab.setAttribute('aria-expanded', 'true');
    panel.addEventListener('click', onPanelClick);
    panel.addEventListener('mouseover', function (e) { var r = e.target.closest('.wl-cz-row'); focusCard(r ? +r.dataset.b : 0, r ? r.dataset.k : null, false); });
    panel.addEventListener('mouseleave', function () { focusCard(0, null); });
    panel.addEventListener('pointerdown', function (e) {
      var d = e.target.closest('.wl-cz-mdiv'); if (!d || drag || e.button > 0) return;
      e.preventDefault(); var p = d.dataset.div.split('|'); startSplit(e, +p[0], +p[1], +p[2], true);
    });
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
    if (b.hasAttribute('data-reset')) { drop(screen); natural = {}; note = t('resetDone'); apply(); paint(); return; }
    if (b.dataset.copy) { var from = load(b.dataset.copy); if (from) { save(screen, from); note = canSave ? t('copied') : t('noSave'); apply(); paint(); } return; }
    var at = b.closest('[data-b]'); if (!at) return;
    var bi = +at.dataset.b, k = at.dataset.k;
    if (b.hasAttribute('data-mk')) return edit(bi, function (st, list, box) { st.blocks = derive(box, list); });
    if (b.hasAttribute('data-unblock')) return edit(bi, function (st) { delete st.blocks; });
    if (b.hasAttribute('data-addrow')) return edit(bi, function (st) { st.blocks.rows.push([{ id: newId(st.blocks), w: COLS }]); });
    if (b.dataset.split) return edit(bi, function (st) { return splitRow(st.blocks, +b.dataset.split); });
    if (b.dataset.rm) return edit(bi, function (st) { return removeBlock(st, +b.dataset.rm); });
    if (k == null) return;
    if (b.hasAttribute('data-go')) { focusCard(bi, k, true); return; }
    if (b.dataset.to) return edit(bi, function (st, list) { return moveTo(st, list, k, +b.dataset.to); });
    if (b.dataset.mv) return edit(bi, function (st, list) {
      var d = +b.dataset.mv;
      if (useBlocks(st)) return moveInBlocks(st, list, k, d);
      // 보이지 않는 카드는 건너뛰고, 보이는 바로 옆 카드와 자리를 바꾼다
      var i = st.order.indexOf(k), j = i + d;
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
     카드 안의 내용은 건드리지 않도록, 손잡이 · 블럭 테두리는 화면 위에 따로 띄운 층에 그리고 카드 자리를 따라다니게 한다.
     컴퓨터: 카드 아무 데나(링크 · 단추 · 입력칸 빼고) 끌거나 위쪽 손잡이를 끈다. 휴대폰 · 태블릿 손가락: 위쪽 손잡이를 끈다(그래야 화면 스크롤과 안 섞인다).
     블럭 배치면 블럭 사이 손잡이를 끌어 폭을 바꾼다(12칸 눈금에 맞춰 붙는다).
     끄는 동안 다른 카드가 스르륵 비켜서 놓일 자리를 미리 보여 주고, 손을 떼면 저장한다. */
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
  /** 블럭 배치인 묶음의 블럭마다 화면 위 자리 — 열은 격자 눈금에서, 높이는 그 줄(띠)의 위아래에서 잰다 */
  function blockRects(box) {
    var geo = box.__wlCzGeo; if (!geo || !box.classList.contains('wl-cz-blocks')) return [];
    var g = gridOf(box);
    return geo.blocks.map(function (b) {
      return { id: b.id, num: b.num, r: b.r, j: b.j, w: b.w, empty: b.empty, left: g.xs[b.start], right: g.xs[b.start + b.w] - g.gap, top: g.y + b.y0 * geo.unit, bottom: g.y + b.y1 * geo.unit - geo.gapY };
    });
  }
  function gridOf(box) {
    var cs = getComputedStyle(box), r = box.getBoundingClientRect(), gap = parseFloat(cs.columnGap) || 0;
    var x = r.left + box.clientLeft + (parseFloat(cs.paddingLeft) || 0), xs = [x];
    cs.gridTemplateColumns.split(' ').map(parseFloat).forEach(function (w, i) { xs.push(xs[i] + w + gap); });
    return { xs: xs, gap: gap, y: r.top + box.clientTop + (parseFloat(cs.paddingTop) || 0) };
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
  /** 블럭마다 테두리와 번호, 블럭 사이에 폭 손잡이, 보이는 카드마다 위쪽 가운데에 옮기기 손잡이를 둔다(화면 좌표라 어떤 스크롤에서도 맞는다) */
  function placeHandles() {
    if (!layer) return;
    var vh = window.innerHeight, seen = {};
    var get = function (cls, id, html) {
      var h = layer.querySelector('[data-id="' + CSS.escape(id) + '"]');
      if (!h) { h = document.createElement('span'); h.className = cls; h.setAttribute('data-id', id); h.setAttribute('aria-hidden', 'true'); if (html) h.innerHTML = html; layer.appendChild(h); }
      seen[id] = 1; return h;
    };
    boxes().forEach(function (box, bi) {
      var rects = shown(box) ? blockRects(box) : [];
      rects.forEach(function (b) {
        if (b.bottom < -20 || b.top > vh + 20) return;
        var f = get('wl-cz-frame', 'f|' + bi + '|' + b.id, '<span></span><em></em>');
        f.style.transform = 'translate(' + Math.round(b.left - 6) + 'px,' + Math.round(b.top - 6) + 'px)';
        f.style.width = Math.round(b.right - b.left + 12) + 'px'; f.style.height = Math.max(24, Math.round(b.bottom - b.top + 12)) + 'px';
        f.firstChild.textContent = t('block', b.num); f.lastChild.textContent = b.empty ? t('dropHere') : '';
        f.classList.toggle('is-empty', !!b.empty);
        f.classList.toggle('is-target', !!(drag && drag.box === box && drag.target === b.id));
        var n = rects.filter(function (x) { return x.r === b.r && x.j === b.j + 1; })[0];
        if (!n) return;
        var id = 'd|' + bi + '|' + b.r + '|' + b.j, d = get('wl-cz-div', id), top = Math.max(b.top, 8), bottom = Math.min(b.bottom, vh - 8), on = !!(drag && drag.mode === 'split' && drag.id === id);
        d.title = t('dragSplit');
        d.style.transform = 'translate(' + Math.round((b.right + n.left) / 2 - 7) + 'px,' + Math.round((top + bottom) / 2 - 24) + 'px)';
        d.classList.toggle('is-drag', on);
        d.setAttribute('data-label', on ? drag.label : '');
      });
      cardsOf(box).forEach(function (c) {
        var vis = onPage(c);
        c.el.classList.toggle('wl-cz-card', vis);
        if (!vis) return;
        var r = c.el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh || r.width < 40) return;
        var g = get('wl-cz-grip', 'g|' + bi + '|' + c.key, GRIP);
        g.title = t('dragMove');
        g.style.transform = 'translate(' + Math.round(r.left + r.width / 2 - 24) + 'px,' + Math.round(Math.max(r.top + 6, Math.min(r.bottom - 34, 6))) + 'px)';
        g.classList.toggle('is-drag', !!(drag && drag.el === c.el));
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
  /** 끌기 공통: 손가락 · 마우스를 따라 step 을 부르고, 손을 떼면 바뀐 설정을 저장한다 */
  function track(e, st, before, bi, box, step, scroll, done) {
    var v = state(screenOf()), timer = 0;
    var onMove = function (ev) { drag.x = ev.clientX; drag.y = ev.clientY; ev.preventDefault(); step(); };
    var loop = function () {   // 화면 위 · 아래 가장자리 근처면 저절로 스크롤 (가까울수록 빠르게)
      if (!scroll) return;
      var vh = window.innerHeight, edge = Math.min(100, vh * 0.18), sp = 0, y = drag.y;
      if (y < edge) sp = -Math.ceil((edge - Math.max(0, y)) / edge * 14) - 2; else if (y > vh - edge) sp = Math.ceil((Math.min(vh, y) - (vh - edge)) / edge * 14) + 2;
      if (sp) { window.scrollBy(0, sp); step(); }
    };
    var end = function (commit) {
      clearInterval(timer);
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancel);
      if (done) done();
      document.documentElement.classList.remove('wl-cz-dragging', 'wl-cz-mapdrag');
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
    timer = setInterval(loop, 16);
    step();
  }
  function startDrag(e, hit) {
    var box = hit.box, bi = hit.bi, el = hit.card.el, key = hit.card.key, st = boxState(state(screenOf()), bi), list = cardsOf(box);
    var before = JSON.stringify(st), r0 = el.getBoundingClientRect(), gx = e.clientX - r0.left, gy = e.clientY - r0.top;
    drag = { el: el, mode: 'move', box: box, target: null };
    document.documentElement.classList.add('wl-cz-dragging');
    el.classList.add('wl-cz-moving');
    layout(box, bi, st, screenOf());   // 아직 꾸민 적 없는 화면이면 여기서 꾸미기 모양으로 바뀐다
    var follow = function () {
      el.style.transform = ''; var b = el.getBoundingClientRect();
      el.style.transform = 'translate(' + (drag.x - gx - b.left) + 'px,' + (drag.y - gy - b.top) + 'px)';
    };
    var visKeys = function () { return st.order.filter(function (k) { return list.some(function (c) { return c.key === k && onPage(c); }); }); };
    var pageStep = function () {   // 페이지 배치: 보이는 카드 사이에서 순서만 바꾼다
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
    };
    var blockStep = function () {   // 블럭 배치: 손가락이 가장 가까운 블럭에, 그 안 카드들 사이 높이에 맞춰 넣는다
      el.style.transform = '';
      var rects = blockRects(box); if (!rects.length) return follow();
      var x = drag.x, y = drag.y, tgt = null, best = Infinity;
      rects.forEach(function (b) {
        var dx = x < b.left ? b.left - x : x > b.right ? x - b.right : 0, dy = y < b.top ? b.top - y : y > b.bottom ? y - b.bottom : 0;
        if (dx * dx + dy * dy < best) { best = dx * dx + dy * dy; tgt = b; }
      });
      drag.target = tgt.id;
      var mates = keysIn(st, list, tgt.id, key).filter(function (k) { return list.some(function (c) { return c.key === k && onPage(c); }); });
      var ins = 0;
      mates.forEach(function (k) { var c = list.filter(function (x) { return x.key === k; })[0], r = c.el.getBoundingClientRect(); if (y > r.top + r.height / 2) ins++; });
      var ord = st.order.filter(function (k) { return k !== key; });
      if (!mates.length) ord.splice(Math.min(st.order.indexOf(key), ord.length), 0, key);
      else if (ins < mates.length) ord.splice(ord.indexOf(mates[ins]), 0, key);
      else ord.splice(ord.indexOf(mates[mates.length - 1]) + 1, 0, key);
      if (blockOf(st.blocks, flat(st.blocks), key) !== tgt.id || ord.join('\n') !== st.order.join('\n')) { st.blocks.at[key] = tgt.id; st.order = ord; relayout(box, bi, st, el); }
      follow();
    };
    track(e, st, before, bi, box, useBlocks(st) ? blockStep : pageStep, true, function () { el.style.transform = ''; el.classList.remove('wl-cz-moving'); });
  }
  /** 블럭 사이 손잡이 끌기 — 페이지의 손잡이든 패널 지도의 손잡이든 12칸 눈금 중 가장 가까운 줄에 붙는다 */
  function startSplit(e, bi, r, j, fromMap) {
    var box = boxes()[bi], st = box && boxState(state(screenOf()), bi);
    if (!st || !st.blocks || !st.blocks.rows[r] || !st.blocks.rows[r][j + 1]) return;
    var before = JSON.stringify(st), row = st.blocks.rows[r], s0 = 0, both = row[j].w + row[j + 1].w;
    row.slice(0, j).forEach(function (b) { s0 += b.w; });
    drag = { el: null, mode: 'split', box: box, id: 'd|' + bi + '|' + r + '|' + j, label: '' };
    document.documentElement.classList.add('wl-cz-dragging');
    if (fromMap) document.documentElement.classList.add('wl-cz-mapdrag');
    var lineAt = function (x) {
      if (fromMap) {
        var cells = panel && panel.querySelector('[data-band="' + bi + '|' + r + '"]'); if (!cells) return null;
        var cr = cells.getBoundingClientRect(); return Math.round((x - cr.left) / cr.width * COLS);
      }
      var g = gridOf(box), step = (g.xs[COLS] - g.xs[0]) / COLS;   // 눈금 하나 = 칸 폭 + 간격
      return Math.round((x - g.xs[0] + g.gap / 2) / step);
    };
    track(e, st, before, bi, box, function () {
      var L = lineAt(drag.x); if (L == null) return;
      var lw = Math.max(MINW, Math.min(both - MINW, L - s0));
      drag.label = pct(lw) + ' · ' + pct(both - lw);
      if (row[j].w === lw) return;
      row[j].w = lw; row[j + 1].w = both - lw;
      relayout(box, bi, st, null);
      if (fromMap) paint();
    }, false);
  }
  var eatClick = false;
  document.addEventListener('click', function (e) { if (eatClick) { eatClick = false; e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('pointerdown', function (e) {
    if (!panel || drag || e.button > 0) return;
    var h = e.target.closest && e.target.closest('.wl-cz-grip, .wl-cz-div');
    if (h) {
      e.preventDefault(); e.stopPropagation();
      var p = h.getAttribute('data-id').split('|'), bi = +p[1], box = boxes()[bi];
      if (p[0] === 'd') return startSplit(e, bi, +p[2], +p[3], false);
      var k = p.slice(2).join('|'), card = box && cardsOf(box).filter(function (c) { return c.key === k; })[0];
      return card && startDrag(e, { box: box, bi: bi, card: card });
    }
    if (e.pointerType !== 'mouse' || e.target.closest(SKIP)) return;
    var hit = cardAt(e.target); if (!hit || !onPage(hit.card)) return;
    // 마우스: 조금 움직였을 때만 끌기로 본다 — 그냥 누르면 원래 하던 일(펼치기 등)을 그대로 한다
    var x0 = e.clientX, y0 = e.clientY;
    var mv = function (ev) { if (Math.abs(ev.clientX - x0) + Math.abs(ev.clientY - y0) < 6) return; stop(); startDrag({ clientX: x0, clientY: y0 }, hit); };
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
