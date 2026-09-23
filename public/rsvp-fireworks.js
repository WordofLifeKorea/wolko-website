(() => {
  const canvas = document.getElementById('invFireworks');
  if (!canvas) return;
  const context = canvas.getContext('2d');
  if (!context) return;

  const cover = canvas.parentElement;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const palettes = [
    ['#fff1c0', '#ffca70', '#e99554'],
    ['#ffe0b6', '#ffad79', '#df7356'],
    ['#fff0df', '#f6c2a5', '#e5a1a0'],
    ['#fff5dc', '#e5c988', '#b9d7d3'],
    ['#fff8e8', '#f4d993', '#d2a7db'],
  ];
  const rockets = [];
  const sparks = [];
  const flashes = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let lastTime = 0;
  let nextLaunch = 0;
  let inView = false;

  const random = (min, max) => min + Math.random() * (max - min);

  function resize() {
    const bounds = cover.getBoundingClientRect();
    width = bounds.width;
    height = bounds.height;
    const scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
  }

  function launch() {
    if (rockets.length >= 2 || sparks.length > 190 || width < 1) return;
    const duration = random(0.7, 1);
    const x = random(width * 0.18, width * 0.82);
    const y = height + 8;
    const targetX = Math.max(width * 0.12, Math.min(width * 0.88, x + random(-55, 55)));
    const targetY = random(height * 0.24, height * 0.4);
    rockets.push({
      x, y, px: x, py: y, vx: (targetX - x) / duration,
      vy: (targetY - y - 55 * duration * duration) / duration,
      age: 0, duration, color: palettes[Math.floor(Math.random() * palettes.length)],
    });
  }

  function burst(rocket) {
    flashes.push({ x: rocket.x, y: rocket.y, age: 0 });
    const shapes = ['peony', 'ring', 'palm', 'willow'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const count = shape === 'palm' ? 44 : Math.round(random(58, 76));
    const rotation = random(0, Math.PI * 2);
    for (let i = 0; i < count; i++) {
      const angle = shape === 'palm'
        ? -Math.PI + i * Math.PI / count + random(-0.14, 0.14)
        : rotation + i * Math.PI * 2 / count + random(-0.2, 0.2);
      const speed = shape === 'ring' ? random(132, 162)
        : shape === 'willow' ? random(65, 118)
          : shape === 'palm' ? random(100, 185) : random(80, 180);
      sparks.push({
        x: rocket.x, y: rocket.y, vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed, age: 0,
        life: shape === 'willow' ? random(2.2, 2.9) : random(1.6, 2.4),
        gravity: shape === 'willow' || shape === 'palm' ? 108 : 74,
        size: random(1.3, 2.5), color: rocket.color[i % rocket.color.length],
        trail: [], flicker: random(0, Math.PI * 2), crackle: i % (shape === 'ring' ? 5 : 7) === 0,
      });
    }
    if (shape === 'peony' || shape === 'ring') {
      for (let i = 0; i < 20; i++) {
        const angle = rotation + i * Math.PI / 10 + random(-0.16, 0.16);
        const speed = random(38, 72);
        sparks.push({
          x: rocket.x, y: rocket.y, vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed, age: 0, life: random(0.75, 1.25),
          gravity: 74, size: 1.2, color: '#fff3d4', trail: [], flicker: random(0, Math.PI * 2),
        });
      }
    }
  }

  function drawRocket(rocket, dt) {
    rocket.px = rocket.x;
    rocket.py = rocket.y;
    rocket.age += dt;
    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;
    rocket.vy += 110 * dt;
    if (rocket.age >= rocket.duration) return false;

    context.strokeStyle = 'rgba(255,214,158,.75)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(rocket.x, rocket.y + 21);
    context.lineTo(rocket.x, rocket.y);
    context.stroke();
    context.fillStyle = '#fff9e7';
    context.shadowColor = '#ffbd70';
    context.shadowBlur = 12;
    context.beginPath();
    context.arc(rocket.x, rocket.y, 2.5, 0, Math.PI * 2);
    context.fill();
    context.shadowBlur = 0;
    return true;
  }

  function drawSpark(spark, dt) {
    spark.age += dt;
    if (spark.age >= spark.life) return false;
    if (spark.crackle && spark.age > 0.55 && sparks.length < 250) {
      spark.crackle = false;
      for (let i = 0; i < 2; i++) {
        sparks.push({
          x: spark.x, y: spark.y, vx: spark.vx * 0.28 + random(-32, 32),
          vy: spark.vy * 0.28 + random(-32, 32), age: 0, life: random(0.45, 0.8),
          gravity: 85, size: 0.8, color: spark.color, trail: [], flicker: random(0, Math.PI * 2),
        });
      }
    }
    spark.trail.unshift({ x: spark.x, y: spark.y });
    if (spark.trail.length > 6) spark.trail.pop();
    const drag = Math.pow(0.985, dt * 60);
    spark.vx *= drag;
    spark.vy = spark.vy * drag + spark.gravity * dt;
    spark.x += spark.vx * dt;
    spark.y += spark.vy * dt;

    const fade = Math.pow(1 - spark.age / spark.life, 0.7);
    const glimmer = spark.age < 0.32 ? 1 : 0.65 + 0.35 * Math.sin(spark.age * 34 + spark.flicker) ** 2;
    context.strokeStyle = spark.color;
    context.lineWidth = spark.size;
    context.globalAlpha = fade * 0.85;
    context.beginPath();
    context.moveTo(spark.x, spark.y);
    spark.trail.forEach(point => context.lineTo(point.x, point.y));
    context.stroke();
    context.fillStyle = spark.color;
    context.globalAlpha = fade * glimmer * 0.38;
    context.beginPath();
    context.arc(spark.x, spark.y, spark.size * 3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = spark.age < 0.18 ? '#fff9e7' : spark.color;
    context.globalAlpha = fade * glimmer;
    context.beginPath();
    context.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
    context.fill();
    context.globalAlpha = 1;
    return true;
  }

  function drawFlash(flash, dt) {
    flash.age += dt;
    if (flash.age > 0.22) return false;
    const radius = 6 + flash.age * 140;
    const glow = context.createRadialGradient(flash.x, flash.y, 0, flash.x, flash.y, radius);
    glow.addColorStop(0, `rgba(255,252,238,${0.75 * (1 - flash.age / 0.22)})`);
    glow.addColorStop(1, 'rgba(255,210,140,0)');
    context.fillStyle = glow;
    context.beginPath();
    context.arc(flash.x, flash.y, radius, 0, Math.PI * 2);
    context.fill();
    return true;
  }

  function tick(time) {
    const dt = Math.min((time - (lastTime || time)) / 1000, 0.04);
    lastTime = time;
    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = 'lighter';

    if (time >= nextLaunch) {
      launch();
      nextLaunch = time + random(1200, 2100);
    }
    for (let i = rockets.length - 1; i >= 0; i--) {
      if (!drawRocket(rockets[i], dt)) {
        burst(rockets[i]);
        rockets.splice(i, 1);
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      if (!drawSpark(sparks[i], dt)) sparks.splice(i, 1);
    }
    for (let i = flashes.length - 1; i >= 0; i--) {
      if (!drawFlash(flashes[i], dt)) flashes.splice(i, 1);
    }
    context.globalCompositeOperation = 'source-over';
    frame = requestAnimationFrame(tick);
  }

  function sync() {
    const shouldRun = inView && !document.hidden && !motion.matches;
    if (!shouldRun) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      rockets.length = 0;
      sparks.length = 0;
      flashes.length = 0;
      context.clearRect(0, 0, width, height);
      return;
    }
    if (!frame) {
      nextLaunch = performance.now() + 300;
      frame = requestAnimationFrame(tick);
    }
  }

  resize();
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(cover);
  else window.addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      sync();
    }, { threshold: 0.05 }).observe(cover);
  } else {
    inView = true;
    sync();
  }
  document.addEventListener('visibilitychange', sync);
  if (motion.addEventListener) motion.addEventListener('change', sync);
  else motion.addListener(sync);
})();
