/*
 * 숫자 플립 카드(분할 숫자판) — 자리마다 카드가 넘어가며 숫자가 바뀐다.
 *   GospelFlip.set(element, number)   처음에는 0 에서 목표 숫자까지 자리별로 차례로 넘어가고, 값이 바뀌면 달라진 자리만 넘어간다.
 * 모션을 줄여 둔 기기에서는 넘어가는 모션 없이 바로 숫자만 보여 준다. 화면 읽기 프로그램에는 전체 숫자를 한 번에 읽어 준다.
 */
(function () {
  var FLIP_MS = 560;
  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  function fmt(value) { return Number(value || 0).toLocaleString('en-US'); }
  function digitHtml(ch) {
    return '<span class="gf-d" data-v="' + ch + '" aria-hidden="true"><span class="gf-half gf-up"><i>' + ch + '</i></span><span class="gf-half gf-low"><i>' + ch + '</i></span>'
      + '<span class="gf-leaf gf-leaf-top"><i>' + ch + '</i></span><span class="gf-leaf gf-leaf-bot"><i>' + ch + '</i></span></span>';
  }
  function slotsHtml(str) { return str.split('').map(function (ch) { return /\d/.test(ch) ? digitHtml(ch) : '<span class="gf-sep" aria-hidden="true">' + ch + '</span>'; }).join(''); }

  function flip(d, from, to) {
    if (from === to) return;
    var q = function (sel) { return d.querySelector(sel); };
    q('.gf-up i').textContent = to; q('.gf-low i').textContent = from;
    q('.gf-leaf-top i').textContent = from; q('.gf-leaf-bot i').textContent = to;
    d.classList.remove('is-flip'); void d.offsetWidth; d.classList.add('is-flip');
    clearTimeout(d._t);
    d._t = setTimeout(function () {
      q('.gf-low i').textContent = to; q('.gf-leaf-top i').textContent = to;
      d.classList.remove('is-flip'); d.dataset.v = to;
    }, FLIP_MS);
  }

  function set(el, value) {
    var str = fmt(value), old = el.dataset.v;
    el.classList.add('gf'); el.setAttribute('role', 'img'); el.setAttribute('aria-label', str);
    if (old === str) return;
    var still = reduced();
    if (old === undefined || old.length !== str.length) {
      el.innerHTML = slotsHtml(still ? str : str.replace(/\d/g, '0'));
      if (!still) {
        var target = str.replace(/[^\d]/g, '').split('');
        el.querySelectorAll('.gf-d').forEach(function (d, i) { var to = target[i]; if (to !== '0') setTimeout(function () { flip(d, '0', to); }, 120 + i * 110); });
      }
    } else if (still) {
      el.innerHTML = slotsHtml(str);
    } else {
      var digits = el.querySelectorAll('.gf-d'), at = 0;
      str.split('').forEach(function (ch, i) {
        if (!/\d/.test(ch)) return;
        var d = digits[at++], before = old.charAt(i);
        if (before !== ch) setTimeout(function () { flip(d, d.dataset.v, ch); }, (at - 1) * 70);
      });
    }
    el.dataset.v = str;
  }
  window.GospelFlip = { set: set };
})();
