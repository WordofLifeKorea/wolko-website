/* 포탈 팀 관리 — 마스터 · 관리자가 팀을 만들고(이름 바꾸기 · 지우기) 멤버를 팀에 넣는다. 한 사람이 여러 팀에 들어갈 수 있다.
   포탈 첫 화면(portal.astro)의 '팀 관리' 단추가 window.openTeamsPanel() 을 부른다. 서버는 /api/portal/teams.
   팀은 지금 업무관리의 팀 프로젝트(같은 팀 멤버가 함께 보고 고치는 보드)에 쓰인다. */
(function () {
  if (window.openTeamsPanel) return;
  var API = '/api/portal/teams';
  function lang() { try { return (localStorage.getItem('wolkoHubLang') || document.documentElement.getAttribute('data-wolko-lang') || 'ko') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } }
  function L(ko, en) { return lang() === 'en' ? en : ko; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function token() { try { return sessionStorage.getItem('wolko-hub-token') || ''; } catch (e) { return ''; } }
  function call(method, body) {
    return fetch(API, { method: method, headers: Object.assign({ Authorization: 'Bearer ' + token() }, body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined, cache: 'no-store' })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || L('처리하지 못했습니다.', 'Could not complete that.')); return d; }); });
  }

  var css = '' +
    '.pt-overlay{position:fixed;inset:0;z-index:1200;background:rgba(10,30,40,.42);display:flex;align-items:center;justify-content:center;padding:16px}' +
    '.pt-overlay[hidden]{display:none}' +
    '.pt-card{width:min(760px,100%);max-height:min(86vh,820px);display:flex;flex-direction:column;background:#fff;border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.25);overflow:hidden;font-family:inherit;color:#13262f}' +
    '.pt-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:16px 18px;border-bottom:1px solid #e3e9ec}' +
    '.pt-head h2{margin:0;font-size:16px;font-weight:800}' +
    '.pt-x{border:0;background:#f1f5f7;border-radius:8px;width:34px;height:34px;min-height:0!important;font-size:18px;cursor:pointer;color:#2a4550}' +
    '.pt-body{overflow:auto;padding:16px 18px;display:grid;gap:18px}' +
    '.pt-sec h3{margin:0 0 8px;font-size:13px;font-weight:800;color:#2a4550}' +
    '.pt-hint{margin:0 0 8px;font-size:12.5px;color:#5c727c}' +
    '.pt-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}' +
    '.pt-in{flex:1 1 200px;min-width:0;height:34px;border:1px solid #d6e0e4;border-radius:8px;padding:0 10px;font:inherit;font-size:14px}' +
    '.pt-btn{height:34px;min-height:0!important;padding:0 12px;border:1px solid #d6e0e4;border-radius:8px;background:#fff;font:inherit;font-size:13px;font-weight:700;color:#13262f;cursor:pointer;white-space:nowrap}' +
    '.pt-btn.primary{background:#004f68;border-color:#004f68;color:#fff}' +
    '.pt-btn.danger{color:#b42318;border-color:#f0c7c2}' +
    '.pt-teams{list-style:none;margin:0;padding:0;display:grid;gap:6px}' +
    '.pt-teams li{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid #e3e9ec;border-radius:10px;flex-wrap:wrap}' +
    '.pt-teams .pt-name{flex:1 1 140px;font-weight:700;font-size:14px;min-width:0;overflow-wrap:anywhere}' +
    '.pt-teams .pt-count{font-size:12px;color:#5c727c;white-space:nowrap}' +
    '.pt-people{display:grid;gap:6px}' +
    '.pt-person{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;padding:9px 10px;border:1px solid #e3e9ec;border-radius:10px}' +
    '.pt-who{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}' +
    '.pt-who b{font-size:14px}' +
    '.pt-who span{font-size:12px;color:#5c727c;overflow-wrap:anywhere}' +
    '.pt-tags{display:flex;gap:6px;flex-wrap:wrap}' +
    '.pt-tag{height:28px;min-height:0!important;padding:0 10px;border-radius:6px;border:1px solid #d6e0e4;background:#fff;font:inherit;font-size:12.5px;font-weight:700;color:#5c727c;cursor:pointer}' +
    '.pt-tag[aria-pressed="true"]{background:#004f68;border-color:#004f68;color:#fff}' +
    '.pt-empty{font-size:13px;color:#5c727c;margin:0}' +
    '.pt-err{color:#b42318;font-size:13px;margin:0;min-height:1em}' +
    '.pt-confirm{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:13px;color:#b42318}';

  var state = null, overlay = null, filter = '', confirmId = '', editId = '', queue = Promise.resolve();
  function ensure() {
    if (overlay) return overlay;
    var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
    overlay = document.createElement('div');
    overlay.className = 'pt-overlay'; overlay.id = 'portalTeamsOverlay'; overlay.hidden = true;
    overlay.setAttribute('role', 'dialog'); overlay.setAttribute('aria-modal', 'true');
    overlay.innerHTML = '<div class="pt-card"><div class="pt-head"><h2 id="ptTitle"></h2><button type="button" class="pt-x" data-wl-close aria-label="close">×</button></div><div class="pt-body" id="ptBody"></div></div>';
    overlay.setAttribute('aria-labelledby', 'ptTitle');
    document.body.appendChild(overlay);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('.pt-x')) { close(); return; }
      var b = e.target.closest('[data-act]'); if (!b) return;
      act(b.getAttribute('data-act'), b);
    });
    overlay.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') close();
      if (e.key === 'Enter' && e.target.id === 'ptNew') { e.preventDefault(); act('create'); }
      if (e.key === 'Enter' && e.target.classList.contains('pt-rename-in')) { e.preventDefault(); act('rename-save', e.target); }
    });
    overlay.addEventListener('input', function (e) { if (e.target.id === 'ptFilter') { filter = e.target.value.trim().toLowerCase(); renderPeople(); } });
    return overlay;
  }
  function close() { if (overlay) overlay.hidden = true; confirmId = ''; editId = ''; }
  function setErr(m) { var e = document.getElementById('ptErr'); if (e) e.textContent = m || ''; }

  function render() {
    document.getElementById('ptTitle').textContent = L('팀 관리', 'Teams');
    var body = document.getElementById('ptBody');
    if (!state) { body.innerHTML = '<p class="pt-empty">' + esc(L('불러오는 중…', 'Loading…')) + '</p>'; return; }
    var counts = {}; (state.people || []).forEach(function (p) { p.teams.forEach(function (t) { counts[t] = (counts[t] || 0) + 1; }); });
    body.innerHTML =
      '<section class="pt-sec"><h3>' + esc(L('팀', 'Teams')) + '</h3>' +
      '<p class="pt-hint">' + esc(L('팀을 만들면 업무관리에서 그 팀 멤버가 함께 보고 고치는 팀 프로젝트를 만들 수 있어요.', 'Team members can share and edit team projects in Tasks.')) + '</p>' +
      '<div class="pt-row"><input class="pt-in" id="ptNew" maxlength="40" placeholder="' + esc(L('새 팀 이름 (예: 캠프팀)', 'New team name (e.g. Camp team)')) + '"><button type="button" class="pt-btn primary" data-act="create">' + esc(L('팀 만들기', 'Create team')) + '</button></div>' +
      (state.teams.length ? '<ul class="pt-teams" style="margin-top:10px">' + state.teams.map(function (t) {
        if (editId === t.id) return '<li><input class="pt-in pt-rename-in" data-id="' + esc(t.id) + '" maxlength="40" value="' + esc(t.name) + '"><button type="button" class="pt-btn primary" data-act="rename-save" data-id="' + esc(t.id) + '">' + esc(L('저장', 'Save')) + '</button><button type="button" class="pt-btn" data-act="rename-cancel">' + esc(L('취소', 'Cancel')) + '</button></li>';
        return '<li><span class="pt-name">' + esc(t.name) + '</span><span class="pt-count">' + esc(L((counts[t.id] || 0) + '명', (counts[t.id] || 0) + (counts[t.id] === 1 ? ' member' : ' members'))) + '</span>' +
          (confirmId === t.id
            ? '<span class="pt-confirm">' + esc(L('지우면 이 팀의 팀 프로젝트를 아무도 볼 수 없어요.', 'Team projects in this team will no longer be visible.')) + ' <button type="button" class="pt-btn danger" data-act="delete-yes" data-id="' + esc(t.id) + '">' + esc(L('지우기', 'Delete')) + '</button><button type="button" class="pt-btn" data-act="delete-no">' + esc(L('취소', 'Cancel')) + '</button></span>'
            : '<button type="button" class="pt-btn" data-act="rename" data-id="' + esc(t.id) + '">' + esc(L('이름 바꾸기', 'Rename')) + '</button><button type="button" class="pt-btn danger" data-act="delete" data-id="' + esc(t.id) + '">' + esc(L('지우기', 'Delete')) + '</button>') +
          '</li>';
      }).join('') + '</ul>' : '<p class="pt-empty" style="margin-top:8px">' + esc(L('아직 팀이 없어요.', 'No teams yet.')) + '</p>') +
      '</section>' +
      '<p class="pt-err" id="ptErr" role="alert"></p>' +
      '<section class="pt-sec"><h3>' + esc(L('멤버별 팀', 'Members')) + '</h3>' +
      '<p class="pt-hint">' + esc(L('팀 이름을 눌러 넣거나 빼요. 한 사람이 여러 팀에 들어갈 수 있어요.', 'Tap a team to add or remove. People can be in several teams.')) + '</p>' +
      '<div class="pt-row" style="margin-bottom:8px"><input class="pt-in" id="ptFilter" type="search" value="' + esc(filter) + '" placeholder="' + esc(L('이름 · 이메일로 찾기', 'Search name or email')) + '"></div>' +
      '<div class="pt-people" id="ptPeople"></div></section>';
    renderPeople();
    var f = editId && body.querySelector('.pt-rename-in'); if (f) { f.focus(); f.select(); }
  }
  function renderPeople() {
    var box = document.getElementById('ptPeople'); if (!box || !state) return;
    var list = (state.people || []).filter(function (p) { return !filter || (p.name || '').toLowerCase().indexOf(filter) >= 0 || p.email.indexOf(filter) >= 0; });
    if (!state.teams.length) { box.innerHTML = '<p class="pt-empty">' + esc(L('먼저 팀을 만들어 주세요.', 'Create a team first.')) + '</p>'; return; }
    box.innerHTML = list.length ? list.map(function (p) {
      return '<div class="pt-person"><div class="pt-who"><b>' + esc(p.name || p.email) + '</b><span>' + esc(p.email) + (p.campus === 'jeju' ? ' · ' + esc(L('제주', 'Jeju')) : '') + '</span></div><div class="pt-tags">' +
        state.teams.map(function (t) { var on = p.teams.indexOf(t.id) >= 0; return '<button type="button" class="pt-tag" data-act="toggle" data-email="' + esc(p.email) + '" data-id="' + esc(t.id) + '" aria-pressed="' + on + '">' + esc(t.name) + '</button>'; }).join('') +
        '</div></div>';
    }).join('') : '<p class="pt-empty">' + esc(L('찾는 멤버가 없어요.', 'No matching members.')) + '</p>';
  }
  // 보내는 중인 팀 배정(이메일 → 팀 목록): 앞 요청의 답이 와도 아직 안 보낸 선택이 화면과 다음 요청에서 사라지지 않게 덮어 쓴다
  var pending = {}, inflight = 0;
  function overlayPending(d) { (d && d.people || []).forEach(function (p) { if (pending[p.email]) p.teams = pending[p.email].slice(); }); return d; }
  function apply(p) { return p.then(function (d) { state = overlayPending(d); setErr(''); render(); }).catch(function (e) { setErr(e.message); }); }
  function act(a, el) {
    var id = el && el.getAttribute('data-id');
    if (a === 'create') { var n = document.getElementById('ptNew').value.trim(); if (!n) return; apply(call('POST', { action: 'create', name: n })); return; }
    if (a === 'rename') { editId = id; confirmId = ''; render(); return; }
    if (a === 'rename-cancel') { editId = ''; render(); return; }
    if (a === 'rename-save') { var inp = overlay.querySelector('.pt-rename-in'); var nm = inp ? inp.value.trim() : ''; var tid = (el && el.getAttribute('data-id')) || (inp && inp.getAttribute('data-id')); editId = ''; apply(call('POST', { action: 'rename', id: tid, name: nm })); return; }
    if (a === 'delete') { confirmId = id; editId = ''; render(); return; }
    if (a === 'delete-no') { confirmId = ''; render(); return; }
    if (a === 'delete-yes') { confirmId = ''; apply(call('POST', { action: 'delete', id: id })); return; }
    if (a === 'toggle') {
      var email = el.getAttribute('data-email');
      var person = (state.people || []).find(function (p) { return p.email === email; }); if (!person) return;
      var cur = pending[email] || person.teams;
      var next = cur.indexOf(id) >= 0 ? cur.filter(function (x) { return x !== id; }) : cur.concat([id]);
      pending[email] = next; person.teams = next.slice();   // 화면의 상태를 바로 바꿔서, 빠르게 여러 번 눌러도 앞의 선택이 사라지지 않게
      el.setAttribute('aria-pressed', String(next.indexOf(id) >= 0));
      inflight++;
      queue = queue.then(function () {   // 하나씩 차례로 보낸다. 보낼 때의 최신 선택을 보낸다
        return apply(call('POST', { action: 'assign', email: email, teams: (pending[email] || next).slice() }));
      }).then(function () { inflight--; if (!inflight) { pending = {}; if (state) render(); } });
    }
  }
  window.openTeamsPanel = function () {
    ensure(); overlay.hidden = false; state = null; render();
    call('GET').then(function (d) { state = d; render(); }).catch(function (e) { state = { teams: [], people: [] }; render(); setErr(e.message); });
  };
})();
