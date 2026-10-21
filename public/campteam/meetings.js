(function () {
  CT.addDict({
    ko: { mtTitle: '회의록 · 결정', mtSub: '회의 기록을 안건별로 남기고, 무엇이 언제 어떻게 결정되고 바뀌었는지 한눈에 봐요', addMeeting: '+ 회의 만들기', impMin: '회의록 붙여넣어 가져오기', viewOnly: '조회만 가능한 계정이에요. 작성·수정은 캠프팀 팀원이 할 수 있어요.',
      tabList: '회의 목록', tabTopic: '주제별', tabDec: '결정 이력', tabNext: '다음 회의 안건', mtSearch: '회의·안건·결정 내용 검색', decSearch: '결정 내용 검색',
      allCamps: '모든 캠프', noCamp: '캠프 없음', groupDate: '날짜별', groupCamp: '캠프별', allStatus: '모든 상태', draft: '초안', final: '확정', from: '이 날짜부터',
      sections: '구역', decisions: '결정', tasks: '업무', files: '파일', noMeetings: '조건에 맞는 회의가 없어요.', topicsTitle: '주제(태그)별 보기', topicsHelp: '회의 구역과 결정에 붙인 주제(예: Camp Crew, 후속 양육, 예산, 인력)를 눌러서 관련 회의를 모아 봐요.', noTags: '아직 붙인 주제가 없어요. 구역이나 결정을 만들 때 주제를 적어 보세요.', topicFilter: '주제', clear: '지우기',
      modeEff: '현재 유효한 결정', modeHist: '변경 이력 (흐름으로 보기)', modeAll: '모든 결정(제안·보류 포함)', allKinds: '모든 종류', addDec: '+ 결정 기록', noDec: '표시할 결정이 없어요.', current: '현재 유효', superseded: '대체됨', withdrawn: '철회', changeIt: '이 결정 바꾸기', notDecided: '아직 결정 아님',
      kproposal: '제안·아이디어', kdirection: '방향 합의', kfinal: '최종 결정', khold: '보류', kchanged: '변경', ksummary: '핵심 요약', kcontext: '배경 설명 (결정 아님)', kdiscussion: '논의', kother: '기타',
      addNext: '+ 다음 회의 안건', noNext: '다음 회의 안건이 없어요.', markDiscussed: '논의함', markDecided: '결정됨', pending: '논의 필요', discussed: '논의함', decided: '결정됨', fromMeeting: '출처 회의',
      edit: '수정', del: '삭제', save: '저장', cancel: '취소', close: '닫기', confirmDel: '삭제할까요? (삭제 표시만 되며 복구할 수 있어요)', both: '한·영 함께 보기', onlyKo: '한국어만 있음', onlyEn: 'English only', attendees: '참석자', record: '기록 범위', sources: '자료', purpose: '목적', camp: '캠프',
      addSection: '+ 구역 추가', secDecide: '결정 기록', secTask: '업무 만들기', secNext: '다음 회의 안건으로', nextMark: '다음 회의 안건', nextItems: '다음 회의 안건', linkedTasks: '이 안건에서 만든 업무', meetingTasks: '이 회의에서 나온 업무', noOwner: '담당 미정', attach: '+ 파일 연결', addText: '+ 전사 텍스트 붙여넣기', texts: '전사 텍스트', view: '보기', chars: '자', filesTitle: '연결된 파일', unlink: '연결 해제', openFile: '열기',
      fTitle: '제목 (한국어)', fTitleEn: '제목 (English)', fDate: '날짜', fTime: '시간', fCamp: '관련 캠프', fAttendees: '참석자', fPurpose: '목적 (한국어)', fPurposeEn: '목적 (English)', fRecord: '기록 범위 (예: 약 56분)', fSources: '자료 설명', fStatus: '상태',
      fTopic: '제목 (한국어)', fBodyKo: '내용 (한국어)', fBodyEn: '내용 (English)', fKind: '종류', fTags: '주제 태그 (쉼표로 구분)', fNext: '다음 회의에서 다시 논의', fText: '결정 내용 (한국어)', fTextEn: '결정 내용 (English)', fDecDate: '결정 날짜', fSupersede: '이 결정을 대체함', fTaskTitle: '업무 이름', fOwner: '담당자 (비워 둘 수 있어요)', fDue: '기한 (비워 둘 수 있어요)', fFile: '자료실 파일', fRole: '역할', fLang: '언어', fBody: '전사 텍스트', roleMinutes: '회의록', roleTranscript: '전사문', roleNotes: '필기', rolePhoto: '사진', roleAudio: '녹음', roleReference: '참고 자료',
      newMeeting: '회의 만들기', editMeeting: '회의 정보 수정', newSection: '구역 추가', editSection: '구역 수정', newDec: '결정 기록', newTask: '이 안건에서 업무 만들기', newNext: '다음 회의 안건 추가', attachFile: '자료실 파일 연결', pasteText: '전사 텍스트 붙여넣기',
      impTitle: '회의록 가져오기', impHelp: 'Word 회의록을 복사해서 붙여넣으세요. 한국어와 영어를 둘 다 넣으면 같은 번호의 구역끼리 짝지어 한 회의로 저장돼요. 결정은 자동으로 만들지 않고, 회의 화면에서 직접 기록해요.', impKo: '한국어 회의록', impEn: 'English minutes', preview: '미리보기', impDone: '가져왔어요', dupMeeting: '같은 날짜·제목의 회의가 이미 있어요. 그래도 새로 만들까요?', existingTasks: '이미 만든 업무', aiSlot: 'AI 회의록 초안',
      aiTitle: 'AI 회의록 초안', aiNew: '+ 전사 텍스트로 AI 초안 만들기', aiOff: 'AI 기능이 아직 켜지지 않았어요. 관리자가 Claude API 키를 서버 설정에 넣으면 켜져요. (키가 없어도 회의록 직접 작성은 모두 쓸 수 있어요)', aiHelp: '전사는 다른 프로그램으로 하고, 그 텍스트를 붙여넣으면 AI가 회의록 초안을 만들어요. 초안은 바로 반영되지 않고, 아래에서 골라서 적용해야 해요. 담당자와 기한은 AI가 정하지 않고 비워 둬요.', aiSrcPaste: '붙여넣기', aiSrcSaved: '이 회의에 저장된 전사 텍스트', aiLang: '전사 언어', aiHints: '참고할 말 (선택: 안건 이름, 용어 등)', aiGo: '초안 만들기', aiBusy: 'AI가 쓰는 중… (1~2분 걸릴 수 있어요)', aiDone: '초안이 만들어졌어요. 맞는 것만 골라 적용하세요.', aiEvidence: '근거', aiUncertain: '확실하지 않았던 부분', aiApply: '선택한 항목 적용', aiReject: '이 초안 버리기', aiApplied: '적용했어요', aiOwnerNote: '담당자는 "제안"으로만 들어가요', aiSecs: '구역(안건별 논의)', aiDecs: '결정', aiTasks: '업무', aiNext: '다음 회의 안건', aiSummary: '요약', aiPast: '이전 초안', aiOpen: '열기', aiDraftSt: '검토 대기', aiApplSt: '적용됨', aiRejSt: '버림', aiMention: '전사문에서 들은 이름', aiDue: '말한 기한(메모로만)' },
    en: { mtTitle: 'Meetings · Decisions', mtSub: 'Record meetings by agenda item and see what was decided, when, and how it changed', addMeeting: '+ New meeting', impMin: 'Import minutes by pasting', viewOnly: 'View-only account. Camp team members can edit.',
      tabList: 'Meetings', tabTopic: 'By topic', tabDec: 'Decision history', tabNext: 'Next meeting agenda', mtSearch: 'Search meetings, items, decisions', decSearch: 'Search decisions',
      allCamps: 'All camps', noCamp: 'No camp', groupDate: 'By date', groupCamp: 'By camp', allStatus: 'All statuses', draft: 'Draft', final: 'Final', from: 'From date',
      sections: 'sections', decisions: 'decisions', tasks: 'tasks', files: 'files', noMeetings: 'No meetings match.', topicsTitle: 'Browse by topic (tag)', topicsHelp: 'Click a topic (e.g. Camp Crew, follow-up, budget, staffing) used on sections and decisions to gather related meetings.', noTags: 'No topics yet. Add topics when you create a section or decision.', topicFilter: 'Topic', clear: 'Clear',
      modeEff: 'Currently effective decisions', modeHist: 'Change history (as a flow)', modeAll: 'All decisions (incl. proposals/holds)', allKinds: 'All types', addDec: '+ Record decision', noDec: 'No decisions to show.', current: 'Current', superseded: 'Superseded', withdrawn: 'Withdrawn', changeIt: 'Change this decision', notDecided: 'Not decided yet',
      kproposal: 'Proposal / idea', kdirection: 'Direction agreed', kfinal: 'Final decision', khold: 'On hold', kchanged: 'Changed', ksummary: 'Summary', kcontext: 'Background (not a decision)', kdiscussion: 'Discussion', kother: 'Other',
      addNext: '+ Next-meeting item', noNext: 'No items for the next meeting.', markDiscussed: 'Discussed', markDecided: 'Decided', pending: 'To discuss', discussed: 'Discussed', decided: 'Decided', fromMeeting: 'From meeting',
      edit: 'Edit', del: 'Delete', save: 'Save', cancel: 'Cancel', close: 'Close', confirmDel: 'Delete this? (It is only marked deleted and can be restored.)', both: 'Show both languages', onlyKo: 'Korean only', onlyEn: 'English only', attendees: 'Attendees', record: 'Recorded', sources: 'Sources', purpose: 'Purpose', camp: 'Camp',
      addSection: '+ Add section', secDecide: 'Record decision', secTask: 'Create task', secNext: 'Move to next meeting', nextMark: 'Next-meeting item', nextItems: 'Next meeting agenda', linkedTasks: 'Tasks from this item', meetingTasks: 'Tasks from this meeting', noOwner: 'No owner', attach: '+ Link file', addText: '+ Paste transcript', texts: 'Transcripts', view: 'View', chars: ' chars', filesTitle: 'Linked files', unlink: 'Unlink', openFile: 'Open',
      fTitle: 'Title (Korean)', fTitleEn: 'Title (English)', fDate: 'Date', fTime: 'Time', fCamp: 'Camp', fAttendees: 'Attendees', fPurpose: 'Purpose (Korean)', fPurposeEn: 'Purpose (English)', fRecord: 'Recorded (e.g. about 56 min)', fSources: 'Sources', fStatus: 'Status',
      fTopic: 'Title (Korean)', fBodyKo: 'Content (Korean)', fBodyEn: 'Content (English)', fKind: 'Type', fTags: 'Topic tags (comma separated)', fNext: 'Discuss again next meeting', fText: 'Decision (Korean)', fTextEn: 'Decision (English)', fDecDate: 'Decision date', fSupersede: 'Replaces this decision', fTaskTitle: 'Task name', fOwner: 'Owner (can be left blank)', fDue: 'Due date (can be left blank)', fFile: 'File from library', fRole: 'Role', fLang: 'Language', fBody: 'Transcript text', roleMinutes: 'Minutes', roleTranscript: 'Transcript', roleNotes: 'Notes', rolePhoto: 'Photo', roleAudio: 'Audio', roleReference: 'Reference',
      newMeeting: 'New meeting', editMeeting: 'Edit meeting', newSection: 'Add section', editSection: 'Edit section', newDec: 'Record decision', newTask: 'Create task from this item', newNext: 'Add next-meeting item', attachFile: 'Link a file from the library', pasteText: 'Paste transcript',
      impTitle: 'Import minutes', impHelp: 'Paste the minutes from Word. If you paste both Korean and English, sections with the same number are paired into one meeting. Decisions are not created automatically; record them on the meeting.', impKo: 'Korean minutes', impEn: 'English minutes', preview: 'Preview', impDone: 'Imported', dupMeeting: 'A meeting with the same date and title exists. Create anyway?', existingTasks: 'Already created', aiSlot: 'AI minutes draft',
      aiTitle: 'AI minutes draft', aiNew: '+ Draft minutes from a transcript with AI', aiOff: 'AI is not turned on yet. An admin must add the Claude API key to the server settings. (Writing minutes by hand works without it.)', aiHelp: 'Transcribe with another tool, paste the text here, and AI drafts the minutes. The draft is not applied automatically; pick what is right below. AI never decides owners or due dates.', aiSrcPaste: 'Paste text', aiSrcSaved: 'Transcript saved on this meeting', aiLang: 'Transcript language', aiHints: 'Notes for the AI (optional: topics, terms)', aiGo: 'Create draft', aiBusy: 'AI is writing… (may take 1–2 minutes)', aiDone: 'Draft ready. Apply only what is correct.', aiEvidence: 'Evidence', aiUncertain: 'Unclear parts', aiApply: 'Apply selected', aiReject: 'Discard this draft', aiApplied: 'Applied', aiOwnerNote: 'Owners go in only as "suggestions"', aiSecs: 'Sections', aiDecs: 'Decisions', aiTasks: 'Tasks', aiNext: 'Next-meeting items', aiSummary: 'Summary', aiPast: 'Earlier drafts', aiOpen: 'Open', aiDraftSt: 'Awaiting review', aiApplSt: 'Applied', aiRejSt: 'Discarded', aiMention: 'Name heard in transcript', aiDue: 'Due mentioned (note only)' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var S = { tab: 'list', types: [], perms: null, tag: '', detailId: null, both: false };
  var KIND_DEC = ['proposal', 'direction', 'final', 'hold', 'changed'], KIND_SEC = ['summary', 'context', 'discussion', 'other'];
  var canWrite = function () { return S.perms && S.perms.write; };
  var camps = function () { var o = []; S.types.forEach(function (t) { t.camps.forEach(function (c) { o.push(c); }); }); return o; };
  var campOpts = function (sel, blank) { return '<option value="">' + esc(blank) + '</option>' + camps().map(function (c) { return '<option value="' + esc(c.id) + '"' + (sel === c.id ? ' selected' : '') + '>' + esc(CT.pick(c, 'name')) + '</option>'; }).join(''); };
  var campName = function (r) { return CT.lang() === 'en' ? (r.campEn || r.campKo || '') : (r.campKo || r.campEn || ''); };
  var title = function (m) { return CT.lang() === 'en' ? (m.titleEn || m.title) : (m.title || m.titleEn); };
  /** 현재 언어로 보여주고, 없으면 다른 언어로 대신 보여준다(표시: 어느 언어인지) */
  function lt(ko, en) { var want = CT.lang() === 'en' ? en : ko, other = CT.lang() === 'en' ? ko : en; return want ? { text: want, fallback: false } : { text: other || '', fallback: !!other }; }
  function fb(x) { return x.fallback ? ' <span class="langonly">(' + esc(CT.t(CT.lang() === 'en' ? 'onlyKo' : 'onlyEn')) + ')</span>' : ''; }
  var tagChips = function (tags) { return String(tags || '').split(',').filter(Boolean).map(function (t) { return '<button type="button" class="tagchip" data-tag="' + esc(t) + '">#' + esc(t) + '</button>'; }).join(''); };
  var decLabel = function (d) { return CT.t('k' + d); };

  /* ---------- 회의 목록 ---------- */
  function fillSelects() {
    var keep = function (id, html) { var el = $(id), v = el.value; el.innerHTML = html; if (v) el.value = v; };
    keep('mcamp', '<option value="">' + esc(CT.t('allCamps')) + '</option><option value="none">' + esc(CT.t('noCamp')) + '</option>' + camps().map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(CT.pick(c, 'name')) + '</option>'; }).join(''));
    keep('mgroup', '<option value="date">' + esc(CT.t('groupDate')) + '</option><option value="camp">' + esc(CT.t('groupCamp')) + '</option>');
    keep('mstatus', '<option value="">' + esc(CT.t('allStatus')) + '</option><option value="draft">' + esc(CT.t('draft')) + '</option><option value="final">' + esc(CT.t('final')) + '</option>');
    keep('dcamp', '<option value="">' + esc(CT.t('allCamps')) + '</option><option value="none">' + esc(CT.t('noCamp')) + '</option>' + camps().map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(CT.pick(c, 'name')) + '</option>'; }).join(''));
    keep('dmode', '<option value="effective">' + esc(CT.t('modeEff')) + '</option><option value="history">' + esc(CT.t('modeHist')) + '</option><option value="all">' + esc(CT.t('modeAll')) + '</option>');
    keep('dkind', '<option value="">' + esc(CT.t('allKinds')) + '</option>' + KIND_DEC.map(function (k) { return '<option value="' + k + '">' + esc(decLabel(k)) + '</option>'; }).join(''));
    keep('ncamp', '<option value="">' + esc(CT.t('allCamps')) + '</option><option value="none">' + esc(CT.t('noCamp')) + '</option>' + camps().map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(CT.pick(c, 'name')) + '</option>'; }).join(''));
  }
  async function loadMeetings() {
    var q = new URLSearchParams(); if ($('mq').value.trim()) q.set('q', $('mq').value.trim()); if ($('mcamp').value) q.set('campId', $('mcamp').value); if ($('mstatus').value) q.set('status', $('mstatus').value); if ($('mfrom').value) q.set('from', $('mfrom').value); if (S.tag) q.set('tag', S.tag);
    var r = await CT.api('/api/campteam/meetings?' + q.toString()); S.meetings = r.items; S.perms = r.perms; renderMeetings();
  }
  function renderMeetings() {
    $('addMeeting').hidden = $('impMin').hidden = $('addDec').hidden = $('addNext').hidden = !canWrite(); $('viewOnly').hidden = canWrite();
    $('tagFilter').innerHTML = S.tag ? '<span class="tagchip">' + esc(CT.t('topicFilter')) + ': #' + esc(S.tag) + '</span> <button class="btn sm" id="clearTag">' + esc(CT.t('clear')) + '</button>' : '';
    var by = $('mgroup').value === 'camp', groups = {}, order = [];
    S.meetings.forEach(function (m) { var k = by ? (campName(m) || CT.t('noCamp')) : m.meetDate.slice(0, 7); if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(m); });
    $('mlist').innerHTML = S.meetings.length ? order.map(function (k) { return '<div class="grp">' + esc(k) + '</div>' + groups[k].map(function (m) {
      return '<div class="mt" data-open="' + esc(m.id) + '"><div class="date">' + esc(m.meetDate.slice(5).replace('-', '/')) + '<br><span style="font-weight:500;font-size:11px;color:var(--mid)">' + esc(m.meetTime || '') + '</span></div><div><b>' + esc(title(m)) + '</b>' + (m.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + (m.status === 'draft' ? ' <span class="chip warn">' + esc(CT.t('draft')) + '</span>' : '') +
        '<small>' + (campName(m) ? esc(campName(m)) + ' · ' : '') + m.sectionCount + ' ' + esc(CT.t('sections')) + ' · ' + m.decisionCount + ' ' + esc(CT.t('decisions')) + ' · ' + m.taskCount + ' ' + esc(CT.t('tasks')) + ' · ' + m.fileCount + ' ' + esc(CT.t('files')) + '</small></div><div class="meta">' + esc(m.attendees || '') + '</div></div>'; }).join(''); }).join('') : '<div class="empty">' + esc(CT.t('noMeetings')) + '</div>';
  }

  /* ---------- 주제별 ---------- */
  async function loadTags() {
    var r = await CT.api('/api/campteam/tags');
    $('tags').innerHTML = r.tags.length ? r.tags.map(function (t) { return '<button type="button" class="tagchip" data-tag="' + esc(t.tag) + '">#' + esc(t.tag) + ' <b>' + t.n + '</b></button>'; }).join('') : '<div class="empty">' + esc(CT.t('noTags')) + '</div>';
  }

  /* ---------- 결정 이력 ---------- */
  function decNode(d, cur) {
    var t = lt(d.textKo, d.textEn);
    return '<div class="node ' + (cur ? 'cur' : '') + '"><span class="kindchip kc-' + esc(d.kind) + '">' + esc(decLabel(d.kind)) + '</span> <span class="chip ' + (d.state === 'active' ? 'ok' : 'gray') + '">' + esc(CT.t(d.state === 'active' ? 'current' : d.state)) + '</span>' + (d.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') +
      '<div style="margin:6px 0">' + esc(t.text) + fb(t) + '</div><div class="meta">' + esc(d.decidedDate || '') + (d.meetingTitle ? ' · <a href="#" data-open="' + esc(d.meetingId) + '">' + esc(CT.lang() === 'en' && d.meetingTitleEn ? d.meetingTitleEn : d.meetingTitle) + '</a>' : '') + (campName(d) ? ' · ' + esc(campName(d)) : '') + '</div>' + tagChips(d.tags) +
      (canWrite() && d.state === 'active' && ['direction', 'final', 'changed'].indexOf(d.kind) >= 0 ? '<div style="margin-top:6px"><button class="btn sm" data-change="' + esc(d.id) + '">' + esc(CT.t('changeIt')) + '</button></div>' : '') + '</div>';
  }
  async function loadDecisions() {
    var q = new URLSearchParams(), mode = $('dmode').value; if ($('dcamp').value) q.set('campId', $('dcamp').value); if ($('dkind').value) q.set('kind', $('dkind').value); if ($('dq').value.trim()) q.set('q', $('dq').value.trim()); if (S.tag) q.set('tag', S.tag);
    if (mode === 'effective') q.set('effective', '1'); if (mode === 'history') q.set('history', '1');
    var r = await CT.api('/api/campteam/decisions?' + q.toString()); S.perms = r.perms; S.decItems = r.items;
    if (mode === 'history') $('dlist').innerHTML = r.chains.length ? r.chains.map(function (c) { return '<div class="chain">' + c.map(function (d, i) { return (i ? '<span class="arrow">→</span>' : '') + decNode(d, i === c.length - 1 && d.state === 'active'); }).join('') + '</div>'; }).join('') : '<div class="empty">' + esc(CT.t('noDec')) + '</div>';
    else $('dlist').innerHTML = r.items.length ? '<div class="chain">' + r.items.map(function (d) { return decNode(d, d.state === 'active' && ['direction', 'final', 'changed'].indexOf(d.kind) >= 0); }).join('') + '</div>' : '<div class="empty">' + esc(CT.t('noDec')) + '</div>';
  }

  /* ---------- 다음 회의 안건 ---------- */
  async function loadNext() {
    var q = $('ncamp').value ? '?next=1&campId=' + encodeURIComponent($('ncamp').value) : '?next=1'; var r = await CT.api('/api/campteam/agenda' + q); S.perms = r.perms;
    $('nlist').innerHTML = r.items.length ? r.items.map(function (a) {
      var tt = lt(a.topic, a.titleEn), note = lt(a.bodyKo || a.note, a.bodyEn);
      return '<div class="mt" style="cursor:default"><div class="date">' + esc((a.meetDate || '').slice(5).replace('-', '/')) + '</div><div><b>' + esc(tt.text) + '</b>' + fb(tt) + (a.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '<small>' + esc(note.text) + (campName(a) ? ' · ' + esc(campName(a)) : '') + (a.meetingTitle ? ' · ' + esc(a.meetingTitle) : '') + '</small></div>' +
        '<div class="actions"><span class="tag t-none">' + esc(CT.t(a.status)) + '</span>' + (canWrite() ? '<button class="btn sm" data-ast="' + esc(a.id) + '" data-v="discussed">' + esc(CT.t('markDiscussed')) + '</button><button class="btn sm" data-ast="' + esc(a.id) + '" data-v="decided">' + esc(CT.t('markDecided')) + '</button>' : '') + '</div></div>';
    }).join('') : '<div class="empty">' + esc(CT.t('noNext')) + '</div>';
  }

  /* ---------- 회의 상세 ---------- */
  async function showDetail(id) {
    S.detailId = id; var d;
    try { d = await CT.api('/api/campteam/meeting?id=' + encodeURIComponent(id)); } catch (e) { alert(e.message); return; }
    if (!S.aiDrafts || S.aiDrafts.meetingId !== id) await loadAiDrafts(id);
    S.detail = d; S.perms = d.perms; var m = d.meeting, w = canWrite();
    var tt = lt(m.title, m.titleEn), pp = lt(m.purpose, m.purposeEn), both = S.both;
    var h = '<h3>' + esc(tt.text) + fb(tt) + (m.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + ' <span class="chip ' + (m.status === 'draft' ? 'warn' : 'ok') + '">' + esc(CT.t(m.status)) + '</span></h3>' +
      '<dl class="kv"><dt>' + esc(CT.t('fDate')) + '</dt><dd>' + esc(m.meetDate + (m.meetTime ? ' ' + m.meetTime : '')) + (campName(m) ? ' · ' + esc(campName(m)) : '') + '</dd>' +
      (m.attendees ? '<dt>' + esc(CT.t('attendees')) + '</dt><dd>' + esc(m.attendees) + '</dd>' : '') + (pp.text ? '<dt>' + esc(CT.t('purpose')) + '</dt><dd>' + esc(pp.text) + fb(pp) + '</dd>' : '') +
      (m.recordNote ? '<dt>' + esc(CT.t('record')) + '</dt><dd>' + esc(m.recordNote) + '</dd>' : '') + (m.sourcesNote ? '<dt>' + esc(CT.t('sources')) + '</dt><dd>' + esc(m.sourcesNote) + '</dd>' : '') + '</dl>' +
      '<label style="font-size:12px;color:var(--mid)"><input type="checkbox" id="bothLang" ' + (both ? 'checked' : '') + ' style="width:auto;height:auto"> ' + esc(CT.t('both')) + '</label>';
    var nonNext = d.sections.filter(function (s) { return !s.nextMeeting; }), next = d.sections.filter(function (s) { return s.nextMeeting; });
    h += nonNext.map(function (s) {
      var t = lt(s.topic, s.titleEn), b = lt(s.bodyKo, s.bodyEn);
      var decs = d.decisions.filter(function (x) { return x.agendaItemId === s.id; }), tks = d.tasks.filter(function (x) { return x.agendaItemId === s.id; });
      return '<div class="sec ' + esc(s.kind) + '"><h4><span class="kindchip">' + esc(CT.t('k' + s.kind)) + '</span> ' + esc(both ? (s.topic + (s.titleEn ? ' / ' + s.titleEn : '')) : t.text) + (both ? '' : fb(t)) + '</h4>' +
        (both ? '<div class="two"><div class="body">' + esc(s.bodyKo) + '</div><div class="body">' + esc(s.bodyEn) + '</div></div>' : '<div class="body">' + esc(b.text) + fb(b) + '</div>') + tagChips(s.tags) +
        decs.map(function (x) { var dt = lt(x.textKo, x.textEn); return '<div class="dec ' + (x.state === 'superseded' ? 'sup' : '') + '"><span class="kindchip kc-' + esc(x.kind) + '">' + esc(decLabel(x.kind)) + '</span><div>' + esc(dt.text) + fb(dt) + '<div class="meta">' + esc(x.decidedDate || '') + ' · ' + esc(CT.t(x.state === 'active' ? 'current' : x.state)) + '</div></div></div>'; }).join('') +
        (tks.length ? '<div class="meta" style="margin-top:6px">' + esc(CT.t('linkedTasks')) + ': ' + tks.map(function (x) { return esc(x.title) + ' (' + esc(x.ownerName || CT.t('noOwner')) + ')'; }).join(' · ') + '</div>' : '') +
        (w ? '<div class="acts"><button class="btn sm" data-sdec="' + esc(s.id) + '">' + esc(CT.t('secDecide')) + '</button><button class="btn sm" data-stask="' + esc(s.id) + '">' + esc(CT.t('secTask')) + '</button><button class="btn sm" data-sedit="' + esc(s.id) + '">' + esc(CT.t('edit')) + '</button><button class="btn sm danger" data-sdel="' + esc(s.id) + '">' + esc(CT.t('del')) + '</button></div>' : '') + '</div>';
    }).join('');
    if (w) h += '<div style="margin:8px 0"><button class="btn sm" id="addSec">' + esc(CT.t('addSection')) + '</button></div>';
    h += '<h4 style="margin:14px 0 4px;font-size:13px">' + esc(CT.t('nextItems')) + '</h4>' + (next.length ? next.map(function (s) { var t = lt(s.topic, s.titleEn), b = lt(s.bodyKo, s.bodyEn); return '<div class="dec"><span class="chip gray">' + esc(CT.t(s.status)) + '</span><div>' + esc(t.text) + fb(t) + (b.text ? '<div class="meta">' + esc(b.text) + '</div>' : '') + '</div>' + (w ? '<span style="margin-left:auto"><button class="btn sm" data-sedit="' + esc(s.id) + '">' + esc(CT.t('edit')) + '</button> <button class="btn sm danger" data-sdel="' + esc(s.id) + '">' + esc(CT.t('del')) + '</button></span>' : '') + '</div>'; }).join('') : '<div class="empty">' + esc(CT.t('noNext')) + '</div>');
    var free = d.decisions.filter(function (x) { return !x.agendaItemId; });
    if (free.length) h += '<h4 style="margin:14px 0 4px;font-size:13px">' + esc(CT.t('decisions')) + '</h4>' + free.map(function (x) { var dt = lt(x.textKo, x.textEn); return '<div class="dec"><span class="kindchip kc-' + esc(x.kind) + '">' + esc(decLabel(x.kind)) + '</span><div>' + esc(dt.text) + '</div></div>'; }).join('');
    h += '<h4 style="margin:14px 0 4px;font-size:13px">' + esc(CT.t('meetingTasks')) + ' (' + d.tasks.length + ')</h4>' + d.tasks.map(function (x) { return '<div class="dec"><div>' + esc(x.title) + '<div class="meta">' + esc(x.ownerName || (x.ownerSuggestion ? '(' + x.ownerSuggestion + ')' : CT.t('noOwner'))) + (x.dueDate ? ' · ' + esc(x.dueDate) : '') + ' · ' + esc(x.status) + '</div></div></div>'; }).join('');
    h += '<h4 style="margin:14px 0 4px;font-size:13px">' + esc(CT.t('filesTitle')) + ' (' + d.files.length + ')</h4>' + d.files.map(function (f) { return '<div class="dec"><span class="chip gray">' + esc(CT.t('role' + f.role.charAt(0).toUpperCase() + f.role.slice(1))) + '</span><div><a href="' + (f.storage === 'link' ? esc(f.externalUrl) : '/campteam/files/') + '"' + (f.storage === 'link' ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + esc(f.title) + '</a></div>' + (w ? '<button class="btn sm danger" style="margin-left:auto" data-unlink="' + esc(f.id) + '">' + esc(CT.t('unlink')) + '</button>' : '') + '</div>'; }).join('') + (w ? '<div style="margin-top:6px"><button class="btn sm" id="attachFile">' + esc(CT.t('attach')) + '</button></div>' : '');
    h += '<h4 style="margin:14px 0 4px;font-size:13px">' + esc(CT.t('texts')) + ' (' + d.texts.length + ')</h4>' + d.texts.map(function (x) { return '<div class="dec"><span class="chip gray">' + esc(x.lang || '—') + '</span><div>' + esc(x.kind) + ' · ' + x.chars + esc(CT.t('chars')) + ' · ' + esc((x.createdAt || '').slice(0, 10)) + '</div><button class="btn sm" style="margin-left:auto" data-viewtext="' + esc(x.id) + '">' + esc(CT.t('view')) + '</button></div>'; }).join('') + (w ? '<div style="margin-top:6px"><button class="btn sm" id="addText">' + esc(CT.t('addText')) + '</button></div>' : '') + aiBlock(d, w);
    h += '<div class="dlg-actions">' + (w ? '<button class="btn sm danger" id="mDel">' + esc(CT.t('del')) + '</button><button class="btn sm" id="mEdit">' + esc(CT.t('edit')) + '</button>' : '') + '<button class="btn sm pri" id="mClose">' + esc(CT.t('close')) + '</button></div>';
    $('detailBody').innerHTML = h; if (!$('detail').open) $('detail').showModal();
    $('mClose').onclick = function () { $('detail').close(); };
    $('bothLang').onchange = function () { S.both = this.checked; showDetail(id); };
    if ($('mEdit')) $('mEdit').onclick = function () { meetingForm(m); }; if ($('mDel')) $('mDel').onclick = async function () { if (!confirm(CT.t('confirmDel'))) return; await CT.api('/api/campteam/meetings?id=' + encodeURIComponent(id), { method: 'DELETE' }); $('detail').close(); await refresh(); };
    if ($('aiNew')) $('aiNew').onclick = function () { aiForm(id, d.texts); };
    if ($('addSec')) $('addSec').onclick = function () { sectionForm(id); }; if ($('attachFile')) $('attachFile').onclick = function () { attachForm(id); }; if ($('addText')) $('addText').onclick = function () { textForm(id); };
  }
  $('detailBody').addEventListener('click', async function (e) {
    var b = e.target.closest('button'); if (!b) return; var d = S.detail, id = S.detailId, ds = b.dataset;
    try {
      if (ds.tag) { $('detail').close(); S.tag = ds.tag; showTab('list'); }
      else if (ds.sedit) sectionForm(id, d.sections.filter(function (x) { return x.id === ds.sedit; })[0]);
      else if (ds.sdel) { if (confirm(CT.t('confirmDel'))) { await CT.api('/api/campteam/agenda?id=' + encodeURIComponent(ds.sdel), { method: 'DELETE' }); showDetail(id); } }
      else if (ds.sdec) decisionForm({ meetingId: id, agendaItemId: ds.sdec });
      else if (ds.stask) taskFromForm(id, d.sections.filter(function (x) { return x.id === ds.stask; })[0]);
      else if (ds.aidraft) { var dr = (await CT.api('/api/campteam/ai-draft?id=' + encodeURIComponent(ds.aidraft))).draft; if (dr.status === 'draft') aiReview(id, dr.id, dr.result); else alert(CT.t(dr.status === 'applied' ? 'aiApplSt' : 'aiRejSt')); }
      else if (ds.unlink) { await CT.api('/api/campteam/meeting-links?meetingId=' + encodeURIComponent(id) + '&fileId=' + encodeURIComponent(ds.unlink), { method: 'DELETE' }); showDetail(id); }
      else if (ds.viewtext) { var t = (await CT.api('/api/campteam/meeting-texts?id=' + encodeURIComponent(ds.viewtext))).text; CT.ask(t.kind + ' · ' + (t.lang || ''), '<textarea class="big" readonly>' + esc(t.body) + '</textarea>', function () { return Promise.resolve(); }, { noSave: true }); }
    } catch (err) { alert(err.message); }
  });

  /* ---------- AI 회의록 초안 (전사 텍스트 → Claude → 검토 → 적용) ---------- */
  function aiBlock(d, w) {
    if (!w) return ''; var past = S.aiDrafts && S.aiDrafts.meetingId === d.meeting.id ? S.aiDrafts.items : [];
    return '<h4 style="margin:14px 0 4px;font-size:13px">' + esc(CT.t('aiTitle')) + '</h4><div class="hintbox">' + esc(CT.t('aiHelp')) + '</div><div style="margin-top:6px"><button class="btn sm" id="aiNew">' + esc(CT.t('aiNew')) + '</button></div>' +
      (past.length ? '<div class="meta" style="margin-top:8px">' + esc(CT.t('aiPast')) + ': ' + past.map(function (x) { return '<button class="btn sm" data-aidraft="' + esc(x.id) + '">' + esc(x.createdAt.slice(5, 16).replace('T', ' ')) + ' · ' + esc(CT.t(x.status === 'draft' ? 'aiDraftSt' : x.status === 'applied' ? 'aiApplSt' : 'aiRejSt')) + '</button>'; }).join(' ') + '</div>' : '');
  }
  async function loadAiDrafts(id) { try { S.aiDrafts = { meetingId: id, items: (await CT.api('/api/campteam/ai-draft?meetingId=' + encodeURIComponent(id))).items }; } catch (e) { S.aiDrafts = { meetingId: id, items: [] }; } }
  function aiForm(meetingId, texts) {
    fetch('/api/campteam/config').then(function (r) { return r.json(); }).then(function (cfg) {
      var h = cfg.aiEnabled ? '<div class="hintbox">' + esc(CT.t('aiHelp')) + '</div>' : '<div class="err">' + esc(CT.t('aiOff')) + '</div>';
      h += '<label>' + esc(CT.t('aiSrcSaved')) + '<select name="textId"><option value="">' + esc(CT.t('aiSrcPaste')) + '</option>' + texts.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.kind + ' · ' + (t.lang || '—') + ' · ' + t.chars + CT.t('chars')) + '</option>'; }).join('') + '</select></label>' +
        '<label>' + esc(CT.t('aiSrcPaste')) + '<textarea class="big" name="transcript"></textarea></label><div class="two"><label>' + esc(CT.t('aiLang')) + '<select name="lang"><option value="ko">한국어</option><option value="en">English</option><option value="">—</option></select></label><label>' + esc(CT.t('aiHints')) + '<input name="hints" maxlength="1000"></label></div><div id="aiProg" class="meta"></div>';
      CT.ask(CT.t('aiTitle'), h, async function (fd) { await aiRun(meetingId, fd); return false; }, { saveLabel: CT.t('aiGo'), noSave: !cfg.aiEnabled });
    });
  }
  async function aiRun(meetingId, fd) {
    var prog = $('aiProg'); prog.textContent = CT.t('aiBusy');
    var res = await fetch('/api/campteam/ai-minutes', { method: 'POST', headers: { Authorization: 'Bearer ' + CT.token(), 'Content-Type': 'application/json' }, body: JSON.stringify({ meetingId: meetingId, textId: fd.textId || undefined, transcript: fd.textId ? undefined : fd.transcript, lang: fd.lang, hints: fd.hints }) });
    if (!res.ok || !res.body) { var j = {}; try { j = await res.json(); } catch (e) {} throw new Error(j.error || CT.t('loadFail')); }
    var reader = res.body.getReader(), dec = new TextDecoder(), buf = '', last = null;
    for (;;) { var r = await reader.read(); if (r.done) break; buf += dec.decode(r.value, { stream: true }); var i; while ((i = buf.indexOf('\n')) >= 0) { var line = buf.slice(0, i); buf = buf.slice(i + 1); if (!line.trim()) continue; var ev = JSON.parse(line); if (ev.t === 'p') prog.textContent = CT.t('aiBusy') + ' ' + ev.n.toLocaleString(); if (ev.t === 'error') throw new Error(ev.message); if (ev.t === 'done') last = ev; } }
    if (!last) throw new Error(CT.t('loadFail')); await loadAiDrafts(meetingId); aiReview(meetingId, last.id, last.draft);
  }
  function aiReview(meetingId, draftId, d) {
    var ck = function (key, i) { return '<input type="checkbox" data-pk="' + key + '" value="' + i + '" checked style="width:auto;height:auto"> '; }, ev = function (a) { return a && a.length ? '<div class="meta">' + esc(CT.t('aiEvidence')) + ': ' + a.map(esc).join(' | ') + '</div>' : ''; };
    var h = '<div class="hintbox">' + esc(CT.t('aiDone')) + ' ' + esc(CT.t('aiOwnerNote')) + '</div>' +
      (d.summary.ko || d.summary.en ? '<label style="display:flex;gap:6px"><input type="checkbox" data-pk="summary" checked style="width:auto;height:auto"> <span><b>' + esc(CT.t('aiSummary')) + '</b><br>' + esc(lt(d.summary.ko, d.summary.en).text) + '</span></label>' : '') +
      (d.sections.length ? '<h4>' + esc(CT.t('aiSecs')) + '</h4>' + d.sections.map(function (x, i) { return '<div class="sec ' + esc(x.kind) + '"><label style="display:flex;gap:6px">' + ck('sections', i) + '<span><b>' + esc(lt(x.titleKo, x.titleEn).text) + '</b> <span class="kindchip">' + esc(CT.t('k' + x.kind)) + '</span><div class="body">' + esc(lt(x.bodyKo, x.bodyEn).text) + '</div>' + ev(x.evidence) + '</span></label></div>'; }).join('') : '') +
      (d.decisions.length ? '<h4>' + esc(CT.t('aiDecs')) + '</h4>' + d.decisions.map(function (x, i) { return '<div class="dec"><label style="display:flex;gap:6px">' + ck('decisions', i) + '<span><span class="kindchip kc-' + esc(x.kind) + '">' + esc(decLabel(x.kind)) + '</span> ' + esc(lt(x.textKo, x.textEn).text) + ev(x.evidence) + '</span></label></div>'; }).join('') : '') +
      (d.tasks.length ? '<h4>' + esc(CT.t('aiTasks')) + '</h4>' + d.tasks.map(function (x, i) { return '<div class="dec"><label style="display:flex;gap:6px">' + ck('tasks', i) + '<span>' + esc(x.title) + (x.ownerMentioned ? '<div class="meta">' + esc(CT.t('aiMention')) + ': ' + esc(x.ownerMentioned) + '</div>' : '') + (x.dueMentioned ? '<div class="meta">' + esc(CT.t('aiDue')) + ': ' + esc(x.dueMentioned) + '</div>' : '') + ev(x.evidence) + '</span></label></div>'; }).join('') : '') +
      (d.nextAgenda.length ? '<h4>' + esc(CT.t('aiNext')) + '</h4>' + d.nextAgenda.map(function (x, i) { return '<div class="dec"><label style="display:flex;gap:6px">' + ck('next', i) + '<span>' + esc(lt(x.topicKo, x.topicEn).text) + '<div class="meta">' + esc(lt(x.noteKo, x.noteEn).text) + '</div></span></label></div>'; }).join('') : '') +
      (d.uncertain.length ? '<h4>' + esc(CT.t('aiUncertain')) + '</h4><ul>' + d.uncertain.map(function (u) { return '<li>' + esc(u) + '</li>'; }).join('') + '</ul>' : '');
    CT.ask(CT.t('aiTitle'), h, function () { return Promise.resolve(); }, { noSave: true, extra: '<button type="button" class="btn danger" id="aiRej">' + esc(CT.t('aiReject')) + '</button><button type="button" class="btn pri" id="aiApp">' + esc(CT.t('aiApply')) + '</button>' });
    $('aiApp').onclick = async function () {
      var pick = { sections: [], decisions: [], tasks: [], next: [], summary: !!document.querySelector('[data-pk="summary"]:checked') };
      document.querySelectorAll('#dlgFields [data-pk]:checked').forEach(function (c) { if (pick[c.dataset.pk] && c.dataset.pk !== 'summary') pick[c.dataset.pk].push(Number(c.value)); });
      try { var r = await CT.api('/api/campteam/ai-draft', { method: 'POST', body: { id: draftId, action: 'apply', pick: pick } }); $('dlg').close(); alert(CT.t('aiApplied') + ': ' + JSON.stringify(r.counts)); await loadAiDrafts(meetingId); showDetail(meetingId); } catch (e) { $('dlgErr').textContent = e.message; $('dlgErr').hidden = false; }
    };
    $('aiRej').onclick = async function () { try { await CT.api('/api/campteam/ai-draft', { method: 'POST', body: { id: draftId, action: 'reject' } }); $('dlg').close(); await loadAiDrafts(meetingId); showDetail(meetingId); } catch (e) { alert(e.message); } };
  }

  /* ---------- 폼들 ---------- */
  function meetingForm(m) {
    var h = '<label>' + esc(CT.t('fTitle')) + '<input name="title" maxlength="160" value="' + esc(m ? m.title : '') + '"></label><label>' + esc(CT.t('fTitleEn')) + '<input name="titleEn" maxlength="160" value="' + esc(m ? m.titleEn : '') + '"></label>' +
      '<div class="two"><label>' + esc(CT.t('fDate')) + '<input type="date" name="meetDate" required value="' + esc(m ? m.meetDate : '') + '"></label><label>' + esc(CT.t('fTime')) + '<input type="time" name="meetTime" value="' + esc(m ? m.meetTime : '') + '"></label></div>' +
      '<label>' + esc(CT.t('fCamp')) + '<select name="campId">' + campOpts(m && m.campId, CT.t('noCamp')) + '</select></label><label>' + esc(CT.t('fAttendees')) + '<input name="attendees" maxlength="300" value="' + esc(m ? m.attendees : '') + '"></label>' +
      '<label>' + esc(CT.t('fPurpose')) + '<input name="purpose" maxlength="400" value="' + esc(m ? m.purpose : '') + '"></label><label>' + esc(CT.t('fPurposeEn')) + '<input name="purposeEn" maxlength="400" value="' + esc(m ? m.purposeEn : '') + '"></label>' +
      '<div class="two"><label>' + esc(CT.t('fRecord')) + '<input name="recordNote" maxlength="200" value="' + esc(m ? m.recordNote : '') + '"></label><label>' + esc(CT.t('fStatus')) + '<select name="status"><option value="final"' + (m && m.status === 'final' ? ' selected' : '') + '>' + esc(CT.t('final')) + '</option><option value="draft"' + (m && m.status === 'draft' ? ' selected' : '') + '>' + esc(CT.t('draft')) + '</option></select></label></div>' +
      '<label>' + esc(CT.t('fSources')) + '<input name="sourcesNote" maxlength="400" value="' + esc(m ? m.sourcesNote : '') + '"></label>';
    CT.ask(CT.t(m ? 'editMeeting' : 'newMeeting'), h, async function (fd) {
      fd.campId = fd.campId || null;
      if (m) { await CT.api('/api/campteam/meetings?id=' + encodeURIComponent(m.id), { method: 'PATCH', body: fd }); await refresh(); showDetail(m.id); }
      else { var r = await CT.api('/api/campteam/meetings', { method: 'POST', body: fd }); await refresh(); showDetail(r.id); }
    });
  }
  function sectionForm(meetingId, s, nextOnly) {
    var h = '<label>' + esc(CT.t('fTopic')) + '<input name="topic" maxlength="200" value="' + esc(s ? s.topic : '') + '"></label><label>' + esc(CT.t('fTitleEn')) + '<input name="titleEn" maxlength="200" value="' + esc(s ? s.titleEn : '') + '"></label>' +
      '<label>' + esc(CT.t('fBodyKo')) + '<textarea name="bodyKo" maxlength="8000" style="height:110px">' + esc(s ? s.bodyKo : '') + '</textarea></label><label>' + esc(CT.t('fBodyEn')) + '<textarea name="bodyEn" maxlength="8000" style="height:110px">' + esc(s ? s.bodyEn : '') + '</textarea></label>' +
      '<div class="two"><label>' + esc(CT.t('fKind')) + '<select name="kind">' + KIND_SEC.map(function (k) { return '<option value="' + k + '"' + ((s ? s.kind : nextOnly ? 'other' : 'discussion') === k ? ' selected' : '') + '>' + esc(CT.t('k' + k)) + '</option>'; }).join('') + '</select></label>' +
      '<label>' + esc(CT.t('fStatus')) + '<select name="status">' + ['pending', 'discussed', 'decided'].map(function (k) { return '<option value="' + k + '"' + ((s ? s.status : nextOnly ? 'pending' : 'discussed') === k ? ' selected' : '') + '>' + esc(CT.t(k)) + '</option>'; }).join('') + '</select></label></div>' +
      '<label>' + esc(CT.t('fTags')) + '<input name="tags" maxlength="200" value="' + esc(s ? String(s.tags || '').split(',').filter(Boolean).join(', ') : '') + '"></label>' +
      '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="nextMeeting" value="1" style="width:auto;height:auto"' + ((s ? s.nextMeeting : nextOnly) ? ' checked' : '') + '> ' + esc(CT.t('fNext')) + '</label>';
    CT.ask(CT.t(s ? 'editSection' : nextOnly ? 'newNext' : 'newSection'), h, async function (fd) {
      var body = { topic: fd.topic, titleEn: fd.titleEn, bodyKo: fd.bodyKo, bodyEn: fd.bodyEn, kind: fd.kind, status: fd.status, tags: fd.tags, nextMeeting: !!fd.nextMeeting };
      if (s) await CT.api('/api/campteam/agenda?id=' + encodeURIComponent(s.id), { method: 'PATCH', body: body }); else await CT.api('/api/campteam/agenda', { method: 'POST', body: Object.assign({ meetingId: meetingId || null }, body) });
      await refresh(); if (meetingId) showDetail(meetingId);
    });
  }
  function decisionForm(ctx) {
    var sup = ctx.supersede, h = (sup ? '<div class="hintbox">' + esc(CT.t('fSupersede')) + ': ' + esc(lt(sup.textKo, sup.textEn).text) + '</div>' : '') +
      '<label>' + esc(CT.t('fKind')) + '<select name="kind">' + KIND_DEC.map(function (k) { return '<option value="' + k + '"' + ((sup ? 'changed' : 'direction') === k ? ' selected' : '') + '>' + esc(decLabel(k)) + '</option>'; }).join('') + '</select></label>' +
      '<label>' + esc(CT.t('fText')) + '<textarea name="textKo" maxlength="1000"></textarea></label><label>' + esc(CT.t('fTextEn')) + '<textarea name="textEn" maxlength="1000"></textarea></label>' +
      '<div class="two"><label>' + esc(CT.t('fDecDate')) + '<input type="date" name="decidedDate"></label><label>' + esc(CT.t('fCamp')) + '<select name="campId" ' + (ctx.meetingId ? 'disabled' : '') + '>' + campOpts(sup && sup.campId, CT.t('noCamp')) + '</select></label></div>' +
      '<label>' + esc(CT.t('fTags')) + '<input name="tags" maxlength="200" value="' + esc(sup ? String(sup.tags || '').split(',').filter(Boolean).join(', ') : '') + '"></label>';
    CT.ask(CT.t('newDec'), h, async function (fd) {
      var body = { kind: fd.kind, textKo: fd.textKo, textEn: fd.textEn, decidedDate: fd.decidedDate || null, tags: fd.tags, meetingId: ctx.meetingId || null, agendaItemId: ctx.agendaItemId || null, campId: fd.campId || null, supersedesId: sup ? sup.id : null };
      await CT.api('/api/campteam/decisions', { method: 'POST', body: body }); await refresh(); if (ctx.meetingId) showDetail(ctx.meetingId);
    });
  }
  function taskFromForm(meetingId, s) {
    var h = '<div class="hintbox">' + esc(lt(s.topic, s.titleEn).text) + '</div><label>' + esc(CT.t('fTaskTitle')) + '<input name="title" required maxlength="200"></label>' +
      '<div class="two"><label>' + esc(CT.t('fOwner')) + '<input name="ownerName" maxlength="100"></label><label>' + esc(CT.t('fDue')) + '<input type="date" name="dueDate"></label></div>';
    CT.ask(CT.t('newTask'), h, async function (fd) {
      var r = await CT.api('/api/campteam/meeting-task', { method: 'POST', body: { meetingId: meetingId, agendaItemId: s.id, title: fd.title, ownerName: fd.ownerName, dueDate: fd.dueDate || null } });
      if (r.existing) alert(CT.t('existingTasks') + ': ' + r.tasks.map(function (t) { return t.title; }).join(', ')); showDetail(meetingId);
    });
  }
  async function attachForm(meetingId) {
    var files = (await CT.api('/api/campteam/files?limit=200')).items;
    var h = '<label>' + esc(CT.t('fFile')) + '<select name="fileId">' + files.map(function (f) { return '<option value="' + esc(f.id) + '">' + esc(f.title) + '</option>'; }).join('') + '</select></label>' +
      '<label>' + esc(CT.t('fRole')) + '<select name="role">' + ['minutes', 'transcript', 'notes', 'photo', 'audio', 'reference'].map(function (r) { return '<option value="' + r + '">' + esc(CT.t('role' + r.charAt(0).toUpperCase() + r.slice(1))) + '</option>'; }).join('') + '</select></label>';
    CT.ask(CT.t('attachFile'), h, async function (fd) { await CT.api('/api/campteam/meeting-links', { method: 'POST', body: { meetingId: meetingId, fileId: fd.fileId, role: fd.role } }); showDetail(meetingId); });
  }
  function textForm(meetingId) {
    var h = '<label>' + esc(CT.t('fLang')) + '<select name="lang"><option value="ko">한국어</option><option value="en">English</option><option value="">—</option></select></label><label>' + esc(CT.t('fBody')) + '<textarea class="big" name="body" required></textarea></label>';
    CT.ask(CT.t('pasteText'), h, async function (fd) { await CT.api('/api/campteam/meeting-texts', { method: 'POST', body: { meetingId: meetingId, kind: 'transcript', lang: fd.lang, body: fd.body } }); showDetail(meetingId); });
  }
  function importForm() {
    var h = '<div class="hintbox">' + esc(CT.t('impHelp')) + '</div><label>' + esc(CT.t('fCamp')) + '<select name="campId">' + campOpts('', CT.t('noCamp')) + '</select></label>' +
      '<label>' + esc(CT.t('impKo')) + '<textarea class="big" name="textKo"></textarea></label><label>' + esc(CT.t('impEn')) + '<textarea class="big" name="textEn"></textarea></label><div id="impPv"></div>';
    CT.ask(CT.t('impTitle'), h, async function (fd) {
      var body = { textKo: fd.textKo, textEn: fd.textEn, campId: fd.campId || null }, r;
      try { r = await CT.api('/api/campteam/import-minutes', { method: 'POST', body: body }); }
      catch (e) { if (e.status === 409 && confirm(CT.t('dupMeeting'))) r = await CT.api('/api/campteam/import-minutes', { method: 'POST', body: Object.assign({ force: true }, body) }); else throw e; }
      await refresh(); showDetail(r.id);
    }, { extra: '<button type="button" class="btn" id="impPvBtn">' + esc(CT.t('preview')) + '</button>' });
    $('impPvBtn').onclick = async function () {
      var f = $('dlgForm'); $('dlgErr').hidden = true;
      try { var r = await CT.api('/api/campteam/import-minutes', { method: 'POST', body: { textKo: f.textKo.value, textEn: f.textEn.value, preview: true } }), s = r.summary;
        $('impPv').innerHTML = '<div class="hintbox"><b>' + esc(s.title) + '</b> · ' + esc(s.date) + ' ' + esc(s.time) + ' · ' + s.languages.join('+') + '<br>' + s.sections.map(function (x) { return x.no + '. ' + esc(x.titleKo || '') + (x.titleEn ? ' / ' + esc(x.titleEn) : ''); }).join('<br>') + '<br>' + esc(CT.t('nextItems')) + ': ' + s.nextItems + (s.duplicateOf ? '<br>⚠ ' + esc(CT.t('dupMeeting')) : '') + '</div>';
      } catch (e) { $('dlgErr').textContent = e.message; $('dlgErr').hidden = false; }
    };
  }

  /* ---------- 공통 ---------- */
  async function refresh() { S.types = (await CT.api('/api/campteam/camps')).types; fillSelects(); if (S.tab === 'list') await loadMeetings(); else if (S.tab === 'topic') await loadTags(); else if (S.tab === 'dec') await loadDecisions(); else await loadNext(); }
  function showTab(t) {
    S.tab = t; document.querySelectorAll('#tabs .tab').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === t); });
    [['list', 'List'], ['topic', 'Topic'], ['dec', 'Dec'], ['next', 'Next']].forEach(function (p) { $('pane' + p[1]).hidden = p[0] !== t; });
    refresh();
  }
  CT.boot(async function () {
    try { S.types = (await CT.api('/api/campteam/camps')).types; fillSelects(); await loadMeetings(); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    CT.applyI18n(); fillSelects(); renderMeetings();
    var up = new URLSearchParams(location.search), open = up.get('open'); if (up.get('campId')) { $('mcamp').value = up.get('campId'); await loadMeetings(); } if (open) showDetail(open);
    var timer; $('mq').oninput = function () { clearTimeout(timer); timer = setTimeout(loadMeetings, 250); }; ['mcamp', 'mstatus', 'mfrom'].forEach(function (id) { $(id).onchange = loadMeetings; }); $('mgroup').onchange = renderMeetings;
    ['dcamp', 'dmode', 'dkind'].forEach(function (id) { $(id).onchange = loadDecisions; }); var t2; $('dq').oninput = function () { clearTimeout(t2); t2 = setTimeout(loadDecisions, 250); }; $('ncamp').onchange = loadNext;
    $('tabs').onclick = function (e) { var b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); };
    $('addMeeting').onclick = function () { meetingForm(); }; $('impMin').onclick = importForm; $('addDec').onclick = function () { decisionForm({}); }; $('addNext').onclick = function () { sectionForm(null, null, true); };
    document.addEventListener('click', function (e) {
      var tg = e.target.closest('[data-tag]'); if (tg && !e.target.closest('#detailBody')) { S.tag = tg.dataset.tag; showTab(S.tab === 'topic' ? 'list' : S.tab); return; }
      if (e.target.id === 'clearTag') { S.tag = ''; refresh(); }
    });
    $('mlist').addEventListener('click', function (e) { var o = e.target.closest('[data-open]'); if (o) showDetail(o.dataset.open); });
    $('dlist').addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]'), c = e.target.closest('[data-change]');
      if (o) { e.preventDefault(); showDetail(o.dataset.open); } else if (c) { var all = (S.decItems || []); var d = all.filter(function (x) { return x.id === c.dataset.change; })[0]; if (!d) { CT.api('/api/campteam/decisions?effective=1').then(function (r) { decisionForm({ supersede: r.items.filter(function (x) { return x.id === c.dataset.change; })[0], meetingId: null }); }); } else decisionForm({ supersede: d }); }
    });
    $('nlist').addEventListener('click', async function (e) { var b = e.target.closest('[data-ast]'); if (!b) return; try { await CT.api('/api/campteam/agenda?id=' + encodeURIComponent(b.dataset.ast), { method: 'PATCH', body: { status: b.dataset.v } }); loadNext(); } catch (err) { alert(err.message); } });
    document.addEventListener('ct-lang', function () { CT.applyI18n(); fillSelects(); if (S.tab === 'list') renderMeetings(); else refresh(); if ($('detail').open) showDetail(S.detailId); });
  });
})();
