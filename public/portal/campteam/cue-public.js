/* 진행표 공개 보기 화면(로그인 없음) — 주소의 ?t=토큰 으로 /api/campteam/share-view 를 읽어 now-view.js 로 그린다. 읽기만 된다. */
(function () {
  var t = new URLSearchParams(location.search).get('t') || '', app = document.getElementById('app'), first = true;
  var LK = 'wolko-lang', MSG = { ko: '이 링크는 없거나 더 이상 쓸 수 없어요. 링크를 보내 준 사람에게 새 링크를 부탁해 보세요.', en: 'This link does not exist or is no longer active. Ask the person who sent it for a new link.' };
  function lang() { try { return localStorage.getItem(LK) === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } }
  function setLang(l) { try { localStorage.setItem(LK, l); } catch (e) { /* 저장 못 해도 이번 화면은 바뀐다 */ } document.documentElement.lang = l; paintLang(); document.dispatchEvent(new Event('ct-lang')); }
  function paintLang() { document.getElementById('lko').classList.toggle('on', lang() === 'ko'); document.getElementById('len').classList.toggle('on', lang() === 'en'); }
  document.getElementById('lko').onclick = function () { setLang('ko'); }; document.getElementById('len').onclick = function () { setLang('en'); };
  document.documentElement.lang = lang(); paintLang();
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(t)) { app.innerHTML = '<div class="nv"><div class="nv-empty">' + MSG[lang()] + '</div></div>'; document.addEventListener('ct-lang', function () { app.innerHTML = '<div class="nv"><div class="nv-empty">' + MSG[lang()] + '</div></div>'; }); return; }
  NowView.mount(app, {
    getLang: lang, storeKey: 'cue-teams', picker: false, print: true,
    emptyHtml: function () { return lang() === 'en' ? 'No schedule has been posted yet.' : '아직 올라온 일정이 없어요.'; },
    load: function () {
      var url = '/api/campteam/share-view?t=' + encodeURIComponent(t) + (first ? '' : '&poll=1'); // 처음 한 번만 「열어 본 횟수」에 셈 — 자동 새로고침은 세지 않는다
      return fetch(url, { cache: 'no-store', referrerPolicy: 'no-referrer' }).then(function (r) {
        if (r.status === 404) { var e = new Error(MSG[lang()]); e.gone = true; throw e; }
        if (!r.ok) throw new Error(lang() === 'en' ? 'Could not load.' : '불러오지 못했어요.');
        return r.json();
      }).then(function (d) { first = false; return d; });
    }
  });
})();
