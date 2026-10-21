(function () {
  CT.addDict({
    ko: { campsTitle: '캠프별 공간', campsSub: '캠프 유형(전체 기록)과 개별 행사(준비 자료)를 구분해서 관리해요', addType: '+ 캠프 유형', addCamp: '+ 행사', noCamps: '아직 등록된 행사가 없어요.', typeFormTitle: '캠프 유형', campFormTitle: '개별 행사', fNameKo: '이름 (한국어)', fNameEn: '이름 (English)', fDesc: '설명', fType: '캠프 유형', fStart: '시작일', fEnd: '종료일', fStatus: '상태', fLocation: '장소', fNotes: '메모',
      planning: '준비 중', active: '진행 중', done: '종료', canceled: '취소', dateTbd: '날짜 미정', tasksDone: '업무 완료', viewOnly: '조회만 가능한 계정이에요. 수정은 캠프팀 팀원이 할 수 있어요.', saved: '저장했어요', needType: '먼저 캠프 유형을 만들어 주세요.' },
    en: { campsTitle: 'Camp Spaces', campsSub: 'Camp types (full history) and individual events (preparation) are kept separate', addType: '+ Camp type', addCamp: '+ Event', noCamps: 'No events yet.', typeFormTitle: 'Camp type', campFormTitle: 'Event', fNameKo: 'Name (Korean)', fNameEn: 'Name (English)', fDesc: 'Description', fType: 'Camp type', fStart: 'Start date', fEnd: 'End date', fStatus: 'Status', fLocation: 'Location', fNotes: 'Notes',
      planning: 'Planning', active: 'Active', done: 'Done', canceled: 'Canceled', dateTbd: 'Date TBD', tasksDone: 'tasks done', viewOnly: 'View-only account. Camp team members can edit.', saved: 'Saved', needType: 'Create a camp type first.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var data = null, canWrite = false;
  var STATUSES = ['planning', 'active', 'done', 'canceled'];

  function render() {
    $('viewOnly').hidden = canWrite;
    $('addType').hidden = $('addCamp').hidden = !canWrite;
    $('list').innerHTML = data.types.map(function (t) {
      var rows = t.camps.length ? t.camps.map(function (c) {
        var pc = c.taskTotal ? Math.round(c.taskDone / c.taskTotal * 100) : 0;
        var dates = c.startDate ? esc(c.startDate) + (c.endDate ? ' ~ ' + esc(c.endDate) : '') : esc(CT.t('dateTbd'));
        return '<div class="camp-row"><div class="nm"><b>' + esc(CT.pick(c, 'name')) + '</b>' + (c.isTest ? '<span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '<span class="meta">' + esc(c.location || '') + '</span></div>' +
          '<div>' + dates + '<br><span class="status ' + esc(c.status) + '">' + esc(CT.t(c.status)) + '</span></div>' +
          '<div><div class="bar"><i style="width:' + pc + '%"></i></div><span class="meta">' + c.taskDone + '/' + c.taskTotal + ' ' + esc(CT.t('tasksDone')) + '</span></div>' +
          '<div class="actions">' + (canWrite ? '<button class="btn sm" data-edit-camp="' + esc(c.id) + '">' + esc(CT.t('edit')) + '</button><button class="btn sm danger" data-del="camp:' + esc(c.id) + '">' + esc(CT.t('del')) + '</button>' : '') + '</div></div>';
      }).join('') : '<div class="empty">' + esc(CT.t('noCamps')) + '</div>';
      return '<section class="card type-card"><div class="type-head"><div><h2>' + esc(CT.pick(t, 'name')) + (t.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '</h2><div class="meta">' + esc(t.description || '') + '</div></div>' +
        (canWrite ? '<div class="actions"><button class="btn sm" data-edit-type="' + esc(t.id) + '">' + esc(CT.t('edit')) + '</button><button class="btn sm danger" data-del="type:' + esc(t.id) + '">' + esc(CT.t('del')) + '</button></div>' : '') + '</div>' + rows + '</section>';
    }).join('');
  }

  async function load() { data = await CT.api('/api/campteam/camps'); canWrite = data.perms.write; render(); }
  function findCamp(id) { for (var i = 0; i < data.types.length; i++) { var c = data.types[i].camps.filter(function (x) { return x.id === id; })[0]; if (c) return c; } }

  function openForm(kind, row) {
    var isType = kind === 'type', dlg = $('dlg');
    $('dlgTitle').textContent = CT.t(isType ? 'typeFormTitle' : 'campFormTitle');
    var f = '<label>' + esc(CT.t('fNameKo')) + '<input name="nameKo" required maxlength="80" value="' + esc(row ? row.nameKo : '') + '"></label>' +
            '<label>' + esc(CT.t('fNameEn')) + '<input name="nameEn" maxlength="80" value="' + esc(row ? row.nameEn : '') + '"></label>';
    if (isType) {
      f += '<label>' + esc(CT.t('fDesc')) + '<input name="description" maxlength="200" value="' + esc(row ? row.description : '') + '"></label>';
    } else {
      f += '<label>' + esc(CT.t('fType')) + '<select name="typeId" ' + (row ? 'disabled' : '') + '>' + data.types.map(function (t) { return '<option value="' + esc(t.id) + '"' + (row && row.typeId === t.id ? ' selected' : '') + '>' + esc(CT.pick(t, 'name')) + '</option>'; }).join('') + '</select></label>' +
        '<div class="two"><label>' + esc(CT.t('fStart')) + '<input type="date" name="startDate" value="' + esc(row && row.startDate || '') + '"></label><label>' + esc(CT.t('fEnd')) + '<input type="date" name="endDate" value="' + esc(row && row.endDate || '') + '"></label></div>' +
        '<label>' + esc(CT.t('fStatus')) + '<select name="status">' + STATUSES.map(function (s) { return '<option value="' + s + '"' + ((row ? row.status : 'planning') === s ? ' selected' : '') + '>' + esc(CT.t(s)) + '</option>'; }).join('') + '</select></label>' +
        '<label>' + esc(CT.t('fLocation')) + '<input name="location" maxlength="120" value="' + esc(row ? row.location : '') + '"></label>' +
        '<label>' + esc(CT.t('fNotes')) + '<textarea name="notes" maxlength="1000">' + esc(row ? row.notes : '') + '</textarea></label>';
    }
    $('dlgFields').innerHTML = f; $('dlgErr').hidden = true;
    dlg.dataset.kind = kind; dlg.dataset.id = row ? row.id : '';
    dlg.showModal();
  }

  async function submit(ev) {
    ev.preventDefault();
    var dlg = $('dlg'), kind = dlg.dataset.kind, id = dlg.dataset.id, fd = new FormData($('dlgForm')), body = { kind: kind };
    fd.forEach(function (v, k) { body[k] = v; });
    try {
      if (id) await CT.api('/api/campteam/camps?kind=' + kind + '&id=' + encodeURIComponent(id), { method: 'PATCH', body: body });
      else await CT.api('/api/campteam/camps', { method: 'POST', body: body });
      dlg.close(); await load();
    } catch (e) { $('dlgErr').textContent = e.message; $('dlgErr').hidden = false; }
  }

  CT.boot(async function () {
    try { await load(); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    CT.applyI18n();
    $('addType').onclick = function () { openForm('type'); };
    $('addCamp').onclick = function () { if (!data.types.length) { alert(CT.t('needType')); return; } openForm('camp'); };
    $('cancel').onclick = function () { $('dlg').close(); };
    $('dlgForm').onsubmit = submit;
    $('list').addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.editType) openForm('type', data.types.filter(function (t) { return t.id === b.dataset.editType; })[0]);
      else if (b.dataset.editCamp) openForm('camp', findCamp(b.dataset.editCamp));
      else if (b.dataset.del) {
        if (!confirm(CT.t('confirmDel'))) return;
        var p = b.dataset.del.split(':');
        try { await CT.api('/api/campteam/camps?kind=' + p[0] + '&id=' + encodeURIComponent(p[1]), { method: 'DELETE' }); await load(); } catch (err) { alert(err.message); }
      }
    });
    document.addEventListener('ct-lang', function () { CT.applyI18n(); render(); });
  });
})();
