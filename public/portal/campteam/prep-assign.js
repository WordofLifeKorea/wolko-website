/* 캠프 준비 「배정」 탭: 참가자·스태프 명단 + 조·방·차량 + 자동 배정 제안 + 겹침·안전 경고. 민감한 정보라 이름·성별·학년·교회·역할만 다룬다. */
(function () {
  var P = window.CTPrep; if (!P) return;
  CT.addDict({
    ko: { aLabel: '배정', aIntro: '참가자·스태프를 조·방·차량에 배정해요. 이름·성별·학년·교회·역할만 저장하고 전화·주소는 저장하지 않아요. 경고는 알려 주기만 하고 막거나 자동으로 바꾸지 않아요.', aWarn: '확인할 점', aNoWarn: '지금 확인할 점이 없어요 👍', aSlots: '조 · 방 · 차량', aGroup: '조', aRoom: '방', aVehicle: '차량', aAddSlot: '+ 추가', aCap: '정원', aLeader: { group: '조장', room: '담당', vehicle: '운전자' }, aGender: '성별 규칙', aGAny: '제한 없음', aGM: '남', aGF: '여',
      aPeople: '명단', aAddP: '+ 사람 추가', aPaste: '📋 붙여넣기', aPropG: '조 자동 배정 제안', aPropR: '방 자동 배정 제안', aSearch: '이름·교회로 찾기', aName: '이름', aGrade: '학년', aChurch: '교회', aRole: '역할', aNone: '—', rParticipant: '참가자', rStaff: '스태프', rLeader: '리더',
      aPasteHint: '엑셀에서 [이름] [성별] [학년] [교회] [역할(스태프/리더, 비우면 참가자)] 순서로 복사해 붙여 넣으세요.', aPasteRows: function (n, s) { return n + '명을 읽었어요' + (s ? ' (못 읽은 ' + s + '줄 건너뜀)' : '') + '.'; }, aPasteGo: '추가하기', aPastePv: '미리보기', aPasteDone: function (n, d) { return n + '명을 추가했어요' + (d ? ' (이미 있는 ' + d + '명 건너뜀)' : '') + '.'; },
      aPropTitle: function (w) { return w === 'groups' ? '조 자동 배정 제안' : '방 자동 배정 제안'; }, aPropBody: function (n, u) { return n + '명을 배정하는 제안이에요' + (u ? ' (자리가 부족해 ' + u + '명은 못 넣었어요)' : '') + '. 성별·학년이 골고루 섞이게 했어요. 아래 「적용」을 눌러야 저장돼요.'; }, aRedo: '이미 배정된 사람도 다시 배정하기', aApply: '적용', aPropNone: '배정할 사람이 없어요.', aDone: function (n) { return n + '명을 배정했어요.'; },
      cancel: '취소', save: '저장', edit: '수정', del: '삭제', delConfirm: '삭제할까요?', fGender: '성별', fNotes: '메모', fName: '이름', fCap: '정원' },
    en: { aLabel: 'Assign', aIntro: 'Assign participants and staff to groups, rooms and vehicles. Only name, gender, grade, church and role are stored — no phone or address. Warnings only inform; they never block or change anything.', aWarn: 'Things to check', aNoWarn: 'Nothing to check right now 👍', aSlots: 'Groups · Rooms · Vehicles', aGroup: 'Groups', aRoom: 'Rooms', aVehicle: 'Vehicles', aAddSlot: '+ Add', aCap: 'Capacity', aLeader: { group: 'Leader', room: 'Contact', vehicle: 'Driver' }, aGender: 'Gender rule', aGAny: 'No rule', aGM: 'Male', aGF: 'Female',
      aPeople: 'People', aAddP: '+ Add person', aPaste: '📋 Paste', aPropG: 'Suggest groups', aPropR: 'Suggest rooms', aSearch: 'Search name or church', aName: 'Name', aGrade: 'Grade', aChurch: 'Church', aRole: 'Role', aNone: '—', rParticipant: 'Participant', rStaff: 'Staff', rLeader: 'Leader',
      aPasteHint: 'Paste from Excel in the order [name] [gender] [grade] [church] [role: staff/leader, empty = participant].', aPasteRows: function (n, s) { return 'Read ' + n + ' people' + (s ? ' (' + s + ' unreadable rows skipped)' : '') + '.'; }, aPasteGo: 'Add', aPastePv: 'Preview', aPasteDone: function (n, d) { return 'Added ' + n + ' people' + (d ? ' (' + d + ' already existed)' : '') + '.'; },
      aPropTitle: function (w) { return w === 'groups' ? 'Suggested groups' : 'Suggested rooms'; }, aPropBody: function (n, u) { return 'Suggestion to assign ' + n + ' people' + (u ? ' (' + u + ' did not fit)' : '') + ', balanced by gender and grade. Nothing is saved until you press Apply.'; }, aRedo: 'Also reassign people who already have a place', aApply: 'Apply', aPropNone: 'Nobody to assign.', aDone: function (n) { return 'Assigned ' + n + ' people.'; },
      cancel: 'Cancel', save: 'Save', edit: 'Edit', del: 'Delete', delConfirm: 'Delete?', fGender: 'Gender', fNotes: 'Notes', fName: 'Name', fCap: 'Capacity' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = P.esc, S = P.S, api = P.api;
  var A = { people: [], slots: [], warnings: [], q: '' };
  var KINDS = [['group', 'aGroup'], ['room', 'aRoom'], ['vehicle', 'aVehicle']];
  var ROLE = { participant: 'rParticipant', staff: 'rStaff', leader: 'rLeader' }, LV = { danger: '⛔', warn: '⚠️', info: 'ℹ️' };
  function slotsOf(k) { return A.slots.filter(function (s) { return s.kind === k; }); }
  function col(k) { return { group: 'groupId', room: 'roomId', vehicle: 'vehicleId' }[k]; }
  function countIn(k, id) { return A.people.filter(function (p) { return p[col(k)] === id; }).length; }
  async function loadAll() {
    var id = encodeURIComponent(S.campId), r = await Promise.all([CT.api('/api/campteam/camp-people?campId=' + id), CT.api('/api/campteam/camp-slots?campId=' + id), CT.api('/api/campteam/camp-conflicts?campId=' + id)]);
    A.people = r[0].items; A.slots = r[1].items; A.warnings = r[2].warnings; render();
  }
  function peopleRows() {
    var q = A.q.toLowerCase(), w = P.canW();
    return A.people.filter(function (p) { return !q || (p.name + ' ' + p.church).toLowerCase().indexOf(q) >= 0; }).map(function (p) {
      var sel = function (k) { var l = slotsOf(k); if (!l.length) return '<span class="hint">' + esc(CT.t('aNone')) + '</span>'; if (k !== 'vehicle' && p.role !== 'participant') return '<span class="hint">' + esc(CT.t('aNone')) + '</span>'; return w ? '<select data-as="' + k + '" data-id="' + esc(p.id) + '"><option value="">—</option>' + l.map(function (s) { return '<option value="' + esc(s.id) + '"' + (p[col(k)] === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select>' : esc((l.filter(function (s) { return s.id === p[col(k)]; })[0] || {}).name || '—'); };
      return '<tr><td><b>' + esc(p.name) + '</b>' + (p.role !== 'participant' ? ' <span class="chip">' + esc(CT.t(ROLE[p.role])) + '</span>' : '') + '</td><td>' + esc(p.gender === 'M' ? CT.t('aGM') : p.gender === 'F' ? CT.t('aGF') : '') + '</td><td>' + esc(p.grade) + '</td><td>' + esc(p.church) + '</td><td>' + sel('group') + '</td><td>' + sel('room') + '</td><td>' + sel('vehicle') + '</td>' + (w ? '<td class="p-act"><button class="btn sm" data-pe="' + esc(p.id) + '">' + esc(CT.t('edit')) + '</button> <button class="btn sm danger" data-pd="' + esc(p.id) + '">' + esc(CT.t('del')) + '</button></td>' : '') + '</tr>';
    }).join('');
  }
  function render() {
    var w = P.canW(), h = '<p class="hint">' + esc(CT.t('aIntro')) + '</p>';
    h += '<h4 class="p-day">' + esc(CT.t('aWarn')) + ' (' + A.warnings.length + ')</h4>' + (A.warnings.length ? '<ul class="p-list a-warn">' + A.warnings.map(function (x) { return '<li class="w-' + x.level + '">' + LV[x.level] + ' ' + esc(x.text) + '</li>'; }).join('') + '</ul>' : '<p class="hint">' + esc(CT.t('aNoWarn')) + '</p>');
    h += '<h4 class="p-day">' + esc(CT.t('aSlots')) + '</h4><div class="a-slots">' + KINDS.map(function (k) {
      return '<div class="card a-col"><div class="p-bar"><b>' + esc(CT.t(k[1])) + '</b>' + (w ? '<button class="btn sm" data-sadd="' + k[0] + '">' + esc(CT.t('aAddSlot')) + '</button>' : '') + '</div>' + slotsOf(k[0]).map(function (s) {
        return '<div class="p-row"><span class="p-main"><b>' + esc(s.name) + '</b><small>' + countIn(k[0], s.id) + (s.capacity ? ' / ' + s.capacity : '') + (s.gender ? ' · ' + esc(CT.t(s.gender === 'M' ? 'aGM' : 'aGF')) : '') + (s.leader ? ' · ' + esc(CT.t('aLeader')[k[0]]) + ': ' + esc(s.leader) : '') + '</small></span>' + (w ? '<span class="p-act"><button class="btn sm" data-se="' + esc(s.id) + '">' + esc(CT.t('edit')) + '</button> <button class="btn sm danger" data-sd="' + esc(s.id) + '">' + esc(CT.t('del')) + '</button></span>' : '') + '</div>';
      }).join('') + '</div>';
    }).join('') + '</div>';
    h += '<h4 class="p-day">' + esc(CT.t('aPeople')) + ' (' + A.people.length + ')</h4><div class="p-bar">' + (w ? '<button class="btn pri" id="apAdd">' + esc(CT.t('aAddP')) + '</button> <button class="btn" id="apPaste">' + esc(CT.t('aPaste')) + '</button> <button class="btn" id="apG">' + esc(CT.t('aPropG')) + '</button> <button class="btn" id="apR">' + esc(CT.t('aPropR')) + '</button>' : '') + '<input id="apQ" type="search" maxlength="40" placeholder="' + esc(CT.t('aSearch')) + '" value="' + esc(A.q) + '"></div>';
    h += '<div class="a-tablewrap"><table class="a-table"><thead><tr><th>' + esc(CT.t('aName')) + '</th><th>' + esc(CT.t('fGender')) + '</th><th>' + esc(CT.t('aGrade')) + '</th><th>' + esc(CT.t('aChurch')) + '</th><th>' + esc(CT.t('aGroup')) + '</th><th>' + esc(CT.t('aRoom')) + '</th><th>' + esc(CT.t('aVehicle')) + '</th>' + (w ? '<th></th>' : '') + '</tr></thead><tbody id="apBody">' + peopleRows() + '</tbody></table></div>';
    $('pView').innerHTML = h;
  }
  var SF = function (k) { return [{ n: 'name', l: 'fName' }, { n: 'capacity', l: 'fCap', t: 'number' }].concat(k === 'room' ? [{ n: 'gender', l: 'aGender', t: 'select', o: [['', CT.t('aGAny')], ['M', CT.t('aGM')], ['F', CT.t('aGF')]] }] : []).concat([{ n: 'leader', l: 'aLeaderL' + k }, { n: 'notes', l: 'fNotes', t: 'area' }]); };
  CT.addDict({ ko: { aLeaderLgroup: '조장', aLeaderLroom: '방 담당', aLeaderLvehicle: '운전자' }, en: { aLeaderLgroup: 'Leader', aLeaderLroom: 'Contact', aLeaderLvehicle: 'Driver' } });
  var PF = function () { return [{ n: 'name', l: 'fName' }, { n: 'gender', l: 'fGender', t: 'select', o: [['', '—'], ['M', CT.t('aGM')], ['F', CT.t('aGF')]] }, { n: 'grade', l: 'aGrade' }, { n: 'church', l: 'aChurch', s: 'church' }, { n: 'role', l: 'aRole', t: 'select', o: [['participant', CT.t('rParticipant')], ['staff', CT.t('rStaff')], ['leader', CT.t('rLeader')]] }, { n: 'notes', l: 'fNotes', t: 'area' }]; };
  function pasteDlg() {
    $('pBody').innerHTML = '<h3>' + esc(CT.t('aPaste')) + '</h3><p class="hint">' + esc(CT.t('aPasteHint')) + '</p><textarea id="pasteTx" rows="10" style="width:100%"></textarea><div class="hint" id="pasteMsg"></div><div class="dlg-actions"><button type="button" class="btn" id="pCancel">' + esc(CT.t('cancel')) + '</button><button type="button" class="btn" id="pastePv">' + esc(CT.t('aPastePv')) + '</button><button type="button" class="btn pri" id="pasteGo">' + esc(CT.t('aPasteGo')) + '</button></div>';
    $('pDlg').showModal(); $('pCancel').onclick = function () { $('pDlg').close(); };
    $('pastePv').onclick = async function () { try { var r = await api('/api/campteam/camp-people', 'POST', { action: 'paste', campId: S.campId, text: $('pasteTx').value, preview: true }); $('pasteMsg').textContent = CT.t('aPasteRows')(r.count, r.skipped.length); } catch (e) { $('pasteMsg').textContent = e.message; } };
    $('pasteGo').onclick = async function () { try { var r = await api('/api/campteam/camp-people', 'POST', { action: 'paste', campId: S.campId, text: $('pasteTx').value }); $('pasteMsg').textContent = CT.t('aPasteDone')(r.created, r.duplicates); await loadAll(); setTimeout(function () { $('pDlg').close(); }, 900); } catch (e) { $('pasteMsg').textContent = e.message; } };
  }
  async function propose(what) {
    var redo = false;
    async function run() {
      var r = await api('/api/campteam/camp-people', 'POST', { action: 'propose', campId: S.campId, what: what, redo: redo }), byP = {}; A.people.forEach(function (p) { byP[p.id] = p; }); var bySl = {}; A.slots.forEach(function (s) { bySl[s.id] = s; });
      var tally = {}; r.moves.forEach(function (m) { (tally[m.slotId] = tally[m.slotId] || []).push(byP[m.personId] ? byP[m.personId].name : ''); });
      $('pBody').innerHTML = '<h3>' + esc(CT.t('aPropTitle')(what)) + '</h3>' + (r.count ? '<p>' + esc(CT.t('aPropBody')(r.count, r.unassigned)) + '</p>' + Object.keys(tally).map(function (id) { return '<div class="p-row"><span class="p-main"><b>' + esc((bySl[id] || {}).name || '') + ' (' + tally[id].length + ')</b><small>' + esc(tally[id].join(', ')) + '</small></span></div>'; }).join('') : '<p class="hint">' + esc(CT.t('aPropNone')) + '</p>') + '<label class="imp-row"><input type="checkbox" id="apRedo"' + (redo ? ' checked' : '') + '> <span>' + esc(CT.t('aRedo')) + '</span></label><div class="dlg-actions"><button type="button" class="btn" id="pCancel">' + esc(CT.t('cancel')) + '</button>' + (r.count ? '<button type="button" class="btn pri" id="apApply">' + esc(CT.t('aApply')) + '</button>' : '') + '</div><div class="hint" id="apMsg"></div>';
      $('pCancel').onclick = function () { $('pDlg').close(); }; $('apRedo').onchange = function () { redo = $('apRedo').checked; run().catch(function (e) { $('apMsg').textContent = e.message; }); };
      if ($('apApply')) $('apApply').onclick = async function () { try { var a = await api('/api/campteam/camp-people', 'POST', { action: 'assign', campId: S.campId, what: what, moves: r.moves }); $('apMsg').textContent = CT.t('aDone')(a.assigned); await loadAll(); setTimeout(function () { $('pDlg').close(); }, 800); } catch (e) { $('apMsg').textContent = e.message; } };
    }
    $('pDlg').showModal(); $('pBody').innerHTML = '<p class="hint">…</p>'; try { await run(); } catch (e) { $('pBody').innerHTML = '<p class="err">' + esc(e.message) + '</p><div class="dlg-actions"><button class="btn" id="pCancel">' + esc(CT.t('cancel')) + '</button></div>'; $('pCancel').onclick = function () { $('pDlg').close(); }; }
  }
  async function handle(e) {
    var t = function (a) { return e.target.closest('[' + a + ']'); }, x;
    try {
      if ((x = t('data-sadd'))) { var k = x.dataset.sadd; return P.dialog(CT.t({ group: 'aGroup', room: 'aRoom', vehicle: 'aVehicle' }[k]), SF(k), {}, async function (o) { o.campId = S.campId; o.kind = k; await api('/api/campteam/camp-slots', 'POST', o); await loadAll(); }); }
      if ((x = t('data-se'))) { var s = A.slots.filter(function (z) { return z.id === x.dataset.se; })[0]; return P.dialog(s.name, SF(s.kind), s, async function (o) { await api('/api/campteam/camp-slots?id=' + encodeURIComponent(s.id), 'PATCH', o); await loadAll(); }); }
      if ((x = t('data-sd'))) return P.del('/api/campteam/camp-slots', x.dataset.sd, loadAll);
      if ((x = t('data-pe'))) { var p = A.people.filter(function (z) { return z.id === x.dataset.pe; })[0]; return P.dialog(p.name, PF(), p, async function (o) { await api('/api/campteam/camp-people?id=' + encodeURIComponent(p.id), 'PATCH', o); await loadAll(); }); }
      if ((x = t('data-pd'))) return P.del('/api/campteam/camp-people', x.dataset.pd, loadAll);
      if (e.target.closest('#apAdd')) return P.dialog(CT.t('aAddP'), PF(), { role: 'participant' }, async function (o) { o.campId = S.campId; await api('/api/campteam/camp-people', 'POST', o); await loadAll(); });
      if (e.target.closest('#apPaste')) return pasteDlg();
      if (e.target.closest('#apG')) return propose('groups'); if (e.target.closest('#apR')) return propose('rooms');
    } catch (er) { alert(er.message); }
  }
  async function change(e) {
    var s = e.target.closest('[data-as]'); if (!s) return; var body = {}; body[col(s.dataset.as)] = s.value || '';
    try { await api('/api/campteam/camp-people?id=' + encodeURIComponent(s.dataset.id), 'PATCH', body); await loadAll(); } catch (er) { alert(er.message); loadAll(); }
  }
  P.add('assign', { label: 'aLabel', needCamp: true, load: async function () { $('pView').innerHTML = '<p class="hint">…</p>'; await loadAll(); $('pView').onclick = handle; $('pView').onchange = change; $('pView').oninput = function (e) { if (e.target.id === 'apQ') { A.q = e.target.value; $('apBody').innerHTML = peopleRows(); } }; } });
  /* 진행표 탭에서도 시간·장소 겹침 경고를 보여 준다 */
  P.onTimeline = async function () {
    try { var r = await CT.api('/api/campteam/camp-conflicts?campId=' + encodeURIComponent(S.campId)), w = r.warnings.filter(function (x) { return x.type === 'person-overlap' || x.type === 'place-overlap'; }); if (!w.length || S.tab !== 'timeline') return;
      $('pView').insertAdjacentHTML('afterbegin', '<ul class="p-list a-warn">' + w.map(function (x) { return '<li class="w-' + x.level + '">' + LV[x.level] + ' ' + esc(x.text) + '</li>'; }).join('') + '</ul>'); } catch (e) { /* 경고는 덤이다 */ }
  };
})();
