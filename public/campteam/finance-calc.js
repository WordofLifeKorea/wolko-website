// 회계 장부: 예산 계산기 탭. 계산 핵심은 calc-core.js(CampCalc), 저장은 /api/campteam/ledger-calc.
(function () {
  CT.addDict({
    ko: { tabCalc: '계산기', ccTitle: '예산 계산기', ccHelp: '캠프비와 인원, 항목별 금액을 넣으면 예상 수입·지출과 남는 금액을 바로 계산해요. 여러 안을 저장해 두고 비교할 수 있어요. 여기서 계산해도 장부나 예산은 바뀌지 않아요 — 마음에 드는 안은 「기간 예산에 적용」으로 옮겨요.',
      ccScenario: '저장된 계산', ccNewFromTemplate: '새 계산 (뼈대)', ccName: '계산 이름', ccSave: '저장', ccSaved: '저장했어요.', ccCopy: '복사해서 새 계산', ccDelete: '삭제', ccDeleteConfirm: '이 계산을 지울까요?', ccUnsaved: '저장하지 않은 변경이 있어요. 버리고 계속할까요?', ccViewOnly: '이 계정은 계산은 해 볼 수 있지만 저장은 할 수 없어요. (저장은 캠프 재정 담당·디렉터)', ccUntitled: '이름 없는 계산',
      ccBasic: '기본 정보', ccCampers: '캠퍼 수', ccStaff: '스태프 수', ccDays: '일수', ccNights: '숙박 수(박)', ccCont: '예비비 (지출의 %)', ccOpening: '이월금 포함하기', ccOpeningVal: '이 기간의 이월금',
      ccIncome: '수입', ccExpense: '지출', ccAddIncome: '+ 수입 항목', ccAddExpense: '+ 지출 항목', ccColName: '이름', ccColKind: '방식', ccColAmount: '금액 / 단가', ccColBasis: '수량 기준', ccColQty: '수량 / %', ccColMult: '× 배수', ccColCat: '장부 항목', ccColTotal: '계산액', ccFixed: '고정 금액', ccUnit: '단가 × 수량', ccNoCat: '(항목 없음)',
      bqty: '직접 입력', bcampers: '캠퍼 수', bcampersPct: '캠퍼 중 비율(%)', bstaff: '스태프 수', ball: '전체 인원', bcamperDays: '캠퍼 × 일수', bstaffDays: '스태프 × 일수', ballDays: '전체 × 일수', bcamperNights: '캠퍼 × 숙박수', bstaffNights: '스태프 × 숙박수', ballNights: '전체 × 숙박수',
      ccResult: '계산 결과', ccTotalIn: '예상 수입', ccTotalOut: '예상 지출', ccContAmt: '예비비', ccOpeningAmt: '이월금', ccNet: '예상 남는 금액', ccCostPer: '캠퍼 1인당 비용', ccFeePer: '캠퍼 1인당 평균 캠프비', ccBreak: '손익분기', ccBreakCampers: '캠프비 수입이 지금 단가 그대로일 때, 캠퍼가 이 인원 이상이면 남는 금액이 0 이상이에요', ccBreakCampersNone: '이 조건에서는 캠퍼를 더 받아도 적자가 안 없어져요 (인원이 늘면 지출도 같이 늘어요)', ccBreakNote: '캠프비 수입이 캠퍼 수와 연동된 줄(캠퍼 수 · 캠퍼 중 비율)이 없어서 인원 기준 손익분기는 계산하지 않아요.', ccPeople: '명', ccFeeNeeded: '남는 금액을 0으로 만들려면 캠프비 단가를 이 정도로', ccFeeOk: '지금 캠프비로도 적자가 아니에요', ccExpMix: '지출 항목 비중', ccCompare: '다른 안과 비교', ccCompareNone: '(비교 안 함)', ccMetric: '항목', ccThis: '이 계산', ccThat: '비교 안', ccDiff: '차이',
      ccApply: '기간 예산에 적용…', ccApplyTitle: '기간 예산에 적용', ccApplyBody: '이 계산의 항목별 금액을 선택한 기간의 「기간 예산」으로 옮겨요. 장부(실제 거래)는 바뀌지 않아요.', ccApplyPeriod: '적용할 기간', ccApplyMode: '적용 방식', ccApplyMerge: '합치기 — 이 계산에 있는 항목만 바꾸고 나머지는 그대로', ccApplyReplace: '통째로 바꾸기 — 이 계산에 없는 기존 항목은 지움', ccApplyGo: '적용하기', ccApplyDone: '기간 예산에 적용했어요.', ccApplySkipped: '장부 항목에 없어서 건너뛴 이름', ccApplyNoPeriod: '적용할 수 있는 (열려 있는) 기간이 없어요.', ccApplyNothing: '적용할 항목이 없어요. 줄마다 「장부 항목」을 골라 주세요.' },
    en: { tabCalc: 'Calculator', ccTitle: 'Budget calculator', ccHelp: 'Enter the camp fee, headcount and amounts per category to see expected income, expenses and what is left. Save several versions and compare them. Calculating here does not change the ledger or budget — move a version you like with "Apply to period budget".',
      ccScenario: 'Saved calculations', ccNewFromTemplate: 'New (template)', ccName: 'Name', ccSave: 'Save', ccSaved: 'Saved.', ccCopy: 'Copy as new', ccDelete: 'Delete', ccDeleteConfirm: 'Delete this calculation?', ccUnsaved: 'You have unsaved changes. Discard and continue?', ccViewOnly: 'This account can calculate but not save. (Saving: camp finance / director)', ccUntitled: 'Untitled',
      ccBasic: 'Basics', ccCampers: 'Campers', ccStaff: 'Staff', ccDays: 'Days', ccNights: 'Nights', ccCont: 'Contingency (% of expenses)', ccOpening: 'Include carry-over', ccOpeningVal: 'Carry-over of this period',
      ccIncome: 'Income', ccExpense: 'Expenses', ccAddIncome: '+ Income row', ccAddExpense: '+ Expense row', ccColName: 'Name', ccColKind: 'Type', ccColAmount: 'Amount / unit price', ccColBasis: 'Quantity based on', ccColQty: 'Qty / %', ccColMult: '× multiplier', ccColCat: 'Ledger category', ccColTotal: 'Result', ccFixed: 'Fixed amount', ccUnit: 'Unit × quantity', ccNoCat: '(no category)',
      bqty: 'Enter manually', bcampers: 'Campers', bcampersPct: '% of campers', bstaff: 'Staff', ball: 'Everyone', bcamperDays: 'Campers × days', bstaffDays: 'Staff × days', ballDays: 'Everyone × days', bcamperNights: 'Campers × nights', bstaffNights: 'Staff × nights', ballNights: 'Everyone × nights',
      ccResult: 'Result', ccTotalIn: 'Expected income', ccTotalOut: 'Expected expenses', ccContAmt: 'Contingency', ccOpeningAmt: 'Carry-over', ccNet: 'Expected remaining', ccCostPer: 'Cost per camper', ccFeePer: 'Average camp fee per camper', ccBreak: 'Break-even', ccBreakCampers: 'With the camp fee prices as they are, this many campers or more brings the balance to zero or above', ccBreakCampersNone: 'With these inputs more campers does not remove the deficit (expenses grow with headcount too)', ccBreakNote: 'No income row scales with the number of campers, so headcount break-even is not calculated.', ccPeople: '', ccFeeNeeded: 'To bring the balance to zero, camp fee prices would need to be about', ccFeeOk: 'No deficit even at the current camp fee', ccExpMix: 'Expense mix', ccCompare: 'Compare with another', ccCompareNone: '(none)', ccMetric: 'Item', ccThis: 'This one', ccThat: 'Other', ccDiff: 'Difference',
      ccApply: 'Apply to period budget…', ccApplyTitle: 'Apply to period budget', ccApplyBody: 'Moves this calculation’s per-category amounts into the chosen period’s "Period budget". The ledger (actual transactions) is not changed.', ccApplyPeriod: 'Period', ccApplyMode: 'How', ccApplyMerge: 'Merge — change only the categories in this calculation', ccApplyReplace: 'Replace — remove existing categories not in this calculation', ccApplyGo: 'Apply', ccApplyDone: 'Applied to the period budget.', ccApplySkipped: 'Skipped (not in the ledger category list)', ccApplyNoPeriod: 'No open period to apply to.', ccApplyNothing: 'Nothing to apply. Pick a "Ledger category" on each row.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, F = function () { return window.FIN; }, KRW = function (n) { return CT.money(n, 'KRW'); };
  var K = function () { return window.CampCalc; };
  var C = { list: null, cur: null, dirty: false, compare: '', msg: '' };
  var canSave = function () { return !!(F().S.perms && F().S.perms.moneyWrite); };
  var openingAmt = function () { var s = F().S.sum; return s && s.opening ? (s.opening.kind === 'income' ? s.opening.amount : -s.opening.amount) : 0; };
  var BASIS_LABEL = function (b) { return CT.t('b' + b); };

  async function load() { try { C.list = (await F().api('ledger-calc')).items; } catch (e) { C.list = []; } if (!C.cur) fresh(); }
  function fresh() { C.cur = { id: null, name: '', model: K().template(), campId: null, periodId: null }; C.dirty = false; C.compare = ''; }
  var model = function () { return C.cur.model; };
  var rowsOf = function (side) { return model()[side]; };

  // ── 그리기 ──
  function html() {
    if (!K()) return '<div class="err">' + esc(CT.t('loadFail')) + '</div>';
    var m = model(), h = '<section class="card"><h2>' + esc(CT.t('ccTitle')) + '</h2><div class="hintbox">' + esc(CT.t('ccHelp')) + '</div>' + (canSave() ? '' : '<div class="hintbox" style="margin-top:8px">' + esc(CT.t('ccViewOnly')) + '</div>') +
      '<div class="ccbar"><label>' + esc(CT.t('ccScenario')) + '<select id="ccPick"><option value="">' + esc(CT.t('ccNewFromTemplate')) + '</option>' + (C.list || []).map(function (s) { return '<option value="' + esc(s.id) + '"' + (C.cur.id === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></label>' +
      '<label>' + esc(CT.t('ccName')) + '<input id="ccName" maxlength="80" value="' + esc(C.cur.name) + '" placeholder="' + esc(CT.t('ccUntitled')) + '"></label><div class="ccbtns">' + (canSave() ? '<button class="btn pri" id="ccSave">' + esc(CT.t('ccSave')) + '</button> <button class="btn" id="ccCopy">' + esc(CT.t('ccCopy')) + '</button> ' + (C.cur.id ? '<button class="btn danger" id="ccDel">' + esc(CT.t('ccDelete')) + '</button> ' : '') : '') + (canSave() ? '<button class="btn" id="ccApply">' + esc(CT.t('ccApply')) + '</button>' : '') + '<span class="hint" id="ccMsg">' + esc(C.msg) + '</span></div></div></section>';
    h += '<div class="ccgrid"><div>' + basicHtml(m) + sideHtml('income') + sideHtml('expense') + '</div><div class="ccres" id="ccRes">' + resultHtml() + '</div></div>';
    return h;
  }
  function basicHtml(m) {
    var f = function (k, label) { return '<label>' + esc(CT.t(label)) + '<input data-v="' + k + '" inputmode="numeric" value="' + esc(m.vars[k]) + '"></label>'; };
    return '<section class="card" style="margin-bottom:14px"><h2>' + esc(CT.t('ccBasic')) + '</h2><div class="ccvars">' + f('campers', 'ccCampers') + f('staff', 'ccStaff') + f('days', 'ccDays') + f('nights', 'ccNights') +
      '<label>' + esc(CT.t('ccCont')) + '<input data-cont inputmode="decimal" value="' + esc(m.contingencyPct) + '"></label><label class="chk" style="align-self:end"><input type="checkbox" data-open' + (m.includeOpening ? ' checked' : '') + '> ' + esc(CT.t('ccOpening')) + ' <span class="hint">(' + esc(CT.t('ccOpeningVal')) + ' ' + esc(KRW(openingAmt())) + ')</span></label></div></section>';
  }
  function sideHtml(side) {
    var rows = rowsOf(side), cats = ((F().S.cats && F().S.cats[side]) || []).filter(function (c) { return c.active; });
    var head = '<tr><th>' + esc(CT.t('ccColName')) + '</th><th>' + esc(CT.t('ccColKind')) + '</th><th>' + esc(CT.t('ccColAmount')) + '</th><th>' + esc(CT.t('ccColBasis')) + '</th><th>' + esc(CT.t('ccColQty')) + '</th><th>' + esc(CT.t('ccColMult')) + '</th><th>' + esc(CT.t('ccColCat')) + '</th><th style="text-align:right">' + esc(CT.t('ccColTotal')) + '</th><th></th></tr>';
    var body = rows.map(function (r, i) { return rowHtml(side, r, i, cats); }).join('');
    return '<section class="card" style="margin-bottom:14px"><h2><span>' + esc(CT.t(side === 'income' ? 'ccIncome' : 'ccExpense')) + '</span></h2><div style="overflow:auto"><table class="cctbl"><thead>' + head + '</thead><tbody data-side="' + side + '">' + body + '</tbody></table></div><button class="btn sm" data-add="' + side + '" style="margin-top:8px">' + esc(CT.t(side === 'income' ? 'ccAddIncome' : 'ccAddExpense')) + '</button></section>';
  }
  function rowHtml(side, r, i, cats) {
    var fixed = r.kind === 'fixed', pct = r.basis === 'campersPct', manual = r.basis === 'qty' || pct, d = ' data-side="' + side + '" data-i="' + i + '"';
    var catOpts = '<option value="">' + esc(CT.t('ccNoCat')) + '</option>' + cats.map(function (c) { return '<option' + (r.category === c.name ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + (r.category && !cats.some(function (c) { return c.name === r.category; }) ? '<option selected>' + esc(r.category) + '</option>' : '');
    return '<tr' + d + '><td><input' + d + ' data-f="label" value="' + esc(r.label) + '" maxlength="60" style="min-width:150px"></td>' +
      '<td><select' + d + ' data-f="kind"><option value="fixed"' + (fixed ? ' selected' : '') + '>' + esc(CT.t('ccFixed')) + '</option><option value="unit"' + (!fixed ? ' selected' : '') + '>' + esc(CT.t('ccUnit')) + '</option></select></td>' +
      '<td><input' + d + ' data-f="' + (fixed ? 'amount' : 'unit') + '" inputmode="numeric" value="' + esc(fixed ? r.amount : r.unit) + '" style="width:110px;text-align:right"></td>' +
      '<td>' + (fixed ? '—' : '<select' + d + ' data-f="basis">' + K().BASES.map(function (b) { return '<option value="' + b + '"' + (r.basis === b ? ' selected' : '') + '>' + esc(BASIS_LABEL(b)) + '</option>'; }).join('') + '</select>') + '</td>' +
      '<td>' + (!fixed && manual ? '<input' + d + ' data-f="qty" inputmode="decimal" value="' + esc(r.qty) + '" style="width:70px;text-align:right">' + (pct ? ' %' : '') : '—') + '</td>' +
      '<td>' + (fixed ? '—' : '<input' + d + ' data-f="mult" inputmode="decimal" value="' + esc(r.mult) + '" style="width:60px;text-align:right">') + '</td>' +
      '<td><select' + d + ' data-f="category">' + catOpts + '</select></td><td style="text-align:right;font-weight:700" data-amt>' + esc(KRW(K().rowAmount(r, model().vars))) + '</td><td><button class="hs-b" data-del' + d + ' title="' + esc(CT.t('del')) + '">✕</button></td></tr>';
  }
  function resultHtml() {
    var m = model(), ctx = { opening: openingAmt() }, e = K().evaluate(m, ctx), be = K().breakEven(m, ctx), neg = e.net < 0;
    var h = '<section class="card"><h2>' + esc(CT.t('ccResult')) + '</h2><div class="ccnet" style="color:' + (neg ? 'var(--accent)' : 'var(--ok)') + '"><label>' + esc(CT.t('ccNet')) + '</label><strong>' + esc(KRW(e.net)) + '</strong></div><table><tbody>' +
      '<tr><td>' + esc(CT.t('ccTotalIn')) + '</td><td style="text-align:right">' + esc(KRW(e.income)) + '</td></tr>' + (m.includeOpening ? '<tr><td>' + esc(CT.t('ccOpeningAmt')) + '</td><td style="text-align:right">' + esc(KRW(e.opening)) + '</td></tr>' : '') +
      '<tr><td>' + esc(CT.t('ccTotalOut')) + '</td><td style="text-align:right">− ' + esc(KRW(e.expense)) + '</td></tr><tr><td>' + esc(CT.t('ccContAmt')) + ' (' + esc(m.contingencyPct) + '%)</td><td style="text-align:right">− ' + esc(KRW(e.contingency)) + '</td></tr>' +
      (e.costPerCamper != null ? '<tr><td>' + esc(CT.t('ccCostPer')) + '</td><td style="text-align:right">' + esc(KRW(e.costPerCamper)) + '</td></tr><tr><td>' + esc(CT.t('ccFeePer')) + '</td><td style="text-align:right">' + esc(KRW(e.feePerCamper)) + '</td></tr>' : '') + '</tbody></table>';
    h += '<h3 class="h3" style="margin-top:14px">' + esc(CT.t('ccBreak')) + '</h3>';
    if (be.camperLinked) h += be.campers != null ? '<div class="hintbox">' + esc(CT.t('ccBreakCampers')) + ': <b>' + be.campers + esc(CT.t('ccPeople')) + '</b></div>' : '<div class="hintbox" style="color:var(--accent)">' + esc(CT.t('ccBreakCampersNone')) + '</div>';
    else h += '<div class="hintbox">' + esc(CT.t('ccBreakNote')) + '</div>';
    if (be.fees.length) h += neg ? '<div class="hintbox" style="margin-top:8px">' + esc(CT.t('ccFeeNeeded')) + ':<br>' + be.fees.map(function (f) { return esc(f.label) + ': <b>' + esc(KRW(f.neededRounded)) + '</b> <span class="hint">(' + esc(KRW(f.unit)) + ' → +' + Math.round((be.feeScale - 1) * 100) + '%)</span>'; }).join('<br>') + '</div>' : '<div class="hintbox" style="margin-top:8px;color:var(--ok)">' + esc(CT.t('ccFeeOk')) + '</div>';
    // 지출 비중
    var ex = Object.keys(e.byCategory.expense).map(function (k) { return [k, e.byCategory.expense[k]]; }).filter(function (x) { return x[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; });
    if (ex.length) h += '<h3 class="h3" style="margin-top:14px">' + esc(CT.t('ccExpMix')) + '</h3>' + ex.map(function (x) { var p = e.expense ? x[1] / e.expense * 100 : 0; return '<div class="stb" style="grid-template-columns:110px 1fr 76px"><span>' + esc(x[0]) + '</span><div class="bar"><i style="width:' + p.toFixed(1) + '%"></i></div><b style="font-size:12px">' + esc(KRW(x[1])) + '</b></div>'; }).join('');
    // 비교
    var others = (C.list || []).filter(function (s) { return s.id !== C.cur.id; });
    if (others.length) { h += '<h3 class="h3" style="margin-top:14px">' + esc(CT.t('ccCompare')) + '</h3><select id="ccCmp"><option value="">' + esc(CT.t('ccCompareNone')) + '</option>' + others.map(function (s) { return '<option value="' + esc(s.id) + '"' + (C.compare === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select>';
      var o = others.filter(function (s) { return s.id === C.compare; })[0];
      if (o) { var oe = K().evaluate(o.model, ctx), row = function (label, a, b) { var d = a - b; return '<tr><td>' + esc(label) + '</td><td style="text-align:right">' + esc(KRW(a)) + '</td><td style="text-align:right">' + esc(KRW(b)) + '</td><td style="text-align:right;font-weight:700;color:' + (d < 0 ? 'var(--accent)' : d > 0 ? 'var(--ok)' : 'inherit') + '">' + (d > 0 ? '+' : '') + esc(KRW(d)) + '</td></tr>'; };
        h += '<table style="margin-top:8px"><thead><tr><th>' + esc(CT.t('ccMetric')) + '</th><th style="text-align:right">' + esc(CT.t('ccThis')) + '</th><th style="text-align:right">' + esc(o.name) + '</th><th style="text-align:right">' + esc(CT.t('ccDiff')) + '</th></tr></thead><tbody>' + row(CT.t('ccTotalIn'), e.income, oe.income) + row(CT.t('ccTotalOut'), e.expense + e.contingency, oe.expense + oe.contingency) + row(CT.t('ccNet'), e.net, oe.net) + '</tbody></table>'; } }
    return h + '</section>';
  }
  function updateResult() { var r = $('ccRes'); if (r) { var sel = document.activeElement && document.activeElement.id === 'ccCmp'; r.innerHTML = resultHtml(); } }
  function updateAmounts() { document.querySelectorAll('tr[data-side][data-i]').forEach(function (tr) { var r = rowsOf(tr.dataset.side)[+tr.dataset.i], c = tr.querySelector('[data-amt]'); if (r && c) c.textContent = KRW(K().rowAmount(r, model().vars)); }); }
  function mark() { C.dirty = true; var m = $('ccMsg'); if (m) m.textContent = ''; }

  // ── 동작 ──
  function bind() {
    var body = $('fnBody');
    body.oninput = function (e) {
      var t = e.target, m = model(); if (t.id === 'ccName') { C.cur.name = t.value; mark(); return; }
      if (t.dataset.v) { m.vars[t.dataset.v] = Number(String(t.value).replace(/[,\s]/g, '')) || 0; }
      else if (t.dataset.cont != null) { m.contingencyPct = Math.min(50, Math.max(0, Number(t.value) || 0)); }
      else if (t.dataset.f) { var r = rowsOf(t.dataset.side)[+t.dataset.i]; if (!r) return; var f = t.dataset.f; if (f === 'label' || f === 'category') r[f] = t.value; else r[f] = Number(String(t.value).replace(/[,\s₩원]/g, '')) || 0; }
      else return;
      mark(); updateAmounts(); updateResult();
    };
    body.onchange = async function (e) {
      var t = e.target, m = model();
      if (t.id === 'ccPick') { await pick(t.value); return; }
      if (t.id === 'ccCmp') { C.compare = t.value; updateResult(); return; }
      if (t.dataset.open != null) { m.includeOpening = t.checked; mark(); updateResult(); return; }
      if (t.dataset.f === 'kind' || t.dataset.f === 'basis') { var r = rowsOf(t.dataset.side)[+t.dataset.i]; r[t.dataset.f] = t.value; if (t.dataset.f === 'kind' && t.value === 'unit' && !r.mult) r.mult = 1; mark(); F().render(); return; }
      if (t.dataset.f === 'category') { var rr = rowsOf(t.dataset.side)[+t.dataset.i]; rr.category = t.value; mark(); updateResult(); }
    };
    body.onclick = async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.add) { rowsOf(b.dataset.add).push(K().newRow('fixed')); mark(); F().render(); }
      else if (b.dataset.del != null) { rowsOf(b.dataset.side).splice(+b.dataset.i, 1); mark(); F().render(); }
      else if (b.id === 'ccSave') save(false); else if (b.id === 'ccCopy') save(true);
      else if (b.id === 'ccDel') { if (confirm(CT.t('ccDeleteConfirm'))) { try { await F().api('ledger-calc?id=' + encodeURIComponent(C.cur.id), { method: 'DELETE' }); fresh(); await load(); F().render(); } catch (er) { say(er.message, true); } } }
      else if (b.id === 'ccApply') applyForm();
    };
  }
  function say(t, bad) { C.msg = t; var m = $('ccMsg'); if (m) { m.textContent = t; m.style.color = bad ? 'var(--accent)' : 'var(--ok)'; } }
  async function pick(id) {
    if (C.dirty && !confirm(CT.t('ccUnsaved'))) { F().render(); return; }
    if (!id) fresh(); else { var s = (C.list || []).filter(function (x) { return x.id === id; })[0]; if (s) { C.cur = { id: s.id, name: s.name, model: JSON.parse(JSON.stringify(s.model)), campId: s.campId, periodId: s.periodId }; C.dirty = false; C.compare = ''; } }
    F().render();
  }
  async function save(asCopy) {
    var name = (C.cur.name || '').trim() || CT.t('ccUntitled'); if (asCopy) name = name + (CT.lang() === 'en' ? ' (copy)' : ' (복사)');
    try {
      if (C.cur.id && !asCopy) await F().api('ledger-calc?id=' + encodeURIComponent(C.cur.id), { method: 'PATCH', body: { name: name, model: model(), periodId: F().S.pid } });
      else { var r = await F().api('ledger-calc', { method: 'POST', body: { name: name, model: model(), periodId: F().S.pid } }); C.cur.id = r.id; }
      C.cur.name = name; C.dirty = false; C.msg = CT.t('ccSaved'); await load(); F().render();
    } catch (e) { say(e.message, true); }
  }
  function applyForm() {
    var ps = F().S.periods.filter(function (p) { return p.status === 'open'; });
    if (!ps.length) { say(CT.t('ccApplyNoPeriod'), true); return; }
    var plan = K().toPlan(model(), { opening: openingAmt() }), known = {}; ['income', 'expense'].forEach(function (k) { ((F().S.cats && F().S.cats[k]) || []).forEach(function (c) { known[k + '|' + c.name] = 1; }); });
    var ok = plan.filter(function (p) { return known[p.kind + '|' + p.category]; }), skipped = plan.filter(function (p) { return !known[p.kind + '|' + p.category]; });
    if (!ok.length) { say(CT.t('ccApplyNothing'), true); return; }
    var h = '<div class="hintbox">' + esc(CT.t('ccApplyBody')) + '</div><label>' + esc(CT.t('ccApplyPeriod')) + '<select name="period">' + ps.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === F().S.pid ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></label>' +
      '<label>' + esc(CT.t('ccApplyMode')) + '<select name="mode"><option value="merge">' + esc(CT.t('ccApplyMerge')) + '</option><option value="replace">' + esc(CT.t('ccApplyReplace')) + '</option></select></label><table><tbody>' + ok.map(function (p) { return '<tr><td>' + esc(CT.t(p.kind === 'income' ? 'ccIncome' : 'ccExpense')) + ' · ' + esc(p.category) + '</td><td style="text-align:right">' + esc(KRW(p.amount)) + '</td></tr>'; }).join('') + '</tbody></table>' + (skipped.length ? '<div class="hintbox" style="color:var(--accent)">' + esc(CT.t('ccApplySkipped')) + ': ' + esc(skipped.map(function (p) { return p.category; }).join(', ')) + '</div>' : '');
    CT.ask(CT.t('ccApplyTitle'), h, async function (fd) {
      var cur = []; if (fd.mode === 'merge') cur = (await F().api('ledger-plan?periodId=' + encodeURIComponent(fd.period))).items.map(function (x) { return { kind: x.kind, category: x.category, amount: x.amount }; });
      var map = {}; cur.forEach(function (x) { map[x.kind + '|' + x.category] = x; }); ok.forEach(function (x) { map[x.kind + '|' + x.category] = x; });
      await F().api('ledger-plan', { method: 'PUT', body: { periodId: fd.period, items: Object.keys(map).map(function (k) { return map[k]; }) } });
      say(CT.t('ccApplyDone')); await F().loadTab(); F().render();
    }, { saveLabel: CT.t('ccApplyGo') });
  }

  (window.FinTabs = window.FinTabs || {}).calc = { html: html, bind: bind, load: load };
})();
