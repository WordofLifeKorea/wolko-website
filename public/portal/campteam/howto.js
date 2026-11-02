/* 화면마다 맨 위에 보이는 「사용법 카드」 — 지금 보고 있는 메뉴(탭)에 맞는 순서 3~4줄과 예시 줄 하나.
   글은 howto-data.js (화면 → 탭 → {ko,en}) 에 있고, 이 파일은 「지금 어느 탭이 켜져 있는지」를 보고 카드를 바꿔 끼운다.
   탭을 누를 때마다 카드가 바뀌도록 탭 줄을 지켜보다가(MutationObserver) 켜진 탭이 달라지면 다시 그린다. 접어 둔 상태도 탭마다 따로 기억한다.
   예시는 화면에 그려 보여 주기만 하는 가짜 내용이라 저장되지 않고, 카드 색을 다르게(노란 점선) 해서 실제 자료와 구분한다. */
(function () {
  var CT = window.CT, D = window.CT_HOWTO; if (!CT || !D) return;
  var ROUTE = {
    '/portal/campteam': 'home', '/portal/campteam/index': 'home', '/portal/campteam/tasks': 'tasks', '/portal/campteam/meetings': 'meetings', '/portal/campteam/files': 'files',
    '/portal/campteam/library': 'library', '/portal/campteam/prep': 'prep', '/portal/campteam/calendar': 'calendar', '/portal/campteam/alerts': 'alerts', '/portal/campteam/trash': 'trash',
    '/portal/campteam/settings': 'settings', '/portal/campteam/finance': 'finance', '/portal/campteam/budget': 'budget', '/portal/campteam/camps': 'camps', '/portal/campteam/space': 'space',
    '/portal/campteam/translate': 'translate', '/portal/campteam/search': 'search', '/portal/campteam/tv': 'tv'
  };
  var page = ROUTE[location.pathname.replace(/\/+$/, '')]; if (!page || !D[page]) return;
  var top = document.querySelector('main .top'); if (!top) return;

  /* 화면마다 「지금 켜진 탭」을 알아내는 방법. watch = 탭 줄(여기가 바뀌면 다시 확인), tab() = 탭 이름(탭이 없는 화면은 main),
     gate = 이 칸이 숨겨져 있으면 카드도 숨김(권한이 없어 잠긴 화면) */
  function on(sel, attr) { var el = document.querySelector(sel); return el && el.dataset ? (el.dataset[attr] || '') : ''; }
  var CFG = {
    tasks: { watch: '#tabs', tab: function () { return on('#tabs .tab.on', 'tab') || 'list'; } },
    meetings: { watch: '#tabs', tab: function () { return on('#tabs .tab.on', 'tab') || 'list'; } },
    files: { watch: '#viewBar', tab: function () { var v = on('#viewBar .tab.on', 'view'); if (v) return v; try { return localStorage.getItem('ct-files-view') === 'all' ? 'all' : 'folders'; } catch (e) { return 'folders'; } } },
    library: { watch: '#libTabs', tab: function () { return on('#libTabs .tab.on', 'k') || 'sermon'; } },
    prep: { watch: '#pTabs', tab: function () { return on('#pTabs .ptabs-sub .on', 'tab') || (window.CTPrep && window.CTPrep.S && window.CTPrep.S.tab) || 'timeline'; } },
    alerts: { watch: '#apTabs', tab: function () { return on('#apTabs .tab.on', 'ptab') || 'mine'; } },
    trash: { watch: '#trTabs', tab: function () { return on('#trTabs .tab.on', 'k'); } },
    finance: { watch: '#fnTabs', gate: '#fnMain', tab: function () { return on('#fnTabs [data-tab].on', 'tab') || 'summary'; } },
    budget: { gate: '#bdMain' }
  };
  var cfg = CFG[page] || {};

  CT.addDict({ ko: { htBadge: '예시 카드', htEx: '예시', htNote: '아래는 보여 주기 위한 가짜 예시예요. 실제 자료가 아니고 저장되지 않아요.', htHide: '접기 ▲', htShow: '펼치기 ▼', htBarEx: ' · 예시' },
    en: { htBadge: 'Example card', htEx: 'Example', htNote: 'The row below is a made-up example for illustration. It is not real data and is not saved.', htHide: 'Hide ▲', htShow: 'Show ▼', htBarEx: ' · example' } });

  /* 접어 둔 상태: 탭마다 따로(howto:화면:탭). 서버에 계정별로 기억하고(다른 기기에서도 같음) 못 쓰면 이 브라우저에만 기억한다. 처음엔 펼쳐서 보여 준다.
     '1' = 접음, '0' = 펼침 (다른 기기의 낡은 기억이 되살아나지 않도록 펼친 것도 값으로 남긴다). 예전 화면 단위 기억(howto:tasks 등)은 쓰지 않는다 */
  var PREFS = null, curKey = '', curTab = '', hidden = false;
  function keyOf(tab) { return 'howto:' + page + ':' + String(tab).toLowerCase().replace(/[^a-z0-9_]/g, ''); }
  function lsGet(key) { try { return localStorage.getItem('ct-' + key); } catch (e) { return null; } }
  function lsSet(key, v) { try { localStorage.setItem('ct-' + key, v); } catch (e) { /* 저장 못 해도 괜찮다 */ } }
  function foldOf(key) { var v = PREFS && PREFS[key] !== undefined ? PREFS[key] : lsGet(key); return v === '1'; }
  function remember(key, v) {
    var val = v ? '1' : '0'; lsSet(key, val); if (PREFS) PREFS[key] = val;
    CT.api('/api/campteam/ui-prefs', { method: 'PUT', body: { key: key, value: val } }).catch(function () {});
  }

  var box = document.createElement('section'); box.className = 'ct-howto'; box.id = 'ctHowto'; box.setAttribute('aria-label', 'how to use'); box.hidden = true; top.insertAdjacentElement('afterend', box);
  function paint() {
    var t = curTab && D[page][curTab], d = t && t[CT.lang() === 'en' ? 'en' : 'ko']; if (!d) { box.hidden = true; return; }
    var esc = CT.esc; box.hidden = false; box.classList.toggle('is-min', hidden);
    if (hidden) { box.innerHTML = '<div class="ht-bar"><span class="ht-bt">💡 ' + esc(d.t + CT.t('htBarEx')) + '</span><span class="ht-badge">' + esc(CT.t('htBadge')) + '</span><button type="button" class="ht-tg" data-ht="show" aria-expanded="false">' + esc(CT.t('htShow')) + '</button></div>'; return; }
    box.innerHTML = '<div class="ht-head"><b>💡 ' + esc(d.t) + '</b><span class="ht-badge">' + esc(CT.t('htBadge')) + '</span><button type="button" class="ht-tg" data-ht="hide" aria-expanded="true">' + esc(CT.t('htHide')) + '</button></div>' +
      '<ol class="ht-steps">' + d.s.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
      '<div class="ht-ex"><span class="ht-tag">' + esc(CT.t('htEx')) + '</span><div class="ht-exb"><b>' + esc(d.ex[0]) + '</b><small>' + esc(d.ex[1]) + '</small></div></div><p class="ht-note">' + esc(CT.t('htNote')) + '</p>';
  }
  /* 지금 켜진 탭을 확인해서 달라졌을 때만 카드를 바꾼다 (같은 탭이면 아무것도 안 한다) */
  function sync() {
    if (box.isConnected === false) return; // 화면이 통째로 다시 그려져 카드가 사라졌으면 멈춘다
    var g = cfg.gate && document.querySelector(cfg.gate), open = !g || !g.hidden, tab = cfg.tab ? cfg.tab() : 'main';
    if (!open || !tab || !D[page][tab]) { curKey = ''; curTab = ''; box.hidden = true; return; }
    var key = keyOf(tab); if (key === curKey) { if (box.hidden) paint(); return; }
    curKey = key; curTab = tab; hidden = foldOf(key); paint();
  }
  var queued = false, later = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
  function soon() { if (queued) return; queued = true; later(function () { queued = false; sync(); }); }
  function watch(sel, attrs) {
    var el = sel && document.querySelector(sel); if (!el || typeof MutationObserver === 'undefined') return;
    new MutationObserver(soon).observe(el, attrs ? { attributes: true, attributeFilter: attrs } : { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }
  watch(cfg.watch); watch(cfg.gate, ['hidden']);
  /* 보조 신호: 탭 줄을 직접 누르거나 주소(#, ?tab=)가 바뀔 때도 다시 확인한다 */
  var strip = cfg.watch && document.querySelector(cfg.watch); if (strip) strip.addEventListener('click', soon);
  window.addEventListener('hashchange', soon); window.addEventListener('popstate', soon);

  box.addEventListener('click', function (e) { var b = e.target.closest('[data-ht]'); if (!b || !curKey) return; hidden = b.dataset.ht === 'hide'; remember(curKey, hidden); paint(); });
  document.addEventListener('ct-lang', paint);
  document.addEventListener('ct-ready', function () {
    sync(); soon();
    CT.api('/api/campteam/ui-prefs').then(function (r) {
      PREFS = (r && r.prefs) || {};
      if (!curKey) return;
      if (PREFS[curKey] === undefined) { var l = lsGet(curKey); if (l === '1' || l === '0') remember(curKey, l === '1'); return; } // 서버에 아직 없으면 이 브라우저의 기억을 올려 둔다
      lsSet(curKey, PREFS[curKey]); var h = PREFS[curKey] === '1'; if (h !== hidden) { hidden = h; paint(); }
    }).catch(function () {});
  });
  sync(); // 처음 한 번(탭 줄이 아직 비어 있어도 기본 탭 카드가 먼저 보이게)
  [300, 1200, 3000].forEach(function (ms) { setTimeout(soon, ms); }); // 화면 글이 늦게 그려지는 경우를 위한 안전망(바뀐 게 없으면 아무 일도 안 한다)
})();
