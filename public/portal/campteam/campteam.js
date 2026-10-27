/* 캠프팀 포털 — 공통 스크립트: 로그인 확인, 한/영 전환, 서버 요청, 권한에 따른 메뉴 표시 */
(function () {
  var CT = window.CT = { me: null, dict: { ko: {}, en: {} } };

  CT.addDict = function (d) { ['ko', 'en'].forEach(function (l) { Object.assign(CT.dict[l], d[l] || {}); }); };
  CT.addDict({
    ko: { navHome: '홈', navAlerts: '알림공지', budgetLocked: '🔒 예산·금액은 권한이 있는 팀원에게만 보입니다.', navResources: '캠프팀 자료', navGroupTeam: '캠프 & 아웃리치 팀', navCamps: '캠프별 공간', navTasks: '업무', navCalendar: '달력', navMeetings: '회의록 · 결정', navFiles: '자료실', navTv: 'TV 대시보드', searchAll: '전체 검색 (업무·회의·결정·파일)', navFinance: '재정', navBudget: '캠프 예산', navAdmin: '관리', navSettings: '설정 · 팀 명단', soon: '준비 중', backPortal: '← 포털로 돌아가기', backPortalShort: '월코 포탈로 나가기', teamSpace: '캠프 & 아웃리치 팀 전용 페이지', teamSpace2: '포털과 별개 화면',
      gateTitle: '포털 로그인이 필요해요', gateBody: '포털에서 로그인한 뒤 이 페이지로 다시 들어와 주세요.', gateBtn: '포털로 이동', logout: '로그아웃', gateGoogle: '또는 wolko.org Google 계정으로 로그인 (조회 전용)', navTrash: '휴지통', test: '테스트', testData: '테스트 자료 포함',
      roleadmin: '관리자', roledirector: '캠프팀 디렉터', rolefinance: '캠프 재정 담당', roletreasurer: '월코 재정 (조회 전용)', rolemember: '캠프팀 팀원', roleviewer: '조회만', loadFail: '불러오지 못했어요', save: '저장', cancel: '취소', edit: '수정', del: '삭제', add: '추가', confirmDel: '삭제할까요? (삭제 표시만 되며 복구할 수 있어요)' },
    en: { navHome: 'Home', navAlerts: 'Alerts & Notices', budgetLocked: '🔒 Budget and amounts are visible only to authorized team members.', navResources: 'Camp Team Docs', navGroupTeam: 'CAMP & OUTREACH TEAM', navCamps: 'Camp Spaces', navTasks: 'Tasks', navCalendar: 'Calendar', navMeetings: 'Meetings · Decisions', navFiles: 'Files', navTv: 'TV Dashboard', searchAll: 'Search all (tasks, meetings, decisions, files)', navFinance: 'FINANCE', navBudget: 'Camp Budget', navAdmin: 'ADMIN', navSettings: 'Settings · Team', soon: 'Soon', backPortal: '← Back to Portal', backPortalShort: 'Leave to WOLKO Portal', teamSpace: 'Camp & Outreach Team only', teamSpace2: 'Separate from the Portal',
      gateTitle: 'Portal login required', gateBody: 'Please log in to the portal, then come back to this page.', gateBtn: 'Go to Portal', logout: 'Log out', gateGoogle: 'Or sign in with your wolko.org Google account (view only)', navTrash: 'Trash', test: 'TEST', testData: 'Includes test data',
      roleadmin: 'Admin', roledirector: 'Camp Team Director', rolefinance: 'Camp Finance', roletreasurer: 'WOLKO Finance (view only)', rolemember: 'Camp Team', roleviewer: 'View only', loadFail: 'Could not load', save: 'Save', cancel: 'Cancel', edit: 'Edit', del: 'Delete', add: 'Add', confirmDel: 'Delete this? (It is only marked deleted and can be restored.)' }
  });

  /** 내 항목별 권한: CT.can('tasks', 'edit') — 수준은 view(보기) / edit(수정). 안 보임이면 둘 다 false */
  CT.can = function (area, level) { var a = CT.me && CT.me.perms && CT.me.perms.areas; if (!a) return false; var l = a[area] || 'none'; return level === 'edit' ? l === 'edit' : l === 'edit' || l === 'view'; };
  CT.lang = function () { try { return localStorage.getItem('wolko-lang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } };
  CT.t = function (k) { var d = CT.dict[CT.lang()]; return (k in d) ? d[k] : (CT.dict.ko[k] || k); };
  CT.esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  CT.pick = function (row, base) { var en = row[base + 'En'], ko = row[base + 'Ko']; return CT.lang() === 'en' && en ? en : (ko || en || ''); };
  CT.applyI18n = function (root) {
    (root || document).querySelectorAll('[data-t]').forEach(function (el) { el.textContent = CT.t(el.getAttribute('data-t')); });
    (root || document).querySelectorAll('[data-t-ph]').forEach(function (el) { el.setAttribute('placeholder', CT.t(el.getAttribute('data-t-ph'))); });
    ['langKo', 'langKoM'].forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.toggle('on', CT.lang() === 'ko'); });
    ['langEn', 'langEnM'].forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.toggle('on', CT.lang() === 'en'); });
    document.documentElement.lang = CT.lang();
  };
  CT.setLang = function (l) { try { localStorage.setItem('wolko-lang', l); } catch (e) {} CT.applyI18n(); document.dispatchEvent(new Event('ct-lang')); };

  // 기존 포털 로그인(세션) 우선, 없으면 Google 로그인으로 받은 캠프팀 전용 출입증
  CT.token = function () { try { return sessionStorage.getItem('wolko-hub-token') || localStorage.getItem('wolko-camp-token') || ''; } catch (e) { return ''; } };
  CT.usingGoogle = function () { try { return !sessionStorage.getItem('wolko-hub-token') && !!localStorage.getItem('wolko-camp-token'); } catch (e) { return false; } };
  CT.googleLogout = function () { try { localStorage.removeItem('wolko-camp-token'); } catch (e) {} location.reload(); };
  CT.showGate = function () {
    var g = document.getElementById('gate'); if (!g) return; g.hidden = false; if (CT._gateInit) return; CT._gateInit = true;
    // 내 컴퓨터(로컬 시험 서버)에서만: 실제 포털 계정이 없으므로 시험용 로그인 페이지로 안내한다. 운영 주소에서는 보이지 않는다.
    if (/^(localhost|127\.0\.0\.1|\[::1\]|(10|192\.168)\.\d+\.\d+(\.\d+)?)$/.test(location.hostname) || /^172\.(1[6-9]|2\d|3[01])\./.test(location.hostname)) {
      var gn = document.getElementById('gnote'); if (gn && !document.getElementById('devHint')) gn.insertAdjacentHTML('beforebegin', '<p class="meta" id="devHint" style="margin:14px 0 0;color:var(--text)">개발용 시험 서버예요. 실제 포털 계정이 없어서 <a href="/dev-login/" style="color:var(--blue-lt);font-weight:700">시험용 로그인</a>으로 들어가세요.</p>');
    }
    fetch('/api/campteam/config', { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (c) {
      if (!c.googleClientId) return; var box = document.getElementById('gbtn'); box.hidden = false;
      var sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
      sc.onload = function () {
        google.accounts.id.initialize({ client_id: c.googleClientId, hd: 'wolko.org', callback: function (resp) {
          fetch('/api/campteam/google-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ credential: resp.credential }) }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
            .then(function (x) { if (x.ok) { try { localStorage.setItem('wolko-camp-token', x.j.token); } catch (e) {} location.reload(); } else { document.getElementById('gnote').textContent = x.j.error || ''; } });
        } });
        google.accounts.id.renderButton(document.getElementById('gbtnInner'), { theme: 'outline', size: 'large', text: 'signin_with', width: 280 });
      };
      document.head.appendChild(sc);
    }).catch(function () {});
  };

  /** 서버에 요청. 실패하면 Error(message, status) 를 던진다 */
  CT.api = async function (path, opts) {
    opts = opts || {};
    var headers = { Authorization: 'Bearer ' + CT.token() };
    if (opts.body) headers['Content-Type'] = 'application/json';
    var res = await fetch(path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' });
    var data = null; try { data = await res.json(); } catch (e) {}
    if (res.status === 401) { CT.showGate(); }
    if (!res.ok) { var err = new Error((data && data.error) || CT.t('loadFail')); err.status = res.status; throw err; }
    return data;
  };

  /** 공통 대화상자: 페이지에 #dlg(#dlgTitle #dlgFields #dlgErr #dlgActions #dlgForm)가 있어야 한다. 저장 중 오류는 대화상자 안에 보여준다. */
  CT.ask = function (title, fields, onSubmit, opts) {
    opts = opts || {}; var $ = function (id) { return document.getElementById(id); };
    $('dlgTitle').textContent = title; $('dlgFields').innerHTML = fields; $('dlgErr').hidden = true;
    $('dlgActions').innerHTML = (opts.extra || '') + '<button type="button" class="btn" id="dlgCancel">' + CT.esc(CT.t('cancel')) + '</button>' + (opts.noSave ? '' : '<button type="submit" class="btn pri">' + CT.esc(opts.saveLabel || CT.t('save')) + '</button>');
    $('dlgCancel').onclick = function () { $('dlg').close(); };
    $('dlgForm').onsubmit = async function (e) { e.preventDefault(); var fd = Object.fromEntries(new FormData($('dlgForm')).entries()); try { var keep = await onSubmit(fd); if (keep !== false) $('dlg').close(); } catch (err) { $('dlgErr').textContent = err.message; $('dlgErr').hidden = false; } };
    if (!$('dlg').open) $('dlg').showModal();
  };

  CT.roleLabel = function (r) { return CT.t('role' + (r || 'viewer')); };
  CT.fmtDate = function (d) { return d ? d.slice(5).replace('-', '/') : ''; };
  CT.won = function (n) { return '₩' + Number(n || 0).toLocaleString('ko-KR'); };
  CT.DEC = { KRW: 0, USD: 2 };
  /** 최소 단위 정수(KRW=원, USD=센트) → 화면용 문자열 */
  CT.money = function (minor, cur) {
    var d = CT.DEC[cur] || 0, n = Number(minor || 0), sign = n < 0 ? '-' : '', a = Math.abs(n), whole = Math.floor(a / Math.pow(10, d)), frac = d ? String(a % Math.pow(10, d)).padStart(d, '0') : '';
    return sign + (cur === 'KRW' ? '₩' : cur === 'USD' ? '$' : cur + ' ') + whole.toLocaleString('en-US') + (d ? '.' + frac : '');
  };
  /** 입력칸용: 최소 단위 정수 → 소수 포함 숫자 문자열 (콤마 없음) */
  CT.moneyInput = function (minor, cur) { if (minor == null) return ''; var d = CT.DEC[cur] || 0; return (Number(minor) / Math.pow(10, d)).toFixed(d); };

  // ── 팝업(dialog) 공통 동작 ─────────────────────────────────────────────
  // 모든 팝업에 ✕ 버튼을 달고, 바깥 배경을 누르거나 Esc 를 눌러도 닫히게 한다.
  // 입력 양식이 있는 팝업에서 고친 내용이 있으면 "저장하고 닫기 / 저장 안 하고 닫기 / 계속 편집" 을 먼저 묻는다.
  CT.addDict({
    ko: { dlgClose: '닫기', dlgDirtyTitle: '저장하지 않은 변경이 있어요', dlgDirtyBody: '고친 내용이 아직 저장되지 않았어요. 어떻게 할까요?', dlgSaveClose: '저장하고 닫기', dlgDiscard: '저장 안 하고 닫기', dlgKeep: '계속 편집', dlgSaveGo: '저장하고 이동', dlgDiscardGo: '저장 안 하고 이동' },
    en: { dlgClose: 'Close', dlgDirtyTitle: 'You have unsaved changes', dlgDirtyBody: 'Your edits have not been saved yet. What would you like to do?', dlgSaveClose: 'Save and close', dlgDiscard: 'Close without saving', dlgKeep: 'Keep editing', dlgSaveGo: 'Save and leave', dlgDiscardGo: 'Leave without saving' }
  });
  var FIELDS = 'input,select,textarea';
  function snapshot(d) {
    return JSON.stringify([].map.call(d.querySelectorAll(FIELDS), function (el, i) {
      if (el.type === 'file') return [i, [].map.call(el.files || [], function (f) { return f.name + f.size; })];
      return [i, el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value];
    }));
  }
  /** 저장 버튼이 있는 양식 팝업만 "고친 내용" 검사 대상이다(읽기용 상세 팝업은 그냥 닫힘) */
  function editable(d) { return !!d.querySelector('form [type=submit], form button:not([type=button])'); }
  function dirty(d) { return editable(d) && d._base != null && snapshot(d) !== d._base; }
  function confirmDirty(d, go) {
    var c = document.createElement('dialog'); c.className = 'ct-confirm'; var canSave = editable(d);
    c.innerHTML = '<h3>' + CT.esc(CT.t('dlgDirtyTitle')) + '</h3><p>' + CT.esc(CT.t('dlgDirtyBody')) + '</p><div class="actions" style="justify-content:flex-end">' +
      '<button type="button" class="btn" data-a="keep">' + CT.esc(CT.t('dlgKeep')) + '</button>' +
      '<button type="button" class="btn danger" data-a="discard">' + CT.esc(CT.t(go ? 'dlgDiscardGo' : 'dlgDiscard')) + '</button>' +
      (canSave ? '<button type="button" class="btn pri" data-a="save">' + CT.esc(CT.t(go ? 'dlgSaveGo' : 'dlgSaveClose')) + '</button>' : '') + '</div>';
    document.body.appendChild(c);
    var done = function (a) {
      c.close(); c.remove();
      if (a === 'discard') { d.close(); if (go) go(); }
      else if (a === 'save') {
        var f = d.querySelector('form');
        if (go) { var t = setTimeout(function () { d.removeEventListener('close', onClose); }, 15000), onClose = function () { clearTimeout(t); go(); }; d.addEventListener('close', onClose, { once: true }); } // 저장이 성공해 팝업이 닫히면 이동한다
        if (f && f.requestSubmit) f.requestSubmit(); // 저장에 성공하면 팝업이 알아서 닫히고, 실패하면 오류와 함께 열려 있다
      }
    };
    c.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('[data-a]'); if (b) done(b.getAttribute('data-a')); });
    c.addEventListener('cancel', function (e) { e.preventDefault(); done('keep'); });
    c.showModal();
    var first = c.querySelector('[data-a=save]') || c.querySelector('[data-a=keep]'); if (first) first.focus();
  }
  CT.tryClose = function (d) { if (!d || !d.open) return; if (dirty(d)) confirmDirty(d); else d.close(); };
  function openDialogs() { return [].filter.call(document.querySelectorAll('dialog'), function (x) { return x.open && !x.classList.contains('ct-confirm'); }); }
  function dirtyDialog() { return openDialogs().filter(dirty)[0] || null; }
  // 팝업이 열려 있는 동안 기록에 표시(ct) 한 칸을 얹어 두고, 뒤로가기를 그 한 칸으로 받는다.
  // 다른 화면으로 가기 전에는 그 표시를 먼저 치워서 뒤로가기 기록이 어지러워지지 않게 한다
  var backWait = false;
  function popMark() { backWait = true; history.back(); }
  function leave(href) {
    var go = function () { location.href = href; };
    if (!backWait && !(history.state && history.state.ct)) return go();
    var done = false, f = function () { if (done) return; done = true; backWait = false; window.removeEventListener('popstate', f); go(); };
    window.addEventListener('popstate', f); setTimeout(f, 600);
    if (!backWait) popMark();
  }
  // 팝업에서 고친 내용이 있는 채로 다른 화면으로 가려 할 때 (메뉴·링크 클릭, 새로고침, 탭 닫기) 먼저 확인한다
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank' || a.hasAttribute('download')) return;
    var d = dirtyDialog(); if (!d) return; var href = a.getAttribute('href'); if (!href || href.charAt(0) === '#' || /^(javascript|mailto|tel):/i.test(href)) return;
    e.preventDefault(); e.stopPropagation(); confirmDirty(d, function () { leave(a.href); });
  }, true);
  window.addEventListener('beforeunload', function (e) { if (dirtyDialog()) { e.preventDefault(); e.returnValue = ''; } });
  // 뒤로가기(폰의 뒤로 버튼 포함): 팝업이 열려 있으면 화면을 떠나지 않고 팝업만 닫는다. 고친 내용이 있으면 먼저 묻는다
  window.addEventListener('popstate', function (e) {
    backWait = false;
    var ds = openDialogs();
    if (!ds.length) { if (e.state && e.state.ct) history.back(); return; } // 이미 닫힌 팝업이 남긴 표시는 건너뛴다
    var d = ds[ds.length - 1];
    if (dirty(d)) { history.pushState({ ct: 1 }, ''); confirmDirty(d); return; }
    d._popped = true; d.close();
    if (openDialogs().length) history.pushState({ ct: 1 }, ''); // 아래에 다른 팝업이 남아 있으면 표시를 다시 얹는다
  });
  function outside(d, e) { var r = d.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; }
  function enhance(d) {
    if (d._ctOk || d.classList.contains('ct-confirm')) return; d._ctOk = true;
    var x = document.createElement('button'); x.type = 'button'; x.className = 'dlg-x'; x.textContent = '✕'; x.setAttribute('aria-label', CT.t('dlgClose')); x.title = CT.t('dlgClose');
    x.onclick = function () { CT.tryClose(d); }; d.insertBefore(x, d.firstChild);
    document.addEventListener('ct-lang', function () { x.setAttribute('aria-label', CT.t('dlgClose')); x.title = CT.t('dlgClose'); });
    var base = function () { d._base = snapshot(d); d._touched = false; };
    var open = d.showModal; d.showModal = function () { var was = d.open; open.call(d); base(); if (!was && !(history.state && history.state.ct)) { try { history.pushState({ ct: 1 }, ''); } catch (e) { /* 무시 */ } } };
    d.addEventListener('close', function () {
      d._base = null; d._touched = false;
      var pop = !d._popped && history.state && history.state.ct && !openDialogs().length; d._popped = false; // 뒤로가기로 닫힌 경우는 이미 한 칸 돌아와 있다
      if (pop) popMark();
    });
    d.addEventListener('input', function () { d._touched = true; }, true); d.addEventListener('change', function () { d._touched = true; }, true);
    // 팝업 내용이 새로 채워지면 그 상태를 "고치기 전" 기준으로 삼는다(고치는 도중에 칸이 늘어나는 경우는 기준을 바꾸지 않는다)
    new MutationObserver(function () { if (d.open && !d._touched) base(); }).observe(d, { childList: true, subtree: true });
    d.addEventListener('cancel', function (e) { e.preventDefault(); CT.tryClose(d); }); // Esc
    d.addEventListener('mousedown', function (e) { d._downOut = e.target === d && outside(d, e); });
    d.addEventListener('click', function (e) { if (e.target === d && d._downOut && outside(d, e)) CT.tryClose(d); d._downOut = false; }); // 바깥 배경
  }

  // ── 표 → 폰에서 카드로: 머리글 글자를 각 칸의 data-l 로 붙인다 (CSS 가 700px 이하에서 카드로 바꿔 보여 준다) ──
  function cardify(root) {
    [].forEach.call((root || document).querySelectorAll('main table:not(.no-rt):not(.pmtable)'), function (t) {
      var heads = [].map.call(t.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
      if (!heads.length) { var fr = t.querySelector('tr'); if (fr && fr.querySelector('th')) heads = [].map.call(fr.children, function (th) { return th.textContent.trim(); }); }
      [].forEach.call(t.querySelectorAll('tbody tr, tfoot tr'), function (tr) {
        if (tr.querySelector('th') && !tr.querySelector('td')) return;
        [].forEach.call(tr.children, function (td, i) { if (td.tagName === 'TD' && !td.hasAttribute('data-l')) td.setAttribute('data-l', td.hasAttribute('colspan') ? '' : (heads[i] || '')); });
      });
      t.classList.add('rt');
    });
  }
  var cardTimer = null;
  function watchTables() { new MutationObserver(function () { clearTimeout(cardTimer); cardTimer = setTimeout(function () { cardify(); }, 60); }).observe(document.getElementById('main') || document.body, { childList: true, subtree: true }); cardify(); }
  // ── 팝업이 열려 있는 동안 html 에 표시를 달아 CSS 가 뒤 화면을 흐리게 한다 ──
  (function () {
    var open = HTMLDialogElement.prototype.showModal, count = 0;
    HTMLDialogElement.prototype.showModal = function () {
      var d = this; open.call(d); document.documentElement.classList.add('dlg-open');
      if (!d._blurWatch) { d._blurWatch = true; d.addEventListener('close', function () { setTimeout(function () { if (![].some.call(document.querySelectorAll('dialog'), function (x) { return x.open; })) document.documentElement.classList.remove('dlg-open'); }, 0); }); }
    };
  })();
  // ── 폰 메뉴(햄버거 서랍) ──
  function initMenu() {
    var btn = document.getElementById('menuBtn'), dr = document.getElementById('drawer'), sc = document.getElementById('scrim'), x = document.getElementById('drawerX');
    if (!btn || !dr) return;
    var set = function (open) { dr.classList.toggle('open', open); sc.classList.toggle('open', open); document.documentElement.classList.toggle('menu-open', open); btn.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open && x) x.focus(); };
    btn.onclick = function () { set(!dr.classList.contains('open')); };
    sc.onclick = x.onclick = function () { set(false); };
    dr.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && dr.classList.contains('open')) { set(false); btn.focus(); } });
    window.addEventListener('resize', function () { if (window.innerWidth > 900) set(false); });
  }
  function initDialogs() { [].forEach.call(document.querySelectorAll('dialog'), enhance); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { initDialogs(); initMenu(); }); else { initDialogs(); initMenu(); }

  /** 페이지 시작: 내 권한을 읽고 메뉴를 정리한 뒤 init(me) 호출 */
  CT.boot = async function (init) {
    document.getElementById('langKo').onclick = function () { CT.setLang('ko'); };
    document.getElementById('langEn').onclick = function () { CT.setLang('en'); };
    ['langKoM', 'langEnM'].forEach(function (id) { var el = document.getElementById(id); if (el) el.onclick = function () { CT.setLang(id === 'langKoM' ? 'ko' : 'en'); }; });
    CT.applyI18n();
    if (!CT.token()) { CT.showGate(); return; }
    try { CT.me = await CT.api('/api/campteam/me'); } catch (e) { if (e.status !== 401) { document.getElementById('main').insertAdjacentHTML('afterbegin', '<div class="err">' + CT.esc(e.message) + '</div>'); } return; }
    var p = CT.me.perms;
    document.getElementById('moneyHead').hidden = document.getElementById('moneyNav').hidden = !p.moneyRead;
    document.getElementById('adminHead').hidden = document.getElementById('settingsNav').hidden = !p.manageMembers;
    document.getElementById('trashNav').hidden = !CT.me.campRole;
    // 항목별 권한: 볼 수 없는 영역의 메뉴는 숨긴다 (서버도 같은 기준으로 막는다)
    var NAVAREA = { '/portal/campteam/tasks/': 'tasks', '/portal/campteam/calendar/': 'tasks', '/portal/campteam/meetings/': 'meetings', '/portal/campteam/files/': 'files', '/portal/campteam/resources/': 'files', '/portal/campteam/camps/': 'camps', '/portal/campteam/tv/': 'camps' };
    [].forEach.call(document.querySelectorAll('.nav a[href]'), function (a) { var area = NAVAREA[a.getAttribute('href')]; if (area && !CT.can(area, 'view')) a.hidden = true; if (a.getAttribute('href') === '/portal/campteam/tv/' && !(CT.me && CT.me.campRole)) a.hidden = true; });
    var renderWho = function () { document.getElementById('who').innerHTML = CT.esc(CT.me.email) + '<br><span class="chip">' + CT.esc(CT.roleLabel(CT.me.campRole)) + '</span>' + (CT.usingGoogle() ? ' <a href="#" id="gout">' + CT.esc(CT.t('logout')) + '</a>' : ''); var o = document.getElementById('gout'); if (o) o.onclick = function (e) { e.preventDefault(); CT.googleLogout(); }; };
    renderWho(); document.addEventListener('ct-lang', renderWho);
    watchTables();
    await init(CT.me);
    document.dispatchEvent(new Event('ct-ready'));
  };
})();
