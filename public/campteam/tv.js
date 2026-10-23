/* 사무실 TV 화면. 이 TV 브라우저(TV Bro)에서 한 번 열어 두면 포털에서 바꾼 내용이 알아서 반영된다.
   - 주기적으로(기본 60초) 서버에서 새 내용을 가져오고, 와이파이가 끊기면 마지막 내용을 계속 보여주다가 다시 연결되면 바로 갱신한다.
   - TV 를 켜는 순간(화면이 다시 보이는 순간)에도 바로 최신으로 갱신한다.
   - 화면을 연 지 N시간(기본 6시간)이 넘으면 완전히 새로고침해서 오래 켜 둔 화면이 느려지는 것을 막는다.
   - 프로그램 버전이 바뀌면(서버가 새 버전이 되면) 스스로 완전히 새로고침한다. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var TOKEN = new URLSearchParams(location.search).get('t') || '', CACHE = 'wolko-tv-cache-v1';
  var S = { res: null, idx: {}, rot: {}, page: 0, pageStart: Date.now(), started: Date.now(), lastOk: 0, online: true, weather: null, version: null, stamp: null, timers: {}, minute: '' };
  var canvas = $('tvc'), stat = $('tvstat');

  function ctx() { var r = S.res; return { data: r.data, settings: r.settings || {}, lang: (r.settings && r.settings.language) || 'en', today: r.today, idx: S.idx, weather: S.weather }; }
  function box() { TVCore.sizeBox(canvas, window.innerWidth, window.innerHeight); }
  function say(msg, off) { stat.textContent = msg || ''; stat.className = off ? 'off' : ''; }
  function fullError(msg) { canvas.className = 'tvc tv-dark'; box(); TVCore.setU(canvas); canvas.innerHTML = '<div class="tv-empty">' + TVCore.esc(msg) + '</div>'; }
  function pages() { return (S.res && S.res.layout && S.res.layout.pages) || []; }
  function curPage() { var p = pages(); return p[S.page % Math.max(1, p.length)] || { items: [] }; }

  function draw() {
    if (!S.res) return; canvas.className = 'tvc ' + (S.res.settings && S.res.settings.theme === 'light' ? 'tv-light' : 'tv-dark'); box();
    var c = ctx(), p = curPage(); TVCore.mount(canvas, p, c);
    var ps = pages(); canvas.insertAdjacentHTML('beforeend', '<div class="tv-bar" id="tvbar"></div>' + (ps.length > 1 ? '<div class="tv-dots">' + ps.map(function (x, i) { return '<b class="' + (i === S.page % ps.length ? 'on' : '') + '"></b>'; }).join('') + '</div>' : ''));
    S.rot = {}; var now = Date.now(); p.items.forEach(function (it) { S.rot[it.uid] = now; });
  }
  function redrawWidgets(types) { var c = ctx(); curPage().items.forEach(function (it) { if (!types || types.indexOf(it.type) >= 0) TVCore.rerender(canvas, it, c); }); }
  function goPage(i) {
    var ps = pages(); if (ps.length < 2) { S.pageStart = Date.now(); return; }
    canvas.classList.add('fade'); setTimeout(function () { S.page = (i + ps.length) % ps.length; S.idx = {}; S.pageStart = Date.now(); draw(); canvas.classList.remove('fade'); }, 350);
  }

  function apply(j, fromCache) {
    if (!fromCache) {
      if (S.version && j.version !== S.version) { location.reload(); return; }
      S.version = j.version; try { localStorage.setItem(CACHE, JSON.stringify({ t: TOKEN, at: Date.now(), res: j })); } catch (e) {}
    }
    var newLayout = S.stamp !== null && S.stamp !== (j.layoutUpdatedAt || 'default');
    S.res = j; S.stamp = j.layoutUpdatedAt || 'default';
    if (!S.timers.refresh || S.refreshSec !== Number(j.settings.refreshSec)) { S.refreshSec = Math.max(30, Number(j.settings.refreshSec) || 60); clearInterval(S.timers.refresh); S.timers.refresh = setInterval(fetchData, S.refreshSec * 1000); }
    if (newLayout) { S.page = 0; S.idx = {}; S.pageStart = Date.now(); }
    if (!canvas.querySelector('.tvw') || newLayout) draw(); else redrawWidgets();
    fetchWeather(false);
  }
  function fetchData() {
    if (!TOKEN) return;
    fetch('/api/campteam/tv-data?t=' + encodeURIComponent(TOKEN) + '&_=' + Date.now(), { cache: 'no-store' }).then(function (r) {
      if (r.status === 403) { S.res = null; fullError('This TV link is not valid. Ask the camp team admin for a new link.'); say('', false); throw new Error('forbidden'); }
      if (!r.ok) throw new Error('HTTP ' + r.status); return r.json();
    }).then(function (j) { S.online = true; S.lastOk = Date.now(); say(''); apply(j, false); })
      .catch(function (e) { if (String(e && e.message) === 'forbidden') return; S.online = false; var d = S.lastOk ? new Date(S.lastOk) : null; say('Offline' + (d ? ' · last updated ' + d.toLocaleTimeString('en-US', { timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit', minute: '2-digit' }) : ' · waiting for connection'), true); if (!S.res) fullError('Waiting for connection…'); });
  }
  function fetchWeather(force) {
    var s = (S.res && S.res.settings) || {}; if (!s.weatherLat || (!force && S.weatherAt && Date.now() - S.weatherAt < 600000)) return; S.weatherAt = Date.now();
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(s.weatherLat) + '&longitude=' + encodeURIComponent(s.weatherLon) + '&current=temperature_2m,weather_code&timezone=Asia%2FSeoul').then(function (r) { return r.json(); })
      .then(function (j) { if (j && j.current) { S.weather = { temp: Math.round(j.current.temperature_2m), desc: TVCore.weatherText(j.current.weather_code) }; redrawWidgets(['weather']); } }).catch(function () { S.weatherAt = Date.now() - 540000; });
  }

  /* 1초마다: 시계 갱신, 목록 위젯 다음 페이지, 화면 전환, 오래 켜 둔 화면 새로고침 */
  function tick() {
    if (!S.res) return; var now = Date.now(), p = curPage(), c = ctx();
    var m = new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Seoul', hour12: false, hour: '2-digit', minute: '2-digit' }); if (m !== S.minute) { S.minute = m; redrawWidgets(['clock']); }
    p.items.forEach(function (it) {
      if (!TVCore.T[it.type].list) return; var secs = ((it.opts && it.opts.secs) || 10) * 1000;
      if (TVCore.pagesOf(it, c) > 1 && now - (S.rot[it.uid] || now) >= secs) { S.rot[it.uid] = now; S.idx[it.uid] = (S.idx[it.uid] || 0) + 1; TVCore.rerender(canvas, it, ctx()); }
    });
    var secsPage = (p.secs || 30) * 1000, bar = $('tvbar'); if (bar) bar.style.width = Math.min(100, (now - S.pageStart) / secsPage * 100) + '%';
    if (now - S.pageStart >= secsPage) goPage(S.page + 1);
    var hours = Number(S.res.settings.reloadHours) || 6;
    if (now - S.started > hours * 3600000 && navigator.onLine !== false) location.reload();
  }

  if (!TOKEN) { fullError('Open this page with the TV link (…/tv/?t=…)'); return; }
  try { var c0 = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (c0 && c0.t === TOKEN && c0.res && Date.now() - c0.at < 86400000) { S.version = c0.res.version; apply(c0.res, true); } } catch (e) {}
  fetchData(); setInterval(tick, 1000);
  window.addEventListener('online', fetchData);
  window.addEventListener('resize', function () { box(); if (S.res) { TVCore.setU(canvas); redrawWidgets(); } });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) fetchData(); });
  document.addEventListener('keydown', function (e) { if (e.keyCode === 39) goPage(S.page + 1); if (e.keyCode === 37) goPage(S.page - 1); });
})();
