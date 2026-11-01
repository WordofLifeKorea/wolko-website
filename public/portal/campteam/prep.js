/* 캠프 준비: 진행표 · 준비물 · 연락처 · 반복 캠프 + 폰 캘린더 구독. 캠프 하나를 골라 그 캠프의 진행표·준비물을 본다. */
(function () {
  CT.addDict({
    ko: { pTitle: '캠프 준비', pSub: '당일 진행표 · 준비물 · 연락처 · 반복 캠프를 한곳에서 챙겨요.', pCal: '📅 폰 캘린더 구독', pCamp: '캠프', pNoCamp: '캠프를 먼저 만들어 주세요.', tTimeline: '진행표', tSupplies: '준비물', tContacts: '연락처', tSeries: '반복 캠프',
      add: '+ 추가', edit: '수정', del: '삭제', save: '저장', cancel: '취소', close: '닫기', delConfirm: '삭제할까요? (휴지통 없이 목록에서만 사라져요)', none: '아직 없어요.',
      fDay: '날짜', fStart: '시작', fEnd: '끝', fTitle: '제목', fPlace: '장소', fOwner: '담당', fNotes: '메모', fName: '이름', fQty: '수량', fStatus: '상태', fKind: '종류', fOrg: '기관·교회', fPhone: '전화', fEmail: '이메일', fNameEn: '영어 이름(선택)', fMonths: '열리는 달', fType: '캠프 유형', fSeriesKind: '구분',
      sNeed: '필요', sBought: '구입함', sReady: '준비 끝', sSkip: '안 씀', kChurch: '교회', kSchool: '학교', kVendor: '업체', kSpeaker: '강사', kVenue: '장소', kOther: '기타', skChurch: '교회', skSchool: '교회학교', skOther: '기타',
      paste: '📋 엑셀에서 붙여넣기', pasteHint: '엑셀·표에서 복사해 붙여 넣으세요. 줄마다 [날짜] [시작] [끝] [제목] [장소] [담당] 순서예요. 날짜 칸이 비면 위 줄의 날짜를 이어 써요.', pasteGo: '추가하기', pastePv: '미리보기', pasteRows: function (n, s) { return n + '줄을 읽었어요' + (s ? ' (못 읽은 ' + s + '줄은 건너뛰어요)' : '') + '.'; },
      nowOn: '지금', copyFrom: '지난 캠프에서 복사', copyGo: '복사', copyDone: function (c, k) { return c + '개를 복사했어요' + (k ? ' (같은 이름 ' + k + '개 건너뜀)' : '') + '.'; }, readyOf: function (a, b) { return '준비 ' + a + ' / ' + b; },
      search: '이름·기관·전화로 찾기', allKinds: '전체', newSeries: '+ 반복 캠프 만들기', round: '새 회차 만들기', roundYear: '연도', roundMonth: '달', roundNone: '열리는 달을 먼저 골라 주세요(수정).', roundDone: '회차를 만들었어요: ', months: '달', seriesNote: '교회·교회학교 캠프처럼 해마다 반복되는 캠프예요. 열리는 달을 골라 두고, 회차는 직접 만들어요(자동으로 만들지 않아요).',
      qBtn: '📱 폰에서 업무 추가', qTitle: '폰에서 업무 추가', qBody: '폰의 단축어(iPhone) 또는 자동화 앱에서 아래 주소로 한 번 요청을 보내면 내 업무가 하나 만들어져요. 「내일까지 버스 예약」처럼 말하면 내일이 기한이 돼요. 이 열쇠는 나만 쓰는 것이고, 업무 만들기만 할 수 있어요 — 남에게 주지 마세요.', qUrl: '주소(POST)', qTok: '내 열쇠(token)', qCopyUrl: '주소 복사', qCopyTok: '열쇠 복사', qNew: '열쇠 새로 만들기', qNewConfirm: '새 열쇠를 만들면 예전 열쇠는 바로 멈춰요. 계속할까요?', qCopied: '복사했어요.',
      qHow: 'iPhone 단축어: 새 단축어 → 「텍스트 받아쓰기」(또는 「입력 요청」) → 「URL 콘텐츠 가져오기」: URL=위 주소, 방법=POST, 요청 본문=JSON, 항목 token=내 열쇠, text=받아쓴 글. 마지막에 「알림 보기」로 결과 message 를 보여 주세요. 홈 화면에 추가하거나 「Hey Siri, 업무 추가」 로 불러요.', qCurl: '시험용(터미널)',
      calTitle: '폰 캘린더 구독', calBody: '아래 주소를 폰 캘린더 앱의 「구독 캘린더」에 넣으면 팀 일정·캠프 기간·진행표·내 업무 마감이 보여요(읽기 전용). 이 주소는 나만 쓰는 열쇠예요 — 남에게 주지 마세요.', calCopy: '주소 복사', calRegen: '주소 새로 만들기', calRegenConfirm: '새 주소를 만들면 예전 주소는 바로 멈춰요. 계속할까요?', calCopied: '복사했어요.', calHow: 'iPhone: 설정 → 캘린더 → 계정 → 계정 추가 → 기타 → 구독 캘린더 추가. Google 캘린더: 다른 캘린더 + → URL로 추가(앱이 아닌 웹에서).' },
    en: { pTitle: 'Camp prep', pSub: 'Day-of timeline, supplies, contacts and recurring camps in one place.', pCal: '📅 Phone calendar', pCamp: 'Camp', pNoCamp: 'Create a camp first.', tTimeline: 'Timeline', tSupplies: 'Supplies', tContacts: 'Contacts', tSeries: 'Recurring camps',
      add: '+ Add', edit: 'Edit', del: 'Delete', save: 'Save', cancel: 'Cancel', close: 'Close', delConfirm: 'Delete this? (It disappears from the list.)', none: 'Nothing yet.',
      fDay: 'Date', fStart: 'Start', fEnd: 'End', fTitle: 'Title', fPlace: 'Place', fOwner: 'Owner', fNotes: 'Notes', fName: 'Name', fQty: 'Qty', fStatus: 'Status', fKind: 'Kind', fOrg: 'Organization / church', fPhone: 'Phone', fEmail: 'Email', fNameEn: 'English name (optional)', fMonths: 'Months held', fType: 'Camp type', fSeriesKind: 'Kind',
      sNeed: 'Needed', sBought: 'Bought', sReady: 'Ready', sSkip: 'Skip', kChurch: 'Church', kSchool: 'School', kVendor: 'Vendor', kSpeaker: 'Speaker', kVenue: 'Venue', kOther: 'Other', skChurch: 'Church', skSchool: 'Sunday school', skOther: 'Other',
      paste: '📋 Paste from Excel', pasteHint: 'Paste rows copied from Excel or a table: [date] [start] [end] [title] [place] [owner]. An empty date continues the row above.', pasteGo: 'Add rows', pastePv: 'Preview', pasteRows: function (n, s) { return 'Read ' + n + ' rows' + (s ? ' (' + s + ' unreadable rows are skipped)' : '') + '.'; },
      nowOn: 'Now', copyFrom: 'Copy from a past camp', copyGo: 'Copy', copyDone: function (c, k) { return 'Copied ' + c + (k ? ' (' + k + ' same-name skipped)' : '') + '.'; }, readyOf: function (a, b) { return 'Ready ' + a + ' / ' + b; },
      search: 'Search name, organization, phone', allKinds: 'All', newSeries: '+ New recurring camp', round: 'Create new round', roundYear: 'Year', roundMonth: 'Month', roundNone: 'Pick the months first (Edit).', roundDone: 'Round created: ', months: '', seriesNote: 'For camps that repeat every year (church or Sunday-school camps). Pick the months; create each round yourself (nothing is created automatically).',
      qBtn: '📱 Add tasks from phone', qTitle: 'Add tasks from your phone', qBody: 'One request to the address below from a phone shortcut (iPhone) or automation app creates a task for you. Saying "book the bus by tomorrow" sets the due date to tomorrow. This key is personal and can only create tasks — do not share it.', qUrl: 'Address (POST)', qTok: 'Your key (token)', qCopyUrl: 'Copy address', qCopyTok: 'Copy key', qNew: 'Create a new key', qNewConfirm: 'The old key stops working right away. Continue?', qCopied: 'Copied.',
      qHow: 'iPhone Shortcuts: new shortcut → "Dictate Text" (or "Ask for Input") → "Get Contents of URL": URL = the address above, Method = POST, Request Body = JSON with token = your key and text = the dictated text. Finish with "Show Notification" to display the message from the result. Add it to your Home Screen or say "Hey Siri, add task".', qCurl: 'Test (terminal)',
      calTitle: 'Phone calendar subscription', calBody: 'Add the address below as a "subscribed calendar" in your phone calendar app to see team events, camp dates, timelines and your task due dates (read-only). This address is your personal key — do not share it.', calCopy: 'Copy address', calRegen: 'Create a new address', calRegenConfirm: 'The old address stops working right away. Continue?', calCopied: 'Copied.', calHow: 'iPhone: Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar. Google Calendar: Other calendars + → From URL (on the web, not the app).' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var KINDS = ['church', 'school', 'vendor', 'speaker', 'venue', 'other'], KL = { church: 'kChurch', school: 'kSchool', vendor: 'kVendor', speaker: 'kSpeaker', venue: 'kVenue', other: 'kOther' };
  var ST = ['need', 'bought', 'ready', 'skip'], STL = { need: 'sNeed', bought: 'sBought', ready: 'sReady', skip: 'sSkip' };
  var S = { camps: [], types: [], campId: '', tab: 'timeline', canWrite: false, kind: '', q: '' };
  function campLabel(c) { return CT.lang() === 'en' && c.nameEn ? c.nameEn : c.nameKo; }
  function canW() { return CT.can('camps', 'edit'); }
  function td() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function nowHm() { var d = new Date(); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  /* ---- 공통: 작은 입력 창 ---- */
  function field(f, v) {
    var val = v == null ? '' : v;
    if (f.t === 'area') return '<label>' + esc(CT.t(f.l)) + '<textarea name="' + f.n + '" rows="3" maxlength="600">' + esc(val) + '</textarea></label>';
    if (f.t === 'select') return '<label>' + esc(CT.t(f.l)) + '<select name="' + f.n + '">' + f.o.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(val) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
    return '<label>' + esc(CT.t(f.l)) + '<input name="' + f.n + '" type="' + (f.t || 'text') + '" maxlength="200" value="' + esc(val) + '"' + (f.s ? ' data-suggest="' + f.s + '"' : '') + '></label>';
  }
  function dialog(title, fields, vals, onSave) {
    var h = '<h3>' + esc(title) + '</h3><form id="pForm" class="form" method="dialog">' + fields.map(function (f) { return field(f, vals[f.n]); }).join('') + '<div class="err" id="pErr" hidden></div><div class="dlg-actions"><button type="button" class="btn" id="pCancel">' + esc(CT.t('cancel')) + '</button><button type="submit" class="btn pri">' + esc(CT.t('save')) + '</button></div></form>';
    $('pBody').innerHTML = h; $('pDlg').showModal(); $('pCancel').onclick = function () { $('pDlg').close(); };
    $('pForm').onsubmit = async function (ev) { ev.preventDefault(); var o = {}; new FormData($('pForm')).forEach(function (v, k) { o[k] = v; }); try { await onSave(o); $('pDlg').close(); } catch (e) { $('pErr').hidden = false; $('pErr').textContent = e.message; } };
  }
  async function del(path, id, reload) { if (!confirm(CT.t('delConfirm'))) return; try { await CT.api(path + '?id=' + encodeURIComponent(id), { method: 'DELETE' }); reload(); } catch (e) { alert(e.message); } }
  var api = function (path, method, body) { return CT.api(path, { method: method, body: body }); };

  /* ---- 진행표 ---- */
  var TL = [];
  async function loadTimeline() { TL = (await CT.api('/api/campteam/timeline?campId=' + encodeURIComponent(S.campId))).items; renderTimeline(); }
  function renderTimeline() {
    var w = canW(), days = {}, today = td(), hm = nowHm();
    TL.forEach(function (r) { (days[r.dayDate] = days[r.dayDate] || []).push(r); });
    var h = '<div class="p-bar">' + (w ? '<button class="btn pri" id="tlAdd">' + esc(CT.t('add')) + '</button> <button class="btn" id="tlPaste">' + esc(CT.t('paste')) + '</button>' : '') + '</div>';
    h += Object.keys(days).sort().map(function (d) {
      return '<h4 class="p-day">' + esc(d) + (d === today ? ' <span class="chip ok">' + esc(CT.t('nowOn')) + '</span>' : '') + '</h4>' + days[d].map(function (r) {
        var now = d === today && r.startTime && r.startTime <= hm && (r.endTime ? hm < r.endTime : hm < r.startTime.replace(/^(\d\d):/, function (m, a) { return String(Math.min(23, +a + 1)).padStart(2, '0') + ':'; }));
        return '<div class="p-row' + (now ? ' now' : '') + '"><span class="p-time">' + esc(r.startTime ? r.startTime + (r.endTime ? '–' + r.endTime : '') : '—') + '</span><span class="p-main"><b>' + esc(CT.lang() === 'en' && r.titleEn ? r.titleEn : r.title) + '</b><small>' + [r.place, r.ownerName, r.notes].filter(Boolean).map(esc).join(' · ') + '</small></span>' + (w ? '<span class="p-act"><button class="btn sm" data-e="' + esc(r.id) + '">' + esc(CT.t('edit')) + '</button> <button class="btn sm danger" data-d="' + esc(r.id) + '">' + esc(CT.t('del')) + '</button></span>' : '') + '</div>';
      }).join('');
    }).join('') || '<div class="empty">' + esc(CT.t('none')) + '</div>';
    $('pView').innerHTML = h;
    var F = [{ n: 'dayDate', l: 'fDay', t: 'date' }, { n: 'startTime', l: 'fStart', t: 'time' }, { n: 'endTime', l: 'fEnd', t: 'time' }, { n: 'title', l: 'fTitle' }, { n: 'place', l: 'fPlace', s: 'place' }, { n: 'ownerName', l: 'fOwner' }, { n: 'notes', l: 'fNotes', t: 'area' }];
    if ($('tlAdd')) $('tlAdd').onclick = function () { var last = TL.length ? TL[TL.length - 1].dayDate : ((S.camps.filter(function (c) { return c.id === S.campId; })[0] || {}).startDate || td()); dialog(CT.t('tTimeline'), F, { dayDate: last }, async function (o) { o.campId = S.campId; await api('/api/campteam/timeline', 'POST', o); await loadTimeline(); }); };
    if ($('tlPaste')) $('tlPaste').onclick = pasteDlg;
    $('pView').onclick = function (e) {
      var eb = e.target.closest('[data-e]'), db = e.target.closest('[data-d]');
      if (eb) { var r = TL.filter(function (x) { return x.id === eb.dataset.e; })[0]; dialog(CT.t('tTimeline'), F, r, async function (o) { await api('/api/campteam/timeline?id=' + encodeURIComponent(r.id), 'PATCH', o); await loadTimeline(); }); }
      if (db) del('/api/campteam/timeline', db.dataset.d, loadTimeline);
    };
    if (window.CTPrep && window.CTPrep.onTimeline) window.CTPrep.onTimeline();
  }
  function pasteDlg() {
    $('pBody').innerHTML = '<h3>' + esc(CT.t('paste')) + '</h3><p class="hint">' + esc(CT.t('pasteHint')) + '</p><textarea id="pasteTx" rows="10" style="width:100%"></textarea><div class="hint" id="pasteMsg"></div><div class="err" id="pErr" hidden></div><div class="dlg-actions"><button type="button" class="btn" id="pCancel">' + esc(CT.t('cancel')) + '</button><button type="button" class="btn" id="pastePv">' + esc(CT.t('pastePv')) + '</button><button type="button" class="btn pri" id="pasteGo">' + esc(CT.t('pasteGo')) + '</button></div>';
    $('pDlg').showModal(); $('pCancel').onclick = function () { $('pDlg').close(); };
    $('pastePv').onclick = async function () { try { var r = await api('/api/campteam/timeline', 'POST', { action: 'paste', campId: S.campId, text: $('pasteTx').value, preview: true }); $('pasteMsg').textContent = CT.t('pasteRows')(r.rows.length, r.skipped.length); } catch (e) { $('pasteMsg').textContent = e.message; } };
    $('pasteGo').onclick = async function () { try { var r = await api('/api/campteam/timeline', 'POST', { action: 'paste', campId: S.campId, text: $('pasteTx').value }); $('pDlg').close(); await loadTimeline(); } catch (e) { $('pErr').hidden = false; $('pErr').textContent = e.message; } };
  }

  /* ---- 준비물 ---- */
  var SU = [];
  async function loadSupplies() { SU = (await CT.api('/api/campteam/supplies?campId=' + encodeURIComponent(S.campId))).items; renderSupplies(); }
  function renderSupplies() {
    var w = canW(), ready = SU.filter(function (r) { return r.status === 'ready' || r.status === 'skip'; }).length;
    var others = S.camps.filter(function (c) { return c.id !== S.campId; });
    var h = '<div class="p-bar">' + (w ? '<button class="btn pri" id="suAdd">' + esc(CT.t('add')) + '</button> ' : '') + (w && others.length ? '<select id="suFrom"><option value="">' + esc(CT.t('copyFrom')) + '…</option>' + others.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(campLabel(c)) + '</option>'; }).join('') + '</select> <button class="btn" id="suCopy">' + esc(CT.t('copyGo')) + '</button>' : '') + '<span class="p-prog">' + esc(CT.t('readyOf')(ready, SU.length)) + '</span></div>';
    h += SU.map(function (r) {
      return '<div class="p-row s-' + r.status + '"><span class="p-main"><b>' + esc(CT.lang() === 'en' && r.nameEn ? r.nameEn : r.name) + (r.qty ? ' <small>× ' + esc(r.qty) + '</small>' : '') + '</b><small>' + [r.ownerName, r.notes].filter(Boolean).map(esc).join(' · ') + '</small></span>' +
        (w ? '<select class="p-st" data-st="' + esc(r.id) + '">' + ST.map(function (s) { return '<option value="' + s + '"' + (s === r.status ? ' selected' : '') + '>' + esc(CT.t(STL[s])) + '</option>'; }).join('') + '</select><span class="p-act"><button class="btn sm" data-e="' + esc(r.id) + '">' + esc(CT.t('edit')) + '</button> <button class="btn sm danger" data-d="' + esc(r.id) + '">' + esc(CT.t('del')) + '</button></span>' : '<span class="chip">' + esc(CT.t(STL[r.status])) + '</span>') + '</div>';
    }).join('') || '<div class="empty">' + esc(CT.t('none')) + '</div>';
    $('pView').innerHTML = h;
    var F = [{ n: 'name', l: 'fName' }, { n: 'qty', l: 'fQty' }, { n: 'status', l: 'fStatus', t: 'select', o: ST.map(function (s) { return [s, CT.t(STL[s])]; }) }, { n: 'ownerName', l: 'fOwner' }, { n: 'notes', l: 'fNotes', t: 'area' }];
    if ($('suAdd')) $('suAdd').onclick = function () { dialog(CT.t('tSupplies'), F, { status: 'need' }, async function (o) { o.campId = S.campId; await api('/api/campteam/supplies', 'POST', o); await loadSupplies(); }); };
    if ($('suCopy')) $('suCopy').onclick = async function () { var f = $('suFrom').value; if (!f) return; try { var r = await api('/api/campteam/supplies', 'POST', { action: 'copy', fromCampId: f, campId: S.campId }); await loadSupplies(); alert(CT.t('copyDone')(r.created, r.skipped)); } catch (e) { alert(e.message); } };
    $('pView').onclick = function (e) { var eb = e.target.closest('[data-e]'), db = e.target.closest('[data-d]'); if (eb) { var r = SU.filter(function (x) { return x.id === eb.dataset.e; })[0]; dialog(CT.t('tSupplies'), F, r, async function (o) { await api('/api/campteam/supplies?id=' + encodeURIComponent(r.id), 'PATCH', o); await loadSupplies(); }); } if (db) del('/api/campteam/supplies', db.dataset.d, loadSupplies); };
    $('pView').onchange = async function (e) { var s = e.target.closest('[data-st]'); if (!s) return; try { await api('/api/campteam/supplies?id=' + encodeURIComponent(s.dataset.st), 'PATCH', { status: s.value }); await loadSupplies(); } catch (er) { alert(er.message); } };
  }

  /* ---- 연락처 ---- */
  var CO = [], coT = null;
  async function loadContacts() { var q = new URLSearchParams(); if (S.kind) q.set('kind', S.kind); if (S.q) q.set('q', S.q); CO = (await CT.api('/api/campteam/contacts?' + q)).items; renderContacts(true); }
  function renderContacts(keepSearch) {
    var w = canW();
    if (!keepSearch || !$('coQ')) $('pView').innerHTML = '<div class="p-bar">' + (w ? '<button class="btn pri" id="coAdd">' + esc(CT.t('add')) + '</button> ' : '') + '<input id="coQ" type="search" maxlength="60" placeholder="' + esc(CT.t('search')) + '" value="' + esc(S.q) + '"></div><div class="tagbar" id="coKinds"></div><div id="coList"></div>';
    $('coKinds').innerHTML = '<button type="button" class="tagchip' + (S.kind ? '' : ' on') + '" data-k="">' + esc(CT.t('allKinds')) + '</button>' + KINDS.map(function (k) { return '<button type="button" class="tagchip' + (S.kind === k ? ' on' : '') + '" data-k="' + k + '">' + esc(CT.t(KL[k])) + '</button>'; }).join('');
    $('coList').innerHTML = CO.map(function (r) {
      var meta = [esc(r.org), r.phone ? '<a href="tel:' + esc(r.phone.replace(/[^\d+]/g, '')) + '">' + esc(r.phone) + '</a>' : '', r.email ? '<a href="mailto:' + esc(r.email) + '">' + esc(r.email) + '</a>' : '', esc(r.notes)].filter(Boolean).join(' · ');
      return '<div class="p-row"><span class="p-main"><b>' + esc(r.name) + '</b> <span class="chip">' + esc(CT.t(KL[r.kind] || 'kOther')) + '</span><small>' + meta + '</small></span>' + (w ? '<span class="p-act"><button class="btn sm" data-e="' + esc(r.id) + '">' + esc(CT.t('edit')) + '</button> <button class="btn sm danger" data-d="' + esc(r.id) + '">' + esc(CT.t('del')) + '</button></span>' : '') + '</div>';
    }).join('') || '<div class="empty">' + esc(CT.t('none')) + '</div>';
    var F = function (kind) { return [{ n: 'kind', l: 'fKind', t: 'select', o: KINDS.map(function (k) { return [k, CT.t(KL[k])]; }) }, { n: 'name', l: 'fName', s: kind || '' }, { n: 'org', l: 'fOrg', s: kind || '' }, { n: 'phone', l: 'fPhone' }, { n: 'email', l: 'fEmail' }, { n: 'notes', l: 'fNotes', t: 'area' }]; };
    if ($('coAdd')) $('coAdd').onclick = function () { dialog(CT.t('tContacts'), F(S.kind), { kind: S.kind || 'church' }, async function (o) { await api('/api/campteam/contacts', 'POST', o); await loadContacts(); }); };
    $('coQ').oninput = function () { S.q = $('coQ').value.trim(); clearTimeout(coT); coT = setTimeout(loadContacts, 250); };
    $('coKinds').onclick = function (e) { var b = e.target.closest('[data-k]'); if (!b) return; S.kind = b.dataset.k; loadContacts(); };
    $('coList').onclick = function (e) { var eb = e.target.closest('[data-e]'), db = e.target.closest('[data-d]'); if (eb) { var r = CO.filter(function (x) { return x.id === eb.dataset.e; })[0]; dialog(CT.t('tContacts'), F(r.kind), r, async function (o) { await api('/api/campteam/contacts?id=' + encodeURIComponent(r.id), 'PATCH', o); await loadContacts(); }); } if (db) del('/api/campteam/contacts', db.dataset.d, loadContacts); };
  }

  /* ---- 반복 캠프 ---- */
  var SE = [];
  async function loadSeries() { SE = (await CT.api('/api/campteam/series')).items; renderSeries(); }
  function renderSeries() {
    var w = canW(), yr = new Date().getFullYear();
    var h = '<p class="hint">' + esc(CT.t('seriesNote')) + '</p><div class="p-bar">' + (w ? '<button class="btn pri" id="seAdd">' + esc(CT.t('newSeries')) + '</button>' : '') + '</div>';
    h += SE.map(function (s) {
      var ms = s.months ? s.months.split(',') : [];
      return '<div class="card p-series"><div class="p-row"><span class="p-main"><b>' + esc(CT.lang() === 'en' && s.nameEn ? s.nameEn : s.nameKo) + '</b> <span class="chip">' + esc(CT.t({ church: 'skChurch', school: 'skSchool', other: 'skOther' }[s.kind] || 'skOther')) + '</span><small>' + ms.map(function (m) { return m + (CT.lang() === 'en' ? '' : '월'); }).join(' · ') + (s.notes ? ' — ' + esc(s.notes) : '') + '</small></span>' + (w ? '<span class="p-act"><button class="btn sm" data-e="' + esc(s.id) + '">' + esc(CT.t('edit')) + '</button> <button class="btn sm danger" data-d="' + esc(s.id) + '">' + esc(CT.t('del')) + '</button></span>' : '') + '</div>' +
        '<div class="p-rounds">' + (s.camps || []).map(function (c) { return '<a class="chip" href="/portal/campteam/space/?campId=' + encodeURIComponent(c.id) + '">' + esc(campLabel(c)) + '</a>'; }).join(' ') + '</div>' +
        (w ? '<div class="p-new">' + (ms.length ? '<select data-ry="' + esc(s.id) + '">' + [yr - 1, yr, yr + 1, yr + 2].map(function (y) { return '<option value="' + y + '"' + (y === yr ? ' selected' : '') + '>' + y + '</option>'; }).join('') + '</select><select data-rm="' + esc(s.id) + '">' + ms.map(function (m) { return '<option value="' + m + '">' + m + CT.t('months') + '</option>'; }).join('') + '</select> <button class="btn sm pri" data-r="' + esc(s.id) + '">' + esc(CT.t('round')) + '</button>' : '<small class="hint">' + esc(CT.t('roundNone')) + '</small>') + '</div>' : '') + '</div>';
    }).join('') || '<div class="empty">' + esc(CT.t('none')) + '</div>';
    $('pView').innerHTML = h;
    var F = function () { return [{ n: 'nameKo', l: 'fName' }, { n: 'nameEn', l: 'fNameEn' }, { n: 'kind', l: 'fSeriesKind', t: 'select', o: [['church', CT.t('skChurch')], ['school', CT.t('skSchool')], ['other', CT.t('skOther')]] }, { n: 'months', l: 'fMonths' }, { n: 'typeId', l: 'fType', t: 'select', o: [['', '—']].concat(S.types.map(function (t) { return [t.id, CT.pick(t, 'name')]; })) }, { n: 'notes', l: 'fNotes', t: 'area' }]; };
    if ($('seAdd')) $('seAdd').onclick = function () { dialog(CT.t('newSeries') + ' (' + CT.t('fMonths') + ': 3, 7, 12)', F(), { kind: 'church' }, async function (o) { await api('/api/campteam/series', 'POST', o); await loadSeries(); }); };
    $('pView').onclick = async function (e) {
      var eb = e.target.closest('[data-e]'), db = e.target.closest('[data-d]'), rb = e.target.closest('[data-r]');
      if (eb) { var s = SE.filter(function (x) { return x.id === eb.dataset.e; })[0]; dialog(CT.t('tSeries'), F(), s, async function (o) { await api('/api/campteam/series?id=' + encodeURIComponent(s.id), 'PATCH', o); await loadSeries(); }); }
      if (db) del('/api/campteam/series', db.dataset.d, loadSeries);
      if (rb) { var id = rb.dataset.r, y = document.querySelector('[data-ry="' + id + '"]').value, m = document.querySelector('[data-rm="' + id + '"]').value; try { var r = await api('/api/campteam/series', 'POST', { action: 'newRound', seriesId: id, year: +y, month: +m }); await loadSeries(); alert(CT.t('roundDone') + r.nameKo); } catch (er) { alert(er.message); } }
    };
  }

  /* ---- 폰 캘린더 ---- */
  async function calDlg() {
    $('pBody').innerHTML = '<h3>' + esc(CT.t('calTitle')) + '</h3><p>' + esc(CT.t('calBody')) + '</p><input id="calUrl" readonly style="width:100%"><div class="hint" id="calMsg"></div><p class="hint">' + esc(CT.t('calHow')) + '</p><div class="dlg-actions"><button class="btn" id="calRegen">' + esc(CT.t('calRegen')) + '</button><button class="btn pri" id="calCopy">' + esc(CT.t('calCopy')) + '</button><button class="btn" id="pCancel">' + esc(CT.t('close')) + '</button></div>';
    $('pDlg').showModal(); $('pCancel').onclick = function () { $('pDlg').close(); };
    try { $('calUrl').value = (await CT.api('/api/campteam/calendar-feed')).url; } catch (e) { $('calMsg').textContent = e.message; return; }
    $('calUrl').onfocus = function () { $('calUrl').select(); };
    $('calCopy').onclick = async function () { try { await navigator.clipboard.writeText($('calUrl').value); } catch (e) { $('calUrl').select(); document.execCommand('copy'); } $('calMsg').textContent = CT.t('calCopied'); };
    $('calRegen').onclick = async function () { if (!confirm(CT.t('calRegenConfirm'))) return; try { $('calUrl').value = (await api('/api/campteam/calendar-feed', 'POST', { regen: true })).url; $('calMsg').textContent = ''; } catch (e) { $('calMsg').textContent = e.message; } };
  }

  /* ---- 폰에서 업무 추가 ---- */
  async function quickDlg() {
    $('pBody').innerHTML = '<h3>' + esc(CT.t('qTitle')) + '</h3><p>' + esc(CT.t('qBody')) + '</p><label>' + esc(CT.t('qUrl')) + '<input id="qUrl" readonly></label><label>' + esc(CT.t('qTok')) + '<input id="qTok" readonly></label><div class="hint" id="qMsg"></div><p class="hint">' + esc(CT.t('qHow')) + '</p><details><summary>' + esc(CT.t('qCurl')) + '</summary><pre id="qCurl" class="p-pre"></pre></details><div class="dlg-actions"><button class="btn" id="qNew">' + esc(CT.t('qNew')) + '</button><button class="btn" id="qCu">' + esc(CT.t('qCopyUrl')) + '</button><button class="btn pri" id="qCt">' + esc(CT.t('qCopyTok')) + '</button><button class="btn" id="pCancel">' + esc(CT.t('close')) + '</button></div>';
    $('pDlg').showModal(); $('pCancel').onclick = function () { $('pDlg').close(); };
    function fill(r) { $('qUrl').value = r.url; $('qTok').value = r.token; $('qCurl').textContent = "curl -X POST '" + r.url + "' -H 'content-type: application/json' -d '" + JSON.stringify({ token: r.token, text: '내일까지 버스 예약' }) + "'"; }
    try { fill(await CT.api('/api/campteam/quick-task')); } catch (e) { $('qMsg').textContent = e.message; return; }
    var cp = async function (id) { try { await navigator.clipboard.writeText($(id).value); } catch (e) { $(id).select(); document.execCommand('copy'); } $('qMsg').textContent = CT.t('qCopied'); };
    $('qCu').onclick = function () { cp('qUrl'); }; $('qCt').onclick = function () { cp('qTok'); };
    $('qNew').onclick = async function () { if (!confirm(CT.t('qNewConfirm'))) return; try { fill(await api('/api/campteam/quick-task', 'POST', { regen: true })); $('qMsg').textContent = ''; } catch (e) { $('qMsg').textContent = e.message; } };
  }

  /* ---- 틀 ---- */
  var TABS = [['timeline', 'tTimeline'], ['supplies', 'tSupplies'], ['contacts', 'tContacts'], ['series', 'tSeries']];
  var EXT = {}; // 다른 파일(prep-extra.js)이 탭을 더할 수 있다: CTPrep.add(key, { label, needCamp, load })
  function allTabs() { return TABS.concat(Object.keys(EXT).map(function (k) { return [k, EXT[k].label]; })); }
  function needsCamp() { return S.tab === 'timeline' || S.tab === 'supplies' || !!(EXT[S.tab] && EXT[S.tab].needCamp); }
  window.CTPrep = { S: S, api: api, dialog: dialog, field: field, del: del, esc: esc, campLabel: campLabel, canW: canW, add: function (k, o) { EXT[k] = o; }, show: function () { return show(); } };
  function head() {
    $('pTabs').innerHTML = allTabs().map(function (t) { return '<button class="tab ' + (t[0] === S.tab ? 'on' : '') + '" data-tab="' + t[0] + '">' + esc(CT.t(t[1])) + '</button>'; }).join('');
    $('pCampWrap').hidden = !needsCamp();
    $('pCamp').innerHTML = S.camps.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === S.campId ? ' selected' : '') + '>' + esc(campLabel(c)) + '</option>'; }).join('');
  }
  async function show() {
    head(); var needCamp = needsCamp();
    if (needCamp && !S.campId) { $('pView').innerHTML = '<div class="empty">' + esc(CT.t('pNoCamp')) + '</div>'; return; }
    try { if (S.tab === 'timeline') await loadTimeline(); else if (S.tab === 'supplies') await loadSupplies(); else if (S.tab === 'contacts') await loadContacts(); else if (EXT[S.tab]) await EXT[S.tab].load(); else await loadSeries(); }
    catch (e) { $('pView').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
  }
  CT.boot(async function () {
    try { var d = await CT.api('/api/campteam/camps'); S.types = d.types; S.camps = []; d.types.forEach(function (t) { t.camps.forEach(function (c) { if (c.status !== 'canceled') S.camps.push(c); }); }); } catch (e) { /* 아래에서 안내 */ }
    S.camps.sort(function (a, b) { return String(b.startDate || '').localeCompare(String(a.startDate || '')); });
    var up = new URLSearchParams(location.search); S.campId = (S.camps.filter(function (c) { return c.id === up.get('campId'); })[0] || S.camps[0] || {}).id || ''; if (allTabs().some(function (t) { return t[0] === up.get('tab'); })) S.tab = up.get('tab');
    CT.applyI18n(); await show();
    $('pTabs').onclick = function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; S.tab = b.dataset.tab; show(); };
    $('pCamp').onchange = function () { S.campId = $('pCamp').value; show(); };
    $('pCal').onclick = calDlg; if ($('pQuick')) $('pQuick').onclick = quickDlg;
    document.addEventListener('ct-lang', function () { CT.applyI18n(); show(); });
    setInterval(function () { if (S.tab === 'timeline' && !$('pDlg').open) renderTimeline(); }, 60000); // 「지금」 표시를 1분마다 갱신
  });
})();
