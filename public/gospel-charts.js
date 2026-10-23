/*
 * 복음 통계 그래프 — 원형(도넛) 2개 + 최근 6개월 선 그래프. 라이브러리 없이 SVG 로 그린다.
 *   GospelCharts.render(container, { data, tab, lang })   data 는 /api/portal/gospel-stats 응답
 * 색은 지역·종류마다 고정(검증한 팔레트), 글자는 글자 색(진한 회색)만 쓴다. 숫자는 항상 범례·표에도 있어 색에만 기대지 않는다.
 */
(function () {
  var C = { mainland: '#2a78d6', jeju: '#eb6834', source: ['#1baf7a', '#6250d6', '#e87ba4'], lines: ['#2a78d6', '#eb6834', '#1baf7a'], surface: '#ffffff' };
  var STR = {
    ko: {
      regionTitle: '평택 · 제주 비율', regionSub: '고른 지표를 지역별로 나눈 비율', srcTitle: '구원 고백은 어디서 나왔나요?', srcSub: '개인 전도 · 캠프 · 전도 행사 (선택한 보기 기준)',
      trendTitle: '6개월 흐름', trendSub: '선택한 보기 기준 · 달마다 합계', total: '합계', empty: '아직 보고된 숫자가 없어요.',
      metrics: { gospel: '복음을 전한 사람', salv: '구원 고백', ded: '헌신', reach: '캠프·행사 참석' },
      places: { mainland: '평택', jeju: '제주' }, sources: ['개인 전도', '캠프', '전도 행사'],
      series: ['복음을 전한 사람', '구원 고백', '헌신'], month: function (m) { return Number(m.split('-')[1]) + '월'; },
    },
    en: {
      regionTitle: 'Pyeongtaek · Jeju share', regionSub: 'The chosen figure split by location', srcTitle: 'Where did the salvations come from?', srcSub: 'Personal · Camps · Events (current view)',
      trendTitle: 'Last 6 months', trendSub: 'Current view · monthly totals', total: 'Total', empty: 'No numbers reported yet.',
      metrics: { gospel: 'Heard the Gospel', salv: 'Salvations', ded: 'Dedications', reach: 'Camp & event attendance' },
      places: { mainland: 'Pyeongtaek', jeju: 'Jeju' }, sources: ['Personal', 'Camps', 'Events'],
      series: ['Heard the Gospel', 'Salvations', 'Dedications'],
      month: function (m) { return ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][Number(m.split('-')[1]) - 1]; },
    },
  };
  var METRIC = {
    gospel: function (x) { return x.evangelism || 0; },
    salv: function (x) { return (x.salvation || 0) + (x.campSalvations || 0) + (x.eeSalvations || 0); },
    ded: function (x) { return (x.campDedications || 0) + (x.eeDedications || 0); },
    reach: function (x) { return (x.campAttendance || 0) + (x.eeAttendance || 0); },
  };
  var METRIC_KEYS = ['gospel', 'salv', 'ded', 'reach'];
  var state = { metric: 'gospel' };
  var last = null;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n, lang) { return Number(n || 0).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR'); }
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
        + ' stroke-dasharray="0 ' + CIRC.toFixed(2) + '" data-dash="' + len.toFixed(2) + ' ' + (CIRC - len).toFixed(2) + '" stroke-dashoffset="' + (-start * CIRC).toFixed(2) + '" tabindex="0" role="img"'
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

  /* ───────── 선 그래프 ───────── */
  function niceStep(v) { var p = Math.pow(10, Math.floor(Math.log(Math.max(v, 1)) / Math.LN10)), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * p; }
  function lineChart(trend, tab, lang, s) {
    var months = trend.map(function (m) { return m.month; });
    var series = [0, 1, 2].map(function (k) {
      var fn = [METRIC.gospel, METRIC.salv, METRIC.ded][k];
      return { name: s.series[k], color: C.lines[k], values: trend.map(function (m) { return fn(m[tab] || {}); }) };
    });
    var maxV = Math.max.apply(null, [0].concat.apply([], series.map(function (x) { return x.values; })));
    if (!maxV) return '<p class="gc-empty">' + esc(s.empty) + '</p>';
    var step = niceStep(maxV / 4), top = step * 4;
    var w = 680, h = 280, ml = 44, mr = 118, mt = 14, mb = 34, pw = w - ml - mr, ph = h - mt - mb;
    var X = function (i) { return ml + (months.length > 1 ? i * pw / (months.length - 1) : pw / 2); };
    var Y = function (v) { return mt + ph - v / top * ph; };
    var grid = '', i;
    for (i = 0; i <= 4; i++) { var yv = step * i; grid += '<line class="gc-grid" x1="' + ml + '" x2="' + (w - mr) + '" y1="' + Y(yv).toFixed(1) + '" y2="' + Y(yv).toFixed(1) + '"/><text class="gc-tick" x="' + (ml - 8) + '" y="' + (Y(yv) + 4).toFixed(1) + '" text-anchor="end">' + fmt(yv, lang) + '</text>'; }
    var xlab = months.map(function (m, k) { return '<text class="gc-tick" x="' + X(k).toFixed(1) + '" y="' + (h - 10) + '" text-anchor="middle">' + esc(s.month(m)) + '</text>'; }).join('');
    var lines = series.map(function (sr) {
      var pts = sr.values.map(function (v, k) { return X(k).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' ');
      return '<polyline class="gc-line" fill="none" stroke="' + sr.color + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="' + pts + '"/>';
    }).join('');
    var dots = series.map(function (sr) {
      return sr.values.map(function (v, k) { return '<circle class="gc-dot" data-k="' + k + '" cx="' + X(k).toFixed(1) + '" cy="' + Y(v).toFixed(1) + '" r="4" fill="' + sr.color + '" stroke="' + C.surface + '" stroke-width="2"/>'; }).join('');
    }).join('');
    // 끝 값 이름표 — 서로 겹치지 않게 14px 이상 띄운다
    var ends = series.map(function (sr) { return { y: Y(sr.values[sr.values.length - 1]), name: sr.name, v: sr.values[sr.values.length - 1] }; }).sort(function (a, b) { return a.y - b.y; });
    for (i = 1; i < ends.length; i++) if (ends[i].y - ends[i - 1].y < 15) ends[i].y = ends[i - 1].y + 15;
    var endLabels = ends.map(function (e) { return '<text class="gc-end" x="' + (w - mr + 10) + '" y="' + (e.y + 4).toFixed(1) + '"><tspan class="gc-end-v">' + fmt(e.v, lang) + '</tspan> ' + esc(e.name) + '</text>'; }).join('');
    var cols = months.map(function (m, k) {
      var x0 = k === 0 ? ml - 12 : (X(k - 1) + X(k)) / 2, x1 = k === months.length - 1 ? w - mr + 12 : (X(k) + X(k + 1)) / 2;
      return '<rect class="gc-hit" data-k="' + k + '" x="' + x0.toFixed(1) + '" y="' + mt + '" width="' + (x1 - x0).toFixed(1) + '" height="' + ph + '" fill="transparent"/>';
    }).join('');
    var legend = '<ul class="gc-keys">' + series.map(function (sr) { return '<li><i style="background:' + sr.color + '"></i>' + esc(sr.name) + '</li>'; }).join('') + '</ul>';
    return legend + '<div class="gc-line-wrap" data-chart="trend"><svg viewBox="0 0 ' + w + ' ' + h + '" class="gc-line-svg" role="img" aria-label="' + esc(s.trendTitle) + '">'
      + grid + xlab + '<line class="gc-cross" x1="0" x2="0" y1="' + mt + '" y2="' + (mt + ph) + '" hidden/>' + lines + dots + endLabels + cols + '</svg><div class="gc-tip" hidden></div></div>';
  }

  /* ───────── 그리기 ───────── */
  function render(el, ctx) {
    last = { el: el, ctx: ctx };
    var lang = ctx.lang === 'en' ? 'en' : 'ko', s = STR[lang], data = ctx.data, tab = ctx.tab;
    var m = state.metric, fn = METRIC[m];
    var regionSlices = [{ name: s.places.mainland, value: fn(data.summary.mainland || {}), color: C.mainland }, { name: s.places.jeju, value: fn(data.summary.jeju || {}), color: C.jeju }];
    var x = (data.summary[tab] || {});
    var srcSlices = [x.salvation || 0, x.campSalvations || 0, x.eeSalvations || 0].map(function (v, i) { return { name: s.sources[i], value: v, color: C.source[i] }; });
    var chips = METRIC_KEYS.map(function (k) { return '<button type="button" class="gc-chip' + (k === m ? ' is-active' : '') + '" data-metric="' + k + '" aria-pressed="' + (k === m) + '">' + esc(s.metrics[k]) + '</button>'; }).join('');
    el.innerHTML = '<div class="gc-grid2">'
      + '<section class="gc-card"><h3>' + esc(s.regionTitle) + '</h3><p class="gc-sub">' + esc(s.regionSub) + '</p><div class="gc-chips">' + chips + '</div>' + donut('region', regionSlices, s.metrics[m], lang, s) + '</section>'
      + '<section class="gc-card"><h3>' + esc(s.srcTitle) + '</h3><p class="gc-sub">' + esc(s.srcSub) + '</p>' + donut('source', srcSlices, s.metrics.salv, lang, s) + '</section>'
      + '</div>'
      + '<section class="gc-card gc-wide"><h3>' + esc(s.trendTitle) + '</h3><p class="gc-sub">' + esc(s.trendSub) + '</p>' + lineChart(data.trend || [], tab, lang, s) + '</section>';
    // 도넛이 그려지는 모션(한 번) — 사용자가 모션을 줄여 두었으면 바로 완성된 모양으로
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var arcs = el.querySelectorAll('.gc-arc');
    if (reduce) arcs.forEach(function (a) { a.style.transition = 'none'; a.setAttribute('stroke-dasharray', a.dataset.dash); });
    else requestAnimationFrame(function () { requestAnimationFrame(function () { arcs.forEach(function (a) { a.setAttribute('stroke-dasharray', a.dataset.dash); }); }); });
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
  function showTip(wrap, k, evt) {
    if (!last) return;
    var lang = last.ctx.lang === 'en' ? 'en' : 'ko', s = STR[lang], trend = last.ctx.data.trend, tab = last.ctx.tab, m = trend[k];
    if (!m) return;
    var svg = wrap.querySelector('svg'), tip = wrap.querySelector('.gc-tip'), cross = wrap.querySelector('.gc-cross');
    var dot = svg.querySelector('.gc-dot[data-k="' + k + '"]'), vb = svg.viewBox.baseVal, rect = svg.getBoundingClientRect(), scale = rect.width / vb.width;
    var x = Number(dot.getAttribute('cx'));
    cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.removeAttribute('hidden');
    var fns = [METRIC.gospel, METRIC.salv, METRIC.ded];
    tip.innerHTML = '<strong>' + esc(s.month(m.month)) + '</strong>' + [0, 1, 2].map(function (j) { return '<div><i style="background:' + C.lines[j] + '"></i><span>' + esc(s.series[j]) + '</span><b>' + fmt(fns[j](m[tab] || {}), lang) + '</b></div>'; }).join('');
    tip.removeAttribute('hidden');
    var left = x * scale + 14, tw = tip.offsetWidth;
    if (left + tw > rect.width) left = x * scale - tw - 14;
    tip.style.left = Math.max(4, left) + 'px'; tip.style.top = '10px';
    svg.querySelectorAll('.gc-dot').forEach(function (d) { d.setAttribute('r', d.dataset.k === String(k) ? 6 : 4); });
  }
  function hideTip(wrap) {
    wrap.querySelector('.gc-tip').setAttribute('hidden', ''); wrap.querySelector('.gc-cross').setAttribute('hidden', '');
    wrap.querySelectorAll('.gc-dot').forEach(function (d) { d.setAttribute('r', 4); });
  }

  function bind(el) {
    if (el.dataset.gcBound) return;
    el.dataset.gcBound = '1';
    el.addEventListener('click', function (e) {
      var chip = e.target.closest('[data-metric]');
      if (chip && last) { state.metric = chip.dataset.metric; render(last.el, last.ctx); return; }
      var hit = e.target.closest('.gc-arc, .gc-donut li');
      if (hit) focusSlice(hit.dataset.chart, hit.dataset.i);
    });
    el.addEventListener('mouseover', function (e) { var hit = e.target.closest('.gc-arc, .gc-donut li'); if (hit) focusSlice(hit.dataset.chart, hit.dataset.i); });
    el.addEventListener('focusin', function (e) { var hit = e.target.closest('.gc-arc'); if (hit) focusSlice(hit.dataset.chart, hit.dataset.i); });
    el.addEventListener('mouseout', function (e) { var box = e.target.closest('.gc-donut'); if (box && !(e.relatedTarget && box.contains(e.relatedTarget))) clearSlice(box); });
    el.addEventListener('focusout', function (e) { var box = e.target.closest('.gc-donut'); if (box && !(e.relatedTarget && box.contains(e.relatedTarget))) clearSlice(box); });
    el.addEventListener('pointermove', function (e) { var hit = e.target.closest('.gc-hit'); var wrap = e.target.closest('.gc-line-wrap'); if (hit && wrap) showTip(wrap, Number(hit.dataset.k), e); });
    el.addEventListener('pointerdown', function (e) { var hit = e.target.closest('.gc-hit'); var wrap = e.target.closest('.gc-line-wrap'); if (hit && wrap) showTip(wrap, Number(hit.dataset.k), e); });
    el.addEventListener('pointerleave', function () { var wrap = el.querySelector('.gc-line-wrap'); if (wrap) hideTip(wrap); });
    el.addEventListener('mouseleave', function () { var wrap = el.querySelector('.gc-line-wrap'); if (wrap) hideTip(wrap); });
  }

  window.GospelCharts = { render: function (el, ctx) { bind(el); render(el, ctx); } };
})();
