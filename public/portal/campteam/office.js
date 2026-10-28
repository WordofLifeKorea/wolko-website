/* 캠프팀 홈 「팀 사무실」 — 하늘 영역 아래에 팀원 책상이 한 줄로 놓이고, 지금 캠프팀 페이지를 열어 둔 사람은 자리에 앉아 있다.
   명단 밖에서 들어온 사람은 게스트 캐릭터가 되어 걸어 들어와 옆에 서서 구경한다. 1분마다 새로 불러온다(탭을 보고 있을 때만). */
(function () {
  CT.addDict({
    ko: { ofTitle: '사무실', ofHide: '자리 숨기기', ofShow: '자리 보이기', ofGuest: '게스트', ofHere: '명', ofOff: '끄기', ofOn: '켜기', ofHint: '캠프팀 페이지를 열어 두면 자리에 앉아요' },
    en: { ofTitle: 'Office', ofHide: 'Hide me', ofShow: 'Show me', ofGuest: 'Guest', ofHere: ' in', ofOff: 'Off', ofOn: 'On', ofHint: 'Open a camp team page to take your seat' },
  });
  var A = window.CTOfficeArt, esc = CT.esc, host = null, cells = {}, guests = {}, order = '', state = null, first = true, timer = null, glTimer = null;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function frame() {
    host.innerHTML = '<div class="ofc-head"><span id="ofcTitle"></span><span class="sp"></span><button type="button" class="ofc-hide" id="ofcHide"></button><button type="button" class="ofc-hide" id="ofcOff"></button></div><div class="ofc-row" id="ofcRow"></div>';
    host.querySelector('#ofcOff').onclick = function () { var off = !host.classList.contains('is-off'); try { sessionStorage.setItem('ct-office-off', off ? '1' : ''); } catch (e) {} host.classList.toggle('is-off', off); paintOff(); };
    host.querySelector('#ofcHide').onclick = async function () {
      var hide = !(state && state.me && state.me.hidden);
      try { await CT.api('/api/campteam/office', { method: 'POST', body: { hidden: hide } }); } catch (e) { return; }
      load();
    };
  }
  // 관리자가 올린 캐릭터 그림이 있으면 그림으로, 없으면 코드로 그린 캐릭터로 보여 준다
  function art(m, enter) { return A.ready(m.avatar.sprite) ? A.deskImg(m.avatar, m.seated, enter) : A.desk(m.avatar, m.seated); }
  function cellHtml(m, enter) { return art(m, enter) + '<span class="ofc-name">' + esc(m.name) + '</span>'; }
  function guestHtml(g, enter) { return (A.guestReady() ? A.guestImg(enter) : A.guest()) + '<span class="ofc-name">' + esc(g.name) + '</span><span class="ofc-tag">' + esc(CT.t('ofGuest')) + '</span>'; }

  /** 「사무실 끄기」 — 이 화면에서만 사무실 그림을 숨긴다(내 자리를 남에게 숨기는 것과는 별개). 새로 열면 다시 기본으로 보인다 */
  function paintOff() { var b = host.querySelector('#ofcOff'); if (b) b.textContent = CT.t(host.classList.contains('is-off') ? 'ofOn' : 'ofOff'); }
  function render(d) {
    if (!host.querySelector('#ofcRow')) frame();
    var row = host.querySelector('#ofcRow'), seatedNow = d.members.filter(function (m) { return m.seated; }).length;
    host.querySelector('#ofcTitle').textContent = CT.t('ofTitle') + ' · ' + seatedNow + CT.t('ofHere');
    var hb = host.querySelector('#ofcHide'); hb.textContent = CT.t(d.me && d.me.hidden ? 'ofShow' : 'ofHide'); hb.title = CT.t('ofHint'); paintOff();
    var ids = d.members.map(function (m) { return m.id; }).join(',') + '|' + d.guests.map(function (g) { return g.id; }).join(',');
    var keep = {};
    d.members.forEach(function (m) {
      var sig = [m.seated, m.name, JSON.stringify(m.avatar), A.ready(m.avatar.sprite), A.walkReady(m.avatar.sprite)].join('|'), c = cells[m.id];
      if (!c || c.sig !== sig) {
        var enter = m.seated && ((c && !c.seated) || (first && m.you)); // 방금 앉은 사람(처음 열 때의 나 · 부재였다가 도착한 사람)은 걸어와서 앉는다
        var el = document.createElement('div'); el.className = 'ofc-cell' + (m.you ? ' you' : '') + (m.seated ? '' : ' away'); el.dataset.id = m.id; el.innerHTML = cellHtml(m, enter);
        if (enter) el.classList.add('enter');
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
      if (!guests[g.id]) { var el = document.createElement('div'); el.className = 'ofc-cell ofc-guestcell enter'; el.dataset.id = 'g' + g.id; el.innerHTML = guestHtml(g, true); row.appendChild(el); guests[g.id] = el; }
      gk[g.id] = 1;
    });
    Object.keys(guests).forEach(function (id) { if (!gk[id]) { guests[id].remove(); delete guests[id]; } });
    if (ids !== order) { // 순서가 바뀐 경우에만 다시 줄 세운다(움직임이 처음부터 다시 시작되지 않게)
      d.members.forEach(function (m) { row.insertBefore(cells[m.id].el, row.querySelector('.ofc-div')); });
      order = ids;
    }
    first = false;
  }
  var loading = {};
  /** 그림이 올라와 있는 사람은 그림을 먼저 불러온 뒤(최대 2.5초) 한 번에 그린다 — 그림이 없거나 늦으면 코드 캐릭터가 대신 보이다가 바뀐다 */
  async function load() {
    try {
      state = await CT.api('/api/campteam/office');
      var need = [], later = [];
      state.members.forEach(function (m) { var sp = m.avatar && m.avatar.sprite, k = sp && sp + m.avatar.glasses; if (!sp || loading[k]) return; loading[k] = 1; need.push(A.load(sp, m.avatar.glasses)); (m.you ? need : later).push(A.loadWalk(sp)); });
      if (state.guests.length && !loading.guest) { loading.guest = 1; later.push(A.loadGuest()); }
      if (need.length) await Promise.race([Promise.all(need), new Promise(function (r) { setTimeout(r, 2500); })]);
      render(state);
      var rest = need.concat(later); if (rest.length) Promise.all(rest).then(function () { render(state); });
    } catch (e) { /* 사무실이 안 보여도 홈은 그대로 */ }
  }
  function start() {
    host = document.getElementById('ctOffice'); if (!host || !A) return;
    try { if (sessionStorage.getItem('ct-office-off') === '1') host.classList.add('is-off'); } catch (e) {}
    load(); timer = setInterval(function () { if (!document.hidden) load(); }, 60000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
    document.addEventListener('ct-lang', function () { cells = {}; guests = {}; order = ''; host.innerHTML = ''; if (state) render(state); });
    if (!reduce) glTimer = setInterval(function () { if (!document.hidden) A.tick(); }, 4500);
  }
  window.CTOffice = { start: start, reload: load };
  document.addEventListener('ct-ready', start);
})();
