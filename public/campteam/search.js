(function () {
  CT.addDict({
    ko: { srTitle: '통합 검색', srGo: '검색', srNone: '검색 결과가 없어요.', srTasks: '업무', srMeetings: '회의', srSections: '회의 구역(안건별 논의)', srDecisions: '결정', srFiles: '파일', srBudget: '예산 항목', srHint: '두 글자 이상 입력해 주세요.', srCount: '건', srLocked: '금액 자료' },
    en: { srTitle: 'Search', srGo: 'Search', srNone: 'No results.', srTasks: 'Tasks', srMeetings: 'Meetings', srSections: 'Meeting sections', srDecisions: 'Decisions', srFiles: 'Files', srBudget: 'Budget lines', srHint: 'Please enter at least 2 characters.', srCount: ' results', srLocked: 'Amounts' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var kindLabel = { proposal: 'proposal', direction: 'direction', final: 'final', hold: 'hold', changed: 'changed' };
  function section(title, items, render) { return items && items.length ? '<section class="card" style="margin-bottom:14px"><h2>' + esc(title) + ' <span class="meta">' + items.length + '</span></h2>' + items.map(render).join('') + '</section>' : ''; }
  async function run(q) {
    $('srOut').innerHTML = ''; if (!q || q.length < 2) { $('srSub').textContent = CT.t('srHint'); return; }
    try {
      var r = await CT.api('/api/campteam/search?q=' + encodeURIComponent(q)), g = r.groups;
      $('srSub').textContent = '"' + q + '" · ' + r.total + CT.t('srCount');
      var h = section(CT.t('srTasks'), g.tasks, function (t) { return '<div class="row"><div><a href="/campteam/tasks/">' + esc(t.title) + '</a><small>' + esc(t.ownerName || '—') + (t.dueDate ? ' · ' + esc(t.dueDate) : '') + ' · ' + esc(t.status) + '</small></div></div>'; }) +
        section(CT.t('srMeetings'), g.meetings, function (m) { return '<div class="row"><div><a href="/campteam/meetings/?open=' + esc(m.id) + '">' + esc(CT.lang() === 'en' && m.titleEn ? m.titleEn : m.title) + '</a><small>' + esc(m.meetDate) + '</small></div></div>'; }) +
        section(CT.t('srSections'), g.sections, function (s) { return '<div class="row"><div><a href="/campteam/meetings/?open=' + esc(s.meetingId) + '">' + esc(CT.lang() === 'en' && s.titleEn ? s.titleEn : s.topic) + '</a><small>' + esc(s.meetDate) + ' · ' + esc(s.meetingTitle) + '</small></div></div>'; }) +
        section(CT.t('srDecisions'), g.decisions, function (d) { return '<div class="row"><div><span class="kindchip kc-' + esc(d.kind) + '">' + esc(d.kind) + '</span> <a href="/campteam/meetings/?open=' + esc(d.meetingId) + '">' + esc(CT.lang() === 'en' && d.textEn ? d.textEn : (d.textKo || d.textEn)) + '</a><small>' + esc(d.decidedDate || '') + ' · ' + esc(d.state) + '</small></div></div>'; }) +
        section(CT.t('srFiles'), g.files, function (f) { return '<div class="row"><div><a href="/campteam/files/">' + esc(f.title) + '</a>' + (f.restricted ? ' <span class="chip lock">🔒 ' + esc(CT.t('srLocked')) + '</span>' : '') + '<small>' + esc(f.fileName || f.kind) + '</small></div></div>'; }) +
        section(CT.t('srBudget'), g.budget, function (b) { return '<div class="row"><div><a href="/campteam/budget/">' + esc(b.label) + '</a><small>' + esc(b.category) + ' · ' + esc(Number(b.plannedAmount).toLocaleString()) + ' ' + esc(b.currency) + '</small></div></div>'; });
      $('srOut').innerHTML = h || '<div class="empty">' + esc(CT.t('srNone')) + '</div>';
    } catch (e) { $('srOut').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
  }
  CT.boot(async function () {
    CT.applyI18n(); var q = new URLSearchParams(location.search).get('q') || ''; $('srq').value = q; run(q.trim());
    $('srForm').onsubmit = function (e) { e.preventDefault(); var v = $('srq').value.trim(); history.replaceState(null, '', '?q=' + encodeURIComponent(v)); run(v); };
  });
})();
