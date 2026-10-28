/* 캠프팀 홈 맨 위 고정 영역 — 이름 인사 · 평택 날씨 · 날씨별 하늘(포털의 hub-sky.js 를 그대로 사용)과
   월코 포털(전체) 정보 위젯, 오늘 듀티 알림, 겨울 눈 효과, 완료 축하, 5분 자동 새로고침, 탭 제목 숫자.
   데이터는 /api/campteam/portal-feed 한 곳에서만 읽는다(포털 파일은 읽기만 하고 바꾸지 않는다). */
(function () {
  var MEAL = { ko: { am: '아침', lunch: '점심', dinner: '저녁', prep: '준비', clean: '클린업' }, en: { am: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', prep: 'Prep', clean: 'Clean-up' } };
  CT.addDict({
    ko: { hello0: function (n) { return n + '님, 좋은 아침이에요'; }, hello1: function (n) { return n + '님, 안녕하세요'; }, hello2: function (n) { return n + '님, 오늘도 수고 많으셨어요'; }, hello3: function (n) { return n + '님, 늦은 시간까지 수고 많아요'; },
      wxKind: { clear: '맑음', partly: '구름 조금', cloudy: '흐림', fog: '안개', rain: '비', snow: '눈', storm: '천둥번개' }, wxNight: '맑은 밤', wxTip: { clear: '하늘이 맑아요. 기분 좋은 하루 보내세요', clearNight: '맑은 밤하늘이에요', partly: '구름이 조금 꼈어요', cloudy: '흐린 하루예요', fog: '안개가 꼈어요. 운전 조심하세요', rain: '비가 와요. 우산 챙기세요', snow: '눈이 와요. 길 조심하세요', storm: '천둥 번개가 쳐요. 야외 활동은 조심하세요' }, wxCold: ' · 쌀쌀해요, 따뜻하게 입으세요', wxHot: ' · 무더워요, 물 많이 드세요', wxFeels: '체감', wxHiLo: function (hi, lo) { return '최고 ' + hi + '° / 최저 ' + lo + '°'; }, wxRain: '강수확률', wxCity: '평택',
      dutyKitchen: function (meal, part) { return '오늘 ' + meal + ' ' + part + ' 담당이에요'; }, dutyCar: function (what) { return '오늘 ' + what + ' 운행 담당이에요'; }, carPickup: '픽업', carDropoff: '드롭오프', dutyGospel: '지난달 복음 통계 보고를 아직 안 했어요', dutyGospelGo: '보고하기',
      tdDuty: '오늘 내 듀티', tdNotice: '새 월코 공지', tdNoticeSeen: '확인했어요', tdItems2: '건',
      pnoticesTitle: '월코 이번 주 공지', pkitchenTitle: '오늘 키친 듀티', pcarTitle: '오늘 차량 운행', peventsTitle: '다가오는 월코 일정', pchurchesTitle: '최근 업데이트된 교회',
      wPnoticesD: '월코 포털의 이번 주 전체 공지', wPkitchenD: '오늘 주방 당번 (포털)', wPcarD: '오늘 픽업·드롭오프 운전자 (포털)', wPeventsD: '앞으로 2주 월코 일정 (포털)', wPchurchesD: '최근 업데이트된 교회 (포털)',
      pNone: '표시할 내용이 없어요.', pFail: '불러오지 못했어요.', pPinned: '고정', pDue: '마감', pKitchenNone: '오늘 신청한 사람이 없어요.', pCarNone: '오늘 운행 담당이 정해지지 않았어요.', pEventsNone: '앞으로 2주 안에 일정이 없어요.', pChurchesOff: '교회 기록이 연결되지 않았어요.', pMe: '나', pAllDay: '종일', pVisited: '방문', pOpenPortal: '포털에서 보기',
      fxOn: '계절 배경 효과 켜기', fxOff: '계절 배경 효과 끄기', fxLabel: '❄ 눈', fxLabelA: '🍁 단풍', allDone: '오늘 할 일을 모두 끝냈어요! 🎉' },
    en: { hello0: function (n) { return 'Good morning, ' + n; }, hello1: function (n) { return 'Hello, ' + n; }, hello2: function (n) { return 'Good evening, ' + n; }, hello3: function (n) { return 'Working late, ' + n + '?'; },
      wxKind: { clear: 'Clear', partly: 'Partly cloudy', cloudy: 'Cloudy', fog: 'Fog', rain: 'Rain', snow: 'Snow', storm: 'Thunderstorm' }, wxNight: 'Clear night', wxTip: { clear: 'Clear skies. Have a lovely day', clearNight: 'A clear night sky', partly: 'A few clouds today', cloudy: 'A cloudy day', fog: 'Foggy. Drive carefully', rain: "It's raining. Take an umbrella", snow: "It's snowing. Watch your step", storm: 'Thunderstorms. Be careful outdoors' }, wxCold: ' · Chilly, dress warmly', wxHot: ' · Hot, drink plenty of water', wxFeels: 'Feels', wxHiLo: function (hi, lo) { return 'High ' + hi + '° / Low ' + lo + '°'; }, wxRain: 'Rain', wxCity: 'Pyeongtaek',
      dutyKitchen: function (meal, part) { return "You're on " + meal + ' ' + part + ' today'; }, dutyCar: function (what) { return "You're driving the " + what + ' today'; }, carPickup: 'Pick-up', carDropoff: 'Drop-off', dutyGospel: "You haven't submitted last month's Gospel report", dutyGospelGo: 'Report now',
      tdDuty: 'My duty today', tdNotice: 'New WOLKO notices', tdNoticeSeen: 'Got it', tdItems2: '',
      pnoticesTitle: 'WOLKO notices this week', pkitchenTitle: "Today's Kitchen Duty", pcarTitle: "Today's Vehicle Runs", peventsTitle: 'Upcoming WOLKO events', pchurchesTitle: 'Recently updated churches',
      wPnoticesD: "This week's portal-wide notices", wPkitchenD: "Today's kitchen crew (portal)", wPcarD: "Today's pick-up / drop-off drivers (portal)", wPeventsD: 'WOLKO events in the next 2 weeks (portal)', wPchurchesD: 'Recently updated churches (portal)',
      pNone: 'Nothing to show.', pFail: "Couldn't load.", pPinned: 'Pinned', pDue: 'Due', pKitchenNone: 'Nobody has signed up for today.', pCarNone: 'No driver is set for today.', pEventsNone: 'No events in the next 2 weeks.', pChurchesOff: 'Church records are not connected.', pMe: 'Me', pAllDay: 'All day', pVisited: 'Visited', pOpenPortal: 'Open in portal',
      fxOn: 'Turn seasonal background on', fxOff: 'Turn seasonal background off', fxLabel: '❄ Snow', fxLabelA: '🍁 Leaves', allDone: "You've finished everything for today! 🎉" },
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var officeEl = null, feed = null, loaded = false, baseTitle = document.title, handlers = {}, lastAt = 0, lastRemaining = null;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var ls = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  // ── 시간 · 문구 ──
  function kstNow() { return new Date(Date.now() + (new Date().getTimezoneOffset() + 540) * 60000); }
  function tod() { var h = kstNow().getHours(); return h >= 5 && h < 11 ? 0 : h < 17 && h >= 11 ? 1 : h >= 17 && h < 21 ? 2 : 3; }
  function langOf(s) { var ko = (String(s).match(/[가-힣]/g) || []).length, en = (String(s).match(/[A-Za-z]/g) || []).length; return ko > 0 && ko / (ko + en) >= 0.3 ? 'ko' : 'en'; }
  function noticeText(n) { var orig = langOf((n.title || '') + ' ' + n.body); if (n.tr && CT.lang() !== orig && (n.tr.title || n.tr.text)) return { title: n.tr.title || n.title, body: n.tr.text || n.body }; return { title: n.title, body: n.body }; }
  function mealWord(slot) { var m = MEAL[CT.lang()]; return m[slot.startsWith('am') ? 'am' : slot.startsWith('lunch') ? 'lunch' : 'dinner']; }
  function partWord(slot) { var m = MEAL[CT.lang()]; return slot.endsWith('_prep') ? m.prep : m.clean; }

  // ── 하늘 · 인사 ──
  function setGreeting(text) {
    var k = $('hubKicker'); if (!k || k.dataset.text === text) return;
    k.dataset.text = text; k.setAttribute('aria-label', text);
    k.innerHTML = Array.from(text).map(function (ch, i) { return '<span class="gl" aria-hidden="true" style="--i:' + i + '">' + esc(ch) + '</span>'; }).join('');
  }
  function wxLabel(w) { return !w.isDay && w.kind === 'clear' ? CT.t('wxNight') : CT.t('wxKind')[w.kind]; }
  function wxTip(w) { var tips = CT.t('wxTip'), s = (!w.isDay && w.kind === 'clear') ? tips.clearNight : tips[w.kind]; if (w.temp <= 5) s += CT.t('wxCold'); else if (w.temp >= 30) s += CT.t('wxHot'); return s; }
  function chips() {
    var me = feed && feed.me; if (!me) return '';
    var out = [].concat(
      (me.kitchen || []).map(function (s) { return '<a class="hub-today-chip is-kitchen" href="/portal/kitchen">' + esc(CT.t('dutyKitchen')(mealWord(s), partWord(s))) + '</a>'; }),
      (me.car || []).map(function (w) { return '<a class="hub-today-chip is-car" href="/portal/car-drive">' + esc(CT.t('dutyCar')(CT.t(w === 'pickup' ? 'carPickup' : 'carDropoff'))) + '</a>'; }),
      me.gospelPending ? ['<a class="hub-today-chip is-gospel" href="/portal/gospel-stats/?write=1&month=' + encodeURIComponent(me.gospelMonth) + '">' + esc(CT.t('dutyGospel')) + ' <b>' + esc(CT.t('dutyGospelGo')) + ' →</b></a>'] : []);
    return out.length ? '<div class="hub-today-bar">' + out.join('') + '</div>' : '';
  }
  function paintHero() {
    var box = $('hubSkyBody'); if (!box) return;
    var name = (feed && feed.name) || (CT.me && CT.me.email ? String(CT.me.email).split('@')[0] : '');
    var today = (feed && feed.today) || (window.CT_TODAY || new Date().toISOString().slice(0, 10));
    var full = new Intl.DateTimeFormat(CT.lang() === 'en' ? 'en-US' : 'ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(today + 'T12:00:00+09:00'));
    var w = feed && feed.weather;
    box.innerHTML = '<div class="hub-dash-top"><div class="hub-dash-date"><b>' + esc(full) + '</b></div><p class="hub-sky-tip">' + esc(w ? wxTip(w) : '') + '</p>' + chips() + '</div>';
    var sky = $('hubSky'); if (sky) sky.dataset.tod = String(tod());
    if (name) setGreeting(CT.t('hello' + tod())(name));
    var wx = $('hubWx');
    if (wx) {
      // 날씨 칸 안에 「팀 사무실」을 함께 넣는다 — 날씨가 없어도 칸은 사무실 때문에 보인다
      var off = officeEl || (officeEl = $('ctOffice')); if (off && off.parentNode) off.parentNode.removeChild(off);
      wx.hidden = false;
      wx.innerHTML = '<div class="hub-wx-card">' + (w ? '<div class="hub-wx-temp">' + w.temp + '<sup>°</sup></div><div class="hub-wx-label">' + esc(CT.t('wxCity') + ' · ' + wxLabel(w)) + '</div><div class="hub-wx-sub">' + esc(CT.t('wxFeels') + ' ' + w.feels + '°' + (w.hi != null && w.lo != null ? ' · ' + CT.t('wxHiLo')(w.hi, w.lo) : '') + (w.rain != null ? ' · ' + CT.t('wxRain') + ' ' + w.rain + '%' : '')) + '</div>' : '') + '</div>';
      if (off) wx.firstChild.appendChild(off);
    }
    applyWeather();
  }
  var wxKey = '';
  function applyWeather() {
    var w = feed && feed.weather, key = w ? w.kind + (w.isDay ? 'd' : 'n') : '';
    if (key === wxKey) return; wxKey = key;
    if (window.HubSky) window.HubSky.setWeather(w || null); else window.addEventListener('load', function () { if (window.HubSky) window.HubSky.setWeather(feed && feed.weather || null); });
    snowBoost(w && w.kind === 'snow');
  }

  // ── 오늘 카드에 끼워 넣는 알림 (듀티 · 새 공지) ──
  function seenIds() { try { return JSON.parse(ls.get('ct-seen-notices') || '[]'); } catch (e) { return []; } }
  function newNotices() { var seen = seenIds(); return ((feed && feed.notices) || []).filter(function (n) { return seen.indexOf(n.id) < 0; }); }
  function dutyList() {
    var me = feed && feed.me; if (!me) return [];
    return [].concat((me.kitchen || []).map(function (s) { return { href: '/portal/kitchen', text: CT.t('dutyKitchen')(mealWord(s), partWord(s)) }; }),
      (me.car || []).map(function (w) { return { href: '/portal/car-drive', text: CT.t('dutyCar')(CT.t(w === 'pickup' ? 'carPickup' : 'carDropoff')) }; }),
      me.gospelPending ? [{ href: '/portal/gospel-stats/?write=1&month=' + encodeURIComponent(me.gospelMonth), text: CT.t('dutyGospel') }] : []);
  }
  function todayExtra() {
    var d = dutyList(), nn = newNotices(), html = '';
    if (d.length) html += '<div class="tds td-duty"><h3>' + esc(CT.t('tdDuty')) + ' <em>' + d.length + esc(CT.t('tdItems2')) + '</em></h3>' + d.map(function (x) { return '<div class="tdr td-duty"><a href="' + esc(x.href) + '"><b>' + esc(x.text) + '</b></a></div>'; }).join('') + '</div>';
    if (nn.length) html += '<div class="tds td-notice"><h3>' + esc(CT.t('tdNotice')) + ' <em>' + nn.length + esc(CT.t('tdItems2')) + '</em><button type="button" class="btn sm" data-a="noticeSeen">' + esc(CT.t('tdNoticeSeen')) + '</button></h3>' + nn.slice(0, 3).map(function (n) { var v = noticeText(n); return '<div class="tdr td-notice"><b>' + esc(v.title || v.body.slice(0, 60)) + '</b>' + (v.title ? '<small>' + esc(v.body.slice(0, 90)) + '</small>' : '') + '</div>'; }).join('') + '</div>';
    return { html: html, duties: d.length, notices: nn.length };
  }

  // ── 위젯 ──
  var LINKS = { pnotices: '/portal/', pkitchen: '/portal/kitchen', pcar: '/portal/car-drive', pevents: '/portal/', pchurches: '/portal/crs' };
  var fail = function () { return '<div class="empty">' + esc(CT.t('pFail')) + '</div>'; }, none = function (k) { return '<div class="empty">' + esc(CT.t(k || 'pNone')) + '</div>'; };
  function names(a) { return a.map(function (n) { return '<span class="pchip">' + esc(n) + '</span>'; }).join(''); }
  function evTime(e) {
    try { if (e.allDay) return new Date(e.start + 'T12:00:00+09:00').toLocaleDateString(CT.lang() === 'en' ? 'en-US' : 'ko-KR', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', weekday: 'short' }) + ' · ' + CT.t('pAllDay');
      return new Date(e.start).toLocaleString(CT.lang() === 'en' ? 'en-US' : 'ko-KR', { timeZone: 'Asia/Seoul', month: 'short', day: 'numeric', weekday: 'short', hour: 'numeric', minute: '2-digit' }); } catch (x) { return String(e.start || ''); }
  }
  function widget(type) {
    if (!loaded) return '<div class="empty">…</div>';
    if (!feed) return fail();
    var mine = (feed.me && feed.me.kitchen) || [];
    if (type === 'pnotices') {
      var n = feed.notices; if (n == null) return fail(); if (!n.length) return none();
      var seen = seenIds();
      return n.map(function (x) { var v = noticeText(x); return '<div class="notice pn' + (seen.indexOf(x.id) < 0 ? ' is-new' : '') + '">' + (x.pinned ? '<span class="chip">' + esc(CT.t('pPinned')) + '</span> ' : '') + (v.title ? '<b>' + esc(v.title) + '</b>' : '') + '<p>' + esc(v.body) + '</p>' + (x.dueDate ? '<small>' + esc(CT.t('pDue')) + ' ' + esc(x.dueDate) + '</small>' : '') + '</div>'; }).join('');
    }
    if (type === 'pkitchen') {
      var k = feed.kitchen; if (k == null) return fail(); if (!k.length) return none('pKitchenNone');
      return k.map(function (m) { var m2 = MEAL[CT.lang()], me = mine.some(function (s) { return s.indexOf(m.meal) === 0; });
        return '<div class="row pk' + (me ? ' is-me' : '') + '"><div><b>' + esc(m2[m.meal]) + '</b>' + (me ? ' <span class="chip">' + esc(CT.t('pMe')) + '</span>' : '') + '<small>' + (m.prep.length ? esc(m2.prep) + ': ' + esc(m.prep.join(', ')) : '') + (m.prep.length && m.clean.length ? ' · ' : '') + (m.clean.length ? esc(m2.clean) + ': ' + esc(m.clean.join(', ')) : '') + '</small></div></div>'; }).join('');
    }
    if (type === 'pcar') {
      var c = feed.car; if (c == null) return fail(); if (!c.pickup && !c.dropoff) return none('pCarNone');
      var cm = (feed.me && feed.me.car) || [];
      return [['pickup', 'carPickup'], ['dropoff', 'carDropoff']].map(function (p) { return '<div class="row pk' + (cm.indexOf(p[0]) >= 0 ? ' is-me' : '') + '"><div><b>' + esc(CT.t(p[1])) + '</b>' + (cm.indexOf(p[0]) >= 0 ? ' <span class="chip">' + esc(CT.t('pMe')) + '</span>' : '') + '<small>' + esc(c[p[0]] || '—') + '</small></div></div>'; }).join('');
    }
    if (type === 'pevents') {
      var ev = feed.events; if (ev == null) return fail(); if (!ev.length) return none('pEventsNone');
      return ev.map(function (e) { return '<div class="row"><div><b>' + esc(e.title) + '</b><small>' + esc(evTime(e)) + (e.location ? ' · ' + esc(e.location) : '') + '</small></div></div>'; }).join('');
    }
    if (type === 'pchurches') {
      var ch = feed.churches; if (ch == null) return none('pChurchesOff'); if (!ch.length) return none();
      return ch.map(function (c) { return '<div class="row"><div><b>' + esc(c.name) + '</b><small>' + c.steps + '/12' + (c.lastVisitDate ? ' · ' + esc(CT.t('pVisited')) + ' ' + esc(c.lastVisitDate) : '') + '</small></div></div>'; }).join('');
    }
    return '';
  }

  // ── 탭 제목 숫자 · 축하 ──
  function remaining() {
    var t = window.CTA && CTA.st && CTA.st.today && CTA.st.today.today, x = todayExtra();
    return (t ? (t.overdue || []).length + (t.today || []).length : 0) + x.duties + x.notices;
  }
  function badge() {
    var n = remaining(); document.title = (n > 0 ? '(' + n + ') ' : '') + baseTitle;
    var t = window.CTA && CTA.st && CTA.st.today && CTA.st.today.today, work = t ? (t.overdue || []).length + (t.today || []).length : null;
    if (work != null) { if (lastRemaining != null && lastRemaining > 0 && work === 0) confetti(); lastRemaining = work; }
  }

  // ── 계절 효과: 가을(9~11월)은 단풍나무와 바람에 떨어지는 단풍잎, 겨울(12~2월)은 눈 — 화면 전체 배경 ──
  var snow = { cv: null, ctx: null, flakes: [], on: false, run: false, W: 0, H: 0, boost: false, last: 0 };
  var leaf = { cv: null, ctx: null, list: [], run: false, W: 0, H: 0, last: 0, t: 0 };
  var mode = 'winter';
  function season() { var m = kstNow().getMonth() + 1; return m >= 9 && m <= 11 ? 'autumn' : (m === 12 || m <= 2) ? 'winter' : ''; }
  function fxWanted() { var v = ls.get('ct-fx'); return v === 'on' ? true : v === 'off' ? false : season() !== ''; }
  function fit(cv, ctx, o) { var dpr = Math.min(2, window.devicePixelRatio || 1); o.W = window.innerWidth; o.H = window.innerHeight; cv.width = Math.round(o.W * dpr); cv.height = Math.round(o.H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  function mkCanvas(id, z) { var c = document.createElement('canvas'); c.id = id; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c); return c; }
  // 눈
  function snowResize() { fit(snow.cv, snow.ctx, snow); snowBuild(); }
  function snowBuild() {
    var s = snow, n = Math.round(Math.max(24, Math.min(s.W < 700 ? 38 : 80, s.W * s.H / 16000)) * (s.boost ? 1.8 : 1)); s.flakes = [];
    for (var i = 0; i < n; i++) s.flakes.push(flake(true));
  }
  function flake(any) { var s = snow; return { x: Math.random() * s.W, y: any ? Math.random() * s.H : -8, r: 1.2 + Math.random() * 2.6, vy: 14 + Math.random() * 30, ph: Math.random() * 6.28, sw: 6 + Math.random() * 18 }; }
  function snowFrame(t) {
    var s = snow; if (!s.run) return;
    var dt = Math.min(0.05, (t - s.last) / 1000 || 0.016); s.last = t;
    s.ctx.clearRect(0, 0, s.W, s.H); s.ctx.fillStyle = '#fff'; s.ctx.shadowColor = 'rgba(90,140,200,.55)'; s.ctx.shadowBlur = 3;
    for (var i = 0; i < s.flakes.length; i++) {
      var f = s.flakes[i]; f.ph += dt; f.y += f.vy * dt; f.x += Math.sin(f.ph) * f.sw * dt;
      if (f.y > s.H + 8) s.flakes[i] = f = flake(false); if (f.x < -8) f.x = s.W + 8; else if (f.x > s.W + 8) f.x = -8;
      s.ctx.globalAlpha = 0.55 + f.r / 9; s.ctx.beginPath(); s.ctx.arc(f.x, f.y, f.r, 0, 6.283); s.ctx.fill();
    }
    requestAnimationFrame(snowFrame);
  }
  function snowBoost(on) { snow.boost = !!on; if (snow.cv && mode === 'winter') snowBuild(); }
  // 단풍잎
  var LEAF_COLORS = ['#c0392b', '#d9462f', '#e8742a', '#f0a030', '#a82a1e', '#e04f35'];
  var MAPLE = (function () {
    var half = [[0, -1], [.2, -.62], [.6, -.8], [.5, -.3], [1, -.22], [.66, .12], [.84, .5], [.32, .36], [.1, .72], [0, .92]], p = new Path2D(); p.moveTo(0, -1);
    half.slice(1).forEach(function (q) { p.lineTo(q[0], q[1]); }); half.slice().reverse().forEach(function (q) { p.lineTo(-q[0], q[1]); }); p.closePath(); return p;
  })();
  function crown() {
    var el = document.querySelector('.ct-tree'), W = leaf.W, H = leaf.H;
    if (!el) return { x: W * 0.8, y: -10 };
    var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > H || r.width < 4) return { x: r.left + r.width / 2 || W * 0.8, y: -10 };
    return { x: r.left + r.width * (.2 + Math.random() * .6), y: r.top + r.height * (.2 + Math.random() * .4) };
  }
  function newLeaf(first) { var c = crown(); return { x: c.x, y: c.y, r: 5 + Math.random() * 6, vy: 20 + Math.random() * 26, ph: Math.random() * 6.28, spin: Math.random() * 6.28, vs: (Math.random() - .5) * 3, flip: Math.random() * 6.28, col: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)], wait: first ? Math.random() * 9 : Math.random() * 3 }; }
  function leafResize() { fit(leaf.cv, leaf.ctx, leaf); leaf.list = []; for (var i = 0, n = leaf.W < 700 ? 12 : 22; i < n; i++) leaf.list.push(newLeaf(true)); }
  function leafFrame(t) {
    var s = leaf; if (!s.run) return;
    var dt = Math.min(0.05, (t - s.last) / 1000 || 0.016); s.last = t; s.t += dt;
    var gust = 28 + 40 * (0.5 + 0.5 * Math.sin(s.t * 0.35)) + 20 * Math.max(0, Math.sin(s.t * 0.9)); // 왼쪽으로 부는 바람 — 세졌다 약해졌다
    s.ctx.clearRect(0, 0, s.W, s.H);
    for (var i = 0; i < s.list.length; i++) {
      var f = s.list[i];
      if (f.wait > 0) { f.wait -= dt; if (f.wait <= 0) { var c = crown(); f.x = c.x; f.y = c.y; } continue; }
      f.ph += dt * 1.4; f.spin += f.vs * dt; f.flip += dt * 2.2;
      f.x -= (gust + Math.sin(f.ph) * 16) * dt; f.y += (f.vy + Math.abs(Math.cos(f.ph)) * 10 + gust * 0.12) * dt;
      if (f.y > s.H + 20 || f.x < -24) { s.list[i] = newLeaf(false); continue; }
      s.ctx.save(); s.ctx.translate(f.x, f.y); s.ctx.rotate(f.spin); s.ctx.scale(f.r, f.r * (0.35 + 0.65 * Math.abs(Math.cos(f.flip)))); s.ctx.globalAlpha = 0.92; s.ctx.fillStyle = f.col; s.ctx.fill(MAPLE); s.ctx.restore();
    }
    requestAnimationFrame(leafFrame);
  }
  // 단풍나무 그림 — 하늘 영역 오른쪽에 서 있고, 잎이 여기서 떨어진다
  var TREE = '<svg class="ct-tree" viewBox="0 0 160 176" aria-hidden="true"><path d="M70 176c2-30 3-48 1-68h12c-2 22 2 40 6 68z" fill="#6b4426"/><path d="M77 118 60 92M81 124 104 94M78 108V80" stroke="#6b4426" stroke-width="5" stroke-linecap="round" fill="none"/>'
    + '<g class="crown"><circle cx="80" cy="62" r="38" fill="#c0392b"/><circle cx="50" cy="78" r="28" fill="#d9462f"/><circle cx="110" cy="76" r="30" fill="#e8742a"/><circle cx="64" cy="42" r="26" fill="#e04f35"/><circle cx="98" cy="44" r="26" fill="#f0a030"/><circle cx="80" cy="84" r="24" fill="#b0301f"/>'
    + '<circle cx="62" cy="58" r="7" fill="#f0a030" opacity=".8"/><circle cx="98" cy="68" r="6" fill="#d9462f" opacity=".8"/><circle cx="82" cy="40" r="6" fill="#e8742a" opacity=".8"/><circle cx="44" cy="84" r="5" fill="#f0a030" opacity=".7"/></g></svg>';
  function treeSync(on) {
    var art = document.querySelector('#hubSky .hub-sky-content'), has = document.querySelector('.ct-tree');
    if (on && art && !has) art.insertAdjacentHTML('beforeend', TREE); else if (!on && has) has.remove();
  }
  // 켜기·끄기
  function loops() {
    var ok = !reduce && !document.hidden;
    var ws = snow.on && mode === 'winter' && ok, wl = snow.on && mode === 'autumn' && ok;
    if (ws && !snow.run) { snow.run = true; snow.last = performance.now(); requestAnimationFrame(snowFrame); } else if (!ws && snow.run) { snow.run = false; if (snow.ctx) snow.ctx.clearRect(0, 0, snow.W, snow.H); }
    if (wl && !leaf.run) { leaf.run = true; leaf.last = performance.now(); requestAnimationFrame(leafFrame); } else if (!wl && leaf.run) { leaf.run = false; if (leaf.ctx) leaf.ctx.clearRect(0, 0, leaf.W, leaf.H); }
  }
  function setFx(on) {
    snow.on = on; mode = season() === 'winter' ? 'winter' : 'autumn';
    document.body.classList.toggle('ct-winter', on && mode === 'winter'); document.body.classList.toggle('ct-autumn', on && mode === 'autumn');
    if (on && mode === 'winter' && !snow.cv) { snow.cv = mkCanvas('ctSnow'); snow.ctx = snow.cv.getContext('2d'); snowResize(); window.addEventListener('resize', snowResize); }
    if (on && mode === 'autumn' && !leaf.cv) { leaf.cv = mkCanvas('ctLeaves'); leaf.ctx = leaf.cv.getContext('2d'); leafResize(); window.addEventListener('resize', leafResize); }
    if (snow.cv) snow.cv.hidden = !(on && mode === 'winter'); if (leaf.cv) leaf.cv.hidden = !(on && mode === 'autumn');
    treeSync(on && mode === 'autumn');
    var b = $('fxBtn'); if (b) { b.textContent = CT.t(mode === 'autumn' ? 'fxLabelA' : 'fxLabel'); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.title = CT.t(on ? 'fxOff' : 'fxOn'); b.hidden = !season(); }
    loops();
  }
  function fxButton() {
    var host = document.querySelector('.top .actions'); if (!host || $('fxBtn')) return;
    var b = document.createElement('button'); b.type = 'button'; b.className = 'btn'; b.id = 'fxBtn';
    b.onclick = function () { var on = !snow.on; ls.set('ct-fx', on ? 'on' : 'off'); setFx(on); };
    host.insertBefore(b, host.firstChild);
  }

  // ── 축하 색종이 ──
  function confetti() {
    if (reduce) return;
    var cv = document.createElement('canvas'); cv.className = 'ct-confetti'; cv.setAttribute('aria-hidden', 'true'); cv.width = window.innerWidth; cv.height = window.innerHeight; document.body.appendChild(cv);
    var c = cv.getContext('2d'), cols = ['#f5a623', '#e85d75', '#3bb3a6', '#3b8ff0', '#8b6cf0', '#9bbf1f'], ps = [], t0 = performance.now();
    for (var i = 0; i < 90; i++) ps.push({ x: window.innerWidth / 2 + (Math.random() - .5) * 160, y: window.innerHeight * .35, vx: (Math.random() - .5) * 520, vy: -200 - Math.random() * 420, r: 4 + Math.random() * 5, a: Math.random() * 6, va: (Math.random() - .5) * 10, col: cols[i % cols.length] });
    (function f(t) { var dt = Math.min(.04, (t - (f.l || t)) / 1000); f.l = t; c.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(function (p) { p.vy += 900 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.a += p.va * dt; c.save(); c.translate(p.x, p.y); c.rotate(p.a); c.fillStyle = p.col; c.fillRect(-p.r, -p.r / 2, p.r * 2, p.r); c.restore(); });
      if (t - t0 < 2200) requestAnimationFrame(f); else cv.remove(); })(t0);
    var live = $('ctLive'); if (live) live.textContent = CT.t('allDone');
  }

  // ── 불러오기 · 5분 자동 새로고침 ──
  async function loadFeed() {
    try { feed = await CT.api('/api/campteam/portal-feed'); } catch (e) { feed = null; }
    loaded = true; lastAt = Date.now(); paintHero();
    if (handlers.onFeed) handlers.onFeed();
    if (window.CTA && CTA.renderToday) { try { CTA.renderToday(); } catch (e) {} }
    badge();
  }
  function start(h) {
    handlers = h || {};
    var live = document.createElement('div'); live.id = 'ctLive'; live.className = 'sr-only'; live.setAttribute('aria-live', 'polite'); document.body.appendChild(live);
    fxButton(); setFx(fxWanted());
    document.addEventListener('visibilitychange', function () { loops(); if (!document.hidden && Date.now() - lastAt > 120000) refresh(); });
    document.addEventListener('ct-lang', function () { paintHero(); fxButton(); setFx(snow.on); badge(); });
    setInterval(function () { if (!document.hidden && Date.now() - lastAt > 290000) refresh(); }, 30000);
    paintHero(); return loadFeed();
  }
  async function refresh() {
    lastAt = Date.now();
    try { if (handlers.onRefresh && !(handlers.busy && handlers.busy())) await handlers.onRefresh(); } catch (e) {}
    await loadFeed();
  }
  document.addEventListener('ct-today', badge);

  window.CTHero = { start: start, widget: widget, todayExtra: todayExtra, badge: badge, refresh: refresh, links: LINKS, markSeen: function () { ls.set('ct-seen-notices', JSON.stringify(((feed && feed.notices) || []).map(function (n) { return n.id; }))); if (window.CTA && CTA.renderToday) CTA.renderToday(); badge(); if (handlers.onFeed) handlers.onFeed(); } };
})();
