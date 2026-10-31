/* 국가 코드 선택이 붙는 전화번호 입력칸.
 * <input data-intl-phone> 앞에 "🇰🇷 KR +82" 같은 선택칸을 붙인다. 기본은 한국(KR)이라 010-0000-0000 처럼 그대로 입력하면 되고,
 * 해외 번호는 나라를 고른 뒤 번호만 입력한다. 기존 코드가 input.value 를 읽으면 "+1 5551234567" 처럼 국가번호가 붙은 값이 나오고,
 * 서버가 한국 번호는 010-0000-0000 으로 한 번 더 정리한다(functions/lib/phone.js).
 * 한국 번호는 칸을 벗어날 때 바로 010-0000-0000 으로 맞추고, 흔한 실수('01-7334-7848' · '10-1234-5678' · 전각 숫자)는
 * 고친 번호를 칸 아래에 알려 준다. 서버의 normalizePhone 과 같은 규칙이다. */
(function () {
  var COUNTRIES = [
    ['KR', '🇰🇷', '82'], ['USA', '🇺🇸', '1'], ['CA', '🇨🇦', '1'], ['UK', '🇬🇧', '44'], ['AU', '🇦🇺', '61'], ['NZ', '🇳🇿', '64'],
    ['JP', '🇯🇵', '81'], ['CN', '🇨🇳', '86'], ['PH', '🇵🇭', '63'], ['VN', '🇻🇳', '84'], ['TH', '🇹🇭', '66'], ['SG', '🇸🇬', '65'],
    ['DE', '🇩🇪', '49'], ['FR', '🇫🇷', '33'],
  ];
  var nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  var BY_DIAL = COUNTRIES.slice().sort(function (a, b) { return b[2].length - a[2].length; });

  // 한국 휴대폰 번호 정리 — 고칠 수 없으면 null (서버 functions/lib/phone.js 와 같은 규칙)
  function fmtKr(d) {
    if (!/^01[016789]\d{7,8}$/.test(d)) return null;
    var rest = d.slice(3);
    return d.slice(0, 3) + '-' + (rest.length === 8 ? rest.slice(0, 4) + '-' + rest.slice(4) : rest.slice(0, 3) + '-' + rest.slice(3));
  }
  function fixKr(text) {
    var raw = String(text || '').normalize ? String(text || '').normalize('NFKC').trim() : String(text || '').trim();
    if (!raw || raw.charAt(0) === '+') return null;
    var groups = raw.split(/\D+/).filter(Boolean);
    if (groups.length >= 2 && /^(0|1|01)$/.test(groups[0]) && groups.slice(1).join('').length === 8) return fmtKr('010' + groups.slice(1).join(''));
    var digits = raw.replace(/\D/g, '');
    return fmtKr(digits) || fmtKr('0' + digits);
  }
  function isEn() { var h = document.documentElement, b = document.body; return h.classList.contains('lang-en') || (b && b.classList.contains('lang-en')) || h.lang === 'en'; }

  function enhance(input) {
    if (input.dataset.ipReady) return;
    input.dataset.ipReady = '1';
    var krPlaceholder = input.getAttribute('placeholder') || '010-0000-0000';
    var wrap = document.createElement('div');
    wrap.className = 'ip-wrap';
    var select = document.createElement('select');
    select.className = 'ip-cc';
    select.setAttribute('aria-label', 'Country code');
    select.innerHTML = COUNTRIES.map(function (c) { return '<option value="' + c[0] + '">' + c[0] + ' +' + c[2] + '</option>'; }).join('');
    input.parentNode.insertBefore(wrap, input);
    wrap.append(select, input);

    function dialOf() { var code = select.value; for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i][0] === code) return COUNTRIES[i][2]; return '82'; }
    function syncPlaceholder() { input.setAttribute('placeholder', select.value === 'KR' ? krPlaceholder : 'Phone number'); }

    Object.defineProperty(input, 'value', {
      configurable: true,
      get: function () {
        var typed = String(nativeValue.get.call(input) || '').trim();
        if (!typed) return '';
        if (typed.charAt(0) === '+' || select.value === 'KR') return typed;
        return '+' + dialOf() + ' ' + typed.replace(/^0+(?=\d)/, '');
      },
      set: function (next) {
        var text = String(next == null ? '' : next).trim();
        if (text.charAt(0) === '+') {
          var digits = text.slice(1).replace(/\D/g, '');
          for (var i = 0; i < BY_DIAL.length; i++) {
            var c = BY_DIAL[i];
            if (digits.indexOf(c[2]) === 0) {
              select.value = c[0];
              nativeValue.set.call(input, c[0] === 'KR' ? text : digits.slice(c[2].length));
              syncPlaceholder();
              return;
            }
          }
        }
        select.value = 'KR';
        nativeValue.set.call(input, text);
        syncPlaceholder();
      },
    });
    select.addEventListener('change', function () { syncPlaceholder(); input.dispatchEvent(new Event('input', { bubbles: true })); });
    syncPlaceholder();

    // 칸을 벗어나면 한국 번호를 010-0000-0000 으로 — 숫자를 고쳤으면(빠뜨린 0 등) 칸 아래에 알려 준다
    var note = document.createElement('small');
    note.className = 'ip-fixed';
    note.hidden = true;
    note.setAttribute('aria-live', 'polite');
    wrap.insertAdjacentElement('afterend', note);
    input.addEventListener('blur', function () {
      if (select.value !== 'KR') return;
      var typed = String(nativeValue.get.call(input) || '');
      var fixed = fixKr(typed);
      if (!fixed || fixed === typed.trim()) { if (!fixed) note.hidden = true; return; }
      var changedDigits = fixed.replace(/\D/g, '') !== typed.replace(/\D/g, '');
      nativeValue.set.call(input, fixed);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      note.hidden = !changedDigits;
      if (changedDigits) {
        note.textContent = isEn() ? 'We corrected the number to ' + fixed + '. Please check it.' : '번호를 ' + fixed + ' 로 고쳤어요. 맞는지 확인해 주세요.';
        note.hidden = false;
      }
    });
    input.addEventListener('input', function (e) { if (e.isTrusted) note.hidden = true; });
  }

  function init() { document.querySelectorAll('input[data-intl-phone]').forEach(enhance); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
