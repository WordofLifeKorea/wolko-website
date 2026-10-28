/* 홈페이지 "월코와 함께 협력하는 교회" — /api/partner-churches 에서 교회 이름만 받아 카드 없이 이름 목록으로 보여 주고, 히어로 아래의 한 줄 띠(#pcStrip)에 개수를 알린다.
   교회마다 이름에서 정한 색 점이 하나씩 붙는다(움직임 없음). 목록이 없으면 구역 전체를 숨긴 채 둔다. */
(function () {
  var COLORS = [['#0b86b4', '#4cc1e6'], ['#7a6ad8', '#a99cf0'], ['#e8765c', '#f6a98e'], ['#2fa57a', '#6fd0a5'], ['#d99a2b', '#f2cb6a'], ['#d6567a', '#f09ab4']];
  var band = document.getElementById('partnerChurches'), list = document.getElementById('pcNames'), strip = document.getElementById('pcStrip'), stripDots = document.getElementById('pcStripDots');
  if (!band || !list) return;

  function colorOf(name) { var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return COLORS[h % COLORS.length]; }

  function show(names) {
    Array.prototype.forEach.call(document.querySelectorAll('.pc-count'), function (c) { c.textContent = names.length; });
    names.forEach(function (name) {
      var c = colorOf(name), li = document.createElement('li'), dot = document.createElement('i'), txt = document.createElement('span'), nm = document.createElement('span');
      // "교회 이름 (English name)" 처럼 괄호로 영문이 붙어 있으면 한글은 크게, 영문은 아래에 작게
      var m = /^(.*?)\s*[(（]\s*(.+?)\s*[)）]?\s*$/.exec(name), main = m && m[1] ? m[1] : name, en = m && m[1] ? m[2] : '';
      li.className = 'pc-item'; li.style.setProperty('--a', c[0]); li.style.setProperty('--b', c[1]);
      dot.className = 'pc-dot'; dot.setAttribute('aria-hidden', 'true');
      txt.className = 'pc-text'; nm.className = 'pc-name'; nm.textContent = main; txt.appendChild(nm);
      if (en) { var sub = document.createElement('small'); sub.className = 'pc-en'; sub.textContent = en; txt.appendChild(sub); }
      li.appendChild(dot); li.appendChild(txt);
      list.appendChild(li);
    });
    band.hidden = false;
    if (strip) {
      // 띠 앞의 작은 색 점 몇 개 — 교회마다 정해진 색을 그대로
      if (stripDots) names.slice(0, 4).forEach(function (name) { var c = colorOf(name), d = document.createElement('i'); d.style.background = 'linear-gradient(145deg,' + c[0] + ',' + c[1] + ')'; stripDots.appendChild(d); });
      strip.hidden = false;
      var link = strip.querySelector('a');
      if (link) link.addEventListener('click', function (e) {
        e.preventDefault();
        var smooth = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        band.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
        if (history.replaceState) history.replaceState(null, '', '#partnerChurches');
      });
    }
  }

  fetch('/api/partner-churches', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { var names = d && Array.isArray(d.churches) ? d.churches.filter(function (n) { return typeof n === 'string' && n; }) : []; if (names.length) show(names); })
    .catch(function () { /* 읽지 못하면 이 구역은 그냥 숨어 있다 */ });
})();
