(function () {
  CT.addDict({
    ko: { setTitle: '설정 · 팀 명단', setSub: '캠프팀 역할을 정해요. 명단에 없는 포털 사용자는 조회만 할 수 있어요.', colEmail: '이메일', colName: '이름', colRole: '역할', addMember: '팀원 추가 · 역할 변경', fEmail: '포털 이메일 (wolko.org / wol.org)', fName: '이름', fRole: '역할', remove: '명단에서 빼기', rolesTitle: '역할별 권한',
      permAdmin: '관리자: 모든 자료 조회·작성·수정, 금액 조회·작성, 팀 명단 관리', permFinance: '재정 담당: 일반 자료는 조회만, 금액 조회·작성·수정', permMember: '캠프팀 팀원: 일반 자료 조회·작성·수정, 금액 조회·작성·수정', permViewer: '그 외 포털 사용자: 일반 자료 조회만, 금액은 볼 수 없음', done: '저장했어요', you: '(나)', fixedAdmin: '고정 관리자',
      shTitle: 'Google Sheets 연동 (미리보기)', shHelp: '포털의 업무를 기존 시트(Tasks 탭)에 반영할 때 "어느 칸에 무엇을 쓰게 되는지"만 보여줘요. 이 버튼은 시트에 아무것도 쓰지 않아요. 실제 쓰기는 서버 설정이 켜져 있고 관리자가 따로 확인할 때만 가능해요.', shPreview: '미리보기', shNotConnected: '시트가 아직 연결되지 않았어요. 연결 전이라 "전부 새로 쓰게 될 것"으로 계산한 모의 계획이에요.', shConnected: '시트에 연결되어 있어요.', shWriteOff: '쓰기: 꺼짐 (미리보기만 가능)', shWriteOn: '쓰기: 켜짐', shNew: '새 줄', shChange: '바뀌는 칸', shAdopt: '기존 줄에 ID 연결', shRetire: '삭제 표시(Not Applicable)로 바뀜', shSame: '변경 없음', shLegacy: '손대지 않는 기존 줄' },
    en: { setTitle: 'Settings · Team Roster', setSub: 'Set camp team roles. Portal users not on the list can only view.', colEmail: 'Email', colName: 'Name', colRole: 'Role', addMember: 'Add member · change role', fEmail: 'Portal email (wolko.org / wol.org)', fName: 'Name', fRole: 'Role', remove: 'Remove', rolesTitle: 'Role permissions',
      permAdmin: 'Admin: view/write/edit all materials, view/write amounts, manage roster', permFinance: 'Finance: view-only for general materials, view/write/edit amounts', permMember: 'Camp team: view/write/edit general materials and amounts', permViewer: 'Other portal users: view general materials only, no amounts', done: 'Saved', you: '(you)', fixedAdmin: 'Fixed admin',
      shTitle: 'Google Sheets sync (preview)', shHelp: 'Shows which cells would be written when portal tasks are mirrored to the existing sheet (Tasks tab). This button writes nothing. Actual writing needs the server setting turned on and a separate admin confirmation.', shPreview: 'Preview', shNotConnected: 'The sheet is not connected yet. This is a mock plan that assumes everything would be newly written.', shConnected: 'Connected to the sheet.', shWriteOff: 'Writing: off (preview only)', shWriteOn: 'Writing: on', shNew: 'New rows', shChange: 'Cells to change', shAdopt: 'Existing rows to link by ID', shRetire: 'Marked Not Applicable (deleted in portal)', shSame: 'Unchanged', shLegacy: 'Existing rows left untouched' }
  });
  CT.addDict({
    ko: { colAliases: '업무에 적는 이름', fAliases: '업무에 적는 이름 (여러 개는 쉼표로)', fAliasesHint: '업무 담당자 칸에 이 이름으로 적혀 있으면 이 사람의 업무로 인식해요. 예: Mina, 미나', editMember: '팀원 수정', fixedRoleNote: '코드에 고정된 관리자라서 역할은 바꿀 수 없어요. 이름과 업무에 적는 이름은 고칠 수 있어요.', pmBtn: '권한', pmCustom: '맞춤', pmTitle: '항목별 권한', pmFor: '대상', pmRoleBase: '역할 기본값', pmNone: '안 보임', pmView: '보기만', pmEdit: '수정 가능', pmDefaultTag: '기본', pmChanged: '기본과 달라요', pmReset: '역할 기본값으로 되돌리기', pmSave: '저장', pmSaved: '저장했어요.', pmLocked: '관리자의 권한은 바꿀 수 없어요.', pmHint: '역할은 기본값이고, 여기서 고른 칸만 그 사람에게 따로 적용돼요. 이 설정은 관리자만 볼 수 있고 바꿀 수 있어요.',
      pm_tasks: '일정 · 업무', pmd_tasks: '업무, 일정, 체크리스트 템플릿', pm_meetings: '회의록 · 결정', pmd_meetings: '회의록, 결정, AI 회의록 초안, 용어집', pm_files: '자료실', pmd_files: '파일 보기·올리기 (금액이 들어 있는 자료는 아래 「예산 · 장부」 권한도 필요)', pm_camps: '캠프별 공간 · 공지', pmd_camps: '캠프 행사, 캠프별 공간, TV 화면의 공지', pm_money: '예산 · 장부', pmd_money: '장부, 캠프별 예산안, 금액 자료 (수정 가능 = 거래 입력·기간 마감까지)', pm_personal: '신청자 개인정보', pmd_personal: '연락처, 환불 계좌 등 (볼 때마다 조회 기록이 남아요)', pm_notices: '팀 공지 쓰기', pmd_notices: '알림공지에 팀 공지 올리기·보기' },
    en: { colAliases: 'Names used on tasks', fAliases: 'Names used on tasks (comma separated)', fAliasesHint: 'Tasks whose owner is written with one of these names count as this person’s. e.g. Mina, 미나', editMember: 'Edit member', fixedRoleNote: 'This is a fixed admin, so the role cannot be changed. The name and task names can be edited.', pmBtn: 'Permissions', pmCustom: 'Custom', pmTitle: 'Permissions by area', pmFor: 'For', pmRoleBase: 'Role default', pmNone: 'Hidden', pmView: 'View only', pmEdit: 'Can edit', pmDefaultTag: 'default', pmChanged: 'Differs from default', pmReset: 'Reset to role default', pmSave: 'Save', pmSaved: 'Saved.', pmLocked: 'An admin’s permissions cannot be changed.', pmHint: 'The role is the default; only the cells you choose here apply to this person. Only admins can see and change this.',
      pm_tasks: 'Schedule · Tasks', pmd_tasks: 'Tasks, events, checklist templates', pm_meetings: 'Meetings · Decisions', pmd_meetings: 'Minutes, decisions, AI minutes drafts, glossary', pm_files: 'Files', pmd_files: 'View and upload files (files containing amounts also need the "Budget · Ledger" permission)', pm_camps: 'Camp spaces · Notices', pmd_camps: 'Camp events, camp spaces, TV screen notices', pm_money: 'Budget · Ledger', pmd_money: 'Ledger, per-camp budgets, amount files (Edit = enter transactions and close periods)', pm_personal: 'Registrant personal data', pmd_personal: 'Phone numbers, refund accounts, etc. (each view is logged)', pm_notices: 'Team notices', pmd_notices: 'Post and read team notices in Alerts & Notices' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, data = null, custom = {};

  function render() {
    $('rows').innerHTML = data.members.map(function (m) {
      var actions = (m.fixed || m.role === 'admin' ? '' : '<button class="btn sm" data-perm="' + esc(m.email) + '">' + esc(CT.t('pmBtn')) + (custom[m.email.toLowerCase()] ? ' <span class="chip" style="background:#fff2dc;color:#8a5a00">' + esc(CT.t('pmCustom')) + ' ' + custom[m.email.toLowerCase()] + '</span>' : '') + '</button> ') + '<button class="btn sm" data-edit="' + esc(m.email) + '">' + esc(CT.t('edit')) + '</button>' + (m.fixed ? '' : ' <button class="btn sm danger" data-rm="' + esc(m.email) + '">' + esc(CT.t('remove')) + '</button>');
      return '<tr><td data-l="' + esc(CT.t('colEmail')) + '">' + esc(m.email) + (m.email === data.me ? ' ' + esc(CT.t('you')) : '') + (m.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + (m.fixed ? ' <span class="chip gray">' + esc(CT.t('fixedAdmin')) + '</span>' : '') + '</td><td data-l="' + esc(CT.t('colName')) + '"><b>' + esc(m.name) + '</b></td><td data-l="' + esc(CT.t('colAliases')) + '">' + esc(m.aliases || '') + '</td><td data-l="' + esc(CT.t('colRole')) + '"><span class="chip">' + esc(CT.roleLabel(m.role)) + '</span></td>' +
        '<td class="act">' + actions + '</td></tr>';
    }).join('');
    $('roleSel').innerHTML = data.roles.map(function (r) { return '<option value="' + r + '">' + esc(CT.roleLabel(r)) + '</option>'; }).join('');
  }
  function editDialog(m) {
    var locked = !!m.fixed, roles = data.roles.map(function (r) { return '<option value="' + r + '"' + (m.role === r ? ' selected' : '') + '>' + esc(CT.roleLabel(r)) + '</option>'; }).join('');
    var f = '<div class="meta">' + esc(m.email) + '</div><label>' + esc(CT.t('colName')) + '<input name="name" maxlength="60" value="' + esc(m.name) + '"></label><label>' + esc(CT.t('fAliases')) + '<input name="aliases" maxlength="200" value="' + esc(m.aliases || '') + '"><small class="hint">' + esc(CT.t('fAliasesHint')) + '</small></label>' +
      '<label>' + esc(CT.t('colRole')) + CT.help('role') + '<select name="role"' + (locked ? ' disabled' : '') + '>' + roles + '</select></label>' + (locked ? '<div class="hintbox">' + esc(CT.t('fixedRoleNote')) + '</div>' : '');
    CT.ask(CT.t('editMember'), f, async function (fd) { await CT.api('/api/campteam/members', { method: 'POST', body: { email: m.email, name: fd.name, aliases: fd.aliases, role: locked ? 'admin' : fd.role } }); await load(); });
  }
  async function load() { data = await CT.api('/api/campteam/members'); try { custom = Object.fromEntries((await CT.api('/api/campteam/member-perms')).list.map(function (x) { return [x.email.toLowerCase(), x.custom]; })); } catch (e) { custom = {}; } render(); }
  async function permDialog(email) {
    var d; try { d = await CT.api('/api/campteam/member-perms?email=' + encodeURIComponent(email)); } catch (e) { alert(e.message); return; }
    if (d.locked) { alert(CT.t('pmLocked')); return; }
    var lv = { none: 'pmNone', view: 'pmView', edit: 'pmEdit' }, f = '<div class="hintbox">' + esc(CT.t('pmHint')) + '</div><div style="margin:8px 0"><b>' + esc(d.name || d.email) + '</b> <span class="chip">' + esc(CT.roleLabel(d.role)) + '</span> ' + CT.help('role') + '</div><table class="pmtable"><thead><tr><th>' + esc(CT.t('pmTitle')) + CT.help('permTable') + '</th>' + ['none', 'view', 'edit'].map(function (l) { return '<th>' + esc(CT.t(lv[l])) + '</th>'; }).join('') + '</tr></thead><tbody>' +
      d.areas.map(function (a) {
        var cur = d.effective[a], def = d.defaults[a], opts = d.levels[a];
        return '<tr data-area="' + a + '"><td><b>' + esc(CT.t('pm_' + a)) + '</b><small>' + esc(CT.t('pmd_' + a)) + '</small></td>' + ['none', 'view', 'edit'].map(function (l) {
          if (opts.indexOf(l) < 0) return '<td class="off">—</td>';
          return '<td class="' + (def === l ? 'def' : '') + '"><label><input type="radio" name="pm_' + a + '" value="' + l + '"' + (cur === l ? ' checked' : '') + '>' + (def === l ? '<em>' + esc(CT.t('pmDefaultTag')) + '</em>' : '') + '</label></td>';
        }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
    CT.ask(CT.t('pmTitle'), f, async function () {
      var ov = {}; d.areas.forEach(function (a) { var c = document.querySelector('#dlgForm input[name=pm_' + a + ']:checked'); if (c) ov[a] = c.value; });
      await CT.api('/api/campteam/member-perms', { method: 'PUT', body: { email: d.email, overrides: ov } }); await load();
    }, { saveLabel: CT.t('pmSave'), extra: '<button type="button" class="btn" id="pmReset" style="margin-right:auto">' + esc(CT.t('pmReset')) + '</button>' });
    var rs = $('pmReset'); if (rs) rs.onclick = function () { d.areas.forEach(function (a) { var r = document.querySelector('#dlgForm input[name=pm_' + a + '][value=' + d.defaults[a] + ']'); if (r) r.checked = true; }); };
  }

  CT.boot(async function (me) {
    if (!me.perms.manageMembers) { $('main').innerHTML = '<div class="err">' + esc(CT.t('loadFail')) + ' (403)</div>'; return; }
    try { await load(); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    CT.applyI18n();
    $('rows').addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.perm) { permDialog(b.dataset.perm); return; }
      if (b.dataset.edit) { editDialog(data.members.filter(function (x) { return x.email === b.dataset.edit; })[0]); }
      else if (b.dataset.rm) { if (!confirm(CT.t('remove') + '?')) return; try { await CT.api('/api/campteam/members?email=' + encodeURIComponent(b.dataset.rm), { method: 'DELETE' }); await load(); } catch (err) { alert(err.message); } }
    });
    $('addForm').onsubmit = async function (ev) {
      ev.preventDefault(); $('addErr').hidden = true;
      try { await CT.api('/api/campteam/members', { method: 'POST', body: { email: $('fEmail').value, name: $('fName').value, aliases: $('fAliases').value, role: $('roleSel').value } }); $('addForm').reset(); await load(); }
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
