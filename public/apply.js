/* 비공개 스태프 지원서 — 임시 비밀번호 로그인 · 단계별 입력 · 검사 · 서버에 자동 저장 · 제출 · 접수 확인 (/api/apply/account, /api/apply/staff) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var SECTIONS = JSON.parse($('apSchema').textContent);
  var TOKEN_KEY = 'wolko-apply-session';
  try { localStorage.removeItem('wolko-apply-draft-v1'); } catch (e) {}   // 예전 기기 저장본(민감 정보)이 남지 않게
  var T = {
    ko: {
      title: '스태프 지원서', lead: '월코에서 청소년 사역을 함께할 스태프를 모집합니다. 지원서와 추천서 2부를 받아 검토한 뒤 면담을 진행합니다.',
      infoTitle: '지원 안내', infoTimeL: '작성 시간', infoTime: '20–30분 정도 걸립니다. 작성한 내용은 자동으로 저장되어 30일 동안 보관되니, 편하실 때 언제든 다시 이어서 작성하시면 됩니다.',
      infoRefL: '추천인', infoRef: '담임목사님(또는 교회 지도자) 한 분과 동역자(또는 친구) 한 분, 모두 두 분의 이름과 이메일이 필요합니다.',
      infoMailL: '추천서', infoMail: '추천인 단계에서 다음을 누르면 그분께 추천서 양식이 이메일로 바로 발송됩니다. 미리 말씀드려 두시면 좋습니다.',
      infoPrivL: '개인정보', infoPriv: '검토 담당자만 열람합니다. 검토 후 부적합 사항이 발견되면 30일 후 폐기됩니다.',
      infoAcctL: '임시 계정', gateNote: '로그인은 이메일로 받는 임시 비밀번호로 합니다. 30일 동안 로그인하지 않으면 계정과 제출하지 않은 내용은 삭제됩니다.',
      issueTitle: '작성 시작하기', issueLead: '이메일로 임시 비밀번호를 보내 드립니다.', gateName: '이름', gateEmail: '이메일', gatePw: '임시 비밀번호',
      issueBtn: '임시 비밀번호 받기', issuing: '보내는 중…', haveCode: '비밀번호를 이미 받으셨으면', toLogin: '로그인',
      loginTitle: '로그인', loginLead: '메일로 받은 임시 비밀번호를 입력해 주세요.', loginBtn: '로그인', loggingIn: '확인하는 중…', lostCode: '비밀번호를 잃어버렸으면', resend: '다시 받기',
      sent: function (e) { return e + ' 로 임시 비밀번호를 보냈습니다. 메일이 보이지 않으면 스팸함도 확인해 주세요.'; }, expired: '로그인 시간이 지났습니다. 다시 로그인해 주세요.',
      logout: '로그아웃', expires: function (d) { return '임시 계정은 ' + d + '까지 보관됩니다. 로그인할 때마다 30일씩 늘어납니다.'; },
      progress: function (a, b) { return b + '단계 중 ' + a + '단계'; }, saving: ' · 저장하는 중', savedAt: function (tm) { return ' · ' + tm + ' 자동 저장됨'; }, saveFail: ' · 저장하지 못했습니다. 연결을 확인해 주세요',
      done: '작성함', review: '확인 및 제출', prev: '이전', next: '저장하고 다음으로', toReview: '확인 단계로', submit: '지원서 제출', submitting: '제출하는 중…', optional: '선택', edit: '고치기',
      reviewLead: '제출하기 전에 적은 내용을 한번 확인해 주세요. 제출한 뒤에는 고칠 수 없습니다.',
      consentTitle: '[필수] 개인정보 수집·이용 동의', consentRows: [
        ['수집 목적', '스태프 선발 검토, 면담 연락, 적어 주신 추천인께 추천서 요청'],
        ['수집 항목', '이름, 성별, 생년월일, 연락처, 이메일, 혼인·자녀 여부, 직업, 신앙·섬김 경험, 학력, 추천인 정보'],
        ['보유 기간', '검토 후 부적합 사항이 발견되면 결정 후 30일, 보류는 결정 후 12개월이 지나면 폐기합니다. 선발되면 스태프로 섬기는 동안 보관합니다.'],
        ['동의 거부', '동의하지 않으실 수 있으나, 동의하지 않으면 지원서를 검토할 수 없습니다.']],
      consentLabel: '위 개인정보 수집·이용에 동의합니다.',
      consent2Title: '[필수] 민감정보 처리 동의', consent2Rows: [
        ['수집 목적', '청소년을 섬기는 사역의 안전 확인, 함께 사역할 때 건강상 배려와 응급 상황 대비'],
        ['수집 항목', '이혼 경험, 형사 처벌·학대 관련 사항, 건강 정보(질환·복용 약·알레르기 — 적은 경우에만)'],
        ['보유 기간', '위 개인정보와 같습니다. 검토 담당자만 열람하며 암호화하여 보관합니다.'],
        ['동의 거부', '동의하지 않으실 수 있으나, 동의하지 않으면 지원서를 검토할 수 없습니다. 건강 정보는 적지 않아도 됩니다.']],
      consent2Label: '위 민감정보 처리에 동의합니다.',
      refNote: '다음을 누르면 추천인께 추천서 요청 메일이 바로 발송됩니다. 추천인 1은 담임목사님이나 교회 지도자로 적어 주세요.', emailLocked: '로그인한 이메일이 그대로 쓰입니다.',
      errRequired: '이 항목을 적어 주세요.', errEmail: '이메일 주소를 다시 확인해 주세요.', errStep: '빠진 항목이 있습니다.', errConsent: '동의해 주셔야 제출할 수 있습니다.', errNet: '연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.',
      doneTitle: '지원서가 접수되었습니다', doneLead: function (n) { return (n ? n + ' 님, ' : '') + '지원해 주셔서 감사합니다. 접수 내용은 메일로도 보내 드렸습니다. 이 화면은 다시 로그인하면 언제든 볼 수 있습니다.'; },
      refNo: '접수 번호', submittedAt: '제출 일시', stageNow: '진행 상황', refStatusTitle: '추천서', colRef: '추천인', colSent: '요청 메일', colState: '상태',
      refRole: function (n) { return n === 1 ? '추천인 1 · 목회자' : '추천인 2 · 동역자'; }, sentOn: function (d) { return d + ' 발송'; }, gotOn: function (d) { return d + ' 도착'; }, waiting: '기다리는 중', openedOn: function (d) { return d + ' 열어 봄 · 작성 기다리는 중'; }, failed: '발송 실패 (담당자가 확인합니다)',
      stage: { refs: function (a, b) { return '추천서를 기다리는 중 (' + b + '통 중 ' + a + '통 도착)'; }, ready: '추천서 도착 · 검토를 기다리는 중', review: '서류 검토 중', closed: '검토가 끝났습니다. 담당자가 연락드립니다.' },
      refHelp: '추천인께 메일함(스팸함 포함)을 한번 확인해 달라고 말씀드리면 더 빨리 진행됩니다. 추천서 내용은 지원자에게 공개되지 않습니다.',
      nextTitle: '앞으로의 진행', nextText: '추천서 두 통이 모두 도착하면 검토 담당자가 지원서를 검토하고, 면담 일정은 이메일이나 전화로 따로 연락드립니다.',
      checksTitle: '해당되는 항목이 있으면 표시해 주세요',
      refBarTitle: '추천서 요청', rsNone: '아직 보내지 않음', rsSentOn: function (d) { return d + ' 발송 · 답변 기다리는 중'; }, rsOpened: function (d) { return d + ' 링크 열어 봄 · 작성 기다리는 중'; }, rsDone: function (d) { return d + ' 추천서 도착'; }, rsExpired: '링크 기한 지남 · 다시 보내 주세요',
      sendingRef: '요청 메일 보내는 중…', refSentFlash: function (n, e) { return (n ? n + ' 님' : e) + '께 추천서 요청 메일을 보냈습니다. 진행 상황은 위쪽에서 확인할 수 있습니다.'; },
      refStepSent: function (e, d) { return e + ' 로 ' + d + '에 요청 메일을 보냈습니다.'; }, refStepDone: '이 추천인의 추천서가 도착했습니다.', refChanged: '이메일을 바꾸셨네요. 다음을 누르면 새 주소로 다시 보내고, 예전 링크는 닫힙니다.', resendRef: '다시 보내기',
      refNoteReview: '추천인 단계에서 요청 메일을 보내지 않은 추천인이 있으면 제출할 때 함께 보냅니다.',
      org: '월코 (Word of Life Korea)', footNote: '이 지원서는 스태프 선발에만 사용됩니다.', notAnswered: '(적지 않음)',
      kidName: '이름', kidGender: '성별', kidAge: '나이', kidMale: '남', kidFemale: '여', kidAdd: '+ 자녀 추가', kidDel: '삭제', kidAgeNone: '나이',
      age: function (a) { return a === '0' ? '1세 미만' : a === '26+' ? '26세 이상' : a + '세'; },
    },
    en: {
      title: 'Staff Application', lead: 'Word of Life Korea is recruiting staff to serve young people with us. We review each application together with two references, then invite applicants to an interview.',
      infoTitle: 'Before you begin', infoTimeL: 'Time', infoTime: 'About 20–30 minutes. Your answers are saved automatically and kept for 30 days, so you can come back and continue whenever it suits you.',
      infoRefL: 'References', infoRef: 'You will need the names and email addresses of two people: your pastor (or a church leader) and a co-worker (or friend).',
      infoMailL: 'Reference forms', infoMail: 'When you finish each reference step, our reference form is emailed to that person right away. It helps to let them know beforehand.',
      infoPrivL: 'Privacy', infoPriv: 'Only our reviewers read your application. If the review finds it unsuitable, it is destroyed 30 days after the decision.',
      infoAcctL: 'Your account', gateNote: 'You sign in with a temporary password sent by email. If you do not sign in for 30 days, the account and anything not yet submitted are deleted.',
      issueTitle: 'Get started', issueLead: 'We will email you a temporary password.', gateName: 'Name', gateEmail: 'Email', gatePw: 'Temporary password',
      issueBtn: 'Email me a password', issuing: 'Sending…', haveCode: 'Already have a password?', toLogin: 'Sign in',
      loginTitle: 'Sign in', loginLead: 'Enter the temporary password from your email.', loginBtn: 'Sign in', loggingIn: 'Checking…', lostCode: 'Lost your password?', resend: 'Get a new one',
      sent: function (e) { return 'We sent a temporary password to ' + e + '. If you cannot find it, please check your spam folder.'; }, expired: 'Your session has ended. Please sign in again.',
      logout: 'Sign out', expires: function (d) { return 'Your temporary account is kept until ' + d + '. Each sign-in extends it by 30 days.'; },
      progress: function (a, b) { return 'Step ' + a + ' of ' + b; }, saving: ' · Saving', savedAt: function (tm) { return ' · Saved at ' + tm; }, saveFail: ' · Not saved. Please check your connection',
      done: 'Done', review: 'Review and submit', prev: 'Back', next: 'Save and continue', toReview: 'Review answers', submit: 'Submit application', submitting: 'Submitting…', optional: 'Optional', edit: 'Edit',
      reviewLead: 'Please look over your answers before submitting. You cannot change them afterwards.',
      consentTitle: '[Required] Consent to collect and use personal information', consentRows: [
        ['Purpose', 'Reviewing your application for staff, contacting you for an interview, and requesting references from the people you list'],
        ['Items', 'Name, gender, date of birth, phone, email, marital status and children, occupation, faith and service history, education, reference details'],
        ['Retention', 'If the review finds your application unsuitable, it is destroyed 30 days after the decision; if put on hold, 12 months after the decision. If you are selected, it is kept while you serve on staff.'],
        ['Your right to refuse', 'You may refuse, but we cannot review your application without this consent.']],
      consentLabel: 'I agree to the collection and use of my personal information.',
      consent2Title: '[Required] Consent to process sensitive information', consent2Rows: [
        ['Purpose', 'Keeping young people safe in our ministry, and caring for your health and preparing for emergencies when we serve together'],
        ['Items', 'Divorce history, criminal or abuse-related matters, health information (conditions, medication, allergies — only if you provide it)'],
        ['Retention', 'Same as above. Only reviewers can see it, and it is stored encrypted.'],
        ['Your right to refuse', 'You may refuse, but we cannot review your application without this consent. Health information is optional.']],
      consent2Label: 'I agree to the processing of my sensitive information.',
      refNote: 'When you continue, a reference request is emailed to this person right away. Reference 1 should be your pastor or a church leader.', emailLocked: 'The email you signed in with is used.',
      errRequired: 'Please fill this in.', errEmail: 'Please check this email address.', errStep: 'Some answers are missing.', errConsent: 'Your consent is needed to submit.', errNet: 'Could not connect. Please check your connection and try again.',
      doneTitle: 'Your application has been received', doneLead: function (n) { return (n ? 'Thank you, ' + n + '. ' : 'Thank you for applying. ') + 'We have also emailed you a copy of this receipt. Sign in again at any time to see this page.'; },
      refNo: 'Reference no.', submittedAt: 'Submitted', stageNow: 'Status', refStatusTitle: 'References', colRef: 'Referee', colSent: 'Request', colState: 'Status',
      refRole: function (n) { return n === 1 ? 'Reference 1 · Pastor' : 'Reference 2 · Co-worker'; }, sentOn: function (d) { return 'Sent ' + d; }, gotOn: function (d) { return 'Received ' + d; }, waiting: 'Waiting', openedOn: function (d) { return 'Opened ' + d + ' · waiting'; }, failed: 'Not delivered (we will follow up)',
      stage: { refs: function (a, b) { return 'Waiting for references (' + a + ' of ' + b + ' received)'; }, ready: 'References received · awaiting review', review: 'Under review', closed: 'Review complete. We will be in touch.' },
      refHelp: 'Asking your references to check their inbox (and spam folder) will speed things up. Their references are not shared with you.',
      nextTitle: 'What happens next', nextText: 'Once both references arrive, our reviewers will read your application and contact you by email or phone to arrange an interview.',
      checksTitle: 'Tick any that apply',
      refBarTitle: 'Reference requests', rsNone: 'Not sent yet', rsSentOn: function (d) { return 'Sent ' + d + ' · awaiting reply'; }, rsOpened: function (d) { return 'Opened ' + d + ' · awaiting reply'; }, rsDone: function (d) { return 'Received ' + d; }, rsExpired: 'Link expired · please resend',
      sendingRef: 'Sending request…', refSentFlash: function (n, e) { return 'We emailed a reference request to ' + (n || e) + '. You can follow its status at the top of the page.'; },
      refStepSent: function (e, d) { return 'Request sent to ' + e + ' on ' + d + '.'; }, refStepDone: 'This reference has been received.', refChanged: 'You changed the email. When you continue we will send to the new address and close the old link.', resendRef: 'Send again',
      refNoteReview: 'Any reference not yet contacted will be emailed when you submit.',
      org: 'Word of Life Korea (WOLKO)', footNote: 'This application is used only for staff selection.', notAnswered: '(No answer)',
      kidName: 'Name', kidGender: 'Gender', kidAge: 'Age', kidMale: 'Male', kidFemale: 'Female', kidAdd: '+ Add a child', kidDel: 'Remove', kidAgeNone: 'Age',
      age: function (a) { return a === '0' ? 'Under 1' : a === '26+' ? '26 or older' : a; },
    },
  };
  var lang = (function () { try { var v = localStorage.getItem('wolko-apply-lang'); if (v === 'ko' || v === 'en') return v; } catch (e) {} return /^ko/i.test(navigator.language || '') ? 'ko' : 'en'; })();
  var t = function (k) { return T[lang][k]; };
  var tx = function (o) { return (o && (o[lang] || o.ko)) || ''; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var loc = function () { return lang === 'ko' ? 'ko-KR' : 'en-US'; };
  var fmtDate = function (iso, time) { return new Date(iso).toLocaleString(loc(), time ? { dateStyle: 'long', timeStyle: 'short' } : { dateStyle: 'long' }); };
  var fmtShort = function (iso) { return new Date(iso).toLocaleDateString(loc(), { month: 'long', day: 'numeric' }); };
  var num = function (n) { return Number(n).toLocaleString(loc()); };
  var token = (function () { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } })();
  var account = null, application = null;
  var values = {}, step = 0, errors = {}, consent = false, consent2 = false, flash = '', gateMode = 'start', saveTimer = null, saveState = '';
  var STEPS = SECTIONS.length + 1;   // 마지막은 확인 및 제출

  var visible = function (f) { return !(f.hideIf && values[f.hideIf] === true) && (!f.showIf || values[f.showIf.field] === f.showIf.equals); };
  var waived = function (f) { return [].concat(f.requiredUnless || []).some(function (id) { return values[id] === true; }); };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function api(method, path, body) {
    var headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = 'Bearer ' + token;
    var res = await fetch(path, { method: method, headers: headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    var data = await res.json().catch(function () { return {}; });
    if (res.status === 401 && token) { signOut(t('expired')); }
    if (!res.ok) { var err = new Error(data.error || t('errNet')); err.status = res.status; err.body = data; throw err; }
    return data;
  }
  function setToken(v) { token = v || ''; try { if (token) localStorage.setItem(TOKEN_KEY, token); else localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function setMode(m) { document.body.setAttribute('data-mode', m); }

  /* ───────── 첫 화면 · 로그인 ───────── */
  function gateMsg(msg, bad) { var el = $('apGateMsg'); el.hidden = !msg; el.textContent = msg || ''; el.classList.toggle('bad', !!bad); }
  function setGateMode(mode) { gateMode = mode; $('apIssueForm').hidden = mode !== 'start'; $('apLoginForm').hidden = mode !== 'login'; }
  function showGate(msg, bad) {
    setMode('gate');
    $('apGate').hidden = false; $('apMain').hidden = true; $('apDone').hidden = true; $('apAcct').hidden = true;
    setGateMode(gateMode); gateMsg(msg, bad);
  }
  function signOut(msg) {
    setToken(''); account = null; application = null; values = {}; step = 0; consent = false; consent2 = false;
    if (msg) gateMode = 'login';
    showGate(msg, !!msg);
  }
  $('apIssueForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var email = $('apIssueEmail').value.trim(), btn = $('apIssueBtn');
    if (!EMAIL_RE.test(email)) { gateMsg(t('errEmail'), true); $('apIssueEmail').focus(); return; }
    btn.disabled = true; btn.textContent = t('issuing'); gateMsg('');
    try {
      await api('POST', '/api/apply/account', { action: 'issue', email: email, name: $('apIssueName').value.trim(), lang: lang, website: $('apHoney').value });
      $('apLoginEmail').value = email; setGateMode('login'); gateMsg(t('sent')(email)); $('apLoginPw').focus();
    } catch (err) { gateMsg(err.message, true); }
    finally { btn.disabled = false; btn.textContent = t('issueBtn'); }
  });
  $('apLoginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = $('apLoginBtn'); btn.disabled = true; btn.textContent = t('loggingIn'); gateMsg('');
    try {
      var data = await api('POST', '/api/apply/account', { action: 'login', email: $('apLoginEmail').value.trim(), password: $('apLoginPw').value, lang: lang });
      setToken(data.token); $('apLoginPw').value = '';
      enter(data);
    } catch (err) { gateMsg(err.message, true); }
    finally { btn.disabled = false; btn.textContent = t('loginBtn'); }
  });
  document.addEventListener('click', function (e) {
    var m = e.target.closest('[data-gate]'); if (!m) return;
    if (m.dataset.gate === 'start' && $('apLoginEmail').value) $('apIssueEmail').value = $('apLoginEmail').value;
    if (m.dataset.gate === 'login' && $('apIssueEmail').value) $('apLoginEmail').value = $('apIssueEmail').value;
    setGateMode(m.dataset.gate); gateMsg('');
  });
  $('apLogout').addEventListener('click', async function () { clearTimeout(saveTimer); if (saveTimer) await saveNow(); api('POST', '/api/apply/account', { action: 'logout' }).catch(function () {}); signOut(''); });

  function enter(data) {
    account = data.account; application = data.application;
    var d = data.draft || {};
    values = d.values || {}; values.email = account.email; kids = null;
    if (!values.firstName && !values.nameKo && account.name) values[/[가-힣]/.test(account.name) ? 'nameKo' : 'firstName'] = account.name;
    step = Math.min(d.step || 0, STEPS - 1); errors = {};
    saveState = d.savedAt ? 'saved:' + d.savedAt : '';
    $('apGate').hidden = true; $('apAcct').hidden = false;
    if (application) showStatus(); else { setMode('form'); $('apMain').hidden = false; $('apDone').hidden = true; render(); }
  }

  /* ───────── 자동 저장 ───────── */
  function renderSaved() {
    var el = $('apSaved');
    el.classList.toggle('bad', saveState === 'fail');
    el.textContent = saveState === 'saving' ? t('saving') : saveState === 'fail' ? t('saveFail') : saveState.indexOf('saved:') === 0 ? t('savedAt')(new Date(saveState.slice(6)).toLocaleTimeString(loc(), { hour: 'numeric', minute: '2-digit' })) : '';
  }
  async function saveNow() {
    saveTimer = null;
    if (!account || application) return;
    saveState = 'saving'; renderSaved();
    try { var r = await api('PUT', '/api/apply/account', { values: values, step: step }); saveState = 'saved:' + r.savedAt; }
    catch (e) { if (e.status !== 401) saveState = 'fail'; }
    renderSaved();
  }
  function queueSave(delay) { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, delay == null ? 1200 : delay); }
  window.addEventListener('pagehide', function () { if (saveTimer && token) { clearTimeout(saveTimer); fetch('/api/apply/account', { method: 'PUT', keepalive: true, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token }, body: JSON.stringify({ values: values, step: step }) }).catch(function () {}); } });

  /* ───────── 지원서 ───────── */
  // 생년월일은 포탈 공용 달력(wolko-datepicker.js)에 연·월 선택칸을 붙여 연다 — 만 15세~85세 범위, 빈 칸이면 25년 전부터 보여 준다
  function birthCal() { var y = new Date().getFullYear(); return ' data-cal-jump data-cal-years="' + (y - 85) + ',' + (y - 15) + '" data-cal-start="' + (y - 25) + '"'; }
  /* 자녀: 이름 · 성별 · 나이를 한 줄씩. 서버·포탈에는 '김재인 / 남 / 3세' 같은 줄글로 저장한다(childrenNote) */
  var kids = null;
  var AGES = ['0'].concat(Array.from({ length: 25 }, function (_, i) { return String(i + 1); })).concat(['26+']);
  function parseKids(text) {
    return String(text || '').split('\n').map(function (line) {
      var parts = line.split(' / ').map(function (x) { return x.trim(); });
      if (!parts[0]) return null;
      var k = { name: parts[0], gender: '', age: '' };
      parts.slice(1).forEach(function (p) {
        if (/^(남|male|m)$/i.test(p)) k.gender = 'm';
        else if (/^(여|female|f)$/i.test(p)) k.gender = 'f';
        else if (/^(1세 미만|under 1)$/i.test(p)) k.age = '0';
        else if (/^(26세 이상|26 or older|26\+)$/i.test(p)) k.age = '26+';
        else { var m = /^(\d{1,2})(세)?$/.exec(p); if (m) k.age = String(+m[1]); }
      });
      return k;
    }).filter(Boolean);
  }
  function serializeKids() {
    return kids.filter(function (k) { return k.name.trim(); }).map(function (k) {
      return [k.name.trim().replace(/\s*\/\s*/g, ' '), k.gender ? t(k.gender === 'm' ? 'kidMale' : 'kidFemale') : '', k.age ? t('age')(k.age) : ''].filter(Boolean).join(' / ');
    }).join('\n');
  }
  function kidsHtml(f) {
    if (!kids) kids = parseKids(values.childrenNote);
    if (!kids.length) kids.push({ name: '', gender: '', age: '' });
    var err = errors[f.id];
    var rows = kids.map(function (k, i) {
      return '<div class="ap-kid" data-kid="' + i + '">' +
        '<input type="text" data-kid-name value="' + esc(k.name) + '" placeholder="' + esc(t('kidName')) + '" aria-label="' + esc(t('kidName')) + ' ' + (i + 1) + '" maxlength="60">' +
        '<span class="ap-choices" role="radiogroup" aria-label="' + esc(t('kidGender')) + ' ' + (i + 1) + '">' +
          '<label class="ap-choice"><input type="radio" name="kidg' + i + '" value="m" data-kid-gender' + (k.gender === 'm' ? ' checked' : '') + '><span>' + esc(t('kidMale')) + '</span></label>' +
          '<label class="ap-choice"><input type="radio" name="kidg' + i + '" value="f" data-kid-gender' + (k.gender === 'f' ? ' checked' : '') + '><span>' + esc(t('kidFemale')) + '</span></label></span>' +
        '<select data-kid-age aria-label="' + esc(t('kidAge')) + ' ' + (i + 1) + '"><option value="">' + esc(t('kidAgeNone')) + '</option>' + AGES.map(function (a) { return '<option value="' + a + '"' + (k.age === a ? ' selected' : '') + '>' + esc(t('age')(a)) + '</option>'; }).join('') + '</select>' +
        (kids.length > 1 ? '<button type="button" class="ap-link ap-kid-del" data-kid-del="' + i + '">' + esc(t('kidDel')) + '</button>' : '<span class="ap-kid-del"></span>') +
      '</div>';
    }).join('');
    return '<div class="ap-field wide' + (err ? ' has-err' : '') + '" data-wrap="' + f.id + '"><span class="ap-label">' + esc(tx(f.label)) + (f.required ? '<span class="ap-req" aria-hidden="true">*</span>' : '') + '</span>' +
      '<div class="ap-kids">' + rows + '</div><button type="button" class="ap-link ap-kid-add" data-kid-add>' + esc(t('kidAdd')) + '</button>' + (err ? '<p class="ap-ferr">' + esc(err) + '</p>' : '') + '</div>';
  }
  function readKids() {
    document.querySelectorAll('.ap-kid').forEach(function (row) {
      var k = kids[+row.getAttribute('data-kid')]; if (!k) return;
      k.name = row.querySelector('[data-kid-name]').value;
      var g = row.querySelector('[data-kid-gender]:checked'); k.gender = g ? g.value : '';
      k.age = row.querySelector('[data-kid-age]').value;
    });
    values.childrenNote = serializeKids();
    if (errors.childrenNote && values.childrenNote) { delete errors.childrenNote; var w = document.querySelector('[data-wrap="childrenNote"]'); if (w) { w.classList.remove('has-err'); var p = w.querySelector('.ap-ferr'); if (p) p.remove(); } }
    queueSave();
  }
  /* '기타'를 고르면 나오는 직접 입력칸, 학교명처럼 선택칸에 딸린 칸은 그 선택칸 바로 아래에 붙인다 */
  function subFields(s, f) { return f.type === 'select' ? s.fields.filter(function (c) { return ((c.showIf && c.showIf.field === f.id) || c.under === f.id) && visible(c); }) : []; }
  function sectionHtml(s) {
    var nested = {};
    s.fields.forEach(function (f) { subFields(s, f).forEach(function (c) { nested[c.id] = 1; }); });
    var list = s.fields.filter(function (f) { return visible(f) && !nested[f.id]; }), out = '';
    for (var i = 0; i < list.length; i++) {
      var f = list[i];
      if (f.type === 'checkbox') {   // 이어 붙은 체크박스는 '해당되면 표시' 한 묶음으로
        var run = []; while (i < list.length && list[i].type === 'checkbox') run.push(list[i++]); i--;
        out += run.length > 1 ? '<fieldset class="ap-field wide ap-checks"><legend>' + esc(t('checksTitle')) + '</legend>' + run.map(fieldHtml).join('') + '</fieldset>' : fieldHtml(f);
        continue;
      }
      var html = fieldHtml(f), subs = subFields(s, f);
      out += subs.length ? html.replace(/<\/div>$/, '<div class="ap-sub">' + subs.map(fieldHtml).join('') + '</div></div>') : html;
    }
    return out;
  }
  function countText(v, max) { return num(String(v || '').length) + ' / ' + num(max) + (lang === 'ko' ? '자' : ''); }
  function fieldHtml(f) {
    if (f.id === 'childrenNote') return kidsHtml(f);
    var v = values[f.id] == null ? '' : values[f.id], id = 'f_' + f.id, err = errors[f.id];
    if (f.type === 'checkbox') return '<div class="ap-field wide ap-skip" data-wrap="' + f.id + '"><label class="ap-check"><input type="checkbox" id="' + id + '" data-f="' + f.id + '"' + (v === true ? ' checked' : '') + '><span>' + esc(tx(f.label)) + '</span></label></div>';
    var head = '<label class="ap-label" for="' + id + '">' + esc(tx(f.label)) + (f.required && !waived(f) ? '<span class="ap-req" aria-hidden="true">*</span>' : '<span class="ap-opt">' + esc(t('optional')) + '</span>') + '</label>';
    var input, locked = f.id === 'email';
    if (f.type === 'textarea') input = '<textarea id="' + id + '" data-f="' + f.id + '" rows="5">' + esc(v) + '</textarea>';
    else if (f.type === 'select') input = '<select id="' + id + '" data-f="' + f.id + '"><option value="">' + (lang === 'ko' ? '선택' : 'Select') + '</option>' + f.options.map(function (o) { return '<option value="' + esc(o.v) + '"' + (v === o.v ? ' selected' : '') + '>' + esc(tx(o)) + '</option>'; }).join('') + '</select>';
    else if (f.type === 'radio') input = '<div class="ap-choices" role="radiogroup" aria-labelledby="' + id + '">' + f.options.map(function (o) { return '<label class="ap-choice"><input type="radio" name="' + id + '" data-f="' + f.id + '" value="' + esc(o.v) + '"' + (v === o.v ? ' checked' : '') + '><span>' + esc(tx(o)) + '</span></label>'; }).join('') + '</div>';
    else input = '<input id="' + id + '" data-f="' + f.id + '" type="' + (f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : 'text') + '" value="' + esc(v) + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + (f.type === 'email' ? ' autocomplete="email"' : f.type === 'tel' ? ' autocomplete="tel"' : '') + (f.id === 'birthDate' ? birthCal() : '') + (locked ? ' readonly' : '') + '>';
    if (f.type === 'textarea' && f.max) input += '<span class="ap-count" data-count="' + f.id + '" data-max="' + f.max + '">' + countText(v, f.max) + '</span>';
    var wide = f.type === 'textarea' || f.type === 'radio';
    return '<div class="ap-field' + (wide ? ' wide' : '') + (err ? ' has-err' : '') + '" data-wrap="' + f.id + '">' + head + input + (locked ? '<p class="ap-fhint">' + esc(t('emailLocked')) + '</p>' : '') + (err ? '<p class="ap-ferr">' + esc(err) + '</p>' : '') + '</div>';
  }

  function renderSteps() {
    var names = SECTIONS.map(function (s) { return tx(s.title); }).concat([t('review')]);
    $('apSteps').innerHTML = names.map(function (n, i) {
      var state = i < step ? ' done' : i === step ? ' active' : '';
      return '<button type="button" class="ap-step' + state + '" data-go="' + i + '"' + (i > step ? ' disabled' : '') + (i === step ? ' aria-current="step"' : '') + '><span>' + (i + 1) + '&#160;&#160;' + esc(n) + '</span>' + (i < step ? '<small>' + esc(t('done')) + '</small>' : '') + '</button>';
    }).join('');
    $('apBar').style.width = Math.round(((step + 1) / STEPS) * 100) + '%';
    $('apProg').textContent = t('progress')(step + 1, STEPS);
  }

  function renderReview() {
    var html = '<div class="ap-sec-head"><h2>' + STEPS + '. ' + esc(t('review')) + '</h2><p class="ap-sec-lead">' + esc(t('reviewLead')) + '</p></div>';
    SECTIONS.forEach(function (s, i) {
      html += '<section class="ap-sum"><div class="ap-sum-head"><h3>' + (i + 1) + '. ' + esc(tx(s.title)) + '</h3><button type="button" class="ap-link" data-go="' + i + '">' + esc(t('edit')) + '</button></div><dl>' +
        s.fields.filter(visible).map(function (f) {
          var v = values[f.id], shown = v;
          if (f.type === 'checkbox') { if (v !== true) return ''; shown = lang === 'ko' ? '예' : 'Yes'; }
          if (f.options) { var o = f.options.filter(function (x) { return x.v === v; })[0]; shown = o ? tx(o) : v; }
          return '<div><dt>' + esc(tx(f.label)) + '</dt><dd' + (v ? '' : ' class="empty"') + '>' + esc(v ? shown : t('notAnswered')) + '</dd></div>';
        }).join('') + '</dl></section>';
    });
    var box = function (key, id, on, err) {
      return '<section class="ap-consent' + (err ? ' has-err' : '') + '"><h3>' + esc(t(key + 'Title')) + '</h3><dl class="ap-consent-rows">' + t(key + 'Rows').map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>'; }).join('') + '</dl>' +
        '<label class="ap-check"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '><span>' + esc(t(key + 'Label')) + '</span></label>' + (err ? '<p class="ap-ferr">' + esc(t('errConsent')) + '</p>' : '') + '</section>';
    };
    html += box('consent', 'apConsent', consent, errors.consent) + box('consent2', 'apConsent2', consent2, errors.consent2);
    html += '<p class="ap-note">' + esc(t('refNoteReview')) + '</p>';
    return html;
  }

  function renderChrome() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i]').forEach(function (el) { var v = T[lang][el.getAttribute('data-i')]; if (typeof v === 'string') el.textContent = v; });
    document.querySelectorAll('.ap-lang button').forEach(function (b) { b.classList.toggle('on', b.dataset.lang === lang); b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
    if (account) { $('apAcctEmail').textContent = account.email; $('apAcctEmail').title = account.email; $('apAcctExp').textContent = t('expires')(fmtDate(account.expiresAt)); }
  }
  function render() {
    renderChrome();
    if (!account || application) return;
    renderSteps();
    var html;
    if (step < SECTIONS.length) {
      var s = SECTIONS[step];
      var isRef = s.id.indexOf('reference') === 0;
      var lead = s.intro ? tx(s.intro) : isRef ? t('refNote') : '';
      html = (flash ? '<p class="ap-flash" role="status">' + esc(flash) + '</p>' : '') + '<div class="ap-sec-head"><h2>' + (step + 1) + '. ' + esc(tx(s.title)) + '</h2>' + (lead ? '<p class="ap-sec-lead">' + esc(lead) + '</p>' : '') + (isRef ? refStepNote(+s.id.slice(-1)) : '') + '</div><div class="ap-grid">' + sectionHtml(s) + '</div>';
    } else html = renderReview();
    $('apStep').innerHTML = html;
    flash = '';
    renderRefBar();
    $('apPrev').hidden = step === 0;
    $('apNext').textContent = step < SECTIONS.length ? (step === SECTIONS.length - 1 ? t('toReview') : t('next')) : t('submit');
    renderSaved();
  }

  /* ───────── 추천서 요청: 추천인 단계에서 '다음'을 누르면 바로 보내고, 위쪽 띠에서 상태를 보여 준다 ───────── */
  function refsOf() { return (account && account.refs) || {}; }
  function refState(r) { return !r ? ['none', t('rsNone')] : r.status === 'completed' ? ['done', t('rsDone')(fmtShort(r.completedAt || r.sentAt))] : r.status === 'expired' ? ['expired', t('rsExpired')] : r.openedAt ? ['opened', t('rsOpened')(fmtShort(r.openedAt))] : ['sent', t('rsSentOn')(fmtShort(r.sentAt))]; }
  function renderRefBar() {
    var refs = refsOf(), bar = $('apRefBar');
    if (!refs[1] && !refs[2]) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.innerHTML = '<span class="ap-refbar-t">' + esc(t('refBarTitle')) + '</span>' + [1, 2].map(function (n) {
      var r = refs[n], st = refState(r);
      return '<span class="ap-refbar-i is-' + st[0] + '"><b>' + esc(t('refRole')(n)) + '</b>' + (r && r.name ? esc(r.name) + ' · ' : '') + esc(st[1]) + '</span>';
    }).join('');
  }
  function refStepNote(n) {
    var r = refsOf()[n]; if (!r) return '';
    var cur = String(values['ref' + n + 'Email'] || '').trim().toLowerCase();
    if (r.status === 'completed') return '<p class="ap-refnote is-done">' + esc(t('refStepDone')) + '</p>';
    if (cur && cur !== r.email) return '<p class="ap-refnote is-warn">' + esc(t('refChanged')) + '</p>';
    return '<p class="ap-refnote">' + esc(t('refStepSent')(r.email, fmtShort(r.sentAt))) + ' <button type="button" class="ap-link" data-ref-resend="' + n + '">' + esc(t('resendRef')) + '</button></p>';
  }
  async function sendRef(n, resend) {
    var btn = $('apNext'); btn.disabled = true; var label = btn.textContent; btn.textContent = t('sendingRef'); showError('');
    clearTimeout(saveTimer); saveTimer = null;
    try {
      var data = await api('POST', '/api/apply/account', { action: 'sendReference', n: n, values: values, step: step, resend: !!resend, lang: lang });
      account.refs = data.refs;
      if (data.sent) { var r = data.refs[n]; flash = t('refSentFlash')(r && r.name, r && r.email); }
      return true;
    } catch (err) {
      if (err.status === 401) return false;
      var b = err.body || {};
      if (b.missing && b.missing.length) { errors = {}; b.missing.forEach(function (id) { errors[id] = t('errRequired'); }); render(); }
      showError(err.message || t('errNet'));
      return false;
    } finally { btn.disabled = false; btn.textContent = label; }
  }
  document.addEventListener('visibilitychange', function () {   // 다른 탭에 다녀오면 추천서 도착 여부를 새로 가져온다
    if (document.visibilityState !== 'visible' || !account || application || document.body.getAttribute('data-mode') !== 'form') return;
    api('GET', '/api/apply/account').then(function (d) { account.refs = d.account.refs; renderRefBar(); }).catch(function () {});
  });

  /* ───────── 접수 확인 ───────── */
  function showStatus() {
    setMode('status');
    $('apMain').hidden = true; $('apGate').hidden = true; $('apDone').hidden = false;
    renderChrome();
    var a = application, refs = a.references || [];
    var got = refs.filter(function (r) { return r.status === 'completed'; }).length, total = refs.length || 2;
    var st = t('stage');
    $('apDoneLead').textContent = t('doneLead')(account && account.name);
    $('apRefNo').textContent = a.refNo || '—';
    $('apWhen').textContent = a.submittedAt ? fmtDate(a.submittedAt, true) : '—';
    $('apStage').textContent = a.stage === 'closed' ? st.closed : a.stage === 'review' ? st.review : got < total ? st.refs(got, total) : st.ready;
    $('apRefList').innerHTML = refs.map(function (r) {
      var state = r.status === 'completed' ? t('gotOn')(fmtShort(r.completedAt || r.sentAt)) : r.status === 'failed' ? t('failed') : r.openedAt ? t('openedOn')(fmtShort(r.openedAt)) : t('waiting');
      return '<tr><td>' + esc(r.name || '—') + '<small>' + esc(t('refRole')(r.n)) + '</small></td><td>' + (r.sentAt && r.status !== 'failed' ? esc(t('sentOn')(fmtShort(r.sentAt))) : '—') + '</td><td class="is-' + esc(r.status) + '">' + esc(state) + '</td></tr>';
    }).join('');
  }

  function validateStep(i) {
    var errs = {};
    SECTIONS[i].fields.filter(visible).forEach(function (f) {
      if (f.type === 'checkbox' || waived(f)) return;
      var v = String(values[f.id] == null ? '' : values[f.id]).trim();
      if (f.required && !v) errs[f.id] = t('errRequired');
      else if (v && f.type === 'email' && !EMAIL_RE.test(v)) errs[f.id] = t('errEmail');
    });
    return errs;
  }
  function showError(msg) { $('apErr').hidden = !msg; $('apErr').textContent = msg || ''; }
  function goTo(i) { step = Math.max(0, Math.min(STEPS - 1, i)); errors = {}; showError(''); render(); queueSave(0); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function focusFirstError() { var first = document.querySelector('.ap-field.has-err input, .ap-field.has-err textarea, .ap-field.has-err select, .ap-consent.has-err input'); if (first) { first.focus({ preventScroll: true }); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }

  async function submit() {
    for (var i = 0; i < SECTIONS.length; i++) { var e = validateStep(i); if (Object.keys(e).length) { step = i; errors = e; render(); showError(t('errStep')); focusFirstError(); return; } }
    if (!consent || !consent2) { errors = {}; if (!consent) errors.consent = 1; if (!consent2) errors.consent2 = 1; render(); showError(t('errConsent')); focusFirstError(); return; }
    var btn = $('apNext'); btn.disabled = true; btn.textContent = t('submitting'); showError('');
    clearTimeout(saveTimer); saveTimer = null;
    try {
      var body = await api('POST', '/api/apply/staff', { lang: lang, values: values, consent: true, consentSensitive: true });
      var now = new Date().toISOString();
      application = { refNo: body.ref, submittedAt: now, stage: 'received', references: (body.references || []).map(function (r) { return { n: r.n, name: [values['ref' + r.n + 'FirstName'], values['ref' + r.n + 'LastName']].filter(Boolean).join(' ') || values['ref' + r.n + 'NameKo'] || '', status: r.status, sentAt: now }; }) };
      showStatus(); window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err.status === 401) return;
      var b = err.body || {};
      if (b.missing && b.missing.length) {
        var bad = {}; b.missing.forEach(function (id) { bad[id] = t('errRequired'); });
        var at = SECTIONS.findIndex(function (s) { return s.fields.some(function (f) { return bad[f.id]; }); });
        if (at >= 0) { step = at; errors = bad; render(); }
      }
      showError(err.message || t('errNet'));
    }
    finally { btn.disabled = false; if (!$('apMain').hidden) render(); }
  }

  $('apForm').addEventListener('input', function (e) {
    var f = e.target.getAttribute('data-f');
    var cnt = f && document.querySelector('[data-count="' + f + '"]');
    if (cnt) cnt.textContent = countText(e.target.value, cnt.getAttribute('data-max'));
    if (f && f !== 'email') { values[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.type === 'radio' ? (e.target.checked ? e.target.value : values[f]) : e.target.value; if (errors[f]) { delete errors[f]; var w = document.querySelector('[data-wrap="' + f + '"]'); if (w) { w.classList.remove('has-err'); var p = w.querySelector('.ap-ferr'); if (p) p.remove(); } } queueSave(); }
    if (e.target.id === 'apConsent') consent = e.target.checked;
    if (e.target.id === 'apConsent2') consent2 = e.target.checked;
  });
  $('apForm').addEventListener('change', function (e) {
    var f = e.target.getAttribute('data-f');
    if (f && (e.target.type === 'radio' || e.target.type === 'checkbox' || e.target.tagName === 'SELECT')) {   // 조건부 항목(예: '예'일 때 설명 칸, 체크하면 필수가 풀리는 칸)이 바뀌므로 다시 그린다
      values[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; queueSave();
      if (e.target.type === 'checkbox') Object.keys(errors).forEach(function (k) { var x = SECTIONS[step] && SECTIONS[step].fields.filter(function (q) { return q.id === k; })[0]; if (x && [].concat(x.requiredUnless || []).indexOf(f) >= 0) delete errors[k]; });
      var keep = window.scrollY; render(); window.scrollTo(0, keep);
    }
    if (e.target.id === 'apConsent') { consent = e.target.checked; if (consent && errors.consent) { delete errors.consent; render(); } }
    if (e.target.id === 'apConsent2') { consent2 = e.target.checked; if (consent2 && errors.consent2) { delete errors.consent2; render(); } }
  });
  $('apForm').addEventListener('input', function (e) { if (e.target.closest('.ap-kid')) readKids(); });
  $('apForm').addEventListener('change', function (e) { if (e.target.closest('.ap-kid')) readKids(); });
  $('apForm').addEventListener('click', function (e) {
    var add = e.target.closest('[data-kid-add]'), del = e.target.closest('[data-kid-del]');
    if (!add && !del) return;
    readKids();
    if (add) kids.push({ name: '', gender: '', age: '' }); else kids.splice(+del.getAttribute('data-kid-del'), 1);
    values.childrenNote = serializeKids(); queueSave();
    var keep = window.scrollY; render(); window.scrollTo(0, keep);
    if (add) { var rows = document.querySelectorAll('[data-kid-name]'); rows[rows.length - 1].focus({ preventScroll: true }); }
  });
  $('apForm').addEventListener('submit', function (e) { e.preventDefault(); });
  $('apNext').addEventListener('click', function () {
    if (step === SECTIONS.length) { submit(); return; }
    errors = validateStep(step);
    if (Object.keys(errors).length) { render(); showError(t('errStep')); focusFirstError(); return; }
    var refN = /^reference(\d)$/.exec(SECTIONS[step].id);
    if (refN) { sendRef(+refN[1]).then(function (ok) { if (ok) goTo(step + 1); }); return; }
    goTo(step + 1);
  });
  $('apPrev').addEventListener('click', function () { goTo(step - 1); });
  document.addEventListener('click', function (e) { var b = e.target.closest('[data-ref-resend]'); if (b) sendRef(+b.getAttribute('data-ref-resend'), true).then(function (ok) { if (ok) { var y = window.scrollY; render(); window.scrollTo(0, y); } }); });
  document.addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g && !g.disabled) goTo(Number(g.getAttribute('data-go'))); });
  document.querySelectorAll('.ap-lang button').forEach(function (b) { b.addEventListener('click', function () { lang = b.dataset.lang; try { localStorage.setItem('wolko-apply-lang', lang); } catch (e) {} errors = {}; showError(''); if (application && account) showStatus(); else render(); }); });

  renderChrome();
  if (!token) showGate('');
  else api('GET', '/api/apply/account').then(enter).catch(function (e) { if (e.status !== 401) { setToken(''); showGate(e.message, true); } });
})();
