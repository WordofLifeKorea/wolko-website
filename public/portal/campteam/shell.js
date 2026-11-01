/* 캠프팀 공통 틀: 위쪽 머리글(계정 · 언어 · 로그아웃 — 월코 포털과 같은 자리) + 왼쪽 메뉴에 마우스를 올리면 보이는 한 줄 설명.
   컴퓨터 화면에서는 왼쪽 아래 언어·계정 칸을 숨기고 이 머리글을 쓴다. 폰에서는 머리글 대신 예전처럼 위쪽 막대(언어)와 서랍(계정)을 쓴다. */
(function () {
  var CT = window.CT; if (!CT) return;
  CT.addDict({
    ko: { navPrep: '캠프 준비',
      tipHome: '오늘 할 일과 공지를 한눈에 보는 첫 화면', tipCamps: '캠프마다 일정·업무·파일을 모아 보는 공간', tipPrep: '진행표 · 준비물 · 연락처 · 배정 · 설문 같은 캠프 준비 도구',
      tipTasks: '팀 업무 목록, 담당자와 기한 관리', tipCalendar: '팀 일정 · 캠프 기간 · 외출 달력', tipMeetings: '회의 기록과 함께 정한 일',
      tipFiles: '파일(PPT · PDF · 사진 · 영상)을 올리고 보관하는 곳', tipLibrary: '설교 · 찬양 콘티 · 게임 · 장소 정보 카드', tipResources: '기존 포털의 캠프 자료실을 그대로 열어요',
      tipTv: '사무실 TV에 띄울 화면 꾸미기', tipAlerts: '나에게 온 알림과 팀 공지', tipBudget: '캠프 예산과 장부 (권한이 있는 사람만)', tipTrash: '지운 항목을 되살리는 곳', tipSettings: '팀원 · 권한 · 설정 (관리자만)' },
    en: { navPrep: 'Camp Prep',
      tipHome: "Today's tasks and notices at a glance", tipCamps: 'A space per camp: schedule, tasks and files together', tipPrep: 'Camp prep tools: timeline, supplies, contacts, assignments, surveys',
      tipTasks: 'Team tasks, owners and due dates', tipCalendar: 'Team events, camp dates and out-of-office', tipMeetings: 'Meeting notes and what we decided',
      tipFiles: 'Where you upload and keep files (PPT, PDF, photos, video)', tipLibrary: 'Info cards: sermons, worship setlists, games, venues', tipResources: "Opens the portal's existing Camp Resources as is",
      tipTv: 'Design what shows on the office TV', tipAlerts: 'Your alerts and team notices', tipBudget: 'Camp budget and ledger (permission needed)', tipTrash: 'Restore deleted items', tipSettings: 'Members, permissions, settings (admins)' }
  });

  /* ---------- 위쪽 머리글: 계정 칩 · 언어 · 로그아웃 ---------- */
  var $ = function (id) { return document.getElementById(id); };
  function paintLang() { var ko = CT.lang() === 'ko'; var a = $('langKoT'), b = $('langEnT'); if (a) a.classList.toggle('on', ko); if (b) b.classList.toggle('on', !ko); }
  function paintChip() {
    var chip = $('ctChip'), me = CT.me; if (!chip || !me) return;
    var name = String(me.name || '').trim() || String(me.email || '').split('@')[0], role = CT.roleLabel ? CT.roleLabel(me.campRole) : '';
    $('ctAv').textContent = name.charAt(0).toUpperCase(); $('ctName').textContent = name; $('ctMail').textContent = me.email || '';
    chip.title = name + ' · ' + (me.email || '') + (role ? ' · ' + role : ''); chip.hidden = false;
    var out = $('ctLogout'); if (out) out.hidden = false;
  }
  function logout() {
    if (CT.usingGoogle && CT.usingGoogle()) { CT.googleLogout(); return; }
    if (window.WolkoSession && window.WolkoSession.logoutAll) { window.WolkoSession.logoutAll(); return; }
    try { ['wolko-hub-token', 'wolko-hub-email', 'wolko-hub-role'].forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) {}
    location.href = '/portal/';
  }
  var ko = $('langKoT'), en = $('langEnT'), out = $('ctLogout');
  if (ko) ko.onclick = function () { CT.setLang('ko'); }; if (en) en.onclick = function () { CT.setLang('en'); };
  if (out) { out.hidden = true; out.onclick = logout; }
  paintLang(); document.addEventListener('ct-lang', function () { paintLang(); paintChip(); }); document.addEventListener('ct-ready', function () { paintLang(); paintChip(); });

  /* ---------- 왼쪽 메뉴: 마우스를 올리면 한 줄 설명 (폰에서는 마우스가 없어 보이지 않는다) ---------- */
  if (!window.matchMedia || !matchMedia('(hover: hover)').matches) return;
  var tip = document.createElement('div'); tip.className = 'ct-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip);
  var timer = 0;
  function hide() { clearTimeout(timer); tip.hidden = true; }
  function show(a) {
    var key = a.getAttribute('data-tip'), text = key ? CT.t(key) : ''; if (!text || text === key) return;
    clearTimeout(timer); timer = setTimeout(function () {
      tip.textContent = text; tip.hidden = false; var r = a.getBoundingClientRect();
      tip.style.left = Math.round(r.right + 10) + 'px'; tip.style.top = Math.round(r.top + r.height / 2 - tip.offsetHeight / 2) + 'px';
    }, 250);
  }
  var nav = document.querySelector('aside .nav'); if (!nav) return;
  nav.addEventListener('mouseover', function (e) { var a = e.target.closest('a[data-tip]'); if (a) show(a); });
  nav.addEventListener('mouseout', function (e) { if (e.target.closest('a[data-tip]')) hide(); });
  nav.addEventListener('focusin', function (e) { var a = e.target.closest('a[data-tip]'); if (a) show(a); });
  nav.addEventListener('focusout', hide); nav.addEventListener('scroll', hide); document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
})();
