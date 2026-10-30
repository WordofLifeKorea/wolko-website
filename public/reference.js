/* 추천서 작성 — 링크의 토큰(?t=)으로 지원자·추천인 정보와 질문을 받아 공문서 모양으로 그리고, 한 번만 제출한다 (/api/apply/reference) */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var token = new URLSearchParams(location.search).get('t') || '';
  var T = {
    ko: { title: '추천서', sub: '스태프 지원자 추천서 · Staff Applicant Reference', docNo: '문서번호', sent: '발송일', security: '열람', secret: '검토 담당자만', loading: '불러오는 중…',
      applicant: '지원자', position: '지원 분야', positionV: '스태프', referee: '추천인', due: '회신 기한',
      intro: '위 지원자가 월코(Word of Life Korea) 스태프로 지원하면서 귀하를 추천인으로 적어 주셨습니다. 월코 스태프는 청소년을 가까이에서 섬기게 되므로, 지원자의 신앙과 인격에 대해 아시는 대로 솔직하게 적어 주시기 바랍니다. 이 추천서는 검토 담당자만 열람하며 지원자에게는 공개되지 않습니다.',
      rateLead: '해당하는 칸에 표시해 주세요.', confirm: '위 내용은 사실과 다름이 없음을 확인합니다.', signLabel: '추천인', signMark: '(서명)', signPh: '성함',
      secure: '제출하면 수정할 수 없습니다. 내용은 암호화하여 보관됩니다.', submit: '추천서 제출', submitting: '제출하는 중…', optional: '선택', select: '선택',
      errRequired: '이 항목을 적어 주세요.', errStep: '빠진 항목이 있습니다. 표시된 곳을 확인해 주세요.', errNet: '제출하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.',
      invalid: '링크가 올바르지 않거나 기한이 지났습니다. 월코로 문의해 주세요.', already: '이미 제출된 추천서입니다. 감사합니다.',
      doneTitle: '추천서를 잘 받았습니다. 감사합니다.', doneLead: '귀한 시간을 내어 주셔서 감사드립니다. 이 창은 닫으셔도 됩니다.', footNote: '월코 (Word of Life Korea) · 이 문서는 스태프 선발에만 사용됩니다.' },
    en: { title: 'Reference', sub: 'Staff Applicant Reference', docNo: 'Document no.', sent: 'Issued', security: 'Viewed by', secret: 'Reviewers only', loading: 'Loading…',
      applicant: 'Applicant', position: 'Position', positionV: 'Staff', referee: 'Referee', due: 'Reply by',
      intro: 'The applicant named above has applied to join the staff of Word of Life Korea and has named you as a reference. Our staff work closely with young people, so we ask you to tell us candidly what you know of the applicant’s faith and character. Only our reviewers will read this reference; it is never shown to the applicant.',
      rateLead: 'Please mark one box for each line.', confirm: 'I confirm that the above is true to the best of my knowledge.', signLabel: 'Referee', signMark: '(signature)', signPh: 'Full name',
      secure: 'Once submitted, this reference cannot be changed. It is stored encrypted.', submit: 'Submit reference', submitting: 'Submitting…', optional: 'Optional', select: 'Select',
      errRequired: 'Please fill this in.', errStep: 'Some answers are missing. Please check the marked items.', errNet: 'Could not submit. Please check your connection and try again.',
      invalid: 'This link is invalid or has expired. Please contact Word of Life Korea.', already: 'This reference has already been submitted. Thank you.',
      doneTitle: 'Thank you. Your reference has been received.', doneLead: 'We are grateful for the time you have given. You may close this page.', footNote: 'Word of Life Korea · This document is used only for staff selection.' },
  };
  var lang = (function () { try { var v = localStorage.getItem('wolko-ref-lang'); if (v === 'ko' || v === 'en') return v; } catch (e) {} return /^ko/i.test(navigator.language || '') ? 'ko' : 'en'; })();
  var t = function (k) { return T[lang][k]; };
  var tx = function (o) { return (o && (o[lang] || o.en)) || ''; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var fmt = function (iso) { return new Date(iso).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', lang === 'ko' ? { year: 'numeric', month: 'long', day: 'numeric' } : { dateStyle: 'long' }); };
  var data = null, values = {}, errors = {};
  var visible = function (f) { return !f.showIf || values[f.showIf.field] === f.showIf.equals; };
  var req = function (f) { return f.required ? '<span class="ap-req" aria-hidden="true">*</span>' : '<span class="ap-opt">' + esc(t('optional')) + '</span>'; };

  function control(f) {
    var v = values[f.id] == null ? '' : values[f.id], id = 'r_' + f.id;
    if (f.type === 'select') return '<select id="' + id + '" data-f="' + f.id + '"><option value="">' + esc(t('select')) + '</option>' + f.options.map(function (o) { return '<option value="' + esc(o.v) + '"' + (v === o.v ? ' selected' : '') + '>' + esc(tx(o)) + '</option>'; }).join('') + '</select>';
    if (f.type === 'radio') return '<div class="ap-choices">' + f.options.map(function (o) { return '<label class="ap-choice"><input type="radio" name="' + id + '" data-f="' + f.id + '" value="' + esc(o.v) + '"' + (v === o.v ? ' checked' : '') + '><span>' + esc(tx(o)) + '</span></label>'; }).join('') + '</div>';
    if (f.type === 'textarea') return '<textarea id="' + id + '" data-f="' + f.id + '" rows="4">' + esc(v) + '</textarea>';
    return '<input id="' + id + '" data-f="' + f.id + '" type="' + (f.type === 'tel' ? 'tel' : 'text') + '" value="' + esc(v) + '"' + (f.max ? ' maxlength="' + f.max + '"' : '') + '>';
  }
  /* 짧은 항목: 기재 표 한 줄 */
  function tableRow(f) {
    var lab = f.type === 'radio' ? '<span id="r_' + f.id + '">' + esc(tx(f.label)) + '</span>' : '<label for="r_' + f.id + '">' + esc(tx(f.label)) + '</label>';
    return '<tr' + (errors[f.id] ? ' class="has-err"' : '') + '><th scope="row">' + lab + req(f) + (f.hint ? '<span class="ap-fhint">' + esc(tx(f.hint)) + '</span>' : '') + '</th><td>' + control(f) + '</td></tr>';
  }
  /* 서술형: 질문 아래 넓게 */
  function stackField(f) {
    var err = errors[f.id];
    var lab = f.type === 'radio' ? '<span class="ap-label" id="r_' + f.id + '">' : '<label class="ap-label" for="r_' + f.id + '">';
    return '<div class="ap-field' + (err ? ' has-err' : '') + '">' + lab + esc(tx(f.label)) + req(f) + (f.type === 'radio' ? '</span>' : '</label>') + control(f) + (err ? '<p class="ap-ferr">' + esc(err) + '</p>' : '') + '</div>';
  }
  function ratingTable(fields) {
    var opts = fields[0].options;
    return '<table class="rf-rate"><thead><tr><th scope="col"></th>' + opts.map(function (o) { return '<th scope="col">' + esc(tx(o)) + '</th>'; }).join('') + '</tr></thead><tbody>' + fields.map(function (f) {
      return '<tr' + (errors[f.id] ? ' class="has-err"' : '') + '><th scope="row">' + esc(tx(f.label)) + '</th>' + opts.map(function (o) { return '<td data-label="' + esc(tx(o)) + '"><input type="radio" name="r_' + f.id + '" data-f="' + f.id + '" value="' + esc(o.v) + '"' + (values[f.id] === o.v ? ' checked' : '') + ' aria-label="' + esc(tx(f.label) + ' — ' + tx(o)) + '"></td>'; }).join('') + '</tr>';
    }).join('') + '</tbody></table>';
  }
  /* 마지막: 추천인 정보 표 → 확인 문구 · 날짜 → 서명란 · 확인 체크 */
  function signatureSection(s, num) {
    var rows = s.fields.filter(function (f) { return f.id !== 'signature' && f.id !== 'certify'; });
    var sig = s.fields.filter(function (f) { return f.id === 'signature'; })[0], cert = s.fields.filter(function (f) { return f.id === 'certify'; })[0];
    var html = '<section class="rf-sec"><h2>' + num + '. ' + esc(tx(s.title)) + '</h2><table class="rf-table"><tbody>' + rows.map(tableRow).join('') + '</tbody></table>';
    html += '<div class="rf-confirm"><p>' + esc(t('confirm')) + '</p><p class="rf-date">' + esc(fmt(new Date().toISOString())) + '</p></div><div class="rf-signer">';
    if (sig) html += '<div class="rf-signrow' + (errors.signature ? ' has-err' : '') + '"><label for="r_signature">' + esc(t('signLabel')) + '</label><input id="r_signature" data-f="signature" type="text" maxlength="' + (sig.max || 120) + '" value="' + esc(values.signature || '') + '" placeholder="' + esc(t('signPh')) + '" autocomplete="name"><small>' + esc(t('signMark')) + '</small></div>';
    if (cert) html += '<div class="' + (errors.certify ? 'has-err' : '') + '"><label class="ap-check"><input type="checkbox" id="r_certify" data-f="certify"' + (values.certify === true ? ' checked' : '') + '><span>' + esc(tx(cert.label)) + '</span></label></div>';
    return html + '</div></section>';
  }

  function render() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i]').forEach(function (el) { var v = T[lang][el.getAttribute('data-i')]; if (typeof v === 'string') el.textContent = v; });
    document.querySelectorAll('.ap-lang button').forEach(function (b) { b.classList.toggle('on', b.dataset.lang === lang); b.setAttribute('aria-pressed', String(b.dataset.lang === lang)); });
    if (!data) return;
    if (data.docNo || data.sentAt) { $('rfDocMeta').hidden = false; $('rfDocNo').textContent = data.docNo || '—'; $('rfSent').textContent = data.sentAt ? fmt(data.sentAt) : '—'; }
    $('rfApplicant').textContent = data.applicant;
    $('rfReferee').textContent = [data.refereeKo, data.referee].filter(Boolean).join(' · ') || '—';
    $('rfDue').textContent = fmt(data.dueAt || data.expiresAt);
    $('rfSections').innerHTML = data.sections.map(function (s, i) {
      if (s.id === 'signature') return signatureSection(s, i + 1);
      var fields = s.fields.filter(visible);
      var head = '<section class="rf-sec"><h2>' + (i + 1) + '. ' + esc(tx(s.title)) + '</h2>';
      if (s.fields.every(function (f) { return f.type === 'rating'; })) return head + '<p>' + esc(t('rateLead')) + '</p>' + ratingTable(s.fields) + '</section>';
      if (fields.some(function (f) { return f.type === 'textarea'; })) return head + '<div class="rf-stack">' + fields.map(stackField).join('') + '</div></section>';
      return head + '<table class="rf-table"><tbody>' + fields.map(tableRow).join('') + '</tbody></table></section>';
    }).join('');
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
  function rerender() { var y = window.scrollY; render(); window.scrollTo(0, y); }

  async function load() {
    if (!/^[A-Za-z0-9_-]{24,64}$/.test(token)) { $('rfStatus').textContent = t('invalid'); $('rfStatus').classList.add('bad'); return; }
    try {
      var res = await fetch('/api/apply/reference?t=' + encodeURIComponent(token), { cache: 'no-store' });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(t('invalid'));
      data = body;
      if (body.status === 'completed') { render(); $('rfStatus').textContent = t('already'); return; }
      $('rfStatus').hidden = true; $('rfBody').hidden = false; render();
    } catch (e) { $('rfStatus').textContent = e.message; $('rfStatus').classList.add('bad'); }
  }

  $('rfForm').addEventListener('input', function (e) {
    var f = e.target.getAttribute('data-f'); if (!f) return;
    values[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
  });
  $('rfForm').addEventListener('change', function (e) {
    var f = e.target.getAttribute('data-f'); if (!f) return;
    values[f] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (e.target.type === 'radio' && f === 'concern') rerender();   // '예'이면 설명 칸이 나온다
  });
  $('rfForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    errors = validate();
    if (Object.keys(errors).length) { rerender(); showErr(t('errStep')); var el = document.querySelector('.has-err'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; }
    var btn = $('rfSubmit'); btn.disabled = true; btn.textContent = t('submitting'); showErr('');
    try {
      var res = await fetch('/api/apply/reference', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: token, answers: values }) });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(body.error || t('errNet'));
      $('rfBody').hidden = true; $('rfDone').hidden = false; window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) { showErr(err.message || t('errNet')); btn.disabled = false; btn.textContent = t('submit'); }
  });
  document.querySelectorAll('.ap-lang button').forEach(function (b) { b.addEventListener('click', function () { lang = b.dataset.lang; try { localStorage.setItem('wolko-ref-lang', lang); } catch (e) {} if (data) rerender(); else render(); }); });
  render(); load();
})();
