/* 「지금」 화면의 계산 부분 — 화면 없이 계산만 한다(그래서 시험하기 쉽다). 로그인 화면·공개 링크 화면·홈 카드가 같이 쓴다. (ES5)
   시간은 모두 한국 시간(KST) 기준. 진행표 한 줄은 { dayDate, startTime, endTime, title, place, team, prepNotes, items, prepMinutes, ownerName? } 모양. */
(function (g) {
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /** 'HH:MM' → 분(0~1439). 잘못된 값이면 null */
  function toMin(s) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || '').trim()); if (!m || +m[1] > 23 || +m[2] > 59) return null; return +m[1] * 60 + +m[2]; }
  function fmtHm(min) { min = Math.max(0, Math.round(min)) % 1440; return pad2(Math.floor(min / 60)) + ':' + pad2(min % 60); }
  /** 지금 시각(밀리초) → 한국 날짜·하루 중 분(초는 소수) */
  function kstNow(ms) {
    var d = new Date((ms == null ? Date.now() : ms) + 9 * 3600 * 1000);
    return { date: d.toISOString().slice(0, 10), minutes: d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60, dow: d.getUTCDay() };
  }
  function addDays(date, n) { var d = new Date(date + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
  function dayDiff(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000); }
  function dowOf(date) { return new Date(date + 'T00:00:00Z').getUTCDay(); }
  function isDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !isNaN(Date.parse(s)); }

  /* ---- 팀 ---- */
  function rowTeams(r) { return String((r && r.team) || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean); }
  /** 고른 팀(이름 목록)이 없으면 전부. 있으면 그 팀 일정 + 팀이 정해지지 않은 공통 일정 */
  function filterTeams(rows, selected) {
    var want = {}, n = 0; (selected || []).forEach(function (x) { want[String(x).toLowerCase()] = 1; n++; });
    if (!n) return rows.slice();
    return rows.filter(function (r) { var t = rowTeams(r); return !t.length || t.some(function (x) { return want[x.toLowerCase()]; }); });
  }
  /** 팀 칩에 쓸 이름 목록: 팀 표의 순서대로, 표에 없지만 줄에 쓰인 팀은 뒤에 */
  function teamList(teams, rows) {
    var out = [], seen = {};
    (teams || []).forEach(function (t) { var k = String(t.name).toLowerCase(); if (!seen[k]) { seen[k] = 1; out.push({ name: t.name, color: t.color || '' }); } });
    (rows || []).forEach(function (r) { rowTeams(r).forEach(function (x) { var k = x.toLowerCase(); if (!seen[k]) { seen[k] = 1; out.push({ name: x, color: '' }); } }); });
    return out;
  }

  /* ---- 하루 ---- */
  function cmpRows(a, b) {
    var sa = toMin(a.startTime), sb = toMin(b.startTime);
    if (sa == null && sb == null) return 0; if (sa == null) return 1; if (sb == null) return -1;
    return sa - sb;
  }
  /** 날짜별로 묶는다 → { 'YYYY-MM-DD': [줄…(시작 시간 순, 시간 없는 줄은 맨 뒤)] } */
  function groupByDay(rows) {
    var by = {}; (rows || []).forEach(function (r, i) { if (!r || !isDate(r.dayDate)) return; (by[r.dayDate] = by[r.dayDate] || []).push({ r: r, i: i }); });
    Object.keys(by).forEach(function (d) { by[d].sort(function (x, y) { return cmpRows(x.r, y.r) || x.i - y.i; }); by[d] = by[d].map(function (x) { return x.r; }); });
    return by;
  }
  /** 시간이 있는 줄마다 [시작, 끝) 분. 끝 시간이 없으면 다음 줄의 시작까지, 그것도 없으면 1시간 */
  function spans(dayRows) {
    var timed = dayRows.filter(function (r) { return toMin(r.startTime) != null; });
    return timed.map(function (r, i) {
      var s = toMin(r.startTime), e = toMin(r.endTime);
      if (e == null || e <= s) { e = null; for (var j = i + 1; j < timed.length; j++) { var t = toMin(timed[j].startTime); if (t > s) { e = t; break; } } if (e == null) e = s + 60; }
      return { row: r, s: s, e: e };
    });
  }
  /**
   * 오늘(now.date)의 「지금」과 「다음」.
   *   current = 지금 진행 중인 첫 줄(여러 개면 currents 에 전부), next = 다음에 시작하는 줄(같은 시각에 시작하는 다른 줄은 nextAlso), later = 그 다음 줄 몇 개
   *   minutesToNext = 다음 줄까지 남은 분(올림), minutesLeft = 지금 줄이 끝날 때까지, prepNow = 다음 줄의 준비 시작 시각이 지났는가, untimed = 시간이 없는 줄
   */
  function currentAndNext(rows, now) {
    var day = groupByDay(rows)[now.date] || [], sp = spans(day), m = now.minutes;
    var currents = sp.filter(function (x) { return x.s <= m && m < x.e; });
    var future = sp.filter(function (x) { return x.s > m; });
    var nx = future[0] || null;
    var res = {
      current: currents[0] ? currents[0].row : null, currents: currents.map(function (x) { return x.row; }),
      next: nx ? nx.row : null, nextAlso: nx ? future.filter(function (x) { return x !== nx && x.s === nx.s; }).map(function (x) { return x.row; }) : [],
      later: nx ? future.filter(function (x) { return x.s > nx.s; }).slice(0, 3).map(function (x) { return x.row; }) : [],
      minutesToNext: nx ? Math.ceil(nx.s - m - 1e-9) : null, minutesLeft: currents[0] ? Math.ceil(currents[0].e - m - 1e-9) : null,
      untimed: day.filter(function (r) { return toMin(r.startTime) == null; }), total: day.length, done: false
    };
    res.prepNow = !!(nx && prepActive(nx.row, now));
    res.done = day.length > 0 && !res.current && !res.next && !res.untimed.length;
    return res;
  }
  /** 이 줄의 「준비는 지금부터」: 오늘 줄이고 아직 시작 전이며, 시작까지 남은 시간이 준비 시간(prepMinutes) 이하 */
  function prepActive(row, now) {
    var pm = Number(row && row.prepMinutes), s = toMin(row && row.startTime);
    if (!(pm > 0) || s == null || row.dayDate !== now.date) return false;
    return s > now.minutes && s - now.minutes <= pm;
  }
  /** 오늘 이후(또는 오늘 아직 안 시작한) 줄들을 시간 순으로 — 캠프 시작 전 「첫 일정」이나 오늘이 끝난 뒤 「다음 일정」에 쓴다 */
  function upcoming(rows, now, limit) {
    var out = [], by = groupByDay(rows);
    Object.keys(by).sort().forEach(function (d) {
      if (d < now.date) return;
      by[d].forEach(function (r) { var s = toMin(r.startTime); if (d === now.date && (s == null || s <= now.minutes)) return; out.push(r); });
    });
    return out.slice(0, limit || 5);
  }

  /* ---- 캠프 단계 · 날짜 탭 ---- */
  /** during 캠프 중 / prep 준비 기간 / before 시작 전 / after 끝남 / unknown. dDay = 시작까지 남은 날 */
  function campPhase(camp, today) {
    var s = isDate(camp && camp.startDate) ? camp.startDate : '', e = isDate(camp && camp.endDate) ? camp.endDate : s;
    var ps = isDate(camp && camp.prepStart) ? camp.prepStart : '', pe = isDate(camp && camp.prepEnd) ? camp.prepEnd : '';
    var d = s ? dayDiff(today, s) : null;
    if (s && s <= today && today <= e) return { phase: 'during', dDay: d, dayNo: dayDiff(s, today) + 1 };
    if (ps && ps <= today && today <= (pe || s || ps)) return { phase: 'prep', dDay: d };
    if (!s) return { phase: 'unknown', dDay: null };
    return { phase: s > today ? 'before' : 'after', dDay: d };
  }
  function rangeDays(a, b, cap) { var out = []; if (!isDate(a) || !isDate(b) || b < a) return out; for (var d = a, n = 0; d <= b && n < (cap || 40); d = addDays(d, 1), n++) out.push(d); return out; }
  /** 날짜 탭에 올릴 날: 어제·오늘·내일 + 준비 주간 + 캠프 기간 + 줄이 있는 날 (오래된 순) */
  function dayTabs(camp, rows, today) {
    var set = {}; [addDays(today, -1), today, addDays(today, 1)].forEach(function (d) { set[d] = 1; });
    if (camp) { rangeDays(camp.prepStart, camp.prepEnd || camp.startDate, 31).forEach(function (d) { set[d] = 1; }); rangeDays(camp.startDate, camp.endDate || camp.startDate, 31).forEach(function (d) { set[d] = 1; }); }
    Object.keys(groupByDay(rows)).forEach(function (d) { set[d] = 1; });
    return Object.keys(set).sort();
  }
  /** 처음 열 때 고를 날: 오늘이 캠프·준비 기간이거나 줄이 있으면 오늘, 아니면 가장 가까운 앞날(줄 있는 날 우선), 다 지났으면 마지막 줄이 있는 날 */
  function defaultDay(camp, rows, today) {
    var by = groupByDay(rows), days = Object.keys(by).sort(), ph = camp ? campPhase(camp, today).phase : 'unknown';
    if (by[today] || ph === 'during' || ph === 'prep') return today;
    var next = days.filter(function (d) { return d > today; })[0]; if (next) return next;
    if (days.length) return days[days.length - 1];
    return today;
  }

  /* ---- 말 만들기 ---- */
  /** 남은 분 → '12분 뒤' / '1시간 5분 뒤' (en: 'in 12 min' / 'in 1 h 5 min') */
  function fmtCountdown(min, lang) {
    min = Math.max(0, Math.round(min)); var h = Math.floor(min / 60), m = min % 60, p = [];
    if (lang === 'en') { if (h) p.push(h + ' h'); if (m || !h) p.push(m + ' min'); return 'in ' + p.join(' '); }
    if (h) p.push(h + '시간'); if (m || !h) p.push(m + '분'); return p.join(' ') + ' 뒤';
  }
  function dayLabel(date, today, lang) {
    var diff = dayDiff(today, date);
    var KO = ['일', '월', '화', '수', '목', '금', '토'], EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    var md = +date.slice(5, 7) + '/' + +date.slice(8, 10);
    var dw = (lang === 'en' ? EN : KO)[dowOf(date)];
    if (diff === 0) return lang === 'en' ? 'Today' : '오늘';
    if (diff === -1) return lang === 'en' ? 'Yesterday' : '어제';
    if (diff === 1) return lang === 'en' ? 'Tomorrow' : '내일';
    return md + ' (' + dw + ')';
  }

  /* ---- 홈 맨 위 「지금」 카드: 무엇을 보여 줄지 고른다 ----
     summary = /api/campteam/now?summary=1 의 답 { camp|null, rows }.  null 이면 카드를 그리지 않는다.
       kind 'live'      오늘 줄이 있고 지금 진행 중이거나 남은 줄이 있음 → { camp, cn(current/next 계산 결과) }
       kind 'countdown' 오늘 보여 줄 줄이 없는데 캠프가 준비 기간이거나 30일 안에 시작(또는 캠프 중) → { camp, label:'D-n'|'D-day'|'dayN', dDay, dayNo, nextRow }  */
  function homeCard(summary, now) {
    var camp = summary && summary.camp; if (!camp) return null;
    var rows = summary.rows || [], cn = currentAndNext(rows, now);
    if (cn.current || cn.next) return { kind: 'live', camp: camp, cn: cn };
    var ph = campPhase(camp, now.date), nextRow = upcoming(rows, now, 1)[0] || null;
    if (ph.phase === 'during') return { kind: 'countdown', camp: camp, label: 'day', dayNo: ph.dayNo, dDay: ph.dDay, nextRow: nextRow };
    if (ph.phase === 'prep' || (ph.phase === 'before' && ph.dDay <= 30)) return { kind: 'countdown', camp: camp, label: ph.dDay > 0 ? 'dn' : 'dday', dDay: ph.dDay, nextRow: nextRow };
    return null;
  }

  g.NowCore = { toMin: toMin, fmtHm: fmtHm, kstNow: kstNow, addDays: addDays, dayDiff: dayDiff, isDate: isDate, rowTeams: rowTeams, filterTeams: filterTeams, teamList: teamList, groupByDay: groupByDay,
    spans: spans, currentAndNext: currentAndNext, prepActive: prepActive, upcoming: upcoming, campPhase: campPhase, dayTabs: dayTabs, defaultDay: defaultDay, fmtCountdown: fmtCountdown, dayLabel: dayLabel, homeCard: homeCard };
})(typeof globalThis !== 'undefined' ? globalThis : window);
