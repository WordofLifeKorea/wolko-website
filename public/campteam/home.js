(function () {
  CT.addDict({
    ko: { homeTitle: '캠프팀 홈', openTasks: '진행 중 업무', overdue: '마감 지남', noOwner: '담당자 미정', completion: '전체 완료율', activeCamps: '진행 중 · 예정 캠프', allCamps: '전체 보기', upcoming: '가까운 업무 마감', attention: '확인이 필요한 업무', agenda: '다음 회의 안건', recentMeetings: '최근 회의록', recentFiles: '최근 업로드 파일', budget: '캠프 예산 요약', budgetLocked: '🔒 예산·금액은 권한이 있는 팀원에게만 보입니다.', planned: '예산 계획', actual: '실제 지출', forecast: '예상 최종', remaining: '총 예산 대비 남음', openBudget: '예산 자세히 보기', lines: '항목 수',
      none: '표시할 내용이 없어요.', editHome: '✏️ 홈 꾸미기', editDone: '편집 끝내기', statsTitle: '핵심 숫자', scopeMine: '내 홈', scopeDefault: '모두의 기본 홈', hintMine: '나에게만 적용돼요. 저장하면 관리자가 정한 기본 홈보다 내 설정이 우선해요.', hintDefault: '개인 설정을 따로 저장하지 않은 모든 팀원에게 적용돼요.', resetMine: '기본 홈으로 되돌리기', resetDefault: '처음 모양으로 되돌리기', saved: '저장했어요.', reset: '되돌렸어요.', secShow: '보이기', secHide: '숨기기', secWide: '넓게', secHalf: '반쪽', secUp: '앞으로', secDown: '뒤로', secDrag: '끌어서 순서 바꾸기', secHiddenTag: '숨김', leaveDirty: '저장하지 않은 변경이 있어요. 버리고 계속할까요?', needOne: '보이는 섹션이 하나는 있어야 해요.', mineOverrides: '내 설정이 적용되어 있어요', noOwnerTag: '담당 미정', noDueTag: '기한 미정', overdueTag: '마감 지남', tasksOf: '업무', doneOf: '완료', owner: '담당', campsCount: '진행 중 캠프', today: '오늘', pending: '논의 필요', discussed: '논의함', decided: '결정됨', planning: '준비 중', active: '진행 중', done: '종료', canceled: '취소', dateTbd: '날짜 미정' },
    en: { homeTitle: 'Camp Team Home', openTasks: 'Open tasks', overdue: 'Overdue', noOwner: 'No owner', completion: 'Completion', activeCamps: 'Active & upcoming camps', allCamps: 'View all', upcoming: 'Upcoming deadlines', attention: 'Needs attention', agenda: 'Next meeting agenda', recentMeetings: 'Recent meetings', recentFiles: 'Recently uploaded files', budget: 'Camp budget summary', budgetLocked: '🔒 Budget and amounts are visible only to authorized team members.', planned: 'Planned', actual: 'Actual', forecast: 'Forecast', remaining: 'Remaining vs target', openBudget: 'Open budget', lines: 'Line items',
      none: 'Nothing to show.', editHome: '✏️ Customize home', editDone: 'Done editing', statsTitle: 'Key numbers', scopeMine: 'My home', scopeDefault: 'Default home for everyone', hintMine: 'Applies only to you. Once saved, your layout takes priority over the admin default.', hintDefault: 'Applies to every team member who has not saved a personal layout.', resetMine: 'Back to default home', resetDefault: 'Restore original layout', saved: 'Saved.', reset: 'Restored.', secShow: 'Show', secHide: 'Hide', secWide: 'Wide', secHalf: 'Half', secUp: 'Move earlier', secDown: 'Move later', secDrag: 'Drag to reorder', secHiddenTag: 'Hidden', leaveDirty: 'You have unsaved changes. Discard and continue?', needOne: 'At least one section must stay visible.', mineOverrides: 'Your personal layout is applied', noOwnerTag: 'No owner', noDueTag: 'No due date', overdueTag: 'Overdue', tasksOf: 'tasks', doneOf: 'done', owner: 'Owner', campsCount: 'Active camps', today: 'Today', pending: 'To discuss', discussed: 'Discussed', decided: 'Decided', planning: 'Planning', active: 'Active', done: 'Done', canceled: 'Canceled', dateTbd: 'Date TBD' }
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

  var SECS = {
    stats: { t: 'statsTitle', nocard: true },
    camps: { t: 'activeCamps', link: '/campteam/camps/' },
    deadlines: { t: 'upcoming', link: '/campteam/tasks/' },
    attention: { t: 'attention', link: '/campteam/tasks/' },
    agenda: { t: 'agenda', link: '/campteam/meetings/' },
    meetings: { t: 'recentMeetings', link: '/campteam/meetings/' },
    files: { t: 'recentFiles', link: '/campteam/files/' },
    budget: { t: 'budget' }
  };
  var L = null, editing = false, scope = 'mine', work = null, base = '';

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
        '<div class="meta">' + esc(CT.pick({ nameKo: c.typeKo, nameEn: c.typeEn }, 'name')) + ' · ' + dates + ' · ' + esc(CT.t(c.status)) + ' · ' + c.taskDone + '/' + c.taskTotal + ' ' + esc(CT.t('doneOf')) + '</div>' +
        '<div class="bar"><i style="width:' + pc + '%"></i></div></div>';
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
        '<small>' + esc(f.uploadedBy) + ' · ' + esc((f.createdAt || '').slice(5, 10).replace('-', '/')) + (f.statusLabel ? ' · ' + esc(f.statusLabel) : '') + '</small></div></div>';
    }).join('') : empty();
    if (id === 'budget') return d.budget
      ? (d.budget.summary.length ? d.budget.summary.map(function (b) {
          return '<div class="money" style="margin-bottom:10px"><div><label>' + esc(b.currency) + ' · ' + esc(CT.t('planned')) + '</label><strong>' + esc(CT.money(b.planned, b.currency)) + '</strong></div><div><label>' + esc(CT.t('forecast')) + '</label><strong>' + esc(CT.money(b.forecast, b.currency)) + '</strong></div><div><label>' + esc(CT.t('actual')) + '</label><strong>' + esc(CT.money(b.actual, b.currency)) + '</strong></div>' +
            (b.remaining != null ? '<div><label>' + esc(CT.t('remaining')) + '</label><strong style="color:' + (b.remaining < 0 ? 'var(--accent)' : 'var(--blue)') + '">' + esc(CT.money(b.remaining, b.currency)) + '</strong></div>' : '') + '</div>'; }).join('') + '<a href="/campteam/budget/" class="btn sm">' + esc(CT.t('openBudget')) + '</a>' : '<div class="empty">' + esc(CT.t('none')) + '</div>')
      : '<div class="locked">' + esc(CT.t('budgetLocked')) + '</div>';
    return '';
  }

  function tools(sec, i, n) {
    var b = function (a, label, ico, dis) { return '<button type="button" class="hs-b" data-a="' + a + '" data-i="' + i + '" title="' + esc(CT.t(label)) + '" aria-label="' + esc(CT.t(label)) + '"' + (dis ? ' disabled' : '') + '>' + ico + '</button>'; };
    return '<div class="hs-tools"><span class="hs-grip" title="' + esc(CT.t('secDrag')) + '">⠿</span><span class="hs-name">' + esc(CT.t(SECS[sec.id].t)) + (sec.show ? '' : ' · ' + esc(CT.t('secHiddenTag'))) + '</span><span class="sp"></span>' +
      b('up', 'secUp', '▲', i === 0) + b('down', 'secDown', '▼', i === n - 1) + b('size', sec.size === 'full' ? 'secHalf' : 'secWide', sec.size === 'full' ? '◧' : '▭') + b('show', sec.show ? 'secHide' : 'secShow', sec.show ? '🙈' : '👁') + '</div>';
  }

  function render() {
    var d = data, hasTest = [].concat(d.camps, d.deadlines, d.attention, d.agenda, d.meetings, d.files).some(function (r) { return r.isTest; });
    $('homeSub').innerHTML = esc(d.today) + ' · ' + esc(CT.t('campsCount')) + ' ' + d.camps.length + (hasTest ? ' <span class="chip test">' + esc(CT.t('testData')) + '</span>' : '') +
      (!editing && L.mine ? ' <span class="chip">' + esc(CT.t('mineOverrides')) + '</span>' : '');
    var list = editing ? work.sections : L.effective.sections;
    $('homeGrid').className = 'hgrid' + (editing ? ' editing' : '');
    $('homeGrid').innerHTML = list.map(function (sec, i) {
      if (!editing && !sec.show) return '';
      var def = SECS[sec.id], head = def.nocard ? '' : '<h2><span>' + esc(CT.t(def.t)) + '</span>' + (def.link ? '<a href="' + def.link + '">' + esc(CT.t('allCamps')) + '</a>' : '') + '</h2>';
      return '<section class="hs ' + (def.nocard ? 'nocard' : 'card') + (sec.size === 'full' ? ' full' : '') + (sec.show ? '' : ' off') + '" data-id="' + sec.id + '" data-i="' + i + '"' + (editing ? ' draggable="true"' : '') + '>' +
        (editing ? tools(sec, i, list.length) : '') + head + '<div class="hs-body">' + body(sec.id) + '</div></section>';
    }).join('');
    renderBar();
  }

  // ── 편집 모드 ──
  function clone(x) { return JSON.parse(JSON.stringify(x)); }
  function startScope(sc) {
    scope = sc; work = clone(sc === 'default' ? (L.default || L.builtIn) : L.effective); base = JSON.stringify(work);
  }
  function changed() { return editing && JSON.stringify(work) !== base; }
  function renderBar() {
    var bar = $('editBar'), btn = $('editHome');
    btn.hidden = false; btn.textContent = CT.t(editing ? 'editDone' : 'editHome');
    bar.hidden = !editing; if (!editing) return;
    bar.innerHTML = (L.canEditDefault ? '<div class="seg"><button type="button" data-sc="mine" class="' + (scope === 'mine' ? 'on' : '') + '">' + esc(CT.t('scopeMine')) + '</button><button type="button" data-sc="default" class="' + (scope === 'default' ? 'on' : '') + '">' + esc(CT.t('scopeDefault')) + '</button></div>' : '<b>' + esc(CT.t('scopeMine')) + '</b>') +
      '<span class="hint">' + esc(CT.t(scope === 'default' ? 'hintDefault' : 'hintMine')) + '</span><span class="sp"></span><span class="hint" id="barMsg"></span>' +
      '<button type="button" class="btn sm" id="barReset"' + ((scope === 'mine' && !L.mine) || (scope === 'default' && !L.default) ? ' disabled' : '') + '>' + esc(CT.t(scope === 'default' ? 'resetDefault' : 'resetMine')) + '</button>' +
      '<button type="button" class="btn sm pri" id="barSave">' + esc(CT.t('save')) + '</button>';
  }
  function msg(t, bad) { var m = $('barMsg'); if (m) { m.textContent = t; m.style.color = bad ? 'var(--accent)' : 'var(--ok)'; } }
  async function put() {
    if (!work.sections.some(function (s) { return s.show; })) { msg(CT.t('needOne'), true); return; }
    try { L = Object.assign(L, await CT.api('/api/campteam/home-layout', { method: 'PUT', body: { scope: scope, layout: work } })); base = JSON.stringify(work); render(); msg(CT.t('saved')); }
    catch (e) { msg(e.message, true); }
  }
  async function reset() {
    try { L = Object.assign(L, await CT.api('/api/campteam/home-layout?scope=' + scope, { method: 'DELETE' })); startScope(scope); render(); msg(CT.t('reset')); }
    catch (e) { msg(e.message, true); }
  }
  function move(from, to) { if (to < 0 || to >= work.sections.length || from === to) return; var x = work.sections.splice(from, 1)[0]; work.sections.splice(to, 0, x); render(); }
  function leave() { if (changed() && !confirm(CT.t('leaveDirty'))) return false; editing = false; work = null; render(); return true; }

  function wire() {
    $('editHome').onclick = function () { if (editing) { leave(); } else { editing = true; startScope('mine'); render(); } };
    $('editBar').onclick = function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.dataset.sc && t.dataset.sc !== scope) { if (changed() && !confirm(CT.t('leaveDirty'))) return; startScope(t.dataset.sc); render(); }
      else if (t.id === 'barSave') put(); else if (t.id === 'barReset') reset();
    };
    var grid = $('homeGrid'), dragFrom = -1;
    grid.addEventListener('click', function (e) {
      var b = e.target.closest('.hs-b'); if (!b || !editing) return; var i = +b.dataset.i, sec = work.sections[i];
      if (b.dataset.a === 'up') move(i, i - 1); else if (b.dataset.a === 'down') move(i, i + 1);
      else if (b.dataset.a === 'size') { sec.size = sec.size === 'full' ? 'half' : 'full'; render(); }
      else if (b.dataset.a === 'show') { sec.show = !sec.show; render(); }
    });
    grid.addEventListener('dragstart', function (e) { var h = e.target.closest && e.target.closest('.hs'); if (!editing || !h) return; dragFrom = +h.dataset.i; h.classList.add('drag'); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', h.dataset.id); } catch (x) {} });
    grid.addEventListener('dragover', function (e) { if (!editing || dragFrom < 0) return; e.preventDefault(); var h = e.target.closest('.hs'); [].forEach.call(grid.querySelectorAll('.over'), function (n) { if (n !== h) n.classList.remove('over'); }); if (h && +h.dataset.i !== dragFrom) h.classList.add('over'); });
    grid.addEventListener('drop', function (e) { if (!editing || dragFrom < 0) return; e.preventDefault(); var h = e.target.closest('.hs'), from = dragFrom; dragFrom = -1; if (h) move(from, +h.dataset.i); else render(); });
    grid.addEventListener('dragend', function () { dragFrom = -1; [].forEach.call(grid.querySelectorAll('.drag,.over'), function (n) { n.classList.remove('drag', 'over'); }); });
    window.addEventListener('beforeunload', function (e) { if (changed()) { e.preventDefault(); e.returnValue = ''; } });
  }

  CT.boot(async function () {
    try {
      var r = await Promise.all([CT.api('/api/campteam/home'), CT.api('/api/campteam/home-layout')]);
      data = r[0]; L = r[1];
    } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    CT.applyI18n(); wire(); render();
    document.addEventListener('ct-lang', render);
  });
})();
