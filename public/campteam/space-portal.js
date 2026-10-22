// 캠프별 공간: 월코 포털 "캠프 관리자" 신청 현황 연동 (읽기 전용).
// 서버가 포털 신청 데이터를 읽어 요약해 주면(/api/campteam/camp-portal) 인원·금액 시나리오·할인·캠퍼 명단·스태프 지원 현황을 보여 준다.
// 연락처·환불 계좌 같은 개인정보는 서버가 권한 있는 사람(디렉터·캠프 재정·관리자)에게만 내려 준다.
(function () {
  CT.addDict({
    ko: { ptTitle: '신청 현황 · 참가자 · 예산', ptFrom: '월코 포털 「캠프 관리자」에서 읽어 온 정보예요. 여기서 고쳐도 포털은 바뀌지 않아요 (수정은 캠프 관리자에서).', ptLinkTitle: '포털 캠프 연결', ptLinkBtn: '연결 변경', ptLinkSet: '포털 캠프와 연결하기', ptNotLinked: '아직 월코 포털 캠프와 연결되지 않았어요. 포털 「캠프 관리자」에 아직 올라오지 않은 앞으로의 캠프는 연결 없이 두면 돼요 — 모집이 시작되면 그때 연결하세요.', ptNotLinkedView: '연결 설정은 디렉터·캠프 재정 담당·관리자가 할 수 있어요.', ptPick: '포털 캠프 고르기', ptPickNone: '(연결 안 함)', ptCustom: '목록에 없으면 직접 입력 (포털 캠프 ID)', ptLinkSaved: '연결을 저장했어요.', ptUnavailable: '포털 신청 정보를 읽지 못했어요. 잠시 뒤 다시 시도해 주세요.', ptLoading: '불러오는 중…',
      ptConnected: '연결된 포털 캠프', ptOpenAdmin: '캠프 관리자 열기', ptOpenRefund: '환불 규정 보기',
      ptScMin: '확정만', ptScMinSub: '잔금까지 확인된 사람', ptScExp: '예약금 수납 이상', ptScExpSub: '홈페이지 신청 게이지와 같은 기준', ptScMax: '신청한 사람 전부', ptScMaxSub: '마감까지 모두 온다면 (접수 대기 포함)', ptHeads: '명', ptIncome: '예상 캠프비 수입', ptPaidFull: '완납', ptDepOnly: '예약금만', ptBalDue: '남은 잔금', ptPendingN: '접수 대기', ptReceived: '지금까지 받은 돈 (예상)', ptReceivedHint: '예약금 수납자는 예약금만, 확정자는 전액으로 계산한 값이에요 (현금 확인은 월코 재정 담당 장부 기준).', ptWait: '예비 명단', ptWaitNote: '(위 숫자에 포함 안 됨)', ptUnknownFee: '금액 정보가 없는 신청', ptCap: '정원', ptCapOf: '명 중 ', ptStatus: '신청 상태', ptStPending: '접수 대기', ptStDeposit: '예약금 수납', ptStConfirmed: '최종 확정', ptStWait: '예비',
      ptMix: '구성', ptMale: '남', ptFemale: '여', ptUnknownG: '미입력', ptGrades: '학년', ptDiscounts: '장학 · 할인 사용', ptPayOnSite: '현장 결제 희망', ptFees: '캠프비 · 장학 제도', ptFee: '캠프비', ptDeposit: '예약금', ptEarly: 'Early Bird 기한', ptBalanceDue: '얼리버드 잔금 기한', ptRounds: '신청 일정', ptRound: '차', ptCapGender: '성별 정원', ptCapMale: '남', ptCapFemale: '여', ptCapWait: '예비', ptOff: '원 할인', ptReward: '원 환급·선물', ptSchedInfo: '포털 일정 정보', ptPrice: '안내 캠프비', ptDeadline: '신청 일정', ptTarget: '대상', ptOpenCalc: '이 인원으로 예산 계산하기', ptCalcHint: '계산기에서 이 캠프의 신청 인원·캠프비를 불러와 지출과 함께 남는 금액을 볼 수 있어요.',
      ptCampers: '캠퍼 명단', ptStaff: '스태프 지원 현황', ptSearch: '이름·교회로 찾기', ptAll: '전체', ptNone: '표시할 사람이 없어요.', ptName: '이름', ptGender: '성별', ptGrade: '학년', ptChurch: '교회 · 학교', ptNotes: '특이사항', ptGroup: '단체', ptUnnamed: '(이름 미입력)', ptRefundYes: '환불 계좌 등록', ptRefundNo: '환불 계좌 없음', ptPriv: '개인정보 (디렉터·캠프 재정·관리자만)', ptPhone: '연락처', ptEmail: '이메일', ptEmergency: '비상연락처', ptBirth: '생년월일', ptParent: '보호자 정보', ptBank: '환불 은행', ptAcct: '환불 계좌', ptHolder: '예금주', ptCounsel: '상담 메모', ptSaved: '구원', ptDedicated: '헌신', ptPastor: '담임목사', ptPastorTel: '목사 연락처', ptPrivNote: '개인정보를 열면 조회 기록이 남아요.', ptTeams: '지원 팀', ptEnglish: '영어', ptPrevCamp: '이전 캠프', ptConfirmed: '확정', ptTeamCount: '팀별 지원', ptNoStaff: '아직 스태프 지원서가 없어요.', ptGroupOf: '단체', ptRegAt: '신청일', ptOnSite: '현장결제' },
    en: { ptTitle: 'Registrations · Participants · Budget', ptFrom: 'Read from the WOLKO portal "Camp Manager". Editing here does not change the portal (edit in Camp Manager).', ptLinkTitle: 'Link portal camp', ptLinkBtn: 'Change link', ptLinkSet: 'Link to a portal camp', ptNotLinked: 'Not linked to a WOLKO portal camp yet. Future camps that are not in the portal "Camp Manager" can stay unlinked — link it when registration opens.', ptNotLinkedView: 'Directors, camp finance and admins can set the link.', ptPick: 'Choose portal camp', ptPickNone: '(no link)', ptCustom: 'Not in the list? Type the portal camp ID', ptLinkSaved: 'Link saved.', ptUnavailable: 'Could not read portal registrations. Please try again shortly.', ptLoading: 'Loading…',
      ptConnected: 'Linked portal camp', ptOpenAdmin: 'Open Camp Manager', ptOpenRefund: 'Refund policy',
      ptScMin: 'Confirmed only', ptScMinSub: 'Fully paid & confirmed', ptScExp: 'Deposit paid or more', ptScExpSub: 'Same rule as the homepage gauge', ptScMax: 'Everyone who applied', ptScMaxSub: 'If all come (incl. pending)', ptHeads: ' people', ptIncome: 'Expected camp-fee income', ptPaidFull: 'Paid in full', ptDepOnly: 'Deposit only', ptBalDue: 'Balance due', ptPendingN: 'Pending', ptReceived: 'Received so far (estimate)', ptReceivedHint: 'Deposit holders count only the deposit, confirmed count in full (cash check is by the finance ledger).', ptWait: 'Waitlist', ptWaitNote: '(not included above)', ptUnknownFee: 'Registrations without fee info', ptCap: 'Capacity', ptCapOf: ' of ', ptStatus: 'Status', ptStPending: 'Pending', ptStDeposit: 'Deposit paid', ptStConfirmed: 'Confirmed', ptStWait: 'Waitlist',
      ptMix: 'Makeup', ptMale: 'M', ptFemale: 'F', ptUnknownG: 'Unknown', ptGrades: 'Grades', ptDiscounts: 'Scholarships · discounts used', ptPayOnSite: 'Pay on site', ptFees: 'Fees · scholarships', ptFee: 'Camp fee', ptDeposit: 'Deposit', ptEarly: 'Early Bird until', ptBalanceDue: 'Early-bird balance due', ptRounds: 'Registration rounds', ptRound: 'Round ', ptCapGender: 'Capacity by gender', ptCapMale: 'M', ptCapFemale: 'F', ptCapWait: 'Waitlist', ptOff: ' won off', ptReward: ' won back/gift', ptSchedInfo: 'Portal schedule info', ptPrice: 'Listed fee', ptDeadline: 'Registration', ptTarget: 'Target', ptOpenCalc: 'Budget with these numbers', ptCalcHint: 'The calculator can pull this camp’s headcount and fees and show what is left after expenses.',
      ptCampers: 'Campers', ptStaff: 'Staff applications', ptSearch: 'Search name or church', ptAll: 'All', ptNone: 'Nobody to show.', ptName: 'Name', ptGender: 'Gender', ptGrade: 'Grade', ptChurch: 'Church · school', ptNotes: 'Notes', ptGroup: 'Group', ptUnnamed: '(name not entered)', ptRefundYes: 'Refund account on file', ptRefundNo: 'No refund account', ptPriv: 'Personal details (directors, camp finance, admins only)', ptPhone: 'Phone', ptEmail: 'Email', ptEmergency: 'Emergency contact', ptBirth: 'Birth date', ptParent: 'Parent info', ptBank: 'Refund bank', ptAcct: 'Refund account', ptHolder: 'Account holder', ptCounsel: 'Counseling note', ptSaved: 'Saved', ptDedicated: 'Dedicated', ptPastor: 'Pastor', ptPastorTel: 'Pastor contact', ptPrivNote: 'Opening personal details is logged.', ptTeams: 'Teams', ptEnglish: 'English', ptPrevCamp: 'Past camp', ptConfirmed: 'Confirmed', ptTeamCount: 'By team', ptNoStaff: 'No staff applications yet.', ptGroupOf: 'Group', ptRegAt: 'Applied', ptOnSite: 'On-site pay' }
  });
  var esc = CT.esc, KRW = function (n) { return CT.money(n, 'KRW'); }, st = { camp: null, data: null, list: null, filter: { q: '', status: '' }, busy: false };
  var $ = function (id) { return document.getElementById(id); };
  var DISC = { early_bird: 'Early Bird', sibling: '함께 참여 (친구·지인·가족)', excellent_camper: '베스트 캠퍼', james_memory: '야고보서 암송 (환급)', wolbi_syme: '월비·SYME 관련' };
  var STL = { pending: 'ptStPending', deposit: 'ptStDeposit', confirmed: 'ptStConfirmed' };
  var G = function (g) { return g === 'male' ? CT.t('ptMale') : g === 'female' ? CT.t('ptFemale') : ''; };
  var kv = function (k, v) { return v ? '<div><small>' + esc(CT.t(k)) + '</small><b>' + esc(v) + '</b></div>' : ''; };

  function tile(cls, title, sub, heads, income, extra) {
    return '<div class="ptsc ' + cls + '"><label>' + esc(CT.t(title)) + '</label><small>' + esc(CT.t(sub)) + '</small><strong>' + heads + esc(CT.t('ptHeads')) + '</strong><div class="ptinc">' + esc(CT.t('ptIncome')) + ' <b>' + esc(KRW(income)) + '</b></div>' + (extra || '') + '</div>';
  }
  function scenariosHtml(d) {
    var S = d.scenarios; if (!S) return '';
    var e = S.expected, expExtra = '<div class="ptsub">' + esc(CT.t('ptPaidFull')) + ' ' + e.paidInFull.heads + esc(CT.t('ptHeads')) + ' · ' + esc(CT.t('ptDepOnly')) + ' ' + e.depositOnly.heads + esc(CT.t('ptHeads')) + (e.depositOnly.heads ? '<br>' + esc(CT.t('ptBalDue')) + ' ' + esc(KRW(e.depositOnly.balanceDue)) : '') + '</div>';
    var maxExtra = '<div class="ptsub">' + esc(CT.t('ptPendingN')) + ' +' + S.max.pending.heads + esc(CT.t('ptHeads')) + ' (' + esc(KRW(S.max.pending.income)) + ')</div>';
    var h = '<div class="ptscs">' + tile('pt-min', 'ptScMin', 'ptScMinSub', S.min.heads, S.min.income) + tile('pt-exp', 'ptScExp', 'ptScExpSub', e.heads, e.income, expExtra) + tile('pt-max', 'ptScMax', 'ptScMaxSub', S.max.heads, S.max.income, maxExtra) + '</div>';
    h += '<div class="ptnotes"><span>' + esc(CT.t('ptReceived')) + ': <b>' + esc(KRW(e.received)) + '</b></span>' + (d.byStatus.waitlist.heads ? '<span>' + esc(CT.t('ptWait')) + ': <b>' + d.byStatus.waitlist.heads + esc(CT.t('ptHeads')) + '</b> ' + esc(CT.t('ptWaitNote')) + '</span>' : '') + (S.max.unknownFee ? '<span class="warn">' + esc(CT.t('ptUnknownFee')) + ': ' + S.max.unknownFee + esc(CT.t('ptHeads')) + '</span>' : '') + '</div><div class="hint" style="margin-top:4px">' + esc(CT.t('ptReceivedHint')) + '</div>';
    var cap = d.camp.capacity || (d.policy && d.policy.capacity ? (d.policy.capacity.male || 0) + (d.policy.capacity.female || 0) : 0);
    if (cap) { var pct = Math.min(100, Math.round(e.heads / cap * 100)); h += '<div class="ptcap"><span>' + esc(CT.t('ptCap')) + ' ' + e.heads + esc(CT.t('ptCapOf')) + cap + esc(CT.t('ptHeads')) + ' (' + pct + '%)</span><div class="bar"><i style="width:' + pct + '%"></i></div></div>'; }
    return h;
  }
  function mixHtml(d) {
    var bs = d.byStatus, chips = function (label, v) { return '<span class="chip">' + esc(label) + ' <b>' + v + '</b></span>'; };
    var h = '<div class="ptmix"><div><h4>' + esc(CT.t('ptStatus')) + '</h4>' + chips(CT.t('ptStPending'), bs.pending.heads) + chips(CT.t('ptStDeposit'), bs.deposit.heads) + chips(CT.t('ptStConfirmed'), bs.confirmed.heads) + chips(CT.t('ptStWait'), bs.waitlist.heads) + '</div>' +
      '<div><h4>' + esc(CT.t('ptMix')) + '</h4>' + chips(CT.t('ptMale'), d.gender.male) + chips(CT.t('ptFemale'), d.gender.female) + (d.gender.unknown ? chips(CT.t('ptUnknownG'), d.gender.unknown) : '') + '</div>' +
      '<div><h4>' + esc(CT.t('ptGrades')) + '</h4>' + Object.keys(d.grades).sort().map(function (k) { return chips(k, d.grades[k]); }).join('') + '</div>';
    var names = {}; if (d.policy) d.policy.discounts.forEach(function (x) { names[x.key] = x.ko; });
    var dk = d.discounts ? Object.keys(d.discounts) : [];
    if (dk.length) h += '<div><h4>' + esc(CT.t('ptDiscounts')) + '</h4>' + dk.map(function (k) { return chips(names[k] || DISC[k] || k, d.discounts[k]); }).join('') + '</div>';
    if (d.payOnSite) h += '<div><h4>' + esc(CT.t('ptPayOnSite')) + '</h4>' + chips(CT.t('ptOnSite'), d.payOnSite) + '</div>';
    return h + '</div>';
  }
  function feesHtml(d) {
    var P = d.policy, info = st.list && st.list.filter(function (x) { return x.id === d.portalCampId; })[0], h = '';
    if (P) {
      h += '<div class="ptfee">' + kv('ptFee', KRW(P.fee)) + kv('ptDeposit', KRW(P.deposit)) + kv('ptEarly', P.earlyBirdUntil ? P.earlyBirdUntil.slice(0, 10) : '') + kv('ptBalanceDue', P.balanceDue) + '</div>';
      h += '<table><tbody>' + P.discounts.map(function (x) { return '<tr><td>' + esc(CT.lang() === 'en' && x.en ? x.en : x.ko) + (x.note ? '<br><small class="hint">' + esc(x.note) + '</small>' : '') + '</td><td style="text-align:right;white-space:nowrap">' + (x.reward ? '+' + esc(KRW(x.reward)) + esc(CT.t('ptReward')) : '− ' + esc(KRW(x.amount))) + '</td></tr>'; }).join('') + '</tbody></table>';
      if (P.windows.length) h += '<div class="hint" style="margin-top:6px">' + esc(CT.t('ptRounds')) + ': ' + P.windows.map(function (w) { return esc(CT.lang() === 'en' ? CT.t('ptRound') + w.round : w.round + CT.t('ptRound')) + ' ' + esc((w.from || '').slice(5, 10)) + ' ~ ' + esc(w.to ? w.to.slice(5, 10) : '…'); }).join(' · ') + '</div>';
      if (P.capacity) h += '<div class="hint">' + esc(CT.t('ptCapGender')) + ': ' + esc(CT.t('ptCapMale')) + ' ' + P.capacity.male + ' · ' + esc(CT.t('ptCapFemale')) + ' ' + P.capacity.female + ' · ' + esc(CT.t('ptCapWait')) + ' ' + P.capacity.waitlist + '</div>';
    } else if (info) {
      h += '<div class="ptfee">' + kv('ptPrice', info.priceKo) + kv('ptDeposit', info.deposit ? KRW(info.deposit) : '') + kv('ptTarget', info.targetKo) + kv('ptDeadline', (info.deadlineKo || '').replace(/\n/g, ' / ')) + '</div>';
    }
    return h ? '<details class="ptdet" open><summary>' + esc(CT.t('ptFees')) + '</summary>' + h + '</details>' : '';
  }
  function privHtml(p, extra) {
    if (!p) return '';
    var rows = kv('ptPhone', p.phone) + kv('ptEmail', p.email) + kv('ptEmergency', p.emergency) + kv('ptBirth', p.birthDate) + kv('ptParent', p.parentInfo) + kv('ptBank', p.refundBank) + kv('ptAcct', p.refundAccount) + kv('ptHolder', p.refundHolder) + kv('ptPastor', p.pastorName) + kv('ptPastorTel', p.pastorContact) + kv('ptCounsel', p.counselorMemo) + (p.saved ? kv('ptSaved', '✓') : '') + (p.dedicated ? kv('ptDedicated', '✓') : '') + (extra || '');
    return rows ? '<div class="ptpriv"><b>' + esc(CT.t('ptPriv')) + '</b><div class="ptkv">' + rows + '</div></div>' : '';
  }
  function camperRows() {
    var f = st.filter, q = f.q.trim().toLowerCase(), d = st.data;
    return d.campers.filter(function (c) {
      if (f.status === 'waitlist' ? !c.waitlist : (f.status && (c.waitlist || c.status !== f.status))) return false;
      return !q || (c.name + ' ' + c.groupName + ' ' + c.church + ' ' + c.school).toLowerCase().indexOf(q) >= 0;
    }).map(function (c) {
      var nm = c.name ? esc(c.name) : '<i>' + esc(CT.t('ptUnnamed')) + (c.unnamed > 1 ? ' ×' + c.unnamed : '') + '</i>', chip = c.waitlist ? '<span class="chip warn">' + esc(CT.t('ptStWait')) + '</span>' : '<span class="chip pts-' + esc(c.status) + '">' + esc(CT.t(STL[c.status])) + '</span>';
      var line = '<div class="ptc1"><b>' + nm + '</b>' + (c.groupName ? '<small>' + esc(CT.t('ptGroup')) + ': ' + esc(c.groupName) + '</small>' : '') + '</div><div>' + esc(G(c.gender)) + (c.grade ? ' · ' + esc(c.grade) : '') + '</div><div>' + esc([c.church, c.school].filter(Boolean).join(' · ')) + '</div><div>' + chip + '</div><div class="ptc5">' + esc(c.scholarship || '') + (c.notes ? '<br><b>' + esc(c.notes) + '</b>' : '') + '<small>' + (c.refundRegistered ? '💳 ' + esc(CT.t('ptRefundYes')) : esc(CT.t('ptRefundNo'))) + (c.payOnSite ? ' · ' + esc(CT.t('ptOnSite')) : '') + '</small></div>';
      var body = privHtml(c.private);
      return body ? '<details class="ptc"><summary class="ptcrow">' + line + '</summary>' + body + '<div class="hint">' + esc(CT.t('ptPrivNote')) + '</div></details>' : '<div class="ptc"><div class="ptcrow">' + line + '</div></div>';
    }).join('') || '<div class="empty">' + esc(CT.t('ptNone')) + '</div>';
  }
  function campersHtml(d) {
    var opts = [['', 'ptAll'], ['pending', 'ptStPending'], ['deposit', 'ptStDeposit'], ['confirmed', 'ptStConfirmed'], ['waitlist', 'ptStWait']];
    return '<details class="ptdet" id="ptCampers"' + (st.open === 'campers' ? ' open' : '') + '><summary>' + esc(CT.t('ptCampers')) + ' (' + d.campers.filter(function (c) { return !c.waitlist; }).reduce(function (n, c) { return n + (c.unnamed || 1); }, 0) + ')</summary><div class="ptbar"><input id="ptQ" type="search" placeholder="' + esc(CT.t('ptSearch')) + '" value="' + esc(st.filter.q) + '"><select id="ptStat">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (st.filter.status === o[0] ? ' selected' : '') + '>' + esc(CT.t(o[1])) + '</option>'; }).join('') + '</select></div><div id="ptCList" class="ptlist">' + camperRows() + '</div></details>';
  }
  function staffHtml(d) {
    var S = d.staff; if (!S) return '';
    var head = '<summary>' + esc(CT.t('ptStaff')) + ' (' + S.total + ')</summary>';
    if (!S.total) return '<details class="ptdet"' + (st.open === 'staff' ? ' open' : '') + '>' + head + '<div class="empty">' + esc(CT.t('ptNoStaff')) + '</div></details>';
    var teams = Object.keys(S.byTeam).sort().map(function (k) { return '<span class="chip">' + esc(k) + ' <b>' + S.byTeam[k] + '</b></span>'; }).join('');
    var rows = S.items.map(function (r) {
      var line = '<div class="ptc1"><b>' + esc(r.name) + '</b></div><div>' + esc(G(r.gender)) + '</div><div>' + esc(r.teams.join(', ')) + '</div><div>' + esc(r.church) + '</div><div class="ptc5">' + esc([r.englishAbility ? CT.t('ptEnglish') + ' ' + r.englishAbility : '', r.previousCamp ? CT.t('ptPrevCamp') + ': ' + r.previousCamp : '', r.mediaTech, r.instruments].filter(Boolean).join(' · ')) + (r.confirmed ? ' <span class="chip pts-confirmed">' + esc(CT.t('ptConfirmed')) + '</span>' : '') + '</div>';
      var body = privHtml(r.private);
      return body ? '<details class="ptc"><summary class="ptcrow ptcs">' + line + '</summary>' + body + '<div class="hint">' + esc(CT.t('ptPrivNote')) + '</div></details>' : '<div class="ptc"><div class="ptcrow ptcs">' + line + '</div></div>';
    }).join('');
    return '<details class="ptdet"' + (st.open === 'staff' ? ' open' : '') + '>' + head + '<div class="ptmix"><div><h4>' + esc(CT.t('ptTeamCount')) + '</h4>' + teams + '</div></div><div class="ptlist">' + rows + '</div></details>';
  }
  function headHtml(d) {
    var info = st.list && st.list.filter(function (x) { return x.id === d.portalCampId; })[0], title = info ? (CT.lang() === 'en' && info.titleEn ? info.titleEn : info.titleKo) : d.portalCampId;
    return '<div class="ptconn"><div>' + esc(CT.t('ptConnected')) + ': <b>' + esc(title) + '</b>' + (info && info.dateKo ? ' <small class="hint">' + esc(info.dateKo) + '</small>' : '') + '</div><div class="ptbtns"><a class="btn sm" href="/wolkoadmin/" target="_blank" rel="noopener">' + esc(CT.t('ptOpenAdmin')) + '</a> <a class="btn sm" href="/camp-register/" target="_blank" rel="noopener">' + esc(CT.t('ptOpenRefund')) + '</a>' + (d.perms.canLink ? ' <button class="btn sm" id="ptLink">' + esc(CT.t('ptLinkBtn')) + '</button>' : '') + '</div></div>';
  }
  function render() {
    var host = $('spPortal'); if (!host) return; var d = st.data, h = '<section class="card full"><h2><span>' + esc(CT.t('ptTitle')) + '</span></h2>';
    if (!d) { host.innerHTML = h + '<div class="hint">' + esc(CT.t('ptLoading')) + '</div></section>'; return; }
    if (!d.linked) {
      h += '<div class="hintbox">' + esc(CT.t('ptNotLinked')) + '</div><div style="margin-top:10px">' + (d.perms.canLink ? '<button class="btn pri" id="ptLink">' + esc(CT.t('ptLinkSet')) + '</button>' : '<span class="hint">' + esc(CT.t('ptNotLinkedView')) + '</span>') + '</div>';
    } else if (d.unavailable) {
      h += headHtml(d) + '<div class="err" style="margin-top:8px">' + esc(CT.t('ptUnavailable')) + '</div>';
    } else {
      h += headHtml(d) + scenariosHtml(d) + mixHtml(d) + feesHtml(d) + (d.perms.moneyRead ? '<div class="ptcalc"><a class="btn pri" href="/campteam/finance/?tab=calc&camp=' + encodeURIComponent(st.camp.id) + '">' + esc(CT.t('ptOpenCalc')) + '</a><span class="hint">' + esc(CT.t('ptCalcHint')) + '</span></div>' : '') + campersHtml(d) + staffHtml(d) + '<div class="hint" style="margin-top:10px">' + esc(CT.t('ptFrom')) + '</div>';
    }
    host.innerHTML = h + '</section>';
  }

  async function ensureList() { if (st.list) return; try { var r = await fetch('/campteam/portal-camps.json', { cache: 'no-cache' }); st.list = r.ok ? (await r.json()).items : []; } catch (e) { st.list = []; } }
  async function load() {
    try { await ensureList(); st.data = await CT.api('/api/campteam/camp-portal?campId=' + encodeURIComponent(st.camp.id)); }
    catch (e) { var host = $('spPortal'); if (host) host.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; return; }
    render();
  }
  function linkDialog() {
    var cur = st.data && st.data.portalCampId || '', inList = (st.list || []).some(function (x) { return x.id === cur; });
    var opts = '<option value="">' + esc(CT.t('ptPickNone')) + '</option>' + (st.list || []).map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === cur ? ' selected' : '') + '>' + esc((CT.lang() === 'en' && x.titleEn ? x.titleEn : x.titleKo) + (x.dateKo ? ' — ' + x.dateKo : '')) + '</option>'; }).join('');
    var body = '<div class="hintbox">' + esc(CT.t('ptNotLinked')) + '</div><label>' + esc(CT.t('ptPick')) + '<select name="pid">' + opts + '</select></label><label>' + esc(CT.t('ptCustom')) + '<input name="custom" maxlength="60" value="' + esc(cur && !inList ? cur : '') + '" placeholder="2027-wolko-winter"></label>';
    CT.ask(CT.t('ptLinkTitle'), body, async function (fd) {
      var id = String(fd.custom || '').trim() || fd.pid || '';
      await CT.api('/api/campteam/camp-portal?campId=' + encodeURIComponent(st.camp.id), { method: 'POST', body: { portalCampId: id } });
      await load();
    });
  }
  document.addEventListener('click', function (e) { var b = e.target.closest && e.target.closest('#ptLink'); if (b) linkDialog(); });
  document.addEventListener('input', function (e) { if (e.target && e.target.id === 'ptQ') { st.filter.q = e.target.value; var l = $('ptCList'); if (l) l.innerHTML = camperRows(); } });
  document.addEventListener('change', function (e) { if (e.target && e.target.id === 'ptStat') { st.filter.status = e.target.value; var l = $('ptCList'); if (l) l.innerHTML = camperRows(); } });
  document.addEventListener('toggle', function (e) { var d = e.target; if (d && d.id === 'ptCampers') st.open = d.open ? 'campers' : (st.open === 'campers' ? '' : st.open); }, true);

  window.SpacePortal = { mount: function (camp) { var first = !st.camp || st.camp.id !== camp.id; st.camp = camp; if (first) { st.data = null; render(); load(); } else render(); } };
})();
