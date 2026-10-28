/* TV 하늘 배경 — 오늘 날씨(맑음·구름·비·눈…)와 낮/밤에 맞춰 화면 뒤 하늘색이 바뀌고, 비·눈·단풍잎(가을)·별이 움직인다.
   오래된 TV 브라우저를 위해 ES5 문법, 입자 수는 적게, 30프레임. 위젯은 반투명 판 위에 올라가서 글자가 그대로 읽힌다. */
(function (g) {
  var S = { cv: null, ctx: null, W: 0, H: 0, mode: 'none', parts: [], last: 0, timer: 0 };
  var LEAF = ['#c0392b', '#d9462f', '#e8742a', '#f0a030', '#a82a1e'];
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  function season() { var m = Number(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul', month: 'numeric' })) || 1; return m >= 9 && m <= 11 ? 'autumn' : (m === 12 || m <= 2) ? 'winter' : ''; }
  function modeOf(info) {
    var k = info.kind || '';
    if (k === 'rain' || k === 'storm') return 'rain';
    if (k === 'snow') return 'snow';
    if (info.season === 'autumn') return 'leaves';
    if (info.season === 'winter') return 'snow';
    if (!info.isDay && (k === 'clear' || k === 'partly' || !k)) return 'stars';
    return 'none';
  }
  function build() {
    var n, i, W = S.W, H = S.H; S.parts = [];
    if (S.mode === 'rain') { n = Math.max(60, Math.min(130, Math.round(W * H / 9000))); for (i = 0; i < n; i++) S.parts.push({ x: rnd(-40, W + 40), y: rnd(-H, H), vy: rnd(420, 620), l: rnd(10, 18), a: rnd(.3, .65) }); }
    else if (S.mode === 'snow') { n = Math.max(30, Math.min(90, Math.round(W * H / 14000))); for (i = 0; i < n; i++) S.parts.push({ x: rnd(0, W), y: rnd(-H, H), r: rnd(1.5, 4), vy: rnd(18, 44), ph: rnd(0, 6.28), sw: rnd(8, 24) }); }
    else if (S.mode === 'leaves') { n = Math.max(14, Math.min(34, Math.round(W * H / 40000))); for (i = 0; i < n; i++) S.parts.push({ x: rnd(0, W), y: rnd(-H, H), r: rnd(7, 13), vy: rnd(26, 52), ph: rnd(0, 6.28), sp: rnd(-2.5, 2.5), a: rnd(0, 6.28), c: LEAF[i % LEAF.length], fl: rnd(0, 6.28) }); }
    else if (S.mode === 'stars') { n = Math.max(30, Math.min(80, Math.round(W * H / 22000))); for (i = 0; i < n; i++) S.parts.push({ x: rnd(0, W), y: rnd(0, H * .75), r: rnd(.7, 1.8), ph: rnd(0, 6.28), sp: rnd(.8, 2.2) }); }
  }
  function size() { if (!S.cv) return; var p = S.cv.parentNode; var W = Math.max(1, p.clientWidth), H = Math.max(1, p.clientHeight); if (W === S.W && H === S.H) return; S.W = W; S.H = H; S.cv.width = W; S.cv.height = H; build(); }
  function leaf(c, p) {   // 단풍잎 하나(5갈래 별 모양을 납작하게 돌려 가며 그린다)
    c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.scale(p.r, p.r * (.35 + .65 * Math.abs(Math.cos(p.fl)))); c.fillStyle = p.c; c.beginPath();
    var pts = [[0, -1], [.22, -.6], [.62, -.8], [.5, -.3], [1, -.22], [.66, .12], [.84, .5], [.32, .36], [.1, .72], [0, .92], [-.1, .72], [-.32, .36], [-.84, .5], [-.66, .12], [-1, -.22], [-.5, -.3], [-.62, -.8], [-.22, -.6]], i;
    for (i = 0; i < pts.length; i++) { if (i) c.lineTo(pts[i][0], pts[i][1]); else c.moveTo(pts[i][0], pts[i][1]); } c.closePath(); c.fill(); c.restore();
  }
  function frame() {
    S.timer = 0; if (!S.cv || !S.cv.parentNode || !document.body.contains(S.cv)) return;
    var now = Date.now(), dt = Math.min(.1, (now - S.last) / 1000 || .033); S.last = now; size();
    var c = S.ctx, W = S.W, H = S.H, i, p; c.clearRect(0, 0, W, H);
    if (S.mode === 'rain') { c.strokeStyle = 'rgba(225,240,255,.6)'; c.lineWidth = 1.3; for (i = 0; i < S.parts.length; i++) { p = S.parts[i]; p.y += p.vy * dt; p.x += 70 * dt; if (p.y > H + 20) { p.y = rnd(-80, -10); p.x = rnd(-40, W + 40); } c.globalAlpha = p.a; c.beginPath(); c.moveTo(p.x, p.y); c.lineTo(p.x - 7, p.y - p.l); c.stroke(); } c.globalAlpha = 1; }
    else if (S.mode === 'snow') { c.fillStyle = '#fff'; for (i = 0; i < S.parts.length; i++) { p = S.parts[i]; p.ph += dt; p.y += p.vy * dt; p.x += Math.sin(p.ph) * p.sw * dt; if (p.y > H + 8) { p.y = -8; p.x = rnd(0, W); } c.globalAlpha = .55 + p.r / 9; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill(); } c.globalAlpha = 1; }
    else if (S.mode === 'leaves') { var gust = 30 + 45 * (.5 + .5 * Math.sin(now / 2800)); for (i = 0; i < S.parts.length; i++) { p = S.parts[i]; p.ph += dt * 1.4; p.a += p.sp * dt; p.fl += dt * 2.2; p.x -= (gust + Math.sin(p.ph) * 16) * dt; p.y += (p.vy + Math.abs(Math.cos(p.ph)) * 10) * dt; if (p.y > H + 20 || p.x < -20) { p.y = rnd(-60, -10); p.x = rnd(W * .3, W + 40); } c.globalAlpha = .9; leaf(c, p); } c.globalAlpha = 1; }
    else if (S.mode === 'stars') { c.fillStyle = '#fff'; for (i = 0; i < S.parts.length; i++) { p = S.parts[i]; c.globalAlpha = .35 + .65 * Math.abs(Math.sin(now / 1000 * p.sp + p.ph)); c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill(); } c.globalAlpha = 1; }
    if (S.mode !== 'none') S.timer = setTimeout(frame, 33);
  }
  function layer(canvas, info) {
    var el = canvas.querySelector('.tv-sky'); if (!el) {
      el = document.createElement('div'); el.className = 'tv-sky';
      el.innerHTML = '<i class="sk-sun"></i><i class="sk-moon"></i><i class="sk-cloud c1"></i><i class="sk-cloud c2"></i><i class="sk-cloud c3"></i><canvas class="tv-sky-cv"></canvas>';
      canvas.insertBefore(el, canvas.firstChild);
    }
    el.setAttribute('data-kind', info.kind || 'none'); el.setAttribute('data-day', info.isDay ? '1' : '0'); return el;
  }
  /** 하늘 층을 만들거나(없으면) 날씨에 맞게 바꾼다. info = { on, kind, isDay } */
  function mount(canvas, info) {
    var old = canvas.querySelector('.tv-sky');
    if (!info || !info.on) { if (old) old.parentNode.removeChild(old); canvas.className = canvas.className.replace(/\s*has-sky/g, ''); S.mode = 'none'; return; }
    if (canvas.className.indexOf('has-sky') < 0) canvas.className += ' has-sky';
    info.season = info.season == null ? season() : info.season;
    var el = layer(canvas, info), cv = el.querySelector('canvas'), mode = modeOf(info);
    if (S.cv !== cv) { S.cv = cv; S.ctx = cv.getContext ? cv.getContext('2d') : null; S.W = 0; S.H = 0; }
    if (!S.ctx) return;
    S.mode = mode; S.W = 0; size(); build(); S.last = Date.now(); if (S.timer) { clearTimeout(S.timer); S.timer = 0; } if (mode !== 'none') frame(); else S.ctx.clearRect(0, 0, S.W, S.H);
  }
  g.TVSky = { mount: mount, season: season };
})(window);
