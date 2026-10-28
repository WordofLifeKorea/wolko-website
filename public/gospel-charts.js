/*
 * 복음 통계 그래프 — 숫자 카드 안의 도넛(분류별 비율) + 이름·숫자 목록. 라이브러리 없이 그린다.
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

  /* ───────── 도넛 (분류별 비율) — 가운데는 비우고, 오른쪽에 이름과 숫자만 ───────── */
  function bar(id, slices, lang, s) {
    var total = slices.reduce(function (n, x) { return n + x.value; }, 0);
    if (!total) return '';   // 숫자가 하나도 없으면 카드 안에 안내 글을 반복하지 않는다(카드에는 0 만 보인다)
    var shown = slices.filter(function (sl) { return sl.value > 0; }), gap = shown.length > 1 ? 1.6 : 0, acc = 0;
    var segs = slices.map(function (sl, i) {
      if (!sl.value) return '';
      var share = sl.value / total * 100, len = Math.max(0.6, share - gap), at = acc; acc += share;
      return '<circle class="gc-seg" data-chart="' + id + '" data-i="' + i + '" data-dash="' + len.toFixed(2) + ' ' + (100 - len).toFixed(2) + '" cx="21" cy="21" r="15.9155" pathLength="100" fill="none" stroke="' + sl.color + '" stroke-width="5.4"'
        + ' stroke-dasharray="0 100" stroke-dashoffset="' + (-at - gap / 2).toFixed(2) + '" tabindex="0" role="img"'
        + ' aria-label="' + esc(sl.name + ' ' + fmt(sl.value, lang) + ' (' + pct(sl.value, total) + '%)') + '"><title>' + esc(sl.name + ' ' + fmt(sl.value, lang) + ' · ' + pct(sl.value, total) + '%') + '</title></circle>';
    }).join('');
    var legend = slices.map(function (sl, i) {
      return '<li data-chart="' + id + '" data-i="' + i + '" title="' + esc(pct(sl.value, total) + '%') + '"><i style="background:' + sl.color + '"></i><span>' + esc(sl.name) + '</span><b>' + fmt(sl.value, lang) + '</b></li>';
    }).join('');
    return '<div class="gc-bar gc-donutbox" data-chart="' + id + '"><svg class="gc-donutsvg" viewBox="0 0 42 42" aria-hidden="false"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(0,0,0,.05)" stroke-width="5.4"/>' + segs + '</svg><ul class="gc-legend">' + legend + '</ul></div>';
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
    // 헌신 · 참석 인원은 캠프 / 월코 행사 두 갈래(개인 전도에는 없는 항목) — 색은 같은 분류와 같은 색
    var two = function (keys) { return [1, 2].map(function (n, i) { return { name: s.sources[n], value: x[keys[i]] || 0, color: C.source[n] }; }); };
    var slots = { heard: heardSlices, saved: savedSlices, ded: two(['campDedications', 'eeDedications']), reach: two(['campAttendance', 'eeAttendance']) };
    document.querySelectorAll('[data-break]').forEach(function (slot) {
      var id = slot.dataset.break;
      slot.innerHTML = slots[id] ? bar(id, slots[id], lang, s) : '';
    });
    if (el) el.innerHTML = '';
    // 도넛이 돌며 그려지는 모션 — 모션을 줄여 두었으면 바로 완성된 모양으로
    var segs = document.querySelectorAll('.gc-donutsvg .gc-seg');
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    function settle() { segs.forEach(function (g) { g.style.strokeDasharray = g.dataset.dash; }); }
    if (reduce) { segs.forEach(function (g) { g.style.transition = 'none'; }); settle(); }
    else { requestAnimationFrame(function () { requestAnimationFrame(settle); }); setTimeout(function () { if (document.querySelector('.gc-donutsvg .gc-seg')) settle(); }, 1300); }
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
