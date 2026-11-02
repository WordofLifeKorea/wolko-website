/**
 * 큐시트 계산 핵심 (CueCore). 브라우저(<script>)와 Node 시험이 같은 코드를 쓴다 — calc-core.js 처럼 window/globalThis 에 CueCore 를 달고, module.exports 로도 내보낸다.
 * 서버 쪽 거울은 functions/lib/campteamCue.js (같은 동작, 시험이 둘을 비교한다). 「지금」 화면·공유 링크(now-share 가지)가 이 약속에 기대므로 이름과 모양을 바꾸지 말 것.
 *
 * 입력 줄(row) = camp_timeline 한 줄: { dayDate:'YYYY-MM-DD', startTime:'HH:MM'|'', endTime:'HH:MM'|'', title, place, team, prepNotes, items, prepMinutes, sortOrder, notes, ownerName, … }
 *
 * groupByDay(rows) → [{ day:'YYYY-MM-DD', rows:[…] }]
 *     날짜 오름차순, 날짜 안에서는 시작 시각 → sortOrder → 들어온 순서. 시작 시각이 없는 줄은 그 날의 맨 끝. 날짜가 없는 줄은 뺀다. 줄 객체는 그대로(복사 X).
 * currentAndNext(rows, nowKst) → { current, next, later:[…], alsoNow:[…] }
 *     nowKst = { date:'YYYY-MM-DD', minutes: 자정부터 지난 분(0~1439) } (한국 시간).
 *     current: 지금 진행 중인 줄(여러 개면 가장 늦게 시작한 줄; 나머지는 alsoNow). next: 아직 시작 안 한 줄 중 가장 빠른 것. later: next 와 같은 날, next 다음 줄들(시작 순).
 *     끝 시각이 없는 줄은 「같은 날 그다음 줄이 시작할 때까지」(그다음 줄이 없으면 1시간) 이어진다. 끝이 시작보다 빠르면 자정을 넘기는 줄로 본다(예 23:00–01:00).
 *     시작 시각이 없는 줄은 current/next/later 에 넣지 않는다. 줄이 없거나 nowKst 가 이상하면 { current:null, next:null, later:[], alsoNow:[] }.
 * staffView(row) → { dayDate, startTime, endTime, title, place, team, prepNotes, items, prepMinutes }
 *     스태프에게 보여 줘도 되는 칸만. 내부 메모(notes)·담당자(ownerName)는 절대 넣지 않는다. items 는 줄바꿈(\n)으로 이어진 글(저장된 그대로), prepMinutes 는 숫자 또는 null.
 *
 * 덤(약속 밖, 있어도 되고 없어도 되는 도우미): ALL, itemList(row|text)→[물품…], readyAt(row)→'HH:MM'|'', itemsByTeam(rows)→[{team, items:[…]}], teamMatch(row, team), toMin, fromMin.
 */
(function (root) {
  'use strict';
  var ALL = '전체';
  function toMin(t) { var m = /^(\d{1,2}):(\d{2})$/.exec(String(t == null ? '' : t).trim()); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fromMin(n) { n = Math.max(0, Math.min(1439, Math.round(n))); return pad(Math.floor(n / 60)) + ':' + pad(n % 60); }
  function dayNum(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s == null ? '' : s)); if (!m) return null; var t = Date.UTC(+m[1], +m[2] - 1, +m[3]); return isNaN(t) ? null : Math.round(t / 86400000); }
  function str(v) { return v == null ? '' : String(v); }
  function so(r) { var n = Number(r && r.sortOrder); return isFinite(n) ? n : 0; }

  function groupByDay(rows) {
    var by = {}, list = [];
    (Array.isArray(rows) ? rows : []).forEach(function (r, i) { if (!r || dayNum(r.dayDate) == null) return; list.push({ r: r, i: i, m: toMin(r.startTime) }); });
    list.sort(function (a, b) {
      if (a.r.dayDate !== b.r.dayDate) return a.r.dayDate < b.r.dayDate ? -1 : 1;
      var am = a.m == null ? 1e9 : a.m, bm = b.m == null ? 1e9 : b.m; if (am !== bm) return am - bm;
      return so(a.r) - so(b.r) || a.i - b.i;
    });
    var out = [];
    list.forEach(function (x) { var d = x.r.dayDate; if (!by[d]) { by[d] = { day: d, rows: [] }; out.push(by[d]); } by[d].rows.push(x.r); });
    return out;
  }

  function currentAndNext(rows, now) {
    var out = { current: null, next: null, later: [], alsoNow: [] };
    var nd = now ? dayNum(now.date) : null, nm = now ? Number(now.minutes) : NaN;
    if (nd == null || !isFinite(nm)) return out;
    var nowAbs = nd * 1440 + nm, list = [];
    (Array.isArray(rows) ? rows : []).forEach(function (r, i) {
      if (!r) return; var d = dayNum(r.dayDate), s = toMin(r.startTime); if (d == null || s == null) return;
      list.push({ r: r, i: i, d: d, sm: s, em: toMin(r.endTime), s: d * 1440 + s, e: 0 });
    });
    list.sort(function (a, b) { return a.s - b.s || so(a.r) - so(b.r) || a.i - b.i; });
    list.forEach(function (x, k) {
      if (x.em != null && x.em > x.sm) x.e = x.d * 1440 + x.em;                     // 보통: 같은 날 끝
      else if (x.em != null && x.em < x.sm) x.e = (x.d + 1) * 1440 + x.em;          // 자정을 넘김
      else {                                                                          // 끝 없음(또는 시작과 같음): 같은 날 그다음 줄이 시작할 때까지
        var nx = null; for (var j = k + 1; j < list.length; j++) if (list[j].s > x.s) { nx = list[j]; break; }
        x.e = nx && nx.d === x.d ? nx.s : x.s + 60;
      }
    });
    var cur = list.filter(function (x) { return x.s <= nowAbs && nowAbs < x.e; });
    if (cur.length) { var main = cur[0]; cur.forEach(function (x) { if (x.s > main.s) main = x; }); out.current = main.r; out.alsoNow = cur.filter(function (x) { return x !== main; }).map(function (x) { return x.r; }); }
    var up = list.filter(function (x) { return x.s > nowAbs; });
    if (up.length) { out.next = up[0].r; out.later = up.slice(1).filter(function (x) { return x.d === up[0].d; }).map(function (x) { return x.r; }); }
    return out;
  }

  function staffView(row) {
    var r = row || {}, pm = r.prepMinutes;
    pm = pm === null || pm === undefined || pm === '' ? null : Number(pm); if (pm !== null && !isFinite(pm)) pm = null;
    return { dayDate: str(r.dayDate), startTime: str(r.startTime), endTime: str(r.endTime), title: str(r.title), place: str(r.place), team: str(r.team), prepNotes: str(r.prepNotes), items: str(r.items), prepMinutes: pm };
  }

  function itemList(v) {
    var t = v && typeof v === 'object' ? v.items : v;
    return str(t).replace(/\r/g, '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
  }
  /** 「준비 끝낼 시각」: 시작 시각 − prepMinutes. 둘 중 하나가 없으면 '' */
  function readyAt(row) {
    var s = toMin(row && row.startTime), pm = row && row.prepMinutes; if (s == null || pm === null || pm === undefined || pm === '' || !isFinite(Number(pm))) return '';
    return fromMin(s - Number(pm));
  }
  /** 한 날(또는 여러 줄)의 팀별 준비물 모음: 같은 물품은 한 번만. 팀 이름 순서는 처음 나온 순 */
  function itemsByTeam(rows) {
    var order = [], by = {};
    (rows || []).forEach(function (r) {
      var l = itemList(r); if (!l.length) return; var t = str(r.team) || '';
      if (!by[t]) { by[t] = []; order.push(t); }
      l.forEach(function (it) { if (by[t].indexOf(it) < 0) by[t].push(it); });
    });
    return order.map(function (t) { return { team: t, items: by[t] }; });
  }
  /** 팀 걸러 보기: team 이 비면 모두, 아니면 그 팀 줄 + 「전체」(모두 하는 일) 줄 */
  function teamMatch(row, team) { if (!team) return true; var t = str(row && row.team); return t === team || t === ALL; }

  var api = { ALL: ALL, groupByDay: groupByDay, currentAndNext: currentAndNext, staffView: staffView, itemList: itemList, readyAt: readyAt, itemsByTeam: itemsByTeam, teamMatch: teamMatch, toMin: toMin, fromMin: fromMin };
  root.CueCore = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
