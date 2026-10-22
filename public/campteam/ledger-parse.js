/**
 * 엑셀 내용(장부·예산·목록 탭, 또는 엑셀에서 복사해 붙여넣은 표) → 서버로 보낼 줄 목록.
 * 입력은 2차원 배열 rows[줄][칸] (xlsx-lite 가 읽은 값 그대로). 줄 번호는 인덱스 + 1.
 */
(function (root) {
  'use strict';
  var norm = function (v) { return String(v == null ? '' : v).replace(/\s+/g, ' ').trim(); };
  var blank = function (v) { return v == null || norm(v) === ''; };

  /** 엑셀 숫자 날짜 / "2027-01-05" / "2027. 1. 5." / "2027/1/5" / "1/5/2027" → YYYY-MM-DD, 비어 있으면 '', 읽을 수 없으면 원래 글자 */
  function toIsoDate(v) {
    if (blank(v)) return '';
    if (typeof v === 'number') {
      if (v < 20000 || v > 80000) return String(v);
      var d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86400000); return d.toISOString().slice(0, 10);
    }
    var s = norm(v), m, p = function (n) { return String(n).padStart(2, '0'); };
    if ((m = /^(\d{4})[-./\s]+(\d{1,2})[-./\s]+(\d{1,2})\.?$/.exec(s))) return m[1] + '-' + p(m[2]) + '-' + p(m[3]);
    if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) return m[3] + '-' + p(m[1]) + '-' + p(m[2]);
    if (/^\d{5}$/.test(s)) return toIsoDate(Number(s));
    return s;
  }
  function kindOf(v) {
    var s = norm(v).toLowerCase();
    if (['수입', '입금', 'income', 'in', '+'].indexOf(s) >= 0) return 'income';
    if (['지출', '출금', 'expense', 'out', '-'].indexOf(s) >= 0) return 'expense';
    return '';
  }
  function amountOf(v) { if (typeof v === 'number') return v; var s = norm(v).replace(/[,\s₩원]/g, ''); return s === '' ? '' : s; }

  var HEAD = { date: /^(날짜|일자|date)$/i, kind: /^(구분|종류|type|kind)$/i, amount: /^(금액|amount)$/i, category: /^(항목|분류|category)$/i, description: /^(내용|적요|description)$/i, note: /^(비고|메모|note)$/i, id: /^(id|포털\s*id)$/i };
  function findHeader(rows) {
    for (var i = 0; i < Math.min(rows.length, 15); i++) {
      var map = {}, hit = 0; (rows[i] || []).forEach(function (c, j) { var t = norm(c); for (var k in HEAD) if (map[k] == null && HEAD[k].test(t)) { map[k] = j; hit++; } });
      if (map.date != null && map.amount != null && (map.kind != null || map.category != null)) return { index: i, map: map };
    }
    return null;
  }
  /** 장부 줄: 머리글(날짜·구분·금액·항목·내용·비고[·ID])이 있으면 그 칸을 쓰고, 없으면 엑셀 장부와 같은 순서로 읽는다 */
  function parseLedger(rows) {
    var h = findHeader(rows), map, start;
    if (h) { map = h.map; start = h.index + 1; }
    else { var w = Math.max.apply(null, rows.slice(0, 20).map(function (r) { return (r || []).length; }).concat([0])); map = w >= 7 ? { date: 0, kind: 1, amount: 2, category: 4, description: 5, note: 6 } : { date: 0, kind: 1, amount: 2, category: 3, description: 4, note: 5 }; start = 0; }
    var out = [], g = function (r, k) { return map[k] == null ? null : r[map[k]]; };
    for (var i = start; i < rows.length; i++) {
      var r = rows[i] || [], amount = amountOf(g(r, 'amount')), cat = norm(g(r, 'category')), desc = norm(g(r, 'description'));
      if (amount === '' && !cat && !desc) continue;                                   // 수식만 미리 채워 둔 빈 줄
      out.push({ row: i + 1, id: blank(g(r, 'id')) ? undefined : norm(g(r, 'id')), date: toIsoDate(g(r, 'date')), kind: kindOf(g(r, 'kind')), amount: amount, category: cat, description: desc, note: norm(g(r, 'note')) });
    }
    return out;
  }
  var SKIP = ['합계', '총합', '총 합', '소계', '항목', '구분', '계', '합 계'];
  /** 예산 탭: A=항목 B=예산 금액 (D=구분: 수입이면 수입 예산, 없으면 지출) */
  function parsePlan(rows) {
    var out = [];
    rows.forEach(function (r) {
      r = r || []; var cat = norm(r[0]), amt = amountOf(r[1]);
      if (!cat || amt === '' || SKIP.indexOf(cat) >= 0 || (typeof amt === 'string' && isNaN(Number(amt)))) return;
      out.push({ kind: kindOf(r[3]) === 'income' ? 'income' : 'expense', category: cat, amount: amt });
    });
    return out;
  }
  /** 목록 탭: "수입항목" / "지출항목" 열 아래의 이름들 */
  function parseLists(rows) {
    for (var i = 0; i < Math.min(rows.length, 6); i++) {
      var r = rows[i] || [], inc = -1, exp = -1; r.forEach(function (c, j) { var t = norm(c); if (/^수입\s*항목$/.test(t)) inc = j; if (/^지출\s*항목$/.test(t)) exp = j; });
      if (inc < 0 && exp < 0) continue;
      var res = { income: [], expense: [] };
      for (var k = i + 1; k < rows.length; k++) { var rr = rows[k] || []; if (inc >= 0 && !blank(rr[inc])) res.income.push(norm(rr[inc])); if (exp >= 0 && !blank(rr[exp])) res.expense.push(norm(rr[exp])); }
      return res;
    }
    return null;
  }
  /** 읽은 통합 문서에서 탭을 찾는다 */
  function detect(book) {
    var out = { ledger: null, plan: null, lists: null, others: [] };
    book.sheets.forEach(function (s) {
      var n = norm(s.name);
      if (/항목별\s*합계/.test(n)) { out.others.push(n); return; }
      if (/장부|ledger/i.test(n) && !out.ledger) out.ledger = { name: n, rows: parseLedger(s.rows) };
      else if (/목록|list/i.test(n) && !out.lists) { var l = parseLists(s.rows); if (l) out.lists = Object.assign({ name: n }, l); else out.others.push(n); }
      else if (/예산|budget/i.test(n) && !out.plan) out.plan = { name: n, items: parsePlan(s.rows) };
      else out.others.push(n);
    });
    if (!out.ledger) { // 탭 이름이 달라도 머리글(날짜·금액·구분)이 있는 탭을 장부로 본다
      for (var i = 0; i < book.sheets.length; i++) { if (findHeader(book.sheets[i].rows)) { out.ledger = { name: norm(book.sheets[i].name), rows: parseLedger(book.sheets[i].rows) }; break; } }
    }
    return out;
  }
  /** 붙여넣은 글(탭으로 나뉜 표 또는 쉼표로 나뉜 표) → 2차원 배열 */
  function parseText(t) {
    var lines = String(t || '').replace(/\r/g, '').split('\n').filter(function (l) { return l.trim() !== ''; });
    var delim = lines.some(function (l) { return l.indexOf('\t') >= 0; }) ? '\t' : ',';
    return lines.map(function (l) {
      if (delim === '\t') return l.split('\t').map(function (c) { return c.trim() === '' ? null : (/^-?\d[\d,]*(\.\d+)?$/.test(c.trim()) && c.indexOf(',') < 0 && c.trim().length < 9 ? Number(c.trim()) : c.trim()); });
      var cells = [], cur = '', q = false; for (var i = 0; i < l.length; i++) { var ch = l[i]; if (q) { if (ch === '"' && l[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; } else if (ch === '"') q = true; else if (ch === ',') { cells.push(cur); cur = ''; } else cur += ch; } cells.push(cur);
      return cells.map(function (c) { return c.trim() === '' ? null : c.trim(); });
    });
  }
  var api = { toIsoDate: toIsoDate, kindOf: kindOf, parseLedger: parseLedger, parsePlan: parsePlan, parseLists: parseLists, detect: detect, parseText: parseText, findHeader: findHeader };
  root.LedgerParse = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
