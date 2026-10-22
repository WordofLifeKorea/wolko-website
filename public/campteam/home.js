(function () {
  CT.addDict({
    ko: { homeTitle: '캠프팀 홈', openTasks: '진행 중 업무', overdue: '마감 지남', noOwner: '담당자 미정', completion: '전체 완료율', activeCamps: '진행 중 · 예정 캠프', allCamps: '전체 보기', upcoming: '가까운 업무 마감', attention: '확인이 필요한 업무', agenda: '다음 회의 안건', recentMeetings: '최근 회의록', recentFiles: '최근 업로드 파일', budget: '캠프 예산 요약', budgetLocked: '🔒 예산·금액은 권한이 있는 팀원에게만 보입니다.', planned: '예산 계획', actual: '실제 지출', forecast: '예상 최종', remaining: '총 예산 대비 남음', openBudget: '예산 자세히 보기', lines: '항목 수',
      none: '표시할 내용이 없어요.', ledgerIncome: '수입', ledgerExpense: '지출', ledgerBalance: '현재 잔액', ledgerPending: '경비 리포트에서 확인할 항목이', ledgerPendingTail: '건 있어요.', ledgerOpen: '회계 장부 열기', ledgerReconDiff: '최근 잔액 대조에서 차이가 있었어요', editHome: '홈 꾸미기', editDone: '편집 끝내기', statsTitle: '핵심 숫자', scopeMine: '내 홈', scopeDefault: '모두의 기본 홈', hintMine: '나에게만 적용돼요. 저장하면 관리자가 정한 기본 홈보다 내 설정이 우선해요.', hintDefault: '개인 설정을 따로 저장하지 않은 모든 팀원에게 적용돼요.', resetMine: '기본 홈으로 되돌리기', resetDefault: '처음 모양으로 되돌리기', saved: '저장했어요.', reset: '되돌렸어요.', secShow: '보이기', secHide: '숨기기', secWide: '넓게', secHalf: '반쪽', secUp: '앞으로', secDown: '뒤로', secDrag: '끌어서 순서 바꾸기', secHiddenTag: '숨김', leaveDirty: '저장하지 않은 변경이 있어요. 버리고 계속할까요?', needOne: '보이는 섹션이 하나는 있어야 해요.', mineOverrides: '내 설정이 적용되어 있어요', noOwnerTag: '담당 미정', noDueTag: '기한 미정', overdueTag: '마감 지남', tasksOf: '업무', doneOf: '완료', owner: '담당', campsCount: '진행 중 캠프', today: '오늘', pending: '논의 필요', discussed: '논의함', decided: '결정됨', planning: '준비 중', active: '진행 중', done: '종료', canceled: '취소', dateTbd: '날짜 미정' },
    en: { homeTitle: 'Camp Team Home', openTasks: 'Open tasks', overdue: 'Overdue', noOwner: 'No owner', completion: 'Completion', activeCamps: 'Active & upcoming camps', allCamps: 'View all', upcoming: 'Upcoming deadlines', attention: 'Needs attention', agenda: 'Next meeting agenda', recentMeetings: 'Recent meetings', recentFiles: 'Recently uploaded files', budget: 'Camp budget summary', budgetLocked: '🔒 Budget and amounts are visible only to authorized team members.', planned: 'Planned', actual: 'Actual', forecast: 'Forecast', remaining: 'Remaining vs target', openBudget: 'Open budget', lines: 'Line items',
      none: 'Nothing to show.', ledgerIncome: 'Income', ledgerExpense: 'Expenses', ledgerBalance: 'Balance', ledgerPending: 'Expense report items to check:', ledgerPendingTail: '.', ledgerOpen: 'Open ledger', ledgerReconDiff: 'Last reconciliation showed a difference', editHome: 'Customize home', editDone: 'Done editing', statsTitle: 'Key numbers', scopeMine: 'My home', scopeDefault: 'Default home for everyone', hintMine: 'Applies only to you. Once saved, your layout takes priority over the admin default.', hintDefault: 'Applies to every team member who has not saved a personal layout.', resetMine: 'Back to default home', resetDefault: 'Restore original layout', saved: 'Saved.', reset: 'Restored.', secShow: 'Show', secHide: 'Hide', secWide: 'Wide', secHalf: 'Half', secUp: 'Move earlier', secDown: 'Move later', secDrag: 'Drag to reorder', secHiddenTag: 'Hidden', leaveDirty: 'You have unsaved changes. Discard and continue?', needOne: 'At least one section must stay visible.', mineOverrides: 'Your personal layout is applied', noOwnerTag: 'No owner', noDueTag: 'No due date', overdueTag: 'Overdue', tasksOf: 'tasks', doneOf: 'done', owner: 'Owner', campsCount: 'Active camps', today: 'Today', pending: 'To discuss', discussed: 'Discussed', decided: 'Decided', planning: 'Planning', active: 'Active', done: 'Done', canceled: 'Canceled', dateTbd: 'Date TBD' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var data = null;

  function testChip(row) { return row.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : ''; }
  function daysBetween(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }
  function dueTag(due, today) {
    if (!due) return '<span class="tag t-none">' + esc(CT.t('noDueTag')) + '</span>';
    var diff = daysBetween(today, due);
    var cls = diff < 0 ? 't-late' : diff <= 3 ? 't-soon' : 't-none';
    return '<span class="tag ' + cls + '">' + esc(CT.fmtDate(due)) + '</span>';
  }
  function empty() { return '<div class="empty">' + esc(CT.t('none')) + '</div>'; }
  function campName(r) { return CT.lang() === 'en' ? (r.campEn || r.campKo || '') : (r.campKo || r.campEn || ''); }

  function ledgerHtml(l) {
    if (!l) return '';
    return '<div class="money" style="margin-bottom:12px"><div><label>' + esc(l.name) + ' · ' + esc(CT.t('ledgerIncome')) + '</label><strong style="color:var(--ok)">' + esc(CT.money(l.income, 'KRW')) + '</strong></div><div><label>' + esc(CT.t('ledgerExpense')) + '</label><strong style="color:var(--accent)">' + esc(CT.money(l.expense, 'KRW')) + '</strong></div><div><label>' + esc(CT.t('ledgerBalance')) + '</label><strong>' + esc(CT.money(l.balance, 'KRW')) + '</strong></div></div>' +
      (l.pendingExpense ? '<div class="hintbox" style="margin-bottom:10px;color:var(--accent)">' + esc(CT.t('ledgerPending')) + ' ' + l.pendingExpense + esc(CT.t('ledgerPendingTail')) + ' <a href="/campteam/finance/">' + esc(CT.t('ledgerOpen')) + '</a></div>' : '') +
      (l.lastReconcile && l.lastReconcile.diff !== 0 ? '<div class="hintbox" style="margin-bottom:10px">' + esc(CT.t('ledgerReconDiff')) + ' ' + esc(l.lastReconcile.asOfDate) + ': <b style="color:var(--accent)">' + esc(CT.money(l.lastReconcile.diff, 'KRW')) + '</b></div>' : '') +
      (!l.pendingExpense ? '<a href="/campteam/finance/" class="btn sm" style="margin-bottom:10px">' + esc(CT.t('ledgerOpen')) + '</a>' : '');
  }
  function body(id) {
    var d = data, s = d.stats, pct = s.total ? Math.round(s.completed / s.total * 100) : 0;
    if (id === 'stats') return '<div class="stats">' +
      '<div class="stat"><label>' + esc(CT.t('openTasks')) + '</label><strong>' + s.open + '</strong></div>' +
      '<div class="stat late"><label>' + esc(CT.t('overdue')) + '</label><strong>' + s.overdue + '</strong></div>' +
      '<div class="stat"><label>' + esc(CT.t('noOwner')) + '</label><strong>' + s.noOwner + '</strong></div>' +
      '<div class="stat"><label>' + esc(CT.t('completion')) + '</label><strong>' + pct + '%</strong></div></div>';
    if (id === 'camps') return d.camps.length ? d.camps.map(function (c) {
      var pc = c.taskTotal ? Math.round(c.taskDone / c.taskTotal * 100) : 0;
      var dates = c.startDate ? esc(CT.fmtDate(c.startDate)) + (c.endDate ? ' – ' + esc(CT.fmtDate(c.endDate)) : '') : esc(CT.t('dateTbd'));
      return '<div class="camp"><b><a href="/campteam/space/?id=' + esc(c.id) + '" style="color:inherit;text-decoration:none">' + esc(CT.pick(c, 'name')) + '</a></b>' + testChip(c) +
        '<div class="meta">' + esc(CT.pick({ nameKo: c.typeKo, nameEn: c.typeEn }, 'name')) + ' · ' + dates + ' · ' + esc(CT.t(c.status)) + (c.taskTotal == null ? '' : ' · ' + c.taskDone + '/' + c.taskTotal + ' ' + esc(CT.t('doneOf'))) + '</div>' +
        (c.taskTotal == null ? '' : '<div class="bar"><i style="width:' + pc + '%"></i></div>') + '</div>';
    }).join('') : empty();
    if (id === 'deadlines') return d.deadlines.length ? d.deadlines.map(function (t) {
      return '<div class="row"><div>' + esc(t.title) + testChip(t) + '<small>' + esc(CT.t('owner')) + ': ' + esc(t.ownerName || '—') + (campName(t) ? ' · ' + esc(campName(t)) : '') + '</small></div>' + dueTag(t.dueDate, d.today) + '</div>';
    }).join('') : empty();
    if (id === 'attention') return d.attention.length ? d.attention.map(function (t) {
      var late = t.dueDate && t.dueDate < d.today, noOwn = !t.ownerName;
      var tag = noOwn ? '<span class="tag t-late">' + esc(CT.t('noOwnerTag')) + '</span>' : late ? '<span class="tag t-late">' + esc(CT.t('overdueTag')) + '</span>' : '';
      return '<div class="row"><div>' + esc(t.title) + testChip(t) + '<small>' + (campName(t) ? esc(campName(t)) : '') + (t.dueDate ? ' · ' + esc(CT.fmtDate(t.dueDate)) : '') + '</small></div>' + tag + '</div>';
    }).join('') : empty();
    if (id === 'agenda') return d.agenda.length ? d.agenda.map(function (a) {
      var cls = a.status === 'decided' ? 't-ok' : a.status === 'discussed' ? 't-soon' : 't-none';
      return '<div class="row"><div>' + esc(a.topic) + testChip(a) + '<small>' + esc(a.note || campName(a)) + '</small></div><span class="tag ' + cls + '">' + esc(CT.t(a.status)) + '</span></div>';
    }).join('') : empty();
    if (id === 'meetings') return d.meetings.length ? d.meetings.map(function (m) {
      return '<div class="row"><div><a href="/campteam/meetings/?open=' + esc(m.id) + '">' + esc(m.title) + '</a>' + testChip(m) + '<small>' + esc(m.meetDate) + (m.meetTime ? ' ' + esc(m.meetTime) : '') + (m.purpose ? ' · ' + esc(m.purpose) : '') + '</small></div></div>';
    }).join('') : empty();
    if (id === 'files') return d.files.length ? d.files.map(function (f) {
      var k = ['pdf', 'xls', 'doc', 'img', 'ppt', 'audio'].indexOf(f.kind) >= 0 ? f.kind : '';
      return '<div class="file"><span class="ext ' + k + '">' + esc((f.kind || 'file').slice(0, 3).toUpperCase()) + '</span><div>' + esc(f.title) + testChip(f) +
        '<small>' + esc(String(f.uploadedBy || '').split('@')[0]) + ' · ' + esc(relTime(f.updatedAt || f.createdAt)) + (f.updatedAt && f.updatedAt > f.createdAt ? ' · ' + esc(CT.t('fileUpdated')) : '') + (f.statusLabel ? ' · ' + esc(f.statusLabel) : '') + '</small></div></div>';
    }).join('') : empty();
    if (id === 'budget') return ledgerHtml(d.ledger) + (d.budget
      ? (d.budget.summary.length ? d.budget.summary.map(function (b) {
          return '<div class="money" style="margin-bottom:10px"><div><label>' + esc(b.currency) + ' · ' + esc(CT.t('planned')) + '</label><strong>' + esc(CT.money(b.planned, b.currency)) + '</strong></div><div><label>' + esc(CT.t('forecast')) + '</label><strong>' + esc(CT.money(b.forecast, b.currency)) + '</strong></div><div><label>' + esc(CT.t('actual')) + '</label><strong>' + esc(CT.money(b.actual, b.currency)) + '</strong></div>' +
            (b.remaining != null ? '<div><label>' + esc(CT.t('remaining')) + '</label><strong style="color:' + (b.remaining < 0 ? 'var(--accent)' : 'var(--blue)') + '">' + esc(CT.money(b.remaining, b.currency)) + '</strong></div>' : '') + '</div>'; }).join('') + '<a href="/campteam/finance/" class="btn sm">' + esc(CT.t('openBudget')) + '</a>' : '<div class="empty">' + esc(CT.t('none')) + '</div>')
      : (d.ledger ? '' : '<div class="locked">' + esc(CT.t('budgetLocked')) + '</div>'));
    return '';
  }

  CT.addDict({
    ko: { noticesTitle: '공지', linksTitle: '바로가기', myTasksTitle: '내 담당 업무', calTitle: '캠프팀 달력', ddayTitle: '캠프 D-day', activityTitle: '최근 변경 기록',
      wNoticesD: '팀 공지를 홈에서 바로 봐요', wLinksD: '자주 가는 화면으로 가는 버튼', wMyTasksD: '담당자 이메일이 내 이메일인 업무', wCalendarD: '일정·업무 마감·회의를 월 달력으로', wDdayD: '고른 캠프까지 남은 날짜 (여러 개 가능)', wActivityD: '팀원들이 방금 올리고 바꾼 것 (캠프팀 팀원만)',
      wStatsD: '핵심 숫자 4개', wCampsD: '진행 중·예정 캠프', wDeadlinesD: '가까운 업무 마감', wAttentionD: '담당 미정·마감 지남 업무', wAgendaD: '다음 회의 안건', wMeetingsD: '최근 회의록', wFilesD: '최근 올린 파일', wBudgetD: '예산 요약 (금액 권한자만)',
      addWidget: '위젯 추가', tidy: '빈틈 정리', allAdded: '더 추가할 위젯이 없어요.', noRoom: '자리가 없어서 맨 아래에 놓았어요.', overlapMsg: '옆 위젯과 겹쳐서 바꿀 수 없어요.', tidyDone: '빈 공간을 위로 모았어요.', remove: '홈에서 빼기', widthToggle: '너비 전체/반쪽', resize: '크기 조절',
      editNarrow: '위젯 편집은 넓은 화면에서 할 수 있어요.', myTasksNone: '내 이메일이 담당자로 지정된 업무가 없어요.', noticesNone: '등록된 공지가 없어요.', pickCamp: '캠프 고르기', ddayNone: '날짜가 있는 캠프를 골라 주세요', ddayDay: 'D-DAY', ddayLive: '진행 중', dateTbdLong: '날짜 미정',
      activityNone: '기록이 없어요.', linkResources: '캠프 자료실', linkFiles: '자료실', linkTasks: '업무', linkCalendar: '달력', linkMeetings: '회의록 · 결정', linkCamps: '캠프별 공간', linkTv: 'TV 대시보드', linkBudget: '캠프 예산', linkSearch: '전체 검색',
      actCreate: '만듦', actUpdate: '수정', actDelete: '삭제', actUpload: '파일 올림', actNew_version: '새 버전 올림', actLink_file: '파일 연결', actUnlink_file: '파일 연결 해제', actImport_csv: '시트 가져오기', actImport_minutes: '회의록 가져오기', actImport_template: '체크리스트 가져오기', actCopy_budget: '예산 복사', actUpsert: '수정', entTask: '업무', entEvent: '일정', entMeeting: '회의', entAgenda_item: '안건', entDecision: '결정', entFile: '파일', entCamp: '캠프', entCamp_type: '캠프 유형', entNotice: '공지', entGlossary: '용어집', entChecklist_template: '체크리스트', entChecklist_item: '체크리스트 항목', entBudget_line: '예산', entBudget_target: '예산', justNow: '방금', minAgo: '분 전', hrAgo: '시간 전', fileUpdated: '업데이트', actNone: '아직 기록이 없어요.', teamOnlyNote: '캠프팀 팀원에게만 보여요.', calToday: '오늘', calViewMonth: '달력', calViewList: '목록', calListEmpty: '이 기간에 일정이 없어요.', thisweekTitle: '이번 주 일정', overdueTitle: '마감 지난 업무', decisionsTitle: '최근 결정', statusTitle: '업무 상태별 현황', wThisweekD: '오늘부터 7일간 일정·업무 마감·회의', wOverdueD: '마감이 지났는데 아직 안 끝난 업무', wDecisionsD: '최근 방향 합의·최종 결정', wStatusD: '업무가 어떤 상태인지 막대로 보기', decNone: '아직 결정 기록이 없어요.', overdueNone: '마감 지난 업무가 없어요 👍', weekNone: '이번 주 일정이 없어요.', moveUp: '위로', moveDown: '아래로', dKindproposal: '제안', dKinddirection: '방향 합의', dKindfinal: '최종 결정', dKindhold: '보류', dKindchanged: '변경', stNot_Started: '시작 전', stIn_Progress: '진행 중', stWaiting_for_Confirmation: '확인 대기', stDelayed: '지연', stCompleted: '완료', stNot_Applicable: '해당 없음', tasksUnit: '건', dow: '일,월,화,수,목,금,토', evTeam: '일정', evTask: '업무 마감', evMeeting: '회의', evCamp: '캠프', calMonthFmt: 'Y년 M월' },
    en: { noticesTitle: 'Announcements', linksTitle: 'Quick links', myTasksTitle: 'My tasks', calTitle: 'Camp team calendar', ddayTitle: 'Camp D-day', activityTitle: 'Recent changes',
      wNoticesD: 'Team announcements right on Home', wLinksD: 'Buttons to your most-used pages', wMyTasksD: 'Tasks whose owner email is yours', wCalendarD: 'Events, due dates and meetings in a month view', wDdayD: 'Days left until a chosen camp (add several)', wActivityD: 'What teammates just uploaded or changed (team members only)',
      wStatsD: 'Four key numbers', wCampsD: 'Active & upcoming camps', wDeadlinesD: 'Upcoming task deadlines', wAttentionD: 'Tasks without owner or overdue', wAgendaD: 'Next meeting agenda', wMeetingsD: 'Recent meetings', wFilesD: 'Recently uploaded files', wBudgetD: 'Budget summary (authorized only)',
      addWidget: 'Add widget', tidy: 'Tidy gaps', allAdded: 'No more widgets to add.', noRoom: 'No free spot, placed at the bottom.', overlapMsg: 'It would overlap a neighbor widget.', tidyDone: 'Moved widgets up to fill gaps.', remove: 'Remove from Home', widthToggle: 'Full / half width', resize: 'Resize',
      editNarrow: 'Widgets can be edited on a wider screen.', myTasksNone: 'No tasks list your email as owner.', noticesNone: 'No announcements.', pickCamp: 'Choose camp', ddayNone: 'Choose a camp that has a date', ddayDay: 'D-DAY', ddayLive: 'In progress', dateTbdLong: 'Date TBD',
      activityNone: 'No records.', linkResources: 'Camp Resources', linkFiles: 'Files', linkTasks: 'Tasks', linkCalendar: 'Calendar', linkMeetings: 'Meetings · Decisions', linkCamps: 'Camp Spaces', linkTv: 'TV Dashboard', linkBudget: 'Camp Budget', linkSearch: 'Search all',
      actCreate: 'created', actUpdate: 'updated', actDelete: 'deleted', actUpload: 'uploaded a file', actNew_version: 'uploaded a new version', actLink_file: 'linked a file', actUnlink_file: 'unlinked a file', actImport_csv: 'imported from sheet', actImport_minutes: 'imported minutes', actImport_template: 'imported checklist', actCopy_budget: 'copied budget', actUpsert: 'updated', entTask: 'Task', entEvent: 'Event', entMeeting: 'Meeting', entAgenda_item: 'Agenda', entDecision: 'Decision', entFile: 'File', entCamp: 'Camp', entCamp_type: 'Camp type', entNotice: 'Notice', entGlossary: 'Glossary', entChecklist_template: 'Checklist', entChecklist_item: 'Checklist item', entBudget_line: 'Budget', entBudget_target: 'Budget', justNow: 'just now', minAgo: ' min ago', hrAgo: ' h ago', fileUpdated: 'updated', actNone: 'No activity yet.', teamOnlyNote: 'Visible to camp team members only.', calToday: 'Today', calViewMonth: 'Calendar', calViewList: 'List', calListEmpty: 'Nothing scheduled in this period.', thisweekTitle: 'This week', overdueTitle: 'Overdue tasks', decisionsTitle: 'Recent decisions', statusTitle: 'Tasks by status', wThisweekD: 'Next 7 days of events, due dates and meetings', wOverdueD: 'Past-due tasks that are not finished', wDecisionsD: 'Latest direction and final decisions', wStatusD: 'Task status as bars', decNone: 'No decisions recorded yet.', overdueNone: 'No overdue tasks', weekNone: 'Nothing scheduled this week.', moveUp: 'Move up', moveDown: 'Move down', dKindproposal: 'Proposal', dKinddirection: 'Direction', dKindfinal: 'Final', dKindhold: 'On hold', dKindchanged: 'Changed', stNot_Started: 'Not started', stIn_Progress: 'In progress', stWaiting_for_Confirmation: 'Waiting', stDelayed: 'Delayed', stCompleted: 'Completed', stNot_Applicable: 'N/A', tasksUnit: '', dow: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat', evTeam: 'Event', evTask: 'Task due', evMeeting: 'Meeting', evCamp: 'Camp', calMonthFmt: 'M Y' }
  });

  // ── 선 아이콘 (포털 메뉴와 같은 규격) ──
  var IC = {
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.4 0-10-7-10-7a17.6 17.6 0 0 1 4.1-4.9M9.9 5.2A9.7 9.7 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-2.2 3.2"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/><path d="M2 2l20 20"/>',
    width: '<path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    tidy: '<path d="M12 3v5M9.5 6 12 8.5 14.5 6M12 21v-5M9.5 18 12 15.5 14.5 18M4 12h16"/>',
    up: '<path d="m6 15 6-6 6 6"/>', down: '<path d="m6 9 6 6 6-6"/>', prev: '<path d="m15 6-6 6 6 6"/>', next: '<path d="m9 6 6 6-6 6"/>',
    grip: '<circle cx="9" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1.4" fill="currentColor" stroke="none"/>',
    camps: '<path d="M3 20 12 4l9 16"/><path d="M9.5 20 12 15.5l2.5 4.5"/><path d="M2 20h20"/>',
    tasks: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="m9 13.5 2 2 4-4.5"/>',
    meetings: '<path d="M5 4h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-9l-4 3.5V17H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8 9h8M8 12.5h5"/>',
    files: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    resources: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M3 11h18"/>',
    tv: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="m10.5 8.5 4 2-4 2z" fill="currentColor" stroke="none"/>',
    budget: '<path d="M4 8V6a2 2 0 0 1 2-2h11v4"/><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M16 14h2"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'
  };
  function ico(n, size) { size = size || 15; return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }

  // ── 위젯 정의 ──
  var COLS = 12, ROW = 40, GAP = 12;
  var TITLES = { stats: ['statsTitle', 'wStatsD'], camps: ['activeCamps', 'wCampsD'], deadlines: ['upcoming', 'wDeadlinesD'], attention: ['attention', 'wAttentionD'], agenda: ['agenda', 'wAgendaD'], meetings: ['recentMeetings', 'wMeetingsD'], files: ['recentFiles', 'wFilesD'], budget: ['budget', 'wBudgetD'],
    notices: ['noticesTitle', 'wNoticesD'], links: ['linksTitle', 'wLinksD'], mytasks: ['myTasksTitle', 'wMyTasksD'], calendar: ['calTitle', 'wCalendarD'], dday: ['ddayTitle', 'wDdayD'], activity: ['activityTitle', 'wActivityD'], thisweek: ['thisweekTitle', 'wThisweekD'], overdue: ['overdueTitle', 'wOverdueD'], decisions: ['decisionsTitle', 'wDecisionsD'], status: ['statusTitle', 'wStatusD'] };
  var LINK = { overdue: '/campteam/tasks/', decisions: '/campteam/meetings/', status: '/campteam/tasks/', thisweek: '/campteam/tasks/', camps: '/campteam/camps/', deadlines: '/campteam/tasks/', attention: '/campteam/tasks/', agenda: '/campteam/meetings/', meetings: '/campteam/meetings/', files: '/campteam/files/', mytasks: '/campteam/tasks/' };
  var NOCARD = { stats: 1 };

  var L = null, editing = false, scope = 'mine', work = null, base = '', calMonth = null, calCache = {}, auditCache = null;
  var calView = (function () { try { return localStorage.getItem('ct-cal-view') === 'list' ? 'list' : 'month'; } catch (e) { return 'month'; } })();
  var isAdmin = function () { return !!(data && data.user.perms.manageMembers); };
  var isTeam = function () { return !!(data && ['admin', 'director', 'finance', 'member'].indexOf(data.user.campRole) >= 0); };
  function relTime(iso) {
    var t = Date.parse(iso); if (!t) return ''; var min = Math.round((Date.now() - t) / 60000);
    if (min < 1) return CT.t('justNow'); if (min < 60) return min + CT.t('minAgo'); if (min < 1440) return Math.floor(min / 60) + CT.t('hrAgo');
    var d = new Date(t); return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  var wide = function () { return window.matchMedia('(min-width: 901px)').matches; };
  var clone = function (x) { return JSON.parse(JSON.stringify(x)); };
  var tt = function (type) { return CT.t(TITLES[type][0]); };

  function rowTasks(list, withCamp) {
    return list.length ? list.map(function (t) {
      return '<div class="row"><div>' + esc(t.title) + testChip(t) + '<small>' + (withCamp && campName(t) ? esc(campName(t)) : '') + '</small></div>' + dueTag(t.dueDate, data.today) + '</div>';
    }).join('') : '';
  }
  function ddayHtml(it) {
    var d = data, cid = it.opts && it.opts.campId, c = (d.campChoices || []).filter(function (x) { return x.id === cid; })[0];
    var sel = '';
    if (editing) sel = '<select class="dd-sel" data-uid="' + esc(it.uid) + '" aria-label="' + esc(CT.t('pickCamp')) + '"><option value="">' + esc(CT.t('pickCamp')) + '</option>' + (d.campChoices || []).map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === cid ? ' selected' : '') + '>' + esc(CT.pick(x, 'name')) + '</option>'; }).join('') + '</select>';
    if (!c || !c.startDate) return sel + '<div class="dday"><div class="dd-n">—</div><div class="dd-t">' + esc(c ? CT.pick(c, 'name') : CT.t('ddayNone')) + '</div><div class="dd-s">' + esc(c ? CT.t('dateTbdLong') : '') + '</div></div>';
    var diff = daysBetween(d.today, c.startDate), end = c.endDate || c.startDate, live = d.today >= c.startDate && d.today <= end, past = d.today > end;
    var n = live ? CT.t('ddayLive') : diff === 0 ? CT.t('ddayDay') : diff > 0 ? 'D-' + diff : 'D+' + (-diff);
    return sel + '<div class="dday' + (past ? ' past' : live ? ' live' : '') + '"><div class="dd-n">' + esc(n) + '</div><div class="dd-t"><a href="/campteam/space/?id=' + esc(c.id) + '">' + esc(CT.pick(c, 'name')) + '</a></div><div class="dd-s">' + esc(CT.fmtDate(c.startDate)) + (c.endDate ? ' – ' + esc(CT.fmtDate(c.endDate)) : '') + '</div></div>';
  }
  function linksHtml() {
    var p = data.user.perms, L2 = [['resources', '/campteam/resources/', 'linkResources', '#ec5fa0'], ['files', '/campteam/files/', 'linkFiles', '#f0a020'], ['tasks', '/campteam/tasks/', 'linkTasks', '#22b573'], ['calendar', '/campteam/calendar/', 'linkCalendar', '#3bb3a6'], ['meetings', '/campteam/meetings/', 'linkMeetings', '#8b6cf0'], ['camps', '/campteam/camps/', 'linkCamps', '#9bbf1f'], ['tv', '/campteam/tv/', 'linkTv', '#14b8c4']];
    if (p.moneyRead) L2.push(['budget', '/campteam/budget/', 'linkBudget', '#d4a373']);
    L2.push(['search', '/campteam/search/', 'linkSearch', '#3b8ff0']);
    var AREA = { resources: 'files', files: 'files', tasks: 'tasks', calendar: 'tasks', meetings: 'meetings', camps: 'camps', tv: 'camps' }; // 볼 수 없는 영역의 바로가기는 숨긴다
    L2 = L2.filter(function (l) { return !AREA[l[0]] || CT.can(AREA[l[0]], 'view'); });
    return '<div class="quick">' + L2.map(function (l) { return '<a href="' + l[1] + '" style="--c:' + l[3] + '"><span class="qi">' + ico(l[0], 16) + '</span><span>' + esc(CT.t(l[2])) + '</span></a>'; }).join('') + '</div>';
  }
  function noticesHtml() {
    var n = data.notices || [];
    return n.length ? n.map(function (x) { return '<div class="notice">' + esc(CT.lang() === 'en' && x.messageEn ? x.messageEn : x.message) + testChip(x) + '</div>'; }).join('') : '<div class="empty">' + esc(CT.t('noticesNone')) + '</div>';
  }
  function widgetBody(it) {
    var t = it.type;
    if (t === 'notices') return noticesHtml();
    if (t === 'links') return linksHtml();
    if (t === 'mytasks') return rowTasks(data.myTasks || [], true) || '<div class="empty">' + esc(CT.t('myTasksNone')) + '</div>';
    if (t === 'dday') return ddayHtml(it);
    if (t === 'calendar') return '<div class="mcal-wrap" data-cal>' + calHtml() + '</div>';
    if (t === 'activity') return '<div data-activity>' + activityHtml() + '</div>';
    if (t === 'thisweek') return '<div data-week>' + weekHtml() + '</div>';
    if (t === 'overdue') return rowTasks(data.overdue || [], true) || '<div class="empty">' + esc(CT.t('overdueNone')) + '</div>';
    if (t === 'decisions') return decisionsHtml();
    if (t === 'status') return statusHtml();
    return body(t);
  }

  // ── 달력 위젯 ──
  function ymd(y, m, d) { return y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'); }
  function calHtml() {
    if (!calMonth) { var t = data.today.split('-'); calMonth = { y: +t[0], m: +t[1] - 1 }; }
    var y = calMonth.y, m = calMonth.m, days = new Date(y, m + 1, 0).getDate(), key = y + '-' + m, c = calCache[key];
    var title = CT.t('calMonthFmt').replace('Y', y).replace('M', CT.lang() === 'en' ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m] : m + 1);
    var head = '<div class="mcal-head"><button type="button" class="hs-b" data-cal="-1" aria-label="prev">' + ico('prev') + '</button><b>' + esc(title) + '</b><button type="button" class="hs-b" data-cal="1" aria-label="next">' + ico('next') + '</button><button type="button" class="btn sm" data-cal="0">' + esc(CT.t('calToday')) + '</button>' +
      '<span class="seg sm"><button type="button" data-calview="month" class="' + (calView === 'month' ? 'on' : '') + '">' + esc(CT.t('calViewMonth')) + '</button><button type="button" data-calview="list" class="' + (calView === 'list' ? 'on' : '') + '">' + esc(CT.t('calViewList')) + '</button></span></div>';
    var legend = '<div class="mlegend"><span class="mk ev">' + esc(CT.t('evTeam')) + '</span><span class="mk tk">' + esc(CT.t('evTask')) + '</span><span class="mk mt">' + esc(CT.t('evMeeting')) + '</span><span class="mk cp">' + esc(CT.t('evCamp')) + '</span></div>';
    if (calView === 'list') return head + '<div class="aglist">' + (c ? agendaHtml(agendaMap(c, ymd(y, m, 1), ymd(y, m, days)), CT.t('calListEmpty')) : '<div class="empty">…</div>') + '</div>' + legend;
    var first = new Date(y, m, 1).getDay(), dow = CT.t('dow').split(','), byDay = agendaMap(c, ymd(y, m, 1), ymd(y, m, days), true);
    var cells = '', n = Math.ceil((first + days) / 7) * 7;
    for (var i = 0; i < n; i++) {
      var day = i - first + 1;
      if (day < 1 || day > days) { cells += '<div class="mc off"></div>'; continue; }
      var ds = ymd(y, m, day), list = byDay[ds] || [], shown = list.slice(0, 3);
      cells += '<div class="mc' + (ds === data.today ? ' today' : '') + '"><b>' + day + '</b>' + shown.map(function (e) { return '<i class="mk ' + e.k + '" title="' + esc(e.t) + '">' + esc(e.t) + '</i>'; }).join('') + (list.length > 3 ? '<em>+' + (list.length - 3) + esc(CT.t('calMore')) + '</em>' : '') + '</div>';
    }
    return head + '<div class="mcal">' + dow.map(function (d) { return '<div class="mw">' + esc(d) + '</div>'; }).join('') + cells + '</div>' + legend;
  }
  function nextDay(d) { var t = new Date(Date.parse(d + 'T00:00:00Z') + 86400000); return t.toISOString().slice(0, 10); }
  /** 날짜별 일정 모음: { 'YYYY-MM-DD': [{k, t, time}] }. spanCamps=true 면 캠프 기간 전체에 표시(달력), 아니면 시작일에만(목록) */
  function agendaMap(c, from, to, spanCamps) {
    var map = {}; if (!c) return map;
    var put = function (day, k, t, time) { if (day >= from && day <= to) (map[day] = map[day] || []).push({ k: k, t: t, time: time || '' }); };
    var span = function (a, b, k, t, time) { for (var d = a < from ? from : a, end = (b || a) > to ? to : (b || a); d <= end; d = nextDay(d)) put(d, k, t, d === a ? time : ''); };
    (c.events || []).forEach(function (e) { span(e.startDate, e.endDate, 'ev', e.title, e.startTime); });
    (c.tasks || []).forEach(function (k) { put(k.dueDate, 'tk', k.title); });
    (c.meetings || []).forEach(function (k) { put(k.meetDate, 'mt', k.title, k.meetTime); });
    (c.camps || []).forEach(function (k) { if (spanCamps) span(k.startDate, k.endDate, 'cp', CT.pick(k, 'name')); else put(k.startDate, 'cp', CT.pick(k, 'name') + ' · ' + CT.t('evCamp')); });
    return map;
  }
  function agendaHtml(map, emptyText) {
    var days = Object.keys(map).sort(); if (!days.length) return '<div class="empty">' + esc(emptyText) + '</div>';
    var dow = CT.t('dow').split(',');
    return days.map(function (d) {
      var dt = new Date(d + 'T00:00:00'), isToday = d === data.today;
      return '<div class="agday' + (isToday ? ' today' : '') + '"><div class="agd"><b>' + esc(CT.fmtDate(d)) + '</b><small>' + esc(dow[dt.getDay()]) + (isToday ? ' · ' + esc(CT.t('calToday')) : '') + '</small></div><div class="agi">' +
        map[d].map(function (e) { return '<div class="ag"><span class="mk ' + e.k + '">' + esc(CT.t({ ev: 'evTeam', tk: 'evTask', mt: 'evMeeting', cp: 'evCamp' }[e.k])) + '</span><span class="agt">' + esc(e.t) + '</span>' + (e.time ? '<small>' + esc(e.time) + '</small>' : '') + '</div>'; }).join('') + '</div></div>';
    }).join('');
  }
  function weekRange() { return [data.today, nextDay(nextDay(nextDay(nextDay(nextDay(nextDay(data.today))))))]; }
  function weekHtml() { var r = weekRange(), c = calCache.w; return c ? agendaHtml(agendaMap(c, r[0], r[1], false), CT.t('weekNone')) : '<div class="empty">…</div>'; }
  function decisionsHtml() {
    var d = data.decisions || []; if (!d.length) return '<div class="empty">' + esc(CT.t('decNone')) + '</div>';
    return d.map(function (x) { var txt = CT.lang() === 'en' ? (x.textEn || x.textKo) : (x.textKo || x.textEn);
      return '<div class="row"><div>' + esc(txt) + testChip(x) + '<small>' + esc(campName(x)) + (x.decidedDate ? (campName(x) ? ' · ' : '') + esc(CT.fmtDate(x.decidedDate)) : '') + '</small></div><span class="kindchip kc-' + esc(x.kind) + '">' + esc(CT.t('dKind' + x.kind)) + '</span></div>'; }).join('');
  }
  var ST = [['Not Started', '#9fb4c0'], ['In Progress', '#3b8ff0'], ['Waiting for Confirmation', '#f0a020'], ['Delayed', '#c42a36'], ['Completed', '#22b573'], ['Not Applicable', '#cfd8dd']];
  function statusHtml() {
    var by = {}, total = 0; (data.statusCounts || []).forEach(function (r) { by[r.status] = r.n; total += r.n; });
    if (!total) return '<div class="empty">' + esc(CT.t('none')) + '</div>';
    var max = Math.max.apply(null, ST.map(function (s) { return by[s[0]] || 0; }));
    return '<div class="stbars">' + ST.map(function (s) { var n = by[s[0]] || 0; return '<div class="stb"><span>' + esc(CT.t('st' + s[0].replace(/ /g, '_'))) + '</span><div class="bar"><i style="width:' + (max ? Math.round(n / max * 100) : 0) + '%;background:' + s[1] + '"></i></div><b>' + n + esc(CT.t('tasksUnit')) + '</b></div>'; }).join('') + '</div>';
  }
  async function loadRange(key, from, to) {
    if (calCache[key]) return;
    try { calCache[key] = await CT.api('/api/campteam/calendar?from=' + from + '&to=' + to); } catch (e) { calCache[key] = { events: [], tasks: [], meetings: [], camps: [] }; }
  }
  async function loadCal() { if (!calMonth) return; await loadRange(calMonth.y + '-' + calMonth.m, ymd(calMonth.y, calMonth.m, 1), ymd(calMonth.y, calMonth.m, new Date(calMonth.y, calMonth.m + 1, 0).getDate())); }
  function activityHtml() {
    if (!auditCache) return '<div class="empty">…</div>';
    if (!auditCache.length) return '<div class="empty">' + esc(CT.t('actNone')) + '</div>';
    return auditCache.slice(0, 20).map(function (a) {
      var ent = CT.t('ent' + a.entity.charAt(0).toUpperCase() + a.entity.slice(1)), act = CT.t('act' + a.action.charAt(0).toUpperCase() + a.action.slice(1)), who = String(a.actor || '').split('@')[0];
      return '<div class="row"><div><b class="act-t">' + (a.title ? esc(a.title) : esc(ent)) + '</b><small>' + esc(who) + ' · ' + (a.title ? '<span class="kindchip">' + esc(ent) + '</span> ' : '') + esc(act) + '</small></div><span class="tag t-none">' + esc(relTime(a.at)) + '</span></div>';
    }).join('');
  }
  async function loadLate(items) {
    var shown = function (t) { return items.some(function (w) { return w.type === t && (w.show || editing); }); }, jobs = [];
    if (shown('calendar')) { calHtml(); jobs.push(loadCal()); }
    if (shown('thisweek')) { var r = weekRange(); jobs.push(loadRange('w', r[0], r[1])); }
    if (isTeam() && shown('activity') && !auditCache) jobs.push(CT.api('/api/campteam/activity').then(function (a) { auditCache = a.items; }).catch(function () { auditCache = []; }));
    if (jobs.length) { await Promise.all(jobs); paintLate(); }
  }
  function paintLate() {
    var c = document.querySelector('.mcal-wrap'); if (c) c.innerHTML = calHtml();
    var a = document.querySelector('[data-activity]'); if (a) a.innerHTML = activityHtml();
    var w = document.querySelector('[data-week]'); if (w) w.innerHTML = weekHtml();
  }

  // ── 배치 계산 ──
  function hit(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
  function collides(items, r, skipUid) { return items.some(function (o) { return o.uid !== skipUid && hit(r, o); }); }
  function firstFree(items, w, h) {
    for (var y = 0; y < 100; y++) for (var x = 0; x + w <= COLS; x++) if (!collides(items, { x: x, y: y, w: w, h: h })) return { x: x, y: y, found: true };
    return { x: 0, y: items.reduce(function (m, o) { return Math.max(m, o.y + o.h); }, 0), found: false };
  }
  function tidy(items) {
    var placed = []; items.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; }).forEach(function (it) { var y = 0; while (y < it.y && collides(placed, { x: it.x, y: y, w: it.w, h: it.h })) y++; it.y = y; placed.push(it); });
  }
  function visibleItems(items) { return items.filter(function (w) { return (editing || w.show) && (w.type !== 'activity' || isTeam()); }); }

  // ── 그리기 ──
  /** 폰에서 보이는 순서: 저장된 폰 순서(m)가 먼저, 나머지는 위치(위→아래, 왼→오) 순 */
  function mobileOrder(items, m) {
    var byPos = items.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; }), out = [];
    (m || []).forEach(function (u) { var f = byPos.filter(function (i) { return i.uid === u; })[0]; if (f) out.push(f); });
    return out.concat(byPos.filter(function (i) { return out.indexOf(i) < 0; }));
  }
  function render() {
    var d = data, hasTest = [].concat(d.camps, d.deadlines, d.attention, d.agenda, d.meetings, d.files).some(function (r) { return r.isTest; });
    $('homeSub').innerHTML = esc(d.today) + ' · ' + esc(CT.t('campsCount')) + ' ' + d.camps.length + (hasTest ? ' <span class="chip test">' + esc(CT.t('testData')) + '</span>' : '') + (!editing && L.mine ? ' <span class="chip">' + esc(CT.t('mineOverrides')) + '</span>' : '');
    var src = editing ? work : L.effective, items = visibleItems(src.items), isWide = wide();
    var rows = Math.max(6, items.reduce(function (m, o) { return Math.max(m, o.y + o.h); }, 0) + (editing ? 8 : 0));
    var grid = $('homeGrid'); grid.className = 'dash' + (editing ? ' editing' : '');
    if (isWide) grid.style.gridTemplateRows = 'repeat(' + rows + ', ' + ROW + 'px)'; else grid.style.gridTemplateRows = '';
    var cells = '';
    if (editing && isWide) { var n = rows * COLS, c = ''; for (var i = 0; i < n; i++) c += '<i></i>'; cells = '<div class="cells" style="grid-template-rows:repeat(' + rows + ',' + ROW + 'px)" aria-hidden="true">' + c + '</div>'; }
    var ordered = isWide ? items.slice().sort(function (a, b) { return a.y - b.y || a.x - b.x; }) : mobileOrder(items, src.m);
    var btn = function (a, label, icon, dis) { return '<button type="button" class="hs-b" data-a="' + a + '" title="' + esc(label) + '" aria-label="' + esc(label) + '"' + (dis ? ' disabled' : '') + '>' + ico(icon) + '</button>'; };
    grid.innerHTML = cells + ordered.map(function (it, idx) {
      var card = !NOCARD[it.type], link = LINK[it.type];
      var head = card ? '<h2><span>' + esc(tt(it.type)) + '</span>' + (link ? '<a href="' + link + '">' + esc(CT.t('allCamps')) + '</a>' : '') + '</h2>' : '';
      var name = '<span class="hs-name">' + esc(tt(it.type)) + (it.show ? '' : ' · ' + esc(CT.t('secHiddenTag'))) + '</span><span class="sp"></span>';
      var eye = btn('show', CT.t(it.show ? 'secHide' : 'secShow'), it.show ? 'eye' : 'eyeOff'), del = btn('remove', CT.t('remove'), 'x'), tools = '';
      if (editing && isWide) tools = '<div class="hs-tools" data-move><span class="hs-grip">' + ico('grip', 16) + '</span>' + name + eye + btn('width', CT.t('widthToggle'), 'width') + del + '</div>';
      else if (editing) tools = '<div class="hs-tools mob">' + name + btn('up', CT.t('moveUp'), 'up', idx === 0) + btn('down', CT.t('moveDown'), 'down', idx === ordered.length - 1) + eye + del + '</div>';
      var place = isWide ? ' style="grid-column:' + (it.x + 1) + ' / span ' + it.w + ';grid-row:' + (it.y + 1) + ' / span ' + it.h + '"' : '';
      return '<section class="hs ' + (card ? 'card' : 'nocard') + (it.show ? '' : ' off') + '" data-uid="' + esc(it.uid) + '" data-type="' + it.type + '"' + place + '>' + tools + head + '<div class="hs-body">' + widgetBody(it) + '</div>' + (editing && isWide ? '<span class="hs-rs" data-resize title="' + esc(CT.t('resize')) + '"></span>' : '') + '</section>';
    }).join('');
    renderBar(); loadLate(items);
  }

  // ── 편집 모드 ──
  function startScope(sc) {
    scope = sc; work = clone(sc === 'default' ? (L.default || L.builtIn) : L.effective);
    if (!isTeam()) work.items = work.items.filter(function (w) { return w.type !== 'activity'; });
    base = JSON.stringify(work);
  }
  function changed() { return editing && JSON.stringify(work) !== base; }
  function renderBar() {
    var bar = $('editBar'), btn = $('editHome');
    btn.hidden = false; btn.textContent = CT.t(editing ? 'editDone' : 'editHome');
    bar.hidden = !editing; if (!editing) return;
    bar.innerHTML = (L.canEditDefault ? '<div class="seg"><button type="button" data-sc="mine" class="' + (scope === 'mine' ? 'on' : '') + '">' + esc(CT.t('scopeMine')) + '</button><button type="button" data-sc="default" class="' + (scope === 'default' ? 'on' : '') + '">' + esc(CT.t('scopeDefault')) + '</button></div>' : '<b>' + esc(CT.t('scopeMine')) + '</b>') +
      '<span class="hint">' + esc(CT.t(scope === 'default' ? 'hintDefault' : 'hintMine')) + '</span><span class="sp"></span><span class="hint" id="barMsg"></span>' +
      '<span class="addwrap"><button type="button" class="btn sm" id="barAdd">' + ico('plus', 14) + '&nbsp;' + esc(CT.t('addWidget')) + '</button><div class="palette" id="palette" hidden></div></span>' +
      (wide() ? '<button type="button" class="btn sm" id="barTidy">' + ico('tidy', 14) + '&nbsp;' + esc(CT.t('tidy')) + '</button>' : '') +
      '<button type="button" class="btn sm" id="barReset"' + ((scope === 'mine' && !L.mine) || (scope === 'default' && !L.default) ? ' disabled' : '') + '>' + esc(CT.t(scope === 'default' ? 'resetDefault' : 'resetMine')) + '</button>' +
      '<button type="button" class="btn sm pri" id="barSave">' + esc(CT.t('save')) + '</button>';
  }
  function msg(t, bad) { var m = $('barMsg'); if (m) { m.textContent = t; m.style.color = bad ? 'var(--accent)' : 'var(--ok)'; } }
  async function put() {
    if (!work.items.some(function (s) { return s.show; })) { msg(CT.t('needOne'), true); return; }
    try { L = Object.assign(L, await CT.api('/api/campteam/home-layout', { method: 'PUT', body: { scope: scope, layout: work } })); base = JSON.stringify(work); render(); msg(CT.t('saved')); }
    catch (e) { msg(e.message, true); }
  }
  async function reset() {
    try { L = Object.assign(L, await CT.api('/api/campteam/home-layout?scope=' + scope, { method: 'DELETE' })); startScope(scope); render(); msg(CT.t('reset')); }
    catch (e) { msg(e.message, true); }
  }
  function leave() { if (changed() && !confirm(CT.t('leaveDirty'))) return false; editing = false; work = null; render(); return true; }
  function findItem(uid) { return work.items.filter(function (w) { return w.uid === uid; })[0]; }
  function countOf(type) { return work.items.filter(function (w) { return w.type === type; }).length; }
  function openPalette() {
    var pal = $('palette'), cat = (L.catalog || []).filter(function (c) { return countOf(c.type) < c.max; });
    if (!cat.length) { msg(CT.t('allAdded'), true); return; }
    pal.innerHTML = cat.map(function (c) { return '<button type="button" data-add="' + c.type + '"><b>' + esc(tt(c.type)) + '</b><small>' + esc(CT.t(TITLES[c.type][1])) + '</small></button>'; }).join('');
    pal.hidden = !pal.hidden;
  }
  function addWidget(type) {
    var c = (L.catalog || []).filter(function (x) { return x.type === type; })[0]; if (!c) return;
    var spot = firstFree(work.items, c.w, c.h), uid = countOf(type) === 0 && !findItem(type) ? type : type + Math.random().toString(36).slice(2, 6);
    var it = { uid: uid, type: type, x: spot.x, y: spot.y, w: c.w, h: c.h, show: true, opts: {} };
    if (type === 'dday') { var next = (data.campChoices || []).filter(function (x) { return x.startDate && x.startDate >= data.today; })[0] || (data.campChoices || [])[0]; if (next) it.opts.campId = next.id; }
    work.items.push(it); if (work.m) work.m.push(uid); $('palette').hidden = true; render(); if (!spot.found) msg(CT.t('noRoom'), true);
    var el = document.querySelector('[data-uid="' + uid + '"]'); if (el) { el.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); el.classList.add('flash'); }
  }

  // 끌어서 옮기기 / 모서리로 크기 조절 (TV 편집기와 같은 방식: 칸에 맞춰지고, 겹치면 원래대로)
  // 끄는 동안 화면 위·아래 가장자리에 가면 자동으로 스크롤되고, 마우스 휠로 스크롤해도 위젯이 커서를 따라간다.
  function startDrag(e, el, mode) {
    var it = findItem(el.dataset.uid), grid = $('homeGrid'); if (!it) return;
    e.preventDefault();
    var rect = grid.getBoundingClientRect(), colW = (rect.width - GAP * (COLS - 1)) / COLS, sx = colW + GAP, sy = ROW + GAP, x0 = e.clientX, y0 = e.clientY, scroll0 = window.scrollY, r0 = { x: it.x, y: it.y, w: it.w, h: it.h };
    var cat = (L.catalog || []).filter(function (c) { return c.type === it.type; })[0] || { minW: 2, minH: 2 };
    var ghost = document.createElement('div'); ghost.className = 'ghost'; grid.appendChild(ghost);
    var cur = Object.assign({}, r0), ok = true, last = { x: x0, y: y0 }, raf = 0, alive = true;
    var place = function (r) { ghost.style.gridColumn = (r.x + 1) + ' / span ' + r.w; ghost.style.gridRow = (r.y + 1) + ' / span ' + r.h; };
    place(cur); el.classList.add('drag');
    var apply = function () {
      var px = last.x - x0, py = last.y - y0 + (window.scrollY - scroll0), dx = px / sx, dy = py / sy; // 스크롤한 만큼도 움직인 것으로 계산
      if (mode === 'move') { cur = { x: Math.max(0, Math.min(COLS - r0.w, Math.round(r0.x + dx))), y: Math.max(0, Math.round(r0.y + dy)), w: r0.w, h: r0.h }; el.style.transform = 'translate(' + px + 'px,' + py + 'px)'; }
      else { cur = { x: r0.x, y: r0.y, w: Math.max(cat.minW, Math.min(COLS - r0.x, Math.round(r0.w + dx))), h: Math.max(cat.minH, Math.round(r0.h + dy)) }; el.style.gridColumn = (cur.x + 1) + ' / span ' + cur.w; el.style.gridRow = (cur.y + 1) + ' / span ' + cur.h; }
      ok = !collides(work.items, cur, it.uid); ghost.classList.toggle('bad', !ok); place(cur);
    };
    var move = function (ev) { last = { x: ev.clientX, y: ev.clientY }; apply(); };
    var onScroll = function () { apply(); };
    var loop = function () { // 화면 가장자리 근처면 자동 스크롤 (가까울수록 빠르게). 스크롤로 바뀐 위치도 매번 다시 계산한다.
      if (!alive) return; var vh = window.innerHeight, edge = Math.min(110, vh * 0.2), v = 0;
      if (last.y < edge) v = -Math.ceil((edge - Math.max(0, last.y)) / edge * 15) - 2; else if (last.y > vh - edge) v = Math.ceil((Math.min(vh, last.y) - (vh - edge)) / edge * 15) + 2;
      if (v) window.scrollBy(0, v);
      apply();
    };
    var up = function () {
      alive = false; clearInterval(raf);
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up); window.removeEventListener('scroll', onScroll);
      ghost.remove(); el.style.transform = '';
      if (ok && (cur.x !== r0.x || cur.y !== r0.y || cur.w !== r0.w || cur.h !== r0.h)) { it.x = cur.x; it.y = cur.y; it.w = cur.w; it.h = cur.h; }
      render();
    };
    document.addEventListener('pointermove', move); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up); window.addEventListener('scroll', onScroll, { passive: true });
    raf = setInterval(loop, 16);
  }

  function wire() {
    $('editHome').onclick = function () { if (editing) { leave(); } else { editing = true; startScope('mine'); render(); } };
    $('editBar').onclick = function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.dataset.sc && t.dataset.sc !== scope) { if (changed() && !confirm(CT.t('leaveDirty'))) return; startScope(t.dataset.sc); render(); }
      else if (t.id === 'barSave') put(); else if (t.id === 'barReset') reset();
      else if (t.id === 'barAdd') openPalette();
      else if (t.id === 'barTidy') { tidy(work.items); render(); msg(CT.t('tidyDone')); }
      else if (t.dataset.add) addWidget(t.dataset.add);
    };
    document.addEventListener('click', function (e) { var p = $('palette'); if (p && !p.hidden && !e.target.closest('.addwrap')) p.hidden = true; });
    var grid = $('homeGrid');
    grid.addEventListener('click', function (e) {
      var cv = e.target.closest('[data-calview]'); if (cv) { calView = cv.dataset.calview; try { localStorage.setItem('ct-cal-view', calView); } catch (x) {} paintLate(); return; }
      var cal = e.target.closest('[data-cal]'); if (cal && cal.tagName === 'BUTTON') { var step = +cal.dataset.cal; if (!calMonth) calHtml(); if (step === 0) { var t = data.today.split('-'); calMonth = { y: +t[0], m: +t[1] - 1 }; } else { var mm = calMonth.m + step; calMonth = { y: calMonth.y + Math.floor(mm / 12), m: ((mm % 12) + 12) % 12 }; } paintLate(); loadCal().then(paintLate); return; }
      var b = e.target.closest('.hs-b'); if (!b || !editing) return; var sec = b.closest('.hs'), it = findItem(sec.dataset.uid); if (!it) return;
      if (b.dataset.a === 'show') { it.show = !it.show; render(); }
      else if (b.dataset.a === 'remove') { work.items = work.items.filter(function (w) { return w !== it; }); if (work.m) work.m = work.m.filter(function (u) { return u !== it.uid; }); render(); }
      else if (b.dataset.a === 'up' || b.dataset.a === 'down') { // 폰: 순서만 바꾼다 (넓은 화면의 위치·크기는 그대로)
        var ord = mobileOrder(work.items, work.m).map(function (w) { return w.uid; }), i = ord.indexOf(it.uid), j = i + (b.dataset.a === 'up' ? -1 : 1);
        if (j >= 0 && j < ord.length) { ord.splice(i, 1); ord.splice(j, 0, it.uid); work.m = ord; render(); var moved = document.querySelector('[data-uid="' + it.uid + '"]'); if (moved) moved.scrollIntoView({ block: 'nearest' }); }
      }
      else if (b.dataset.a === 'width') {
        var next = it.w === COLS ? { x: it.x > COLS / 2 ? COLS / 2 : it.x, w: COLS / 2 } : { x: 0, w: COLS };
        if (it.w !== COLS && it.w >= COLS / 2 && it.w < COLS) next = { x: 0, w: COLS };
        var r = { x: next.x, y: it.y, w: next.w, h: it.h };
        if (collides(work.items, r, it.uid)) { msg(CT.t('overlapMsg'), true); return; }
        it.x = r.x; it.w = r.w; render();
      }
    });
    grid.addEventListener('change', function (e) { var s = e.target.closest('.dd-sel'); if (!s || !editing) return; var it = findItem(s.dataset.uid); if (it) { it.opts = s.value ? { campId: s.value } : {}; render(); } });
    grid.addEventListener('pointerdown', function (e) {
      if (!editing || e.button > 0 || !wide()) return;
      var rs = e.target.closest('[data-resize]'), mv = e.target.closest('[data-move]');
      if (e.target.closest('button,select,a')) return;
      if (rs) startDrag(e, rs.closest('.hs'), 'resize'); else if (mv) startDrag(e, mv.closest('.hs'), 'move');
    });
    window.addEventListener('beforeunload', function (e) { if (changed()) { e.preventDefault(); e.returnValue = ''; } });
    var mq = window.matchMedia('(min-width: 901px)'); (mq.addEventListener ? mq.addEventListener('change', function () { render(); }) : mq.addListener(function () { render(); }));
  }

  CT.boot(async function () {
    try {
      var r = await Promise.all([CT.api('/api/campteam/home'), CT.api('/api/campteam/home-layout')]);
      data = r[0]; L = r[1];
    } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    CT.applyI18n(); wire(); render();
    document.addEventListener('ct-lang', function () { calCache = calCache; render(); });
  });
})();
