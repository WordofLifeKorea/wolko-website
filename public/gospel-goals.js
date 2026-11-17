/*
 * 복음 통계 — 연간 복음 도달 목표 카드. 라이브러리 없이 그린다.
 *   GospelGoals.render(el, { reach, summary, year, tab, lang, loading })
 *     reach   = API 의 reach({ fields, goals, partialYears })
 *     summary = 그 해 누적 집계({ mainland, jeju, all }) — 아직 불러오는 중이면 null
 * 원형 그래프는 목표 대비 달성률(100%에서 꽉 참), 숫자는 늘 글자로도 보여 준다. 아래 표는 2030년까지의 목표 전체.
 * 전체 탭은 평택·제주를 합친 원 하나(목표도 합계) — 두 지역을 나란히 견주지 않는다. 평택·제주 탭에서는 그 지역 원 하나.
 */
(function () {
  var COLOR = '#0a6a8f';   // 평택·제주를 경쟁처럼 보이지 않게 한 색만 쓴다
  var STR = {
    ko: {
      title: function (y) { return y + '년 복음 도달 목표'; }, mainland: '평택', jeju: '제주', all: '평택 · 제주 전체', total: '합계',
      of: function (n, g) { return n + ' / ' + g + '명'; }, left: function (n) { return '목표까지 ' + n + '명'; }, done: '목표 달성', over: function (n) { return '목표보다 ' + n + '명 더'; },
      noGoal: '이 해의 목표는 정하지 않았어요', reached: function (n) { return '지금까지 ' + n + '명'; }, loading: '불러오는 중…',
      parts: ['복음 대화', '캠프', '행사', '전도지', 'SNS'],
      def: '도달 인원 = 개인 전도로 복음을 들은 인원 + 캠프 참석 + 월코·교회 행사 참석 + 전도지 + SNS 도달',
      partial: function (y) { return y + '년은 포탈 보고를 연중에 시작해 그 전 기록이 빠져 있어요. 달성률은 참고로만 봐 주세요.'; },
      tableTitle: '연도별 목표', year: '연도', pctNow: function (p) { return '현재 ' + p + '%'; }, ring: function (name, p) { return name + ' 달성률 ' + p + '%'; },
    },
    en: {
      title: function (y) { return y + ' Gospel Reach Goal'; }, mainland: 'Pyeongtaek', jeju: 'Jeju', all: 'Pyeongtaek + Jeju', total: 'Total',
      of: function (n, g) { return n + ' / ' + g; }, left: function (n) { return n + ' to go'; }, done: 'Goal reached', over: function (n) { return n + ' over goal'; },
      noGoal: 'No goal set for this year', reached: function (n) { return n + ' reached so far'; }, loading: 'Loading…',
      parts: ['Gospel conversations', 'Camps', 'Events', 'Literature', 'Social media'],
      def: 'Reach = heard through personal evangelism + camp attendance + WOLKO and church event attendance + literature + social media reach',
      partial: function (y) { return 'Portal reporting began partway through ' + y + ', so earlier records are missing. Treat the percentage as a rough guide.'; },
      tableTitle: 'Goals by year', year: 'Year', pctNow: function (p) { return p + '% now'; }, ring: function (name, p) { return name + ' ' + p + '% of goal'; },
    },
  };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function fmt(n, lang) { return Number(n || 0).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR'); }
  function reachOf(totals, fields) { return fields.reduce(function (sum, id) { return sum + (Number(totals && totals[id]) || 0); }, 0); }
  /** 달성률 — 1% 미만이지만 0 은 아닐 때는 소수 한 자리 */
  function pctOf(n, goal) { if (!goal) return 0; var p = n / goal * 100; return p > 0 && p < 1 ? Math.round(p * 10) / 10 : Math.round(p); }

  /** 한 해의 목표 — all 은 평택·제주 목표의 합(정한 곳만 더한다) */
  function goalOf(goals, loc, y) {
    if (loc !== 'all') return (goals[loc] || {})[y] || 0;
    return ((goals.mainland || {})[y] || 0) + ((goals.jeju || {})[y] || 0);
  }
  function ring(loc, ctx, s) {
    var lang = ctx.lang, goal = goalOf(ctx.reach.goals, loc, ctx.year), name = s[loc], color = COLOR;
    var head = '<h3 class="gg-name">' + esc(name) + '</h3>';
    if (!ctx.summary) return '<div class="gg-ring">' + head + '<p class="gg-wait">' + esc(s.loading) + '</p></div>';
    var totals = ctx.summary[loc] || {}, n = reachOf(totals, ctx.reach.fields);
    var parts = '<ul class="gg-parts">' + ctx.reach.fields.map(function (id, i) { return '<li><span>' + esc(s.parts[i]) + '</span><b>' + fmt(totals[id], lang) + '</b></li>'; }).join('') + '</ul>';
    if (!goal) return '<div class="gg-ring gg-nogoal">' + head + '<div class="gg-body"><div class="gg-text"><strong>' + esc(s.reached(fmt(n, lang))) + '</strong><span>' + esc(s.noGoal) + '</span></div></div>' + parts + '</div>';
    var p = pctOf(n, goal), arc = Math.min(100, n / goal * 100), dash = arc > 0 ? Math.max(1, arc) : 0;
    var status = n > goal ? s.over(fmt(n - goal, lang)) : n === goal ? s.done : s.left(fmt(goal - n, lang));
    return '<div class="gg-ring">' + head + '<div class="gg-body">'
      + '<svg class="gg-svg" viewBox="0 0 42 42" role="img" aria-label="' + esc(s.ring(name, p)) + '"><circle cx="21" cy="21" r="15.9155" fill="none" stroke="rgba(10,76,99,.09)" stroke-width="4.6"/>'
      + (arc <= 0 ? '' : '<circle class="gg-arc" cx="21" cy="21" r="15.9155" pathLength="100" fill="none" stroke="' + color + '" stroke-width="4.6" stroke-linecap="' + (arc >= 100 ? 'butt' : 'round') + '" stroke-dasharray="' + (arc >= 100 ? '100 0' : dash.toFixed(2) + ' 100') + '" transform="rotate(-90 21 21)"/>')
      + '<text x="21" y="21" text-anchor="middle" dominant-baseline="central" class="gg-pct">' + p + '%</text></svg>'
      + '<div class="gg-text"><strong>' + esc(s.of(fmt(n, lang), fmt(goal, lang))) + '</strong><span>' + esc(status) + '</span></div></div>' + parts + '</div>';
  }

  function table(ctx, s) {
    var lang = ctx.lang, goals = ctx.reach.goals, years = {};
    ['mainland', 'jeju'].forEach(function (loc) { Object.keys(goals[loc] || {}).forEach(function (y) { years[y] = 1; }); });
    var shownLoc = ctx.tab === 'mainland' || ctx.tab === 'jeju' ? ctx.tab : 'all';   // '현재 %'는 지금 보고 있는 탭의 칸에만
    var cell = function (loc, y, cls) {
      var g = goalOf(goals, loc, y); if (!g) return '<td' + (cls ? ' class="' + cls + '"' : '') + '>—</td>';
      var now = loc === shownLoc && String(y) === String(ctx.year) && ctx.summary ? '<small>' + esc(s.pctNow(pctOf(reachOf(ctx.summary[loc], ctx.reach.fields), g))) + '</small>' : '';
      return '<td' + (cls ? ' class="' + cls + '"' : '') + '>' + fmt(g, lang) + now + '</td>';
    };
    var rows = Object.keys(years).sort().map(function (y) {
      return '<tr class="' + (String(y) === String(ctx.year) ? 'is-now' : '') + '"><th scope="row">' + y + '</th>' + cell('mainland', y) + cell('jeju', y) + cell('all', y, 'gs-total') + '</tr>';
    }).join('');
    return '<h3 class="gg-sub">' + esc(s.tableTitle) + '</h3><div class="gs-tablewrap"><table class="gs-table gg-table"><thead><tr><th scope="col">' + esc(s.year) + '</th><th scope="col">' + esc(s.mainland) + '</th><th scope="col">' + esc(s.jeju) + '</th><th scope="col">' + esc(s.total) + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function render(el, ctx) {
    if (!el) return;
    if (!ctx || !ctx.reach || !ctx.reach.goals) { el.hidden = true; return; }
    var s = STR[ctx.lang === 'en' ? 'en' : 'ko'], locs = ctx.tab === 'mainland' || ctx.tab === 'jeju' ? [ctx.tab] : ['all'];
    var partial = (ctx.reach.partialYears || []).indexOf(Number(ctx.year)) >= 0;
    el.hidden = false;
    el.innerHTML = '<div class="log-panel-head"><h2>' + esc(s.title(ctx.year)) + ' <button type="button" class="gs-info" data-tip="' + esc(s.def) + '" aria-label="' + esc(s.def) + '">i</button></h2></div>'
      + '<div class="gg-rings" data-n="' + locs.length + '">' + locs.map(function (loc) { return ring(loc, ctx, s); }).join('') + '</div>'
      + (partial ? '<p class="gg-note">' + esc(s.partial(ctx.year)) + '</p>' : '')
      + table(ctx, s);
  }
  window.GospelGoals = { render: render };
})();
