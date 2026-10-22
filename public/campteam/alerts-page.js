// 알림공지 페이지: 내 알림(전체) · 팀 공지(쓰기·고치기·지우기) · 내 설정(주간 이메일) · 알림 기준(관리자)
(function () {
  CT.addDict({
    ko: { apSub: '내 업무 마감과 곧 있을 회의·일정, 팀원이 올린 공지를 한곳에서 확인해요.', apNewBtn: '+ 새 공지', apMineTab: '내 알림', apTeamTab: '팀 공지', apNoMine: '지금 확인할 알림이 없어요.', apNoTeam: '아직 팀 공지가 없어요.', apOlder: '지난 공지', apOver: '마감이 지났어요', apToday: '오늘', apSoon: '곧', apInfo: '새 소식',
      apMySet: '내 설정', apWeekly: '매주 화요일 아침에 이번 주 할 일을 이메일로 받기', apSaved: '저장했어요.',
      apAdminSet: '알림 기준 (관리자)', apDueDays: '업무 마감 며칠 전에 알릴까요', apDueHint: '쉼표로 여러 개. 예: 3, 1', apEventDays: '회의·일정 며칠 전에 알릴까요', apExpire: '지난 공지를 접는 일수', apSave: '저장',
      apFormNew: '새 공지', apFormEdit: '공지 고치기', apTitle: '제목', apBody: '내용', apAudience: '받는 사람', apAudAll: '팀 전체', apAudPeople: '선택한 사람', apPickPeople: '받을 사람 고르기', apPin: '맨 위에 고정', apPublish: '올리기', apPosted: '공지를 올렸어요.', apDeleted: '삭제했어요. 휴지통에서 복구할 수 있어요.', apDelAsk: '이 공지를 삭제할까요? (휴지통에서 복구할 수 있어요)', apNoAccess: '캠프팀 명단에 있는 계정만 쓸 수 있어요.', apMe: '나' },
    en: { apSub: 'See your task deadlines, upcoming meetings/events and team notices in one place.', apNewBtn: '+ New notice', apMineTab: 'My alerts', apTeamTab: 'Team notices', apNoMine: 'Nothing to check right now.', apNoTeam: 'No team notices yet.', apOlder: 'Older notices', apOver: 'Overdue', apToday: 'Today', apSoon: 'Soon', apInfo: 'News',
      apMySet: 'My settings', apWeekly: 'Email me this week’s tasks every Tuesday morning', apSaved: 'Saved.',
      apAdminSet: 'Alert rules (admin)', apDueDays: 'Days before a task deadline to alert', apDueHint: 'Comma separated, e.g. 3, 1', apEventDays: 'Days before a meeting/event to alert', apExpire: 'Days after which old notices fold away', apSave: 'Save',
      apFormNew: 'New notice', apFormEdit: 'Edit notice', apTitle: 'Title', apBody: 'Message', apAudience: 'Send to', apAudAll: 'Whole team', apAudPeople: 'Selected people', apPickPeople: 'Choose recipients', apPin: 'Pin to the top', apPublish: 'Post', apPosted: 'Notice posted.', apDeleted: 'Deleted. You can restore it from the trash.', apDelAsk: 'Delete this notice? (It can be restored from the trash)', apNoAccess: 'Only accounts on the camp team roster can use this.', apMe: 'me' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, P = new URLSearchParams(location.search), tab = P.get('tab') === 'team' ? 'team' : 'mine', A = window.CTA;
  A.wantFull = true;

  function listHtml(d) {
    if (tab === 'team') {
      var live = d.announcements.filter(function (a) { return !a.folded; }), old = d.announcements.filter(function (a) { return a.folded; });
      return (live.length ? live.map(function (a) { return A.annHtml(a, true); }).join('') : '<div class="empty">' + esc(CT.t('apNoTeam')) + '</div>') + (old.length ? '<details class="ptdet"><summary>' + esc(CT.t('apOlder')) + ' (' + old.length + ')</summary><div class="stack" style="margin-top:8px">' + old.map(function (a) { return A.annHtml(a, true); }).join('') + '</div></details>' : '');
    }
    var groups = [['over', 'apOver'], ['today', 'apToday'], ['soon', 'apSoon'], ['info', 'apInfo']], h = '';
    groups.forEach(function (g) { var l = d.items.filter(function (x) { return x.level === g[0]; }); if (l.length) h += '<h4 class="aghd">' + esc(CT.t(g[1])) + '</h4>' + l.map(A.itemHtml).join(''); });
    return h || '<div class="empty">' + esc(CT.t('apNoMine')) + '</div>';
  }
  function render(d) {
    if (!d) return;
    $('apTabs').innerHTML = [['mine', 'apMineTab', d.unreadAuto], ['team', 'apTeamTab', d.unreadAnn]].map(function (t) { return '<button class="tab' + (tab === t[0] ? ' on' : '') + '" data-ptab="' + t[0] + '">' + esc(CT.t(t[1])) + (t[2] ? ' <span class="chip" style="background:#e5534b;color:#fff">' + t[2] + '</span>' : '') + '</button>'; }).join('') + CT.help(tab === 'team' ? 'teamNotice' : 'myAlerts');
    $('apList').innerHTML = listHtml(d);
    $('apMine').innerHTML = '<h2>' + esc(CT.t('apMySet')) + '</h2><label class="chk" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" id="apWeekly"' + (d.prefs.weeklyEmail ? ' checked' : '') + '><span>' + esc(CT.t('apWeekly')) + CT.help('weeklyMail') + '</span></label><div class="hint" id="apMsg" style="margin-top:6px"></div>';
    var nb = $('apNew'); if (nb) nb.hidden = !d.perms.notices;
    var ad = $('apAdmin'); ad.hidden = !d.perms.manageMembers;
    if (d.perms.manageMembers) ad.innerHTML = '<h2>' + esc(CT.t('apAdminSet')) + CT.help('notifyDays') + '</h2><div class="stack alform"><label>' + esc(CT.t('apDueDays')) + '<input id="apDue" value="' + esc(d.settings.dueDays.join(', ')) + '"><small class="hint">' + esc(CT.t('apDueHint')) + '</small></label><label>' + esc(CT.t('apEventDays')) + '<input id="apEvt" value="' + esc(d.settings.eventDays.join(', ')) + '"></label><label>' + esc(CT.t('apExpire')) + CT.help('expireDays') + '<input id="apExp" inputmode="numeric" value="' + esc(d.settings.expireDays) + '"></label><button class="btn pri" id="apSave" type="button">' + esc(CT.t('apSave')) + '</button><div class="hint" id="apAdmMsg"></div></div>';
  }
  function composeDialog(a) {
    var d = A.st.data, people = d.people, me = (CT.me.email || '').toLowerCase(), sel = new Set((a && a.recipients) || []);
    var f = '<label>' + esc(CT.t('apTitle')) + '<input name="title" maxlength="80" required value="' + esc(a ? a.title : '') + '"></label><label>' + esc(CT.t('apBody')) + '<textarea name="body" maxlength="2000">' + esc(a ? a.body : '') + '</textarea></label>' +
      '<label>' + esc(CT.t('apAudience')) + '<select name="audience"><option value="all"' + (!a || a.audience === 'all' ? ' selected' : '') + '>' + esc(CT.t('apAudAll')) + '</option><option value="people"' + (a && a.audience === 'people' ? ' selected' : '') + '>' + esc(CT.t('apAudPeople')) + '</option></select></label>' +
      '<div id="apPeople" ' + (a && a.audience === 'people' ? '' : 'hidden') + '><small class="hint">' + esc(CT.t('apPickPeople')) + '</small><div class="pickgrid">' + people.map(function (p) { return '<label><input type="checkbox" name="rcpt" value="' + esc(p.email) + '"' + (sel.has(p.email) ? ' checked' : '') + '> ' + esc(p.name || p.email) + (p.email === me ? ' (' + esc(CT.t('apMe')) + ')' : '') + '</label>'; }).join('') + '</div></div>' +
      '<label class="chk" style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="pinned"' + (a && a.pinned ? ' checked' : '') + '> ' + esc(CT.t('apPin')) + CT.help('pin') + '</label>';
    CT.ask(CT.t(a ? 'apFormEdit' : 'apFormNew'), f, async function (fd) {
      var rc = [].map.call($('dlgForm').querySelectorAll('[name=rcpt]:checked'), function (x) { return x.value; });
      var body = { action: a ? 'edit' : 'announce', title: fd.title, body: fd.body, audience: fd.audience, recipients: rc, pinned: !!fd.pinned }; if (a) body.id = a.id;
      await A.post(body); tab = 'team'; await A.refresh();
    }, { saveLabel: CT.t('apPublish') });
    var au = $('dlgForm').querySelector('[name=audience]'); au.onchange = function () { $('apPeople').hidden = au.value !== 'people'; };
  }
  document.addEventListener('click', async function (e) {
    var t = e.target; if (!t.closest) return;
    var tb = t.closest('[data-ptab]'); if (tb) { tab = tb.dataset.ptab; render(A.st.data); return; }
    if (t.closest('#apNew')) { composeDialog(null); return; }
    var b = t.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'annEdit') { composeDialog(A.st.data.announcements.filter(function (x) { return x.id === b.dataset.id; })[0]); }
    else if (b.dataset.a === 'annDel') { if (!confirm(CT.t('apDelAsk'))) return; try { await A.post({ action: 'delete', id: b.dataset.id }); await A.refresh(); alert(CT.t('apDeleted')); } catch (er) { alert(er.message); } }
    else if (b.id === 'apSave') {
      var m = $('apAdmMsg'); try { await A.post({ action: 'settings', dueDays: $('apDue').value, eventDays: $('apEvt').value, expireDays: $('apExp').value }); m.textContent = CT.t('apSaved'); m.style.color = 'var(--ok)'; await A.refresh(); } catch (er) { m.textContent = er.message; m.style.color = 'var(--accent)'; }
    }
  });
  document.addEventListener('change', async function (e) { if (e.target.id === 'apWeekly') { try { await A.post({ action: 'pref', weeklyEmail: e.target.checked }); $('apMsg').textContent = CT.t('apSaved'); } catch (er) { $('apMsg').textContent = er.message; } } });
  A.onReady = function (d) { render(d); if (P.get('new') === '1') composeDialog(null); };
  A.onRefresh = render;
  CT.boot(async function (me) { if (!me.campRole) { $('apErr').hidden = false; $('apErr').textContent = CT.t('apNoAccess'); return; } CT.applyI18n(); });
  document.addEventListener('ct-lang', function () { render(A.st.data); });
})();
