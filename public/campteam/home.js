(function () {
  CT.addDict({
    ko: { homeTitle: '캠프팀 홈', openTasks: '진행 중 업무', overdue: '마감 지남', noOwner: '담당자 미정', completion: '전체 완료율', activeCamps: '진행 중 · 예정 캠프', allCamps: '전체 보기', upcoming: '가까운 업무 마감', attention: '확인이 필요한 업무', agenda: '다음 회의 안건', recentMeetings: '최근 회의록', recentFiles: '최근 업로드 파일', budget: '캠프 예산 요약', budgetLocked: '🔒 예산·금액은 권한이 있는 팀원에게만 보입니다.', planned: '예산 계획', actual: '실제 지출', forecast: '예상 최종', remaining: '총 예산 대비 남음', openBudget: '예산 자세히 보기', lines: '항목 수',
      none: '표시할 내용이 없어요.', noOwnerTag: '담당 미정', noDueTag: '기한 미정', overdueTag: '마감 지남', tasksOf: '업무', doneOf: '완료', owner: '담당', campsCount: '진행 중 캠프', today: '오늘', pending: '논의 필요', discussed: '논의함', decided: '결정됨', planning: '준비 중', active: '진행 중', done: '종료', canceled: '취소', dateTbd: '날짜 미정' },
    en: { homeTitle: 'Camp Team Home', openTasks: 'Open tasks', overdue: 'Overdue', noOwner: 'No owner', completion: 'Completion', activeCamps: 'Active & upcoming camps', allCamps: 'View all', upcoming: 'Upcoming deadlines', attention: 'Needs attention', agenda: 'Next meeting agenda', recentMeetings: 'Recent meetings', recentFiles: 'Recently uploaded files', budget: 'Camp budget summary', budgetLocked: '🔒 Budget and amounts are visible only to authorized team members.', planned: 'Planned', actual: 'Actual', forecast: 'Forecast', remaining: 'Remaining vs target', openBudget: 'Open budget', lines: 'Line items',
      none: 'Nothing to show.', noOwnerTag: 'No owner', noDueTag: 'No due date', overdueTag: 'Overdue', tasksOf: 'tasks', doneOf: 'done', owner: 'Owner', campsCount: 'Active camps', today: 'Today', pending: 'To discuss', discussed: 'Discussed', decided: 'Decided', planning: 'Planning', active: 'Active', done: 'Done', canceled: 'Canceled', dateTbd: 'Date TBD' }
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

  function render() {
    var d = data, s = d.stats, p = d.user.perms, pct = s.total ? Math.round(s.completed / s.total * 100) : 0;
    var hasTest = [].concat(d.camps, d.deadlines, d.attention, d.agenda, d.meetings, d.files).some(function (r) { return r.isTest; });
    $('homeSub').innerHTML = esc(d.today) + ' · ' + esc(CT.t('campsCount')) + ' ' + d.camps.length + (hasTest ? ' <span class="chip test">' + esc(CT.t('testData')) + '</span>' : '');
    $('stats').innerHTML =
      '<div class="stat"><label>' + esc(CT.t('openTasks')) + '</label><strong>' + s.open + '</strong></div>' +
      '<div class="stat late"><label>' + esc(CT.t('overdue')) + '</label><strong>' + s.overdue + '</strong></div>' +
      '<div class="stat"><label>' + esc(CT.t('noOwner')) + '</label><strong>' + s.noOwner + '</strong></div>' +
      '<div class="stat"><label>' + esc(CT.t('completion')) + '</label><strong>' + pct + '%</strong></div>';

    $('camps').innerHTML = d.camps.length ? d.camps.map(function (c) {
      var pc = c.taskTotal ? Math.round(c.taskDone / c.taskTotal * 100) : 0;
      var dates = c.startDate ? esc(CT.fmtDate(c.startDate)) + (c.endDate ? ' – ' + esc(CT.fmtDate(c.endDate)) : '') : esc(CT.t('dateTbd'));
      return '<div class="camp"><b>' + esc(CT.pick(c, 'name')) + '</b>' + testChip(c) +
        '<div class="meta">' + esc(CT.pick({ nameKo: c.typeKo, nameEn: c.typeEn }, 'name')) + ' · ' + dates + ' · ' + esc(CT.t(c.status)) + ' · ' + c.taskDone + '/' + c.taskTotal + ' ' + esc(CT.t('doneOf')) + '</div>' +
        '<div class="bar"><i style="width:' + pc + '%"></i></div></div>';
    }).join('') : empty();

    $('deadlines').innerHTML = d.deadlines.length ? d.deadlines.map(function (t) {
      return '<div class="row"><div>' + esc(t.title) + testChip(t) + '<small>' + esc(CT.t('owner')) + ': ' + esc(t.ownerName || '—') + (campName(t) ? ' · ' + esc(campName(t)) : '') + '</small></div>' + dueTag(t.dueDate, d.today) + '</div>';
    }).join('') : empty();

    $('attention').innerHTML = d.attention.length ? d.attention.map(function (t) {
      var late = t.dueDate && t.dueDate < d.today, noOwn = !t.ownerName;
      var tag = noOwn ? '<span class="tag t-late">' + esc(CT.t('noOwnerTag')) + '</span>' : late ? '<span class="tag t-late">' + esc(CT.t('overdueTag')) + '</span>' : '';
      return '<div class="row"><div>' + esc(t.title) + testChip(t) + '<small>' + (campName(t) ? esc(campName(t)) : '') + (t.dueDate ? ' · ' + esc(CT.fmtDate(t.dueDate)) : '') + '</small></div>' + tag + '</div>';
    }).join('') : empty();

    $('agenda').innerHTML = d.agenda.length ? d.agenda.map(function (a) {
      var cls = a.status === 'decided' ? 't-ok' : a.status === 'discussed' ? 't-soon' : 't-none';
      return '<div class="row"><div>' + esc(a.topic) + testChip(a) + '<small>' + esc(a.note || campName(a)) + '</small></div><span class="tag ' + cls + '">' + esc(CT.t(a.status)) + '</span></div>';
    }).join('') : empty();

    $('meetings').innerHTML = d.meetings.length ? d.meetings.map(function (m) {
      return '<div class="row"><div>' + esc(m.title) + testChip(m) + '<small>' + esc(m.meetDate) + (m.meetTime ? ' ' + esc(m.meetTime) : '') + (m.purpose ? ' · ' + esc(m.purpose) : '') + '</small></div></div>';
    }).join('') : empty();

    $('files').innerHTML = d.files.length ? d.files.map(function (f) {
      var k = ['pdf', 'xls', 'doc', 'img', 'ppt', 'audio'].indexOf(f.kind) >= 0 ? f.kind : '';
      return '<div class="file"><span class="ext ' + k + '">' + esc((f.kind || 'file').slice(0, 3).toUpperCase()) + '</span><div>' + esc(f.title) + testChip(f) +
        '<small>' + esc(f.uploadedBy) + ' · ' + esc((f.createdAt || '').slice(5, 10).replace('-', '/')) + (f.statusLabel ? ' · ' + esc(f.statusLabel) : '') + '</small></div></div>';
    }).join('') : empty();

    $('budget').innerHTML = d.budget
      ? (d.budget.summary.length ? d.budget.summary.map(function (b) {
          return '<div class="money" style="margin-bottom:10px"><div><label>' + esc(b.currency) + ' · ' + esc(CT.t('planned')) + '</label><strong>' + esc(CT.money(b.planned, b.currency)) + '</strong></div><div><label>' + esc(CT.t('forecast')) + '</label><strong>' + esc(CT.money(b.forecast, b.currency)) + '</strong></div><div><label>' + esc(CT.t('actual')) + '</label><strong>' + esc(CT.money(b.actual, b.currency)) + '</strong></div>' +
            (b.remaining != null ? '<div><label>' + esc(CT.t('remaining')) + '</label><strong style="color:' + (b.remaining < 0 ? 'var(--accent)' : 'var(--blue)') + '">' + esc(CT.money(b.remaining, b.currency)) + '</strong></div>' : '') + '</div>'; }).join('') + '<a href="/campteam/budget/" class="btn sm">' + esc(CT.t('openBudget')) + '</a>' : '<div class="empty">' + esc(CT.t('none')) + '</div>')
      : '<div class="locked">' + esc(CT.t('budgetLocked')) + '</div>';
  }

  CT.boot(async function () {
    try { data = await CT.api('/api/campteam/home'); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    CT.applyI18n(); render();
    document.addEventListener('ct-lang', render);
  });
})();
