/* WOLKO 포탈 언어 동기화 — 모든 포탈 페이지 <head> 맨 앞에서 동기로 불러온다.
   페이지마다 따로 쓰던 언어 저장 키(wolko-lang · wolkoCarLang · wolkoAdminLang · wolkoHubLang · wolko_camp_resources_lang)를 하나로 묶는다.
   공개 홈페이지(BaseLayout)와 포탈 페이지가 모두 불러온다.
   1) 홈페이지·포탈에 새로 들어올 때마다(새 창·새 탭·메일 링크) 기기(컴퓨터·휴대폰)의 기본 언어를 따른다: 한국어면 KO, 그 밖에는 EN.
   2) 들어온 뒤 KO/EN을 직접 누르면, 그 창을 닫을 때까지 모든 페이지가 그 선택을 따른다(선택은 sessionStorage에만 둔다).
   페이지 스크립트가 읽기 전에 키 값을 미리 맞춰 두고, 어느 페이지에서 언어를 바꾸든 나머지 키도 함께 바꾼다. */
(function () {
  if (window.__wolkoLangSync) return; // 페이지가 두 번 불러도 한 번만 설치
  window.__wolkoLangSync = true;
  var KEYS = ['wolko-lang', 'wolkoCarLang', 'wolkoAdminLang', 'wolkoHubLang', 'wolko_camp_resources_lang'];
  var CHOICE = 'wolko-lang-choice';
  var store, session;
  try { store = window.localStorage; store.getItem(CHOICE); } catch (e) { return; }
  try { session = window.sessionStorage; session.getItem(CHOICE); } catch (e) { session = null; }

  function deviceLang() {
    var list = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'ko']);
    return String(list[0] || 'ko').toLowerCase().indexOf('ko') === 0 ? 'ko' : 'en';
  }
  function valid(v) { return v === 'ko' || v === 'en'; }
  var rawSet = Storage.prototype.setItem;
  function writeAll(lang) {
    KEYS.forEach(function (k) { try { if (store.getItem(k) !== lang) rawSet.call(store, k, lang); } catch (e) {} });
  }

  // 예전에는 선택을 영구 저장해서, 한 번 EN이 저장되면 한국어 휴대폰에서도 계속 영어로 열렸다 — 그 기록은 지운다
  try { if (store.getItem(CHOICE) !== null) store.removeItem(CHOICE); } catch (e) {}
  var choice = session ? session.getItem(CHOICE) : null;
  var lang = valid(choice) ? choice : deviceLang();
  writeAll(lang);

  // 페이지가 자기 키에 언어를 저장할 때마다 이번 방문의 선택으로 기록하고 모든 키를 같은 값으로 맞춘다
  Storage.prototype.setItem = function (key, value) {
    rawSet.apply(this, arguments);
    if (this === store && KEYS.indexOf(key) >= 0 && valid(value)) {
      if (session) { try { rawSet.call(session, CHOICE, value); } catch (e) {} }
      writeAll(value);
    }
  };
  document.documentElement.setAttribute('data-wolko-lang', lang);
})();
