/* 큐시트: 캠프 준비 ▸ 진행표 탭을 「날짜 → 시간 → 팀」 큐시트로 바꿔 보여 준다.
   - 시간 칸마다: 어느 팀이 · 무엇을 준비하고 · 어떤 준비물이 필요한지 (팀 색 칩으로 구분)
   - 팀 관리(추가·이름·색·순서) · 걸러 보기(내 팀만 / 팀별) · 하루씩 보기 / 한 주 보기
   - 엑셀(.xlsx)·붙여넣기로 가져오기(미리보기 → 확인 → 저장) · 인쇄(A4, 날짜마다 한 쪽) · 이미지(PNG)로 저장
   데이터는 진행표(camp_timeline)·준비물(camp_supplies)·팀(camp_teams) 그대로다. 계산은 cue-core.js, 표 읽기는 cue-import.js, 인쇄 모양은 cue-print.js.
   prep.js 의 renderTimeline 이 끝나면 CTPrep.onTimeline(TL) 을 부르는데, 여기서 그 화면을 큐시트로 바꾼다(다른 파일의 onTimeline 도 그대로 이어서 불린다). */
(function () {
  var P = window.CTPrep, CC = window.CueCore, CI = window.CueImport, CP = window.CuePrint;
  if (!P || !CC || !CI || !CP) return;
  CT.addDict({
    ko: { cuAdd: '+ 일정 추가', cuImport: '📋 엑셀·표 붙여넣기로 가져오기', cuTeams: '👥 팀 관리', cuPrint: '🖨 인쇄·이미지로 저장', cuDay: '하루씩', cuWeek: '한 주 보기', cuAllTeams: '전체 보기', cuMine: '내 팀만', cuMineChange: '(바꾸기)', cuMinePick: '내 팀을 골라 주세요. 이 브라우저에 기억해 둬요.', cuMineNone: '아직 팀이 없어요. 「팀 관리」에서 먼저 만들어 주세요.', cuOk: '확인',
      cuNoTeam: '팀 없음', cuEveryone: '전체 (모두)', cuNewTeam: '+ 새 팀 만들기…', cuNewTeamName: '새 팀 이름', cuFTeam: '담당 팀', cuFItems: '준비물 (줄마다 하나)', cuFPrep: '팀이 해야 할 일 (자세히)', cuFPrepMin: '시작 몇 분 전까지 준비할까요? (분)', cuFNotes: '내부 메모 (공유·인쇄에 안 나가요)', cuFOwner: '담당자 이름 (인쇄할 때 「담당자 이름 넣기」를 켠 경우에만 나가요)', cuTitle: '일정', cuFTitle: '일정 이름',
      cuReady: function (m) { return '시작 ' + m + '분 전까지 준비'; }, cuCopyTo: '다른 팀 칸으로 복사', cuCopyPick: '어느 팀 칸으로 복사할까요? (내용을 그대로 복사해요. 복사한 뒤 고쳐 쓰세요.)', cuCopyGo: '복사', cuCopied: '복사했어요.', cuNowOn: '지금',
      cuNone: '이 날은 아직 일정이 없어요.', cuNoneAll: '아직 일정이 없어요. 「+ 일정 추가」 또는 「엑셀·표 붙여넣기로 가져오기」로 시작해 보세요.', cuNoneTeam: '이 팀 일정이 아직 없어요.', cuWeekHint: '날짜를 누르면 그 날의 자세한 화면으로 가요.', cuItems: '준비물', cuTodo: '할 일', cuInternal: '내부 메모', cuTeamSup: '이 날 팀별 준비물', cuCount: function (n) { return n + '개'; },
      cuTeamsTitle: '팀 관리', cuTeamsHint: '팀을 만들고 색을 골라요. 이름을 바꾸면 이미 적어 둔 일정·준비물의 팀 이름도 같이 바뀌어요. 「전체」는 모두를 뜻하는 칸이라 따로 만들 필요가 없어요.', cuUp: '위로', cuDown: '아래로', cuAddTeam: '팀 추가', cuTeamEmpty: '아직 팀이 없어요. 아래에서 만들어 보세요. (예: 찬양팀, 미디어팀, 식사팀)', cuTeamDelConfirm: '이 팀을 지울까요? 이 팀 이름이 붙은 일정·준비물은 지워지지 않고 팀 칸만 비워져요.', cuTeamDone: '닫기',
      cuImpTitle: '엑셀·표로 가져오기', cuImpHint: '엑셀 파일(.xlsx)을 고르거나, 엑셀에서 복사한 표를 아래에 붙여 넣으세요. 첫 줄의 열 이름(날짜·시작·끝·일정·장소·팀·준비물·할 일)을 보고 알아서 맞춰요. 열 이름이 없으면 이 순서로 읽어요. 없는 내용은 지어내지 않고, 이미 있는 일정(같은 날·시간·제목·팀)은 건너뛰어요. 저장하기 전에 미리 볼 수 있어요.', cuImpFile: '엑셀 파일 고르기', cuImpSheet: '시트', cuImpPaste: '또는 여기에 붙여 넣기', cuImpPreview: '미리보기', cuImpGo: function (n) { return n + '줄 가져오기'; }, cuImpRead: function (n, s) { return n + '줄을 읽었어요' + (s ? ' (못 읽은 ' + s + '줄은 아래에 이유가 있어요)' : '') + '.'; }, cuImpCols: '읽은 열', cuImpIgnored: '가져오지 않은 열', cuImpIgnoredNote: '(메모·비고·담당자는 내부 자료라 가져오지 않아요)', cuImpMulti: '팀 칸에 팀이 여러 개면 팀마다 한 줄씩 만들어요.',
      cuImpNew: '새로', cuImpDup: '이미 있어요', cuImpBad: '못 읽음', cuImpSummary: function (a, b, c) { return '새로 ' + a + '줄 · 이미 있어서 건너뜀 ' + b + '줄 · 못 읽음 ' + c + '줄'; }, cuImpNothing: '가져올 내용을 먼저 넣어 주세요.', cuImpNoNew: '새로 가져올 줄이 없어요.', cuImpDone: function (n, d, t) { return n + '줄을 가져왔어요' + (d ? ' (이미 있던 ' + d + '줄은 건너뜀)' : '') + (t && t.length ? ' · 새 팀: ' + t.join(', ') : '') + '.'; }, cuImpMax: '한 번에 400줄까지 가져올 수 있어요. 나눠서 가져와 주세요.', cuImpWhy: '못 읽은 줄',
      cuPrTitle: '인쇄·이미지로 저장', cuPrTeam: '어느 팀 것', cuPrDays: '날짜', cuPrOwners: '담당자 이름 넣기', cuPrSupplies: '팀별 준비물 목록도 넣기(마지막 쪽)', cuPrNote: '나가는 내용: 시간 · 일정 · 장소 · 팀 · 준비물 · 할 일. 내부 메모는 나가지 않아요.', cuPrPrint: '🖨 인쇄하기 (A4 세로, 하루에 한 쪽)', cuPrImgs: '이미지(PNG)로 저장 — 하루에 한 장', cuPrWait: '만드는 중…', cuPrShare: '공유·저장', cuPrDl: '파일로 받기', cuPrOpened: '이미지를 열었어요. 길게 눌러 「사진에 저장」을 고르세요.', cuPrNoDay: '내보낼 날짜를 골라 주세요.', cuPrNoData: '선택한 조건에 맞는 일정이 없어요.', cuPrAllTeams: '전체 팀', cuPrTeamPlus: function (t) { return t + ' (+전체)'; }, cuPrSelAll: '모두 고르기' },
    en: { cuAdd: '+ Add item', cuImport: '📋 Import from Excel / paste', cuTeams: '👥 Teams', cuPrint: '🖨 Print / save as image', cuDay: 'Day', cuWeek: 'Week', cuAllTeams: 'All', cuMine: 'My team', cuMineChange: '(change)', cuMinePick: 'Pick your team. This browser will remember it.', cuMineNone: 'No teams yet. Create them under "Teams" first.', cuOk: 'OK',
      cuNoTeam: 'No team', cuEveryone: 'Everyone', cuNewTeam: '+ New team…', cuNewTeamName: 'New team name', cuFTeam: 'Team', cuFItems: 'Supplies (one per line)', cuFPrep: 'What the team must do', cuFPrepMin: 'Be ready how many minutes before start?', cuFNotes: 'Internal notes (never shared or printed)', cuFOwner: 'Owner name (printed only if "include owner names" is on)', cuTitle: 'Schedule item', cuFTitle: 'Title',
      cuReady: function (m) { return 'Ready ' + m + ' min before'; }, cuCopyTo: 'Copy to another team', cuCopyPick: 'Copy to which team? (Everything is copied as is; edit afterwards.)', cuCopyGo: 'Copy', cuCopied: 'Copied.', cuNowOn: 'Now',
      cuNone: 'Nothing scheduled for this day.', cuNoneAll: 'Nothing yet. Start with "+ Add item" or import from Excel.', cuNoneTeam: 'Nothing for this team yet.', cuWeekHint: 'Tap a date to see that day in detail.', cuItems: 'Supplies', cuTodo: 'To do', cuInternal: 'Internal note', cuTeamSup: 'Supplies by team (this day)', cuCount: function (n) { return n + ' items'; },
      cuTeamsTitle: 'Teams', cuTeamsHint: 'Create teams and pick colours. Renaming also renames the team on existing items and supplies. "Everyone" is built in.', cuUp: 'Up', cuDown: 'Down', cuAddTeam: 'Add team', cuTeamEmpty: 'No teams yet. Create one below (e.g. Worship, Media, Meals).', cuTeamDelConfirm: 'Delete this team? Items and supplies with this team are kept; only their team field is cleared.', cuTeamDone: 'Close',
      cuImpTitle: 'Import from a table', cuImpHint: 'Pick an Excel (.xlsx) file or paste a table copied from Excel. Columns are matched by their header names (date, start, end, program, place, team, supplies, to do); without headers they are read in that order. Nothing is invented, and items that already exist (same day, time, title, team) are skipped. You can preview before saving.', cuImpFile: 'Choose Excel file', cuImpSheet: 'Sheet', cuImpPaste: 'or paste here', cuImpPreview: 'Preview', cuImpGo: function (n) { return 'Import ' + n + ' rows'; }, cuImpRead: function (n, s) { return 'Read ' + n + ' rows' + (s ? ' (' + s + ' unreadable rows are listed below)' : '') + '.'; }, cuImpCols: 'Columns read', cuImpIgnored: 'Columns not imported', cuImpIgnoredNote: '(notes and owners are internal and are not imported)', cuImpMulti: 'If a team cell lists several teams, one row per team is made.',
      cuImpNew: 'New', cuImpDup: 'Exists', cuImpBad: 'Unreadable', cuImpSummary: function (a, b, c) { return a + ' new · ' + b + ' already exist (skipped) · ' + c + ' unreadable'; }, cuImpNothing: 'Add a file or paste a table first.', cuImpNoNew: 'Nothing new to import.', cuImpDone: function (n, d, t) { return 'Imported ' + n + ' rows' + (d ? ' (' + d + ' existing skipped)' : '') + (t && t.length ? ' · new teams: ' + t.join(', ') : '') + '.'; }, cuImpMax: 'Up to 400 rows at a time. Please split it.', cuImpWhy: 'Unreadable rows',
      cuPrTitle: 'Print / save as image', cuPrTeam: 'Which team', cuPrDays: 'Days', cuPrOwners: 'Include owner names', cuPrSupplies: 'Add a supplies-by-team page at the end', cuPrNote: 'Printed: time, program, place, team, supplies, to do. Internal notes are never included.', cuPrPrint: '🖨 Print (A4 portrait, one day per page)', cuPrImgs: 'Save as image (PNG), one per day', cuPrWait: 'Preparing…', cuPrShare: 'Share / save', cuPrDl: 'Download file', cuPrOpened: 'Image opened. Press and hold it and choose "Save to Photos".', cuPrNoDay: 'Pick at least one day.', cuPrNoData: 'No items match these choices.', cuPrAllTeams: 'All teams', cuPrTeamPlus: function (t) { return t + ' (+everyone)'; }, cuPrSelAll: 'Select all' }
  });
  CT.addDict({ ko: { fTeam: '담당 팀' }, en: { fTeam: 'Team' } });

  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, api = P.api;
  var ALL = CC.ALL, PALETTE = ['#2f7fd1', '#d2557a', '#2e9e6b', '#e08a1e', '#7a5cc7', '#16899c', '#b8662b', '#5b6b7a'];
  var C = { campId: '', loaded: false, teams: [], su: [], rows: [], view: 'day', day: '', team: '' };   // team: '' 전체 · '__mine' 내 팀 · 팀 이름
  var seq = 0;

  function td() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function nowMin() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function lsGet(k) { try { return localStorage.getItem(k) || ''; } catch (e) { return ''; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) { /* 기억을 못 해도 화면은 동작 */ } }
  function myTeam() { return lsGet('ct-cue-mine:' + C.campId); }
  function curTeam() { return C.team === '__mine' ? myTeam() : C.team; }
  function campName() { var c = P.S.camps.filter(function (x) { return x.id === C.campId; })[0]; return c ? P.campLabel(c) : ''; }
  function teamColor(name) {
    if (!name) return ''; if (name === ALL) return '#5b6b7a';
    var t = C.teams.filter(function (x) { return x.name === name; })[0]; if (t && /^#[0-9a-f]{6}$/i.test(t.color || '')) return t.color;
    var h = 0; for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0; return PALETTE[h % PALETTE.length];
  }
  function chip(name) { return name ? '<span class="cue-chip" style="--tc:' + teamColor(name) + '">' + esc(name === ALL && CT.lang() === 'en' ? 'Everyone' : name) + '</span>' : ''; }
  function teamNames() {   // 팀 목록 + 줄에 적혀 있지만 목록에 없는 이름
    var out = C.teams.map(function (t) { return t.name; });
    C.rows.concat(C.su).forEach(function (r) { if (r.team && r.team !== ALL && out.indexOf(r.team) < 0) out.push(r.team); });
    return out;
  }
  function teamOptions() { return [['', CT.t('cuNoTeam')], [ALL, CT.t('cuEveryone')]].concat(teamNames().map(function (n) { return [n, n]; })); }

  /* ---- 불러오기 ---- */
  async function loadTeams() { try { C.teams = (await CT.api('/api/campteam/camp-teams?campId=' + encodeURIComponent(C.campId))).items || []; } catch (e) { C.teams = []; } }
  async function loadSu() { try { C.su = (await CT.api('/api/campteam/supplies?campId=' + encodeURIComponent(C.campId))).items || []; } catch (e) { C.su = []; } }
  async function ensure(id) {
    if (C.campId !== id) { C.campId = id; C.loaded = false; C.teams = []; C.su = []; C.day = ''; }
    if (!C.loaded) { await Promise.all([loadTeams(), loadSu()]); C.loaded = true; }
  }
  async function reload(teamsChanged) { if (teamsChanged) C.loaded = false; await P.show(); }
  // 준비물 탭(prep.js)이 팀 고르기를 쓸 수 있게
  window.CTCue = { loadTeams: async function (id) { await ensure(id); }, teamOptions: teamOptions };

  /* ---- 화면 ---- */
  function bar(w) {
    var teams = teamNames(), mine = myTeam(), cur = C.team, h = '<div class="p-bar cue-bar">' + (w ? '<button class="btn pri" data-a="add">' + esc(CT.t('cuAdd')) + '</button> <button class="btn" data-a="imp">' + esc(CT.t('cuImport')) + '</button> <button class="btn" data-a="teams">' + esc(CT.t('cuTeams')) + '</button> ' : '') + '<button class="btn" data-a="print">' + esc(CT.t('cuPrint')) + '</button></div>';
    h += '<div class="cue-bar2"><div class="cue-seg" role="group"><button type="button" class="' + (C.view === 'day' ? 'on' : '') + '" data-v="day">' + esc(CT.t('cuDay')) + '</button><button type="button" class="' + (C.view === 'week' ? 'on' : '') + '" data-v="week">' + esc(CT.t('cuWeek')) + '</button></div>';
    h += '<div class="tagbar cue-teambar"><button type="button" class="tagchip' + (cur === '' ? ' on' : '') + '" data-t="">' + esc(CT.t('cuAllTeams')) + '</button><button type="button" class="tagchip' + (cur === '__mine' ? ' on' : '') + '" data-t="__mine">' + esc(CT.t('cuMine')) + (mine ? ' · ' + esc(mine) : '') + '</button>' + (mine ? '<button type="button" class="cue-link" data-a="mine">' + esc(CT.t('cuMineChange')) + '</button>' : '') +
      teams.map(function (n) { return '<button type="button" class="tagchip cue-tc' + (cur === n ? ' on' : '') + '" style="--tc:' + teamColor(n) + '" data-t="' + esc(n) + '">' + esc(n) + '</button>'; }).join('') + '</div></div>';
    return h;
  }
  function rowHtml(r, w, nowSet) {
    var en = CT.lang() === 'en' && r.titleEn, items = CC.itemList(r), ready = CC.readyAt(r), pm = r.prepMinutes;
    return '<div class="cue-row' + (nowSet[r.id] ? ' now' : '') + '" style="--tc:' + (teamColor(r.team) || 'var(--border)') + '"><div class="cue-time">' + esc(r.startTime ? r.startTime + (r.endTime ? '–' + r.endTime : '') : '—') + (ready ? '<small>' + esc(CT.t('cuReady')(pm)) + '<br>(' + esc(ready) + ')</small>' : '') + (nowSet[r.id] ? '<span class="chip ok">' + esc(CT.t('cuNowOn')) + '</span>' : '') + '</div>' +
      '<div class="cue-main"><div class="cue-ttl"><b>' + esc(en ? r.titleEn : r.title) + '</b>' + chip(r.team) + (r.place ? '<small class="cue-pl">📍 ' + esc(r.place) + '</small>' : '') + '</div>' +
      (r.prepNotes ? '<div class="cue-det"><span class="cue-lab">' + esc(CT.t('cuTodo')) + '</span>' + esc(r.prepNotes).replace(/\n/g, '<br>') + '</div>' : '') +
      (items.length ? '<div class="cue-det"><span class="cue-lab">' + esc(CT.t('cuItems')) + '</span>' + items.map(function (i) { return '<span class="cue-item">' + esc(i) + '</span>'; }).join('') + '</div>' : '') +
      (r.ownerName ? '<div class="cue-det cue-own">👤 ' + esc(r.ownerName) + '</div>' : '') + (r.notes ? '<div class="cue-det cue-int"><span class="cue-lab">' + esc(CT.t('cuInternal')) + '</span>' + esc(r.notes) + '</div>' : '') + '</div>' +
      (w ? '<div class="cue-act"><button class="btn sm" data-e="' + esc(r.id) + '">' + esc(CT.t('edit')) + '</button><button class="btn sm" data-c="' + esc(r.id) + '">' + esc(CT.t('cuCopyTo')) + '</button><button class="btn sm danger" data-d="' + esc(r.id) + '">' + esc(CT.t('del')) + '</button></div>' : '') + '</div>';
  }
  function paint() {
    var el = $('pView'); if (!el) return;
    var keep = el.querySelector('.a-warn'), w = P.canW(), team = curTeam(), today = td();
    var shown = C.rows.filter(function (r) { return CC.teamMatch(r, team); }), allDays = CC.groupByDay(C.rows).map(function (g) { return g.day; });
    if (!C.day || allDays.indexOf(C.day) < 0) C.day = allDays.indexOf(today) >= 0 ? today : (allDays[0] || '');
    var cn = CC.currentAndNext(shown, { date: today, minutes: nowMin() }), nowSet = {}; if (cn.current) nowSet[cn.current.id] = 1; cn.alsoNow.forEach(function (r) { nowSet[r.id] = 1; });
    var h = bar(w);
    if (!C.rows.length) h += '<div class="empty">' + esc(CT.t('cuNoneAll')) + '</div>';
    else if (C.view === 'week') {
      h += '<p class="hint">' + esc(CT.t('cuWeekHint')) + '</p><div class="cue-week">' + allDays.map(function (d) {
        var list = CC.groupByDay(shown.filter(function (r) { return r.dayDate === d; }))[0], rows = list ? list.rows : [];
        return '<div class="cue-wd' + (d === today ? ' today' : '') + '"><button type="button" class="cue-wh" data-day="' + d + '"><b>' + esc(CP.dayLabel(d)) + '</b><small>' + esc(CT.t('cuCount')(rows.length)) + '</small></button>' + (rows.map(function (r) { return '<div class="cue-wr" style="--tc:' + (teamColor(r.team) || 'var(--border)') + '"><span>' + esc(r.startTime || '—') + '</span> ' + esc(r.title) + (r.team ? ' <em>' + esc(r.team) + '</em>' : '') + '</div>'; }).join('') || '<div class="cue-wr none">—</div>') + '</div>';
      }).join('') + '</div>';
    } else {
      h += '<div class="tagbar cue-days">' + allDays.map(function (d, i) { return '<button type="button" class="tagchip' + (d === C.day ? ' on' : '') + (d === today ? ' today' : '') + '" data-day="' + d + '">' + esc(CP.dayLabel(d).replace(/^\d+월 /, '')) + '<small>' + esc((i + 1) + (CT.lang() === 'en' ? 'd' : '일차')) + '</small></button>'; }).join('') + '</div>';
      var g = CC.groupByDay(shown.filter(function (r) { return r.dayDate === C.day; }))[0], rows = g ? g.rows : [];
      h += '<h4 class="p-day">' + esc(CP.dayLabel(C.day)) + (C.day === today ? ' <span class="chip ok">' + esc(CT.t('cuNowOn')) + '</span>' : '') + '</h4>';
      h += rows.map(function (r) { return rowHtml(r, w, nowSet); }).join('') || '<div class="empty">' + esc(CT.t(team ? 'cuNoneTeam' : 'cuNone')) + '</div>';
      var ti = CC.itemsByTeam(rows); if (ti.length) h += '<div class="cue-ti"><h4>' + esc(CT.t('cuTeamSup')) + '</h4>' + ti.map(function (t) { return '<p>' + (t.team ? chip(t.team) : '') + ' ' + t.items.map(function (i) { return '<span class="cue-item">' + esc(i) + '</span>'; }).join('') + '</p>'; }).join('') + '</div>';
    }
    el.innerHTML = h; if (keep) el.insertBefore(keep, el.firstChild);
    el.onclick = onClick;
  }
  function onClick(e) {
    var t = e.target, b;
    if ((b = t.closest('[data-v]'))) { C.view = b.dataset.v; return paint(); }
    if ((b = t.closest('[data-day]'))) { C.day = b.dataset.day; C.view = 'day'; return paint(); }
    if ((b = t.closest('[data-t]'))) { if (b.dataset.t === '__mine' && !myTeam()) return pickMine(true); C.team = b.dataset.t; return paint(); }
    if ((b = t.closest('[data-a]'))) { var a = b.dataset.a; if (a === 'add') return editDlg(null); if (a === 'imp') return importDlg(); if (a === 'teams') return teamsDlg(); if (a === 'print') return printDlg(); if (a === 'mine') return pickMine(false); }
    if ((b = t.closest('[data-e]'))) return editDlg(rowById(b.dataset.e));
    if ((b = t.closest('[data-c]'))) return copyDlg(rowById(b.dataset.c));
    if ((b = t.closest('[data-d]'))) return P.del('/api/campteam/timeline', b.dataset.d, function () { P.show(); });
  }
  function rowById(id) { return C.rows.filter(function (r) { return r.id === id; })[0]; }
  function open(html) { $('pBody').innerHTML = html; if (!$('pDlg').open) $('pDlg').showModal(); }
  function shut() { $('pDlg').close(); }
  function errBox(msg) { var e = $('pErr'); if (e) { e.hidden = false; e.textContent = msg; } }

  /* ---- 내 팀 고르기 ---- */
  function pickMine(thenSelect) {
    var names = teamNames(); if (!names.length) { alert(CT.t('cuMineNone')); return; }
    open('<h3>' + esc(CT.t('cuMine')) + '</h3><p class="hint">' + esc(CT.t('cuMinePick')) + '</p><div class="tagbar" id="cuMineList">' + names.map(function (n) { return '<button type="button" class="tagchip cue-tc' + (n === myTeam() ? ' on' : '') + '" style="--tc:' + teamColor(n) + '" data-n="' + esc(n) + '">' + esc(n) + '</button>'; }).join('') + '</div><div class="dlg-actions"><button type="button" class="btn" id="cuMineNo">' + esc(CT.t('cancel')) + '</button></div>');
    $('cuMineNo').onclick = shut;
    $('cuMineList').onclick = function (e) { var b = e.target.closest('[data-n]'); if (!b) return; lsSet('ct-cue-mine:' + C.campId, b.dataset.n); if (thenSelect) C.team = '__mine'; shut(); paint(); };
  }

  /* ---- 일정 만들기·고치기 ---- */
  function selHtml(name, opts, val, extra) { return '<select name="' + name + '"' + (extra || '') + '>' + opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>'; }
  function editDlg(r) {
    var v = r || { dayDate: C.day || (P.S.camps.filter(function (c) { return c.id === C.campId; })[0] || {}).startDate || td(), team: curTeam() || '' }, opts = teamOptions().concat([['__new', CT.t('cuNewTeam')]]);
    if (v.team && !opts.some(function (o) { return o[0] === v.team; })) opts.splice(2, 0, [v.team, v.team]);
    var lab = function (k, inner) { return '<label>' + esc(CT.t(k)) + inner + '</label>'; };
    open('<h3>' + esc(CT.t('cuTitle')) + '</h3><form id="pForm" class="form cue-form" method="dialog">' +
      '<div class="cue-g2">' + lab('fDay', '<input name="dayDate" type="date" value="' + esc(v.dayDate || '') + '">') + lab('cuFTeam', selHtml('team', opts, v.team || '', ' id="cuTeamSel"')) + '</div>' +
      '<label id="cuNewWrap" hidden>' + esc(CT.t('cuNewTeamName')) + '<input name="newTeam" maxlength="30"></label>' +
      '<div class="cue-g2">' + lab('fStart', '<input name="startTime" type="time" value="' + esc(v.startTime || '') + '">') + lab('fEnd', '<input name="endTime" type="time" value="' + esc(v.endTime || '') + '">') + '</div>' +
      lab('cuFTitle', '<input name="title" maxlength="120" value="' + esc(v.title || '') + '">') + lab('fPlace', '<input name="place" maxlength="80" data-suggest="place" value="' + esc(v.place || '') + '">') +
      lab('cuFPrep', '<textarea name="prepNotes" rows="3" maxlength="1000">' + esc(v.prepNotes || '') + '</textarea>') + lab('cuFItems', '<textarea name="items" rows="4" maxlength="1000">' + esc(v.items || '') + '</textarea>') +
      lab('cuFPrepMin', '<input name="prepMinutes" type="number" inputmode="numeric" min="0" max="720" step="5" placeholder="15" value="' + (v.prepMinutes == null ? '' : esc(v.prepMinutes)) + '">') +
      lab('cuFOwner', '<input name="ownerName" maxlength="60" value="' + esc(v.ownerName || '') + '">') + lab('cuFNotes', '<textarea name="notes" rows="2" maxlength="600">' + esc(v.notes || '') + '</textarea>') +
      '<div class="err" id="pErr" hidden></div><div class="dlg-actions"><button type="button" class="btn" id="pCancel">' + esc(CT.t('cancel')) + '</button><button type="submit" class="btn pri">' + esc(CT.t('save')) + '</button></div></form>');
    $('pCancel').onclick = shut;
    var sync = function () { $('cuNewWrap').hidden = $('cuTeamSel').value !== '__new'; if (!$('cuNewWrap').hidden) $('pForm').newTeam.focus(); };
    $('cuTeamSel').onchange = sync;
    $('pForm').onsubmit = async function (ev) {
      ev.preventDefault(); var o = {}; new FormData($('pForm')).forEach(function (x, k) { o[k] = x; }); var madeTeam = false;
      try {
        if (o.team === '__new') {
          var nm = String(o.newTeam || '').trim(); if (!nm) throw new Error(CT.t('cuNewTeamName'));
          var have = teamNames().filter(function (n) { return n.toLowerCase() === nm.toLowerCase(); })[0];
          if (have) nm = have; else { await api('/api/campteam/camp-teams', 'POST', { campId: C.campId, name: nm }); madeTeam = true; }
          o.team = nm;
        }
        delete o.newTeam;
        if (r) await api('/api/campteam/timeline?id=' + encodeURIComponent(r.id), 'PATCH', o); else { o.campId = C.campId; await api('/api/campteam/timeline', 'POST', o); }
        shut(); await reload(madeTeam);
      } catch (e) { errBox(e.message); }
    };
  }
  function copyDlg(r) {
    if (!r) return; var opts = teamOptions().filter(function (o) { return o[0] !== (r.team || '') && o[0] !== ''; });
    open('<h3>' + esc(CT.t('cuCopyTo')) + '</h3><p class="hint">' + esc(CT.t('cuCopyPick')) + '</p><div class="form"><label>' + esc(CT.t('cuFTeam')) + selHtml('team', opts, opts[0] ? opts[0][0] : '', ' id="cuCopyTeam"') + '</label></div><div class="err" id="pErr" hidden></div><div class="dlg-actions"><button type="button" class="btn" id="pCancel">' + esc(CT.t('cancel')) + '</button><button type="button" class="btn pri" id="cuCopyGo">' + esc(CT.t('cuCopyGo')) + '</button></div>');
    $('pCancel').onclick = shut;
    $('cuCopyGo').onclick = async function () {
      var o = { campId: C.campId, team: $('cuCopyTeam').value }; ['dayDate', 'startTime', 'endTime', 'title', 'titleEn', 'place', 'ownerName', 'notes', 'prepNotes', 'items', 'sortOrder'].forEach(function (k) { o[k] = r[k] == null ? '' : r[k]; }); o.prepMinutes = r.prepMinutes == null ? '' : r.prepMinutes;
      try { await api('/api/campteam/timeline', 'POST', o); shut(); await reload(false); } catch (e) { errBox(e.message); }
    };
  }

  /* ---- 팀 관리 ---- */
  var teamsDirty = false;
  function teamsDlg() {
    var w = P.canW();
    var rows = C.teams.map(function (t, i) {
      return '<div class="cue-trow" data-id="' + esc(t.id) + '"><input type="color" data-k="color" value="' + esc(/^#[0-9a-f]{6}$/i.test(t.color || '') ? t.color : teamColor(t.name)) + '" aria-label="color"' + (w ? '' : ' disabled') + '><input type="text" data-k="name" maxlength="30" value="' + esc(t.name) + '"' + (w ? '' : ' disabled') + '>' +
        (w ? '<button type="button" class="btn sm" data-up title="' + esc(CT.t('cuUp')) + '"' + (i ? '' : ' disabled') + '>↑</button><button type="button" class="btn sm" data-dn title="' + esc(CT.t('cuDown')) + '"' + (i < C.teams.length - 1 ? '' : ' disabled') + '>↓</button><button type="button" class="btn sm danger" data-rm>' + esc(CT.t('del')) + '</button>' : '') + '</div>';
    }).join('') || '<div class="empty">' + esc(CT.t('cuTeamEmpty')) + '</div>';
    open('<h3>' + esc(CT.t('cuTeamsTitle')) + '</h3><p class="hint">' + esc(CT.t('cuTeamsHint')) + '</p><div id="cuTeamList">' + rows + '</div>' +
      (w ? '<div class="cue-trow cue-tnew"><input type="color" id="cuTnC" value="' + PALETTE[C.teams.length % PALETTE.length] + '" aria-label="color"><input type="text" id="cuTnN" maxlength="30" placeholder="' + esc(CT.t('cuNewTeamName')) + '"><button type="button" class="btn pri" id="cuTnAdd">' + esc(CT.t('cuAddTeam')) + '</button></div>' : '') +
      '<div class="err" id="pErr" hidden></div><div class="dlg-actions"><button type="button" class="btn pri" id="pCancel">' + esc(CT.t('cuTeamDone')) + '</button></div>');
    $('pCancel').onclick = shut;
    var done = function () { $('pDlg').removeEventListener('close', done); if (teamsDirty) { teamsDirty = false; reload(true); } }; $('pDlg').addEventListener('close', done);
    var again = async function () { teamsDirty = true; await loadTeams(); teamsDlg(); };
    var add = $('cuTnAdd'); if (add) add.onclick = async function () { try { await api('/api/campteam/camp-teams', 'POST', { campId: C.campId, name: $('cuTnN').value, color: $('cuTnC').value }); await again(); } catch (e) { errBox(e.message); } };
    $('cuTeamList').onchange = async function (e) { var row = e.target.closest('.cue-trow'), k = e.target.dataset.k; if (!row || !k) return; var body = {}; body[k] = e.target.value; try { await api('/api/campteam/camp-teams?id=' + encodeURIComponent(row.dataset.id), 'PATCH', body); teamsDirty = true; await loadTeams(); if (k === 'name') teamsDlg(); } catch (er) { errBox(er.message); await loadTeams(); teamsDlg(); errBox(er.message); } };
    $('cuTeamList').onclick = async function (e) {
      var row = e.target.closest('.cue-trow'); if (!row) return; var id = row.dataset.id, ids = C.teams.map(function (t) { return t.id; }), i = ids.indexOf(id);
      try {
        if (e.target.closest('[data-rm]')) { if (!confirm(CT.t('cuTeamDelConfirm'))) return; await api('/api/campteam/camp-teams?id=' + encodeURIComponent(id), 'DELETE'); await again(); }
        else if (e.target.closest('[data-up]') || e.target.closest('[data-dn]')) { var j = e.target.closest('[data-up]') ? i - 1 : i + 1; if (j < 0 || j >= ids.length) return; ids.splice(j, 0, ids.splice(i, 1)[0]); await api('/api/campteam/camp-teams', 'POST', { action: 'reorder', campId: C.campId, ids: ids }); await again(); }
      } catch (er) { errBox(er.message); }
    };
  }

  /* ---- 엑셀·표로 가져오기 ---- */
  var IM = { sheets: [], sheet: 0 };
  function importDlg() {
    IM = { sheets: [], sheet: 0 };
    open('<h3>' + esc(CT.t('cuImpTitle')) + '</h3><p class="hint">' + esc(CT.t('cuImpHint')) + '</p><div class="cue-imp"><label class="btn cue-file">' + esc(CT.t('cuImpFile')) + '<input type="file" id="cuFile" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden></label> <span id="cuFileName" class="hint"></span> <span id="cuSheetWrap" hidden><label>' + esc(CT.t('cuImpSheet')) + ' <select id="cuSheet"></select></label></span></div>' +
      '<label>' + esc(CT.t('cuImpPaste')) + '<textarea id="cuPaste" rows="6" style="width:100%" placeholder="날짜&#9;시작&#9;끝&#9;일정&#9;장소&#9;팀&#9;준비물&#9;할 일"></textarea></label><div id="cuImpOut"></div><div class="err" id="pErr" hidden></div><div class="dlg-actions"><button type="button" class="btn" id="pCancel">' + esc(CT.t('cancel')) + '</button><button type="button" class="btn" id="cuImpPv">' + esc(CT.t('cuImpPreview')) + '</button><button type="button" class="btn pri" id="cuImpGo" hidden></button></div>');
    $('pCancel').onclick = shut;
    $('cuFile').onchange = async function () {
      var f = $('cuFile').files[0]; if (!f) return; $('cuFileName').textContent = f.name;
      try { var book = await window.XlsxLite.read(await f.arrayBuffer()); IM.sheets = book.sheets || []; var best = 0; IM.sheets.forEach(function (s, i) { if (s.rows.length > IM.sheets[best].rows.length) best = i; }); IM.sheet = best;
        $('cuSheet').innerHTML = IM.sheets.map(function (s, i) { return '<option value="' + i + '"' + (i === best ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join(''); $('cuSheetWrap').hidden = IM.sheets.length < 2; $('cuPaste').value = ''; preview(); }
      catch (e) { IM.sheets = []; errBox(e.message); }
    };
    $('cuSheet').onchange = function () { IM.sheet = +$('cuSheet').value; preview(); };
    $('cuImpPv').onclick = preview;
  }
  async function preview() {
    $('pErr').hidden = true; $('cuImpGo').hidden = true; var camp = P.S.camps.filter(function (c) { return c.id === C.campId; })[0] || {}, opts = { defaultDay: camp.startDate || '' }, parsed;
    var pasted = $('cuPaste').value.trim();
    if (pasted) parsed = CI.fromText(pasted, opts); else if (IM.sheets.length) parsed = CI.fromRows(IM.sheets[IM.sheet].rows.map(function (r) { return r.map(function (c) { return c == null ? '' : c; }); }), opts); else { $('cuImpOut').innerHTML = '<p class="hint">' + esc(CT.t('cuImpNothing')) + '</p>'; return; }
    if (parsed.rows.length > 400) { $('cuImpOut').innerHTML = '<p class="err">' + esc(CT.t('cuImpMax')) + '</p>'; return; }
    var res = { results: [], counts: { new: 0, dup: 0, bad: 0 } };
    if (parsed.rows.length) { try { res = await api('/api/campteam/timeline', 'POST', { action: 'cue-import', campId: C.campId, rows: parsed.rows, preview: true }); } catch (e) { return errBox(e.message); } }
    var st = { new: 'cuImpNew', dup: 'cuImpDup', bad: 'cuImpBad' };
    var h = '<p class="hint">' + esc(CT.t('cuImpRead')(parsed.rows.length, parsed.skipped.length)) + '</p><p class="hint">' + esc(CT.t('cuImpCols')) + ': ' + esc(parsed.used.join(' · ') || '—') + (parsed.ignored.length ? '<br>' + esc(CT.t('cuImpIgnored')) + ': ' + esc(parsed.ignored.join(' · ')) + ' ' + esc(CT.t('cuImpIgnoredNote')) : '') + '<br>' + esc(CT.t('cuImpMulti')) + '</p>';
    if (parsed.rows.length) h += '<p><b>' + esc(CT.t('cuImpSummary')(res.counts.new, res.counts.dup, res.counts.bad)) + '</b></p><div class="cue-pvwrap"><table class="cue-pv"><thead><tr><th></th><th>' + esc(CT.t('fDay')) + '</th><th>' + esc(CT.t('fStart')) + '</th><th>' + esc(CT.t('fEnd')) + '</th><th>' + esc(CT.t('cuFTitle')) + '</th><th>' + esc(CT.t('fPlace')) + '</th><th>' + esc(CT.t('cuFTeam')) + '</th><th>' + esc(CT.t('cuItems')) + '</th><th>' + esc(CT.t('cuTodo')) + '</th></tr></thead><tbody>' +
      parsed.rows.slice(0, 150).map(function (r, i) { var s = (res.results[i] || {}).status || 'new'; return '<tr class="s-' + s + '"><td><span class="chip ' + (s === 'new' ? 'ok' : s === 'dup' ? 'gray' : 'warn') + '">' + esc(CT.t(st[s])) + '</span></td><td>' + esc(r.dayDate) + '</td><td>' + esc(r.startTime) + '</td><td>' + esc(r.endTime) + '</td><td>' + esc(r.title) + '</td><td>' + esc(r.place) + '</td><td>' + esc(r.team) + '</td><td>' + esc(r.items.replace(/\n/g, ', ')) + '</td><td>' + esc(r.prepNotes) + '</td></tr>'; }).join('') + '</tbody></table></div>';
    if (parsed.skipped.length) h += '<details open><summary>' + esc(CT.t('cuImpWhy')) + ' (' + parsed.skipped.length + ')</summary><ul class="p-list">' + parsed.skipped.slice(0, 50).map(function (s) { return '<li>' + s.line + ' — ' + esc(s.reason) + '</li>'; }).join('') + '</ul></details>';
    $('cuImpOut').innerHTML = h;
    if (res.counts.new) { var go = $('cuImpGo'); go.hidden = false; go.textContent = CT.t('cuImpGo')(res.counts.new); go.onclick = async function () { go.disabled = true; try { var r = await api('/api/campteam/timeline', 'POST', { action: 'cue-import', campId: C.campId, rows: parsed.rows }); shut(); await reload(true); alert(CT.t('cuImpDone')(r.created, r.duplicates, r.newTeams)); } catch (e) { go.disabled = false; errBox(e.message); } }; }
    else if (parsed.rows.length) $('cuImpOut').insertAdjacentHTML('beforeend', '<p class="hint">' + esc(CT.t('cuImpNoNew')) + '</p>');
  }

  /* ---- 인쇄 · 이미지(PNG) ---- */
  var PR = { team: '', days: [], owners: false, sup: true, token: 0, imgs: {} };
  async function printDlg() {
    await loadSu();
    var days = CC.groupByDay(C.rows).map(function (g) { return g.day; }), cur = curTeam();
    PR = { team: cur, days: days.slice(), owners: false, sup: true, token: 0, imgs: {} };
    if (C.view === 'day' && C.day) PR.days = [C.day];
    var teams = teamNames();
    open('<h3>' + esc(CT.t('cuPrTitle')) + '</h3><div class="form cue-prf"><label>' + esc(CT.t('cuPrTeam')) + '<select id="cuPrTeam"><option value="">' + esc(CT.t('cuPrAllTeams')) + '</option>' + teams.map(function (n) { return '<option value="' + esc(n) + '"' + (n === cur ? ' selected' : '') + '>' + esc(CT.t('cuPrTeamPlus')(n)) + '</option>'; }).join('') + '</select></label>' +
      '<div class="cue-prd"><b>' + esc(CT.t('cuPrDays')) + '</b> <button type="button" class="cue-link" id="cuPrAll">' + esc(CT.t('cuPrSelAll')) + '</button><div id="cuPrDays">' + days.map(function (d) { return '<label class="cue-ck"><input type="checkbox" value="' + d + '"' + (PR.days.indexOf(d) >= 0 ? ' checked' : '') + '> ' + esc(CP.dayLabel(d)) + '</label>'; }).join('') + '</div></div>' +
      '<label class="cue-ck"><input type="checkbox" id="cuPrOwn"> ' + esc(CT.t('cuPrOwners')) + '</label><label class="cue-ck"><input type="checkbox" id="cuPrSup" checked> ' + esc(CT.t('cuPrSupplies')) + '</label><p class="hint">' + esc(CT.t('cuPrNote')) + '</p></div>' +
      '<div class="dlg-actions cue-prb"><button type="button" class="btn pri" id="cuPrGo">' + esc(CT.t('cuPrPrint')) + '</button></div><h4>' + esc(CT.t('cuPrImgs')) + '</h4><div id="cuPrImgs"></div><div class="err" id="pErr" hidden></div><div class="dlg-actions"><button type="button" class="btn" id="pCancel">' + esc(CT.t('close')) + '</button></div>');
    $('pCancel').onclick = shut;
    var read = function () { PR.team = $('cuPrTeam').value; PR.owners = $('cuPrOwn').checked; PR.sup = $('cuPrSup').checked; PR.days = [].slice.call($('cuPrDays').querySelectorAll('input:checked')).map(function (x) { return x.value; }); };
    $('cuPrForm').onchange = function () { read(); renderImgs(); };
    $('cuPrAll').onclick = function () { [].forEach.call($('cuPrDays').querySelectorAll('input'), function (x) { x.checked = true; }); read(); renderImgs(); };
    $('cuPrGo').onclick = function () { read(); doPrint(); };
    renderImgs();
  }
  function printOpts() { return { campName: campName(), team: PR.team, days: PR.days, showOwners: PR.owners, supplies: PR.sup ? C.su.map(function (s) { return { name: s.name, qty: s.qty, team: s.team || '' }; }) : null }; }
  function doPrint() {
    if (!PR.days.length) return errBox(CT.t('cuPrNoDay'));
    var o = printOpts(), html = CP.printHtml(C.rows, o); if (!html) return errBox(CT.t('cuPrNoData'));
    var box = $('cuePrint'); if (!box) { box = document.createElement('div'); box.id = 'cuePrint'; document.body.appendChild(box); }
    box.innerHTML = html; document.body.classList.add('cue-printing');
    var end = function () { document.body.classList.remove('cue-printing'); window.removeEventListener('afterprint', end); }; window.addEventListener('afterprint', end);
    setTimeout(function () { window.print(); }, 50);
  }
  function renderImgs() {
    var box = $('cuPrImgs'); if (!box) return; var tok = ++PR.token, o = printOpts(), pages = CP.pages(C.rows, { team: PR.team, days: PR.days, showOwners: PR.owners });
    if (!pages.length) { box.innerHTML = '<p class="hint">' + esc(PR.days.length ? CT.t('cuPrNoData') : CT.t('cuPrNoDay')) + '</p>'; return; }
    box.innerHTML = pages.map(function (p) { return '<div class="cue-img" data-day="' + p.day + '"><span>' + esc(CP.dayLabel(p.day)) + '</span><button type="button" class="btn sm" data-share disabled>' + esc(CT.t('cuPrWait')) + '</button> <a class="btn sm" data-dl hidden>' + esc(CT.t('cuPrDl')) + '</a></div>'; }).join('') + '<p class="hint" id="cuImgMsg"></p>';
    var blobs = {};
    box.onclick = function (e) { var b = e.target.closest('[data-share]'); if (!b || b.disabled) return; var d = b.closest('.cue-img').dataset.day; saveImage(blobs[d], (campName() || 'cue') + '-' + d + '.png'); };
    pages.reduce(function (chain, p) {
      return chain.then(async function () {
        if (tok !== PR.token) return; var blob = await drawPng(CP.imageModel(p, { campName: o.campName, team: PR.team }));
        if (tok !== PR.token || !blob) return; blobs[p.day] = blob; var row = box.querySelector('[data-day="' + p.day + '"]'); if (!row) return;
        var b = row.querySelector('[data-share]'); b.disabled = false; b.textContent = CT.t('cuPrShare'); var a = row.querySelector('[data-dl]'); a.href = URL.createObjectURL(blob); a.download = (campName() || 'cue') + '-' + p.day + '.png'; a.hidden = false;
      });
    }, Promise.resolve()).catch(function (er) { errBox(er.message); });
  }
  function saveImage(blob, name) {
    if (!blob) return; var msg = $('cuImgMsg'), file = null;
    try { file = new File([blob], name, { type: 'image/png' }); } catch (e) { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(function (er) { if (er && er.name === 'AbortError') return; openBlob(blob, msg); }); return; }
    openBlob(blob, msg);
  }
  function openBlob(blob, msg) { var u = URL.createObjectURL(blob), w = window.open(u, '_blank'); if (msg) msg.textContent = w ? CT.t('cuPrOpened') : ''; }

  /* 캔버스에 그리기: 외부 라이브러리 없이. 칸을 먼저 재서(draw=false) 높이를 정하고, 같은 순서로 다시 그린다. */
  function drawPng(m) {
    return new Promise(function (resolve) {
      var W = 1080, PAD = 44, FONT = '"Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",sans-serif', cvs = document.createElement('canvas'), ctx = cvs.getContext('2d');
      var f = function (sz, bold) { return (bold ? '700 ' : '400 ') + sz + 'px ' + FONT; };
      function wrap(text, maxW, font) {
        ctx.font = font; var out = [];
        String(text || '').split('\n').forEach(function (para) { var line = ''; Array.from(para).forEach(function (ch) { if (ctx.measureText(line + ch).width > maxW && line) { out.push(line); line = ch.trim() ? ch : ''; } else line += ch; }); out.push(line); });
        return out;
      }
      function run(draw) {
        var y = PAD;
        if (draw) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, cvs.height); ctx.textBaseline = 'top'; }
        if (draw) { ctx.fillStyle = '#16323f'; ctx.font = f(40, true); ctx.fillText(m.title, PAD, y); } y += 56;
        if (draw) { ctx.fillStyle = '#5b6b7a'; ctx.font = f(28, false); ctx.fillText(m.sub, PAD, y); } y += 52;
        var TW = 190, X = PAD + TW + 20, MW = W - X - PAD - 12;
        m.entries.forEach(function (e) {
          var top = y, blocks = [], ty = y + 18;
          var tl = wrap(e.title, MW - (e.team ? 170 : 0), f(34, true)), pl = e.place ? wrap('📍 ' + e.place, MW, f(26, false)) : [], it = e.items.length ? wrap(m.labels.items + ': ' + e.items.join(' · '), MW, f(26, false)) : [], pn = e.prepNotes ? wrap(m.labels.prep + ': ' + e.prepNotes, MW, f(26, false)) : [], ow = e.owner ? wrap(m.labels.owner + ': ' + e.owner, MW, f(26, false)) : [];
          var h = 18 + tl.length * 42 + (pl.length ? pl.length * 34 + 4 : 0) + (pn.length ? pn.length * 34 + 8 : 0) + (it.length ? it.length * 34 + 8 : 0) + (ow.length ? ow.length * 34 + 4 : 0) + 18; h = Math.max(h, 96);
          if (draw) {
            ctx.fillStyle = '#f5f9fb'; ctx.fillRect(PAD, top, W - PAD * 2, h); ctx.fillStyle = e.color || '#9bb1bd'; ctx.fillRect(PAD, top, 8, h);
            ctx.fillStyle = '#16323f'; ctx.font = f(32, true); ctx.fillText(e.time.split('–')[0], PAD + 24, ty); if (e.time.indexOf('–') > 0) { ctx.fillStyle = '#5b6b7a'; ctx.font = f(24, false); ctx.fillText('~ ' + e.time.split('–')[1], PAD + 24, ty + 40); } if (e.ready) { ctx.fillStyle = '#b25e00'; ctx.font = f(22, false); ctx.fillText(m.labels.readyBy + ' ' + e.ready, PAD + 24, ty + 72); }
            var cy = ty; ctx.fillStyle = '#16323f'; ctx.font = f(34, true); tl.forEach(function (l) { ctx.fillText(l, X, cy); cy += 42; });
            if (e.team) { ctx.font = f(24, true); var tw = ctx.measureText(e.team).width + 26, tx = W - PAD - 12 - tw; ctx.fillStyle = e.color || '#5b6b7a'; roundRect(ctx, tx, ty + 2, tw, 36, 18); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.fillText(e.team, tx + 13, ty + 8); }
            ctx.font = f(26, false); ctx.fillStyle = '#5b6b7a'; pl.forEach(function (l) { ctx.fillText(l, X, cy); cy += 34; }); if (pl.length) cy += 4;
            ctx.fillStyle = '#16323f'; pn.forEach(function (l) { ctx.fillText(l, X, cy); cy += 34; }); if (pn.length) cy += 8; ctx.fillStyle = '#1d5f7a'; it.forEach(function (l) { ctx.fillText(l, X, cy); cy += 34; }); if (it.length) cy += 8; ctx.fillStyle = '#5b6b7a'; ow.forEach(function (l) { ctx.fillText(l, X, cy); cy += 34; });
          }
          y += h + 14;
        });
        if (draw) { ctx.fillStyle = '#9bb1bd'; ctx.font = f(22, false); ctx.fillText(m.labels.foot, PAD, y + 8); } y += 52;
        return y;
      }
      m.entries.forEach(function (e) { e.color = teamColor(e.team); });
      cvs.width = W; cvs.height = 200; var H = Math.min(run(false), 16000); cvs.width = W; cvs.height = H; run(true);
      cvs.toBlob(function (b) { resolve(b); }, 'image/png');
    });
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  /* ---- prep.js 와 이어 붙이기 ---- */
  async function onTimeline(TL) {
    var S = P.S; if (S.tab !== 'timeline') return; var cid = S.campId, my = ++seq; C.rows = Array.isArray(TL) ? TL : C.rows;
    if (!C.loaded || C.campId !== cid) { $('pView').innerHTML = '<p class="hint">…</p>'; }
    try { await ensure(cid); } catch (e) { /* 팀·준비물을 못 불러와도 일정은 보여 준다 */ }
    if (my !== seq || P.S.tab !== 'timeline' || P.S.campId !== cid) return;
    paint();
  }
  var hooks = [], prev = P.onTimeline; if (typeof prev === 'function') hooks.push(prev); hooks.push(onTimeline);
  Object.defineProperty(P, 'onTimeline', { configurable: true, get: function () { return function (TL) { hooks.forEach(function (h) { try { h(TL); } catch (e) { /* 한 훅이 실패해도 나머지는 계속 */ } }); }; }, set: function (fn) { if (typeof fn === 'function') hooks.splice(hooks.length - 1, 0, fn); } });
})();
