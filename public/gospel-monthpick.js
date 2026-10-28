/* 복음 통계 — 연·월 선택기. 일(日)은 필요 없으니 달 12칸(또는 연도 칸)만 보여 주는 작은 창.
 *   GospelMonthPick.open(anchor, { mode: 'month'|'year', value: 'YYYY-MM'|'YYYY', min: 'YYYY-MM', max: 'YYYY-MM', lang: 'ko'|'en', onPick(value) })
 * 월 모드: 위에서 해를 넘기고(‹ 2026 ›) 아래 12칸에서 달을 고른다. min~max 밖의 달은 눌리지 않는다.
 * 연 모드: min~max 사이의 해만 칸으로 보여 준다. 바깥을 누르거나 Esc 로 닫는다. */
(function () {
  'use strict';
  var NAMES = { ko: ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] };
  var pop = null, anchorEl = null;

  function close() {
    if (!pop) return;
    document.removeEventListener('mousedown', onOutside, true); document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('resize', close); window.removeEventListener('scroll', onScroll, true);
    pop.remove(); pop = null;
    if (anchorEl) { anchorEl.setAttribute('aria-expanded', 'false'); anchorEl = null; }
  }
  function onOutside(e) { if (pop && !pop.contains(e.target) && !(anchorEl && anchorEl.contains(e.target))) close(); }
  function onKey(e) { if (e.key === 'Escape') { var a = anchorEl; close(); if (a) a.focus(); } }
  function onScroll(e) { if (pop && !pop.contains(e.target)) place(); }
  function place() {
    if (!pop || !anchorEl) return;
    var r = anchorEl.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight, vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var left = Math.min(Math.max(10, r.left + r.width / 2 - w / 2), vw - w - 10), top = r.bottom + 8;
    if (top + h > vh - 10) top = Math.max(10, r.top - h - 8);
    pop.style.left = left + 'px'; pop.style.top = top + 'px';
  }

  function open(anchor, cfg) {
    if (pop && anchorEl === anchor) { close(); return; }       // 같은 버튼을 다시 누르면 닫는다
    close();
    var lang = cfg.lang === 'en' ? 'en' : 'ko', mode = cfg.mode === 'year' ? 'year' : 'month';
    var min = String(cfg.min || '0000-01'), max = String(cfg.max || '9999-12');
    var minY = Number(min.slice(0, 4)), maxY = Number(max.slice(0, 4));
    var value = String(cfg.value || ''), cur = Number(value.slice(0, 4)) || maxY;
    var year = Math.min(Math.max(cur, minY), maxY);
    anchorEl = anchor; anchor.setAttribute('aria-expanded', 'true');
    pop = document.createElement('div'); pop.className = 'gs-mp'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', mode === 'year' ? 'Year' : 'Year and month');

    function draw() {
      var html = '';
      if (mode === 'month') {
        html += '<div class="gs-mp-head"><button type="button" class="gs-mp-nav" data-y="-1" aria-label="Previous year"' + (year <= minY ? ' disabled' : '') + '>‹</button><b>' + (lang === 'en' ? year : year + '년') + '</b><button type="button" class="gs-mp-nav" data-y="1" aria-label="Next year"' + (year >= maxY ? ' disabled' : '') + '>›</button></div><div class="gs-mp-grid">';
        for (var m = 1; m <= 12; m++) {
          var ym = year + '-' + String(m).padStart(2, '0'), off = ym < min || ym > max;
          html += '<button type="button" class="gs-mp-cell' + (ym === value ? ' is-on' : '') + '" data-v="' + ym + '"' + (off ? ' disabled' : '') + '>' + NAMES[lang][m - 1] + '</button>';
        }
        html += '</div>';
      } else {
        html += '<div class="gs-mp-grid gs-mp-years">';
        for (var y = maxY; y >= minY; y--) html += '<button type="button" class="gs-mp-cell' + (String(y) === value ? ' is-on' : '') + '" data-v="' + y + '">' + (lang === 'en' ? y : y + '년') + '</button>';
        html += '</div>';
      }
      pop.innerHTML = html;
    }
    pop.addEventListener('click', function (e) {
      var nav = e.target.closest('[data-y]'), cell = e.target.closest('[data-v]');
      if (nav && !nav.disabled) { year += Number(nav.dataset.y); draw(); place(); return; }
      if (cell && !cell.disabled) { var v = cell.dataset.v; close(); if (typeof cfg.onPick === 'function') cfg.onPick(v); }
    });
    draw();
    pop.style.cssText = 'position:fixed;left:0;top:0;visibility:hidden';
    document.body.appendChild(pop);
    place(); pop.style.visibility = '';
    document.addEventListener('mousedown', onOutside, true); document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', close); window.addEventListener('scroll', onScroll, true);
    var on = pop.querySelector('.is-on') || pop.querySelector('.gs-mp-cell:not([disabled])'); if (on) on.focus({ preventScroll: true });
  }
  window.GospelMonthPick = { open: open, close: close };
})();
