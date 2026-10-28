/* 홈페이지 "월코와 함께 협력하는 교회" — /api/partner-churches 에서 교회 이름만 받아 카드 없이 이름 목록으로 보여 준다.
   교회마다 이름에서 정한 색 점이 있고, 2.6초마다 한 곳씩 차례로 은은하게 강조된다(마우스를 올리면 그 교회가 강조되고 멈춘다).
   '모션 줄이기' 설정이나 화면 밖에서는 강조가 돌지 않는다. 목록이 없으면 구역 전체를 숨긴 채 둔다. */
(function () {
  var STEP_MS = 2600;
  var COLORS = [['#0b86b4', '#4cc1e6'], ['#7a6ad8', '#a99cf0'], ['#e8765c', '#f6a98e'], ['#2fa57a', '#6fd0a5'], ['#d99a2b', '#f2cb6a'], ['#d6567a', '#f09ab4']];
  var band = document.getElementById('partnerChurches'), list = document.getElementById('pcNames');
  if (!band || !list) return;
  var items = [], lit = -1, timer = null, hover = false, inView = false;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  function colorOf(name) { var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return COLORS[h % COLORS.length]; }

  function light(i) {
    if (lit >= 0 && items[lit]) items[lit].classList.remove('is-lit');
    lit = i;
    if (i >= 0 && items[i]) items[i].classList.add('is-lit');
  }
  function running() { return !reduce && !hover && inView && !document.hidden && items.length > 1; }
  function tick() {
    clearTimeout(timer);
    if (!running()) { if (!hover) light(-1); return; }
    light((lit + 1) % items.length);
    timer = setTimeout(tick, STEP_MS);
  }

  function show(names) {
    Array.prototype.forEach.call(band.querySelectorAll('.pc-count'), function (c) { c.textContent = names.length; });
    names.forEach(function (name, i) {
      var c = colorOf(name), li = document.createElement('li'), dot = document.createElement('i'), nm = document.createElement('span');
      li.className = 'pc-item'; li.style.setProperty('--a', c[0]); li.style.setProperty('--b', c[1]);
      dot.className = 'pc-dot'; dot.setAttribute('aria-hidden', 'true');
      nm.textContent = name;
      li.appendChild(dot); li.appendChild(nm);
      li.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') { hover = true; clearTimeout(timer); light(i); } });
      li.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hover = false; tick(); } });
      list.appendChild(li); items.push(li);
    });
    band.hidden = false;
    document.addEventListener('visibilitychange', tick);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { var v = entries[0].isIntersecting; if (v !== inView) { inView = v; tick(); } }, { threshold: 0.3 }).observe(band);
    } else { inView = true; tick(); }
  }

  fetch('/api/partner-churches', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { var names = d && Array.isArray(d.churches) ? d.churches.filter(function (n) { return typeof n === 'string' && n; }) : []; if (names.length) show(names); })
    .catch(function () { /* 읽지 못하면 이 구역은 그냥 숨어 있다 */ });
})();
