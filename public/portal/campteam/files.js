(function () {
  CT.addDict({
    ko: { dzTitle: '파일을 여기로 끌어다 놓으세요', dzOr: '또는', dzPick: '파일 열기', dzHint: '다른 창에서 끌어다 놓아도 돼요. 여러 개를 한 번에 놓으면 하나씩 올라가고, 폴더째 놓으면 이름을 확인한 뒤 폴더로 올라가요. 올린 뒤에도 이름과 분류를 고칠 수 있어요.', dzDrop: '여기에 놓으면 올라가요', dzUp: '올리는 중', dzDone: '개 올렸어요', dzFail: '올리지 못한 파일', fPublic: '월코 팀 전체에게 공개 (포스터 등)', fPublicHint: '캠프팀 명단에 없는 월코 팀원도 이 파일을 볼 수 있어요. 금액이 들어 있는 자료는 공개할 수 없어요.', publicChip: '공개', filesTitle: '자료실', filesSub: '캠프 자료를 올리고, 찾고, 열어 보세요. 파일 보관과 편집은 구분해서 보여드려요.', addFile: '+ 파일 올리기', addLink: '+ 링크 등록', searchPh: '제목·설명·주제·파일 이름 검색',
      fAllCamps: '모든 캠프', fNoCamp: '공통 자료 (캠프 미지정)', fAllCat: '모든 종류', fAllStatus: '모든 상태', fAllKind: '모든 형식', sortNew: '최신 올린 순', sortOld: '오래된 순', sortUpd: '최근 수정 순', sortName: '이름 순',
      statusAny: '(상태 없음)', statusdraft: '초안', statusactive: '적용 중', statusarchived: '보관(이전 자료)',
      catprogram: '프로그램·설교자·시간표', catstaff: '스태프·Volunteer·Crew 배정', cattransport: '차량·운송', catsupplies: '재고·준비물·구매', catbudget: '예산·지출 (금액 자료)', catchurch: '교회 연락·협력', catmeeting: '회의 자료', catevaluation: '평가·결과 보고', catpromo: '홍보·디자인', catphoto: '사진', cataudio: '녹음', catetc: '기타',
      kindpdf: 'PDF', kinddoc: 'Word', kindxls: 'Excel', kindppt: 'PowerPoint', kindimg: '사진', kindaudio: '녹음', kindvideo: '영상', kindlink: '외부 링크', kindetc: '기타',
      mPub: '전체 공개', mPubAll: '모두 전체 공개', mPubHint: '체크하지 않은 파일은 캠프팀 명단 사람만 볼 수 있어요. 체크하면 월코 팀원 모두가 볼 수 있어요.',
      portalFolder: '월코 포털 캠프 자료실', portalChip: '월코 포털', portalRO: '읽기 전용', portalNote: '월코 포털 「캠프 자료실」에 올라온 자료예요. 여기서는 찾고 열기만 돼요 (올리기·수정은 포털에서).', portalOpen: '열기',
      ppNoCamp: '캠프 미지정', ppNoTeam: '팀 폴더 없음', ppAll: '이 안의 파일 모두 한 번에 보기', ppCards: '← 분류로 보기', ppHint: '포털에서 정한 분류(캠프 → 형식 → 팀 폴더) 그대로 나눠 보여요.',
      aiTitle: '✨ AI 도우미', aiSwitch: '파일을 고르면 AI가 내용을 읽고 제목·설명·종류·캠프를 채워 줘요', aiNote: '켜면 고른 파일의 앞부분 글(또는 PDF·사진)이 AI 서비스로 전송돼요. 파일은 저장되지 않고, 저장은 직접 눌러야 해요. 예산(금액) 자료는 보내지 않아요.', aiGo: '✨ 추천 받기', aiBusy: 'AI가 파일을 읽는 중…', aiDone: 'AI가 채웠어요 — 고쳐도 돼요.', aiKoRow: '한글 제목', aiEnRow: 'English title', aiOffMsg: 'AI 추천이 아직 켜지지 않았어요 (관리자가 서버 설정에서 켜야 해요).', aiBudget: '예산(금액) 자료는 AI에 보내지 않아요.', aiFail: 'AI 추천을 받지 못했어요: ', aiNeedFile: '먼저 파일을 골라 주세요.', aiChip: 'AI', aiCamp: '관련 캠프: ', aiNoRead: '이 형식은 내용을 읽지 못해 파일 이름만 보고 추천했어요.',
      addMaterial: '+ 자료 추가', mkAddTitle: '자료 추가', tabFile: '파일 올리기', tabLink: '링크 연결', pickFiles: '파일 선택', pickFolder: '📁 폴더 선택', dzPickDir: '폴더 열기',
      linkOk: '인식했어요: ', canva: 'Canva 디자인', linkShare: '링크 공유 설정이 「링크가 있는 사람은 볼 수 있음」(또는 팀원 지정)이어야 팀원이 열 수 있어요. Google 문서·Drive·Canva 모두 같아요.',
      folderName: '폴더 이름', folderNameEn: '영문 이름 (선택)', mTitles: '파일 이름 (하나씩 고칠 수 있어요)', mAiBusy: 'AI가 이름을 정리하는 중…', mAiDone: 'AI가 이름을 정리했어요. 고쳐도 돼요.', mAiOff: '기본 정리만 했어요. 고쳐도 돼요.',
      mAiNote: 'AI에는 폴더·파일 이름만 보내요 (파일 내용은 보내지 않아요).', mGroup: '폴더로 묶어서 올리기', mSel: '개 선택됨', mUpload: '올리기', mRemove: '빼기', mSkipped: '숨김·시스템 파일은 뺐어요: ', mTooMany: '한 번에 최대 200개까지만 올려요.', mNeedFolder: '폴더 이름을 입력해 주세요.', mFail: '올리지 못한 파일(목록에 남겨 뒀어요)',
      viewFolders: '폴더별 보기', viewAll: '전체 파일 보기', noFolderFiles: '폴더 없는 자료', folderFiles: '개 파일', folderRename: '폴더 이름 바꾸기', folderDel: '폴더 삭제', confirmFolderDel: '폴더만 지워지고 안의 파일은 그대로 남아요. 지울까요?', fFolder: '폴더', folderNone: '(폴더 없음)', backAll: '← 모든 폴더', foldersTitle: '폴더', folderEmpty: '이 폴더에는 자료가 없어요.',
      noFiles: '조건에 맞는 자료가 없어요.', count: '개 자료', open: '열기', download: '받기', openExternal: '링크 열기', details: '자세히', mkLinkTitle: '외부 문서 링크 등록', mkFileTitle: '파일 올리기', editTitle: '정보 수정', newVersionTitle: '새 버전 올리기',
      fTitle: '제목', fDesc: '간단한 설명', fTarget: '관련 캠프 · 행사', fCategory: '자료 종류', fTopic: '주제 (예: Camp Crew, 후속 양육)', fStatus: '적용 상태', fFile: '파일 (최대 100MB)', fUrl: '문서 링크 (https://…)', fNote: '이번 버전 메모 (선택)', needFile: '파일을 선택해 주세요.',
      targetNone: '캠프 미지정 (공통 자료)', targetType: '유형 전체 공통 — ', uploading: '올리는 중…', previewNone: '이 형식은 미리보기를 지원하지 않아요. 열기·받기로 확인하세요.', previewLoading: '불러오는 중…',
      kvCamp: '관련 캠프', kvCategory: '자료 종류', kvTopic: '주제', kvStatus: '적용 상태', kvUploader: '등록한 사람', kvCreated: '올린 날짜', kvUpdated: '수정일', kvSource: '원본', kvLinked: '함께 연결된 캠프', kvFile: '파일',
      versions: '버전 이력 (이전 파일도 그대로 보관돼요)', current: '적용 중', apply: '이 버전 적용', newVersion: '새 버전 올리기', edit: '수정', del: '삭제', addLinkCamp: '다른 캠프에 연결', link: '연결', externalNote: '외부 문서예요. 포털에서 편집하지 않고 해당 편집기(Google 등)에서 열어요.', googledoc: 'Google 문서', googlesheet: 'Google 스프레드시트', googleslide: 'Google 슬라이드', googleform: 'Google 설문', drive: 'Google Drive', other: '외부 링크',
      locked: '금액 자료', noStorage: '파일 보관소 설정 전이라 지금은 링크 등록만 가능해요.', close: '닫기', confirmApply: '이 버전을 적용할까요? (다른 버전은 그대로 남아요)', versionNote: '메모' },
    en: { dzTitle: 'Drop files here', dzOr: 'or', dzPick: 'Choose files', dzHint: 'You can also drag files in from another window. Several at once are uploaded one by one; drop a whole folder to review the names first and upload it as a folder. You can edit titles and categories afterwards.', dzDrop: 'Drop to upload', dzUp: 'Uploading', dzDone: ' uploaded', dzFail: 'Could not upload', fPublic: 'Share with the whole WOLKO team (posters etc.)', fPublicHint: 'WOLKO team members who are not on the camp team roster can also see this file. Files containing amounts cannot be shared.', publicChip: 'Public', filesTitle: 'Files', filesSub: 'Upload, find and open camp materials. Storing files and editing documents are shown separately.', addFile: '+ Upload file', addLink: '+ Add link', searchPh: 'Search title, description, topic, file name',
      fAllCamps: 'All camps', fNoCamp: 'Shared (no camp)', fAllCat: 'All types', fAllStatus: 'All statuses', fAllKind: 'All formats', sortNew: 'Newest', sortOld: 'Oldest', sortUpd: 'Recently updated', sortName: 'Name',
      statusAny: '(none)', statusdraft: 'Draft', statusactive: 'Active', statusarchived: 'Archived',
      catprogram: 'Program · Speakers · Schedule', catstaff: 'Staff · Volunteer · Crew', cattransport: 'Vehicles · Transport', catsupplies: 'Inventory · Supplies', catbudget: 'Budget · Expenses (amounts)', catchurch: 'Church contact · Partners', catmeeting: 'Meeting materials', catevaluation: 'Evaluation · Reports', catpromo: 'Promo · Design', catphoto: 'Photos', cataudio: 'Audio', catetc: 'Other',
      kindpdf: 'PDF', kinddoc: 'Word', kindxls: 'Excel', kindppt: 'PowerPoint', kindimg: 'Photo', kindaudio: 'Audio', kindvideo: 'Video', kindlink: 'External link', kindetc: 'Other',
      mPub: 'Share with all', mPubAll: 'Share all', mPubHint: 'Unchecked files can be seen only by the camp team roster. Checked files can be seen by the whole WOLKO team.',
      portalFolder: 'WOLKO portal · Camp Resources', portalChip: 'WOLKO portal', portalRO: 'Read-only', portalNote: 'Materials from the WOLKO portal "Camp Resources". You can search and open them here (upload or edit in the portal).', portalOpen: 'Open',
      ppNoCamp: 'No camp', ppNoTeam: 'No team folder', ppAll: 'Show all files here at once', ppCards: '← Back to groups', ppHint: 'Grouped the way the portal groups them (camp → type → team folder).',
      aiTitle: '✨ AI helper', aiSwitch: 'When you pick a file, AI reads it and fills in title, description, type and camp', aiNote: 'When on, the beginning of the file text (or the PDF/photo) is sent to the AI service. The file itself is not stored, and you still press Save yourself. Budget (amount) files are never sent.', aiGo: '✨ Suggest', aiBusy: 'AI is reading the file…', aiDone: 'Filled in by AI — you can edit it.', aiKoRow: '한글 제목', aiEnRow: 'English title', aiOffMsg: 'AI suggestions are not turned on yet (an admin must enable them in the server settings).', aiBudget: 'Budget (amount) files are never sent to AI.', aiFail: 'Could not get AI suggestions: ', aiNeedFile: 'Please choose a file first.', aiChip: 'AI', aiCamp: 'Related camp: ', aiNoRead: 'This format could not be read, so the suggestion is based on the file name only.',
      addMaterial: '+ Add material', mkAddTitle: 'Add material', tabFile: 'Upload files', tabLink: 'Link', pickFiles: 'Choose files', pickFolder: '📁 Choose folder', dzPickDir: 'Choose folder',
      linkOk: 'Recognized: ', canva: 'Canva design', linkShare: 'Link sharing must allow the team to open it ("Anyone with the link can view" or specific people). Same for Google Docs, Drive and Canva.',
      folderName: 'Folder name', folderNameEn: 'English name (optional)', mTitles: 'File names (edit each one)', mAiBusy: 'AI is tidying the names…', mAiDone: 'AI tidied the names. You can edit them.', mAiOff: 'Basic tidy only. You can edit them.',
      mAiNote: 'Only the folder and file NAMES are sent to the AI (never the contents).', mGroup: 'Upload as a folder', mSel: ' selected', mUpload: 'Upload', mRemove: 'Remove', mSkipped: 'Skipped hidden/system files: ', mTooMany: 'At most 200 files at a time.', mNeedFolder: 'Please enter a folder name.', mFail: 'Could not upload (kept in the list)',
      viewFolders: 'By folder', viewAll: 'All files', noFolderFiles: 'Files without a folder', folderFiles: ' files', folderRename: 'Rename folder', folderDel: 'Delete folder', confirmFolderDel: 'Only the folder is removed; its files stay. Delete it?', fFolder: 'Folder', folderNone: '(no folder)', backAll: '← All folders', foldersTitle: 'Folders', folderEmpty: 'This folder has no materials.',
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
  var S = { items: [], total: 0, types: [], perms: null, detailId: null, folders: [], portal: [], portalTotal: 0, portalCamps: [], portalOrder: {}, pcamp: '', pp: [], ppFlat: false, view: 'folders', folderId: '', pick: null };
  try { if (localStorage.getItem('ct-files-view') === 'all') S.view = 'all'; } catch (e) { /* 저장 못 해도 괜찮다 */ }
  var MAX_PICK = 200; // 한 번에 올릴 수 있는 파일 수
  var HIDDEN = /(^|\/)(\.[^/]*|__MACOSX|Thumbs\.db|desktop\.ini|~\$[^/]*)(\/|$)/i; // 숨김·시스템 파일(.DS_Store 등)은 올리지 않는다
  function tidy(name) { return String(name || '').replace(/\.[A-Za-z0-9]{1,6}$/, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim(); } // 서버의 기본 정리와 같은 규칙
  function folderLabel(d) { return CT.lang() === 'en' && d.nameEn ? d.nameEn : d.name; }

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
    camps += S.portalCamps.length ? '<optgroup label="' + esc(CT.t('portalFolder')) + '">' + S.portalCamps.map(function (c) { return '<option value="portal:' + esc(c.id) + '">' + esc(pcName(c)) + '</option>'; }).join('') + '</optgroup>' : '';
    sel('fcamp', camps, true);
    sel('fcat', '<option value="">' + esc(CT.t('fAllCat')) + '</option>' + CATS.map(function (c) { return '<option value="' + c + '">' + esc(CT.t('cat' + c)) + '</option>'; }).join(''), true);
    sel('fstatus', '<option value="">' + esc(CT.t('fAllStatus')) + '</option>' + STATUS.map(function (c) { return '<option value="' + c + '">' + esc(CT.t('status' + c)) + '</option>'; }).join(''), true);
    sel('fkind', '<option value="">' + esc(CT.t('fAllKind')) + '</option>' + KINDS.map(function (k) { return '<option value="' + k + '">' + esc(CT.t('kind' + k)) + '</option>'; }).join(''), true);
    sel('fsort', [['newest', 'sortNew'], ['updated', 'sortUpd'], ['name', 'sortName'], ['oldest', 'sortOld']].map(function (o) { return '<option value="' + o[0] + '">' + esc(CT.t(o[1])) + '</option>'; }).join(''), true);
  }

  async function loadList() {
    var q = new URLSearchParams(), t = $('fcamp').value, term = $('fq').value.trim();
    if (term) q.set('q', term);
    if (t === 'none') q.set('campId', 'none'); else if (t.indexOf('camp:') === 0) q.set('campId', t.slice(5)); else if (t.indexOf('type:') === 0) q.set('typeId', t.slice(5));
    ['fcat:category', 'fstatus:status', 'fkind:kind', 'fsort:sort'].forEach(function (m) { var p = m.split(':'), v = $(p[0]).value; if (v) q.set(p[1], v); });
    var pcamp = t.indexOf('portal:') === 0 ? t.slice(7) : '', inPortal = !term && !pcamp && S.view === 'folders' && S.folderId === 'portal', filtered = !!((t && !pcamp) || $('fcat').value || $('fstatus').value || $('fkind').value);
    if (pcamp) t = '';
    if (!term && S.view === 'folders' && !inPortal) q.set('folderId', S.folderId || 'none'); // 폴더별 보기: 폴더 안, 또는 폴더 없는 자료
    var fq = term ? '?q=' + encodeURIComponent(term) : '', none = { items: [], total: 0 };
    var res = await Promise.all([inPortal || pcamp ? Promise.resolve({ items: [], total: 0, perms: S.perms }) : CT.api('/api/campteam/files?' + q.toString()),
      CT.api('/api/campteam/folders' + fq).catch(function () { return { folders: [] }; }),
      filtered ? Promise.resolve(none) : CT.api('/api/campteam/portal-files' + fq).catch(function () { return none; })]); // 월코 포털 자료(읽기 전용, 캠프팀 명단 사람만)
    S.items = res[0].items; S.total = res[0].total; S.perms = res[0].perms; S.folders = res[1].folders || []; S.portal = res[2].items || []; S.portalTotal = res[2].total || 0; S.portalCamps = res[2].camps || []; S.portalOrder = res[2].teamOrder || {}; S.pcamp = pcamp;
    if (pcamp) { var all = S.portal; S.portal = all.filter(function (i) { return campKeys(i).indexOf(pcamp) >= 0; }); S.portalTotal = all.length; }
    renderList();
  }

  /* ---- 월코 포털 자료: 포털의 분류(캠프 → 형식 → 팀 폴더)대로 나눠 보여 준다 ---- */
  var TAB_ORDER = ['teacher', 'program', 'counselor', 'preacher', 'general'], NOTEAM = '~none';
  function pcName(c) { return CT.lang() === 'en' ? c.name : (c.nameKo || c.name); } // 연도 계절 이름 순서로 통일된 캠프 이름(한글/영문)
  function campKeys(i) { var known = S.portalCamps.map(function (c) { return c.id; }), ks = (i.campIds || []).filter(function (id) { return known.indexOf(id) >= 0; }); return ks.length ? ks : ['']; } // 포털에서 지워진 캠프 번호는 「캠프 미지정」으로 모은다
  function ppItems(path) {
    return S.portal.filter(function (i) {
      var camps = campKeys(i);
      if (path.length > 0 && camps.indexOf(path[0]) < 0) return false;
      if (path.length > 1 && i.tab !== path[1]) return false;
      if (path.length > 2 && (i.team || NOTEAM) !== path[2]) return false;
      return true;
    });
  }
  function ppLabel(level, key, items) {
    if (level === 0) { if (!key) return CT.t('ppNoCamp'); var c = S.portalCamps.filter(function (x) { return x.id === key; })[0]; return c ? pcName(c) : key; }
    if (level === 1) { var f = items[0]; return f ? (CT.lang() === 'en' ? f.tabEn : f.tabKo) : key; }
    return key === NOTEAM ? CT.t('ppNoTeam') : key;
  }
  function ppGroups(path) { // 지금 단계에서 보여 줄 묶음 카드 [{key,label,count}]
    var level = path.length, items = ppItems(path), counts = {}, keys = [];
    if (level > 2) return [];
    items.forEach(function (i) {
      var ks = level === 0 ? campKeys(i) : level === 1 ? [i.tab] : [i.team || NOTEAM];
      ks.forEach(function (k) { if (!(k in counts)) { counts[k] = { n: 0, sample: [] }; keys.push(k); } counts[k].n++; if (counts[k].sample.length < 1) counts[k].sample.push(i); });
    });
    if (level === 2 && keys.length === 1 && keys[0] === NOTEAM) return []; // 팀 폴더가 하나도 없으면 바로 파일 목록
    var order = level === 0 ? S.portalCamps.map(function (c) { return c.id; }).concat(['']) : level === 1 ? TAB_ORDER : (S.portalOrder[path[0]] || []).concat([NOTEAM]);
    keys.sort(function (a, b) { var x = order.indexOf(a), y = order.indexOf(b); return (x < 0 ? 999 : x) - (y < 0 ? 999 : y) || String(a).localeCompare(String(b)); });
    return keys.map(function (k) { return { key: k, label: ppLabel(level, k, counts[k].sample), count: counts[k].n }; });
  }
  function ppInTree() { return !S.pcamp && S.view === 'folders' && S.folderId === 'portal' && !$('fq').value.trim(); }
  function ppFiles() { var g = ppGroups(S.pp); return (!g.length || S.ppFlat) ? ppItems(S.pp) : []; } // 묶음 카드가 있으면 카드만, 없으면(또는 모두 보기) 파일
  function renderList() {
    $('addFile').hidden = !canAdd(); renderFolders();
    var tree = ppInTree(), pl = tree ? ppFiles() : S.portal, showPortal = pl.length && ($('fq').value.trim() || S.view === 'all' || S.folderId === 'portal' || S.pcamp);
    $('countLine').textContent = tree ? ppItems(S.pp).length + CT.t('count') : (S.total + (showPortal ? pl.length : 0)) + CT.t('count');
    $('list').innerHTML = S.items.length ? S.items.map(function (f) {
      var meta = [f.folderName ? '📁 ' + (CT.lang() === 'en' && f.folderNameEn ? f.folderNameEn : f.folderName) : '', where(f), CT.t('cat' + f.category), f.topic, f.uploadedBy, day(f.createdAt), f.isPublic ? '🌐 ' + CT.t('publicChip') : ''].filter(Boolean).map(esc).join(' · ');
      if (f.storage !== 'link' && f.versionNo) meta += ' · v' + f.versionNo + (f.sizeBytes ? ' · ' + fmtSize(f.sizeBytes) : '');
      if (f.storage === 'link') meta += ' · ' + esc(linkLabel(f.linkKind));
      return '<div class="file-row" data-id="' + esc(f.id) + '">' + kindChip(f) +
        '<div class="fm"><b data-open="' + esc(f.id) + '">' + esc(f.title) + '</b>' + (f.isTest ? '<span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + statusChip(f) + (f.restricted ? '<span class="chip lock">🔒 ' + esc(CT.t('locked')) + '</span>' + CT.help('restricted') : '') +
        '<small>' + meta + '</small></div>' +
        '<div class="actions"><button class="btn sm" data-open="' + esc(f.id) + '">' + esc(CT.t('details')) + '</button>' +
        (f.storage === 'link' ? '<a class="btn sm pri" href="' + esc(f.externalUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(CT.t('openExternal')) + '</a>' : '<button class="btn sm pri" data-dl="' + esc(f.id) + '">' + esc(CT.t('download')) + '</button>') + '</div></div>';
    }).join('') + (showPortal ? pl.map(portalRow).join('') : '') : (showPortal ? pl.map(portalRow).join('') : (tree && ppGroups(S.pp).length ? '' : '<div class="empty">' + esc(CT.t('noFiles')) + '</div>'));
  }
  function portalRow(f) { // 월코 포털 자료: 열기만 된다
    var tree = ppInTree(), tab = CT.lang() === 'en' ? f.tabEn : f.tabKo, meta = [tree ? '' : tab, tree && S.pp.length > 2 ? '' : f.team, f.person, tree ? '' : (CT.lang() === 'en' ? f.camps : (f.campsKo || f.camps)).join(', '), f.uploadedBy, day(f.createdAt)].filter(Boolean).map(esc).join(' · ');
    return '<div class="file-row portal-row"><span class="ext portal">🌐</span><div class="fm"><b>' + esc(f.title) + '</b><span class="chip gray">' + esc(CT.t('portalChip')) + ' · ' + esc(CT.t('portalRO')) + '</span><small>' + meta + '</small></div>' +
      '<div class="actions"><a class="btn sm pri" href="' + esc(f.openUrl) + '" target="_blank" rel="noopener noreferrer">' + esc(CT.t('portalOpen')) + '</a></div></div>';
  }

  /* ---- 폴더 보기 ---- */
  function renderFolders() {
    var term = $('fq').value.trim(), box = $('folders'), cur = S.folderId && S.folders.filter(function (d) { return d.id === S.folderId; })[0], can = canAdd();
    $('viewBar').innerHTML = ['folders', 'all'].map(function (v) { return '<button type="button" class="tab' + (S.view === v ? ' on' : '') + '" data-view="' + v + '">' + esc(CT.t(v === 'folders' ? 'viewFolders' : 'viewAll')) + '</button>'; }).join('');
    $('viewBar').hidden = !!term || !!S.pcamp;
    var h = '';
    if (S.pcamp) { h = ''; }
    else if (!term && S.view === 'folders' && S.folderId === 'portal') {
      var segs = ['<button type="button" class="btn sm" data-folder="">' + esc(CT.t('backAll')) + '</button>'], names = ['🌐 ' + CT.t('portalFolder')];
      S.pp.forEach(function (k, lv) { names.push(ppLabel(lv, k, ppItems(S.pp.slice(0, lv + 1)))); });
      names.forEach(function (n, i) { segs.push(i === names.length - 1 ? '<b>' + esc(n) + '</b>' : '<button type="button" class="btn sm" data-ppi="' + i + '">' + esc(n) + '</button>'); });
      var groups = ppGroups(S.pp), icon = ['🏕', '📂', '📁'][S.pp.length] || '📁';
      h = '<div class="crumb">' + segs.join('<span class="sep">›</span>') + '</div><div class="hint" style="margin:-4px 0 12px">' + esc(CT.t('portalNote')) + ' ' + esc(CT.t('ppHint')) + '</div>';
      if (groups.length) {
        h += '<div class="folder-grid">' + (S.ppFlat ? '' : groups.map(function (g) { return '<button type="button" class="folder-card" data-pp="' + esc(g.key) + '"><span class="fi">' + icon + '</span><b>' + esc(g.label) + '</b><small>' + g.count + esc(CT.t('folderFiles')) + '</small></button>'; }).join('')) + '</div>' +
          '<div class="actions" style="margin:0 0 10px"><button type="button" class="btn sm" data-ppflat="1">' + esc(CT.t(S.ppFlat ? 'ppCards' : 'ppAll')) + '</button></div>';
      }
    } else if (!term && S.view === 'folders' && S.folderId) {
      h = '<div class="crumb"><button type="button" class="btn sm" data-folder="">' + esc(CT.t('backAll')) + '</button><b>📁 ' + esc(cur ? folderLabel(cur) : '') + '</b>' +
        (cur && can ? '<button type="button" class="btn sm" data-frename="' + esc(cur.id) + '">' + esc(CT.t('folderRename')) + '</button><button type="button" class="btn sm danger" data-fdel="' + esc(cur.id) + '">' + esc(CT.t('folderDel')) + '</button>' : '') + '</div>';
    } else if ((term || S.view === 'folders') && (S.folders.length || (S.portalTotal && !term))) {
      h = '<div class="folder-grid">' + (S.portalTotal && !term ? '<button type="button" class="folder-card" data-folder="portal"><span class="fi">🌐</span><b>' + esc(CT.t('portalFolder')) + '</b><small>' + S.portalTotal + esc(CT.t('folderFiles')) + ' · ' + esc(CT.t('portalRO')) + '</small></button>' : '') + S.folders.map(function (d) {
        return '<button type="button" class="folder-card" data-folder="' + esc(d.id) + '"><span class="fi">📁</span><b>' + esc(folderLabel(d)) + '</b><small>' + d.fileCount + esc(CT.t('folderFiles')) + (d.campKo || d.campEn ? ' · ' + esc(CT.lang() === 'en' ? (d.campEn || d.campKo) : (d.campKo || d.campEn)) : '') + '</small></button>'; }).join('') + '</div>' +
        (!term && S.view === 'folders' ? '<h4 class="subhead">' + esc(CT.t('noFolderFiles')) + '</h4>' : '');
    }
    box.innerHTML = h; box.hidden = !h;
  }
  async function onFolderClick(e) {
    var o = e.target.closest('[data-folder]'), rn = e.target.closest('[data-frename]'), dl = e.target.closest('[data-fdel]');
    try {
      var pp = e.target.closest('[data-pp]'), ppi = e.target.closest('[data-ppi]'), pf = e.target.closest('[data-ppflat]');
      if (pp) { S.pp.push(pp.dataset.pp); S.ppFlat = false; renderList(); }
      else if (ppi) { S.pp = S.pp.slice(0, Number(ppi.dataset.ppi)); S.ppFlat = false; renderList(); }
      else if (pf) { S.ppFlat = !S.ppFlat; renderList(); }
      else if (o) { S.view = 'folders'; S.folderId = o.dataset.folder; S.pp = []; S.ppFlat = false; if ($('fq').value) $('fq').value = ''; await loadList(); }
      else if (rn) { var d = S.folders.filter(function (x) { return x.id === rn.dataset.frename; })[0], nm = prompt(CT.t('folderRename'), d ? d.name : ''); if (nm == null || !nm.trim()) return; await CT.api('/api/campteam/folders?id=' + encodeURIComponent(rn.dataset.frename), { method: 'PATCH', body: { name: nm.trim() } }); await loadList(); }
      else if (dl) { if (!confirm(CT.t('confirmFolderDel'))) return; await CT.api('/api/campteam/folders?id=' + encodeURIComponent(dl.dataset.fdel), { method: 'DELETE' }); S.folderId = ''; await loadList(); }
    } catch (err) { alert(err.message); }
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
      (f.folderName ? '<dt>' + esc(CT.t('fFolder')) + '</dt><dd>📁 ' + esc(CT.lang() === 'en' && f.folderNameEn ? f.folderNameEn : f.folderName) + '</dd>' : '') +
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

  /* ---- 자료 추가(파일 올리기 | 링크 연결 탭) / 수정 / 새 버전 폼 ---- */
  function targetOptions(selected) {
    return '<option value="">' + esc(CT.t('targetNone')) + '</option>' + S.types.map(function (t) {
      return '<optgroup label="' + esc(CT.pick(t, 'name')) + '"><option value="type:' + esc(t.id) + '"' + (selected === 'type:' + t.id ? ' selected' : '') + '>' + esc(CT.t('targetType') + CT.pick(t, 'name')) + '</option>' +
        t.camps.map(function (c) { return '<option value="camp:' + esc(c.id) + '"' + (selected === 'camp:' + c.id ? ' selected' : '') + '>' + esc(CT.pick(c, 'name')) + '</option>'; }).join('') + '</optgroup>'; }).join('');
  }
  function folderOptions(selected) {
    return '<option value="">' + esc(CT.t('folderNone')) + '</option>' + S.folders.map(function (d) { return '<option value="' + esc(d.id) + '"' + (selected === d.id ? ' selected' : '') + '>📁 ' + esc(folderLabel(d)) + '</option>'; }).join('');
  }
  var COMMON = ['title', 'description', 'target', 'category', 'status', 'topic'];
  function readCommon() { var o = {}, root = $('formFields'); COMMON.forEach(function (k) { var el = root.querySelector('[name=' + k + ']'); if (el) o[k] = el.value; }); var pb = root.querySelector('[name=publicToAll]'); if (pb) o.publicToAll = pb.checked; return o; }
  function openForm(mode, f, carry) {
    var dlg = $('formDlg'); dlg.dataset.mode = mode; dlg.dataset.id = f ? f.id : ''; carry = carry || {};
    var addMode = mode === 'file' || mode === 'link';
    $('formTitle').textContent = CT.t(addMode ? 'mkAddTitle' : { edit: 'editTitle', version: 'newVersionTitle' }[mode]);
    var cats = allowedCats(); if (f && cats.indexOf(f.category) < 0) cats = cats.concat([f.category]);
    var sel = carry.target != null ? carry.target : (f ? (f.campId ? 'camp:' + f.campId : f.typeId ? 'type:' + f.typeId : '') : ($('fcamp').value.indexOf(':') > 0 ? $('fcamp').value : ''));
    var val = function (k, d) { return carry[k] != null ? carry[k] : d; }, cat = val('category', f ? f.category : 'etc'), st = val('status', f ? f.statusLabel : '');
    var h = '';
    if (addMode) h += '<div class="tabs" id="addTabs"><button type="button" class="tab' + (mode === 'file' ? ' on' : '') + '" data-tab="file">' + esc(CT.t('tabFile')) + '</button><button type="button" class="tab' + (mode === 'link' ? ' on' : '') + '" data-tab="link">' + esc(CT.t('tabLink')) + '</button></div>';
    if (mode === 'version') {
      h += '<label>' + esc(CT.t('fFile')) + '<input type="file" name="file" required></label><label>' + esc(CT.t('fNote')) + '<input name="note" maxlength="200"></label>';
    } else {
      if (mode === 'file') h += '<div class="pickrow"><button type="button" class="btn" id="pkFiles">' + esc(CT.t('pickFiles')) + '</button><button type="button" class="btn" id="pkDir">' + esc(CT.t('pickFolder')) + '</button><span class="hint" id="pkSum"></span></div>' +
        '<input type="file" id="pkFilesIn" multiple hidden><input type="file" id="pkDirIn" webkitdirectory hidden>' +
        aiBoxHtml() + '<div class="multi" id="multi" hidden><label class="chk" id="mGroupRow" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="mGroup"><span>' + esc(CT.t('mGroup')) + '</span></label>' +
        '<div id="mFolder" class="two"><label>' + esc(CT.t('folderName')) + '<input id="mFolderName" maxlength="120"></label><label>' + esc(CT.t('folderNameEn')) + '<input id="mFolderEn" maxlength="120"></label></div>' +
        '<div class="hint" id="mAi"></div><div class="mrows" id="mRows"></div></div>';
      if (mode === 'link' || (mode === 'edit' && f.storage === 'link')) h += '<label>' + esc(CT.t('fUrl')) + '<input type="url" name="externalUrl" id="urlIn" required maxlength="500" placeholder="https://docs.google.com/… · https://www.canva.com/…" value="' + esc(f ? f.externalUrl : val('externalUrl', '')) + '"></label><div class="hint" id="urlKind"></div><div class="hintbox">' + esc(CT.t('linkShare')) + '</div>';
      h += '<label id="titleLbl">' + esc(CT.t('fTitle')) + '<input name="title" maxlength="120" ' + (mode === 'file' ? '' : 'required') + ' value="' + esc(val('title', f ? f.title : '')) + '"></label>' +
        '<label>' + esc(CT.t('fDesc')) + '<input name="description" maxlength="500" value="' + esc(val('description', f ? f.description : '')) + '"></label>' +
        '<label>' + esc(CT.t('fTarget')) + '<select name="target">' + targetOptions(sel) + '</select></label>' +
        '<div class="two"><label>' + esc(CT.t('fCategory')) + '<select name="category">' + cats.map(function (c) { return '<option value="' + c + '"' + (cat === c ? ' selected' : '') + '>' + esc(CT.t('cat' + c)) + '</option>'; }).join('') + '</select></label>' +
        '<label>' + esc(CT.t('fStatus')) + '<select name="status"><option value="">' + esc(CT.t('statusAny')) + '</option>' + STATUS.map(function (c) { return '<option value="' + c + '"' + (st === c ? ' selected' : '') + '>' + esc(CT.t('status' + c)) + '</option>'; }).join('') + '</select></label></div>' +
        '<label>' + esc(CT.t('fTopic')) + '<input name="topic" maxlength="60" value="' + esc(val('topic', f ? f.topic : '')) + '"></label>';
      if (mode === 'edit') h += '<label>' + esc(CT.t('fFolder')) + '<select name="folderId">' + folderOptions(f.folderId || '') + '</select></label>';
      h += '<label class="chk" id="pubLbl" style="display:flex;gap:8px;align-items:flex-start"><input type="checkbox" name="publicToAll"' + (val('publicToAll', f && f.isPublic) ? ' checked' : '') + '><span>' + esc(CT.t('fPublic')) + '<small class="hint" style="display:block">' + esc(CT.t('fPublicHint')) + '</small></span></label>';
    }
    $('formFields').innerHTML = h; $('formErr').hidden = true; $('prog').hidden = true; $('formSave').disabled = false; $('formSave').textContent = CT.t('save');
    (function () { // 금액 자료(예산 분류)는 월코 팀 전체 공개로 할 수 없다
      var c = $('formFields').querySelector('[name=category]'), pub = $('formFields').querySelector('[name=publicToAll]'); if (!c || !pub) return;
      var sync = function () { var lock = c.value === 'budget'; if (lock) pub.checked = false; pub.disabled = lock; }; c.addEventListener('change', sync); sync();
    })();
    if (addMode) wireAdd(mode);
    $('detail').close(); if (!dlg.open) dlg.showModal();
  }
  /* 링크 주소를 붙여 넣으면 어떤 문서인지 알려 준다 (서버의 linkKindFor 와 같은 기준) */
  function linkKindOf(url) {
    var u; try { u = new URL(url); } catch (e) { return ''; } if (u.protocol !== 'https:') return '';
    var h = u.hostname.toLowerCase(), p = u.pathname;
    if (h === 'docs.google.com') return p.indexOf('/document') === 0 ? 'googledoc' : p.indexOf('/spreadsheets') === 0 ? 'googlesheet' : p.indexOf('/presentation') === 0 ? 'googleslide' : p.indexOf('/forms') === 0 ? 'googleform' : 'other';
    if (h === 'drive.google.com') return 'drive';
    if (h === 'canva.com' || /\.canva\.com$/.test(h) || h === 'canva.link') return 'canva';
    return 'other';
  }
  function wireAdd(mode) {
    $('addTabs').onclick = function (e) { var b = e.target.closest('[data-tab]'); if (!b || b.dataset.tab === mode) return; openForm(b.dataset.tab, null, readCommon()); };
    var u = $('urlIn'); if (u) { var show = function () { var k = linkKindOf(u.value.trim()); $('urlKind').textContent = k ? CT.t('linkOk') + CT.t(k) : ''; }; u.oninput = show; show(); }
    if (mode !== 'file') return;
    $('pkFiles').onclick = function () { $('pkFilesIn').click(); }; $('pkDir').onclick = function () { $('pkDirIn').click(); };
    $('pkFilesIn').onchange = function () { setPick(fromFileList(this.files, false)); this.value = ''; };
    $('pkDirIn').onchange = function () { setPick(fromFileList(this.files, true)); this.value = ''; };
    $('mGroup').onchange = function () { S.pick.group = this.checked; renderPick(); };
    $('mRows').addEventListener('input', function (e) { var i = e.target.dataset.i; if (i != null && S.pick.items[i]) { S.pick.items[i].title = e.target.value; S.pick.items[i].dirty = true; } });
    $('mRows').addEventListener('change', function (e) {
      if (e.target.id === 'mPubAll') { S.pick.items.forEach(function (x) { x.pub = e.target.checked; }); renderPick(); }
      else if (e.target.dataset.pub != null && S.pick.items[e.target.dataset.pub]) { S.pick.items[e.target.dataset.pub].pub = e.target.checked; renderPick(); }
    });
    var catSel = $('formFields').querySelector('[name=category]'); if (catSel) catSel.addEventListener('change', function () { if (S.pick) renderPick(); });
    $('mRows').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; S.pick.items.splice(+b.dataset.rm, 1); if (!S.pick.items.length) S.pick = null; renderPick(); });
    $('mFolderName').oninput = function () { S.pick.nameDirty = true; }; $('mFolderEn').oninput = function () { S.pick.enDirty = true; };
    wireAi(); renderPick();
  }
  /* ---- AI 도우미: 파일 내용을 읽고 제목·설명·종류·주제·캠프를 **제안**한다 (저장은 직접 누른다) ---- */
  var aiState = { token: 0, configured: null, titleDirty: false };
  function aiOn() { try { return localStorage.getItem('ct-ai-files') === '1'; } catch (e) { return false; } }
  function aiBoxHtml() {
    return '<div class="aibox" id="aiBox"><label class="aisw"><input type="checkbox" id="aiOn"><span>' + esc(CT.t('aiTitle')) + ' — ' + esc(CT.t('aiSwitch')) + '</span></label><div class="hint">' + esc(CT.t('aiNote')) + '</div>' +
      '<div class="aibar"><button type="button" class="btn sm" id="aiGo">' + esc(CT.t('aiGo')) + '</button><span class="hint" id="aiMsg"></span></div><div id="aiTitles"></div></div>';
  }
  function markAi(el) { var lab = el && el.closest('label'); if (lab && !lab.querySelector('.aichip')) lab.insertAdjacentHTML('afterbegin', '<span class="aichip">' + esc(CT.t('aiChip')) + '</span>'); }
  function wireAi() {
    var box = $('aiBox'); if (!box) return; $('aiOn').checked = aiOn();
    $('aiOn').onchange = function () { try { localStorage.setItem('ct-ai-files', this.checked ? '1' : '0'); } catch (e) {} if (this.checked && S.pick && !isMulti()) runAi(); };
    $('aiGo').onclick = function () { runAi(); };
    var root = $('formFields'); // 직접 고친 칸은 「AI」 표시를 지우고, 이후 추천이 덮어쓰지 않는다
    root.addEventListener('input', function (e) { if (!e.isTrusted) return; var lab = e.target.closest('label'); if (lab) { var c = lab.querySelector('.aichip'); if (c) c.remove(); } if (e.target.name === 'title') aiState.titleDirty = true; });
    root.addEventListener('change', function (e) { if (!e.isTrusted) return; var lab = e.target.closest('label'); if (lab) { var c = lab.querySelector('.aichip'); if (c) c.remove(); } });
    $('aiTitles').addEventListener('click', function (e) { var b = e.target.closest('[data-aitext]'); if (!b) return; var t = root.querySelector('[name=title]'); t.value = b.dataset.aitext; aiState.titleDirty = true; markAi(t); });
    aiState.titleDirty = false;
    if (aiState.configured === null) CT.api('/api/campteam/ai-suggest').then(function (r) { aiState.configured = !!r.configured; if (!aiState.configured && $('aiMsg')) { $('aiMsg').textContent = CT.t('aiOffMsg'); $('aiGo').disabled = true; } }).catch(function () { aiState.configured = null; });
    else if (!aiState.configured) { $('aiMsg').textContent = CT.t('aiOffMsg'); $('aiGo').disabled = true; }
  }
  async function runAi() {
    var p = S.pick, msg = $('aiMsg'); if (!msg) return;
    if (!p || !p.items.length || isMulti()) { msg.textContent = CT.t('aiNeedFile'); return; }
    var root = $('formFields'), cat = root.querySelector('[name=category]');
    if (cat && cat.value === 'budget') { msg.textContent = CT.t('aiBudget'); return; }
    var token = ++aiState.token, file = p.items[0].file; $('aiGo').disabled = true; msg.textContent = CT.t('aiBusy'); $('aiTitles').innerHTML = '';
    try {
      var prep = await window.CTDocText.prepare(file);
      var r = await CT.api('/api/campteam/ai-suggest', { method: 'POST', body: { mode: 'file', name: file.name, category: cat ? cat.value : 'etc', kind: prep.kind, text: prep.text, data: prep.data, mime: prep.mime } });
      if (token !== aiState.token || S.pick !== p) return; applyAi(r.suggestion, prep.kind === 'none'); 
    } catch (e) { if (token !== aiState.token) return; msg.textContent = CT.t('aiFail') + e.message; }
    finally { if ($('aiGo') && token === aiState.token) $('aiGo').disabled = aiState.configured === false; }
  }
  function applyAi(s, nameOnly) {
    var root = $('formFields'), f = function (n) { return root.querySelector('[name=' + n + ']'); }, t = f('title'), ko = [], en = [];
    (s.titles || []).forEach(function (x) { if (x.ko) ko.push(x.ko); if (x.en) en.push(x.en); });
    var chips = function (label, list) { return list.length ? '<div class="aititles"><small>' + esc(label) + '</small>' + list.map(function (x) { return '<button type="button" class="aichipbtn" data-aitext="' + esc(x) + '">' + esc(x) + '</button>'; }).join('') + '</div>' : ''; };
    $('aiTitles').innerHTML = chips(CT.t('aiKoRow'), ko) + chips(CT.t('aiEnRow'), en);
    if (t && !aiState.titleDirty && (ko[0] || en[0])) { t.value = ko[0] || en[0]; markAi(t); }
    var d = f('description'); if (d && !d.value && s.description) { d.value = s.description; markAi(d); }
    var tp = f('topic'); if (tp && !tp.value && s.topic) { tp.value = s.topic; markAi(tp); }
    var cat = f('category'); if (cat && cat.value === 'etc' && s.category && [].some.call(cat.options, function (o) { return o.value === s.category; })) { cat.value = s.category; cat.dispatchEvent(new Event('change')); markAi(cat); }
    var tg = f('target'), campLine = ''; if (tg && !tg.value && s.campId && [].some.call(tg.options, function (o) { return o.value === 'camp:' + s.campId; })) { tg.value = 'camp:' + s.campId; markAi(tg); var o = tg.options[tg.selectedIndex]; campLine = ' ' + CT.t('aiCamp') + o.textContent + (s.campReason ? ' (' + s.campReason + ')' : ''); }
    $('aiMsg').textContent = CT.t('aiDone') + campLine + (nameOnly ? ' ' + CT.t('aiNoRead') : '');
  }
  /* ---- 고른 파일/폴더 목록 ---- */
  function fromFileList(list, asFolder) { // 파일 고르기 창 / 폴더 고르기 창에서 온 목록 → { items, folder }
    var items = [], folder = '', skipped = 0;
    [].forEach.call(list || [], function (f) {
      var rel = asFolder && f.webkitRelativePath ? f.webkitRelativePath : f.name, parts = rel.split('/');
      if (!f.size || HIDDEN.test(rel)) { skipped++; return; }
      if (asFolder && parts.length > 1) { folder = folder || parts[0]; items.push({ file: f, dir: parts.slice(1, -1).join('/') }); } else items.push({ file: f, dir: '' });
    });
    return { items: items, folder: asFolder ? folder : '', skipped: skipped };
  }
  function setPick(r) {
    if (!r || !r.items.length) { S.pick = null; renderPick(r && r.skipped); return; }
    var over = r.items.length > MAX_PICK; if (over) r.items = r.items.slice(0, MAX_PICK);
    S.pick = { items: r.items.map(function (x) { return { file: x.file, dir: x.dir || '', title: (x.dir ? x.dir + ' / ' : '') + tidy(x.file.name), dirty: false, pub: false }; }), folder: r.folder || '', group: !!r.folder, folderId: '', name: r.folder || '', nameEn: '', nameDirty: false, enDirty: false, note: (r.skipped ? CT.t('mSkipped') + r.skipped + ' ' : '') + (over ? CT.t('mTooMany') : '') };
    renderPick(); if (S.pick.items.length > 1 || S.pick.folder) askNames(); else if (aiOn()) runAi();
  }
  function isMulti() { return !!S.pick && (S.pick.items.length > 1 || !!S.pick.folder); }
  function renderPick() {
    if (!$('pkSum')) return; var p = S.pick;
    $('pkSum').textContent = p ? p.items.length + CT.t('mSel') + (p.items.length === 1 ? ' — ' + p.items[0].file.name + ' (' + fmtSize(p.items[0].file.size) + ')' : '') + (p.note ? ' · ' + p.note : '') : '';
    var multi = isMulti(); if ($('aiBox')) $('aiBox').hidden = multi; $('multi').hidden = !multi; $('titleLbl').hidden = multi; if ($('pubLbl')) $('pubLbl').hidden = multi; // 여러 개일 때는 파일마다 공개 칸이 있다
    if (!multi) return;
    var cat = $('formFields').querySelector('[name=category]'), locked = !!cat && cat.value === 'budget'; // 금액 자료는 공개할 수 없다
    if (locked) p.items.forEach(function (x) { x.pub = false; });
    $('mGroupRow').hidden = !!p.folder; $('mGroup').checked = !!p.group; $('mFolder').hidden = !p.group;
    if (document.activeElement !== $('mFolderName')) $('mFolderName').value = p.name; if (document.activeElement !== $('mFolderEn')) $('mFolderEn').value = p.nameEn;
    $('mAi').textContent = p.aiMsg || '';
    var all = p.items.length && p.items.every(function (x) { return x.pub; });
    $('mRows').innerHTML = '<div class="mhead"><span class="hint">' + esc(CT.t('mTitles')) + '</span><label class="mpub"><input type="checkbox" id="mPubAll"' + (all ? ' checked' : '') + (locked ? ' disabled' : '') + '><span>' + esc(CT.t('mPubAll')) + '</span></label></div><div class="hint">' + esc(CT.t('mPubHint')) + '</div>' + p.items.map(function (x, i) {
      return '<div class="mrow"><input data-i="' + i + '" maxlength="120" value="' + esc(x.title) + '"><label class="mpub" title="' + esc(CT.t('mPubHint')) + '"><input type="checkbox" data-pub="' + i + '"' + (x.pub ? ' checked' : '') + (locked ? ' disabled' : '') + '><span>' + esc(CT.t('mPub')) + '</span></label><button type="button" class="btn sm" data-rm="' + i + '">' + esc(CT.t('mRemove')) + '</button><small>' + esc((x.dir ? x.dir + '/' : '') + x.file.name) + ' · ' + fmtSize(x.file.size) + '</small></div>'; }).join('');
  }
  async function askNames() { // AI(없으면 기본 정리)가 폴더·파일 이름을 제안한다 — 직접 고친 칸은 건드리지 않는다
    var p = S.pick; if (!p) return; var cat = $('formFields').querySelector('[name=category]');
    p.aiMsg = CT.t('mAiBusy') + ' ' + CT.t('mAiNote'); renderPick();
    try {
      var r = await CT.api('/api/campteam/file-names', { method: 'POST', body: { folderName: p.folder, category: cat ? cat.value : 'etc', files: p.items.map(function (x) { return { name: x.file.name, dir: x.dir }; }) } });
      if (S.pick !== p) return;
      p.items.forEach(function (x, i) { if (!x.dirty && r.titles && r.titles[i]) x.title = (x.dir ? x.dir + ' / ' : '') + r.titles[i]; });
      if (r.folder) { if (!p.nameDirty && r.folder.name) p.name = r.folder.name; if (!p.enDirty && r.folder.nameEn) p.nameEn = r.folder.nameEn; }
      p.aiMsg = (r.ai ? CT.t('mAiDone') : CT.t('mAiOff')) + ' ' + CT.t('mAiNote');
    } catch (e) { if (S.pick !== p) return; p.aiMsg = CT.t('mAiOff'); }
    renderPick();
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
    $('formErr').hidden = true; $('formSave').disabled = true; var folderGo = '';
    try {
      var t = parseTarget(v('target'));
      if (mode === 'link') {
        await CT.api('/api/campteam/files', { method: 'POST', body: { title: v('title'), description: v('description'), externalUrl: v('externalUrl'), campId: t.campId || null, typeId: t.typeId || null, category: v('category'), topic: v('topic'), status: v('status'), publicToAll: !!fd.get('publicToAll') } });
      } else if (mode === 'edit') {
        var body = { title: v('title'), description: v('description'), campId: t.campId || null, typeId: t.typeId || null, category: v('category'), topic: v('topic'), status: v('status'), publicToAll: !!fd.get('publicToAll') };
        if ('externalUrl' in Object.fromEntries(fd.entries())) body.externalUrl = v('externalUrl');
        if (fd.has('folderId')) body.folderId = v('folderId');
        await CT.api('/api/campteam/files?id=' + encodeURIComponent(id), { method: 'PATCH', body: body });
      } else if (mode === 'file' && S.pick && isMulti()) {
        folderGo = await uploadPick(v, t, !!fd.get('publicToAll')); if (folderGo === false) { $('formSave').disabled = false; $('formSave').textContent = CT.t('save'); return; }
      } else {
        var file = mode === 'file' ? (S.pick && S.pick.items[0] && S.pick.items[0].file) : fd.get('file'); if (!file || !file.size) throw new Error(CT.t('needFile'));
        var q = new URLSearchParams();
        if (mode === 'version') { q.set('fileId', id); if (v('note')) q.set('note', v('note')); }
        else { ['title', 'description', 'category', 'topic', 'status'].forEach(function (k) { if (v(k)) q.set(k, v(k)); }); if (t.campId) q.set('campId', t.campId); if (t.typeId) q.set('typeId', t.typeId); if (fd.get('publicToAll')) q.set('publicToAll', '1'); }
        $('prog').hidden = false; $('formSave').textContent = CT.t('uploading');
        await xhrUpload(file, q, function (r) { $('prog').firstElementChild.style.width = Math.round(r * 100) + '%'; });
      }
      dlg.close(); S.pick = null; if (folderGo) { S.view = 'folders'; S.folderId = folderGo; } await loadList(); if (mode !== 'file' && mode !== 'link') showDetail(id);
    } catch (e) { $('formErr').textContent = e.message; $('formErr').hidden = false; }
    $('formSave').disabled = false; $('formSave').textContent = CT.t('save');
  }
  /* 여러 파일 / 폴더 올리기: (폴더면 먼저 만들고) 파일마다 따로 저장. 실패한 파일만 목록에 남긴다. 반환: 새 폴더 id('' = 폴더 없음), 실패가 남으면 false */
  async function uploadPick(v, t, pub) {
    var p = S.pick, wantFolder = !!(p.folder || p.group), fails = [], done = 0, total = p.items.length;
    if (wantFolder && !p.folderId) {
      var nm = ($('mFolderName').value || '').trim(); if (!nm) throw new Error(CT.t('mNeedFolder'));
      p.folderId = (await CT.api('/api/campteam/folders', { method: 'POST', body: { name: nm, nameEn: ($('mFolderEn').value || '').trim(), campId: t.campId || null, typeId: t.typeId || null } })).id;
    }
    $('prog').hidden = false;
    var items = p.items.slice();
    for (var i = 0; i < items.length; i++) {
      var x = items[i]; $('formSave').textContent = CT.t('uploading') + ' ' + (i + 1) + '/' + total;
      var q = new URLSearchParams(); q.set('title', (x.title || '').trim() || tidy(x.file.name));
      ['description', 'category', 'topic', 'status'].forEach(function (k) { if (v(k)) q.set(k, v(k)); });
      if (t.campId) q.set('campId', t.campId); if (t.typeId) q.set('typeId', t.typeId); if (x.pub) q.set('publicToAll', '1'); if (p.folderId) q.set('folderId', p.folderId);
      try { await xhrUpload(x.file, q, function (r) { $('prog').firstElementChild.style.width = Math.round(((i + r) / total) * 100) + '%'; }); done++; }
      catch (e) { fails.push(x); x.err = e.message; }
    }
    if (!fails.length) return p.folderId || '';
    p.items = fails; p.group = true; renderPick(); await loadList();
    $('formErr').textContent = CT.t('mFail') + ': ' + fails.map(function (x) { return x.file.name + ' — ' + x.err; }).join(', '); $('formErr').hidden = false;
    return false;
  }

  // ── 끌어다 놓기 업로드: 넓은 영역 + 화면 어디에 놓아도 됨. 파일은 바로 올리고, 폴더는 이름을 확인하는 창을 먼저 연다 ──
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
  function openAddWith(r) { openForm('file'); setPick(r); }
  /* 끌어다 놓은 폴더 안을 끝까지 읽는다 (브라우저 API 는 폴더 항목을 놓는 순간에만 읽을 수 있어서, 항목은 먼저 한꺼번에 꺼내 둔다) */
  function readDir(dir) { // 폴더 안 항목을 모두 (100개씩 끊어 주는 API 라서 빌 때까지 반복)
    return new Promise(function (resolve) {
      var rd = dir.createReader(), all = []; (function more() { rd.readEntries(function (b) { if (!b.length) resolve(all); else { all = all.concat([].slice.call(b)); more(); } }, function () { resolve(all); }); })();
    });
  }
  async function walk(entry, path, out) {
    if (out.length >= MAX_PICK + 50) return;
    if (entry.isFile) { var f = await new Promise(function (res) { entry.file(res, function () { res(null); }); }); if (f) out.push({ file: f, path: path + entry.name }); return; }
    if (entry.isDirectory) { var kids = await readDir(entry); for (var i = 0; i < kids.length; i++) await walk(kids[i], path + entry.name + '/', out); }
  }
  async function collectDropped(entries) {
    var out = [], dirs = entries.filter(function (e) { return e.isDirectory; }), loose = entries.filter(function (e) { return e.isFile; });
    for (var i = 0; i < entries.length; i++) await walk(entries[i], '', out);
    var items = [], folder = '', skipped = 0, single = dirs.length === 1 && !loose.length;
    out.forEach(function (o) {
      if (!o.file.size || HIDDEN.test(o.path)) { skipped++; return; }
      var parts = o.path.split('/'); if (single) { folder = dirs[0].name; items.push({ file: o.file, dir: parts.slice(1, -1).join('/') }); } else items.push({ file: o.file, dir: parts.slice(0, -1).join('/') });
    });
    return { items: items, folder: folder, skipped: skipped };
  }
  function wireDropzone() {
    var dz = $('dz'), depth = 0, show = function (on) { document.documentElement.classList.toggle('dz-active', on); dz.classList.toggle('over', on); };
    $('dzPick').onclick = function () { $('dzInput').click(); }; $('dzInput').onchange = function () { uploadMany(this.files); this.value = ''; };
    $('dzPickDir').onclick = function () { $('dzDirInput').click(); }; $('dzDirInput').onchange = function () { openAddWith(fromFileList(this.files, true)); this.value = ''; };
    var dialogOpen = function () { var d = $('formDlg'); return !!(d && d.open); };
    var hasFiles = function (e) { return e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], 'Files') >= 0; };
    window.addEventListener('dragenter', function (e) { if (!hasFiles(e) || !canUpload() || dialogOpen()) return; e.preventDefault(); depth++; show(true); });
    window.addEventListener('dragover', function (e) { if (!hasFiles(e) || !canUpload() || dialogOpen()) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
    window.addEventListener('dragleave', function (e) { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) show(false); });
    window.addEventListener('drop', function (e) {
      if (!hasFiles(e) || dialogOpen()) { depth = 0; show(false); return; } e.preventDefault(); depth = 0; show(false); if (!canUpload()) return;
      var items = [].slice.call(e.dataTransfer.items || []), entries = items.map(function (i) { return i.kind === 'file' && i.webkitGetAsEntry ? i.webkitGetAsEntry() : null; }).filter(Boolean);
      if (entries.some(function (en) { return en.isDirectory; })) collectDropped(entries).then(openAddWith); else uploadMany(e.dataTransfer.files);
    });
  }
  var timer = null;
  CT.pre('/api/campteam/camps'); CT.pre('/api/campteam/files?');
  CT.boot(async function () {
    try { S.types = (await CT.api('/api/campteam/camps')).types; await loadList(); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    filterOptions(); CT.applyI18n(); filterOptions(); renderList();
    var up = new URLSearchParams(location.search); // 다른 화면에서 /portal/campteam/files/?category=budget 처럼 열 수 있다
    if (up.get('category')) $('fcat').value = up.get('category'); if (up.get('campId')) $('fcamp').value = 'camp:' + up.get('campId'); if (up.get('typeId')) $('fcamp').value = 'type:' + up.get('typeId'); if (up.get('folderId')) { S.view = 'folders'; S.folderId = up.get('folderId'); }
    if (up.get('category') || up.get('campId') || up.get('typeId') || up.get('folderId')) await loadList();
    ['fcamp', 'fcat', 'fstatus', 'fkind', 'fsort'].forEach(function (id) { $(id).onchange = loadList; });
    $('fq').oninput = function () { clearTimeout(timer); timer = setTimeout(loadList, 250); };
    $('addFile').onclick = function () { S.pick = null; openForm('file'); };
    $('dz').hidden = !canAdd(); wireDropzone();
    $('formCancel').onclick = function () { $('formDlg').close(); S.pick = null; };
    $('formDlg').addEventListener('close', function () { if ($('formDlg').dataset.mode === 'file') S.pick = null; });
    $('form').onsubmit = submitForm;
    $('list').addEventListener('click', function (e) {
      var o = e.target.closest('[data-open]'), d = e.target.closest('[data-dl]');
      if (o) showDetail(o.dataset.open); else if (d) download(d.dataset.dl);
    });
    $('viewBar').addEventListener('click', function (e) { var b = e.target.closest('[data-view]'); if (!b) return; S.view = b.dataset.view; S.folderId = ''; try { localStorage.setItem('ct-files-view', S.view); } catch (x) {} loadList(); });
    $('folders').addEventListener('click', onFolderClick);
    document.addEventListener('ct-lang', function () { CT.applyI18n(); filterOptions(); renderList(); });
  });
})();
