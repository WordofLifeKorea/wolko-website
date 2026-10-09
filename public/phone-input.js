/* 국가 코드 선택이 붙는 전화번호 입력칸.
 * <input data-intl-phone> 앞에 "🇰🇷 KR +82" 같은 선택칸을 붙인다. 기본은 한국(KR)이라 010-0000-0000 처럼 그대로 입력하면 되고,
 * 해외 번호는 나라를 고른 뒤 번호만 입력한다. 기존 코드가 input.value 를 읽으면 "+1 5551234567" 처럼 국가번호가 붙은 값이 나오고,
 * 서버가 한국 번호는 010-0000-0000 으로 한 번 더 정리한다. */
(function () {
  var COUNTRIES = [
    ['KR', '🇰🇷', '82'], ['USA', '🇺🇸', '1'], ['CA', '🇨🇦', '1'], ['UK', '🇬🇧', '44'], ['AU', '🇦🇺', '61'], ['NZ', '🇳🇿', '64'],
    ['JP', '🇯🇵', '81'], ['CN', '🇨🇳', '86'], ['PH', '🇵🇭', '63'], ['VN', '🇻🇳', '84'], ['TH', '🇹🇭', '66'], ['SG', '🇸🇬', '65'],
    ['DE', '🇩🇪', '49'], ['FR', '🇫🇷', '33'],
  ];
  var nativeValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  var BY_DIAL = COUNTRIES.slice().sort(function (a, b) { return b[2].length - a[2].length; });

  function enhance(input) {
    if (input.dataset.ipReady) return;
    input.dataset.ipReady = '1';
    var krPlaceholder = input.getAttribute('placeholder') || '010-0000-0000';
    var wrap = document.createElement('div');
    wrap.className = 'ip-wrap';
    var select = document.createElement('select');
    select.className = 'ip-cc';
    select.setAttribute('aria-label', 'Country code');
    select.innerHTML = COUNTRIES.map(function (c) { return '<option value="' + c[0] + '">' + c[1] + ' ' + c[0] + ' +' + c[2] + '</option>'; }).join('');
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
  }

  function init() { document.querySelectorAll('input[data-intl-phone]').forEach(enhance); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
