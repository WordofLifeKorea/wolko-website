(function () {
  CT.addDict({
    ko: { tasksTitle: '업무', tasksSub: '캠프 준비 업무를 한곳에서 보고 관리해요 (일정은 「달력」에서 봐요)', addTask: '+ 업무 추가', addEvent: '+ 일정 추가', viewOnly: '조회만 가능한 계정이에요. 작성·수정은 캠프팀 팀원이 할 수 있어요.', searchPh: '업무 이름·담당자·메모 검색',
      hTask: '업무', dOwner: '담당자', dDue: '기한', dPri: '중요도', dCamp: '캠프', dStatus: '상태', dSection: '구분', dMemo: '메모', dMemoTip: '더블클릭하면 전체 내용을 볼 수 있어요', dOrig: '원래 제목', dState: '활성 여부', dActive: '활성', dUpdated: '마지막 수정', dNoMemo: '메모가 없어요', dClose: '닫기', dTitleH: '업무 자세히',
      pInactive: '비활성', inactiveTag: '비활성', fActive: '활성 업무 (끄면 비활성: 진행 중 업무·알림·진행률·달력에서 빠져요)', actOn: '활성화', actOff: '비활성화', impInactive: '비활성 상태로 가져오기 (팀원이 확인한 뒤 활성으로 바꿔요)',
      tabList: '업무 목록', tabCal: '달력', tabTpl: '체크리스트 템플릿', tabImp: '시트에서 가져오기', today: '오늘', viewGrid: '달력', viewAgenda: '목록',
      pOpen: '진행 중', pOverdue: '마감 지남', pNoOwner: '담당자 미정', pNoDue: '기한 미정', pAll: '전체', fAllCamps: '모든 캠프', fNoCamp: '캠프 없음', fAllStatus: '모든 상태', fAllPri: '모든 우선순위', fAllOwner: '모든 담당자', sortDue: '기한 빠른 순', sortPri: '우선순위 순', sortNew: '최신 순', sortTitle: '이름 순',
      stNot: '미시작', stIn: '진행 중', stWait: '확인 대기', stDelayed: '지연', stDone: '완료', stNA: '해당 없음', priHigh: '높음', priMedium: '보통', priLow: '낮음',
      pgPrev: '이전', pgNext: '다음', pgRange: '전체', pgUnit: '건 중', pgTo: '–',
      owner: '담당', noOwner: '담당자 미정', noDue: '기한 미정', due: '기한', overdue: '마감 지남', suggested: '제안', confirm: '확정', noTasks: '조건에 맞는 업무가 없어요.', edit: '수정', del: '삭제', save: '저장', cancel: '취소',
      fTitle: '업무 이름', fOwner: '담당자 (목록에서 고르거나 직접 적어요 · 여러 명 가능 · 비워 둘 수 있어요)', fDue: '기한 (비워 둘 수 있어요)', fStatus: '상태', fPriority: '우선순위', fCamp: '관련 캠프', fNotes: '메모', fDate: '날짜', fEnd: '종료일 (선택)', fStart: '시작 시간', fEndT: '종료 시간', fKind: '종류', fLoc: '장소', kTeam: '팀 일정', kCamp: '캠프 일정', kOut: '부재', evTitle: '일정', taskTitle: '업무', newTask: '업무 추가', editTask: '업무 수정', newEvent: '일정 추가', editEvent: '일정 수정',
      lgEvent: '팀 일정', lgCamp: '캠프 기간', lgTask: '업무 마감', lgLate: '마감 지남', lgMeet: '회의', noItems: '이 달에는 표시할 항목이 없어요.',
      addTpl: '+ 템플릿', impTplBtn: '체크리스트 붙여넣어 가져오기', impTplTitle: '체크리스트 가져오기', impTplHelp: 'Word나 엑셀의 체크리스트 표를 그대로 복사해서 붙여넣으세요. 구역(1. 기획…)과 우선순위(1 필수·2 중요·3 일반), 담당자가 자동으로 정리돼요. 담당자는 "제안"으로만 들어가고, 기한은 비워 둡니다.', suggestOff: '구역 이름으로 마감 기준일을 임시로 정하기 (나중에 직접 고칠 수 있어요)', provisional: '임시', itemSection: '구역', previewBtn: '미리보기', impTplDone: '템플릿을 만들었어요', sections: '구역', withOwner: '담당 제안 있음', withOffset: '임시 기준일 있음', tplItems: '항목', tplOffset: '기준일', tplOffsetHelp: '캠프 시작일 기준 (예: -30 = 30일 전)', tplOwner: '제안 담당자', tplNone: '(없음 · 마감일 없이 만듦)', addItem: '+ 항목', applyTo: '캠프에 적용', tplName: '템플릿 이름', tplNameEn: '이름 (English)', tplDesc: '설명', itemTitle: '항목 이름', itemOffset: '기준일 (캠프 시작일 기준 며칠 전/후, 비워도 돼요)', itemOwner: '제안 담당자', chooseCamp: '적용할 캠프', preview: '미리보기', applyNow: '이대로 적용', willCreate: '만들어질 업무', skipExists: '이미 있어서 건너뜀', campNoDate: '이 캠프에는 시작일이 없어서 마감일 없이 만들어져요.', confirmOwner: '제안 담당자를 확정', done: '적용했어요',
      impTitle: '기존 Google 시트의 업무를 한 번 가져오기', impHelp: '시트에서 업무 칸 전체(맨 윗줄 머리글 포함)를 복사해서 아래에 붙여넣으세요. (파일 → 다운로드 → .csv 내용도 가능해요) 담당자·기한은 시트에 적힌 그대로만 가져오고, 같은 캠프에 같은 이름의 업무가 이미 있으면 건너뛰어요. Google에는 접속하지 않아요.', impPreview: '미리보기', impRun: '이대로 가져오기', impSummary: '개', impCreate: '새로 만듦', impSkip: '건너뜀(이미 있음)', impUnmatched: '캠프를 연결하지 못한 이름', impWarn: '확인', impDone: '가져왔어요', delConfirm: '삭제할까요? (삭제 표시만 되며 복구할 수 있어요)' },
    en: { tasksTitle: 'Tasks', tasksSub: 'See and manage camp preparation tasks in one place (events are on the Calendar page)', addTask: '+ Task', addEvent: '+ Event', viewOnly: 'View-only account. Camp team members can edit.', searchPh: 'Search task, owner, notes',
      hTask: 'Task', dOwner: 'Owner', dDue: 'Due', dPri: 'Priority', dCamp: 'Camp', dStatus: 'Status', dSection: 'Section', dMemo: 'Notes', dMemoTip: 'Double-click to see everything', dOrig: 'Original title', dState: 'Active', dActive: 'Active', dUpdated: 'Last updated', dNoMemo: 'No notes', dClose: 'Close', dTitleH: 'Task details',
      pInactive: 'Inactive', inactiveTag: 'Inactive', fActive: 'Active task (off = inactive: left out of open tasks, alerts, progress and calendar)', actOn: 'Activate', actOff: 'Deactivate', impInactive: 'Import as inactive (team members review, then activate)',
      tabList: 'Task list', tabCal: 'Calendar', tabTpl: 'Checklist templates', tabImp: 'Import from sheet', today: 'Today', viewGrid: 'Calendar', viewAgenda: 'List',
      pOpen: 'Open', pOverdue: 'Overdue', pNoOwner: 'No owner', pNoDue: 'No due date', pAll: 'All', fAllCamps: 'All camps', fNoCamp: 'No camp', fAllStatus: 'All statuses', fAllPri: 'All priorities', fAllOwner: 'All owners', sortDue: 'Due date', sortPri: 'Priority', sortNew: 'Newest', sortTitle: 'Name',
      stNot: 'Not Started', stIn: 'In Progress', stWait: 'Waiting for Confirmation', stDelayed: 'Delayed', stDone: 'Completed', stNA: 'Not Applicable', priHigh: 'High', priMedium: 'Medium', priLow: 'Low',
      pgPrev: 'Prev', pgNext: 'Next', pgRange: 'of', pgUnit: '', pgTo: '–',
      owner: 'Owner', noOwner: 'No owner', noDue: 'No due date', due: 'Due', overdue: 'Overdue', suggested: 'Suggested', confirm: 'Confirm', noTasks: 'No tasks match.', edit: 'Edit', del: 'Delete', save: 'Save', cancel: 'Cancel',
      fTitle: 'Task name', fOwner: 'Owner (pick from the list or type · several allowed · can be blank)', fDue: 'Due date (can be left blank)', fStatus: 'Status', fPriority: 'Priority', fCamp: 'Camp', fNotes: 'Notes', fDate: 'Date', fEnd: 'End date (optional)', fStart: 'Start time', fEndT: 'End time', fKind: 'Type', fLoc: 'Location', kTeam: 'Team event', kCamp: 'Camp event', kOut: 'Out of office', evTitle: 'Event', taskTitle: 'Task', newTask: 'Add task', editTask: 'Edit task', newEvent: 'Add event', editEvent: 'Edit event',
      lgEvent: 'Team event', lgCamp: 'Camp dates', lgTask: 'Task due', lgLate: 'Overdue', lgMeet: 'Meeting', noItems: 'Nothing to show this month.',
      addTpl: '+ Template', impTplBtn: 'Import checklist by pasting', impTplTitle: 'Import checklist', impTplHelp: 'Copy the checklist table from Word or Excel and paste it here. Sections, priorities (1 Required · 2 Important · 3 General) and owners are organized automatically. Owners are only suggestions and due dates stay empty.', suggestOff: 'Set provisional due offsets from section names (you can edit them later)', provisional: 'provisional', itemSection: 'Section', previewBtn: 'Preview', impTplDone: 'Template created', sections: 'Sections', withOwner: 'With owner suggestion', withOffset: 'With provisional offset', tplItems: 'Items', tplOffset: 'Offset', tplOffsetHelp: 'Relative to camp start (e.g. -30 = 30 days before)', tplOwner: 'Suggested owner', tplNone: '(none · created without due date)', addItem: '+ Item', applyTo: 'Apply to camp', tplName: 'Template name', tplNameEn: 'Name (English)', tplDesc: 'Description', itemTitle: 'Item name', itemOffset: 'Offset (days before/after camp start, optional)', itemOwner: 'Suggested owner', chooseCamp: 'Camp to apply to', preview: 'Preview', applyNow: 'Apply as shown', willCreate: 'Tasks to be created', skipExists: 'Already exists — skipped', campNoDate: 'This camp has no start date, so tasks are created without due dates.', confirmOwner: 'Confirm suggested owner', done: 'Applied',
      impTitle: 'One-time import of tasks from the existing Google Sheet', impHelp: 'In the sheet, select all task cells (including the header row), copy, and paste below. (Content of a downloaded .csv also works.) Owners and due dates are imported exactly as written; tasks that already exist in the same camp are skipped. Nothing connects to Google.', impPreview: 'Preview', impRun: 'Import as shown', impSummary: ' rows', impCreate: 'to create', impSkip: 'skipped (already exist)', impUnmatched: 'Camps that could not be matched', impWarn: 'Check', impDone: 'Imported', delConfirm: 'Delete this? (It is only marked deleted and can be restored.)' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var STATUS = [['Not Started', 'stNot'], ['In Progress', 'stIn'], ['Waiting for Confirmation', 'stWait'], ['Delayed', 'stDelayed'], ['Completed', 'stDone'], ['Not Applicable', 'stNA']];
  var PRI = [['High', 'priHigh'], ['Medium', 'priMedium'], ['Low', 'priLow']];
  var PAGE = 20, S = { page: 1, tasks: null, types: [], flag: 'open', tab: 'list', month: null, calView: 'grid', cal: null, tpls: [], perms: null };
  var canWrite = function () { return !!(S.perms && S.perms.areas && S.perms.areas.tasks === 'edit'); };
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
    $('addTask').hidden = !canWrite(); $('viewOnly').hidden = canWrite(); $('impTab').hidden = !canWrite(); $('addTpl').hidden = !canWrite(); $('impTpl').hidden = !canWrite();
    $('pills').innerHTML = [['open', 'pOpen', c.open, ''], ['overdue', 'pOverdue', c.overdue, 'red'], ['noowner', 'pNoOwner', c.noOwner, 'red'], ['nodue', 'pNoDue', c.noDue, ''], ['', 'pAll', '', ''], ['inactive', 'pInactive', c.inactive || 0, 'gray']].map(function (p) {
      return '<button class="pill ' + p[3] + (S.flag === p[0] ? ' on' : '') + '" data-flag="' + p[0] + '">' + esc(CT.t(p[1])) + (p[2] !== '' ? '<b>' + p[2] + '</b>' : '') + '</button>'; }).join('');
    var all = S.tasks.items, pages = Math.max(1, Math.ceil(all.length / PAGE)); if (S.page > pages) S.page = pages; if (S.page < 1) S.page = 1;
    var shown = all.slice((S.page - 1) * PAGE, S.page * PAGE);
    var head = '<div class="task-head"><div>' + esc(CT.t('hTask')) + '</div><div>' + esc(CT.t('dOwner')) + '</div><div>' + esc(CT.t('dDue')) + '</div><div>' + esc(CT.t('dPri')) + '</div><div>' + esc(CT.t('dCamp')) + '</div><div></div></div>';
    $('tlist').innerHTML = shown.length ? head + shown.map(function (t) {
      var late = t.dueDate && t.dueDate < today && t.status !== 'Completed' && t.status !== 'Not Applicable';
      var ownerHtml = t.ownerName ? '<span class="ml">' + esc(CT.t('owner')) + ': </span>' + esc(t.ownerName) : '<span class="tag t-late">' + esc(CT.t('noOwner')) + '</span>' + CT.help('ownerSuggest') + (t.ownerSuggestion ? ' <span class="sugg">' + esc(CT.t('suggested')) + ': ' + esc(t.ownerSuggestion) + (canWrite() ? '<button data-confirm="' + esc(t.id) + '">' + esc(CT.t('confirm')) + '</button>' : '') + '</span>' : '');
      var dueHtml = t.dueDate ? '<span class="tag ' + (late ? 't-late' : daysFrom(today, t.dueDate) <= 3 ? 't-soon' : 't-none') + '">' + esc(CT.t('due')) + ' ' + esc(md(t.dueDate)) + (late ? ' · ' + esc(CT.t('overdue')) : '') + '</span>' : '<span class="tag t-none">' + esc(CT.t('noDue')) + '</span>';
      var memo = t.notes ? String(t.notes).split(/\r?\n/).filter(function (x) { return x.trim(); })[0] || '' : '';
      // 칸을 고정해서 담당자·기한·중요도·캠프가 모든 카드에서 같은 자리에 오게 한다 (칸 사이는 빈 공간만, 선 없음)
      return '<div class="task ' + (t.status === 'Completed' ? 'done' : '') + (t.inactive ? ' inactive' : '') + '" data-tid="' + esc(t.id) + '">' +
        '<div class="c-title"><div class="tt">' + (t.inactive ? '<span class="chip gray">' + esc(CT.t('inactiveTag')) + '</span> ' : '') + (t.isTest ? '<span class="chip test">' + esc(CT.t('test')) + '</span> ' : '') + esc(CT.tt(t)) + '</div>' + (memo ? '<div class="tmemo" title="' + esc(CT.t('dMemoTip')) + '">' + esc(memo) + '</div>' : '') + '</div>' +
        '<div class="c-owner">' + ownerHtml + '</div><div class="c-due">' + dueHtml + '</div><div class="c-pri"><span class="tag p-' + t.priority + '">' + esc(priLabel(t.priority)) + '</span></div><div class="c-camp"><span class="ml">' + esc(CT.t('fCamp')) + ': </span>' + esc(campLabel(t) || '—') + '</div>' +
        '<div class="actions">' + (canWrite() ? '<select data-status="' + esc(t.id) + '">' + STATUS.map(function (s) { return '<option value="' + s[0] + '"' + (t.status === s[0] ? ' selected' : '') + '>' + esc(CT.t(s[1])) + '</option>'; }).join('') + '</select><div class="abtns"><button class="btn sm" data-toggle="' + esc(t.id) + '">' + esc(CT.t(t.inactive ? 'actOn' : 'actOff')) + '</button><button class="btn sm" data-edit="' + esc(t.id) + '">' + esc(CT.t('edit')) + '</button><button class="btn sm danger" data-del="' + esc(t.id) + '">' + esc(CT.t('del')) + '</button></div>' : '<span class="status">' + esc(stLabel(t.status)) + '</span>') + '</div></div>';
    }).join('') : '<div class="empty">' + esc(CT.t('noTasks')) + '</div>';
    renderPager(all.length, pages);
  }
  function renderPager(total, pages) {
    var el = $('tpager'); if (!el) return;
    if (total <= PAGE) { el.innerHTML = ''; return; }
    var from = (S.page - 1) * PAGE + 1, to = Math.min(total, S.page * PAGE), nums = [];
    for (var i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - S.page) <= 2) nums.push(i);
    var out = [], prev = 0; nums.forEach(function (n) { if (prev && n - prev > 1) out.push('<span class="pg-gap">…</span>'); out.push('<button type="button" class="pg' + (n === S.page ? ' on' : '') + '" data-pg="' + n + '"' + (n === S.page ? ' aria-current="page"' : '') + '>' + n + '</button>'); prev = n; });
    el.innerHTML = '<span class="pg-info">' + from + CT.t('pgTo') + to + ' / ' + total + '</span><button type="button" class="pg" data-pg="' + (S.page - 1) + '"' + (S.page === 1 ? ' disabled' : '') + '>‹ ' + esc(CT.t('pgPrev')) + '</button>' + out.join('') + '<button type="button" class="pg" data-pg="' + (S.page + 1) + '"' + (S.page === pages ? ' disabled' : '') + '>' + esc(CT.t('pgNext')) + ' ›</button>';
  }
  // 담당자 입력칸 제안: 팀 명단의 사람(이름 · 업무에 적는 이름). 고르면 이름이 채워지고, 저장할 때 서버가 이메일을 연결한다. 직접 써도 이름·별칭이 맞으면 같은 사람으로 인식한다.
  var PEOPLE = null;
  function ownerListHtml() {
    if (!PEOPLE) return '';
    var opts = []; PEOPLE.forEach(function (p) { if (p.name) opts.push(p.name); (p.aliases ? p.aliases.split(',') : []).forEach(function (a) { a = a.trim(); if (a && a !== p.name) opts.push(a); }); });
    return '<datalist id="ownerList">' + opts.map(function (o) { return '<option value="' + esc(o) + '">'; }).join('') + '</datalist>';
  }
  // 담당자 고르기 목록(팀 명단 + 관리자가 정한 기본 이름 + 업무에 이미 쓰인 이름)
  var OWN = null;
  function loadOwners() { return CT.api('/api/campteam/owners').then(function (r) { OWN = (r.options || []).map(function (o) { return o.name; }); }).catch(function () { OWN = null; }); }
  function ownerOpts() { if (OWN) return OWN; var o = []; (PEOPLE || []).forEach(function (p) { if (p.name) o.push(p.name); }); return o; }
  function loadPeople() { return CT.api('/api/campteam/people').then(function (r) { PEOPLE = r.people; }).catch(function () { PEOPLE = []; }); }
  /** 알림·달력에서 ?open=업무번호 로 들어오면 그 업무의 수정 창을 바로 연다 */
  async function openById(id) {
    try { await loadOwners(); var r = await CT.api('/api/campteam/tasks?id=' + encodeURIComponent(id)); var t = (r.items || []).filter(function (x) { return x.id === id; })[0]; if (t) { await loadPeople(); if (canWrite()) taskForm(t); else { var f = $('tq'); f.value = t.title; await loadTasks(); } } } catch (e) { /* 업무가 없어졌으면 목록만 보여 준다 */ }
  }
  function taskForm(t) {
    if (!PEOPLE) loadPeople(); if (!OWN) loadOwners();
    var h = '<label>' + esc(CT.t('fTitle')) + '<input name="title" required maxlength="200" value="' + esc(t ? t.title : '') + '"></label>' +
      CT.ownerPickerHtml(CT.t('fOwner'), t ? t.ownerName : '') +
      '<div class="two"><label>' + esc(CT.t('fDue')) + '<input type="date" name="dueDate" value="' + esc(t && t.dueDate || '') + '"></label><label>' + esc(CT.t('fStatus')) + '<select name="status">' + STATUS.map(function (s) { return '<option value="' + s[0] + '"' + ((t ? t.status : 'Not Started') === s[0] ? ' selected' : '') + '>' + esc(CT.t(s[1])) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="two"><label>' + esc(CT.t('fPriority')) + '<select name="priority">' + PRI.map(function (s) { return '<option value="' + s[0] + '"' + ((t ? t.priority : 'Medium') === s[0] ? ' selected' : '') + '>' + esc(CT.t(s[1])) + '</option>'; }).join('') + '</select></label>' +
      '<label>' + esc(CT.t('fCamp')) + '<select name="campId">' + campOptions(t && t.campId, CT.t('fNoCamp')) + '</select></label></div>' +
      '<label>' + esc(CT.t('fNotes')) + '<textarea name="notes" maxlength="1000">' + esc(t ? t.notes : '') + '</textarea></label>' +
      '<label class="chk"><input type="checkbox" name="active" value="1"' + (t && t.inactive ? '' : ' checked') + '> ' + esc(CT.t('fActive')) + '</label>';
    ask(CT.t(t ? 'editTask' : 'newTask'), h, async function (fd) {
      var body = { title: fd.title, ownerName: fd.ownerName, dueDate: fd.dueDate || null, status: fd.status, priority: fd.priority, campId: fd.campId || null, notes: fd.notes, inactive: fd.active ? 0 : 1 };
      if (t) await CT.api('/api/campteam/tasks?id=' + encodeURIComponent(t.id), { method: 'PATCH', body: body }); else await CT.api('/api/campteam/tasks', { method: 'POST', body: body });
      await refresh(); loadOwners(); // 새로 쓴 이름이 목록에 반영되도록 다시 읽는다
    });
    CT.ownerPicker($('dlgFields').querySelector('.opick'), { options: ownerOpts(), value: t ? t.ownerName : '', placeholder: t && t.ownerSuggestion && !t.ownerName ? CT.t('suggested') + ': ' + t.ownerSuggestion : '' });
  }
  /** 업무 자세히 보기 (더블클릭 · 폰은 제목 한 번 탭) */
  function openDetail(t) {
    if (!t) return; var d = $('tdetail'), row = function (k, v) { return '<div class="dk">' + esc(CT.t(k)) + '</div><div class="dv">' + v + '</div>'; };
    var shown = CT.tt(t), orig = t.title && t.title !== shown ? '<div class="dorig">' + esc(CT.t('dOrig')) + ': ' + esc(t.title) + '</div>' : '';
    $('tdTitle').textContent = shown;
    $('tdBody').innerHTML = (orig ? orig : '') + '<div class="dgrid">' +
      row('dOwner', t.ownerName ? esc(t.ownerName) : '<span class="tag t-late">' + esc(CT.t('noOwner')) + '</span>') + row('dDue', t.dueDate ? esc(t.dueDate) : esc(CT.t('noDue'))) +
      row('dStatus', esc(stLabel(t.status))) + row('dPri', '<span class="tag p-' + t.priority + '">' + esc(priLabel(t.priority)) + '</span>') + row('dCamp', esc(campLabel(t) || '—')) + (t.section ? row('dSection', esc(t.section)) : '') +
      row('dState', esc(t.inactive ? CT.t('inactiveTag') : CT.t('dActive'))) + (t.updatedAt ? row('dUpdated', esc(String(t.updatedAt).slice(0, 16).replace('T', ' '))) : '') + '</div>' +
      '<div class="dk" style="margin-top:12px">' + esc(CT.t('dMemo')) + '</div><div class="dmemo">' + (t.notes ? esc(t.notes) : '<span class="hint">' + esc(CT.t('dNoMemo')) + '</span>') + '</div>';
    $('tdActions').innerHTML = (canWrite() ? '<button type="button" class="btn pri" id="tdEdit">' + esc(CT.t('edit')) + '</button>' : '') + '<button type="button" class="btn" id="tdClose">' + esc(CT.t('dClose')) + '</button>';
    $('tdClose').onclick = function () { d.close(); };
    if ($('tdEdit')) $('tdEdit').onclick = function () { d.close(); taskForm(t); };
    d.showModal();
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
  var impBody = function (preview) { return { csv: $('csv').value, preview: !!preview, inactive: !!($('impInactive') && $('impInactive').checked) }; };
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
  async function refresh() { S.types = (await CT.api('/api/campteam/camps')).types; fillFilters(); if (S.tab === 'tpl') await loadTpl(); await loadTasks(); }
  function showTab(t) {
    S.tab = t; document.querySelectorAll('#tabs .tab').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === t); });
    var want = { list: 'List', tpl: 'Tpl', imp: 'Imp' }[t] || 'List';
    ['List', 'Tpl', 'Imp'].forEach(function (n) { var el = $('pane' + n); if (el) el.hidden = n !== want; });
    if (t === 'tpl') loadTpl();
  }

  CT.boot(async function () {
    loadPeople(); loadOwners();
    try { S.types = (await CT.api('/api/campteam/camps')).types; fillFilters(); await loadTasks(); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    CT.applyI18n(); fillFilters();
    var up = new URLSearchParams(location.search); if (up.get('open')) { openById(up.get('open')); } if (up.get('campId') || up.get('flag')) { if (up.get('campId')) $('tcamp').value = up.get('campId'); S.flag = up.get('flag') || ''; await loadTasks(); }
    var timer; $('tq').oninput = function () { clearTimeout(timer); timer = setTimeout(function () { S.page = 1; loadTasks(); }, 250); };
    ['tcamp', 'tstatus', 'tpri', 'towner', 'tsort'].forEach(function (id) { $(id).onchange = function () { S.page = 1; loadTasks(); }; });
    $('tabs').onclick = function (e) { var b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); };
    $('pills').onclick = function (e) { var b = e.target.closest('[data-flag]'); if (b) { S.flag = b.dataset.flag; S.page = 1; loadTasks(); } };
    $('tpager').onclick = function (e) { var b = e.target.closest('[data-pg]'); if (!b || b.disabled) return; S.page = Number(b.dataset.pg) || 1; renderTasks(); var l = $('tlist'); if (l && l.scrollIntoView) l.scrollIntoView({ block: 'start' }); };
    $('addTask').onclick = function () { taskForm(); }; $('addTpl').onclick = function () { tplForm(); }; $('impTpl').onclick = tplImportForm;
    var byTid = function (el) { var r = el.closest && el.closest('.task'); return r ? S.tasks.items.filter(function (x) { return x.id === r.dataset.tid; })[0] : null; };
    $('tlist').addEventListener('dblclick', function (e) { if (e.target.closest('button,select,a,input,.actions')) return; openDetail(byTid(e.target)); });
    $('tlist').addEventListener('click', function (e) { if (window.innerWidth <= 700 && e.target.closest('.tt')) openDetail(byTid(e.target)); }); // 폰: 제목을 한 번 탭
    $('tlist').addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return; var id = b.dataset.edit || b.dataset.del || b.dataset.confirm || b.dataset.toggle, t = S.tasks.items.filter(function (x) { return x.id === id; })[0];
      try {
        if (b.dataset.edit) taskForm(t);
        else if (b.dataset.toggle) { await CT.api('/api/campteam/tasks?id=' + encodeURIComponent(id), { method: 'PATCH', body: { inactive: t.inactive ? 0 : 1 } }); await loadTasks(); }
        else if (b.dataset.del) { if (confirm(CT.t('delConfirm'))) { await CT.api('/api/campteam/tasks?id=' + encodeURIComponent(id), { method: 'DELETE' }); await loadTasks(); } }
        else if (b.dataset.confirm) { await CT.api('/api/campteam/tasks?id=' + encodeURIComponent(id), { method: 'PATCH', body: { ownerName: t.ownerSuggestion } }); await loadTasks(); }
      } catch (err) { alert(err.message); }
    });
    $('tlist').addEventListener('change', async function (e) { var s = e.target.closest('[data-status]'); if (!s) return; try { await CT.api('/api/campteam/tasks?id=' + encodeURIComponent(s.dataset.status), { method: 'PATCH', body: { status: s.value } }); await loadTasks(); } catch (err) { alert(err.message); } });
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
    document.addEventListener('ct-lang', function () { CT.applyI18n(); fillFilters(); renderTasks(); if (S.tab === 'tpl') renderTpl(); });
  });
})();
