/*
 * WOLKO 공용 날짜 선택 달력 — 브라우저 기본 달력 대신 둥근 모양의 직접 만든 팝업을 쓴다.
 * - 페이지의 모든 <input type="date">를 읽기 전용 텍스트(YYYY-MM-DD)로 바꿔 이 달력과 연결한다. 값은 기존과 같은 ISO 문자열이다.
 * - 날짜를 고르면 input · change 이벤트를 보내므로 페이지의 기존 코드는 그대로 동작한다.
 * - 생년월일처럼 먼 과거를 고르는 입력칸은 data-cal-jump 를 달면 머리글에 연·월 선택칸이 생긴다.
 *   data-cal-years="최소연도,최대연도" 로 연도 범위를, data-cal-start="YYYY" 로 빈 칸일 때 처음 보여줄 연도를 정한다.
 * - 좁은 화면(640px 이하)이나 data-cal-center 입력칸은 달력을 화면 가운데에 띄우고 뒤를 살짝 어둡게 한다(스크롤해도 따라다니지 않는다).
 * - 언어는 <html lang>을 따른다(ko/en). 키보드: Enter/Space/↓ 열기, 방향키 이동, Enter 선택, Esc 닫기.
 */
(function () {
  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const todayIso = () => iso(new Date());
  const parseIso = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null; };
  const isEn = () => (document.documentElement.lang || '').toLowerCase().startsWith('en');

  function enhance(input) {
    if (input.dataset.datepick !== undefined) return;
    const value = input.value;
    input.type = 'text';
    input.readOnly = true;
    input.setAttribute('data-datepick', '');
    input.setAttribute('inputmode', 'none');
    input.setAttribute('autocomplete', 'off');
    input.value = value;
  }
  function enhanceAll(root) { (root || document).querySelectorAll('input[type="date"]').forEach(enhance); }

  let el, backdrop, forInput = null, view = null, cursor = null;
  const isCenter = () => !!forInput && (innerWidth <= 640 || forInput.dataset.calCenter !== undefined);
  function ensure() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'wl-cal'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'calendar');
    backdrop = document.createElement('div');
    backdrop.className = 'wl-cal-backdrop'; backdrop.hidden = true;
    document.body.append(backdrop, el);
  }
  function place() {
    if (!forInput || !el || el.hidden) return;
    const r = forInput.getBoundingClientRect(), h = el.offsetHeight, w = el.offsetWidth;
    if (el.classList.contains('wl-cal-center')) {
      el.style.top = Math.max(8, (innerHeight - h) / 2) + 'px';
      el.style.left = Math.max(8, (innerWidth - w) / 2) + 'px';
      return;
    }
    const spaceBelow = innerHeight - r.bottom, spaceAbove = r.top;
    const below = spaceBelow >= h + 12 || spaceBelow >= spaceAbove;
    const top = below ? r.bottom + 8 : r.top - h - 8;
    el.style.top = Math.max(8, Math.min(top, innerHeight - h - 8)) + 'px';
    el.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  }
  function draw() {
    const sel = parseIso(forInput.value), tIso = todayIso(), en = isEn();
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const start = new Date(first); start.setDate(1 - first.getDay());
    const names = en ? ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'] : ['일', '월', '화', '수', '목', '금', '토'];
    const title = en ? first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : `${first.getFullYear()}년 ${first.getMonth() + 1}월`;
    let days = '';
    for (let i = 0; i < 42; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      const v = iso(d);
      const cls = ['wl-cal-day', d.getMonth() !== first.getMonth() ? 'out' : '', d.getDay() === 0 ? 'sun' : '', v === tIso ? 'today' : '', sel && v === iso(sel) ? 'sel' : '', cursor && v === iso(cursor) ? 'cur' : ''].filter(Boolean).join(' ');
      days += `<button type="button" class="${cls}" data-cal-day="${v}" tabindex="-1">${d.getDate()}</button>`;
    }
    let titleHtml = title;
    if (forInput.dataset.calJump !== undefined) {
      const cy = new Date().getFullYear();
      const [lo, hi] = (forInput.dataset.calYears || '').split(',').map(Number);
      const minY = Math.min(Number.isFinite(lo) ? lo : cy - 40, view.getFullYear());
      const maxY = Math.max(Number.isFinite(hi) ? hi : cy, view.getFullYear());
      let yo = '';
      for (let y = maxY; y >= minY; y--) yo += `<option value="${y}"${y === view.getFullYear() ? ' selected' : ''}>${y}${en ? '' : '년'}</option>`;
      let mo = '';
      for (let m = 0; m < 12; m++) mo += `<option value="${m}"${m === view.getMonth() ? ' selected' : ''}>${en ? new Date(2000, m, 1).toLocaleDateString('en-US', { month: 'short' }) : (m + 1) + '월'}</option>`;
      titleHtml = `<select class="wl-cal-sel" data-cal-year aria-label="year">${yo}</select><select class="wl-cal-sel" data-cal-month aria-label="month">${mo}</select>`;
    }
    el.innerHTML = `<div class="wl-cal-head"><button type="button" class="wl-cal-nav" data-cal-nav="-1" aria-label="prev">‹</button><div class="wl-cal-title">${titleHtml}</div><button type="button" class="wl-cal-nav" data-cal-nav="1" aria-label="next">›</button></div>
      <div class="wl-cal-week">${names.map(n => `<span>${n}</span>`).join('')}</div><div class="wl-cal-days">${days}</div>
      <div class="wl-cal-foot"><button type="button" data-cal-today>${en ? 'Today' : '오늘'}</button><button type="button" data-cal-close>${en ? 'Close' : '닫기'}</button></div>`;
  }
  function open(input) {
    ensure(); forInput = input;
    const startYear = parseInt(input.dataset.calStart, 10);
    const cur = parseIso(input.value) || (Number.isFinite(startYear) ? new Date(startYear, 5, 1) : new Date());
    cursor = cur; view = new Date(cur.getFullYear(), cur.getMonth(), 1);
    const center = isCenter();
    el.classList.toggle('wl-cal-center', center); backdrop.hidden = !center;
    draw(); el.hidden = false; place();
  }
  function close() { if (el) { el.hidden = true; backdrop.hidden = true; } forInput = null; }
  function pick(v) {
    if (!forInput) return;
    const input = forInput;
    input.value = v; close();
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  document.addEventListener('click', e => {
    const inp = e.target.closest?.('input[data-datepick]');
    if (inp) { if (el && !el.hidden && forInput === inp) close(); else open(inp); return; }
    if (!el || el.hidden) return;
    if (!el.contains(e.target)) { close(); return; }
    const day = e.target.closest('[data-cal-day]');
    if (day) return pick(day.dataset.calDay);
    const nav = e.target.closest('[data-cal-nav]');
    if (nav) { view = new Date(view.getFullYear(), view.getMonth() + (+nav.dataset.calNav), 1); draw(); return; }
    if (e.target.closest('[data-cal-today]')) return pick(todayIso());
    if (e.target.closest('[data-cal-close]')) close();
  });
  document.addEventListener('change', e => {
    const sel = e.target.closest?.('.wl-cal-sel');
    if (!sel || !el || el.hidden || !forInput) return;
    e.stopPropagation();
    const y = +el.querySelector('[data-cal-year]').value, m = +el.querySelector('[data-cal-month]').value;
    view = new Date(y, m, 1); cursor = new Date(y, m, Math.min(cursor.getDate(), 28)); draw();
  }, true);
  document.addEventListener('keydown', e => {
    if (e.target.closest?.('.wl-cal-sel')) { if (e.key === 'Escape') close(); return; }
    const inp = e.target.matches?.('input[data-datepick]') ? e.target : null;
    if (inp && (!el || el.hidden) && (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown')) { e.preventDefault(); open(inp); return; }
    if (!el || el.hidden || !forInput) return;
    if (e.key === 'Escape') { close(); return; }
    const move = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (move) { e.preventDefault(); cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + move); view = new Date(cursor.getFullYear(), cursor.getMonth(), 1); draw(); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(iso(cursor)); }
  });
  // 가운데 달력은 스크롤해도 제자리에 둔다(입력칸 옆에 붙는 달력만 따라간다)
  addEventListener('scroll', () => { if (!el || !el.classList.contains('wl-cal-center')) place(); }, { passive: true, capture: true });
  addEventListener('resize', place);

  function init() {
    enhanceAll(document);
    new MutationObserver(muts => muts.forEach(m => m.addedNodes.forEach(n => {
      if (n.nodeType === 1) { if (n.matches?.('input[type="date"]')) enhance(n); else enhanceAll(n); }
    }))).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
