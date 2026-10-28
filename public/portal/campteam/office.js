/* 캠프팀 홈 「팀 사무실」 — 하늘 영역 아래에 팀원 책상이 한 줄로 놓이고, 지금 캠프팀 페이지를 열어 둔 사람은 자리에 앉아 있다.
   명단 밖에서 들어온 사람은 게스트 캐릭터가 되어 걸어 들어와 옆에 서서 구경한다. 1분마다 새로 불러온다(탭을 보고 있을 때만). */
(function () {
  CT.addDict({
    ko: { ofTitle: '팀 사무실', ofHide: '내 자리 숨기기', ofShow: '내 자리 보이기', ofGuest: '게스트', ofHere: '명 출근', ofHint: '캠프팀 페이지를 열어 두면 자리에 앉아요' },
    en: { ofTitle: 'Office', ofHide: 'Hide me', ofShow: 'Show me', ofGuest: 'Guest', ofHere: ' in', ofHint: 'Open a camp team page to take your seat' },
  });
  var A = window.CTOfficeArt, esc = CT.esc, host = null, cells = {}, guests = {}, order = '', state = null, first = true, timer = null, glTimer = null;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frame() {
    host.innerHTML = '<div class="ofc-head"><span id="ofcTitle"></span><span class="sp"></span><button type="button" class="ofc-hide" id="ofcHide"></button></div><div class="ofc-row" id="ofcRow"></div>';
    host.querySelector('#ofcHide').onclick = async function () {
      var hide = !(state && state.me && state.me.hidden);
      try { await CT.api('/api/campteam/office', { method: 'POST', body: { hidden: hide } }); } catch (e) { return; }
      load();
    };
  }
  function cellHtml(m) { return A.desk(m.avatar, m.seated) + '<span class="ofc-name">' + esc(m.name) + '</span>'; }
  function guestHtml(g) { return A.guest() + '<span class="ofc-name">' + esc(g.name) + '</span><span class="ofc-tag">' + esc(CT.t('ofGuest')) + '</span>'; }

  function render(d) {
    if (!host.querySelector('#ofcRow')) frame();
    var row = host.querySelector('#ofcRow'), seatedNow = d.members.filter(function (m) { return m.seated; }).length;
    host.querySelector('#ofcTitle').textContent = CT.t('ofTitle') + ' · ' + seatedNow + CT.t('ofHere');
    var hb = host.querySelector('#ofcHide'); hb.textContent = CT.t(d.me && d.me.hidden ? 'ofShow' : 'ofHide'); hb.title = CT.t('ofHint');
    var ids = d.members.map(function (m) { return m.id; }).join(',') + '|' + d.guests.map(function (g) { return g.id; }).join(',');
    var keep = {};
    d.members.forEach(function (m) {
      var sig = [m.seated, m.name, JSON.stringify(m.avatar)].join('|'), c = cells[m.id];
      if (!c || c.sig !== sig) {
        var el = document.createElement('div'); el.className = 'ofc-cell' + (m.you ? ' you' : '') + (m.seated ? '' : ' away'); el.dataset.id = m.id; el.innerHTML = cellHtml(m);
        // 방금 앉은 사람(처음 열 때의 나 · 부재였다가 도착한 사람)은 걸어와서 앉는다
        if (m.seated && ((c && !c.seated) || (first && m.you))) el.classList.add('enter');
        if (c && c.el.parentNode) c.el.parentNode.replaceChild(el, c.el); else row.appendChild(el);
        cells[m.id] = { el: el, sig: sig, seated: m.seated };
      }
      keep[m.id] = 1;
    });
    Object.keys(cells).forEach(function (id) { if (!keep[id]) { cells[id].el.remove(); delete cells[id]; } });
    // 게스트는 구분선 뒤에 모인다
    var div = row.querySelector('.ofc-div'); if (d.guests.length && !div) { div = document.createElement('i'); div.className = 'ofc-div'; row.appendChild(div); } else if (!d.guests.length && div) div.remove();
    var gk = {};
    d.guests.forEach(function (g) {
      if (!guests[g.id]) { var el = document.createElement('div'); el.className = 'ofc-cell ofc-guestcell enter'; el.dataset.id = 'g' + g.id; el.innerHTML = guestHtml(g); row.appendChild(el); guests[g.id] = el; }
      gk[g.id] = 1;
    });
    Object.keys(guests).forEach(function (id) { if (!gk[id]) { guests[id].remove(); delete guests[id]; } });
    if (ids !== order) { // 순서가 바뀐 경우에만 다시 줄 세운다(움직임이 처음부터 다시 시작되지 않게)
      d.members.forEach(function (m) { row.insertBefore(cells[m.id].el, row.querySelector('.ofc-div')); });
      order = ids;
    }
    first = false;
  }
  async function load() { try { state = await CT.api('/api/campteam/office'); render(state); } catch (e) { /* 사무실이 안 보여도 홈은 그대로 */ } }
  function start() {
    host = document.getElementById('ctOffice'); if (!host || !A) return;
    load(); timer = setInterval(function () { if (!document.hidden) load(); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
    document.addEventListener('ct-lang', function () { cells = {}; guests = {}; order = ''; host.innerHTML = ''; if (state) render(state); });
    if (!reduce) glTimer = setInterval(function () { if (!document.hidden) A.tick(); }, 4500);
  }
  window.CTOffice = { start: start, reload: load };
  document.addEventListener('ct-ready', start);
})();
