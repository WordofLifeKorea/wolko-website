// 캠프 예산 · 회계 장부 화면: 요약 / 장부 / 기간 예산 / 항목 목록 / 기간·마감
(function () {
  CT.addDict({
    ko: { fnTitle: '캠프 예산 · 회계 장부', fnSub: '예산안과 실제 수입·지출을 한곳에서 보고, 기간별로 마감해 남은 금액을 다음 기간으로 넘겨요.', fnPeriod: '기간',
      tabSummary: '요약', tabLedger: '장부', tabImport: '엑셀 가져오기', tabExpense: '경비 연동', tabRecon: '잔액 대조', tabPlan: '기간 예산', tabMore: '⋯ 더보기', perNowLabel: '지금 보는 기간', perManage: '기간 관리 · 마감', tabCats: '항목 목록', tabPeriods: '기간 · 마감', tabCampBudget: '캠프별 예산안',
      lastRecon: '최근 잔액 대조', reconOk: '통장과 장부가 일치해요', reconDiff: '통장과 장부 차이', balTitle: '캠프 통장 잔액 (장부 기준)', balAsOf: '기준', balIn: '수입', balOut: '지출', balCheck: '통장과 맞는지 확인하기', balChecked: '마지막 통장 확인', balMatch: '일치', balDiff: '차이', balNever: '아직 통장 확인 기록이 없어요', balHelp: '장부 입력에 맞춰 잔액이 바로 바뀌어요. 첫 기간의 이월금(또는 엑셀 첫 줄)을 통장의 실제 잔액으로 맞춰 두면, 이 숫자가 곧 통장 잔액이에요. 「잔액 대조」로 가끔 확인해 주세요.', viewOnlyTre: '월코 재정 담당 계정은 조회만 할 수 있어요. 수정은 캠프 재정 담당과 디렉터가 해요.', viewOnlyMem: '일반 캠프팀 팀원은 조회만 할 수 있어요. 수정은 캠프 재정 담당과 디렉터가 해요.', closedNote: '마감된 기간이에요. 고치려면 「기간 · 마감」에서 먼저 다시 열어 주세요.',
      opening: '이월금', income: '수입', expense: '지출', balance: '현재 잔액', planned: '예산', actual: '실제', remaining: '남은 예산', achieved: '목표 대비', expectedEnd: '예산대로면 기간 끝 잔액',
      expenseByCat: '지출 항목별 (예산 대비 실제)', incomeByCat: '수입 항목별 (목표 대비 실제)', monthly: '월별 흐름', noData: '아직 거래가 없어요.', cat: '항목', needReview: '분류를 확인해야 하는 거래가', needReviewTail: '건 있어요. 장부에서 확인해 주세요.',
      date: '날짜', kind: '구분', desc: '내용', note: '비고', amount: '금액', bal: '잔액', source: '출처', act: '', add: '추가', edit: '수정', del: '삭제', all: '전체', search: '내용·비고 검색', month: '월', carryLabel: '이월', srcmanual: '직접', srcexcel: '엑셀', srcexpense: '경비 리포트', srccarry: '이월',
      quickAdd: '빠른 입력', addEntry: '+ 거래 추가', newEntry: '거래 추가', editEntry: '거래 수정', confirmDel: '이 거래를 지울까요? (삭제 표시만 되며 변경 기록에 남아요)', noEntries: '조건에 맞는 거래가 없어요.', entryCount: '건',
      planTitle: '기간 예산은 "이 기간에 항목별로 얼마를 쓰기로(받기로) 계획했는지"예요(엑셀의 「예산」 탭). 요약 화면의 「예산 대비 실제」가 이 숫자와 실제 거래를 비교해요. 직접 적거나, 계산기의 「기간 예산에 적용」으로 채울 수 있어요. 실제 돈(장부)은 바뀌지 않아요.', planSave: '저장', planCopy: '지난 기간에서 가져오기', planCopyPick: '가져올 기간', planSaved: '저장했어요.', planTotalIn: '예산 수입 합계', planTotalOut: '예산 지출 합계', planExpected: '예산대로면 기간 끝 잔액(이월금 포함)',
      catTitleIn: '수입 항목', catTitleOut: '지출 항목', catAdd: '항목 추가', catName: '항목 이름', catRename: '이름 바꾸기', catUsed: '건 사용', catOff: '사용 안 함', catOn: '다시 사용', catHelp: '엑셀의 "목록" 탭과 같아요. 쓰던 항목은 지우지 않고 "사용 안 함"으로 바꿔요. 이름을 바꾸면 이미 쓴 거래의 이름도 함께 바뀌어요.', catInactive: '사용 안 함', up: '위로', down: '아래로',
      perTitle: '기간 · 마감 · 보관', perNew: '+ 새 기간', perName: '기간 이름', perStart: '시작일', perEnd: '끝나는 날', perStatus: '상태', perOpen: '진행 중', perClosed: '마감됨', perCarry: '넘긴 곳', perClose: '마감하기', perReopen: '다시 열기', perView: '보기', perPreset: '기간 길이', perPresetCustom: '직접 정함', per6: '6개월', per3: '3개월 (분기)', perNote: '메모',
      closeTitle: '기간 마감', closeBody: '마감하면 이 기간은 잠기고(보관), 남은 금액이 다음 기간의 「이월금」으로 넘어가요. 다시 열면 넘어간 이월금은 거둬져요.', closeBal: '마감 시 잔액', closeNext: '남은 금액을 넘길 곳', closeNew: '새 기간 만들어서 넘기기', closeNone: '넘기지 않고 마감', closeConfirm: '마감하기', reopenConfirm: '이 기간을 다시 열까요? 다음 기간으로 넘어간 이월금이 거둬져요.', perDeleteConfirm: '이 기간을 지울까요?', noNextOpen: '(넘길 수 있는 열린 기간이 없어요)',
      loadFail: '불러오지 못했어요', fromLabel: '이월 적자' },
    en: { balTitle: 'Camp bank balance (per ledger)', balAsOf: 'as of', balIn: 'Income', balOut: 'Expenses', balCheck: 'Check against the bank', balChecked: 'Last bank check', balMatch: 'matched', balDiff: 'difference', balNever: 'No bank check recorded yet', balHelp: 'The balance changes right as you enter transactions. If the first period’s carry-over (or the first Excel row) matches the real bank balance, this number is the bank balance. Check it now and then in Reconcile.', lastRecon: 'Last reconciliation', reconOk: 'Bank and ledger match', reconDiff: 'Bank vs ledger difference', fnTitle: 'Camp Budget · Ledger', fnSub: 'See the budget plan and actual income/expenses together, close each period and carry the balance forward.', fnPeriod: 'Period',
      tabSummary: 'Summary', tabLedger: 'Ledger', tabImport: 'Excel import', tabExpense: 'Expense reports', tabRecon: 'Reconcile', tabPlan: 'Period budget', tabMore: '⋯ More', perNowLabel: 'Viewing period', perManage: 'Manage periods · close', tabCats: 'Categories', tabPeriods: 'Periods · Close', tabCampBudget: 'Per-camp plan',
      viewOnlyTre: 'WOLKO finance accounts are view-only. Camp finance and the director make changes.', viewOnlyMem: 'Camp team members are view-only here. Camp finance and the director make changes.', closedNote: 'This period is closed. Reopen it under "Periods · Close" to edit.',
      opening: 'Carried over', income: 'Income', expense: 'Expenses', balance: 'Balance', planned: 'Budget', actual: 'Actual', remaining: 'Remaining', achieved: 'vs target', expectedEnd: 'Balance at period end if on budget',
      expenseByCat: 'Expenses by category (actual vs budget)', incomeByCat: 'Income by category (actual vs target)', monthly: 'Monthly flow', noData: 'No entries yet.', cat: 'Category', needReview: 'Entries needing classification:', needReviewTail: '. Please check them in the ledger.',
      date: 'Date', kind: 'Type', desc: 'Description', note: 'Note', amount: 'Amount', bal: 'Balance', source: 'Source', act: '', add: 'Add', edit: 'Edit', del: 'Delete', all: 'All', search: 'Search description/note', month: 'Month', carryLabel: 'Carry', srcmanual: 'Manual', srcexcel: 'Excel', srcexpense: 'Expense report', srccarry: 'Carry-over',
      quickAdd: 'Quick entry', addEntry: '+ Add entry', newEntry: 'Add entry', editEntry: 'Edit entry', confirmDel: 'Delete this entry? (It is only marked deleted and kept in the change log.)', noEntries: 'No entries match.', entryCount: '',
      planTitle: 'The period budget is what you planned to spend (or receive) per category in this period (the Excel "예산" tab). The summary compares actual transactions with it ("actual vs budget"). Type it in, or fill it from the calculator\'s "Apply to period budget". The ledger (real money) does not change.', planSave: 'Save', planCopy: 'Copy from a previous period', planCopyPick: 'Period to copy', planSaved: 'Saved.', planTotalIn: 'Planned income', planTotalOut: 'Planned expenses', planExpected: 'Balance at period end if on budget (incl. carry-over)',
      catTitleIn: 'Income categories', catTitleOut: 'Expense categories', catAdd: 'Add category', catName: 'Category name', catRename: 'Rename', catUsed: ' used', catOff: 'Disable', catOn: 'Enable', catHelp: 'Same as the "목록" tab in Excel. Categories you used are never deleted — disable them. Renaming also renames them on existing entries.', catInactive: 'disabled', up: 'Up', down: 'Down',
      perTitle: 'Periods · Close · Archive', perNew: '+ New period', perName: 'Period name', perStart: 'Start', perEnd: 'End', perStatus: 'Status', perOpen: 'Open', perClosed: 'Closed', perCarry: 'Carried to', perClose: 'Close', perReopen: 'Reopen', perView: 'View', perPreset: 'Length', perPresetCustom: 'Custom', per6: '6 months', per3: '3 months (quarter)', perNote: 'Note',
      closeTitle: 'Close period', closeBody: 'Closing locks this period (archive) and carries the remaining balance into the next period as "Carried over". Reopening takes it back.', closeBal: 'Balance at close', closeNext: 'Carry the balance to', closeNew: 'Create a new period and carry to it', closeNone: 'Close without carrying', closeConfirm: 'Close', reopenConfirm: 'Reopen this period? The carried-over amount in the next period is removed.', perDeleteConfirm: 'Delete this period?', noNextOpen: '(no open period to carry to)',
      loadFail: 'Could not load', fromLabel: 'Carried deficit' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, KRW = function (n) { return CT.money(n, 'KRW'); };
  var S = { periods: [], pid: null, tab: 'summary', sum: null, entries: null, cats: null, plan: null, filter: { kind: '', category: '', q: '', month: '' }, perms: null, qa: { date: '', kind: 'expense' } };
  var TABS_PRIMARY = ['summary', 'ledger', 'periods', 'plan'], TABS_MORE = ['import', 'expense', 'recon', 'calc', 'cats'], TABS_ALL = TABS_PRIMARY.concat(TABS_MORE);
  var allow = function (t) { return t !== 'import' || !!(S.perms && S.perms.moneyWrite); }, tabs = function () { return TABS_ALL.filter(allow); };
  var tabLabel = function (t) { return CT.t('tab' + t.charAt(0).toUpperCase() + t.slice(1)); };
  var ext = function () { return window.FinTabs && window.FinTabs[S.tab]; }; // 엑셀 가져오기·경비 연동·잔액 대조 등은 별도 파일이 FinTabs 에 등록한다
  var today = function () { var d = new Date(Date.now() + 9 * 3600e3); return d.toISOString().slice(0, 10); };
  var cur = function () { return S.periods.filter(function (p) { return p.id === S.pid; })[0]; };
  var canEdit = function () { return !!(S.perms && S.perms.moneyWrite && cur() && cur().status === 'open'); };
  var canAdmin = function () { return !!(S.perms && S.perms.moneyAdmin); };
  var api = function (p, o) { return CT.api('/api/campteam/' + p, o); };

  // ── 날짜 도우미 ──
  function addMonths(ymd, n) { var a = ymd.split('-').map(Number), d = new Date(Date.UTC(a[0], a[1] - 1 + n, a[2])); return d.toISOString().slice(0, 10); }
  function addDays(ymd, n) { var d = new Date(Date.parse(ymd + 'T00:00:00Z') + n * 86400000); return d.toISOString().slice(0, 10); }
  function suggest(start, months) { // 시작일·길이로 끝나는 날과 이름을 제안
    var end = addDays(addMonths(start, months), -1), y = +start.slice(0, 4), m = +start.slice(5, 7), name = '';
    if (months === 6 && (m === 1 || m === 7)) name = y + (m === 1 ? ' 상반기' : ' 하반기');
    else if (months === 3 && [1, 4, 7, 10].indexOf(m) >= 0) name = y + ' ' + ((m - 1) / 3 + 1) + '분기';
    else name = start.slice(0, 7) + ' ~ ' + end.slice(0, 7);
    return { end: end, name: name };
  }

  // ── 불러오기 ──
  var wantTab = new URLSearchParams(location.search).get('tab'); // 다른 화면(캠프별 예산안 등)에서 특정 탭으로 바로 들어올 수 있다
  async function loadPeriods() {
    S.periods = (await api('ledger-periods')).periods;
    var want = new URLSearchParams(location.search).get('period');
    if (!S.pid || !cur()) {
      var t = today();
      S.pid = (S.periods.filter(function (p) { return p.id === want; })[0] || S.periods.filter(function (p) { return p.status === 'open' && p.startDate <= t && p.endDate >= t; })[0] || S.periods.filter(function (p) { return p.status === 'open'; }).sort(function (a, b) { return a.startDate < b.startDate ? -1 : 1; })[0] || S.periods[0] || {}).id || null;
    }
  }
  async function loadTab() {
    if (!S.pid) { S.sum = null; return; }
    S.sum = await api('ledger-summary?periodId=' + encodeURIComponent(S.pid));
    if (S.tab === 'ledger') { var q = new URLSearchParams({ periodId: S.pid }); ['kind', 'category', 'q', 'month'].forEach(function (k) { if (S.filter[k]) q.set(k, S.filter[k]); }); S.entries = await api('ledger?' + q); }
    if (S.tab === 'plan') S.plan = (await api('ledger-plan?periodId=' + encodeURIComponent(S.pid))).items;
    if (ext() && ext().load) await ext().load();
    if (S.tab === 'ledger' || S.tab === 'plan' || S.tab === 'cats' || S.tab === 'summary') S.cats = await api('ledger-categories');
  }
  async function refresh() { await loadPeriods(); await loadTab(); render(); }

  // ── 그리기 ──
  function render() {
    var sel = $('fnPeriodSel'); sel.innerHTML = S.periods.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === S.pid ? ' selected' : '') + '>' + esc(p.name) + (p.status === 'closed' ? ' (' + esc(CT.t('perClosed')) + ')' : '') + '</option>'; }).join('');
    var vo = $('fnViewOnly'), role = CT.me && CT.me.campRole; vo.hidden = !!(S.perms && S.perms.moneyWrite);
    if (!vo.hidden) vo.textContent = CT.t(role === 'treasurer' ? 'viewOnlyTre' : 'viewOnlyMem');
    if (S.pid && cur() && cur().status === 'closed' && S.perms && S.perms.moneyWrite) { vo.hidden = false; vo.textContent = CT.t('closedNote'); }
    var more = TABS_MORE.filter(allow), inMore = more.indexOf(S.tab) >= 0;
    $('fnTabs').innerHTML = TABS_PRIMARY.map(function (t) { return '<button class="tab' + (S.tab === t ? ' on' : '') + '" data-tab="' + t + '">' + esc(tabLabel(t)) + '</button>'; }).join('') +
      '<div class="tabmore"><button class="tab' + (inMore ? ' on' : '') + '" id="fnMoreBtn" aria-haspopup="true" aria-expanded="false">' + esc(inMore ? '⋯ ' + tabLabel(S.tab) : CT.t('tabMore')) + '</button><div class="moremenu" id="fnMoreMenu" hidden>' +
      more.map(function (t) { return '<button class="mi' + (S.tab === t ? ' on' : '') + '" data-tab="' + t + '">' + esc(tabLabel(t)) + '</button>'; }).join('') + '<a class="mi" href="/portal/campteam/budget/">' + esc(CT.t('tabCampBudget')) + '</a></div></div>' + CT.help('tab' + S.tab.charAt(0).toUpperCase() + S.tab.slice(1));
    $('fnPerHelp').innerHTML = CT.help('period');
    $('fnPerManage').hidden = !(S.perms && S.perms.moneyRead); $('fnPerNew').hidden = !canAdmin();
    $('fnBanner').innerHTML = bannerHtml();
    var body = $('fnBody');
    if (ext()) body.innerHTML = ext().html();
    else if (S.tab === 'cats') body.innerHTML = catsHtml();
    else if (S.tab === 'periods') body.innerHTML = periodsHtml();
    else if (!S.pid || !S.sum) body.innerHTML = '<div class="hintbox">' + esc(CT.t('noData')) + (canAdmin() ? ' <button class="btn sm pri" data-a="newPeriod">' + esc(CT.t('perNew')) + '</button>' : '') + '</div>';
    else body.innerHTML = S.tab === 'summary' ? summaryHtml() : S.tab === 'ledger' ? ledgerHtml() : planHtml();
    if (S.tab === 'ledger') bindQuick();
    if (ext()) ext().bind();
  }

  function bar(pct, over) { return '<div class="bar"><i style="width:' + Math.min(100, Math.max(0, pct)) + '%;' + (over ? 'background:var(--accent)' : '') + '"></i></div>'; }
  /** 모든 탭 맨 위: 지금 캠프 통장 잔액(장부 기준) — 거래를 넣으면 바로 바뀐다 */
  function bannerHtml() {
    var s = S.sum; if (!s || !S.pid) return '';
    var r = s.lastReconcile, rec = r ? (r.diff === 0 ? '<b style="color:var(--ok)">' + esc(CT.t('balMatch')) + '</b>' : '<b style="color:var(--accent)">' + esc(CT.t('balDiff')) + ' ' + esc(KRW(r.diff)) + '</b>') + ' · ' + esc(r.asOfDate) : esc(CT.t('balNever'));
    return '<div class="balbar"><div class="bb1"><label>' + esc(CT.t('balTitle')) + CT.help('balance') + '</label><strong style="color:' + (s.balanceAsOf < 0 ? 'var(--accent)' : 'var(--blue)') + '">' + esc(KRW(s.balanceAsOf)) + '</strong><small>' + esc(s.asOf) + ' ' + esc(CT.t('balAsOf')) + ' · ' + esc(CT.t('balIn')) + ' ' + esc(KRW(s.totals.income)) + ' · ' + esc(CT.t('balOut')) + ' ' + esc(KRW(s.totals.expense)) + '</small></div><div class="bb2"><small>' + esc(CT.t('balChecked')) + ': ' + rec + '</small> <a href="#" data-tab="recon">' + esc(CT.t('balCheck')) + '</a></div></div>';
  }
  function summaryHtml() {
    var s = S.sum, t = s.totals, openAmt = s.opening ? (s.opening.kind === 'income' ? s.opening.amount : -s.opening.amount) : 0;
    var h = '<div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' +
      stat({ html: esc(CT.t('opening')) + CT.help('carry') }, KRW(openAmt)) + stat(CT.t('income'), KRW(t.income), 'ok') + stat(CT.t('expense'), KRW(t.expense), 'late') + stat(CT.t('balance'), KRW(t.balance), t.balance < 0 ? 'late' : '') +
      (s.plan.income || s.plan.expense ? stat(CT.t('expectedEnd'), KRW(openAmt + s.plan.income - s.plan.expense), '') : '') + '</div>';
    if (s.needsReview) h += '<div class="hintbox" style="margin-bottom:12px;color:var(--accent)">' + esc(CT.t('needReview')) + ' ' + s.needsReview + esc(CT.t('needReviewTail')) + '</div>';
    if (s.lastReconcile) h += '<div class="hintbox" style="margin-bottom:12px">' + esc(CT.t('lastRecon')) + ': ' + esc(s.lastReconcile.asOfDate) + ' · ' + (s.lastReconcile.diff === 0 ? '<b style="color:var(--ok)">' + esc(CT.t('reconOk')) + '</b>' : '<b style="color:var(--accent)">' + esc(CT.t('reconDiff')) + ' ' + esc(KRW(s.lastReconcile.diff)) + '</b>') + ' <a href="#" data-tab="recon">' + esc(CT.t('tabRecon')) + '</a></div>';
    var out = s.byCategory.filter(function (c) { return c.kind === 'expense'; }), inc = s.byCategory.filter(function (c) { return c.kind === 'income' && c.category !== '이월금'; });
    h += '<div class="fgrid">' + catCard(CT.t('expenseByCat'), out, 'expense') + catCard(CT.t('incomeByCat'), inc, 'income') + '</div>';
    if (s.monthly.length) { var max = Math.max.apply(null, s.monthly.map(function (m) { return Math.max(m.income, m.expense); })) || 1;
      h += '<section class="card" style="margin-top:14px"><h2>' + esc(CT.t('monthly')) + '</h2><div class="mflow">' + s.monthly.map(function (m) { return '<div class="mf"><div class="mfb"><i class="in" style="height:' + Math.round(m.income / max * 100) + '%" title="' + esc(KRW(m.income)) + '"></i><i class="out" style="height:' + Math.round(m.expense / max * 100) + '%" title="' + esc(KRW(m.expense)) + '"></i></div><b>' + esc(m.month.slice(5)) + '</b><small class="mfi">' + esc(KRW(m.income)) + '</small><small class="mfo">' + esc(KRW(m.expense)) + '</small></div>'; }).join('') + '</div></section>'; }
    return h;
  }
  function stat(label, value, cls) { return '<div class="stat ' + (cls || '') + '"><label>' + (label && label.html ? label.html : esc(label)) + '</label><strong' + (cls === 'ok' ? ' style="color:var(--ok)"' : '') + '>' + esc(value) + '</strong></div>'; }
  function catCard(title, rows, kind) {
    var tp = rows.reduce(function (n, r) { return n + r.plan; }, 0), ta = rows.reduce(function (n, r) { return n + r.actual; }, 0);
    return '<section class="card"><h2>' + esc(title) + '</h2><div style="overflow:auto"><table><thead><tr><th>' + esc(CT.t('cat')) + '</th><th style="text-align:right">' + esc(CT.t('planned')) + '</th><th style="text-align:right">' + esc(CT.t('actual')) + '</th><th style="text-align:right">' + esc(CT.t(kind === 'expense' ? 'remaining' : 'achieved')) + '</th></tr></thead><tbody>' +
      rows.map(function (r) { var pct = r.plan ? r.actual / r.plan * 100 : (r.actual ? 100 : 0), over = kind === 'expense' && r.plan && r.actual > r.plan;
        return '<tr><td>' + esc(r.category) + (r.active ? '' : ' <span class="chip">' + esc(CT.t('catInactive')) + '</span>') + (r.plan ? bar(pct, over) : '') + '</td><td style="text-align:right">' + (r.plan ? esc(KRW(r.plan)) : '—') + '</td><td style="text-align:right">' + esc(KRW(r.actual)) + '</td><td style="text-align:right;font-weight:700;color:' + ((kind === 'expense' ? r.diff < 0 : false) ? 'var(--accent)' : 'inherit') + '">' + (r.plan ? esc(KRW(r.diff)) : '—') + '</td></tr>'; }).join('') +
      '<tr><td><b>' + esc(CT.t('all')) + '</b></td><td style="text-align:right"><b>' + esc(KRW(tp)) + '</b></td><td style="text-align:right"><b>' + esc(KRW(ta)) + '</b></td><td style="text-align:right"><b>' + (tp ? esc(KRW(kind === 'expense' ? tp - ta : ta - tp)) : '—') + '</b></td></tr></tbody></table></div></section>';
  }

  // ── 장부 ──
  function catOpts(kind, sel) { var list = (S.cats && S.cats[kind]) || []; return list.filter(function (c) { return c.active || c.name === sel; }).map(function (c) { return '<option' + (c.name === sel ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join(''); }
  function ledgerHtml() {
    var e = S.entries, p = cur(), h = '';
    if (canEdit()) {
      var d = S.qa.date && S.qa.date >= p.startDate && S.qa.date <= p.endDate ? S.qa.date : (today() >= p.startDate && today() <= p.endDate ? today() : p.startDate);
      h += '<form class="card qa" id="qa"><b>' + esc(CT.t('quickAdd')) + '</b><input type="date" name="entryDate" value="' + esc(d) + '" min="' + esc(p.startDate) + '" max="' + esc(p.endDate) + '" required><select name="kind"><option value="expense"' + (S.qa.kind === 'expense' ? ' selected' : '') + '>' + esc(CT.t('expense')) + '</option><option value="income"' + (S.qa.kind === 'income' ? ' selected' : '') + '>' + esc(CT.t('income')) + '</option></select><select name="category">' + catOpts(S.qa.kind, '') + '</select><input name="description" placeholder="' + esc(CT.t('desc')) + '" maxlength="200"><input name="amount" placeholder="' + esc(CT.t('amount')) + '" inputmode="numeric" required style="max-width:140px;text-align:right"><button class="btn pri" type="submit">' + esc(CT.t('add')) + '</button><span class="err" id="qaErr" hidden style="margin:0;padding:6px 10px"></span></form>';
    }
    h += '<div class="filters t" style="grid-template-columns:1fr 1fr 1.6fr 1fr"><select id="lfKind"><option value="">' + esc(CT.t('kind') + ': ' + CT.t('all')) + '</option><option value="income"' + (S.filter.kind === 'income' ? ' selected' : '') + '>' + esc(CT.t('income')) + '</option><option value="expense"' + (S.filter.kind === 'expense' ? ' selected' : '') + '>' + esc(CT.t('expense')) + '</option></select>' +
      '<select id="lfCat"><option value="">' + esc(CT.t('cat') + ': ' + CT.t('all')) + '</option>' + ['income', 'expense'].map(function (k) { return ((S.cats && S.cats[k]) || []).map(function (c) { return '<option' + (S.filter.category === c.name ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join(''); }).join('') + '</select>' +
      '<input id="lfQ" type="search" value="' + esc(S.filter.q) + '" placeholder="' + esc(CT.t('search')) + '"><input id="lfMonth" type="month" value="' + esc(S.filter.month) + '" aria-label="' + esc(CT.t('month')) + '"></div>';
    h += '<div class="count-line" style="display:flex;justify-content:space-between;align-items:center"><span>' + e.count + esc(CT.t('entryCount')) + '</span><button class="btn sm" data-a="exportXlsx">' + esc(CT.t('exportXlsx')) + '</button></div>';
    h += '<section class="card" style="padding:6px 8px"><div style="overflow:auto"><table class="vtab"><thead><tr><th>' + esc(CT.t('date')) + '</th><th>' + esc(CT.t('kind')) + '</th><th>' + esc(CT.t('cat')) + '</th><th>' + esc(CT.t('desc')) + '</th><th style="text-align:right">' + esc(CT.t('amount')) + '</th><th style="text-align:right">' + esc(CT.t('bal')) + '</th><th>' + esc(CT.t('source')) + '</th><th></th></tr></thead><tbody>';
    h += e.items.length ? e.items.map(function (r) {
      var inc = r.kind === 'income', canRow = canEdit() && r.source !== 'carry';
      return '<tr' + (r.needsReview ? ' style="background:#fff7ec"' : '') + '><td>' + esc(r.entryDate.slice(2)) + '</td><td><span class="kindchip ' + (inc ? 'kc-final' : 'kc-direction') + '" style="' + (inc ? '' : 'background:#fde8ea;color:var(--accent)') + '">' + esc(CT.t(inc ? 'income' : 'expense')) + '</span></td><td>' + esc(r.category) + (r.needsReview ? ' <span class="tag t-soon">!</span>' : '') + '</td><td>' + esc(r.description) + (r.note ? '<small style="display:block;color:var(--mid)">' + esc(r.note) + '</small>' : '') + (r.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '</td>' +
        '<td style="text-align:right;font-weight:700;color:' + (inc ? 'var(--ok)' : 'var(--accent)') + '">' + (inc ? '+' : '−') + esc(KRW(r.amount).replace('-', '')) + '</td><td style="text-align:right">' + esc(KRW(r.balance)) + '</td><td><span class="chip">' + esc(CT.t('src' + r.source)) + '</span></td>' +
        '<td style="white-space:nowrap">' + (canRow ? '<button class="btn sm" data-a="editEntry" data-id="' + esc(r.id) + '">' + esc(CT.t('edit')) + '</button> <button class="btn sm danger" data-a="delEntry" data-id="' + esc(r.id) + '">' + esc(CT.t('del')) + '</button>' : '') + '</td></tr>';
    }).join('') : '<tr><td colspan="8" class="empty">' + esc(CT.t('noEntries')) + '</td></tr>';
    return h + '</tbody></table></div></section>';
  }
  function bindQuick() {
    var f = $('qa'); if (!f) return;
    f.kind.onchange = function () { S.qa.kind = f.kind.value; S.qa.date = f.entryDate.value; f.category.innerHTML = catOpts(S.qa.kind, ''); };
    f.onsubmit = async function (ev) {
      ev.preventDefault(); var er = $('qaErr'); er.hidden = true;
      try { await api('ledger', { method: 'POST', body: { periodId: S.pid, entryDate: f.entryDate.value, kind: f.kind.value, category: f.category.value, description: f.description.value, amount: f.amount.value } }); S.qa.date = f.entryDate.value; S.qa.kind = f.kind.value; await loadPeriods(); await loadTab(); render(); var nf = $('qa'); if (nf) nf.amount.focus(); }
      catch (e) { er.textContent = e.message; er.hidden = false; }
    };
  }
  function entryForm(r) {
    var p = cur(), kind = r ? r.kind : 'expense', exp = r && r.source === 'expense';
    var h = (exp ? '<div class="hintbox">' + esc(CT.t('srcexpense')) + ' — 금액·날짜는 고칠 수 없어요.</div>' : '') +
      '<div class="two"><label>' + esc(CT.t('date')) + '<input type="date" name="entryDate" value="' + esc(r ? r.entryDate : today()) + '" min="' + esc(p.startDate) + '" max="' + esc(p.endDate) + '"' + (exp ? ' disabled' : '') + ' required></label><label>' + esc(CT.t('kind')) + '<select name="kind"' + (exp ? ' disabled' : '') + '><option value="expense"' + (kind === 'expense' ? ' selected' : '') + '>' + esc(CT.t('expense')) + '</option><option value="income"' + (kind === 'income' ? ' selected' : '') + '>' + esc(CT.t('income')) + '</option></select></label></div>' +
      '<div class="two"><label>' + esc(CT.t('cat')) + '<select name="category" id="efCat">' + catOpts(kind, r ? r.category : '') + '</select></label><label>' + esc(CT.t('amount')) + '<input name="amount" inputmode="numeric" value="' + esc(r ? r.amount : '') + '"' + (exp ? ' disabled' : '') + ' required></label></div>' +
      '<label>' + esc(CT.t('desc')) + '<input name="description" maxlength="200" value="' + esc(r ? r.description : '') + '"></label><label>' + esc(CT.t('note')) + '<input name="note" maxlength="300" value="' + esc(r ? r.note : '') + '"></label>';
    CT.ask(CT.t(r ? 'editEntry' : 'newEntry'), h, async function (fd) {
      var body = { category: fd.category, description: fd.description, note: fd.note }; if (!exp) { body.entryDate = fd.entryDate; body.kind = fd.kind; body.amount = fd.amount; }
      if (r) await api('ledger?id=' + encodeURIComponent(r.id), { method: 'PATCH', body: body }); else await api('ledger', { method: 'POST', body: Object.assign({ periodId: S.pid }, body) });
      await loadPeriods(); await loadTab(); render();
    });
    var k = document.querySelector('#dlgFields [name=kind]'); if (k && !exp) k.onchange = function () { $('efCat').innerHTML = catOpts(k.value, ''); };
  }

  // ── 기간 예산 ──
  function planHtml() {
    var map = {}; (S.plan || []).forEach(function (p) { map[p.kind + '|' + p.category] = p.amount; });
    var ro = canEdit() ? '' : ' disabled', group = function (kind, title) {
      var list = ((S.cats && S.cats[kind]) || []).filter(function (c) { return (c.active || map[kind + '|' + c.name]) && c.name !== '이월금' && c.name !== '이월 적자'; });
      return '<section class="card"><h2>' + esc(title) + '</h2><table><tbody>' + list.map(function (c) { return '<tr><td>' + esc(c.name) + '</td><td style="text-align:right"><input class="plin" data-k="' + kind + '" data-c="' + esc(c.name) + '" inputmode="numeric" value="' + (map[kind + '|' + c.name] || '') + '" placeholder="0"' + ro + '></td></tr>'; }).join('') + '<tr><td><b>' + esc(CT.t(kind === 'income' ? 'planTotalIn' : 'planTotalOut')) + '</b></td><td style="text-align:right"><b id="ptot-' + kind + '">0</b></td></tr></tbody></table></section>'; };
    var others = S.periods.filter(function (p) { return p.id !== S.pid; });
    var h = '<div class="hintbox" style="margin-bottom:12px">' + esc(CT.t('planTitle')) + '</div><div class="fgrid">' + group('expense', CT.t('catTitleOut')) + group('income', CT.t('catTitleIn')) + '</div>' +
      '<div class="hintbox" style="margin-top:12px" id="pexp"></div>';
    if (canEdit()) h += '<div class="actions" style="margin-top:12px"><button class="btn pri" data-a="savePlan">' + esc(CT.t('planSave')) + '</button>' + (others.length && !(S.plan || []).length ? '<select id="planFrom">' + others.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p.name) + '</option>'; }).join('') + '</select><button class="btn" data-a="copyPlan">' + esc(CT.t('planCopy')) + '</button>' : '') + '<span class="hint" id="planMsg" style="font-size:12.5px"></span></div>';
    setTimeout(updatePlanTotals, 0);
    return h;
  }
  function planNum(v) { var n = Number(String(v || '').replace(/[,\s₩]/g, '')); return Number.isFinite(n) ? n : 0; }
  function updatePlanTotals() {
    var tot = { income: 0, expense: 0 }; document.querySelectorAll('.plin').forEach(function (i) { tot[i.dataset.k] += planNum(i.value); });
    ['income', 'expense'].forEach(function (k) { var e = $('ptot-' + k); if (e) e.textContent = KRW(tot[k]); });
    var open = S.sum && S.sum.opening ? (S.sum.opening.kind === 'income' ? S.sum.opening.amount : -S.sum.opening.amount) : 0, ex = $('pexp'); if (ex) ex.textContent = CT.t('planExpected') + ': ' + KRW(open + tot.income - tot.expense);
  }
  async function savePlan() {
    var items = [].map.call(document.querySelectorAll('.plin'), function (i) { return { kind: i.dataset.k, category: i.dataset.c, amount: i.value }; }), m = $('planMsg');
    try { await api('ledger-plan', { method: 'PUT', body: { periodId: S.pid, items: items } }); m.textContent = CT.t('planSaved'); m.style.color = 'var(--ok)'; await loadTab(); } catch (e) { m.textContent = e.message; m.style.color = 'var(--accent)'; }
  }

  // ── 항목 목록 ──
  function catsHtml() {
    if (!S.cats) return '';
    var ed = !!(S.perms && S.perms.moneyWrite);
    var col = function (kind, title) {
      var list = S.cats[kind];
      return '<section class="card"><h2>' + esc(title) + '</h2>' + list.map(function (c, i) {
        return '<div class="row" style="align-items:center"><div' + (c.active ? '' : ' style="opacity:.55"') + '><b>' + esc(c.name) + '</b>' + (c.active ? '' : ' <span class="chip">' + esc(CT.t('catInactive')) + '</span>') + '<small>' + c.used + esc(CT.t('catUsed')) + '</small></div>' +
          (ed ? '<div style="white-space:nowrap"><button class="hs-b" data-a="catUp" data-id="' + esc(c.id) + '" data-k="' + kind + '" title="' + esc(CT.t('up')) + '"' + (i === 0 ? ' disabled' : '') + '>▲</button> <button class="hs-b" data-a="catDown" data-id="' + esc(c.id) + '" data-k="' + kind + '" title="' + esc(CT.t('down')) + '"' + (i === list.length - 1 ? ' disabled' : '') + '>▼</button> <button class="btn sm" data-a="catRename" data-id="' + esc(c.id) + '" data-n="' + esc(c.name) + '">' + esc(CT.t('catRename')) + '</button> <button class="btn sm" data-a="catToggle" data-id="' + esc(c.id) + '" data-on="' + (c.active ? 0 : 1) + '">' + esc(CT.t(c.active ? 'catOff' : 'catOn')) + '</button>' + (c.used + c.planned === 0 ? ' <button class="btn sm danger" data-a="catDel" data-id="' + esc(c.id) + '">' + esc(CT.t('del')) + '</button>' : '') + '</div>' : '') + '</div>';
      }).join('') + (ed ? '<form class="catadd" data-k="' + kind + '"><input name="name" maxlength="40" placeholder="' + esc(CT.t('catName')) + '" required><button class="btn" type="submit">' + esc(CT.t('catAdd')) + '</button></form>' : '') + '</section>';
    };
    return '<div class="hintbox" style="margin-bottom:12px">' + esc(CT.t('catHelp')) + '</div><div class="fgrid">' + col('expense', CT.t('catTitleOut')) + col('income', CT.t('catTitleIn')) + '</div>';
  }
  async function catSwap(kind, id, dir) {
    var list = S.cats[kind], i = list.findIndex(function (c) { return c.id === id; }), j = i + dir; if (j < 0 || j >= list.length) return;
    // 모든 항목에 10 단위 순서를 다시 매겨서 안전하게 자리를 바꾼다
    var order = list.map(function (c) { return c.id; }); order.splice(i, 1); order.splice(j, 0, id);
    for (var n = 0; n < order.length; n++) await api('ledger-categories?id=' + encodeURIComponent(order[n]), { method: 'PATCH', body: { sortOrder: (n + 1) * 10 } });
    S.cats = await api('ledger-categories'); render();
  }

  // ── 기간 · 마감 ──
  function periodsHtml() {
    var ed = canAdmin();
    var h = '<section class="card"><h2><span>' + esc(CT.t('perTitle')) + '</span>' + (ed ? '<button class="btn sm pri" data-a="newPeriod">' + esc(CT.t('perNew')) + '</button>' : '') + '</h2><div style="overflow:auto"><table class="vtab"><thead><tr><th>' + esc(CT.t('perName')) + '</th><th>' + esc(CT.t('perStart')) + ' ~ ' + esc(CT.t('perEnd')) + '</th><th>' + esc(CT.t('perStatus')) + '</th><th style="text-align:right">' + esc(CT.t('income')) + '</th><th style="text-align:right">' + esc(CT.t('expense')) + '</th><th style="text-align:right">' + esc(CT.t('bal')) + '</th><th>' + esc(CT.t('perCarry')) + '</th><th></th></tr></thead><tbody>';
    h += S.periods.map(function (p) {
      var nx = S.periods.filter(function (q) { return q.id === p.carryPeriodId; })[0];
      return '<tr><td><b>' + esc(p.name) + '</b>' + (p.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '</td><td>' + esc(p.startDate) + ' ~ ' + esc(p.endDate) + '</td><td><span class="status ' + (p.status === 'open' ? 'active' : 'done') + '">' + esc(CT.t(p.status === 'open' ? 'perOpen' : 'perClosed')) + '</span></td><td style="text-align:right">' + esc(KRW(p.income)) + '</td><td style="text-align:right">' + esc(KRW(p.expense)) + '</td><td style="text-align:right"><b>' + esc(KRW(p.status === 'closed' && p.closingBalance != null ? p.closingBalance : p.balance)) + '</b></td><td>' + (nx ? esc(nx.name) : '—') + '</td>' +
        '<td style="white-space:nowrap"><button class="btn sm" data-a="viewPeriod" data-id="' + esc(p.id) + '">' + esc(CT.t('perView')) + '</button>' + (ed ? (p.status === 'open' ? ' <button class="btn sm" data-a="editPeriod" data-id="' + esc(p.id) + '">' + esc(CT.t('edit')) + '</button> <button class="btn sm pri" data-a="closePeriod" data-id="' + esc(p.id) + '">' + esc(CT.t('perClose')) + '</button>' + (p.entries === 0 ? ' <button class="btn sm danger" data-a="delPeriod" data-id="' + esc(p.id) + '">' + esc(CT.t('del')) + '</button>' : '') : ' <button class="btn sm" data-a="reopenPeriod" data-id="' + esc(p.id) + '">' + esc(CT.t('perReopen')) + '</button>') : '') + '</td></tr>';
    }).join('') + '</tbody></table></div></section>';
    return h;
  }
  function periodForm(p, preset) {
    var last = S.periods.slice().sort(function (a, b) { return a.endDate < b.endDate ? 1 : -1; })[0], start = p ? p.startDate : (preset && preset.start) || (last ? addDays(last.endDate, 1) : today().slice(0, 4) + '-01-01'), sg = suggest(start, 6);
    var h = (p ? '' : '<label>' + esc(CT.t('perPreset')) + '<select id="pfPreset"><option value="6">' + esc(CT.t('per6')) + '</option><option value="3">' + esc(CT.t('per3')) + '</option><option value="0">' + esc(CT.t('perPresetCustom')) + '</option></select></label>') +
      '<label>' + esc(CT.t('perName')) + '<input name="name" maxlength="60" value="' + esc(p ? p.name : (preset && preset.name) || sg.name) + '" required></label><div class="two"><label>' + esc(CT.t('perStart')) + '<input type="date" name="startDate" value="' + esc(start) + '" required></label><label>' + esc(CT.t('perEnd')) + '<input type="date" name="endDate" value="' + esc(p ? p.endDate : (preset && preset.end) || sg.end) + '" required></label></div><label>' + esc(CT.t('perNote')) + '<input name="note" maxlength="300" value="' + esc(p ? p.note || '' : '') + '"></label>';
    return h;
  }
  function wirePreset() {
    var pr = $('pfPreset'), f = $('dlgForm'); if (!pr) return;
    var apply = function () { var m = +pr.value, s = f.startDate.value; if (m && s) { var sg = suggest(s, m); f.endDate.value = sg.end; f.name.value = sg.name; } };
    pr.onchange = apply; f.startDate.onchange = apply;
  }
  function newPeriod() {
    CT.ask(CT.t('perNew'), periodForm(null), async function (fd) { var r = await api('ledger-periods', { method: 'POST', body: { name: fd.name, startDate: fd.startDate, endDate: fd.endDate, note: fd.note } }); S.pid = r.id; await refresh(); });
    wirePreset();
  }
  function closeForm(p) {
    var nexts = S.periods.filter(function (q) { return q.status === 'open' && q.startDate > p.endDate; }).sort(function (a, b) { return a.startDate < b.startDate ? -1 : 1; });
    var start = addDays(p.endDate, 1), len = Math.max(1, Math.round((Date.parse(p.endDate) - Date.parse(p.startDate)) / 86400000 / 30)), sg = suggest(start, len >= 5 ? 6 : 3);
    var h = '<div class="hintbox">' + esc(CT.t('closeBody')) + '</div><div class="money"><div><label>' + esc(CT.t('closeBal')) + '</label><strong>' + esc(KRW(p.balance)) + '</strong></div></div>' +
      '<label>' + esc(CT.t('closeNext')) + '<select name="mode" id="clMode">' + (nexts.length ? nexts.map(function (q) { return '<option value="id:' + esc(q.id) + '">' + esc(q.name) + ' (' + esc(q.startDate) + ' ~)</option>'; }).join('') : '') + '<option value="new"' + (nexts.length ? '' : ' selected') + '>' + esc(CT.t('closeNew')) + '</option><option value="none">' + esc(CT.t('closeNone')) + '</option></select></label>' +
      '<div id="clNew"' + (nexts.length ? ' hidden' : '') + ' class="form"><label>' + esc(CT.t('perName')) + '<input name="nName" maxlength="60" value="' + esc(sg.name) + '"></label><div class="two"><label>' + esc(CT.t('perStart')) + '<input type="date" name="nStart" value="' + esc(start) + '"></label><label>' + esc(CT.t('perEnd')) + '<input type="date" name="nEnd" value="' + esc(sg.end) + '"></label></div></div>';
    CT.ask(CT.t('closeTitle') + ' — ' + p.name, h, async function (fd) {
      var body = { action: 'close', id: p.id };
      if (fd.mode === 'none') body.noCarry = true; else if (fd.mode === 'new') body.next = { name: fd.nName, startDate: fd.nStart, endDate: fd.nEnd }; else body.nextPeriodId = fd.mode.slice(3);
      await api('ledger-periods', { method: 'POST', body: body }); await refresh();
    }, { saveLabel: CT.t('closeConfirm') });
    var m = $('clMode'); m.onchange = function () { $('clNew').hidden = m.value !== 'new'; };
  }

  // ── 이벤트 ──
  function wire() {
    $('fnPeriodSel').onchange = async function () { S.pid = this.value; S.entries = null; await loadTab(); render(); };
    var goTab = async function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; e.preventDefault(); S.tab = b.dataset.tab; await loadTab(); render(); };
    var closeMore = function () { var m = $('fnMoreMenu'); if (m) { m.hidden = true; $('fnMoreBtn').setAttribute('aria-expanded', 'false'); } };
    $('fnTabs').addEventListener('click', function (e) { var b = e.target.closest('#fnMoreBtn'); if (!b) return; e.stopPropagation(); var m = $('fnMoreMenu'); m.hidden = !m.hidden; b.setAttribute('aria-expanded', m.hidden ? 'false' : 'true'); });
    document.addEventListener('click', function (e) { if (!e.target.closest('.tabmore')) closeMore(); }); document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMore(); });
    $('fnPerManage').onclick = async function () { S.tab = 'periods'; await loadTab(); render(); }; $('fnPerNew').onclick = function () { newPeriod(); };
    $('fnTabs').onclick = goTab; $('fnBody').addEventListener('click', function (e) { if (e.target.closest('a[data-tab]')) goTab(e); });
    $('fnBody').addEventListener('input', function (e) { if (e.target.classList.contains('plin')) updatePlanTotals(); });
    var timer; $('fnBody').addEventListener('change', async function (e) {
      var id = e.target.id; if (id === 'lfKind') S.filter.kind = e.target.value; else if (id === 'lfCat') S.filter.category = e.target.value; else if (id === 'lfMonth') S.filter.month = e.target.value; else return;
      await loadTab(); render();
    });
    $('fnBody').addEventListener('input', function (e) { if (e.target.id !== 'lfQ') return; S.filter.q = e.target.value; clearTimeout(timer); timer = setTimeout(async function () { await loadTab(); var pos = e.target.selectionStart; render(); var q = $('lfQ'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } }, 300); });
    $('fnBody').addEventListener('submit', async function (e) {
      var f = e.target.closest('.catadd'); if (!f) return; e.preventDefault();
      try { await api('ledger-categories', { method: 'POST', body: { kind: f.dataset.k, name: f.name.value } }); S.cats = await api('ledger-categories'); render(); } catch (er) { alert(er.message); }
    });
    $('fnBody').addEventListener('click', async function (e) {
      var b = e.target.closest('[data-a]'); if (!b) return; var a = b.dataset.a, id = b.dataset.id;
      try {
        if (a === 'newPeriod') newPeriod();
        else if (a === 'editEntry') entryForm(S.entries.items.filter(function (r) { return r.id === id; })[0]);
        else if (a === 'delEntry') { if (confirm(CT.t('confirmDel'))) { await api('ledger?id=' + encodeURIComponent(id), { method: 'DELETE' }); await loadPeriods(); await loadTab(); render(); } }
        else if (a === 'savePlan') savePlan();
        else if (a === 'exportXlsx' && window.FinImport) await FinImport.exportXlsx();
        else if (a === 'copyPlan') { await api('ledger-plan', { method: 'POST', body: { periodId: S.pid, fromPeriodId: $('planFrom').value } }); await loadTab(); render(); }
        else if (a === 'catRename') CT.ask(CT.t('catRename'), '<label>' + esc(CT.t('catName')) + '<input name="name" maxlength="40" value="' + esc(b.dataset.n) + '" required></label>', async function (fd) { await api('ledger-categories?id=' + encodeURIComponent(id), { method: 'PATCH', body: { name: fd.name } }); S.cats = await api('ledger-categories'); render(); });
        else if (a === 'catToggle') { await api('ledger-categories?id=' + encodeURIComponent(id), { method: 'PATCH', body: { active: b.dataset.on === '1' } }); S.cats = await api('ledger-categories'); render(); }
        else if (a === 'catDel') { if (confirm(CT.t('confirmDel'))) { await api('ledger-categories?id=' + encodeURIComponent(id), { method: 'DELETE' }); S.cats = await api('ledger-categories'); render(); } }
        else if (a === 'catUp' || a === 'catDown') await catSwap(b.dataset.k, id, a === 'catUp' ? -1 : 1);
        else if (a === 'viewPeriod') { S.pid = id; S.tab = 'summary'; await loadTab(); render(); }
        else if (a === 'editPeriod') { var p = S.periods.filter(function (x) { return x.id === id; })[0]; CT.ask(CT.t('edit'), periodForm(p), async function (fd) { await api('ledger-periods?id=' + encodeURIComponent(id), { method: 'PATCH', body: { name: fd.name, startDate: fd.startDate, endDate: fd.endDate, note: fd.note } }); await refresh(); }); }
        else if (a === 'closePeriod') closeForm(S.periods.filter(function (x) { return x.id === id; })[0]);
        else if (a === 'reopenPeriod') { if (confirm(CT.t('reopenConfirm'))) { await api('ledger-periods', { method: 'POST', body: { action: 'reopen', id: id } }); await refresh(); } }
        else if (a === 'delPeriod') { if (confirm(CT.t('perDeleteConfirm'))) { await api('ledger-periods?id=' + encodeURIComponent(id), { method: 'DELETE' }); if (S.pid === id) S.pid = null; await refresh(); } }
      } catch (er) { alert(er.message); }
    });
  }
  window.FIN = { S: S, api: api, KRW: KRW, esc: esc, render: render, loadTab: loadTab, loadPeriods: loadPeriods, canEdit: canEdit, cur: cur, today: today };
  CT.boot(async function (me) {
    S.perms = me.perms; if (wantTab && tabs().indexOf(wantTab) >= 0) S.tab = wantTab;
    if (!me.perms.moneyRead) { $('fnLocked').hidden = false; return; }
    $('fnMain').hidden = false; wire();
    if (me.perms.moneyWrite) { try { var a = await api('ledger-expense', { method: 'POST', body: { action: 'autoSync' } }); S.syncInfo = a; } catch (e) { /* 연동이 없거나 실패해도 장부는 그대로 연다 */ } }
    try { await loadPeriods(); await loadTab(); } catch (e) { $('fnBody').innerHTML = '<div class="err">' + esc(e.message) + '</div>'; return; }
    CT.applyI18n(); render();
    document.addEventListener('ct-lang', render);
  });
})();
