// 회계 장부: 엑셀 가져오기 탭과 엑셀로 내려받기. finance.js 가 먼저 불러와져 있어야 한다.
(function () {
  CT.addDict({
    ko: { impTitle: '엑셀 가져오기', impHelp: '재정 담당이 쓰는 엑셀 파일을 그대로 올리면 돼요. 올릴 때마다 지금 장부와 비교해서 새로 생긴 줄·바뀐 줄만 반영해요. 같은 파일을 다시 올려도 중복되지 않아요.', impHelp2: '엑셀의 「장부」 탭은 거래로, 「목록」 탭은 항목 목록으로, 「예산」 탭은 기간 예산으로 읽어요. 「항목별합계」 탭은 자동 계산이라 읽지 않아요.',
      impFile: '엑셀 파일 (.xlsx)', impOr: '또는 엑셀에서 장부 표를 복사해 붙여넣기', impPaste: '날짜 · 구분 · 금액 · 계 · 항목 · 내용 · 비고 …', impRead: '붙여넣은 내용 읽기', impReading: '파일을 읽는 중…', impDetected: '읽은 내용', impTabLedger: '장부 탭', impTabLists: '목록 탭', impTabPlan: '예산 탭', impLines: '줄', impIncl: '이번에 가져올 것', impInclLedger: '거래(장부)', impInclLists: '항목 목록', impInclPlan: '기간 예산 (파일에 있는 항목만 바꿈)', impCompare: '비교하기 (아직 저장 안 돼요)', impNoLedger: '장부 표를 찾지 못했어요. 날짜·구분·금액·항목 머리글이 있는 표인지 확인해 주세요.',
      pvNew: '새 줄', pvChanged: '바뀐 줄', pvConflict: '충돌', pvSame: '그대로', pvMissing: '파일에 없는 줄', pvSkipped: '건너뜀', pvIdMissing: '포털에 없는 ID', pvNone: '바뀐 것이 없어요. 파일과 장부가 같아요.',
      pvAddTitle: '새로 들어올 줄', pvChgTitle: '바뀌는 줄 (포털 → 엑셀)', pvMissTitle: '엑셀 파일에는 없는 줄', pvMissHelp: '엑셀에서 지웠거나 다른 파일일 수 있어요. 자동으로 지우지 않고, 체크한 줄만 삭제 표시해요(복구 가능).', pvSkipTitle: '건너뛴 줄', pvIdTitle: '포털에 없는 ID의 줄 (포털에서 이미 지운 줄일 수 있어요. 새로 만들지 않았어요)', pvCatTitle: '항목 목록에 새로 추가될 항목', pvCatHelp: '체크를 끄면 이 항목을 쓰는 줄은 건너뛰어요.', pvListTitle: '목록 탭에서 추가될 항목', pvPlanTitle: '기간 예산에서 바뀌는 항목', pvPlanOn: '기간 예산도 반영하기',
      pvKeepPortal: '포털 값 유지', pvTakeExcel: '엑셀 값으로', pvConflictNote: '포털에서 직접 고친 줄이에요', pvCarryDup: '이전 기간에서 이미 넘어온 이월금과 겹칠 수 있어요', pvDateGuess: '날짜가 없어서 앞 줄(또는 기간 시작일) 날짜를 썼어요', pvNewCat: '새 항목', pvRow: '엑셀 줄',
      fDate: '날짜', fKind: '구분', fAmount: '금액', fCategory: '항목', fDescription: '내용', fNote: '비고', income: '수입', expense: '지출',
      impApply: '이대로 반영하기', impApplying: '반영하는 중…', impDone: '반영했어요', impDoneLine: '추가', impDoneChg: '수정', impDoneDel: '삭제 표시', impDoneKept: '포털 값 유지', impDonePlan: '예산 항목', impDoneCat: '새 항목', impBack: '장부 보기', impHistory: '최근 가져오기 기록',
      exportXlsx: '엑셀로 내려받기', exportHelp: '지금 장부를 기존 엑셀과 같은 모양(장부·항목별합계·예산·목록 탭)으로 내려받아요. 숨은 ID 열이 들어 있어서, 엑셀에서 고쳐 다시 올리면 정확히 같은 줄로 인식해요.', exportWorking: '만드는 중…', exportDone: '내려받았어요.' },
    en: { impTitle: 'Excel import', impHelp: 'Upload the Excel file your finance person already uses. Each time, it is compared with the current ledger and only new or changed rows are applied. Uploading the same file twice never duplicates anything.', impHelp2: 'The "장부" tab is read as entries, "목록" as the category list, "예산" as the period budget. "항목별합계" is auto-calculated and ignored.',
      impFile: 'Excel file (.xlsx)', impOr: 'or copy the ledger table from Excel and paste it', impPaste: 'Date · Type · Amount · Balance · Category · Description · Note …', impRead: 'Read pasted content', impReading: 'Reading file…', impDetected: 'What was read', impTabLedger: 'Ledger tab', impTabLists: 'List tab', impTabPlan: 'Budget tab', impLines: 'rows', impIncl: 'Import this time', impInclLedger: 'Entries (ledger)', impInclLists: 'Category list', impInclPlan: 'Period budget (only items in the file)', impCompare: 'Compare (nothing is saved yet)', impNoLedger: 'No ledger table found. Check the table has Date / Type / Amount / Category headers.',
      pvNew: 'New', pvChanged: 'Changed', pvConflict: 'Conflicts', pvSame: 'Unchanged', pvMissing: 'Not in file', pvSkipped: 'Skipped', pvIdMissing: 'Unknown ID', pvNone: 'Nothing changed. The file matches the ledger.',
      pvAddTitle: 'New rows', pvChgTitle: 'Changed rows (portal → Excel)', pvMissTitle: 'Rows missing from the Excel file', pvMissHelp: 'They may have been deleted in Excel, or this is a different file. Nothing is deleted automatically; only checked rows are marked deleted (restorable).', pvSkipTitle: 'Skipped rows', pvIdTitle: 'Rows with an ID unknown to the portal (maybe deleted in the portal; not created)', pvCatTitle: 'New categories that will be added to the list', pvCatHelp: 'Untick to skip rows that use them.', pvListTitle: 'Categories to add from the list tab', pvPlanTitle: 'Period budget changes', pvPlanOn: 'Also apply the period budget',
      pvKeepPortal: 'Keep portal value', pvTakeExcel: 'Use Excel value', pvConflictNote: 'Edited directly in the portal', pvCarryDup: 'May duplicate the carry-over already brought from the previous period', pvDateGuess: 'No date — used the previous row’s (or period start) date', pvNewCat: 'new category', pvRow: 'Excel row',
      fDate: 'Date', fKind: 'Type', fAmount: 'Amount', fCategory: 'Category', fDescription: 'Description', fNote: 'Note', income: 'Income', expense: 'Expense',
      impApply: 'Apply as shown', impApplying: 'Applying…', impDone: 'Applied', impDoneLine: 'added', impDoneChg: 'changed', impDoneDel: 'marked deleted', impDoneKept: 'portal values kept', impDonePlan: 'budget items', impDoneCat: 'new categories', impBack: 'View ledger', impHistory: 'Recent imports',
      exportXlsx: 'Download as Excel', exportHelp: 'Downloads the current ledger in the same layout as your Excel (ledger, totals, budget, list tabs). A hidden ID column lets edits made in Excel be matched to the exact same rows on re-upload.', exportWorking: 'Building…', exportDone: 'Downloaded.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var F = function () { return window.FIN; }, KRW = function (n) { return CT.money(n, 'KRW'); };
  var I = { detected: null, fileName: '', busy: '', preview: null, result: null, history: [], include: { ledger: true, lists: true, plan: true }, error: '' };
  var KIND = function (k) { return CT.t(k === 'income' ? 'income' : 'expense'); };

  async function load() { try { I.history = (await F().api('ledger-import?periodId=' + encodeURIComponent(F().S.pid))).items; } catch (e) { I.history = []; } }

  function html() {
    var p = F().cur(), h = '<section class="card"><h2>' + esc(CT.t('impTitle')) + '</h2><div class="hintbox">' + esc(CT.t('impHelp')) + '<br>' + esc(CT.t('impHelp2')) + '</div>';
    if (!p || p.status !== 'open') return h + '<div class="hintbox" style="margin-top:10px">' + esc(CT.t('closedNote')) + '</div></section>';
    h += '<div class="impbox"><label class="filebtn"><span>' + esc(CT.t('impFile')) + '</span><input type="file" id="impFile" accept=".xlsx,.xlsm"></label><span class="hint" id="impBusy">' + esc(I.busy) + '</span></div>' +
      '<details style="margin-top:10px"' + (I.detected && I.detected.fromPaste ? ' open' : '') + '><summary style="cursor:pointer;color:var(--blue-lt);font-size:13px">' + esc(CT.t('impOr')) + '</summary><textarea id="impText" class="big" placeholder="' + esc(CT.t('impPaste')) + '" style="margin-top:8px"></textarea><button class="btn sm" id="impTextBtn" style="margin-top:6px">' + esc(CT.t('impRead')) + '</button></details>';
    if (I.error) h += '<div class="err" style="margin-top:12px">' + esc(I.error) + '</div>';
    if (I.detected) h += detectedHtml();
    h += '</section>';
    if (I.result) h += resultHtml();
    else if (I.preview) h += previewHtml();
    h += '<section class="card" style="margin-top:14px"><h2>' + esc(CT.t('exportXlsx')) + '</h2><div class="hintbox">' + esc(CT.t('exportHelp')) + '</div><div style="margin-top:10px"><button class="btn" data-a="exportXlsx">' + esc(CT.t('exportXlsx')) + '</button> <span class="hint" id="expMsg"></span></div></section>';
    if (I.history.length) h += '<section class="card" style="margin-top:14px"><h2>' + esc(CT.t('impHistory')) + '</h2>' + I.history.map(function (x) { var s = x.summary || {}; return '<div class="row"><div>' + esc(x.fileName || '—') + '<small>' + esc((x.createdAt || '').replace('T', ' ').slice(0, 16)) + ' · ' + esc(String(x.createdBy || '').split('@')[0]) + '</small></div><span class="tag t-none">+' + (s.added || 0) + ' ~' + (s.changed || 0) + ' −' + (s.removed || 0) + '</span></div>'; }).join('') + '</section>';
    return h;
  }
  function detectedHtml() {
    var d = I.detected, ok = !!(d.ledger && d.ledger.rows.length);
    var line = function (key, label, text, enabled) { return '<label class="chk"><input type="checkbox" data-inc="' + key + '"' + (I.include[key] && enabled ? ' checked' : '') + (enabled ? '' : ' disabled') + '> <b>' + esc(label) + '</b> <span class="hint">' + esc(text) + '</span></label>'; };
    var h = '<div class="hintbox" style="margin-top:14px"><b>' + esc(CT.t('impDetected')) + '</b>' + (I.fileName ? ' — ' + esc(I.fileName) : '') + '</div><div style="margin-top:8px">' +
      line('ledger', CT.t('impInclLedger'), d.ledger ? d.ledger.name + ' · ' + d.ledger.rows.length + CT.t('impLines') : '—', ok) +
      line('lists', CT.t('impInclLists'), d.lists ? d.lists.name + ' · ' + CT.t('income') + ' ' + d.lists.income.length + ' / ' + CT.t('expense') + ' ' + d.lists.expense.length : '—', !!d.lists) +
      line('plan', CT.t('impInclPlan'), d.plan ? d.plan.name + ' · ' + d.plan.items.length + CT.t('impLines') : '—', !!(d.plan && d.plan.items.length)) + '</div>';
    if (!ok) h += '<div class="err" style="margin-top:8px">' + esc(CT.t('impNoLedger')) + '</div>';
    h += '<div style="margin-top:12px"><button class="btn pri" id="impCompare"' + (I.busy ? ' disabled' : '') + '>' + esc(CT.t('impCompare')) + '</button></div>';
    return h;
  }

  // ── 미리보기 ──
  function fieldText(f, v) { if (f === 'amount') return KRW(v); if (f === 'kind') return KIND(v); return v === '' || v == null ? '—' : String(v); }
  function previewHtml() {
    var pv = I.preview, s = pv.summary, h = '<section class="card" style="margin-top:14px"><h2>' + esc(CT.t('impCompare').replace(/\s*\(.*\)/, '')) + '</h2>' +
      '<div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(110px,1fr));margin-bottom:12px">' + tile(CT.t('pvNew'), s.added) + tile(CT.t('pvChanged'), s.changed) + tile(CT.t('pvConflict'), s.conflicts, s.conflicts ? 'late' : '') + tile(CT.t('pvSame'), s.unchanged) + tile(CT.t('pvMissing'), s.missing) + tile(CT.t('pvSkipped'), s.skipped) + '</div>';
    var nothing = !s.added && !s.changed && !s.missing && !s.newCategories && !s.catsAdd && !s.planChanges && !s.skipped && !s.idMissing;
    if (nothing) return h + '<div class="hintbox">' + esc(CT.t('pvNone')) + '</div></section>';
    if (pv.added.length) h += '<details open><summary class="pvh">' + esc(CT.t('pvAddTitle')) + ' (' + pv.added.length + ')</summary><div style="overflow:auto"><table class="vtab"><thead><tr><th></th><th>' + esc(CT.t('pvRow')) + '</th><th>' + esc(CT.t('fDate')) + '</th><th>' + esc(CT.t('fKind')) + '</th><th>' + esc(CT.t('fCategory')) + '</th><th>' + esc(CT.t('fDescription')) + '</th><th style="text-align:right">' + esc(CT.t('fAmount')) + '</th></tr></thead><tbody>' +
      pv.added.map(function (u) { var fl = u.flags || {}; return '<tr><td><input type="checkbox" data-add="' + u.row + '"' + (fl.carryDup ? '' : ' checked') + '></td><td>' + u.row + '</td><td>' + esc(u.entryDate) + (fl.dateGuessed ? ' <span class="tag t-soon" title="' + esc(CT.t('pvDateGuess')) + '">?</span>' : '') + '</td><td>' + esc(KIND(u.kind)) + '</td><td>' + esc(u.category) + (fl.newCategory ? ' <span class="tag t-soon">' + esc(CT.t('pvNewCat')) + '</span>' : '') + '</td><td>' + esc(u.description) + (fl.carryDup ? '<small style="display:block;color:var(--accent)">' + esc(CT.t('pvCarryDup')) + '</small>' : '') + '</td><td style="text-align:right;font-weight:700">' + esc(KRW(u.amount)) + '</td></tr>'; }).join('') + '</tbody></table></div></details>';
    if (pv.changed.length) h += '<details open><summary class="pvh">' + esc(CT.t('pvChgTitle')) + ' (' + pv.changed.length + ')</summary>' + pv.changed.map(function (c) {
      return '<div class="row" style="align-items:flex-start"><div style="flex:1"><label class="chk"><input type="checkbox" data-chg="' + c.row.row + '"' + (c.conflict ? '' : ' checked') + '> <b>' + esc(c.after.description || c.after.category) + '</b> <span class="hint">' + esc(CT.t('pvRow')) + ' ' + c.row.row + '</span></label>' +
        c.fields.map(function (f) { return '<small style="display:block;margin-left:24px">' + esc(CT.t({ entryDate: 'fDate', kind: 'fKind', amount: 'fAmount', category: 'fCategory', description: 'fDescription', note: 'fNote' }[f])) + ': <s>' + esc(fieldText(f, c.before[f])) + '</s> → <b>' + esc(fieldText(f, c.after[f])) + '</b></small>'; }).join('') + '</div>' +
        (c.conflict ? '<div style="font-size:12px"><span class="tag t-late">' + esc(CT.t('pvConflictNote')) + '</span><label class="chk"><input type="radio" name="rs-' + esc(c.id) + '" value="portal" checked> ' + esc(CT.t('pvKeepPortal')) + '</label><label class="chk"><input type="radio" name="rs-' + esc(c.id) + '" value="excel" data-resolve="' + esc(c.id) + '" data-row="' + c.row.row + '"> ' + esc(CT.t('pvTakeExcel')) + '</label></div>' : '') + '</div>'; }).join('') + '</details>';
    if (pv.missing.length) h += '<details><summary class="pvh">' + esc(CT.t('pvMissTitle')) + ' (' + pv.missing.length + ')</summary><div class="hintbox" style="margin:6px 0">' + esc(CT.t('pvMissHelp')) + '</div>' + pv.missing.map(function (m) { return '<label class="chk" style="display:flex"><input type="checkbox" data-rm="' + esc(m.id) + '"> ' + esc(m.entryDate) + ' · ' + esc(m.category) + ' · ' + esc(m.description) + ' · <b>' + esc(KRW(m.amount)) + '</b></label>'; }).join('') + '</details>';
    if (pv.newCategories.length) h += '<details open><summary class="pvh">' + esc(CT.t('pvCatTitle')) + '</summary><label class="chk"><input type="checkbox" id="pvAddCats" checked> ' + esc(pv.newCategories.map(function (c) { return KIND(c.kind) + ': ' + c.name; }).join(', ')) + '</label><div class="hint">' + esc(CT.t('pvCatHelp')) + '</div></details>';
    if (pv.catsAdd.length) h += '<details open><summary class="pvh">' + esc(CT.t('pvListTitle')) + '</summary><div>' + esc(pv.catsAdd.map(function (c) { return KIND(c.kind) + ': ' + c.name; }).join(', ')) + '</div></details>';
    if (pv.plan.changes.length) h += '<details open><summary class="pvh">' + esc(CT.t('pvPlanTitle')) + ' (' + pv.plan.changes.length + ')</summary><label class="chk"><input type="checkbox" id="pvPlan" checked> ' + esc(CT.t('pvPlanOn')) + '</label><table><tbody>' + pv.plan.changes.map(function (c) { return '<tr><td>' + esc(c.category) + '</td><td style="text-align:right"><s>' + (c.from == null ? '—' : esc(KRW(c.from))) + '</s> → <b>' + esc(KRW(c.to)) + '</b></td></tr>'; }).join('') + '</tbody></table></details>';
    if (pv.skipped.length) h += '<details><summary class="pvh">' + esc(CT.t('pvSkipTitle')) + ' (' + s.skipped + ')</summary>' + pv.skipped.map(function (x) { return '<div class="row"><div>' + esc(CT.t('pvRow')) + ' ' + (x.row == null ? '?' : x.row) + (x.raw && (x.raw.description || x.raw.category) ? ' · ' + esc(x.raw.description || x.raw.category) : '') + '</div><small style="color:var(--accent)">' + esc(x.reason) + '</small></div>'; }).join('') + '</details>';
    if (pv.idMissing.length) h += '<details><summary class="pvh">' + esc(CT.t('pvIdTitle')) + ' (' + s.idMissing + ')</summary>' + pv.idMissing.map(function (x) { return '<div class="row"><div>' + esc(CT.t('pvRow')) + ' ' + x.row + ' · ' + esc(x.description || x.category) + '</div><small>' + esc(KRW(x.amount)) + '</small></div>'; }).join('') + '</details>';
    h += '<div style="margin-top:14px"><button class="btn pri" id="impApply"' + (I.busy ? ' disabled' : '') + '>' + esc(CT.t('impApply')) + '</button> <span class="hint" id="impMsg"></span></div></section>';
    return h;
  }
  function tile(label, n, cls) { return '<div class="stat ' + (cls || '') + '"><label>' + esc(label) + '</label><strong>' + n + '</strong></div>'; }
  function resultHtml() {
    var r = I.result;
    return '<section class="card" style="margin-top:14px"><h2>' + esc(CT.t('impDone')) + '</h2><div class="money"><div><label>' + esc(CT.t('impDoneLine')) + '</label><strong>' + r.added + '</strong></div><div><label>' + esc(CT.t('impDoneChg')) + '</label><strong>' + r.changed + '</strong></div><div><label>' + esc(CT.t('impDoneDel')) + '</label><strong>' + r.removed + '</strong></div>' + (r.keptPortal ? '<div><label>' + esc(CT.t('impDoneKept')) + '</label><strong>' + r.keptPortal + '</strong></div>' : '') + (r.plan ? '<div><label>' + esc(CT.t('impDonePlan')) + '</label><strong>' + r.plan + '</strong></div>' : '') + (r.categories ? '<div><label>' + esc(CT.t('impDoneCat')) + '</label><strong>' + r.categories + '</strong></div>' : '') + '</div><div style="margin-top:12px"><button class="btn pri" data-go="ledger">' + esc(CT.t('impBack')) + '</button></div></section>';
  }

  // ── 동작 ──
  function bind() {
    var f = $('impFile'); if (f) f.onchange = function () { if (f.files[0]) readFile(f.files[0]); };
    var tb = $('impTextBtn'); if (tb) tb.onclick = function () { readText($('impText').value); };
    var body = $('fnBody');
    body.onchange = function (e) { var inc = e.target.dataset && e.target.dataset.inc; if (inc) I.include[inc] = e.target.checked; };
    body.onclick = async function (e) {
      if (e.target.closest('[data-go]')) { F().S.tab = 'ledger'; I.result = null; I.preview = null; await F().loadPeriods(); await F().loadTab(); F().render(); return; }
      if (e.target.closest('#impCompare')) compare(); else if (e.target.closest('#impApply')) apply();
    };
  }
  function setBusy(t) { I.busy = t; var b = $('impBusy'); if (b) b.textContent = t; ['impCompare', 'impApply'].forEach(function (id) { var x = $(id); if (x) x.disabled = !!t; }); }
  async function readFile(file) {
    I.error = ''; I.preview = null; I.result = null; I.fileName = file.name; setBusy(CT.t('impReading'));
    try { var book = await XlsxLite.read(await file.arrayBuffer()); I.detected = LedgerParse.detect(book); I.include = { ledger: true, lists: true, plan: true }; }
    catch (e) { I.detected = null; I.error = e.message; }
    setBusy(''); F().render();
  }
  function readText(t) {
    I.error = ''; I.preview = null; I.result = null; I.fileName = '(붙여넣기)';
    var rows = LedgerParse.parseText(t), led = LedgerParse.parseLedger(rows);
    I.detected = { ledger: { name: '붙여넣기', rows: led }, lists: null, plan: null, others: [], fromPaste: true }; I.include = { ledger: true, lists: false, plan: false }; F().render();
  }
  function payload() {
    var d = I.detected, b = { periodId: F().S.pid, rows: I.include.ledger && d.ledger ? d.ledger.rows : [], fileName: I.fileName };
    if (I.include.lists && d.lists) b.categories = { income: d.lists.income, expense: d.lists.expense };
    if (I.include.plan && d.plan) b.plan = d.plan.items;
    return b;
  }
  async function compare() {
    I.error = ''; I.result = null; setBusy(CT.t('impReading'));
    try { var b = payload(); b.action = 'preview'; I.preview = await F().api('ledger-import', { method: 'POST', body: b }); I.lastPayload = payload(); }
    catch (e) { I.error = e.message; I.preview = null; }
    setBusy(''); F().render();
  }
  async function apply() {
    var o = { add: true, change: true, skipRows: [], resolve: {}, removeIds: [], addCategories: !$('pvAddCats') || $('pvAddCats').checked, planMode: $('pvPlan') && !$('pvPlan').checked ? 'none' : 'merge' };
    document.querySelectorAll('[data-add]').forEach(function (c) { if (c.checked) { var u = I.preview.added.filter(function (x) { return String(x.row) === c.dataset.add; })[0]; if (u && u.flags && u.flags.carryDup) o.allowCarryDup = true; } else o.skipRows.push(+c.dataset.add); });
    document.querySelectorAll('[data-chg]').forEach(function (c) { if (!c.checked) o.skipRows.push(+c.dataset.chg); });
    document.querySelectorAll('[data-resolve]').forEach(function (r) { if (r.checked) o.resolve[r.dataset.resolve] = 'excel'; });
    document.querySelectorAll('[data-rm]').forEach(function (c) { if (c.checked) o.removeIds.push(c.dataset.rm); });
    setBusy(CT.t('impApplying'));
    try { var b = payload(); b.action = 'apply'; b.options = o; var r = await F().api('ledger-import', { method: 'POST', body: b }); I.result = r.result; I.preview = null; await F().loadPeriods(); await load(); }
    catch (e) { I.error = e.message; }
    setBusy(''); F().render();
  }

  // ── 엑셀로 내려받기: 기존 엑셀과 같은 모양 ──
  async function exportXlsx() {
    var S = F().S, p = F().cur(), msg = $('expMsg'); if (msg) msg.textContent = CT.t('exportWorking');
    try {
      var qs = encodeURIComponent(S.pid), all = (await F().api('ledger?periodId=' + qs)).items, cats = await F().api('ledger-categories'), plan = (await F().api('ledger-plan?periodId=' + qs)).items, sum = await F().api('ledger-summary?periodId=' + qs);
      var book = buildBook(p, all, cats, plan, sum), bytes = XlsxLite.write(book), name = (p.name + '_장부_' + F().today().replace(/-/g, '')).replace(/[\\/:*?"<>|]/g, '_') + '.xlsx';
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      if (S.perms.moneyWrite && p.status === 'open') await F().api('ledger-import', { method: 'POST', body: { action: 'markExported', periodId: S.pid } });
      msg = $('expMsg'); if (msg) msg.textContent = CT.t('exportDone');
    } catch (e) { msg = $('expMsg'); if (msg) { msg.textContent = e.message; msg.style.color = 'var(--accent)'; } else alert(e.message); }
  }
  function buildBook(p, entries, cats, plan, sum) {
    var K = function (k) { return k === 'income' ? '수입' : '지출'; };
    // 장부
    var led = [[{ b: p.name + ' 회계장부' }], [], ['날짜', '구분', '금액', '계', '항목', '내용', '비고', 'ID']];
    entries.forEach(function (e, i) { var n = 4 + i; led.push([{ d: e.entryDate }, K(e.kind), { n: e.amount }, { f: i === 0 ? 'IF(C4="","",IF(B4="수입",C4,-C4))' : 'IF(C' + n + '="","",D' + (n - 1) + '+IF(B' + n + '="수입",C' + n + ',-C' + n + '))' }, e.category, e.description, e.note, e.source === 'carry' ? '' : e.id]); });
    // 항목별합계 (엑셀 SUMIFS 수식)
    var exp = sum.byCategory.filter(function (c) { return c.kind === 'expense'; }).map(function (c) { return c.category; }), inc = sum.byCategory.filter(function (c) { return c.kind === 'income'; }).map(function (c) { return c.category; });
    var tot = [[], [null, '지출 항목', '지출 합계', '수입 항목', '수입 합계']], rows = Math.max(exp.length, inc.length);
    for (var i = 0; i < rows; i++) { var n = 3 + i; tot.push([null, exp[i] || null, exp[i] ? { f: 'SUMIFS(장부!$C:$C, 장부!$B:$B, "지출", 장부!$E:$E, B' + n + ')' } : null, inc[i] || null, inc[i] ? { f: 'SUMIFS(장부!$C:$C, 장부!$B:$B, "수입", 장부!$E:$E, D' + n + ')' } : null]); }
    var last = 2 + rows, tr = last + 1; tot.push([null, '총 합', { f: 'SUM(C3:C' + last + ')' }, '총 합', { f: 'SUM(E3:E' + last + ')' }]); tot.push([]); tot.push([null, null, null, '수입-지출', { f: 'E' + tr + '-C' + tr }]);
    // 예산 (남은 예산 = 예산 - 실제)
    var pm = {}; plan.forEach(function (x) { pm[x.kind + '|' + x.category] = x.amount; });
    var bud = [[{ b: p.name + ' 예산' }], []], bi = 3;
    exp.forEach(function (c, i) { bud.push([c, { n: pm['expense|' + c] || 0 }, { f: 'B' + bi + '-항목별합계!C' + (3 + i) }]); bi++; });
    bud.push(['합계', { f: 'SUM(B3:B' + (bi - 1) + ')' }, { f: 'SUM(C3:C' + (bi - 1) + ')' }]); bi++;
    var incPlan = inc.filter(function (c) { return pm['income|' + c]; });
    if (incPlan.length) { bud.push([]); bi++; incPlan.forEach(function (c) { bud.push([c, { n: pm['income|' + c] }, { f: '항목별합계!E' + (3 + inc.indexOf(c)) + '-B' + bi }, '수입']); bi++; }); }
    // 목록
    var act = function (k) { return ((cats[k]) || []).filter(function (c) { return c.active; }).map(function (c) { return c.name; }); }, ai = act('income'), ae = act('expense'), lst = [['구분', null, '수입항목', null, '지출항목'], ['수입', null, ai[0] || null, null, ae[0] || null], ['지출', null, ai[1] || null, null, ae[1] || null]];
    for (var k = 2; k < Math.max(ai.length, ae.length); k++) lst.push([null, null, ai[k] || null, null, ae[k] || null]);
    return { sheets: [{ name: '장부', rows: led, cols: [12, 8, 14, 14, 16, 36, 26, 38], hiddenCols: [7] }, { name: '항목별합계', rows: tot, cols: [3, 16, 14, 16, 14] }, { name: '예산', rows: bud, cols: [18, 14, 14, 8] }, { name: '목록', rows: lst, cols: [8, 3, 14, 3, 18] }] };
  }

  window.FinImport = { html: html, bind: bind, load: load, exportXlsx: exportXlsx, buildBook: buildBook };
})();
