/* 모달 · 팝업 · 시트가 열려 있을 때 뒤로가기(폰의 뒤로 버튼 포함)를 누르면 페이지를 떠나지 않고 그 창만 닫는다 (모든 페이지 공용).
   - 열려 있는 창은 wolko-scroll-lock.js 와 같은 방식으로 찾는다: 화면 전체를 덮는 fixed 요소(modal / overlay / backdrop / dialog / popup / sheet 이름) · 열린 <dialog> · data-wl-modal 이 붙은 요소.
   - 창이 열리면 같은 주소로 기록 한 칸(pushState)을 얹어 두고, 뒤로가기는 그 한 칸으로 받는다.
     창이 안에서 먼저 되돌릴 단계가 있으면(WolkoBack.step) 그것부터 되돌리고, 더 되돌릴 것이 없을 때 창을 닫는다.
   - 창을 닫는 방법은 페이지마다 달라서, 사용자가 누르는 것과 똑같이 한다: <dialog> 는 Esc(cancel) 와 같게, 그 밖에는 창 안의 닫기(✕ · 닫기 · 취소) 단추를 누르고,
     없으면 배경을 누른다. 입력하던 내용이 있어 '닫을까요?'를 묻는 창은 묻는 창이 뜬 채로 남고, 다음 뒤로가기는 다시 그 창에서 받는다.
   - 창이 단추 · 배경 · Esc 로 닫히면 얹어 둔 기록 한 칸도 같이 치워서 뒤로가기가 한 번 헛돌지 않게 한다.
   - 페이지가 스스로 기록을 다루는 창(data-wl-back="own") · 강제 비밀번호 변경 · 접근 거부 화면은 건드리지 않는다. */
(function () {
  if (window.__wolkoBackClose) return;
  window.__wolkoBackClose = true;
  if (!window.history || !history.pushState || !window.MutationObserver) return;

  var CANDIDATES = '[role="dialog"],[aria-modal="true"],[class*="modal"],[class*="overlay"],[class*="backdrop"],[class*="dialog"],[class*="popup"],[class*="sheet"],[id*="odal"],[id*="verlay"],[id*="ackdrop"],[id*="ialog"],[id*="opup"],[id*="heet"],[data-wl-modal],dialog';
  var NAME = /modal|overlay|backdrop|dialog|popup|sheet/i;
  // 창이 아니라 장식 · 화면 일부 · 잠깐 뜨는 알림 · 닫으면 안 되는 화면
  var IGNORE = /hero|photo-overlay|toast|tooltip|cookie|force-pw|wolkoDenied|save-alert|gs-busy|login-screen|spinner|busy/i;

  var tracked = [];      // 지금 열려 있는 창(연 순서)
  var depth = 0;         // 우리가 얹어 둔 기록 칸 수
  var ignore = 0;        // 우리가 기록을 되돌려서 생기는 popstate 를 건너뛸 횟수
  var busy = false, busyTimer = null;
  var curState = history.state;   // 지금 기록 칸의 상태(우리 칸인지 알아보려고 기억한다)
  var stepFns = new WeakMap();    // 창 → 안에서 먼저 되돌릴 단계가 있으면 true 를 돌려주는 함수
  var tries = new WeakMap();      // 창 → 뒤로가기로 닫아 보려 한 횟수

  // pushState / replaceState 를 지나가는 것을 보고 '지금 칸의 상태'를 늘 알아 둔다
  ['pushState', 'replaceState'].forEach(function (k) {
    var orig = history[k];
    history[k] = function (state) { curState = state; return orig.apply(history, arguments); };
  });

  function nameOf(el) { var c = el.className; return (c && c.baseVal !== undefined ? c.baseVal : c || '') + ' ' + (el.id || ''); }
  function owned(el) { return !!(el.closest && el.closest('[data-wl-back="own"],[data-wl-back="off"]')) || !!el._ctOk; }   // _ctOk: 캠프팀 포탈의 팝업은 campteam.js 가 직접 다룬다
  function covers(el) {
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0 || cs.pointerEvents === 'none') return false;
    if (el.hasAttribute('data-wl-modal')) { var r0 = el.getBoundingClientRect(); return r0.width > 0 && r0.height > 0; }   // 이름이 다른 창은 표시를 달아 알린다
    if (cs.position !== 'fixed') return false;
    var r = el.getBoundingClientRect();
    return r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.9 && r.right > 0 && r.bottom > 0;
  }
  function isOpen(el) {
    if (!el || !el.isConnected) return false;
    if (el.tagName === 'DIALOG') return el.open;
    return !el.hidden && covers(el);
  }
  function detect() {
    var list = document.querySelectorAll(CANDIDATES), found = [];
    for (var i = 0; i < list.length; i++) {
      var el = list[i], tag = nameOf(el);
      var isDlg = el.tagName === 'DIALOG', marked = el.hasAttribute('data-wl-modal');
      if (!isDlg && !marked && !NAME.test(tag) && el.getAttribute('role') !== 'dialog' && el.getAttribute('aria-modal') !== 'true') continue;
      if (el.getAttribute('role') === 'alertdialog' || (el.closest && el.closest('[role="alertdialog"]'))) continue;
      if (IGNORE.test(tag) || owned(el)) continue;
      if (isOpen(el)) found.push(el);
    }
    // 창 안의 창 모양(배경 · 카드)은 바깥 것 하나만 센다
    return found.filter(function (el) { return !found.some(function (o) { return o !== el && o.contains(el); }); });
  }

  function setBusy() { busy = true; clearTimeout(busyTimer); busyTimer = setTimeout(function () { busy = false; ignore = 0; sync(); }, 500); }
  function clearBusy() { busy = false; clearTimeout(busyTimer); }

  // 열린 창 수와 얹어 둔 기록 칸 수를 맞춘다
  function reconcile() {
    if (busy) return;
    if (depth < tracked.length) {
      while (depth < tracked.length) { try { history.pushState({ wlm: depth + 1 }, ''); depth++; } catch (e) { depth = tracked.length; } }
    } else if (depth > tracked.length) {
      var n = depth - tracked.length;
      depth = tracked.length;
      // 맨 위 칸이 우리 것일 때만 되돌린다(그 위에 페이지가 따로 얹은 칸이 있으면 건드리지 않는다)
      if (curState && curState.wlm) { ignore = 1; setBusy(); history.go(-n); }
    }
  }
  function sync() {
    var open = detect();
    tracked.forEach(function (el) { if (open.indexOf(el) < 0) tries.delete(el); });   // 닫힌 창은 '닫아 본 횟수'를 잊는다
    tracked = tracked.filter(function (el) { return open.indexOf(el) >= 0; });
    open.forEach(function (el) { if (tracked.indexOf(el) < 0) tracked.push(el); });
    reconcile();
  }

  function visibleBtn(b) { return !b.disabled && (b.offsetWidth || b.offsetHeight || b.getClientRects().length); }
  // 닫기 단추를 고르는 규칙. 엉뚱한 단추(마감 · 삭제 · 예약 취소 같은 동작)를 누르지 않도록 이름이 분명한 것만 쓴다
  var CLOSE_CLASS = /^(close|modal-close|dlg-x|btn-close|popup-close|dialog-close|sheet-close|overlay-close|x|x-btn|xbtn)$/i;
  var CLOSE_LABEL = /^(닫기|close|dismiss)(\s*\(.*\))?$/i;
  var CLOSE_TEXT = /^(×|✕|✖|✗|닫기|close)$/i;
  var CANCEL_TEXT = /^(취소|cancel)$/i;
  function rankClose(b) {
    if (b.hasAttribute('data-wl-close') || b.hasAttribute('data-close') || b.hasAttribute('data-dismiss') || b.hasAttribute('data-modal-close')) return 1;
    var al = (b.getAttribute('aria-label') || '').trim(), tl = (b.getAttribute('title') || '').trim();
    if (CLOSE_LABEL.test(al) || CLOSE_LABEL.test(tl)) return 2;
    var cl = b.classList || [];
    for (var i = 0; i < cl.length; i++) { if (CLOSE_CLASS.test(cl[i]) || /[-_]close$/i.test(cl[i])) return 3; }
    if (/(Close|CloseBtn|[-_]close|[-_]x|X)$/.test(b.id || '') && !/^(close|toggle)/i.test(b.id || '')) return 4;
    var t = (b.textContent || '').replace(/[\uFE0E\uFE0F]/g, '').replace(/\s+/g, ' ').trim();
    if (CLOSE_TEXT.test(t)) return 5;
    if (CANCEL_TEXT.test(t) && b.parentElement && b.parentElement.querySelectorAll('button,[role="button"]').length > 1) return 6;   // 저장 · 확인 단추 옆에 있는 '취소'
    return 0;
  }
  function findClose(el) {
    var list = el.querySelectorAll('button,[role="button"],[data-wl-close],[data-close],[data-dismiss],[data-modal-close],.close,.modal-close,.dlg-x,.btn-close'), best = null, bestRank = 99;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      if (b.closest('a[href]:not([href^="#"])') || !visibleBtn(b)) continue;
      var r = rankClose(b);
      if (r && r < bestRank) { best = b; bestRank = r; if (r === 1) break; }
    }
    return best;
  }
  function fire(el, type, Ctor, init) { try { el.dispatchEvent(new Ctor(type, init)); } catch (e) { /* 무시 */ } }
  function closeEl(el, attempt) {
    if (el.tagName === 'DIALOG') {
      // Esc 와 같게: cancel 을 먼저 알리고(저장하지 않은 내용을 묻는 창은 여기서 막는다), 막지 않았으면 닫는다
      var ev = new Event('cancel', { cancelable: true });
      el.dispatchEvent(ev);
      if (!ev.defaultPrevented && el.open) { try { el.close(); } catch (e) { /* 무시 */ } }
      return;
    }
    if (attempt === 0) {
      var btn = findClose(el);
      if (btn) { btn.click(); return; }
      // 닫기 단추가 없으면 배경을 누른다(mousedown / click 어느 쪽으로 닫는 창이든 되게 둘 다 보낸다)
      ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(function (t) { fire(el, t, t.indexOf('pointer') === 0 && window.PointerEvent ? PointerEvent : MouseEvent, { bubbles: true, cancelable: true, view: window }); });
      return;
    }
    // 두 번째부터는 Esc 를 보낸다
    ['keydown', 'keyup'].forEach(function (t) { fire(document, t, KeyboardEvent, { key: 'Escape', code: 'Escape', keyCode: 27, which: 27, bubbles: true, cancelable: true }); });
  }

  function closeTop() {
    var el = tracked[tracked.length - 1];
    if (!el) return;
    var step = stepFns.get(el);
    if (step) { var handled = false; try { handled = !!step(); } catch (e) { handled = false; } if (handled) { setTimeout(sync, 0); return; } }   // 안에서 먼저 한 단계 되돌렸다 → 창은 그대로, 기록 칸만 다시 얹는다
    var n = tries.get(el) || 0; tries.set(el, n + 1);
    closeEl(el, n);
    setTimeout(sync, 150);
    setTimeout(sync, 450);   // 닫히는 움직임이 끝난 뒤에도 한 번 더 맞춘다
  }

  window.addEventListener('popstate', function (e) {
    var wasOurs = !!(curState && curState.wlm);
    curState = e.state;
    if (ignore > 0) { ignore--; if (!ignore) clearBusy(); e.stopImmediatePropagation(); setTimeout(sync, 0); return; }
    if (wasOurs && depth > 0 && tracked.length) { depth--; e.stopImmediatePropagation(); closeTop(); return; }
    if (e.state && e.state.wlm) {   // 열린 창이 없는데 우리가 남긴 칸에 닿았다(앞으로가기 · 이미 닫힌 창의 칸) → 페이지가 모르게 한 칸 더 돌아간다
      e.stopImmediatePropagation(); ignore = 1; setBusy(); history.back();
    }
  }, true);

  var timer = null;
  function schedule() { if (timer) return; timer = setTimeout(function () { timer = null; sync(); }, 40); }
  function start() {
    new MutationObserver(schedule).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-hidden', 'data-wl-modal'] });
    window.addEventListener('resize', schedule);
    window.addEventListener('transitionend', schedule, true);
    window.addEventListener('animationend', schedule, true);
    setInterval(schedule, 2000);   // 알아채지 못한 변화가 있어도 몇 초 안에 맞춘다
    schedule();
  }
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);

  // 페이지가 쓸 수 있는 작은 도구
  window.WolkoBack = {
    // 창 안에 되돌릴 단계(편집 → 보기 · 2단계 → 1단계 등)가 있으면 그 되돌리기를 알려 둔다. 되돌렸으면 true, 더 되돌릴 게 없으면 false 를 돌려준다
    step: function (el, fn) { if (el && typeof fn === 'function') stepFns.set(el, fn); },
    // 지금 검사를 다시 한다
    refresh: schedule
  };
})();
