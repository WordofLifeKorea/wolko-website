/**
 * 불러오는 중 · 처리 중 표시 — 사이트 전체 공용.
 * 사람이 누르거나 페이지를 처음 열면서 보낸 요청이 0.3초 넘게 걸리면, 화면 가운데에 작은 도는 동그라미만 띄운다.
 * 화면을 흐리게 덮거나 글자 상자를 띄우지 않는다 — 읽던 화면(PDF 등)을 가리지 않게.
 *   - 불러오기(GET) · 다른 페이지로 넘어가기: 동그라미만 돌고, 그동안에도 화면의 다른 곳을 누를 수 있다
 *   - 저장 · 전송 · 삭제(POST · PUT · PATCH · DELETE): 같은 동그라미를 띄우되, 끝날 때까지 투명한 막으로 다른 곳을 못 누르게 한다
 *     (두 번 눌러 두 번 저장되는 일을 막는다. 화면은 흐려지지 않는다)
 *   - 같은 사이트 안의 다른 페이지로 넘어갈 때 0.4초 넘게 걸리면 띄운다
 * 화면 읽기 도구에는 "불러오는 중…" / "처리 중…"을 소리 내어 알린다(글자는 화면에 보이지 않는다).
 * 뒤에서 조용히 도는 요청에는 띄우지 않는다: 누른 지 오래된 요청(자동 임시 저장 · 주기적 새로 고침), 아래 QUIET 주소(자체 진행 표시가 있는 것),
 *   다른 사이트로 가는 요청, fetch 옵션에 wlQuiet: true 를 준 요청.
 * 직접 쓰기: const done = WolkoBusy.start('save'); … done();  /  await WolkoBusy.wrap(promise, 'load')
 * 페이지 스크립트보다 먼저 fetch 를 감싸야 하므로 <head> 에서 defer 없이 불러온다.
 */
(function () {
  if (window.WolkoBusy) return;
  var SHOW_AFTER = 300, NAV_AFTER = 400, MIN_SHOWN = 250, ACT_WINDOW = 1500;
  // 혹시 끝나지 않는 일이 있어도 표시가 영영 남지 않게: 페이지 이동은 8초, 요청은 60초 뒤에 스스로 걷는다
  var NAV_MAX = 8000, JOB_MAX = 60000;
  // 링크라도 파일 내려받기 · 서버 주소는 페이지가 바뀌지 않으므로 이동으로 보지 않는다
  var FILE_LINK = /^\/api\/|\.(pdf|csv|xlsx?|docx?|pptx?|zip|ics|jpe?g|png|gif|webp|heic|mp3|mp4|mov|txt|json)$/i;
  // 자체 진행 표시가 있거나 쓰는 중에 계속 도는 요청
  var QUIET = [/\/api\/car\/usage-draft/, /\/api\/car\/cost-rates/, /\/api\/car\/odometer/, /\/api\/expense\/draft/, /\/api\/expense\/rate/, /\/api\/expense\/receipt/,
    /\/api\/campteam\/ai-/, /translate/];
  var T = { ko: { load: '불러오는 중…', save: '처리 중…' }, en: { load: 'Loading…', save: 'Processing…' } };
  var label = function (k) { return (/^en/i.test(document.documentElement.lang || '') ? T.en : T.ko)[k]; };

  var lastAct = 0, loaded = false, loadedAt = 0;
  var markAct = function () { lastAct = Date.now(); };
  ['pointerdown', 'submit'].forEach(function (ev) { document.addEventListener(ev, markAct, true); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') markAct(); }, true);
  window.addEventListener('load', function () { loaded = true; loadedAt = Date.now(); });
  // 페이지를 처음 여는 동안(다 열린 뒤 2초까지) 보낸 요청은 첫 화면을 채우는 요청으로 본다
  var opening = function () { return !loaded || Date.now() - loadedAt < 2000; };
  var userDriven = function () { return opening() || Date.now() - lastAct < ACT_WINDOW; };

  var jobs = new Map(), seq = 0, showTimer = 0, shownAt = 0, el = null, style = null;
  function ensure() {
    if (el || !document.body) return el;
    style = document.createElement('style');
    // 덮개(.wl-busy)는 늘 투명하고 기본으로 클릭이 지나간다. 저장 중(.is-save)일 때만 투명한 채로 클릭을 막는다.
    style.textContent =
      '.wl-busy{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:transparent;' +
      'opacity:0;visibility:hidden;transition:opacity .15s ease,visibility 0s linear .15s;pointer-events:none}' +
      '.wl-busy.is-on{opacity:1;visibility:visible;transition:opacity .15s ease}' +
      '.wl-busy.is-on.is-save{pointer-events:auto;cursor:progress}' +
      '.wl-busy-spin{box-sizing:border-box;width:32px;height:32px;border-radius:50%;border:3px solid rgba(219,232,237,.9);border-top-color:#004f68;border-right-color:#008e92;' +
      'background:rgba(255,255,255,.6);box-shadow:0 0 0 4px rgba(255,255,255,.6);animation:wl-busy-spin .75s linear infinite;pointer-events:none}' +
      '.wl-busy-text{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}' +
      '@keyframes wl-busy-spin{to{transform:rotate(360deg)}}' +
      '@media (prefers-reduced-motion:reduce){.wl-busy-spin{animation-duration:2.4s}.wl-busy,.wl-busy.is-on{transition:none}}' +
      '@media print{.wl-busy{display:none!important}}';
    document.head.appendChild(style);
    el = document.createElement('div');
    el.className = 'wl-busy';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<span class="wl-busy-spin" aria-hidden="true"></span><span class="wl-busy-text"></span>';
    document.body.appendChild(el);
    return el;
  }
  // 지금 도는 일 가운데 저장이 하나라도 있으면 'save', 아니면 'load'
  function currentKind() {
    var kind = 'load';
    jobs.forEach(function (k) { if (k === 'save') kind = 'save'; });
    return kind;
  }
  function apply(kind) {
    el.querySelector('.wl-busy-text').textContent = label(kind);
    el.classList.toggle('is-save', kind === 'save');
  }
  function paint() {
    if (!jobs.size) {
      clearTimeout(showTimer); showTimer = 0;
      if (!el || !el.classList.contains('is-on')) return;
      var wait = Math.max(0, MIN_SHOWN - (Date.now() - shownAt));
      setTimeout(function () {
        if (!jobs.size && el) { el.classList.remove('is-on', 'is-save'); document.documentElement.removeAttribute('aria-busy'); }
      }, wait);
      return;
    }
    if (el && el.classList.contains('is-on')) { apply(currentKind()); return; }
    if (showTimer) return;
    var delay = Infinity;
    jobs.forEach(function (k) { delay = Math.min(delay, k === 'nav' ? NAV_AFTER : SHOW_AFTER); });
    showTimer = setTimeout(function () {
      showTimer = 0;
      if (!jobs.size || !ensure()) return;
      apply(currentKind());
      el.classList.add('is-on'); shownAt = Date.now();
      document.documentElement.setAttribute('aria-busy', 'true');
    }, delay);
  }
  function start(kind) {
    var id = ++seq;
    jobs.set(id, kind === 'save' ? 'save' : kind === 'nav' ? 'nav' : 'load');
    paint();
    var ended = false;
    var done = function () { if (ended) return; ended = true; clearTimeout(cap); jobs.delete(id); paint(); };
    var cap = setTimeout(done, kind === 'nav' ? NAV_MAX : JOB_MAX);
    return done;
  }

  // fetch 감싸기: 같은 사이트로 가는, 사람이 일으킨 요청만 센다
  var nativeFetch = window.fetch && window.fetch.bind(window);
  if (nativeFetch) {
    window.fetch = function (input, init) {
      var quiet = !!(init && init.wlQuiet);
      var url = '', method = 'GET';
      try {
        url = typeof input === 'string' ? input : (input && input.url) || String(input);
        method = String((init && init.method) || (input && input.method) || 'GET').toUpperCase();
      } catch (e) { quiet = true; }
      var u = null;
      try { u = new URL(url, location.href); } catch (e) { quiet = true; }
      if (!quiet && (!u || u.origin !== location.origin || QUIET.some(function (re) { return re.test(u.pathname); }) || !userDriven())) quiet = true;
      var p = nativeFetch(input, init);
      if (quiet) return p;
      var done = start(method === 'GET' || method === 'HEAD' ? 'load' : 'save');
      p.then(done, done);
      return p;
    };
  }

  // 다른 페이지로 넘어갈 때: 같은 사이트 링크를 새 탭이 아닌 채로 누른 경우
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.hasAttribute('download') || (a.target && a.target !== '_self')) return;
    var u;
    try { u = new URL(a.href, location.href); } catch (err) { return; }
    if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search) || FILE_LINK.test(u.pathname)) return;
    // 페이지 스크립트가 클릭을 가로채 이동을 막았는지 본 다음에 띄운다
    setTimeout(function () { if (!e.defaultPrevented) start('nav'); }, 0);
  });
  // 스크립트가 가로채지 않은 보통 양식 제출(페이지가 바뀜)
  document.addEventListener('submit', function (e) {
    var f = e.target;
    setTimeout(function () { if (!e.defaultPrevented && f && (!f.target || f.target === '_self')) start('nav'); }, 0);
  });
  // 뒤로 가기로 돌아온 페이지(bfcache)에는 표시를 남기지 않는다
  window.addEventListener('pageshow', function (e) { if (e.persisted) { jobs.clear(); paint(); if (el) el.classList.remove('is-on', 'is-save'); } });

  window.WolkoBusy = {
    start: start,
    wrap: function (promise, kind) { var done = start(kind || 'load'); return Promise.resolve(promise).then(function (v) { done(); return v; }, function (err) { done(); throw err; }); },
  };
})();
