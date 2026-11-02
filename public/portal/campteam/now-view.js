/* 「지금」 화면 그리기 — 로그인한 팀원 화면(now.js)과 로그인 없는 공개 링크 화면(cue-public.js)이 같이 쓴다. 계산은 now-core.js. (ES5)
   NowView.mount(host, { getLang, load(campId)→Promise<데이터>, storeKey, emptyHtml(), picker, print }) → { refresh, rerender, setCamp, destroy }
   데이터 모양: { today, camp:{nameKo,nameEn,startDate,endDate,prepStart,prepEnd}, camps?:[…], teams:[{name,color}], rows:[진행표 줄…], label? } */
(function (g) {
  var NC = g.NowCore;
  var T = {
    ko: { now: '지금', next: '다음', later: '그 다음', kst: '한국 시간', left: function (n) { return n + '분 남음'; }, prep: '준비는 지금부터!', prepAt: function (n) { return '준비 시간 ' + n + '분 전'; }, items: '준비물', notes: '준비 메모',
      allTeams: '전체', teamsLbl: '팀', untimed: '시간 미정', also: '같은 시각', allDay: '하루 전체 보기', hideAll: '다음 일정만 보기', dayAll: '이 날의 전체 일정', done: '오늘 일정이 모두 끝났어요.', nextUp: '다음 일정', none: '이 날은 올라온 일정이 없어요.',
      before: function (n) { return '캠프까지 D-' + n; }, dday: '오늘이 캠프 첫날이에요', dayN: function (n) { return '캠프 ' + n + '일째'; }, prepPeriod: '준비 기간', ended: '끝난 캠프', first: '첫 일정', camp: '캠프', updated: '마지막 확인', stale: '연결이 불안정해요. 마지막으로 받은 내용이에요.', loading: '불러오는 중…', failed: '불러오지 못했어요.',
      print: '인쇄', noCamp: '보여 드릴 캠프가 아직 없어요.', owner: '담당', empty: '' },
    en: { now: 'Now', next: 'Next', later: 'After that', kst: 'Korea time', left: function (n) { return n + ' min left'; }, prep: 'Start getting ready now!', prepAt: function (n) { return 'Prep time ' + n + ' min before'; }, items: 'Bring / set up', notes: 'Prep notes',
      allTeams: 'All', teamsLbl: 'Teams', untimed: 'Time TBD', also: 'Same time', allDay: 'See the whole day', hideAll: 'Show next only', dayAll: 'Full schedule for this day', done: "Today's schedule is finished.", nextUp: 'Coming up', none: 'Nothing scheduled for this day.',
      before: function (n) { return n + ' days to camp (D-' + n + ')'; }, dday: 'Camp starts today', dayN: function (n) { return 'Camp day ' + n; }, prepPeriod: 'Prep period', ended: 'Camp ended', first: 'First up', camp: 'Camp', updated: 'Last checked', stale: 'Connection is shaky. This is the last content received.', loading: 'Loading…', failed: 'Could not load.',
      print: 'Print', noCamp: 'No camp to show yet.', owner: 'Owner', empty: '' }
  };
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  function mount(host, o) {
    var S = { data: null, day: '', teams: [], showAll: false, err: '', at: 0, campId: '', timer: 0, refreshTimer: 0 };
    var lang = function () { return o.getLang && o.getLang() === 'en' ? 'en' : 'ko'; }, t = function (k) { return T[lang()][k]; };
    var skey = function () { return (o.storeKey || 'campteam-now') + ':' + (S.campId || (S.data && S.data.camp && S.data.camp.id) || 'x'); };
    function loadTeams() { try { var v = JSON.parse(localStorage.getItem(skey()) || '[]'); S.teams = Array.isArray(v) ? v.filter(function (x) { return typeof x === 'string'; }).slice(0, 20) : []; } catch (e) { S.teams = []; } }
    function saveTeams() { try { localStorage.setItem(skey(), JSON.stringify(S.teams)); } catch (e) { /* 저장 못 해도 화면은 그대로 */ } }
    function title(r) { return lang() === 'en' && r.titleEn ? r.titleEn : r.title; }
    function campName(c) { return lang() === 'en' && c.nameEn ? c.nameEn : (c.nameKo || c.nameEn || ''); }
    function chipsOf(r, colors) {
      return NC.rowTeams(r).map(function (n) { var c = colors[n.toLowerCase()]; return '<span class="nv-tag"' + (c ? ' style="--tc:' + esc(/^#[0-9a-fA-F]{3,8}$/.test(c) ? c : '') + '"' : '') + '>' + esc(n) + '</span>'; }).join('');
    }
    function colorMap(d) { var m = {}; (d.teams || []).forEach(function (x) { if (x.color) m[String(x.name).toLowerCase()] = x.color; }); return m; }
    function range(r) { return r.startTime ? r.startTime + (r.endTime ? '–' + r.endTime : '') : t('untimed'); }
    function detail(r) {
      var h = '';
      if (r.items && r.items.length) h += '<div class="nv-items"><b>' + esc(t('items')) + '</b><ul>' + r.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
      if (r.prepNotes) h += '<div class="nv-pn"><b>' + esc(t('notes')) + '</b><p>' + esc(r.prepNotes).replace(/\n/g, '<br>') + '</p></div>';
      return h;
    }
    function meta(r, colors) {
      var bits = []; if (r.place) bits.push('<span class="nv-place">📍 ' + esc(r.place) + '</span>'); if (r.ownerName) bits.push('<span class="nv-own">' + esc(t('owner')) + ' ' + esc(r.ownerName) + '</span>');
      var tags = chipsOf(r, colors); return (bits.length ? '<div class="nv-meta">' + bits.join('') + '</div>' : '') + (tags ? '<div class="nv-tags">' + tags + '</div>' : '');
    }
    function big(label, cls, r, colors, extra) {
      return '<section class="nv-card ' + cls + '"><div class="nv-lab"><span>' + esc(label) + '</span>' + (extra || '') + '</div><div class="nv-time">' + esc(range(r)) + '</div><h2 class="nv-title">' + esc(title(r)) + '</h2>' + meta(r, colors) + detail(r) + '</section>';
    }
    function small(r, colors, now) {
      var prep = NC.prepActive(r, now);
      return '<div class="nv-row' + (prep ? ' prep' : '') + '"><span class="nv-rt">' + esc(r.startTime || '—') + '</span><div class="nv-rm"><b>' + esc(title(r)) + '</b>' + meta(r, colors) + (prep ? '<div class="nv-prepflag">' + esc(t('prep')) + '</div>' : '') + detail(r) + '</div></div>';
    }
    function bannerOf(camp, now) {
      var ph = NC.campPhase(camp, now.date), txt = '';
      if (ph.phase === 'before') txt = t('before')(ph.dDay); else if (ph.phase === 'during') txt = ph.dDay === 0 && ph.dayNo === 1 ? t('dday') : t('dayN')(ph.dayNo);
      else if (ph.phase === 'prep') txt = ph.dDay > 0 ? t('prepPeriod') + ' · ' + t('before')(ph.dDay) : t('prepPeriod'); else if (ph.phase === 'after') txt = t('ended');
      return txt;
    }

    function bodyHtml(now) {
      var d = S.data, colors = colorMap(d), rows = NC.filterTeams(d.rows || [], S.teams), by = NC.groupByDay(rows), isToday = S.day === now.date;
      var dayRows = by[S.day] || [], h = '';
      if (!(d.rows || []).length) return '<div class="nv-empty">' + (o.emptyHtml ? o.emptyHtml() : esc(t('none'))) + '</div>';
      if (isToday) {
        var cn = NC.currentAndNext(rows, now);
        if (S.showAll) h += allDayHtml(dayRows, colors, now);
        else {
          if (cn.current) {
            h += big(t('now'), 'nv-now', cn.current, colors, '<em>' + esc(t('left')(cn.minutesLeft)) + '</em>');
            cn.currents.slice(1).forEach(function (r) { h += big(t('now'), 'nv-now alt', r, colors); });
          }
          if (cn.next) {
            var pre = cn.next.prepMinutes > 0 && cn.prepNow;
            h += big(t('next'), 'nv-next' + (pre ? ' prep' : ''), cn.next, colors, '<em class="nv-cd">' + esc(NC.fmtCountdown(cn.minutesToNext, lang())) + '</em>' + (pre ? '<strong class="nv-prepflag">' + esc(t('prep')) + '</strong>' : (cn.next.prepMinutes > 0 ? '<small class="nv-prepat">' + esc(t('prepAt')(cn.next.prepMinutes)) + '</small>' : '')));
            cn.nextAlso.forEach(function (r) { h += big(t('also'), 'nv-next alt', r, colors); });
          }
          if (cn.later.length) h += '<h3 class="nv-h">' + esc(t('later')) + '</h3>' + cn.later.map(function (r) { return small(r, colors, now); }).join('');
          if (cn.untimed.length) h += '<h3 class="nv-h">' + esc(t('untimed')) + '</h3>' + cn.untimed.map(function (r) { return small(r, colors, now); }).join('');
          if (!cn.current && !cn.next) {
            if (cn.total) h += '<div class="nv-empty soft">' + esc(t('done')) + '</div>'; else h += '<div class="nv-empty soft">' + esc(t('none')) + '</div>';
            var up = NC.upcoming(rows, now, 4); if (up.length) h += '<h3 class="nv-h">' + esc(NC.campPhase(d.camp, now.date).phase === 'before' ? t('first') : t('nextUp')) + '</h3>' + up.map(function (r) { return '<div class="nv-up"><span class="nv-ud">' + esc(NC.dayLabel(r.dayDate, now.date, lang())) + '</span>' + small(r, colors, now) + '</div>'; }).join('');
          }
          if (dayRows.length > 1) h += '<button type="button" class="nv-btn" data-nv="all">' + esc(t('allDay')) + '</button>';
        }
        if (S.showAll) h += '<button type="button" class="nv-btn" data-nv="less">' + esc(t('hideAll')) + '</button>';
      } else h += allDayHtml(dayRows, colors, now);
      return h;
    }
    function allDayHtml(dayRows, colors, now) {
      if (!dayRows.length) return '<div class="nv-empty soft">' + esc(t('none')) + '</div>';
      return '<h3 class="nv-h">' + esc(t('dayAll')) + '</h3>' + dayRows.map(function (r) { return small(r, colors, now); }).join('');
    }
    /* 인쇄용: 화면에서는 숨겨 두고, 인쇄할 때만 모든 날의 일정을 날짜별로 이어서 보여 준다 */
    function printHtml(now) {
      var d = S.data, colors = colorMap(d), by = NC.groupByDay(NC.filterTeams(d.rows || [], S.teams));
      var W = lang() === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['일', '월', '화', '수', '목', '금', '토'];
      return '<h2 class="nv-ph2">' + esc(campName(d.camp)) + '</h2>' + Object.keys(by).sort().map(function (x) {
        return '<h3 class="nv-h">' + esc(x + ' (' + W[new Date(x + 'T00:00:00Z').getUTCDay()] + ')') + '</h3>' + by[x].map(function (r) { return small(r, colors, now); }).join('');
      }).join('');
    }
    function tabsHtml(now) {
      var d = S.data, days = NC.dayTabs(d.camp, d.rows || [], now.date), have = NC.groupByDay(d.rows || []);
      return days.map(function (x) { return '<button type="button" class="nv-chip' + (x === S.day ? ' on' : '') + (have[x] ? '' : ' dim') + '" data-nv-day="' + esc(x) + '">' + esc(NC.dayLabel(x, now.date, lang())) + '</button>'; }).join('');
    }
    function teamsHtml() {
      var list = NC.teamList(S.data.teams, S.data.rows || []); if (!list.length) return '';
      var sel = {}; S.teams.forEach(function (x) { sel[x.toLowerCase()] = 1; });
      return '<span class="nv-tl">' + esc(t('teamsLbl')) + '</span><button type="button" class="nv-chip' + (S.teams.length ? '' : ' on') + '" data-nv-team="">' + esc(t('allTeams')) + '</button>' + list.map(function (x) { return '<button type="button" class="nv-chip' + (sel[x.name.toLowerCase()] ? ' on' : '') + '" data-nv-team="' + esc(x.name) + '">' + esc(x.name) + '</button>'; }).join('');
    }
    function pickerHtml() {
      if (!o.picker || !S.data || !S.data.camps || S.data.camps.length < 2) return '';
      return '<label class="nv-pick"><span>' + esc(t('camp')) + '</span><select id="nvCamp">' + S.data.camps.map(function (c) { return '<option value="' + esc(c.id) + '"' + (S.data.camp && c.id === S.data.camp.id ? ' selected' : '') + '>' + esc(campName(c)) + '</option>'; }).join('') + '</select></label>';
    }

    function shell() {
      var now = NC.kstNow(Date.now()), d = S.data;
      if (!d) { host.innerHTML = '<div class="nv"><div class="nv-empty soft">' + esc(S.err || t('loading')) + '</div></div>'; return; }
      if (!d.camp) { host.innerHTML = '<div class="nv"><div class="nv-empty">' + (o.emptyHtml ? o.emptyHtml(true) : esc(t('noCamp'))) + '</div></div>'; return; }
      if (!S.day) S.day = NC.defaultDay(d.camp, d.rows || [], now.date);
      var upd = S.at ? NC.fmtHm(NC.kstNow(S.at).minutes) : '';
      host.innerHTML = '<div class="nv">' +
        '<header class="nv-head"><div class="nv-clock" id="nvClock"></div><div class="nv-sub"><div class="nv-date" id="nvDate"></div><div class="nv-kst">' + esc(t('kst')) + '</div></div></header>' +
        '<div class="nv-campbar"><b class="nv-camp">' + esc(campName(d.camp)) + '</b><span class="nv-ph">' + esc(bannerOf(d.camp, now)) + '</span>' + (d.label ? '<span class="nv-lbl">' + esc(d.label) + '</span>' : '') + '</div>' + pickerHtml() +
        (S.err ? '<div class="nv-stale">' + esc(t('stale')) + '</div>' : '') +
        '<nav class="nv-days" id="nvDays" aria-label="days">' + tabsHtml(now) + '</nav><div class="nv-teams" id="nvTeams">' + teamsHtml() + '</div>' +
        '<div id="nvBody">' + bodyHtml(now) + '</div>' +
        (o.print ? '<div class="nv-printall">' + printHtml(now) + '</div>' : '') +
        '<footer class="nv-foot"><span>' + esc(t('updated')) + ' ' + esc(upd) + '</span>' + (o.print ? '<button type="button" class="nv-btn sm" data-nv="print">' + esc(t('print')) + '</button>' : '') + '</footer></div>';
      tickClock();
      var cur = host.querySelector('#nvDays .on'); if (cur && cur.scrollIntoView) { try { cur.scrollIntoView({ inline: 'center', block: 'nearest' }); } catch (e) { /* 오래된 브라우저 */ } }
    }
    function tickClock() {
      var now = NC.kstNow(Date.now()), c = host.querySelector('#nvClock'), dt = host.querySelector('#nvDate'); if (!c) return;
      var s = Math.floor((now.minutes % 1) * 60 + 1e-6);
      c.innerHTML = esc(NC.fmtHm(Math.floor(now.minutes))) + '<small>' + (s < 10 ? '0' : '') + s + '</small>';
      var KO = ['일', '월', '화', '수', '목', '금', '토'], EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      dt.textContent = lang() === 'en' ? EN[now.dow] + ', ' + +now.date.slice(5, 7) + '/' + +now.date.slice(8, 10) : +now.date.slice(5, 7) + '월 ' + +now.date.slice(8, 10) + '일 ' + KO[now.dow] + '요일';
    }
    var lastMin = -1;
    function tick() {
      tickClock(); if (!S.data || !S.data.camp) return;
      var now = NC.kstNow(Date.now()), m = Math.floor(now.minutes);
      if (S.day === now.date && m !== lastMin) { lastMin = m; var b = host.querySelector('#nvBody'); if (b) b.innerHTML = bodyHtml(now); } // 분이 바뀔 때만 카드를 다시 그린다(스크롤 위치는 그대로)
    }

    async function refresh() {
      try { var d = await o.load(S.campId); S.data = d; S.err = ''; S.at = Date.now(); if (d && d.camp && !S.campId) S.campId = d.camp.id || ''; }
      catch (e) { S.err = (e && e.message) || t('failed'); if (e && e.gone) S.data = null; } // gone: 링크가 꺼졌거나 없는 링크 — 지난 내용을 계속 보여 주지 않는다
      if (S.data && !S.teams.length) loadTeams();
      if (S.data && S.teams.length) { var known = {}; NC.teamList(S.data.teams, S.data.rows || []).forEach(function (x) { known[x.name.toLowerCase()] = 1; }); S.teams = S.teams.filter(function (x) { return known[x.toLowerCase()]; }); } // 없어진 팀을 골라 둔 채로 비어 보이지 않게
      lastMin = -1; shell();
    }
    host.addEventListener('click', function (e) {
      var day = e.target.closest('[data-nv-day]'), tm = e.target.closest('[data-nv-team]'), ac = e.target.closest('[data-nv]');
      if (day) { S.day = day.getAttribute('data-nv-day'); S.showAll = false; lastMin = -1; shell(); return; }
      if (tm) { var n = tm.getAttribute('data-nv-team'); if (!n) S.teams = []; else { var i = S.teams.indexOf(n); if (i >= 0) S.teams.splice(i, 1); else S.teams.push(n); } saveTeams(); lastMin = -1; shell(); return; }
      if (ac) { var a = ac.getAttribute('data-nv'); if (a === 'all') S.showAll = true; else if (a === 'less') S.showAll = false; else if (a === 'print') { window.print(); return; } lastMin = -1; shell(); }
    });
    host.addEventListener('change', function (e) { if (e.target && e.target.id === 'nvCamp') { S.campId = e.target.value; S.day = ''; S.teams = []; S.showAll = false; S.data = null; shell(); loadTeams(); refresh(); } });
    function onVis() { if (!document.hidden) refresh(); }
    document.addEventListener('visibilitychange', onVis); window.addEventListener('focus', onVis);
    S.timer = setInterval(tick, 1000); S.refreshTimer = setInterval(function () { if (!document.hidden) refresh(); }, 30000);
    document.addEventListener('ct-lang', function () { lastMin = -1; shell(); });
    shell(); refresh();
    return {
      refresh: refresh, rerender: function () { lastMin = -1; shell(); }, state: S,
      setCamp: function (id) { S.campId = id; S.day = ''; S.teams = []; S.data = null; shell(); refresh(); },
      destroy: function () { clearInterval(S.timer); clearInterval(S.refreshTimer); document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', onVis); }
    };
  }
  g.NowView = { mount: mount, T: T };
})(window);
