/* 포탈 도구 접근 제한(제주팀 일반 멤버) — 서버가 /api/hub/me 로 알려 주는 tools(쓸 수 있는 도구 주소 목록)에 맞춘다.
   - tools 가 null 이면 아무것도 하지 않는다(전체 메뉴).
   - 왼쪽 레일과 모바일 서랍에서 쓸 수 없는 도구를 뺀다.
   - 쓸 수 없는 도구 페이지를 주소로 직접 열면 안내하고 포탈 첫 화면으로 보낸다.
   서버도 같은 기준으로 그 도구의 API 를 막는다(functions/api/_middleware.js) — 이 스크립트는 안내와 메뉴 정리를 맡는다.
   wolko-rail.js 가 불러오고, 레일이 없는 포탈 페이지(캠프팀 등)는 직접 불러온다. */
(function () {
  'use strict';
  if (window.WolkoAccess) return;
  var tools;   // undefined = 아직 모름 · null = 제한 없음 · 배열 = 쓸 수 있는 도구 주소

  function token() { try { return sessionStorage.getItem('wolko-hub-token') || ''; } catch (e) { return ''; } }
  function normPath(path) { return String(path || '').split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'; }
  function allows(list, path) {
    path = normPath(path);
    if (!list) return true;
    if (path === '/portal' || path.indexOf('/portal/') !== 0) return true;   // 포탈 첫 화면과 포탈 밖은 늘 열려 있다
    return list.some(function (tool) { return path === tool || path.indexOf(tool + '/') === 0; });
  }
  var isEn = function () { return document.documentElement.lang === 'en'; };

  function removeMenuItems() {
    document.querySelectorAll('.wolko-rail-item[href], .wolko-drawer-item[href]').forEach(function (a) {
      if (!allows(tools, a.getAttribute('href'))) a.remove();
    });
    // 안에 도구가 하나도 남지 않은 그룹 이름도 뺀다
    document.querySelectorAll('.wolko-rail-group, .wolko-drawer-group').forEach(function (group) {
      var next = group.nextElementSibling;
      var emptyGroup = !next || /(^|\s)(wolko-rail-group|wolko-drawer-group|wolko-rail-hub|wolko-drawer-hub)(\s|$)/.test(next.className);
      if (emptyGroup) group.remove();
    });
  }

  function deny() {
    if (document.getElementById('wolkoDenied')) return;
    var en = isEn();
    var wrap = document.createElement('div');
    wrap.id = 'wolkoDenied';
    wrap.setAttribute('role', 'alertdialog');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:2147483000;display:grid;place-items:center;padding:24px;background:#f4f7fa;font-family:"Noto Sans KR",system-ui,sans-serif;color:#102936';
    var card = document.createElement('div');
    card.style.cssText = 'width:min(420px,100%);padding:28px 26px;border-radius:18px;background:#fff;box-shadow:0 18px 50px rgba(10,40,52,.16);text-align:center';
    var title = document.createElement('h1');
    title.style.cssText = 'margin:0 0 8px;font-size:19px;letter-spacing:-.02em';
    title.textContent = en ? 'This menu is not available for Jeju team members.' : '제주팀 일반 멤버에게는 열려 있지 않은 메뉴예요.';
    var text = document.createElement('p');
    text.style.cssText = 'margin:0 0 18px;font-size:14px;line-height:1.6;color:#4a6572';
    text.textContent = en ? 'Taking you back to the portal home.' : '포탈 첫 화면으로 돌아갑니다.';
    var link = document.createElement('a');
    link.href = '/portal';
    link.style.cssText = 'display:inline-block;padding:10px 20px;border-radius:10px;background:#0a6a8f;color:#fff;font-weight:700;font-size:14px;text-decoration:none';
    link.textContent = en ? 'Portal home' : '포탈 첫 화면으로';
    card.append(title, text, link);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
    setTimeout(function () { location.replace('/portal'); }, 2500);
  }

  function apply() {
    if (!tools) return;
    removeMenuItems();
    if (!allows(tools, location.pathname)) {
      if (document.body) deny(); else document.addEventListener('DOMContentLoaded', deny);
    }
  }

  function load() {
    var tok = token();
    if (!tok) return;   // 로그인 전이면 각 페이지의 로그인 화면이 맡는다
    var key = 'wolko-hub-me:' + tok.slice(-16), cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) {}
    if (cached && cached.tools !== undefined) { tools = cached.tools; apply(); return; }   // 배포 전에 저장된 값(tools 없음)은 다시 받는다
    fetch('/api/hub/me', { headers: { Authorization: 'Bearer ' + tok } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (me) {
        if (!me) return;   // 못 받으면 메뉴는 그대로 두고, 서버가 제한된 도구의 API 를 막는다
        try { sessionStorage.setItem(key, JSON.stringify(me)); } catch (e) {}
        tools = me.tools === undefined ? null : me.tools;
        apply();
      })
      .catch(function () {});
  }

  window.WolkoAccess = { apply: apply, allows: function (path) { return allows(tools, path); }, tools: function () { return tools; } };
  load();
})();
