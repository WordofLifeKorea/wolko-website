/* 캠프팀 왼쪽 메뉴의 하루 색 — 월코 포털(wolko-rail.js)의 같은 계산을 그대로 옮긴 것이다.
   포털의 레일 스크립트를 불러오면 메뉴가 하나 더 생기므로, 색 계산만 따로 두었다. 포털의 색 기준이 바뀌면 이 파일도 같이 맞춘다. */
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
  // 밤 정도(0 = 낮, 1 = 깊은 밤): 해 지기 10분 전부터 해 지고 1시간 뒤까지 차오르고, 해 뜨기 1시간 전부터 해 뜨고 20분 뒤까지 빠진다.
  // 메뉴 아이콘이 이 값을 따라 밤에는 창가 불빛처럼 은은하게 빛나고 작은 별이 반짝인다(wolko-site.css).
  function nightAt(ms) {
    var sun = sunTimesKst(ms, 36.99, 127.09), now = ((ms / 60000) + 540) % 1440, k = 0;
    if (now >= sun.set - 10) k = (now - (sun.set - 10)) / 70;
    else if (now <= sun.rise + 20) k = ((sun.rise + 20) - now) / 80;
    return Math.round(Math.min(1, Math.max(0, k)) * 100) / 100;
  }
  // 포탈 첫 화면에서는 하늘 배너(hub-sky.js)가 미리보기 시각(?sky=)까지 맞춰 paintAt 을 불러 준다
  function paintRail(ms) {
    var now = ms || (window.WolkoSkyTime ? window.WolkoSkyTime.nowMs() : Date.now()), root = document.documentElement.style;
    root.setProperty('--ws-rail-bg', railColor(now));
    root.setProperty('--ws-notice-bg', noticeColor(now));
    root.setProperty('--ws-night', String(nightAt(now)));
  }
  window.CTRailSky = { railColor: railColor, noticeColor: noticeColor, nightAt: nightAt, sunTimesKst: sunTimesKst, paintAt: paintRail };
  paintRail();
  setInterval(function () { paintRail(); }, 5 * 60 * 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) paintRail(); });
})();
