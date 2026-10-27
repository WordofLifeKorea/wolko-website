/* TV 대시보드 공통 렌더러 — TV 화면(/tv/)과 포털 편집기(/portal/campteam/tv/)가 같이 쓴다. (오래된 TV 브라우저를 위해 ES5 문법)
   데이터는 /api/campteam/tv-data 의 응답과 같은 모양. 금액·이메일은 이 데이터에 없다. */
(function (g) {
  var COLS = 16, ROWS = 9, CELL = 100 / COLS;
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  var STATUS = { 'Not Started': ['Not Started', '미시작'], 'In Progress': ['In Progress', '진행 중'], 'Waiting for Confirmation': ['Waiting for Confirmation', '확인 대기'], 'Delayed': ['Delayed', '지연'], 'Completed': ['Completed', '완료'], 'Not Applicable': ['N/A', '해당 없음'] };
  var KIND = { proposal: ['Proposal', '제안'], direction: ['Direction', '방향 합의'], final: ['Final', '최종 결정'], hold: ['On hold', '보류'], changed: ['Changed', '변경'] };
  var DOW = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ko: ['일', '월', '화', '수', '목', '금', '토'] };

  /** 언어 선택: lang = 'en' | 'ko' | 'both' */
  function L(ctx, ko, en) { var a = ko || '', b = en || ''; if (ctx.lang === 'both') return a && b && a !== b ? a + ' / ' + b : (a || b); return ctx.lang === 'ko' ? (a || b) : (b || a); }
  function dateLabel(ctx, d) { if (!d) return ''; var dt = new Date(d + 'T00:00:00'); return ctx.lang === 'ko' ? (dt.getMonth() + 1) + '/' + dt.getDate() + ' (' + DOW.ko[dt.getDay()] + ')' : DOW.en[dt.getDay()] + ', ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.getMonth()] + ' ' + dt.getDate(); }
  function seoul(opts) { return new Date().toLocaleString('en-US', Object.assign({ timeZone: 'Asia/Seoul' }, opts)); }
  function dueClass(ctx, due) { if (!due) return ''; if (due < ctx.today) return 'tv-late'; var d = Math.round((Date.parse(due) - Date.parse(ctx.today)) / 86400000); return d <= 3 ? 'tv-soon' : ''; }
  function label(map, key, ctx) { var m = map[key] || [key, key]; return ctx.lang === 'ko' ? m[1] : m[0]; }

  /* 위젯 정의: min = 최소 칸, size = 처음 크기, list = 목록형(페이지 넘김), ih/ihc = 항목 하나의 높이 추정(화면 너비 %), items(ctx) = 목록 데이터, item(x, ctx) = 항목 HTML */
  var T = {
    brand:   { ko: '제목 · 로고', en: 'Title / logo', min: [2, 1], size: [6, 1], fit: 1, html: function (c) { return '<div class="tv-brand"><small>WORD OF LIFE KOREA</small><h1>' + (c.lang === 'ko' ? '캠프 &amp; 아웃리치 운영' : 'Camp &amp; Outreach Operations') + '</h1><div>CAMP TEAM · OFFICE DASHBOARD</div></div>'; } },
    weather: { ko: '날씨', en: 'Weather', min: [1, 1], size: [4, 1], fit: 1, html: function (c) { var w = c.weather; return '<div class="tv-ct tv-center"><div class="tv-wx">' + esc((c.settings.weatherLabel || '') + (w ? ' · ' + w.temp + '°C' : '')) + '</div><div class="tv-cap" style="margin:0">' + esc(w ? w.desc : '—') + '</div></div>'; } },
    clock:   { ko: '시계 · 날짜', en: 'Clock & date', min: [2, 1], size: [6, 1], fit: 1, html: function (c) { return '<div class="tv-ct tv-center" style="align-items:flex-end;text-align:right"><div class="tv-clk">' + esc(seoul({ hour: '2-digit', minute: '2-digit', hour12: false })) + '</div><div class="tv-cap" style="margin:calc(var(--k)*.2) 0 0;font-size:calc(var(--k)*.85)">' + esc(seoul({ weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })) + '</div></div>'; } },
    stats:   { ko: '통계 (진행·마감·완료율)', en: 'Stats', min: [4, 1], size: [16, 1], fit: 1, bare: 1, html: function (c) { var s = c.data.stats || {}; return '<div class="tv-tiles"><div class="tv-tile"><label>' + (c.lang === 'ko' ? '진행 중 업무' : 'Open Tasks') + '</label><strong>' + (s.open || 0) + '</strong></div><div class="tv-tile"><label>' + (c.lang === 'ko' ? '마감 지남' : 'Overdue Tasks') + '</label><strong>' + (s.overdue || 0) + '</strong></div><div class="tv-tile"><label>' + (c.lang === 'ko' ? '완료율' : 'Completion') + '</label><strong>' + (s.completion || 0) + '%</strong></div></div>'; } },
    dday:    { ko: '캠프 D-Day', en: 'Camp D-Day', min: [2, 2], size: [4, 2], fit: 1, html: function (c) { var d = c.data.dday; return '<div class="tv-hd"><h2>D-Day</h2><span>' + esc(d ? L(c, d.nameKo, d.nameEn) : '') + '</span></div><div class="tv-ct tv-center">' + (d ? '<div class="tv-big">' + (d.days === 0 ? 'D-Day' : 'D-' + d.days) + '</div><div class="tv-cap">' + esc(L(c, d.nameKo, d.nameEn)) + '</div>' : '<div class="tv-cap">—</div>') + '</div>'; } },
    progress:{ ko: '캠프별 준비 진행률', en: 'Camp prep progress', min: [3, 2], size: [6, 3], fit: 1, html: function (c) { return '<div class="tv-hd"><h2>' + (c.lang === 'ko' ? '캠프 준비 진행률' : 'Camp Prep Progress') + '</h2><span></span></div><div class="tv-ct tv-bars">' + (c.data.progress || []).slice(0, 5).map(function (p) { return '<div class="row"><div><span>' + esc(L(c, p.nameKo, p.nameEn)) + '</span><b>' + p.pct + '%</b></div><i><u style="width:' + p.pct + '%"></u></i></div>'; }).join('') + '</div>'; } },
    theme:   { ko: '캠프 주제 · 말씀', en: 'Camp theme', min: [2, 1], size: [6, 2], fit: 1, html: function (c) { return '<div class="tv-ct tv-center"><div style="font:800 calc(var(--k)*1.9) Montserrat,sans-serif;color:var(--accent)">' + esc(c.data.theme || '—') + '</div></div>'; } },
    campers: { ko: '캠퍼 신청 현황', en: 'Camper registrations', min: [3, 2], size: [5, 3], fit: 1, html: function (c) { var a = c.data.campers || []; return '<div class="tv-hd"><h2>' + (c.lang === 'ko' ? '캠퍼 신청 현황' : 'Camper Registrations') + '</h2><span></span></div><div class="tv-ct tv-bars">' + (a.length ? a.map(function (x) { var pct = x.capacity ? Math.min(100, Math.round(x.count / x.capacity * 100)) : 0; return '<div class="row"><div><span>' + esc(L(c, x.nameKo, x.nameEn)) + '</span><b>' + x.count + (x.capacity ? ' / ' + x.capacity : '') + '</b></div>' + (x.capacity ? '<i><u style="width:' + pct + '%"></u></i>' : '') + '</div>'; }).join('') : '<div class="tv-cap tv-center" style="text-align:center">' + (c.lang === 'ko' ? '신청 시스템이 아직 연결되지 않았어요' : 'Not connected yet') + '</div>') + '</div>'; } },
    tasks:   { ko: 'Priority Tasks · 업무', en: 'Priority tasks', min: [3, 2], size: [9, 4], list: 1, ih: 3.9, ihc: 2.2, title: function (c) { return 'Priority Tasks'; }, items: function (c) { return c.data.tasks || []; },
      item: function (t, c) { var camp = L(c, t.campKo, t.campEn), meta = [t.ownerName || (c.lang === 'ko' ? '담당 미정' : 'No owner'), camp].filter(Boolean).join(' · '); return '<div class="tv-it"><div class="l"><b>' + esc(t.title) + '</b><span class="sub">' + esc(meta) + (t.dueDate ? ' · <span class="' + dueClass(c, t.dueDate) + '">' + (c.lang === 'ko' ? '기한 ' : 'Due ') + esc(t.dueDate) + '</span>' : '') + '</span></div><div class="tv-st">' + esc(label(STATUS, t.status, c)) + '<br><span class="tv-pri p-' + esc(t.priority) + '">' + esc(String(t.priority).toUpperCase()) + '</span></div></div>'; } },
    events:  { ko: 'Upcoming Schedule · 스케줄', en: 'Upcoming schedule', min: [3, 2], size: [7, 4], list: 1, ih: 3.5, ihc: 2.2, title: function () { return 'Upcoming Schedule'; }, items: function (c) { return c.data.events || []; },
      item: function (e, c) { var d = dateLabel(c, e.startDate) + (e.endDate && e.endDate !== e.startDate ? ' – ' + dateLabel(c, e.endDate) : '') + (e.startTime ? ' · ' + e.startTime : ''); return '<div class="tv-it"><div class="l"><b>' + esc(e.title) + '</b><span class="sub">' + esc(d) + '</span></div></div>'; } },
    meetings:{ ko: 'Recent Decisions · 회의 결정', en: 'Recent decisions', min: [3, 2], size: [9, 3], list: 1, ih: 6.2, ihc: 2.4, title: function () { return 'Recent Meeting Decisions'; }, items: function (c) { return c.data.decisions || []; },
      item: function (d, c) { return '<div class="tv-it"><div class="l"><b>' + esc(L(c, d.textKo, d.textEn)) + '</b><div class="noteb">' + esc(label(KIND, d.kind, c) + ' · ' + (d.decidedDate || '') + (L(c, d.campKo, d.campEn) ? ' · ' + L(c, d.campKo, d.campEn) : '')) + '</div></div></div>'; } },
    notices: { ko: 'Team Announcements · 팀 안내', en: 'Team announcements', min: [3, 2], size: [7, 3], list: 1, ih: 3.4, ihc: 2.6, title: function () { return 'Team Announcements'; }, items: function (c) { return c.data.notices || []; }, item: function (n, c) { return '<div class="tv-notice">' + esc(L(c, n.message, n.messageEn)) + '</div>'; } },
    late:    { ko: '확인 필요 (담당·기한)', en: 'Needs attention', min: [3, 2], size: [5, 3], list: 1, ih: 3.7, ihc: 2.2, title: function () { return 'Needs Attention'; }, items: function (c) { return c.data.late || []; },
      item: function (t, c) { return '<div class="tv-it"><div class="l"><b>' + esc(t.title) + '</b><span class="sub">' + esc(t.reason === 'noowner' ? (c.lang === 'ko' ? '담당 미정' : 'No owner') : (c.lang === 'ko' ? '마감 지남 ' : 'Overdue ') + (t.dueDate || '')) + '</span></div></div>'; } },
  };

  function baseScale(it) { var d = T[it.type]; return clamp(Math.min(it.w / d.size[0], it.h / d.size[1]), d.list ? .85 : .6, 1.5); }
  function scaleOf(it) { return it.opts && it.opts.fs ? it.opts.fs / 100 : baseScale(it); }
  function perPage(it, s, ctx) {
    var d = T[it.type], o = it.opts || {}, n = (d.items(ctx) || []).length || 1; if (o.n) return Math.min(o.n, n);
    var Hu = it.h * CELL - 3.4, head = o.noTitle ? 0 : 3.5 * s, ih = (o.compact ? d.ihc : d.ih) * s;
    return clamp(Math.floor((Hu - head) / ih), 1, n);
  }
  function body(it, ctx) {
    var d = T[it.type], o = it.opts || {}; if (!d.list) return d.html(ctx);
    var all = d.items(ctx) || [], s = scaleOf(it), n = perPage(it, s, ctx), pages = Math.max(1, Math.ceil(all.length / n)), p = ((ctx.idx[it.uid] || 0) % pages), rows = all.slice(p * n, p * n + n).map(function (x) { return d.item(x, ctx); }).join('');
    if (!all.length) rows = '<div class="tv-cap tv-center" style="text-align:center">—</div>';
    return (o.noTitle ? '' : '<div class="tv-hd"><h2>' + esc(d.title(ctx)) + '</h2><span>' + (pages > 1 ? (p + 1) + ' / ' + pages : '') + '</span></div>') + '<div class="tv-ct">' + rows + '</div>';
  }
  function pagesOf(it, ctx) { var d = T[it.type]; if (!d.list) return 1; var n = perPage(it, scaleOf(it), ctx); return Math.max(1, Math.ceil(((d.items(ctx) || []).length || 1) / n)); }
  function place(el, r) { el.style.left = r.x / COLS * 100 + '%'; el.style.top = r.y / ROWS * 100 + '%'; el.style.width = r.w / COLS * 100 + '%'; el.style.height = r.h / ROWS * 100 + '%'; }
  function fit(el, it) {
    var d = T[it.type]; if (!d.fit || (it.opts && it.opts.fs)) return; var inner = el.firstChild, s = baseScale(it), k = 0; el.style.setProperty('--s', s);
    while (k++ < 14 && (inner.scrollHeight > inner.clientHeight + 3 || inner.scrollWidth > inner.clientWidth + 3) && s > .3) { s *= .92; el.style.setProperty('--s', s); }
  }
  function widgetEl(it, ctx) {
    var d = T[it.type], el = document.createElement('div'); el.className = 'tvw' + (d.bare ? ' bare' : '') + ((it.opts && it.opts.compact) ? ' tv-compact' : ''); el.setAttribute('data-uid', it.uid); place(el, it); el.style.setProperty('--s', scaleOf(it));
    el.innerHTML = '<div class="tvw-in">' + body(it, ctx) + '</div>'; return el;
  }
  function setU(canvas) { var u = canvas.clientWidth / 100; canvas.style.setProperty('--u', u + 'px'); return u; }
  /** 화면 하나를 그린다 (편집기에서는 extra(el,it) 로 이름표·삭제 버튼 등을 덧붙인다) */
  function mount(canvas, page, ctx, extra) {
    setU(canvas); canvas.innerHTML = '';
    (page.items || []).forEach(function (it) { if (!T[it.type]) return; var el = widgetEl(it, ctx); canvas.appendChild(el); fit(el, it); if (extra) extra(el, it); });
    if (!(page.items || []).length) canvas.innerHTML = '<div class="tv-empty">' + (ctx.lang === 'ko' ? '이 화면에는 위젯이 없어요' : 'No widgets on this screen') + '</div>';
  }
  function rerender(canvas, it, ctx, extra) { var old = canvas.querySelector('[data-uid="' + it.uid + '"]'); if (!old || !T[it.type]) return; var el = widgetEl(it, ctx); canvas.replaceChild(el, old); fit(el, it); if (extra) extra(el, it); }
  /** 칸 안에 맞게 TV 크기(16:9)로 상자를 맞춘다 */
  function sizeBox(canvas, availW, availH) { var w = Math.min(availW, availH * 16 / 9); canvas.style.width = Math.floor(w) + 'px'; canvas.style.height = Math.floor(w * 9 / 16) + 'px'; return w; }
  /** 날씨 코드 → 말 */
  function weatherText(code) { code = Number(code); return code === 0 ? 'Clear' : code <= 3 ? 'Partly cloudy' : code <= 48 ? 'Fog' : code <= 67 ? 'Rain' : code <= 77 ? 'Snow' : code <= 82 ? 'Showers' : code <= 86 ? 'Snow showers' : 'Storm'; }

  g.TVCore = { COLS: COLS, ROWS: ROWS, CELL: CELL, T: T, mount: mount, rerender: rerender, scaleOf: scaleOf, baseScale: baseScale, perPage: perPage, pagesOf: pagesOf, place: place, setU: setU, sizeBox: sizeBox, weatherText: weatherText, esc: esc, clamp: clamp };
})(window);
