/**
 * 큐시트 표 읽기 (CueImport). 엑셀 파일(.xlsx → xlsx-lite.js 가 만든 2차원 표)이나 엑셀에서 복사해 붙인 글(탭으로 나뉜 표)을 읽어
 * 가져올 줄 목록으로 바꾼다. 브라우저와 Node 시험이 같은 코드를 쓴다. 저장은 서버(timeline.js action:'cue-import')가 한 번 더 검사한다.
 *
 * parseText(text) → 2차원 표(줄 × 칸). 탭이 있으면 탭, 없으면 쉼표로 나눈다. "따옴표" 안의 줄바꿈·탭은 한 칸으로 읽는다(엑셀이 칸 안에 줄바꿈이 있으면 이렇게 복사해 준다).
 * fromRows(table, { defaultDay, year }) → { rows:[{ dayDate, startTime, endTime, title, place, team, items, prepNotes, line }], skipped:[{ line, reason }], used:[읽은 열 이름], ignored:[안 가져온 열 이름], header:boolean }
 * fromText(text, opts) = fromRows(parseText(text), opts)
 *
 * 열 이름 자동 찾기(머리글 줄이 있을 때): 날짜·일자 / 시작·시작시간·시간 / 끝·종료 / 일정·프로그램·내용·제목·활동 / 장소·위치 / 팀·담당팀 / 준비물·물품 / 할 일·준비사항·해야 할 일.
 *   머리글이 없으면 [날짜][시작][끝][일정][장소][팀][준비물][할 일] 순서로 본다. 메모·비고·담당 같은 열은 가져오지 않는다(내부 메모와 섞이면 안 되니까) — ignored 에 이름만 알려 준다.
 * 읽는 규칙(없는 값을 지어내지 않는다):
 *   날짜: 2026-07-20 · 2026.7.20 · 2026/7/20 · 7월 20일(월) · 7/20 · 엑셀 날짜 숫자. 날짜 칸이 비면 위 줄 날짜를 이어 쓰고, 맨 위부터 비면 defaultDay. 날짜만 적힌 줄은 그 아래 줄들의 날짜가 된다.
 *   시간: 9:30 · 09:30 · 9시 30분 · 오전 9시 · 오후 2:30 · 엑셀 시간 숫자(0.375). 「09:00-10:00」 처럼 한 칸에 적힌 범위는 시작·끝으로 나눈다. 읽지 못하면 그 줄은 건너뛰고 이유를 알려 준다.
 *   팀 칸에 여러 팀(쉼표·/·+·&)이 적혀 있으면 팀마다 한 줄씩 만든다. 준비물 칸은 줄바꿈·쉼표·가운뎃점으로 나뉜 것을 줄마다 하나로 바꾼다.
 */
(function (root) {
  'use strict';
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function cell(v) { return v == null ? '' : String(v).replace(/ /g, ' ').trim(); }

  function parseText(text) {
    var s = String(text == null ? '' : text).replace(/^﻿/, '').replace(/\r\n?/g, '\n'), rows = [], row = [], cur = '', q = false, i, ch;
    var tab = s.indexOf('\t') >= 0, sep = tab ? '\t' : ',';
    for (i = 0; i < s.length; i++) {
      ch = s[i];
      if (q) { if (ch === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"' && cur === '') q = true;
      else if (ch === sep) { row.push(cur); cur = ''; }
      else if (ch === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ''; }); }).map(function (r) { return r.map(function (c) { return String(c).trim(); }); });
  }

  // ---- 날짜 ----
  function validYmd(y, m, d) { var t = new Date(Date.UTC(y, m - 1, d)); return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d; }
  function ymd(y, m, d) { return validYmd(y, m, d) ? y + '-' + pad(m) + '-' + pad(d) : ''; }
  function serialToYmd(n) { var t = new Date(Date.UTC(1899, 11, 30) + Math.floor(n) * 86400000); return ymd(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate()); }
  function parseDay(v, year) {
    if (typeof v === 'number' && v >= 20000 && v < 80000) return serialToYmd(v);
    var s = cell(v).replace(/\s*[(（][^)）]*[)）]\s*/g, ' ').replace(/\s*(월|화|수|목|금|토|일)요일\s*$/, '').trim(), m;
    if ((m = /^(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?$/.exec(s))) return ymd(+m[1], +m[2], +m[3]);
    if ((m = /^(\d{1,2})\s*월\s*(\d{1,2})\s*일?$/.exec(s)) && year) return ymd(+year, +m[1], +m[2]);
    if ((m = /^(\d{1,2})\s*[/.]\s*(\d{1,2})$/.exec(s)) && year) return ymd(+year, +m[1], +m[2]);
    if (/^\d{5}$/.test(s)) return serialToYmd(+s);
    return '';
  }

  // ---- 시간 ----
  function parseClock(v) {
    if (typeof v === 'number') { if (v > 0 && v < 1) { var mm = Math.round(v * 1440); return mm >= 1440 ? '' : pad(Math.floor(mm / 60)) + ':' + pad(mm % 60); } if (v === 0) return '00:00'; return ''; }
    var s = cell(v); if (!s) return ''; var pm = /오후|pm/i.test(s), am = /오전|am/i.test(s); s = s.replace(/오전|오후|am|pm/ig, '').trim();
    var m = /^(\d{1,2})\s*[:：]\s*(\d{2})(?:\s*[:：]\s*\d{2})?$/.exec(s) || /^(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?$/.exec(s) || /^(\d{1,2})(\d{2})$/.exec(s);
    if (!m) return ''; var h = +m[1], mi = m[2] == null ? 0 : +m[2];
    if (pm && h < 12) h += 12; if (am && h === 12) h = 0;
    return h < 24 && mi < 60 ? pad(h) + ':' + pad(mi) : '';
  }
  /** 「09:00-10:00」·「9시~10시」 같은 범위 칸 → [시작, 끝]. 범위가 아니면 null */
  function splitRange(v) {
    var s = cell(v); if (typeof v === 'number' || !s) return null; var p = s.split(/\s*[-~–—∼]\s*/); if (p.length !== 2) return null;
    var a = parseClock(p[0]), b = parseClock(p[1]); return a && b ? [a, b] : null;
  }

  // ---- 열 이름 ----
  var COLS = [
    ['day', '날짜', /^(날짜|일자|일시|date|day)$/i],
    ['team', '팀', /^(팀|담당 ?팀|맡은 ?팀|team)$/i],
    ['start', '시작', /^(시작|시작 ?시간|시작 ?시각|시간|start|from|time)$/i],
    ['end', '끝', /^(끝|끝 ?시간|끝나는 ?시간|종료|종료 ?시간|종료 ?시각|end|to)$/i],
    ['title', '일정', /^(일정|프로그램|내용|제목|활동|순서|program|title|schedule|event)$/i],
    ['place', '장소', /^(장소|위치|place|location|where)$/i],
    ['items', '준비물', /^(준비물|물품|필요한 ?물품|items?|supplies)$/i],
    ['prepNotes', '할 일', /^(할 ?일|해야 ?할 ?일|준비 ?사항|준비 ?내용|준비|해야 ?할 ?것|to-?do|tasks?)$/i]
  ];
  function colKey(name) { var s = cell(name).replace(/\s+/g, ' '); for (var i = 0; i < COLS.length; i++) if (COLS[i][2].test(s)) return COLS[i][0]; return ''; }
  function label(key) { for (var i = 0; i < COLS.length; i++) if (COLS[i][0] === key) return COLS[i][1]; return key; }
  var DEFAULT_ORDER = ['day', 'start', 'end', 'title', 'place', 'team', 'items', 'prepNotes'];

  function splitList(v, re) { return cell(v).split(re).map(function (x) { return x.trim(); }).filter(Boolean); }

  function fromRows(table, opts) {
    opts = opts || {}; var tbl = Array.isArray(table) ? table : [], out = { rows: [], skipped: [], used: [], ignored: [], header: false };
    var defDay = /^\d{4}-\d{2}-\d{2}$/.test(opts.defaultDay || '') ? opts.defaultDay : '', year = opts.year || (defDay ? +defDay.slice(0, 4) : 0);
    // 머리글 줄 찾기: 앞 5줄 중 알려진 열 이름이 둘 이상인 첫 줄
    var hi = -1, map = {}, i, j;
    for (i = 0; i < Math.min(5, tbl.length) && hi < 0; i++) { var hits = (tbl[i] || []).filter(function (c) { return colKey(c); }).length; if (hits >= 2) hi = i; }
    if (hi >= 0) {
      out.header = true;
      (tbl[hi] || []).forEach(function (c, ci) { var k = colKey(c); if (k && map[k] == null) { map[k] = ci; out.used.push(cell(c)); } else if (cell(c)) out.ignored.push(cell(c)); });
    } else DEFAULT_ORDER.forEach(function (k, ci) { map[k] = ci; out.used.push(label(k)); });
    var day = defDay;
    for (i = hi + 1; i < tbl.length; i++) {
      var r = tbl[i] || [], line = i + 1, g = function (k) { return map[k] == null ? '' : r[map[k]]; };
      if (!r.some(function (c) { return cell(c) !== ''; })) continue;
      // 날짜만 적힌 줄(구분 줄): 그 아래 줄들의 날짜
      var filled = r.filter(function (c) { return cell(c) !== ''; });
      if (filled.length === 1) { var dd = parseDay(filled[0], year); if (dd) { day = dd; continue; } }
      var rawDay = g('day'), dayCell = cell(rawDay);
      if (dayCell) { var pd = parseDay(rawDay, year); if (pd) day = pd; else { out.skipped.push({ line: line, reason: '날짜를 읽지 못했어요' }); continue; } }
      var title = cell(g('title'));
      var st = '', en = '', sv = g('start'), ev = g('end');
      var range = splitRange(sv); if (range && !cell(ev)) { st = range[0]; en = range[1]; } else { st = parseClock(sv); en = parseClock(ev); }
      if (!title) { out.skipped.push({ line: line, reason: '일정 이름이 없어요' }); continue; }
      if (!day) { out.skipped.push({ line: line, reason: '날짜를 알 수 없어요' }); continue; }
      if (cell(sv) && !st) { out.skipped.push({ line: line, reason: '시작 시간을 읽지 못했어요' }); continue; }
      if (cell(ev) && !en) { out.skipped.push({ line: line, reason: '끝 시간을 읽지 못했어요' }); continue; }
      if (st && en && en < st) { out.skipped.push({ line: line, reason: '끝나는 시간이 시작보다 빨라요' }); continue; }
      var items = splitList(g('items'), /[\n,，、·;；]+/).join('\n'), notes = cell(g('prepNotes')), place = cell(g('place'));
      var teams = splitList(g('team'), /[,，、/＋+&]+/); if (!teams.length) teams = [''];
      for (j = 0; j < teams.length; j++) out.rows.push({ dayDate: day, startTime: st, endTime: en, title: title, place: place, team: teams[j], items: items, prepNotes: notes, line: line });
    }
    return out;
  }
  function fromText(text, opts) { return fromRows(parseText(text), opts); }

  var api = { parseText: parseText, fromRows: fromRows, fromText: fromText, parseDay: parseDay, parseClock: parseClock, splitRange: splitRange, colKey: colKey };
  root.CueImport = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
