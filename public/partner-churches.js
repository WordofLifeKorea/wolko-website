/* 홈페이지 "월코와 함께 협력하는 교회" — /api/partner-churches 에서 교회 이름만 받아 카드 없이 이름 목록으로 보여 주고, 히어로 아래의 한 줄 띠(#pcStrip)에 개수를 알린다(화면에 보이면 숫자가 올라간다).
   이름만 깔끔하게 늘어놓는다(색 점·움직임 없음). 목록이 없으면 구역 전체를 숨긴 채 둔다. */
(function () {
  var band = document.getElementById('partnerChurches'), list = document.getElementById('pcNames'), strip = document.getElementById('pcStrip');
  if (!band || !list) return;
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);


  /** 띠의 숫자를 0 에서 올라가게 — 띠가 화면에 보일 때 한 번만. 모션 줄이기·IntersectionObserver 가 없으면 바로 최종 숫자 */
  function countUp(root, to) {
    var els = root.querySelectorAll('.pc-count'), done = false;
    var still = reduce || !('IntersectionObserver' in window);
    Array.prototype.forEach.call(els, function (e) { e.style.minWidth = String(to).length + 'ch'; e.textContent = still ? to : 0; });   // 자릿수만큼 폭을 먼저 잡아 두어, 숫자가 올라가도 줄이 밀리지 않는다
    if (still) { if (!reduce) root.classList.add('is-counted'); return; }   // 숫자가 다 올라간 뒤에만 숫자를 가끔 튀게 한다(숫자가 바뀌는 중에는 튀지 않는다)
    function run() {
      if (done) return; done = true;
      var t0 = null, ms = 1300;
      (function step(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / ms), v = Math.round(to * (1 - Math.pow(1 - k, 3)));
        Array.prototype.forEach.call(els, function (e) { e.textContent = v; });
        if (k < 1) requestAnimationFrame(step); else root.classList.add('is-counted');
      })(performance.now());
    }
    var io = new IntersectionObserver(function (entries) { if (entries[0].isIntersecting) { io.disconnect(); setTimeout(run, 350); } }, { threshold: 0.6 });
    io.observe(root);
  }

  /** 목록으로 내려가기 — 천천히 출발해 빨라졌다가 천천히 멈춘다(ease-in-out). 거리에 따라 0.9~1.6초. 모션 줄이기면 바로 이동 */
  function glideTo(target) {
    var margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    var start = window.pageYOffset, end = Math.max(0, start + target.getBoundingClientRect().top - margin), dist = end - start;
    if (reduce || Math.abs(dist) < 2) { target.scrollIntoView({ behavior: 'auto', block: 'start' }); return; }
    var ms = Math.min(1600, Math.max(900, Math.abs(dist) * 0.9)), t0 = null;
    var ease = function (k) { return k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; };   // easeInOutCubic
    var root = document.documentElement, prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';   // 사이트 전체의 scroll-behavior: smooth 가 프레임마다 겹치지 않게 잠시 끈다
    var stop = false, done = function () { root.style.scrollBehavior = prevBehavior; }, cancel = function () { stop = true; done(); };
    window.addEventListener('wheel', cancel, { passive: true, once: true });          // 사용자가 직접 스크롤하면 멈춘다
    window.addEventListener('touchstart', cancel, { passive: true, once: true });
    (function frame(now) {
      if (stop) return;
      if (t0 === null) t0 = now;
      var k = Math.min(1, (now - t0) / ms);
      window.scrollTo(0, start + dist * ease(k));
      if (k < 1) requestAnimationFrame(frame); else done();
    })(performance.now());
  }

  function show(names) {
    Array.prototype.forEach.call(band.querySelectorAll('.pc-count'), function (c) { c.textContent = names.length; });
    names.forEach(function (name) {
      var li = document.createElement('li'), txt = document.createElement('span'), nm = document.createElement('span');
      // "교회 이름 (English name)" 처럼 괄호로 영문이 붙어 있으면 한글은 크게, 영문은 아래에 작게
      var m = /^(.*?)\s*[(（]\s*(.+?)\s*[)）]?\s*$/.exec(name), main = m && m[1] ? m[1] : name, en = m && m[1] ? m[2] : '';
      li.className = 'pc-item';
      txt.className = 'pc-text'; nm.className = 'pc-name'; nm.textContent = main; txt.appendChild(nm);
      if (en) { var sub = document.createElement('small'); sub.className = 'pc-en'; sub.textContent = en; txt.appendChild(sub); }
      li.appendChild(txt);
      list.appendChild(li);
    });
    band.hidden = false;
    if (strip) {
      strip.hidden = false;
      countUp(strip, names.length);
      var link = strip.querySelector('a');
      if (link) link.addEventListener('click', function (e) {
        e.preventDefault();
        glideTo(band);
        if (history.replaceState) history.replaceState(null, '', '#partnerChurches');
      });
    }
  }

  fetch('/api/partner-churches', { headers: { Accept: 'application/json' } })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { var names = d && Array.isArray(d.churches) ? d.churches.filter(function (n) { return typeof n === 'string' && n; }) : []; if (names.length) show(names); })
    .catch(function () { /* 읽지 못하면 이 구역은 그냥 숨어 있다 */ });
})();
