/* 팀 사무실 캐릭터 — 머리·피부·안경·수염·옷 색을 조합해 코드로 그린 작은 만화풍 캐릭터와 책상. (실제 얼굴 사진은 쓰지 않는다)
   window.CTOfficeArt.desk(avatar, seated) → 책상에 앉은(또는 빈 의자) SVG 문자열, .guest() → 게스트(중립) SVG 문자열, .tick() → 안경을 번갈아 쓰고 벗는 캐릭터를 한 단계씩 바꾼다. */
(function () {
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  function shade(hex, f) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; var m = function (v) { return Math.max(0, Math.min(255, Math.round(v * f))); }; return '#' + ((1 << 24) | (m(r) << 16) | (m(g) << 8) | m(b)).toString(16).slice(1); }
  function hairBack(st, c) {
    if (st === 'long') return '<path d="M26 36Q26 19 44 19Q62 19 62 36L64 66Q44 72 24 66Z" fill="' + c + '"/>';
    if (st === 'bun') return '<circle cx="44" cy="17" r="7.500" fill="' + c + '"/>';
    if (st === 'ponytail') return '<path d="M57 30Q71 30 69 52Q66 44 58 42Z" fill="' + c + '"/>';
    return '';
  }
  function hairFront(st, c) {
    var cap = '<path d="M28 39A16 16 0 0 1 60 39Q57 27 44 27Q31 27 28 39Z" fill="' + c + '"/>';
    if (st === 'bald') return '<ellipse cx="38" cy="27.500" rx="4.500" ry="2" fill="#fff" opacity=".35"/>';
    if (st === 'bangs') return '<path d="M27.500 41A16.500 16.500 0 0 1 60.500 41Q57 31 51 33Q45 27 38 33Q32 31 27.500 41Z" fill="' + c + '"/>';
    if (st === 'wavy') return cap + [[31, 30], [37.500, 25.500], [45, 24.500], [52, 26], [58, 31]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" fill="' + c + '"/>'; }).join('');
    if (st === 'curly') return cap + [[29, 33], [33, 26.500], [40, 23], [48, 23], [55, 26.500], [59.500, 33], [28.500, 41], [60, 41]].map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5.600" fill="' + c + '"/>'; }).join('');
    if (st === 'long') return cap + '<path d="M28 38q-3 14 0 26q4-3 6-8q-3-9-2-18zM60 38q3 14 0 26q-4-3-6-8q3-9 2-18z" fill="' + c + '"/>';
    if (st === 'bun') return cap + '<rect x="39" y="24" width="10" height="3" rx="1.500" fill="' + shade(c, 0.7) + '"/>';
    if (st === 'ponytail') return cap;
    return cap + '<path d="M28 38v6l3-3zM60 38v6l-3-3z" fill="' + c + '"/>';   // short
  }
  function glasses(kind, cls, dy) {
    var rim = '#2b2f3a', fill = 'rgba(255,255,255,.18)', g = kind === 'square'
      ? '<rect x="31.500" y="34" width="12" height="10" rx="3" fill="' + fill + '" stroke="' + rim + '" stroke-width="1.700"/><rect x="44.500" y="34" width="12" height="10" rx="3" fill="' + fill + '" stroke="' + rim + '" stroke-width="1.700"/>'
      : '<circle cx="38" cy="39" r="6" fill="' + fill + '" stroke="' + rim + '" stroke-width="1.700"/><circle cx="50" cy="39" r="6" fill="' + fill + '" stroke="' + rim + '" stroke-width="1.700"/>';
    return '<g class="ofc-gl ' + cls + '"' + (dy ? ' transform="translate(0,' + dy + ')"' : '') + '>' + g + '<path d="M43 38.500q1-1 2 0M32 38l-4-1M56 38l4-1" stroke="' + rim + '" stroke-width="1.500" fill="none" stroke-linecap="round"/></g>';
  }
  function head(av, extraCls) {
    var skin = av.skin, hc = av.hairColor, beard = '';
    if (av.beard === 'stubble') beard = '<path d="M29 41Q30 57 44 58Q58 57 59 41Q55 51 44 51Q33 51 29 41Z" fill="' + hc + '" opacity=".4"/>';
    if (av.beard === 'short') beard = '<path d="M29 40Q29 58 44 59Q59 58 59 40Q55 51 44 51Q33 51 29 40Z" fill="' + hc + '" opacity=".92"/><path d="M38 45q6-3 12 0q-6 2.500-12 0z" fill="' + hc + '"/>';
    var gl = av.glasses === 'none' ? '' : av.glasses === 'varied' ? glasses('round', 'ofc-gl-on') + glasses('round', 'ofc-gl-head', -17) : glasses(av.glasses, 'ofc-gl-on');
    return hairBack(av.hair, hc)
      + '<rect x="38" y="51" width="12" height="11" rx="4" fill="' + shade(skin, .9) + '"/>'
      + '<circle cx="28" cy="40" r="3.400" fill="' + shade(skin, .95) + '"/><circle cx="60" cy="40" r="3.400" fill="' + shade(skin, .95) + '"/>'
      + '<circle cx="44" cy="38" r="16" fill="' + skin + '"/>'
      + beard + hairFront(av.hair, hc)
      + '<g class="ofc-eyes"><circle cx="38" cy="39" r="1.900" fill="#2b2118"/><circle cx="50" cy="39" r="1.900" fill="#2b2118"/></g>'
      + '<circle cx="34" cy="44" r="2.600" fill="#ff8a8a" opacity=".28"/><circle cx="54" cy="44" r="2.600" fill="#ff8a8a" opacity=".28"/>'
      + '<path d="M39.500 46.500q4.500 3.600 9 0" stroke="' + (av.beard === 'short' ? '#f4c4b4' : '#8a3f31') + '" stroke-width="1.600" fill="none" stroke-linecap="round"/>' + gl;
  }
  var DESK = '<rect x="6" y="72" width="76" height="9" rx="4" fill="#dbb88e"/><rect x="10" y="81" width="68" height="17" rx="4" fill="#c49a6c"/><rect x="36" y="86" width="16" height="6" rx="2" fill="#a97f52"/>';
  function desk(av, seated) {
    var o = '<svg class="ofc-svg' + (av.glasses === 'varied' ? ' ofc-varied' : '') + '" viewBox="0 0 88 100" data-g="on" aria-hidden="true" focusable="false">';
    if (!seated) return o + '<g class="ofc-chair"><rect x="28" y="40" width="32" height="38" rx="11" fill="#a9b6c1"/><rect x="24" y="68" width="40" height="9" rx="4.500" fill="#8796a3"/></g>' + DESK + '</svg>';
    return o + '<g class="ofc-person"><g class="ofc-breath"><path d="M18 92q0-33 26-33q26 0 26 33z" fill="' + av.top + '"/><path d="M38 59q6 6 12 0" stroke="' + shade(av.top, .75) + '" stroke-width="2" fill="none"/>' + head(av) + '</g></g>'
      + DESK + '<rect x="28" y="67" width="32" height="6" rx="2.500" fill="#eef2f5"/><rect x="31" y="68.500" width="26" height="1.200" rx=".6" fill="#c8d1d8"/>'
      + '<g class="ofc-hands"><circle class="ofc-hl" cx="38" cy="69.500" r="4" fill="' + av.skin + '"/><circle class="ofc-hr" cx="50" cy="69.500" r="4" fill="' + av.skin + '"/></g>'
      + '<rect x="66" y="62" width="9" height="10" rx="2.500" fill="#fff"/><path d="M75 65q4 0 4 3t-4 3" stroke="#fff" stroke-width="1.600" fill="none"/><path class="ofc-steam" d="M69 60q-2-3 0-5M72 60q-2-3 0-5" stroke="#fff" stroke-width="1.200" fill="none" opacity=".7" stroke-linecap="round"/></svg>';
  }
  function guest() {
    return '<svg class="ofc-svg ofc-guest-svg" viewBox="0 0 88 100" aria-hidden="true" focusable="false"><g class="ofc-gwalk"><rect x="33" y="72" width="8" height="24" rx="4" fill="#52606d"/><rect x="47" y="72" width="8" height="24" rx="4" fill="#52606d"/><rect x="31" y="94" width="12" height="5" rx="2.500" fill="#2f3d4a"/><rect x="45" y="94" width="12" height="5" rx="2.500" fill="#2f3d4a"/>'
      + '<path d="M24 76q0-26 20-26q20 0 20 26z" fill="#7f93a8"/><rect x="18" y="56" width="9" height="22" rx="4.500" fill="#7f93a8"/><rect x="61" y="56" width="9" height="22" rx="4.500" fill="#7f93a8"/>'
      + '<g class="ofc-ghead"><circle cx="44" cy="38" r="15" fill="#eccaa8"/><path d="M29 37A15 15 0 0 1 59 37Q56 26 44 26Q32 26 29 37Z" fill="#6b7280"/><circle cx="38.500" cy="39" r="1.800" fill="#2b2118"/><circle cx="49.500" cy="39" r="1.800" fill="#2b2118"/><path d="M40 45.500q4 3 8 0" stroke="#8a3f31" stroke-width="1.500" fill="none" stroke-linecap="round"/></g></g></svg>';
  }
  // 안경을 쓰고 벗는 캐릭터(varied)는 몇 초마다 한 단계씩: 쓰고 → 벗고 → 머리 위에 → 다시 쓰고
  var ORDER = ['on', 'off', 'head'];
  function tick() { [].forEach.call(document.querySelectorAll('.ofc-varied'), function (svg) { if (Math.random() < 0.55) { var i = ORDER.indexOf(svg.getAttribute('data-g')); svg.setAttribute('data-g', ORDER[(i + 1) % 3]); } }); }
  window.CTOfficeArt = { desk: desk, guest: guest, tick: tick, esc: esc };
})();
