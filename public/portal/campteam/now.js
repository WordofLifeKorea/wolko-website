/* 「지금」 화면 (로그인한 팀원, 폰에서 한 손으로 보는 용도): 시계 · 지금 · 다음 · 그 다음, 날짜 탭, 팀 걸러 보기.
   그리는 일은 now-view.js, 계산은 now-core.js. 이 파일은 로그인·서버 연결·「홈 화면에 추가」 안내·공개 링크 버튼만 맡는다. */
(function () {
  var CT = window.CT; if (!CT || !window.NowView) return;
  CT.addDict({
    ko: { nowTitle: '지금', nowSub: '지금 하는 일과 다음 일정을 한눈에. 폰에서 열어 두세요.', nowEmpty: '아직 올라온 진행표가 없어요.', nowEmptyGo: '캠프 준비 ▸ 진행표에서 일정을 올려 주세요', nowNoCamp: '보여 드릴 캠프가 아직 없어요.',
      nowHow: '홈 화면에 추가 방법', nowShare: '공개 링크', nowHintTitle: '폰 홈 화면에 추가하면 앱처럼 열려요', nowHintClose: '다시 보지 않기', nowHintOpen: '안내 열기',
      nowIos: 'iPhone (Safari)', nowIosSteps: ['아래 가운데 「공유」 버튼(네모에 화살표)을 눌러요.', '「홈 화면에 추가」를 고르고 오른쪽 위 「추가」를 눌러요.', '홈 화면의 「지금」 아이콘을 누르면 이 화면이 바로 열려요.'],
      nowAnd: 'Android (Chrome)', nowAndSteps: ['오른쪽 위 점 세 개(⋮) 메뉴를 눌러요.', '「홈 화면에 추가」(또는 「앱 설치」)를 눌러요.', '홈 화면의 「지금」 아이콘을 누르면 이 화면이 바로 열려요.'],
      nowLoginNote: '앱처럼 열었는데 로그인 화면이 나오면, 로그인 화면의 「wolko.org Google 계정으로 로그인」을 한 번 해 두세요. 그러면 폰에 로그인이 남아 있어요.', nowHowTitle: '홈 화면에 추가하는 방법', nowClose: '닫기' },
    en: { nowTitle: 'Now', nowSub: 'What is happening now and what is next. Keep it open on your phone.', nowEmpty: 'No timeline has been added yet.', nowEmptyGo: 'Add the schedule under Camp Prep ▸ Timeline', nowNoCamp: 'No camp to show yet.',
      nowHow: 'How to add to Home Screen', nowShare: 'Share link', nowHintTitle: 'Add this to your phone Home Screen to open it like an app', nowHintClose: "Don't show again", nowHintOpen: 'Show the guide',
      nowIos: 'iPhone (Safari)', nowIosSteps: ['Tap the Share button (a square with an arrow) at the bottom.', 'Choose "Add to Home Screen", then tap "Add" at the top right.', 'Tap the "Now" icon on your Home Screen to open this screen directly.'],
      nowAnd: 'Android (Chrome)', nowAndSteps: ['Tap the three-dot menu (⋮) at the top right.', 'Tap "Add to Home screen" (or "Install app").', 'Tap the "Now" icon on your Home screen to open this screen directly.'],
      nowLoginNote: 'If the app opens on a login screen, sign in once with "Sign in with your wolko.org Google account" on that screen. Your phone will then stay signed in.', nowHowTitle: 'How to add to Home Screen', nowClose: 'Close' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, HK = 'campteam-now-hint-v1', view = null;

  function steps(list) { return '<ol>' + CT.t(list).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>'; }
  function howHtml() { return '<div class="nowhow"><h4>' + esc(CT.t('nowIos')) + '</h4>' + steps('nowIosSteps') + '<h4>' + esc(CT.t('nowAnd')) + '</h4>' + steps('nowAndSteps') + '<p class="meta">' + esc(CT.t('nowLoginNote')) + '</p></div>'; }
  function standalone() { try { return (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; } catch (e) { return false; } }
  function hintSeen() { try { return localStorage.getItem(HK) === '1'; } catch (e) { return false; } }
  function paintHint() {
    var box = $('nowHint'); if (!box) return;
    if (hintSeen() || standalone()) { box.innerHTML = ''; return; }          // 처음 한 번만 보이고, 앱으로 열었을 때는 필요 없다
    box.innerHTML = '<section class="nowhint"><div class="nh-hd"><b>' + esc(CT.t('nowHintTitle')) + '</b><button type="button" class="btn sm" id="nowHintX">' + esc(CT.t('nowHintClose')) + '</button></div>' + howHtml() + '</section>';
    $('nowHintX').onclick = function () { try { localStorage.setItem(HK, '1'); } catch (e) { /* 저장 못 해도 이번엔 닫힌다 */ } box.innerHTML = ''; };
  }
  function openHow() {
    var d = $('nowDlg'); $('nowDlgBody').innerHTML = '<h3>' + esc(CT.t('nowHowTitle')) + '</h3>' + howHtml() + '<div class="dlg-actions"><button type="button" class="btn pri" id="nowDlgX">' + esc(CT.t('nowClose')) + '</button></div>';
    $('nowDlgX').onclick = function () { d.close(); }; d.showModal();
  }
  function emptyHtml(noCamp) {
    if (noCamp) return esc(CT.t('nowNoCamp'));
    return '<b>' + esc(CT.t('nowEmpty')) + '</b><br><a class="btn pri" href="/portal/campteam/prep/">' + esc(CT.t('nowEmptyGo')) + '</a>';
  }

  CT.boot(async function () {
    var canShare = CT.can('camps', 'edit');
    $('nowHow').onclick = openHow;
    var sb = $('nowShare'); sb.hidden = !canShare;
    paintHint(); document.addEventListener('ct-lang', paintHint);
    var qCamp = (new URLSearchParams(location.search).get('campId') || '');
    view = NowView.mount($('nowView'), {
      getLang: CT.lang, storeKey: 'campteam-now-teams', picker: true, print: false, emptyHtml: emptyHtml,
      load: function (campId) { return CT.api('/api/campteam/now?campId=' + encodeURIComponent(campId || qCamp)); }
    });
    if (canShare && window.CTShareLinks) sb.onclick = function () { var s = view.state; if (s.data && s.data.camp) CTShareLinks.open({ campId: s.data.camp.id, campName: s.data.camp.nameKo, teams: NowCore.teamList(s.data.teams, s.data.rows || []) }); };
  });
})();
