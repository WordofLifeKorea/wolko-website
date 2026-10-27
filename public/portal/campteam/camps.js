(function () {
  CT.addDict({
    ko: { fltYear: '연도', fltSeason: '시즌', allYears: '전체 연도', fltReset: '필터 해제', fltNoOrder: '필터를 켜 둔 동안은 순서를 바꿀 수 없어요.', fltEmpty: '조건에 맞는 캠프가 없어요.', fYear: '연도 (예: 2027)', fSeason: '시즌 (여름·겨울·봄·가을, 또는 직접 입력)', allSeasons: '모든 시즌', yearTbd: '연도 미정', seasonTbd: '시즌 미정', addYear: '+ 연도 추가', yearPrompt: '추가할 연도를 숫자로 입력하세요 (예: 2028)\n그 연도에 캠프를 추가하면 계속 보여요.', yearEmpty: '이 연도에는 아직 캠프가 없어요. 「+ 행사」에서 연도를 넣어 추가하세요.', inactiveN: '비활성 ', inactiveUnit: '개', sNameSummer: '여름', firstTitle: '아직 등록된 캠프가 없어요', firstBody: '먼저 위의 「+ 캠프 유형」으로 캠프 종류(예: Unity Camp, Winter Camp)를 만들고, 그 안에 「+ 행사」로 올해 캠프를 추가하세요. 그러면 업무·달력·자료가 캠프별로 정리돼요.', firstBodyView: '캠프팀 팀원이 캠프를 등록하면 여기에 나와요.', ordReset: '기본 순서로 되돌리기', ordDefault: '이 순서를 모두의 기본으로', ordSaved: '내 순서를 저장했어요', ordSavedDefault: '모두의 기본 순서로 저장했어요', ordResetDone: '기본 순서로 돌아왔어요', ordDefaultAsk: '지금 순서를 모두에게 보이는 기본 순서로 저장할까요? (자기 순서를 바꾼 사람은 그대로 유지돼요)', ordHint: '카드를 잡고 끌어서 순서를 바꿔요. 바꾼 순서는 내 화면에만 적용돼요.', campsTitle: '캠프별 공간', campsSub: '캠프 유형(전체 기록)과 개별 행사(준비 자료)를 구분해서 관리해요', addType: '+ 캠프 유형', addCamp: '+ 행사', noCamps: '아직 등록된 행사가 없어요.', typeFormTitle: '캠프 유형', campFormTitle: '개별 행사', fNameKo: '이름 (한국어)', fNameEn: '이름 (English)', fDesc: '설명', fType: '캠프 유형', fStart: '시작일', fEnd: '종료일', fStatus: '상태', fLocation: '장소', fNotes: '메모',
      planning: '준비 중', active: '진행 중', done: '종료', canceled: '취소', dateTbd: '날짜 미정', tasksDone: '업무 완료', viewOnly: '조회만 가능한 계정이에요. 수정은 캠프팀 팀원이 할 수 있어요.', saved: '저장했어요', needType: '먼저 캠프 유형을 만들어 주세요.' },
    en: { fltYear: 'Year', fltSeason: 'Season', allYears: 'All years', fltReset: 'Clear filter', fltNoOrder: 'Order can’t be changed while a filter is on.', fltEmpty: 'No camps match.', fYear: 'Year (e.g. 2027)', fSeason: 'Season (Summer, Winter, Spring, Fall, or type your own)', allSeasons: 'All seasons', yearTbd: 'Year TBD', seasonTbd: 'Season TBD', addYear: '+ Add year', yearPrompt: 'Enter the year to add (e.g. 2028).\nIt stays visible once a camp is added to that year.', yearEmpty: 'No camps in this year yet. Use “+ Event” and set the year.', inactiveN: 'Inactive ', inactiveUnit: '', sNameSummer: 'Summer', firstTitle: 'No camps yet', firstBody: 'Start with “+ Camp type” above (e.g. Unity Camp, Winter Camp), then add this year’s camp with “+ Event”. Tasks, calendar and files are then organized by camp.', firstBodyView: 'Camps will appear here once a camp team member adds them.', ordReset: 'Reset to default order', ordDefault: 'Make this the default for everyone', ordSaved: 'Saved your order', ordSavedDefault: 'Saved as the default order for everyone', ordResetDone: 'Back to the default order', ordDefaultAsk: 'Save the current order as the default everyone sees? (People who changed their own order keep theirs)', ordHint: 'Grab a card and drag it to reorder. Your order applies to your screen only.', campsTitle: 'Camp Spaces', campsSub: 'Camp types (full history) and individual events (preparation) are kept separate', addType: '+ Camp type', addCamp: '+ Event', noCamps: 'No events yet.', typeFormTitle: 'Camp type', campFormTitle: 'Event', fNameKo: 'Name (Korean)', fNameEn: 'Name (English)', fDesc: 'Description', fType: 'Camp type', fStart: 'Start date', fEnd: 'End date', fStatus: 'Status', fLocation: 'Location', fNotes: 'Notes',
      planning: 'Planning', active: 'Active', done: 'Done', canceled: 'Canceled', dateTbd: 'Date TBD', tasksDone: 'tasks done', viewOnly: 'View-only account. Camp team members can edit.', saved: 'Saved', needType: 'Create a camp type first.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var data = null, canWrite = false;
  var STATUSES = ['planning', 'active', 'done', 'canceled'];
  var SEASONS = [['여름', 'Summer'], ['겨울', 'Winter'], ['봄', 'Spring'], ['가을', 'Fall']];
  var V = { year: ls('ct-camps-year') || '', season: '' };
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { /* 저장 못 해도 동작에는 영향 없음 */ } return null; }
  function seasonKey(s) { s = String(s || '').trim(); if (!s) return ''; var l = s.toLowerCase(); if (l === 'autumn') return '가을'; for (var i = 0; i < SEASONS.length; i++) if (SEASONS[i][0] === s || SEASONS[i][1].toLowerCase() === l) return SEASONS[i][0]; return s; }
  function seasonLabel(k) { if (!k) return CT.t('seasonTbd'); for (var i = 0; i < SEASONS.length; i++) if (SEASONS[i][0] === k) return CT.lang() === 'en' ? SEASONS[i][1] : k; return k; }
  function yearOf(c) { if (c.year) return c.year; return c.startDate ? Number(c.startDate.slice(0, 4)) || null : null; }
  function extraYears() { try { return (JSON.parse(ls('ct-camps-years') || '[]') || []).filter(function (y) { return Number.isInteger(y); }); } catch (e) { return []; } }
  function flatCamps() { var o = []; data.types.forEach(function (t) { t.camps.forEach(function (c) { o.push({ c: c, t: t }); }); }); return o; }

  // ── 순서: 내 순서(바꾼 사람만) → 모두의 기본 순서 → 원래 순서 ──
  var ORD = { default: null, mine: null, canEditDefault: false };
  function sortBy(list, ids, key) {
    if (!ids || !ids.length) return list.slice();
    var pos = {}; ids.forEach(function (id, i) { pos[id] = i; });
    return list.map(function (x, i) { return { x: x, i: i }; }).sort(function (a, b) { var pa = pos[a.x[key]], pb = pos[b.x[key]]; if (pa == null && pb == null) return a.i - b.i; if (pa == null) return 1; if (pb == null) return -1; return pa - pb; }).map(function (o) { return o.x; });
  }
  function orderedTypes() { var o = ORD.mine || ORD.default; return sortBy(data.types, o && o.types, 'id'); }
  function orderedCamps(t) { var o = ORD.mine || ORD.default; return sortBy(t.camps, o && o.camps && o.camps[t.id], 'id'); }

  function campRow(c, t, flat) {
    var pc = c.taskTotal ? Math.round(c.taskDone / c.taskTotal * 100) : 0, dates = c.startDate ? esc(c.startDate) + (c.endDate ? ' ~ ' + esc(c.endDate) : '') : esc(CT.t('dateTbd'));
    return '<div class="camp-row"' + (flat ? '' : ' data-drag="camp"') + ' data-camp="' + esc(c.id) + '" data-href="/portal/campteam/space/?id=' + esc(c.id) + '"><div class="nm"><a href="/portal/campteam/space/?id=' + esc(c.id) + '"><b>' + esc(CT.pick(c, 'name')) + '</b></a>' + tagHtml(c, t, flat) + (c.isTest && !t.isTest ? '<span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '<span class="meta">' + esc(c.location || '') + '</span></div>' +
      '<div class="cdate">' + dates + '<br><span class="status ' + esc(c.status) + '">' + esc(CT.t(c.status)) + '</span></div>' +
      (c.taskTotal == null ? '<div class="cprog"></div>' : '<div class="cprog"><div class="bar"><i style="width:' + pc + '%"></i></div><span class="meta">' + c.taskDone + '/' + c.taskTotal + ' ' + esc(CT.t('tasksDone')) + (c.taskInactive ? ' · ' + esc(CT.t('inactiveN')) + c.taskInactive + esc(CT.t('inactiveUnit')) : '') + '</span></div>') +
      '<div class="actions">' + (canWrite ? '<button class="btn sm" data-edit-camp="' + esc(c.id) + '">' + esc(CT.t('edit')) + '</button><button class="btn sm danger" data-del="camp:' + esc(c.id) + '">' + esc(CT.t('del')) + '</button>' : '') + '</div></div>';
  }
  // 연도·시즌 표시: 캠프 이름 옆에 "2027 겨울"
  function tagHtml(c) {
    var y = yearOf(c), k = seasonKey(c.season), label = [y || '', k ? seasonLabel(k) : ''].join(' ').trim();
    return label ? ' <span class="chip gray">' + esc(label) + '</span>' : '';
  }
  // 위쪽 필터: 연도(선택 칸) → 시즌(알약). 아래 유형별 목록에 걸리며, 순서를 바꾸는 것과는 별개다
  function filtering() { return V.year !== '' || V.season !== ''; }
  function matches(c) { return (V.year === '' || String(yearOf(c) || 'none') === V.year) && (V.season === '' || (seasonKey(c.season) || '__none') === V.season); }
  function filterBar() {
    var el = $('filterBar'); if (!el) return;
    if (!data.types.length) { el.innerHTML = ''; return; }
    var all = flatCamps(), set = {}; all.forEach(function (x) { set[yearOf(x.c) || 'none'] = (set[yearOf(x.c) || 'none'] || 0) + 1; }); extraYears().forEach(function (y) { if (!set[y]) set[y] = 0; });
    var years = Object.keys(set).filter(function (k) { return k !== 'none'; }).map(Number).sort(function (a, b) { return b - a; });
    if (V.year !== '' && V.year !== 'none' && years.indexOf(Number(V.year)) < 0) V.year = '';
    if (V.year === 'none' && !set.none) V.year = '';
    var inYear = all.filter(function (x) { return V.year === '' || String(yearOf(x.c) || 'none') === V.year; }), present = {};
    inYear.forEach(function (x) { present[seasonKey(x.c.season) || '__none'] = 1; });
    var order = SEASONS.map(function (x) { return x[0]; }).filter(function (k) { return present[k]; }).concat(Object.keys(present).filter(function (k) { return k !== '__none' && SEASONS.every(function (x) { return x[0] !== k; }); }).sort(), present.__none ? ['__none'] : []);
    if (V.season !== '' && order.indexOf(V.season) < 0) V.season = '';
    var opt = function (v, label) { return '<option value="' + v + '"' + (V.year === v ? ' selected' : '') + '>' + esc(label) + '</option>'; };
    var sel = '<select id="fYearSel" aria-label="' + esc(CT.t('fltYear')) + '">' + opt('', CT.t('allYears')) + years.map(function (y) { return opt(String(y), y + ' (' + set[y] + ')'); }).join('') + (set.none ? opt('none', CT.t('yearTbd') + ' (' + set.none + ')') : '') + '</select>';
    var pills = order.length ? '<div class="pills">' + '<button type="button" class="pill' + (V.season === '' ? ' on' : '') + '" data-season="">' + esc(CT.t('allSeasons')) + '</button>' + order.map(function (k) { return '<button type="button" class="pill' + (V.season === k ? ' on' : '') + '" data-season="' + esc(k) + '">' + esc(k === '__none' ? CT.t('seasonTbd') : seasonLabel(k)) + '</button>'; }).join('') + '</div>' : '';
    el.innerHTML = '<div class="filterbox"><label>' + esc(CT.t('fltYear')) + sel + '</label><button type="button" class="linkbtn" id="addYear">' + esc(CT.t('addYear')) + '</button>' + (order.length ? '<span class="fsep"></span><span class="flabel">' + esc(CT.t('fltSeason')) + '</span>' + pills : '') + (filtering() ? '<button type="button" class="linkbtn" id="fltReset">' + esc(CT.t('fltReset')) + '</button>' : '') + '</div>';
  }
  function render() {
    filterBar();
    $('viewOnly').hidden = canWrite;
    $('addType').hidden = $('addCamp').hidden = !canWrite;
    var hasTypes = orderedTypes().length > 0, F = filtering(), oh = document.querySelector('.ordhint'); if (oh) { oh.hidden = !hasTypes; oh.textContent = CT.t(F ? 'fltNoOrder' : 'ordHint'); }
    if (!hasTypes) { $('list').innerHTML = '<div class="card firstuse"><h2>' + esc(CT.t('firstTitle')) + '</h2><p>' + esc(CT.t(canWrite ? 'firstBody' : 'firstBodyView')) + '</p></div>'; $('ordTools').innerHTML = ''; return; }
    var shown = 0;
    $('list').innerHTML = orderedTypes().map(function (t) {
      var mine = F ? orderedCamps(t).filter(matches) : orderedCamps(t); if (F && !mine.length) return ''; shown++;
      var rows = mine.length ? '<div class="camps-in" data-group="' + esc(t.id) + '">' + mine.map(function (c) { return campRow(c, t, F); }).join('') + '</div>' : '<div class="empty">' + esc(CT.t('noCamps')) + '</div>';
      return '<section class="card type-card"' + (F ? '' : ' data-drag="type"') + ' data-type="' + esc(t.id) + '"><div class="type-head"><div><h2><a href="/portal/campteam/space/?typeId=' + esc(t.id) + '">' + esc(CT.pick(t, 'name')) + '</a>' + (t.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '</h2><div class="meta">' + esc(t.description || '') + '</div></div>' +
        (canWrite ? '<div class="actions"><button class="btn sm" data-edit-type="' + esc(t.id) + '">' + esc(CT.t('edit')) + '</button><button class="btn sm danger" data-del="type:' + esc(t.id) + '">' + esc(CT.t('del')) + '</button></div>' : '') + '</div>' + rows + '</section>';
    }).join('') || '<div class="card"><div class="empty">' + esc(CT.t('fltEmpty')) + '</div></div>';
    var tools = [];
    if (ORD.mine) tools.push('<button type="button" class="linkbtn" id="ordReset">' + esc(CT.t('ordReset')) + '</button>');
    if (ORD.canEditDefault) tools.push('<button type="button" class="linkbtn" id="ordDefault">' + esc(CT.t('ordDefault')) + '</button>');
    $('ordTools').innerHTML = F ? '' : tools.join('') + '<span class="hint" id="ordMsg"></span>';
  }
  function currentOrder() {
    var o = { types: [], camps: {} };
    [].forEach.call($('list').querySelectorAll('.type-card'), function (card) { var id = card.dataset.type; o.types.push(id); o.camps[id] = [].map.call(card.querySelectorAll('.camp-row'), function (r) { return r.dataset.camp; }); });
    return o;
  }
  var msgTimer;
  function say(t) { var m = $('ordMsg'); if (!m) return; m.textContent = t; clearTimeout(msgTimer); msgTimer = setTimeout(function () { var mm = $('ordMsg'); if (mm) mm.textContent = ''; }, 2500); }
  async function saveOrder(scope) {
    var o = currentOrder();
    try { await CT.api('/api/campteam/camp-order', { method: 'PUT', body: { scope: scope, types: o.types, camps: o.camps } }); if (scope === 'mine') ORD.mine = o; else { ORD.default = o; } render(); say(CT.t(scope === 'mine' ? 'ordSaved' : 'ordSavedDefault')); }
    catch (e) { alert(e.message); }
  }

  // ── 끌어서 순서 바꾸기: 마우스는 바로, 터치는 잠깐 꾹 눌렀다가 (스크롤과 구분) ──
  var drag = null, justDragged = false;
  function startDrag() {
    var it = drag.item, r = it.getBoundingClientRect();
    drag.started = true; justDragged = true;
    drag.ph = document.createElement('div'); drag.ph.className = 'drag-ph'; drag.ph.style.height = r.height + 'px'; it.parentNode.insertBefore(drag.ph, it);
    drag.ghost = it.cloneNode(true); drag.ghost.classList.add('drag-ghost'); drag.ghost.style.width = r.width + 'px'; drag.ghost.style.left = r.left + 'px'; drag.ghost.style.top = r.top + 'px'; document.body.appendChild(drag.ghost);
    drag.offX = drag.sx - r.left; drag.offY = drag.sy - r.top; it.style.display = 'none'; document.documentElement.classList.add('dragging');
  }
  function moveDrag(e) {
    drag.ghost.style.left = (e.clientX - drag.offX) + 'px'; drag.ghost.style.top = (e.clientY - drag.offY) + 'px';
    var parent = drag.ph.parentNode, sibs = [].filter.call(parent.children, function (c) { return c !== drag.ph && c !== drag.item && c.hasAttribute('data-drag') && c.dataset.drag === drag.kind; }), y = e.clientY, before = null;
    for (var i = 0; i < sibs.length; i++) { var b = sibs[i].getBoundingClientRect(); if (y < b.top + b.height / 2) { before = sibs[i]; break; } }
    if (before) parent.insertBefore(drag.ph, before); else parent.appendChild(drag.ph);
    var sc = e.clientY < 90 ? -14 : e.clientY > window.innerHeight - 90 ? 14 : 0; if (sc) window.scrollBy(0, sc);   // 가장자리에 가면 화면이 따라 움직인다
  }
  function endDrag(cancel) {
    clearTimeout(drag && drag.timer); if (!drag) return; var d = drag; drag = null; document.documentElement.classList.remove('dragging');
    if (!d.started) return;
    d.ghost.remove(); d.item.style.display = ''; if (!cancel) d.ph.parentNode.insertBefore(d.item, d.ph); d.ph.remove(); setTimeout(function () { justDragged = false; }, 50);
    if (!cancel) saveOrder('mine');
  }
  function wireDrag() {
    var list = $('list');
    list.addEventListener('pointerdown', function (e) {
      if (e.button > 0 || e.target.closest('button,select,input,textarea,.actions')) return;
      var item = e.target.closest('[data-drag="camp"]') || (e.target.closest('.type-head') && e.target.closest('[data-drag="type"]')); if (!item) return;
      drag = { item: item, kind: item.dataset.drag, sx: e.clientX, sy: e.clientY, started: false, touch: e.pointerType === 'touch' };
      if (drag.touch) drag.timer = setTimeout(function () { if (drag && !drag.started) { startDrag(); if (navigator.vibrate) navigator.vibrate(15); } }, 380);
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      if (!drag.started) { var dx = e.clientX - drag.sx, dy = e.clientY - drag.sy; if (Math.hypot(dx, dy) < 8) return; if (drag.touch) { clearTimeout(drag.timer); drag = null; return; } startDrag(); }
      moveDrag(e);
    });
    window.addEventListener('pointerup', function () { endDrag(false); }); window.addEventListener('pointercancel', function () { endDrag(true); });
    document.addEventListener('touchmove', function (e) { if (drag && drag.started) e.preventDefault(); }, { passive: false });
    list.addEventListener('click', function (e) {
      if (justDragged) { e.preventDefault(); e.stopPropagation(); return; }
      var row = e.target.closest('.camp-row'); if (row && !e.target.closest('a,button')) location.href = row.dataset.href;
    }, true);
    list.addEventListener('dragstart', function (e) { e.preventDefault(); });
  }

  async function load() {
    var r = await Promise.all([CT.api('/api/campteam/camps'), CT.api('/api/campteam/camp-order').catch(function () { return null; })]); // 순서를 못 읽어도 원래 순서로 보여 준다
    data = r[0]; canWrite = !!(data.perms.areas && data.perms.areas.camps === 'edit'); if (r[1]) ORD = r[1]; render();
  }
  function findCamp(id) { for (var i = 0; i < data.types.length; i++) { var c = data.types[i].camps.filter(function (x) { return x.id === id; })[0]; if (c) return c; } }

  function openForm(kind, row, preset) {
    preset = preset || {};
    var isType = kind === 'type', dlg = $('dlg');
    $('dlgTitle').textContent = CT.t(isType ? 'typeFormTitle' : 'campFormTitle');
    var f = '<label>' + esc(CT.t('fNameKo')) + '<input name="nameKo" required maxlength="80" value="' + esc(row ? row.nameKo : '') + '"></label>' +
            '<label>' + esc(CT.t('fNameEn')) + '<input name="nameEn" maxlength="80" value="' + esc(row ? row.nameEn : '') + '"></label>';
    if (isType) {
      f += '<label>' + esc(CT.t('fDesc')) + '<input name="description" maxlength="200" value="' + esc(row ? row.description : '') + '"></label>';
    } else {
      f += '<label>' + esc(CT.t('fType')) + '<select name="typeId" ' + (row ? 'disabled' : '') + '>' + data.types.map(function (t) { return '<option value="' + esc(t.id) + '"' + (row && row.typeId === t.id ? ' selected' : '') + '>' + esc(CT.pick(t, 'name')) + '</option>'; }).join('') + '</select></label>' +
        '<div class="two"><label>' + esc(CT.t('fYear')) + '<input type="number" name="year" min="2000" max="2100" value="' + esc(row ? (row.year || '') : (preset.year || '')) + '"></label><label>' + esc(CT.t('fSeason')) + '<input name="season" maxlength="20" list="seasonList" autocomplete="off" value="' + esc(row ? row.season : (preset.season || '')) + '"></label></div><datalist id="seasonList">' + SEASONS.map(function (x) { return '<option value="' + esc(CT.lang() === 'en' ? x[1] : x[0]) + '">'; }).join('') + '</datalist>' +
        '<div class="two"><label>' + esc(CT.t('fStart')) + '<input type="date" name="startDate" value="' + esc(row && row.startDate || '') + '"></label><label>' + esc(CT.t('fEnd')) + '<input type="date" name="endDate" value="' + esc(row && row.endDate || '') + '"></label></div>' +
        '<label>' + esc(CT.t('fStatus')) + '<select name="status">' + STATUSES.map(function (s) { return '<option value="' + s + '"' + ((row ? row.status : 'planning') === s ? ' selected' : '') + '>' + esc(CT.t(s)) + '</option>'; }).join('') + '</select></label>' +
        '<label>' + esc(CT.t('fLocation')) + '<input name="location" maxlength="120" value="' + esc(row ? row.location : '') + '"></label>' +
        '<label>' + esc(CT.t('fNotes')) + '<textarea name="notes" maxlength="1000">' + esc(row ? row.notes : '') + '</textarea></label>';
    }
    $('dlgFields').innerHTML = f; $('dlgErr').hidden = true;
    dlg.dataset.kind = kind; dlg.dataset.id = row ? row.id : '';
    dlg.showModal();
  }

  async function submit(ev) {
    ev.preventDefault();
    var dlg = $('dlg'), kind = dlg.dataset.kind, id = dlg.dataset.id, fd = new FormData($('dlgForm')), body = { kind: kind };
    fd.forEach(function (v, k) { body[k] = v; });
    if (kind === 'camp' && !body.year && body.startDate) body.year = body.startDate.slice(0, 4); // 연도를 비워 두면 시작일의 연도를 쓴다
    try {
      if (id) await CT.api('/api/campteam/camps?kind=' + kind + '&id=' + encodeURIComponent(id), { method: 'PATCH', body: body });
      else await CT.api('/api/campteam/camps', { method: 'POST', body: body });
      dlg.close(); await load();
    } catch (e) { $('dlgErr').textContent = e.message; $('dlgErr').hidden = false; }
  }

  CT.pre('/api/campteam/camps'); CT.pre('/api/campteam/camp-order');
  CT.boot(async function () {
    try { await load(); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    CT.applyI18n();
    $('addType').onclick = function () { openForm('type'); };
    $('addCamp').onclick = function () { if (!data.types.length) { alert(CT.t('needType')); return; } openForm('camp', null, V.year && V.year !== 'none' ? { year: Number(V.year), season: V.season && V.season !== '__none' ? V.season : '' } : null); };
    $('filterBar').addEventListener('change', function (e) { if (e.target.id === 'fYearSel') { V.year = e.target.value; V.season = ''; ls('ct-camps-year', V.year); render(); } });
    $('filterBar').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-season')) { V.season = b.dataset.season; render(); }
      else if (b.id === 'fltReset') { V.year = ''; V.season = ''; ls('ct-camps-year', ''); render(); }
      else if (b.id === 'addYear') { var y = Number((prompt(CT.t('yearPrompt')) || '').trim()); if (Number.isInteger(y) && y >= 2000 && y <= 2100) { var ex = extraYears(); if (ex.indexOf(y) < 0) ex.push(y); ls('ct-camps-years', JSON.stringify(ex)); V.year = String(y); V.season = ''; ls('ct-camps-year', V.year); render(); } }
    });
    $('cancel').onclick = function () { $('dlg').close(); };
    wireDrag();
    document.addEventListener('click', async function (e) { var b = e.target.closest && e.target.closest('#ordReset,#ordDefault'); if (!b) return; if (b.id === 'ordReset') { try { await CT.api('/api/campteam/camp-order?scope=mine', { method: 'DELETE' }); ORD.mine = null; render(); say(CT.t('ordResetDone')); } catch (er) { alert(er.message); } } else { if (confirm(CT.t('ordDefaultAsk'))) await saveOrder('default'); } });
    $('dlgForm').onsubmit = submit;
    $('list').addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.editType) openForm('type', data.types.filter(function (t) { return t.id === b.dataset.editType; })[0]);
      else if (b.dataset.editCamp) openForm('camp', findCamp(b.dataset.editCamp));
      else if (b.dataset.del) {
        if (!confirm(CT.t('confirmDel'))) return;
        var p = b.dataset.del.split(':');
        try { await CT.api('/api/campteam/camps?kind=' + p[0] + '&id=' + encodeURIComponent(p[1]), { method: 'DELETE' }); await load(); } catch (err) { alert(err.message); }
      }
    });
    document.addEventListener('ct-lang', function () { CT.applyI18n(); render(); });
  });
})();
