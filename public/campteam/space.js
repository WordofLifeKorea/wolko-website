(function () {
  CT.addDict({
    ko: { lyEdit: '화면 편집', lyDone: '편집 끝', lyReset: '기본으로 되돌리기', lyUp: '위로', lyDown: '아래로', lyHide: '숨기기', lyShow: '다시 보이기', lyHint: '카드를 위아래로 옮기거나 숨겨서 내 화면에 맞춰요. 다른 사람 화면은 바뀌지 않아요.', spBack: '← 캠프별 공간 목록', spTasks: '진행 중 업무', spEvents: '다가오는 일정', spMeetings: '회의', spDecisions: '현재 유효한 결정', spNext: '다음 회의 안건', spFiles: '자료', spBudget: '예산', spCamps: '이 유형의 행사', all: '전체 보기', open: '진행 중 업무', overdue: '마감 지남', noOwner: '담당자 미정', completion: '완료율', filesN: '자료', none: '표시할 내용이 없어요.', owner: '담당', noOwnerTag: '담당 미정', suggested: '제안', due: '기한', dateTbd: '날짜 미정', planned: '예산 계획', forecast: '예상 최종', actual: '실제', target: '총 예산', remaining: '남음', typeAll: '유형 전체 기록', openBudget: '예산 자세히', planning: '준비 중', active: '진행 중', done: '종료', canceled: '취소', draft: '초안', dkdirection: '방향 합의', dkfinal: '최종 결정', dkchanged: '변경' },
    en: { lyEdit: 'Edit view', lyDone: 'Done', lyReset: 'Reset to default', lyUp: 'Move up', lyDown: 'Move down', lyHide: 'Hide', lyShow: 'Show again', lyHint: 'Move cards up/down or hide them to fit your screen. Other people’s screens do not change.', spBack: '← Camp spaces', spTasks: 'Open tasks', spEvents: 'Upcoming events', spMeetings: 'Meetings', spDecisions: 'Current decisions', spNext: 'Next meeting agenda', spFiles: 'Files', spBudget: 'Budget', spCamps: 'Events of this type', all: 'View all', open: 'Open tasks', overdue: 'Overdue', noOwner: 'No owner', completion: 'Completion', filesN: 'Files', none: 'Nothing to show.', owner: 'Owner', noOwnerTag: 'No owner', suggested: 'Suggested', due: 'Due', dateTbd: 'Date TBD', planned: 'Planned', forecast: 'Forecast', actual: 'Actual', target: 'Total budget', remaining: 'Remaining', typeAll: 'Whole-type history', openBudget: 'Open budget', planning: 'Planning', active: 'Active', done: 'Done', canceled: 'Canceled', draft: 'Draft', dkdirection: 'Direction agreed', dkfinal: 'Final decision', dkchanged: 'Changed' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, P = new URLSearchParams(location.search), campId = P.get('id'), typeId = P.get('typeId');
  var empty = function () { return '<div class="empty">' + esc(CT.t('none')) + '</div>'; };
  var nm = function (r, a, b) { return CT.lang() === 'en' ? (r[b] || r[a]) : (r[a] || r[b]); };
  var card = function (title, link, body) { return '<section class="card"><h2><span>' + esc(title) + '</span>' + (link ? '<a href="' + link + '">' + esc(CT.t('all')) + '</a>' : '') + '</h2>' + body + '</section>'; };
  var q = campId ? 'campId=' + encodeURIComponent(campId) : 'typeId=' + encodeURIComponent(typeId);

  function render(d) {
    var c = d.camp, t = d.type, st = d.stats, pct = st.total ? Math.round(st.completed / st.total * 100) : 0;
    document.title = (c ? nm(c, 'nameKo', 'nameEn') : nm(t, 'nameKo', 'nameEn')) + ' — WOLKO Camp Team';
    $('spTitle').innerHTML = esc(c ? nm(c, 'nameKo', 'nameEn') : nm(t, 'nameKo', 'nameEn')) + (c && c.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '');
    $('spSub').innerHTML = c ? esc(nm(t, 'nameKo', 'nameEn')) + ' · ' + esc(c.startDate ? c.startDate + (c.endDate ? ' ~ ' + c.endDate : '') : CT.t('dateTbd')) + ' · <span class="status ' + esc(c.status) + '">' + esc(CT.t(c.status)) + '</span>' + (c.location ? ' · ' + esc(c.location) : '') + (c.theme ? '<br>' + esc(c.theme) : '') : esc(CT.t('typeAll')) + (t.description ? ' · ' + esc(t.description) : '');
    $('spActions').innerHTML = '<button type="button" class="btn" id="spEdit"' + (editing ? ' hidden' : '') + '>' + esc(CT.t('lyEdit')) + '</button><a class="btn" href="/campteam/camps/">' + esc(CT.t('spBack')) + '</a>' + (c ? '<a class="btn" href="/campteam/tasks/?' + q + '">' + esc(CT.t('spTasks')) + '</a>' : '') + (d.perms.moneyRead && c ? '<a class="btn" href="/campteam/budget/?' + q + '">' + esc(CT.t('openBudget')) + '</a>' : '');
    $('spStats').innerHTML = '<div class="stat"><label>' + esc(CT.t('open')) + '</label><strong>' + st.open + '</strong></div><div class="stat late"><label>' + esc(CT.t('overdue')) + '</label><strong>' + st.overdue + '</strong></div><div class="stat"><label>' + esc(CT.t('noOwner')) + '</label><strong>' + st.noOwner + '</strong></div><div class="stat"><label>' + esc(CT.t('completion')) + '</label><strong>' + pct + '%</strong><div class="bar" style="margin-top:8px"><i style="width:' + pct + '%"></i></div></div>';
    $('spCamps').innerHTML = !c && d.camps.length ? '<section class="card" style="margin-bottom:16px"><h2>' + esc(CT.t('spCamps')) + '</h2>' + d.camps.map(function (x) { return '<div class="row"><div><a href="/campteam/space/?id=' + esc(x.id) + '">' + esc(nm(x, 'nameKo', 'nameEn')) + '</a><small>' + esc(x.startDate || CT.t('dateTbd')) + '</small></div><span class="status ' + esc(x.status) + '">' + esc(CT.t(x.status)) + '</span></div>'; }).join('') + '</section>' : '';
    var tasks = d.tasks.length ? d.tasks.map(function (x) { return '<div class="row"><div>' + esc(x.title) + '<small>' + (x.ownerName ? esc(CT.t('owner')) + ': ' + esc(x.ownerName) : '<span class="tag t-late">' + esc(CT.t('noOwnerTag')) + '</span>' + (x.ownerSuggestion ? ' ' + esc(CT.t('suggested')) + ': ' + esc(x.ownerSuggestion) : '')) + (x.section ? ' · ' + esc(x.section) : '') + '</small></div>' + (x.dueDate ? '<span class="tag t-none">' + esc(CT.t('due')) + ' ' + esc(x.dueDate.slice(5).replace('-', '/')) + '</span>' : '') + '</div>'; }).join('') : empty();
    var events = d.events.length ? d.events.map(function (x) { return '<div class="row"><div>' + esc(x.title) + '<small>' + esc(x.startDate + (x.endDate && x.endDate !== x.startDate ? ' ~ ' + x.endDate : '') + (x.startTime ? ' ' + x.startTime : '')) + '</small></div></div>'; }).join('') : empty();
    var meetings = d.meetings.length ? d.meetings.map(function (x) { return '<div class="row"><div><a href="/campteam/meetings/?open=' + esc(x.id) + '">' + esc(nm(x, 'title', 'titleEn')) + '</a><small>' + esc(x.meetDate) + '</small></div>' + (x.status === 'draft' ? '<span class="chip warn">' + esc(CT.t('draft')) + '</span>' : '') + '</div>'; }).join('') : empty();
    var decs = d.decisions.length ? d.decisions.map(function (x) { return '<div class="row"><div><a href="/campteam/meetings/?open=' + esc(x.meetingId) + '">' + esc(nm(x, 'textKo', 'textEn')) + '</a><small>' + esc(CT.t('dk' + x.kind)) + ' · ' + esc(x.decidedDate || '') + '</small></div></div>'; }).join('') : empty();
    var next = d.nextAgenda.length ? d.nextAgenda.map(function (x) { return '<div class="row"><div>' + esc(nm(x, 'topic', 'titleEn')) + '</div></div>'; }).join('') : empty();
    var files = d.files.length ? d.files.map(function (x) { return '<div class="row"><div><a href="/campteam/files/?' + q + '">' + esc(x.title) + '</a>' + (x.restricted ? ' <span class="chip lock">🔒</span>' : '') + '<small>' + esc(x.category) + ' · ' + esc((x.createdAt || '').slice(0, 10)) + '</small></div></div>'; }).join('') : empty();
    var budget = d.budget ? (d.budget.length ? d.budget.map(function (b) { return '<div class="money" style="margin-bottom:8px"><div><label>' + esc(b.currency) + ' ' + esc(CT.t('planned')) + '</label><strong style="font-size:17px">' + esc(CT.money(b.planned, b.currency)) + '</strong></div><div><label>' + esc(CT.t('forecast')) + '</label><strong style="font-size:17px">' + esc(CT.money(b.forecast, b.currency)) + '</strong></div>' + (b.remaining != null ? '<div><label>' + esc(CT.t('remaining')) + '</label><strong style="font-size:17px;color:' + (b.remaining < 0 ? 'var(--accent)' : 'var(--blue)') + '">' + esc(CT.money(b.remaining, b.currency)) + '</strong></div>' : '') + '</div>'; }).join('') : empty()) : '';
    if (c && window.SpacePortal) window.SpacePortal.mount(c, d.budget);
    var cards = {
      tasks: card(CT.t('spTasks'), c ? '/campteam/tasks/?' + q : '/campteam/tasks/', tasks),
      events: card(CT.t('spEvents'), '/campteam/calendar/', events),
      meetings: card(CT.t('spMeetings'), '/campteam/meetings/' + (c ? '?campId=' + encodeURIComponent(c.id) : ''), meetings),
      decisions: card(CT.t('spDecisions'), '/campteam/meetings/', decs),
      next: card(CT.t('spNext'), '/campteam/meetings/', next),
      files: card(CT.t('spFiles') + ' (' + st.files + ')', '/campteam/files/?' + q, files)
    };
    if (d.budget) cards.budget = '<section class="card full"><h2><span>' + esc(CT.t('spBudget')) + '</span><a href="/campteam/budget/' + (c ? '?campId=' + encodeURIComponent(c.id) : '') + '">' + esc(CT.t('all')) + '</a></h2>' + budget + '</section>';
    renderLayout(cards, !!c);
  }
  // ── 내 화면 편집: 카드 순서·숨김 (내 화면에만 적용, 서버에 내 이메일로 저장) ──
  var DEFAULT_ORDER = ['tasks', 'events', 'meetings', 'decisions', 'next', 'files', 'budget'], lay = { order: [], hidden: [] }, editing = false, layLoaded = false, lastCards = null, lastIsCamp = false;
  var NAMES = { portal: 'ptTitle', tasks: 'spTasks', events: 'spEvents', meetings: 'spMeetings', decisions: 'spDecisions', next: 'spNext', files: 'spFiles', budget: 'spBudget' };
  function orderNow(cards) { var seen = {}, out = []; lay.order.concat(DEFAULT_ORDER).forEach(function (id) { if (!seen[id] && cards[id]) { seen[id] = 1; out.push(id); } }); return out; }
  function renderLayout(cards, isCamp) {
    lastCards = cards; lastIsCamp = isCamp;
    var ids = orderNow(cards), hidden = function (id) { return lay.hidden.indexOf(id) >= 0; };
    $('spPortal').hidden = !isCamp || (hidden('portal') && !editing);
    $('spPortal').style.opacity = hidden('portal') ? '.45' : '';
    $('spGrid').innerHTML = ids.filter(function (id) { return editing || !hidden(id); }).map(function (id) {
      if (!editing) return cards[id];
      var i = ids.indexOf(id), ctl = '<div class="lyc"><button type="button" data-lay="up" data-id="' + id + '"' + (i === 0 ? ' disabled' : '') + ' aria-label="' + esc(CT.t('lyUp')) + '">▲</button><button type="button" data-lay="down" data-id="' + id + '"' + (i === ids.length - 1 ? ' disabled' : '') + ' aria-label="' + esc(CT.t('lyDown')) + '">▼</button><button type="button" data-lay="toggle" data-id="' + id + '">' + esc(CT.t(hidden(id) ? 'lyShow' : 'lyHide')) + '</button></div>';
      return '<div class="lywrap' + (hidden(id) ? ' off' : '') + (cards[id].indexOf('card full') >= 0 ? ' full' : '') + '">' + ctl + cards[id] + '</div>';
    }).join('');
    var bar = $('spEditBar'); if (bar) { bar.hidden = !editing; if (editing) bar.innerHTML = '<span>' + esc(CT.t('lyHint')) + CT.help('layoutEdit') + '</span>' + (isCamp ? '<label class="chk"><input type="checkbox" data-lay="portal"' + (hidden('portal') ? '' : ' checked') + '> ' + esc(CT.t('ptTitle')) + '</label>' : '') + '<span class="sp"></span><button type="button" class="btn sm" data-lay="reset">' + esc(CT.t('lyReset')) + '</button><button type="button" class="btn sm pri" data-lay="done">' + esc(CT.t('lyDone')) + '</button>'; }
    var eb = $('spEdit'); if (eb) eb.hidden = editing;
  }
  async function saveLayout() { try { await CT.api('/api/campteam/space-layout', { method: 'PUT', body: lay }); } catch (e) { alert(e.message); } }
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-lay],#spEdit'); if (!b) return;
    if (b.id === 'spEdit') { editing = true; renderLayout(lastCards, lastIsCamp); return; }
    var a = b.dataset.lay, id = b.dataset.id, ids = orderNow(lastCards);
    if (a === 'done') { editing = false; renderLayout(lastCards, lastIsCamp); return; }
    if (a === 'reset') { lay = { order: [], hidden: [] }; try { await CT.api('/api/campteam/space-layout', { method: 'DELETE' }); } catch (er) { alert(er.message); } renderLayout(lastCards, lastIsCamp); return; }
    if (a === 'portal') { var on = b.checked; lay.hidden = lay.hidden.filter(function (x) { return x !== 'portal'; }); if (!on) lay.hidden.push('portal'); }
    else if (a === 'toggle') { lay.hidden = lay.hidden.indexOf(id) >= 0 ? lay.hidden.filter(function (x) { return x !== id; }) : lay.hidden.concat(id); lay.order = ids; }
    else if (a === 'up' || a === 'down') { var i = ids.indexOf(id), k = a === 'up' ? i - 1 : i + 1; if (k < 0 || k >= ids.length) return; var t = ids[i]; ids[i] = ids[k]; ids[k] = t; lay.order = ids; }
    else return;
    renderLayout(lastCards, lastIsCamp); saveLayout();
  });
  var data = null;
  CT.boot(async function () {
    if (!campId && !typeId) { location.replace('/campteam/camps/'); return; }
    try { data = await CT.api('/api/campteam/camp-space?' + (campId ? 'id=' + encodeURIComponent(campId) : 'typeId=' + encodeURIComponent(typeId))); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    try { var L = await CT.api('/api/campteam/space-layout'); if (L.layout) lay = L.layout; } catch (e) { /* 배치를 못 읽어도 기본 배치로 보여 준다 */ }
    CT.applyI18n(); render(data); document.addEventListener('ct-lang', function () { CT.applyI18n(); render(data); });
  });
})();
