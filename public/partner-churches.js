/* 홈페이지 "월코와 함께 협력하는 교회" 띠 — /api/partner-churches 에서 교회 이름만 받아 보여 준다. 목록이 없으면 구역 전체를 숨긴 채 둔다. */
(function () {
  var band = document.getElementById('partnerChurches'), track = document.getElementById('pcTrack');
  if (!band || !track) return;

  function chip(name, hidden) {
    var li = document.createElement('li');
    li.className = 'pc-chip';
    li.textContent = name;
    if (hidden) li.setAttribute('aria-hidden', 'true');
    return li;
  }

  function show(names) {
    names.forEach(function (n) { track.appendChild(chip(n, false)); });
    band.hidden = false;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { band.classList.add('is-static'); return; }
    var setWidth = track.getBoundingClientRect().width;             // 한 묶음(이름 전체)의 너비
    if (!setWidth) return;
    var need = Math.max(band.clientWidth, window.screen ? window.screen.width : 0) * 2;
    var copies = Math.max(1, Math.ceil(need / setWidth));            // 끊기지 않도록 묶음을 이어 붙인다
    for (var c = 0; c < copies; c++) names.forEach(function (n) { track.appendChild(chip(n, true)); });
    track.style.setProperty('--pc-shift', setWidth + 'px');
    track.style.setProperty('--pc-dur', Math.max(28, Math.round(setWidth / 55)) + 's');   // 초당 약 55px
  }

  fetch('/api/partner-churches', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { var names = d && Array.isArray(d.churches) ? d.churches.filter(function (n) { return typeof n === 'string' && n; }) : []; if (names.length) show(names); })
    .catch(function () { /* 읽지 못하면 이 구역은 그냥 숨어 있다 */ });
})();
