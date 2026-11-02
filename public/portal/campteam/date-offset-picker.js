/**
 * 기한을 "캠프 시작일에서 며칠 전/후"로 다루는 도우미 + 달력에서 고르는 창.
 *  - 순수 함수(날짜 계산·문구)는 시험에서도 쓸 수 있게 globalThis.CTDateOffset 에 둔다.
 *  - 저장하는 값은 항상 정수 하나(offsetDays, 음수 = 캠프 전)라서 어떤 캠프에 적용해도 같은 규칙으로 계산된다.
 *  - 달력 창: 폰(≤900px)에서는 아래에서 올라오는 시트, 컴퓨터에서는 버튼 옆 작은 창.
 */
(function (root) {
  var DAY = 86400000;
  var isDate = function (d) { return /^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) && !isNaN(Date.parse(d)); };
  var utc = function (d) { return Date.parse(d + 'T00:00:00Z'); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (ms) { var d = new Date(ms); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); };
  var lang = function () { try { return root.CT && root.CT.lang ? root.CT.lang() : 'ko'; } catch (e) { return 'ko'; } };
  var en = function (l) { return (l || lang()) === 'en'; };

  /** 두 날짜 사이의 일수 (b - a) */
  function daysBetween(a, b) { return Math.round((utc(b) - utc(a)) / DAY); }
  function addDays(d, n) { return iso(utc(d) + n * DAY); }
  /** 1/14 모양(앞의 0 없이) */
  function mdText(d) { return isDate(d) ? Number(d.slice(5, 7)) + '/' + Number(d.slice(8, 10)) : ''; }

  /** 기한이 캠프 시작일보다 며칠 전(-)·후(+)인지. 캠프 시작일이나 기한이 없으면 null */
  function dueRel(due, campStart) { return isDate(due) && isDate(campStart) ? daysBetween(campStart, due) : null; }
  function relText(n, l) {
    if (n == null) return '';
    if (en(l)) return n === 0 ? 'Camp day' : n < 0 ? (-n) + (n === -1 ? ' day' : ' days') + ' before camp' : n + (n === 1 ? ' day' : ' days') + ' after camp';
    return n === 0 ? '캠프 당일' : n < 0 ? '캠프 ' + (-n) + '일 전' : '캠프 ' + n + '일 후';
  }
  /** 목록에 보여 주는 기한: "1/14 · 캠프 3일 전" (캠프나 시작일이 없으면 날짜만) */
  function dueLabel(due, campStart, l) {
    if (!isDate(due)) return '';
    var r = relText(dueRel(due, campStart), l);
    return mdText(due) + (r ? ' · ' + r : '');
  }

  /** 템플릿 항목의 기준일(정수 | null) ⇄ 화면의 [숫자 + 일 전/일 후/당일/정하지 않음] */
  function offsetToParts(n) {
    if (n == null || n === '' || isNaN(Number(n))) return { kind: 'none', n: '' };
    n = Number(n); return n === 0 ? { kind: 'same', n: '' } : n < 0 ? { kind: 'before', n: -n } : { kind: 'after', n: n };
  }
  /** 위의 반대. 숫자가 올바르지 않으면 NaN (0~1000 정수만 허용) */
  function partsToOffset(kind, n) {
    if (kind === 'none') return null;
    if (kind === 'same') return 0;
    var v = Number(String(n).trim());
    if (String(n).trim() === '' || !Number.isInteger(v) || v < 0 || v > 1000) return NaN;
    return kind === 'before' ? (v === 0 ? 0 : -v) : v;
  }
  /** 표에 보여 주는 말: 3일 전 / 당일 / 5일 후 / 기한 없음 */
  function offsetLabel(n, l) {
    if (n == null || n === '' || isNaN(Number(n))) return en(l) ? 'No due date' : '기한 없음';
    n = Number(n);
    if (en(l)) return n === 0 ? 'Camp day' : n < 0 ? (-n) + (n === -1 ? ' day' : ' days') + ' before' : n + (n === 1 ? ' day' : ' days') + ' after';
    return n === 0 ? '당일' : n < 0 ? (-n) + '일 전' : n + '일 후';
  }

  /** 예시 캠프 기본값: 오늘 이후 가장 가까운 캠프(시작일이 있는 것), 없으면 가장 최근 캠프 */
  function pickDefaultCamp(camps, today) {
    var list = (camps || []).filter(function (c) { return c && isDate(c.startDate); });
    if (!list.length) return null;
    var up = list.filter(function (c) { return (c.endDate && isDate(c.endDate) ? c.endDate : c.startDate) >= today; }).sort(function (a, b) { return a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0; });
    if (up.length) return up[0];
    return list.sort(function (a, b) { return a.startDate < b.startDate ? 1 : a.startDate > b.startDate ? -1 : 0; })[0];
  }

  /** 달력 한 달의 칸들 (일요일 시작). 앞뒤 빈 칸은 date 가 null */
  function monthCells(y, m0) {
    var first = new Date(Date.UTC(y, m0, 1)), lead = first.getUTCDay(), n = new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate(), out = [];
    for (var i = 0; i < lead; i++) out.push({ date: null });
    for (var d = 1; d <= n; d++) out.push({ date: y + '-' + pad(m0 + 1) + '-' + pad(d) });
    while (out.length % 7) out.push({ date: null });
    return out;
  }
  /** 그 날이 캠프 기간인지 / 캠프 준비 주(prepStart~prepEnd, 다른 곳에서 정해 주면)인지 */
  function dayKind(date, camp) {
    if (!camp || !isDate(camp.startDate)) return '';
    var end = isDate(camp.endDate) ? camp.endDate : camp.startDate;
    if (date >= camp.startDate && date <= end) return 'camp';
    if (isDate(camp.prepStart) && isDate(camp.prepEnd) && date >= camp.prepStart && date <= camp.prepEnd) return 'prep';
    return '';
  }

  /* ---------- 달력 창 ---------- */
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var T = function (ko, e) { return en() ? e : ko; };
  var campName = function (c) { return (root.CT && root.CT.pick) ? root.CT.pick(c, 'name') : (c.nameKo || c.nameEn || ''); };

  /**
   * 달력 창 열기.  opts = { anchor, camps, value(정수|null), today, onPick(offset) }
   * 날짜를 누르면 "캠프 3일 전 (1/14)"처럼 보여 주고, [이 날짜로 정하기]를 누르면 기준일(정수)을 돌려준다.
   */
  function openPicker(opts) {
    var doc = root.document; if (!doc) return null;
    var camps = (opts.camps || []).filter(function (c) { return c && isDate(c.startDate); });
    var today = opts.today || iso(Date.now() + 9 * 3600000);
    var camp = pickDefaultCamp(camps, today), sel = null, host = (opts.anchor && opts.anchor.closest && opts.anchor.closest('dialog')) || doc.body;
    if (camp && opts.value != null && isFinite(Number(opts.value))) sel = addDays(camp.startDate, Number(opts.value));
    var base = sel || (camp && camp.startDate) || today, view = { y: Number(base.slice(0, 4)), m: Number(base.slice(5, 7)) - 1 };
    var back = doc.createElement('div'), box = doc.createElement('div'); back.className = 'dop-back'; box.className = 'dop'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', T('달력에서 기한 고르기', 'Pick a due date on the calendar'));
    host.appendChild(back); host.appendChild(box);

    function close() { doc.removeEventListener('keydown', onKey, true); if (back.parentNode) back.parentNode.removeChild(back); if (box.parentNode) box.parentNode.removeChild(box); if (opts.anchor && opts.anchor.focus) opts.anchor.focus(); }
    function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); } }
    doc.addEventListener('keydown', onKey, true);
    back.onclick = close;

    function place() { // 컴퓨터: 버튼 바로 아래(공간이 없으면 위). 폰은 CSS 가 아래 시트로 둔다
      if (!opts.anchor || root.innerWidth <= 900) { box.style.top = box.style.left = ''; return; }
      var r = opts.anchor.getBoundingClientRect(), w = Math.min(340, root.innerWidth - 24), h = box.offsetHeight || 420;
      var left = Math.max(12, Math.min(r.left, root.innerWidth - w - 12)), top = r.bottom + 6; if (top + h > root.innerHeight - 8) top = Math.max(8, r.top - h - 6);
      box.style.left = left + 'px'; box.style.top = top + 'px'; box.style.width = w + 'px';
    }
    function render() {
      var rel = camp && sel ? dueRel(sel, camp.startDate) : null;
      var months = en() ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] : ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
      var dows = en() ? ['S', 'M', 'T', 'W', 'T', 'F', 'S'] : ['일', '월', '화', '수', '목', '금', '토'];
      var cells = monthCells(view.y, view.m).map(function (c) {
        if (!c.date) return '<span class="dop-d off"></span>';
        var k = dayKind(c.date, camp), r2 = camp ? dueRel(c.date, camp.startDate) : null;
        return '<button type="button" class="dop-d ' + k + (c.date === sel ? ' sel' : '') + (c.date === today ? ' today' : '') + '" data-d="' + c.date + '" title="' + esc(r2 == null ? '' : relText(r2)) + '"><b>' + Number(c.date.slice(8)) + '</b>' + (k === 'camp' ? '<i>' + T('캠프', 'Camp') + '</i>' : '') + '</button>';
      }).join('');
      box.innerHTML = '<div class="dop-head"><b>' + esc(T('📅 달력에서 고르기', '📅 Pick on the calendar')) + '</b><button type="button" class="dop-x" data-x aria-label="' + esc(T('닫기', 'Close')) + '">✕</button></div>' +
        (camps.length ? '<label class="dop-camp">' + esc(T('예시 캠프', 'Example camp')) + '<select data-camp>' + camps.map(function (c) { return '<option value="' + esc(c.id) + '"' + (camp && c.id === camp.id ? ' selected' : '') + '>' + esc(campName(c)) + '</option>'; }).join('') + '</select></label>'
          : '<div class="dop-none">' + esc(T('날짜를 세려면 시작일이 정해진 예시 캠프가 하나 필요해요. 지금은 달력만 볼 수 있어요.', 'An example camp with a start date is needed to count days. For now this is just a calendar.')) + '</div>') +
        '<div class="dop-nav"><button type="button" data-nav="-1" aria-label="' + esc(T('이전 달', 'Previous month')) + '">‹</button><b>' + (en() ? months[view.m] + ' ' + view.y : view.y + '년 ' + months[view.m]) + '</b><button type="button" data-nav="1" aria-label="' + esc(T('다음 달', 'Next month')) + '">›</button></div>' +
        '<div class="dop-grid"><div class="dop-dow">' + dows.map(function (d) { return '<span>' + d + '</span>'; }).join('') + '</div><div class="dop-days">' + cells + '</div></div>' +
        (camp ? '<div class="dop-legend"><span><i class="lg camp"></i>' + esc(T('캠프', 'Camp')) + '</span>' + (isDate(camp.prepStart) && isDate(camp.prepEnd) ? '<span><i class="lg prep"></i>' + esc(T('캠프 준비 주', 'Prep week')) + '</span>' : '') + '</div>' : '') +
        '<div class="dop-sum" aria-live="polite">' + (rel != null ? '<b>' + esc(relText(rel)) + '</b> (' + esc(mdText(sel)) + ')' : camp ? '<span>' + esc(T('날짜를 눌러 보세요', 'Tap a day')) + '</span>' : '') + '</div>' +
        '<div class="dop-act"><button type="button" class="btn" data-x>' + esc(T('취소', 'Cancel')) + '</button><button type="button" class="btn pri" data-ok' + (rel == null ? ' disabled' : '') + '>' + esc(T('이 날짜로 정하기', 'Use this day')) + '</button></div>';
      place();
    }
    box.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-x')) close();
      else if (b.dataset.nav) { view.m += Number(b.dataset.nav); if (view.m < 0) { view.m = 11; view.y--; } if (view.m > 11) { view.m = 0; view.y++; } render(); }
      else if (b.dataset.d) { sel = b.dataset.d; render(); }
      else if (b.hasAttribute('data-ok') && camp && sel) { var n = dueRel(sel, camp.startDate); close(); if (opts.onPick) opts.onPick(n); }
    });
    box.addEventListener('change', function (e) {
      if (!e.target.matches || !e.target.matches('[data-camp]')) return;
      camp = camps.filter(function (c) { return c.id === e.target.value; })[0] || camp; sel = null; view = { y: Number(camp.startDate.slice(0, 4)), m: Number(camp.startDate.slice(5, 7)) - 1 }; render();
    });
    render();
    var f = box.querySelector('.dop-d.sel,.dop-d.camp,.dop-d:not(.off)'); if (f && f.focus) f.focus();
    return { close: close };
  }

  root.CTDateOffset = { daysBetween: daysBetween, addDays: addDays, mdText: mdText, dueRel: dueRel, relText: relText, dueLabel: dueLabel, offsetToParts: offsetToParts, partsToOffset: partsToOffset, offsetLabel: offsetLabel, pickDefaultCamp: pickDefaultCamp, monthCells: monthCells, dayKind: dayKind, open: openPicker };
})(typeof window !== 'undefined' ? window : globalThis);
