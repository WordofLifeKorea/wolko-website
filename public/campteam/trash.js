(function () {
  CT.addDict({
    ko: { trTitle: '휴지통', trSub: '삭제한 항목은 여기에 남아 있어요. 복구하면 원래 자리로 돌아와요. (영구 삭제는 하지 않아요)', trEmpty: '이 종류에는 삭제된 항목이 없어요.', restore: '복구', deletedAt: '삭제', by: '삭제한 사람', restored: '복구했어요', confirmRestore: '복구할까요?',
      tasks: '업무', announcements: '팀 공지', events: '일정', meetings: '회의', sections: '회의 구역', decisions: '결정', files: '파일', camps: '캠프 행사', camp_types: '캠프 유형', templates: '체크리스트 템플릿', template_items: '템플릿 항목', notices: '공지', budget: '예산 항목', ledger: '장부 거래' },
    en: { trTitle: 'Trash', trSub: 'Deleted items stay here. Restoring puts them back where they were. (Nothing is permanently deleted.)', trEmpty: 'No deleted items of this type.', restore: 'Restore', deletedAt: 'Deleted', by: 'Deleted by', restored: 'Restored', confirmRestore: 'Restore this?',
      tasks: 'Tasks', announcements: 'Team notices', events: 'Events', meetings: 'Meetings', sections: 'Meeting sections', decisions: 'Decisions', files: 'Files', camps: 'Camp events', camp_types: 'Camp types', templates: 'Checklist templates', template_items: 'Template items', notices: 'Announcements', budget: 'Budget lines', ledger: 'Ledger entries' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, kind = '', counts = {};
  async function loadCounts() { counts = (await CT.api('/api/campteam/trash')).counts; var keys = Object.keys(counts); if (!kind) kind = keys.filter(function (k) { return counts[k] > 0; })[0] || keys[0];
    $('trTabs').innerHTML = keys.map(function (k) { return '<button class="tab ' + (k === kind ? 'on' : '') + '" data-k="' + k + '">' + esc(CT.t(k)) + (counts[k] ? ' <b>' + counts[k] + '</b>' : '') + '</button>'; }).join(''); }
  async function loadList() {
    var r = await CT.api('/api/campteam/trash?kind=' + encodeURIComponent(kind));
    $('trList').innerHTML = r.items.length ? r.items.map(function (x) { return '<div class="row"><div>' + esc(x.label) + '<small>' + esc(x.sub || '') + ' · ' + esc(CT.t('deletedAt')) + ' ' + esc((x.deletedAt || '').slice(0, 16).replace('T', ' ')) + (x.deletedBy ? ' · ' + esc(CT.t('by')) + ' ' + esc(x.deletedBy) : '') + '</small></div><button class="btn sm pri" data-id="' + esc(x.id) + '">' + esc(CT.t('restore')) + '</button></div>'; }).join('') : '<div class="empty">' + esc(CT.t('trEmpty')) + '</div>';
  }
  CT.boot(async function () {
    try { await loadCounts(); if (kind) await loadList(); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.status === 403 ? CT.t('loadFail') + ' (403)' : e.message) + '</div>'); return; }
    CT.applyI18n();
    $('trTabs').onclick = async function (e) { var b = e.target.closest('[data-k]'); if (!b) return; kind = b.dataset.k; await loadCounts(); await loadList(); };
    $('trList').onclick = async function (e) { var b = e.target.closest('[data-id]'); if (!b || !confirm(CT.t('confirmRestore'))) return; try { await CT.api('/api/campteam/trash', { method: 'POST', body: { kind: kind, id: b.dataset.id } }); await loadCounts(); await loadList(); } catch (err) { alert(err.message); } };
    document.addEventListener('ct-lang', function () { CT.applyI18n(); loadCounts().then(loadList); });
  });
})();
