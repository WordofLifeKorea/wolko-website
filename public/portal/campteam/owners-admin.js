/* 설정 화면(관리자): 담당자 이름 관리(기본 이름 · 새 이름 확인 · 합치기)와 업무 제목 번역 */
(function () {
  CT.addDict({
    ko: { onTitle: '업무 담당자 이름', onHelp: '업무 추가 창의 담당자 목록에 기본으로 나올 이름이에요. 팀 명단에 있는 사람은 자동으로 나오니, 명단에 없는 팀 이름(예: Media Team)이나 외부 이름만 여기에 추가하면 돼요. 팀원이 목록에 없는 이름을 새로 적으면 아래 「확인이 필요한 이름」에 올라와요.',
      onPh: '기본으로 넣을 이름 (예: Media Team)', onAdd: '+ 이름 추가', onPendingH: '확인이 필요한 새 이름', onBy: '추가한 사람', onApprove: '새 담당자로 인정', onMerge: '기존 이름과 합치기', onMergePick: '어느 이름과 합칠까요?', onMergeGo: '합치기', onDefaults: '기본 이름', onRemove: '빼기', onNone: '아직 없어요', onDone: '처리했어요', onMergedN: '업무에서 바꾼 개수: ', onConfirmRemove: '목록에서 뺄까요? (이미 업무에 쓰인 이름은 그대로 남아요)', onMergedH: '합친 이름 (같은 이름을 쓰면 자동으로 바뀌어요)', pendingNow: '확인할 새 담당자 이름이 ',
      trTitle: '업무 제목 번역', trHelp: '새로 쓰거나 고친 업무 제목은 저장할 때 자동으로 한국어↔영어 번역돼요. 이미 있던 업무(예: 영어로 가져온 체크리스트)는 아래 버튼으로 한 번에 번역해요 (한 번에 최대 40개 · 남아 있으면 다시 누르세요). 화면 언어(한국어/English)에 맞는 제목이 보이고, 번역이 없으면 원래 제목이 보여요. 용어집의 「그대로 두기」 단어는 번역하지 않아요. 번역에는 AI 사용량이 조금 들어요.',
      trRun: '번역 안 된 업무 번역하기', trLeft: '번역이 아직 없는 업무: ', trAllDone: '모든 업무가 번역돼 있어요', trOff: '번역 기능이 아직 켜지지 않았어요 (서버에 Claude API 키가 필요해요).', trRunning: '번역하는 중…', trDone: '이번에 번역한 개수: ' },
    en: { onTitle: 'Task owner names', onHelp: 'Names that appear by default in the owner list when adding a task. People on the team roster appear automatically, so only add team names (e.g. Media Team) or outside names here. When a member types a name that is not in the list, it shows up below under “Names to review”.',
      onPh: 'Default name (e.g. Media Team)', onAdd: '+ Add name', onPendingH: 'New names to review', onBy: 'Added by', onApprove: 'Accept as new owner', onMerge: 'Merge into existing name', onMergePick: 'Merge into which name?', onMergeGo: 'Merge', onDefaults: 'Default names', onRemove: 'Remove', onNone: 'None yet', onDone: 'Done', onMergedN: 'Tasks updated: ', onConfirmRemove: 'Remove from the list? (Names already used in tasks stay.)', onMergedH: 'Merged names (typing them again is converted automatically)', pendingNow: 'New owner names to review: ',
      trTitle: 'Task title translation', trHelp: 'Task titles you create or edit are translated Korean↔English automatically when saved. For existing tasks (e.g. the checklist imported in English) use the button below to translate them in bulk (up to 40 at a time — press again if some remain). The title in the page language is shown; if there is no translation the original is shown. Glossary “keep” words are not translated. Translation uses a little AI usage.',
      trRun: 'Translate untranslated tasks', trLeft: 'Tasks without translation: ', trAllDone: 'All tasks are translated', trOff: 'Translation is not turned on yet (the server needs a Claude API key).', trRunning: 'Translating…', trDone: 'Translated this time: ' },
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, D = null;

  async function loadOwners() {
    D = await CT.api('/api/campteam/owners'); var pend = D.pending || [], opts = (D.options || []).map(function (o) { return o.name; });
    $('onPending').innerHTML = pend.length ? '<div class="hintbox" style="border-color:#e8c53a;background:#fff8dd"><b>' + esc(CT.t('onPendingH')) + ' (' + pend.length + ')</b>' + pend.map(function (p) {
      return '<div class="row" style="align-items:center;gap:8px;flex-wrap:wrap"><div><b>' + esc(p.name) + '</b><small>' + esc(CT.t('onBy')) + ': ' + esc(p.createdBy || '—') + '</small></div><div class="actions"><button class="btn sm pri" data-ap="' + esc(p.key) + '">' + esc(CT.t('onApprove')) + '</button><button class="btn sm" data-mg="' + esc(p.key) + '">' + esc(CT.t('onMerge')) + '</button></div></div>'; }).join('') + '</div>' : '';
    $('onList').innerHTML = '<div style="font:700 12px var(--f-body);color:var(--mid);margin-bottom:6px">' + esc(CT.t('onDefaults')) + '</div>' + ((D.defaults || []).length ? (D.defaults || []).map(function (d) { return '<span class="otag" style="margin:0 6px 6px 0;display:inline-flex">' + esc(d.name) + '<button type="button" data-rm="' + esc(d.key) + '" aria-label="' + esc(CT.t('onRemove')) + '" style="border:0;background:rgba(0,0,0,.09);width:18px;height:18px;border-radius:50%;margin-left:4px;cursor:pointer">×</button></span>'; }).join('') : '<span class="hint">' + esc(CT.t('onNone')) + '</span>') +
      ((D.merged || []).length ? '<div style="font:700 12px var(--f-body);color:var(--mid);margin:10px 0 4px">' + esc(CT.t('onMergedH')) + '</div>' + D.merged.map(function (m) { return '<div class="hint">' + esc(m.name) + ' → ' + esc(m.mergedInto) + '</div>'; }).join('') : '');
    D._opts = opts; $('ownerSec').hidden = false;
  }
  function mergeForm(key) {
    var p = (D.pending || []).filter(function (x) { return x.key === key; })[0]; if (!p) return;
    CT.ask(CT.t('onMerge') + ': ' + p.name, '<label>' + esc(CT.t('onMergePick')) + '<select name="into">' + D._opts.filter(function (o) { return o.toLowerCase() !== p.name.toLowerCase(); }).map(function (o) { return '<option>' + esc(o) + '</option>'; }).join('') + '</select></label>',
      async function (fd) { var r = await CT.api('/api/campteam/owners?key=' + encodeURIComponent(key), { method: 'PATCH', body: { action: 'merge', into: fd.into } }); await loadOwners(); alert(CT.t('onDone') + ' · ' + CT.t('onMergedN') + r.changed); }, { saveLabel: CT.t('onMergeGo') });
  }
  async function loadTr() {
    try {
      var r = await CT.api('/api/campteam/translate-tasks'); $('trSec').hidden = false;
      $('trRun').disabled = !r.configured; $('trStat').textContent = !r.configured ? CT.t('trOff') : (r.untranslated ? CT.t('trLeft') + r.untranslated : CT.t('trAllDone'));
    } catch (e) { /* 번역 칸은 숨김 */ }
  }
  function init() {
    if (!CT.me || !CT.me.perms.manageMembers || init.done) return; init.done = true; CT.applyI18n();
    loadOwners().catch(function () { /* 0020 적용 전에는 숨김 */ }); loadTr();
    $('onForm').onsubmit = async function (e) { e.preventDefault(); var n = $('onName').value.trim(); if (!n) return; $('onErr').hidden = true; try { await CT.api('/api/campteam/owners', { method: 'POST', body: { name: n } }); $('onName').value = ''; await loadOwners(); } catch (err) { $('onErr').textContent = err.message; $('onErr').hidden = false; } };
    $('ownerSec').addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      try {
        if (b.dataset.ap) { await CT.api('/api/campteam/owners?key=' + encodeURIComponent(b.dataset.ap), { method: 'PATCH', body: { action: 'approve' } }); await loadOwners(); }
        else if (b.dataset.mg) mergeForm(b.dataset.mg);
        else if (b.dataset.rm && confirm(CT.t('onConfirmRemove'))) { await CT.api('/api/campteam/owners?key=' + encodeURIComponent(b.dataset.rm), { method: 'DELETE' }); await loadOwners(); }
      } catch (err) { alert(err.message); }
    });
    $('trRun').onclick = async function () {
      var b = $('trRun'); b.disabled = true; $('trStat').textContent = CT.t('trRunning');
      try { var r = await CT.api('/api/campteam/translate-tasks', { method: 'POST', body: {} }); $('trStat').textContent = CT.t('trDone') + r.translated + (r.remaining ? ' · ' + CT.t('trLeft') + r.remaining : ' · ' + CT.t('trAllDone')); }
      catch (err) { $('trStat').textContent = err.message; }
      b.disabled = false;
    };
    document.addEventListener('ct-lang', function () { CT.applyI18n(); if (D) loadOwners(); loadTr(); });
  }
  document.addEventListener('ct-ready', init); if (CT.me) init();
})();
