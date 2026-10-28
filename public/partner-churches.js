/* 홈페이지 "월코와 함께 협력하는 교회" — /api/partner-churches 에서 교회 이름만 받아 5개씩 한 쪽으로 보여 주고, 옆으로 넘긴다.
   5초마다 저절로 넘어가고, 마우스를 올리거나 아래 점을 누르거나 화면을 밀어도 넘어간다. 목록이 없으면 구역 전체를 숨긴 채 둔다. */
(function () {
  var PER_PAGE = 5, AUTO_MS = 5000;
  var band = document.getElementById('partnerChurches'), track = document.getElementById('pcTrack'), dots = document.getElementById('pcDots');
  if (!band || !track) return;
  var pages = 0, current = 0, timer = null, hover = false;

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

  function show(names) {
    pages = Math.ceil(names.length / PER_PAGE);
    for (var p = 0; p < pages; p++) {
      var page = document.createElement('div');
      page.className = 'pc-page';
      page.setAttribute('role', 'group');
      page.setAttribute('aria-label', (p + 1) + ' / ' + pages);
      names.slice(p * PER_PAGE, (p + 1) * PER_PAGE).forEach(function (name) {
        var chip = document.createElement('span');
        chip.className = 'pc-chip';
        chip.textContent = name;
        page.appendChild(chip);
      });
      track.appendChild(page);
      if (pages > 1) {
        var dot = document.createElement('button');
        dot.type = 'button'; dot.setAttribute('role', 'tab'); dot.setAttribute('aria-label', (p + 1) + ' / ' + pages);
        dot.addEventListener('click', (function (i) { return function () { go(i); restart(); }; })(p));
        dots.appendChild(dot);
      }
    }
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
