/**
 * 화면 꾸미기 — 포탈 페이지의 카드 순서 · 보이기 · 너비를 사람마다 바꿔 쓴다.
 * 저장은 이 기기(브라우저)에만, 화면 크기별로 따로 한다: 휴대폰(640px 미만) · 태블릿(1024px 미만) · 컴퓨터.
 * 그래서 같은 사람이라도 컴퓨터로 열 때와 휴대폰으로 열 때 다른 모양을 정해 둘 수 있다.
 *
 * 페이지 쪽 표시: 카드를 담은 묶음에 data-wl-cards 를 붙인다.
 *   data-wl-cards=""            → 묶음 바로 아래 자식 중 data-wl-card="이름" 이 붙은 것만 카드
 *   data-wl-cards="선택자"      → 묶음 바로 아래 자식 중 선택자에 맞는 것이 카드 (JS로 다시 그리는 묶음용)
 * 카드 이름(저장 키)은 data-wl-card → id → 대표 class 순으로 정한다. 제목은 data-wl-card-title(-en) 이 있으면 그것, 없으면 카드 안의 첫 제목 글자.
 * 패널에는 지금 보이는 카드(와 내가 숨긴 카드)만 나온다 — 권한이 없어 페이지가 감춘 카드는 목록에도 없다.
 * 꾸미지 않은 화면은 페이지 원래 모양 그대로 둔다(아무 스타일도 건드리지 않는다).
 * 꾸민 화면: 보통 묶음은 6칸 격자로 바꿔 순서(order)와 너비(전체 · 반 · 1/3)를 주고, 원래 격자인 묶음은 그 칸 수에 맞춘다.
 * 반 · 1/3 카드에는 컨테이너 쿼리를 걸어 안의 표 · 격자 · 버튼 줄이 카드 폭에 맞춰 다시 정렬된다(wolko-customize.css).
 */
(function () {
  if (window.WolkoCustomize) return;
  var PREFIX = 'wolko-cz:v1:';
  var SCREENS = [{ id: 'phone', max: 639 }, { id: 'tablet', max: 1023 }, { id: 'desktop', max: Infinity }];
  var T = {
    ko: { open: '화면 꾸미기', title: '화면 꾸미기', close: '닫기', done: '완료', reset: '이 화면 처음 모양으로', copyFrom: function (s) { return s + ' 모양 가져오기'; },
      where: function (s, w) { return '지금 화면: ' + s + ' (' + w + 'px) · 이 기기에만 저장돼요. 다른 화면 크기는 그 크기로 열어서 따로 꾸며요.'; },
      phone: '휴대폰', tablet: '태블릿', desktop: '컴퓨터', up: '앞으로', down: '뒤로', show: '보이기', hide: '숨기기', hiddenTag: '숨김',
      wAuto: '기본', wFull: '전체', wHalf: '반', wThird: '1/3', width: '너비', card: '카드', needOne: '보이는 카드가 하나는 있어야 해요.', noSave: '이 브라우저에서는 저장할 수 없어서, 페이지를 다시 열면 원래 모양으로 돌아가요.',
      saved: '저장했어요.', resetDone: '처음 모양으로 돌렸어요.', copied: '가져왔어요.', phoneWidth: '휴대폰 화면에서는 카드가 한 줄에 하나씩 나와요. 순서와 보이기만 정할 수 있어요.',
      dragHint: '페이지에서 카드를 끌어 자리를 바꾸고, 카드 오른쪽 가장자리의 손잡이를 끌어 너비를 바꿀 수 있어요.', dragHintPhone: '카드 위쪽 손잡이를 끌어 자리를 바꿀 수 있어요.',
      dragMove: '끌어서 자리 옮기기', dragWidth: '끌어서 너비 바꾸기' },
    en: { open: 'Customize this page', title: 'Customize this page', close: 'Close', done: 'Done', reset: 'Reset this screen', copyFrom: function (s) { return 'Use the ' + s + ' layout'; },
      where: function (s, w) { return 'This screen: ' + s + ' (' + w + 'px) · saved on this device only. Open the page at another size to set that layout separately.'; },
      phone: 'phone', tablet: 'tablet', desktop: 'computer', up: 'Move earlier', down: 'Move later', show: 'Show', hide: 'Hide', hiddenTag: 'Hidden',
      wAuto: 'Default', wFull: 'Full', wHalf: 'Half', wThird: '1/3', width: 'Width', card: 'Card', needOne: 'At least one card must stay visible.', noSave: 'This browser cannot save, so the page will go back to its original layout when reopened.',
      saved: 'Saved.', resetDone: 'Back to the original layout.', copied: 'Copied.', phoneWidth: 'On a phone, cards are shown one per row. You can set the order and which cards show.',
      dragHint: 'Drag a card on the page to move it, and drag the handle on its right edge to change its width.', dragHintPhone: 'Drag the handle at the top of a card to move it.',
      dragMove: 'Drag to move', dragWidth: 'Drag to change width' },
  };
  var lang = function () { return /^en/i.test(document.documentElement.lang || '') ? 'en' : 'ko'; };
  var t = function (k, a, b) { var v = T[lang()][k]; return typeof v === 'function' ? v(a, b) : v; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
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

  /* ── 적용: 꾸민 화면이면 순서 · 숨김 · 너비를 입히고, 아니면 원래대로 ── */
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
    box.classList.remove('wl-cz-on', 'wl-cz-flow');
    [].forEach.call(box.children, function (el) { el.style.order = ''; });
    list.forEach(function (c) { c.el.style.gridColumn = ''; c.el.style.gridRow = ''; c.el.classList.remove('wl-cz-off', 'wl-cz-narrow'); });
  }
  /** 묶음 하나에 설정(st)을 입힌다 — 저장된 설정이든, 끄는 동안의 임시 설정이든 같은 길로 그린다 */
  function layout(box, bi, st, screen) {
    var list = cardsOf(box);
    // 원래 격자인 묶음인지: 내가 바꾼 격자(wl-cz-flow)가 아니면서 지금 격자로 그려지는지 본다
    var native = !box.classList.contains('wl-cz-flow') && /grid/.test(getComputedStyle(box).display);
    if (native) measure(box, bi, list);
    if (!st || !list.length) { clear(box, list); return; }
    box.classList.add('wl-cz-on'); box.classList.toggle('wl-cz-flow', !native);
    var kids = [].slice.call(box.children), byKey = {}, slots = [];
    kids.forEach(function (el, i) { el.style.order = String(i * 10); });
    list.forEach(function (c) { byKey[c.key] = c; slots.push(kids.indexOf(c.el)); });
    var order = (st.order || []).filter(function (k) { return byKey[k]; });
    list.forEach(function (c) { if (order.indexOf(c.key) < 0) order.push(c.key); });
    var hidden = st.hidden || [], width = st.width || {}, n = native ? cols(box) : 6;
    order.forEach(function (k, i) {
      var c = byKey[k], w = screen === 'phone' ? 'auto' : (width[k] || 'auto');
      c.el.style.order = String(slots[i] * 10);
      c.el.classList.toggle('wl-cz-off', hidden.indexOf(k) >= 0);
      var span = w === 'full' ? n : w === 'half' ? Math.max(1, Math.round(n / 2)) : w === 'third' ? Math.max(1, Math.round(n / 3)) : (native ? (natural[boxId(box, bi) + '|' + k] || n) : n);
      c.el.style.gridColumn = span >= n ? '1 / -1' : 'span ' + span;
      if (native) c.el.style.gridRow = 'auto';
      c.el.classList.toggle('wl-cz-narrow', span < n && (w === 'half' || w === 'third'));
    });
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
  function visibleCards() { var n = 0; boxes().forEach(function (b) { cardsOf(b).forEach(function (c) { if (shown(c.el) || c.el.classList.contains('wl-cz-off')) n++; }); }); return n; }
  function syncFab() {
    if (!fab) return;
    fab.hidden = !panel && visibleCards() < 2;   // 로그인 화면처럼 카드가 안 보일 때는 단추도 숨긴다
    fab.title = t('open'); fab.setAttribute('aria-label', t('open'));
  }
  function state(screen) { var v = load(screen) || {}; v.boxes = v.boxes || {}; return v; }
  /** 묶음 하나의 설정 — 저장된 것이 없으면 지금 모양 그대로(원래 순서 · 모두 보이기 · 기본 너비) */
  function boxState(v, bi) {
    var box = boxes()[bi], list = cardsOf(box), st = v.boxes[boxId(box, bi)];
    st = st ? JSON.parse(JSON.stringify(st)) : { order: list.map(function (c) { return c.key; }), hidden: [], width: {} };
    st.order = st.order || []; st.hidden = st.hidden || []; st.width = st.width || {};
    list.forEach(function (c) { if (st.order.indexOf(c.key) < 0) st.order.push(c.key); });
    st.order = st.order.filter(function (k) { return list.some(function (c) { return c.key === k; }); });
    return st;
  }
  function edit(bi, fn) {
    var screen = screenOf(), v = state(screen), box = boxes()[bi], list = cardsOf(box), st = boxState(v, bi);
    if (fn(st, list) === false) return;
    v.boxes[boxId(box, bi)] = st; save(screen, v); note = canSave ? t('saved') : t('noSave'); apply(); paint();
  }
  function paint() {
    if (!panel) return;
    var screen = screenOf(), v = load(screen), all = boxes();
    var rows = all.map(function (box, bi) {
      var list = cardsOf(box), st = ((v && v.boxes) || {})[boxId(box, bi)] || {}, byKey = {};
      list.forEach(function (c, i) { c.title = titleOf(c.el, i); byKey[c.key] = c; });
      var order = (st.order || []).filter(function (k) { return byKey[k]; });
      list.forEach(function (c) { if (order.indexOf(c.key) < 0) order.push(c.key); });
      order = order.filter(function (k) { return listed(byKey[k]); });
      if (!order.length) return '';
      var hidden = st.hidden || [], width = st.width || {};
      return (all.length > 1 ? '<li class="wl-cz-group" aria-hidden="true"></li>' : '') + order.map(function (k, i) {
        var off = hidden.indexOf(k) >= 0, w = width[k] || 'auto', c = byKey[k];
        var wbtn = function (val, label) { return '<button type="button" data-w="' + val + '" class="' + (w === val ? 'on' : '') + '" aria-pressed="' + (w === val) + '">' + esc(label) + '</button>'; };
        return '<li class="wl-cz-row' + (off ? ' is-off' : '') + '" data-b="' + bi + '" data-k="' + esc(k) + '">' +
          '<button type="button" class="wl-cz-name" data-go>' + esc(c.title) + (off ? ' <small>' + esc(t('hiddenTag')) + '</small>' : '') + '</button>' +
          '<span class="wl-cz-btns">' +
            '<button type="button" data-mv="-1" aria-label="' + esc(t('up')) + '" title="' + esc(t('up')) + '"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button type="button" data-mv="1" aria-label="' + esc(t('down')) + '" title="' + esc(t('down')) + '"' + (i === order.length - 1 ? ' disabled' : '') + '>↓</button>' +
            '<button type="button" data-eye class="wl-cz-eye">' + esc(off ? t('show') : t('hide')) + '</button>' +
          '</span>' +
          (screen === 'phone' ? '' : '<span class="wl-cz-width" role="group" aria-label="' + esc(t('width')) + '">' + wbtn('auto', t('wAuto')) + wbtn('full', t('wFull')) + wbtn('half', t('wHalf')) + wbtn('third', t('wThird')) + '</span>') +
        '</li>';
      }).join('');
    }).join('');
    var others = SCREENS.filter(function (s) { return s.id !== screen && load(s.id); }).map(function (s) { return '<button type="button" class="wl-cz-ghost" data-copy="' + s.id + '">' + esc(t('copyFrom', t(s.id))) + '</button>'; }).join('');
    panel.innerHTML = '<div class="wl-cz-head"><strong>' + esc(t('title')) + '</strong><button type="button" class="wl-cz-x" data-close aria-label="' + esc(t('close')) + '">×</button></div>' +
      '<p class="wl-cz-where">' + esc(t('where', t(screen), window.innerWidth)) + (screen === 'phone' ? '<br>' + esc(t('phoneWidth')) : '') + '</p>' +
      '<p class="wl-cz-hint">' + esc(t(screen === 'phone' ? 'dragHintPhone' : 'dragHint')) + '</p>' +
      '<ol class="wl-cz-list">' + rows + '</ol>' +
      (note ? '<p class="wl-cz-note" role="status">' + esc(note) + '</p>' : '') +
      '<div class="wl-cz-foot">' + others + '<button type="button" class="wl-cz-ghost" data-reset' + (v ? '' : ' disabled') + '>' + esc(t('reset')) + '</button><button type="button" class="wl-cz-done" data-close>' + esc(t('done')) + '</button></div>';
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
    note = ''; paint(); handlesOn();
    fab.setAttribute('aria-expanded', 'true');
    panel.addEventListener('click', onPanelClick);
    panel.addEventListener('mouseover', function (e) { var r = e.target.closest('.wl-cz-row'); focusCard(r ? +r.dataset.b : 0, r ? r.dataset.k : null, false); });
    panel.addEventListener('mouseleave', function () { focusCard(0, null); });
  }
  function closePanel() {
    if (!panel) return;
    panel.remove(); panel = null; focusCard(0, null); handlesOff();
    document.documentElement.classList.remove('wl-cz-editing');
    fab.setAttribute('aria-expanded', 'false'); fab.focus(); syncFab();
  }
  function onPanelClick(e) {
    var b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.hasAttribute('data-close')) return closePanel();
    var screen = screenOf();
    if (b.hasAttribute('data-reset')) { drop(screen); natural = {}; note = t('resetDone'); apply(); paint(); return; }
    if (b.dataset.copy) { var from = load(b.dataset.copy); if (from) { save(screen, from); note = canSave ? t('copied') : t('noSave'); apply(); paint(); } return; }
    var row = b.closest('.wl-cz-row'); if (!row) return;
    var bi = +row.dataset.b, k = row.dataset.k;
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
    if (b.dataset.w) return edit(bi, function (st) { st.width = st.width || {}; if (b.dataset.w === 'auto') delete st.width[k]; else st.width[k] = b.dataset.w; });
  }

  /* ── 페이지에서 바로 끌어서 옮기기 · 너비 바꾸기 (꾸미기 패널이 열려 있을 때만) ──
     카드 안의 내용은 건드리지 않도록, 손잡이는 화면 위에 따로 띄운 층에 그리고 카드 자리를 따라다니게 한다.
     컴퓨터: 카드 아무 데나(링크 · 단추 · 입력칸 빼고) 끌거나 위쪽 손잡이를 끈다. 휴대폰 · 태블릿 손가락: 위쪽 손잡이를 끈다(그래야 화면 스크롤과 안 섞인다).
     끄는 동안 다른 카드가 스르륵 비켜서 놓일 자리를 미리 보여 주고, 손을 떼면 저장한다. */
  var drag = null, layer = null, handleRaf = 0;
  var SKIP = 'a, button, input, select, textarea, label, summary, [contenteditable], [role="button"], .wl-cz-panel, .wl-cz-fab';
  var GRIP = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/><circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>';
  var WIDTHS = [['third', 1 / 3], ['half', 1 / 2], ['full', 1]];
  function cardAt(el) {
    var all = boxes();
    for (var bi = 0; bi < all.length; bi++) {
      var hit = cardsOf(all[bi]).filter(function (c) { return c.el === el || c.el.contains(el); })[0];
      if (hit) return { box: all[bi], bi: bi, card: hit };
    }
    return null;
  }
  var onPage = function (c) { return shown(c.el) && !c.el.classList.contains('wl-cz-off'); };
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
  /** 보이는 카드마다 위쪽 가운데에 옮기기 손잡이, 오른쪽 가장자리에 너비 손잡이를 둔다(화면 좌표라 어떤 스크롤에서도 맞는다) */
  function placeHandles() {
    if (!layer) return;
    var phone = screenOf() === 'phone', vh = window.innerHeight, seen = {};
    boxes().forEach(function (box, bi) {
      cardsOf(box).forEach(function (c) {
        var id = bi + '|' + c.key, vis = onPage(c);
        c.el.classList.toggle('wl-cz-card', vis);
        if (!vis) return;
        var r = c.el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh || r.width < 40) return;
        seen[id] = 1;
        var g = layer.querySelector('[data-grip="' + CSS.escape(id) + '"]');
        if (!g) {
          g = document.createElement('span'); g.className = 'wl-cz-grip'; g.setAttribute('data-grip', id); g.setAttribute('aria-hidden', 'true'); g.innerHTML = GRIP; layer.appendChild(g);
        }
        g.title = t('dragMove');
        g.style.transform = 'translate(' + Math.round(r.left + r.width / 2 - 24) + 'px,' + Math.round(Math.max(r.top + 6, Math.min(r.bottom - 34, 6))) + 'px)';
        g.classList.toggle('is-drag', !!(drag && drag.el === c.el));
        var rs = layer.querySelector('[data-rs="' + CSS.escape(id) + '"]');
        if (phone) { if (rs) rs.remove(); return; }
        if (!rs) { rs = document.createElement('span'); rs.className = 'wl-cz-rs'; rs.setAttribute('data-rs', id); rs.setAttribute('aria-hidden', 'true'); layer.appendChild(rs); }
        rs.title = t('dragWidth');
        var top = Math.max(r.top, 8), bottom = Math.min(r.bottom, vh - 8);
        rs.style.transform = 'translate(' + Math.round(r.right - 7) + 'px,' + Math.round((top + bottom) / 2 - 24) + 'px)';
        rs.classList.toggle('is-drag', !!(drag && drag.el === c.el && drag.mode === 'width'));
        rs.setAttribute('data-label', drag && drag.el === c.el && drag.mode === 'width' ? drag.label : '');
      });
    });
    [].forEach.call(layer.children, function (h) { if (!seen[h.getAttribute('data-grip') || h.getAttribute('data-rs')]) h.remove(); });
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
  function startDrag(e, hit, mode) {
    var box = hit.box, bi = hit.bi, el = hit.card.el, key = hit.card.key, v = state(screenOf()), st = boxState(v, bi), list = cardsOf(box);
    var before = JSON.stringify(st), r0 = el.getBoundingClientRect(), gx = e.clientX - r0.left, gy = e.clientY - r0.top;
    var last = { x: e.clientX, y: e.clientY }, timer = 0;
    drag = { el: el, mode: mode, label: '' };
    document.documentElement.classList.add('wl-cz-dragging');
    el.classList.add(mode === 'move' ? 'wl-cz-moving' : 'wl-cz-sizing');
    layout(box, bi, st, screenOf());   // 아직 꾸민 적 없는 화면이면 여기서 꾸미기 모양으로 바뀐다
    var visKeys = function () { return st.order.filter(function (k) { return list.some(function (c) { return c.key === k && onPage(c); }); }); };
    var follow = function () {
      el.style.transform = ''; var b = el.getBoundingClientRect();
      el.style.transform = 'translate(' + (last.x - gx - b.left) + 'px,' + (last.y - gy - b.top) + 'px)';
    };
    var moveStep = function () {
      var others = list.filter(function (c) { return c.el !== el && onPage(c); }).map(function (c) { return { key: c.key, r: c.el.getBoundingClientRect() }; });
      if (!others.length) return follow();
      var x = last.x, y = last.y, tgt = null;
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
    var widthStep = function () {
      var b = el.getBoundingClientRect(), frac = (last.x - b.left) / Math.max(1, box.clientWidth), best = WIDTHS[0];
      WIDTHS.forEach(function (w) { if (Math.abs(w[1] - frac) < Math.abs(best[1] - frac)) best = w; });
      drag.label = t(best[0] === 'third' ? 'wThird' : best[0] === 'half' ? 'wHalf' : 'wFull');
      if ((st.width[key] || 'auto') !== best[0]) { st.width[key] = best[0]; relayout(box, bi, st, null); }
    };
    var step = function () { if (mode === 'move') moveStep(); else widthStep(); };
    var onMove = function (ev) { last = { x: ev.clientX, y: ev.clientY }; ev.preventDefault(); step(); };
    var loop = function () {   // 화면 위 · 아래 가장자리 근처면 저절로 스크롤 (가까울수록 빠르게)
      var vh = window.innerHeight, edge = Math.min(100, vh * 0.18), sp = 0;
      if (last.y < edge) sp = -Math.ceil((edge - Math.max(0, last.y)) / edge * 14) - 2; else if (last.y > vh - edge) sp = Math.ceil((Math.min(vh, last.y) - (vh - edge)) / edge * 14) + 2;
      if (sp && mode === 'move') { window.scrollBy(0, sp); step(); }
    };
    var end = function (commit) {
      clearInterval(timer);
      document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', cancel);
      el.style.transform = ''; el.classList.remove('wl-cz-moving', 'wl-cz-sizing');
      document.documentElement.classList.remove('wl-cz-dragging');
      drag = null;
      eatClick = true; setTimeout(function () { eatClick = false; }, 80);   // 손을 뗄 때 생기는 누르기는 무시한다
      if (commit && JSON.stringify(st) !== before) {
        v.boxes[boxId(box, bi)] = st; save(screenOf(), v); note = canSave ? t('saved') : t('noSave');
      }
      apply(); paint();
    };
    var up = function () { end(true); }, cancel = function () { end(false); };
    document.addEventListener('pointermove', onMove, { passive: false }); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', cancel);
    timer = setInterval(loop, 16);
    step();
  }
  function gripHit(target) {
    var h = target.closest && target.closest('.wl-cz-grip, .wl-cz-rs'); if (!h) return null;
    var id = h.getAttribute('data-grip') || h.getAttribute('data-rs'), cut = id.indexOf('|'), bi = +id.slice(0, cut), k = id.slice(cut + 1), box = boxes()[bi];
    var card = box && cardsOf(box).filter(function (c) { return c.key === k; })[0];
    return card ? { box: box, bi: bi, card: card, mode: h.classList.contains('wl-cz-rs') ? 'width' : 'move' } : null;
  }
  var eatClick = false;
  document.addEventListener('click', function (e) { if (eatClick) { eatClick = false; e.preventDefault(); e.stopPropagation(); } }, true);
  document.addEventListener('pointerdown', function (e) {
    if (!panel || drag || e.button > 0) return;
    var g = gripHit(e.target);
    if (g) { e.preventDefault(); e.stopPropagation(); return startDrag(e, g, g.mode); }
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
