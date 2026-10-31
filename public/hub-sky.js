/* 포탈 첫 화면 맨 위 "하늘" — 오늘 날씨(맑음 · 구름 · 안개 · 비 · 눈 · 천둥)에 맞춰 하늘색과 움직임이 바뀌고,
   비 · 눈은 캔버스로 내리면서 이름 인사 · 날짜 · 버튼 글자에 부딪혀 튀거나 쌓인다.
   움직임 줄이기 설정이면 움직이지 않고 정지한 하늘만 보인다.
   HubSky.setWeather({ kind, isDay }) — 종류와 낮/밤을 알려 주면 바뀐다. */
/* 시간대 하늘(계산만) — 평택의 해 뜨고 지는 시각을 따라 하늘색 · 해 높이 · 노을 · 별빛을 정한다(갤럭시 날씨처럼).
   ?sky=17:30 을 붙이면 그 시각 하늘을, ?sky=demo 면 새벽 4시 반부터 하루를 1분에 돌려 볼 수 있다(미리보기용). */
(function () {
  var NIGHT = [[14, 28, 62], [42, 63, 120]];
  function sunTimes(ms) { // 한국 시간 0시부터 몇 분째 (wolko-rail.js와 같은 계산)
    var lat = 36.99, lon = 127.09, rad = Math.PI / 180, d = new Date(ms + 9 * 3600000);
    var n = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
    var g = 2 * Math.PI / 365 * (n - 1);
    var eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)) / rad;
    return { rise: 720 - 4 * (lon + ha) - eqt + 540, set: 720 - 4 * (lon - ha) - eqt + 540 };
  }
  // 맑은 하늘의 [위쪽 색, 아래쪽(지평선) 색] — 그 사이 시각은 섞는다
  function stops(r, s) {
    return [[0, NIGHT], [r - 60, NIGHT],
      [r - 20, [[43, 58, 120], [201, 131, 154]]],      // 새벽: 남보라 위로 장밋빛
      [r + 15, [[63, 115, 196], [246, 180, 138]]],     // 해돋이: 복숭아빛
      [r + 70, [[42, 134, 224], [143, 208, 245]]],     // 아침
      [(r + s) / 2, [[31, 127, 226], [116, 198, 248]]], // 한낮
      [s - 90, [[42, 127, 214], [134, 200, 238]]],
      [s - 40, [[58, 111, 192], [243, 194, 122]]],     // 금빛
      [s - 5, [[61, 74, 146], [255, 142, 90]]],        // 해넘이: 주황
      [s + 20, [[44, 47, 110], [192, 96, 122]]],       // 노을: 자홍
      [s + 55, [[24, 36, 79], [74, 63, 128]]],         // 땅거미: 보라
      [s + 90, NIGHT], [1440, NIGHT]];
  }
  function mix(a, b, t) { return a.map(function (v, k) { return Math.round(v + (b[k] - v) * t); }); }
  function bump(x, c, w) { return Math.max(0, 1 - Math.abs(x - c) / w); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  function skyAt(ms) {
    var sun = sunTimes(ms), r = sun.rise, s = sun.set, now = ((ms / 60000) + 540) % 1440;
    var st = stops(r, s), col = NIGHT;
    for (var i = 1; i < st.length; i++) {
      if (now > st[i][0]) continue;
      var t0 = st[i][0] === st[i - 1][0] ? 1 : (now - st[i - 1][0]) / (st[i][0] - st[i - 1][0]);
      col = [mix(st[i - 1][1][0], st[i][1][0], t0), mix(st[i - 1][1][1], st[i][1][1], t0)]; break;
    }
    var t = (now - r) / (s - r), lift = Math.sin(Math.PI * clamp(t, -0.08, 1.08)); // 1 = 한낮 가장 높이, 0 = 지평선, 음수 = 지평선 아래
    var dawn = bump(now, r + 5, 55), dusk = bump(now, s, 60);
    return {
      a: col[0], b: col[1],
      sunUp: t > -0.035 && t < 1.035,      // 해 뜨기 직전부터 해가 다 잠길 때까지 해를 그린다
      sx: clamp(t, -0.06, 1.06), lift: lift, warm: clamp(1 - lift * 2.4, 0, 1),
      glow: Math.max(dawn, dusk), glowRgb: dusk >= dawn ? '255, 140, 70' : '255, 172, 140',
      night: now < r ? clamp((r - 15 - now) / 45, 0, 1) : now > s ? clamp((now - s - 15) / 50, 0, 1) : 0, // 별이 나오는 정도
    };
  }
  var param = decodeURIComponent((location.search.match(/[?&]sky=([^&]+)/) || [])[1] || '');
  var started = Date.now();
  function kstMidnight(ms) { return Math.floor((ms + 9 * 3600000) / 86400000) * 86400000 - 9 * 3600000; }
  function nowMs() {
    var m = /^(\d{1,2}):(\d{2})$/.exec(param);
    if (m) return kstMidnight(Date.now()) + (+m[1] * 60 + +m[2]) * 60000;
    if (param === 'demo') return kstMidnight(started) + 270 * 60000 + (Date.now() - started) * 1440; // 1초 = 24분
    return Date.now();
  }
  window.WolkoSkyTime = { sunTimes: sunTimes, skyAt: skyAt, nowMs: nowMs, demo: param === 'demo' };
})();

(function () {
  var sky = document.getElementById('hubSky'), cv = document.getElementById('hubSkyCanvas');
  if (!sky || !cv || !cv.getContext) return;
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var W = 0, H = 0, kind = '', isDay = true;
  var drops = [], flakes = [], splashes = [], landed = [], stars = [], motes = [];
  var wind = 0, running = false, inView = true, lastT = 0, flashAt = 0, bolt = null, obstacles = [], obsAt = 0;
  var nightK = 1, timed = false;

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
    for (i = 0; i < stars.length; i++) { p = stars[i]; ctx.globalAlpha = nightK * (0.35 + 0.65 * Math.abs(Math.sin(now / 1000 * p.sp + p.p))); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill(); }
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

  window.addEventListener('resize', function () { resize(); sync(); });
  document.addEventListener('visibilitychange', sync);
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { inView = es[0].isIntersecting; sync(); }).observe(sky);
  if (window.ResizeObserver) new ResizeObserver(function () { var r = sky.getBoundingClientRect(); if (Math.abs(r.width - W) > 2 || Math.abs(r.height - H) > 2) { resize(); sync(); } }).observe(sky);

  /* 시간대 하늘 그리기 — 30초마다 다시 계산하고, 색과 해의 움직임은 CSS가 천천히 이어 준다.
     맑음·구름 조금은 하늘색까지 시간대를 따르고, 흐림·비·눈·안개는 원래 하늘색에 노을빛만 옅게 얹는다. */
  var art = sky.querySelector('.hub-sky-art'), glowEl = document.createElement('i');
  glowEl.className = 'sk-glow';
  if (art) art.insertBefore(glowEl, art.firstChild);
  function rgb(c) { return 'rgb(' + c.join(', ') + ')'; }
  function applyTime(intro) {
    var T = window.WolkoSkyTime; if (!T) return;
    var ms = T.nowMs(), v = T.skyAt(ms), st = sky.style, timeSky = !kind || kind === 'clear' || kind === 'partly';
    if (timeSky) { st.setProperty('--sky-a', rgb(v.a)); st.setProperty('--sky-b', rgb(v.b)); }
    else { st.removeProperty('--sky-a'); st.removeProperty('--sky-b'); }
    st.setProperty('--glow', (v.glow * (timeSky ? 1 : 0.45)).toFixed(3));
    st.setProperty('--glow-rgb', v.glowRgb);
    st.setProperty('--sx', v.sx.toFixed(4));
    st.setProperty('--lift', (intro ? v.lift - 0.35 : v.lift).toFixed(4)); // 처음 열 때는 조금 아래에서 제자리로 떠오른다
    st.setProperty('--warm', v.warm.toFixed(3));
    nightK = v.night;
    sky.classList.add('has-time');
    if (v.sunUp !== isDay || !timed) { isDay = v.sunUp; sky.dataset.day = isDay ? '1' : '0'; timed = true; build(); sync(); }
    if (window.WolkoRailSky && window.WolkoRailSky.paintAt) window.WolkoRailSky.paintAt(ms);
  }
  function startTime() {
    if (!window.WolkoSkyTime) return;
    if (window.WolkoSkyTime.demo) sky.classList.add('is-demo');
    var intro = !reduce && !window.WolkoSkyTime.demo;
    applyTime(intro);
    if (intro) setTimeout(function () { applyTime(false); }, 80);
    setInterval(function () { if (!document.hidden) applyTime(false); }, window.WolkoSkyTime.demo ? 120 : 30000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) applyTime(false); });
  }

  window.HubSky = {
    setWeather: function (w) {
      kind = w && w.kind ? w.kind : '';
      // 낮/밤은 날씨 응답보다 해 뜨고 지는 시각 계산을 따른다(메뉴 색 · 하늘색과 맞추려고). 계산이 없으면 날씨 응답대로.
      isDay = timed ? isDay : (!w || w.isDay !== false);
      sky.dataset.kind = kind || 'none'; sky.dataset.day = isDay ? '1' : '0';
      flashAt = 0; bolt = null; resize(); applyTime(false); sync();
    },
  };
  resize();
  startTime();
})();
