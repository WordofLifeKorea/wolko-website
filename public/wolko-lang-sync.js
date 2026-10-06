/* WOLKO 포탈 언어 동기화 — 모든 포탈 페이지 <head> 맨 앞에서 동기로 불러온다.
   페이지마다 따로 쓰던 언어 저장 키(wolko-lang · wolkoCarLang · wolkoAdminLang · wolkoHubLang · wolko_camp_resources_lang)를 하나로 묶는다.
   공개 홈페이지(BaseLayout)와 포탈 페이지가 모두 불러온다.
   1) 사용자가 직접 KO/EN을 누른 적이 있으면 그 선택을 모든 페이지가 따른다.
   2) 누른 적이 없으면 기기(컴퓨터·휴대폰)의 기본 언어를 따른다: 한국어면 KO, 그 밖에는 EN.
   페이지 스크립트가 읽기 전에 키 값을 미리 맞춰 두고, 어느 페이지에서 언어를 바꾸든 나머지 키도 함께 바꾼다. */
(function () {
  if (window.__wolkoLangSync) return; // 페이지가 두 번 불러도 한 번만 설치
  window.__wolkoLangSync = true;
  var KEYS = ['wolko-lang', 'wolkoCarLang', 'wolkoAdminLang', 'wolkoHubLang', 'wolko_camp_resources_lang'];
  var CHOICE = 'wolko-lang-choice';
  var store;
  try { store = window.localStorage; store.getItem(CHOICE); } catch (e) { return; }

  function deviceLang() {
    var list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'ko']);
    return String(list[0] || 'ko').toLowerCase().indexOf('ko') === 0 ? 'ko' : 'en';
  }
  function valid(v) { return v === 'ko' || v === 'en'; }
  var rawSet = Storage.prototype.setItem;
  function writeAll(lang) {
    KEYS.forEach(function (k) { try { if (store.getItem(k) !== lang) rawSet.call(store, k, lang); } catch (e) {} });
  }

  var choice = store.getItem(CHOICE);
  // 예전에 어느 페이지에서든 EN을 눌렀던 기록이 있으면 그것을 선택으로 이어받는다
  if (!valid(choice)) {
    var legacy = KEYS.map(function (k) { return store.getItem(k); }).filter(valid);
    if (legacy.length) { choice = legacy.indexOf('en') >= 0 ? 'en' : 'ko'; try { rawSet.call(store, CHOICE, choice); } catch (e) {} }
  }
  var lang = valid(choice) ? choice : deviceLang();
  writeAll(lang);

  // 페이지가 자기 키에 언어를 저장할 때마다 사용자의 선택으로 기록하고 모든 키를 같은 값으로 맞춘다
  Storage.prototype.setItem = function (key, value) {
    rawSet.apply(this, arguments);
    if (this === store && KEYS.indexOf(key) >= 0 && valid(value)) {
      try { rawSet.call(store, CHOICE, value); } catch (e) {}
      writeAll(value);
    }
  };
  document.documentElement.setAttribute('data-wolko-lang', lang);
})();
