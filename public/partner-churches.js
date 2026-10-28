/* 홈페이지 "월코와 함께 협력하는 교회" — /api/partner-churches 에서 교회 이름만 받아 6개씩 카드로 보여 주고, 옆으로 넘긴다.
   5초마다 저절로 넘어가고, 마우스를 올리면 멈추며, 양옆 화살표·아래 점·화면 밀기로도 넘어간다. 목록이 없으면 구역 전체를 숨긴 채 둔다. */
(function () {
  var PER_PAGE = 6, AUTO_MS = 5000;
  var COLORS = [['#0b86b4', '#4cc1e6'], ['#7a6ad8', '#a99cf0'], ['#e8765c', '#f6a98e'], ['#2fa57a', '#6fd0a5'], ['#d99a2b', '#f2cb6a'], ['#d6567a', '#f09ab4']];
  var band = document.getElementById('partnerChurches'), track = document.getElementById('pcTrack'), dots = document.getElementById('pcDots');
  if (!band || !track) return;
  var pages = 0, current = 0, timer = null, hover = false;

  function colorOf(name) { var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return COLORS[h % COLORS.length]; }
  function initial(name) { var m = /[A-Za-z가-힣0-9]/.exec(name); return m ? m[0].toUpperCase() : '·'; }

  function go(n) {
    current = (n + pages) % pages;
    track.style.transform = 'translateX(' + (-100 * current) + '%)';
    Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('is-on', i === current); d.setAttribute('aria-selected', i === current ? 'true' : 'false'); });
  }
  function restart() {
    clearInterval(timer);
    if (pages < 2 || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    timer = setInterval(function () { if (!hover && !document.hidden) go(current + 1); }, AUTO_MS);
  }

  function card(name) {
    var c = colorOf(name), el = document.createElement('div'), av = document.createElement('i'), nm = document.createElement('span');
    el.className = 'pc-chip';
    av.className = 'pc-av'; av.textContent = initial(name); av.style.setProperty('--a', c[0]); av.style.setProperty('--b', c[1]); av.setAttribute('aria-hidden', 'true');
    nm.className = 'pc-name'; nm.textContent = name;
    el.appendChild(av); el.appendChild(nm);
    return el;
  }

  function show(names) {
    pages = Math.ceil(names.length / PER_PAGE);
    Array.prototype.forEach.call(band.querySelectorAll('.pc-count'), function (c) { c.textContent = names.length; });
    for (var p = 0; p < pages; p++) {
      var page = document.createElement('div');
      page.className = 'pc-page';
      page.setAttribute('role', 'group');
      page.setAttribute('aria-label', (p + 1) + ' / ' + pages);
      names.slice(p * PER_PAGE, (p + 1) * PER_PAGE).forEach(function (name) { page.appendChild(card(name)); });
      track.appendChild(page);
      if (pages > 1) {
        var dot = document.createElement('button');
        dot.type = 'button'; dot.setAttribute('role', 'tab'); dot.setAttribute('aria-label', (p + 1) + ' / ' + pages);
        dot.addEventListener('click', (function (i) { return function () { go(i); restart(); }; })(p));
        dots.appendChild(dot);
      }
    }
    var prev = document.getElementById('pcPrev'), next = document.getElementById('pcNext');
    if (pages < 2) { if (prev) prev.hidden = true; if (next) next.hidden = true; }
    else { prev.addEventListener('click', function () { go(current - 1); restart(); }); next.addEventListener('click', function () { go(current + 1); restart(); }); }
    band.hidden = false;
    go(0); restart();
    band.addEventListener('mouseenter', function () { hover = true; });
    band.addEventListener('mouseleave', function () { hover = false; });
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
    .then(function (d) { var names = d && Array.isArray(d.churches) ? d.churches.filter(function (n) { return typeof n === 'string' && n; }) : []; if (names.length) show(names); })
    .catch(function () { /* 읽지 못하면 이 구역은 그냥 숨어 있다 */ });
})();
