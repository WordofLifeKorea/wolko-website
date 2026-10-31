/* 「내가 없는 동안」 카드 — 하루 넘게 접속하지 않았다가 돌아오면, 그 사이 다른 사람이 바꾼 것을 홈 위쪽에 짧게 보여 준다.
   서버(/api/campteam/catchup)가 「보여 줄 게 있는지」까지 정해 준다. 「확인했어요」를 누르면 닫히고 다시 뜨지 않는다. */
(function () {
  var CT = window.CT, host = document.getElementById('catchupBox'); if (!CT || !host) return;
  CT.addDict({
    ko: { cuTitle: '내가 없는 동안', cuSince: function (d) { return d + ' 이후'; }, cuOk: '확인했어요', cuNew: '새로', cuChanged: '바뀜',
      cuName: { tasks: '업무', meetings: '회의', decisions: '결정', files: '자료', events: '일정', camps: '캠프' } },
    en: { cuTitle: 'While you were away', cuSince: function (d) { return 'Since ' + d; }, cuOk: 'Got it', cuNew: 'new', cuChanged: 'changed',
      cuName: { tasks: 'Tasks', meetings: 'Meetings', decisions: 'Decisions', files: 'Files', events: 'Events', camps: 'Camps' } }
  });
  var LINK = { tasks: '/portal/campteam/tasks/', meetings: '/portal/campteam/meetings/', decisions: '/portal/campteam/meetings/', files: '/portal/campteam/files/', events: '/portal/campteam/calendar/', camps: '/portal/campteam/camps/' };
  var ORDER = ['tasks', 'decisions', 'meetings', 'files', 'events', 'camps'], esc = CT.esc, data = null;
  function when(iso) { var d = new Date(iso); return isNaN(d) ? '' : (d.getMonth() + 1) + '/' + d.getDate(); }
  function render() {
    if (!data || !data.show) { host.innerHTML = ''; return; }
    var rows = ORDER.map(function (k) {
      var n = data.counts[k + 'New'] || 0, c = data.counts[k + 'Changed'] || 0; if (!n && !c) return '';
      var parts = [n ? CT.t('cuNew') + ' ' + n : '', c ? CT.t('cuChanged') + ' ' + c : ''].filter(Boolean).join(' · ');
      var tops = (data.top[k] || []).map(esc).join(' · ');
      return '<a class="cu-row" href="' + LINK[k] + '"><b>' + esc(CT.t('cuName')[k]) + '</b><span>' + esc(parts) + '</span>' + (tops ? '<small>' + tops + '</small>' : '') + '</a>';
    }).join('');
    host.innerHTML = '<section class="cubox"><div class="cu-hd"><h2>' + esc(CT.t('cuTitle')) + '</h2><span class="cu-since">' + esc(CT.t('cuSince')(when(data.since))) + '</span><button type="button" class="btn sm" id="cuOk">' + esc(CT.t('cuOk')) + '</button></div><div class="cu-rows">' + rows + '</div></section>';
    document.getElementById('cuOk').onclick = function () { host.innerHTML = ''; CT.api('/api/campteam/catchup', { method: 'POST', body: { dismiss: true } }).catch(function () {}); };
  }
  CT.api('/api/campteam/catchup').then(function (r) { data = r; render(); }).catch(function () {});
  document.addEventListener('ct-lang', render);
})();
