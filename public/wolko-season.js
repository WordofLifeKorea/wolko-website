/*
 * 계절 장식 — 성탄 (12월 1일 ~ 12월 26일, 한국 시간). 날짜가 되면 저절로 켜지고 지나면 꺼진다.
 *   홈페이지: 첫 화면(#heroSection)에 천천히 내리는 눈 + 머리글 로고에 작은 호랑가시 장식
 *   포탈: 메뉴 · 머리글 로고에 같은 장식, 첫 화면 인사 카드(#hubSky)에 눈과 '성탄절까지 N일' 한 줄
 * 미리 보기: 주소 끝에 ?season=christmas (끄기: ?season=off) — 이 탭에서만 기억한다.
 * 움직임 줄이기 설정이면 눈은 내리지 않는다. 장식은 모두 클릭을 막지 않는다(pointer-events: none).
 * BaseLayout(홈페이지)과 wolko-rail.js(포탈 도구 페이지)가 불러오므로, 두 번 불려도 한 번만 돈다.
 */
(function () {
  if (window.__wolkoSeason) return;
  window.__wolkoSeason = true;

  var KEY = 'wolko-season-preview';
  function preview() {
    try {
      var q = new URLSearchParams(location.search).get('season');
      if (q === 'christmas' || q === 'off') sessionStorage.setItem(KEY, q);
      return sessionStorage.getItem(KEY) || '';
    } catch (e) { return ''; }
  }
  /** 한국 시간 오늘 { y, m, d } */
  function kstToday() {
    var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).split('-');
    return { y: +p[0], m: +p[1], d: +p[2] };
  }
  var today = kstToday(), mode = preview();
  function inSeason() { return mode === 'christmas' || (mode !== 'off' && today.m === 12 && today.d <= 26); }
  if (!inSeason()) return;
  var alive = true;   // 기간이 끝나면(포탈을 며칠씩 켜 두는 경우) false — 장식을 모두 걷는다
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────── 스타일 (이 파일 하나로 끝나게 직접 넣는다) ───────── */
  var css = ''
    + '.ws-snow{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}'
    + '.ws-holly-host{position:relative}'
    + '.ws-holly{position:absolute;pointer-events:none;width:22px;height:18px;z-index:2;filter:drop-shadow(0 1px 1px rgba(0,0,0,.18));animation:ws-pop .7s .3s cubic-bezier(.2,.9,.3,1.3) both}'
    + '.ws-holly svg{display:block;width:100%;height:100%}'
    + '@keyframes ws-pop{from{opacity:0;transform:scale(.5) rotate(-20deg)}}'
    + '.ws-xmas{display:inline-flex;align-items:center;gap:7px;margin:2px 0 10px;padding:5px 12px 5px 9px;border-radius:var(--ws-radius-sm,8px);background:rgba(8,36,76,.55);color:#fff;font-weight:800;font-size:14px;letter-spacing:-.01em;text-shadow:0 1px 3px rgba(4,18,40,.55);backdrop-filter:blur(3px)}'
    + '.ws-xmas svg{flex:none;width:15px;height:15px;filter:drop-shadow(0 0 4px rgba(255,214,90,.8))}'
    + '@media (max-width:640px){.ws-xmas{font-size:13px;margin-bottom:8px}}'
    + '@media (prefers-reduced-motion:reduce){.ws-holly{animation:none}}';
  var style = document.createElement('style');
  style.setAttribute('data-wolko-season', '');
  style.textContent = css;
  (document.head || document.documentElement).appendChild(style);

  /* ───────── 호랑가시 장식(잎 두 장 + 빨간 열매 셋) — 로고 왼쪽 위에 살짝 ───────── */
  var HOLLY = '<svg viewBox="0 0 44 36" aria-hidden="true" focusable="false">'
    + '<path d="M22 20C17 21 12 18 9 13c3 1 5-1 6-3 2 2 4 2 6 1-1 3 1 6 1 9z" fill="#2f8a4a" stroke="#1d5e31" stroke-width="1.2" stroke-linejoin="round"/>'
    + '<path d="M22 20c5 1 10-2 13-7-3 1-5-1-6-3-2 2-4 2-6 1 1 3-1 6-1 9z" fill="#3a9d57" stroke="#1d5e31" stroke-width="1.2" stroke-linejoin="round"/>'
    + '<path d="M22 20 13 14M22 20l9-6" stroke="#1d5e31" stroke-width=".9" fill="none" opacity=".6"/>'
    + '<circle cx="18.5" cy="22.5" r="4" fill="#d6283b" stroke="#9e1626" stroke-width="1"/>'
    + '<circle cx="25.5" cy="22.5" r="4" fill="#e23a4c" stroke="#9e1626" stroke-width="1"/>'
    + '<circle cx="22" cy="27.5" r="4" fill="#cf2236" stroke="#9e1626" stroke-width="1"/>'
    + '<circle cx="17.3" cy="21.3" r="1.1" fill="#fff" opacity=".75"/><circle cx="24.3" cy="21.3" r="1.1" fill="#fff" opacity=".75"/><circle cx="20.8" cy="26.3" r="1.1" fill="#fff" opacity=".75"/>'
    + '</svg>';
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.5l2.6 6.1 6.6.6-5 4.4 1.5 6.5L12 16.7 6.3 20.1l1.5-6.5-5-4.4 6.6-.6z" fill="#ffd65a" stroke="#c99a12" stroke-width="1" stroke-linejoin="round"/></svg>';

  /* 장식을 붙일 로고 — 장식은 로고 그림(img)의 왼쪽 위 모서리에 걸친다. 그림 위치로 계산하므로 메뉴 칸의 여백과 상관없다 */
  var MENU_LOGOS = ['.nav-logo', '.wolko-rail-logo-link', '.hub-sidebar-brand'];   // 홈페이지 머리글 · 포탈 왼쪽 메뉴 · 포탈 첫 화면 메뉴(폰은 위 가로 바)
  var HEADER_LOGOS = ['.car-header-logo', '.sc-logo', '.ex-title', '.app-brand', '.portal-brand', '.adm-header-logo', '.brand'];   // 포탈 도구 페이지 머리글(페이지마다 이름이 다르다)
  var LOGOS = MENU_LOGOS.concat(HEADER_LOGOS);
  /** 지금 보이는 메뉴 로고가 있으면(컴퓨터) 머리글 로고는 꾸미지 않는다 — 한 화면에 장식 하나 */
  function menuLogoShown() {
    return MENU_LOGOS.some(function (sel) { var img = document.querySelector(sel + ' img'); return img && img.offsetWidth > 0; });
  }
  var hollies = [];
  function placeHolly(item) {
    var img = item.img, s = item.el;
    // 숨겨진 로고(다른 화면 크기용)는 장식도 숨긴다. 머리글 로고는 메뉴 로고가 보이면 숨긴다
    var header = HEADER_LOGOS.some(function (sel) { return item.host.matches(sel); });
    if (!img.offsetWidth || (header && menuLogoShown())) { s.style.display = 'none'; return; }
    s.style.display = '';
    var size = Math.max(16, Math.min(24, img.offsetHeight * 0.62));
    s.style.width = size + 'px'; s.style.height = Math.round(size * 0.82) + 'px';
    s.style.left = Math.round(img.offsetLeft - size * 0.3) + 'px';
    s.style.top = Math.round(img.offsetTop - size * 0.34) + 'px';
  }
  function decorateLogos() {
    LOGOS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (host) {
        var img = host.querySelector('img');
        if (!alive || !img || host.querySelector('.ws-holly')) return;
        host.classList.add('ws-holly-host');
        var s = document.createElement('span');
        s.className = 'ws-holly'; s.setAttribute('aria-hidden', 'true'); s.innerHTML = HOLLY;
        host.appendChild(s);
        var item = { host: host, img: img, el: s }; hollies.push(item);
        placeHolly(item);
        if (!img.complete) img.addEventListener('load', function () { placeHolly(item); });
      });
    });
    hollies.forEach(placeHolly);   // 왼쪽 메뉴가 나중에 생기면 머리글 장식을 다시 숨겨야 하므로 모두 다시 맞춘다
  }
  window.addEventListener('resize', function () { hollies.forEach(placeHolly); });

  /* ───────── 눈 — 크기 · 속도가 다른 눈송이가 천천히 흔들리며 내린다. 화면 밖이거나 탭이 숨으면 멈춘다 ───────── */
  function snow(host, opt) {
    if (reduce || !host || host.querySelector('.ws-snow')) return;
    opt = opt || {};
    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
    var c = document.createElement('canvas');
    c.className = 'ws-snow'; c.setAttribute('aria-hidden', 'true');
    // 배경 위 · 글자 아래: 글자 묶음(opt.below) 바로 앞에 둔다 — 둘 다 z-index 1 이면 문서 순서로 글자가 위에 온다
    var below = opt.below && host.querySelector(opt.below);
    host.insertBefore(c, below || null);
    var ctx = c.getContext('2d'), flakes = [], w = 0, h = 0, dpr = 1, raf = 0, visible = true, last = 0;
    // 눈송이 한 장을 미리 그려 둔다(가운데는 하얗고 가장자리는 부드럽게 흐려지는 동그라미) — 매번 그리지 않고 찍기만 한다
    var sprite = document.createElement('canvas'), SP = 32; sprite.width = sprite.height = SP;
    var sc = sprite.getContext('2d'), g = sc.createRadialGradient(SP / 2, SP / 2, 0, SP / 2, SP / 2, SP / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.45, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    sc.fillStyle = g; sc.fillRect(0, 0, SP, SP);
    function size() {
      var r = host.getBoundingClientRect(); dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height; c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      var want = Math.min(opt.max || 70, Math.round(w * h / (opt.density || 9000)));
      while (flakes.length < want) flakes.push(make(true));
      flakes.length = want;
    }
    function make(anywhere) {
      var r = Math.random() * 2.6 + 1.4;   // 반지름(px) — 부드러운 가장자리까지 포함
      return { x: Math.random() * w, y: anywhere ? Math.random() * h : -8, r: r, v: 0.2 + r * 0.12 + Math.random() * 0.15, a: 0.55 + Math.random() * 0.4, p: Math.random() * 6.28, s: 0.25 + Math.random() * 0.5 };
    }
    var idle = 0;
    function frame(t) {
      raf = 0;
      if (!alive) { c.remove(); return; }
      if (!visible || document.hidden) return;
      var dt = last ? Math.min(3, (t - last) / 16.7) : 1; last = t;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      // 쉬는 동안(날씨 카드가 이미 눈을 그릴 때)은 매 프레임 돌지 않고 1초마다 다시 본다
      if (opt.skip && opt.skip()) { idle = setTimeout(function () { idle = 0; last = 0; start(); }, 1000); return; }
      {
        for (var i = 0; i < flakes.length; i++) {
          var f = flakes[i];
          f.y += f.v * dt; f.p += 0.012 * dt; f.x += Math.sin(f.p) * f.s * 0.35 * dt;
          if (f.y > h + 6 || f.x < -8 || f.x > w + 8) { flakes[i] = make(false); continue; }
          ctx.globalAlpha = f.a;
          ctx.drawImage(sprite, f.x - f.r * 1.6, f.y - f.r * 1.6, f.r * 3.2, f.r * 3.2);
        }
      }
      raf = requestAnimationFrame(frame);
    }
    function start() { if (alive && !raf && !idle && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
    size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(host); else window.addEventListener('resize', size);
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[es.length - 1].isIntersecting; start(); }).observe(host);
    document.addEventListener('visibilitychange', start);
    start();
  }

  /* ───────── 포탈 첫 화면 인사 카드: '성탄절까지 N일' 한 줄 ───────── */
  function daysToChristmas() {
    var t = Date.UTC(today.y, today.m - 1, today.d), x = Date.UTC(today.y, 11, 25);
    return Math.round((x - t) / 864e5);
  }
  function xmasText() {
    var en = (document.documentElement.lang || '').slice(0, 2) === 'en', n = daysToChristmas();
    if (n > 1) return en ? n + ' days until Christmas' : '성탄절까지 ' + n + '일';
    if (n === 1) return en ? 'Christmas is tomorrow' : '내일은 성탄절이에요';
    return en ? 'Merry Christmas!' : '메리 크리스마스!';
  }
  function decorateHub() {
    var sky = document.getElementById('hubSky'), kick = document.getElementById('hubKicker');
    if (!sky || !kick) return;
    var line = document.getElementById('wsXmasLine');
    if (!line) {
      line = document.createElement('p'); line.id = 'wsXmasLine'; line.className = 'ws-xmas';
      kick.parentNode.insertBefore(line, kick.nextSibling);
      // 화면 언어를 바꾸면(문서 lang 이 바뀌면) 글도 바꾼다
      new MutationObserver(function () { paint(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
    function paint() { if (alive) line.innerHTML = STAR + '<span>' + xmasText() + '</span>'; }
    repaintLine = paint;
    paint();
    // 날씨가 '눈'이면 카드가 이미 눈을 그리므로 겹쳐 그리지 않는다
    snow(sky, { below: '.hub-sky-content', max: 55, density: 6000, skip: function () { return sky.dataset.kind === 'snow'; } });
  }

  /** 날짜를 다시 본다 — 탭으로 돌아올 때와 한 시간마다. 'N일' 글을 고치고, 기간이 끝났으면 장식을 걷는다 */
  var repaintLine = null;
  function recheck() {
    if (!alive) return;
    today = kstToday();
    if (inSeason()) { if (repaintLine) repaintLine(); return; }
    alive = false;   // 눈 캔버스는 다음 프레임에 스스로 지운다
    watcher.disconnect();
    document.querySelectorAll('.ws-holly, #wsXmasLine, .ws-snow').forEach(function (el) { el.remove(); });
    style.remove();
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) recheck(); });
  setInterval(recheck, 60 * 60 * 1000);

  function run() {
    decorateLogos();
    snow(document.getElementById('heroSection'), { below: '.hm-hero-inner', max: 110, density: 8000 });
    decorateHub();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run); else run();
  // 포탈 메뉴 · 머리글은 나중에 그려진다(wolko-rail.js, CRS 는 로그인 확인 뒤). 새로 생긴 로고에 장식을 붙이도록
  // 문서 변화를 지켜본다 — 변화가 몰려도 0.3초에 한 번만 보고, 이미 붙은 곳은 건너뛴다. 기간이 끝나면 그만 본다
  var pendingLogos = 0;
  var watcher = new MutationObserver(function () {
    if (!alive) { watcher.disconnect(); return; }
    if (!pendingLogos) pendingLogos = setTimeout(function () { pendingLogos = 0; if (alive) decorateLogos(); }, 300);
  });
  function watch() { if (document.body) watcher.observe(document.body, { childList: true, subtree: true }); }
  if (document.body) watch(); else document.addEventListener('DOMContentLoaded', watch);
  window.addEventListener('load', decorateLogos);
})();
