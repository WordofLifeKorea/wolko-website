/* 추천서 작성 — 링크의 토큰(?t=)으로 지원자·추천인 정보와 질문을 받아 그리고, 한 번만 제출한다 (/api/apply/reference) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var token = new URLSearchParams(location.search).get('t') || '';
  var T = {
    en: { title: 'Confidential Reference Form', sub: 'Staff Application Reference · 스태프 지원서 추천서', stamp: 'CONFIDENTIAL', loading: 'Loading…', applicant: 'Applicant', referee: 'Referee', position: 'Position applied for', positionV: 'Staff — Word of Life Korea', due: 'Link valid until',
      intro: 'The applicant named above has applied to serve with Word of Life Korea, a ministry that reaches and disciples young people, and has listed you as a reference. Please answer candidly. Your reference is confidential: it is read only by our reviewers and is never shared with the applicant.',
      signedBy: 'Signature of referee', secure: 'Submitted securely and stored encrypted', submit: 'Submit Reference', submitting: 'Submitting…', required: 'Required', optional: 'Optional', select: 'Select',
      errRequired: 'This field is required.', errStep: 'Please complete the highlighted fields.', errNet: 'Could not submit. Please check your connection and try again.', invalid: 'This link is invalid or has expired. Please contact Word of Life Korea.',
      already: 'This reference has already been submitted. Thank you.', doneTitle: 'Thank you for your reference', doneLead: 'Your reference has been submitted securely. We are grateful for the time you took to help us care for the young people we serve.', footNote: 'This form is confidential and used only for staff selection.' },
    ko: { title: '추천서 (비공개)', sub: '스태프 지원서 추천서 · Confidential Reference Form', stamp: '대외비', loading: '불러오는 중…', applicant: '지원자', referee: '추천인', position: '지원 분야', positionV: '스태프 — 월코 (Word of Life Korea)', due: '링크 유효 기간',
      intro: '위 지원자가 청소년에게 복음을 전하고 제자로 세우는 사역 단체인 월코(Word of Life Korea)에 지원하면서 귀하를 추천인으로 적어 주셨습니다. 솔직하게 답해 주세요. 추천서는 비공개로 다뤄지며, 검토 담당자만 읽고 지원자에게는 공개되지 않습니다.',
      signedBy: '추천인 서명', secure: '안전하게 전송되고 암호화하여 저장됩니다', submit: '추천서 제출', submitting: '제출하는 중…', required: '필수', optional: '선택', select: '선택하세요',
      errRequired: '필수 항목입니다.', errStep: '표시된 항목을 작성해 주세요.', errNet: '제출하지 못했어요. 인터넷 연결을 확인하고 다시 시도해 주세요.', invalid: '링크가 올바르지 않거나 기한이 지났습니다. 월코에 문의해 주세요.',
      already: '이미 제출된 추천서입니다. 감사합니다.', doneTitle: '추천서를 보내 주셔서 감사합니다', doneLead: '추천서가 안전하게 제출되었습니다. 저희가 섬기는 청소년들을 위해 시간을 내어 주셔서 진심으로 감사드립니다.', footNote: '이 문서는 비공개이며 스태프 선발에만 사용됩니다.' },
  };
  var lang = (function () { try { var v = localStorage.getItem('wolko-ref-lang'); if (v === 'ko' || v === 'en') return v; } catch (e) {} return /^ko/i.test(navigator.language || '') ? 'ko' : 'en'; })();
  var t = function (k) { return T[lang][k]; };
  var tx = function (o) { return (o && (o[lang] || o.en)) || ''; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var data = null, values = {}, errors = {};
  var visible = function (f) { return !f.showIf || values[f.showIf.field] === f.showIf.equals; };

  function fieldHtml(f) {
    var v = values[f.id] == null ? '' : values[f.id], id = 'r_' + f.id, err = errors[f.id];
    var head = '<label class="ap-label" for="' + id + '">' + esc(tx(f.label)) + (f.required ? '<span class="ap-req">*</span>' : '<span class="ap-opt">' + esc(t('optional')) + '</span>') + '</label>';
    var input;
    if (f.type === 'textarea') input = '<textarea id="' + id + '" data-f="' + f.id + '" rows="4">' + esc(v) + '</textarea>';
    else if (f.type === 'select') input = '<select id="' + id + '" data-f="' + f.id + '"><option value="">' + esc(t('select')) + '</option>' + f.options.map(function (o) { return '<option value="' + esc(o.v) + '"' + (v === o.v ? ' selected' : '') + '>' + esc(tx(o)) + '</option>'; }).join('') + '</select>';
    else if (f.type === 'radio') input = '<div class="ap-choices">' + f.options.map(function (o) { return '<label class="ap-choice"><input type="radio" name="' + id + '" data-f="' + f.id + '" value="' + esc(o.v) + '"' + (v === o.v ? ' checked' : '') + '><span>' + esc(tx(o)) + '</span></label>'; }).join('') + '</div>';
    else if (f.type === 'checkbox') return '<div class="ap-field wide' + (err ? ' has-err' : '') + '"><label class="ap-check"><input type="checkbox" id="' + id + '" data-f="' + f.id + '"' + (v === true ? ' checked' : '') + '><span>' + esc(tx(f.label)) + '</span></label>' + (err ? '<p class="ap-ferr">' + esc(err) + '</p>' : '') + '</div>';
    else input = '<input id="' + id + '" data-f="' + f.id + '" type="' + (f.type === 'tel' ? 'tel' : 'text') + '" value="' + esc(v) + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + '>';
    var hint = f.hint ? '<p class="ap-sec-lead" style="margin:6px 0 0;font-size:12.5px">' + esc(tx(f.hint)) + '</p>' : '';
    return '<div class="ap-field' + (f.type === 'textarea' || f.type === 'radio' ? ' wide' : '') + (err ? ' has-err' : '') + '">' + head + input + hint + (err ? '<p class="ap-ferr">' + esc(err) + '</p>' : '') + '</div>';
  }
  function ratingTable(fields) {
    var opts = fields[0].options;
    return '<table class="rf-rate"><thead><tr><th></th>' + opts.map(function (o) { return '<th>' + esc(tx(o)) + '</th>'; }).join('') + '</tr></thead><tbody>' + fields.map(function (f) {
      return '<tr' + (errors[f.id] ? ' class="has-err"' : '') + '><th>' + esc(tx(f.label)) + (f.required ? ' <span class="ap-req">*</span>' : '') + '</th>' + opts.map(function (o) { return '<td data-label="' + esc(tx(o)) + '"><input type="radio" name="r_' + f.id + '" data-f="' + f.id + '" value="' + esc(o.v) + '"' + (values[f.id] === o.v ? ' checked' : '') + ' aria-label="' + esc(tx(f.label) + ' — ' + tx(o)) + '"></td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  }
  function render() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i]').forEach(function (el) { var v = T[lang][el.getAttribute('data-i')]; if (typeof v === 'string') el.textContent = v; });
    document.querySelectorAll('.ap-lang button').forEach(function (b) { b.classList.toggle('on', b.dataset.lang === lang); });
    if (!data) return;
    $('rfApplicant').textContent = data.applicant;
    $('rfReferee').textContent = [data.referee, data.refereeKo].filter(Boolean).join(' · ') || '—';
    $('rfDue').textContent = new Date(data.expiresAt).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'long' });
    $('rfDate').textContent = new Date().toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { dateStyle: 'long' });
    $('rfSections').innerHTML = data.sections.map(function (s, i) {
      var rating = s.fields.every(function (f) { return f.type === 'rating'; });
      return '<section class="rf-sec"><h2><span class="rf-num">' + (i + 1) + '</span>' + esc(tx(s.title)) + '</h2>' + (s.intro ? '<p>' + esc(tx(s.intro)) + '</p>' : '') +
        (rating ? ratingTable(s.fields) : '<div class="ap-grid">' + s.fields.filter(visible).map(fieldHtml).join('') + '</div>') + '</section>';
    }).join('');
    $('rfSignPreview').textContent = values.signature || '';
  }
  function validate() {
    var errs = {};
    data.sections.forEach(function (s) { s.fields.filter(visible).forEach(function (f) {
      var v = values[f.id];
      if (f.required && (f.type === 'checkbox' ? v !== true : !String(v == null ? '' : v).trim())) errs[f.id] = t('errRequired');
    }); });
    return errs;
  }
  function showErr(m) { $('rfErr').hidden = !m; $('rfErr').textContent = m || ''; }

  async function load() {
    if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) { $('rfStatus').textContent = t('invalid'); $('rfStatus').classList.add('bad'); return; }
    try {
      var res = await fetch('/api/apply/reference?t=' + encodeURIComponent(token), { cache: 'no-store' });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(t('invalid'));
      data = body;
      if (body.status === 'completed') { $('rfStatus').textContent = t('already'); return; }
      $('rfStatus').hidden = true; $('rfBody').hidden = false; render();
    } catch (e) { $('rfStatus').textContent = e.message; $('rfStatus').classList.add('bad'); }
  }

  $('rfForm').addEventListener('input', function (e) {
    var f = e.target.getAttribute('data-f'); if (!f) return;
    values[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (f === 'signature') $('rfSignPreview').textContent = values.signature || '';
  });
  $('rfForm').addEventListener('change', function (e) {
    var f = e.target.getAttribute('data-f'); if (!f) return;
    values[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (e.target.type === 'radio' && f === 'concern') { var y = window.scrollY; render(); window.scrollTo(0, y); }
  });
  $('rfForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    errors = validate();
    if (Object.keys(errors).length) { var y = window.scrollY; render(); window.scrollTo(0, y); showErr(t('errStep')); var el = document.querySelector('.has-err'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    var btn = $('rfSubmit'); btn.disabled = true; btn.textContent = t('submitting'); showErr('');
    try {
      var res = await fetch('/api/apply/reference', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, answers: values }) });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(body.error || t('errNet'));
      $('rfBody').hidden = true; $('rfDone').hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { showErr(err.message || t('errNet')); btn.disabled = false; btn.textContent = t('submit'); }
  });
  document.querySelectorAll('.ap-lang button').forEach(function (b) { b.addEventListener('click', function () { lang = b.dataset.lang; try { localStorage.setItem('wolko-ref-lang', lang); } catch (e) {} render(); }); });
  render(); load();
})();
