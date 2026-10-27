/*
 * 복음 통계 그래프 — 숫자 카드 안의 가로 막대(분류별 비율) + 범례. 라이브러리 없이 그린다.
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

  /* ───────── 가로 막대 (분류별 비율) ───────── */
  function bar(id, slices, lang, s) {
    var total = slices.reduce(function (n, x) { return n + x.value; }, 0);
    if (!total) return '<p class="gc-empty">' + esc(s.empty) + '</p>';
    var segs = slices.map(function (sl, i) {
      if (!sl.value) return '';
      return '<span class="gc-seg" data-chart="' + id + '" data-i="' + i + '" data-v="' + sl.value + '" style="background:' + sl.color + ';flex-grow:0" tabindex="0" role="img"'
        + ' aria-label="' + esc(sl.name + ' ' + fmt(sl.value, lang) + ' (' + pct(sl.value, total) + '%)') + '" title="' + esc(sl.name + ' ' + fmt(sl.value, lang) + ' · ' + pct(sl.value, total) + '%') + '"></span>';
    }).join('');
    var legend = slices.map(function (sl, i) {
      return '<li data-chart="' + id + '" data-i="' + i + '"><i style="background:' + sl.color + '"></i><span>' + esc(sl.name) + '</span><b>' + fmt(sl.value, lang) + '</b><em>' + pct(sl.value, total) + '%</em></li>';
    }).join('');
    return '<div class="gc-bar" data-chart="' + id + '"><div class="gc-track">' + segs + '</div><ul class="gc-legend">' + legend + '</ul></div>';
  }

  /* ───────── 그리기 ───────── */
  function render(el, ctx) {
    last = { el: el, ctx: ctx };
    var lang = ctx.lang === 'en' ? 'en' : 'ko', s = STR[lang], data = ctx.data, tab = ctx.tab;
    var x = (data.summary[tab] || {});
    var bySource = function (keys) { return keys.map(function (k, i) { return { name: s.sources[i], value: x[k] || 0, color: C.source[i] }; }); };
    var heardSlices = bySource(['evangelism', 'campAttendance', 'eeAttendance']), savedSlices = bySource(['salvation', 'campSalvations', 'eeSalvations']);
    var heard = heardSlices.reduce(function (n, y) { return n + y.value; }, 0), saved = savedSlices.reduce(function (n, y) { return n + y.value; }, 0);
    // 복음을 들은 인원 · 구원 고백 카드 안에 분류별 막대를 채운다(카드는 gospel-stats.js 가 만든다)
    var slots = { heard: heardSlices, saved: savedSlices };
    document.querySelectorAll('[data-break]').forEach(function (slot) {
      var id = slot.dataset.break;
      slot.innerHTML = slots[id] ? bar(id, slots[id], lang, s) : '';
    });
    if (el) el.innerHTML = '';
    // 막대가 차오르는 모션 — 모션을 줄여 두었으면 바로 완성된 모양으로
    var segs = document.querySelectorAll('.gc-seg');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function settle() { segs.forEach(function (g) { g.style.flexGrow = g.dataset.v; }); }
    if (reduce) { segs.forEach(function (g) { g.style.transition = 'none'; }); settle(); }
    else { requestAnimationFrame(function () { requestAnimationFrame(settle); }); setTimeout(function () { if (document.querySelector('.gc-seg')) settle(); }, 1300); }
  }

  /* ───────── 상호작용 (한 번만 연결) ───────── */
  function mark(chart, i, on) {
    document.querySelectorAll('.gc-bar[data-chart="' + chart + '"] [data-i]').forEach(function (n) { n.classList.toggle('is-on', on && n.dataset.i === String(i)); });
    var box = document.querySelector('.gc-bar[data-chart="' + chart + '"]');
    if (box) box.classList.toggle('has-focus', on);
  }
  function bind(el) {
    if (document.documentElement.dataset.gcBound) return;
    document.documentElement.dataset.gcBound = '1';
    document.addEventListener('mouseover', function (e) { var hit = e.target.closest && e.target.closest('.gc-seg, .gc-bar li'); if (hit) mark(hit.dataset.chart, hit.dataset.i, true); });
    document.addEventListener('mouseout', function (e) { var hit = e.target.closest && e.target.closest('.gc-seg, .gc-bar li'); if (hit) mark(hit.dataset.chart, hit.dataset.i, false); });
    document.addEventListener('focusin', function (e) { var hit = e.target.closest && e.target.closest('.gc-seg'); if (hit) mark(hit.dataset.chart, hit.dataset.i, true); });
    document.addEventListener('focusout', function (e) { var hit = e.target.closest && e.target.closest('.gc-seg'); if (hit) mark(hit.dataset.chart, hit.dataset.i, false); });
  }

  window.GospelCharts = { render: function (el, ctx) { bind(el); render(el, ctx); } };
})();
