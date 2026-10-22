/* 캠프팀 포털 — 「?」 도움말. 헷갈릴 만한 곳 옆에 ? 를 달고, 마우스를 올리거나(폰은 누르면) 짧은 안내가 떠요.
 * 쓰는 법
 *   정적 HTML:  <span class="qh" data-h="열쇠"></span>
 *   그리는 중:  CT.help('열쇠')  (문자열을 돌려줌)
 * 안내 글은 아래 사전의 h_열쇠 에 한/영으로 적어요. 언어를 바꾸면 안내도 같이 바뀌어요. */
(function () {
  var CT = window.CT; if (!CT) return;
  CT.addDict({
    ko: { helpLabel: '도움말',
      h_balance: '장부에 적힌 수입과 지출로 계산한 "캠프 통장 잔액"이에요. 은행에 직접 연결된 숫자가 아니라서, 가끔 「잔액 대조」로 실제 통장과 같은지 확인해요.',
      h_period: '장부는 6개월·분기 같은 "기간" 단위로 관리해요. 여기서 지금 보고 싶은 기간을 고르거나 새 기간을 만들어요.',
      h_carry: '이월금은 지난 기간에서 남아 넘어온 돈이에요. 기간을 마감하면 남은 금액이 다음 기간으로 자동으로 넘어가요.',
      h_tabSummary: '이 기간에 돈이 얼마 들어오고 나갔고, 얼마 남았는지 한눈에 보여 줘요. 항목별로 계획과 실제도 비교해요.',
      h_tabLedger: '실제로 들어오고 나간 돈을 한 줄씩 적는 곳이에요(엑셀의 「장부」 탭과 같아요). 적으면 위의 통장 잔액이 바로 바뀌어요.',
      h_tabPeriods: '기간을 만들고 마감해요. 마감하면 그 기간은 잠기고, 남은 돈이 다음 기간의 이월금으로 넘어가요.',
      h_tabPlan: '이 기간에 항목별로 얼마를 쓰기로(받기로) "계획"했는지 적는 곳이에요. 실제 돈은 바뀌지 않고, 요약에서 계획과 실제를 비교하는 기준이 돼요.',
      h_tabImport: '재정 담당이 쓰는 엑셀 파일을 올리면 새로 생기거나 바뀐 줄만 장부에 반영해요. 먼저 미리 보기만 보여 주니까 안전해요.',
      h_tabExpense: '월코 경비 리포트에서 송금이 끝난 항목 중 "캠프 통장"에서 나간 것을 장부 지출로 가져와요. 경비 리포트는 읽기만 하고 바꾸지 않아요.',
      h_tabRecon: '은행 통장의 실제 잔액과 장부 잔액이 같은지 확인해서 기록해요. 다르면 얼마 차이인지 보여 줘요.',
      h_tabCalc: '캠프비·인원·항목별 단가를 넣어 "얼마 들어오고 나가고 남는지" 미리 계산해 보는 연습장이에요. 장부는 바뀌지 않아요.',
      h_tabCats: '식비·간식비 같은 수입/지출 항목 이름 목록이에요. 장부와 계획이 이 이름을 같이 써요.',
      h_more: '자주 쓰지 않는 기능은 여기에 모아 뒀어요.',
      h_campBudget: '캠프 하나의 지출 계획(계획·예상·실제)을 정리하는 화면이에요. 장부의 "기간 예산"과는 달리 캠프별로 따로 관리해요.',
      h_money_read: '"금액 보기"는 장부·예산 같은 돈 정보를 볼 수 있는 권한이에요. 명단에 없는 사람은 볼 수 없어요.',
      h_portalCard: '월코 포털 「캠프 관리자」에 들어온 신청 정보를 읽어서 보여 줘요. 여기서 고쳐도 포털은 바뀌지 않아요.',
      h_scMin: '잔금까지 모두 확인되어 "최종 확정"된 사람만 센 가장 보수적인 숫자예요.',
      h_scExp: '예약금을 낸 사람부터 센 숫자예요. 홈페이지 신청 현황 게이지와 같은 기준이에요.',
      h_scMax: '접수 대기까지 신청한 사람 모두가 마감까지 온다고 가정한 가장 큰 숫자예요(예비 명단은 제외).',
      h_leftover: '예상 수입(신청 인원이 낸 캠프비)에서 이 캠프의 지출 계획을 뺀 금액이에요. 지출 계획은 「캠프별 예산안」에 입력한 값을 써요.',
      h_private: '연락처·환불 계좌 같은 개인정보는 디렉터·캠프 재정 담당·관리자만 볼 수 있어요. 열어 보면 조회 기록이 남아요.',
      h_today: '오늘 내가 해야 할 일, 마감이 가까운 일, 곧 있을 일정과 회의를 한곳에 모아 보여 줘요.',
      h_editHome: '위젯을 끌어서 옮기거나 크기를 바꾸고, 눈 아이콘으로 숨길 수 있어요. 내 화면에만 적용돼요.',
      h_alerts: '내 업무 마감, 곧 있을 회의·일정, 팀 공지를 모아 보여 줘요. 확인한 알림은 ✕로 끌 수 있어요.',
      h_myAlerts: '내가 맡은 업무의 마감과 곧 있을 회의·일정이 자동으로 모여요. 업무를 완료하면 사라져요.',
      h_teamNotice: '팀원이 올린 공지예요. 팀 전체에게 보내거나, 받을 사람을 골라서 보낼 수 있어요.',
      h_pin: '고정하면 목록 맨 위에 계속 보여요.',
      h_aiSummary: 'AI가 오늘 할 일을 한두 줄로 요약해 줘요. 목록은 규칙으로 만든 정확한 값이고, AI는 요약 문장만 써요. 업무 제목·마감일만 AI에게 보내요.',
      h_weeklyMail: '매주 화요일 아침에 이번 주 내 할 일을 이메일로 보내 드려요. 여기서 끌 수 있어요.',
      h_notifyDays: '마감이나 일정이 몇 일 남았을 때 알림에 올릴지 정해요. 예: 3, 1 이면 3일 전과 1일 전에 알려요.',
      h_expireDays: '지난 공지는 이 일수가 지나면 목록에서 접혀요. 삭제되지는 않아요.',
      h_status: '업무의 진행 상태예요. 완료하면 내 알림에서 사라져요.',
      h_ownerSuggest: '담당자가 정해지지 않은 업무에 제안된 담당 후보예요. 확인하고 담당자로 지정해 주세요.',
      h_decision: '회의에서 정한 결정이에요. "방향 합의"는 큰 방향만, "최종 결정"은 확정, "변경"은 바뀐 결정이에요.',
      h_restricted: '🔒 금액이 들어 있는 자료예요. 금액 권한이 있는 사람에게만 보여요.',
      h_role: '역할은 기본 권한 묶음이에요. 아래 권한 표에서 사람마다 항목별로 더 세밀하게 바꿀 수 있어요.',
      h_permTable: '「안 보임 / 보기만 / 수정 가능」을 항목별로 골라요. 역할의 기본값과 다르게 바꾼 칸은 표시돼요. 이 설정은 관리자만 할 수 있어요.',
      h_tvKey: 'TV 화면 주소의 열쇠예요. 이 주소를 아는 사람은 로그인 없이 TV 화면을 볼 수 있으니 공유에 주의하세요.',
      h_trash: '지운 항목은 바로 사라지지 않고 여기에 보관돼요. 복구하거나 영구 삭제할 수 있어요.',
      h_campSpace: '캠프 하나에 연결된 업무·일정·회의·결정·자료·예산을 한 화면에서 보는 곳이에요.',
      h_pageTasks: '캠프 준비 업무와 일정을 한곳에서 관리해요. 담당자를 내 이메일로 지정한 업무는 홈의 "오늘 내가 할 일"과 알림에 나와요.',
      h_pageMeetings: '회의록과 결정을 모아 둬요. 회의에서 정한 결정은 "현재 유효한 결정"으로 캠프 공간과 홈에 보여요.',
      h_pageFiles: '캠프 자료를 한곳에 모아요. 파일을 올리면 새 버전으로 쌓이고, 금액이 들어 있는 자료는 🔒로 표시돼 금액 권한이 있는 사람에게만 보여요.',
      h_pageBudget: '캠프 하나의 지출 계획을 항목별로 정리해요. 여기 입력한 "예상 최종" 합계가 캠프 공간의 "계획 지출"과 "남을 돈"에 쓰여요.',
      h_pageCamps: '캠프 유형(예: 겨울 캠프)과 개별 행사(예: 2027 Winter Camp)를 만들고, 각 행사의 공간으로 들어가요. 월코 포털 캠프와 연결하면 신청 현황이 보여요.',
      h_pageHome: '내 담당 업무, 마감, 일정, 캠프 현황을 한눈에 봐요. 「홈 꾸미기」로 내 화면을 바꿀 수 있어요.',
      h_pageSearch: '업무·회의·결정·파일을 한 번에 찾아요. 볼 권한이 없는 영역은 결과에 나오지 않아요.',
      h_pageSettings: '팀 명단과 역할, 항목별 권한을 관리해요. 관리자만 볼 수 있어요.',
      h_pageTrash: '지운 항목은 여기에 보관돼요. 「복구」를 누르면 원래 자리로 돌아가요.',
      h_pageTv: '사무실 TV에 띄울 화면을 꾸미고 주소(열쇠)를 확인해요.',
      h_pageFinance: '캠프 통장의 실제 수입·지출(장부)을 기간별로 기록하고, 기간을 마감해 남은 돈을 다음 기간으로 넘겨요.',
      h_budgetCols: '계획 = 처음 세운 금액, 예상 = 지금 예상하는 금액, 실제 = 실제로 쓴 금액이에요. "예상 최종"은 지급이 끝난 항목은 실제 금액, 아직이면 예상·계획과 실제 중 큰 값이에요.',
      h_remaining: '총 예산에서 예상 최종 지출을 뺀 금액이에요.',
      h_sheets: '포털의 업무를 기존 구글 시트에 반영하기 전에, 어느 칸에 무엇이 쓰이는지만 미리 보여 줘요. 이 버튼은 아무것도 쓰지 않아요.',
      h_backup: '모든 자료를 파일로 내려받아 보관해요. 표 하나만 CSV로 받을 수도 있어요.',
      h_glossary: '회의록·AI 초안에서 번역·표기를 통일하는 단어 목록이에요. "그대로 두기"로 표시한 단어는 번역하지 않아요.',
      h_audit: '누가 언제 무엇을 바꿨는지 기록이에요. 개인정보를 열어 본 기록도 여기에 남아요.',
      h_tvNotices: 'TV 화면 아래에 흐르는 짧은 공지예요.',
      h_template: '반복되는 준비 업무를 묶어 둔 체크리스트예요. 캠프에 적용하면 업무가 한꺼번에 만들어져요.',
      h_checklistDue: '기준 날짜(예: 캠프 시작일)에서 며칠 전·후로 마감일이 계산돼요.',
      h_homeMobile: '폰에서는 위젯을 끌어 옮기는 대신 ▲▼ 버튼으로 순서를 바꿔요.',
      h_layoutEdit: '카드를 위아래로 옮기거나 숨겨서 내 화면에 맞게 바꿔요. 다른 사람 화면에는 영향이 없어요.' },
    en: { helpLabel: 'Help',
      h_balance: 'The "camp bank balance" calculated from the income and expenses in the ledger. It is not connected to the bank, so use "Bank check" now and then to compare with the real account.',
      h_period: 'The ledger is kept in "periods" such as six months or a quarter. Choose the period to view here, or create a new one.',
      h_carry: 'Carry-over is the money left from the previous period. When you close a period the remainder moves to the next one automatically.',
      h_tabSummary: 'Shows at a glance how much came in and went out in this period and what is left, with plan vs actual by category.',
      h_tabLedger: 'Where you enter real income and expenses one line at a time (like the Excel "장부" tab). The bank balance above updates immediately.',
      h_tabPeriods: 'Create and close periods. Closing locks the period and carries the remainder into the next one.',
      h_tabPlan: 'The amounts you planned to spend (or receive) per category in this period. Real money does not change; it is the baseline for plan vs actual.',
      h_tabImport: 'Upload the finance Excel file and only new or changed rows are applied. You see a preview first, so it is safe.',
      h_tabExpense: 'Brings paid items from WOLKO expense reports that came out of the camp account into the ledger as expenses. Expense reports are read only.',
      h_tabRecon: 'Record whether the real bank balance matches the ledger balance, and by how much it differs.',
      h_tabCalc: 'A scratch pad to try "how much comes in, goes out and is left" from fees, headcount and unit prices. The ledger does not change.',
      h_tabCats: 'The list of income/expense category names used by both the ledger and the plan.',
      h_more: 'Less frequently used features are collected here.',
      h_campBudget: 'Plans one camp’s expenses (planned / forecast / actual). Unlike the ledger "period plan", it is kept per camp.',
      h_money_read: '"View amounts" lets you see money information such as the ledger and budgets. People not on the roster cannot.',
      h_portalCard: 'Reads registrations from the WOLKO portal "Camp Manager". Editing here does not change the portal.',
      h_scMin: 'Only people fully paid and "confirmed" — the most conservative number.',
      h_scExp: 'Counts everyone who paid the deposit or more — the same rule as the homepage registration gauge.',
      h_scMax: 'Assumes everyone who applied, including pending, comes by the deadline — the largest number (waitlist excluded).',
      h_leftover: 'Expected income (camp fees from registrations) minus this camp’s planned expenses. Planned expenses come from the camp budget page.',
      h_private: 'Contact details and refund accounts are visible only to directors, camp finance and admins. Opening them is logged.',
      h_today: 'Gathers what I must do today, what is due soon and upcoming events and meetings in one place.',
      h_editHome: 'Drag widgets, resize them, or hide them with the eye icon. Applies to your screen only.',
      h_alerts: 'Shows my task deadlines, upcoming meetings/events and team notices. Dismiss a checked one with ✕.',
      h_myAlerts: 'Automatically collects deadlines of tasks assigned to me and upcoming meetings/events. Completing a task removes it.',
      h_teamNotice: 'Notices posted by team members, sent to the whole team or to selected people.',
      h_pin: 'Pinned notices stay at the top of the list.',
      h_aiSummary: 'AI summarizes today’s work in a line or two. The list itself is exact (made by rules); AI only writes the sentence and only receives task titles and due dates.',
      h_weeklyMail: 'Every Tuesday morning you get this week’s tasks by email. You can turn it off here.',
      h_notifyDays: 'How many days before a deadline or event it appears in alerts. e.g. 3, 1 = 3 days and 1 day before.',
      h_expireDays: 'Old notices fold away from the list after this many days. They are not deleted.',
      h_status: 'The progress state of the task. Completing it removes it from my alerts.',
      h_ownerSuggest: 'A suggested owner for a task without one. Please confirm and assign.',
      h_decision: 'A decision made in a meeting. "Direction" is the general direction, "Final" is settled, "Changed" replaced an earlier decision.',
      h_restricted: '🔒 Contains money amounts. Shown only to people with amount access.',
      h_role: 'A role is a default bundle of permissions. In the table below you can fine-tune each person per item.',
      h_permTable: 'Choose "Hidden / View / Edit" per item. Cells that differ from the role default are marked. Only admins can change this.',
      h_tvKey: 'The key in the TV screen address. Anyone with the address can view the TV screen without logging in, so share with care.',
      h_trash: 'Deleted items are kept here for a while. Restore or delete them permanently.',
      h_campSpace: 'Shows tasks, events, meetings, decisions, files and budget linked to one camp on a single screen.',
      h_pageTasks: 'Manage camp preparation tasks and the schedule in one place. Tasks that list your email as owner show up in "What I do today" and in alerts.',
      h_pageMeetings: 'Keeps minutes and decisions. Decisions made in meetings appear as "current decisions" in camp spaces and on the home page.',
      h_pageFiles: 'Gathers camp files in one place. Uploads stack as new versions; files containing amounts are marked 🔒 and shown only to people with amount access.',
      h_pageBudget: 'Plans one camp’s expenses by category. The "forecast" total entered here feeds "planned expenses" and "left over" in the camp space.',
      h_pageCamps: 'Create camp types (e.g. Winter Camp) and events (e.g. 2027 Winter Camp), then enter each event’s space. Link a WOLKO portal camp to see registrations.',
      h_pageHome: 'See my tasks, deadlines, schedule and camp status at a glance. "Customize home" changes your own screen.',
      h_pageSearch: 'Find tasks, meetings, decisions and files at once. Areas you cannot view are left out.',
      h_pageSettings: 'Manage the roster, roles and permissions per area. Admins only.',
      h_pageTrash: 'Deleted items are kept here. Press "Restore" to put them back.',
      h_pageTv: 'Design the screen for the office TV and check its address (key).',
      h_pageFinance: 'Record real income and expenses of the camp account by period, then close periods to carry the remainder forward.',
      h_budgetCols: 'Planned = first amount, Expected = current expectation, Actual = what was really spent. "Forecast" is the actual for paid items, otherwise the larger of expected/planned and actual.',
      h_remaining: 'The total budget minus the forecast expenses.',
      h_sheets: 'Previews which cells would be written when mirroring portal tasks into the Google Sheet. This button writes nothing.',
      h_backup: 'Download all data as a file for safekeeping. You can also get one table as CSV.',
      h_glossary: 'Words whose translation/spelling is kept consistent in minutes and AI drafts. Words marked "keep" are never translated.',
      h_audit: 'A record of who changed what and when. Opening personal data is logged here too.',
      h_tvNotices: 'Short notices that scroll along the bottom of the TV screen.',
      h_template: 'A checklist of repeated preparation tasks. Applying it to a camp creates the tasks at once.',
      h_checklistDue: 'Due dates are calculated as days before/after a base date (e.g. camp start).',
      h_homeMobile: 'On phones, use the ▲▼ buttons to reorder instead of dragging.',
      h_layoutEdit: 'Move cards up or down or hide them to fit your screen. It does not affect anyone else.' }
  });

  CT.help = function (key) { return '<span class="qh" data-h="' + CT.esc(key) + '" tabindex="0" role="button" aria-label="' + CT.esc(CT.t('helpLabel')) + '">?</span>'; };

  function fill(root) {
    [].forEach.call((root || document).querySelectorAll('.qh[data-h]'), function (el) {
      if (el.textContent !== '?') el.textContent = '?';
      el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-label', CT.t('helpLabel'));
    });
  }
  var tip = null, owner = null;
  function show(el) {
    var key = el.getAttribute('data-h'), text = CT.t('h_' + key); if (!text || text === 'h_' + key) return;
    if (!tip) { tip = document.createElement('div'); tip.id = 'qhTip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
    tip.textContent = text; tip.style.display = 'block'; owner = el;
    var r = el.getBoundingClientRect(), w = Math.min(280, window.innerWidth - 24); tip.style.maxWidth = w + 'px';
    var th = tip.offsetHeight, tw = tip.offsetWidth, left = Math.max(12, Math.min(window.innerWidth - tw - 12, r.left + r.width / 2 - tw / 2));
    var top = r.bottom + 8; if (top + th > window.innerHeight - 8) top = Math.max(8, r.top - th - 8);
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  function hide() { if (tip) tip.style.display = 'none'; owner = null; }
  var qh = function (e) { return e.target && e.target.closest ? e.target.closest('.qh[data-h]') : null; };
  document.addEventListener('mouseover', function (e) { var el = qh(e); if (el) show(el); });
  document.addEventListener('mouseout', function (e) { if (qh(e)) hide(); });
  document.addEventListener('focusin', function (e) { var el = qh(e); if (el) show(el); });
  document.addEventListener('focusout', function (e) { if (qh(e)) hide(); });
  document.addEventListener('click', function (e) { var el = qh(e); if (el) { e.preventDefault(); e.stopPropagation(); if (owner === el && tip && tip.style.display === 'block' && el._tapped) { hide(); el._tapped = false; } else { show(el); el._tapped = true; } } else hide(); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  window.addEventListener('scroll', hide, true);

  var apply = CT.applyI18n; CT.applyI18n = function (root) { apply.call(CT, root); fill(root); };
  document.addEventListener('ct-lang', function () { fill(); if (owner) show(owner); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { fill(); }); else fill();
  CT.fillHelp = fill;
})();
