/* WOLKO 내부 도구 공용 좌측 레일 — 데스크톱 폭(900px~)에서만 표시.
   각 도구 페이지 head에 이 스크립트와 wolko-rail.css를 넣으면 자동 삽입됨.
   라벨은 항상 펼쳐서 보여준다(예전엔 아이콘만 두고 호버해야 이름이 보였는데,
   페이지 사이 이동이 잘 안 보인다는 피드백으로 상시 펼침으로 바꿨다). */
(function () {
  var TOOLS = [
    { href: '/schedule', color: '#1da462', label: '월코 캘린더', label_en: 'WOLKO Calendar',
      icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/><rect x="7" y="13.5" width="4" height="4" rx="1" fill="currentColor" stroke="none"/>' },
    // 차량 캘린더: 당장 쓸 일이 없어 임시로 사이드바에서 숨김 (페이지/기능은 그대로 유지, /car 직접 접속은 가능)
    { href: '/crs', color: '#7a5fc4', label: 'CRS', label_en: 'CRS',
      icon: '<path d="M12 2v3M10.3 3.5h3.4"/><path d="M4 10.5 12 5l8 5.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6.5a2 2 0 0 1 4 0V20"/>' },
    { href: '/wolkoadmin', color: '#004f68', label: '캠프 관리자', label_en: 'Camp Manager',
      icon: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="m9 13.5 2 2 4-4.5"/>' },
    { href: '/campstaff', color: '#0077a3', label: '카운슬러', label_en: 'Counselor',
      icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4" fill="currentColor" fill-opacity=".12"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
    { href: '/resource', color: '#008e92', label: 'Resource & Media', label_en: 'Resource & Media',
      icon: '<path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/><circle cx="7" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="11" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="7" r="1" fill="currentColor" stroke="none"/>' },
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
    document.querySelectorAll('.wolko-rail-item-label[data-ko]').forEach(function (el) {
      el.textContent = lang === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-ko');
    });
  }

  function init() {
    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    if (path === '/portal') return; // 포탈 런처 자체 사이드바와 중복 방지

    var rail = document.createElement('nav');
    rail.className = 'wolko-rail';

    var html = '<a class="wolko-rail-logo-link" href="/portal">' +
      '<img class="wolko-rail-logo" src="/images/WOLKO Circle.png" alt="WOLKO">' +
      '<span class="wolko-rail-logo-text">WOLKO Portal</span></a>' +
      '<div class="wolko-rail-divider"></div>';

    TOOLS.forEach(function (tool) {
      var active = path === tool.href;
      html += '<a class="wolko-rail-item' + (active ? ' is-active' : '') + '" href="' + tool.href + '" style="--rail-color:' + tool.color + '">' +
        svg(tool.icon) + '<span class="wolko-rail-item-label" data-ko="' + tool.label + '" data-en="' + tool.label_en + '"></span></a>';
    });

    html += '<a class="wolko-rail-item wolko-rail-hub" href="/portal">' + svg(HUB_ICON) +
      '<span class="wolko-rail-item-label" data-ko="' + HUB_LABEL.ko + '" data-en="' + HUB_LABEL.en + '"></span></a>';

    rail.innerHTML = html;
    document.body.insertBefore(rail, document.body.firstChild);
    document.body.classList.add('wolko-rail-active');
    syncLabels();

    new MutationObserver(syncLabels).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
