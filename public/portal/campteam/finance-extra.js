// 회계 장부: 경비 연동 탭 + 잔액 대조 탭. finance.js 가 먼저 불러와져 있어야 한다.
(function () {
  CT.addDict({
    ko: {
      exTitle: '경비 리포트 연동', exHelp: '월코 포털 「경비 리포트」에서 송금 처리가 끝난 항목 중, 승인자가 확정한 출금 계좌가 아래 "캠프 계좌"인 항목을 장부의 지출로 자동 반영해요. 경비 리포트는 읽기만 하고 고치지 않아요. 계좌번호와 영수증은 가져오지 않아요.',
      exWhy: '카테고리가 아니라 "출금 계좌"가 기준이에요 — 같은 카테고리라도 어느 계좌에서 나갔는지는 승인자가 항목마다 정하기 때문이에요.', exNoKv: '이 서버는 경비 리포트 저장소에 연결되어 있지 않아요. (배포한 사이트에서는 자동으로 연결돼요)',
      exAccounts: '캠프 계좌로 볼 출금 계좌', exMap: '경비 카테고리 → 장부 항목', exMapHelp: '정하지 않은 카테고리는 「기타」로 들어가고 "분류 확인 필요"로 표시돼요. 나중에 정하면 그 건들이 자동으로 맞춰져요.', exMapNone: '(정하지 않음 → 기타)', exSave: '설정 저장', exSaved: '저장했어요.', exRetired: '(더 이상 선택 안 됨)', exOnlyAdmin: '설정은 캠프 재정 담당·디렉터가 바꿔요.',
      exSync: '지금 가져오기', exSyncing: '가져오는 중…', exLast: '마지막 확인', exNever: '아직 없음', exResult: '반영', exResultPending: '보류', exNoRules: '위에서 캠프 계좌를 고르고 저장하면 가져오기 시작해요.',
      exPending: '확인이 필요한 항목', exPendingNone: '확인할 항목이 없어요.', exLinked: '장부에 반영된 항목 (최근)', exIgnored: '제외한 항목',
      exReasondup: '장부에 금액이 같고 날짜가 비슷한 거래가 이미 있어요. 같은 거래인지 확인해 주세요.', exReasonnoPeriod: '이 날짜를 포함하는 장부 기간이 없어요. 「기간 · 마감」에서 기간을 만들면 자동으로 반영돼요.', exReasonclosed: '이 날짜의 기간이 마감되어 있어요. 기간을 다시 열면 자동으로 반영돼요.',
      exSimilar: '비슷한 장부 거래', exSame: '같은 거래예요 (연결만)', exAdd: '새 지출로 추가', exIgnore: '제외', exRestore: '되돌리기', exCat: '항목', exPickCat: '항목 고르기', exItem: '품목', exDate: '송금일', exAmount: '금액', exProject: '프로젝트',
      exConfirmIgnore: '이 항목을 장부에 넣지 않을까요? (나중에 되돌릴 수 있어요)', exDone: '처리했어요.', exFx: '외화',
      rcTitle: '잔액 대조', rcHelp: '월코 재정 담당에게 통장의 실제 잔액을 받아 아래에 적으면, 그 날짜까지의 장부 잔액과 비교해서 차이를 기록해요. 포털은 은행에 접속하지 않아요 — 사람이 확인한 값을 적어 두는 기록이에요. 한 달에 한 번 정도 하면 좋아요.',
      rcDate: '기준 날짜', rcBank: '통장 실제 잔액', rcNote: '메모 (누구에게 받은 값인지 등)', rcLedger: '그 날짜까지의 장부 잔액', rcDiff: '차이 (통장 − 장부)', rcCheck: '장부 잔액 확인', rcSave: '기록하기', rcMatch: '일치해요', rcMismatch: '차이가 있어요', rcTips: '차이가 있다면 이런 걸 확인해 보세요: 엑셀에 아직 안 옮긴 입출금 · 경비 리포트 중 아직 반영되지 않은 건(경비 연동 탭) · 날짜가 다른 거래 · 통장 이체 수수료.', rcHistory: '대조 기록', rcDelete: '이 기록을 지울까요?', rcNone: '아직 대조 기록이 없어요.', rcSaved: '기록했어요.', rcBankRequired: '통장 잔액을 입력해 주세요.' },
    en: {
      exTitle: 'Expense report link', exHelp: 'From the WOLKO portal "Expense Report", items that have been paid out (processed) and whose approver-confirmed withdrawal account is one of the "camp accounts" below are added to the ledger as expenses automatically. Expense reports are only read, never changed. Account numbers and receipts are not read.',
      exWhy: 'The withdrawal account is what counts, not the category — the approver decides per item which account the money leaves from.', exNoKv: 'This server is not connected to the expense report store. (It connects automatically on the deployed site.)',
      exAccounts: 'Withdrawal accounts treated as camp accounts', exMap: 'Expense category → ledger category', exMapHelp: 'Categories you leave unset go to "기타" and are flagged "needs classification". Once you set them, those entries are fixed automatically.', exMapNone: '(not set → 기타)', exSave: 'Save settings', exSaved: 'Saved.', exRetired: '(no longer selectable)', exOnlyAdmin: 'Camp finance and the director change these settings.',
      exSync: 'Import now', exSyncing: 'Importing…', exLast: 'Last checked', exNever: 'not yet', exResult: 'Linked', exResultPending: 'Held', exNoRules: 'Pick the camp account(s) above and save to start importing.',
      exPending: 'Items needing attention', exPendingNone: 'Nothing to check.', exLinked: 'Items added to the ledger (recent)', exIgnored: 'Excluded items',
      exReasondup: 'The ledger already has an entry with the same amount and a close date. Please check whether it is the same transaction.', exReasonnoPeriod: 'No ledger period covers this date. Create one under "Periods · Close" and it will be added automatically.', exReasonclosed: 'The period for this date is closed. Reopen it and the item will be added automatically.',
      exSimilar: 'Similar ledger entry', exSame: 'Same transaction (just link)', exAdd: 'Add as new expense', exIgnore: 'Exclude', exRestore: 'Restore', exCat: 'Category', exPickCat: 'Pick category', exItem: 'Item', exDate: 'Paid on', exAmount: 'Amount', exProject: 'Project',
      exConfirmIgnore: 'Leave this item out of the ledger? (You can restore it later.)', exDone: 'Done.', exFx: 'foreign currency',
      rcTitle: 'Reconcile', rcHelp: 'Get the real bank balance from WOLKO finance and enter it here. It is compared with the ledger balance up to that date and the difference is recorded. The portal does not connect to the bank — this is a record of a value a person confirmed. Once a month is a good rhythm.',
      rcDate: 'As of', rcBank: 'Actual bank balance', rcNote: 'Note (who gave you the value, etc.)', rcLedger: 'Ledger balance up to that date', rcDiff: 'Difference (bank − ledger)', rcCheck: 'Check ledger balance', rcSave: 'Record', rcMatch: 'Matches', rcMismatch: 'There is a difference', rcTips: 'If there is a difference, check: transactions not yet in Excel · expense reports not yet linked (Expense reports tab) · entries with different dates · bank transfer fees.', rcHistory: 'Reconciliation history', rcDelete: 'Delete this record?', rcNone: 'No reconciliations yet.', rcSaved: 'Recorded.', rcBankRequired: 'Enter the bank balance.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, F = function () { return window.FIN; }, KRW = function (n) { return CT.money(n, 'KRW'); };
  var X = { data: null, msg: '', busy: false }, R = { items: [], current: null, msg: '' };
  var wname = function (a) { return CT.lang() === 'en' ? a.en : a.ko; };
  var canAdmin = function () { return !!(F().S.perms && F().S.perms.moneyAdmin); }, canWrite = function () { return !!(F().S.perms && F().S.perms.moneyWrite); };

  // ───────── 경비 연동 ─────────
  async function exLoad() { try { X.data = await F().api('ledger-expense'); } catch (e) { X.data = null; X.msg = e.message; } }
  function exHtml() {
    var d = X.data; if (!d) return '<div class="err">' + esc(X.msg || CT.t('loadFail')) + '</div>';
    var ed = canAdmin(), on = new Set(d.rules.withdraw);
    var h = '<section class="card"><h2>' + esc(CT.t('exTitle')) + '</h2><div class="hintbox">' + esc(CT.t('exHelp')) + '<br><b>' + esc(CT.t('exWhy')) + '</b></div>' + (d.connected ? '' : '<div class="hintbox" style="margin-top:8px;color:var(--accent)">' + esc(CT.t('exNoKv')) + '</div>') +
      '<div class="fgrid" style="margin-top:12px"><div><h3 class="h3">' + esc(CT.t('exAccounts')) + '</h3>' + d.withdrawOptions.filter(function (a) { return !a.retired || on.has(a.id); }).map(function (a) { return '<label class="chk" style="display:flex"><input type="checkbox" data-wd="' + esc(a.id) + '"' + (on.has(a.id) ? ' checked' : '') + (ed ? '' : ' disabled') + '> ' + esc(wname(a)) + (a.retired ? ' <span class="hint">' + esc(CT.t('exRetired')) + '</span>' : '') + '</label>'; }).join('') + '</div>' +
      '<div><h3 class="h3">' + esc(CT.t('exMap')) + '</h3><table><tbody>' + d.accountOptions.map(function (a) { return '<tr><td style="white-space:nowrap">' + esc(a) + '</td><td><select data-map="' + esc(a) + '"' + (ed ? '' : ' disabled') + '><option value="">' + esc(CT.t('exMapNone')) + '</option>' + d.categories.map(function (c) { return '<option' + (d.rules.account[a] === c ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></td></tr>'; }).join('') + '</tbody></table><div class="hint" style="margin-top:6px">' + esc(CT.t('exMapHelp')) + '</div></div></div>' +
      '<div style="margin-top:12px">' + (ed ? '<button class="btn pri" data-ex="saveRules">' + esc(CT.t('exSave')) + '</button> ' : '<span class="hint">' + esc(CT.t('exOnlyAdmin')) + '</span> ') + (canWrite() ? '<button class="btn" data-ex="sync"' + (X.busy ? ' disabled' : '') + '>' + esc(CT.t(X.busy ? 'exSyncing' : 'exSync')) + '</button> ' : '') + '<span class="hint" id="exMsg">' + esc(X.msg) + '</span> <span class="hint" style="float:right">' + esc(CT.t('exLast')) + ': ' + esc(d.lastSync ? d.lastSync.replace('T', ' ').slice(0, 16) : CT.t('exNever')) + '</span></div>' +
      (d.rules.withdraw.length ? '' : '<div class="hintbox" style="margin-top:8px">' + esc(CT.t('exNoRules')) + '</div>') + '</section>';
    h += '<section class="card" style="margin-top:14px"><h2>' + esc(CT.t('exPending')) + ' (' + d.pending.length + ')</h2>' + (d.pending.length ? d.pending.map(function (p) { return rowHtml(p, d, true); }).join('') : '<div class="empty">' + esc(CT.t('exPendingNone')) + '</div>') + '</section>';
    if (d.linked.length) h += '<section class="card" style="margin-top:14px"><h2>' + esc(CT.t('exLinked')) + '</h2>' + d.linked.map(function (p) { return rowHtml(p, d, false); }).join('') + '</section>';
    if (d.ignored.length) h += '<section class="card" style="margin-top:14px"><h2>' + esc(CT.t('exIgnored')) + '</h2>' + d.ignored.map(function (p) { return rowHtml(p, d, false); }).join('') + '</section>';
    return h;
  }
  function rowHtml(p, d, actions) {
    var key = esc(p.reportId) + '|' + p.rowIdx, w = canWrite();
    var fx = p.currency && p.currency !== 'KRW' ? ' · ' + esc(CT.t('exFx')) + ' ' + esc(p.currency) + ' ' + esc(p.origAmount) : '';
    var h = '<div class="row" style="align-items:flex-start"><div style="flex:1"><b>' + esc(p.item || '—') + '</b><small>' + esc(CT.t('exDate')) + ' ' + esc(p.entryDate) + ' · ' + esc(p.account || '—') + (p.project ? ' · ' + esc(CT.t('exProject')) + ': ' + esc(p.project) : '') + (p.submitter ? ' · ' + esc(p.submitter) : '') + fx + '</small>';
    if (actions && p.reason) h += '<small style="color:var(--accent)">' + esc(CT.t('exReason' + p.reason)) + '</small>';
    if (actions && p.candidateEntry) h += '<small style="display:block">' + esc(CT.t('exSimilar')) + ': ' + esc(p.candidateEntry.entryDate) + ' · ' + esc(p.candidateEntry.category) + ' · ' + esc(p.candidateEntry.description) + ' · <b>' + esc(KRW(p.candidateEntry.amount)) + '</b></small>';
    h += '</div><div style="text-align:right;white-space:nowrap"><b>' + esc(KRW(p.amount)) + '</b>';
    if (actions && w) h += '<div style="margin-top:6px">' + (p.candidateEntry ? '<button class="btn sm" data-ex="merge" data-k="' + key + '" data-e="' + esc(p.candidateEntry.id) + '">' + esc(CT.t('exSame')) + '</button> ' : '') + (p.reason !== 'noPeriod' && p.reason !== 'closed' ? '<select data-pick="' + key + '"><option value="">' + esc(CT.t('exPickCat')) + '</option>' + d.categories.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '</select> <button class="btn sm pri" data-ex="link" data-k="' + key + '">' + esc(CT.t('exAdd')) + '</button> ' : '') + '<button class="btn sm" data-ex="ignore" data-k="' + key + '">' + esc(CT.t('exIgnore')) + '</button></div>';
    if (!actions && p.state === 'ignored' && w) h += '<div style="margin-top:6px"><button class="btn sm" data-ex="restore" data-k="' + key + '">' + esc(CT.t('exRestore')) + '</button></div>';
    return h + '</div></div>';
  }
  function exBind() {
    var body = $('fnBody');
    body.onclick = async function (e) {
      var b = e.target.closest('[data-ex]'); if (!b) return; var a = b.dataset.ex, msg = $('exMsg');
      try {
        if (a === 'saveRules') {
          var wd = [].map.call(document.querySelectorAll('[data-wd]:checked'), function (c) { return c.dataset.wd; }), acc = {}; document.querySelectorAll('[data-map]').forEach(function (s) { if (s.value) acc[s.dataset.map] = s.value; });
          var r = await F().api('ledger-expense', { method: 'POST', body: { action: 'rules', withdraw: wd, account: acc } }); X.msg = CT.t('exSaved') + (r.reclassified ? ' (' + r.reclassified + ')' : ''); await exLoad(); F().render();
        } else if (a === 'sync') {
          X.busy = true; X.msg = ''; F().render(); var s = await F().api('ledger-expense', { method: 'POST', body: { action: 'sync' } }); X.busy = false; X.msg = CT.t('exResult') + ' ' + s.linked + ' · ' + CT.t('exResultPending') + ' ' + s.pending; await exLoad(); await F().loadPeriods(); F().render();
        } else {
          var k = b.dataset.k.split('|'), body2 = { action: a, reportId: k[0], rowIdx: +k[1] };
          if (a === 'ignore' && !confirm(CT.t('exConfirmIgnore'))) return;
          if (a === 'merge') body2.entryId = b.dataset.e;
          if (a === 'link') { var sel = document.querySelector('[data-pick="' + b.dataset.k.replace(/"/g, '') + '"]'); if (sel && sel.value) body2.category = sel.value; }
          await F().api('ledger-expense', { method: 'POST', body: body2 }); X.msg = CT.t('exDone'); await exLoad(); await F().loadPeriods(); F().render();
        }
      } catch (er) { X.busy = false; X.msg = er.message; var m = $('exMsg'); if (m) { m.textContent = er.message; m.style.color = 'var(--accent)'; } else alert(er.message); }
    };
  }

  // ───────── 잔액 대조 ─────────
  async function rcLoad() { var S = F().S; try { var r = await F().api('ledger-reconcile?periodId=' + encodeURIComponent(S.pid)); R.items = r.items; } catch (e) { R.items = []; } }
  function clampDate(p) { var t = F().today(); return t < p.startDate ? p.startDate : t > p.endDate ? p.endDate : t; }
  function rcHtml() {
    var p = F().cur(), w = canWrite(), h = '<section class="card"><h2>' + esc(CT.t('rcTitle')) + '</h2><div class="hintbox">' + esc(CT.t('rcHelp')) + '</div>';
    if (w) h += '<form id="rcForm" class="form" style="margin-top:12px;max-width:560px"><div class="two"><label>' + esc(CT.t('rcDate')) + '<input type="date" name="asOfDate" value="' + esc(R.date || clampDate(p)) + '" min="' + esc(p.startDate) + '" max="' + esc(p.endDate) + '" required></label><label>' + esc(CT.t('rcBank')) + '<input name="bankBalance" inputmode="numeric" value="' + esc(R.bank || '') + '" required></label></div><label>' + esc(CT.t('rcNote')) + '<input name="note" maxlength="300"></label>' +
      '<div class="money" id="rcLive"></div><div><button type="button" class="btn" id="rcCheck">' + esc(CT.t('rcCheck')) + '</button> <button type="submit" class="btn pri">' + esc(CT.t('rcSave')) + '</button> <span class="hint" id="rcMsg">' + esc(R.msg) + '</span></div></form><div class="hintbox" style="margin-top:12px">' + esc(CT.t('rcTips')) + '</div>';
    h += '</section><section class="card" style="margin-top:14px"><h2>' + esc(CT.t('rcHistory')) + '</h2>' + (R.items.length ? '<table class="vtab"><thead><tr><th>' + esc(CT.t('rcDate')) + '</th><th style="text-align:right">' + esc(CT.t('rcBank')) + '</th><th style="text-align:right">' + esc(CT.t('rcLedger')) + '</th><th style="text-align:right">' + esc(CT.t('rcDiff')) + '</th><th>' + esc(CT.t('rcNote')) + '</th><th></th></tr></thead><tbody>' + R.items.map(function (r) {
      return '<tr><td>' + esc(r.asOfDate) + '</td><td style="text-align:right">' + esc(KRW(r.bankBalance)) + '</td><td style="text-align:right">' + esc(KRW(r.ledgerBalance)) + '</td><td style="text-align:right;font-weight:700;color:' + (r.diff === 0 ? 'var(--ok)' : 'var(--accent)') + '">' + (r.diff === 0 ? esc(CT.t('rcMatch')) : esc(KRW(r.diff))) + '</td><td>' + esc(r.note) + '<small style="display:block;color:var(--mid)">' + esc(String(r.createdBy || '').split('@')[0]) + ' · ' + esc((r.createdAt || '').slice(0, 10)) + '</small></td><td>' + (w ? '<button class="btn sm danger" data-rc="del" data-id="' + esc(r.id) + '">' + esc(CT.t('del')) + '</button>' : '') + '</td></tr>'; }).join('') + '</tbody></table>' : '<div class="empty">' + esc(CT.t('rcNone')) + '</div>') + '</section>';
    return h;
  }
  function rcBind() {
    var f = $('rcForm'), S = F().S;
    if (f) {
      var check = async function () {
        var d = f.asOfDate.value; if (!d) return null; R.date = d; R.bank = f.bankBalance.value;
        var r = await F().api('ledger-reconcile?periodId=' + encodeURIComponent(S.pid) + '&asOf=' + d), led = r.current.ledgerBalance, bank = Number(String(f.bankBalance.value).replace(/[,\s₩]/g, '')), live = $('rcLive');
        var has = f.bankBalance.value.trim() !== '' && Number.isFinite(bank);
        live.innerHTML = '<div><label>' + esc(CT.t('rcLedger')) + '</label><strong>' + esc(KRW(led)) + '</strong></div>' + (has ? '<div><label>' + esc(CT.t('rcDiff')) + '</label><strong style="color:' + (bank - led === 0 ? 'var(--ok)' : 'var(--accent)') + '">' + (bank - led === 0 ? esc(CT.t('rcMatch')) : esc(KRW(bank - led))) + '</strong></div>' : '');
        return led;
      };
      $('rcCheck').onclick = function () { check().catch(function (e) { $('rcMsg').textContent = e.message; }); };
      f.asOfDate.onchange = function () { check().catch(function () {}); }; f.bankBalance.oninput = function () { check().catch(function () {}); };
      check().catch(function () {});
      f.onsubmit = async function (ev) {
        ev.preventDefault(); var m = $('rcMsg'); if (!f.bankBalance.value.trim()) { m.textContent = CT.t('rcBankRequired'); m.style.color = 'var(--accent)'; return; }
        try { await F().api('ledger-reconcile', { method: 'POST', body: { periodId: S.pid, asOfDate: f.asOfDate.value, bankBalance: f.bankBalance.value, note: f.note.value } }); R.msg = CT.t('rcSaved'); R.bank = ''; await rcLoad(); await F().loadTab(); F().render(); }
        catch (er) { m.textContent = er.message; m.style.color = 'var(--accent)'; }
      };
    }
    $('fnBody').onclick = async function (e) { var b = e.target.closest('[data-rc="del"]'); if (!b || !confirm(CT.t('rcDelete'))) return; try { await F().api('ledger-reconcile?id=' + encodeURIComponent(b.dataset.id), { method: 'DELETE' }); await rcLoad(); await F().loadTab(); F().render(); } catch (er) { alert(er.message); } };
  }

  window.FinTabs = window.FinTabs || {};
  window.FinTabs.expense = { html: exHtml, bind: exBind, load: exLoad };
  window.FinTabs.recon = { html: rcHtml, bind: rcBind, load: rcLoad };
})();
