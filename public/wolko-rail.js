/* WOLKO 내부 도구 공용 좌측 레일 — 데스크톱 폭(900px~)에서만 표시.
   각 도구 페이지 head에 이 스크립트와 wolko-rail.css를 넣으면 자동 삽입됨.
   라벨은 항상 펼쳐서 보여준다(예전엔 아이콘만 두고 호버해야 이름이 보였는데,
   페이지 사이 이동이 잘 안 보인다는 피드백으로 상시 펼침으로 바꿨다). */
(function () {
  var GROUPS = [{ id: 'wolko', ko: '월코', en: 'WOLKO' }, { id: 'camp', ko: '캠프', en: 'Camp' }];
  var TOOLS = [
    { group: 'wolko', href: '/schedule', color: '#1da462', label: '월코 캘린더', label_en: 'WOLKO Calendar',
      icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/><rect x="7" y="13.5" width="4" height="4" rx="1" fill="currentColor" stroke="none"/>' },
    { group: 'wolko', href: '/crs', color: '#7a5fc4', label: 'CRS', label_en: 'CRS',
      icon: '<path d="M12 2v3M10.3 3.5h3.4"/><path d="M4 10.5 12 5l8 5.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6.5a2 2 0 0 1 4 0V20"/>' },
    { group: 'wolko', href: '/wolkoevents', color: '#a5482d', label: '이벤트 관리', label_en: 'Event Management',
      icon: '<path d="M8 3v3M16 3v3M4 8h16"/><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 17.5h.01M12 17.5h.01"/>' },
    { group: 'wolko', href: '/resource', color: '#008e92', label: 'Resource & Media', label_en: 'Resource & Media',
      icon: '<path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/><circle cx="7" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="11" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="7" r="1" fill="currentColor" stroke="none"/>' },
    { group: 'wolko', href: '/expense', color: '#b8741a', label: '경비 리포트', label_en: 'Expense Report',
      icon: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>' },
    { group: 'wolko', href: '/car-drive', color: '#c17a1f', label: '차량', label_en: 'Vehicle',
      icon: '<path d="M14 16H9m10 0h2v-3.15a1 1 0 0 0-.84-.99L18 11.5l-2.35-3.13a1 1 0 0 0-.8-.4H6.5a2 2 0 0 0-1.79 1.11L3.6 11.5A5 5 0 0 0 3 14v2h2"/><circle cx="6.5" cy="16.5" r="2.5" fill="currentColor" stroke="none"/><circle cx="16.5" cy="16.5" r="2.5" fill="currentColor" stroke="none"/>' },
    { group: 'camp', href: '/wolkoadmin', color: '#004f68', label: '캠프 관리자', label_en: 'Camp Manager',
      icon: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="m9 13.5 2 2 4-4.5"/>' },
    { group: 'camp', href: '/campstaff', color: '#0077a3', label: '카운슬러', label_en: 'Counselor',
      icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4" fill="currentColor" fill-opacity=".12"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  ];
  var HUB_ICON = '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';
  var HUB_LABEL = { ko: '전체 도구 보기', en: 'View All Tools' };

  function svg(paths, w) {
    w = w || 18;
    return '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }

  // 각 페이지가 언어를 전환할 때마다 <html lang>을 갱신하므로(예: 카캘린더는
  // wolkoCarLang, 리소스/캘린더/CRS는 공용 wolko-lang 키를 쓰는 등 저장 키는
  // 제각각이지만 document.documentElement.lang은 다 똑같이 반영한다), 레일은
  // 그 값 하나만 보고 라벨을 고르면 어떤 페이지에서도 어긋나지 않는다.
  function currentLang() {
    return document.documentElement.lang === 'en' ? 'en' : 'ko';
  }

  function syncLabels() {
    var lang = currentLang();
    document.querySelectorAll('.wolko-rail-item-label[data-ko], .wolko-rail-group[data-ko]').forEach(function (el) {
      el.textContent = lang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-ko');
    });
  }

  // 왼쪽 바의 로고 영역 높이를 각 페이지 상단 바 높이에 맞춘다
  function syncHeadHeight() {
    var hd = document.querySelector('body > header, body header');
    var h = hd ? Math.round(hd.getBoundingClientRect().height) : 0;
    if (h >= 40 && h <= 120) document.documentElement.style.setProperty('--wolko-head-h', h + 'px');
  }

  // 내 정보 수정: 이름 · 휴대폰 번호 (소속 · 역할 · 이메일은 보기만) + 비밀번호 변경
  var PT = {
    ko: { title: '내 정보', name: '이름', phone: '휴대폰 번호', email: '이메일', campus: '소속', role: '역할', save: '저장', close: '닫기', saved: '저장했어요.', pwTitle: '비밀번호 변경', pwCur: '현재 비밀번호', pwNew: '새 비밀번호 (8자 이상)', pwSave: '비밀번호 변경', pwDone: '비밀번호를 바꿨어요.', fail: '저장하지 못했어요.', campuses: { wolko: '평택', jeju: '제주' }, hint: '휴대폰 번호는 운행 스케줄 오전 픽업 알림 문자에 쓰여요.' },
    en: { title: 'My info', name: 'Name', phone: 'Mobile number', email: 'Email', campus: 'Campus', role: 'Role', save: 'Save', close: 'Close', saved: 'Saved.', pwTitle: 'Change password', pwCur: 'Current password', pwNew: 'New password (8+ characters)', pwSave: 'Change password', pwDone: 'Password changed.', fail: 'Could not save.', campuses: { wolko: 'Pyeongtaek', jeju: 'Jeju' }, hint: 'Your mobile number is used for the morning pick-up text reminder.' },
  };
  function openProfile(me, chip) {
    var t = PT[currentLang()] || PT.ko;
    var token = '';
    try { token = sessionStorage.getItem('wolko-hub-token') || ''; } catch (e) {}
    var overlay = document.createElement('div');
    overlay.className = 'wl-prof-overlay';
    var card = document.createElement('div');
    card.className = 'wl-prof-card';
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true');
    function field(label, value, opts) {
      var wrap = document.createElement('label'); wrap.className = 'wl-prof-field';
      var span = document.createElement('span'); span.textContent = label;
      var input = document.createElement('input'); input.value = value || '';
      Object.keys(opts || {}).forEach(function (k) { input.setAttribute(k, opts[k]); });
      wrap.append(span, input); return { wrap: wrap, input: input };
    }
    var h = document.createElement('h3'); h.textContent = t.title;
    var role = ROLE[me.role] ? ROLE[me.role][currentLang() === 'en' ? 1 : 0] : '';
    var fName = field(t.name, me.name, { maxlength: '40', autocomplete: 'name' });
    var fPhone = field(t.phone, me.phone, { type: 'tel', inputmode: 'tel', autocomplete: 'tel', placeholder: '010-1234-5678' });
    var fMail = field(t.email, me.email, { readonly: '', disabled: '' });
    var fCampus = field(t.campus + (role ? ' · ' + t.role : ''), (t.campuses[me.campus] || '') + (role ? ' · ' + role : ''), { readonly: '', disabled: '' });
    var hint = document.createElement('p'); hint.className = 'wl-prof-hint'; hint.textContent = t.hint;
    var msg = document.createElement('p'); msg.className = 'wl-prof-msg'; msg.setAttribute('role', 'status');
    var save = document.createElement('button'); save.type = 'button'; save.className = 'wl-prof-primary'; save.textContent = t.save;
    var pwH = document.createElement('h4'); pwH.textContent = t.pwTitle;
    var fCur = field(t.pwCur, '', { type: 'password', autocomplete: 'current-password' });
    var fNew = field(t.pwNew, '', { type: 'password', autocomplete: 'new-password' });
    var pwMsg = document.createElement('p'); pwMsg.className = 'wl-prof-msg'; pwMsg.setAttribute('role', 'status');
    var pwSave = document.createElement('button'); pwSave.type = 'button'; pwSave.className = 'wl-prof-secondary'; pwSave.textContent = t.pwSave;
    var closeBtn = document.createElement('button'); closeBtn.type = 'button'; closeBtn.className = 'wl-prof-close'; closeBtn.setAttribute('aria-label', t.close); closeBtn.textContent = '×';
    card.append(closeBtn, h, fName.wrap, fPhone.wrap, hint, fMail.wrap, fCampus.wrap, msg, save, pwH, fCur.wrap, fNew.wrap, pwMsg, pwSave);
    overlay.append(card);
    document.body.append(overlay);
    function close() { overlay.remove(); document.removeEventListener('keydown', onKey); if (chip) chip.focus(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
    closeBtn.addEventListener('click', close);
    setTimeout(function () { fName.input.focus(); }, 30);
    save.addEventListener('click', function () {
      msg.textContent = ''; msg.className = 'wl-prof-msg'; save.disabled = true;
      fetch('/api/hub/me', { method: 'PATCH', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ name: fName.input.value, phone: fPhone.input.value }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.d.error || t.fail);
          Object.assign(me, res.d);
          try { sessionStorage.setItem('wolko-hub-me:' + token.slice(-16), JSON.stringify(res.d)); } catch (e) {}
          var chipName = document.querySelector('.wl-user-text b'); if (chipName) chipName.textContent = res.d.name;
          var av = document.querySelector('.wl-user-avatar'); if (av) av.textContent = String(res.d.name || '?').trim().charAt(0).toUpperCase();
          msg.textContent = t.saved; msg.className = 'wl-prof-msg ok';
        })
        .catch(function (e) { msg.textContent = e.message || t.fail; msg.className = 'wl-prof-msg err'; })
        .then(function () { save.disabled = false; });
    });
    pwSave.addEventListener('click', function () {
      pwMsg.textContent = ''; pwMsg.className = 'wl-prof-msg'; pwSave.disabled = true;
      fetch('/api/hub/account-password', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: fCur.input.value, newPassword: fNew.input.value }) })
        .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error(res.d.error || t.fail);
          fCur.input.value = ''; fNew.input.value = '';
          pwMsg.textContent = t.pwDone; pwMsg.className = 'wl-prof-msg ok';
        })
        .catch(function (e) { pwMsg.textContent = e.message || t.fail; pwMsg.className = 'wl-prof-msg err'; })
        .then(function () { pwSave.disabled = false; });
    });
  }

  // 우측 상단: 지금 로그인한 계정(이름 · 이메일)을 모든 도구 페이지 헤더에 보여준다
  var ROLE = { master: ['마스터', 'Master'], admin: ['관리자', 'Admin'], counselor: ['일반 멤버', 'Member'] };
  function mountUserChip() {
    var token = '';
    try { token = sessionStorage.getItem('wolko-hub-token') || ''; } catch (e) {}
    if (!token || document.querySelector('.wl-user-chip')) return;
    var cacheKey = 'wolko-hub-me:' + token.slice(-16);
    var cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(cacheKey) || 'null'); } catch (e) {}
    function draw(me) {
      var header = document.querySelector('body > header, body header:not(.ex-person-head):not(.account-dialog-head)');
      if (!header || !me || document.querySelector('.wl-user-chip')) return;
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'wl-user-chip';
      chip.addEventListener('click', function () { openProfile(me, chip); });
      var lang = currentLang();
      var role = ROLE[me.role] ? ROLE[me.role][lang === 'en' ? 1 : 0] : '';
      chip.title = me.name + ' · ' + me.email + (role ? ' · ' + role : '') + (lang === 'en' ? ' — edit my info' : ' — 내 정보 수정');
      var avatar = document.createElement('span');
      avatar.className = 'wl-user-avatar';
      avatar.textContent = String(me.name || '?').trim().charAt(0).toUpperCase();
      var text = document.createElement('span');
      text.className = 'wl-user-text';
      var name = document.createElement('b');
      name.textContent = me.name;
      var email = document.createElement('small');
      email.textContent = me.email;
      text.append(name, email);
      chip.append(avatar, text);
      var group = header.querySelector('.car-header-right, .adm-header-right, .portal-header-actions, .user-info, .toolbar');
      var toggle = header.querySelector('.wl-lang-toggle, .adm-lang-switch');
      if (group) group.prepend(chip);
      else if (toggle) toggle.parentNode.insertBefore(chip, toggle);
      else header.append(chip);
      document.body.classList.add('has-user-chip');
    }
    if (cached) { draw(cached); return; }
    fetch('/api/hub/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (me) { if (!me) return; try { sessionStorage.setItem(cacheKey, JSON.stringify(me)); } catch (e) {} draw(me); })
      .catch(function () {});
  }

  function init() {
    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/portal') return; // 포탈 런처 자체 사이드바와 중복 방지
    mountUserChip();

    var rail = document.createElement('nav');
    rail.className = 'wolko-rail';

    var html = '<a class="wolko-rail-logo-link" href="/portal">' +
      '<img class="wolko-rail-logo" src="/images/WOLKO Circle.png" alt="WOLKO">' +
      '<span class="wolko-rail-logo-text"><span class="wolko-rail-logo-name">WOLKO Portal</span><span class="wolko-rail-logo-sub">Word of Life Korea</span></span></a>' +
      '<div class="wolko-rail-divider"></div>';

    GROUPS.forEach(function (g) {
      html += '<div class="wolko-rail-group" data-ko="' + g.ko + '" data-en="' + g.en + '"></div>';
      TOOLS.filter(function (tool) { return tool.group === g.id; }).forEach(function (tool) {
      var active = path === tool.href || (tool.href === '/car-drive' && (path === '/car' || path === '/car-log')); // 차량 메뉴: 사용 일지(기본) · 예약현황 · 정비 관리
      html += '<a class="wolko-rail-item' + (active ? ' is-active' : '') + '" href="' + tool.href + '" style="--rail-color:' + tool.color + '">' +
        '<span class="wolko-rail-item-icon">' + svg(tool.icon, 15) + '</span><span class="wolko-rail-item-label" data-ko="' + tool.label + '" data-en="' + tool.label_en + '"></span></a>';
      });
    });

    html += '<a class="wolko-rail-item wolko-rail-hub" href="/portal"><span class="wolko-rail-item-icon">' + svg(HUB_ICON, 15) + '</span>' +
      '<span class="wolko-rail-item-label" data-ko="' + HUB_LABEL.ko + '" data-en="' + HUB_LABEL.en + '"></span></a>';

    rail.innerHTML = html;
    document.body.insertBefore(rail, document.body.firstChild);
    document.body.classList.add('wolko-rail-active');
    syncLabels();
    syncHeadHeight();
    window.addEventListener('resize', syncHeadHeight);
    window.addEventListener('load', syncHeadHeight);
    var hd = document.querySelector('body > header, body header');
    if (hd && window.ResizeObserver) new ResizeObserver(syncHeadHeight).observe(hd);

    new MutationObserver(syncLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
