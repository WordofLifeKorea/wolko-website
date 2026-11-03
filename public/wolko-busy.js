/**
 * 불러오는 중 · 처리 중 화면 — 사이트 전체 공용.
 * 사람이 누르거나 페이지를 처음 열면서 보낸 요청이 0.3초 넘게 걸리면, 화면을 회색으로 흐리게 덮고 가운데에 도는 표시를 띄운다.
 *   - 저장 · 전송 · 삭제(POST · PUT · PATCH · DELETE): "처리 중…"  — 덮는 동안 다른 곳을 누를 수 없어 두 번 저장되지 않는다
 *   - 불러오기(GET): "불러오는 중…"
 *   - 같은 사이트 안의 다른 페이지로 넘어갈 때 0.4초 넘게 걸리면: "불러오는 중…"
 * 뒤에서 조용히 도는 요청에는 띄우지 않는다: 누른 지 오래된 요청(자동 임시 저장 · 주기적 새로 고침), 아래 QUIET 주소(자체 진행 표시가 있는 것),
 *   다른 사이트로 가는 요청, fetch 옵션에 wlQuiet: true 를 준 요청.
 * 직접 쓰기: const done = WolkoBusy.start('save'); … done();  /  await WolkoBusy.wrap(promise, 'load')
 * 페이지 스크립트보다 먼저 fetch 를 감싸야 하므로 <head> 에서 defer 없이 불러온다.
 */
(function () {
  if (window.WolkoBusy) return;
  var SHOW_AFTER = 300, NAV_AFTER = 400, MIN_SHOWN = 250, ACT_WINDOW = 1500;
  // 혹시 끝나지 않는 일이 있어도 덮개가 영영 남지 않게: 페이지 이동은 8초, 요청은 60초 뒤에 스스로 걷는다
  var NAV_MAX = 8000, JOB_MAX = 60000;
  // 링크라도 파일 내려받기 · 서버 주소는 페이지가 바뀌지 않으므로 이동으로 보지 않는다
  var FILE_LINK = /^\/api\/|\.(pdf|csv|xlsx?|docx?|pptx?|zip|ics|jpe?g|png|gif|webp|heic|mp3|mp4|mov|txt|json)$/i;
  // 자체 진행 표시가 있거나 쓰는 중에 계속 도는 요청
  var QUIET = [/\/api\/car\/usage-draft/, /\/api\/car\/cost-rates/, /\/api\/car\/odometer/, /\/api\/expense\/draft/, /\/api\/expense\/rate/,
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
    style.textContent =
      '.wl-busy{position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;background:rgba(36,48,56,.26);' +
      '-webkit-backdrop-filter:blur(4px) grayscale(.55);backdrop-filter:blur(4px) grayscale(.55);opacity:0;visibility:hidden;' +
      'transition:opacity .2s ease,visibility 0s linear .2s;pointer-events:none}' +
      '.wl-busy.is-on{opacity:1;visibility:visible;transition:opacity .2s ease;pointer-events:auto;cursor:progress}' +
      '.wl-busy-box{display:grid;justify-items:center;gap:12px;min-width:132px;padding:20px 24px 18px;border-radius:14px;background:rgba(255,255,255,.94);' +
      'box-shadow:0 12px 32px rgba(10,30,40,.16);color:#173542;font:600 13.5px/1.4 "Noto Sans KR","Apple SD Gothic Neo",sans-serif;letter-spacing:-.01em}' +
      '.wl-busy-spin{width:34px;height:34px;border-radius:50%;border:3px solid #dbe8ed;border-top-color:#004f68;border-right-color:#008e92;animation:wl-busy-spin .75s linear infinite}' +
      '@keyframes wl-busy-spin{to{transform:rotate(360deg)}}' +
      '@media (prefers-reduced-motion:reduce){.wl-busy-spin{animation-duration:2.4s}.wl-busy,.wl-busy.is-on{transition:none}}' +
      '@media print{.wl-busy{display:none!important}}';
    document.head.appendChild(style);
    el = document.createElement('div');
    el.className = 'wl-busy';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="wl-busy-box"><span class="wl-busy-spin" aria-hidden="true"></span><span class="wl-busy-text"></span></div>';
    document.body.appendChild(el);
    return el;
  }
  function paint() {
    if (!jobs.size) {
      clearTimeout(showTimer); showTimer = 0;
      if (!el || !el.classList.contains('is-on')) return;
      var wait = Math.max(0, MIN_SHOWN - (Date.now() - shownAt));
      setTimeout(function () { if (!jobs.size && el) { el.classList.remove('is-on'); document.documentElement.removeAttribute('aria-busy'); } }, wait);
      return;
    }
    var kind = 'load';
    jobs.forEach(function (k) { if (k === 'save') kind = 'save'; });
    if (el && el.classList.contains('is-on')) { el.querySelector('.wl-busy-text').textContent = label(kind); return; }
    if (showTimer) return;
    var delay = Infinity;
    jobs.forEach(function (k) { delay = Math.min(delay, k === 'nav' ? NAV_AFTER : SHOW_AFTER); });
    showTimer = setTimeout(function () {
      showTimer = 0;
      if (!jobs.size || !ensure()) return;
      var k2 = 'load';
      jobs.forEach(function (k) { if (k === 'save') k2 = 'save'; });
      el.querySelector('.wl-busy-text').textContent = label(k2);
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
  // 뒤로 가기로 돌아온 페이지(bfcache)에는 덮개를 남기지 않는다
  window.addEventListener('pageshow', function (e) { if (e.persisted) { jobs.clear(); paint(); if (el) el.classList.remove('is-on'); } });

  window.WolkoBusy = {
    start: start,
    wrap: function (promise, kind) { var done = start(kind || 'load'); return Promise.resolve(promise).then(function (v) { done(); return v; }, function (err) { done(); throw err; }); },
  };
})();
