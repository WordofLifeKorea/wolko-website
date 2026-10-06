/* 모달·팝업·시트가 화면을 덮고 있는 동안 뒤 페이지가 스크롤되지 않게 막는다 (모든 페이지 공용).
   각 페이지가 모달을 여는 방식(class, hidden, style, 새로 만들기)이 제각각이라, 열렸는지를 직접 보지 않고
   "화면 전체를 덮는 fixed 요소 중 모달 이름(modal/overlay/backdrop/dialog/popup/sheet)이 붙은 것이 보이는가"로 판단한다. */
(function () {
  if (window.__wolkoScrollLock) return;
  window.__wolkoScrollLock = true;

  var CANDIDATES = '[role="dialog"],[aria-modal="true"],[class*="modal"],[class*="overlay"],[class*="backdrop"],[class*="dialog"],[class*="popup"],[class*="sheet"],[id*="odal"],[id*="verlay"],[id*="ackdrop"],[id*="ialog"],[id*="opup"]';
  var NAME = /modal|overlay|backdrop|dialog|popup|sheet/i;
  // 모달이 아니라 장식·화면 일부인 것들 (히어로 위 그라데이션 등)
  var IGNORE = /hero|photo-overlay|toast|tooltip|cookie/i;
  var locked = false, scheduled = false;

  function covers(el) {
    var cs = getComputedStyle(el);
    if (cs.position !== 'fixed' || cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return false;
    if (cs.pointerEvents === 'none') return false;
    var r = el.getBoundingClientRect();
    return r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.9 && r.right > 0 && r.bottom > 0;
  }

  function anyOpen() {
    var list = document.querySelectorAll(CANDIDATES);
    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      var tag = (el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className) + ' ' + el.id;
      if (!NAME.test(tag) && el.getAttribute('role') !== 'dialog' && el.getAttribute('aria-modal') !== 'true') continue;
      if (IGNORE.test(tag)) continue;
      if (el.hidden) continue;
      if (covers(el)) return true;
    }
    return false;
  }

  function apply() {
    scheduled = false;
    var open = anyOpen();
    if (open === locked) return;
    locked = open;
    var de = document.documentElement, b = document.body;
    if (!b) return;
    if (open) {
      de.classList.add('wl-scroll-locked'); b.classList.add('wl-scroll-locked');
    } else {
      de.classList.remove('wl-scroll-locked'); b.classList.remove('wl-scroll-locked');
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(apply, 30);
  }

  var css = document.createElement('style');
  css.textContent = 'html.wl-scroll-locked,body.wl-scroll-locked{overflow:hidden !important;overscroll-behavior:none}';
  document.head.appendChild(css);

  function start() {
    new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-hidden'] });
    window.addEventListener('resize', schedule);
    window.addEventListener('transitionend', schedule, true);
    schedule();
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
})();
