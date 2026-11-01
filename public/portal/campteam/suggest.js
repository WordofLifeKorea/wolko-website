/* 입력창 이름 자동 완성: <input data-suggest="church|school|vendor|speaker|venue|topic|place"> 에 포커스가 가면 이 팀이 전에 쓴 이름이 후보로 뜬다. (새로 열린 창의 입력칸에도 저절로 적용) */
(function () {
  var cache = {}, ids = 0;
  function listFor(kind) {
    var id = 'ctdl-' + kind, dl = document.getElementById(id);
    if (!dl) { dl = document.createElement('datalist'); dl.id = id; document.body.appendChild(dl); }
    if (cache[kind]) return dl;
    cache[kind] = 1;
    CT.api('/api/campteam/names?kind=' + encodeURIComponent(kind)).then(function (r) { dl.innerHTML = (r.names || []).map(function (n) { return '<option value="' + CT.esc(n) + '"></option>'; }).join(''); }).catch(function () { cache[kind] = 0; });
    return dl;
  }
  document.addEventListener('focusin', function (e) {
    var el = e.target; if (!el || !el.matches || !el.matches('input[data-suggest]')) return;
    var kind = el.getAttribute('data-suggest'); if (!kind || el.getAttribute('list')) return;
    el.setAttribute('list', listFor(kind).id); el.setAttribute('autocomplete', 'off');
  });
  window.CTSuggest = { refresh: function (kind) { cache[kind] = 0; if (kind) listFor(kind); } };
})();
