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
      infoMailL: '추천서', infoMail: '지원서를 제출하면 추천인께 추천서 양식이 이메일로 자동 발송됩니다. 미리 말씀드려 두시면 좋습니다.',
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
      consentTitle: '개인정보 수집·이용 동의', consentText: '월코(Word of Life Korea)가 스태프 선발을 위해 이 지원서의 개인정보와 민감정보(이혼·형사·학대 관련 사항, 건강 정보)를 수집·이용하고, 적어 주신 추천인께 추천서를 요청하는 것에 동의합니다. 정보는 검토 담당자만 열람하며, 검토 후 부적합 사항이 발견되면 결정 후 30일이 지나 폐기됩니다.',
      consentLabel: '위 내용에 동의합니다.', refNote: '제출하면 추천인께 추천서 요청 메일이 자동으로 갑니다. 추천인 1은 담임목사님이나 교회 지도자로 적어 주세요.', emailLocked: '로그인한 이메일이 그대로 쓰입니다.',
      errRequired: '이 항목을 적어 주세요.', errEmail: '이메일 주소를 다시 확인해 주세요.', errStep: '빠진 항목이 있습니다.', errConsent: '동의해 주셔야 제출할 수 있습니다.', errNet: '연결하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.',
      doneTitle: '지원서가 접수되었습니다', doneLead: function (n) { return (n ? n + ' 님, ' : '') + '지원해 주셔서 감사합니다. 접수 내용은 메일로도 보내 드렸습니다. 이 화면은 다시 로그인하면 언제든 볼 수 있습니다.'; },
      refNo: '접수 번호', submittedAt: '제출 일시', stageNow: '진행 상황', refStatusTitle: '추천서', colRef: '추천인', colSent: '요청 메일', colState: '상태',
      refRole: function (n) { return n === 1 ? '추천인 1 · 목회자' : '추천인 2 · 동역자'; }, sentOn: function (d) { return d + ' 발송'; }, gotOn: function (d) { return d + ' 도착'; }, waiting: '기다리는 중', failed: '발송 실패 (담당자가 확인합니다)',
      stage: { refs: function (a, b) { return '추천서를 기다리는 중 (' + b + '통 중 ' + a + '통 도착)'; }, ready: '추천서 도착 · 검토를 기다리는 중', review: '서류 검토 중', closed: '검토가 끝났습니다. 담당자가 연락드립니다.' },
      refHelp: '추천인께 메일함(스팸함 포함)을 한번 확인해 달라고 말씀드리면 더 빨리 진행됩니다. 추천서 내용은 지원자에게 공개되지 않습니다.',
      nextTitle: '앞으로의 진행', nextText: '추천서 두 통이 모두 도착하면 검토 담당자가 지원서를 검토하고, 면담 일정은 이메일이나 전화로 따로 연락드립니다.',
      org: '월코 (Word of Life Korea)', footNote: '이 지원서는 스태프 선발에만 사용됩니다.', notAnswered: '(적지 않음)',
    },
    en: {
      title: 'Staff Application', lead: 'Word of Life Korea is recruiting staff to serve young people with us. We review each application together with two references, then invite applicants to an interview.',
      infoTitle: 'Before you begin', infoTimeL: 'Time', infoTime: 'About 20–30 minutes. Your answers are saved automatically and kept for 30 days, so you can come back and continue whenever it suits you.',
      infoRefL: 'References', infoRef: 'You will need the names and email addresses of two people: your pastor (or a church leader) and a co-worker (or friend).',
      infoMailL: 'Reference forms', infoMail: 'When you submit, our reference form is emailed to them automatically. It helps to let them know beforehand.',
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
      consentTitle: 'Consent to the use of personal information', consentText: 'I consent to Word of Life Korea collecting and using the personal and sensitive information in this application (marital history, criminal or abuse-related matters, and health information) for staff selection, and to contacting the references I have listed. Only reviewers will see this information; if the review finds my application unsuitable, it will be destroyed 30 days after the decision.',
      consentLabel: 'I agree.', refNote: 'When you submit, a reference request is emailed to your references automatically. Reference 1 should be your pastor or a church leader.', emailLocked: 'The email you signed in with is used.',
      errRequired: 'Please fill this in.', errEmail: 'Please check this email address.', errStep: 'Some answers are missing.', errConsent: 'Your consent is needed to submit.', errNet: 'Could not connect. Please check your connection and try again.',
      doneTitle: 'Your application has been received', doneLead: function (n) { return (n ? 'Thank you, ' + n + '. ' : 'Thank you for applying. ') + 'We have also emailed you a copy of this receipt. Sign in again at any time to see this page.'; },
      refNo: 'Reference no.', submittedAt: 'Submitted', stageNow: 'Status', refStatusTitle: 'References', colRef: 'Referee', colSent: 'Request', colState: 'Status',
      refRole: function (n) { return n === 1 ? 'Reference 1 · Pastor' : 'Reference 2 · Co-worker'; }, sentOn: function (d) { return 'Sent ' + d; }, gotOn: function (d) { return 'Received ' + d; }, waiting: 'Waiting', failed: 'Not delivered (we will follow up)',
      stage: { refs: function (a, b) { return 'Waiting for references (' + a + ' of ' + b + ' received)'; }, ready: 'References received · awaiting review', review: 'Under review', closed: 'Review complete. We will be in touch.' },
      refHelp: 'Asking your references to check their inbox (and spam folder) will speed things up. Their references are not shared with you.',
      nextTitle: 'What happens next', nextText: 'Once both references arrive, our reviewers will read your application and contact you by email or phone to arrange an interview.',
      org: 'Word of Life Korea (WOLKO)', footNote: 'This application is used only for staff selection.', notAnswered: '(No answer)',
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
  var values = {}, step = 0, errors = {}, consent = false, gateMode = 'start', saveTimer = null, saveState = '';
  var STEPS = SECTIONS.length + 1;   // 마지막은 확인 및 제출

  var visible = function (f) { return !f.showIf || values[f.showIf.field] === f.showIf.equals; };
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
    setToken(''); account = null; application = null; values = {}; step = 0; consent = false;
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
    values = d.values || {}; values.email = account.email;
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
  function countText(v, max) { return num(String(v || '').length) + ' / ' + num(max) + (lang === 'ko' ? '자' : ''); }
  function fieldHtml(f) {
    var v = values[f.id] == null ? '' : values[f.id], id = 'f_' + f.id, err = errors[f.id];
    var head = '<label class="ap-label" for="' + id + '">' + esc(tx(f.label)) + (f.required ? '<span class="ap-req" aria-hidden="true">*</span>' : '<span class="ap-opt">' + esc(t('optional')) + '</span>') + '</label>';
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
          if (f.options) { var o = f.options.filter(function (x) { return x.v === v; })[0]; shown = o ? tx(o) : v; }
          return '<div><dt>' + esc(tx(f.label)) + '</dt><dd' + (v ? '' : ' class="empty"') + '>' + esc(v ? shown : t('notAnswered')) + '</dd></div>';
        }).join('') + '</dl></section>';
    });
    html += '<section class="ap-consent' + (errors.consent ? ' has-err' : '') + '"><h3>' + esc(t('consentTitle')) + '</h3><p>' + esc(t('consentText')) + '</p><label class="ap-check"><input type="checkbox" id="apConsent"' + (consent ? ' checked' : '') + '><span>' + esc(t('consentLabel')) + '</span></label>' + (errors.consent ? '<p class="ap-ferr">' + esc(t('errConsent')) + '</p>' : '') + '</section>';
    html += '<p class="ap-note">' + esc(t('refNote')) + '</p>';
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
      html = '<div class="ap-sec-head"><h2>' + (step + 1) + '. ' + esc(tx(s.title)) + '</h2>' + (lead ? '<p class="ap-sec-lead">' + esc(lead) + '</p>' : '') + '</div><div class="ap-grid">' + s.fields.filter(visible).map(fieldHtml).join('') + '</div>';
    } else html = renderReview();
    $('apStep').innerHTML = html;
    $('apPrev').hidden = step === 0;
    $('apNext').textContent = step < SECTIONS.length ? (step === SECTIONS.length - 1 ? t('toReview') : t('next')) : t('submit');
    renderSaved();
  }

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
      var state = r.status === 'completed' ? t('gotOn')(fmtShort(r.completedAt || r.sentAt)) : r.status === 'failed' ? t('failed') : t('waiting');
      return '<tr><td>' + esc(r.name || '—') + '<small>' + esc(t('refRole')(r.n)) + '</small></td><td>' + (r.sentAt && r.status !== 'failed' ? esc(t('sentOn')(fmtShort(r.sentAt))) : '—') + '</td><td class="is-' + esc(r.status) + '">' + esc(state) + '</td></tr>';
    }).join('');
  }

  function validateStep(i) {
    var errs = {};
    SECTIONS[i].fields.filter(visible).forEach(function (f) {
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
    if (!consent) { errors = { consent: 1 }; render(); showError(t('errConsent')); focusFirstError(); return; }
    var btn = $('apNext'); btn.disabled = true; btn.textContent = t('submitting'); showError('');
    clearTimeout(saveTimer); saveTimer = null;
    try {
      var body = await api('POST', '/api/apply/staff', { lang: lang, values: values, consent: true });
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
    if (f && f !== 'email') { values[f] = e.target.type === 'radio' ? (e.target.checked ? e.target.value : values[f]) : e.target.value; if (errors[f]) { delete errors[f]; var w = document.querySelector('[data-wrap="' + f + '"]'); if (w) { w.classList.remove('has-err'); var p = w.querySelector('.ap-ferr'); if (p) p.remove(); } } queueSave(); }
    if (e.target.id === 'apConsent') consent = e.target.checked;
  });
  $('apForm').addEventListener('change', function (e) {
    var f = e.target.getAttribute('data-f');
    if (f && (e.target.type === 'radio' || e.target.tagName === 'SELECT')) {   // 조건부 항목(예: '예'일 때 설명 칸)이 바뀌므로 다시 그린다
      values[f] = e.target.value; queueSave();
      var keep = window.scrollY; render(); window.scrollTo(0, keep);
    }
    if (e.target.id === 'apConsent') { consent = e.target.checked; if (consent && errors.consent) { delete errors.consent; render(); } }
  });
  $('apForm').addEventListener('submit', function (e) { e.preventDefault(); });
  $('apNext').addEventListener('click', function () {
    if (step === SECTIONS.length) { submit(); return; }
    errors = validateStep(step);
    if (Object.keys(errors).length) { render(); showError(t('errStep')); focusFirstError(); return; }
    goTo(step + 1);
  });
  $('apPrev').addEventListener('click', function () { goTo(step - 1); });
  document.addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g && !g.disabled) goTo(Number(g.getAttribute('data-go'))); });
  document.querySelectorAll('.ap-lang button').forEach(function (b) { b.addEventListener('click', function () { lang = b.dataset.lang; try { localStorage.setItem('wolko-apply-lang', lang); } catch (e) {} errors = {}; showError(''); if (application && account) showStatus(); else render(); }); });

  renderChrome();
  if (!token) showGate('');
  else api('GET', '/api/apply/account').then(enter).catch(function (e) { if (e.status !== 401) { setToken(''); showGate(e.message, true); } });
})();
