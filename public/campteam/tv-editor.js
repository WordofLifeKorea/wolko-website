(function () {
  CT.addDict({
    ko: { tvTitle: 'TV 대시보드', tvSub: '사무실 TV에 나올 화면을 꾸미고, 팀 공지를 관리해요', tvLink: 'TV 주소', tvLinkHelp: 'TV Bro 같은 TV 브라우저에서 아래 주소를 한 번만 열어 두고 즐겨찾기/시작 페이지로 저장하세요. 이후에는 포털에서 바꾼 내용이 자동으로 TV에 반영돼요. 이 주소에는 금액·이메일이 나오지 않지만, 주소를 아는 사람은 TV 내용을 볼 수 있어요. 노출됐다면 "새 주소 만들기"를 누르세요(이전 주소는 바로 멈춰요).', tvCopy: '주소 복사', tvOpen: 'TV 화면 열기', tvRotate: '새 주소 만들기', tvCopied: '복사했어요', tvRotateConfirm: '새 주소를 만들면 지금 TV의 주소는 바로 멈춰요. TV에서 새 주소로 다시 열어야 해요. 계속할까요?',
      tvAdd: '+ 위젯 추가', tvPreview: '슬라이드쇼 미리보기', tvPreviewStop: '편집으로 돌아가기', tvSave: 'TV에 저장', tvRevert: '저장된 상태로 되돌리기', tvDirty: '저장하지 않은 변경이 있어요', tvSaved: '저장했어요 — TV에 곧 반영돼요', tvAddPage: '+ 화면 추가', tvSettings: 'TV 설정', sTheme: '색 테마', sLang: 'TV 언어', sRefresh: '새로 가져오는 주기(초)', sReload: '완전 새로고침 간격(시간)', sWeather: '날씨 위치 이름 / 좌표', themeDark: '진한 청록', themeLight: '밝은 화면', langEn: 'English', langKo: '한국어', langBoth: '한·영 함께',
      pageSettings: '이 화면 설정', pName: '이름', pSecs: '표시 시간(초)', pMoveL: '◀ 앞으로', pMoveR: '뒤로 ▶', pDup: '복제', pDel: '화면 삭제', wSettings: '위젯 설정', wHelp: '위젯을 클릭하면 글자 크기·한 번에 보이는 개수·넘어가는 시간을 정할 수 있어요. 끌어서 옮기고, 오른쪽 아래 모서리로 크기를 바꿔요.', wFont: '글자 크기', wAuto: '자동 (칸에 맞춤)', wManual: '직접 정하기', wCount: '한 번에 보이는 개수', wSecs: '넘어가는 시간(초)', wCompact: '간단히 보기', wTitle: '제목 줄 표시', wDup: '위젯 복제', wDel: '빼기',
      ntTitle: '팀 공지 (TV의 Team Announcements)', ntAdd: '+ 공지 추가', ntHelp: '여기서 쓰고 켜 둔 공지만 TV에 나와요. 한국어/영어를 같이 적으면 TV 언어에 맞게 보여요.', ntMsg: '공지 (한국어)', ntMsgEn: '공지 (English)', ntActive: 'TV에 표시', ntEmpty: '등록된 공지가 없어요.', adminOnly: 'TV 화면 배치와 주소는 관리자만 바꿀 수 있어요. 공지는 캠프팀 팀원이 관리해요.', noSpace: '남은 자리가 없어요. 다른 위젯 크기를 줄이거나 빼고 다시 추가하세요.', delPage: '이 화면을 삭제할까요?', save: '저장', cancel: '취소', edit: '수정', del: '삭제', confirmDel: '삭제할까요? (삭제 표시만 되며 복구할 수 있어요)', lang: 'ko', alreadyOn: '이 화면에 이미 있음 · 하나 더', new_: '새로 추가' },
    en: { tvTitle: 'TV Dashboard', tvSub: 'Design what the office TV shows and manage team announcements', tvLink: 'TV link', tvLinkHelp: 'Open the address below once in a TV browser such as TV Bro and bookmark it or set it as the start page. After that, changes made in the portal appear on the TV automatically. This link never shows amounts or emails, but anyone who knows it can see the TV content. If it leaks, press "New link" (the old one stops immediately).', tvCopy: 'Copy link', tvOpen: 'Open TV view', tvRotate: 'New link', tvCopied: 'Copied', tvRotateConfirm: 'Creating a new link stops the current TV link immediately. You must open the new link on the TV. Continue?',
      tvAdd: '+ Add widget', tvPreview: 'Slideshow preview', tvPreviewStop: 'Back to editing', tvSave: 'Save to TV', tvRevert: 'Revert to saved', tvDirty: 'You have unsaved changes', tvSaved: 'Saved — the TV will update shortly', tvAddPage: '+ Add screen', tvSettings: 'TV settings', sTheme: 'Color theme', sLang: 'TV language', sRefresh: 'Refresh interval (sec)', sReload: 'Full reload interval (hours)', sWeather: 'Weather location name / coordinates', themeDark: 'Deep teal', themeLight: 'Light', langEn: 'English', langKo: 'Korean', langBoth: 'Both',
      pageSettings: 'Screen settings', pName: 'Name', pSecs: 'Show for (sec)', pMoveL: '◀ Earlier', pMoveR: 'Later ▶', pDup: 'Duplicate', pDel: 'Delete screen', wSettings: 'Widget settings', wHelp: 'Click a widget to set font size, items shown at once and rotation time. Drag to move; drag the bottom-right corner to resize.', wFont: 'Font size', wAuto: 'Auto (fit)', wManual: 'Manual', wCount: 'Items shown at once', wSecs: 'Rotate every (sec)', wCompact: 'Compact', wTitle: 'Show title row', wDup: 'Duplicate widget', wDel: 'Remove',
      ntTitle: 'Team announcements (TV)', ntAdd: '+ Add announcement', ntHelp: 'Only active announcements written here appear on the TV. If you add Korean and English, the TV shows the one matching its language.', ntMsg: 'Announcement (Korean)', ntMsgEn: 'Announcement (English)', ntActive: 'Show on TV', ntEmpty: 'No announcements.', adminOnly: 'Only admins can change the TV layout and link. Announcements are managed by camp team members.', noSpace: 'No room left. Shrink or remove another widget and add again.', delPage: 'Delete this screen?', save: 'Save', cancel: 'Cancel', edit: 'Edit', del: 'Delete', confirmDel: 'Delete this? (It is only marked deleted and can be restored.)', lang: 'en', alreadyOn: 'Already on this screen · add another', new_: 'Add' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, TC = window.TVCore;
  var S = { layout: null, saved: null, settings: {}, res: null, cur: 0, sel: null, dirty: false, preview: false, idx: {}, show: { page: 0, start: 0, rot: {} } };
  var uid = function (t) { return t + '-' + Math.random().toString(36).slice(2, 7); };
  var clone = function (o) { return JSON.parse(JSON.stringify(o)); };
  var wname = function (t) { return TC.T[t][CT.lang() === 'en' ? 'en' : 'ko']; };
  var page = function () { return S.layout.pages[S.preview ? S.show.page : S.cur]; };
  var ctx = function () { var st = Object.assign({}, S.res.settings, S.settings); return { data: S.res.data, settings: st, lang: st.language || 'en', today: S.res.today, idx: S.preview ? S.idx : {}, weather: null }; };
  var hit = function (a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; };
  var free = function (r, ignore) { return r.x >= 0 && r.y >= 0 && r.x + r.w <= 16 && r.y + r.h <= 9 && !page().items.some(function (o) { return o.uid !== ignore && hit(r, o); }); };
  function dirty(v) { S.dirty = v; $('tvDirty').textContent = v ? CT.t('tvDirty') : ''; }

  /* ---------- 그리기 ---------- */
  function extra(el, it) {
    if (S.preview) return; if (S.sel === it.uid) el.classList.add('sel');
    el.insertAdjacentHTML('beforeend', '<div class="tvlbl">' + esc(wname(it.type)) + '</div><div class="tvtool"><button data-x title="x">✕</button></div><div class="tvrs"></div>');
  }
  function draw() {
    var cv = $('tvcanvas'), box = $('tvedit').parentNode; $('tvedit').classList.toggle('editing', !S.preview);
    cv.className = 'tvc ' + ((S.settings.theme || (S.res && S.res.settings.theme)) === 'light' ? 'tv-light' : 'tv-dark'); $('tvedit').classList.toggle('tv-light', cv.classList.contains('tv-light'));
    TC.sizeBox(cv, Math.max(300, box.clientWidth - 24), 560); if (!S.res) return;
    TC.mount(cv, page(), ctx(), extra); tabs(); inspector();
  }
  function tabs() {
    $('pageTabs').innerHTML = S.layout.pages.map(function (p, i) { return '<button class="tab ' + (i === S.cur ? 'on' : '') + '" data-pg="' + i + '">' + esc(p.name) + ' <small>' + p.secs + 's</small></button>'; }).join('') + '<button class="tab" data-addpg>' + esc(CT.t('tvAddPage')) + '</button>';
  }
  function inspector() {
    var p = S.layout.pages[S.cur], it = p.items.filter(function (x) { return x.uid === S.sel; })[0], o = it ? it.opts : {}, d = it ? TC.T[it.type] : null;
    var h = '<section class="card" style="margin-bottom:10px"><h2 style="font-size:14px">' + esc(CT.t('pageSettings')) + '</h2><div class="form"><label>' + esc(CT.t('pName')) + '<input data-pk="name" maxlength="30" value="' + esc(p.name) + '"></label><label>' + esc(CT.t('pSecs')) + '<input data-pk="secs" type="number" min="5" max="600" value="' + p.secs + '"></label>' +
      '<div class="actions"><button class="btn sm" data-mv="-1">' + esc(CT.t('pMoveL')) + '</button><button class="btn sm" data-mv="1">' + esc(CT.t('pMoveR')) + '</button><button class="btn sm" data-dup>' + esc(CT.t('pDup')) + '</button><button class="btn sm danger" data-delpg ' + (S.layout.pages.length < 2 ? 'disabled' : '') + '>' + esc(CT.t('pDel')) + '</button></div></div></section>';
    if (!it) return void ($('tvInspector').innerHTML = h + '<div class="hintbox">' + esc(CT.t('wHelp')) + '</div>');
    var auto = !o.fs; h += '<section class="card"><h2 style="font-size:14px">' + esc(wname(it.type)) + '</h2><div class="form"><label>' + esc(CT.t('wFont')) + '<select data-ok="fsmode"><option value="auto"' + (auto ? ' selected' : '') + '>' + esc(CT.t('wAuto')) + '</option><option value="man"' + (auto ? '' : ' selected') + '>' + esc(CT.t('wManual')) + '</option></select></label>' + (auto ? '' : '<label><input type="range" min="40" max="260" step="5" data-ok="fs" value="' + o.fs + '"> ' + o.fs + '%</label>');
    if (d.list) h += '<label>' + esc(CT.t('wCount')) + '<select data-ok="n"><option value="0">' + esc(CT.t('wAuto')) + '</option>' + [1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map(function (n) { return '<option value="' + n + '"' + (o.n === n ? ' selected' : '') + '>' + n + '</option>'; }).join('') + '</select></label><label>' + esc(CT.t('wSecs')) + '<input type="number" min="3" max="120" data-ok="secs" value="' + (o.secs || 10) + '"></label>' +
      '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-ok="compact"' + (o.compact ? ' checked' : '') + ' style="width:auto;height:auto"> ' + esc(CT.t('wCompact')) + '</label><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" data-ok="title"' + (o.noTitle ? '' : ' checked') + ' style="width:auto;height:auto"> ' + esc(CT.t('wTitle')) + '</label>';
    h += '<div class="actions"><button class="btn sm" data-dupw>' + esc(CT.t('wDup')) + '</button><button class="btn sm danger" data-delw>' + esc(CT.t('wDel')) + '</button></div></div></section>';
    $('tvInspector').innerHTML = h;
  }

  /* ---------- 위젯 추가 / 편집 ---------- */
  function buildMenu() {
    $('tvMenu').innerHTML = Object.keys(TC.T).map(function (k) { var has = S.layout.pages[S.cur].items.some(function (i) { return i.type === k; });
      return '<div class="mi ' + (has ? 'has' : '') + '" data-add="' + k + '">' + esc(wname(k)) + '<small>' + (has ? esc(CT.t('alreadyOn')) : esc(CT.t('new_'))) + '</small></div>'; }).join('');
  }
  function addWidget(type, opts) {
    var d = TC.T[type], p = S.layout.pages[S.cur];
    for (var s = 0; s < 2; s++) { var w = s ? d.min[0] : d.size[0], h = s ? d.min[1] : d.size[1];
      for (var y = 0; y <= 9 - h; y++) for (var x = 0; x <= 16 - w; x++) { var r = { x: x, y: y, w: w, h: h }; if (free(r, null)) { var it = Object.assign({ uid: uid(type), type: type, opts: opts || {} }, r); p.items.push(it); S.sel = it.uid; dirty(true); draw(); return; } } }
    alert(CT.t('noSpace'));
  }

  /* 끌기·크기 조절 */
  var act = null;
  $('tvcanvas').addEventListener('pointerdown', function (e) {
    if (S.preview) return; var el = e.target.closest('.tvw'); if (!el) return; var p = S.layout.pages[S.cur], it = p.items.filter(function (i) { return i.uid === el.getAttribute('data-uid'); })[0];
    if (e.target.closest('[data-x]')) { p.items = p.items.filter(function (i) { return i !== it; }); if (S.sel === it.uid) S.sel = null; dirty(true); draw(); return; }
    var r = $('tvcanvas').getBoundingClientRect(); act = { el: el, it: it, mode: e.target.classList.contains('tvrs') ? 'resize' : 'move', sx: e.clientX, sy: e.clientY, cw: r.width / 16, ch: r.height / 9, o: { x: it.x, y: it.y, w: it.w, h: it.h }, cur: null, moved: false };
    el.classList.add('drag'); el.setPointerCapture(e.pointerId); e.preventDefault();
  });
  $('tvcanvas').addEventListener('pointermove', function (e) {
    if (!act) return; var dx = Math.round((e.clientX - act.sx) / act.cw), dy = Math.round((e.clientY - act.sy) / act.ch), o = act.o; if (dx || dy) act.moved = true; var r;
    if (act.mode === 'move') r = { x: TC.clamp(o.x + dx, 0, 16 - o.w), y: TC.clamp(o.y + dy, 0, 9 - o.h), w: o.w, h: o.h };
    else { var m = TC.T[act.it.type].min; r = { x: o.x, y: o.y, w: TC.clamp(o.w + dx, m[0], 16 - o.x), h: TC.clamp(o.h + dy, m[1], 9 - o.y) }; }
    act.cur = r; TC.place(act.el, r); act.el.classList.toggle('bad', !free(r, act.it.uid));
  });
  function endAct() { if (!act) return; var a = act; act = null; if (a.moved && a.cur && free(a.cur, a.it.uid)) { Object.assign(a.it, a.cur); dirty(true); } S.sel = a.it.uid; draw(); }
  $('tvcanvas').addEventListener('pointerup', endAct); $('tvcanvas').addEventListener('pointercancel', endAct);

  $('tvInspector').addEventListener('input', function (e) {
    var t = e.target, p = S.layout.pages[S.cur], it = p.items.filter(function (i) { return i.uid === S.sel; })[0];
    if (t.dataset.pk) { p[t.dataset.pk] = t.dataset.pk === 'secs' ? TC.clamp(Number(t.value) || 30, 5, 600) : t.value; dirty(true); tabs(); return; }
    if (!it || !t.dataset.ok) return; if (t.dataset.ok === 'fs') { it.opts.fs = Number(t.value); t.parentNode.lastChild.textContent = ' ' + it.opts.fs + '%'; } else if (t.dataset.ok === 'secs') it.opts.secs = TC.clamp(Number(t.value) || 10, 3, 120);
    dirty(true); TC.rerender($('tvcanvas'), it, ctx(), extra);
  });
  $('tvInspector').addEventListener('change', function (e) {
    var t = e.target, p = S.layout.pages[S.cur], it = p.items.filter(function (i) { return i.uid === S.sel; })[0]; if (!it || !t.dataset.ok) return; var o = it.opts, k = t.dataset.ok;
    if (k === 'fsmode') { if (t.value === 'man') o.fs = Math.round(TC.baseScale(it) * 100 / 5) * 5; else delete o.fs; } else if (k === 'n') { Number(t.value) ? o.n = Number(t.value) : delete o.n; } else if (k === 'compact') { t.checked ? o.compact = 1 : delete o.compact; } else if (k === 'title') { t.checked ? delete o.noTitle : o.noTitle = 1; }
    dirty(true); draw();
  });
  $('tvInspector').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return; var L = S.layout, p = L.pages[S.cur], d = b.dataset;
    if (d.mv) { var j = S.cur + Number(d.mv); if (j >= 0 && j < L.pages.length) { var tmp = L.pages[S.cur]; L.pages[S.cur] = L.pages[j]; L.pages[j] = tmp; S.cur = j; dirty(true); draw(); } }
    else if ('dup' in d) { var c = clone(p); c.id = uid('p'); c.name += ' 2'; c.items.forEach(function (i) { i.uid = uid(i.type); }); L.pages.splice(S.cur + 1, 0, c); S.cur++; dirty(true); draw(); }
    else if ('delpg' in d) { if (confirm(CT.t('delPage'))) { L.pages.splice(S.cur, 1); S.cur = Math.max(0, S.cur - 1); S.sel = null; dirty(true); draw(); } }
    else if ('delw' in d) { p.items = p.items.filter(function (i) { return i.uid !== S.sel; }); S.sel = null; dirty(true); draw(); }
    else if ('dupw' in d) { var it = p.items.filter(function (i) { return i.uid === S.sel; })[0]; if (it) addWidget(it.type, clone(it.opts)); }
  });
  $('pageTabs').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if ('addpg' in b.dataset) { S.layout.pages.push({ id: uid('p'), name: 'Screen ' + (S.layout.pages.length + 1), secs: 20, items: [] }); S.cur = S.layout.pages.length - 1; S.sel = null; dirty(true); draw(); }
    else if (b.dataset.pg != null) { S.cur = Number(b.dataset.pg); S.sel = null; draw(); }
  });
  $('tvAdd').addEventListener('click', function (e) { e.stopPropagation(); buildMenu(); $('tvMenu').classList.toggle('open'); });
  document.addEventListener('click', function () { $('tvMenu').classList.remove('open'); });
  $('tvMenu').addEventListener('click', function (e) { var m = e.target.closest('[data-add]'); if (m) addWidget(m.dataset.add); });

  /* ---------- 저장 / 설정 / 주소 ---------- */
  async function save() {
    try { await CT.api('/api/campteam/tv-config', { method: 'PUT', body: { layout: S.layout } }); S.saved = clone(S.layout); dirty(false); $('tvDirty').textContent = CT.t('tvSaved'); }
    catch (e) { alert(e.message); }
  }
  function urlUpdate() { var u = location.origin + '/tv/?t=' + (S.settings.token || ''); $('tvUrl').textContent = u; $('tvOpen').href = u; }
  async function loadAdmin() {
    var cfg = await CT.api('/api/campteam/tv-config'); S.layout = cfg.layout; S.saved = clone(cfg.layout); S.settings = cfg.settings; urlUpdate();
    S.res = await (await fetch('/api/campteam/tv-data?t=' + encodeURIComponent(cfg.settings.token), { cache: 'no-store' })).json();
    var f = $('tvSetForm'); f.theme.innerHTML = '<option value="dark">' + esc(CT.t('themeDark')) + '</option><option value="light">' + esc(CT.t('themeLight')) + '</option>'; f.language.innerHTML = '<option value="en">' + esc(CT.t('langEn')) + '</option><option value="ko">' + esc(CT.t('langKo')) + '</option><option value="both">' + esc(CT.t('langBoth')) + '</option>';
    ['theme', 'language', 'refreshSec', 'reloadHours', 'weatherLabel', 'weatherLat', 'weatherLon'].forEach(function (k) { f[k].value = cfg.settings[k] || ''; });
    draw();
  }
  $('tvSave').onclick = save; $('tvRevert').onclick = function () { if (!S.dirty || confirm(CT.t('tvRevert') + '?')) { S.layout = clone(S.saved); S.cur = 0; S.sel = null; dirty(false); draw(); } };
  $('tvCopy').onclick = function () { var u = $('tvUrl').textContent; (navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { alert(CT.t('tvCopied')); }, function () { var r = document.createRange(); r.selectNodeContents($('tvUrl')); var s = getSelection(); s.removeAllRanges(); s.addRange(r); }); };
  $('tvRotate').onclick = async function () { if (!confirm(CT.t('tvRotateConfirm'))) return; try { var r = await CT.api('/api/campteam/tv-config', { method: 'POST', body: { action: 'rotate' } }); S.settings.token = r.token; urlUpdate(); S.res = await (await fetch('/api/campteam/tv-data?t=' + encodeURIComponent(r.token), { cache: 'no-store' })).json(); } catch (e) { alert(e.message); } };
  $('tvSetForm').onsubmit = async function (e) { e.preventDefault(); var f = $('tvSetForm'), b = {}; ['theme', 'language', 'refreshSec', 'reloadHours', 'weatherLabel', 'weatherLat', 'weatherLon'].forEach(function (k) { b[k] = f[k].value; }); $('tvSetErr').hidden = true;
    try { await CT.api('/api/campteam/tv-config', { method: 'PUT', body: { settings: b } }); Object.assign(S.settings, b); draw(); alert(CT.t('tvSaved')); } catch (err) { $('tvSetErr').textContent = err.message; $('tvSetErr').hidden = false; } };

  /* 슬라이드쇼 미리보기: TV 와 같이 목록은 설정한 시간마다 넘어가고, 화면도 시간이 되면 바뀐다 */
  var timer = null;
  $('tvPreview').onclick = function () {
    S.preview = !S.preview; $('tvPreview').textContent = CT.t(S.preview ? 'tvPreviewStop' : 'tvPreview'); clearInterval(timer);
    if (S.preview) { S.show = { page: S.cur, start: Date.now(), rot: {} }; S.idx = {}; draw(); timer = setInterval(function () {
      var now = Date.now(), p = page(), c = ctx(); p.items.forEach(function (it) { if (TC.T[it.type].list && TC.pagesOf(it, c) > 1 && now - (S.show.rot[it.uid] || (S.show.rot[it.uid] = now)) >= ((it.opts.secs || 10) * 1000)) { S.show.rot[it.uid] = now; S.idx[it.uid] = (S.idx[it.uid] || 0) + 1; TC.rerender($('tvcanvas'), it, ctx()); } });
      if (now - S.show.start >= p.secs * 1000 && S.layout.pages.length > 1) { S.show.page = (S.show.page + 1) % S.layout.pages.length; S.show.start = now; S.idx = {}; S.show.rot = {}; draw(); } }, 1000); } else draw();
  };
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } }); window.addEventListener('resize', function () { if (S.res) draw(); });

  /* ---------- 팀 공지 ---------- */
  var notices = [], canWrite = false;
  async function loadNotices() { var r = await CT.api('/api/campteam/notices'); notices = r.items; canWrite = !!(r.perms.areas && r.perms.areas.camps === 'edit'); $('ntAdd').hidden = !canWrite; renderNotices(); }
  function renderNotices() {
    $('ntList').innerHTML = notices.length ? notices.map(function (n) { var t = CT.lang() === 'en' ? (n.messageEn || n.message) : (n.message || n.messageEn);
      return '<div class="row"><div>' + esc(t) + (n.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '<small>' + (n.active ? '' : '(hidden) ') + esc(n.messageEn && CT.lang() !== 'en' ? n.messageEn : '') + '</small></div><div class="actions"><span class="chip ' + (n.active ? 'ok' : 'gray') + '">' + esc(n.active ? 'ON' : 'OFF') + '</span>' +
        (canWrite ? '<button class="btn sm" data-ne="' + esc(n.id) + '">' + esc(CT.t('edit')) + '</button><button class="btn sm danger" data-nd="' + esc(n.id) + '">' + esc(CT.t('del')) + '</button>' : '') + '</div></div>'; }).join('') : '<div class="empty">' + esc(CT.t('ntEmpty')) + '</div>';
  }
  function noticeForm(n) {
    CT.ask(CT.t(n ? 'edit' : 'ntAdd'), '<label>' + esc(CT.t('ntMsg')) + '<textarea name="message" maxlength="300">' + esc(n ? n.message : '') + '</textarea></label><label>' + esc(CT.t('ntMsgEn')) + '<textarea name="messageEn" maxlength="300">' + esc(n ? n.messageEn : '') + '</textarea></label><label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="active" value="1" style="width:auto;height:auto"' + (!n || n.active ? ' checked' : '') + '> ' + esc(CT.t('ntActive')) + '</label>',
      async function (fd) { var body = { message: fd.message, messageEn: fd.messageEn, active: !!fd.active }; if (n) await CT.api('/api/campteam/notices?id=' + encodeURIComponent(n.id), { method: 'PATCH', body: body }); else await CT.api('/api/campteam/notices', { method: 'POST', body: body }); await loadNotices(); });
  }
  $('ntAdd').onclick = function () { noticeForm(); };
  $('ntList').addEventListener('click', async function (e) { var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ne) noticeForm(notices.filter(function (x) { return x.id === b.dataset.ne; })[0]);
    else if (b.dataset.nd && confirm(CT.t('confirmDel'))) { try { await CT.api('/api/campteam/notices?id=' + encodeURIComponent(b.dataset.nd), { method: 'DELETE' }); await loadNotices(); } catch (err) { alert(err.message); } } });

  CT.boot(async function (me) {
    CT.applyI18n();
    try { await loadNotices(); if (me.perms.manageMembers) { $('adminPart').hidden = false; await loadAdmin(); } else $('ntList').insertAdjacentHTML('beforebegin', '<div class="hintbox" style="margin-bottom:10px">' + esc(CT.t('adminOnly')) + '</div>'); }
    catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    document.addEventListener('ct-lang', function () { CT.applyI18n(); renderNotices(); if (S.res) draw(); });
  });
})();
