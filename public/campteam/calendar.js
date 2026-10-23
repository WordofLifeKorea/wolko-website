// 달력 페이지: 월 달력(위) + 선택한 날의 일정 목록(아래). 「달력 / 목록」 전환은 그대로 있다.
// 일정은 캠프팀에서만 고친다 — 구글 달력에 반영되는 일정이 있어도 그쪽에서 고치면 다음 반영 때 이 화면의 값으로 덮인다.
(function () {
  CT.addDict({
    ko: { calTitle: '달력', calSub: '팀 일정, 캠프 기간, 업무 마감, 회의를 한 달력에서 봐요. 날짜를 누르면 그날 일정이 아래에 나와요.', dayNone: '이 날은 일정이 없어요.', dayAdd: '+ 이 날 일정 추가', gNote: '구글 달력에 반영되는 일정은 이 화면의 값이 기준이에요. 구글에서 직접 고치지 말고 여기서만 고쳐 주세요.', dayTask: '업무 마감', dayMeeting: '회의', dayCamp: '캠프', dayEvent: '일정', allDay: '종일', dayOpen: '열기', fTitle: '일정 이름', fDate: '날짜', fEnd: '종료일 (선택)', fStart: '시작 시간', fEndT: '종료 시간', fKind: '종류', kTeam: '팀 일정', kCamp: '캠프 일정', kOut: '부재', fCamp: '관련 캠프', fNoCamp: '캠프 없음', editEvent: '일정 수정', newEvent: '일정 추가', del: '삭제', delConfirm: '삭제할까요? (삭제 표시만 되며 복구할 수 있어요)', today: '오늘', viewGrid: '달력', viewAgenda: '목록', lgEvent: '팀 일정', lgCamp: '캠프 기간', lgTask: '업무 마감', lgLate: '마감 지남', lgMeet: '회의', edit: '수정', addEvent: '+ 일정 추가', viewOnly: '조회만 가능한 계정이에요. 작성·수정은 캠프팀 팀원이 할 수 있어요.', save: '저장', cancel: '취소', overdue: '마감 지남' },
    en: { calTitle: 'Calendar', calSub: 'Team events, camp dates, task deadlines and meetings in one calendar. Tap a date to see that day below.', dayNone: 'Nothing scheduled this day.', dayAdd: '+ Add event on this day', gNote: 'Events mirrored to Google Calendar follow the values on this page. Please edit them here only, not in Google.', dayTask: 'Task due', dayMeeting: 'Meeting', dayCamp: 'Camp', dayEvent: 'Event', allDay: 'All day', dayOpen: 'Open', fTitle: 'Event name', fDate: 'Date', fEnd: 'End date (optional)', fStart: 'Start time', fEndT: 'End time', fKind: 'Type', kTeam: 'Team event', kCamp: 'Camp event', kOut: 'Out of office', fCamp: 'Camp', fNoCamp: 'No camp', editEvent: 'Edit event', newEvent: 'Add event', del: 'Delete', delConfirm: 'Delete this? (It is only marked deleted and can be restored.)', today: 'Today', viewGrid: 'Calendar', viewAgenda: 'List', lgEvent: 'Team event', lgCamp: 'Camp dates', lgTask: 'Task due', lgLate: 'Overdue', lgMeet: 'Meeting', edit: 'Edit', addEvent: '+ Event', viewOnly: 'View-only account. Camp team members can edit.', save: 'Save', cancel: 'Cancel', overdue: 'Overdue' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var S = { month: null, calView: 'grid', cal: null, types: [], sel: null, perms: null };
  var canWrite = function () { return CT.can('tasks', 'edit'); };
  var allCamps = function () { var o = []; S.types.forEach(function (t) { t.camps.forEach(function (c) { o.push(c); }); }); return o; };
  var campOptions = function (sel, none) { return '<option value="">' + esc(none) + '</option>' + allCamps().map(function (c) { return '<option value="' + esc(c.id) + '"' + (sel === c.id ? ' selected' : '') + '>' + esc(CT.pick(c, 'name')) + '</option>'; }).join(''); };
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  var todayStr = function () { return ymd(new Date()); };
  function monthStart() { if (!S.month) { var n = new Date(); S.month = new Date(n.getFullYear(), n.getMonth(), 1); } return S.month; }
  var dowNames = function () { return CT.lang() === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['일', '월', '화', '수', '목', '금', '토']; };

  function ask(title, fields, onSubmit, opts) {
    opts = opts || {};
    $('dlgTitle').textContent = title; $('dlgFields').innerHTML = fields; $('dlgErr').hidden = true;
    $('dlgActions').innerHTML = (opts.extra || '') + '<button type="button" class="btn" id="dlgCancel">' + esc(CT.t('cancel')) + '</button><button type="submit" class="btn pri">' + esc(opts.saveLabel || CT.t('save')) + '</button>';
    $('dlgCancel').onclick = function () { $('dlg').close(); };
    $('dlgForm').onsubmit = async function (e) { e.preventDefault(); var fd = Object.fromEntries(new FormData($('dlgForm')).entries()); try { await onSubmit(fd); $('dlg').close(); } catch (err) { $('dlgErr').textContent = err.message; $('dlgErr').hidden = false; } };
    if (!$('dlg').open) $('dlg').showModal();
  }
  function eventForm(ev, date) {
    var h = '<label>' + esc(CT.t('fTitle')) + '<input name="title" required maxlength="120" value="' + esc(ev ? ev.title : '') + '"></label>' +
      '<div class="two"><label>' + esc(CT.t('fDate')) + '<input type="date" name="startDate" required value="' + esc(ev ? ev.startDate : date || '') + '"></label><label>' + esc(CT.t('fEnd')) + '<input type="date" name="endDate" value="' + esc(ev && ev.endDate || '') + '"></label></div>' +
      '<div class="two"><label>' + esc(CT.t('fStart')) + '<input type="time" name="startTime" value="' + esc(ev ? ev.startTime : '') + '"></label><label>' + esc(CT.t('fEndT')) + '<input type="time" name="endTime" value="' + esc(ev ? ev.endTime : '') + '"></label></div>' +
      '<div class="two"><label>' + esc(CT.t('fKind')) + '<select name="kind">' + [['team', 'kTeam'], ['camp', 'kCamp'], ['out', 'kOut']].map(function (k) { return '<option value="' + k[0] + '"' + ((ev ? ev.kind : 'team') === k[0] ? ' selected' : '') + '>' + esc(CT.t(k[1])) + '</option>'; }).join('') + '</select></label>' +
      '<label>' + esc(CT.t('fCamp')) + '<select name="campId">' + campOptions(ev && ev.campId, CT.t('fNoCamp')) + '</select></label></div>';
    var extra = ev && canWrite() ? '<button type="button" class="btn danger" id="evDel">' + esc(CT.t('del')) + '</button>' : '';
    ask(CT.t(ev ? 'editEvent' : 'newEvent'), h, async function (fd) {
      var body = { title: fd.title, startDate: fd.startDate, endDate: fd.endDate || null, startTime: fd.startTime, endTime: fd.endTime, kind: fd.kind, campId: fd.campId || null };
      if (ev) await CT.api('/api/campteam/events?id=' + encodeURIComponent(ev.id), { method: 'PATCH', body: body }); else await CT.api('/api/campteam/events', { method: 'POST', body: body });
      S.sel = body.startDate; S.month = null; await loadCal();
    }, { extra: extra });
    if ($('evDel')) $('evDel').onclick = async function () { if (!confirm(CT.t('delConfirm'))) return; await CT.api('/api/campteam/events?id=' + encodeURIComponent(ev.id), { method: 'DELETE' }); $('dlg').close(); await loadCal(); };
  }

  async function loadCal() {
    var m = monthStart(), first = new Date(m.getFullYear(), m.getMonth(), 1 - m.getDay()), last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 41);
    S.range = { from: ymd(first), to: ymd(last), first: first };
    try { S.cal = await CT.api('/api/campteam/calendar?from=' + S.range.from + '&to=' + S.range.to); } catch (e) { $('calErr').hidden = false; $('calErr').textContent = e.message; return; }
    S.perms = S.cal.perms; render();
  }
  function itemsByDay() {
    var map = {}, add = function (d, o) { (map[d] = map[d] || []).push(o); }, span = function (a, b, o) { var d = new Date(a + 'T00:00:00'), end = new Date((b || a) + 'T00:00:00'); for (var i = 0; d <= end && i < 400; i++, d.setDate(d.getDate() + 1)) add(ymd(d), o); };
    var today = todayStr();
    S.cal.camps.forEach(function (c) { span(c.startDate, c.endDate, { cls: 'camp', text: CT.pick(c, 'name'), sort: 0, kindLabel: 'dayCamp', camp: c }); });
    S.cal.events.forEach(function (e) { span(e.startDate, e.endDate, { cls: e.kind === 'out' ? 'out' : 'ev', text: (e.startTime ? e.startTime + ' ' : '') + e.title, title: e.title, time: e.startTime ? e.startTime + (e.endTime ? ' ~ ' + e.endTime : '') : '', sort: 1, kindLabel: 'dayEvent', ev: e }); });
    S.cal.meetings.forEach(function (m) { add(m.meetDate, { cls: 'meet', text: (m.meetTime ? m.meetTime + ' ' : '') + m.title, title: m.title, time: m.meetTime || '', sort: 2, kindLabel: 'dayMeeting', meeting: m }); });
    S.cal.tasks.forEach(function (t) { add(t.dueDate, { cls: t.dueDate < today && t.status !== 'Completed' ? 'late' : 'task', text: '✓ ' + t.title, title: t.title, time: '', sort: 3, kindLabel: 'dayTask', task: t }); });
    return map;
  }
  function dayLabel(d) { var dt = new Date(d + 'T00:00:00'); return CT.lang() === 'en' ? dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) : (dt.getMonth() + 1) + '월 ' + dt.getDate() + '일 (' + dowNames()[dt.getDay()] + ')'; }
  function dayListHtml(map) {
    var key = S.sel || todayStr(), list = (map[key] || []).slice().sort(function (a, b) { return a.sort - b.sort || String(a.time).localeCompare(String(b.time)); });
    var rows = list.map(function (it) {
      var click = it.ev && canWrite() ? ' data-day-ev="' + esc(it.ev.id) + '"' : it.task ? ' data-day-task="' + esc(it.task.id) + '"' : it.meeting ? ' data-day-meet="' + esc(it.meeting.id) + '"' : '';
      return '<div class="dayrow ' + it.cls + '"' + click + '><span class="dayt">' + esc(it.time || CT.t('allDay')) + '</span><div class="dayb"><b>' + esc(it.title || it.text) + '</b><small>' + esc(CT.t(it.kindLabel)) + (it.ev && it.ev.campKo ? ' · ' + esc(it.ev.campKo) : '') + '</small></div>' + (click ? '<span class="chev" aria-hidden="true">›</span>' : '') + '</div>';
    }).join('');
    return '<div class="dayhd"><h3>' + esc(dayLabel(key)) + '</h3>' + (canWrite() ? '<button type="button" class="btn sm" id="dayAdd" data-date="' + esc(key) + '">' + esc(CT.t('dayAdd')) + '</button>' : '') + '</div>' + (rows || '<div class="empty">' + esc(CT.t('dayNone')) + '</div>');
  }
  function render() {
    var m = monthStart(), map = itemsByDay(), today = todayStr();
    $('calTitleMonth').textContent = CT.lang() === 'en' ? m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : m.getFullYear() + '년 ' + (m.getMonth() + 1) + '월';
    $('legend').innerHTML = [['ev', 'lgEvent'], ['camp', 'lgCamp'], ['task', 'lgTask'], ['late', 'lgLate'], ['meet', 'lgMeet']].map(function (l) { return '<span><span class="ci ' + l[0] + '" style="display:inline-block;min-width:14px">&nbsp;</span> ' + esc(CT.t(l[1])) + '</span>'; }).join('');
    $('viewGrid').classList.toggle('pri', S.calView === 'grid'); $('viewAgenda').classList.toggle('pri', S.calView === 'agenda');
    $('addEvent').hidden = !canWrite(); $('viewOnly').hidden = canWrite(); $('gNote').textContent = canWrite() ? CT.t('gNote') : '';
    if (S.calView === 'agenda') {
      var days = Object.keys(map).filter(function (d) { return d.slice(0, 7) === ymd(m).slice(0, 7); }).sort();
      $('calBody').innerHTML = days.length ? '<div class="card agenda">' + days.map(function (d) { return '<div class="row"><div><b>' + esc(d.slice(5).replace('-', '/')) + '</b></div><div style="flex:1">' + map[d].sort(function (a, b) { return a.sort - b.sort; }).map(function (i) { return '<span class="ci ' + i.cls + '" data-day-ev="' + (i.ev && canWrite() ? esc(i.ev.id) : '') + '" data-day-task="' + (i.task ? esc(i.task.id) : '') + '" data-day-meet="' + (i.meeting ? esc(i.meeting.id) : '') + '">' + esc(i.text) + '</span>'; }).join('') + '</div></div>'; }).join('') + '</div>' : '<div class="empty">' + esc(CT.t('dayNone')) + '</div>';
      $('dayList').hidden = true; return;
    }
    $('dayList').hidden = false;
    var h = '<div class="cal">' + dowNames().map(function (d) { return '<div class="dow">' + d + '</div>'; }).join('');
    for (var i = 0; i < 42; i++) {
      var d = new Date(S.range.first.getFullYear(), S.range.first.getMonth(), S.range.first.getDate() + i), key = ymd(d), list = (map[key] || []).sort(function (a, b) { return a.sort - b.sort; });
      var dots = list.slice(0, 4).map(function (it) { return '<i class="dot ' + it.cls + '"></i>'; }).join('');
      h += '<div class="day ' + (d.getMonth() !== m.getMonth() ? 'other ' : '') + (key === today ? 'today ' : '') + (key === (S.sel || today) ? 'sel' : '') + '" data-date="' + key + '"><div class="dn">' + d.getDate() + '</div>' +
        '<div class="chips">' + list.slice(0, 3).map(function (it) { return '<span class="ci ' + it.cls + '" title="' + esc(it.text) + '">' + esc(it.text) + '</span>'; }).join('') + (list.length > 3 ? '<span class="ci out">+' + (list.length - 3) + '</span>' : '') + '</div><div class="dots">' + dots + '</div></div>';
    }
    $('calBody').innerHTML = h + '</div>'; $('dayList').innerHTML = dayListHtml(map);
  }

  CT.boot(async function () {
    try { S.types = (await CT.api('/api/campteam/camps')).types; } catch (e) { $('calErr').hidden = false; $('calErr').textContent = e.message; return; }
    CT.applyI18n(); S.sel = todayStr(); await loadCal();
    $('calPrev').onclick = function () { var m = monthStart(); S.month = new Date(m.getFullYear(), m.getMonth() - 1, 1); loadCal(); };
    $('calNext').onclick = function () { var m = monthStart(); S.month = new Date(m.getFullYear(), m.getMonth() + 1, 1); loadCal(); };
    $('calToday').onclick = function () { S.month = null; S.sel = todayStr(); loadCal(); };
    $('viewGrid').onclick = function () { S.calView = 'grid'; render(); }; $('viewAgenda').onclick = function () { S.calView = 'agenda'; render(); };
    $('addEvent').onclick = function () { eventForm(null, S.sel || todayStr()); };
    function open(e) {
      var it = e.target.closest('[data-day-ev],[data-day-task],[data-day-meet]');
      if (it && it.dataset.dayEv) { var ev = S.cal.events.filter(function (x) { return x.id === it.dataset.dayEv; })[0]; if (ev && canWrite()) eventForm(Object.assign({ campId: null, kind: ev.kind }, ev)); return true; }
      if (it && it.dataset.dayTask) { location.href = '/portal/campteam/tasks/?open=' + encodeURIComponent(it.dataset.dayTask); return true; }
      if (it && it.dataset.dayMeet) { location.href = '/portal/campteam/meetings/?open=' + encodeURIComponent(it.dataset.dayMeet); return true; }
      return false;
    }
    $('calBody').addEventListener('click', function (e) {
      if (S.calView === 'grid' && e.target.closest('.ci') && !e.target.closest('.dots')) { /* 칩을 눌러도 먼저 그 날을 선택한다 */ }
      var day = e.target.closest('[data-date]'); if (day) { S.sel = day.dataset.date; var mm = new Date(S.sel + 'T00:00:00'), cur = monthStart(); if (mm.getMonth() !== cur.getMonth()) { S.month = new Date(mm.getFullYear(), mm.getMonth(), 1); loadCal(); } else render(); return; }
      open(e);
    });
    $('dayList').addEventListener('click', function (e) { var b = e.target.closest('#dayAdd'); if (b) { eventForm(null, b.dataset.date); return; } open(e); });
    document.addEventListener('ct-lang', function () { CT.applyI18n(); if (S.cal) render(); });
  });
})();
