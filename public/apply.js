/* 비공개 스태프 지원서 — 임시 비밀번호 로그인 · 단계별 입력 · 검사 · 서버에 자동 저장 · 제출 · 진행 상황 (/api/apply/account, /api/apply/staff) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var SECTIONS = JSON.parse($('apSchema').textContent);
  var TOKEN_KEY = 'wolko-apply-session';
  try { localStorage.removeItem('wolko-apply-draft-v1'); } catch (e) {}   // 예전 기기 저장본(민감 정보)이 남지 않게
  var T = {
    ko: {
      eyebrow: 'STAFF APPLICATION', title: '스태프 지원서', lead: '월코와 함께 다음 세대를 섬기는 일에 관심을 가져 주셔서 감사합니다. 아래 지원서를 정확하고 솔직하게 작성해 주세요.',
      factTime: '약 20–30분', factTimeL: '작성 시간', factRef: '추천인 2명', factRefL: '목회자 1명 포함', factSafe: '비공개 처리', factSafeL: '검토 담당자만 열람',
      gateStart: '처음 시작하기', gateLogin: '이어서 작성하기', issueTitle: '임시 비밀번호 받기', issueLead: '이메일로 임시 비밀번호를 보내 드립니다. 로그인하면 작성한 내용이 저장되어 언제든 다른 기기에서도 이어서 쓸 수 있습니다.',
      gateName: '이름', gateEmail: '이메일', gatePw: '임시 비밀번호', issueBtn: '임시 비밀번호 받기', issuing: '보내는 중…', loginTitle: '로그인', loginLead: '메일로 받은 임시 비밀번호를 입력해 주세요.', loginBtn: '로그인', loggingIn: '확인하는 중…',
      resend: '임시 비밀번호를 다시 받을래요', gateNote: '임시 계정은 이 지원서에만 쓰입니다. 30일 동안 로그인하지 않으면 계정과 제출하지 않은 작성 내용이 자동으로 삭제됩니다.',
      sent: function (e) { return e + ' 로 임시 비밀번호를 보냈습니다. 메일이 보이지 않으면 스팸함도 확인해 주세요.'; }, expired: '로그인 시간이 지났습니다. 다시 로그인해 주세요.',
      logout: '로그아웃', expires: function (d) { return d + '까지 로그인하지 않으면 삭제'; },
      prev: '이전', next: '다음', review: '검토 및 제출', submit: '지원서 제출', submitting: '제출하는 중…', required: '필수', optional: '선택',
      stepOf: function (a, b) { return a + ' / ' + b + ' 단계'; }, saving: '저장하는 중…', savedAt: function (tm) { return tm + ' 저장됨'; }, saveFail: '저장하지 못했어요 — 연결을 확인해 주세요', edit: '수정',
      reviewLead: '제출하기 전에 작성한 내용을 확인해 주세요. 제출 후에는 수정할 수 없습니다.',
      consentTitle: '개인정보 수집·이용 동의', consentText: '월코(Word of Life Korea)가 스태프 선발을 위해 이 지원서의 개인정보와 민감정보(이혼·형사·학대 관련 사항, 건강 정보)를 수집·이용하고, 작성한 추천인에게 추천서를 요청하는 것에 동의합니다. 정보는 검토 담당자만 열람하며, 선발되지 않은 경우 결정 후 12개월이 지나면 삭제됩니다.',
      consentLabel: '위 내용에 동의합니다.', refNote: '제출하면 추천인께 추천서 요청 메일이 자동으로 발송됩니다. 추천인 1은 담임목사님 또는 교회 지도자로 적어 주세요.', emailLocked: '로그인한 이메일로 고정됩니다.',
      errRequired: '필수 항목입니다.', errEmail: '올바른 이메일 주소를 입력해 주세요.', errStep: '빠진 항목을 확인해 주세요.', errConsent: '동의가 필요합니다.', errNet: '연결하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.',
      doneTitle: '지원서가 접수되었습니다', doneLead: '월코에 지원해 주셔서 감사합니다. 접수 확인 메일을 보내 드렸습니다.', statusLead: '제출하신 지원서의 진행 상황입니다.', refNo: '접수 번호', submittedAt: '제출 일시', nextTitle: '다음 단계',
      refStatusTitle: '추천서 진행 상황', refN: function (n) { return '추천인 ' + n; }, rsSent: '요청 메일 발송됨', rsCompleted: '추천서 도착', rsFailed: '메일 발송 실패 — 담당자가 확인합니다', stage: { received: '접수됨', review: '검토 중', closed: '검토 완료' },
      next1: '작성해 주신 추천인께 추천서 요청 메일이 자동으로 발송되었습니다. 추천인께 미리 알려 주시면 더 빨리 진행됩니다.', next2: '검토 담당자가 지원서와 추천서를 검토합니다.', next3: '면담 일정 등은 담당자가 이메일이나 전화로 연락드립니다.',
      footNote: '이 지원서는 월코 스태프 선발을 위해서만 사용됩니다.', notAnswered: '(작성하지 않음)',
    },
    en: {
      eyebrow: 'STAFF APPLICATION', title: 'Staff Application', lead: 'Thank you for your interest in serving the next generation with Word of Life Korea. Please complete this application accurately and honestly.',
      factTime: '20–30 minutes', factTimeL: 'Estimated time', factRef: '2 references', factRefL: 'Including one pastor', factSafe: 'Confidential', factSafeL: 'Reviewers only',
      gateStart: 'Start a new application', gateLogin: 'Continue my application', issueTitle: 'Get a temporary password', issueLead: 'We will email you a temporary password. Once signed in, your answers are saved so you can continue at any time, on any device.',
      gateName: 'Name', gateEmail: 'Email', gatePw: 'Temporary password', issueBtn: 'Email me a temporary password', issuing: 'Sending…', loginTitle: 'Sign in', loginLead: 'Enter the temporary password we emailed you.', loginBtn: 'Sign in', loggingIn: 'Checking…',
      resend: 'Send me a new temporary password', gateNote: 'This temporary account is used only for this application. If you do not sign in for 30 days, the account and any unsubmitted answers are deleted automatically.',
      sent: function (e) { return 'We sent a temporary password to ' + e + '. If you do not see it, please check your spam folder.'; }, expired: 'Your session has ended. Please sign in again.',
      logout: 'Sign out', expires: function (d) { return 'Deleted if no sign-in by ' + d; },
      prev: 'Back', next: 'Continue', review: 'Review & Submit', submit: 'Submit Application', submitting: 'Submitting…', required: 'Required', optional: 'Optional',
      stepOf: function (a, b) { return 'Step ' + a + ' of ' + b; }, saving: 'Saving…', savedAt: function (tm) { return 'Saved ' + tm; }, saveFail: 'Not saved — check your connection', edit: 'Edit',
      reviewLead: 'Please review your answers before submitting. You cannot edit the application after it is submitted.',
      consentTitle: 'Consent to collect and use personal information', consentText: 'I consent to Word of Life Korea collecting and using the personal and sensitive information in this application (marital history, criminal or abuse-related matters, and health information) for staff selection, and to contacting the references I have listed. Only reviewers will see this information; if I am not selected, it will be deleted 12 months after the decision.',
      consentLabel: 'I agree to the above.', refNote: 'When you submit, a reference request will be emailed to your references automatically. Reference 1 should be your pastor or a church leader.', emailLocked: 'Fixed to the email you signed in with.',
      errRequired: 'This field is required.', errEmail: 'Please enter a valid email address.', errStep: 'Please check the highlighted fields.', errConsent: 'Consent is required.', errNet: 'Could not connect. Please check your connection and try again.',
      doneTitle: 'Your application has been received', doneLead: 'Thank you for applying to serve with Word of Life Korea. A confirmation email has been sent to you.', statusLead: 'Here is the status of your application.', refNo: 'Reference no.', submittedAt: 'Submitted', nextTitle: 'What happens next',
      refStatusTitle: 'Reference status', refN: function (n) { return 'Reference ' + n; }, rsSent: 'Request emailed', rsCompleted: 'Reference received', rsFailed: 'Email failed — our team will follow up', stage: { received: 'Received', review: 'In review', closed: 'Review complete' },
      next1: 'Reference requests have been emailed to your references automatically. Letting them know in advance will speed things up.', next2: 'Our reviewers will review your application and references.', next3: 'We will contact you by email or phone to arrange an interview.',
      footNote: 'This application is used only for WOLKO staff selection.', notAnswered: '(No answer)',
    },
  };
  var lang = (function () { try { var v = localStorage.getItem('wolko-apply-lang'); if (v === 'ko' || v === 'en') return v; } catch (e) {} return /^ko/i.test(navigator.language || '') ? 'ko' : 'en'; })();
  var t = function (k) { return T[lang][k]; };
  var tx = function (o) { return (o && (o[lang] || o.ko)) || ''; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmtDate = function (iso, time) { return new Date(iso).toLocaleString(lang === 'ko' ? 'ko-KR' : 'en-US', time ? { dateStyle: 'long', timeStyle: 'short' } : { dateStyle: 'long' }); };
  var token = (function () { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } })();
  var account = null, application = null, justSubmitted = false;
  var values = {}, step = 0, errors = {}, consent = false, gateMode = 'start', saveTimer = null, saveState = '';
  var STEPS = SECTIONS.length + 1;   // 마지막은 검토 및 제출

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

  /* ───────── 로그인 화면 ───────── */
  function gateMsg(msg, bad) { var el = $('apGateMsg'); el.hidden = !msg; el.textContent = msg || ''; el.classList.toggle('bad', !!bad); }
  function setGateMode(mode) {
    gateMode = mode;
    $('apIssueForm').hidden = mode !== 'start'; $('apLoginForm').hidden = mode !== 'login';
    document.querySelectorAll('.ap-gate-tabs button').forEach(function (b) { var on = b.dataset.mode === mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
  }
  function showGate(msg, bad) {
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
  document.addEventListener('click', function (e) { var m = e.target.closest('[data-mode]'); if (m) { if (m.dataset.mode === 'start' && $('apLoginEmail').value) $('apIssueEmail').value = $('apLoginEmail').value; setGateMode(m.dataset.mode); gateMsg(''); } });
  $('apLogout').addEventListener('click', async function () { clearTimeout(saveTimer); if (saveTimer) await saveNow(); api('POST', '/api/apply/account', { action: 'logout' }).catch(function () {}); signOut(''); });

  function enter(data) {
    account = data.account; application = data.application;
    var d = data.draft || {};
    values = d.values || {}; values.email = account.email;
    if (!values.firstName && !values.nameKo && account.name) values[/[가-힣]/.test(account.name) ? 'nameKo' : 'firstName'] = account.name;
    step = Math.min(d.step || 0, STEPS - 1); errors = {};
    saveState = d.savedAt ? 'saved:' + d.savedAt : '';
    $('apGate').hidden = true; $('apAcct').hidden = false;
    if (application) showStatus(); else { $('apMain').hidden = false; $('apDone').hidden = true; render(); }
  }

  /* ───────── 자동 저장 ───────── */
  function renderSaved() {
    var el = $('apSaved'); if (!el) return;
    el.classList.toggle('bad', saveState === 'fail');
    el.textContent = saveState === 'saving' ? t('saving') : saveState === 'fail' ? t('saveFail') : saveState.indexOf('saved:') === 0 ? t('savedAt')(new Date(saveState.slice(6)).toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', { hour: 'numeric', minute: '2-digit' })) : '';
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
  function fieldHtml(f) {
    var v = values[f.id] == null ? '' : values[f.id], id = 'f_' + f.id, err = errors[f.id];
    var head = '<label class="ap-label" for="' + id + '">' + esc(tx(f.label)) + (f.required ? '<span class="ap-req" title="' + esc(t('required')) + '">*</span>' : '<span class="ap-opt">' + esc(t('optional')) + '</span>') + '</label>';
    var input, locked = f.id === 'email';
    if (f.type === 'textarea') input = '<textarea id="' + id + '" data-f="' + f.id + '" rows="5">' + esc(v) + '</textarea>';
    else if (f.type === 'select') input = '<select id="' + id + '" data-f="' + f.id + '"><option value="">' + (lang === 'ko' ? '선택하세요' : 'Select') + '</option>' + f.options.map(function (o) { return '<option value="' + esc(o.v) + '"' + (v === o.v ? ' selected' : '') + '>' + esc(tx(o)) + '</option>'; }).join('') + '</select>';
    else if (f.type === 'radio') input = '<div class="ap-choices" role="radiogroup" aria-labelledby="' + id + '">' + f.options.map(function (o) { return '<label class="ap-choice"><input type="radio" name="' + id + '" data-f="' + f.id + '" value="' + esc(o.v) + '"' + (v === o.v ? ' checked' : '') + '><span>' + esc(tx(o)) + '</span></label>'; }).join('') + '</div>';
    else input = '<input id="' + id + '" data-f="' + f.id + '" type="' + (f.type === 'tel' ? 'tel' : f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : 'text') + '" value="' + esc(v) + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + (f.type === 'email' ? ' autocomplete="email"' : f.type === 'tel' ? ' autocomplete="tel"' : '') + (locked ? ' readonly' : '') + '>';
    var wide = f.type === 'textarea' || f.type === 'radio';
    return '<div class="ap-field' + (wide ? ' wide' : '') + (err ? ' has-err' : '') + '" data-wrap="' + f.id + '">' + head + input + (locked ? '<p class="ap-fhint">' + esc(t('emailLocked')) + '</p>' : '') + (err ? '<p class="ap-ferr">' + esc(err) + '</p>' : '') + '</div>';
  }

  function renderSteps() {
    var names = SECTIONS.map(function (s) { return tx(s.title); }).concat([t('review')]);
    $('apSteps').innerHTML = names.map(function (n, i) {
      var state = i < step ? ' done' : i === step ? ' active' : '';
      return '<button type="button" class="ap-step' + state + '" data-go="' + i + '"' + (i > step ? ' disabled' : '') + '><span class="ap-step-n">' + (i < step ? '✓' : (i + 1)) + '</span><span class="ap-step-t">' + esc(n) + '</span></button>';
    }).join('');
    $('apBar').style.width = Math.round(((step + 1) / STEPS) * 100) + '%';
  }

  function renderReview() {
    var html = '<div class="ap-sec-head"><p class="ap-stepof">' + esc(t('stepOf')(STEPS, STEPS)) + '</p><h2>' + esc(t('review')) + '</h2><p class="ap-sec-lead">' + esc(t('reviewLead')) + '</p></div>';
    SECTIONS.forEach(function (s, i) {
      html += '<section class="ap-sum"><div class="ap-sum-head"><h3>' + esc(tx(s.title)) + '</h3><button type="button" class="ap-link" data-go="' + i + '">' + esc(t('edit')) + '</button></div><dl>' +
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
    if (account) { $('apAcctEmail').textContent = account.email; $('apAcctExp').textContent = t('expires')(fmtDate(account.expiresAt)); }
  }
  function render() {
    renderChrome();
    if (!account || application) return;
    renderSteps();
    var html;
    if (step < SECTIONS.length) {
      var s = SECTIONS[step];
      var isRef = s.id.indexOf('reference') === 0;
      html = '<div class="ap-sec-head"><p class="ap-stepof">' + esc(t('stepOf')(step + 1, STEPS)) + '</p><h2>' + esc(tx(s.title)) + '</h2>' + (isRef ? '<p class="ap-sec-lead">' + esc(t('refNote')) + '</p>' : '') + '</div><div class="ap-grid">' + s.fields.filter(visible).map(fieldHtml).join('') + '</div>';
    } else html = renderReview();
    $('apStep').innerHTML = html;
    $('apPrev').hidden = step === 0;
    $('apNext').textContent = step < SECTIONS.length ? (step === SECTIONS.length - 1 ? t('review') : t('next')) : t('submit');
    $('apNext').classList.toggle('submit', step === SECTIONS.length);
    renderSaved();
  }

  /* ───────── 제출 후 진행 상황 ───────── */
  function showStatus() {
    $('apMain').hidden = true; $('apGate').hidden = true; $('apDone').hidden = false;
    renderChrome();
    var a = application;
    $('apDone').querySelector('[data-i="doneLead"]').textContent = justSubmitted ? t('doneLead') : t('statusLead');
    $('apRefNo').textContent = a.refNo || '—';
    $('apWhen').textContent = a.submittedAt ? fmtDate(a.submittedAt, true) : '—';
    $('apRefList').innerHTML = (a.references || []).map(function (r) {
      var key = r.status === 'completed' ? 'rsCompleted' : r.status === 'failed' ? 'rsFailed' : 'rsSent';
      var when = r.status === 'completed' ? r.completedAt : r.sentAt;
      return '<li class="is-' + esc(r.status) + '"><span class="ap-rs-who"><b>' + esc(t('refN')(r.n)) + '</b>' + esc(r.name || '') + '</span><span class="ap-rs-state">' + esc(t(key)) + (when ? ' · ' + esc(fmtDate(when)) : '') + '</span></li>';
    }).join('') + '<li class="is-stage"><span class="ap-rs-who"><b>' + esc(t('refNo')) + '</b>' + esc(a.refNo || '') + '</span><span class="ap-rs-state">' + esc(t('stage')[a.stage] || '') + '</span></li>';
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
  function goTo(i) { step = Math.max(0, Math.min(STEPS - 1, i)); errors = {}; showError(''); render(); queueSave(0); window.scrollTo({ top: $('apMain').offsetTop - 12, behavior: 'smooth' }); }
  function focusFirstError() { var first = document.querySelector('.ap-field.has-err input, .ap-field.has-err textarea, .ap-field.has-err select, .ap-consent.has-err input'); if (first) { first.focus({ preventScroll: true }); first.scrollIntoView({ block: 'center', behavior: 'smooth' }); } }

  async function submit() {
    for (var i = 0; i < SECTIONS.length; i++) { var e = validateStep(i); if (Object.keys(e).length) { step = i; errors = e; render(); showError(t('errStep')); focusFirstError(); return; } }
    if (!consent) { errors = { consent: 1 }; render(); showError(t('errConsent')); focusFirstError(); return; }
    var btn = $('apNext'); btn.disabled = true; btn.textContent = t('submitting'); showError('');
    clearTimeout(saveTimer); saveTimer = null;
    try {
      var body = await api('POST', '/api/apply/staff', { lang: lang, values: values, consent: true });
      justSubmitted = true;
      application = { refNo: body.ref, submittedAt: new Date().toISOString(), stage: 'received', references: (body.references || []).map(function (r) { return { n: r.n, name: values['ref' + r.n + 'FirstName'] ? [values['ref' + r.n + 'FirstName'], values['ref' + r.n + 'LastName']].join(' ') : '', status: r.status, sentAt: new Date().toISOString() }; }) };
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
    finally { btn.disabled = false; if (!$('apMain').hidden) btn.textContent = step === SECTIONS.length ? t('submit') : t('next'); }
  }

  $('apForm').addEventListener('input', function (e) {
    var f = e.target.getAttribute('data-f');
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
