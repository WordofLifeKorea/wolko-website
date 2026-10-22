(function () {
  CT.addDict({
    ko: { ftBack: '← 회계 장부로 돌아가기', ftSummary: '요약', ftLedger: '장부', ftExpense: '경비 연동', ftRecon: '잔액 대조', ftCalc: '계산기', ftPlan: '기간 예산', ftCats: '항목 목록', ftPeriods: '기간 · 마감', ftThis: '캠프별 예산안 (지금 화면)', ftHint: '이 화면은 캠프 행사마다 항목별 계획 예산을 따로 관리하는 곳이에요. 기간별 장부는 왼쪽의 「회계 장부」 탭들에서 봐요.', bdTitle: '캠프 예산', bdSub: '예산 계획 · 예상 지출 · 실제 지출을 캠프별로 관리해요 (금액 권한이 있는 팀원만 볼 수 있어요)', bdAdd: '+ 예산 항목', bdTarget: '총 예산 설정', bdCopy: '지난 캠프에서 복사', bdCsv: '엑셀(CSV)로 내려받기', bdSearch: '항목·업체·메모 검색', bdLines: '예산 항목', bdFiles: '예산·지출 자료(파일) 보기', bdReport: '예상 리포트',
      allCamps: '모든 캠프', allCats: '모든 분류', allCur: '모든 통화', planned: '예산 계획', expected: '예상 지출', actual: '실제 지출', forecast: '예상 최종', target: '총 예산', remaining: '남은 예산', over: '초과', vendor: '업체', status: '상태', paid: '지급일',
      stplanned: '계획', stordered: '주문·계약', stpaid: '지급 완료',
      cvenue: '장소', cfood: '식사', ctransport: '교통·차량', cprint: '인쇄·티셔츠', cspeaker: '강사·게스트', csnacks: '간식', cinsurance: '보험', cpromo: '홍보', csupplies: '비품', cscholarship: '장학·시상', cmisc: '기타·예비비',
      perCamp: '캠프별 합계', noLines: '예산 항목이 없어요.', edit: '수정', del: '삭제', save: '저장', cancel: '취소', confirmDel: '삭제할까요? (삭제 표시만 되며 복구할 수 있어요)',
      fLabel: '항목 이름', fCamp: '캠프', fCat: '분류', fCur: '통화', fPlanned: '예산 계획', fExpected: '예상 지출 (비워 두면 계획과 같음)', fActual: '실제 지출 (아직 없으면 비움)', fVendor: '업체·지급처', fPaid: '지급일', fStatus: '상태', fNotes: '메모', amountHint: '원(KRW)은 소수점 없이, 달러(USD)는 센트까지(예: 1234.50) 입력해요.',
      newLine: '예산 항목 추가', editLine: '예산 항목 수정', setTarget: '총 예산 설정', fTargetAmt: '총 예산 금액', copyTitle: '지난 캠프에서 예산 항목 복사', fFrom: '복사할 캠프', fTo: '받을 캠프', copyHelp: '항목 이름과 예산 계획만 복사해요. 실제 지출과 지급 상태는 비워요.', copyConfirm: '받을 캠프에 이미 예산 항목이 있어요. 덧붙여서 복사할까요?', copied: '복사했어요',
      flagOver: '계획보다 많이 쓴 항목', flagOverTarget: '예상 최종이 총 예산을 넘었어요', flagUnpaid: '아직 지급·실제 지출이 입력되지 않은 항목', flagOk: '지금은 주의할 항목이 없어요.', lockedPage: '🔒 예산·금액은 권한이 있는 팀원에게만 보입니다.' },
    en: { ftBack: '← Back to the ledger', ftSummary: 'Summary', ftLedger: 'Ledger', ftExpense: 'Expense reports', ftRecon: 'Reconcile', ftCalc: 'Calculator', ftPlan: 'Period budget', ftCats: 'Categories', ftPeriods: 'Periods · Close', ftThis: 'Per-camp plan (this page)', ftHint: 'This page manages a planned budget per camp event. The period ledger is in the ledger tabs on the left.', bdTitle: 'Camp Budget', bdSub: 'Manage planned, expected and actual spending per camp (visible only to team members with amount access)', bdAdd: '+ Budget item', bdTarget: 'Set total budget', bdCopy: 'Copy from another camp', bdCsv: 'Download CSV (Excel)', bdSearch: 'Search item, vendor, notes', bdLines: 'Budget items', bdFiles: 'Budget & expense files', bdReport: 'Forecast report',
      allCamps: 'All camps', allCats: 'All categories', allCur: 'All currencies', planned: 'Planned', expected: 'Expected', actual: 'Actual', forecast: 'Forecast', target: 'Total budget', remaining: 'Remaining', over: 'over', vendor: 'Vendor', status: 'Status', paid: 'Paid on',
      stplanned: 'Planned', stordered: 'Ordered', stpaid: 'Paid',
      cvenue: 'Venue', cfood: 'Meals', ctransport: 'Transport', cprint: 'Print & shirts', cspeaker: 'Speakers & guests', csnacks: 'Snacks', cinsurance: 'Insurance', cpromo: 'Promotion', csupplies: 'Supplies', cscholarship: 'Scholarship & prizes', cmisc: 'Other & contingency',
      perCamp: 'Totals by camp', noLines: 'No budget items.', edit: 'Edit', del: 'Delete', save: 'Save', cancel: 'Cancel', confirmDel: 'Delete this? (It is only marked deleted and can be restored.)',
      fLabel: 'Item name', fCamp: 'Camp', fCat: 'Category', fCur: 'Currency', fPlanned: 'Planned amount', fExpected: 'Expected (blank = same as planned)', fActual: 'Actual (blank if none yet)', fVendor: 'Vendor / payee', fPaid: 'Paid on', fStatus: 'Status', fNotes: 'Notes', amountHint: 'Enter KRW without decimals; USD with cents (e.g. 1234.50).',
      newLine: 'Add budget item', editLine: 'Edit budget item', setTarget: 'Set total budget', fTargetAmt: 'Total budget amount', copyTitle: 'Copy budget items from another camp', fFrom: 'Copy from', fTo: 'Copy to', copyHelp: 'Only item names and planned amounts are copied. Actual spending and paid status stay empty.', copyConfirm: 'The target camp already has budget items. Append the copied items?', copied: 'Copied',
      flagOver: 'Items that cost more than planned', flagOverTarget: 'Forecast exceeds the total budget', flagUnpaid: 'Items with no payment or actual amount yet', flagOk: 'Nothing needs attention right now.', lockedPage: '🔒 Budget and amounts are visible only to authorized team members.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, CATS = ['venue', 'food', 'transport', 'print', 'speaker', 'snacks', 'insurance', 'promo', 'supplies', 'scholarship', 'misc'], CURS = ['KRW', 'USD'], STS = ['planned', 'ordered', 'paid'];
  var S = { data: null, types: [], report: null };
  var camps = function () { var o = []; S.types.forEach(function (t) { t.camps.forEach(function (c) { o.push(c); }); }); return o; };
  var campOpts = function (sel, blank) { return (blank ? '<option value="">' + esc(blank) + '</option>' : '') + camps().map(function (c) { return '<option value="' + esc(c.id) + '"' + (sel === c.id ? ' selected' : '') + '>' + esc(CT.pick(c, 'name')) + '</option>'; }).join(''); };
  var campName = function (r) { return CT.lang() === 'en' ? (r.campEn || r.campKo || '') : (r.campKo || r.campEn || ''); };
  var forecastOf = function (l) { var base = l.expectedAmount != null ? l.expectedAmount : l.plannedAmount; if (l.status === 'paid' && l.actualAmount != null) return l.actualAmount; return Math.max(l.actualAmount || 0, base || 0); };
  var m = function (v, c) { return v == null ? '—' : CT.money(v, c); };

  function fill() {
    var keep = function (id, html) { var el = $(id), v = el.value; el.innerHTML = html; if (v) el.value = v; };
    keep('bcamp', '<option value="">' + esc(CT.t('allCamps')) + '</option>' + campOpts('', ''));
    keep('bcat', '<option value="">' + esc(CT.t('allCats')) + '</option>' + CATS.map(function (c) { return '<option value="' + c + '">' + esc(CT.t('c' + c)) + '</option>'; }).join(''));
    keep('bcur', '<option value="">' + esc(CT.t('allCur')) + '</option>' + CURS.map(function (c) { return '<option>' + c + '</option>'; }).join(''));
  }
  async function load() {
    var q = new URLSearchParams(); if ($('bcamp').value) q.set('campId', $('bcamp').value); if ($('bcat').value) q.set('category', $('bcat').value); if ($('bcur').value) q.set('currency', $('bcur').value); if ($('bq').value.trim()) q.set('q', $('bq').value.trim());
    S.data = await CT.api('/api/campteam/budget?' + q.toString());
    var rq = $('bcamp').value ? '?campId=' + encodeURIComponent($('bcamp').value) : ''; S.report = await CT.api('/api/campteam/budget-report' + rq); render();
  }
  function cards(sum) {
    return sum.map(function (s) {
      var maxCat = Math.max.apply(null, s.byCategory.map(function (c) { return Math.max(c.forecast, c.planned); }).concat([1]));
      return '<section class="card" style="margin-bottom:14px"><h2>' + esc(s.currency) + (s.overTarget ? ' <span class="chip lock">' + esc(CT.t('flagOverTarget')) + '</span>' : '') + '</h2><div class="money"><div><label>' + esc(CT.t('planned')) + '</label><strong>' + esc(m(s.planned, s.currency)) + '</strong></div><div><label>' + esc(CT.t('expected')) + '</label><strong>' + esc(m(s.expected, s.currency)) + '</strong></div><div><label>' + esc(CT.t('actual')) + '</label><strong>' + esc(m(s.actual, s.currency)) + '</strong></div><div><label>' + esc(CT.t('forecast')) + '</label><strong>' + esc(m(s.forecast, s.currency)) + '</strong></div>' +
        (s.target != null ? '<div><label>' + esc(CT.t('target')) + '</label><strong>' + esc(m(s.target, s.currency)) + '</strong></div><div><label>' + esc(CT.t('remaining')) + '</label><strong style="color:' + (s.remaining < 0 ? 'var(--accent)' : 'var(--ok)') + '">' + esc(m(s.remaining, s.currency)) + '</strong></div>' : '') + '</div>' +
        '<div style="margin-top:12px">' + s.byCategory.map(function (c) { return '<div style="display:grid;grid-template-columns:120px 1fr 130px;gap:8px;align-items:center;font-size:12px;margin:5px 0"><span>' + esc(CT.t('c' + c.category)) + '</span><div class="bar" title="' + esc(CT.t('planned') + ' ' + m(c.planned, s.currency)) + '"><i style="width:' + Math.round(c.forecast / maxCat * 100) + '%;' + (c.forecast > c.planned ? 'background:var(--accent)' : '') + '"></i></div><span style="text-align:right">' + esc(m(c.forecast, s.currency)) + '</span></div>'; }).join('') + '</div></section>';
    }).join('');
  }
  function render() {
    var d = S.data; $('bdSummary').innerHTML = d.summary.length ? cards(d.summary) : '<div class="empty">' + esc(CT.t('noLines')) + '</div>';
    $('bdPerCamp').innerHTML = d.perCamp && d.perCamp.length > 1 ? '<section class="card" style="margin-bottom:14px"><h2>' + esc(CT.t('perCamp')) + '</h2><table class="vtable"><thead><tr><th>' + esc(CT.t('fCamp')) + '</th><th>' + esc(CT.t('planned')) + '</th><th>' + esc(CT.t('forecast')) + '</th><th>' + esc(CT.t('actual')) + '</th><th>' + esc(CT.t('remaining')) + '</th></tr></thead><tbody>' +
      d.perCamp.map(function (c) { return c.summary.map(function (s, i) { return '<tr><td>' + (i ? '' : esc(campName(c))) + ' <span class="meta">' + esc(s.currency) + '</span></td><td>' + esc(m(s.planned, s.currency)) + '</td><td>' + esc(m(s.forecast, s.currency)) + '</td><td>' + esc(m(s.actual, s.currency)) + '</td><td style="color:' + (s.remaining != null && s.remaining < 0 ? 'var(--accent)' : 'inherit') + '">' + (s.remaining == null ? '—' : esc(m(s.remaining, s.currency))) + '</td></tr>'; }).join(''); }).join('') + '</tbody></table></section>' : '';
    $('bdTable').innerHTML = '<thead><tr><th>' + esc(CT.t('fCat')) + '</th><th>' + esc(CT.t('fLabel')) + '</th><th>' + esc(CT.t('planned')) + CT.help('budgetCols') + '</th><th>' + esc(CT.t('expected')) + '</th><th>' + esc(CT.t('actual')) + '</th><th>' + esc(CT.t('forecast')) + '</th><th>' + esc(CT.t('status')) + '</th><th></th></tr></thead><tbody>' +
      (d.lines.length ? d.lines.map(function (l) { var f = forecastOf(l);
        return '<tr><td><span class="chip">' + esc(CT.t('c' + l.category)) + '</span></td><td>' + esc(l.label) + (l.isTest ? ' <span class="chip test">' + esc(CT.t('test')) + '</span>' : '') + '<br><span class="meta">' + esc(campName(l)) + (l.vendor ? ' · ' + esc(l.vendor) : '') + (l.notes ? ' · ' + esc(l.notes) : '') + '</span></td><td>' + esc(m(l.plannedAmount, l.currency)) + '</td><td>' + esc(m(l.expectedAmount, l.currency)) + '</td><td>' + esc(m(l.actualAmount, l.currency)) + '</td><td style="font-weight:700;color:' + (f > l.plannedAmount ? 'var(--accent)' : 'inherit') + '">' + esc(m(f, l.currency)) + '</td>' +
          '<td><span class="chip ' + (l.status === 'paid' ? 'ok' : l.status === 'ordered' ? 'warn' : 'gray') + '">' + esc(CT.t('st' + l.status)) + '</span>' + (l.paidAt ? '<br><span class="meta">' + esc(l.paidAt) + '</span>' : '') + '</td><td style="white-space:nowrap"><button class="btn sm" data-edit="' + esc(l.id) + '">' + esc(CT.t('edit')) + '</button> <button class="btn sm danger" data-del="' + esc(l.id) + '">' + esc(CT.t('del')) + '</button></td></tr>'; }).join('') : '<tr><td colspan="8" class="empty">' + esc(CT.t('noLines')) + '</td></tr>') + '</tbody>';
    var r = S.report, flags = '';
    r.summary.forEach(function (s) { if (s.overTarget) flags += '<div class="err">' + esc(CT.t('flagOverTarget')) + ': ' + esc(s.currency) + ' ' + esc(m(s.forecast, s.currency)) + ' / ' + esc(m(s.target, s.currency)) + ' (' + esc(m(-s.remaining, s.currency)) + ' ' + esc(CT.t('over')) + ')</div>'; });
    if (r.overLines.length) flags += '<h4 style="margin:10px 0 4px;font-size:13px">' + esc(CT.t('flagOver')) + '</h4>' + r.overLines.map(function (o) { return '<div class="row"><div>' + esc(o.label) + '</div><span class="tag t-late">+' + esc(m(o.over, o.currency)) + '</span></div>'; }).join('');
    if (r.unpaidCount) flags += '<div class="hintbox" style="margin-top:10px">' + esc(CT.t('flagUnpaid')) + ': <b>' + r.unpaidCount + '</b></div>';
    $('bdFlags').innerHTML = flags || '<div class="empty">' + esc(CT.t('flagOk')) + '</div>';
  }

  function amtField(name, label, val, cur) { return '<label>' + esc(label) + '<input name="' + name + '" inputmode="decimal" value="' + esc(CT.moneyInput(val, cur)) + '" placeholder="0"></label>'; }
  function lineForm(l) {
    var cur = l ? l.currency : 'KRW';
    var h = '<div class="hintbox">' + esc(CT.t('amountHint')) + '</div><label>' + esc(CT.t('fLabel')) + '<input name="label" required maxlength="120" value="' + esc(l ? l.label : '') + '"></label>' +
      '<div class="two"><label>' + esc(CT.t('fCamp')) + '<select name="campId">' + campOpts((l && l.campId) || $('bcamp').value, '') + '</select></label><label>' + esc(CT.t('fCat')) + '<select name="category">' + CATS.map(function (c) { return '<option value="' + c + '"' + ((l ? l.category : 'misc') === c ? ' selected' : '') + '>' + esc(CT.t('c' + c)) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="two"><label>' + esc(CT.t('fCur')) + '<select name="currency">' + CURS.map(function (c) { return '<option' + (cur === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></label><label>' + esc(CT.t('fStatus')) + '<select name="status">' + STS.map(function (c) { return '<option value="' + c + '"' + ((l ? l.status : 'planned') === c ? ' selected' : '') + '>' + esc(CT.t('st' + c)) + '</option>'; }).join('') + '</select></label></div>' +
      '<div class="two">' + amtField('plannedAmount', CT.t('fPlanned'), l ? l.plannedAmount : null, cur) + amtField('expectedAmount', CT.t('fExpected'), l ? l.expectedAmount : null, cur) + '</div>' +
      '<div class="two">' + amtField('actualAmount', CT.t('fActual'), l ? l.actualAmount : null, cur) + '<label>' + esc(CT.t('fPaid')) + '<input type="date" name="paidAt" value="' + esc((l && l.paidAt) || '') + '"></label></div>' +
      '<label>' + esc(CT.t('fVendor')) + '<input name="vendor" maxlength="80" value="' + esc(l ? l.vendor : '') + '"></label><label>' + esc(CT.t('fNotes')) + '<input name="notes" maxlength="400" value="' + esc(l ? l.notes : '') + '"></label>';
    CT.ask(CT.t(l ? 'editLine' : 'newLine'), h, async function (fd) {
      var body = { label: fd.label, campId: fd.campId, category: fd.category, currency: fd.currency, status: fd.status, plannedAmount: fd.plannedAmount, expectedAmount: fd.expectedAmount, actualAmount: fd.actualAmount, paidAt: fd.paidAt || null, vendor: fd.vendor, notes: fd.notes };
      if (l) await CT.api('/api/campteam/budget?id=' + encodeURIComponent(l.id), { method: 'PATCH', body: body }); else await CT.api('/api/campteam/budget', { method: 'POST', body: Object.assign({ kind: 'line' }, body) });
      await load();
    });
  }
  function targetForm() {
    var camp = $('bcamp').value, h = '<div class="hintbox">' + esc(CT.t('amountHint')) + '</div><label>' + esc(CT.t('fCamp')) + '<select name="campId">' + campOpts(camp, '') + '</select></label><div class="two"><label>' + esc(CT.t('fCur')) + '<select name="currency">' + CURS.map(function (c) { return '<option>' + c + '</option>'; }).join('') + '</select></label><label>' + esc(CT.t('fTargetAmt')) + '<input name="amount" required inputmode="decimal"></label></div>';
    CT.ask(CT.t('setTarget'), h, async function (fd) { await CT.api('/api/campteam/budget', { method: 'POST', body: { kind: 'target', campId: fd.campId, currency: fd.currency, amount: fd.amount } }); await load(); });
  }
  function copyForm() {
    var h = '<div class="hintbox">' + esc(CT.t('copyHelp')) + '</div><label>' + esc(CT.t('fFrom')) + '<select name="fromCampId">' + campOpts('', '') + '</select></label><label>' + esc(CT.t('fTo')) + '<select name="toCampId">' + campOpts('', '') + '</select></label>';
    CT.ask(CT.t('copyTitle'), h, async function (fd) {
      var body = { kind: 'copy', fromCampId: fd.fromCampId, toCampId: fd.toCampId }, r;
      try { r = await CT.api('/api/campteam/budget', { method: 'POST', body: body }); } catch (e) { if (e.status === 409 && confirm(CT.t('copyConfirm'))) r = await CT.api('/api/campteam/budget', { method: 'POST', body: Object.assign({ append: true }, body) }); else throw e; }
      alert(CT.t('copied') + ': ' + r.copied); await load();
    });
  }
  async function downloadCsv() {
    var q = $('bcamp').value ? '?campId=' + encodeURIComponent($('bcamp').value) + '&format=csv' : '?format=csv';
    var res = await fetch('/api/campteam/budget-report' + q, { headers: { Authorization: 'Bearer ' + CT.token() } }); if (!res.ok) { alert(CT.t('loadFail')); return; }
    var blob = await res.blob(), a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'camp-budget.csv'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
  }

  CT.boot(async function (me) {
    if (!me.perms.moneyRead) { $('bdMain').hidden = true; $('bdLocked').hidden = false; ['bdCsv', 'bdCopy', 'bdTarget', 'bdAdd'].forEach(function (id) { $(id).hidden = true; }); CT.applyI18n(); return; }
    try { S.types = (await CT.api('/api/campteam/camps')).types; fill(); await load(); } catch (e) { $('main').insertAdjacentHTML('afterbegin', '<div class="err">' + esc(e.message) + '</div>'); return; }
    CT.applyI18n(); fill();
    var first = new URLSearchParams(location.search).get('campId'); if (first) { $('bcamp').value = first; await load(); }
    ['bcamp', 'bcat', 'bcur'].forEach(function (id) { $(id).onchange = load; }); var t; $('bq').oninput = function () { clearTimeout(t); t = setTimeout(load, 250); };
    $('bdAdd').onclick = function () { lineForm(); }; $('bdTarget').onclick = targetForm; $('bdCopy').onclick = copyForm; $('bdCsv').onclick = downloadCsv;
    $('bdTable').addEventListener('click', async function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.edit) lineForm(S.data.lines.filter(function (x) { return x.id === b.dataset.edit; })[0]);
      else if (b.dataset.del && confirm(CT.t('confirmDel'))) { try { await CT.api('/api/campteam/budget?id=' + encodeURIComponent(b.dataset.del), { method: 'DELETE' }); await load(); } catch (err) { alert(err.message); } }
    });
    document.addEventListener('ct-lang', function () { CT.applyI18n(); fill(); render(); });
  });
})();
