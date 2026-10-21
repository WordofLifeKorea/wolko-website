/* 캠프팀 포털 — 공통 스크립트: 로그인 확인, 한/영 전환, 서버 요청, 권한에 따른 메뉴 표시 */
(function () {
  var CT = window.CT = { me: null, dict: { ko: {}, en: {} } };

  CT.addDict = function (d) { ['ko', 'en'].forEach(function (l) { Object.assign(CT.dict[l], d[l] || {}); }); };
  CT.addDict({
    ko: { navHome: '캠프팀 홈', navCamps: '캠프별 공간', navTasks: '일정 · 업무', navMeetings: '회의록 · 결정', navFiles: '자료실', navFinance: '재정', navBudget: '캠프 예산', navAdmin: '관리', navSettings: '설정 · 팀 명단', soon: '준비 중', backPortal: '← 포털로 돌아가기',
      gateTitle: '포털 로그인이 필요해요', gateBody: '포털에서 로그인한 뒤 이 페이지로 다시 들어와 주세요.', gateBtn: '포털로 이동', test: '테스트', testData: '테스트 자료 포함',
      roleadmin: '관리자', rolefinance: '재정 담당', rolemember: '캠프팀 팀원', roleviewer: '조회만', loadFail: '불러오지 못했어요', save: '저장', cancel: '취소', edit: '수정', del: '삭제', add: '추가', confirmDel: '삭제할까요? (삭제 표시만 되며 복구할 수 있어요)' },
    en: { navHome: 'Camp Team Home', navCamps: 'Camp Spaces', navTasks: 'Schedule · Tasks', navMeetings: 'Meetings · Decisions', navFiles: 'Files', navFinance: 'FINANCE', navBudget: 'Camp Budget', navAdmin: 'ADMIN', navSettings: 'Settings · Team', soon: 'Soon', backPortal: '← Back to Portal',
      gateTitle: 'Portal login required', gateBody: 'Please log in to the portal, then come back to this page.', gateBtn: 'Go to Portal', test: 'TEST', testData: 'Includes test data',
      roleadmin: 'Admin', rolefinance: 'Finance', rolemember: 'Camp Team', roleviewer: 'View only', loadFail: 'Could not load', save: 'Save', cancel: 'Cancel', edit: 'Edit', del: 'Delete', add: 'Add', confirmDel: 'Delete this? (It is only marked deleted and can be restored.)' }
  });

  CT.lang = function () { try { return localStorage.getItem('wolko-lang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } };
  CT.t = function (k) { var d = CT.dict[CT.lang()]; return (k in d) ? d[k] : (CT.dict.ko[k] || k); };
  CT.esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  CT.pick = function (row, base) { var en = row[base + 'En'], ko = row[base + 'Ko']; return CT.lang() === 'en' && en ? en : (ko || en || ''); };
  CT.applyI18n = function (root) {
    (root || document).querySelectorAll('[data-t]').forEach(function (el) { el.textContent = CT.t(el.getAttribute('data-t')); });
    (root || document).querySelectorAll('[data-t-ph]').forEach(function (el) { el.setAttribute('placeholder', CT.t(el.getAttribute('data-t-ph'))); });
    document.getElementById('langKo').classList.toggle('on', CT.lang() === 'ko');
    document.getElementById('langEn').classList.toggle('on', CT.lang() === 'en');
    document.documentElement.lang = CT.lang();
  };
  CT.setLang = function (l) { try { localStorage.setItem('wolko-lang', l); } catch (e) {} CT.applyI18n(); document.dispatchEvent(new Event('ct-lang')); };

  CT.token = function () { try { return sessionStorage.getItem('wolko-hub-token') || ''; } catch (e) { return ''; } };
  CT.showGate = function () { var g = document.getElementById('gate'); if (g) g.hidden = false; };

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

  CT.roleLabel = function (r) { return CT.t('role' + (r || 'viewer')); };
  CT.fmtDate = function (d) { return d ? d.slice(5).replace('-', '/') : ''; };
  CT.won = function (n) { return '₩' + Number(n || 0).toLocaleString('ko-KR'); };

  /** 페이지 시작: 내 권한을 읽고 메뉴를 정리한 뒤 init(me) 호출 */
  CT.boot = async function (init) {
    document.getElementById('langKo').onclick = function () { CT.setLang('ko'); };
    document.getElementById('langEn').onclick = function () { CT.setLang('en'); };
    CT.applyI18n();
    if (!CT.token()) { CT.showGate(); return; }
    try { CT.me = await CT.api('/api/campteam/me'); } catch (e) { if (e.status !== 401) { document.getElementById('main').insertAdjacentHTML('afterbegin', '<div class="err">' + CT.esc(e.message) + '</div>'); } return; }
    var p = CT.me.perms;
    document.getElementById('moneyHead').hidden = document.getElementById('moneyNav').hidden = !p.moneyRead;
    document.getElementById('adminHead').hidden = document.getElementById('settingsNav').hidden = !p.manageMembers;
    var renderWho = function () { document.getElementById('who').innerHTML = CT.esc(CT.me.email) + '<br><span class="chip">' + CT.esc(CT.roleLabel(CT.me.campRole)) + '</span>'; };
    renderWho(); document.addEventListener('ct-lang', renderWho);
    await init(CT.me);
  };
})();
