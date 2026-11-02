/* 새 신청서 그리기 — 홈페이지 신청 페이지(/camp-apply/)와 포털 「신청서」 미리보기가 같이 쓴다. (만든 신청서 내용 → 화면, 신청 보내기)
   글은 모두 textContent 로만 넣는다(HTML 로 해석하지 않는다). lang: 'both' = 한국어·영어를 둘 다 넣고 사이트의 언어 전환(.wl-ko/.wl-en)을 따른다 | 'ko' | 'en' = 그 언어만 */
(function () {
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  /* 준비기간: 글 안의 {준비기간} 을 그 캠프의 준비기간 날짜로 바꾸고, 「📅 준비기간 안내」 칸(prepinfo)을 채운다. 준비기간이 없으면 아무것도 보이지 않는다.
     PREP = { start:'YYYY-MM-DD', end:'YYYY-MM-DD' } | null — form.prep 으로 받는다(그 캠프의 준비기간 날짜 두 개뿐, 다른 정보는 받지 않는다) */
  var PREP = null, WD = { ko: ['일', '월', '화', '수', '목', '금', '토'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] }, DAY = /^\d{4}-\d{2}-\d{2}$/;
  function prepText(p) {   // → { ko: '12/20(토) ~ 12/26(금)', en: 'Sat 12/20 – Fri 12/26' } | null
    if (!p || !DAY.test(p.start || '') || !DAY.test(p.end || '') || p.end < p.start) return null;
    var one = function (s, l) { var w = new Date(s + 'T00:00:00Z').getUTCDay(), md = (+s.slice(5, 7)) + '/' + (+s.slice(8, 10)); return l === 'ko' ? md + '(' + WD.ko[w] + ')' : WD.en[w] + ' ' + md; };
    return { ko: one(p.start, 'ko') + ' ~ ' + one(p.end, 'ko'), en: one(p.start, 'en') + ' – ' + one(p.end, 'en') };
  }
  function sub(str, side) { str = String(str == null ? '' : str); if (str.indexOf('{준비기간}') < 0) return str; var t = prepText(PREP); return str.split('{준비기간}').join(t ? t[side] : ''); }
  function bi(tag, cls, o, lang) {   // {ko,en} → 언어에 맞는 글 (비어 있는 쪽은 다른 언어로 채운다)
    var ko = sub((o && o.ko) || (o && o.en) || '', 'ko'), en = sub((o && o.en) || (o && o.ko) || '', 'en');
    if (lang === 'ko') return el(tag, cls, ko); if (lang === 'en') return el(tag, cls, en);
    var w = el(tag, cls), a = el('span', 'wl-ko', ko), b = el('span', 'wl-en', en); w.appendChild(a); w.appendChild(b); return w;
  }
  function text(tag, cls, ko, en, lang) { return bi(tag, cls, { ko: ko, en: en }, lang); }
  var uid = 0;
  function field(b, lang) {
    if (b.type === 'prepinfo') {   // 읽기 전용 안내: 준비기간이 없으면 칸 자체를 그리지 않는다
      var pt = prepText(PREP); if (!pt) return null;
      var pbox = el('div', 'cf-prepinfo'); pbox.appendChild(bi('span', '', { ko: '📅 캠프 준비기간: ' + pt.ko + ' — 이 기간에 먼저 와서 교육·준비를 해요', en: '📅 Camp prep period: ' + pt.en + ' — please arrive early for training and preparation.' }, lang)); return pbox;
    }
    var wrap = el('div', 'cf-field cf-' + b.type), id = 'cf' + (++uid), lab;
    if (b.type === 'heading') { var h = bi('h3', 'cf-h', b.label, lang); return h; }
    if (b.type === 'paragraph') { var p = bi('p', 'cf-p', b.label, lang); return p; }
    wrap.dataset.id = b.id;
    function labelEl(forId) { lab = el('label', 'cf-label'); if (forId) lab.htmlFor = forId; lab.appendChild(bi('span', 'cf-lt', b.label, lang)); if (b.required) { var s = el('span', 'cf-req', ' *'); lab.appendChild(s); } return lab; }
    function help() { if (b.help && (b.help.ko || b.help.en)) wrap.appendChild(bi('small', 'cf-help', b.help, lang)); }
    var pick = function (o) { var k = sub(o.ko, 'ko'), e = sub(o.en, 'en'); return lang === 'en' ? (e || k) : lang === 'ko' ? (k || e) : ((k || e) + (e && k ? ' / ' + e : '')); };
    if (b.type === 'consent') {
      var l = el('label', 'cf-consent'), cb = el('input'); cb.type = 'checkbox'; cb.id = id; l.appendChild(cb); l.appendChild(bi('span', 'cf-ct', b.label, lang)); if (b.required) l.appendChild(el('span', 'cf-req', ' *'));
      wrap.appendChild(l); wrap._get = function () { return cb.checked; }; help(); return wrap;
    }
    wrap.appendChild(labelEl(b.type === 'radio' || b.type === 'checkbox' ? '' : id)); help();
    if (b.type === 'select') {
      var sel = el('select'); sel.id = id; var o0 = el('option', '', lang === 'en' ? '— Select —' : '— 선택 —'); o0.value = ''; sel.appendChild(o0);
      (b.options || []).forEach(function (o, i) { var op = el('option', '', pick(o)); op.value = String(i); sel.appendChild(op); }); wrap.appendChild(sel); wrap._get = function () { return sel.value; };
    } else if (b.type === 'radio' || b.type === 'checkbox') {
      var grp = el('div', 'cf-opts'), name = 'g' + id, ins = [];
      (b.options || []).forEach(function (o, i) { var l2 = el('label', 'cf-opt'), inp = el('input'); inp.type = b.type; inp.name = name; inp.value = String(i); ins.push(inp); l2.appendChild(inp); l2.appendChild(bi('span', '', { ko: pick(o), en: pick(o) }, lang === 'both' ? 'both' : lang)); grp.appendChild(l2); });
      wrap.appendChild(grp); wrap._get = function () { var v = ins.filter(function (x) { return x.checked; }).map(function (x) { return +x.value; }); return b.type === 'radio' ? (v.length ? v[0] : '') : v; };
    } else if (b.type === 'textarea') {
      var ta = el('textarea'); ta.id = id; ta.rows = 4; ta.maxLength = 2000; wrap.appendChild(ta); wrap._get = function () { return ta.value; };
    } else {
      var i = el('input'); i.id = id; i.maxLength = 300; i.type = b.type === 'email' ? 'email' : b.type === 'phone' ? 'tel' : b.type === 'date' ? 'date' : 'text'; if (b.type === 'phone') i.placeholder = '010-0000-0000'; if (b.type === 'email') i.placeholder = 'email@example.com';
      wrap.appendChild(i); wrap._get = function () { return i.value; };
    }
    return wrap;
  }
  /** 양식(blocks)을 root 안에 그린다. 반환: { collect(), blocks } — collect() 는 { 칸id: 값 } */
  function renderForm(root, form, lang) {
    root.textContent = ''; var fields = []; if ('prep' in form) PREP = form.prep || null;
    (form.blocks || []).forEach(function (b) { var f = field(b, lang); if (!f) return; root.appendChild(f); if (f._get) fields.push([b.id, f._get]); });
    var hp = el('div', 'cf-hp'); hp.setAttribute('aria-hidden', 'true'); var hi = el('input'); hi.type = 'text'; hi.name = 'website'; hi.tabIndex = -1; hi.autocomplete = 'off'; hp.appendChild(hi); root.appendChild(hp);
    return { collect: function () { var o = {}; fields.forEach(function (f) { o[f[0]] = f[1](); }); return o; }, honeypot: function () { return hi.value; } };
  }
  /** 카드 안내(일정·대상·참가비·신청 기간·안내 글) → 줄 목록 */
  function cardRows(card, lang) {
    var rows = [['일정', 'Dates', card.dateKo, card.dateEn], ['대상', 'For', card.targetKo, card.targetEn], ['참가비', 'Fee', card.priceKo, card.priceEn], ['신청 기간', 'Registration', card.deadlineKo, card.deadlineEn], ['안내', 'Notes', card.notesKo, card.notesEn]];
    return rows.filter(function (r) { return r[2] || r[3]; }).map(function (r) { return { label: { ko: r[0], en: r[1] }, value: { ko: r[2], en: r[3] } }; });
  }
  window.WolkoForm = { renderForm: renderForm, cardRows: cardRows, bi: bi, el: el, text: text, prepText: prepText, setPrep: function (p) { PREP = p || null; } };
})();
