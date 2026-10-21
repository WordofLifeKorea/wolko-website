(function () {
  CT.addDict({
    ko: { tasksTitle: '일정 · 업무', tasksSub: '캠프 일정과 준비 업무를 한곳에서 보고 관리해요', addTask: '+ 업무 추가', addEvent: '+ 일정 추가', viewOnly: '조회만 가능한 계정이에요. 작성·수정은 캠프팀 팀원이 할 수 있어요.', searchPh: '업무 이름·담당자·메모 검색',
      tabList: '업무 목록', tabCal: '달력', tabTpl: '체크리스트 템플릿', tabImp: '시트에서 가져오기', today: '오늘', viewGrid: '달력', viewAgenda: '목록',
      pOpen: '진행 중', pOverdue: '마감 지남', pNoOwner: '담당자 미정', pNoDue: '기한 미정', pAll: '전체', fAllCamps: '모든 캠프', fNoCamp: '캠프 없음', fAllStatus: '모든 상태', fAllPri: '모든 우선순위', fAllOwner: '모든 담당자', sortDue: '기한 빠른 순', sortPri: '우선순위 순', sortNew: '최신 순', sortTitle: '이름 순',
      stNot: '미시작', stIn: '진행 중', stWait: '확인 대기', stDelayed: '지연', stDone: '완료', stNA: '해당 없음', priHigh: '높음', priMedium: '보통', priLow: '낮음',
      owner: '담당', noOwner: '담당자 미정', noDue: '기한 미정', due: '기한', overdue: '마감 지남', suggested: '제안', confirm: '확정', noTasks: '조건에 맞는 업무가 없어요.', edit: '수정', del: '삭제', save: '저장', cancel: '취소',
      fTitle: '업무 이름', fOwner: '담당자 (비워 둘 수 있어요)', fDue: '기한 (비워 둘 수 있어요)', fStatus: '상태', fPriority: '우선순위', fCamp: '관련 캠프', fNotes: '메모', fDate: '날짜', fEnd: '종료일 (선택)', fStart: '시작 시간', fEndT: '종료 시간', fKind: '종류', fLoc: '장소', kTeam: '팀 일정', kCamp: '캠프 일정', kOut: '부재', evTitle: '일정', taskTitle: '업무', newTask: '업무 추가', editTask: '업무 수정', newEvent: '일정 추가', editEvent: '일정 수정',
      lgEvent: '팀 일정', lgCamp: '캠프 기간', lgTask: '업무 마감', lgLate: '마감 지남', lgMeet: '회의', noItems: '이 달에는 표시할 항목이 없어요.',
      addTpl: '+ 템플릿', impTplBtn: '체크리스트 붙여넣어 가져오기', impTplTitle: '체크리스트 가져오기', impTplHelp: 'Word나 엑셀의 체크리스트 표를 그대로 복사해서 붙여넣으세요. 구역(1. 기획…)과 우선순위(1 필수·2 중요·3 일반), 담당자가 자동으로 정리돼요. 담당자는 "제안"으로만 들어가고, 기한은 비워 둡니다.', suggestOff: '구역 이름으로 마감 기준일을 임시로 정하기 (나중에 직접 고칠 수 있어요)', provisional: '임시', itemSection: '구역', previewBtn: '미리보기', impTplDone: '템플릿을 만들었어요', sections: '구역', withOwner: '담당 제안 있음', withOffset: '임시 기준일 있음', tplItems: '항목', tplOffset: '기준일', tplOffsetHelp: '캠프 시작일 기준 (예: -30 = 30일 전)', tplOwner: '제안 담당자', tplNone: '(없음 · 마감일 없이 만듦)', addItem: '+ 항목', applyTo: '캠프에 적용', tplName: '템플릿 이름', tplNameEn: '이름 (English)', tplDesc: '설명', itemTitle: '항목 이름', itemOffset: '기준일 (캠프 시작일 기준 며칠 전/후, 비워도 돼요)', itemOwner: '제안 담당자', chooseCamp: '적용할 캠프', preview: '미리보기', applyNow: '이대로 적용', willCreate: '만들어질 업무', skipExists: '이미 있어서 건너뜀', campNoDate: '이 캠프에는 시작일이 없어서 마감일 없이 만들어져요.', confirmOwner: '제안 담당자를 확정', done: '적용했어요',
      impTitle: '기존 Google 시트의 업무를 한 번 가져오기', impHelp: '시트에서 업무 칸 전체(맨 윗줄 머리글 포함)를 복사해서 아래에 붙여넣으세요. (파일 → 다운로드 → .csv 내용도 가능해요) 담당자·기한은 시트에 적힌 그대로만 가져오고, 같은 캠프에 같은 이름의 업무가 이미 있으면 건너뛰어요. Google에는 접속하지 않아요.', impPreview: '미리보기', impRun: '이대로 가져오기', impSummary: '개', impCreate: '새로 만듦', impSkip: '건너뜀(이미 있음)', impUnmatched: '캠프를 연결하지 못한 이름', impWarn: '확인', impDone: '가져왔어요', delConfirm: '삭제할까요? (삭제 표시만 되며 복구할 수 있어요)' },
    en: { tasksTitle: 'Schedule · Tasks', tasksSub: 'See and manage camp schedules and preparation tasks in one place', addTask: '+ Task', addEvent: '+ Event', viewOnly: 'View-only account. Camp team members can edit.', searchPh: 'Search task, owner, notes',
      tabList: 'Task list', tabCal: 'Calendar', tabTpl: 'Checklist templates', tabImp: 'Import from sheet', today: 'Today', viewGrid: 'Calendar', viewAgenda: 'List',
      pOpen: 'Open', pOverdue: 'Overdue', pNoOwner: 'No owner', pNoDue: 'No due date', pAll: 'All', fAllCamps: 'All camps', fNoCamp: 'No camp', fAllStatus: 'All statuses', fAllPri: 'All priorities', fAllOwner: 'All owners', sortDue: 'Due date', sortPri: 'Priority', sortNew: 'Newest', sortTitle: 'Name',
      stNot: 'Not Started', stIn: 'In Progress', stWait: 'Waiting for Confirmation', stDelayed: 'Delayed', stDone: 'Completed', stNA: 'Not Applicable', priHigh: 'High', priMedium: 'Medium', priLow: 'Low',
      owner: 'Owner', noOwner: 'No owner', noDue: 'No due date', due: 'Due', overdue: 'Overdue', suggested: 'Suggested', confirm: 'Confirm', noTasks: 'No tasks match.', edit: 'Edit', del: 'Delete', save: 'Save', cancel: 'Cancel',
      fTitle: 'Task name', fOwner: 'Owner (can be left blank)', fDue: 'Due date (can be left blank)', fStatus: 'Status', fPriority: 'Priority', fCamp: 'Camp', fNotes: 'Notes', fDate: 'Date', fEnd: 'End date (optional)', fStart: 'Start time', fEndT: 'End time', fKind: 'Type', fLoc: 'Location', kTeam: 'Team event', kCamp: 'Camp event', kOut: 'Out of office', evTitle: 'Event', taskTitle: 'Task', newTask: 'Add task', editTask: 'Edit task', newEvent: 'Add event', editEvent: 'Edit event',
      lgEvent: 'Team event', lgCamp: 'Camp dates', lgTask: 'Task due', lgLate: 'Overdue', lgMeet: 'Meeting', noItems: 'Nothing to show this month.',
      addTpl: '+ Template', impTplBtn: 'Import checklist by pasting', impTplTitle: 'Import checklist', impTplHelp: 'Copy the checklist table from Word or Excel and paste it here. Sections, priorities (1 Required · 2 Important · 3 General) and owners are organized automatically. Owners are only suggestions and due dates stay empty.', suggestOff: 'Set provisional due offsets from section names (you can edit them later)', provisional: 'provisional', itemSection: 'Section', previewBtn: 'Preview', impTplDone: 'Template created', sections: 'Sections', withOwner: 'With owner suggestion', withOffset: 'With provisional offset', tplItems: 'Items', tplOffset: 'Offset', tplOffsetHelp: 'Relative to camp start (e.g. -30 = 30 days before)', tplOwner: 'Suggested owner', tplNone: '(none · created without due date)', addItem: '+ Item', applyTo: 'Apply to camp', tplName: 'Template name', tplNameEn: 'Name (English)', tplDesc: 'Description', itemTitle: 'Item name', itemOffset: 'Offset (days before/after camp start, optional)', itemOwner: 'Suggested owner', chooseCamp: 'Camp to apply to', preview: 'Preview', applyNow: 'Apply as shown', willCreate: 'Tasks to be created', skipExists: 'Already exists — skipped', campNoDate: 'This camp has no start date, so tasks are created without due dates.', confirmOwner: 'Confirm suggested owner', done: 'Applied',
      impTitle: 'One-time import of tasks from the existing Google Sheet', impHelp: 'In the sheet, select all task cells (including the header row), copy, and paste below. (Content of a downloaded .csv also works.) Owners and due dates are imported exactly as written; tasks that already exist in the same camp are skipped. Nothing connects to Google.', impPreview: 'Preview', impRun: 'Import as shown', impSummary: ' rows', impCreate: 'to create', impSkip: 'skipped (already exist)', impUnmatched: 'Camps that could not be matched', impWarn: 'Check', impDone: 'Imported', delConfirm: 'Delete this? (It is only marked deleted and can be restored.)' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var STATUS = [['Not Started', 'stNot'], ['In Progress', 'stIn'], ['Waiting for Confirmation', 'stWait'], ['Delayed', 'stDelayed'], ['Completed', 'stDone'], ['Not Applicable', 'stNA']];
  var PRI = [['High', 'priHigh'], ['Medium', 'priMedium'], ['Low', 'priLow']];
  var S = { tasks: null, types: [], flag: 'open', tab: 'list', month: null, calView: 'grid', cal: null, tpls: [], perms: null };
  var canWrite = function () { return S.perms && S.perms.write; };
  var stLabel = function (v) { return CT.t((STATUS.filter(function (s) { return s[0] === v; })[0] || [0, 'stNot'])[1]); };
  var priLabel = function (v) { return CT.t('pri' + v); };
  var campLabel = function (r) { return CT.lang() === 'en' ? (r.campEn || r.campKo || '') : (r.campKo || r.campEn || ''); };
  var allCamps = function () { var o = []; S.types.forEach(function (t) { t.camps.forEach(function (c) { o.push(c); }); }); return o; };
  var campOptions = function (sel, blank) { return '<option value="">' + esc(blank) + '</option>' + allCamps().map(function (c) { return '<option value="' + esc(c.id) + '"' + (sel === c.id ? ' selected' : '') + '>' + esc(CT.pick(c, 'name')) + '</option>'; }).join(''); };
  function daysFrom(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
  function md(d) { return d ? d.slice(5).replace('-', '/') : ''; }

  /* ---------- 대화상자 도우미 ---------- */
  function ask(title, fields, onSubmit, opts) {
    opts = opts || {};
    $('dlgTitle').textContent = title; $('dlgFields').innerHTML = fields; $('dlgErr').hidden = true;
    $('dlgActions').innerHTML = (opts.extra || '') + '<button type="button" class="btn" id="dlgCancel">' + esc(CT.t('cancel')) + '</button><button type="submit" class="btn pri">' + esc(opts.saveLabel || CT.t('save')) + '</button>';
    $('dlgCancel').onclick = function () { $('dlg').close(); };
    $('dlgForm').onsubmit = async function (e) { e.preventDefault(); var fd = Object.fromEntries(new FormData($('dlgForm')).entries()); try { await onSubmit(fd); $('dlg').close(); } catch (err) { $('dlgErr').textContent = err.message; $('dlgErr').hidden = false; } };
    if (!$('dlg').open) $('dlg').showModal();
    return $('dlgActions');
  }

  /* ---------- 업무 목록 ---------- */
  function fillFilters() {
    var keep = function (id, html) { var el = $(id), v = el.value; el.innerHTML = html; if (v) el.value = v; };
    keep('tcamp', '<option value="">' + esc(CT.t('fAllCamps')) + '</option><option value="none">' + esc(CT.t('fNoCamp')) + '</option>' + allCamps().map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(CT.pick(c, 'name')) + '</option>'; }).join(''));
    keep('tstatus', '<option value="">' + esc(CT.t('fAllStatus')) + '</option>' + STATUS.map(function (s) { return '<option value="' + s[0] + '">' + esc(CT.t(s[1])) + '</option>'; }).join(''));
    keep('tpri', '<option value="">' + esc(CT.t('fAllPri')) + '</option>' + PRI.map(function (s) { return '<option value="' + s[0] + '">' + esc(CT.t(s[1])) + '</option>'; }).join(''));
    keep('towner', '<option value="">' + esc(CT.t('fAllOwner')) + '</option>' + ((S.tasks && S.tasks.owners) || []).map(function (o) { return '<option>' + esc(o) + '</option>'; }).join(''));
    keep('tsort', [['due', 'sortDue'], ['priority', 'sortPri'], ['newest', 'sortNew'], ['title', 'sortTitle']].map(function (o) { return '<option value="' + o[0] + '">' + esc(CT.t(o[1])) + '</option>'; }).join(''));
  }
  async function loadTasks() {
    var q = new URLSearchParams();
    if ($('tq').value.trim()) q.set('q', $('tq').value.trim());
    [['tcamp', 'campId'], ['tstatus', 'status'], ['tpri', 'priority'], ['towner', 'owner'], ['tsort', 'sort']].forEach(function (m) { if ($(m[0]).value) q.set(m[1], $(m[0]).value); });
    if (S.flag) q.set('flag', S.flag);
    S.tasks = await CT.api('/api/campteam/tasks?' + q.toString()); S.perms = S.tasks.perms; renderTasks();
  }
  function renderTasks() {
    var c = S.tasks.counts, today = S.tasks.today;
    $('addTask').hidden = $('addEvent').hidden = !canWrite(); $('viewOnly').hidden = canWrite(); $('impTab').hidden = !canWrite(); $('addTpl').hidden = !canWrite(); $('impTpl').hidden = !canWrite();
    $('pills').innerHTML = [['open', 'pOpen', c.open, ''], ['overdue', 'pOverdue', c.overdue, 'red'], ['noowner', 'pNoOwner', c.noOwner, 'red'], ['nodue', 'pNoDue', c.noDue, ''], ['', 'pAll', '', '']].map(function (p) {
      return '<button class="pill ' + p[3] + (S.flag === p[0] ? ' on' : '') + '" data-flag="' + p[0] + '">' + esc(CT.t(p[1])) + (p[2] !== '' ? '<b>' + p[2] + '</b>' : '') + '</button>'; }).join('');
    $('tlist').innerHTML = S.tasks.items.length ? S.tasks.items.map(function (t) {
      var late = t.dueDate && t.dueDate < today && t.status !== 'Completed' && t.status !== 'Not Applicable';
      var ownerHtml = t.ownerName ? esc(CT.t('owner')) + ': ' + esc(t.ownerName) : '<span class="tag t-late">' + esc(CT.t('noOwner')) + '</span>' + (t.ownerSuggestion ? ' <span class="sugg">' + esc(CT.t('suggested')) + ': ' + esc(t.ownerSuggestion) + (canWrite() ? '<button data-confirm="' + esc(t.id) + '">' + esc(CT.t('confirm')) + '</button>' : '') + '</span>' : '');
      var dueHtml = t.dueDate ? '<span class="tag ' + (late ? 't-late' : daysFrom(today, t.dueDate) <= 3 ? 't-soon' : 't-none') + '">' + esc(CT.t('due')) + ' ' + esc(md(t.dueDate)) + (late ? ' · ' + esc(CT.t('overdue')) : '') + '</span>' : '<span class="tag t-none">' + esc(CT.t('noDue')) + '</span>';
      return '<div class="task ' + (t.status === 'Completed' ? 'done' : '') + '"><div><div class="tt">' + esc(t.title) + (t.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '</div>' +
        '<small>' + ownerHtml + ' · ' + dueHtml + ' <span class="tag p-' + t.priority + '">' + esc(priLabel(t.priority)) + '</span>' + (campLabel(t) ? ' · ' + esc(campLabel(t)) : '') + (t.notes ? '<br>' + esc(t.notes) : '') + '</small></div>' +
        '<div class="actions">' + (canWrite() ? '<select data-status="' + esc(t.id) + '">' + STATUS.map(function (s) { return '<option value="' + s[0] + '"' + (t.status === s[0] ? ' selected' : '') + '>' + esc(CT.t(s[1])) + '</option>'; }).join('') + '</select><button class="btn sm" data-edit="' + esc(t.id) + '">' + esc(CT.t('edit')) + '</button><button class="btn sm danger" data-del="' + esc(t.id) + '">' + esc(CT.t('del')) + '</button>' : '<span class="status">' + esc(stLabel(t.status)) + '</span>') + '</div></div>';
    }).join('') : '<div class="empty">' + esc(CT.t('noTasks')) + '</div>';
  }
  function taskForm(t) {
    var h = '<label>' + esc(CT.t('fTitle')) + '<input name="title" required maxlength="200" value="' + esc(t ? t.title : '') + '"></label>' +
      '<div class="two"><label>' + esc(CT.t('fOwner')) + '<input name="ownerName" maxlength="60" value="' + esc(t ? t.ownerName : '') + '"' + (t && t.ownerSuggestion && !t.ownerName ? ' placeholder="' + esc(CT.t('suggested') + ': ' + t.ownerSuggestion) + '"' : '') + '></label>' +
      '<label>' + esc(CT.t('fDue')) + '<input type="date" name="dueDate" value="' + esc(t && t.dueDate || '') + '"></label></div>' +
      '<div class="two"><label>' + esc(CT.t('fStatus')) + '<select name="status">' + STATUS.map(function (s) { return '<option value="' + s[0] + '"' + ((t ? t.status : 'Not Started') === s[0] ? ' selected' : '') + '>' + esc(CT.t(s[1])) + '</option>'; }).join('') + '</select></label>' +
      '<label>' + esc(CT.t('fPriority')) + '<select name="priority">' + PRI.map(function (s) { return '<option value="' + s[0] + '"' + ((t ? t.priority : 'Medium') === s[0] ? ' selected' : '') + '>' + esc(CT.t(s[1])) + '</option>'; }).join('') + '</select></label></div>' +
      '<label>' + esc(CT.t('fCamp')) + '<select name="campId">' + campOptions(t && t.campId, CT.t('fNoCamp')) + '</select></label>' +
      '<label>' + esc(CT.t('fNotes')) + '<textarea name="notes" maxlength="1000">' + esc(t ? t.notes : '') + '</textarea></label>';
    ask(CT.t(t ? 'editTask' : 'newTask'), h, async function (fd) {
      var body = { title: fd.title, ownerName: fd.ownerName, dueDate: fd.dueDate || null, status: fd.status, priority: fd.priority, campId: fd.campId || null, notes: fd.notes };
      if (t) await CT.api('/api/campteam/tasks?id=' + encodeURIComponent(t.id), { method: 'PATCH', body: body }); else await CT.api('/api/campteam/tasks', { method: 'POST', body: body });
      await refresh();
    });
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
      await refresh();
    }, { extra: extra });
    if ($('evDel')) $('evDel').onclick = async function () { if (!confirm(CT.t('delConfirm'))) return; await CT.api('/api/campteam/events?id=' + encodeURIComponent(ev.id), { method: 'DELETE' }); $('dlg').close(); await refresh(); };
  }

  /* ---------- 달력 ---------- */
  function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function monthStart() { if (!S.month) { var n = new Date(); S.month = new Date(n.getFullYear(), n.getMonth(), 1); } return S.month; }
  async function loadCal() {
    var m = monthStart(), first = new Date(m.getFullYear(), m.getMonth(), 1 - m.getDay()), last = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 41);
    S.calRange = { from: ymd(first), to: ymd(last), first: first };
    S.cal = await CT.api('/api/campteam/calendar?from=' + S.calRange.from + '&to=' + S.calRange.to); S.perms = S.cal.perms; renderCal();
  }
  function itemsByDay() {
    var map = {}, add = function (d, o) { (map[d] = map[d] || []).push(o); }, span = function (a, b, o) { var d = new Date(a + 'T00:00:00'), end = new Date((b || a) + 'T00:00:00'); for (var i = 0; d <= end && i < 62; i++, d.setDate(d.getDate() + 1)) add(ymd(d), o); };
    var today = ymd(new Date());
    S.cal.camps.forEach(function (c) { span(c.startDate, c.endDate, { cls: 'camp', text: CT.pick(c, 'name'), sort: 0 }); });
    S.cal.events.forEach(function (e) { span(e.startDate, e.endDate, { cls: e.kind === 'out' ? 'out' : 'ev', text: (e.startTime ? e.startTime + ' ' : '') + e.title, sort: 1, ev: e }); });
    S.cal.meetings.forEach(function (m) { add(m.meetDate, { cls: 'meet', text: (m.meetTime ? m.meetTime + ' ' : '') + m.title, sort: 2 }); });
    S.cal.tasks.forEach(function (t) { add(t.dueDate, { cls: t.dueDate < today && t.status !== 'Completed' ? 'late' : 'task', text: '✓ ' + t.title, sort: 3, task: t }); });
    return map;
  }
  function renderCal() {
    var m = monthStart(), map = itemsByDay(), today = ymd(new Date());
    $('calTitle').textContent = CT.lang() === 'en' ? m.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : m.getFullYear() + '년 ' + (m.getMonth() + 1) + '월';
    $('legend').innerHTML = [['ev', 'lgEvent'], ['camp', 'lgCamp'], ['task', 'lgTask'], ['late', 'lgLate'], ['meet', 'lgMeet']].map(function (l) { return '<span><span class="ci ' + l[0] + '" style="display:inline-block;min-width:14px">&nbsp;</span> ' + esc(CT.t(l[1])) + '</span>'; }).join('');
    $('viewGrid').classList.toggle('pri', S.calView === 'grid'); $('viewAgenda').classList.toggle('pri', S.calView === 'agenda');
    if (S.calView === 'agenda') {
      var days = Object.keys(map).filter(function (d) { return d.slice(0, 7) === ymd(m).slice(0, 7); }).sort();
      $('calBody').innerHTML = days.length ? '<div class="card agenda">' + days.map(function (d) { return '<div class="row"><div><b>' + esc(d.slice(5).replace('-', '/')) + '</b></div><div style="flex:1">' + map[d].sort(function (a, b) { return a.sort - b.sort; }).map(function (i) { return '<span class="ci ' + i.cls + '" data-day-ev="' + (i.ev ? esc(i.ev.id) : '') + '" data-day-task="' + (i.task ? esc(i.task.id) : '') + '" style="white-space:normal">' + esc(i.text) + '</span>'; }).join('') + '</div></div>'; }).join('') + '</div>' : '<div class="empty">' + esc(CT.t('noItems')) + '</div>';
      return;
    }
    var dow = CT.lang() === 'en' ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] : ['일', '월', '화', '수', '목', '금', '토'], h = '<div class="cal">' + dow.map(function (d) { return '<div class="dow">' + d + '</div>'; }).join('');
    for (var i = 0; i < 42; i++) {
      var d = new Date(S.calRange.first.getFullYear(), S.calRange.first.getMonth(), S.calRange.first.getDate() + i), key = ymd(d), list = (map[key] || []).sort(function (a, b) { return a.sort - b.sort; });
      h += '<div class="day ' + (d.getMonth() !== m.getMonth() ? 'other ' : '') + (key === today ? 'today' : '') + '" data-date="' + key + '"><div class="dn">' + d.getDate() + '</div>' +
        list.slice(0, 3).map(function (it) { return '<span class="ci ' + it.cls + '" title="' + esc(it.text) + '" data-day-ev="' + (it.ev ? esc(it.ev.id) : '') + '" data-day-task="' + (it.task ? esc(it.task.id) : '') + '">' + esc(it.text) + '</span>'; }).join('') + (list.length > 3 ? '<span class="ci out">+' + (list.length - 3) + '</span>' : '') + '</div>';
    }
    $('calBody').innerHTML = h + '</div>';
  }

  /* ---------- 체크리스트 템플릿 ---------- */
  async function loadTpl() { S.tpls = (await CT.api('/api/campteam/templates')).templates; renderTpl(); }
  function renderTpl() {
    $('tplList').innerHTML = S.tpls.length ? S.tpls.map(function (t) {
      var last = null;
      var rows = t.items.map(function (i) {
        var head = (i.section && i.section !== last) ? '<tr><td colspan="5" style="background:#f4f6f8;font-weight:700">' + esc(i.section) + '</td></tr>' : ''; if (i.section) last = i.section;
        return head + '<tr><td>' + esc(i.title) + '</td><td>' + (i.offsetDays == null ? '<span class="meta">' + esc(CT.t('tplNone')) + '</span>' : (i.offsetDays > 0 ? '+' : '') + i.offsetDays + 'd' + (i.provisional ? ' <span class="chip warn">' + esc(CT.t('provisional')) + '</span>' : '')) + '</td><td>' + esc(i.ownerSuggestion || '—') + '</td><td><span class="tag p-' + i.priority + '">' + esc(priLabel(i.priority)) + '</span></td><td style="text-align:right;white-space:nowrap">' +
          (canWrite() ? '<button class="btn sm" data-iedit="' + esc(i.id) + '" data-tpl="' + esc(t.id) + '">' + esc(CT.t('edit')) + '</button> <button class="btn sm danger" data-idel="' + esc(i.id) + '">' + esc(CT.t('del')) + '</button>' : '') + '</td></tr>'; }).join('');
      return '<section class="card tpl"><div class="type-head"><div><h2 style="margin:0">' + esc(CT.pick(t, 'name')) + (t.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '</h2><div class="meta">' + esc(t.description || '') + ' · ' + t.items.length + '</div></div>' +
        '<div class="actions">' + (canWrite() ? '<button class="btn sm pri" data-apply="' + esc(t.id) + '">' + esc(CT.t('applyTo')) + '</button><button class="btn sm" data-tedit="' + esc(t.id) + '">' + esc(CT.t('edit')) + '</button><button class="btn sm danger" data-tdel="' + esc(t.id) + '">' + esc(CT.t('del')) + '</button>' : '') + '</div></div>' +
        '<table class="vtable"><thead><tr><th>' + esc(CT.t('tplItems')) + '</th><th>' + esc(CT.t('tplOffset')) + '</th><th>' + esc(CT.t('tplOwner')) + '</th><th>' + esc(CT.t('fPriority')) + '</th><th></th></tr></thead><tbody>' + rows + '</tbody></table>' +
        (canWrite() ? '<div style="margin-top:8px"><button class="btn sm" data-iadd="' + esc(t.id) + '">' + esc(CT.t('addItem')) + '</button></div>' : '') + '</section>';
    }).join('') : '<div class="empty">' + esc(CT.t('noTasks')) + '</div>';
  }
  function tplImportForm() {
    var h = '<div class="hintbox">' + esc(CT.t('impTplHelp')) + '</div><label>' + esc(CT.t('tplName')) + '<input name="nameKo" required maxlength="80"></label>' +
      '<label>' + esc(CT.t('fCamp')) + ' (' + esc(CT.t('fKind')) + ')<select name="typeId"><option value="">—</option>' + S.types.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(CT.pick(t, 'name')) + '</option>'; }).join('') + '</select></label>' +
      '<textarea class="big" name="text" required placeholder="OK\tTask\tOwner\tDue Date\tPriority"></textarea>' +
      '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="suggestOffsets" value="1" style="width:auto;height:auto"> ' + esc(CT.t('suggestOff')) + '</label><div id="tplPv"></div>';
    var extra = '<button type="button" class="btn" id="tplPvBtn">' + esc(CT.t('previewBtn')) + '</button>';
    ask(CT.t('impTplTitle'), h, async function (fd) {
      var r = await CT.api('/api/campteam/import-template', { method: 'POST', body: { text: fd.text, nameKo: fd.nameKo, typeId: fd.typeId || null, suggestOffsets: !!fd.suggestOffsets } });
      alert(CT.t('impTplDone') + ': ' + r.summary.itemCount); await loadTpl();
    }, { extra: extra });
    $('tplPvBtn').onclick = async function () {
      var f = $('dlgForm'); $('dlgErr').hidden = true;
      try {
        var r = await CT.api('/api/campteam/import-template', { method: 'POST', body: { text: f.text.value, preview: true, suggestOffsets: f.suggestOffsets.checked } }), s = r.summary;
        $('tplPv').innerHTML = '<div class="hintbox"><b>' + s.itemCount + '</b> · ' + esc(CT.t('withOwner')) + ' ' + s.withOwner + ' · ' + esc(CT.t('withOffset')) + ' ' + s.withOffset + '<br>' + s.sections.map(function (x) { return esc(x.name) + ' (' + x.count + ')'; }).join('<br>') + '</div>';
      } catch (e) { $('dlgErr').textContent = e.message; $('dlgErr').hidden = false; }
    };
  }
  function tplForm(t) {
    ask(CT.t('addTpl'), '<label>' + esc(CT.t('tplName')) + '<input name="nameKo" required maxlength="80" value="' + esc(t ? t.nameKo : '') + '"></label><label>' + esc(CT.t('tplNameEn')) + '<input name="nameEn" maxlength="80" value="' + esc(t ? t.nameEn : '') + '"></label><label>' + esc(CT.t('tplDesc')) + '<input name="description" maxlength="300" value="' + esc(t ? t.description : '') + '"></label>',
      async function (fd) { if (t) await CT.api('/api/campteam/templates?kind=template&id=' + encodeURIComponent(t.id), { method: 'PATCH', body: fd }); else await CT.api('/api/campteam/templates', { method: 'POST', body: Object.assign({ kind: 'template' }, fd) }); await loadTpl(); });
  }
  function itemForm(tplId, it) {
    ask(CT.t('addItem'), '<label>' + esc(CT.t('itemTitle')) + '<input name="title" required maxlength="200" value="' + esc(it ? it.title : '') + '"></label><div class="two"><label>' + esc(CT.t('itemOffset')) + '<input name="offsetDays" type="number" step="1" value="' + esc(it && it.offsetDays != null ? it.offsetDays : '') + '"></label>' +
      '<label>' + esc(CT.t('itemOwner')) + '<input name="ownerSuggestion" maxlength="60" value="' + esc(it ? it.ownerSuggestion : '') + '"></label></div><label>' + esc(CT.t('fPriority')) + '<select name="priority">' + PRI.map(function (s) { return '<option value="' + s[0] + '"' + ((it ? it.priority : 'Medium') === s[0] ? ' selected' : '') + '>' + esc(CT.t(s[1])) + '</option>'; }).join('') + '</select></label>',
      async function (fd) { if (it) await CT.api('/api/campteam/templates?kind=item&id=' + encodeURIComponent(it.id), { method: 'PATCH', body: fd }); else await CT.api('/api/campteam/templates', { method: 'POST', body: Object.assign({ kind: 'item', templateId: tplId }, fd) }); await loadTpl(); });
  }
  function applyForm(tplId) {
    var tpl = S.tpls.filter(function (t) { return t.id === tplId; })[0];
    var h = '<label>' + esc(CT.t('chooseCamp')) + '<select name="campId" id="applyCamp">' + campOptions('', '—') + '</select></label><div id="applyPreview"></div>';
    var extra = '<button type="button" class="btn" id="applyPv">' + esc(CT.t('preview')) + '</button>';
    ask(CT.pick(tpl, 'name') + ' · ' + CT.t('applyTo'), h, async function (fd) {
      var owners = {}; document.querySelectorAll('#applyPreview [data-own]:checked').forEach(function (c) { owners[c.dataset.own] = c.dataset.name; });
      if (!fd.campId) throw new Error(CT.t('chooseCamp'));
      var r = await CT.api('/api/campteam/apply-template', { method: 'POST', body: { campId: fd.campId, templateId: tplId, owners: owners } }); await refresh(); alert(CT.t('done') + ': +' + r.created + ' / ' + r.skipped + ' ' + CT.t('skipExists'));
    }, { extra: extra, saveLabel: CT.t('applyNow') });
    $('applyPv').onclick = async function () {
      var campId = $('applyCamp').value; if (!campId) return;
      try { var r = await CT.api('/api/campteam/apply-template', { method: 'POST', body: { campId: campId, templateId: tplId, preview: true } });
        $('applyPreview').innerHTML = (r.summary.campHasDate ? '' : '<div class="hintbox" style="margin:8px 0">' + esc(CT.t('campNoDate')) + '</div>') + '<table class="prev-table vtable"><thead><tr><th>' + esc(CT.t('willCreate')) + ' (' + r.summary.toCreate + ')</th><th>' + esc(CT.t('due')) + '</th><th>' + esc(CT.t('confirmOwner')) + '</th></tr></thead><tbody>' +
          r.plan.map(function (p) { return '<tr style="' + (p.skip ? 'opacity:.5' : '') + '"><td>' + esc(p.title) + (p.skip ? ' <span class="chip gray">' + esc(CT.t('skipExists')) + '</span>' : '') + '</td><td>' + esc(p.dueDate ? md(p.dueDate) : '—') + '</td><td>' + (p.ownerSuggestion && !p.skip ? '<label style="display:flex;gap:6px;align-items:center"><input type="checkbox" data-own="' + esc(p.itemId) + '" data-name="' + esc(p.ownerSuggestion) + '" style="width:auto;height:auto"> ' + esc(p.ownerSuggestion) + '</label>' : '—') + '</td></tr>'; }).join('') + '</tbody></table>';
      } catch (e) { $('dlgErr').textContent = e.message; $('dlgErr').hidden = false; }
    };
  }

  /* ---------- 시트에서 가져오기 ---------- */
  var impBody = function (preview) { return { csv: $('csv').value, preview: !!preview }; };
  async function importPreview() {
    $('impOut').innerHTML = ''; $('impRun').hidden = true;
    try {
      var r = await CT.api('/api/campteam/import-tasks', { method: 'POST', body: impBody(true) }), s = r.summary;
      $('impOut').innerHTML = '<div class="hintbox"><b>' + s.total + CT.t('impSummary') + '</b> · ' + s.toCreate + ' ' + esc(CT.t('impCreate')) + ' · ' + s.skipped + ' ' + esc(CT.t('impSkip')) + (s.unmatchedCamps.length ? '<br>' + esc(CT.t('impUnmatched')) + ': ' + esc(s.unmatchedCamps.join(', ')) : '') + '</div>' +
        '<table class="prev-table vtable" style="margin-top:8px"><thead><tr><th>Task</th><th>Owner</th><th>Due</th><th>Status</th><th>Camp</th><th></th></tr></thead><tbody>' + r.rows.slice(0, 60).map(function (x) {
          return '<tr style="' + (x.skip ? 'opacity:.5' : '') + '"><td>' + esc(x.title) + '</td><td>' + esc(x.ownerName || '—') + '</td><td>' + esc(x.dueDate || '—') + '</td><td>' + esc(x.status) + '</td><td>' + esc(x.campText || '—') + (x.campText && !x.campId ? ' ⚠' : '') + '</td><td>' + (x.skip ? esc(CT.t('impSkip')) : x.warn.length ? '⚠ ' + esc(x.warn.join(' · ')) : '') + '</td></tr>'; }).join('') + '</tbody></table>';
      $('impRun').hidden = s.toCreate === 0;
    } catch (e) { $('impOut').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
  }
  async function importRun() {
    try { var r = await CT.api('/api/campteam/import-tasks', { method: 'POST', body: impBody(false) }); $('impOut').innerHTML = '<div class="hintbox">' + esc(CT.t('impDone')) + ': +' + r.created + ' / ' + r.skipped + ' ' + esc(CT.t('impSkip')) + '</div>'; $('impRun').hidden = true; $('csv').value = ''; await refresh(); }
    catch (e) { $('impOut').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
  }

  /* ---------- 공통 ---------- */
  async function refresh() { S.types = (await CT.api('/api/campteam/camps')).types; fillFilters(); if (S.tab === 'cal') await loadCal(); else if (S.tab === 'tpl') await loadTpl(); await loadTasks(); }
  function showTab(t) {
    S.tab = t; document.querySelectorAll('#tabs .tab').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === t); });
    ['List', 'Cal', 'Tpl', 'Imp'].forEach(function (n) { $('pane' + n).hidden = ('pane' + n) !== ('pane' + { list: 'List', cal: 'Cal', tpl: 'Tpl', imp: 'Imp' }[t]); });
    if (t === 'cal') loadCal(); if (t === 'tpl') loadTpl();
  }

  CT.boot(async function () {
    try { S.types = (await CT.api('/api/campteam/camps')).types; fillFilters(); await loadTasks(); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    CT.applyI18n(); fillFilters();
    var timer; $('tq').oninput = function () { clearTimeout(timer); timer = setTimeout(loadTasks, 250); };
    ['tcamp', 'tstatus', 'tpri', 'towner', 'tsort'].forEach(function (id) { $(id).onchange = loadTasks; });
    $('tabs').onclick = function (e) { var b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); };
    $('pills').onclick = function (e) { var b = e.target.closest('[data-flag]'); if (b) { S.flag = b.dataset.flag; loadTasks(); } };
    $('addTask').onclick = function () { taskForm(); }; $('addEvent').onclick = function () { eventForm(); }; $('addTpl').onclick = function () { tplForm(); }; $('impTpl').onclick = tplImportForm;
    $('tlist').addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return; var id = b.dataset.edit || b.dataset.del || b.dataset.confirm, t = S.tasks.items.filter(function (x) { return x.id === id; })[0];
      try {
        if (b.dataset.edit) taskForm(t);
        else if (b.dataset.del) { if (confirm(CT.t('delConfirm'))) { await CT.api('/api/campteam/tasks?id=' + encodeURIComponent(id), { method: 'DELETE' }); await loadTasks(); } }
        else if (b.dataset.confirm) { await CT.api('/api/campteam/tasks?id=' + encodeURIComponent(id), { method: 'PATCH', body: { ownerName: t.ownerSuggestion } }); await loadTasks(); }
      } catch (err) { alert(err.message); }
    });
    $('tlist').addEventListener('change', async function (e) { var s = e.target.closest('[data-status]'); if (!s) return; try { await CT.api('/api/campteam/tasks?id=' + encodeURIComponent(s.dataset.status), { method: 'PATCH', body: { status: s.value } }); await loadTasks(); } catch (err) { alert(err.message); } });
    $('calPrev').onclick = function () { var m = monthStart(); S.month = new Date(m.getFullYear(), m.getMonth() - 1, 1); loadCal(); };
    $('calNext').onclick = function () { var m = monthStart(); S.month = new Date(m.getFullYear(), m.getMonth() + 1, 1); loadCal(); };
    $('calToday').onclick = function () { S.month = null; loadCal(); };
    $('viewGrid').onclick = function () { S.calView = 'grid'; renderCal(); }; $('viewAgenda').onclick = function () { S.calView = 'agenda'; renderCal(); };
    $('calBody').addEventListener('click', function (e) {
      var it = e.target.closest('[data-day-ev],[data-day-task]');
      if (it && it.dataset.dayEv) { var ev = S.cal.events.filter(function (x) { return x.id === it.dataset.dayEv; })[0]; if (ev && canWrite()) eventForm(Object.assign({ campId: null, kind: ev.kind }, ev)); return; }
      if (it && it.dataset.dayTask) { var tk = S.cal.tasks.filter(function (x) { return x.id === it.dataset.dayTask; })[0]; if (tk) { CT.api('/api/campteam/tasks?q=' + encodeURIComponent(tk.title)).then(function (r) { var full = r.items.filter(function (x) { return x.id === tk.id; })[0]; if (full && canWrite()) taskForm(full); }); } return; }
      var day = e.target.closest('[data-date]'); if (day && canWrite()) eventForm(null, day.dataset.date);
    });
    $('tplList').addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return; var d = b.dataset;
      try {
        if (d.apply) applyForm(d.apply);
        else if (d.tedit) tplForm(S.tpls.filter(function (t) { return t.id === d.tedit; })[0]);
        else if (d.tdel) { if (confirm(CT.t('delConfirm'))) { await CT.api('/api/campteam/templates?kind=template&id=' + encodeURIComponent(d.tdel), { method: 'DELETE' }); await loadTpl(); } }
        else if (d.iadd) itemForm(d.iadd);
        else if (d.iedit) itemForm(d.tpl, S.tpls.filter(function (t) { return t.id === d.tpl; })[0].items.filter(function (i) { return i.id === d.iedit; })[0]);
        else if (d.idel) { if (confirm(CT.t('delConfirm'))) { await CT.api('/api/campteam/templates?kind=item&id=' + encodeURIComponent(d.idel), { method: 'DELETE' }); await loadTpl(); } }
      } catch (err) { alert(err.message); }
    });
    $('impPreview').onclick = importPreview; $('impRun').onclick = importRun;
    document.addEventListener('ct-lang', function () { CT.applyI18n(); fillFilters(); renderTasks(); if (S.tab === 'cal' && S.cal) renderCal(); if (S.tab === 'tpl') renderTpl(); });
  });
})();
