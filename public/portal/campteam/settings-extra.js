/* 설정 화면의 관리자 도구: 구글 달력 미리보기 · 용어집 · 백업 내보내기 · 변경 기록 */
(function () {
  CT.addDict({
    ko: { gcTitle: 'Google 달력 연동 (미리보기)', gcHelp: '캠프팀 「달력」 화면에서 만든 팀 일정을 연결해 둔 캠프팀 구글 달력에 반영할 때 무엇이 만들어지고 바뀌는지 보여줘요. 이 버튼은 달력에 아무것도 쓰지 않아요. 실제 쓰기는 서버 설정이 켜져 있고 관리자가 따로 확인할 때만 가능해요. 포털에서 지운 일정은 구글 달력에서 자동으로 지우지 않아요.', gcCreate: '새로 만들 일정', gcApply: '구글 달력에 반영하기', gcApplyAsk: '미리보기에 나온 일정을 구글 달력에 실제로 만들고 고쳐요. 포털에서 지운 일정은 구글에서 지우지 않아요. 계속할까요?', gcApplied: '반영했어요', gcAppliedN: '새로 만든 일정', gcAppliedU: '고친 일정', gcWriteOff: '달력 쓰기가 아직 꺼져 있어요. 서버 설정(CAMPTEAM_CALENDAR_WRITE=1)을 켜면 반영 버튼이 나타나요.', gcUpdate: '고칠 일정', gcRemoved: '포털에서 지웠지만 구글에는 남아 있는 일정(직접 지워야 해요)', gcSame: '변경 없음', gcOff: '달력이 아직 연결되지 않았어요(미리보기 계산만).',
      glTitle: '용어집 (번역하지 않을 고정 단어)', glAdd: '+ 용어', glHelp: '캠프 이름·직책·고유명사처럼 번역하지 말아야 하거나 번역을 고정할 단어예요. AI 회의록 초안을 만들 때 AI에게 전달돼요. 나중에 번역 기능을 붙일 때도 그대로 쓰여요.', glKo: '한국어', glEn: 'English', glKeep: '그대로 두기(번역 안 함)', glFixed: '이 번역으로 고정', glNotes: '메모', glEmpty: '등록된 용어가 없어요.',
      bkTitle: '백업 · 내보내기', bkHelp: '모든 기록을 한 파일로 내려받아 보관할 수 있어요. 파일 본문(PDF·사진 등)은 포함되지 않고(자료실 저장소에 그대로 있어요), TV 주소 열쇠도 포함되지 않아요. 엑셀로 열 CSV는 표 하나씩 내려받아요.', bkJson: '전체 백업 (JSON)', bkCsv: '이 표만 CSV로',
      auTitle: '변경 기록', auActor: '사람(이메일)', auSearch: '내용 검색', auAll: '모든 종류', edit: '수정', del: '삭제', save: '저장', cancel: '취소', confirmDel: '삭제할까요? (삭제 표시만 되며 복구할 수 있어요)' },
    en: { gcTitle: 'Google Calendar sync (preview)', gcHelp: 'Shows what would be created or changed when team events made in the portal are mirrored to the connected Camp Team Google Calendar. This button writes nothing. Actual writing needs the server setting turned on and a separate admin confirmation. Events deleted in the portal are not removed from Google Calendar automatically.', gcCreate: 'To create', gcApply: 'Apply to Google Calendar', gcApplyAsk: 'This will actually create and update the events shown in the preview in Google Calendar. Events deleted in the portal are not removed from Google. Continue?', gcApplied: 'Applied', gcAppliedN: 'Created', gcAppliedU: 'Updated', gcWriteOff: 'Calendar writing is still off. Turn on the server setting (CAMPTEAM_CALENDAR_WRITE=1) to show the apply button.', gcUpdate: 'To update', gcRemoved: 'Deleted in portal but still in Google (remove manually)', gcSame: 'Unchanged', gcOff: 'Calendar is not connected yet (calculation only).',
      glTitle: 'Glossary (fixed terms)', glAdd: '+ Term', glHelp: 'Camp names, titles and proper nouns that must not be translated or must use a fixed translation. Sent to the AI when drafting minutes and reused when translation is added later.', glKo: 'Korean', glEn: 'English', glKeep: 'Keep as is (do not translate)', glFixed: 'Use this translation', glNotes: 'Notes', glEmpty: 'No terms yet.',
      bkTitle: 'Backup · Export', bkHelp: 'Download all records as one file. File contents (PDFs, photos) are not included (they remain in the file storage) and neither is the TV link key. Download CSV for Excel one table at a time.', bkJson: 'Full backup (JSON)', bkCsv: 'This table as CSV',
      auTitle: 'Change log', auActor: 'Person (email)', auSearch: 'Search details', auAll: 'All types', edit: 'Edit', del: 'Delete', save: 'Save', cancel: 'Cancel', confirmDel: 'Delete this? (It is only marked deleted and can be restored.)' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var TABLES = ['camp_members', 'camp_types', 'camps', 'tasks', 'events', 'checklist_templates', 'checklist_items', 'meetings', 'agenda_items', 'decisions', 'meeting_files', 'meeting_texts', 'files', 'file_versions', 'file_links', 'budget_lines', 'budget_targets', 'notices', 'tv_layout', 'glossary', 'ai_drafts', 'ledger_periods', 'ledger_categories', 'ledger_entries', 'ledger_plan', 'ledger_imports', 'ledger_reconcile', 'ledger_expense_rules', 'ledger_expense_rows', 'calc_scenarios', 'announcements', 'announcement_recipients', 'member_perms', 'member_aliases', 'file_public', 'camp_order', 'space_layout', 'notify_settings', 'notify_prefs', 'mail_log', 'audit_log'];
  var gl = [];

  async function download(path, name) {
    var res = await fetch(path, { headers: { Authorization: 'Bearer ' + CT.token() } }); if (!res.ok) { alert(CT.t('loadFail')); return; }
    var blob = await res.blob(), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 3000);
  }
  async function loadGlossary() {
    gl = (await CT.api('/api/campteam/glossary')).items;
    $('glList').innerHTML = gl.length ? '<table><thead><tr><th>' + esc(CT.t('glKo')) + '</th><th>' + esc(CT.t('glEn')) + '</th><th></th><th></th></tr></thead><tbody>' + gl.map(function (g) { return '<tr><td>' + esc(g.termKo) + '</td><td>' + esc(g.termEn) + '</td><td><span class="chip ' + (g.keep ? 'ok' : 'gray') + '">' + esc(CT.t(g.keep ? 'glKeep' : 'glFixed')) + '</span><br><span class="meta">' + esc(g.notes) + '</span></td><td style="text-align:right;white-space:nowrap"><button class="btn sm" data-ge="' + esc(g.id) + '">' + esc(CT.t('edit')) + '</button> <button class="btn sm danger" data-gd="' + esc(g.id) + '">' + esc(CT.t('del')) + '</button></td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">' + esc(CT.t('glEmpty')) + '</div>';
  }
  function glForm(g) {
    CT.ask(CT.t('glAdd'), '<div class="two"><label>' + esc(CT.t('glKo')) + '<input name="termKo" maxlength="80" value="' + esc(g ? g.termKo : '') + '"></label><label>' + esc(CT.t('glEn')) + '<input name="termEn" maxlength="80" value="' + esc(g ? g.termEn : '') + '"></label></div>' +
      '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" name="keep" value="1" style="width:auto;height:auto"' + (!g || g.keep ? ' checked' : '') + '> ' + esc(CT.t('glKeep')) + '</label><label>' + esc(CT.t('glNotes')) + '<input name="notes" maxlength="200" value="' + esc(g ? g.notes : '') + '"></label>',
      async function (fd) { var body = { termKo: fd.termKo, termEn: fd.termEn, keep: !!fd.keep, notes: fd.notes }; if (g) await CT.api('/api/campteam/glossary?id=' + encodeURIComponent(g.id), { method: 'PATCH', body: body }); else await CT.api('/api/campteam/glossary', { method: 'POST', body: body }); await loadGlossary(); });
  }
  async function loadAudit() {
    var q = new URLSearchParams(); if ($('auEntity').value) q.set('entity', $('auEntity').value); if ($('auActor').value.trim()) q.set('actor', $('auActor').value.trim()); if ($('auQ').value.trim()) q.set('q', $('auQ').value.trim());
    var r = await CT.api('/api/campteam/audit?' + q.toString()), cur = $('auEntity').value;
    $('auEntity').innerHTML = '<option value="">' + esc(CT.t('auAll')) + '</option>' + r.entities.map(function (e) { return '<option' + (e === cur ? ' selected' : '') + '>' + esc(e) + '</option>'; }).join('');
    $('auTable').innerHTML = '<tbody>' + r.items.map(function (a) { return '<tr><td style="white-space:nowrap">' + esc(a.at.slice(0, 16).replace('T', ' ')) + '</td><td>' + esc(a.actor) + '</td><td><span class="chip">' + esc(a.action) + '</span> ' + esc(a.entity) + '</td><td class="meta">' + esc(a.detail) + '</td></tr>'; }).join('') + '</tbody>';
  }
  function init() {
    if (!CT.me || !CT.me.perms.manageMembers || init.done) return; init.done = true; CT.applyI18n();
    $('gcPreview').onclick = async function () {
      $('gcOut').textContent = '…';
      try { var r = await CT.api('/api/campteam/calendar-sync'), p = r.plan, list = function (a) { return a.length ? '<ul style="margin:4px 0 8px 18px;padding:0">' + a.slice(0, 30).map(function (x) { return '<li>' + esc(x.date + ' · ' + x.title) + '</li>'; }).join('') + '</ul>' : '—'; };
        $('gcOut').innerHTML = (r.configured ? '' : '<div class="hintbox" style="margin-bottom:8px">' + esc(CT.t('gcOff')) + '</div>') + '<p><b>' + esc(CT.t('gcCreate')) + '</b> (' + p.creates.length + ')</p>' + list(p.creates) + '<p><b>' + esc(CT.t('gcUpdate')) + '</b> (' + p.updates.length + ')</p>' + list(p.updates) + '<p><b>' + esc(CT.t('gcRemoved')) + '</b> (' + p.removed.length + ')</p>' + list(p.removed) + '<p class="meta">' + esc(CT.t('gcSame')) + ': ' + p.unchanged + '</p>';
        var ab = $('gcApply'); ab.hidden = !(r.configured && r.writeEnabled && (p.creates.length + p.updates.length) > 0);
        if (r.configured && !r.writeEnabled) $('gcOut').insertAdjacentHTML('afterbegin', '<div class="hintbox" style="margin-bottom:8px">' + esc(CT.t('gcWriteOff')) + '</div>');
      } catch (e) { $('gcOut').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
    };
    $('gcApply').onclick = async function () {
      if (!confirm(CT.t('gcApplyAsk'))) return; var b = $('gcApply'); b.disabled = true;
      try { var r = await CT.api('/api/campteam/calendar-sync', { method: 'POST', body: { confirm: true } }); $('gcOut').innerHTML = '<div class="hintbox ok"><b>' + esc(CT.t('gcApplied')) + '</b> · ' + esc(CT.t('gcAppliedN')) + ' ' + r.created + ' · ' + esc(CT.t('gcAppliedU')) + ' ' + r.updated + '</div>'; b.hidden = true; }
      catch (e) { $('gcOut').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; }
      b.disabled = false;
    };
    $('glAdd').onclick = function () { glForm(); };
    $('glList').addEventListener('click', async function (e) { var b = e.target.closest('button'); if (!b) return; if (b.dataset.ge) glForm(gl.filter(function (x) { return x.id === b.dataset.ge; })[0]); else if (b.dataset.gd && confirm(CT.t('confirmDel'))) { try { await CT.api('/api/campteam/glossary?id=' + encodeURIComponent(b.dataset.gd), { method: 'DELETE' }); await loadGlossary(); } catch (err) { alert(err.message); } } });
    $('bkTable').innerHTML = TABLES.map(function (t) { return '<option>' + t + '</option>'; }).join('');
    $('bkJson').onclick = function () { download('/api/campteam/export?format=json', 'campteam-backup.json'); }; $('bkCsv').onclick = function () { download('/api/campteam/export?format=csv&table=' + encodeURIComponent($('bkTable').value), 'campteam-' + $('bkTable').value + '.csv'); };
    var t; ['auEntity'].forEach(function (id) { $(id).onchange = loadAudit; }); ['auActor', 'auQ'].forEach(function (id) { $(id).oninput = function () { clearTimeout(t); t = setTimeout(loadAudit, 300); }; });
    loadGlossary(); loadAudit(); document.addEventListener('ct-lang', function () { CT.applyI18n(); loadGlossary(); loadAudit(); });
  }
  document.addEventListener('ct-ready', init); if (CT.me) init();
})();
