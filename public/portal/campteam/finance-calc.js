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
      mFixed: '고정 금액 (한 번에 정해진 금액)', mPerson: '1인 단가 × 인원', mDay: '1인 1일 단가 × 인원 × 일수 (행사·활동비 등)', mNight: '1인 1박 단가 × 인원 × 숙박 수',
      ccAmountLabel: '금액', ccUnitLabel: '단가', ccWon: '원', ccPeopleWho: '인원', wdirect: '직접 입력', wcampers: '캠퍼 전체', wstaff: '스태프 전체', wall: '전체 (캠퍼+스태프)', ccPeopleUnit: '명', ccTimesPerDay: '하루', ccTimesUnit: '회', ccDaysUnit: '일', ccNightsUnit: '박',
      ccSched: '식사 일정 (끼니 수 계산)', ccSchedHelp: '캠프는 보통 첫날 아침부터 밥을 주지 않아요. 첫 끼니와 마지막 끼니를 고르면 날짜별 끼니 표가 자동으로 만들어지고, 식비는 「1끼 단가 × 인원 × 끼니 수」로 계산돼요. 칸을 눌러서 직접 넣거나 뺄 수도 있어요.', ccStartMeal: '첫날 처음 주는 끼니', ccEndMeal: '마지막 날 마지막 끼니', ccStartOpt: '부터', ccEndOpt: '까지', ccDayN: '일차', ccMealTotal: '끼니 합계', ccMealEdited: '직접 고친 칸이 있어요', ccMealReset: '자동 계산으로 되돌리기', ccMealTip: '칸을 누르면 넣거나 뺄 수 있어요', mealb: '아침', meall: '점심', meald: '저녁', meals: '간식', mealmain: '아침·점심·저녁 모두', mealbreakfast: '아침만', meallunch: '점심만', mealdinner: '저녁만', mealsnack: '간식만', ccMealWhich: '어떤 끼니', mMeal: '1인 1끼 단가 × 인원 × 끼니 수 (식비·간식비)', ccMealUnit: '끼', ccSnackUnit: '회', ccPortalTitle: '신청 현황으로 채우기', ccPortalWhat: '월코 포털 「캠프 관리자」의 신청 인원과 낸 금액을 읽어서 캠퍼 수와 캠프비 줄을 채워요. (캠프별 공간에서 포털 캠프를 연결해 둔 캠프만 나와요.) 지출 줄은 그대로예요.', ccPortalCamp: '캠프', ccPortalNone: '(연결된 캠프가 없어요)', ccPortalScen: '인원 기준', ccPortalMin: '확정만 (최소)', ccPortalExp: '예약금 수납 이상 (예상)', ccPortalMax: '신청한 사람 전부 (최대)', ccPortalDates: '캠프 날짜로 일수·숙박 수도 맞추기', ccPortalGo: '신청 현황 불러오기', ccPortalDone: '채웠어요:', ccPortalConfirm: '지금 있는 캠프비 수입 줄이 신청 현황 숫자로 바뀌어요. 계속할까요?', ccPortalFail: '신청 현황을 읽지 못했어요.', ccPortalPeople: '명', ccPortalFeeRow: '캠프비 (1인', ccPortalGroupRow: '캠프비 (단체·금액 합계)', ccPortalOpenCamp: '이 캠프의 신청 상세 보기',
      ccFormulaFixed: '고정 금액', ccPerDayHint: '끼니·간식처럼 하루에 몇 번인지', ccFeeCheck: '캠프비 인원 합계', ccFeeCheckSame: '캠퍼 수와 같아요', ccFeeCheckDiff: '캠퍼 수와 달라요 — 확인해 보세요', ccCampersWord: '캠퍼 수',
      ccResult: '계산 결과', ccTotalIn: '예상 수입', ccTotalOut: '예상 지출', ccContAmt: '예비비', ccOpeningAmt: '이월금', ccNet: '예상 남는 금액', ccNetGood: '흑자예요', ccNetBad: '적자예요', ccCostPer: '캠퍼 1인당 드는 비용', ccFeePer: '캠퍼 1인당 평균 캠프비', ccBreak: '손익분기 (적자도 흑자도 아닌 지점)', ccAvgNeeded: '남는 금액을 0으로 하려면 캠퍼 1인당 평균 캠프비가', ccAvgNow: '지금은', ccAvgOk: '지금 캠프비로도 적자가 아니에요', ccBreakCampers: '캠프비가 "캠퍼 전체"에 곱해지는 줄이 있을 때, 캠퍼가 이 인원 이상이면 남는 금액이 0 이상이에요', ccBreakCampersNone: '이 조건에서는 캠퍼를 더 받아도 적자가 안 없어져요 (인원이 늘면 지출도 같이 늘어요)', ccPeople: '명', ccFeeNeeded: '캠프비 단가를 모두 같은 비율로 올려 남는 금액을 0으로 만들려면', ccExpMix: '지출 항목 비중', ccCompare: '다른 안과 비교', ccCompareNone: '(비교 안 함)', ccMetric: '항목', ccThis: '이 계산', ccDiff: '차이',
      ccApply: '기간 예산에 적용…', ccApplyTitle: '기간 예산에 적용', ccApplyBody: '이 계산의 항목별 금액을 선택한 기간의 「기간 예산」(계획)으로 옮겨요. 장부(실제 거래)는 바뀌지 않아요.', ccApplyPeriod: '적용할 기간', ccApplyMode: '적용 방식', ccApplyMerge: '합치기 — 이 계산에 있는 항목만 바꾸고 나머지는 그대로', ccApplyReplace: '통째로 바꾸기 — 이 계산에 없는 기존 항목은 지움', ccApplyGo: '적용하기', ccApplyDone: '기간 예산에 적용했어요.', ccApplySkipped: '장부 항목에 없어서 건너뛴 이름', ccApplyNoPeriod: '적용할 수 있는 (열려 있는) 기간이 없어요.', ccApplyNothing: '적용할 항목이 없어요. 줄마다 「장부 항목」을 골라 주세요.' },
    en: { tabCalc: 'Calculator', ccTitle: 'Budget calculator', ccWhat: 'Enter the camp fee, headcount and amounts per category and it shows how much comes in, goes out and is left. It is a scratch pad — the ledger (real money) does not change.',
      ccHowTitle: 'How to use (3 steps)', ccHow1: '1. Fill in campers, staff, days and nights under "Basics".', ccHow2: '2. For each income/expense row choose a "How to calculate" and type the numbers. The formula appears under the row. e.g. Early bird 80,000 won × 60 people → "Unit price × people", price 80000, people "Enter manually" 60.', ccHow3: '3. Check "Expected remaining" on the right. Save it if you like it, and use "Apply to period budget" if needed.',
      ccBudgetWhatTitle: 'What is the "Period budget"?', ccBudgetWhat: 'The period budget is what you planned to spend (or receive) per category in this period (the Excel "예산" tab). The ledger summary compares actuals to it. When a calculation is settled, "Apply to period budget" copies its numbers into the plan. Actual transactions (the ledger) do not change.',
      ccScenario: 'Saved calculations', ccNewFromTemplate: 'New (template)', ccName: 'Name', ccSave: 'Save', ccSaved: 'Saved.', ccCopy: 'Copy as new', ccDelete: 'Delete', ccDeleteConfirm: 'Delete this calculation?', ccUnsaved: 'You have unsaved changes. Discard and continue?', ccViewOnly: 'This account can calculate but not save. (Saving: camp finance / director)', ccUntitled: 'Untitled',
      ccBasic: 'Basics', ccCampers: 'Campers (students)', ccStaff: 'Staff', ccDays: 'Days', ccNights: 'Nights', ccCont: 'Contingency (% of expenses)', ccContHint: 'Extra % of expenses set aside for surprises', ccOpening: 'Include carry-over', ccOpeningVal: 'Carry-over of this period',
      ccIncome: 'Income', ccExpense: 'Expenses', ccAddIncome: '+ Add income row', ccAddExpense: '+ Add expense row', ccName2: 'Name', ccCat: 'Ledger category', ccNoCat: '(none)', ccMethod: 'How to calculate',
      mFixed: 'Fixed amount', mPerson: 'Unit price × people', mDay: 'Per person per day × people × days (activities etc.)', mNight: 'Per person per night × people × nights',
      ccAmountLabel: 'Amount', ccUnitLabel: 'Price', ccWon: 'won', ccPeopleWho: 'People', wdirect: 'Enter manually', wcampers: 'All campers', wstaff: 'All staff', wall: 'Everyone (campers + staff)', ccPeopleUnit: '', ccTimesPerDay: 'per day', ccTimesUnit: 'times', ccDaysUnit: 'days', ccNightsUnit: 'nights',
      ccSched: 'Meal schedule (counts meals)', ccSchedHelp: 'Camps rarely serve breakfast on day one. Choose the first and last meal and a day-by-day table is built; food cost is unit price per meal × people × number of meals. Click a cell to add or remove a meal.', ccStartMeal: 'First meal on day 1', ccEndMeal: 'Last meal on the last day', ccStartOpt: ' onward', ccEndOpt: ' last', ccDayN: 'Day ', ccMealTotal: 'Total meals', ccMealEdited: 'Some cells were edited by hand', ccMealReset: 'Reset to automatic', ccMealTip: 'Click a cell to add or remove', mealb: 'Breakfast', meall: 'Lunch', meald: 'Dinner', meals: 'Snack', mealmain: 'Breakfast + lunch + dinner', mealbreakfast: 'Breakfasts only', meallunch: 'Lunches only', mealdinner: 'Dinners only', mealsnack: 'Snacks only', ccMealWhich: 'Which meals', mMeal: 'Per person per meal × people × number of meals (food, snacks)', ccMealUnit: ' meals', ccSnackUnit: ' times', ccPortalTitle: 'Fill from registrations', ccPortalWhat: 'Reads the portal Camp Manager’s registrations and amounts paid to fill campers and camp-fee rows. (Only camps linked to a portal camp in Camp Spaces appear.) Expense rows are unchanged.', ccPortalCamp: 'Camp', ccPortalNone: '(no linked camps)', ccPortalScen: 'Headcount basis', ccPortalMin: 'Confirmed only (min)', ccPortalExp: 'Deposit paid or more (expected)', ccPortalMax: 'Everyone who applied (max)', ccPortalDates: 'Also set days and nights from the camp dates', ccPortalGo: 'Load registrations', ccPortalDone: 'Filled:', ccPortalConfirm: 'The current camp-fee income rows will be replaced. Continue?', ccPortalFail: 'Could not read registrations.', ccPortalPeople: ' people', ccPortalFeeRow: 'Camp fee (per person', ccPortalGroupRow: 'Camp fee (group total)', ccPortalOpenCamp: 'Open this camp’s registrations',
      ccFormulaFixed: 'Fixed amount', ccPerDayHint: 'How many times a day (meals, snacks…)', ccFeeCheck: 'Camp fee headcount', ccFeeCheckSame: 'matches the number of campers', ccFeeCheckDiff: 'differs from campers — please check', ccCampersWord: 'campers',
      ccResult: 'Result', ccTotalIn: 'Expected income', ccTotalOut: 'Expected expenses', ccContAmt: 'Contingency', ccOpeningAmt: 'Carry-over', ccNet: 'Expected remaining', ccNetGood: 'surplus', ccNetBad: 'deficit', ccCostPer: 'Cost per camper', ccFeePer: 'Average camp fee per camper', ccBreak: 'Break-even', ccAvgNeeded: 'To bring the balance to zero, the average camp fee per camper needs to be', ccAvgNow: 'now', ccAvgOk: 'No deficit even at the current camp fee', ccBreakCampers: 'If a camp fee row is multiplied by "all campers", this many campers or more brings the balance to zero or above', ccBreakCampersNone: 'With these inputs more campers does not remove the deficit (expenses grow with headcount too)', ccPeople: '', ccFeeNeeded: 'Raising all camp fee prices by the same ratio to reach zero', ccExpMix: 'Expense mix', ccCompare: 'Compare with another', ccCompareNone: '(none)', ccMetric: 'Item', ccThis: 'This one', ccDiff: 'Difference',
      ccApply: 'Apply to period budget…', ccApplyTitle: 'Apply to period budget', ccApplyBody: 'Moves this calculation’s per-category amounts into the chosen period’s "Period budget" (the plan). The ledger (actual transactions) is not changed.', ccApplyPeriod: 'Period', ccApplyMode: 'How', ccApplyMerge: 'Merge — change only the categories in this calculation', ccApplyReplace: 'Replace — remove existing categories not in this calculation', ccApplyGo: 'Apply', ccApplyDone: 'Applied to the period budget.', ccApplySkipped: 'Skipped (not in the ledger category list)', ccApplyNoPeriod: 'No open period to apply to.', ccApplyNothing: 'Nothing to apply. Pick a "Ledger category" on each row.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, F = function () { return window.FIN; }, KRW = function (n) { return CT.money(n, 'KRW'); }, K = function () { return window.CampCalc; };
  var C = { list: null, cur: null, dirty: false, compare: '', msg: '', camps: null, pCamp: '', pScen: 'expected', pDates: true, pMsg: '' };
  var canSave = function () { return !!(F().S.perms && F().S.perms.ledgerWrite); };
  var openingAmt = function () { var s = F().S.sum; return s && s.opening ? (s.opening.kind === 'income' ? s.opening.amount : -s.opening.amount) : 0; };
  var model = function () { return C.cur.model; }, rowsOf = function (side) { return model()[side]; };
  var num = function (v) { return Number(String(v).replace(/[,\s₩원명]/g, '')) || 0; };
  var n0 = function (n) { return Number(n).toLocaleString('en-US'); };

  async function load() {
    try { C.list = (await F().api('ledger-calc')).items; } catch (e) { C.list = []; } if (!C.cur) fresh();
    if (!C.camps) { try { C.camps = (await CT.api('/api/campteam/camps')).types.reduce(function (a, t) { return a.concat(t.camps.filter(function (c) { return c.registrationCampId; })); }, []); } catch (e) { C.camps = []; } var want = new URLSearchParams(location.search).get('camp'); if (want && C.camps.some(function (c) { return c.id === want; })) C.pCamp = want; else if (C.camps.length) C.pCamp = C.camps[0].id; }
  }
  function fresh() { C.cur = { id: null, name: '', model: K().template(), campId: null, periodId: null }; C.dirty = false; C.compare = ''; }
  var modeOf = function (r) { return r.kind === 'fixed' ? 'fixed' : r.per === 'meals' ? 'meal' : r.per === 'days' ? 'day' : r.per === 'nights' ? 'night' : 'person'; };
  function setMode(r, mode) { if (mode === 'fixed') r.kind = 'fixed'; else { r.kind = 'unit'; r.per = mode === 'meal' ? 'meals' : mode === 'day' ? 'days' : mode === 'night' ? 'nights' : 'none'; if (!r.mult) r.mult = 1; if (mode === 'meal' && !r.meal) r.meal = 'main'; } }

  // 줄 아래에 보이는 계산식: "80,000원 × 60명 = 4,800,000원"
  function formula(r) {
    var p = K().parts(r, model().vars); if (p.fixed) return esc(CT.t('ccFormulaFixed')) + ' ' + esc(n0(p.total)) + esc(CT.t('ccWon'));
    var s = n0(p.unit) + CT.t('ccWon') + ' × ' + n0(p.people) + CT.t('ccPeopleUnit');
    if (p.per === 'days') s += ' × ' + p.times + CT.t('ccDaysUnit') + (p.mult !== 1 ? ' × ' + CT.t('ccTimesPerDay') + ' ' + p.mult + CT.t('ccTimesUnit') : '');
    if (p.per === 'nights') s += ' × ' + p.times + CT.t('ccNightsUnit');
    if (p.per === 'meals') { var mc = K().mealCounts(model().vars); s += ' × ' + (p.meal === 'main' ? p.times + CT.t('ccMealUnit') + ' (' + CT.t('mealb') + ' ' + mc.breakfast + '·' + CT.t('meall') + ' ' + mc.lunch + '·' + CT.t('meald') + ' ' + mc.dinner + ')' : CT.t('meal' + p.meal) + ' ' + p.times + (p.meal === 'snack' ? CT.t('ccSnackUnit') : CT.t('ccMealUnit'))); }
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
    return h + '<div class="ccgrid"><div>' + portalHtml() + basicHtml() + schedHtml() + sideHtml('income') + sideHtml('expense') + '</div><div class="ccres" id="ccRes">' + resultHtml() + '</div></div>';
  }
  function schedHtml() {
    var m = model(), v = m.vars, plan = K().mealPlan(v), mc = K().mealCounts(v), edited = Object.keys(v.edits || {}).length > 0, opt = function (list, cur) { return list.map(function (k) { return '<option value="' + k + '"' + (cur === k ? ' selected' : '') + '>' + esc(CT.t('meal' + k.charAt(0))) + '</option>'; }).join(''); };
    var letters = { breakfast: 'b', lunch: 'l', dinner: 'd' }, opts = function (cur, suffix) { return K().MEAL_START.map(function (k) { return '<option value="' + k + '"' + (cur === k ? ' selected' : '') + '>' + esc(CT.t('meal' + letters[k]) + CT.t(suffix)) + '</option>'; }).join(''); };
    var cell = function (day, k, on) { return '<button type="button" class="mealc' + (on ? ' on' : '') + '" data-chip="' + day + k + '" aria-pressed="' + (on ? 'true' : 'false') + '" title="' + esc(CT.t('ccMealTip')) + '">' + esc(CT.t('meal' + k)) + '</button>'; };
    return '<section class="card" style="margin-bottom:14px"><h2>' + esc(CT.t('ccSched')) + '</h2><div class="hintbox">' + esc(CT.t('ccSchedHelp')) + '</div><div class="ccvars" style="margin-top:10px"><label>' + esc(CT.t('ccStartMeal')) + '<select data-sm="startMeal">' + opts(v.startMeal, 'ccStartOpt') + '</select></label><label>' + esc(CT.t('ccEndMeal')) + '<select data-sm="endMeal">' + opts(v.endMeal, 'ccEndOpt') + '</select></label></div>' +
      '<div class="mealgrid">' + plan.map(function (r) { return '<div class="mealday"><b>' + esc(CT.lang() === 'en' ? CT.t('ccDayN') + r.day : r.day + CT.t('ccDayN')) + '</b>' + cell(r.day, 'b', r.b) + cell(r.day, 'l', r.l) + cell(r.day, 'd', r.d) + cell(r.day, 's', r.s) + '</div>'; }).join('') + '</div>' +
      '<div class="hint" style="margin-top:8px">' + esc(CT.t('ccMealTotal')) + ': <b>' + mc.main + esc(CT.t('ccMealUnit')) + '</b> (' + esc(CT.t('mealb') + ' ' + mc.breakfast + ' · ' + CT.t('meall') + ' ' + mc.lunch + ' · ' + CT.t('meald') + ' ' + mc.dinner) + ') · ' + esc(CT.t('meals')) + ' ' + mc.snack + esc(CT.t('ccSnackUnit')) + (edited ? ' · <span style="color:var(--accent)">' + esc(CT.t('ccMealEdited')) + '</span> <button class="btn sm" type="button" id="ccMealReset">' + esc(CT.t('ccMealReset')) + '</button>' : '') + '</div></section>';
  }
  function portalHtml() {
    var cs = C.camps || [], opt = function (v, k) { return '<option value="' + v + '"' + (C.pScen === v ? ' selected' : '') + '>' + esc(CT.t(k)) + '</option>'; };
    var cur = cs.filter(function (c) { return c.id === C.pCamp; })[0], dated = cur && cur.startDate && cur.endDate && cur.endDate >= cur.startDate;
    return '<section class="card" style="margin-bottom:14px"><h2>' + esc(CT.t('ccPortalTitle')) + '</h2><div class="hintbox">' + esc(CT.t('ccPortalWhat')) + '</div>' + (cs.length ? '<div class="ccvars" style="margin-top:10px"><label>' + esc(CT.t('ccPortalCamp')) + '<select id="ccPCamp">' + cs.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === C.pCamp ? ' selected' : '') + '>' + esc(CT.pick(c, 'name')) + '</option>'; }).join('') + '</select></label><label>' + esc(CT.t('ccPortalScen')) + '<select id="ccPScen">' + opt('min', 'ccPortalMin') + opt('expected', 'ccPortalExp') + opt('max', 'ccPortalMax') + '</select></label></div>' +
      (dated ? '<label class="chk" style="margin-top:8px"><input type="checkbox" id="ccPDates"' + (C.pDates ? ' checked' : '') + '> ' + esc(CT.t('ccPortalDates')) + ' <span class="hint">(' + esc(cur.startDate) + ' ~ ' + esc(cur.endDate) + ')</span></label>' : '') +
      '<div style="margin-top:10px;display:flex;gap:10px;align-items:center;flex-wrap:wrap"><button class="btn pri" id="ccPGo">' + esc(CT.t('ccPortalGo')) + '</button> <a class="btn sm" href="/portal/campteam/space/?id=' + encodeURIComponent(C.pCamp) + '">' + esc(CT.t('ccPortalOpenCamp')) + '</a><span class="hint" id="ccPMsg">' + esc(C.pMsg) + '</span></div>' : '<div class="hint" style="margin-top:8px">' + esc(CT.t('ccPortalNone')) + '</div>') + '</section>';
  }
  async function portalFill() {
    var m = model(), cur = (C.camps || []).filter(function (c) { return c.id === C.pCamp; })[0]; if (!cur) return;
    var hasFee = m.income.some(function (r) { return (r.category === '캠프비' || K().isFeeRow(r)) && (r.amount || r.unit || r.qty); });
    if (hasFee && !confirm(CT.t('ccPortalConfirm'))) return;
    var d; try { d = await CT.api('/api/campteam/camp-portal?campId=' + encodeURIComponent(cur.id)); } catch (e) { C.pMsg = e.message; F().render(); return; }
    if (!d.linked || d.unavailable || !d.scenarios) { C.pMsg = CT.t('ccPortalFail'); F().render(); return; }
    var sc = d.scenarios[C.pScen], fr = d.feeRows[C.pScen];
    m.income = m.income.filter(function (r) { return !(r.category === '캠프비' || K().isFeeRow(r)); });
    var rows = fr.buckets.map(function (b) { var r = K().newRow('unit'); r.label = CT.t('ccPortalFeeRow') + ' ' + n0(b.unit) + CT.t('ccWon') + ')'; r.category = '캠프비'; r.unit = b.unit; r.who = 'direct'; r.qty = b.qty; r.per = 'none'; return r; });
    if (fr.fixed) { var g = K().newRow('fixed'); g.label = CT.t('ccPortalGroupRow'); g.category = '캠프비'; g.amount = fr.fixed; rows.push(g); }
    m.income = rows.concat(m.income); m.vars.campers = sc.heads;
    var dated = cur.startDate && cur.endDate && cur.endDate >= cur.startDate; if (dated && C.pDates) { var n = Math.round((Date.parse(cur.endDate) - Date.parse(cur.startDate)) / 86400000); m.vars.nights = Math.min(60, n); m.vars.days = Math.min(60, n + 1); }
    if (!C.cur.campId) C.cur.campId = cur.id;
    C.pMsg = CT.t('ccPortalDone') + ' ' + sc.heads + CT.t('ccPortalPeople') + ' · ' + KRW(sc.income); mark(); F().render();
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
    var line2 = '<select' + d + ' data-f="mode" aria-label="' + esc(CT.t('ccMethod')) + '"><option value="fixed"' + (mode === 'fixed' ? ' selected' : '') + '>' + esc(CT.t('mFixed')) + '</option><option value="person"' + (mode === 'person' ? ' selected' : '') + '>' + esc(CT.t('mPerson')) + '</option><option value="meal"' + (mode === 'meal' ? ' selected' : '') + '>' + esc(CT.t('mMeal')) + '</option><option value="day"' + (mode === 'day' ? ' selected' : '') + '>' + esc(CT.t('mDay')) + '</option><option value="night"' + (mode === 'night' ? ' selected' : '') + '>' + esc(CT.t('mNight')) + '</option></select>';
    var line3 = '';
    if (!unit) line3 = '<label>' + esc(CT.t('ccAmountLabel')) + ' <input' + d + ' data-f="amount" inputmode="numeric" value="' + esc(r.amount) + '" class="num"></label> ' + esc(CT.t('ccWon'));
    else {
      line3 = '<label>' + esc(CT.t('ccUnitLabel')) + ' <input' + d + ' data-f="unit" inputmode="numeric" value="' + esc(r.unit) + '" class="num"></label> ' + esc(CT.t('ccWon')) + ' × <label>' + esc(CT.t('ccPeopleWho')) + ' <select' + d + ' data-f="who">' + K().WHO.map(function (w) { return '<option value="' + w + '"' + (r.who === w ? ' selected' : '') + '>' + esc(CT.t('w' + w)) + '</option>'; }).join('') + '</select></label>' +
        (r.who === 'direct' ? ' <input' + d + ' data-f="qty" inputmode="numeric" value="' + esc(r.qty) + '" class="num s"> ' + esc(CT.t('ccPeopleUnit')) : ' <span class="hint">(' + n0(K().peopleOf(r, model().vars)) + esc(CT.t('ccPeopleUnit')) + ')</span>') +
        (r.per === 'days' ? ' × ' + model().vars.days + esc(CT.t('ccDaysUnit')) + ' × <label>' + esc(CT.t('ccTimesPerDay')) + ' <input' + d + ' data-f="mult" inputmode="decimal" value="' + esc(r.mult) + '" class="num s"> ' + esc(CT.t('ccTimesUnit')) + '</label>' : '') + (r.per === 'nights' ? ' × ' + model().vars.nights + esc(CT.t('ccNightsUnit')) : '') + (r.per === 'meals' ? ' × <label>' + esc(CT.t('ccMealWhich')) + ' <select' + d + ' data-f="meal">' + K().MEAL_SET.map(function (w) { return '<option value="' + w + '"' + ((r.meal || 'main') === w ? ' selected' : '') + '>' + esc(CT.t('meal' + w)) + '</option>'; }).join('') + '</select></label> <span class="hint">(' + K().timesOf(r, model().vars) + esc(CT.t(r.meal === 'snack' ? 'ccSnackUnit' : 'ccMealUnit')) + ')</span>' : '');
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
      if (t.id === 'ccPCamp') { C.pCamp = t.value; C.pMsg = ''; F().render(); return; }
      if (t.id === 'ccPScen') { C.pScen = t.value; return; }
      if (t.id === 'ccPDates') { C.pDates = t.checked; return; }
      if (t.id === 'ccCmp') { C.compare = t.value; updateResult(); return; }
      if (t.dataset.open != null) { m.includeOpening = t.checked; mark(); updateResult(); return; }
      if (t.dataset.f === 'mode') { setMode(rowsOf(t.dataset.side)[+t.dataset.i], t.value); mark(); F().render(); return; }
      if (t.dataset.sm) { m.vars[t.dataset.sm] = t.value; mark(); F().render(); return; }
      if (t.dataset.f === 'meal') { rowsOf(t.dataset.side)[+t.dataset.i].meal = t.value; mark(); F().render(); return; }
      if (t.dataset.f === 'who') { rowsOf(t.dataset.side)[+t.dataset.i].who = t.value; mark(); F().render(); return; }
      if (t.dataset.f === 'category') { rowsOf(t.dataset.side)[+t.dataset.i].category = t.value; mark(); updateResult(); }
    };
    body.onclick = async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.add) { var nr = K().newRow('fixed'); rowsOf(b.dataset.add).push(nr); mark(); F().render(); }
      else if (b.dataset.del != null) { rowsOf(b.dataset.side).splice(+b.dataset.i, 1); mark(); F().render(); }
      else if (b.dataset.chip) { var key = b.dataset.chip, v = model().vars, plan = K().mealPlan(v), day = parseInt(key, 10), k = key.slice(-1), cur = (plan[day - 1] || {})[k] ? 1 : 0, auto = K().mealPlan({ days: v.days, startMeal: v.startMeal, endMeal: v.endMeal, edits: {} })[day - 1][k]; v.edits = v.edits || {}; if ((1 - cur) === auto) delete v.edits[key]; else v.edits[key] = 1 - cur; mark(); F().render(); }
      else if (b.id === 'ccMealReset') { model().vars.edits = {}; mark(); F().render(); }
      else if (b.id === 'ccPGo') portalFill();
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
      if (C.cur.id && !asCopy) await F().api('ledger-calc?id=' + encodeURIComponent(C.cur.id), { method: 'PATCH', body: { name: name, model: model(), periodId: F().S.pid, campId: C.cur.campId || null } });
      else { var r = await F().api('ledger-calc', { method: 'POST', body: { name: name, model: model(), periodId: F().S.pid, campId: C.cur.campId || null } }); C.cur.id = r.id; }
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
