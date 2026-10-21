(function () {
  CT.addDict({
    ko: { setTitle: '설정 · 팀 명단', setSub: '캠프팀 역할을 정해요. 명단에 없는 포털 사용자는 조회만 할 수 있어요.', colEmail: '이메일', colName: '이름', colRole: '역할', addMember: '팀원 추가 · 역할 변경', fEmail: '포털 이메일 (wolko.org / wol.org)', fName: '이름', fRole: '역할', remove: '명단에서 빼기', rolesTitle: '역할별 권한',
      permAdmin: '관리자 (한 명): 모든 자료 조회·작성·수정, 금액 조회·작성, 팀 명단 관리', permFinance: '재정 담당: 일반 자료는 조회만, 금액 조회·작성·수정', permMember: '캠프팀 팀원: 일반 자료 조회·작성·수정, 금액 조회·작성·수정', permViewer: '그 외 포털 사용자: 일반 자료 조회만, 금액은 볼 수 없음', done: '저장했어요', you: '(나)',
      shTitle: 'Google Sheets 연동 (미리보기)', shHelp: '포털의 업무를 기존 시트(Tasks 탭)에 반영할 때 "어느 칸에 무엇을 쓰게 되는지"만 보여줘요. 이 버튼은 시트에 아무것도 쓰지 않아요. 실제 쓰기는 서버 설정이 켜져 있고 관리자가 따로 확인할 때만 가능해요.', shPreview: '미리보기', shNotConnected: '시트가 아직 연결되지 않았어요. 연결 전이라 "전부 새로 쓰게 될 것"으로 계산한 모의 계획이에요.', shConnected: '시트에 연결되어 있어요.', shWriteOff: '쓰기: 꺼짐 (미리보기만 가능)', shWriteOn: '쓰기: 켜짐', shNew: '새 줄', shChange: '바뀌는 칸', shAdopt: '기존 줄에 ID 연결', shRetire: '삭제 표시(Not Applicable)로 바뀜', shSame: '변경 없음', shLegacy: '손대지 않는 기존 줄' },
    en: { setTitle: 'Settings · Team Roster', setSub: 'Set camp team roles. Portal users not on the list can only view.', colEmail: 'Email', colName: 'Name', colRole: 'Role', addMember: 'Add member · change role', fEmail: 'Portal email (wolko.org / wol.org)', fName: 'Name', fRole: 'Role', remove: 'Remove', rolesTitle: 'Role permissions',
      permAdmin: 'Admin (one person): view/write/edit all materials, view/write amounts, manage roster', permFinance: 'Finance: view-only for general materials, view/write/edit amounts', permMember: 'Camp team: view/write/edit general materials and amounts', permViewer: 'Other portal users: view general materials only, no amounts', done: 'Saved', you: '(you)',
      shTitle: 'Google Sheets sync (preview)', shHelp: 'Shows which cells would be written when portal tasks are mirrored to the existing sheet (Tasks tab). This button writes nothing. Actual writing needs the server setting turned on and a separate admin confirmation.', shPreview: 'Preview', shNotConnected: 'The sheet is not connected yet. This is a mock plan that assumes everything would be newly written.', shConnected: 'Connected to the sheet.', shWriteOff: 'Writing: off (preview only)', shWriteOn: 'Writing: on', shNew: 'New rows', shChange: 'Cells to change', shAdopt: 'Existing rows to link by ID', shRetire: 'Marked Not Applicable (deleted in portal)', shSame: 'Unchanged', shLegacy: 'Existing rows left untouched' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, data = null;

  function render() {
    $('rows').innerHTML = data.members.filter(function (m) { return m.active; }).map(function (m) {
      return '<tr><td>' + esc(m.email) + (m.email === data.me ? ' ' + esc(CT.t('you')) : '') + (m.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '</td><td>' + esc(m.name) + '</td><td><span class="chip">' + esc(CT.roleLabel(m.role)) + '</span></td>' +
        '<td style="text-align:right"><button class="btn sm" data-edit="' + esc(m.email) + '">' + esc(CT.t('edit')) + '</button> ' + (m.role === 'admin' ? '' : '<button class="btn sm danger" data-rm="' + esc(m.email) + '">' + esc(CT.t('remove')) + '</button>') + '</td></tr>';
    }).join('');
    $('roleSel').innerHTML = data.roles.map(function (r) { return '<option value="' + r + '">' + esc(CT.roleLabel(r)) + '</option>'; }).join('');
  }
  async function load() { data = await CT.api('/api/campteam/members'); render(); }

  CT.boot(async function (me) {
    if (!me.perms.manageMembers) { $('main').innerHTML = '<div class="err">' + esc(CT.t('loadFail')) + ' (403)</div>'; return; }
    try { await load(); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    CT.applyI18n();
    $('rows').addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.edit) { var m = data.members.filter(function (x) { return x.email === b.dataset.edit; })[0]; $('fEmail').value = m.email; $('fName').value = m.name; $('roleSel').value = m.role; window.scrollTo(0, document.body.scrollHeight); }
      else if (b.dataset.rm) { if (!confirm(CT.t('remove') + '?')) return; try { await CT.api('/api/campteam/members?email=' + encodeURIComponent(b.dataset.rm), { method: 'DELETE' }); await load(); } catch (err) { alert(err.message); } }
    });
    $('addForm').onsubmit = async function (ev) {
      ev.preventDefault(); $('addErr').hidden = true;
      try { await CT.api('/api/campteam/members', { method: 'POST', body: { email: $('fEmail').value, name: $('fName').value, role: $('roleSel').value } }); $('addForm').reset(); await load(); }
      catch (err) { $('addErr').textContent = err.message; $('addErr').hidden = false; }
    };
    $('shPreview').onclick = async function () {
      $('shOut').textContent = '…';
      try {
        var r = await CT.api('/api/campteam/sheets-sync'), c = r.counts;
        $('shOut').innerHTML = '<p>' + esc(CT.t(r.configured ? 'shConnected' : 'shNotConnected')) + ' · ' + esc(CT.t(r.writeEnabled ? 'shWriteOn' : 'shWriteOff')) + '</p>' +
          (r.plan.warnings.length ? '<div class="err">' + r.plan.warnings.map(esc).join('<br>') + '</div>' : '') +
          '<table><tbody><tr><td>' + esc(CT.t('shNew')) + '</td><td>' + c.appends + '</td></tr><tr><td>' + esc(CT.t('shChange')) + '</td><td>' + c.updates + '</td></tr><tr><td>' + esc(CT.t('shAdopt')) + '</td><td>' + (c.adopted || 0) + '</td></tr><tr><td>' + esc(CT.t('shRetire')) + '</td><td>' + c.retired + '</td></tr><tr><td>' + esc(CT.t('shSame')) + '</td><td>' + c.unchanged + '</td></tr><tr><td>' + esc(CT.t('shLegacy')) + '</td><td>' + c.legacyRows + '</td></tr></tbody></table>' +
          (r.plan.updates.length ? '<table style="margin-top:8px"><thead><tr><th>cell</th><th></th><th>from</th><th>to</th></tr></thead><tbody>' + r.plan.updates.slice(0, 40).map(function (u) { return '<tr><td>' + esc(u.cell) + '</td><td>' + esc(u.header) + '</td><td>' + esc(u.from) + '</td><td>' + esc(u.to) + '</td></tr>'; }).join('') + '</tbody></table>' : '');
      } catch (err) { $('shOut').innerHTML = '<div class="err">' + esc(err.message) + '</div>'; }
    };
    document.addEventListener('ct-lang', function () { CT.applyI18n(); render(); });
  });
})();
