(function () {
  CT.addDict({
    ko: { dzTitle: '파일을 여기로 끌어다 놓으세요', dzOr: '또는', dzPick: '파일 열기', dzHint: '다른 창에서 끌어다 놓아도 돼요. 여러 개를 한 번에 놓으면 하나씩 올라가요. 올린 뒤에 이름과 분류를 고칠 수 있어요.', dzDrop: '여기에 놓으면 올라가요', dzUp: '올리는 중', dzDone: '개 올렸어요', dzFail: '올리지 못한 파일', fPublic: '월코 팀 전체에게 공개 (포스터 등)', fPublicHint: '캠프팀 명단에 없는 월코 팀원도 이 파일을 볼 수 있어요. 금액이 들어 있는 자료는 공개할 수 없어요.', publicChip: '공개', filesTitle: '자료실', filesSub: '캠프 자료를 올리고, 찾고, 열어 보세요. 파일 보관과 편집은 구분해서 보여드려요.', addFile: '+ 파일 올리기', addLink: '+ 링크 등록', searchPh: '제목·설명·주제·파일 이름 검색',
      fAllCamps: '모든 캠프', fNoCamp: '공통 자료 (캠프 미지정)', fAllCat: '모든 종류', fAllStatus: '모든 상태', fAllKind: '모든 형식', sortNew: '최신 올린 순', sortOld: '오래된 순', sortUpd: '최근 수정 순', sortName: '이름 순',
      statusAny: '(상태 없음)', statusdraft: '초안', statusactive: '적용 중', statusarchived: '보관(이전 자료)',
      catprogram: '프로그램·설교자·시간표', catstaff: '스태프·Volunteer·Crew 배정', cattransport: '차량·운송', catsupplies: '재고·준비물·구매', catbudget: '예산·지출 (금액 자료)', catchurch: '교회 연락·협력', catmeeting: '회의 자료', catevaluation: '평가·결과 보고', catpromo: '홍보·디자인', catphoto: '사진', cataudio: '녹음', catetc: '기타',
      kindpdf: 'PDF', kinddoc: 'Word', kindxls: 'Excel', kindppt: 'PowerPoint', kindimg: '사진', kindaudio: '녹음', kindvideo: '영상', kindlink: '외부 링크', kindetc: '기타',
      noFiles: '조건에 맞는 자료가 없어요.', count: '개 자료', open: '열기', download: '받기', openExternal: '링크 열기', details: '자세히', mkLinkTitle: '외부 문서 링크 등록', mkFileTitle: '파일 올리기', editTitle: '정보 수정', newVersionTitle: '새 버전 올리기',
      fTitle: '제목', fDesc: '간단한 설명', fTarget: '관련 캠프 · 행사', fCategory: '자료 종류', fTopic: '주제 (예: Camp Crew, 후속 양육)', fStatus: '적용 상태', fFile: '파일 (최대 100MB)', fUrl: '문서 링크 (https://…)', fNote: '이번 버전 메모 (선택)', needFile: '파일을 선택해 주세요.',
      targetNone: '캠프 미지정 (공통 자료)', targetType: '유형 전체 공통 — ', uploading: '올리는 중…', previewNone: '이 형식은 미리보기를 지원하지 않아요. 열기·받기로 확인하세요.', previewLoading: '불러오는 중…',
      kvCamp: '관련 캠프', kvCategory: '자료 종류', kvTopic: '주제', kvStatus: '적용 상태', kvUploader: '등록한 사람', kvCreated: '올린 날짜', kvUpdated: '수정일', kvSource: '원본', kvLinked: '함께 연결된 캠프', kvFile: '파일',
      versions: '버전 이력 (이전 파일도 그대로 보관돼요)', current: '적용 중', apply: '이 버전 적용', newVersion: '새 버전 올리기', edit: '수정', del: '삭제', addLinkCamp: '다른 캠프에 연결', link: '연결', externalNote: '외부 문서예요. 포털에서 편집하지 않고 해당 편집기(Google 등)에서 열어요.', googledoc: 'Google 문서', googlesheet: 'Google 스프레드시트', googleslide: 'Google 슬라이드', googleform: 'Google 설문', drive: 'Google Drive', other: '외부 링크',
      locked: '금액 자료', noStorage: '파일 보관소 설정 전이라 지금은 링크 등록만 가능해요.', close: '닫기', confirmApply: '이 버전을 적용할까요? (다른 버전은 그대로 남아요)', versionNote: '메모' },
    en: { dzTitle: 'Drop files here', dzOr: 'or', dzPick: 'Choose files', dzHint: 'You can also drag files in from another window. Several at once are uploaded one by one. You can edit the title and category afterwards.', dzDrop: 'Drop to upload', dzUp: 'Uploading', dzDone: ' uploaded', dzFail: 'Could not upload', fPublic: 'Share with the whole WOLKO team (posters etc.)', fPublicHint: 'WOLKO team members who are not on the camp team roster can also see this file. Files containing amounts cannot be shared.', publicChip: 'Public', filesTitle: 'Files', filesSub: 'Upload, find and open camp materials. Storing files and editing documents are shown separately.', addFile: '+ Upload file', addLink: '+ Add link', searchPh: 'Search title, description, topic, file name',
      fAllCamps: 'All camps', fNoCamp: 'Shared (no camp)', fAllCat: 'All types', fAllStatus: 'All statuses', fAllKind: 'All formats', sortNew: 'Newest', sortOld: 'Oldest', sortUpd: 'Recently updated', sortName: 'Name',
      statusAny: '(none)', statusdraft: 'Draft', statusactive: 'Active', statusarchived: 'Archived',
      catprogram: 'Program · Speakers · Schedule', catstaff: 'Staff · Volunteer · Crew', cattransport: 'Vehicles · Transport', catsupplies: 'Inventory · Supplies', catbudget: 'Budget · Expenses (amounts)', catchurch: 'Church contact · Partners', catmeeting: 'Meeting materials', catevaluation: 'Evaluation · Reports', catpromo: 'Promo · Design', catphoto: 'Photos', cataudio: 'Audio', catetc: 'Other',
      kindpdf: 'PDF', kinddoc: 'Word', kindxls: 'Excel', kindppt: 'PowerPoint', kindimg: 'Photo', kindaudio: 'Audio', kindvideo: 'Video', kindlink: 'External link', kindetc: 'Other',
      noFiles: 'No materials match.', count: ' files', open: 'Open', download: 'Download', openExternal: 'Open link', details: 'Details', mkLinkTitle: 'Add external document link', mkFileTitle: 'Upload file', editTitle: 'Edit details', newVersionTitle: 'Upload new version',
      fTitle: 'Title', fDesc: 'Short description', fTarget: 'Camp · Event', fCategory: 'Type', fTopic: 'Topic (e.g. Camp Crew, Follow-up)', fStatus: 'Status', fFile: 'File (max 100MB)', fUrl: 'Document link (https://…)', fNote: 'Note for this version (optional)', needFile: 'Please choose a file.',
      targetNone: 'No camp (shared)', targetType: 'Whole type — ', uploading: 'Uploading…', previewNone: 'Preview is not available for this format. Use Open or Download.', previewLoading: 'Loading…',
      kvCamp: 'Camp', kvCategory: 'Type', kvTopic: 'Topic', kvStatus: 'Status', kvUploader: 'Added by', kvCreated: 'Uploaded', kvUpdated: 'Updated', kvSource: 'Source', kvLinked: 'Also linked to', kvFile: 'File',
      versions: 'Version history (earlier files are kept)', current: 'Current', apply: 'Make current', newVersion: 'Upload new version', edit: 'Edit', del: 'Delete', addLinkCamp: 'Link to another camp', link: 'Link', externalNote: 'This is an external document. It opens in its own editor (Google etc.), not edited in the portal.', googledoc: 'Google Doc', googlesheet: 'Google Sheet', googleslide: 'Google Slides', googleform: 'Google Form', drive: 'Google Drive', other: 'External link',
      locked: 'Amounts', noStorage: 'File storage is not set up yet, so only links can be added.', close: 'Close', confirmApply: 'Make this version current? (Other versions are kept.)', versionNote: 'Note' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var CATS = ['program', 'staff', 'transport', 'supplies', 'budget', 'church', 'meeting', 'evaluation', 'promo', 'photo', 'audio', 'etc'];
  var STATUS = ['draft', 'active', 'archived'];
  var KINDS = ['pdf', 'doc', 'xls', 'ppt', 'img', 'audio', 'video', 'link', 'etc'];
  var KIND_LABEL = { img: 'kindimg' };
  var S = { items: [], total: 0, types: [], perms: null, detailId: null };

  function fmtSize(n) { n = Number(n) || 0; return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n >= 1024 ? Math.round(n / 1024) + ' KB' : n + ' B'; }
  function day(s) { return (s || '').slice(0, 10); }
  function kindChip(f) { var k = ['pdf', 'xls', 'doc', 'img', 'ppt', 'audio'].indexOf(f.kind) >= 0 ? f.kind : ''; return '<span class="ext ' + k + '">' + esc((f.kind || 'file').slice(0, 3).toUpperCase()) + '</span>'; }
  function statusChip(f) { return f.statusLabel ? '<span class="chip ' + (f.statusLabel === 'active' ? 'ok' : f.statusLabel === 'draft' ? 'warn' : 'gray') + '">' + esc(CT.t('status' + f.statusLabel)) + '</span>' : ''; }
  function linkLabel(k) { return CT.t((k || 'other').replace('google-', 'google').replace('-', '')); }
  function campName(r) { return CT.lang() === 'en' ? (r.campEn || r.campKo || '') : (r.campKo || r.campEn || ''); }
  function typeName(r) { return CT.lang() === 'en' ? (r.typeEn || r.typeKo || '') : (r.typeKo || r.typeEn || ''); }
  function where(f) { return f.campKo || f.campEn ? campName(f) : (f.typeKo || f.typeEn ? typeName(f) + ' (' + CT.t('targetType').replace(' — ', '') + ')' : CT.t('targetNone')); }
  function perms() { var p = S.perms || { moneyWrite: false }; return { write: !!(p.areas && p.areas.files === 'edit'), moneyWrite: !!p.moneyWrite }; } // 일반 자료는 "자료실" 항목 권한, 금액 자료는 "예산·장부" 수정 권한
  function canAdd() { var p = perms(); return p.write || p.moneyWrite; }
  function canEdit(f) { var p = perms(); return f.restricted ? p.moneyWrite : p.write; }
  function allowedCats() { var p = perms(); return CATS.filter(function (c) { return c === 'budget' ? p.moneyWrite : p.write; }); }

  function filterOptions() {
    var sel = function (id, html, keep) { var el = $(id), v = keep ? el.value : ''; el.innerHTML = html; if (v) el.value = v; };
    var camps = '<option value="">' + esc(CT.t('fAllCamps')) + '</option><option value="none">' + esc(CT.t('fNoCamp')) + '</option>' +
      S.types.map(function (t) { return '<optgroup label="' + esc(CT.pick(t, 'name')) + '"><option value="type:' + esc(t.id) + '">' + esc(CT.t('targetType') + CT.pick(t, 'name')) + '</option>' +
        t.camps.map(function (c) { return '<option value="camp:' + esc(c.id) + '">' + esc(CT.pick(c, 'name')) + '</option>'; }).join('') + '</optgroup>'; }).join('');
    sel('fcamp', camps, true);
    sel('fcat', '<option value="">' + esc(CT.t('fAllCat')) + '</option>' + CATS.map(function (c) { return '<option value="' + c + '">' + esc(CT.t('cat' + c)) + '</option>'; }).join(''), true);
    sel('fstatus', '<option value="">' + esc(CT.t('fAllStatus')) + '</option>' + STATUS.map(function (c) { return '<option value="' + c + '">' + esc(CT.t('status' + c)) + '</option>'; }).join(''), true);
    sel('fkind', '<option value="">' + esc(CT.t('fAllKind')) + '</option>' + KINDS.map(function (k) { return '<option value="' + k + '">' + esc(CT.t('kind' + k)) + '</option>'; }).join(''), true);
    sel('fsort', [['newest', 'sortNew'], ['updated', 'sortUpd'], ['name', 'sortName'], ['oldest', 'sortOld']].map(function (o) { return '<option value="' + o[0] + '">' + esc(CT.t(o[1])) + '</option>'; }).join(''), true);
  }

  async function loadList() {
    var q = new URLSearchParams(), t = $('fcamp').value;
    if ($('fq').value.trim()) q.set('q', $('fq').value.trim());
    if (t === 'none') q.set('campId', 'none'); else if (t.indexOf('camp:') === 0) q.set('campId', t.slice(5)); else if (t.indexOf('type:') === 0) q.set('typeId', t.slice(5));
    ['fcat:category', 'fstatus:status', 'fkind:kind', 'fsort:sort'].forEach(function (m) { var p = m.split(':'), v = $(p[0]).value; if (v) q.set(p[1], v); });
    var data = await CT.api('/api/campteam/files?' + q.toString());
    S.items = data.items; S.total = data.total; S.perms = data.perms; renderList();
  }

  function renderList() {
    $('addFile').hidden = !canAdd(); $('addLink').hidden = !canAdd();
    $('countLine').textContent = S.total + CT.t('count');
    $('list').innerHTML = S.items.length ? S.items.map(function (f) {
      var meta = [where(f), CT.t('cat' + f.category), f.topic, f.uploadedBy, day(f.createdAt), f.isPublic ? '🌐 ' + CT.t('publicChip') : ''].filter(Boolean).map(esc).join(' · ');
      if (f.storage !== 'link' && f.versionNo) meta += ' · v' + f.versionNo + (f.sizeBytes ? ' · ' + fmtSize(f.sizeBytes) : '');
      if (f.storage === 'link') meta += ' · ' + esc(linkLabel(f.linkKind));
      return '<div class="file-row" data-id="' + esc(f.id) + '">' + kindChip(f) +
        '<div class="fm"><b data-open="' + esc(f.id) + '">' + esc(f.title) + '</b>' + (f.isTest ? '<span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + statusChip(f) + (f.restricted ? '<span class="chip lock">🔒 ' + esc(CT.t('locked')) + '</span>' + CT.help('restricted') : '') +
        '<small>' + meta + '</small></div>' +
        '<div class="actions"><button class="btn sm" data-open="' + esc(f.id) + '">' + esc(CT.t('details')) + '</button>' +
        (f.storage === 'link' ? '<a class="btn sm pri" href="' + esc(f.externalUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(CT.t('openExternal')) + '</a>' : '<button class="btn sm pri" data-dl="' + esc(f.id) + '">' + esc(CT.t('download')) + '</button>') + '</div></div>';
    }).join('') : '<div class="empty">' + esc(CT.t('noFiles')) + '</div>';
  }

  async function signed(id, versionId, download) {
    var q = 'id=' + encodeURIComponent(id) + (versionId ? '&versionId=' + encodeURIComponent(versionId) : '') + (download ? '&download=1' : '');
    return CT.api('/api/campteam/file-url?' + q);
  }
  async function download(id, versionId) {
    try { var u = await signed(id, versionId, true); var a = document.createElement('a'); a.href = u.url; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { alert(e.message); }
  }
  async function preview(id, versionId, box) {
    box.innerHTML = esc(CT.t('previewLoading'));
    try {
      var u = await signed(id, versionId, false);
      if (!u.previewable) { box.innerHTML = esc(CT.t('previewNone')); return; }
      var m = u.mime || '';
      box.innerHTML = m === 'application/pdf' ? '<iframe src="' + esc(u.url) + '" title="preview"></iframe>' : m.indexOf('image/') === 0 ? '<img alt="" src="' + esc(u.url) + '">' : m.indexOf('audio/') === 0 ? '<audio controls src="' + esc(u.url) + '"></audio>' : '<video controls src="' + esc(u.url) + '"></video>';
    } catch (e) { box.textContent = e.message; }
  }

  async function showDetail(id) {
    S.detailId = id;
    var d;
    try { d = await CT.api('/api/campteam/file?id=' + encodeURIComponent(id)); } catch (e) { alert(e.message); return; }
    var f = d.file, cur = d.versions.filter(function (v) { return v.id === f.currentVersionId; })[0], edit = canEdit(f);
    var h = '<h3>' + esc(f.title) + (f.isTest ? '<span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + statusChip(f) + (f.restricted ? '<span class="chip lock">🔒 ' + esc(CT.t('locked')) + '</span>' + CT.help('restricted') : '') + '</h3>';
    h += f.description ? '<p class="meta">' + esc(f.description) + '</p>' : '';
    h += '<div class="pv" id="pv"></div>';
    h += '<dl class="kv"><dt>' + esc(CT.t('kvCamp')) + '</dt><dd>' + esc(where(f)) + '</dd>' +
      '<dt>' + esc(CT.t('kvCategory')) + '</dt><dd>' + esc(CT.t('cat' + f.category)) + '</dd>' +
      (f.topic ? '<dt>' + esc(CT.t('kvTopic')) + '</dt><dd>' + esc(f.topic) + '</dd>' : '') +
      '<dt>' + esc(CT.t('kvUploader')) + '</dt><dd>' + esc(f.uploadedBy) + '</dd>' +
      '<dt>' + esc(CT.t('kvCreated')) + '</dt><dd>' + esc(day(f.createdAt)) + '</dd><dt>' + esc(CT.t('kvUpdated')) + '</dt><dd>' + esc(day(f.updatedAt)) + '</dd>' +
      (f.storage === 'link' ? '<dt>' + esc(CT.t('kvSource')) + '</dt><dd>' + esc(linkLabel(f.linkKind)) + ' — <a href="' + esc(f.externalUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(f.externalUrl) + '</a></dd>' : (cur ? '<dt>' + esc(CT.t('kvFile')) + '</dt><dd>' + esc(cur.fileName) + ' · ' + fmtSize(cur.sizeBytes) + '</dd>' : '')) + '</dl>';
    if (f.storage === 'link') h += '<div class="hintbox">' + esc(CT.t('externalNote')) + '</div>';
    // 여러 캠프에 연결
    h += '<dl class="kv"><dt>' + esc(CT.t('kvLinked')) + '</dt><dd class="linkchips">' + d.links.map(function (l) {
      return '<span class="chip">' + esc(CT.pick(l, 'name')) + (edit ? '<button data-unlink="' + esc(l.campId) + '" title="x">×</button>' : '') + '</span>'; }).join('') +
      (edit ? '<select id="linkSel"><option value="">' + esc(CT.t('addLinkCamp')) + '</option>' + S.types.map(function (t) { return t.camps.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(CT.pick(c, 'name')) + '</option>'; }).join(''); }).join('') + '</select> <button class="btn sm" id="linkBtn">' + esc(CT.t('link')) + '</button>' : '') + '</dd></dl>';
    if (f.storage !== 'link') {
      h += '<h4 style="margin:14px 0 4px;font-size:13px">' + esc(CT.t('versions')) + '</h4><table class="vtable"><tbody>' + d.versions.map(function (v) {
        var isCur = v.id === f.currentVersionId;
        return '<tr><td>v' + v.versionNo + (isCur ? ' <span class="chip ok">' + esc(CT.t('current')) + '</span>' : '') + '</td><td>' + esc(v.fileName) + '<br><small class="meta">' + esc(v.uploadedBy) + ' · ' + esc(day(v.createdAt)) + ' · ' + fmtSize(v.sizeBytes) + (v.note ? ' · ' + esc(v.note) : '') + '</small></td>' +
          '<td style="text-align:right;white-space:nowrap"><button class="btn sm" data-vopen="' + esc(v.id) + '">' + esc(CT.t('open')) + '</button> <button class="btn sm" data-vdl="' + esc(v.id) + '">' + esc(CT.t('download')) + '</button>' + (edit && !isCur ? ' <button class="btn sm" data-vapply="' + esc(v.id) + '">' + esc(CT.t('apply')) + '</button>' : '') + '</td></tr>';
      }).join('') + '</tbody></table>';
    }
    h += '<div class="dlg-actions">' + (edit ? '<button class="btn sm danger" id="dDel">' + esc(CT.t('del')) + '</button><button class="btn sm" id="dEdit">' + esc(CT.t('edit')) + '</button>' + (f.storage !== 'link' ? '<button class="btn sm" id="dNew">' + esc(CT.t('newVersion')) + '</button>' : '') : '') +
      (f.storage === 'link' ? '<a class="btn sm pri" href="' + esc(f.externalUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(CT.t('openExternal')) + '</a>' : '<button class="btn sm pri" id="dDl">' + esc(CT.t('download')) + '</button>') +
      '<button class="btn sm" id="dClose">' + esc(CT.t('close')) + '</button></div>';
    $('detailBody').innerHTML = h; $('detail').showModal();
    if (f.storage === 'link') $('pv').hidden = true; else preview(id, f.currentVersionId, $('pv'));
    $('dClose').onclick = function () { $('detail').close(); };
    if ($('dDl')) $('dDl').onclick = function () { download(id); };
    if ($('dEdit')) $('dEdit').onclick = function () { openForm('edit', f); };
    if ($('dNew')) $('dNew').onclick = function () { openForm('version', f); };
    if ($('dDel')) $('dDel').onclick = async function () { if (!confirm(CT.t('confirmDel'))) return; try { await CT.api('/api/campteam/files?id=' + encodeURIComponent(id), { method: 'DELETE' }); $('detail').close(); await loadList(); } catch (e) { alert(e.message); } };
    if ($('linkBtn')) $('linkBtn').onclick = async function () { var v = $('linkSel').value; if (!v) return; try { await CT.api('/api/campteam/files?id=' + encodeURIComponent(id), { method: 'PATCH', body: { addCampId: v } }); await loadList(); showDetail(id); } catch (e) { alert(e.message); } };
  }
  $('detailBody').addEventListener('click', async function (e) {
    var b = e.target.closest('button'); if (!b) return; var id = S.detailId;
    try {
      if (b.dataset.vopen) { $('pv').hidden = false; preview(id, b.dataset.vopen, $('pv')); }
      else if (b.dataset.vdl) download(id, b.dataset.vdl);
      else if (b.dataset.vapply) { if (!confirm(CT.t('confirmApply'))) return; await CT.api('/api/campteam/files?id=' + encodeURIComponent(id), { method: 'PATCH', body: { currentVersionId: b.dataset.vapply } }); await loadList(); showDetail(id); }
      else if (b.dataset.unlink) { await CT.api('/api/campteam/files?id=' + encodeURIComponent(id), { method: 'PATCH', body: { removeCampId: b.dataset.unlink } }); await loadList(); showDetail(id); }
    } catch (err) { alert(err.message); }
  });

  /* ---- 올리기 / 링크 등록 / 수정 / 새 버전 폼 ---- */
  function targetOptions(selected) {
    return '<option value="">' + esc(CT.t('targetNone')) + '</option>' + S.types.map(function (t) {
      return '<optgroup label="' + esc(CT.pick(t, 'name')) + '"><option value="type:' + esc(t.id) + '"' + (selected === 'type:' + t.id ? ' selected' : '') + '>' + esc(CT.t('targetType') + CT.pick(t, 'name')) + '</option>' +
        t.camps.map(function (c) { return '<option value="camp:' + esc(c.id) + '"' + (selected === 'camp:' + c.id ? ' selected' : '') + '>' + esc(CT.pick(c, 'name')) + '</option>'; }).join('') + '</optgroup>'; }).join('');
  }
  function openForm(mode, f) {
    var dlg = $('formDlg'); dlg.dataset.mode = mode; dlg.dataset.id = f ? f.id : '';
    var title = { file: 'mkFileTitle', link: 'mkLinkTitle', edit: 'editTitle', version: 'newVersionTitle' }[mode];
    $('formTitle').textContent = CT.t(title);
    var cats = allowedCats(); if (f && cats.indexOf(f.category) < 0) cats = cats.concat([f.category]);
    var sel = f ? (f.campId ? 'camp:' + f.campId : f.typeId ? 'type:' + f.typeId : '') : ($('fcamp').value.indexOf(':') > 0 ? $('fcamp').value : '');
    var h = '';
    if (mode === 'version') {
      h = '<label>' + esc(CT.t('fFile')) + '<input type="file" name="file" required></label><label>' + esc(CT.t('fNote')) + '<input name="note" maxlength="200"></label>';
    } else {
      h = '<label>' + esc(CT.t('fTitle')) + '<input name="title" maxlength="120" ' + (mode === 'file' ? '' : 'required') + ' value="' + esc(f ? f.title : '') + '"></label>' +
        '<label>' + esc(CT.t('fDesc')) + '<input name="description" maxlength="500" value="' + esc(f ? f.description : '') + '"></label>' +
        '<label>' + esc(CT.t('fTarget')) + '<select name="target">' + targetOptions(sel) + '</select></label>' +
        '<div class="two"><label>' + esc(CT.t('fCategory')) + '<select name="category">' + cats.map(function (c) { return '<option value="' + c + '"' + ((f ? f.category : 'etc') === c ? ' selected' : '') + '>' + esc(CT.t('cat' + c)) + '</option>'; }).join('') + '</select></label>' +
        '<label>' + esc(CT.t('fStatus')) + '<select name="status"><option value="">' + esc(CT.t('statusAny')) + '</option>' + STATUS.map(function (c) { return '<option value="' + c + '"' + (f && f.statusLabel === c ? ' selected' : '') + '>' + esc(CT.t('status' + c)) + '</option>'; }).join('') + '</select></label></div>' +
        '<label>' + esc(CT.t('fTopic')) + '<input name="topic" maxlength="60" value="' + esc(f ? f.topic : '') + '"></label>';
      h += '<label class="chk" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="publicToAll"' + (f && f.isPublic ? ' checked' : '') + '><span>' + esc(CT.t('fPublic')) + '<small class="hint" style="display:block">' + esc(CT.t('fPublicHint')) + '</small></span></label>';
      if (mode === 'file') h += '<label>' + esc(CT.t('fFile')) + '<input type="file" name="file" required></label>';
      if (mode === 'link' || (mode === 'edit' && f.storage === 'link')) h += '<label>' + esc(CT.t('fUrl')) + '<input type="url" name="externalUrl" required maxlength="500" placeholder="https://docs.google.com/…" value="' + esc(f ? f.externalUrl : '') + '"></label>';
    }
    $('formFields').innerHTML = h; $('formErr').hidden = true; $('prog').hidden = true; $('formSave').disabled = false;
    (function () { // 금액 자료(예산 분류)는 월코 팀 전체 공개로 할 수 없다
      var cat = $('formFields').querySelector('[name=category]'), pub = $('formFields').querySelector('[name=publicToAll]'); if (!cat || !pub) return;
      var sync = function () { var lock = cat.value === 'budget'; if (lock) pub.checked = false; pub.disabled = lock; }; cat.onchange = sync; sync();
    })();
    $('detail').close(); dlg.showModal();
  }
  function parseTarget(v) { return v.indexOf('camp:') === 0 ? { campId: v.slice(5), typeId: '' } : v.indexOf('type:') === 0 ? { campId: '', typeId: v.slice(5) } : { campId: '', typeId: '' }; }
  function xhrUpload(file, params, onProgress) {
    return new Promise(function (resolve, reject) {
      var x = new XMLHttpRequest(); x.open('POST', '/api/campteam/upload?' + params.toString());
      x.setRequestHeader('Authorization', 'Bearer ' + CT.token()); x.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
      x.upload.onprogress = function (e) { if (e.lengthComputable) onProgress(e.loaded / e.total); };
      x.onload = function () { var d = null; try { d = JSON.parse(x.responseText); } catch (e) {} if (x.status < 300) resolve(d); else reject(new Error((d && d.error) || ('HTTP ' + x.status))); };
      x.onerror = function () { reject(new Error('network error')); };
      x.send(file);
    });
  }
  async function submitForm(ev) {
    ev.preventDefault();
    var dlg = $('formDlg'), mode = dlg.dataset.mode, id = dlg.dataset.id, fd = new FormData($('form')), v = function (k) { return String(fd.get(k) || '').trim(); };
    $('formErr').hidden = true; $('formSave').disabled = true;
    try {
      var t = parseTarget(v('target'));
      if (mode === 'link') {
        await CT.api('/api/campteam/files', { method: 'POST', body: { title: v('title'), description: v('description'), externalUrl: v('externalUrl'), campId: t.campId || null, typeId: t.typeId || null, category: v('category'), topic: v('topic'), status: v('status'), publicToAll: !!fd.get('publicToAll') } });
      } else if (mode === 'edit') {
        var body = { title: v('title'), description: v('description'), campId: t.campId || null, typeId: t.typeId || null, category: v('category'), topic: v('topic'), status: v('status'), publicToAll: !!fd.get('publicToAll') };
        if ('externalUrl' in Object.fromEntries(fd.entries())) body.externalUrl = v('externalUrl');
        await CT.api('/api/campteam/files?id=' + encodeURIComponent(id), { method: 'PATCH', body: body });
      } else {
        var file = fd.get('file'); if (!file || !file.size) throw new Error(CT.t('needFile'));
        var q = new URLSearchParams();
        if (mode === 'version') { q.set('fileId', id); if (v('note')) q.set('note', v('note')); }
        else { ['title', 'description', 'category', 'topic', 'status'].forEach(function (k) { if (v(k)) q.set(k, v(k)); }); if (t.campId) q.set('campId', t.campId); if (t.typeId) q.set('typeId', t.typeId); if (fd.get('publicToAll')) q.set('publicToAll', '1'); }
        $('prog').hidden = false; $('formSave').textContent = CT.t('uploading');
        await xhrUpload(file, q, function (r) { $('prog').firstElementChild.style.width = Math.round(r * 100) + '%'; });
      }
      dlg.close(); await loadList(); if (mode !== 'file' && mode !== 'link') showDetail(id);
    } catch (e) { $('formErr').textContent = e.message; $('formErr').hidden = false; }
    $('formSave').disabled = false; $('formSave').textContent = CT.t('save');
  }

  // ── 끌어다 놓기 업로드: 넓은 영역 + 화면 어디에 놓아도 됨 (「파일 열기」 버튼은 그대로) ──
  function canUpload() { return canAdd() && !!$('addFile') && !$('addFile').hidden; }
  function dzMsg(t, bad) { var m = $('dzMsg'); if (m) { m.textContent = t; m.style.color = bad ? 'var(--accent)' : 'var(--mid)'; } }
  async function uploadMany(files) {
    files = [].slice.call(files).filter(function (f) { return f && f.size > 0; }); if (!files.length) return;
    var sel = $('fcamp').value, t = parseTarget(sel.indexOf(':') > 0 ? sel : ''), ok = 0, fails = [];
    $('dz').classList.add('busy');
    for (var i = 0; i < files.length; i++) {
      dzMsg(CT.t('dzUp') + ' ' + (i + 1) + '/' + files.length + ' — ' + files[i].name);
      var q = new URLSearchParams(); if (t.campId) q.set('campId', t.campId); if (t.typeId) q.set('typeId', t.typeId);
      try { await xhrUpload(files[i], q, function (r) { $('dzBar').style.width = Math.round(r * 100) + '%'; }); ok++; } catch (e) { fails.push(files[i].name + ' — ' + e.message); }
    }
    $('dz').classList.remove('busy'); $('dzBar').style.width = '0';
    dzMsg(ok + CT.t('dzDone') + (fails.length ? ' · ' + CT.t('dzFail') + ': ' + fails.join(', ') : ''), fails.length > 0); await loadList();
  }
  function wireDropzone() {
    var dz = $('dz'), depth = 0, show = function (on) { document.documentElement.classList.toggle('dz-active', on); dz.classList.toggle('over', on); };
    $('dzPick').onclick = function () { $('dzInput').click(); }; $('dzInput').onchange = function () { uploadMany(this.files); this.value = ''; };
    var dialogOpen = function () { var d = $('formDlg'); return !!(d && d.open); };
    var hasFiles = function (e) { return e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; };
    window.addEventListener('dragenter', function (e) { if (!hasFiles(e) || !canUpload() || dialogOpen()) return; e.preventDefault(); depth++; show(true); });
    window.addEventListener('dragover', function (e) { if (!hasFiles(e) || !canUpload() || dialogOpen()) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    window.addEventListener('dragleave', function (e) { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) show(false); });
    window.addEventListener('drop', function (e) { if (!hasFiles(e) || dialogOpen()) { depth = 0; show(false); return; } e.preventDefault(); depth = 0; show(false); if (canUpload()) uploadMany(e.dataTransfer.files); });
  }
  var timer = null;
  CT.boot(async function () {
    try { S.types = (await CT.api('/api/campteam/camps')).types; await loadList(); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    filterOptions(); CT.applyI18n(); filterOptions(); renderList();
    var up = new URLSearchParams(location.search); // 다른 화면에서 /campteam/files/?category=budget 처럼 열 수 있다
    if (up.get('category')) $('fcat').value = up.get('category'); if (up.get('campId')) $('fcamp').value = 'camp:' + up.get('campId'); if (up.get('typeId')) $('fcamp').value = 'type:' + up.get('typeId'); if (up.get('category') || up.get('campId') || up.get('typeId')) await loadList();
    ['fcamp', 'fcat', 'fstatus', 'fkind', 'fsort'].forEach(function (id) { $(id).onchange = loadList; });
    $('fq').oninput = function () { clearTimeout(timer); timer = setTimeout(loadList, 250); };
    $('addFile').onclick = function () { openForm('file'); }; $('addLink').onclick = function () { openForm('link'); };
    $('dz').hidden = !canAdd(); wireDropzone();
    $('formCancel').onclick = function () { $('formDlg').close(); };
    $('form').onsubmit = submitForm;
    $('list').addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]'), d = e.target.closest('[data-dl]');
      if (o) showDetail(o.dataset.open); else if (d) download(d.dataset.dl);
    });
    document.addEventListener('ct-lang', function () { CT.applyI18n(); filterOptions(); renderList(); });
  });
})();
