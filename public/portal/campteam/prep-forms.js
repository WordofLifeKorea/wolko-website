/* 캠프 준비 「신청서」 탭 — 다음 캠프의 신청서·스태프/크루 지원서를 포털 안에서 만들고, 작성(Ella) → 검토(Jason) → 최종 승인(Aiden) 세 단계를 거쳐 「승인 완료」로 보관한다.
   홈페이지와는 연결되어 있지 않다(여기서 만든 것은 포털 안에만 있다). 새로 만들 때는 같은 종류·유형의 가장 최근 신청서를 복사해서 시작하고, 필요한 부분만 고친다. */
(function () {
  var P = window.CTPrep; if (!P) return;
  CT.addDict({
    ko: { fLabel: '신청서', fIntro: '다음 캠프의 신청서와 스태프·크루 지원서를 여기서 만들어요. 작성 → 검토 → 최종 승인을 모두 거치면 「승인 완료」로 보관돼요. 홈페이지에는 연결되어 있지 않아요(지금 올라가 있는 신청서는 그대로예요).',
      fNew: '+ 새 신청서', fRoles: '역할 정하기', fNone: '아직 만든 신청서가 없어요.', fBack: '← 목록', fKindCamper: '캠프 신청서', fKindStaff: '스태프·크루 지원서',
      fStDraft: '작성 중', fStReview: '검토 중', fStFinal: '최종 승인 대기', fStApproved: '승인 완료', fStep1: '작성', fStep2: '검토', fStep3: '최종 승인', fStep4: '승인 완료',
      roleEditor: '작성', roleReviewer: '검토', roleApprover: '최종 승인', fNoRole: '(정해지지 않음)', fRolesHint: '작성은 내용을 쓰고 고치는 사람, 검토는 모두 승인해야 다음으로 가는 사람, 최종 승인은 마지막에 디자인을 확인하는 사람이에요. 세 단계를 모두 거쳐야 승인 완료가 돼요.',
      fKindL: '종류', fTypeL: '캠프 유형', fFromL: '이 신청서를 복사해서 시작', fFromAuto: '가장 최근 같은 종류·유형의 신청서(자동)', fCardL: '카드 내용을 가져올 지난 캠프', fCardNone: '가져오지 않음',
      tEnglish: '영어캠프', tUnion: '연합캠프', tJeju: '제주캠프', tOther: '기타', fCopied: function (t) { return '「' + t + '」를 복사해서 시작했어요. 필요한 부분만 고쳐 주세요.'; }, fStarter: '기본 양식으로 시작했어요(같은 종류의 지난 신청서가 없어요).',
      fTitleL: '신청서 이름(목록에서 보는 이름)', fSecInfo: '1. 카드 안내', fSecBlocks: '2. 받을 정보와 동의', fSecThanks: '3. 신청 뒤 감사 문구', fPrevBtn: '미리보기', fSave: '저장', fSaved: '저장했어요', fSubmit: '검토 요청', fWithdraw: '거두기(작성 중으로)', fDelete: '지우기', fDup: '복사해서 새로 만들기',
      fApprove: '승인', fApproveFinal: '최종 승인', fReturn: '되돌리기', fReturnWhy: '되돌리는 이유를 한 줄 적어 주세요', fConfirmSubmit: '검토를 요청할까요? 요청한 뒤에는 고칠 수 없고, 되돌려 받아야 고칠 수 있어요.', fDelConfirm: '이 신청서를 지울까요?',
      fFrom: '지난 캠프 카드에서 가져오기', fPick: '고르기…', fPickGo: '가져오기', fCardHint: '아래 칸을 직접 고쳐도 돼요. 영어 칸은 비워 두면 한국어가 그대로 보여요.',
      cTitle: '이름', cDate: '일정', cTarget: '대상', cPrice: '참가비', cDeadline: '신청 기간', cNotes: '안내 글', cPhone: '문의 전화', cEmail: '문의 이메일', ko: '한국어', en: '영어',
      fAddBlock: '+ 칸 추가', fAddPick: '자주 쓰는 칸 / 새 칸 고르기', fGrpBasic: '기본 정보', fGrpSafety: '보호자·안전', fGrpConsent: '동의', fGrpStaff: '스태프·크루', fGrpBlank: '빈 칸 만들기',
      bText: '글 한 줄', bTextarea: '긴 글', bPhone: '전화번호', bEmail: '이메일', bDate: '날짜', bSelect: '고르기(목록)', bRadio: '하나만 고르기', bCheckbox: '여러 개 고르기', bConsent: '동의 체크', bHeading: '제목', bParagraph: '안내 글',
      fLabelL: '이름(질문)', fHelpL: '작은 설명', fReq: '꼭 입력', fOptsL: '선택지 (한 줄에 하나, 「한국어 | English」)', fUp: '위로', fDown: '아래로', fEdit: '고치기', fRemove: '빼기', fDone: '닫기',
      fTimeline: '진행 기록', fWaiting: '승인을 기다리는 사람', fApproved: '승인함', fReturned: '되돌림', fLockNote: '검토 중이거나 승인된 신청서는 고칠 수 없어요. 고치려면 「거두기」 또는 「복사해서 새로 만들기」를 쓰세요.',
      fPrevNote: '미리보기예요 — 보내기는 되지 않고, 저장되지 않아요.', fPrevOnPage: '홈페이지에서는 이렇게 보이도록 만든 모양이에요(아직 홈페이지에는 올라가지 않아요).', fRoleNeed: '먼저 「역할 정하기」에서 작성·검토·최종 승인 담당을 정해 주세요(관리자).', fMine: '내 차례예요' },
    en: { fLabel: 'Forms', fIntro: 'Create the application form and the staff/crew form for the next camp here. After Write → Review → Final approval it is kept as "Approved". It is not connected to the website (existing forms stay as they are).',
      fNew: '+ New form', fRoles: 'Set roles', fNone: 'No forms yet.', fBack: '← List', fKindCamper: 'Camp application', fKindStaff: 'Staff / crew application',
      fStDraft: 'Draft', fStReview: 'In review', fStFinal: 'Awaiting final approval', fStApproved: 'Approved', fStep1: 'Write', fStep2: 'Review', fStep3: 'Final approval', fStep4: 'Approved',
      roleEditor: 'Writer', roleReviewer: 'Reviewer', roleApprover: 'Final approver', fNoRole: '(not set)', fRolesHint: 'The writer fills in and edits; reviewers must all approve; the final approver checks the design last. All three steps are needed for "Approved".',
      fKindL: 'Kind', fTypeL: 'Camp type', fFromL: 'Start as a copy of', fFromAuto: 'Most recent form of the same kind and type (automatic)', fCardL: 'Past camp to take card text from', fCardNone: 'None',
      tEnglish: 'English camp', tUnion: 'Unity camp', tJeju: 'Jeju camp', tOther: 'Other', fCopied: function (t) { return 'Started as a copy of "' + t + '". Edit only what changes.'; }, fStarter: 'Started from the basic template (no earlier form of this kind).',
      fTitleL: 'Form name (as shown in the list)', fSecInfo: '1. Card info', fSecBlocks: '2. Information and consents to collect', fSecThanks: '3. Thank-you message after applying', fPrevBtn: 'Preview', fSave: 'Save', fSaved: 'Saved', fSubmit: 'Request review', fWithdraw: 'Withdraw (back to draft)', fDelete: 'Delete', fDup: 'Copy as a new form',
      fApprove: 'Approve', fApproveFinal: 'Final approve', fReturn: 'Send back', fReturnWhy: 'Write one line on why you are sending it back', fConfirmSubmit: 'Request review? You cannot edit while it is in review unless it is sent back.', fDelConfirm: 'Delete this form?',
      fFrom: 'Take from a past camp card', fPick: 'Pick…', fPickGo: 'Take', fCardHint: 'You can edit the boxes below. If an English box is empty, the Korean text shows.',
      cTitle: 'Title', cDate: 'Dates', cTarget: 'For', cPrice: 'Fee', cDeadline: 'Registration period', cNotes: 'Notes', cPhone: 'Contact phone', cEmail: 'Contact email', ko: 'Korean', en: 'English',
      fAddBlock: '+ Add item', fAddPick: 'Pick a common item or a new one', fGrpBasic: 'Basics', fGrpSafety: 'Guardian / safety', fGrpConsent: 'Consents', fGrpStaff: 'Staff / crew', fGrpBlank: 'Blank item',
      bText: 'One-line text', bTextarea: 'Long text', bPhone: 'Phone', bEmail: 'Email', bDate: 'Date', bSelect: 'Dropdown', bRadio: 'Choose one', bCheckbox: 'Choose many', bConsent: 'Consent checkbox', bHeading: 'Heading', bParagraph: 'Paragraph',
      fLabelL: 'Question', fHelpL: 'Small help text', fReq: 'Required', fOptsL: 'Options (one per line, "Korean | English")', fUp: 'Up', fDown: 'Down', fEdit: 'Edit', fRemove: 'Remove', fDone: 'Close',
      fTimeline: 'History', fWaiting: 'Waiting for', fApproved: 'approved', fReturned: 'sent back', fLockNote: 'Forms in review or approved cannot be edited. Use "Withdraw" or "Copy as a new form".',
      fPrevNote: 'Preview — nothing is sent or saved.', fPrevOnPage: 'This is how the form is designed to look (it is not on the website).', fRoleNeed: 'First set the writer, reviewers and final approver in "Set roles" (admin).', fMine: 'Your turn' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = P.esc, api = P.api, URL0 = '/api/campteam/camp-forms';
  var X = { id: '', d: null, c: null, open: -1, meta: null, seeds: null, preLang: 'ko' };
  var ST = { draft: 'fStDraft', review: 'fStReview', final: 'fStFinal', approved: 'fStApproved' }, STEP = { draft: 0, review: 1, final: 2, approved: 3 };
  var BT = { text: 'bText', textarea: 'bTextarea', phone: 'bPhone', email: 'bEmail', date: 'bDate', select: 'bSelect', radio: 'bRadio', checkbox: 'bCheckbox', consent: 'bConsent', heading: 'bHeading', paragraph: 'bParagraph' };
  var TY = { english: 'tEnglish', union: 'tUnion', jeju: 'tJeju', other: 'tOther' }, CHOICE = ['select', 'radio', 'checkbox'];
  var who = function (list) { return list && list.length ? list.map(function (x) { return esc(x.name); }).join(', ') : '<i>' + esc(CT.t('fNoRole')) + '</i>'; };
  var date = function (s) { return String(s || '').slice(0, 10); };
  var chip = function (st) { return '<span class="chip fm-st ' + st + '">' + esc(CT.t(ST[st])) + '</span>'; };
  function stepper(st) { var i = STEP[st], names = ['fStep1', 'fStep2', 'fStep3', 'fStep4']; return '<ol class="fm-steps">' + names.map(function (n, k) { return '<li class="' + (k < i ? 'done' : k === i ? 'now' : '') + '">' + esc(CT.t(n)) + '</li>'; }).join('') + '</ol>'; }
  var canEdit = function (me) { return me.admin || me.editor; };

  /* ---------- 목록 ---------- */
  async function load() {
    var v = $('pView'); v.innerHTML = '<p class="hint">…</p>';
    try { if (!X.meta) X.meta = await CT.api(URL0 + '?meta=1'); var q = new URLSearchParams(location.search).get('form'); if (q && !X.id && !X.asked) { X.asked = 1; X.id = q; } if (X.id) await openForm(X.id); else await showList(); }
    catch (e) { v.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
  }
  async function showList() {
    X.id = ''; var d = await CT.api(URL0), me = d.me, r = d.roles;
    var h = '<p class="hint">' + esc(CT.t('fIntro')) + '</p><div class="fm-roles">' + ['editor', 'reviewer', 'approver'].map(function (k) { return '<span class="chip">' + esc(CT.t('role' + k.charAt(0).toUpperCase() + k.slice(1))) + ': ' + who(r[k]) + '</span>'; }).join(' ') + '</div>';
    if (!r.reviewer.length || !r.approver.length || !r.editor.length) h += '<div class="hint fm-warn">' + esc(CT.t('fRoleNeed')) + '</div>';
    h += '<div class="p-bar">' + (canEdit(me) ? '<button class="btn pri" id="fNew">' + esc(CT.t('fNew')) + '</button> ' : '') + (me.admin ? '<button class="btn" id="fRoles">' + esc(CT.t('fRoles')) + '</button>' : '') + '</div>';
    h += d.items.map(function (f) {
      var mine = (f.status === 'review' && me.reviewer) || (f.status === 'final' && me.approver);
      return '<div class="card fm-item" data-open="' + esc(f.id) + '"><div class="p-row"><span class="p-main"><b>' + esc(f.title) + '</b> ' + chip(f.status) + (mine ? ' <span class="chip ok">' + esc(CT.t('fMine')) + '</span>' : '') + '<small>' + esc(CT.t(f.kind === 'staff' ? 'fKindStaff' : 'fKindCamper')) + ' · ' + esc(CT.t(TY[f.campType] || 'tOther')) + ' · ' + esc(date(f.updatedAt)) + '</small></span><span class="p-act"><button class="btn sm" data-open="' + esc(f.id) + '">' + esc(CT.t('fEdit')) + '</button></span></div></div>';
    }).join('') || '<div class="empty">' + esc(CT.t('fNone')) + '</div>';
    $('pView').innerHTML = h;
    if ($('fNew')) $('fNew').onclick = function () { newDlg(d.items); }; if ($('fRoles')) $('fRoles').onclick = rolesDlg;
    $('pView').onclick = function (e) { var o = e.target.closest('[data-open]'); if (o) openForm(o.dataset.open); };
  }
  async function seeds() { if (X.seeds) return X.seeds; try { X.seeds = (await (await fetch('/portal/campteam/portal-camps.json', { cache: 'no-store' })).json()).items || []; } catch (e) { X.seeds = []; } return X.seeds; }
  async function newDlg(items) {
    var sd = await seeds();
    P.dialog(CT.t('fNew'), [
      { n: 'kind', l: 'fKindL', t: 'select', o: [['camper', CT.t('fKindCamper')], ['staff', CT.t('fKindStaff')]] },
      { n: 'campType', l: 'fTypeL', t: 'select', o: ['english', 'union', 'jeju', 'other'].map(function (k) { return [k, CT.t(TY[k])]; }) },
      { n: 'copyFrom', l: 'fFromL', t: 'select', o: [['', CT.t('fFromAuto')]].concat(items.map(function (f) { return [f.id, f.title + ' (' + CT.t(ST[f.status]) + ')']; })) },
      { n: 'seed', l: 'fCardL', t: 'select', o: [['', CT.t('fCardNone')]].concat(sd.slice(0, 40).map(function (s) { return [s.id, s.titleKo]; })) }
    ], { kind: 'camper', campType: 'english' }, async function (o) {
      var body = { kind: o.kind, campType: o.campType }; if (o.copyFrom) body.copyFrom = o.copyFrom;
      var s = sd.filter(function (x) { return x.id === o.seed; })[0]; if (s) body.card = { titleKo: s.titleKo, titleEn: s.titleEnFull, dateKo: s.dateKo, dateEn: s.dateEn, targetKo: s.targetKo, targetEn: s.targetEn, priceKo: s.priceKo, priceEn: s.priceEn, deadlineKo: s.deadlineKo, deadlineEn: s.deadlineEn, notesKo: s.notesKo, notesEn: s.notesEn, contactPhone: s.contactPhone, contactEmail: s.contactEmail };
      var r = await api(URL0, 'POST', body); X.note = r.copiedFrom ? CT.t('fCopied')(r.copiedFrom.title) : CT.t('fStarter'); await openForm(r.id);
    });
  }
  async function rolesDlg() {
    var ppl = (await CT.api('/api/campteam/people')).people || [], d = await CT.api(URL0), r = d.roles, has = function (k, e) { return (r[k] || []).some(function (x) { return String(x.email).toLowerCase() === e; }); };
    var col = function (k) { return '<fieldset class="fm-rolecol"><legend>' + esc(CT.t('role' + k.charAt(0).toUpperCase() + k.slice(1))) + '</legend>' + ppl.map(function (p) { return '<label class="fm-chk"><input type="checkbox" data-r="' + k + '" value="' + esc(p.email) + '"' + (has(k, p.email) ? ' checked' : '') + '> ' + esc(p.name || p.email.split('@')[0]) + '</label>'; }).join('') + '</fieldset>'; };
    $('pBody').innerHTML = '<h3>' + esc(CT.t('fRoles')) + '</h3><p class="hint">' + esc(CT.t('fRolesHint')) + '</p><div class="fm-roleset">' + col('editor') + col('reviewer') + col('approver') + '</div><div class="err" id="pErr" hidden></div><div class="dlg-actions"><button class="btn" id="pCancel">' + esc(CT.t('cancel')) + '</button><button class="btn pri" id="fRoleSave">' + esc(CT.t('save')) + '</button></div>';
    $('pDlg').showModal(); $('pCancel').onclick = function () { $('pDlg').close(); };
    $('fRoleSave').onclick = async function () { var b = { editor: [], reviewer: [], approver: [] }; document.querySelectorAll('#pBody [data-r]:checked').forEach(function (c) { b[c.dataset.r].push(c.value); }); try { await api(URL0, 'PUT', b); $('pDlg').close(); showList(); } catch (e) { $('pErr').hidden = false; $('pErr').textContent = e.message; } };
  }

  /* ---------- 한 신청서 ---------- */
  async function openForm(id) {
    var d = await CT.api(URL0 + '?id=' + encodeURIComponent(id)); X.id = id; X.d = d; X.c = JSON.parse(JSON.stringify(d.form.content)); X.open = -1; renderDetail();
  }
  function history(d) {
    var f = d.form, ap = d.approvals || [], me = d.me, cur = ap.filter(function (a) { return a.current; }), r = d.roles, out = '';
    var okOf = function (stage, list) { return list.map(function (p) { var a = cur.filter(function (x) { return x.stage === stage && String(x.email).toLowerCase() === String(p.email).toLowerCase() && x.decision === 'approve'; })[0]; return '<span class="chip ' + (a ? 'ok' : '') + '">' + (a ? '✓ ' : '… ') + esc(p.name) + '</span>'; }).join(' '); };
    if (f.status === 'review') out += '<div class="fm-wait"><b>' + esc(CT.t('roleReviewer')) + '</b> ' + okOf('review', r.reviewer) + '</div>';
    if (f.status === 'final') out += '<div class="fm-wait"><b>' + esc(CT.t('roleApprover')) + '</b> ' + okOf('approve', r.approver) + '</div>';
    var log = ap.filter(function (a) { return a.decision === 'return' || !a.current || f.status === 'approved'; }).slice(-8).reverse();
    if (ap.length) out += '<details class="fm-log"><summary>' + esc(CT.t('fTimeline')) + '</summary>' + ap.slice().reverse().map(function (a) { return '<div class="fm-logrow"><small>' + esc(date(a.at)) + '</small> ' + esc(String(a.email).split('@')[0]) + ' — ' + esc(CT.t(a.decision === 'approve' ? 'fApproved' : 'fReturned')) + (a.comment ? ': ' + esc(a.comment) : '') + '</div>'; }).join('') + '</details>';
    return out;
  }
  function cardFields() {
    var c = X.c.card, row = function (k, lbl, area) { var one = function (suf, l) { var key = k + suf, v = c[key] || ''; return '<label class="fm-f">' + esc(CT.t(lbl) + ' · ' + CT.t(l)) + (area ? '<textarea rows="3" data-card="' + key + '">' + esc(v) + '</textarea>' : '<input data-card="' + key + '" value="' + esc(v) + '" maxlength="300">') + '</label>'; }; return '<div class="fm-pair">' + one('Ko', 'ko') + one('En', 'en') + '</div>'; };
    var t = function (key, lbl, ty) { return '<label class="fm-f">' + esc(CT.t(lbl)) + '<input data-card="' + key + '" value="' + esc(c[key] || '') + '" maxlength="120"></label>'; };
    var seedsOpt = (X.seeds || []).slice(0, 40).map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.titleKo) + '</option>'; }).join('');
    return '<div class="fm-seed"><label class="fm-f">' + esc(CT.t('fFrom')) + '<span><select id="fSeed"><option value="">' + esc(CT.t('fPick')) + '</option>' + seedsOpt + '</select> <button type="button" class="btn sm" id="fSeedGo">' + esc(CT.t('fPickGo')) + '</button></span></label></div><p class="hint">' + esc(CT.t('fCardHint')) + '</p>' +
      row('title', 'cTitle') + row('date', 'cDate') + row('target', 'cTarget') + row('price', 'cPrice') + row('deadline', 'cDeadline', true) + row('notes', 'cNotes', true) + '<div class="fm-pair">' + t('contactPhone', 'cPhone') + t('contactEmail', 'cEmail') + '</div>';
  }
  function blockRow(b, i, n) {
    var lab = b.label.ko || b.label.en || '—', open = X.open === i;
    var h = '<div class="fm-block' + (open ? ' open' : '') + '" data-bi="' + i + '"><div class="fm-brow"><span class="chip">' + esc(CT.t(BT[b.type])) + '</span><b class="fm-blab">' + esc(lab.length > 70 ? lab.slice(0, 70) + '…' : lab) + '</b>' + (b.required ? '<span class="chip warn">' + esc(CT.t('fReq')) + '</span>' : '') +
      '<span class="p-act"><button class="btn sm" data-bm="up"' + (i === 0 ? ' disabled' : '') + ' title="' + esc(CT.t('fUp')) + '">▲</button><button class="btn sm" data-bm="down"' + (i === n - 1 ? ' disabled' : '') + ' title="' + esc(CT.t('fDown')) + '">▼</button><button class="btn sm" data-bm="edit">' + esc(CT.t(open ? 'fDone' : 'fEdit')) + '</button><button class="btn sm danger" data-bm="del">' + esc(CT.t('fRemove')) + '</button></span></div>';
    if (open) {
      var pair = function (k, lbl, area) { return '<div class="fm-pair">' + ['ko', 'en'].map(function (l) { return '<label class="fm-f">' + esc(CT.t(lbl) + ' · ' + CT.t(l)) + (area ? '<textarea rows="3" data-bf="' + k + '.' + l + '">' + esc(b[k][l] || '') + '</textarea>' : '<input data-bf="' + k + '.' + l + '" value="' + esc(b[k][l] || '') + '" maxlength="200">') + '</label>'; }).join('') + '</div>'; };
      h += '<div class="fm-bedit">' + pair('label', b.type === 'paragraph' || b.type === 'consent' ? 'bConsent' : 'fLabelL', b.type === 'paragraph' || b.type === 'consent');
      if (b.type !== 'heading' && b.type !== 'paragraph') h += pair('help', 'fHelpL');
      if (b.type !== 'heading' && b.type !== 'paragraph') h += '<label class="fm-chk"><input type="checkbox" data-bf="required"' + (b.required ? ' checked' : '') + '> ' + esc(CT.t('fReq')) + '</label>';
      if (CHOICE.indexOf(b.type) >= 0) h += '<label class="fm-f">' + esc(CT.t('fOptsL')) + '<textarea rows="4" data-bf="options">' + esc((b.options || []).map(function (o) { return o.ko + (o.en ? ' | ' + o.en : ''); }).join('\n')) + '</textarea></label>';
      h += '</div>';
    }
    return h + '</div>';
  }
  function addMenu() {
    var groups = { basic: 'fGrpBasic', safety: 'fGrpSafety', consent: 'fGrpConsent', staff: 'fGrpStaff' }, ls = CT.lang();
    var h = '<select id="fAdd"><option value="">' + esc(CT.t('fAddPick')) + '</option>';
    Object.keys(groups).forEach(function (g) { h += '<optgroup label="' + esc(CT.t(groups[g])) + '">' + X.meta.snippets.filter(function (s) { return s.group === g; }).map(function (s) { return '<option value="s:' + esc(s.key) + '">' + esc(s.name[ls] || s.name.ko) + '</option>'; }).join('') + '</optgroup>'; });
    h += '<optgroup label="' + esc(CT.t('fGrpBlank')) + '">' + Object.keys(BT).map(function (t) { return '<option value="t:' + t + '">' + esc(CT.t(BT[t])) + '</option>'; }).join('') + '</optgroup></select>';
    return h;
  }
  function paintBlocks() { var box = $('fBlocks'); if (box) box.innerHTML = X.c.blocks.map(function (b, i) { return blockRow(b, i, X.c.blocks.length); }).join(''); }
  function renderDetail() {
    var d = X.d, f = d.form, me = d.me, st = f.status, edit = st === 'draft' && canEdit(me), v = $('pView'), r = d.roles;
    var h = '<div class="p-bar"><button class="btn" id="fBack">' + esc(CT.t('fBack')) + '</button> <button class="btn" id="fPrev">' + esc(CT.t('fPrevBtn')) + '</button></div>';
    h += '<div class="fm-head"><h3>' + esc(f.title) + '</h3> ' + chip(st) + ' <span class="chip">' + esc(CT.t(f.kind === 'staff' ? 'fKindStaff' : 'fKindCamper')) + '</span></div>' + stepper(st) + history(d);
    if (X.note) { h += '<p class="hint">' + esc(X.note) + '</p>'; X.note = ''; }
    h += '<div class="fm-actions">';
    if (edit) h += '<button class="btn pri" id="fSave">' + esc(CT.t('fSave')) + '</button> <button class="btn" id="fSubmit">' + esc(CT.t('fSubmit')) + '</button> <button class="btn danger" id="fDel">' + esc(CT.t('fDelete')) + '</button>';
    if (canEdit(me) && (st === 'review' || st === 'final')) h += '<button class="btn" id="fWithdraw">' + esc(CT.t('fWithdraw')) + '</button> ';
    if ((st === 'review' && me.reviewer) || (st === 'final' && me.approver)) h += '<button class="btn pri" id="fApprove">' + esc(CT.t(st === 'final' ? 'fApproveFinal' : 'fApprove')) + '</button> <button class="btn danger" id="fReturn">' + esc(CT.t('fReturn')) + '</button>';
    if (canEdit(me)) h += ' <button class="btn" id="fDup">' + esc(CT.t('fDup')) + '</button>';
    h += '</div><div class="err" id="fErr" hidden></div>';
    if (edit) {
      h += '<label class="fm-f">' + esc(CT.t('fTitleL')) + '<input id="fTitle" value="' + esc(f.title) + '" maxlength="120"></label><label class="fm-f">' + esc(CT.t('fTypeL')) + '<select id="fType">' + ['english', 'union', 'jeju', 'other'].map(function (k) { return '<option value="' + k + '"' + (f.campType === k ? ' selected' : '') + '>' + esc(CT.t(TY[k])) + '</option>'; }).join('') + '</select></label>';
      h += '<h4 class="fm-sec">' + esc(CT.t('fSecInfo')) + '</h4>' + cardFields() + '<h4 class="fm-sec">' + esc(CT.t('fSecBlocks')) + '</h4><div id="fBlocks"></div><div class="p-bar">' + addMenu() + '</div>' +
        '<h4 class="fm-sec">' + esc(CT.t('fSecThanks')) + '</h4><div class="fm-pair">' + ['ko', 'en'].map(function (l) { return '<label class="fm-f">' + esc(CT.t(l)) + '<textarea rows="2" data-thanks="' + l + '">' + esc((X.c.thanks || {})[l] || '') + '</textarea></label>'; }).join('') + '</div>';
    } else h += '<p class="hint">' + esc(CT.t('fLockNote')) + '</p><div id="fRead" class="fm-read"></div>';
    v.innerHTML = h; if (edit) paintBlocks(); else { var host = $('fRead'); window.WolkoForm.renderForm(host, { blocks: X.c.blocks }, CT.lang() === 'en' ? 'en' : 'ko'); host.querySelectorAll('input,select,textarea').forEach(function (x) { x.disabled = true; }); }
    bind(edit);
  }
  function setPath(o, path, val) { var p = path.split('.'); p.slice(0, -1).forEach(function (k) { o = o[k]; }); o[p[p.length - 1]] = val; }
  function parseOpts(t) { return String(t || '').split('\n').map(function (l) { var s = l.split('|'); return { ko: (s[0] || '').trim(), en: (s[1] || '').trim() }; }).filter(function (o) { return o.ko || o.en; }); }
  var err = function (m, list) { var e = $('fErr'); if (!e) return alert(m); e.hidden = false; e.innerHTML = esc(m) + (list ? '<ul>' + list.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''); e.scrollIntoView({ block: 'nearest' }); };
  async function save() { await api(URL0 + '?id=' + encodeURIComponent(X.id), 'PATCH', { title: $('fTitle').value, campType: $('fType').value, content: X.c }); }
  async function actDo(action, comment) { return api(URL0 + '?id=' + encodeURIComponent(X.id), 'POST', { action: action, comment: comment }); }
  function bind(edit) {
    $('fBack').onclick = function () { X.id = ''; load(); }; $('fPrev').onclick = preview;
    var go = function (fn) { return async function () { try { await fn(); } catch (e) { err(e.message); } }; };
    if ($('fWithdraw')) $('fWithdraw').onclick = go(async function () { await actDo('withdraw'); await openForm(X.id); });
    if ($('fApprove')) $('fApprove').onclick = go(async function () { await actDo('approve'); await openForm(X.id); });
    if ($('fReturn')) $('fReturn').onclick = go(async function () { var why = prompt(CT.t('fReturnWhy')); if (!why || !why.trim()) return; await actDo('return', why.trim()); await openForm(X.id); });
    if ($('fDup')) $('fDup').onclick = go(async function () { var r = await actDo('duplicate'); await openForm(r.id); });
    if (!edit) return;
    $('fSave').onclick = go(async function () { await save(); var e = $('fErr'); e.hidden = false; e.className = 'ok'; e.textContent = CT.t('fSaved'); setTimeout(function () { e.hidden = true; e.className = 'err'; }, 1500); });
    $('fSubmit').onclick = async function () {
      if (!confirm(CT.t('fConfirmSubmit'))) return;
      try { await save(); await actDo('submit'); await openForm(X.id); }
      catch (e) { err(e.message); }
    };
    $('fDel').onclick = go(async function () { if (!confirm(CT.t('fDelConfirm'))) return; await actDo('delete'); X.id = ''; load(); });
    var root = $('pView');
    root.oninput = function (e) {
      var t = e.target; if (t.dataset.card) X.c.card[t.dataset.card] = t.value; else if (t.dataset.thanks) { X.c.thanks = X.c.thanks || {}; X.c.thanks[t.dataset.thanks] = t.value; }
      else if (t.dataset.bf) { var bi = +t.closest('[data-bi]').dataset.bi, b = X.c.blocks[bi], k = t.dataset.bf; if (k === 'required') b.required = t.checked; else if (k === 'options') b.options = parseOpts(t.value); else setPath(b, k, t.value); var lab = t.closest('.fm-block').querySelector('.fm-blab'); if (lab) lab.textContent = b.label.ko || b.label.en || '—'; }
    };
    root.onchange = function (e) { if (e.target.dataset.bf === 'required') root.oninput(e); };
    root.onclick = async function (e) {
      var bm = e.target.closest('[data-bm]'); if (bm) { var i = +bm.closest('[data-bi]').dataset.bi, bl = X.c.blocks, m = bm.dataset.bm;
        if (m === 'edit') X.open = X.open === i ? -1 : i; else if (m === 'del') { bl.splice(i, 1); X.open = -1; } else if (m === 'up' && i > 0) { bl.splice(i - 1, 0, bl.splice(i, 1)[0]); X.open = i - 1; } else if (m === 'down' && i < bl.length - 1) { bl.splice(i + 1, 0, bl.splice(i, 1)[0]); X.open = i + 1; }
        paintBlocks(); return; }
      if (e.target.id === 'fSeedGo') { var sd = (X.seeds || []).filter(function (s) { return s.id === $('fSeed').value; })[0]; if (!sd) return; var m2 = { titleKo: sd.titleKo, titleEn: sd.titleEnFull, dateKo: sd.dateKo, dateEn: sd.dateEn, targetKo: sd.targetKo, targetEn: sd.targetEn, priceKo: sd.priceKo, priceEn: sd.priceEn, deadlineKo: sd.deadlineKo, deadlineEn: sd.deadlineEn, notesKo: sd.notesKo, notesEn: sd.notesEn, contactPhone: sd.contactPhone, contactEmail: sd.contactEmail }; Object.keys(m2).forEach(function (k) { X.c.card[k] = m2[k] || ''; }); var keep = X.open; renderDetail(); X.open = keep; }
    };
    $('fAdd').onchange = function () {
      var v = $('fAdd').value; if (!v) return; var nb;
      if (v.slice(0, 2) === 's:') { var s = X.meta.snippets.filter(function (x) { return 's:' + x.key === v; })[0]; nb = JSON.parse(JSON.stringify(s.block)); nb.help = nb.help || { ko: '', en: '' }; }
      else { var ty = v.slice(2); nb = { type: ty, label: { ko: '', en: '' }, help: { ko: '', en: '' }, required: false }; if (CHOICE.indexOf(ty) >= 0) nb.options = [{ ko: '', en: '' }, { ko: '', en: '' }].map(function (o, i) { return { ko: '선택 ' + (i + 1), en: 'Option ' + (i + 1) }; }); }
      nb.id = 'b' + Math.random().toString(36).slice(2, 10); if (nb.type === 'heading' || nb.type === 'paragraph') delete nb.required; X.c.blocks.push(nb); X.open = X.c.blocks.length - 1; $('fAdd').value = ''; paintBlocks();
    };
    seeds().then(function (s) { X.seeds = s; var sel = $('fSeed'); if (sel && sel.options.length <= 1) sel.innerHTML = '<option value="">' + esc(CT.t('fPick')) + '</option>' + s.slice(0, 40).map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.titleKo) + '</option>'; }).join(''); });
  }

  /* ---------- 미리보기: 신청하는 사람 눈에 보일 모양 ---------- */
  function preview() {
    var c = X.c, lang = X.preLang;
    $('pBody').innerHTML = '<div class="cf cf-prev"><div class="fm-prevbar"><button type="button" class="btn sm' + (lang === 'ko' ? ' pri' : '') + '" data-pl="ko">KO</button> <button type="button" class="btn sm' + (lang === 'en' ? ' pri' : '') + '" data-pl="en">EN</button> <small>' + esc(CT.t('fPrevNote')) + '</small></div><p class="hint">' + esc(CT.t('fPrevOnPage')) + '</p><div class="cf-card"><div class="cf-head"><div class="cf-badge">WORD OF LIFE KOREA</div><h1 class="cf-title" id="pvT"></h1></div><div class="cf-body"><dl class="cf-facts" id="pvF"></dl><div id="pvB"></div><button class="cf-submit" type="button" disabled id="pvS"></button></div></div><div class="dlg-actions"><button class="btn" id="pCancel">' + esc(CT.t('close')) + '</button></div></div>';
    var W = window.WolkoForm; $('pvT').textContent = (lang === 'en' ? c.card.titleEn || c.card.titleKo : c.card.titleKo || c.card.titleEn) || '';
    W.cardRows(c.card).forEach(function (r) { var dd = W.el('div', 'cf-fact'); dd.appendChild(W.bi('dt', '', r.label, lang)); dd.appendChild(W.bi('dd', '', r.value, lang)); $('pvF').appendChild(dd); });
    W.renderForm($('pvB'), c, lang); $('pvS').textContent = lang === 'en' ? 'Submit' : '신청 완료하기';
    $('pDlg').showModal(); $('pCancel').onclick = function () { $('pDlg').close(); };
    $('pBody').querySelectorAll('[data-pl]').forEach(function (b) { b.onclick = function () { X.preLang = b.dataset.pl; preview(); }; });
  }
  P.add('forms', { label: 'fLabel', needCamp: false, load: load });
})();
