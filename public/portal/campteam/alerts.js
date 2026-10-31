/* 알림공지 — 모든 캠프팀 화면 공통: 종 아이콘 + 오른쪽 슬라이드 패널 + 메뉴의 빨간 숫자, 홈의 「오늘 내가 할 일」 상자.
 * 서버: /api/campteam/alerts (내 알림은 열 때마다 업무·일정·회의에서 계산, 팀 공지·확인 표시만 저장) */
(function () {
  var CT = window.CT; if (!CT) return;
  CT.addDict({
    ko: { alTitle: '알림공지', alMine: '내 알림', alTeam: '팀 공지', alSeenAll: '모두 확인', alAll: '전체 보기 · 공지 쓰기', alNone: '새 알림이 없어요.', alNoneTeam: '팀 공지가 없어요.', alDismiss: '끄기', alUndo: '되돌리기', alDone: '완료', alDoneAsk: '이 업무를 완료로 바꿀까요?', alOpen: '열기', alOlder: '지난 공지', alPinned: '고정', alAllMembers: '팀 전체', alSelected: '선택한 사람', alNew: '새 공지', alOver: '마감 지남', alToday: '오늘 마감', alTodayMeet: '오늘 회의', alTodayEvent: '오늘 일정', alTomorrowMeet: '내일 회의', alTomorrowEvent: '내일 일정', alMeetShort: '회의', alEventShort: '일정', alDecision: '새 결정', alDayUnit: '일', alLeft: '일 남음', alByPrefix: '올린 사람', alMore: '더 보기', alMarkRead: '확인', alFailed: '처리하지 못했어요',
      tdTitle: '오늘 내가 할 일', tdOver: '마감이 지났어요', tdToday: '오늘 마감', tdSoon: '곧 마감', tdMeet: '오늘·내일 회의와 일정', tdDec: '새 결정', tdNone: '오늘 할 일이 없어요.', tdAi: 'AI 요약', tdWeek: '이번 주', tdWeekLine: '이번 주에 할 일', tdWeekTasks: '업무', tdWeekMeet: '회의·일정', tdWeekOver: '지난 마감', tdItems: '건', tdAllLink: '모두 보기', tdHide: '숨기기', tdShow: '오늘 할 일 보기', tdNoOwner: '내가 담당자로 지정된 업무가 없으면 여기에 나오지 않아요. 업무 화면에서 담당자를 내 이메일로 지정해 주세요.' },
    en: { alTitle: 'Alerts & Notices', alMine: 'My alerts', alTeam: 'Team notices', alSeenAll: 'Mark all read', alAll: 'View all · post a notice', alNone: 'No new alerts.', alNoneTeam: 'No team notices.', alDismiss: 'Dismiss', alUndo: 'Undo', alDone: 'Done', alDoneAsk: 'Mark this task as completed?', alOpen: 'Open', alOlder: 'Older notices', alPinned: 'Pinned', alAllMembers: 'Whole team', alSelected: 'Selected people', alNew: 'New notice', alOver: 'Overdue', alToday: 'Due today', alTodayMeet: 'Meeting today', alTodayEvent: 'Event today', alTomorrowMeet: 'Meeting tomorrow', alTomorrowEvent: 'Event tomorrow', alMeetShort: 'Meeting', alEventShort: 'Event', alDecision: 'New decision', alDayUnit: ' days', alLeft: ' days left', alByPrefix: 'By', alMore: 'More', alMarkRead: 'Mark read', alFailed: 'Could not do that',
      tdTitle: 'What I do today', tdOver: 'Overdue', tdToday: 'Due today', tdSoon: 'Due soon', tdMeet: 'Meetings and events today & tomorrow', tdDec: 'New decisions', tdNone: 'Nothing to do today.', tdAi: 'AI summary', tdWeek: 'This week', tdWeekLine: 'This week', tdWeekTasks: 'tasks', tdWeekMeet: 'meetings/events', tdWeekOver: 'overdue', tdItems: '', tdAllLink: 'View all', tdHide: 'Hide', tdShow: 'Show today’s to-do', tdNoOwner: 'Tasks only appear here when you are set as the owner. Assign your email as the owner on the Tasks page.' }
  });
  var esc = CT.esc, st = { data: null, panelTab: 'mine', open: false, today: null, todayHidden: lsGet('ct-today-hidden') === '1', busy: false };
  var $ = function (id) { return document.getElementById(id); };
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 저장이 막혀 있어도 동작 */ } }
  var api = function (qs, opts) { return CT.api('/api/campteam/alerts' + (qs || ''), opts); };
  var post = function (body) { return api('', { method: 'POST', body: body }); };

  function label(it) {
    if (it.type === 'decision') return CT.t('alDecision');
    if (it.level === 'over') return CT.t('alOver') + ' ' + (-it.daysLeft) + CT.t('alDayUnit');
    if (it.type === 'task') return it.daysLeft === 0 ? CT.t('alToday') : 'D-' + it.daysLeft;
    var meet = it.type === 'meeting';
    if (it.daysLeft === 0) return CT.t(meet ? 'alTodayMeet' : 'alTodayEvent');
    if (it.daysLeft === 1) return CT.t(meet ? 'alTomorrowMeet' : 'alTomorrowEvent');
    return CT.t(meet ? 'alMeetShort' : 'alEventShort') + ' D-' + it.daysLeft;
  }
  var dateShort = function (d) { return d ? d.slice(5).replace('-', '/') : ''; };

  // ── 내 알림 한 줄 ──
  function itemHtml(it) {
    var canDone = it.type === 'task' && CT.can('tasks', 'edit');
    return '<div class="ali ' + esc(it.level) + (it.state ? ' seen' : '') + '" data-key="' + esc(it.key) + '"><div class="alm"><span class="alt">' + esc(label(it)) + (!it.state ? '<i class="aldot" aria-hidden="true"></i>' : '') + '</span>' +
      '<a class="alx" href="' + esc(it.href || '#') + '" data-a="seen" data-key="' + esc(it.key) + '">' + esc(it.title) + '</a><small>' + esc([CT.lang() === 'en' && it.campEn ? it.campEn : it.camp, it.date ? dateShort(it.date) : '', it.time || ''].filter(Boolean).join(' · ')) + '</small></div>' +
      '<div class="alb">' + (canDone ? '<button type="button" class="btn sm" data-a="done" data-id="' + esc(it.taskId) + '">' + esc(CT.t('alDone')) + '</button>' : '') + '<button type="button" class="alclose" data-a="dismiss" data-key="' + esc(it.key) + '" aria-label="' + esc(CT.t('alDismiss')) + '" title="' + esc(CT.t('alDismiss')) + '">✕</button></div></div>';
  }
  // ── 팀 공지 한 줄 ──
  function annHtml(a, full) {
    var who = a.createdByName || (a.createdBy || '').split('@')[0], aud = a.audience === 'all' ? CT.t('alAllMembers') : CT.t('alSelected') + (a.recipients ? ' ' + a.recipients.length : '');
    return '<div class="ann' + (a.unread ? ' unread' : '') + (a.pinned ? ' pinned' : '') + '" data-id="' + esc(a.id) + '"><div class="annh">' + (a.pinned ? '<span class="chip">📌 ' + esc(CT.t('alPinned')) + '</span> ' : '') + (a.unread ? '<i class="aldot"></i>' : '') + '<b>' + esc(a.title) + '</b>' + (a.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '</div>' +
      (a.body ? '<div class="annb' + (full ? '' : ' clamp') + '">' + esc(a.body).replace(/\n/g, '<br>') + '</div>' : '') + (a.link ? '<a class="btn sm" href="' + esc(a.link) + '">' + esc(CT.t('alOpen')) + '</a> ' : '') +
      '<div class="annm">' + esc(who) + ' · ' + esc(a.createdAt.slice(5, 10).replace('-', '/')) + ' · ' + esc(aud) + '</div>' +
      '<div class="annbtn">' + (a.unread ? '<button type="button" class="btn sm" data-a="annSeen" data-id="' + esc(a.id) + '">' + esc(CT.t('alMarkRead')) + '</button>' : '') + (full && a.canEdit ? '<button type="button" class="btn sm" data-a="annEdit" data-id="' + esc(a.id) + '">' + esc(CT.t('edit')) + '</button><button type="button" class="btn sm danger" data-a="annDel" data-id="' + esc(a.id) + '">' + esc(CT.t('del')) + '</button>' : '') + '</div></div>';
  }
  function setBadges() {
    var n = st.data ? st.data.unread : 0, b = $('bellBadge'), nb = $('navBadge');
    if (b) { b.hidden = !n; b.textContent = n > 99 ? '99+' : n; } if (nb) { nb.hidden = !n; nb.textContent = n > 99 ? '99+' : n; }
    var bell = $('bellBtn'); if (bell) bell.setAttribute('aria-label', CT.t('alTitle') + (n ? ' (' + n + ')' : ''));
    var tm = document.querySelector('[data-pt=mine] i'), tt = document.querySelector('[data-pt=team] i');
    if (tm) { tm.hidden = !(st.data && st.data.unreadAuto); tm.textContent = st.data ? st.data.unreadAuto : ''; } if (tt) { tt.hidden = !(st.data && st.data.unreadAnn); tt.textContent = st.data ? st.data.unreadAnn : ''; }
  }
  function panelBody() {
    var d = st.data; if (!d) return '';
    if (st.panelTab === 'team') { var l = d.announcements || []; return l.length ? l.map(function (a) { return annHtml(a, false); }).join('') : '<div class="empty">' + esc(CT.t('alNoneTeam')) + '</div>'; }
    return d.items.length ? d.items.map(itemHtml).join('') : '<div class="empty">' + esc(CT.t('alNone')) + '</div>';
  }
  function renderPanel() {
    var p = $('aPanel'); if (!p) return; $('aBody').innerHTML = panelBody();
    [].forEach.call(p.querySelectorAll('[data-pt]'), function (b) { b.classList.toggle('on', b.dataset.pt === st.panelTab); });
    setBadges(); $('aSeenAll').hidden = st.panelTab !== 'mine';
  }
  function openPanel(open) {
    var p = $('aPanel'); if (!p) return; st.open = open; p.classList.toggle('open', open); $('aScrim').classList.toggle('open', open); p.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.documentElement.classList.toggle('al-open', open);
    if (open) { reload().then(renderPanel); var x = $('aClose'); if (x) x.focus(); } else { var bb = $('bellBtn'); if (bb) bb.focus(); }
  }

  async function load(lite) {
    try { st.data = await api(lite ? '?lite=1' : ''); } catch (e) { if (e.status === 403) { st.data = null; hideAll(); } return null; }
    setBadges(); return st.data;
  }
  function hideAll() { ['bellBtn', 'alertsNav'].forEach(function (id) { var el = $(id); if (el) el.hidden = true; }); }

  // ── 동작 ──
  async function act(e) {
    var b = e.target.closest ? e.target.closest('[data-a]') : null; if (!b) return; var a = b.dataset.a;
    try {
      if (a === 'dismiss') { e.preventDefault(); await post({ action: 'state', keys: [b.dataset.key], state: 'dismissed' }); await refreshAll(); }
      else if (a === 'seen') { post({ action: 'state', keys: [b.dataset.key], state: 'seen' }).catch(function () {}); /* 링크는 그대로 이동 */ }
      else if (a === 'annSeen') { e.preventDefault(); await post({ action: 'state', keys: ['ann:' + b.dataset.id], state: 'seen' }); await refreshAll(); }
      else if (a === 'done') { e.preventDefault(); if (!confirm(CT.t('alDoneAsk'))) return; await CT.api('/api/campteam/tasks?id=' + encodeURIComponent(b.dataset.id), { method: 'PATCH', body: { status: 'Completed' } }); await refreshAll(); }
      else if (a === 'weekHide') { e.preventDefault(); await post({ action: 'state', keys: ['weekly:' + b.dataset.date], state: 'dismissed' }); await refreshAll(); }
      else if (a === 'noticeSeen') { e.preventDefault(); if (window.CTHero) CTHero.markSeen(); }
    } catch (er) { alert(er.message || CT.t('alFailed')); }
  }
  async function reload() { var d = await load(!A.wantFull); if (d && A.wantFull) st.today = d; return d; }
  async function refreshAll() { await reload(); renderPanel(); renderToday(); if (A.onRefresh) A.onRefresh(st.data); }
  function seenAll() { return post({ action: 'seenAll' }).then(refreshAll).catch(function (er) { alert(er.message || CT.t('alFailed')); }); }

  // ── 홈: 오늘 내가 할 일 ──
  function todayRow(t, cls) {
    var canDone = t.type === 'task' && CT.can('tasks', 'edit');
    return '<div class="tdr td-' + cls + '"><a href="' + esc(t.href || '#') + '"><b>' + esc(t.title) + '</b><small>' + esc([CT.lang() === 'en' && t.campEn ? t.campEn : t.camp, t.date ? dateShort(t.date) : '', t.time || '', t.type === 'task' && t.daysLeft < 0 ? CT.t('alOver') + ' ' + (-t.daysLeft) + CT.t('alDayUnit') : ''].filter(Boolean).join(' · ')) + '</small></a>' +
      (canDone ? '<button type="button" class="btn sm" data-a="done" data-id="' + esc(t.taskId || '') + '">' + esc(CT.t('alDone')) + '</button>' : '') + '</div>';
  }
  function todaySection(titleKey, list, cls, max) {
    if (!list || !list.length) return ''; var more = list.length - max;
    return '<div class="tds td-' + cls + '"><h3>' + esc(CT.t(titleKey)) + ' <em>' + list.length + esc(CT.t('tdItems')) + '</em></h3>' + list.slice(0, max).map(function (t) { return todayRow(t, cls); }).join('') + (more > 0 ? '<a class="tdmore" href="/portal/campteam/alerts/">+' + more + ' ' + esc(CT.t('alMore')) + '</a>' : '') + '</div>';
  }
  function renderToday() {
    var host = $('todayBox'); if (!host || !st.today) return; var d = st.today, t = d.today, s = d.summary || {};
    if (window.CTHero && CTHero.pending && CTHero.pending()) return;   // 듀티·새 공지가 오기 전에는 그리지 않는다(한 번에 완성된 카드로 나오게)
    var ex = (window.CTHero && CTHero.todayExtra) ? CTHero.todayExtra() : { html: '', duties: 0, notices: 0 };
    // 카드 색: 마감 지난 일이 있으면 붉게, 오늘 할 일·듀티·새 공지가 있으면 주황, 모두 끝났으면 초록 — 한눈에 보이도록
    var cls = t.overdue.length ? 'is-over' : (t.today.length || ex.duties || ex.notices) ? 'is-today' : 'is-clear';
    var h = '<div class="tdhd"><h2>' + esc(CT.t('tdTitle')) + CT.help('today') + '</h2><span class="tddate">' + esc(d.date.replace(/-/g, '.')) + '</span>' + ((window.CTHero && CTHero.oooHtml) ? CTHero.oooHtml() : '') + '</div>';
    if (s.daily) h += '<div class="tdai"><span class="chip">' + esc(CT.t('tdAi')) + '</span>' + CT.help('aiSummary') + '<p>' + esc(s.daily) + '</p></div>';
    var body = ex.html + todaySection('tdOver', t.overdue, 'over', 5) + todaySection('tdToday', t.today, 'today', 5) + todaySection('tdSoon', t.soon, 'soon', 5) +
      todaySection('tdMeet', t.meetings.concat(t.events), 'meet', 5) + todaySection('tdDec', t.decisions, 'dec', 3);
    h += body || '<div class="tdnone">' + esc(CT.t('tdNone')) + '</div>';
    if (s.weeklyAvailable && !s.dismissedWeekly && d.week) {
      h += '<div class="tdweek"><div><span class="chip">' + esc(CT.t('tdWeek')) + '</span> <b>' + esc(CT.t('tdWeekLine')) + '</b> ' + esc(CT.t('tdWeekTasks') + ' ' + d.week.tasks + ', ' + CT.t('tdWeekMeet') + ' ' + (d.week.meetings + d.week.events) + (d.week.overdue ? ', ' + CT.t('tdWeekOver') + ' ' + d.week.overdue : '')) + CT.help('weeklyMail') + '</div>' + (s.weekly ? '<p>' + esc(s.weekly) + '</p>' : '') +
        '<button type="button" class="alclose" data-a="weekHide" data-date="' + esc(s.weeklyDate) + '" aria-label="' + esc(CT.t('alDismiss')) + '">✕</button></div>';
    }
    host.innerHTML = '<section class="tdbox ' + cls + '">' + h + '</section>';
    document.dispatchEvent(new CustomEvent('ct-today'));
  }
  async function makeSummaries(d) {
    if (!d.ai) return; var s = d.summary || {};
    var go = async function (kind, key) { try { var r = await post({ action: 'summary', kind: kind }); if (r.text) { d.summary[key] = r.text; renderToday(); } } catch (e) { /* 요약이 실패해도 목록은 그대로 */ } };
    if (s.dailyCanMake) await go('daily', 'daily'); if (s.weeklyCanMake && !s.dismissedWeekly) await go('weekly', 'weekly');
  }

  // ── 시작 ──
  var A = window.CTA = { renderToday: renderToday, load: load, reload: reload, seenAll: seenAll, render: renderPanel, refresh: refreshAll, annHtml: annHtml, itemHtml: itemHtml, label: label, api: api, post: post, st: st, wantFull: false, onRefresh: null };
  document.addEventListener('click', function (e) {
    var t = e.target; if (!t.closest) return;
    if (t.closest('#bellBtn')) { openPanel(!st.open); return; }
    if (t.closest('#aClose') || t.closest('#aScrim')) { openPanel(false); return; }
    var tab = t.closest('[data-pt]'); if (tab) { st.panelTab = tab.dataset.pt; renderPanel(); return; }
    if (t.closest('#aSeenAll')) { seenAll(); return; }
    act(e);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && st.open) openPanel(false); });
  document.addEventListener('ct-lang', function () { setBadges(); renderPanel(); renderToday(); });
  document.addEventListener('ct-ready', async function () {
    if (!CT.me || !CT.me.campRole) { hideAll(); return; }
    var nav = $('alertsNav'); if (nav) nav.hidden = false; var bell = $('bellBtn'); if (bell) bell.hidden = false;
    var wantToday = !!$('todayBox'); A.wantFull = A.wantFull || wantToday;
    var d = await load(!A.wantFull); if (!d) return; renderPanel();
    if (wantToday) { st.today = d; renderToday(); await makeSummaries(d); }
    if (A.onReady) A.onReady(d);
  });
})();
