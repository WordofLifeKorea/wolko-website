// 알림공지 페이지: 내 알림(전체) · 팀 공지(쓰기·고치기·지우기) · 내 설정(주간 이메일) · 알림 기준(관리자)
(function () {
  CT.addDict({
    ko: { apSub: '내 업무 마감과 곧 있을 회의·일정, 팀원이 올린 공지를 한곳에서 확인해요.', apNewBtn: '+ 새 공지', apMineTab: '내 알림', apTeamTab: '팀 공지', apNoMine: '지금 확인할 알림이 없어요.', apNoTeam: '아직 팀 공지가 없어요.', apOlder: '지난 공지', apOver: '마감이 지났어요', apToday: '오늘', apSoon: '곧', apInfo: '새 소식',
      apSetBtn: '설정', apSetTitle: '알림 설정', apClose: '닫기', apSaved: '저장했어요.', apSave: '저장',
      apSecWhen: '알림 받을 때', apSecMail: '이메일', apSecMore: '그 밖에', apSecFixed: '고정 알림 (관리자)', apSecFixedHint: '모든 팀원에게 똑같이 알려요. 각자 정한 날은 여기에 더해져요.',
      apRowDue: '업무 마감', apRowEvt: '회의·일정', apNone: '없음', apFixedDone: '고정 알림으로 이미 설정됨',
      apD0: '마감 당일', apE0: '당일 아침', apW1: '1주 전', apW2: '2주 전', apNBefore: '{n}일 전', apCustom: '직접 입력 (○일 전)', apCustomAdd: '추가', apCustomBad: '1~60 사이 숫자를 적어 주세요.', apTooMany: '날짜는 8개까지만 고를 수 있어요.',
      apWeekly: '매주 화요일 이메일', apWeeklySub: '화요일 아침에 이번 주 할 일을 보내 드려요.', apEmailDue: '마감·일정 알림 이메일', apEmailDueSub: '알림 목록은 이 스위치와 상관없이 그대로 보여요.',
      apQuiet: '방해 금지 시간대', apQuietSub: '이 시간에는 이메일을 보내지 않아요 (한국 시간).', apQuietFrom: '부터', apQuietTo: '까지',
      apMine: '내가 만든 업무도 알림 받기', apMineSub: '담당자가 다른 사람이어도 내가 만든 업무의 마감을 알려 드려요.',
      apTest: '나에게 테스트 이메일 보내기', apTestSent: '보냈어요. 받은편지함을 확인해 주세요.', apTestOff: '이메일 보내기가 아직 준비되지 않았어요.', apOffNote: '이메일을 끄셔도 이 알림 목록에는 그대로 보여요. 알림은 「확인」이나 ✕를 눌러야 사라져요.',
      apExpire: '지난 공지를 접는 일수', apDays: '일',
      apFormNew: '새 공지', apFormEdit: '공지 고치기', apTitle: '제목', apBody: '내용', apAudience: '받는 사람', apAudAll: '팀 전체', apAudPeople: '선택한 사람', apPickPeople: '받을 사람 고르기', apPin: '맨 위에 고정', apPublish: '올리기', apPosted: '공지를 올렸어요.', apDeleted: '삭제했어요. 휴지통에서 복구할 수 있어요.', apDelAsk: '이 공지를 삭제할까요? (휴지통에서 복구할 수 있어요)', apNoAccess: '캠프팀 명단에 있는 계정만 쓸 수 있어요.', apMe: '나' },
    en: { apSub: 'See your task deadlines, upcoming meetings/events and team notices in one place.', apNewBtn: '+ New notice', apMineTab: 'My alerts', apTeamTab: 'Team notices', apNoMine: 'Nothing to check right now.', apNoTeam: 'No team notices yet.', apOlder: 'Older notices', apOver: 'Overdue', apToday: 'Today', apSoon: 'Soon', apInfo: 'News',
      apSetBtn: 'Settings', apSetTitle: 'Alert settings', apClose: 'Close', apSaved: 'Saved.', apSave: 'Save',
      apSecWhen: 'When to alert me', apSecMail: 'E-mail', apSecMore: 'Other', apSecFixed: 'Fixed reminders (admin)', apSecFixedHint: 'Sent to everyone. Days people pick for themselves are added on top.',
      apRowDue: 'Task deadlines', apRowEvt: 'Meetings & events', apNone: 'None', apFixedDone: 'Already set as a fixed reminder',
      apD0: 'Due day', apE0: 'Morning of the day', apW1: '1 week before', apW2: '2 weeks before', apNBefore: '{n} days before', apNBefore1: '1 day before', apCustom: 'Custom (○ days before)', apCustomAdd: 'Add', apCustomBad: 'Enter a number from 1 to 60.', apTooMany: 'You can pick up to 8 days.',
      apWeekly: 'Tuesday weekly e-mail', apWeeklySub: 'This week’s tasks, every Tuesday morning.', apEmailDue: 'Deadline & event e-mails', apEmailDueSub: 'Your alert list stays the same whatever this switch says.',
      apQuiet: 'Quiet hours', apQuietSub: 'No e-mails are sent during this time (Korea time).', apQuietFrom: 'From', apQuietTo: 'To',
      apMine: 'Also alert me about tasks I created', apMineSub: 'Even when someone else owns the task, you get its deadline alerts.',
      apTest: 'Send me a test e-mail', apTestSent: 'Sent. Please check your inbox.', apTestOff: 'E-mail sending is not set up yet.', apOffNote: 'Turning e-mails off does not remove anything from this list. An alert goes away only when you tap Mark read or ✕.',
      apExpire: 'Days after which old notices fold away', apDays: 'days',
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
    var nb = $('apNew'); if (nb) nb.hidden = !d.perms.notices;
    if (pop.open) buildPop();
  }

  // ── 설정 팝오버 (버튼 바로 아래, 폰에서는 아래에서 올라오는 시트) ──
  // 내 일수(pf.due / pf.evt)는 "내가 더한 날"만 담는다. 팀 고정 알림(d.settings)에 있는 날은 늘 체크된 채 잠겨 있다. 당일은 늘 알리므로 잠겨 있다.
  var PRESET = { due: [0, 1, 2, 3, 7, 14], evt: [0, 1, 2, 7] }, MAXDAYS = 8;
  var pop = { open: false, row: null, pf: null, fx: null, msg: '', mailBusy: false };
  var dayLabel = function (n, k) { return n === 0 ? CT.t(k === 'due' ? 'apD0' : 'apE0') : n === 7 ? CT.t('apW1') : n === 14 ? CT.t('apW2') : n === 1 && CT.lang() === 'en' ? CT.t('apNBefore1') : CT.t('apNBefore').replace('{n}', n); };
  var asc = function (a, b) { return a - b; }, uniq = function (a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); };
  function summary(k, mine, fixed) {
    var l = uniq((fixed || []).concat(mine || [])).filter(function (n) { return n > 0; }).sort(function (a, b) { return b - a; }); /* 먼 날부터: 3일 전, 1일 전 */
    return l.length ? l.map(function (n) { return dayLabel(n, k); }).join(', ') : CT.t('apNone');
  }
  function sw(id, on, title, sub, extra) { return '<label class="apsw"><span class="aptxt"><b>' + esc(title) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</span><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><i class="apsw-k" aria-hidden="true"></i></label>' + (extra || ''); }
  // 한 줄 요약 + 눌러서 열리는 체크 목록. scope: 'me'(내 설정) | 'fix'(관리자 고정 알림)
  function pickRow(scope, k, title) {
    var id = scope + '-' + k, fixed = scope === 'me' ? pop.fx[k] : [], mine = scope === 'me' ? pop.pf[k] : pop.fx[k], open = pop.row === id;
    var nums = uniq(PRESET[k].concat(pop.fx[k], scope === 'me' ? pop.pf[k] : [])).sort(asc);
    var rows = nums.map(function (n) {
      var locked = n === 0 || (scope === 'me' && fixed.indexOf(n) >= 0), on = locked || mine.indexOf(n) >= 0;
      return '<button type="button" class="apopt' + (on ? ' on' : '') + (locked ? ' lock' : '') + '" data-pk="' + esc(id) + '" data-n="' + n + '"' + (locked ? ' disabled' : '') + ' role="checkbox" aria-checked="' + on + '"><span class="apck" aria-hidden="true">' + (on ? '✓' : '') + '</span><span class="aptxt">' + esc(dayLabel(n, k)) + (locked ? '<small>' + esc(CT.t('apFixedDone')) + '</small>' : '') + '</span></button>';
    }).join('');
    return '<div class="aprow' + (open ? ' open' : '') + '"><button type="button" class="aphead" data-prow="' + esc(id) + '" aria-expanded="' + open + '"><span>' + esc(title) + '</span><em>' + esc(summary(k, mine, fixed)) + '</em><i class="apchev" aria-hidden="true"></i></button>' +
      (open ? '<div class="apopts">' + rows + '<div class="apcust"><span>' + esc(CT.t('apCustom')) + '</span><input type="number" min="1" max="60" step="1" inputmode="numeric" data-cin="' + esc(id) + '" aria-label="' + esc(CT.t('apCustom')) + '"><button type="button" class="btn sm" data-cadd="' + esc(id) + '">' + esc(CT.t('apCustomAdd')) + '</button></div><div class="hint aperr" id="apCErr" role="alert"></div></div>' : '') + '</div>';
  }
  function buildPop() {
    var d = A.st.data, p = $('apPop'); if (!d || !p) return;
    var keep = $('apPopBody') ? $('apPopBody').scrollTop : 0, pf = d.prefs, admin = d.perms.manageMembers;
    var q = pf.quietStart && pf.quietEnd;
    var h = '<div class="aphd"><b>' + esc(CT.t('apSetTitle')) + '</b><span class="hint apmsg" id="apMsg" role="status">' + esc(pop.msg) + '</span><button type="button" class="alclose" id="apPopClose" aria-label="' + esc(CT.t('apClose')) + '">✕</button></div><div class="apbody" id="apPopBody">' +
      '<h3>' + esc(CT.t('apSecWhen')) + '</h3><div class="aplist">' + pickRow('me', 'due', CT.t('apRowDue')) + pickRow('me', 'evt', CT.t('apRowEvt')) + '</div>' +
      '<h3>' + esc(CT.t('apSecMail')) + '</h3><div class="aplist">' + sw('apWeekly', pf.weeklyEmail, CT.t('apWeekly'), CT.t('apWeeklySub')) + sw('apEmailDue', pf.emailDue, CT.t('apEmailDue'), CT.t('apEmailDueSub')) +
      sw('apQuietOn', !!q, CT.t('apQuiet'), CT.t('apQuietSub'), q ? '<div class="apquiet"><label>' + esc(CT.t('apQuietFrom')) + ' <input type="time" id="apQs" value="' + esc(pf.quietStart || '22:00') + '"></label><label>' + esc(CT.t('apQuietTo')) + ' <input type="time" id="apQe" value="' + esc(pf.quietEnd || '07:00') + '"></label></div>' : '') + '</div>' +
      '<div class="aptest"><button type="button" class="btn" id="apTestBtn"' + (pop.mailBusy ? ' disabled' : '') + '>' + esc(CT.t('apTest')) + '</button></div><div class="hint apmsg" id="apMailMsg" role="status"></div><div class="hint">' + esc(CT.t('apOffNote')) + '</div>' +
      '<h3>' + esc(CT.t('apSecMore')) + '</h3><div class="aplist">' + sw('apMineOn', pf.notifyMine, CT.t('apMine'), CT.t('apMineSub')) + '</div>' +
      (admin ? '<h3>' + esc(CT.t('apSecFixed')) + CT.help('notifyDays') + '</h3><div class="hint">' + esc(CT.t('apSecFixedHint')) + '</div><div class="aplist">' + pickRow('fix', 'due', CT.t('apRowDue')) + pickRow('fix', 'evt', CT.t('apRowEvt')) +
        '<label class="apnum"><span>' + esc(CT.t('apExpire')) + CT.help('expireDays') + '</span><span><input id="apExp" type="number" min="1" max="365" inputmode="numeric" value="' + esc(pop.fx.expire) + '"> ' + esc(CT.t('apDays')) + '</span></label></div><div class="aptest"><button type="button" class="btn pri" id="apFixSave">' + esc(CT.t('apSave')) + '</button></div><div class="hint apmsg" id="apAdmMsg" role="status"></div>' : '') +
      '</div>';
    p.innerHTML = h; var b = $('apPopBody'); if (b) b.scrollTop = keep;
  }
  function openPop(on) {
    var d = A.st.data; if (!d) return; pop.open = on;
    if (on) { pop.pf = { due: d.prefs.dueDays.slice(), evt: d.prefs.eventDays.slice() }; pop.fx = { due: d.settings.dueDays.slice(), evt: d.settings.eventDays.slice(), expire: d.settings.expireDays }; pop.row = null; pop.msg = ''; buildPop(); }
    $('apPop').hidden = !on; $('apPopScrim').hidden = !on; $('apSetBtn').setAttribute('aria-expanded', on ? 'true' : 'false');
    document.documentElement.classList.toggle('ap-sheet-open', on && window.matchMedia('(max-width:900px)').matches);
    if (on) { var c = $('apPopClose'); if (c) c.focus(); } else { $('apSetBtn').focus(); }
  }
  var say = function (id, text, bad) { var m = $(id); if (m) { m.textContent = text || ''; m.style.color = bad ? 'var(--accent)' : 'var(--ok)'; } };
  async function savePref(patch) {
    try { var r = await A.post(Object.assign({ action: 'pref' }, patch)); A.st.data.prefs = r.prefs; pop.msg = CT.t('apSaved'); buildPop(); say('apMsg', pop.msg); A.refresh(); }
    catch (er) { pop.msg = ''; say('apMsg', er.message, true); }
  }
  function addDay(id, n) {
    var sc = id.split('-')[0], k = id.split('-')[1], list = sc === 'me' ? pop.pf[k] : pop.fx[k];
    if (list.indexOf(n) >= 0 || (sc === 'me' && pop.fx[k].indexOf(n) >= 0)) return;
    if (list.length >= MAXDAYS) { say('apCErr', CT.t('apTooMany'), true); return; }
    toggleDay(id, n);
  }
  function toggleDay(id, n) {
    var sc = id.split('-')[0], k = id.split('-')[1], list = sc === 'me' ? pop.pf[k] : pop.fx[k], i = list.indexOf(n);
    if (i >= 0) list.splice(i, 1); else { if (list.length >= MAXDAYS) { say('apCErr', CT.t('apTooMany'), true); return; } list.push(n); }
    list.sort(function (a, b) { return b - a; });
    if (sc === 'me') { buildPop(); savePref(k === 'due' ? { dueDays: pop.pf.due } : { eventDays: pop.pf.evt }); } else buildPop();   // 고정 알림은 「저장」을 눌러야 모두에게 적용
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
  });
  document.addEventListener('click', async function (e) {
    var t = e.target; if (!t.closest) return;
    if (t.closest('#apSetBtn')) { openPop(!pop.open); return; }
    if (t.closest('#apPopClose') || t.closest('#apPopScrim')) { openPop(false); return; }
    if (pop.open && !t.closest('#apPop') && !t.closest('dialog') && !t.closest('#apSetBtn')) { openPop(false); return; }
    var row = t.closest('[data-prow]'); if (row) { pop.row = pop.row === row.dataset.prow ? null : row.dataset.prow; buildPop(); return; }
    var o = t.closest('[data-pk]'); if (o) { toggleDay(o.dataset.pk, Number(o.dataset.n)); return; }
    var ad = t.closest('[data-cadd]'); if (ad) { var inp = document.querySelector('[data-cin="' + ad.dataset.cadd + '"]'), n = Number(inp && inp.value); if (!Number.isInteger(n) || n < 1 || n > 60) { say('apCErr', CT.t('apCustomBad'), true); return; } addDay(ad.dataset.cadd, n); return; }
    if (t.closest('#apTestBtn')) {
      if (pop.mailBusy) return; pop.mailBusy = true; var tb = $('apTestBtn'); if (tb) tb.disabled = true;
      try { await A.post({ action: 'testMail' }); say('apMailMsg', CT.t('apTestSent')); } catch (er) { say('apMailMsg', er.message, true); } pop.mailBusy = false; if ($('apTestBtn')) $('apTestBtn').disabled = false; return;
    }
    if (t.closest('#apFixSave')) {
      var exp = Number($('apExp').value);
      try { var r = await A.post({ action: 'settings', dueDays: pop.fx.due, eventDays: pop.fx.evt, expireDays: exp }); A.st.data.settings = r.settings; pop.fx = { due: r.settings.dueDays.slice(), evt: r.settings.eventDays.slice(), expire: r.settings.expireDays }; buildPop(); say('apAdmMsg', CT.t('apSaved')); A.refresh(); } catch (er) { say('apAdmMsg', er.message, true); }
      return;
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && pop.open) { e.stopImmediatePropagation(); openPop(false); } }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target && e.target.dataset && e.target.dataset.cin) { e.preventDefault(); var b = document.querySelector('[data-cadd="' + e.target.dataset.cin + '"]'); if (b) b.click(); } });
  document.addEventListener('change', async function (e) {
    var id = e.target.id; if (!id) return;
    if (id === 'apWeekly') savePref({ weeklyEmail: e.target.checked });
    else if (id === 'apEmailDue') savePref({ emailDue: e.target.checked });
    else if (id === 'apMineOn') savePref({ notifyMine: e.target.checked });
    else if (id === 'apQuietOn') savePref(e.target.checked ? { quietStart: '22:00', quietEnd: '07:00' } : { quietStart: '', quietEnd: '' });
    else if (id === 'apQs' || id === 'apQe') { var s1 = $('apQs').value, e1 = $('apQe').value; if (s1 && e1) savePref({ quietStart: s1, quietEnd: e1 }); }
  });
  A.onReady = function (d) { render(d); if (P.get('new') === '1') composeDialog(null); };
  A.onRefresh = render;
  CT.boot(async function (me) { if (!me.campRole) { $('apErr').hidden = false; $('apErr').textContent = CT.t('apNoAccess'); return; } CT.applyI18n(); });
  document.addEventListener('ct-lang', function () { render(A.st.data); });
})();
