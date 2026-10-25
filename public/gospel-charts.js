/*
 * 복음 통계 그래프 — 원형(도넛) 2개 + 최근 6개월 선 그래프. 라이브러리 없이 SVG 로 그린다.
 *   GospelCharts.render(container, { data, tab, lang })   data 는 /api/portal/gospel-stats 응답
 * 색은 지역·종류마다 고정(검증한 팔레트), 글자는 글자 색(진한 회색)만 쓴다. 숫자는 항상 범례·표에도 있어 색에만 기대지 않는다.
 */
(function () {
  var C = { source: ['#1baf7a', '#6250d6', '#e87ba4'], surface: '#ffffff' };
  var STR = {
    ko: {
      heardTitle: '복음을 들은 인원', heardSub: '개인 전도로 복음을 들은 인원 + 캠프 참석 인원 + 월코 행사 참석 인원', savedTitle: '구원 고백', savedSub: function (heard, saved, pct) { return pct !== null ? '복음을 들은 ' + heard + '명 중 ' + saved + '명 (' + pct + '%)' : '개인 전도 · 캠프 · 전도 행사'; },
      total: '합계', empty: '아직 보고된 숫자가 없어요.',
      sources: ['개인 전도', '캠프', '월코 행사'],
    },
    en: {
      heardTitle: 'People who heard the Gospel', heardSub: 'Heard through personal evangelism + camp attendance + WOLKO event attendance', savedTitle: 'Salvations', savedSub: function (heard, saved, pct) { return pct !== null ? saved + ' of the ' + heard + ' who heard (' + pct + '%)' : 'Personal · Camps · Events'; },
      total: 'Total', empty: 'No numbers reported yet.',
      sources: ['Personal', 'Camps', 'WOLKO events'],
    },
  };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n, lang) { return Number(n || 0).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR'); }
  function info(text) { return text ? ' <button type="button" class="gs-info" data-tip="' + esc(text) + '" aria-label="' + esc(text) + '">i</button>' : ''; }
  function pct(part, whole) { return whole ? Math.round(part / whole * 100) : 0; }

  /* ───────── 도넛 ───────── */
  var R = 78, W = 30, CIRC = 2 * Math.PI * R, GAP = 3;
  function donut(id, slices, centerLabel, lang, s) {
    var total = slices.reduce(function (n, x) { return n + x.value; }, 0);
    if (!total) return '<p class="gc-empty">' + esc(s.empty) + '</p>';
    var shown = slices.filter(function (x) { return x.value > 0; }), start = 0, arcs = '';
    slices.forEach(function (sl, i) {
      if (!sl.value) return;
      var frac = sl.value / total, len = shown.length > 1 ? Math.max(0.5, frac * CIRC - GAP) : CIRC;
      arcs += '<circle class="gc-arc" data-chart="' + id + '" data-i="' + i + '" cx="110" cy="110" r="' + R + '" fill="none" stroke="' + sl.color + '" stroke-width="' + W + '"'
        + ' stroke-dasharray="' + len.toFixed(2) + ' ' + (CIRC - len).toFixed(2) + '" stroke-dashoffset="' + (-start * CIRC).toFixed(2) + '" tabindex="0" role="img"'
        + ' aria-label="' + esc(sl.name + ' ' + fmt(sl.value, lang) + ' (' + pct(sl.value, total) + '%)') + '"/>';
      start += frac;
    });
    var legend = slices.map(function (sl, i) {
      return '<li data-chart="' + id + '" data-i="' + i + '"><i style="background:' + sl.color + '"></i><span>' + esc(sl.name) + '</span><b>' + fmt(sl.value, lang) + '</b><em>' + pct(sl.value, total) + '%</em></li>';
    }).join('');
    return '<div class="gc-donut" data-chart="' + id + '" data-total="' + total + '" data-label="' + esc(centerLabel) + '">'
      + '<svg viewBox="0 0 220 220" class="gc-donut-svg" aria-hidden="false"><g transform="rotate(-90 110 110)">' + arcs + '</g>'
      + '<text class="gc-center-num" x="110" y="108" text-anchor="middle">' + fmt(total, lang) + '</text>'
      + '<text class="gc-center-label" x="110" y="130" text-anchor="middle">' + esc(centerLabel) + '</text></svg>'
      + '<ul class="gc-legend">' + legend + '</ul></div>';
  }

  /* ───────── 그리기 ───────── */
  function render(el, ctx) {
    last = { el: el, ctx: ctx };
    var lang = ctx.lang === 'en' ? 'en' : 'ko', s = STR[lang], data = ctx.data, tab = ctx.tab;
    var x = (data.summary[tab] || {});
    var bySource = function (keys) { return keys.map(function (k, i) { return { name: s.sources[i], value: x[k] || 0, color: C.source[i] }; }); };
    var heardSlices = bySource(['evangelism', 'campAttendance', 'eeAttendance']), savedSlices = bySource(['salvation', 'campSalvations', 'eeSalvations']);
    var heard = heardSlices.reduce(function (n, y) { return n + y.value; }, 0), saved = savedSlices.reduce(function (n, y) { return n + y.value; }, 0);
    el.innerHTML = '<div class="gc-grid2">'
      + '<section class="gc-card"><h3>' + esc(s.heardTitle) + info(s.heardSub) + '</h3>' + donut('heard', heardSlices, s.heardTitle, lang, s) + '</section>'
      + '<section class="gc-card"><h3>' + esc(s.savedTitle) + info(s.savedSub(fmt(heard, lang), fmt(saved, lang), heard && saved <= heard ? pct(saved, heard) : null)) + '</h3>' + donut('saved', savedSlices, s.savedTitle, lang, s) + '</section>'
      + '</div>';
  }

  /* ───────── 상호작용 (한 번만 연결) ───────── */
  function sliceInfo(chart, i) {
    var box = last && last.el.querySelector('.gc-donut[data-chart="' + chart + '"]');
    if (!box) return null;
    var li = box.querySelector('li[data-i="' + i + '"]');
    return li ? { box: box, name: li.children[1].textContent, value: li.children[2].textContent, pct: li.children[3].textContent } : null;
  }
  function focusSlice(chart, i) {
    var info = sliceInfo(chart, i);
    if (!info) return;
    info.box.classList.add('has-focus');
    info.box.querySelectorAll('[data-i]').forEach(function (n) { n.classList.toggle('is-on', n.dataset.i === String(i)); });
    info.box.querySelector('.gc-center-num').textContent = info.pct;
    info.box.querySelector('.gc-center-label').textContent = info.name + ' · ' + info.value;
  }
  function clearSlice(box) {
    box.classList.remove('has-focus');
    box.querySelectorAll('.is-on').forEach(function (n) { n.classList.remove('is-on'); });
    box.querySelector('.gc-center-num').textContent = Number(box.dataset.total).toLocaleString(last && last.ctx.lang === 'en' ? 'en-US' : 'ko-KR');
    box.querySelector('.gc-center-label').textContent = box.dataset.label;
  }
  function bind(el) {
    if (el.dataset.gcBound) return;
    el.dataset.gcBound = '1';
    el.addEventListener('click', function (e) {
      var hit = e.target.closest('.gc-arc, .gc-donut li');
      if (hit) focusSlice(hit.dataset.chart, hit.dataset.i);
    });
    el.addEventListener('mouseover', function (e) { var hit = e.target.closest('.gc-arc, .gc-donut li'); if (hit) focusSlice(hit.dataset.chart, hit.dataset.i); });
    el.addEventListener('focusin', function (e) { var hit = e.target.closest('.gc-arc'); if (hit) focusSlice(hit.dataset.chart, hit.dataset.i); });
    el.addEventListener('mouseout', function (e) { var box = e.target.closest('.gc-donut'); if (box && !(e.relatedTarget && box.contains(e.relatedTarget))) clearSlice(box); });
    el.addEventListener('focusout', function (e) { var box = e.target.closest('.gc-donut'); if (box && !(e.relatedTarget && box.contains(e.relatedTarget))) clearSlice(box); });
  }

  window.GospelCharts = { render: function (el, ctx) { bind(el); render(el, ctx); } };
})();
