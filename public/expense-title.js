/* 경비 리포트 제목 자동 입력 — 한국 시간 오늘 날짜로 "2026년 10월 5째 주 리포트"(영어: "Oct 2026 · Week 5 report")를 만든다.
   몇째 주: 월요일에 시작하는 주로 센다. 1일이 들어 있는 주가 1째 주이고, 월요일마다 한 주씩 늘어난다(달에 따라 5째·6째 주까지 있다).
   예) 2026-10-01(목) → 1째 주, 2026-10-05(월) → 2째 주, 2026-10-31(토) → 5째 주. */
(function (root) {
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // 한국 시간 기준 { y, m(1-12), d, week }
  function kstWeek(ms) {
    var k = new Date((ms == null ? Date.now() : ms) + 9 * 3600000);
    var y = k.getUTCFullYear(), m = k.getUTCMonth(), d = k.getUTCDate();
    var firstDow = (new Date(Date.UTC(y, m, 1)).getUTCDay() + 6) % 7;   // 1일의 요일, 월요일 = 0
    return { y: y, m: m + 1, d: d, week: Math.floor((d - 1 + firstDow) / 7) + 1 };
  }
  function autoTitle(lang, ms) {
    var w = kstWeek(ms);
    return lang === 'en' ? MON[w.m - 1] + ' ' + w.y + ' · Week ' + w.week + ' report' : w.y + '년 ' + w.m + '월 ' + w.week + '째 주 리포트';
  }
  // 예전에 자동으로 만든 제목인지 (한국어 · 영어 둘 다)
  function isAutoTitle(s) {
    s = String(s || '').trim();
    return /^\d{4}년 \d{1,2}월 \d째 주 리포트$/.test(s) || /^[A-Z][a-z]{2} \d{4} · Week \d report$/.test(s);
  }
  root.ExpenseTitle = { kstWeek: kstWeek, autoTitle: autoTitle, isAutoTitle: isAutoTitle };
})(typeof window !== 'undefined' ? window : globalThis);
