/* 제목 → 관련 캠프·행사 찾기 (AI 없이 이 브라우저 안에서만, 무료·즉시).
   제목에 캠프 이름(한글/영어)이 들어 있으면 그 캠프, 없으면 「연도·계절 + 유형 이름」으로 캠프를, 그것도 없으면 유형만 고른다.
   한글/영어를 같은 글자로 맞춰서 비교한다 (월코=WOLKO · 영어=English · 캠프=Camp · 겨울=Winter · 여름=Summer · 주니어=Jr).
   결과: 'camp:<id>' | 'type:<id>' | null */
(function (root) {
  var MAP = [[/월코/g, 'wolko'], [/영어/g, 'english'], [/캠프/g, 'camp'], [/겨울/g, 'winter'], [/여름/g, 'summer'], [/주니어/g, 'jr']];
  function norm(s) { s = String(s == null ? '' : s).normalize('NFC').toLowerCase(); MAP.forEach(function (p) { s = s.replace(p[0], p[1]); }); return s.replace(/[^\p{L}\p{N}]/gu, ''); }
  function longest(t, names, min) { var best = 0; names.forEach(function (n) { var k = norm(n); if (k.length >= min && t.indexOf(k) >= 0 && k.length > best) best = k.length; }); return best; }
  function match(title, types) {
    var t = norm(title); if (t.length < 4 || !types) return null;
    var bestCamp = null, bestLen = 0, bestType = null, typeLen = 0;
    types.forEach(function (ty) {
      (ty.camps || []).forEach(function (c) { var n = longest(t, [c.nameKo, c.nameEn], 6); if (n > bestLen) { bestLen = n; bestCamp = c; } });
      var n = longest(t, [ty.nameKo, ty.nameEn], 4); if (n > typeLen) { typeLen = n; bestType = ty; }
    });
    if (bestCamp) return 'camp:' + bestCamp.id;
    if (!bestType) return null;
    var y = (String(title).match(/(20\d\d)/) || [])[1], se = /겨울|winter/i.test(title) ? '겨울' : /여름|summer/i.test(title) ? '여름' : '';
    if (y) { var m = (bestType.camps || []).filter(function (c) { return String(c.year) === y && (!se || !c.season || c.season === se); }); if (m.length === 1) return 'camp:' + m[0].id; }
    return 'type:' + bestType.id;
  }
  root.CTTitleMatch = { match: match, norm: norm };
})(typeof window !== 'undefined' ? window : globalThis);
