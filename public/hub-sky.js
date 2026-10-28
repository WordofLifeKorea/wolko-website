/* 포탈 첫 화면 맨 위 "하늘" — 오늘 날씨(맑음 · 구름 · 안개 · 비 · 눈 · 천둥)에 맞춰 하늘색과 움직임이 바뀌고,
   비 · 눈은 캔버스로 내리면서 이름 인사 · 날짜 · 버튼 글자에 부딪혀 튀거나 쌓인다. 마우스를 움직이면 바람이 분다.
   움직임 줄이기 설정이면 움직이지 않고 정지한 하늘만 보인다.
   HubSky.setWeather({ kind, isDay }) — 종류와 낮/밤을 알려 주면 바뀐다. */
(function () {
  var sky = document.getElementById('hubSky'), cv = document.getElementById('hubSkyCanvas');
  if (!sky || !cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, kind = '', isDay = true;
  var drops = [], flakes = [], splashes = [], landed = [], stars = [], motes = [];
  var pointer = { x: null, y: null }, wind = 0, running = false, inView = true, lastT = 0, flashAt = 0, bolt = null, obstacles = [], obsAt = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }
  function resize() {
    var r = sky.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    build();
  }

  /* 글자에 부딪히는 면 — 이름 인사 · 날짜 · 오늘 칩 · 검색창 · 날씨 카드의 위쪽 가장자리 */
  function textRect(el) {
    var rg = document.createRange(); rg.selectNodeContents(el); var r = rg.getBoundingClientRect();
    return r.width ? r : el.getBoundingClientRect();
  }
  function measure(now) {
    if (now - obsAt < 400) return; obsAt = now;
    var base = sky.getBoundingClientRect(); obstacles = [];
    sky.querySelectorAll('#hubKicker, .hub-dash-date b, .hub-today-chip, .hub-wx-card').forEach(function (el) {
      var r = el.id === 'hubKicker' || el.tagName === 'B' ? textRect(el) : el.getBoundingClientRect();
      if (r.width > 24 && r.height > 12) obstacles.push({ l: r.left - base.left, r: r.right - base.left, t: r.top - base.top, b: r.bottom - base.top });
    });
  }

  function build() {
    drops = []; flakes = []; splashes = []; landed = []; stars = []; motes = [];
    var area = W * H, small = W < 600;
    if (kind === 'rain' || kind === 'storm') {
      var n = Math.max(36, Math.min(kind === 'storm' ? 190 : 140, Math.round(area / (kind === 'storm' ? 4200 : 6200))));
      for (var i = 0; i < n; i++) drops.push(newDrop(true));
    }
    if (kind === 'snow') {
      var m = Math.max(34, Math.min(120, Math.round(area / 7000)));
      for (var j = 0; j < m; j++) flakes.push(newFlake(true));
    }
    if (!isDay && (kind === 'clear' || kind === 'partly')) {
      var s = small ? 30 : 60;
      for (var k = 0; k < s; k++) stars.push({ x: Math.random() * W, y: Math.random() * H * 0.8, r: rand(0.5, 1.5), p: Math.random() * 6.28, sp: rand(0.8, 2.2) });
    }
    if (isDay && kind === 'clear') {
      for (var q = 0; q < (small ? 10 : 22); q++) motes.push({ x: Math.random() * W, y: Math.random() * H, r: rand(1, 2.6), vy: -rand(4, 12), p: Math.random() * 6.28 });
    }
  }
  function newDrop(anyY) { return { x: rand(-40, W + 40), y: anyY ? rand(-H, H) : rand(-80, -10), py: 0, vy: rand(250, 390) * (kind === 'storm' ? 1.25 : 1), len: rand(8, 14), a: rand(0.35, 0.7) }; }
  function newFlake(anyY) { return { x: rand(0, W), y: anyY ? rand(-H, H) : rand(-30, -4), r: rand(1.3, 3.6), vy: rand(13, 34), ph: Math.random() * 6.28, sw: rand(8, 22) }; }

  function step(dt, now) {
    measure(now);
    var windTarget = pointer.x == null ? 0 : Math.max(-1, Math.min(1, (pointer.x - W / 2) / (W / 2))) * 0.9;
    wind += (windTarget - wind) * Math.min(1, dt * 2.5);
    var i, p, o, j;
    for (i = 0; i < drops.length; i++) {
      p = drops[i]; p.py = p.y; p.y += p.vy * dt; p.x += (wind * 60 + 28 * (kind === 'storm' ? 1 : 0.35)) * dt;
      var hit = false;
      for (j = 0; j < obstacles.length; j++) {
        o = obstacles[j];
        if (p.py < o.t && p.y >= o.t && p.x > o.l && p.x < o.r) { splashes.push({ x: p.x, y: o.t, age: 0, v: [rand(-60, -20), rand(20, 60), rand(-30, 30)] }); hit = true; break; }
      }
      if (hit || p.y > H + 20 || p.x > W + 60) drops[i] = newDrop(false);
    }
    for (i = 0; i < flakes.length; i++) {
      p = flakes[i]; p.ph += dt * 1.0; p.y += p.vy * dt; p.x += (Math.sin(p.ph) * p.sw * dt) + wind * 24 * dt;
      if (pointer.x != null) { var dx = p.x - pointer.x, dy = p.y - pointer.y, d2 = dx * dx + dy * dy; if (d2 < 4900) { var d = Math.sqrt(d2) || 1; p.x += dx / d * 70 * dt; p.y += dy / d * 40 * dt; } }
      var stuck = false;
      for (j = 0; j < obstacles.length; j++) {
        o = obstacles[j];
        if (p.y - p.vy * dt < o.t && p.y >= o.t && p.x > o.l && p.x < o.r && Math.random() < 0.5) { landed.push({ x: p.x, y: o.t - p.r * 0.5, r: p.r, ttl: rand(1.6, 3.6), age: 0 }); stuck = true; break; }
      }
      if (stuck || p.y > H + 10) flakes[i] = newFlake(false);
      else if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
    }
    for (i = splashes.length - 1; i >= 0; i--) { splashes[i].age += dt * 0.75; if (splashes[i].age > 0.35) splashes.splice(i, 1); }
    for (i = landed.length - 1; i >= 0; i--) { landed[i].age += dt; if (landed[i].age > landed[i].ttl) landed.splice(i, 1); }
    for (i = 0; i < motes.length; i++) { p = motes[i]; p.p += dt; p.y += p.vy * dt; p.x += Math.sin(p.p) * 6 * dt; if (p.y < -6) { p.y = H + 6; p.x = Math.random() * W; } }
    if (kind === 'storm') {
      if (!flashAt) flashAt = now + rand(2500, 6500);
      if (now >= flashAt) { flashAt = now + rand(4500, 9000); sky.classList.add('is-flash'); bolt = { t: now, x: rand(W * 0.55, W * 0.9), segs: [] }; var bx = bolt.x, by = 0; while (by < H * 0.7) { bolt.segs.push([bx, by]); bx += rand(-18, 18); by += rand(14, 26); } setTimeout(function () { sky.classList.remove('is-flash'); }, 170); }
      if (bolt && now - bolt.t > 220) bolt = null;
    }
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var i, p, rainA = kind === 'storm' ? 0.78 : 1;
    if (drops.length) {
      ctx.lineCap = 'round'; ctx.lineWidth = 1.3;
      for (i = 0; i < drops.length; i++) { p = drops[i]; ctx.strokeStyle = 'rgba(225,240,255,' + (p.a * rainA).toFixed(2) + ')'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - (wind * 60 + 20) / p.vy * p.len, p.y - p.len); ctx.stroke(); }
    }
    for (i = 0; i < splashes.length; i++) {
      var s = splashes[i], t = s.age / 0.35; ctx.fillStyle = 'rgba(235,246,255,' + (0.8 * (1 - t)).toFixed(2) + ')';
      for (var j = 0; j < s.v.length; j++) { var dx = s.v[j] * s.age * 1.2, dy = -(Math.abs(s.v[(j + 1) % 3]) * s.age) + 160 * s.age * s.age; ctx.beginPath(); ctx.arc(s.x + dx, s.y + dy, 1.4 * (1 - t) + 0.4, 0, 6.283); ctx.fill(); }
    }
    ctx.fillStyle = '#fff';
    for (i = 0; i < flakes.length; i++) { p = flakes[i]; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
    for (i = 0; i < landed.length; i++) { p = landed[i]; ctx.globalAlpha = Math.max(0, 1 - Math.max(0, p.age - p.ttl * 0.7) / (p.ttl * 0.3)); ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 1.25, p.r * 0.8, 0, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
    for (i = 0; i < stars.length; i++) { p = stars[i]; ctx.globalAlpha = 0.35 + 0.65 * Math.abs(Math.sin(now / 1000 * p.sp + p.p)); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,236,160,.75)';
    for (i = 0; i < motes.length; i++) { p = motes[i]; ctx.globalAlpha = 0.25 + 0.4 * Math.abs(Math.sin(p.p * 1.3)); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = 1;
    if (bolt) { ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 2.2; ctx.shadowColor = '#cfe6ff'; ctx.shadowBlur = 14; ctx.beginPath(); bolt.segs.forEach(function (sg, k) { if (k) ctx.lineTo(sg[0], sg[1]); else ctx.moveTo(sg[0], sg[1]); }); ctx.stroke(); ctx.shadowBlur = 0; }
  }

  function frame(t) {
    if (!running) return;
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016); lastT = t;
    step(dt, t); draw(t);
    requestAnimationFrame(frame);
  }
  function wantRun() { return !reduce && inView && !document.hidden && (drops.length || flakes.length || stars.length || motes.length || kind === 'storm'); }
  function sync() {
    var should = !!wantRun();
    if (should && !running) { running = true; lastT = performance.now(); requestAnimationFrame(frame); }
    else if (!should && running) { running = false; ctx.clearRect(0, 0, W, H); }
  }

  sky.addEventListener('pointermove', function (e) { var r = sky.getBoundingClientRect(); pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; sky.style.setProperty('--px', ((pointer.x / r.width) - 0.5).toFixed(3)); });
  sky.addEventListener('pointerleave', function () { pointer.x = pointer.y = null; sky.style.setProperty('--px', '0'); });
  window.addEventListener('resize', function () { resize(); sync(); });
  document.addEventListener('visibilitychange', sync);
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; sync(); }).observe(sky);
  if (window.ResizeObserver) new ResizeObserver(function () { var r = sky.getBoundingClientRect(); if (Math.abs(r.width - W) > 2 || Math.abs(r.height - H) > 2) { resize(); sync(); } }).observe(sky);

  window.HubSky = {
    setWeather: function (w) {
      kind = w && w.kind ? w.kind : ''; isDay = !w || w.isDay !== false;
      sky.dataset.kind = kind || 'none'; sky.dataset.day = isDay ? '1' : '0';
      flashAt = 0; bolt = null; resize(); sync();
    },
  };
  resize();
})();
