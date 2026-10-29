/* CRS 교회 상세 — 카드(블록)를 꾹 눌러 끌어서 위치를 바꾼다. 순서는 이 브라우저에 저장한다.
   마크업: 끌 수 있는 카드에 data-block="id" (+ data-title="끄는 동안 보일 이름"). 컨테이너 안에서 order 스타일로 순서를 정하므로
   화면 폭이 달라져도 같은 순서(2칸이면 왼쪽→오른쪽, 위→아래)로 놓인다. */
(function () {
  var KEY = 'wolko-crs-detail-order-v1';
  var DEFAULT = ['info', 'visits', 'steps', 'hq'];
  var HOLD_MS = 350, MOVE_CANCEL_PX = 8;
  var INTERACTIVE = 'button, a, input, select, textarea, label, .step-item, [contenteditable]';

  function load() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (Array.isArray(saved)) {
        var order = saved.filter(function (id, i) { return DEFAULT.indexOf(id) >= 0 && saved.indexOf(id) === i; });
        DEFAULT.forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
        return order;
      }
    } catch (e) { /* 저장값을 못 읽으면 기본 순서 */ }
    return DEFAULT.slice();
  }
  function save(order) {
    try {
      if (order.join() === DEFAULT.join()) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, JSON.stringify(order));
    } catch (e) { /* 저장이 막혀도 이번 화면에서는 바뀐다 */ }
  }
  function apply(container, order) {
    order.forEach(function (id, i) {
      var el = container.querySelector('[data-block="' + id + '"]');
      if (el) el.style.order = String(i + 1);
    });
  }
  function currentOrder(container) {
    return Array.prototype.slice.call(container.querySelectorAll('[data-block]'))
      .sort(function (a, b) { return Number(a.style.order || 0) - Number(b.style.order || 0); })
      .map(function (el) { return el.dataset.block; });
  }

  function init(container, opts) {
    opts = opts || {};
    apply(container, load());
    var reset = opts.resetButton;
    function syncReset() { if (reset) reset.hidden = load().join() === DEFAULT.join(); }
    syncReset();
    if (reset && !reset.__bound) {
      reset.__bound = true;
      reset.addEventListener('click', function () { save(DEFAULT.slice()); apply(container, DEFAULT); syncReset(); });
    }
    if (container.__blockDrag) return;          // 이벤트는 컨테이너에 한 번만 건다(상세를 다시 그려도 그대로)
    container.__blockDrag = true;

    var press = null, active = null;
    function cleanup() {
      if (press) clearTimeout(press.timer);
      if (active) {
        active.el.classList.remove('is-dragging');
        if (active.target) active.target.classList.remove('drop-target');
        if (active.chip) active.chip.remove();
      }
      document.body.classList.remove('crs-dragging');
      press = null; active = null;
    }
    function begin() {
      var el = press.el;
      active = { el: el, target: null, chip: document.createElement('div') };
      active.chip.className = 'crs-drag-chip';
      active.chip.textContent = el.dataset.title || '';
      active.chip.style.left = press.x + 'px'; active.chip.style.top = press.y + 'px';
      document.body.appendChild(active.chip);
      el.classList.add('is-dragging');
      document.body.classList.add('crs-dragging');
      try { window.getSelection().removeAllRanges(); } catch (e) { /* 선택 해제 실패는 무시 */ }
    }
    function hit(x, y) {
      var node = document.elementFromPoint(x, y);
      var block = node && node.closest ? node.closest('[data-block]') : null;
      return block && block !== active.el && container.contains(block) ? block : null;
    }

    container.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || active) return;
      var el = e.target.closest ? e.target.closest('[data-block]') : null;
      if (!el || !container.contains(el) || (e.target.closest && e.target.closest(INTERACTIVE))) return;
      cleanup();
      press = { el: el, x: e.clientX, y: e.clientY, timer: setTimeout(function () { if (press) begin(); }, HOLD_MS) };
    });
    window.addEventListener('pointermove', function (e) {
      if (press && !active) {
        if (Math.abs(e.clientX - press.x) > MOVE_CANCEL_PX || Math.abs(e.clientY - press.y) > MOVE_CANCEL_PX) { clearTimeout(press.timer); press = null; }
        return;
      }
      if (!active) return;
      active.chip.style.left = e.clientX + 'px'; active.chip.style.top = e.clientY + 'px';
      var target = hit(e.clientX, e.clientY);
      if (target !== active.target) {
        if (active.target) active.target.classList.remove('drop-target');
        if (target) target.classList.add('drop-target');
        active.target = target;
      }
    });
    window.addEventListener('pointerup', function (e) {
      if (active && active.target) {
        var order = currentOrder(container), from = order.indexOf(active.el.dataset.block), to = order.indexOf(active.target.dataset.block);
        if (from >= 0 && to >= 0 && from !== to) {
          order.splice(to, 0, order.splice(from, 1)[0]);
          apply(container, order); save(order); syncReset();
        }
      }
      cleanup();
    });
    window.addEventListener('pointercancel', cleanup);
    window.addEventListener('keydown', function (e) { if (e.key === 'Escape') cleanup(); });
    container.addEventListener('contextmenu', function (e) { if (press || active) e.preventDefault(); });
    // 터치: 끄는 동안에는 화면이 스크롤되지 않게 한다
    container.addEventListener('touchmove', function (e) { if (active) e.preventDefault(); }, { passive: false });
  }

  window.WolkoBlockDrag = { init: init, DEFAULT: DEFAULT, KEY: KEY, load: load };
})();
