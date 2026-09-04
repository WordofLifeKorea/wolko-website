/* WOLKO 내부 도구 공용 좌측 레일 — 데스크톱 폭(900px~)에서만 표시.
   각 도구 페이지 head에 이 스크립트와 wolko-rail.css를 넣으면 자동 삽입됨. */
(function () {
  var TOOLS = [
    { href: '/schedule', color: '#1da462', label: '월코 캘린더',
      icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/>' },
    { href: '/car', color: '#c17a1f', label: '차량 캘린더',
      icon: '<path d="M14 16H9m10 0h2v-3.15a1 1 0 0 0-.84-.99L18 11.5l-2.35-3.13a1 1 0 0 0-.8-.4H6.5a2 2 0 0 0-1.79 1.11L3.6 11.5A5 5 0 0 0 3 14v2h2"/><circle cx="6.5" cy="16.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/>' },
    { href: '/crs', color: '#7a5fc4', label: 'CRS',
      icon: '<path d="M3 22h18M6 18V11M10 18V11M14 18V11M18 18V11M12 2 3 7h18z"/>' },
    { href: '/wolkoadmin', color: '#004f68', label: '캠프 매니지먼트',
      icon: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="M9 12h6M9 16h6"/>' },
    { href: '/campstaff', color: '#0077a3', label: '카운슬러',
      icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
  ];
  var HUB_ICON = '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';

  function svg(paths, w) {
    w = w || 18;
    return '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
  }

  function init() {
    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/hub') return; // 허브 자체 사이드바와 중복 방지

    var rail = document.createElement('nav');
    rail.className = 'wolko-rail';

    var html = '<a class="wolko-rail-logo-link" href="/hub" data-label="허브" style="position:relative">' +
      '<img class="wolko-rail-logo" src="/images/WOLKO Circle.png" alt="WOLKO"></a>' +
      '<div class="wolko-rail-divider"></div>';

    TOOLS.forEach(function (tool) {
      var active = path === tool.href;
      html += '<a class="wolko-rail-item' + (active ? ' is-active' : '') + '" href="' + tool.href + '" data-label="' + tool.label + '" style="--rail-color:' + tool.color + '">' +
        svg(tool.icon) + '</a>';
    });

    html += '<a class="wolko-rail-item wolko-rail-hub" href="/hub" data-label="전체 도구 보기">' + svg(HUB_ICON) + '</a>';

    rail.innerHTML = html;
    document.body.insertBefore(rail, document.body.firstChild);
    document.body.classList.add('wolko-rail-active');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
