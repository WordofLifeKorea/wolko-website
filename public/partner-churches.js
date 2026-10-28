/* 홈페이지 "월코와 함께 협력하는 교회" — /api/partner-churches 에서 교회 이름만 받아 카드 없이 이름 목록으로 보여 주고, 히어로 아래의 한 줄 띠(#pcStrip)에 개수를 알린다.
   이름만 깔끔하게 늘어놓는다(색 점·움직임 없음). 목록이 없으면 구역 전체를 숨긴 채 둔다. */
(function () {
  var band = document.getElementById('partnerChurches'), list = document.getElementById('pcNames'), strip = document.getElementById('pcStrip');
  if (!band || !list) return;


  function show(names) {
    Array.prototype.forEach.call(document.querySelectorAll('.pc-count'), function (c) { c.textContent = names.length; });
    names.forEach(function (name) {
      var li = document.createElement('li'), txt = document.createElement('span'), nm = document.createElement('span');
      // "교회 이름 (English name)" 처럼 괄호로 영문이 붙어 있으면 한글은 크게, 영문은 아래에 작게
      var m = /^(.*?)\s*[(（]\s*(.+?)\s*[)）]?\s*$/.exec(name), main = m && m[1] ? m[1] : name, en = m && m[1] ? m[2] : '';
      li.className = 'pc-item';
      txt.className = 'pc-text'; nm.className = 'pc-name'; nm.textContent = main; txt.appendChild(nm);
      if (en) { var sub = document.createElement('small'); sub.className = 'pc-en'; sub.textContent = en; txt.appendChild(sub); }
      li.appendChild(txt);
      list.appendChild(li);
    });
    band.hidden = false;
    if (strip) {
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
