/* 계절 배경 — 어떤 효과를 보여 줄지 정하는 규칙 (홈과 TV 가 같이 쓴다. 서버 설정은 /api/campteam/config 의 seasonFx)
   auto 날짜대로 · weather 오늘 날씨 따라 · spring/summer/rain/autumn/winter 고정 · off 없음
   결과: 'spring' | 'summer' | 'rain' | 'autumn' | 'winter' | '' (효과 없음) */
(function (root) {
  var MODES = ['auto', 'weather', 'spring', 'summer', 'rain', 'autumn', 'winter', 'off'];
  function kst(date) { return new Date((date || new Date()).toLocaleString('en-US', { timeZone: 'Asia/Seoul' })); }
  /* 가을 9월~11월 19일 · 겨울 11월 20일~2월 · 봄 3~5월 · 여름 6~8월 (한국에 첫눈이 올 즈음부터 겨울) */
  function bySeason(d) {
    var m = d.getMonth() + 1, day = d.getDate();
    if ((m === 11 && day >= 20) || m === 12 || m <= 2) return 'winter';
    if (m >= 3 && m <= 5) return 'spring';
    if (m >= 6 && m <= 8) return 'summer';
    return 'autumn';
  }
  function resolve(mode, opts) {
    opts = opts || {};
    if (MODES.indexOf(mode) < 0) mode = 'auto';
    if (mode === 'off') return '';
    var base = bySeason(kst(opts && opts.date));
    if (mode === 'auto') return base;
    if (mode === 'weather') { var k = opts && opts.weatherKind; return k === 'snow' ? 'winter' : (k === 'rain' || k === 'storm') ? 'rain' : base; }
    return mode;
  }
  root.CTSeasonFx = { MODES: MODES, resolve: resolve, bySeason: bySeason, kst: kst };
})(typeof window !== 'undefined' ? window : globalThis);
