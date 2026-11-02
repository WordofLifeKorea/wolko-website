/**
 * 큐시트 인쇄·이미지 모양 만들기 (CuePrint). 화면(prep-cue.js)과 Node 시험이 같은 코드를 쓴다. cue-core.js(CueCore)가 먼저 불러와져 있어야 한다.
 * 스태프에게 나가는 글만 다룬다: 시간·일정·장소·팀·준비물·할 일(+준비 몇 분 전). 내부 메모(notes)는 절대 넣지 않고, 담당자 이름은 opts.showOwners 가 켜졌을 때만 넣는다.
 *
 * pages(rows, opts) → [{ day, n, entries:[{ time, title, place, team, items:[…], prepNotes, ready, owner }], teamItems:[{team, items}] }]
 *     opts: { team:'' (이 팀 + 「전체」 줄만), days:[…]|null (이 날짜만), showOwners:false }
 * printHtml(rows, opts) → 인쇄용 HTML 글(날짜 하나당 구역 하나 .cue-page). opts 에 위 항목 + { campName, supplies:[{name,qty,team}]|null, labels:{…글자 바꾸기} }
 * imageModel(page, opts) → PNG 로 그릴 때 쓰는 모양 { title, sub, entries } (opts: campName, team, labels)
 * weekdayKo(day) → '월'…'일'
 */
(function (root) {
  'use strict';
  var LAB = { time: '시간', what: '일정', team: '팀', place: '장소', items: '준비물', prep: '할 일', owner: '담당', readyBy: '준비 끝', dayN: function (n) { return n + '일차'; }, teamOnly: function (t) { return t + ' (+전체)'; }, all: '전체 팀', suppliesTitle: '팀별 준비물 목록', noTeam: '(팀 정해지지 않음)', teamItems: '이 날 팀별 준비물', empty: '이 날은 아직 적힌 일정이 없어요.', foot: 'WOLKO 캠프팀 큐시트' };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function labels(o) { var L = {}; Object.keys(LAB).forEach(function (k) { L[k] = o && o.labels && o.labels[k] != null ? o.labels[k] : LAB[k]; }); return L; }
  function weekdayKo(day) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || ''); if (!m) return ''; return '일월화수목금토'.charAt(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()); }
  function dayLabel(day) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || ''); return m ? +m[2] + '월 ' + +m[3] + '일 (' + weekdayKo(day) + ')' : day; }
  function timeLabel(r) { return r.startTime ? r.startTime + (r.endTime ? '–' + r.endTime : '') : '—'; }

  function pages(rows, opts) {
    opts = opts || {}; var CC = root.CueCore, only = opts.days && opts.days.length ? opts.days : null;
    var src = (rows || []).filter(function (r) { return CC.teamMatch(r, opts.team || ''); });
    var all = CC.groupByDay(rows || []).map(function (g) { return g.day; });   // 「n일차」는 팀 걸러내기와 상관없이 캠프 전체 날짜 순서
    return CC.groupByDay(src).filter(function (g) { return !only || only.indexOf(g.day) >= 0; }).map(function (g) {
      return {
        day: g.day, n: all.indexOf(g.day) + 1,
        entries: g.rows.map(function (r) {
          var v = CC.staffView(r), e = { time: timeLabel(v), title: v.title, place: v.place, team: v.team, items: CC.itemList(v), prepNotes: v.prepNotes, ready: CC.readyAt(v), owner: '' };
          if (opts.showOwners && r.ownerName) e.owner = String(r.ownerName);
          return e;
        }),
        teamItems: CC.itemsByTeam(g.rows)
      };
    });
  }

  function lines(s) { return esc(s).replace(/\n/g, '<br>'); }
  function printHtml(rows, opts) {
    opts = opts || {}; var L = labels(opts), pg = pages(rows, opts), head = opts.team ? L.teamOnly(opts.team) : L.all, out = '';
    pg.forEach(function (p) {
      out += '<section class="cue-page"><header class="cue-ph"><h1>' + esc(opts.campName || '') + '</h1><div class="cue-pd">' + esc(dayLabel(p.day)) + (p.n ? ' · ' + esc(L.dayN(p.n)) : '') + ' · ' + esc(head) + '</div></header>';
      if (!p.entries.length) out += '<p>' + esc(L.empty) + '</p>';
      else {
        out += '<table class="cue-tbl"><thead><tr><th class="c-time">' + esc(L.time) + '</th><th class="c-what">' + esc(L.what) + '</th><th class="c-team">' + esc(L.team) + '</th><th class="c-items">' + esc(L.items) + '</th><th class="c-prep">' + esc(L.prep) + '</th>' + (opts.showOwners ? '<th class="c-own">' + esc(L.owner) + '</th>' : '') + '</tr></thead><tbody>';
        p.entries.forEach(function (e) {
          out += '<tr><td class="c-time">' + esc(e.time) + (e.ready ? '<small>' + esc(L.readyBy) + ' ' + esc(e.ready) + '</small>' : '') + '</td><td class="c-what"><b>' + esc(e.title) + '</b>' + (e.place ? '<small>' + esc(e.place) + '</small>' : '') + '</td><td class="c-team">' + esc(e.team) + '</td><td class="c-items">' + (e.items.length ? '<ul>' + e.items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul>' : '') + '</td><td class="c-prep">' + lines(e.prepNotes) + '</td>' + (opts.showOwners ? '<td class="c-own">' + esc(e.owner) + '</td>' : '') + '</tr>';
        });
        out += '</tbody></table>';
        if (p.teamItems.length) out += '<div class="cue-ti"><h2>' + esc(L.teamItems) + '</h2>' + p.teamItems.map(function (t) { return '<p><b>' + esc(t.team || L.noTeam) + '</b> ' + esc(t.items.join(', ')) + '</p>'; }).join('') + '</div>';
      }
      out += '<footer class="cue-pf">' + esc(L.foot) + '</footer></section>';
    });
    var sup = (opts.supplies || []).filter(function (s) { return s && s.name && root.CueCore.teamMatch(s, opts.team || ''); });
    if (opts.supplies && sup.length) {
      var by = {}, order = []; sup.forEach(function (s) { var t = s.team || ''; if (!by[t]) { by[t] = []; order.push(t); } by[t].push(s); });
      out += '<section class="cue-page"><header class="cue-ph"><h1>' + esc(opts.campName || '') + '</h1><div class="cue-pd">' + esc(L.suppliesTitle) + ' · ' + esc(head) + '</div></header>' + order.map(function (t) { return '<h2>' + esc(t || L.noTeam) + '</h2><ul class="cue-su">' + by[t].map(function (s) { return '<li>' + esc(s.name) + (s.qty ? ' × ' + esc(s.qty) : '') + '</li>'; }).join('') + '</ul>'; }).join('') + '<footer class="cue-pf">' + esc(L.foot) + '</footer></section>';
    }
    return out;
  }

  function imageModel(page, opts) {
    opts = opts || {}; var L = labels(opts);
    return { title: (opts.campName || '') + ' · ' + dayLabel(page.day), sub: (page.n ? L.dayN(page.n) + ' · ' : '') + (opts.team ? L.teamOnly(opts.team) : L.all), entries: page.entries, labels: L };
  }

  var api = { pages: pages, printHtml: printHtml, imageModel: imageModel, weekdayKo: weekdayKo, dayLabel: dayLabel, esc: esc, LABELS: LAB };
  root.CuePrint = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
