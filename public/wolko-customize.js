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
      saved: '저장했어요.', resetDone: '처음 모양으로 돌렸어요.', copied: '가져왔어요.', phoneWidth: '휴대폰 화면에서는 카드가 한 줄에 하나씩 나와요. 순서와 보이기만 정할 수 있어요.' },
    en: { open: 'Customize this page', title: 'Customize this page', close: 'Close', done: 'Done', reset: 'Reset this screen', copyFrom: function (s) { return 'Use the ' + s + ' layout'; },
      where: function (s, w) { return 'This screen: ' + s + ' (' + w + 'px) · saved on this device only. Open the page at another size to set that layout separately.'; },
      phone: 'phone', tablet: 'tablet', desktop: 'computer', up: 'Move earlier', down: 'Move later', show: 'Show', hide: 'Hide', hiddenTag: 'Hidden',
      wAuto: 'Default', wFull: 'Full', wHalf: 'Half', wThird: '1/3', width: 'Width', card: 'Card', needOne: 'At least one card must stay visible.', noSave: 'This browser cannot save, so the page will go back to its original layout when reopened.',
      saved: 'Saved.', resetDone: 'Back to the original layout.', copied: 'Copied.', phoneWidth: 'On a phone, cards are shown one per row. You can set the order and which cards show.' },
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
  function apply() {
    if (applying) return; applying = true;
    var screen = screenOf(), saved = load(screen) || {};
    boxes().forEach(function (box, bi) {
      var list = cardsOf(box), st = (saved.boxes || {})[boxId(box, bi)];
      box.__wlCzShown = shown(box);
      if (!box.__wlCzShown) return;   // 아직 안 보이는 묶음(로그인 전 · 카드를 그리기 전)은 보일 때 입힌다
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
  function edit(bi, fn) {
    var screen = screenOf(), v = state(screen), box = boxes()[bi], id = boxId(box, bi), list = cardsOf(box);
    var st = v.boxes[id] || { order: list.map(function (c) { return c.key; }), hidden: [], width: {} };
    list.forEach(function (c) { if (st.order.indexOf(c.key) < 0) st.order.push(c.key); });
    st.order = st.order.filter(function (k) { return list.some(function (c) { return c.key === k; }); });
    if (fn(st, list) === false) return;
    v.boxes[id] = st; save(screen, v); note = canSave ? t('saved') : t('noSave'); apply(); paint();
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
    note = ''; paint();
    fab.setAttribute('aria-expanded', 'true');
    panel.addEventListener('click', onPanelClick);
    panel.addEventListener('mouseover', function (e) { var r = e.target.closest('.wl-cz-row'); focusCard(r ? +r.dataset.b : 0, r ? r.dataset.k : null, false); });
    panel.addEventListener('mouseleave', function () { focusCard(0, null); });
  }
  function closePanel() {
    if (!panel) return;
    panel.remove(); panel = null; focusCard(0, null);
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
