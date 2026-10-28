/* 홈페이지 "월코와 함께 협력하는 교회" — /api/partner-churches 에서 교회 이름·지역만 받아 카드로 보여 주고, 옆으로 넘긴다.
   한 쪽에 보이는 개수는 화면 크기를 따른다(넓은 화면 10개 = 5×2, 중간 9개 = 3×3, 휴대폰 8개 = 2×4).
   슬라이드쇼처럼 5.5초마다 저절로 넘어가고(아래 점이 차오르며 남은 시간을 보여 준다), 마우스를 올리거나 키보드 초점이 들어오면 멈춘다. 일시정지 버튼·양옆 화살표·점·화면 밀기로도 넘길 수 있다.
   '모션 줄이기' 설정에서는 밀리는 대신 부드럽게 바뀐다. 구역이 화면에 보일 때만 돌아가고, 목록이 없으면 구역 전체를 숨긴 채 둔다. */
(function () {
  var AUTO_MS = 5500;
  var COLORS = [['#0b86b4', '#4cc1e6'], ['#7a6ad8', '#a99cf0'], ['#e8765c', '#f6a98e'], ['#2fa57a', '#6fd0a5'], ['#d99a2b', '#f2cb6a'], ['#d6567a', '#f09ab4']];
  var band = document.getElementById('partnerChurches'), track = document.getElementById('pcTrack'), dots = document.getElementById('pcDots');
  if (!band || !track) return;
  var names = [], areas = {}, pages = 0, current = 0, timer = null, hover = false, focused = false, inView = false, userPaused = false;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  band.style.setProperty('--pc-ms', AUTO_MS + 'ms');

  function colorOf(name) { var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return COLORS[h % COLORS.length]; }
  function initial(name) { var m = /[A-Za-z가-힣0-9]/.exec(name); return m ? m[0].toUpperCase() : '·'; }

  function isEn() { return document.body.classList.contains('lang-en') || document.documentElement.lang === 'en'; }
  function playing() { return pages > 1 && !userPaused && !hover && !focused && inView && !document.hidden; }
  function go(n) {
    current = (n + pages) % pages;
    track.style.transform = 'translateX(' + (-100 * current) + '%)';
    if (reduce) { var vp = track.parentNode; vp.classList.remove('pc-flash'); void vp.offsetWidth; vp.classList.add('pc-flash'); }   // 모션 줄이기: 밀리지 않고 부드럽게 바뀐다
    Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('is-on', i === current); d.setAttribute('aria-selected', i === current ? 'true' : 'false'); });
  }
  /** 다음 장으로 넘어갈 시간을 다시 잰다 — 점 위의 채움 애니메이션도 같은 길이로 처음부터 */
  function restart() {
    clearTimeout(timer);
    band.classList.toggle('is-playing', playing());
    var on = dots.querySelector('.is-on'); if (on) { on.classList.remove('pc-run'); void on.offsetWidth; if (playing()) on.classList.add('pc-run'); }
    if (!playing()) return;
    timer = setTimeout(function () { go(current + 1); restart(); }, AUTO_MS);
  }
  function setPaused(v) {
    userPaused = v;
    var b = document.getElementById('pcPause');
    if (b) { b.classList.toggle('is-paused', v); b.setAttribute('aria-pressed', v ? 'true' : 'false'); b.setAttribute('aria-label', v ? (isEn() ? 'Play slideshow' : '자동 넘김 재생') : (isEn() ? 'Pause slideshow' : '자동 넘김 일시정지')); }
    restart();
  }

  function card(name) {
    var c = colorOf(name), el = document.createElement('div'), av = document.createElement('i'), nm = document.createElement('span');
    el.className = 'pc-chip';
    av.className = 'pc-av'; av.textContent = initial(name); av.style.setProperty('--a', c[0]); av.style.setProperty('--b', c[1]); av.setAttribute('aria-hidden', 'true');
    nm.className = 'pc-name'; nm.textContent = name;
    el.appendChild(av); el.appendChild(nm);
    if (areas[name]) { var ar = document.createElement('small'); ar.className = 'pc-area'; ar.textContent = areas[name]; el.appendChild(ar); }
    return el;
  }
  /** 화면 폭에 맞는 한 쪽 개수 */
  function perPage() { var w = window.innerWidth; return w > 1000 ? 10 : (w > 640 ? 9 : 8); }
  var laidOut = 0;

  /** 쪽(카드 묶음)과 점을 지금 화면 크기에 맞게 다시 만든다 */
  function layout() {
    var per = perPage(); laidOut = per;
    pages = Math.ceil(names.length / per);
    track.innerHTML = ''; dots.innerHTML = '';
    for (var p = 0; p < pages; p++) {
      var page = document.createElement('div');
      page.className = 'pc-page';
      page.setAttribute('role', 'group');
      page.setAttribute('aria-label', (p + 1) + ' / ' + pages);
      names.slice(p * per, (p + 1) * per).forEach(function (name) { page.appendChild(card(name)); });
      track.appendChild(page);
      if (pages > 1) {
        var dot = document.createElement('button');
        dot.type = 'button'; dot.setAttribute('role', 'tab'); dot.setAttribute('aria-label', (p + 1) + ' / ' + pages);
        dot.addEventListener('click', (function (i) { return function () { go(i); restart(); }; })(p));
        dots.appendChild(dot);
      }
    }
    var prev = document.getElementById('pcPrev'), next = document.getElementById('pcNext'), pause = document.getElementById('pcPause');
    if (prev) prev.hidden = pages < 2; if (next) next.hidden = pages < 2; if (pause) pause.hidden = pages < 2;
    go(0); restart();
  }

  function show(list, areaMap) {
    names = list; areas = areaMap || {};
    Array.prototype.forEach.call(band.querySelectorAll('.pc-count'), function (c) { c.textContent = names.length; });
    var prev = document.getElementById('pcPrev'), next = document.getElementById('pcNext');
    if (prev) prev.addEventListener('click', function () { go(current - 1); restart(); });
    if (next) next.addEventListener('click', function () { go(current + 1); restart(); });
    var pause = document.createElement('button');
    pause.type = 'button'; pause.id = 'pcPause'; pause.className = 'pc-pause'; pause.setAttribute('aria-pressed', 'false');
    pause.addEventListener('click', function () { setPaused(!userPaused); });
    band.appendChild(pause);
    band.hidden = false;
    layout(); setPaused(false);
    // 화면 크기가 바뀌어 한 쪽 개수가 달라지면 처음부터 다시 나눈다 (회전·창 크기 조절)
    var resizeTimer = null;
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { if (perPage() !== laidOut) layout(); }, 200); });
    // 마우스(터치 아님)가 올라가 있거나 키보드 초점이 안에 있으면 잠깐 멈춘다 — 터치 기기에서 한 번 눌러도 영영 멈추지 않도록 포인터 종류를 본다
    band.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hover = true; restart(); } });
    band.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hover = false; restart(); } });
    band.addEventListener('focusin', function () { focused = true; restart(); });
    band.addEventListener('focusout', function () { focused = false; restart(); });
    document.addEventListener('visibilitychange', restart);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { var v = entries[0].isIntersecting; if (v !== inView) { inView = v; restart(); } }, { threshold: 0.25 }).observe(band);
    } else { inView = true; restart(); }
    var x0 = null;
    band.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    band.addEventListener('touchend', function (e) {
      if (x0 === null || pages < 2) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) { go(current + (dx < 0 ? 1 : -1)); restart(); }
    }, { passive: true });
  }

  fetch('/api/partner-churches', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { var names = d && Array.isArray(d.churches) ? d.churches.filter(function (n) { return typeof n === 'string' && n; }) : []; if (names.length) show(names, d.areas && typeof d.areas === 'object' ? d.areas : {}); })
    .catch(function () { /* 읽지 못하면 이 구역은 그냥 숨어 있다 */ });
})();
