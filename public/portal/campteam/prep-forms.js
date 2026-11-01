/* 캠프 준비 「신청서」 탭 — 다음 캠프의 카드(홈페이지 CMS 와 같은 항목) · 신청서 질문 · 스태프/크루 지원서를 포털 안에서 만들고 환규 선교사님께 인계한다.
   작성(Ella) → 검토(Jason) → 최종 확인(Aiden) → 인계(월코 포털 종 알림) → 환규 선교사님 「확인했어요」 → 완료 알림. 홈페이지·CMS 에는 아무것도 쓰지 않는다. */
(function () {
  var P = window.CTPrep; if (!P) return;
  CT.addDict({
    ko: { fLabel: '신청서', fIntro: '다음 캠프의 카드와 신청서, 스태프·크루 지원서를 여기서 만들어요. 지난 캠프 내용을 불러와서 바뀐 것만 고치면 돼요. 작성 → 검토 → 최종 확인을 거치면 환규 선교사님께 인계되고, 환규 선교사님이 확인한 뒤 CMS 에 넣어 배포해요. 홈페이지에는 이 화면이 직접 쓰지 않아요.',
      fNew: '+ 새 신청서', fRoles: '역할 정하기', fNone: '아직 만든 신청서가 없어요.', fBack: '← 목록', fKindCamper: '캠프 카드·신청서', fKindStaff: '스태프·크루 지원서',
      fStDraft: '작성 중', fStReview: '검토 중', fStFinal: '최종 확인', fStHanded: '환규님 확인 대기', fStConfirmed: '환규님 확인 완료', fLive: '홈페이지 반영 완료', fStep1: '작성', fStep2: '검토', fStep3: '최종 확인', fStep4: '환규님 확인', fStep5: '완료',
      roleEditor: '작성', roleReviewer: '검토', roleApprover: '최종 확인', roleDeployer: '배포 담당', fNoRole: '(정해지지 않음)', fRolesHint: '작성은 내용을 쓰는 사람, 검토는 모두 승인해야 넘어가는 사람, 최종 확인은 디자인과 코드 요청을 마무리해서 인계하는 사람, 배포 담당은 인계를 받아 CMS 입력과 배포를 하는 사람이에요(월코 포털 종 알림이 이 사람에게만 가요).',
      fKindL: '종류', fTypeL: '캠프 유형', fBaseL: '불러올 지난 캠프', fBaseAuto: '같은 유형의 가장 최근 캠프(자동)', fFromL: '신청서 질문은 이 신청서에서 복사', fFromAuto: '가장 최근 같은 종류의 신청서(자동)',
      tEnglish: '영어캠프', tUnion: '연합캠프', tJeju: '제주캠프', tOther: '기타', fLoaded: function (t) { return '지난 캠프 「' + t + '」의 CMS 내용을 불러왔어요. 바뀐 것만 고쳐 주세요.'; }, fStarter: '불러올 지난 캠프가 없어서 빈 칸으로 시작했어요.',
      fTitleL: '신청서 이름(목록에서 보는 이름)', fCampIdL: '파일 이름(홈페이지가 쓰는 캠프 이름표)', fCampIdHint: '지난 캠프 형식에 맞춰 제안했어요. 한 번 쓰이면 바꾸면 안 돼요. 환규 선교사님이 바꿀 수도 있어요.', fSecBlocks: '신청서에 들어갈 질문과 동의', fSecThanks: '신청 뒤 감사 문구', fSecReq: '새 항목·규칙 요청 (코드가 필요한 것)',
      fReqHint: '장학금 이름·금액, 남녀 정원, 신청 시작 시각처럼 CMS 칸으로는 못 바꾸고 코드를 고쳐야 하는 것을 글로 적어 주세요. Jason 승인 후 Aiden 이 코드를 만들어 환규 선교사님께 설명과 함께 전달해요.', fReqAdd: '+ 요청 추가', fReqPh: '예: 이번 캠프 장학금은 「야고보서 암송」 대신 「요한복음 암송」이고 할인은 5만원이에요.',
      fPrevBtn: '미리보기', fSave: '저장', fSaved: '저장했어요', fSaveNotify: '저장하고 Ella·Jason 에게 알리기', fSubmit: '검토 요청', fWithdraw: '거두기(작성 중으로)', fDelete: '지우기', fDup: '복사해서 새로 만들기',
      fApprove: '승인', fApproveFinal: '승인하고 환규님께 인계', fReturn: '되돌리기', fReturnWhy: '되돌리는 이유를 한 줄 적어 주세요', fConfirmSubmit: '검토를 요청할까요? 요청한 뒤에는 고칠 수 없고, 되돌려 받아야 고칠 수 있어요.', fDelConfirm: '이 신청서를 지울까요?', fHandConfirm: '환규 선교사님께 인계할까요? 인계하면 월코 포털 종 알림이 환규 선교사님께 가요.',
      fAi: 'AI 로 한국어·영어 빈 칸 채우기', fAiBusy: 'AI 가 채우는 중…', fAiDone: function (n) { return n + '칸을 채웠어요. 틀린 곳은 고쳐 주세요.'; }, fAiNone: '채울 빈 칸이 없어요.', fAiMark: 'AI 추천',
      fSame: '지난 캠프와 같음', fUnchangedHead: function (n) { return '지난 캠프와 같은 값이 남아 있는 항목이 ' + n + '개 있어요'; }, fUnchangedAck: '위 항목을 모두 확인했고, 그대로 쓰는 게 맞아요', fUnchangedHint: '확인했다고 체크해야 검토 요청 버튼이 켜져요.',
      fAddPick: '자주 쓰는 질문 / 새 질문 고르기', fGrpBasic: '기본 정보', fGrpSafety: '보호자·안전', fGrpConsent: '동의', fGrpStaff: '스태프·크루', fGrpBlank: '빈 칸 만들기',
      bText: '글 한 줄', bTextarea: '긴 글', bPhone: '전화번호', bEmail: '이메일', bDate: '날짜', bSelect: '고르기(목록)', bRadio: '하나만 고르기', bCheckbox: '여러 개 고르기', bConsent: '동의 체크', bHeading: '제목', bParagraph: '안내 글',
      fLabelL: '질문 이름', fHelpL: '작은 설명', fReq: '꼭 입력', fOptsL: '선택지 (한 줄에 하나, 「한국어 | English」)', fUp: '위로', fDown: '아래로', fEdit: '고치기', fRemove: '빼기', fDone: '닫기',
      fTimeline: '진행 기록', fApproved: '승인함', fReturned: '되돌림', fMine: '내 차례예요', fRoleNeed: '먼저 「역할 정하기」에서 작성·검토·최종 확인·배포 담당을 정해 주세요(관리자).', fLockNote: '지금은 고칠 수 없어요. 검토 중이면 「거두기」, 인계 뒤에는 「복사해서 새로 만들기」를 쓰세요.',
      fHandTitle: '환규 선교사님께 인계된 내용', fHandHow: 'CMS(wolko.org/admin)에서 「캠프 일정 → 새 캠프 일정」을 열고 아래 순서대로 같은 칸에 붙여 넣으면 돼요. 파일 형식 전체를 한 번에 쓰고 싶으면 「파일 내용 복사」를 쓰세요.', fCopy: '복사', fCopied: '복사했어요', fCopyAll: '파일 내용 복사', fCmsOpen: 'CMS 새 캠프 화면 열기', fConfirmBtn: '확인했어요', fDReturn: '되돌리기', fConfirmAsk: '확인했다고 표시할까요? 캠프팀 모두에게 완료 알림이 가요.', fCodeReqs: '코드 변경 요청', fPr: '변경 요청(PR) 보기', fPrLabel: '변경 요청(PR) 링크', fNoteLabel: '설명', fReady: '코드 준비됨', fDrop: '하지 않기', fPending: '아직 처리 안 됨', fCodeNote: '코드는 병합·배포하지 않고 환규 선교사님이 판단해요.', fFileName: '파일 이름', fQuestions: '신청서 질문', fStateL: '상태' },
    en: { fLabel: 'Forms', fIntro: 'Create the next camp card, application form and staff/crew form here. Load the last camp and change only what is different. After Write → Review → Final check it is handed to HwanKyu, who confirms, enters it in the CMS and deploys. This screen never writes to the homepage.',
      fNew: '+ New form', fRoles: 'Set roles', fNone: 'No forms yet.', fBack: '← List', fKindCamper: 'Camp card & application', fKindStaff: 'Staff / crew form',
      fStDraft: 'Draft', fStReview: 'In review', fStFinal: 'Final check', fStHanded: 'Waiting for HwanKyu', fStConfirmed: 'Confirmed by HwanKyu', fLive: 'Live on homepage', fStep1: 'Write', fStep2: 'Review', fStep3: 'Final check', fStep4: 'HwanKyu', fStep5: 'Done',
      roleEditor: 'Writer', roleReviewer: 'Reviewer', roleApprover: 'Final check', roleDeployer: 'Deployer', fNoRole: '(not set)', fRolesHint: 'The writer fills in the form, reviewers must all approve, the final checker finishes the design and code requests and hands over, and the deployer receives it, enters it in the CMS and deploys (only this person gets the WOLKO portal bell alert).',
      fKindL: 'Kind', fTypeL: 'Camp type', fBaseL: 'Past camp to load', fBaseAuto: 'Most recent camp of the same type (automatic)', fFromL: 'Copy form questions from', fFromAuto: 'Most recent form of the same kind (automatic)',
      tEnglish: 'English camp', tUnion: 'Unity camp', tJeju: 'Jeju camp', tOther: 'Other', fLoaded: function (t) { return 'Loaded the CMS content of "' + t + '". Change only what is different.'; }, fStarter: 'No past camp to load, so you start with empty boxes.',
      fTitleL: 'Form name (as shown in the list)', fCampIdL: 'File name (the camp ID the homepage uses)', fCampIdHint: 'Suggested in the style of past camps. Never change it once used. HwanKyu may change it.', fSecBlocks: 'Questions and consents on the form', fSecThanks: 'Thank-you message after applying', fSecReq: 'New item / rule requests (need code)',
      fReqHint: 'Write what the CMS boxes cannot change and needs code: scholarship names and amounts, separate gender capacity, registration start time. After Jason approves, Aiden writes the code and sends it to HwanKyu with an explanation.', fReqAdd: '+ Add request', fReqPh: 'e.g. This camp scholarship is "John memorization" instead of "James memorization", discount KRW 50,000.',
      fPrevBtn: 'Preview', fSave: 'Save', fSaved: 'Saved', fSaveNotify: 'Save and notify Ella & Jason', fSubmit: 'Request review', fWithdraw: 'Withdraw (back to draft)', fDelete: 'Delete', fDup: 'Copy as a new form',
      fApprove: 'Approve', fApproveFinal: 'Approve and hand over to HwanKyu', fReturn: 'Send back', fReturnWhy: 'Write one line on why you are sending it back', fConfirmSubmit: 'Request review? You cannot edit while it is in review unless it is sent back.', fDelConfirm: 'Delete this form?', fHandConfirm: 'Hand over to HwanKyu? The WOLKO portal bell will alert him.',
      fAi: 'Fill empty Korean/English boxes with AI', fAiBusy: 'AI is filling…', fAiDone: function (n) { return 'Filled ' + n + ' boxes. Please fix anything wrong.'; }, fAiNone: 'No empty boxes to fill.', fAiMark: 'AI suggestion',
      fSame: 'Same as last camp', fUnchangedHead: function (n) { return n + ' items still have the same value as the last camp'; }, fUnchangedAck: 'I checked all of the items above and they are correct as they are', fUnchangedHint: 'Tick the box to enable the review button.',
      fAddPick: 'Pick a common question or a new one', fGrpBasic: 'Basics', fGrpSafety: 'Guardian / safety', fGrpConsent: 'Consents', fGrpStaff: 'Staff / crew', fGrpBlank: 'Blank item',
      bText: 'One-line text', bTextarea: 'Long text', bPhone: 'Phone', bEmail: 'Email', bDate: 'Date', bSelect: 'Dropdown', bRadio: 'Choose one', bCheckbox: 'Choose many', bConsent: 'Consent checkbox', bHeading: 'Heading', bParagraph: 'Paragraph',
      fLabelL: 'Question', fHelpL: 'Small help text', fReq: 'Required', fOptsL: 'Options (one per line, "Korean | English")', fUp: 'Up', fDown: 'Down', fEdit: 'Edit', fRemove: 'Remove', fDone: 'Close',
      fTimeline: 'History', fApproved: 'approved', fReturned: 'sent back', fMine: 'Your turn', fRoleNeed: 'First set the writer, reviewers, final checker and deployer in "Set roles" (admin).', fLockNote: 'It cannot be edited now. Use "Withdraw" during review, or "Copy as a new form" after the handover.',
      fHandTitle: 'Handed over to HwanKyu', fHandHow: 'Open "Camp Schedule → New" in the CMS (wolko.org/admin) and paste each value into the same box in this order. To use the whole file at once, use "Copy file content".', fCopy: 'Copy', fCopied: 'Copied', fCopyAll: 'Copy file content', fCmsOpen: 'Open CMS new camp page', fConfirmBtn: 'I checked it', fDReturn: 'Send back', fConfirmAsk: 'Mark as checked? The whole camp team gets a completion alert.', fCodeReqs: 'Code change requests', fPr: 'View pull request', fPrLabel: 'Pull request link', fNoteLabel: 'Explanation', fReady: 'Code ready', fDrop: 'Do not do', fPending: 'Not handled yet', fCodeNote: 'The code is not merged or deployed; HwanKyu decides.', fFileName: 'File name', fQuestions: 'Form questions', fStateL: 'State' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = P.esc, api = P.api, URL0 = '/api/campteam/camp-forms';
  var X = { id: '', d: null, c: null, req: [], campId: '', meta: null, feed: null, open: -1, preLang: 'ko', ai: {} };
  var ST = { draft: 'fStDraft', review: 'fStReview', final: 'fStFinal', handed: 'fStHanded', confirmed: 'fStConfirmed' }, STEP = { draft: 0, review: 1, final: 2, handed: 3, confirmed: 4 };
  var BT = { text: 'bText', textarea: 'bTextarea', phone: 'bPhone', email: 'bEmail', date: 'bDate', select: 'bSelect', radio: 'bRadio', checkbox: 'bCheckbox', consent: 'bConsent', heading: 'bHeading', paragraph: 'bParagraph' };
  var TY = { english: 'tEnglish', union: 'tUnion', jeju: 'tJeju', other: 'tOther' }, CHOICE = ['select', 'radio', 'checkbox'], NOSAME = ['campType', 'order', 'status'];
  var who = function (list) { return list && list.length ? list.map(function (x) { return esc(x.name); }).join(', ') : '<i>' + esc(CT.t('fNoRole')) + '</i>'; };
  var date = function (s) { return String(s || '').slice(0, 10); };
  var chip = function (f) { return '<span class="chip fm-st ' + f.status + '">' + esc(CT.t(ST[f.status])) + '</span>' + (f.liveAt ? ' <span class="chip ok">' + esc(CT.t('fLive')) + '</span>' : ''); };
  function stepper(st) { var i = STEP[st], names = ['fStep1', 'fStep2', 'fStep3', 'fStep4', 'fStep5']; return '<ol class="fm-steps">' + names.map(function (n, k) { return '<li class="' + (k < i || st === 'confirmed' ? 'done' : k === i ? 'now' : '') + '">' + esc(CT.t(n)) + '</li>'; }).join('') + '</ol>'; }
  var canEdit = function (me) { return me.admin || me.editor; };
  var roleKey = function (k) { return 'role' + k.charAt(0).toUpperCase() + k.slice(1); };

  /* ---------- 목록 ---------- */
  async function load() {
    var v = $('pView'); v.innerHTML = '<p class="hint">…</p>';
    try { if (!X.meta) X.meta = await CT.api(URL0 + '?meta=1'); var q = new URLSearchParams(location.search).get('form'); if (q && !X.asked) { X.asked = 1; X.id = q; } if (X.id) await openForm(X.id); else await showList(); }
    catch (e) { v.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
  }
  async function showList() {
    X.id = ''; var d = await CT.api(URL0), me = d.me, r = d.roles;
    var h = '<p class="hint">' + esc(CT.t('fIntro')) + '</p><div class="fm-roles">' + ['editor', 'reviewer', 'approver', 'deployer'].map(function (k) { return '<span class="chip">' + esc(CT.t(roleKey(k))) + ': ' + who(r[k]) + '</span>'; }).join(' ') + '</div>';
    if (['editor', 'reviewer', 'approver', 'deployer'].some(function (k) { return !r[k].length; })) h += '<div class="hint fm-warn">' + esc(CT.t('fRoleNeed')) + '</div>';
    h += '<div class="p-bar">' + (canEdit(me) ? '<button class="btn pri" id="fNew">' + esc(CT.t('fNew')) + '</button> ' : '') + (me.admin ? '<button class="btn" id="fRoles">' + esc(CT.t('fRoles')) + '</button>' : '') + '</div>';
    h += d.items.map(function (f) {
      var mine = (f.status === 'review' && me.reviewer) || (f.status === 'final' && me.approver) || (f.status === 'handed' && me.deployer);
      return '<div class="card fm-item" data-open="' + esc(f.id) + '"><div class="p-row"><span class="p-main"><b>' + esc(f.title) + '</b> ' + chip(f) + (mine ? ' <span class="chip ok">' + esc(CT.t('fMine')) + '</span>' : '') + '<small>' + esc(CT.t(f.kind === 'staff' ? 'fKindStaff' : 'fKindCamper')) + ' · ' + esc(CT.t(TY[f.campType] || 'tOther')) + (f.campId ? ' · ' + esc(f.campId) : '') + ' · ' + esc(date(f.updatedAt)) + '</small></span><span class="p-act"><button class="btn sm" data-open="' + esc(f.id) + '">' + esc(CT.t('fEdit')) + '</button></span></div></div>';
    }).join('') || '<div class="empty">' + esc(CT.t('fNone')) + '</div>';
    $('pView').innerHTML = h;
    if ($('fNew')) $('fNew').onclick = function () { newDlg(d.items); }; if ($('fRoles')) $('fRoles').onclick = rolesDlg;
    $('pView').onclick = function (e) { var o = e.target.closest('[data-open]'); if (o) openForm(o.dataset.open); };
  }
  async function feed() { if (X.feed) return X.feed; try { X.feed = (await CT.api(URL0 + '?feed=1')).items || []; } catch (e) { X.feed = []; } return X.feed; }
  async function newDlg(items) {
    var fd = await feed();
    P.dialog(CT.t('fNew'), [
      { n: 'kind', l: 'fKindL', t: 'select', o: [['camper', CT.t('fKindCamper')], ['staff', CT.t('fKindStaff')]] },
      { n: 'campType', l: 'fTypeL', t: 'select', o: ['english', 'union', 'jeju', 'other'].map(function (k) { return [k, CT.t(TY[k])]; }) },
      { n: 'baseCamp', l: 'fBaseL', t: 'select', o: [['', CT.t('fBaseAuto')]].concat(fd.map(function (s) { return [s.id, s.titleKo + (s.startDate ? ' (' + s.startDate.slice(0, 7) + ')' : '')]; })) },
      { n: 'copyFrom', l: 'fFromL', t: 'select', o: [['', CT.t('fFromAuto')]].concat(items.map(function (f) { return [f.id, f.title]; })) }
    ], { kind: 'camper', campType: 'english' }, async function (o) {
      var body = { kind: o.kind, campType: o.campType }; if (o.baseCamp) body.baseCamp = o.baseCamp; if (o.copyFrom) body.copyFrom = o.copyFrom;
      var r = await api(URL0, 'POST', body); X.note = r.baseCamp ? CT.t('fLoaded')(r.baseCamp.title) : CT.t('fStarter'); await openForm(r.id);
    });
  }
  async function rolesDlg() {
    var ppl = (await CT.api('/api/campteam/people')).people || [], d = await CT.api(URL0), r = d.roles, has = function (k, e) { return (r[k] || []).some(function (x) { return String(x.email).toLowerCase() === e; }); };
    var col = function (k) { return '<fieldset class="fm-rolecol"><legend>' + esc(CT.t(roleKey(k))) + '</legend>' + ppl.map(function (p) { return '<label class="fm-chk"><input type="checkbox" data-r="' + k + '" value="' + esc(p.email) + '"' + (has(k, p.email) ? ' checked' : '') + '> ' + esc(p.name || p.email.split('@')[0]) + '</label>'; }).join('') + '</fieldset>'; };
    $('pBody').innerHTML = '<h3>' + esc(CT.t('fRoles')) + '</h3><p class="hint">' + esc(CT.t('fRolesHint')) + '</p><div class="fm-roleset fm-roleset4">' + col('editor') + col('reviewer') + col('approver') + col('deployer') + '</div><div class="err" id="pErr" hidden></div><div class="dlg-actions"><button class="btn" id="pCancel">' + esc(CT.t('cancel')) + '</button><button class="btn pri" id="fRoleSave">' + esc(CT.t('save')) + '</button></div>';
    $('pDlg').showModal(); $('pCancel').onclick = function () { $('pDlg').close(); };
    $('fRoleSave').onclick = async function () { var b = { editor: [], reviewer: [], approver: [], deployer: [] }; document.querySelectorAll('#pBody [data-r]:checked').forEach(function (c) { b[c.dataset.r].push(c.value); }); try { await api(URL0, 'PUT', b); $('pDlg').close(); showList(); } catch (e) { $('pErr').hidden = false; $('pErr').textContent = e.message; } };
  }

  /* ---------- 한 신청서 ---------- */
  async function openForm(id) {
    var d = await CT.api(URL0 + '?id=' + encodeURIComponent(id)); X.id = id; X.d = d; X.c = JSON.parse(JSON.stringify(d.form.content)); X.req = JSON.parse(JSON.stringify(d.form.codeRequests || [])); X.campId = d.form.campId; X.open = -1; X.ai = {}; renderDetail();
  }
  function history(d) {
    var f = d.form, ap = d.approvals || [], cur = ap.filter(function (a) { return a.current; }), r = d.roles, out = '';
    var okOf = function (stage, list) { return list.map(function (p) { var a = cur.filter(function (x) { return x.stage === stage && String(x.email).toLowerCase() === String(p.email).toLowerCase() && x.decision === 'approve'; })[0]; return '<span class="chip ' + (a ? 'ok' : '') + '">' + (a ? '✓ ' : '… ') + esc(p.name) + '</span>'; }).join(' '); };
    var wait = function (k) { return '<div class="fm-wait"><b>' + esc(CT.t(roleKey(k))) + '</b> ' + r[k].map(function (p) { return '<span class="chip">… ' + esc(p.name) + '</span>'; }).join(' ') + '</div>'; };
    if (f.status === 'review') out += '<div class="fm-wait"><b>' + esc(CT.t('roleReviewer')) + '</b> ' + okOf('review', r.reviewer) + '</div>';
    if (f.status === 'final') out += wait('approver'); if (f.status === 'handed') out += wait('deployer');
    if (ap.length) out += '<details class="fm-log"><summary>' + esc(CT.t('fTimeline')) + '</summary>' + ap.slice().reverse().map(function (a) { return '<div class="fm-logrow"><small>' + esc(date(a.at)) + '</small> ' + esc(String(a.email).split('@')[0]) + ' — ' + esc(CT.t(a.decision === 'approve' ? 'fApproved' : 'fReturned')) + (a.comment ? ': ' + esc(a.comment) : '') + '</div>'; }).join('') + '</details>';
    return out;
  }
  var isSame = function (k) { var v = X.c.card[k]; return !!X.c.base && NOSAME.indexOf(k) < 0 && v !== '' && v !== false && JSON.stringify(v) === JSON.stringify(X.c.base[k]); };
  /* 카드 항목: 서버가 준 항목 목록(FIELDS)으로 그린다 — 항목이 늘어도 화면은 그대로 따라온다 */
  function fieldHtml(f, edit) {
    var c = X.c.card, v = c[f.key], same = isSame(f.key), ai = X.ai[f.key] && v === X.ai[f.key];
    var badge = (same ? ' <em class="fm-same">' + esc(CT.t('fSame')) + '</em>' : '') + (ai ? ' <em class="fm-ai">' + esc(CT.t('fAiMark')) + '</em>' : ''), dis = edit ? '' : ' disabled', hint = f.hint ? '<small class="hint">' + esc(f.hint) + '</small>' : '';
    if (f.type === 'bool') return '<label class="fm-f fm-bool' + (same ? ' same' : '') + '"><span><input type="checkbox" data-card="' + f.key + '"' + (v ? ' checked' : '') + dis + '> ' + esc(f.label) + badge + '</span>' + hint + '</label>';
    var ctl;
    if (f.type === 'select') ctl = '<select data-card="' + f.key + '"' + dis + '>' + f.options.map(function (o) { return '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select>';
    else if (f.type === 'text') ctl = '<textarea rows="3" data-card="' + f.key + '"' + dis + '>' + esc(v) + '</textarea>';
    else if (f.type === 'number') ctl = '<input type="number" min="0" step="any" data-card="' + f.key + '" value="' + esc(v) + '"' + dis + '>';
    else if (f.type === 'datetime') ctl = '<input type="datetime-local" data-card="' + f.key + '" value="' + esc(v) + '"' + dis + '>';
    else ctl = '<input data-card="' + f.key + '" value="' + esc(v) + '" maxlength="300"' + dis + '>';
    return '<label class="fm-f' + (same ? ' same' : '') + (ai ? ' aimark' : '') + '"><span>' + esc(f.label) + (f.req ? ' *' : '') + badge + '</span>' + ctl + hint + '</label>';
  }
  function cardSection(edit) {
    var kind = X.d.form.kind, fields = X.meta.fields.filter(function (f) { return f.for === 'both' || f.for === kind; }), groups = X.meta.groups, h = '';
    if (edit) h += '<div class="fm-aibar"><button type="button" class="btn" id="fAi">' + esc(CT.t('fAi')) + '</button> <span class="hint" id="fAiMsg"></span></div>';
    Object.keys(groups).forEach(function (g) {
      var list = fields.filter(function (f) { return f.group === g; }); if (!list.length) return;
      var done = {}, body = '';
      list.forEach(function (f) { if (done[f.key]) return; done[f.key] = 1; var p = f.pair && list.filter(function (x) { return x.key === f.pair; })[0]; if (p) { done[p.key] = 1; body += '<div class="fm-pair">' + fieldHtml(f, edit) + fieldHtml(p, edit) + '</div>'; } else body += fieldHtml(f, edit); });
      h += g === 'adv' ? '<details class="fm-adv"><summary>' + esc(groups[g]) + '</summary>' + body + '</details>' : '<h4 class="fm-sub">' + esc(groups[g]) + '</h4>' + body;
    });
    return h;
  }
  function blockRow(b, i, n) {
    var lab = b.label.ko || b.label.en || '—', open = X.open === i;
    var h = '<div class="fm-block' + (open ? ' open' : '') + '" data-bi="' + i + '"><div class="fm-brow"><span class="chip">' + esc(CT.t(BT[b.type])) + '</span><b class="fm-blab">' + esc(lab.length > 70 ? lab.slice(0, 70) + '…' : lab) + '</b>' + (b.required ? '<span class="chip warn">' + esc(CT.t('fReq')) + '</span>' : '') +
      '<span class="p-act"><button class="btn sm" data-bm="up"' + (i === 0 ? ' disabled' : '') + ' title="' + esc(CT.t('fUp')) + '">▲</button><button class="btn sm" data-bm="down"' + (i === n - 1 ? ' disabled' : '') + ' title="' + esc(CT.t('fDown')) + '">▼</button><button class="btn sm" data-bm="edit">' + esc(CT.t(open ? 'fDone' : 'fEdit')) + '</button><button class="btn sm danger" data-bm="del">' + esc(CT.t('fRemove')) + '</button></span></div>';
    if (open) {
      var pair = function (k, lbl, area) { return '<div class="fm-pair">' + ['ko', 'en'].map(function (l) { return '<label class="fm-f">' + esc(CT.t(lbl) + ' · ' + (l === 'ko' ? '한국어' : 'English')) + (area ? '<textarea rows="3" data-bf="' + k + '.' + l + '">' + esc(b[k][l] || '') + '</textarea>' : '<input data-bf="' + k + '.' + l + '" value="' + esc(b[k][l] || '') + '" maxlength="200">') + '</label>'; }).join('') + '</div>'; };
      h += '<div class="fm-bedit">' + pair('label', b.type === 'paragraph' || b.type === 'consent' ? 'bConsent' : 'fLabelL', b.type === 'paragraph' || b.type === 'consent');
      if (b.type !== 'heading' && b.type !== 'paragraph') h += pair('help', 'fHelpL') + '<label class="fm-chk"><input type="checkbox" data-bf="required"' + (b.required ? ' checked' : '') + '> ' + esc(CT.t('fReq')) + '</label>';
      if (CHOICE.indexOf(b.type) >= 0) h += '<label class="fm-f">' + esc(CT.t('fOptsL')) + '<textarea rows="4" data-bf="options">' + esc((b.options || []).map(function (o) { return o.ko + (o.en ? ' | ' + o.en : ''); }).join('\n')) + '</textarea></label>';
      h += '</div>';
    }
    return h + '</div>';
  }
  function addMenu() {
    var groups = { basic: 'fGrpBasic', safety: 'fGrpSafety', consent: 'fGrpConsent', staff: 'fGrpStaff' }, ls = CT.lang();
    var h = '<select id="fAdd"><option value="">' + esc(CT.t('fAddPick')) + '</option>';
    Object.keys(groups).forEach(function (g) { h += '<optgroup label="' + esc(CT.t(groups[g])) + '">' + X.meta.snippets.filter(function (s) { return s.group === g; }).map(function (s) { return '<option value="s:' + esc(s.key) + '">' + esc(s.name[ls] || s.name.ko) + '</option>'; }).join('') + '</optgroup>'; });
    return h + '<optgroup label="' + esc(CT.t('fGrpBlank')) + '">' + Object.keys(BT).map(function (t) { return '<option value="t:' + t + '">' + esc(CT.t(BT[t])) + '</option>'; }).join('') + '</optgroup></select>';
  }
  function paintBlocks() { var box = $('fBlocks'); if (box) box.innerHTML = X.c.blocks.map(function (b, i) { return blockRow(b, i, X.c.blocks.length); }).join(''); }
  function reqView(r) { return '<div class="fm-reqs">' + esc(CT.t(r.state === 'ready' ? 'fReady' : r.state === 'dropped' ? 'fDrop' : 'fPending')) + (r.prUrl ? ' · <a href="' + esc(r.prUrl) + '" target="_blank" rel="noopener">' + esc(CT.t('fPr')) + '</a>' : '') + (r.note ? '<div class="hint">' + esc(r.note) + '</div>' : '') + '</div>'; }
  /* 코드 요청: 작성 중에는 Ella 가 글로 적고, 최종 확인 단계에서는 Aiden 이 변경 요청(PR) 링크와 설명을 채운다 */
  function reqSection(mode) {
    var h = '<p class="hint">' + esc(CT.t('fReqHint')) + '</p>';
    h += X.req.map(function (r, i) {
      if (mode === 'draft') return '<div class="fm-req" data-ri="' + i + '"><textarea rows="2" data-rq="text" placeholder="' + esc(CT.t('fReqPh')) + '"' + (r.state !== 'requested' ? ' disabled' : '') + '>' + esc(r.text) + '</textarea><button class="btn sm danger" data-rdel="' + i + '"' + (r.state !== 'requested' ? ' disabled' : '') + '>' + esc(CT.t('fRemove')) + '</button></div>';
      return '<div class="fm-req" data-ri="' + i + '"><div class="fm-reqtext">' + esc(r.text) + '</div><div class="fm-pair"><label class="fm-f">' + esc(CT.t('fPrLabel')) + '<input data-rq="prUrl" value="' + esc(r.prUrl) + '" placeholder="https://github.com/…/pull/123"></label><label class="fm-f">' + esc(CT.t('fNoteLabel')) + '<textarea rows="2" data-rq="note">' + esc(r.note) + '</textarea></label></div><label class="fm-f">' + esc(CT.t('fStateL')) + '<select data-rq="state"><option value="requested"' + (r.state === 'requested' ? ' selected' : '') + '>' + esc(CT.t('fPending')) + '</option><option value="ready"' + (r.state === 'ready' ? ' selected' : '') + '>' + esc(CT.t('fReady')) + '</option><option value="dropped"' + (r.state === 'dropped' ? ' selected' : '') + '>' + esc(CT.t('fDrop')) + '</option></select></label></div>';
    }).join('');
    if (mode === 'draft') h += '<div class="p-bar"><button class="btn sm" id="fReqAdd">' + esc(CT.t('fReqAdd')) + '</button></div>';
    return h;
  }
  /* 인계 화면: CMS 에 넣는 순서대로 항목을 보여 주고 칸마다 복사 버튼을 둔다 */
  function handSection() {
    var f = X.d.form, cms = X.d.cms || {}, rows = [];
    X.meta.fields.forEach(function (fd) { var v = cms[fd.cms]; if (v === undefined || v === '' || v === false) return; rows.push('<div class="fm-hrow"><span class="fm-hl">' + esc(fd.label) + '</span><span class="fm-hv">' + esc(String(v)) + '</span><button type="button" class="btn sm" data-cp="' + esc(String(v)) + '">' + esc(CT.t('fCopy')) + '</button></div>'); });
    var h = '<h4 class="fm-sec">' + esc(CT.t('fHandTitle')) + '</h4><p class="hint">' + esc(CT.t('fHandHow')) + '</p><div class="fm-hrow"><span class="fm-hl">' + esc(CT.t('fFileName')) + '</span><span class="fm-hv"><b>' + esc(f.campId) + '.json</b></span><button type="button" class="btn sm" data-cp="' + esc(f.campId) + '">' + esc(CT.t('fCopy')) + '</button></div>' + rows.join('');
    h += '<div class="p-bar"><button class="btn" id="fCopyAll">' + esc(CT.t('fCopyAll')) + '</button> <a class="btn" href="' + esc(X.meta.cmsUrl) + '" target="_blank" rel="noopener">' + esc(CT.t('fCmsOpen')) + '</a></div>';
    if (X.req.length) h += '<h4 class="fm-sub">' + esc(CT.t('fCodeReqs')) + '</h4><p class="hint">' + esc(CT.t('fCodeNote')) + '</p>' + X.req.map(function (r) { return '<div class="fm-req"><div class="fm-reqtext">' + esc(r.text) + '</div>' + reqView(r) + '</div>'; }).join('');
    return h + '<h4 class="fm-sub">' + esc(CT.t('fQuestions')) + '</h4><div id="fRead" class="fm-read"></div>';
  }
  function renderDetail() {
    var d = X.d, f = d.form, me = d.me, st = f.status, v = $('pView'), kind = f.kind;
    var edit = st === 'draft' && canEdit(me), finalEdit = st === 'final' && me.approver, h = '';
    h += '<div class="p-bar"><button class="btn" id="fBack">' + esc(CT.t('fBack')) + '</button> <button class="btn" id="fPrev">' + esc(CT.t('fPrevBtn')) + '</button></div>';
    h += '<div class="fm-head"><h3>' + esc(f.title) + '</h3> ' + chip(f) + ' <span class="chip">' + esc(CT.t(kind === 'staff' ? 'fKindStaff' : 'fKindCamper')) + '</span></div>' + stepper(st) + history(d);
    if (X.note) { h += '<p class="hint">' + esc(X.note) + '</p>'; X.note = ''; }
    h += '<div class="fm-actions">';
    if (edit) h += '<button class="btn pri" id="fSave">' + esc(CT.t('fSave')) + '</button> <button class="btn danger" id="fDel">' + esc(CT.t('fDelete')) + '</button> ';
    if (finalEdit) h += '<button class="btn" id="fSave">' + esc(CT.t('fSave')) + '</button> <button class="btn" id="fSaveN">' + esc(CT.t('fSaveNotify')) + '</button> ';
    if (canEdit(me) && (st === 'review' || st === 'final')) h += '<button class="btn" id="fWithdraw">' + esc(CT.t('fWithdraw')) + '</button> ';
    if ((st === 'review' && me.reviewer) || (st === 'final' && me.approver)) h += '<button class="btn pri" id="fApprove">' + esc(CT.t(st === 'final' ? 'fApproveFinal' : 'fApprove')) + '</button> <button class="btn danger" id="fReturn">' + esc(CT.t('fReturn')) + '</button> ';
    if (st === 'handed' && me.deployer) h += '<button class="btn pri" id="fConfirm">' + esc(CT.t('fConfirmBtn')) + '</button> <button class="btn danger" id="fDReturn">' + esc(CT.t('fDReturn')) + '</button> ';
    if (canEdit(me)) h += '<button class="btn" id="fDup">' + esc(CT.t('fDup')) + '</button>';
    h += '</div><div class="err" id="fErr" hidden></div>';
    if (st === 'handed' || st === 'confirmed') h += handSection();
    else if (edit || finalEdit) {
      h += '<label class="fm-f">' + esc(CT.t('fTitleL')) + '<input id="fTitle" value="' + esc(f.title) + '" maxlength="120"' + (edit ? '' : ' disabled') + '></label>';
      h += '<label class="fm-f">' + esc(CT.t('fCampIdL')) + '<input id="fCampId" value="' + esc(X.campId) + '" maxlength="61"><small class="hint">' + esc(CT.t('fCampIdHint')) + '</small></label>' + cardSection(true);
      h += '<h4 class="fm-sec">' + esc(CT.t('fSecBlocks')) + '</h4><div id="fBlocks"></div>' + (edit ? '<div class="p-bar">' + addMenu() + '</div>' : '') +
        '<h4 class="fm-sec">' + esc(CT.t('fSecThanks')) + '</h4><div class="fm-pair">' + ['ko', 'en'].map(function (l) { return '<label class="fm-f">' + esc(l === 'ko' ? '한국어' : 'English') + '<textarea rows="2" data-thanks="' + l + '">' + esc((X.c.thanks || {})[l] || '') + '</textarea></label>'; }).join('') + '</div>' +
        '<h4 class="fm-sec">' + esc(CT.t('fSecReq')) + '</h4><div id="fReqs">' + reqSection(edit ? 'draft' : 'final') + '</div>';
      if (edit) h += '<div class="fm-submit" id="fSubmitBox"></div>';
    } else {
      h += '<p class="hint">' + esc(CT.t('fLockNote')) + '</p>' + cardSection(false) + '<h4 class="fm-sec">' + esc(CT.t('fSecBlocks')) + '</h4><div id="fRead" class="fm-read"></div>' + (X.req.length ? '<h4 class="fm-sec">' + esc(CT.t('fSecReq')) + '</h4>' + X.req.map(function (q) { return '<div class="fm-req"><div class="fm-reqtext">' + esc(q.text) + '</div>' + reqView(q) + '</div>'; }).join('') : '');
    }
    v.innerHTML = h;
    if ($('fBlocks')) paintBlocks();
    var host = $('fRead'); if (host) { window.WolkoForm.renderForm(host, { blocks: X.c.blocks }, CT.lang() === 'en' ? 'en' : 'ko'); host.querySelectorAll('input,select,textarea').forEach(function (x) { x.disabled = true; }); }
    if (edit) paintSubmit();
    bind(edit, finalEdit);
  }
  /* 검토 요청 칸: 지난 캠프와 같은 값이 남아 있으면 목록을 보여 주고, 확인했다고 체크해야 버튼이 켜진다 */
  function sameList() { var kind = X.d.form.kind; return X.meta.fields.filter(function (f) { return (f.for === 'both' || f.for === kind) && isSame(f.key); }); }
  function paintSubmit() {
    var box = $('fSubmitBox'); if (!box) return; var un = sameList(), keep = $('fAck') ? $('fAck').checked : false;
    box.innerHTML = (un.length ? '<div class="fm-unch"><b>' + esc(CT.t('fUnchangedHead')(un.length)) + '</b><ul>' + un.map(function (f) { return '<li>' + esc(f.label) + ': <i>' + esc(String(X.c.card[f.key]).slice(0, 60)) + '</i></li>'; }).join('') + '</ul><label class="fm-chk"><input type="checkbox" id="fAck"' + (keep ? ' checked' : '') + '> ' + esc(CT.t('fUnchangedAck')) + '</label><small class="hint">' + esc(CT.t('fUnchangedHint')) + '</small></div>' : '') +
      '<button class="btn pri" id="fSubmit"' + (un.length && !keep ? ' disabled' : '') + '>' + esc(CT.t('fSubmit')) + '</button>';
    if ($('fAck')) $('fAck').onchange = paintSubmit; $('fSubmit').onclick = submit;
  }
  var err = function (m, list) { var e = $('fErr'); if (!e) return alert(m); e.hidden = false; e.className = 'err'; e.innerHTML = esc(m) + (list ? '<ul>' + list.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''); e.scrollIntoView({ block: 'nearest' }); };
  function setPath(o, path, val) { var p = path.split('.'); p.slice(0, -1).forEach(function (k) { o = o[k]; }); o[p[p.length - 1]] = val; }
  function parseOpts(t) { return String(t || '').split('\n').map(function (l) { var s = l.split('|'); return { ko: (s[0] || '').trim(), en: (s[1] || '').trim() }; }).filter(function (o) { return o.ko || o.en; }); }
  async function save(notify) {
    var body = { content: X.c, codeRequests: X.req, campId: X.campId }; if ($('fTitle') && !$('fTitle').disabled) body.title = $('fTitle').value; if (notify) body.notify = true;
    await api(URL0 + '?id=' + encodeURIComponent(X.id), 'PATCH', body);
  }
  async function act(action, extra) { return api(URL0 + '?id=' + encodeURIComponent(X.id), 'POST', Object.assign({ action: action }, extra || {})); }
  async function submit() {
    if (!confirm(CT.t('fConfirmSubmit'))) return;
    try { await save(); await act('submit', { ack: !!($('fAck') && $('fAck').checked) }); await openForm(X.id); } catch (e) { err(e.message); }
  }
  function cardInput(t) {
    var k = t.dataset.card, f = X.meta.fields.filter(function (x) { return x.key === k; })[0]; if (!f) return;
    X.c.card[k] = f.type === 'bool' ? t.checked : f.type === 'number' ? (t.value === '' ? '' : Number(t.value)) : t.value;
    var lab = t.closest('.fm-f'); if (lab) {
      var same = isSame(k), em = lab.querySelector('.fm-same'), top = lab.firstElementChild; lab.classList.toggle('same', same);
      if (same && !em) top.insertAdjacentHTML('beforeend', ' <em class="fm-same">' + esc(CT.t('fSame')) + '</em>'); if (!same && em) em.remove();
      if (X.ai[k] && X.c.card[k] !== X.ai[k]) { delete X.ai[k]; var am = lab.querySelector('.fm-ai'); if (am) am.remove(); lab.classList.remove('aimark'); }
    }
    paintSubmit();
  }
  function bind(edit, finalEdit) {
    $('fBack').onclick = function () { X.id = ''; load(); }; $('fPrev').onclick = preview;
    var go = function (fn) { return async function () { try { await fn(); } catch (e) { err(e.message); } }; };
    if ($('fWithdraw')) $('fWithdraw').onclick = go(async function () { await act('withdraw'); await openForm(X.id); });
    if ($('fApprove')) $('fApprove').onclick = go(async function () { if (X.d.form.status === 'final') { if (!confirm(CT.t('fHandConfirm'))) return; await save(); } await act('approve'); await openForm(X.id); });
    if ($('fReturn')) $('fReturn').onclick = go(async function () { var why = prompt(CT.t('fReturnWhy')); if (!why || !why.trim()) return; await act('return', { comment: why.trim() }); await openForm(X.id); });
    if ($('fConfirm')) $('fConfirm').onclick = go(async function () { if (!confirm(CT.t('fConfirmAsk'))) return; await act('confirm'); await openForm(X.id); });
    if ($('fDReturn')) $('fDReturn').onclick = go(async function () { var why = prompt(CT.t('fReturnWhy')); if (!why || !why.trim()) return; await act('dreturn', { comment: why.trim() }); await openForm(X.id); });
    if ($('fDup')) $('fDup').onclick = go(async function () { var r = await act('duplicate'); await openForm(r.id); });
    var root = $('pView');
    root.addEventListener('click', async function (e) {
      var cp = e.target.closest('[data-cp]'); if (cp) { try { await navigator.clipboard.writeText(cp.dataset.cp); cp.textContent = CT.t('fCopied'); setTimeout(function () { cp.textContent = CT.t('fCopy'); }, 1200); } catch (x) { /* 복사 실패는 조용히 */ } return; }
      if (e.target.id === 'fCopyAll') { try { await navigator.clipboard.writeText(JSON.stringify(X.d.cms, null, 2) + '\n'); e.target.textContent = CT.t('fCopied'); setTimeout(function () { e.target.textContent = CT.t('fCopyAll'); }, 1200); } catch (x) { /* 무시 */ } }
    });
    if (!edit && !finalEdit) return;
    var saved = function (n) { return go(async function () { await save(n); var e = $('fErr'); e.hidden = false; e.className = 'ok'; e.textContent = CT.t('fSaved'); setTimeout(function () { e.hidden = true; e.className = 'err'; }, 1500); }); };
    $('fSave').onclick = saved(false); if ($('fSaveN')) $('fSaveN').onclick = saved(true);
    if ($('fDel')) $('fDel').onclick = go(async function () { if (!confirm(CT.t('fDelConfirm'))) return; await act('delete'); X.id = ''; load(); });
    $('fAi').onclick = go(async function () {
      $('fAiMsg').textContent = CT.t('fAiBusy'); var r = await act('aifill', { card: X.c.card }), n = 0;
      Object.keys(r.fills || {}).forEach(function (k) { if (X.c.card[k] === '' || X.c.card[k] === undefined) { X.c.card[k] = r.fills[k]; X.ai[k] = r.fills[k]; n++; } });
      var open = X.open; renderDetail(); X.open = open; $('fAiMsg').textContent = n ? CT.t('fAiDone')(n) : CT.t('fAiNone');
    });
    root.addEventListener('input', function (e) {
      var t = e.target;
      if (t.dataset.card) cardInput(t); else if (t.id === 'fCampId') X.campId = t.value.trim().toLowerCase();
      else if (t.dataset.thanks) { X.c.thanks = X.c.thanks || {}; X.c.thanks[t.dataset.thanks] = t.value; }
      else if (t.dataset.rq) { X.req[+t.closest('[data-ri]').dataset.ri][t.dataset.rq] = t.value; }
      else if (t.dataset.bf) { var bi = +t.closest('[data-bi]').dataset.bi, b = X.c.blocks[bi], k = t.dataset.bf; if (k === 'required') b.required = t.checked; else if (k === 'options') b.options = parseOpts(t.value); else setPath(b, k, t.value); var lab = t.closest('.fm-block').querySelector('.fm-blab'); if (lab) lab.textContent = b.label.ko || b.label.en || '—'; }
    });
    root.addEventListener('change', function (e) { var t = e.target; if (t.dataset.card && (t.type === 'checkbox' || t.tagName === 'SELECT')) cardInput(t); if (t.dataset.bf === 'required') t.dispatchEvent(new Event('input', { bubbles: true })); if (t.dataset.rq === 'state') X.req[+t.closest('[data-ri]').dataset.ri].state = t.value; });
    root.addEventListener('click', function (e) {
      var bm = e.target.closest('[data-bm]'); if (bm) { var i = +bm.closest('[data-bi]').dataset.bi, bl = X.c.blocks, m = bm.dataset.bm;
        if (m === 'edit') X.open = X.open === i ? -1 : i; else if (m === 'del') { bl.splice(i, 1); X.open = -1; } else if (m === 'up' && i > 0) { bl.splice(i - 1, 0, bl.splice(i, 1)[0]); X.open = i - 1; } else if (m === 'down' && i < bl.length - 1) { bl.splice(i + 1, 0, bl.splice(i, 1)[0]); X.open = i + 1; }
        paintBlocks(); return; }
      if (e.target.id === 'fReqAdd') { X.req.push({ id: 'new' + Date.now(), text: '', state: 'requested', prUrl: '', note: '' }); $('fReqs').innerHTML = reqSection('draft'); return; }
      var rd = e.target.closest('[data-rdel]'); if (rd) { X.req.splice(+rd.dataset.rdel, 1); $('fReqs').innerHTML = reqSection('draft'); }
    });
    if ($('fAdd')) $('fAdd').onchange = function () {
      var v = $('fAdd').value; if (!v) return; var nb;
      if (v.slice(0, 2) === 's:') { var s = X.meta.snippets.filter(function (x) { return 's:' + x.key === v; })[0]; nb = JSON.parse(JSON.stringify(s.block)); nb.help = nb.help || { ko: '', en: '' }; }
      else { var ty = v.slice(2); nb = { type: ty, label: { ko: '', en: '' }, help: { ko: '', en: '' }, required: false }; if (CHOICE.indexOf(ty) >= 0) nb.options = [1, 2].map(function (i) { return { ko: '선택 ' + i, en: 'Option ' + i }; }); }
      nb.id = 'b' + Math.random().toString(36).slice(2, 10); if (nb.type === 'heading' || nb.type === 'paragraph') delete nb.required; X.c.blocks.push(nb); X.open = X.c.blocks.length - 1; $('fAdd').value = ''; paintBlocks();
    };
  }

  /* ---------- 미리보기: 신청하는 사람 눈에 보일 모양 ---------- */
  function preview() {
    var c = X.c, lang = X.preLang;
    $('pBody').innerHTML = '<div class="cf cf-prev"><div class="fm-prevbar"><button type="button" class="btn sm' + (lang === 'ko' ? ' pri' : '') + '" data-pl="ko">KO</button> <button type="button" class="btn sm' + (lang === 'en' ? ' pri' : '') + '" data-pl="en">EN</button></div><div class="cf-card"><div class="cf-head"><div class="cf-badge">WORD OF LIFE KOREA</div><h1 class="cf-title" id="pvT"></h1></div><div class="cf-body"><dl class="cf-facts" id="pvF"></dl><div id="pvB"></div><button class="cf-submit" type="button" disabled id="pvS"></button></div></div><div class="dlg-actions"><button class="btn" id="pCancel">' + esc(CT.t('close')) + '</button></div></div>';
    var W = window.WolkoForm, k = c.card; $('pvT').textContent = (lang === 'en' ? k.titleEn || k.titleKo : k.titleKo || k.titleEn) || '';
    W.cardRows(k).forEach(function (r) { var dd = W.el('div', 'cf-fact'); dd.appendChild(W.bi('dt', '', r.label, lang)); dd.appendChild(W.bi('dd', '', r.value, lang)); $('pvF').appendChild(dd); });
    W.renderForm($('pvB'), c, lang); $('pvS').textContent = lang === 'en' ? 'Submit' : '신청 완료하기';
    $('pDlg').showModal(); $('pCancel').onclick = function () { $('pDlg').close(); };
    $('pBody').querySelectorAll('[data-pl]').forEach(function (b) { b.onclick = function () { X.preLang = b.dataset.pl; preview(); }; });
  }
  P.add('forms', { label: 'fLabel', needCamp: false, load: load });
})();
