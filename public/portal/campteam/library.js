/* 보관함: 설교·메시지 / 찬양 콘티 / 게임·활동 / 장소·시설 카드 (한 화면, 탭으로 나눔). 가사는 글로 저장하지 않고 자료실 파일로 연결만 한다. */
(function () {
  CT.addDict({
    ko: { libTitle: '보관함', libSub: '설교·찬양 콘티·게임·장소를 한곳에 모아 두고 태그로 찾아요.', libTranslate: '🌐 번역 도우미', libAdd: '+ 추가', libImport: '📥 자료실에서 가져오기', impHint: '자료실의 파일을 골라 이 탭으로 옮겨요(파일은 그대로, 제목·태그·성경 본문·설교자만 복사). 이미 가져온 파일은 건너뛰어요.', impGo: '선택한 파일 가져오기', impDone: function (c, k) { return c + '개를 가져왔어요' + (k ? ' (' + k + '개 건너뜀)' : '') + '.'; }, impNone: '찾는 파일이 없어요.', libSearch: '제목·태그·성경 본문·설교자·내용으로 찾기', libAll: '전체',
      kSermon: '설교·메시지', kWorship: '찬양 콘티', kGame: '게임·활동', kVenue: '장소·시설', libNone: '아직 없어요. 「+ 추가」로 시작해 보세요.', libCount: '개',
      fTitle: '제목', fTitleEn: '영어 제목(선택)', fSummary: '요약·메모', fTags: '태그 (쉼표로 구분)', fLang: '언어', fCamp: '관련 캠프', fFile: '연결할 자료실 파일', fFileSearch: '파일 이름으로 찾기…', fNoFile: '연결 안 함', fNoCamp: '캠프 없음',
      lKo: '한국어', lEn: '영어', lBoth: '한·영', lNone: '모름', fScripture: '성경 본문', fSpeaker: '설교자', fDate: '날짜', fAudience: '대상', fSongKey: '키(조)', fPron: '영어 발음 한글 제목', fCcli: 'CCLI 번호', fSetlist: '콘티(곡 순서)',
      fFileKo: '한국어 가사 파일', fFileEn: '영어 가사 파일', fFilePron: '발음 한글 파일', fPlayers: '인원', fMinutes: '소요 시간', fSupplies: '준비물', fRules: '진행 방법·규칙', fAddress: '주소', fContact: '담당자', fPhone: '전화', fEmail: '이메일',
      fCost: '비용', fCapacity: '수용 인원', fVisit: '답사 메모', fSite: '웹사이트', save: '저장', cancel: '취소', edit: '수정', del: '삭제', close: '닫기', delConfirm: '이 항목을 휴지통으로 보낼까요? (되살릴 수 있어요)', openFile: '자료 열기', libEditT: '항목 수정', libAddT: '항목 추가',
      libLyric: '가사는 글로 저장하지 않아요. 가사·악보 파일은 자료실에 올리고 여기서 연결하세요(저작권 확인은 팀 몫이에요).', libUnknown: '모르는 칸은 비워 두세요. 지어내지 않아요.' },
    en: { libTitle: 'Library', libSub: 'Keep sermons, worship set lists, games and venues in one place and find them by tag.', libTranslate: '🌐 Translation helper', libAdd: '+ Add', libImport: '📥 Import from Files', impHint: 'Pick files from Files to bring into this tab (the file stays; only title, tags, scripture and speaker are copied). Files already imported are skipped.', impGo: 'Import selected', impDone: function (c, k) { return 'Imported ' + c + (k ? ' (' + k + ' skipped)' : '') + '.'; }, impNone: 'No files found.', libSearch: 'Search title, tag, scripture, speaker, notes', libAll: 'All',
      kSermon: 'Sermons', kWorship: 'Worship sets', kGame: 'Games & activities', kVenue: 'Venues', libNone: 'Nothing here yet. Start with "+ Add".', libCount: ' items',
      fTitle: 'Title', fTitleEn: 'English title (optional)', fSummary: 'Summary / notes', fTags: 'Tags (comma separated)', fLang: 'Language', fCamp: 'Related camp', fFile: 'Linked file from Files', fFileSearch: 'Search file name…', fNoFile: 'Not linked', fNoCamp: 'No camp',
      lKo: 'Korean', lEn: 'English', lBoth: 'Both', lNone: 'Unknown', fScripture: 'Scripture', fSpeaker: 'Speaker', fDate: 'Date', fAudience: 'Audience', fSongKey: 'Key', fPron: 'Hangul pronunciation title', fCcli: 'CCLI number', fSetlist: 'Set list (song order)',
      fFileKo: 'Korean lyrics file', fFileEn: 'English lyrics file', fFilePron: 'Pronunciation file', fPlayers: 'Players', fMinutes: 'Duration', fSupplies: 'Supplies', fRules: 'How to play / rules', fAddress: 'Address', fContact: 'Contact person', fPhone: 'Phone', fEmail: 'Email',
      fCost: 'Cost', fCapacity: 'Capacity', fVisit: 'Site-visit notes', fSite: 'Website', save: 'Save', cancel: 'Cancel', edit: 'Edit', del: 'Delete', close: 'Close', delConfirm: 'Move this item to the trash? (You can restore it.)', openFile: 'Open file', libEditT: 'Edit item', libAddT: 'Add item',
      libLyric: 'Lyrics are not stored as text. Upload lyric/score files to Files and link them here (copyright checks are up to the team).', libUnknown: 'Leave unknown fields empty. Nothing is invented.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var KINDS = ['sermon', 'worship', 'game', 'venue'], KL = { sermon: 'kSermon', worship: 'kWorship', game: 'kGame', venue: 'kVenue' };
  // 종류별 칸: [이름, 표시 글, 모양(text|date|area), 본체칸이면 true / extra 칸이면 false]
  var SPEC = {
    sermon: [['scripture', 'fScripture', 'text', true], ['speaker', 'fSpeaker', 'text', true], ['itemDate', 'fDate', 'date', true], ['audience', 'fAudience', 'text', false]],
    worship: [['songKey', 'fSongKey', 'text', false], ['pronTitle', 'fPron', 'text', false], ['ccli', 'fCcli', 'text', false], ['setlist', 'fSetlist', 'area', false]],
    game: [['players', 'fPlayers', 'text', false], ['minutes', 'fMinutes', 'text', false], ['supplies', 'fSupplies', 'area', false], ['rules', 'fRules', 'area', false]],
    venue: [['address', 'fAddress', 'text', false], ['contactName', 'fContact', 'text', false], ['contactPhone', 'fPhone', 'text', false], ['contactEmail', 'fEmail', 'text', false], ['cost', 'fCost', 'text', false], ['capacity', 'fCapacity', 'text', false], ['website', 'fSite', 'text', false], ['itemDate', 'fDate', 'date', true], ['visitNotes', 'fVisit', 'area', false]]
  };
  var FILE_FIELDS = { worship: [['fileKo', 'fFileKo'], ['fileEn', 'fFileEn'], ['filePron', 'fFilePron']] };
  var S = { kind: 'sermon', items: [], counts: {}, tags: [], tag: '', camps: [], canWrite: false, editing: null, fileNames: {} };
  function tagLabel(t) { var p = String(t).split('/'); if (p.length < 2) return String(t); var koFirst = /[가-힣]/.test(p[0]); return CT.lang() === 'en' ? (koFirst ? p[1] : p[0]) : (koFirst ? p[0] : p[1]); }
  function titleOf(i) { return CT.lang() === 'en' && i.titleEn ? i.titleEn : i.title; }
  function campName(i) { return CT.lang() === 'en' ? (i.campEn || i.campKo || '') : (i.campKo || i.campEn || ''); }
  function tabs() {
    $('libTabs').innerHTML = KINDS.map(function (k) { return '<button class="tab ' + (k === S.kind ? 'on' : '') + '" data-k="' + k + '">' + esc(CT.t(KL[k])) + (S.counts[k] ? ' <b>' + S.counts[k] + '</b>' : '') + '</button>'; }).join('');
  }
  async function load() {
    var q = new URLSearchParams({ kind: S.kind }), term = $('libQ').value.trim(); if (term) q.set('q', term); if (S.tag) q.set('tag', S.tag);
    var d = await CT.api('/api/campteam/library?' + q); S.items = d.items; S.counts = d.counts; S.tags = d.tagStats; S.canWrite = !!(d.perms && d.perms.areas && d.perms.areas.files === 'edit');
    render();
  }
  function metaLine(i) { return [i.scripture, i.speaker, i.itemDate, campName(i), i.tags ? i.tags.split(',').map(function (t) { return '#' + tagLabel(t); }).join(' ') : '', i.fileTitle ? '📎 ' + i.fileTitle : ''].filter(Boolean).map(esc).join(' · '); }
  function render() {
    tabs(); $('libAdd').hidden = !S.canWrite; $('libImp').hidden = !S.canWrite;
    $('libTags').hidden = !S.tags.length; $('libTags').innerHTML = S.tags.length ? S.tags.map(function (t) { return '<button type="button" class="tagchip' + (S.tag === t.tag ? ' on' : '') + '" data-tag="' + esc(t.tag) + '">#' + esc(tagLabel(t.tag)) + ' <i>' + t.n + '</i></button>'; }).join('') : '';
    $('libCount').textContent = S.items.length + CT.t('libCount');
    $('libList').innerHTML = S.items.length ? S.items.map(function (i) { return '<div class="file-row" data-id="' + esc(i.id) + '"><div class="fr-main"><b>' + esc(titleOf(i)) + '</b><div class="meta">' + metaLine(i) + '</div>' + (i.summary ? '<div class="meta">' + esc(i.summary.slice(0, 140)) + '</div>' : '') + '</div></div>'; }).join('') : '<div class="empty">' + esc(CT.t('libNone')) + '</div>';
  }
  function input(name, label, type, val) {
    if (type === 'area') return '<label>' + esc(CT.t(label)) + '<textarea name="' + name + '" rows="3" maxlength="2000">' + esc(val || '') + '</textarea></label>';
    return '<label>' + esc(CT.t(label)) + '<input name="' + name + '" type="' + (type === 'date' ? 'date' : 'text') + '" maxlength="200" value="' + esc(val || '') + '"></label>';
  }
  function filePick(name, label, id) {
    return '<div class="fpick" data-fp="' + name + '"><span class="fplab">' + esc(CT.t(label)) + '</span><input type="hidden" name="' + name + '" value="' + esc(id || '') + '"><span class="fpcur">' + esc(id ? (S.fileNames[id] || '📎') : CT.t('fNoFile')) + '</span> ' +
      '<input class="fpq" type="search" placeholder="' + esc(CT.t('fFileSearch')) + '" maxlength="60"><div class="fpres"></div></div>';
  }
  function campSelect(v) { return '<label>' + esc(CT.t('fCamp')) + '<select name="campId"><option value="">' + esc(CT.t('fNoCamp')) + '</option>' + S.camps.map(function (t) { return '<optgroup label="' + esc(CT.pick(t, 'name')) + '">' + t.camps.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === v ? ' selected' : '') + '>' + esc(CT.pick(c, 'name')) + '</option>'; }).join('') + '</optgroup>'; }).join('') + '</select></label>'; }
  function form(item) {
    var k = item ? item.kind : S.kind, x = item || { extra: {} }, h = '<h3>' + esc(CT.t(item ? 'libEditT' : 'libAddT')) + ' — ' + esc(CT.t(KL[k])) + '</h3><form id="libForm" class="form" method="dialog" data-k="' + k + '">';
    h += input('title', 'fTitle', 'text', x.title) + input('titleEn', 'fTitleEn', 'text', x.titleEn);
    SPEC[k].forEach(function (f) { h += input(f[0], f[1], f[2], f[3] ? x[f[0]] : x.extra[f[0]]); });
    h += '<label>' + esc(CT.t('fLang')) + '<select name="lang">' + [['', 'lNone'], ['ko', 'lKo'], ['en', 'lEn'], ['both', 'lBoth']].map(function (o) { return '<option value="' + o[0] + '"' + ((x.lang || '') === o[0] ? ' selected' : '') + '>' + esc(CT.t(o[1])) + '</option>'; }).join('') + '</select></label>';
    h += '<label>' + esc(CT.t('fTags')) + '<input name="tags" maxlength="200" value="' + esc((x.tags || '').split(',').filter(Boolean).join(', ')) + '"></label>';
    h += input('summary', 'fSummary', 'area', x.summary) + campSelect(x.campId) + filePick('fileId', 'fFile', x.fileId);
    (FILE_FIELDS[k] || []).forEach(function (f) { h += filePick(f[0], f[1], x.extra[f[0]]); });
    if (k === 'worship') h += '<p class="hint">' + esc(CT.t('libLyric')) + '</p>';
    h += '<p class="hint">' + esc(CT.t('libUnknown')) + '</p><div class="err" id="libErr" hidden></div><div class="dlg-actions"><button type="button" class="btn" id="libCancel">' + esc(CT.t('cancel')) + '</button><button type="submit" class="btn pri">' + esc(CT.t('save')) + '</button></div></form>';
    $('libBody').innerHTML = h; $('libDlg').showModal(); S.editing = item || null;
    $('libCancel').onclick = function () { $('libDlg').close(); };
    $('libForm').onsubmit = save;
  }
  async function save(ev) {
    ev.preventDefault(); var f = $('libForm'), k = f.dataset.k, body = { kind: k, extra: {} }, fd = new FormData(f);
    ['title', 'titleEn', 'summary', 'tags', 'lang', 'campId', 'fileId'].forEach(function (n) { body[n] = fd.get(n) || ''; });
    SPEC[k].forEach(function (s) { if (s[3]) body[s[0]] = fd.get(s[0]) || ''; else body.extra[s[0]] = fd.get(s[0]) || ''; });
    (FILE_FIELDS[k] || []).forEach(function (s) { body.extra[s[0]] = fd.get(s[0]) || ''; });
    try {
      if (S.editing) await CT.api('/api/campteam/library?id=' + encodeURIComponent(S.editing.id), { method: 'PATCH', body: body }); else await CT.api('/api/campteam/library', { method: 'POST', body: body });
      $('libDlg').close(); await load();
    } catch (e) { $('libErr').hidden = false; $('libErr').textContent = e.message; }
  }
  function detail(i) {
    var h = '<h3>' + esc(titleOf(i)) + '</h3>' + (i.titleEn && CT.lang() !== 'en' ? '<div class="meta">' + esc(i.titleEn) + '</div>' : '') + '<dl class="kv">';
    var row = function (lab, v) { return v ? '<dt>' + esc(CT.t(lab)) + '</dt><dd>' + esc(v).replace(/\n/g, '<br>') + '</dd>' : ''; };
    SPEC[i.kind].forEach(function (f) { h += row(f[1], f[3] ? i[f[0]] : i.extra[f[0]]); });
    h += row('fLang', i.lang ? CT.t({ ko: 'lKo', en: 'lEn', both: 'lBoth' }[i.lang]) : '') + row('fCamp', campName(i)) + row('fSummary', i.summary);
    if (i.tags) h += '<dt>' + esc(CT.t('fTags')) + '</dt><dd>' + i.tags.split(',').map(function (t) { return '<span class="tagchip">#' + esc(tagLabel(t)) + '</span>'; }).join(' ') + '</dd>';
    if (i.fileId && i.fileTitle) h += '<dt>' + esc(CT.t('fFile')) + '</dt><dd><a href="/portal/campteam/files/?open=' + encodeURIComponent(i.fileId) + '">📎 ' + esc(i.fileTitle) + '</a></dd>';
    (FILE_FIELDS[i.kind] || []).forEach(function (f) { var id = i.extra[f[0]]; if (id) h += '<dt>' + esc(CT.t(f[1])) + '</dt><dd><a href="/portal/campteam/files/?open=' + encodeURIComponent(id) + '">📎 ' + esc(S.fileNames[id] || CT.t('openFile')) + '</a></dd>'; });
    h += '</dl><div class="dlg-actions">' + (S.canWrite ? '<button class="btn sm danger" id="libDel">' + esc(CT.t('del')) + '</button><button class="btn sm" id="libEdit">' + esc(CT.t('edit')) + '</button>' : '') + '<button class="btn sm" id="libClose">' + esc(CT.t('close')) + '</button></div>';
    $('libBody').innerHTML = h; $('libDlg').showModal();
    $('libClose').onclick = function () { $('libDlg').close(); };
    if ($('libEdit')) $('libEdit').onclick = function () { form(i); };
    if ($('libDel')) $('libDel').onclick = async function () { if (!confirm(CT.t('delConfirm'))) return; try { await CT.api('/api/campteam/library?id=' + encodeURIComponent(i.id), { method: 'DELETE' }); $('libDlg').close(); load(); } catch (e) { alert(e.message); } };
  }
  async function nameFiles(ids) { // 연결된 파일 이름 (상세에서 보여 주기 위함)
    var need = ids.filter(function (id) { return id && !S.fileNames[id]; }); if (!need.length) return;
    await Promise.all(need.map(function (id) { return CT.api('/api/campteam/file?id=' + encodeURIComponent(id)).then(function (r) { S.fileNames[id] = r.file.title; }).catch(function () { S.fileNames[id] = ''; }); }));
  }
  async function importDlg() {
    $('libBody').innerHTML = '<h3>' + esc(CT.t('libImport')) + ' — ' + esc(CT.t(KL[S.kind])) + '</h3><p class="hint">' + esc(CT.t('impHint')) + '</p><input id="impQ" type="search" maxlength="60" placeholder="' + esc(CT.t('fFileSearch')) + '"><div id="impList" class="imp-list"></div><div class="err" id="impErr" hidden></div><div class="dlg-actions"><button type="button" class="btn" id="impCancel">' + esc(CT.t('cancel')) + '</button><button type="button" class="btn pri" id="impGo">' + esc(CT.t('impGo')) + '</button></div>';
    $('libDlg').showModal(); var t = null;
    async function find() { var term = $('impQ').value.trim(); try { var d = await CT.api('/api/campteam/files?limit=60&sort=updated' + (term ? '&q=' + encodeURIComponent(term) : '')); $('impList').innerHTML = d.items.length ? d.items.map(function (f) { return '<label class="imp-row"><input type="checkbox" value="' + esc(f.id) + '"> <span><b>' + esc(f.title) + '</b><small>' + [f.scripture, f.speaker, f.tags ? f.tags.split(',').map(tagLabel).map(function (x) { return '#' + x; }).join(' ') : ''].filter(Boolean).map(esc).join(' · ') + '</small></span></label>'; }).join('') : '<p class="hint">' + esc(CT.t('impNone')) + '</p>'; } catch (e) { $('impList').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; } }
    $('impQ').addEventListener('input', function () { clearTimeout(t); t = setTimeout(find, 250); }); find();
    $('impCancel').onclick = function () { $('libDlg').close(); };
    $('impGo').onclick = async function () {
      var ids = [].map.call($('impList').querySelectorAll('input:checked'), function (c) { return c.value; }); if (!ids.length) return; $('impGo').disabled = true;
      try { var r = await CT.api('/api/campteam/library', { method: 'POST', body: { kind: S.kind, fromFiles: ids } }); $('libDlg').close(); await load(); alert(CT.t('impDone')(r.created, r.skipped)); }
      catch (e) { $('impErr').hidden = false; $('impErr').textContent = e.message; $('impGo').disabled = false; }
    };
  }
  var qTimer = null;
  CT.boot(async function () {
    try { S.camps = (await CT.api('/api/campteam/camps')).types; } catch (e) { S.camps = []; }
    var up = new URLSearchParams(location.search); if (KINDS.indexOf(up.get('kind')) >= 0) S.kind = up.get('kind');
    CT.applyI18n();
    try { await load(); } catch (e) { $('libList').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; return; }
    $('libTabs').addEventListener('click', function (e) { var b = e.target.closest('[data-k]'); if (!b) return; S.kind = b.dataset.k; S.tag = ''; load(); });
    $('libTags').addEventListener('click', function (e) { var b = e.target.closest('[data-tag]'); if (!b) return; S.tag = S.tag === b.dataset.tag ? '' : b.dataset.tag; load(); });
    $('libQ').addEventListener('input', function () { clearTimeout(qTimer); qTimer = setTimeout(load, 250); });
    $('libAdd').onclick = function () { form(null); }; $('libImp').onclick = importDlg;
    $('libList').addEventListener('click', async function (e) { var r = e.target.closest('[data-id]'); if (!r) return; var i = S.items.filter(function (x) { return x.id === r.dataset.id; })[0]; if (!i) return; await nameFiles([i.fileId].concat((FILE_FIELDS[i.kind] || []).map(function (f) { return i.extra[f[0]]; }))); detail(i); });
    // 자료실 파일 찾기: 입력하면 결과가 뜨고 하나를 누르면 연결
    $('libBody').addEventListener('input', function (e) {
      var q = e.target.closest('.fpq'); if (!q) return; var box = q.closest('.fpick'), res = box.querySelector('.fpres'), term = q.value.trim(); clearTimeout(box._t);
      if (term.length < 1) { res.innerHTML = ''; return; }
      box._t = setTimeout(async function () { try { var d = await CT.api('/api/campteam/files?limit=8&q=' + encodeURIComponent(term)); res.innerHTML = d.items.map(function (f) { return '<button type="button" class="btn sm" data-pick="' + esc(f.id) + '" data-name="' + esc(f.title) + '">' + esc(f.title) + '</button>'; }).join('') || '<small class="hint">—</small>'; } catch (er) { res.innerHTML = ''; } }, 250);
    });
    $('libBody').addEventListener('click', function (e) {
      var b = e.target.closest('[data-pick]'); if (!b) return; var box = b.closest('.fpick'); box.querySelector('input[type=hidden]').value = b.dataset.pick; S.fileNames[b.dataset.pick] = b.dataset.name; box.querySelector('.fpcur').textContent = b.dataset.name; box.querySelector('.fpres').innerHTML = ''; box.querySelector('.fpq').value = '';
    });
    document.addEventListener('ct-lang', function () { CT.applyI18n(); if (!$('libDlg').open) render(); });
  });
})();
