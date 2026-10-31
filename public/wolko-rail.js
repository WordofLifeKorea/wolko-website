/* WOLKO 내부 도구 공용 좌측 레일 — 데스크톱 폭(900px~)에서만 표시.
   각 도구 페이지 head에 이 스크립트와 wolko-rail.css를 넣으면 자동 삽입됨.
   라벨은 항상 펼쳐서 보여준다(예전엔 아이콘만 두고 호버해야 이름이 보였는데,
   페이지 사이 이동이 잘 안 보인다는 피드백으로 상시 펼침으로 바꿨다). */
/* 왼쪽 메뉴 색이 하루 해를 따라 바뀐다 — 평택의 실제 해 뜨고 지는 시각(한국 시간)으로 계산한다.
   밤은 원래 남색, 새벽은 남보라, 아침은 맑은 청록빛 파랑, 한낮은 밝은 하늘색, 해 질 녘은 자두빛, 그 사이는 천천히 섞인다.
   글자가 흰색이라 가장 밝은 낮 색도 흰 글자와 대비 4.5:1 이상으로 둔다. 5분마다 다시 계산한다. */
(function () {
  var NIGHT = [11, 36, 48], DAWN = [52, 49, 94], MORNING = [34, 124, 160], DAY = [30, 122, 176], SUNSET = [91, 48, 80], TWILIGHT = [44, 37, 73];
  function sunTimesKst(ms, lat, lon) {
    var rad = Math.PI / 180, d = new Date(ms + 9 * 3600000);
    var n = Math.floor((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000);
    var g = 2 * Math.PI / 365 * (n - 1);
    var eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    var decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    var ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(decl)) - Math.tan(lat * rad) * Math.tan(decl)) / rad;
    return { rise: 720 - 4 * (lon + ha) - eqt + 540, set: 720 - 4 * (lon - ha) - eqt + 540 }; // 한국 시간 0시부터 몇 분째
  }
  function railRgb(ms) {
    var sun = sunTimesKst(ms, 36.99, 127.09); // 평택 월코센터
    var now = ((ms / 60000) + 540) % 1440;
    var stops = [[0, NIGHT], [sun.rise - 70, NIGHT], [sun.rise - 15, DAWN], [sun.rise + 45, MORNING], [sun.rise + 150, DAY], [sun.set - 80, DAY],
      [sun.set - 10, SUNSET], [sun.set + 35, TWILIGHT], [sun.set + 90, NIGHT], [1440, NIGHT]];
    for (var i = 1; i < stops.length; i++) {
      if (now > stops[i][0]) continue;
      var a = stops[i - 1], b = stops[i], t = b[0] === a[0] ? 1 : (now - a[0]) / (b[0] - a[0]);
      return [0, 1, 2].map(function (k) { return Math.round(a[1][k] + (b[1][k] - a[1][k]) * t); });
    }
    return NIGHT.slice();
  }
  function css(rgb) { return 'rgb(' + rgb.join(', ') + ')'; }
  function railColor(ms) { return css(railRgb(ms)); }
  // 대시보드 "이번 주 공지" 카드: 같은 색을 남색 쪽으로 30% 섞는다 — 안쪽 반투명 공지 칸 위의 흰 글자도 낮에 4.5:1 이상 읽히게
  function noticeColor(ms) {
    var rgb = railRgb(ms);
    return css(rgb.map(function (v, k) { return Math.round(v * 0.7 + NIGHT[k] * 0.3); }));
  }
  // 포탈 첫 화면에서는 하늘 배너(hub-sky.js)가 미리보기 시각(?sky=)까지 맞춰 paintAt 을 불러 준다
  function paintRail(ms) {
    var now = ms || (window.WolkoSkyTime ? window.WolkoSkyTime.nowMs() : Date.now()), root = document.documentElement.style;
    root.setProperty('--ws-rail-bg', railColor(now));
    root.setProperty('--ws-notice-bg', noticeColor(now));
  }
  window.WolkoRailSky = { railColor: railColor, noticeColor: noticeColor, sunTimesKst: sunTimesKst, paintAt: paintRail };
  paintRail();
  setInterval(function () { paintRail(); }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) paintRail(); });
})();

(function () {
  var GROUPS = [{ id: 'wolko', ko: '월코', en: 'WOLKO' }, { id: 'camp', ko: '캠프', en: 'Camp' }, { id: 'personal', ko: '개인업무', en: 'Personal' }];
  var TOOLS = [
    { group: 'wolko', href: '/portal/schedule', color: '#22b573', label: '월코 캘린더', label_en: 'WOLKO Calendar',
      icon: '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/><rect x="7" y="13.5" width="4" height="4" rx="1" fill="currentColor" stroke="none"/>' },
    { group: 'wolko', href: '/portal/crs', color: '#8b6cf0', label: 'CRS', label_en: 'CRS',
      icon: '<path d="M12 2v3M10.3 3.5h3.4"/><path d="M4 10.5 12 5l8 5.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-6.5a2 2 0 0 1 4 0V20"/>' },
    { group: 'wolko', href: '/portal/wolkoevents', color: '#f0643f', label: '이벤트 관리', label_en: 'Event Management',
      icon: '<path d="M8 3v3M16 3v3M4 8h16"/><rect x="3.5" y="5" width="17" height="16" rx="2"/><path d="M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 17.5h.01M12 17.5h.01"/>' },
    { group: 'wolko', href: '/portal/resource', color: '#14b8c4', label: 'Resource & Media', label_en: 'Resource & Media',
      icon: '<path d="M4 19V5M4 19h16"/><path d="m7 15 4-4 3 2 5-6"/><circle cx="7" cy="15" r="1" fill="currentColor" stroke="none"/><circle cx="11" cy="11" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="13" r="1" fill="currentColor" stroke="none"/><circle cx="19" cy="7" r="1" fill="currentColor" stroke="none"/>' },
    { group: 'wolko', href: '/portal/gospel-stats', color: '#e0566c', label: '복음 통계', label_en: 'Gospel Stats',
      icon: '<path d="M4 20V11M10 20V5M16 20v-7M22 20H2"/><circle cx="19" cy="6.5" r="2" fill="currentColor" stroke="none"/>' },
    { group: 'wolko', href: '/portal/prayers', color: '#d6567a', label: '기도제목 나누기', label_en: 'Prayer Requests',
      icon: '<path d="M12 21s-7-4.2-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.8-7 10-7 10Z"/>' },
    { group: 'camp', href: '/portal/wolkoadmin', color: '#3b8ff0', label: '캠프 관리자', label_en: 'Camp Manager',
      icon: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="m9 13.5 2 2 4-4.5"/>' },
    { group: 'camp', href: '/portal/campstaff', color: '#ec5fa0', label: '카운슬러', label_en: 'Counselor',
      icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4" fill="currentColor" fill-opacity=".12"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>' },
    { group: 'camp', href: '/portal/camp-resources', color: '#9bbf1f', label: '캠프 자료실', label_en: 'Camp Resources',
      icon: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
    { group: 'camp', href: '/portal/campteam', color: '#e8c53a', label: '캠프 & 아웃리치 팀', label_en: 'Camp & Outreach Team',
      icon: '<path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/><path d="M8 12h8M8 16h5"/>' },
    { group: 'personal', href: '/portal/expense', color: '#f0a020', label: '경비 리포트', label_en: 'Expense Report',
      icon: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/>' },
    { group: 'personal', href: '/portal/car-drive', color: '#d155e6', label: '차량', label_en: 'Vehicle',
      icon: '<path d="M14 16H9m10 0h2v-3.15a1 1 0 0 0-.84-.99L18 11.5l-2.35-3.13a1 1 0 0 0-.8-.4H6.5a2 2 0 0 0-1.79 1.11L3.6 11.5A5 5 0 0 0 3 14v2h2"/><circle cx="6.5" cy="16.5" r="2.5" fill="currentColor" stroke="none"/><circle cx="16.5" cy="16.5" r="2.5" fill="currentColor" stroke="none"/>' },
    { group: 'personal', href: '/portal/kitchen', color: '#d4a373', label: '주방 보조', label_en: 'Kitchen Duty',
      icon: '<path d="M5 3v6a3 3 0 0 0 3 3v9M8 3v6M11 3v6a3 3 0 0 1-3 3"/><path d="M18 21V3c-2.5 1.5-3.5 4-3.5 7.5 0 1.5.8 2.5 3.5 2.5"/>' },
    { group: 'personal', href: '/portal/mypage', color: '#2fcfa3', label: '내 페이지', label_en: 'My Page',
      icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4" fill="currentColor" fill-opacity=".12"/><path d="M19 8v6M16 11h6"/>' },
  ];
  var HUB_ICON = '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>';
  var HUB_LABEL = { ko: '전체 도구 보기', en: 'View All Tools' };

  /* 메뉴 아이콘 — 직접 그린 색 있는 일러스트(32×32). 그라데이션 없이 단색 면으로만 그려서, 화면에 숨은 서랍과 레일에 같은 그림이 두 번 들어가도 깨지지 않는다.
     포탈 홈(portal.astro)도 같은 그림을 쓰도록 window.WolkoArt 로 내보낸다 — 키는 도구 주소. */
  var ART = {
    '/portal/schedule': '<rect x="4" y="5.500" width="24" height="22.500" rx="4.500" fill="#fff"/><path d="M4 10a4.500 4.500 0 0 1 4.500-4.500h15A4.500 4.500 0 0 1 28 10v3.500H4z" fill="#1fa86a"/><rect x="9.500" y="2.500" width="3" height="6" rx="1.500" fill="#14724a"/><rect x="19.500" y="2.500" width="3" height="6" rx="1.500" fill="#14724a"/><rect x="8" y="16.500" width="4.500" height="3.800" rx="1.200" fill="#cfe9dc"/><rect x="13.800" y="16.500" width="4.500" height="3.800" rx="1.200" fill="#cfe9dc"/><rect x="19.600" y="16.500" width="4.500" height="3.800" rx="1.200" fill="#1fa86a"/><rect x="8" y="22" width="4.500" height="3.800" rx="1.200" fill="#cfe9dc"/><rect x="13.800" y="22" width="4.500" height="3.800" rx="1.200" fill="#cfe9dc"/><rect x="19.600" y="22" width="4.500" height="3.800" rx="1.200" fill="#cfe9dc"/>',
    '/portal/crs': '<ellipse cx="16" cy="30.200" rx="5.500" ry="1.300" fill="#000" opacity=".2"/><path d="M16 29S5.500 19.500 5.500 12.500a10.500 10.500 0 0 1 21 0C26.500 19.500 16 29 16 29z" fill="#7b5cf0"/><path d="M16 2a10.500 10.500 0 0 1 10.500 10.500C26.500 19.500 16 29 16 29z" fill="#5f43d6"/><circle cx="16" cy="12.500" r="6.800" fill="#fff"/><rect x="14.800" y="7.800" width="2.400" height="9.600" rx="1" fill="#6a4fd6"/><rect x="11.600" y="10.600" width="8.800" height="2.400" rx="1" fill="#6a4fd6"/>',
    '/portal/wolkoevents': '<path d="M4.500 13.500A2.500 2.500 0 0 1 7 11h4.500L24 5.500v21L11.500 21H7a2.500 2.500 0 0 1-2.500-2.500z" fill="#f0643f"/><path d="M11.500 16H24v10.500L11.500 21z" fill="#c94a2a"/><rect x="22" y="4.500" width="3.800" height="23" rx="1.900" fill="#ffd9cc"/><rect x="8.500" y="20.500" width="4.200" height="7" rx="1.600" fill="#8a2f1b"/><path d="M6.800 13.500h4" stroke="#fff" stroke-width="1.400" stroke-linecap="round" opacity=".55"/><path d="M27.800 11.500c1.300 1.500 1.300 7.500 0 9M30 8.500c2.300 2.900 2.300 12.100 0 15" stroke="#ffc83d" stroke-width="1.800" fill="none" stroke-linecap="round"/>',
    '/portal/resource': '<rect x="3" y="5.500" width="26" height="21" rx="4.500" fill="#fff"/><rect x="5.500" y="8" width="21" height="16" rx="2.500" fill="#cdeff2"/><circle cx="21.500" cy="12.800" r="2.400" fill="#ffc83d"/><path d="M5.500 21.500 12 14.500l5 5.500 3-3 6.500 5.500v.5a2.500 2.500 0 0 1-2.500 2.500H8A2.500 2.500 0 0 1 5.500 24z" fill="#14b8c4"/><path d="M5.500 24v-2.500l4.500-4.800 5 5.300-1.800 2H8A2.500 2.500 0 0 1 5.500 24z" fill="#0e8f99"/>',
    '/portal/gospel-stats': '<rect x="3" y="3.500" width="26" height="25" rx="5" fill="#fff"/><rect x="7.500" y="17" width="4.500" height="8" rx="1.300" fill="#f7a8b6"/><rect x="13.800" y="12" width="4.500" height="13" rx="1.300" fill="#ef5b6c"/><rect x="20" y="7.500" width="4.500" height="17.500" rx="1.300" fill="#c93058"/>',
    '/portal/prayers': '<path d="M7 5h18a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4h-8.500L10 28.500V23H7a4 4 0 0 1-4-4V9a4 4 0 0 1 4-4z" fill="#fff"/><path d="M16 19.500c-3.500-2-6-4.400-6-7.100a3.300 3.300 0 0 1 6-1.900 3.300 3.300 0 0 1 6 1.900c0 2.700-2.500 5.100-6 7.100z" fill="#e0457b"/><path d="M12.200 11.800c.3-1 1-1.600 1.900-1.700" stroke="#fff" stroke-width="1.200" opacity=".6" fill="none" stroke-linecap="round"/>',
    '/portal/wolkoadmin': '<rect x="5" y="5.500" width="22" height="24" rx="4" fill="#3b8ff0"/><rect x="8" y="9.500" width="16" height="17.500" rx="2" fill="#fff"/><rect x="11" y="3" width="10" height="6.500" rx="2.200" fill="#1f5fbf"/><path d="M11 18.500l3.200 3.200 6.300-7.200" stroke="#22b573" stroke-width="2.700" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    '/portal/campstaff': '<path d="M9.500 1.800 16 10l6.500-8.200" stroke="#5b8def" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="6" y="8.500" width="20" height="22" rx="3.800" fill="#fff"/><path d="M6 12.300A3.800 3.800 0 0 1 9.800 8.500h12.400A3.800 3.800 0 0 1 26 12.300V15H6z" fill="#5b8def"/><rect x="12.500" y="6.800" width="7" height="4.200" rx="1.600" fill="#9aa9bd"/><circle cx="16" cy="20.500" r="3.400" fill="#ffc9a8"/><path d="M12.600 20a3.400 3.400 0 0 1 6.800 0c-2-.7-4.800-.7-6.800 0z" fill="#6b3f2a"/><path d="M9.800 29.500a6.200 6.200 0 0 1 12.400 0z" fill="#ec5fa0"/>',
    '/portal/camp-resources': '<path d="M3 9.500A3.500 3.500 0 0 1 6.500 6h5.500l3 3h10.500a3.500 3.500 0 0 1 3.500 3.500v13A3.500 3.500 0 0 1 25.500 29h-19A3.500 3.500 0 0 1 3 25.500z" fill="#8fb51a"/><rect x="7" y="10.500" width="18" height="8" rx="1.500" fill="#fff"/><path d="M3 15.500A3.500 3.500 0 0 1 6.500 12h19a3.500 3.500 0 0 1 3.500 3.500v10A3.500 3.500 0 0 1 25.500 29h-19A3.500 3.500 0 0 1 3 25.500z" fill="#bddc3c"/>',
    '/portal/campteam': '<circle cx="8.500" cy="13.500" r="3.800" fill="#ffd9bf"/><path d="M4.700 13a3.800 3.800 0 0 1 7.600 0c-2.400-.8-5.200-.8-7.600 0z" fill="#3b2a20"/><path d="M1.500 27.500a7 7 0 0 1 14 0z" fill="#5b8def"/><circle cx="23.500" cy="13.500" r="3.800" fill="#ffd9bf"/><path d="M19.700 13a3.800 3.800 0 0 1 7.600 0c-2.400-.8-5.200-.8-7.600 0z" fill="#3b2a20"/><path d="M16.500 27.500a7 7 0 0 1 14 0z" fill="#2fb59a"/><circle cx="16" cy="11" r="4.800" fill="#ffc9a8"/><path d="M11.200 10.500a4.800 4.800 0 0 1 9.600 0c-3-1-6.600-1-9.600 0z" fill="#6b3f2a"/><path d="M6.500 29.500a9.500 9.500 0 0 1 19 0z" fill="#f5a623"/><path d="M16 20a9.500 9.500 0 0 1 9.500 9.500H16z" fill="#dd8d0f"/>',
    '/portal/expense': '<path d="M6 3h18v26l-3-2.300L18 29l-3-2.300L12 29l-3-2.300L6 29z" fill="#fff"/><rect x="10" y="8" width="10" height="2.200" rx="1.100" fill="#f0a020"/><rect x="10" y="13" width="10" height="2.200" rx="1.100" fill="#cfd8dc"/><rect x="10" y="18" width="6" height="2.200" rx="1.100" fill="#cfd8dc"/><circle cx="23.500" cy="22.500" r="6.500" fill="#ffc72c"/><circle cx="23.500" cy="22.500" r="4.600" fill="#f0a020"/><path d="M19.800 20.200l1.600 5.200 2.100-4.400 2.100 4.400 1.600-5.200M19.500 22.200h8" stroke="#fff3c4" stroke-width="1.300" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    '/portal/car-drive': '<path d="M2.500 22v-7.500A3.500 3.500 0 0 1 6 11h14c1.300 0 2.600.7 3.400 1.800l4.200 5.500c.3.400.4.800.4 1.300V22a2 2 0 0 1-2 2H4.500a2 2 0 0 1-2-2z" fill="#7c4dff"/><path d="M2.500 19.500h25.500V22a2 2 0 0 1-2 2H4.500a2 2 0 0 1-2-2z" fill="#6338e0"/><rect x="5.500" y="13.500" width="5.200" height="4.600" rx="1.200" fill="#e7e0ff"/><rect x="12" y="13.500" width="5.200" height="4.600" rx="1.200" fill="#e7e0ff"/><path d="M19.500 13.500h2c.7 0 1.300.3 1.700.9l2.400 3.700h-6.100z" fill="#e7e0ff"/><rect x="25.300" y="19.600" width="2.700" height="2.200" rx="1" fill="#ffd23f"/><circle cx="9" cy="24" r="3.700" fill="#222a3a"/><circle cx="9" cy="24" r="1.500" fill="#cfd8dc"/><circle cx="22" cy="24" r="3.700" fill="#222a3a"/><circle cx="22" cy="24" r="1.500" fill="#cfd8dc"/>',
    '/portal/kitchen': '<path d="M9.500 19v-1.300C6.200 17 4 14.500 4 11.600 4 8.600 6.400 6.300 9.300 6.300c.7 0 1.300.1 1.900.4C12.100 5 13.900 4 16 4s3.900 1 4.800 2.700c.6-.3 1.200-.4 1.900-.4 2.900 0 5.300 2.300 5.300 5.300 0 2.900-2.200 5.400-5.500 6.100V19z" fill="#fff"/><path d="M16 4c2.100 0 3.900 1 4.800 2.700.6-.3 1.200-.4 1.900-.4 2.900 0 5.300 2.300 5.300 5.300 0 2.900-2.200 5.400-5.500 6.100V19h-6.500z" fill="#e3eaf0"/><path d="M12.500 11.500v5M16 10.500v6M19.500 11.500v5" stroke="#cfd9e2" stroke-width="1.300" stroke-linecap="round"/><path d="M9.500 19h13v6.500a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2z" fill="#f0a63a"/><path d="M16 19h6.500v6.500a2 2 0 0 1-2 2H16z" fill="#d98a1c"/><rect x="9.500" y="19" width="13" height="2.600" fill="#ffc15e"/>',
    '/portal/mypage': '<circle cx="16" cy="16" r="14" fill="#2fcfa3"/><circle cx="16" cy="12.500" r="5.200" fill="#fff"/><path d="M6.200 25.200a10.500 10.500 0 0 1 19.600 0 14 14 0 0 1-19.600 0z" fill="#fff"/>',
    '__hub': '<rect x="3.500" y="3.500" width="11.500" height="11.500" rx="3.200" fill="#22b573"/><rect x="17" y="3.500" width="11.500" height="11.500" rx="3.200" fill="#3b8ff0"/><rect x="3.500" y="17" width="11.500" height="11.500" rx="3.200" fill="#f0643f"/><rect x="17" y="17" width="11.500" height="11.500" rx="3.200" fill="#f5b82e"/>'
  };
  window.WolkoArt = ART;
  function art(key, w) {
    w = w || 22;
    return '<svg class="wolko-art" width="' + w + '" height="' + w + '" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' + ART[key] + '</svg>';
  }
  function toolIcon(tool) { return ART[tool.href] ? art(tool.href) : toolIcon(tool); }

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
    document.querySelectorAll('.wolko-rail-item-label[data-ko], .wolko-rail-group[data-ko], .wl-logout[data-ko], .wolko-drawer-label[data-ko], .wolko-drawer-group[data-ko]').forEach(function (el) {
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

  // 관리자가 임시 비밀번호로 초기화한 계정: 로그인하면 닫을 수 없는 '새 비밀번호 설정' 창을 먼저 띄운다
  var FT = {
    ko: { title: '새 비밀번호를 설정해 주세요', desc: '임시 비밀번호로 로그인했어요. 안전을 위해 지금 새 비밀번호로 바꿔 주세요.', cur: '임시 비밀번호', nw: '새 비밀번호 (8자 이상)', again: '새 비밀번호 확인', save: '비밀번호 변경', mismatch: '새 비밀번호가 서로 달라요.', fail: '변경하지 못했어요.' },
    en: { title: 'Set a new password', desc: 'You signed in with a temporary password. Please choose a new one now.', cur: 'Temporary password', nw: 'New password (8+ characters)', again: 'Confirm new password', save: 'Change password', mismatch: 'The new passwords do not match.', fail: 'Could not change it.' },
  };
  function checkPasswordReset() {
    var token = '';
    try { token = sessionStorage.getItem('wolko-hub-token') || ''; } catch (e) {}
    if (!token || document.querySelector('.wl-force-pw')) return;
    fetch('/api/hub/me', { headers: { Authorization: 'Bearer ' + token } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (me) {
        if (!me || !me.mustChangePassword) return;
        openForcedPassword(function (current, next) {
          return fetch('/api/hub/account-password', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword: current, newPassword: next }) })
            .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || ''); }); })
            .then(function () { try { sessionStorage.removeItem('wolko-hub-me:' + token.slice(-16)); } catch (e) {} });
        });
      })
      .catch(function () {});
  }
  window.wolkoCheckPasswordReset = checkPasswordReset;
  // submit(현재, 새) 는 성공하면 resolve, 실패하면 Error 로 reject 하는 함수 — 포탈 계정과 카운슬러 계정이 같은 창을 쓴다
  window.wolkoForcePasswordChange = function (submit) { if (!document.querySelector('.wl-force-pw')) openForcedPassword(submit); };
  function openForcedPassword(submitFn) {
    var t = FT[currentLang()] || FT.ko;
    var overlay = document.createElement('div');
    overlay.className = 'wl-prof-overlay wl-force-pw';
    var card = document.createElement('div');
    card.className = 'wl-prof-card';
    card.setAttribute('role', 'alertdialog'); card.setAttribute('aria-modal', 'true');
    function field(label, auto) {
      var wrap = document.createElement('label'); wrap.className = 'wl-prof-field';
      var span = document.createElement('span'); span.textContent = label;
      var input = document.createElement('input'); input.type = 'password'; input.setAttribute('autocomplete', auto);
      wrap.append(span, input); return { wrap: wrap, input: input };
    }
    var h = document.createElement('h3'); h.textContent = t.title;
    var p = document.createElement('p'); p.className = 'wl-prof-hint'; p.textContent = t.desc; p.style.margin = '0 2px 4px';
    var fCur = field(t.cur, 'current-password'), fNew = field(t.nw, 'new-password'), fAgain = field(t.again, 'new-password');
    var msg = document.createElement('p'); msg.className = 'wl-prof-msg'; msg.setAttribute('role', 'status');
    var save = document.createElement('button'); save.type = 'button'; save.className = 'wl-prof-primary'; save.textContent = t.save;
    card.append(h, p, fCur.wrap, fNew.wrap, fAgain.wrap, msg, save);
    overlay.append(card);
    document.body.append(overlay);
    setTimeout(function () { fCur.input.focus(); }, 30);
    function submit() {
      msg.textContent = ''; msg.className = 'wl-prof-msg';
      if (fNew.input.value !== fAgain.input.value) { msg.textContent = t.mismatch; msg.className = 'wl-prof-msg err'; return; }
      save.disabled = true;
      Promise.resolve().then(function () { return submitFn(fCur.input.value, fNew.input.value); })
        .then(function () { overlay.remove(); })
        .catch(function (e) { msg.textContent = (e && e.message) || t.fail; msg.className = 'wl-prof-msg err'; save.disabled = false; });
    }
    save.addEventListener('click', submit);
    card.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
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

  // 모든 도구 페이지 헤더 오른쪽 끝에 같은 '로그아웃' 버튼을 둔다 (페이지가 이미 가진 경우는 건드리지 않는다)
  function mountLogout() {
    var header = document.querySelector('body > header');
    if (!header || header.querySelector('.btn-logout, .logout-btn, #logoutBtn, [onclick*="doLogout"]')) return;
    var token = '';
    try { token = sessionStorage.getItem('wolko-hub-token') || ''; } catch (e) {}
    if (!token) return;
    var toggle = header.querySelector('.wl-lang-toggle, .adm-lang-switch');
    if (!toggle || !toggle.parentNode) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-logout wl-logout';
    btn.setAttribute('data-ko', '로그아웃');
    btn.setAttribute('data-en', 'Log out');
    btn.textContent = currentLang() === 'en' ? 'Log out' : '로그아웃';
    btn.addEventListener('click', function () {
      if (window.WolkoSession) { window.WolkoSession.logoutAll(); return; }
      try { ['wolko-hub-token', 'wolko-hub-email', 'wolko-hub-role'].forEach(function (k) { sessionStorage.removeItem(k); }); } catch (e) {}
      window.location.replace('/portal');
    });
    toggle.parentNode.insertBefore(btn, toggle.nextSibling);
  }

  // 좁은 화면(900px 미만)에서는 레일이 숨으므로, 헤더 맨 오른쪽의 햄버거 버튼으로 같은 도구 목록을 오른쪽에서 밀려 나오는 서랍으로 연다
  function mountMobileMenu(path) {
    if (document.querySelector('.wolko-burger')) return;
    var ko = currentLang() !== 'en';
    var drawer = document.createElement('nav');
    drawer.className = 'wolko-drawer'; drawer.id = 'wolkoDrawer'; drawer.setAttribute('aria-label', 'WOLKO Portal');
    var html = '<div class="wolko-drawer-head"><img src="/images/WOLKO Circle.png" alt=""><b>WOLKO Portal</b><button type="button" class="wolko-drawer-close" aria-label="Close menu">×</button></div>';
    GROUPS.forEach(function (g) {
      html += '<div class="wolko-drawer-group" data-ko="' + g.ko + '" data-en="' + g.en + '"></div>';
      TOOLS.filter(function (tool) { return tool.group === g.id; }).forEach(function (tool) {
        var active = path === tool.href || (tool.href === '/portal/car-drive' && (path === '/portal/car' || path === '/portal/car-log'));
        html += '<a class="wolko-drawer-item' + (active ? ' is-active' : '') + '" href="' + tool.href + '" style="--rail-color:' + tool.color + '"><span class="wolko-drawer-icon">' + toolIcon(tool) + '</span><span class="wolko-drawer-label" data-ko="' + tool.label + '" data-en="' + tool.label_en + '"></span></a>';
      });
    });
    html += '<a class="wolko-drawer-item wolko-drawer-hub" href="/portal"><span class="wolko-drawer-icon">' + art('__hub') + '</span><span class="wolko-drawer-label" data-ko="' + HUB_LABEL.ko + '" data-en="' + HUB_LABEL.en + '"></span></a>';
    drawer.innerHTML = html;
    var backdrop = document.createElement('div');
    backdrop.className = 'wolko-drawer-backdrop';
    var burger = document.createElement('button');
    burger.type = 'button'; burger.className = 'wolko-burger'; burger.setAttribute('aria-controls', 'wolkoDrawer'); burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', ko ? '메뉴 열기' : 'Open menu');
    burger.innerHTML = '<span></span><span></span><span></span>';
    var header = document.querySelector('body > header');
    if (header) header.appendChild(burger); else { burger.classList.add('is-floating'); document.body.appendChild(burger); }
    document.body.appendChild(drawer); document.body.appendChild(backdrop);
    function toggle(open) {
      document.body.classList.toggle('wolko-drawer-open', open);
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', currentLang() === 'en' ? (open ? 'Close menu' : 'Open menu') : (open ? '메뉴 닫기' : '메뉴 열기'));
    }
    burger.addEventListener('click', function () { toggle(!document.body.classList.contains('wolko-drawer-open')); });
    backdrop.addEventListener('click', function () { toggle(false); });
    drawer.querySelector('.wolko-drawer-close').addEventListener('click', function () { toggle(false); });
    drawer.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a')) toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
    window.addEventListener('resize', function () { if (window.innerWidth >= 900) toggle(false); });
  }

  // 제주팀 일반 멤버는 쓸 수 있는 도구가 정해져 있다 — 메뉴 정리와 페이지 안내는 wolko-access.js 가 맡는다
  function mountAccess() {
    if (window.WolkoAccess || document.querySelector('script[data-wolko-access]')) return;
    var script = document.createElement('script');
    script.src = '/wolko-access.js?v=1'; script.async = true; script.setAttribute('data-wolko-access', '');
    document.head.appendChild(script);
  }

  function init() {
    var path = window.location.pathname.replace(/\/+$/, '') || '/';
    checkPasswordReset();
    mountAccess();
    if (path === '/portal') { if (document.querySelector('.hub-topbar')) mountUserChip(); return; } // 포탈 첫 화면은 자체 사이드바 — 위쪽 머리글에 계정 칩만 다른 페이지처럼 붙인다
    mountUserChip();
    mountLogout();

    var rail = document.createElement('nav');
    rail.className = 'wolko-rail';

    var html = '<a class="wolko-rail-logo-link" href="/portal">' +
      '<img class="wolko-rail-logo" src="/images/WOLKO Circle.png" alt="WOLKO">' +
      '<span class="wolko-rail-logo-text"><span class="wolko-rail-logo-name">WOLKO Portal</span><span class="wolko-rail-logo-sub">Word of Life Korea</span></span></a>' +
      '<div class="wolko-rail-divider"></div>';

    GROUPS.forEach(function (g) {
      html += '<div class="wolko-rail-group" data-ko="' + g.ko + '" data-en="' + g.en + '"></div>';
      TOOLS.filter(function (tool) { return tool.group === g.id; }).forEach(function (tool) {
      var active = path === tool.href || (tool.href === '/portal/car-drive' && (path === '/portal/car' || path === '/portal/car-log')); // 차량 메뉴: 사용 일지(기본) · 예약현황 · 정비 관리
      html += '<a class="wolko-rail-item' + (active ? ' is-active' : '') + '" href="' + tool.href + '" style="--rail-color:' + tool.color + '">' +
        '<span class="wolko-rail-item-icon">' + toolIcon(tool) + '</span><span class="wolko-rail-item-label" data-ko="' + tool.label + '" data-en="' + tool.label_en + '"></span></a>';
      });
    });

    html += '<a class="wolko-rail-item wolko-rail-hub" href="/portal"><span class="wolko-rail-item-icon">' + art('__hub') + '</span>' +
      '<span class="wolko-rail-item-label" data-ko="' + HUB_LABEL.ko + '" data-en="' + HUB_LABEL.en + '"></span></a>';

    rail.innerHTML = html;
    document.body.insertBefore(rail, document.body.firstChild);
    document.body.classList.add('wolko-rail-active');
    mountMobileMenu(path);
    if (window.WolkoAccess) window.WolkoAccess.apply();   // 쓸 수 있는 도구를 이미 알고 있으면 지금 메뉴를 줄인다(모르면 알게 되는 대로 줄인다)
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
