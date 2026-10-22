// 회계 장부: 예산 계산기 탭. 계산 핵심은 calc-core.js(CampCalc), 저장은 /api/campteam/ledger-calc.
// 줄마다 "단가 × 인원 = 금액" 계산식이 그대로 보이도록 만든 화면이다.
(function () {
  CT.addDict({
    ko: { tabCalc: '계산기', ccTitle: '예산 계산기', ccWhat: '캠프비와 인원, 항목별 금액을 넣으면 "얼마가 들어오고, 얼마가 나가고, 얼마가 남는지" 바로 계산해 줘요. 장부(실제 돈)는 바뀌지 않는 연습장이에요.',
      ccHowTitle: '사용 방법 (3단계)', ccHow1: '① 아래 「기본 정보」에 캠퍼 수·스태프 수·일수·숙박 수를 적어요.', ccHow2: '② 수입·지출 줄마다 "계산 방법"을 고르고 숫자를 적어요. 줄 아래에 계산식이 바로 보여요. 예) 얼리버드 80,000원 × 60명 → 계산 방법 「1인 단가 × 인원」, 단가 80000, 인원 「직접 입력」 60', ccHow3: '③ 오른쪽에서 「예상 남는 금액」을 확인해요. 마음에 들면 저장하고, 필요하면 「기간 예산에 적용」으로 옮겨요.',
      ccBudgetWhatTitle: '「기간 예산」이 뭐예요?', ccBudgetWhat: '기간 예산은 "이 기간에 항목별로 얼마를 쓰기로(받기로) 계획했는지"예요(엑셀의 「예산」 탭). 장부 요약 화면에서 계획 대비 실제를 보여 주는 기준이 돼요. 계산기에서 정한 안을 확정하면 「기간 예산에 적용」을 눌러 그 숫자를 계획으로 옮겨요. 실제 거래(장부)는 바뀌지 않아요.',
      ccScenario: '저장된 계산', ccNewFromTemplate: '새 계산 (뼈대)', ccName: '계산 이름', ccSave: '저장', ccSaved: '저장했어요.', ccCopy: '복사해서 새 계산', ccDelete: '삭제', ccDeleteConfirm: '이 계산을 지울까요?', ccUnsaved: '저장하지 않은 변경이 있어요. 버리고 계속할까요?', ccViewOnly: '이 계정은 계산은 해 볼 수 있지만 저장은 할 수 없어요. (저장은 캠프 재정 담당·디렉터)', ccUntitled: '이름 없는 계산',
      ccBasic: '기본 정보', ccCampers: '캠퍼 수 (학생)', ccStaff: '스태프 수', ccDays: '일수', ccNights: '숙박 수 (박)', ccCont: '예비비 (지출의 %)', ccContHint: '뜻밖의 지출을 위해 지출의 몇 %를 더 잡아 둬요', ccOpening: '이월금도 더하기', ccOpeningVal: '이 기간의 이월금',
      ccIncome: '수입', ccExpense: '지출', ccAddIncome: '+ 수입 줄 추가', ccAddExpense: '+ 지출 줄 추가', ccName2: '이름', ccCat: '장부 항목', ccNoCat: '(항목 안 고름)', ccMethod: '계산 방법',
      mFixed: '고정 금액 (한 번에 정해진 금액)', mPerson: '1인 단가 × 인원', mDay: '1인 1일 단가 × 인원 × 일수 (하루 몇 번)', mNight: '1인 1박 단가 × 인원 × 숙박 수',
      ccAmountLabel: '금액', ccUnitLabel: '단가', ccWon: '원', ccPeopleWho: '인원', wdirect: '직접 입력', wcampers: '캠퍼 전체', wstaff: '스태프 전체', wall: '전체 (캠퍼+스태프)', ccPeopleUnit: '명', ccTimesPerDay: '하루', ccTimesUnit: '회', ccDaysUnit: '일', ccNightsUnit: '박',
      ccFormulaFixed: '고정 금액', ccPerDayHint: '끼니·간식처럼 하루에 몇 번인지', ccFeeCheck: '캠프비 인원 합계', ccFeeCheckSame: '캠퍼 수와 같아요', ccFeeCheckDiff: '캠퍼 수와 달라요 — 확인해 보세요', ccCampersWord: '캠퍼 수',
      ccResult: '계산 결과', ccTotalIn: '예상 수입', ccTotalOut: '예상 지출', ccContAmt: '예비비', ccOpeningAmt: '이월금', ccNet: '예상 남는 금액', ccNetGood: '흑자예요', ccNetBad: '적자예요', ccCostPer: '캠퍼 1인당 드는 비용', ccFeePer: '캠퍼 1인당 평균 캠프비', ccBreak: '손익분기 (적자도 흑자도 아닌 지점)', ccAvgNeeded: '남는 금액을 0으로 하려면 캠퍼 1인당 평균 캠프비가', ccAvgNow: '지금은', ccAvgOk: '지금 캠프비로도 적자가 아니에요', ccBreakCampers: '캠프비가 "캠퍼 전체"에 곱해지는 줄이 있을 때, 캠퍼가 이 인원 이상이면 남는 금액이 0 이상이에요', ccBreakCampersNone: '이 조건에서는 캠퍼를 더 받아도 적자가 안 없어져요 (인원이 늘면 지출도 같이 늘어요)', ccPeople: '명', ccFeeNeeded: '캠프비 단가를 모두 같은 비율로 올려 남는 금액을 0으로 만들려면', ccExpMix: '지출 항목 비중', ccCompare: '다른 안과 비교', ccCompareNone: '(비교 안 함)', ccMetric: '항목', ccThis: '이 계산', ccDiff: '차이',
      ccApply: '기간 예산에 적용…', ccApplyTitle: '기간 예산에 적용', ccApplyBody: '이 계산의 항목별 금액을 선택한 기간의 「기간 예산」(계획)으로 옮겨요. 장부(실제 거래)는 바뀌지 않아요.', ccApplyPeriod: '적용할 기간', ccApplyMode: '적용 방식', ccApplyMerge: '합치기 — 이 계산에 있는 항목만 바꾸고 나머지는 그대로', ccApplyReplace: '통째로 바꾸기 — 이 계산에 없는 기존 항목은 지움', ccApplyGo: '적용하기', ccApplyDone: '기간 예산에 적용했어요.', ccApplySkipped: '장부 항목에 없어서 건너뛴 이름', ccApplyNoPeriod: '적용할 수 있는 (열려 있는) 기간이 없어요.', ccApplyNothing: '적용할 항목이 없어요. 줄마다 「장부 항목」을 골라 주세요.' },
    en: { tabCalc: 'Calculator', ccTitle: 'Budget calculator', ccWhat: 'Enter the camp fee, headcount and amounts per category and it shows how much comes in, goes out and is left. It is a scratch pad — the ledger (real money) does not change.',
      ccHowTitle: 'How to use (3 steps)', ccHow1: '1. Fill in campers, staff, days and nights under "Basics".', ccHow2: '2. For each income/expense row choose a "How to calculate" and type the numbers. The formula appears under the row. e.g. Early bird 80,000 won × 60 people → "Unit price × people", price 80000, people "Enter manually" 60.', ccHow3: '3. Check "Expected remaining" on the right. Save it if you like it, and use "Apply to period budget" if needed.',
      ccBudgetWhatTitle: 'What is the "Period budget"?', ccBudgetWhat: 'The period budget is what you planned to spend (or receive) per category in this period (the Excel "예산" tab). The ledger summary compares actuals to it. When a calculation is settled, "Apply to period budget" copies its numbers into the plan. Actual transactions (the ledger) do not change.',
      ccScenario: 'Saved calculations', ccNewFromTemplate: 'New (template)', ccName: 'Name', ccSave: 'Save', ccSaved: 'Saved.', ccCopy: 'Copy as new', ccDelete: 'Delete', ccDeleteConfirm: 'Delete this calculation?', ccUnsaved: 'You have unsaved changes. Discard and continue?', ccViewOnly: 'This account can calculate but not save. (Saving: camp finance / director)', ccUntitled: 'Untitled',
      ccBasic: 'Basics', ccCampers: 'Campers (students)', ccStaff: 'Staff', ccDays: 'Days', ccNights: 'Nights', ccCont: 'Contingency (% of expenses)', ccContHint: 'Extra % of expenses set aside for surprises', ccOpening: 'Include carry-over', ccOpeningVal: 'Carry-over of this period',
      ccIncome: 'Income', ccExpense: 'Expenses', ccAddIncome: '+ Add income row', ccAddExpense: '+ Add expense row', ccName2: 'Name', ccCat: 'Ledger category', ccNoCat: '(none)', ccMethod: 'How to calculate',
      mFixed: 'Fixed amount', mPerson: 'Unit price × people', mDay: 'Per person per day × people × days (times a day)', mNight: 'Per person per night × people × nights',
      ccAmountLabel: 'Amount', ccUnitLabel: 'Price', ccWon: 'won', ccPeopleWho: 'People', wdirect: 'Enter manually', wcampers: 'All campers', wstaff: 'All staff', wall: 'Everyone (campers + staff)', ccPeopleUnit: '', ccTimesPerDay: 'per day', ccTimesUnit: 'times', ccDaysUnit: 'days', ccNightsUnit: 'nights',
      ccFormulaFixed: 'Fixed amount', ccPerDayHint: 'How many times a day (meals, snacks…)', ccFeeCheck: 'Camp fee headcount', ccFeeCheckSame: 'matches the number of campers', ccFeeCheckDiff: 'differs from campers — please check', ccCampersWord: 'campers',
      ccResult: 'Result', ccTotalIn: 'Expected income', ccTotalOut: 'Expected expenses', ccContAmt: 'Contingency', ccOpeningAmt: 'Carry-over', ccNet: 'Expected remaining', ccNetGood: 'surplus', ccNetBad: 'deficit', ccCostPer: 'Cost per camper', ccFeePer: 'Average camp fee per camper', ccBreak: 'Break-even', ccAvgNeeded: 'To bring the balance to zero, the average camp fee per camper needs to be', ccAvgNow: 'now', ccAvgOk: 'No deficit even at the current camp fee', ccBreakCampers: 'If a camp fee row is multiplied by "all campers", this many campers or more brings the balance to zero or above', ccBreakCampersNone: 'With these inputs more campers does not remove the deficit (expenses grow with headcount too)', ccPeople: '', ccFeeNeeded: 'Raising all camp fee prices by the same ratio to reach zero', ccExpMix: 'Expense mix', ccCompare: 'Compare with another', ccCompareNone: '(none)', ccMetric: 'Item', ccThis: 'This one', ccDiff: 'Difference',
      ccApply: 'Apply to period budget…', ccApplyTitle: 'Apply to period budget', ccApplyBody: 'Moves this calculation’s per-category amounts into the chosen period’s "Period budget" (the plan). The ledger (actual transactions) is not changed.', ccApplyPeriod: 'Period', ccApplyMode: 'How', ccApplyMerge: 'Merge — change only the categories in this calculation', ccApplyReplace: 'Replace — remove existing categories not in this calculation', ccApplyGo: 'Apply', ccApplyDone: 'Applied to the period budget.', ccApplySkipped: 'Skipped (not in the ledger category list)', ccApplyNoPeriod: 'No open period to apply to.', ccApplyNothing: 'Nothing to apply. Pick a "Ledger category" on each row.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, F = function () { return window.FIN; }, KRW = function (n) { return CT.money(n, 'KRW'); }, K = function () { return window.CampCalc; };
  var C = { list: null, cur: null, dirty: false, compare: '', msg: '' };
  var canSave = function () { return !!(F().S.perms && F().S.perms.moneyWrite); };
  var openingAmt = function () { var s = F().S.sum; return s && s.opening ? (s.opening.kind === 'income' ? s.opening.amount : -s.opening.amount) : 0; };
  var model = function () { return C.cur.model; }, rowsOf = function (side) { return model()[side]; };
  var num = function (v) { return Number(String(v).replace(/[,\s₩원명]/g, '')) || 0; };
  var n0 = function (n) { return Number(n).toLocaleString('en-US'); };

  async function load() { try { C.list = (await F().api('ledger-calc')).items; } catch (e) { C.list = []; } if (!C.cur) fresh(); }
  function fresh() { C.cur = { id: null, name: '', model: K().template(), campId: null, periodId: null }; C.dirty = false; C.compare = ''; }
  var modeOf = function (r) { return r.kind === 'fixed' ? 'fixed' : r.per === 'days' ? 'day' : r.per === 'nights' ? 'night' : 'person'; };
  function setMode(r, mode) { if (mode === 'fixed') r.kind = 'fixed'; else { r.kind = 'unit'; r.per = mode === 'day' ? 'days' : mode === 'night' ? 'nights' : 'none'; if (!r.mult) r.mult = 1; } }

  // 줄 아래에 보이는 계산식: "80,000원 × 60명 = 4,800,000원"
  function formula(r) {
    var p = K().parts(r, model().vars); if (p.fixed) return esc(CT.t('ccFormulaFixed')) + ' ' + esc(n0(p.total)) + esc(CT.t('ccWon'));
    var s = n0(p.unit) + CT.t('ccWon') + ' × ' + n0(p.people) + CT.t('ccPeopleUnit');
    if (p.per === 'days') s += ' × ' + p.times + CT.t('ccDaysUnit') + (p.mult !== 1 ? ' × ' + CT.t('ccTimesPerDay') + ' ' + p.mult + CT.t('ccTimesUnit') : '');
    if (p.per === 'nights') s += ' × ' + p.times + CT.t('ccNightsUnit');
    return esc(s) + ' = <b>' + esc(n0(p.total)) + esc(CT.t('ccWon')) + '</b>';
  }

  // ── 그리기 ──
  function html() {
    if (!K()) return '<div class="err">' + esc(CT.t('loadFail')) + '</div>';
    var h = '<section class="card"><h2>' + esc(CT.t('ccTitle')) + '</h2><div class="hintbox">' + esc(CT.t('ccWhat')) + '</div>' +
      '<details class="cchow" open><summary>' + esc(CT.t('ccHowTitle')) + '</summary><ol><li>' + esc(CT.t('ccHow1')) + '</li><li>' + esc(CT.t('ccHow2')) + '</li><li>' + esc(CT.t('ccHow3')) + '</li></ol></details>' +
      '<details class="cchow"><summary>' + esc(CT.t('ccBudgetWhatTitle')) + '</summary><p>' + esc(CT.t('ccBudgetWhat')) + '</p></details>' + (canSave() ? '' : '<div class="hintbox" style="margin-top:8px">' + esc(CT.t('ccViewOnly')) + '</div>') +
      '<div class="ccbar"><label>' + esc(CT.t('ccScenario')) + '<select id="ccPick"><option value="">' + esc(CT.t('ccNewFromTemplate')) + '</option>' + (C.list || []).map(function (s) { return '<option value="' + esc(s.id) + '"' + (C.cur.id === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></label>' +
      '<label>' + esc(CT.t('ccName')) + '<input id="ccName" maxlength="80" value="' + esc(C.cur.name) + '" placeholder="' + esc(CT.t('ccUntitled')) + '"></label><div class="ccbtns">' + (canSave() ? '<button class="btn pri" id="ccSave">' + esc(CT.t('ccSave')) + '</button> <button class="btn" id="ccCopy">' + esc(CT.t('ccCopy')) + '</button> ' + (C.cur.id ? '<button class="btn danger" id="ccDel">' + esc(CT.t('ccDelete')) + '</button> ' : '') + '<button class="btn" id="ccApply">' + esc(CT.t('ccApply')) + '</button>' : '') + '<span class="hint" id="ccMsg">' + esc(C.msg) + '</span></div></div></section>';
    return h + '<div class="ccgrid"><div>' + basicHtml() + sideHtml('income') + sideHtml('expense') + '</div><div class="ccres" id="ccRes">' + resultHtml() + '</div></div>';
  }
  function basicHtml() {
    var m = model(), f = function (k, label) { return '<label>' + esc(CT.t(label)) + '<input data-v="' + k + '" inputmode="numeric" value="' + esc(m.vars[k]) + '"></label>'; };
    return '<section class="card" style="margin-bottom:14px"><h2>' + esc(CT.t('ccBasic')) + '</h2><div class="ccvars">' + f('campers', 'ccCampers') + f('staff', 'ccStaff') + f('days', 'ccDays') + f('nights', 'ccNights') + '</div>' +
      '<div class="ccvars" style="margin-top:10px"><label>' + esc(CT.t('ccCont')) + '<input data-cont inputmode="decimal" value="' + esc(m.contingencyPct) + '"><small class="hint">' + esc(CT.t('ccContHint')) + '</small></label><label class="chk" style="align-self:center"><input type="checkbox" data-open' + (m.includeOpening ? ' checked' : '') + '> ' + esc(CT.t('ccOpening')) + ' <span class="hint">(' + esc(CT.t('ccOpeningVal')) + ' ' + esc(KRW(openingAmt())) + ')</span></label></div></section>';
  }
  function sideHtml(side) {
    var cats = ((F().S.cats && F().S.cats[side]) || []).filter(function (c) { return c.active; });
    var h = '<section class="card" style="margin-bottom:14px"><h2><span>' + esc(CT.t(side === 'income' ? 'ccIncome' : 'ccExpense')) + '</span></h2><div data-side="' + side + '">' + rowsOf(side).map(function (r, i) { return rowHtml(side, r, i, cats); }).join('') + '</div>';
    if (side === 'income') h += '<div id="ccFeeCheck">' + feeCheckHtml() + '</div>';
    return h + '<button class="btn sm" data-add="' + side + '" style="margin-top:8px">' + esc(CT.t(side === 'income' ? 'ccAddIncome' : 'ccAddExpense')) + '</button></section>';
  }
  function feeCheckHtml() {
    var fc = K().feeHeadcount(model()); if (!fc.rows) return ''; var same = fc.total === model().vars.campers;
    return '<div class="hintbox" style="margin-top:8px;color:' + (same ? 'var(--ok)' : 'var(--accent)') + '">' + esc(CT.t('ccFeeCheck')) + ' ' + fc.total + esc(CT.t('ccPeopleUnit')) + ' — ' + esc(CT.t('ccCampersWord')) + ' ' + model().vars.campers + esc(CT.t('ccPeopleUnit')) + ': ' + esc(CT.t(same ? 'ccFeeCheckSame' : 'ccFeeCheckDiff')) + '</div>';
  }
  function rowHtml(side, r, i, cats) {
    var d = ' data-side="' + side + '" data-i="' + i + '"', mode = modeOf(r), unit = r.kind === 'unit';
    var catOpts = '<option value="">' + esc(CT.t('ccNoCat')) + '</option>' + cats.map(function (c) { return '<option' + (r.category === c.name ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + (r.category && !cats.some(function (c) { return c.name === r.category; }) ? '<option selected>' + esc(r.category) + '</option>' : '');
    var line2 = '<select' + d + ' data-f="mode" aria-label="' + esc(CT.t('ccMethod')) + '"><option value="fixed"' + (mode === 'fixed' ? ' selected' : '') + '>' + esc(CT.t('mFixed')) + '</option><option value="person"' + (mode === 'person' ? ' selected' : '') + '>' + esc(CT.t('mPerson')) + '</option><option value="day"' + (mode === 'day' ? ' selected' : '') + '>' + esc(CT.t('mDay')) + '</option><option value="night"' + (mode === 'night' ? ' selected' : '') + '>' + esc(CT.t('mNight')) + '</option></select>';
    var line3 = '';
    if (!unit) line3 = '<label>' + esc(CT.t('ccAmountLabel')) + ' <input' + d + ' data-f="amount" inputmode="numeric" value="' + esc(r.amount) + '" class="num"></label> ' + esc(CT.t('ccWon'));
    else {
      line3 = '<label>' + esc(CT.t('ccUnitLabel')) + ' <input' + d + ' data-f="unit" inputmode="numeric" value="' + esc(r.unit) + '" class="num"></label> ' + esc(CT.t('ccWon')) + ' × <label>' + esc(CT.t('ccPeopleWho')) + ' <select' + d + ' data-f="who">' + K().WHO.map(function (w) { return '<option value="' + w + '"' + (r.who === w ? ' selected' : '') + '>' + esc(CT.t('w' + w)) + '</option>'; }).join('') + '</select></label>' +
        (r.who === 'direct' ? ' <input' + d + ' data-f="qty" inputmode="numeric" value="' + esc(r.qty) + '" class="num s"> ' + esc(CT.t('ccPeopleUnit')) : ' <span class="hint">(' + n0(K().peopleOf(r, model().vars)) + esc(CT.t('ccPeopleUnit')) + ')</span>') +
        (r.per === 'days' ? ' × ' + model().vars.days + esc(CT.t('ccDaysUnit')) + ' × <label>' + esc(CT.t('ccTimesPerDay')) + ' <input' + d + ' data-f="mult" inputmode="decimal" value="' + esc(r.mult) + '" class="num s"> ' + esc(CT.t('ccTimesUnit')) + '</label>' : '') + (r.per === 'nights' ? ' × ' + model().vars.nights + esc(CT.t('ccNightsUnit')) : '');
    }
    return '<div class="ccrow"' + d + '><div class="ccr1"><input' + d + ' data-f="label" value="' + esc(r.label) + '" maxlength="60" placeholder="' + esc(CT.t('ccName2')) + '"><select' + d + ' data-f="category" aria-label="' + esc(CT.t('ccCat')) + '">' + catOpts + '</select><button class="hs-b" data-del' + d + ' title="' + esc(CT.t('del')) + '">✕</button></div><div class="ccr2">' + line2 + '</div><div class="ccr2">' + line3 + '</div><div class="ccr3" data-formula' + d + '>= ' + formula(r) + '</div></div>';
  }
  function resultHtml() {
    var m = model(), ctx = { opening: openingAmt() }, e = K().evaluate(m, ctx), be = K().breakEven(m, ctx), neg = e.net < 0;
    var h = '<section class="card"><h2>' + esc(CT.t('ccResult')) + '</h2><div class="ccnet" style="color:' + (neg ? 'var(--accent)' : 'var(--ok)') + '"><label>' + esc(CT.t('ccNet')) + ' · ' + esc(CT.t(neg ? 'ccNetBad' : 'ccNetGood')) + '</label><strong>' + esc(KRW(e.net)) + '</strong></div><table><tbody>' +
      '<tr><td>' + esc(CT.t('ccTotalIn')) + '</td><td style="text-align:right">' + esc(KRW(e.income)) + '</td></tr>' + (m.includeOpening ? '<tr><td>' + esc(CT.t('ccOpeningAmt')) + '</td><td style="text-align:right">' + esc(KRW(e.opening)) + '</td></tr>' : '') +
      '<tr><td>' + esc(CT.t('ccTotalOut')) + '</td><td style="text-align:right">− ' + esc(KRW(e.expense)) + '</td></tr><tr><td>' + esc(CT.t('ccContAmt')) + ' (' + esc(m.contingencyPct) + '%)</td><td style="text-align:right">− ' + esc(KRW(e.contingency)) + '</td></tr>' +
      (e.costPerCamper != null ? '<tr><td>' + esc(CT.t('ccCostPer')) + '</td><td style="text-align:right">' + esc(KRW(e.costPerCamper)) + '</td></tr><tr><td>' + esc(CT.t('ccFeePer')) + '</td><td style="text-align:right">' + esc(KRW(e.feePerCamper)) + '</td></tr>' : '') + '</tbody></table>';
    h += '<h3 class="h3" style="margin-top:14px">' + esc(CT.t('ccBreak')) + '</h3>';
    if (be.avgNeeded != null) h += neg ? '<div class="hintbox">' + esc(CT.t('ccAvgNeeded')) + ' <b>' + esc(KRW(be.avgNeeded)) + '</b> ' + esc(CT.t('ccAvgNow')) + ' ' + esc(KRW(be.avgNow)) + '</div>' : '<div class="hintbox" style="color:var(--ok)">' + esc(CT.t('ccAvgOk')) + '</div>';
    if (neg && be.fees.length) h += '<div class="hintbox" style="margin-top:8px">' + esc(CT.t('ccFeeNeeded')) + ':<br>' + be.fees.map(function (f) { return esc(f.label) + ': <b>' + esc(KRW(f.neededRounded)) + '</b> <span class="hint">(' + esc(KRW(f.unit)) + ' → +' + Math.round((be.feeScale - 1) * 100) + '%)</span>'; }).join('<br>') + '</div>';
    if (be.camperLinked) h += be.campers != null ? '<div class="hintbox" style="margin-top:8px">' + esc(CT.t('ccBreakCampers')) + ': <b>' + be.campers + esc(CT.t('ccPeople')) + '</b></div>' : '<div class="hintbox" style="margin-top:8px;color:var(--accent)">' + esc(CT.t('ccBreakCampersNone')) + '</div>';
    var ex = Object.keys(e.byCategory.expense).map(function (k) { return [k, e.byCategory.expense[k]]; }).filter(function (x) { return x[1] > 0; }).sort(function (a, b) { return b[1] - a[1]; });
    if (ex.length) h += '<h3 class="h3" style="margin-top:14px">' + esc(CT.t('ccExpMix')) + '</h3>' + ex.map(function (x) { var p = e.expense ? x[1] / e.expense * 100 : 0; return '<div class="stb" style="grid-template-columns:110px 1fr 90px"><span>' + esc(x[0]) + '</span><div class="bar"><i style="width:' + p.toFixed(1) + '%"></i></div><b style="font-size:12px">' + esc(KRW(x[1])) + '</b></div>'; }).join('');
    var others = (C.list || []).filter(function (s) { return s.id !== C.cur.id; });
    if (others.length) { h += '<h3 class="h3" style="margin-top:14px">' + esc(CT.t('ccCompare')) + '</h3><select id="ccCmp"><option value="">' + esc(CT.t('ccCompareNone')) + '</option>' + others.map(function (s) { return '<option value="' + esc(s.id) + '"' + (C.compare === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select>';
      var o = others.filter(function (s) { return s.id === C.compare; })[0];
      if (o) { var oe = K().evaluate(o.model, ctx), row = function (label, a, b) { var d = a - b; return '<tr><td>' + esc(label) + '</td><td style="text-align:right">' + esc(KRW(a)) + '</td><td style="text-align:right">' + esc(KRW(b)) + '</td><td style="text-align:right;font-weight:700;color:' + (d < 0 ? 'var(--accent)' : d > 0 ? 'var(--ok)' : 'inherit') + '">' + (d > 0 ? '+' : '') + esc(KRW(d)) + '</td></tr>'; };
        h += '<table style="margin-top:8px"><thead><tr><th>' + esc(CT.t('ccMetric')) + '</th><th style="text-align:right">' + esc(CT.t('ccThis')) + '</th><th style="text-align:right">' + esc(o.name) + '</th><th style="text-align:right">' + esc(CT.t('ccDiff')) + '</th></tr></thead><tbody>' + row(CT.t('ccTotalIn'), e.income, oe.income) + row(CT.t('ccTotalOut'), e.expense + e.contingency, oe.expense + oe.contingency) + row(CT.t('ccNet'), e.net, oe.net) + '</tbody></table>'; } }
    return h + '</section>';
  }
  function updateResult() { var r = $('ccRes'); if (r) r.innerHTML = resultHtml(); var fc = $('ccFeeCheck'); if (fc) fc.innerHTML = feeCheckHtml(); }
  function updateFormulas() { document.querySelectorAll('[data-formula]').forEach(function (el) { var r = rowsOf(el.dataset.side)[+el.dataset.i]; if (r) el.innerHTML = '= ' + formula(r); }); }
  function mark() { C.dirty = true; var m = $('ccMsg'); if (m) m.textContent = ''; }

  // ── 동작 ──
  function bind() {
    var body = $('fnBody');
    body.oninput = function (e) {
      var t = e.target, m = model();
      if (t.id === 'ccName') { C.cur.name = t.value; mark(); return; }
      if (t.dataset.v) m.vars[t.dataset.v] = Math.max(0, Math.round(num(t.value)));
      else if (t.dataset.cont != null) m.contingencyPct = Math.min(50, Math.max(0, Number(t.value) || 0));
      else if (t.dataset.f && t.tagName === 'INPUT') { var r = rowsOf(t.dataset.side)[+t.dataset.i]; if (!r) return; var f = t.dataset.f; if (f === 'label') r.label = t.value; else r[f] = num(t.value); }
      else return;
      mark(); updateFormulas(); updateResult();
      if (t.dataset.v === 'days' || t.dataset.v === 'nights') { /* 일수·숙박 수가 바뀌면 줄의 "× N일" 표시도 바꿔야 해서 다시 그린다 */ var pos = t.dataset.v, val = t.value; F().render(); var again = document.querySelector('[data-v="' + pos + '"]'); if (again) { again.focus(); again.setSelectionRange(val.length, val.length); } }
    };
    body.onchange = async function (e) {
      var t = e.target, m = model();
      if (t.id === 'ccPick') { await pick(t.value); return; }
      if (t.id === 'ccCmp') { C.compare = t.value; updateResult(); return; }
      if (t.dataset.open != null) { m.includeOpening = t.checked; mark(); updateResult(); return; }
      if (t.dataset.f === 'mode') { setMode(rowsOf(t.dataset.side)[+t.dataset.i], t.value); mark(); F().render(); return; }
      if (t.dataset.f === 'who') { rowsOf(t.dataset.side)[+t.dataset.i].who = t.value; mark(); F().render(); return; }
      if (t.dataset.f === 'category') { rowsOf(t.dataset.side)[+t.dataset.i].category = t.value; mark(); updateResult(); }
    };
    body.onclick = async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.add) { var nr = K().newRow('fixed'); rowsOf(b.dataset.add).push(nr); mark(); F().render(); }
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
