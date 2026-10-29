/* 복음 통계 — 월간 복음 전도 보고. 화면 틀은 /portal/gospel-stats/, 데이터는 /api/portal/gospel-stats (항목 정의도 API 가 내려준다). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TOKEN_KEY = 'wolko-hub-token';
  var API = '/api/portal/gospel-stats';

  var I18N = {
    ko: {
      pageTitle: '복음 통계', docTitle: '복음 통계 — WOLKO',
      intro: '매달 복음을 전한 기록을 보고하고, 평택과 제주의 통계를 함께 확인합니다.',
      loading: '불러오는 중…', loginTitle: '포탈 로그인', loginHelp: 'WOLKO 포탈 계정으로 로그인해 주세요.', email: '이메일', password: '비밀번호', loginBtn: '로그인하고 계속하기', loginFail: '로그인하지 못했습니다.',
      subTitle: '제출 현황', subReported: '보고한 사람', subReportedHelp: '이름을 누르면 그 사람이 보고한 항목과 숫자를 볼 수 있어요. 마스터와 일부 관리자에게만 보여요.', subNoName: '계정을 찾을 수 없음', subNoValues: '숫자가 있는 항목이 없어요.', subDone: function (a, b) { return b + '명 중 ' + a + '명이 보고했어요'; }, subMissing: '아직 보고하지 않은 사람', subNone: '모두 보고했어요 🎉', subExempt: '보고 제외', subFixed: '항상 제외', subExemptOn: '제외 중', subRestore: '다시 넣기', subExemptList: '보고에서 제외한 계정', subSaved: '저장했어요.', subTip: '승인된 포탈 계정 중 이 달 보고(개인 또는 팀)를 낸 사람을 세어요. 보고할 일이 없는 계정은 "보고 제외"로 빼면 알림 메일과 이 목록에서 빠져요. 월말(매달 마지막 날 오전 9시 이후)에는 아직 보고하지 않은 사람에게 알림 메일이 가요.', campScopeMonth: '이 달', campScopeAll: '지난 캠프 포함 전체', caMonth: '달', caTotal: '합계', campAutoTitle: '캠프 자동 집계', campAutoEmpty: '이 달에는 자동으로 집계된 캠프가 없어요.', caCamp: '캠프', caCampers: '확정 캠퍼', caStaff: '스태프', caSalv: '구원', caDed: '헌신', caPending: function (d) { return '종료 후 집계 · ' + d; }, caPendingTip: '캠프가 완전히 끝난 다음 날부터 합계에 들어가요.', mdShort: function (iso) { var p = String(iso || '').split('-'); return Number(p[1]) + '월 ' + Number(p[2]) + '일'; }, caStaffSaved: '스태프 인원을 저장했어요.', caStaffSplit: function (a, b) { return '신청 ' + a + ' + 추가'+ (b ? ' ' + b : ''); }, campFormHint: '월코 캠프는 신청 기록에서 자동으로 집계돼요. 아래에는 그 외 캠프만 적어 주세요.', churchStatTitle: '교회별 행사', churchStatEmpty: '이 달에는 교회 행사 기록이 없어요.', cCol: '교회', cEvents: '행사', cStudents: '참석', cSalv: '구원', cDed: '헌신', cEventCount: function (k) { return k + '건'; }, churchTitle: '교회 행사 기록 (선택)', churchHint: 'CRS에 등록된 교회에서 열린 행사를 적으면, 교회별 통계로 모아 볼 수 있어요.', churchAdd: '교회 행사 추가', churchName: '교회 (CRS에서 고르거나 직접 입력)', churchEvent: '행사 이름 (예: 겨울 전도 집회)', churchDate: '날짜', churchNote: '메모 (선택, 보고자와 관리자만 봐요)', churchStudents: '참석 학생', churchSalv: '구원', churchDed: '헌신', churchDel: '이 행사 지우기', churchTotal: function (a, b, c) { return '합계 · 참석 ' + a + ' · 구원 ' + b + ' · 헌신 ' + c; }, churchApply: '월코 행사 칸에 합계 넣기', churchApplied: '월코 행사 참석·구원·헌신 칸에 합계를 넣었어요.', churchOnlyName: '교회 이름을 적어 주세요.', minus: '1 줄이기', plus: '1 늘리기', infoLabel: function (name) { return name + ' 설명 보기'; }, thisMonth: '이번 달', write: '내 보고 쓰기', dl: '내려받기', xlsx: '엑셀 보고서', csv: 'CSV (숫자만)',
      tabAll: '통합', tabMainland: '평택', tabJeju: '제주',
      viewYear: '연간', viewMonth: '월별', yearLabel: function (y) { return y + '년'; }, thisYear: '올해', trendTitleYear: '월별 추이', campScopeYear: '올해', ytdCaption: function (y, a, b) { return y + '년 누적 (' + a + '월~' + b + '월)'; }, ytdTip: '그 해 1월부터 지금까지(또는 그 달까지) 쌓인 숫자예요. 연간 보기에서는 그래프·표도 모두 이 기간 기준이에요.', kGospel: '복음을 들은 인원 (전체)', infoShort: '설명 보기', kGospelTip: '개인 전도로 복음을 들은 인원 + 캠프 참석 인원 + 월코 행사 참석 인원', kSalvTip: '개인 전도 + 캠프 + 월코 행사에서 예수님을 믿는다고 고백한 사람', kDedTip: '캠프와 월코 행사에서 삶을 예수님께 헌신한 사람', kReachTip: '월코 캠프의 캠퍼·스태프와 월코 행사에 참석한 인원', campAutoTip: '캠프가 완전히 끝난 다음 날부터 합계에 넣어요(시작 전·진행 중 캠프는 "종료 후 집계"로만 보여요). 잔금까지 마쳐 최종 확정된 캠퍼만 자동으로 세요. 구원은 "캠프 후 구원", 헌신은 "헌신" 체크 기준이에요. 스태프는 최종 확정된 스태프 신청을 자동으로 세고, 신청 시스템에 없는 도우미는 관리자가 "추가"로 더해요.', kSalv: '구원 고백 (전체)', kDed: '헌신 (전체)', kReach: '캠프·월코 행사 참석 인원',
      count: function (n, ind, team, all) { return n + '건 보고' + (all ? ' (개인 ' + ind + ' · 팀 ' + team + ')' : ''); }, countNone: '아직 이 달에 보고가 없어요.',
      tableTitle: '항목별 통계', trendTitle: '최근 6개월 추이', 
      rowsHelp: '마스터와 관리자에게만 보여요. 팀으로 낸 보고는 팀원이 따로 내지 않는 것을 전제로 합계에 그대로 더해요.',
      item: '항목', combined: '통합', month: '달', reports: '보고', tHeard: '들은 인원', tSalv: '구원', tDed: '헌신', monthShort: function (m) { return Number(m.split('-')[1]) + '월'; },
      rName: '보고자', rPlace: '위치', rType: '유형', rUpdated: '수정', individual: '개인', team: '팀', teamOf: function (n) { return '팀 · ' + n; },
      mineTitle: '내가 낸 보고', edit: '고치기', del: '지우기', delAsk: '이 보고를 지울까요?',
      formTitle: '월간 복음 전도 보고', formMonth: '보고하는 달', formWho: '개인 / 팀', formTeam: '팀 이름', formTeamPh: '예: 평택 캠프팀', formPlace: '위치 (평택 또는 제주)',
      placeMainland: '평택', placeJeju: '제주', save: '저장하기', saving: '저장 중…', cancel: '닫기',
      formLoaded: '이미 낸 보고를 불러왔어요. 고쳐서 저장하면 덮어써요.', saved: '저장했어요.', savedUpdated: '고쳐서 저장했어요.',
      needPlace: '위치(평택 또는 제주)를 선택해 주세요.', needTeam: '팀 이름을 입력해 주세요.',
      warnSalv: '구원 고백이 복음을 들은 인원보다 많아요. 맞는지 한 번 더 확인해 주세요.', warnCamp: '캠프의 구원·헌신이 캠프 참석자보다 많아요. 맞는지 확인해 주세요.', warnEvent: '행사의 구원·헌신이 행사 참석자보다 많아요. 맞는지 확인해 주세요.',
      denied: '불러오지 못했어요. 잠시 후 다시 시도해 주세요.', sessionEnd: '로그인이 필요해요.',
      lastMonth: '지난달', formDelete: '이 보고 지우기', formDelAsk: '이 보고를 지울까요?', formDeleted: '지웠어요.',
      mricBtn: 'MRIC 레이아웃', mricBlocked: '팝업이 막혀 있어요. 이 사이트의 팝업을 허용해 주세요.',
      scopeMinistry: '사역 현황 (제자훈련·지역교회)', formMinistryHint: '평택·제주 위치마다 한 건을 담당자들이 함께 고쳐요. 연결 교회 등급(A/B/C)과 리더십 훈련은 CRS 교회 기록에서 가져와요. 보고하는 달과 이번 달은 CRS를 바꾸면 통계에 바로 반영되고, 지난 달은 저장된 값을 그대로 써요.', crsReload: 'CRS에서 다시 불러오기', crsLoading: 'CRS에서 불러오는 중…', crsNone: 'CRS 연결이 설정되지 않아 숫자를 직접 입력해 주세요.', crsFail: 'CRS에서 불러오지 못했어요. 숫자를 직접 입력해 주세요.', crsLoaded: function (place, a, b, c, l) { return 'CRS 기준 · ' + place + ': A ' + a + ' · B ' + b + ' · C ' + c + ' · 리더십 훈련 ' + l + '명 — 채워 넣었어요. 고칠 수 있어요.'; }, crsBadge: 'CRS', crsHint: 'CRS 교회 기록에서 자동으로 채워져요 (고칠 수 있어요)', ministryLabel: '사역 현황', ministrySummary: function (d, c) { return '제자훈련 ' + d + ' · 연결 교회 ' + c; }, needDesignated: '팀 · 캠프 · 전도 행사 · 제자훈련 · 지역교회 보고는 지정된 보고 담당자만 쓸 수 있어요.',
      hqTitle: 'MRIC 레이아웃으로 보기', hqIntro: 'MRIC Statistics Report 입력 화면과 같은 순서·이름·설명이에요. 이 숫자를 보면서 MRIC에 입력하세요.', hqNeedMonth: '본부 보고는 한 달 단위예요. 월별 보기에서 달을 고르면 표가 나와요.', hqToMonth: '월별로 보기', hqExcluded: '본부 보고 제외 (내부 통계)', hqScopeNote: function (place, month) { return month + ' · ' + place; }, hqSnapshotNote: '※ 교회·클럽 수와 등록 학생 수는 그 달 말 기준으로 입력된 값이에요.', hqCrsNote: '※ 연결 교회 A/B/C와 리더십 훈련은 CRS 교회 기록에서 불러온 값이에요.', hqNoMinistry: '이 달 사역 현황(제자훈련·지역교회)은 아직 입력되지 않았어요.',
      hqLocation: 'Location', hqMonth: 'Month', hqYear: 'Year',
      repTitle: '보고 담당자', repHelp: '팀 · 캠프 · 전도 행사 · 제자훈련 · 지역교회 보고는 여기서 지정한 사람(과 마스터)만 쓸 수 있어요. 개인 전도 보고는 누구나 써요.', repAdd: '담당자 추가', repPick: '이름 또는 이메일로 고르기', repNone: '아직 지정한 담당자가 없어요.', repRemove: '빼기', repSaved: '담당자를 저장했어요.', repUnknown: '목록에 없는 계정이에요. 포탈 계정 이메일을 골라 주세요.',
      teamRepTitle: '팀 · 사역 현황 보고 내역', teamRepHelp: '팀과 사역 현황 보고는 누가 냈는지 기록돼요. 지정된 보고 담당자와 관리자만 볼 수 있어요.', teamRepEmpty: '이 달에는 팀 · 사역 현황 보고가 아직 없어요.', trKind: '구분', trWho: '보고자', trUnknown: '기록 없음 (이전 보고)', trUpdated: '수정', teamLabel: function (n) { return '팀 · ' + n; },
      monthLabel: function (m) { var p = m.split('-'); return p[0] + '년 ' + Number(p[1]) + '월'; },
    },
    en: {
      pageTitle: 'Gospel Stats', docTitle: 'Gospel Stats — WOLKO',
      intro: 'Report your monthly Gospel outreach and see Pyeongtaek and Jeju statistics together.',
      loading: 'Loading…', loginTitle: 'Portal login', loginHelp: 'Please sign in with your WOLKO portal account.', email: 'Email', password: 'Password', loginBtn: 'Sign in and continue', loginFail: 'Could not sign in.',
      subTitle: 'Submission status', subReported: 'Who reported', subReportedHelp: 'Tap a name to see the items and numbers that person reported. Only the master and some admins can see this.', subNoName: 'Account not found', subNoValues: 'No items with numbers.', subDone: function (a, b) { return a + ' of ' + b + ' have reported'; }, subMissing: 'Not reported yet', subNone: 'Everyone has reported 🎉', subExempt: 'Exempt', subFixed: 'Always exempt', subExemptOn: 'Exempt', subRestore: 'Add back', subExemptList: 'Accounts exempt from reporting', subSaved: 'Saved.', subTip: 'Counts approved portal accounts that submitted this month\'s report (individual or team). Accounts with nothing to report can be marked exempt — they are left out of the reminder mail and this list. On the last day of each month (after 9 AM) people who have not reported get a reminder email.', campScopeMonth: 'This month', campScopeAll: 'All camps incl. past', caMonth: 'Month', caTotal: 'Total', campAutoTitle: 'Camps (auto count)', campAutoEmpty: 'No camps counted automatically this month.', caCamp: 'Camp', caCampers: 'Confirmed campers', caStaff: 'Staff', caSalv: 'Salvations', caDed: 'Dedications', caPending: function (d) { return 'Counted after it ends · ' + d; }, caPendingTip: 'Camps are added to the totals the day after they have fully ended.', mdShort: function (iso) { var p = String(iso || '').split('-'); return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(p[1]) - 1] + ' ' + Number(p[2]); }, caStaffSaved: 'Staff number saved.', caStaffSplit: function (a, b) { return 'registered ' + a + ' + extra' + (b ? ' ' + b : ''); }, campFormHint: 'WOLKO camps are counted automatically from registrations. Please only add other camps below.', churchStatTitle: 'Events by church', churchStatEmpty: 'No church events recorded this month.', cCol: 'Church', cEvents: 'Events', cStudents: 'Attended', cSalv: 'Salvations', cDed: 'Dedications', cEventCount: function (k) { return k + (k === 1 ? ' event' : ' events'); }, churchTitle: 'Church events (optional)', churchHint: 'Record events held at churches from the CRS to see statistics by church.', churchAdd: 'Add a church event', churchName: 'Church (pick from the CRS or type)', churchEvent: 'Event name (e.g. Winter outreach)', churchDate: 'Date', churchNote: 'Note (optional, visible to you and admins only)', churchStudents: 'Attended', churchSalv: 'Salvations', churchDed: 'Dedications', churchDel: 'Remove this event', churchTotal: function (a, b, c) { return 'Total · attended ' + a + ' · salvations ' + b + ' · dedications ' + c; }, churchApply: 'Put the totals into WOLKO events', churchApplied: 'Totals were put into the WOLKO event fields.', churchOnlyName: 'Please enter the church name.', minus: 'Decrease by 1', plus: 'Increase by 1', infoLabel: function (name) { return 'What is “' + name + '”?'; }, thisMonth: 'This month', write: 'Write my report', dl: 'Download', xlsx: 'Excel report', csv: 'CSV (numbers only)',
      tabAll: 'Combined', tabMainland: 'Pyeongtaek', tabJeju: 'Jeju',
      viewYear: 'Yearly', viewMonth: 'Monthly', yearLabel: function (y) { return String(y); }, thisYear: 'This year', trendTitleYear: 'Month by month', campScopeYear: 'This year', ytdCaption: function (y, a, b) { return y + ' year to date (' + a + '–' + b + ')'; }, ytdTip: 'Totals from January of that year until now. In the yearly view the charts and tables use the same period.', kGospel: 'People who heard the Gospel (total)', infoShort: 'More info', kGospelTip: 'Heard through personal evangelism + camp attendance + WOLKO event attendance', kSalvTip: 'People who indicated they believed in Jesus through personal evangelism, camps and WOLKO events', kDedTip: 'People who dedicated their life to Jesus at camps and WOLKO events', kReachTip: 'Campers and staff at WOLKO camps plus attendees of WOLKO events', campAutoTip: 'Camps are added to the totals the day after they have fully ended (upcoming or running camps only show as "counted after it ends"). Only campers whose registration is fully paid and confirmed are counted. Salvations use "saved at camp", dedications use the "dedicated" check. Staff are counted from confirmed staff applications, and admins can add extra people who are not in the system.', kSalv: 'Salvations (total)', kDed: 'Dedications (total)', kReach: 'Camp & WOLKO event attendance',
      count: function (n, ind, team, all) { return n + ' report' + (n === 1 ? '' : 's') + (all ? ' (' + ind + ' individual · ' + team + ' team)' : ''); }, countNone: 'No reports for this month yet.',
      tableTitle: 'Statistics by item', trendTitle: 'Last 6 months', 
      rowsHelp: 'Visible to the master and admins only. Team reports are added to the totals as they are, assuming team members do not report separately.',
      item: 'Item', combined: 'Combined', month: 'Month', reports: 'Reports', tHeard: 'Heard', tSalv: 'Saved', tDed: 'Dedicated', monthShort: function (m) { return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][Number(m.split('-')[1]) - 1]; },
      rName: 'Reporter', rPlace: 'Location', rType: 'Type', rUpdated: 'Updated', individual: 'Individual', team: 'Team', teamOf: function (n) { return 'Team · ' + n; },
      mineTitle: 'My reports', edit: 'Edit', del: 'Delete', delAsk: 'Delete this report?',
      formTitle: 'Monthly Gospel Outreach Report', formMonth: 'Month', formWho: 'Individual / Team', formTeam: 'Team name', formTeamPh: 'e.g. Pyeongtaek Camp Team', formPlace: 'Location (Pyeongtaek or Jeju)',
      placeMainland: 'Pyeongtaek', placeJeju: 'Jeju', save: 'Save', saving: 'Saving…', cancel: 'Close',
      formLoaded: 'Loaded the report you already submitted. Saving will overwrite it.', saved: 'Saved.', savedUpdated: 'Updated.',
      needPlace: 'Please choose a location (Pyeongtaek or Jeju).', needTeam: 'Please enter a team name.',
      warnSalv: 'Salvations are higher than the number of people who heard the Gospel. Please double-check.', warnCamp: 'Camp salvations/dedications are higher than camp attendance. Please double-check.', warnEvent: 'Event salvations/dedications are higher than event attendance. Please double-check.',
      denied: 'Could not load. Please try again shortly.', sessionEnd: 'Please sign in.',
      lastMonth: 'Last month', formDelete: 'Delete this report', formDelAsk: 'Delete this report?', formDeleted: 'Deleted.',
      mricBtn: 'MRIC layout', mricBlocked: 'Pop-ups are blocked. Please allow pop-ups for this site.',
      scopeMinistry: 'Ministry status (discipleship & local churches)', formMinistryHint: 'One report per location (Pyeongtaek / Jeju), edited together by the reporters. Church grades (A/B/C) and leadership training come from the CRS church records; for the reporting month and this month, changes in CRS show up in the stats right away, and earlier months keep their saved numbers.', crsReload: 'Reload from CRS', crsLoading: 'Loading from CRS…', crsNone: 'CRS is not connected — please enter the numbers yourself.', crsFail: 'Could not load from CRS — please enter the numbers yourself.', crsLoaded: function (place, a, b, c, l) { return 'From CRS · ' + place + ': A ' + a + ' · B ' + b + ' · C ' + c + ' · leaders trained ' + l + ' — filled in, you can edit.'; }, crsBadge: 'CRS', crsHint: 'Filled in automatically from the CRS church records (editable)', ministryLabel: 'Ministry status', ministrySummary: function (d, c) { return 'Discipleship ' + d + ' · Churches ' + c; }, needDesignated: 'Only designated reporters can write team, camp, evangelistic event, discipleship and local church reports.',
      hqTitle: 'View in MRIC layout', hqIntro: 'Same order, names and descriptions as the MRIC Statistics Report form. Use these numbers when you enter the report in MRIC.', hqNeedMonth: 'The HQ report is monthly. Pick a month in the monthly view to see the table.', hqToMonth: 'Switch to monthly', hqExcluded: 'Not in HQ report (internal stat)', hqScopeNote: function (place, month) { return month + ' · ' + place; }, hqSnapshotNote: '* Church, club and enrolled-student counts are the values entered as of the end of that month.', hqCrsNote: '* Church grades A/B/C and leadership training come from the CRS church records.', hqNoMinistry: 'Ministry status (discipleship & local churches) has not been entered for this month yet.',
      hqLocation: 'Location', hqMonth: 'Month', hqYear: 'Year',
      repTitle: 'Reporters', repHelp: 'Only the people listed here (and the master) can write team, camp, evangelistic event, discipleship and local church reports. Anyone can write a personal evangelism report.', repAdd: 'Add reporter', repPick: 'Pick by name or email', repNone: 'No reporters designated yet.', repRemove: 'Remove', repSaved: 'Reporters saved.', repUnknown: 'Not in the list — pick a portal account email.',
      teamRepTitle: 'Team & ministry status reports', teamRepHelp: 'Team and ministry status reports record who submitted them. Only designated reporters and admins can see this.', teamRepEmpty: 'No team or ministry status reports for this month yet.', trKind: 'Type', trWho: 'Reported by', trUnknown: 'Not recorded (earlier report)', trUpdated: 'Updated', teamLabel: function (n) { return 'Team · ' + n; },
      monthLabel: function (m) { var p = m.split('-'); return new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }); },
    },
  };
  var lang = (function () { try { return localStorage.getItem('wolkoCarLang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } })();
  var t = function (key) { var v = I18N[lang][key]; if (v === undefined) v = I18N.ko[key]; if (typeof v === 'function') return v.apply(null, Array.prototype.slice.call(arguments, 1)); return v === undefined ? key : v; };
  var tx = function (obj) { return (obj && (obj[lang] || obj.ko)) || ''; };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var num = function (n) { return Number(n || 0).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR'); };

  var data = null;          // 지금 보는 달의 API 응답
  var cache = {};           // 달 → 응답 (보고 쓸 때 다른 달의 내 보고를 찾기 위해)
  var tab = 'all';          // all | mainland | jeju
  var viewMonth = null;
  var view = (function () { try { return sessionStorage.getItem('gsView') === 'year' ? 'year' : 'month'; } catch (e) { return 'month'; } })();   // 월별(지난달)이 기본 — 연간은 눌러서 본다. 이 탭에서 고른 보기만 기억한다
  var lastMonth = '';
  var editing = null;       // 고치는 중인 보고(없으면 새 보고)

  function headers(json) { var h = { Authorization: 'Bearer ' + (sessionStorage.getItem(TOKEN_KEY) || '') }; if (json) h['Content-Type'] = 'application/json'; return h; }
  function show(which) { $('loadStatus').hidden = which !== 'loading'; $('loginPanel').hidden = which !== 'login'; $('app').hidden = which !== 'app'; }
  function say(msg) { $('note').textContent = msg || ''; if (msg) { clearTimeout(say.timer); say.timer = setTimeout(function () { $('note').textContent = ''; }, 4000); } }

  async function fetchMonth(month) {
    var res = await fetch(API + '?month=' + encodeURIComponent(month), { headers: headers() });
    var body = await res.json().catch(function () { return {}; });
    if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); var e = new Error(t('sessionEnd')); e.auth = true; throw e; }
    if (!res.ok) throw new Error(body.error || t('denied'));
    cache[month] = body;
    return body;
  }

  var CLIENT_TTL = 5 * 60 * 1000;
  async function fetchYear(year) {
    var hit = cache['y' + year];
    if (hit && Date.now() - hit.at < CLIENT_TTL) return hit.body;       // 5분 안에 같은 해를 다시 열면 바로
    var res = await fetch(API + '?view=year' + (year ? '&year=' + encodeURIComponent(year) : ''), { headers: headers() });
    var body = await res.json().catch(function () { return {}; });
    if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); var e = new Error(t('sessionEnd')); e.auth = true; throw e; }
    if (!res.ok) throw new Error(body.error || t('denied'));
    cache['y' + body.year] = { at: Date.now(), body: body };
    if (!year) cache['y'] = { at: Date.now(), body: body };
    return body;
  }
  /** 지금 보기의 기준(연간이면 해, 월별이면 달) — 저장·삭제 뒤 다시 불러올 때 쓴다 */
  function viewKey() { return view === 'year' ? data.year : data.month; }
  function clearCache() { Object.keys(cache).forEach(function (k) { delete cache[k]; }); }

  var qs = new URLSearchParams(location.search), initMonth = /^\d{4}-\d{2}$/.test(qs.get('month') || '') ? qs.get('month') : '', pendingWrite = qs.get('write') === '1';
  if (initMonth) view = 'month';   // 메일의 보고 링크(?month=…)는 그 달 월별 보기로 연다
  async function load(month) {
    try {
      data = view === 'year' ? await fetchYear(month) : await fetchMonth(month || (data && data.reportMonth) || '');
      if (view !== 'year' && data.month > data.reportMonth) { return load(data.reportMonth); }   // 아직 끝나지 않은 달은 보지 않는다 — 지난달로
      viewMonth = view === 'year' ? null : data.month;
      if (view !== 'year') lastMonth = data.month;
      show('app');
      render();
      if (pendingWrite) { pendingWrite = false; openForm(null); }
    } catch (error) {
      if (error.auth) { show('login'); return; }
      show('app'); say(error.message);
    }
  }

  /* ───────── 보기 ───────── */
  var SELECTED = { all: 'all', mainland: 'mainland', jeju: 'jeju' };
  function totals(src, key) { return (src && src[SELECTED[key]]) || {}; }
  function sumSalv(x) { return (x.salvation || 0) + (x.campSalvations || 0) + (x.eeSalvations || 0); }
  function sumDed(x) { return (x.campDedications || 0) + (x.eeDedications || 0); }
  function sumReach(x) { return (x.campAttendance || 0) + (x.eeAttendance || 0); }

  function render() {
    document.documentElement.lang = lang;
    document.title = t('docTitle');
    document.querySelectorAll('[data-t]').forEach(function (el) { var v = t(el.dataset.t); if (typeof v === 'string') el.textContent = v; });
    $('langKoBtn').classList.toggle('is-active', lang === 'ko');
    $('langEnBtn').classList.toggle('is-active', lang === 'en');
    if (!data) return;
    var yearly = view === 'year';
    $('app').dataset.view = view;
    document.querySelectorAll('[data-view]').forEach(function (b2) { if (b2.tagName === 'BUTTON') { b2.classList.toggle('is-active', b2.dataset.view === view); b2.setAttribute('aria-selected', b2.dataset.view === view); } });
    $('monthLabel').textContent = yearly ? t('yearLabel', data.year) : t('monthLabel', data.month);
    $('thisMonth').textContent = t(yearly ? 'thisYear' : 'lastMonth');
    $('trendTitleEl').textContent = t(yearly ? 'trendTitleYear' : 'trendTitle');
    $('prevMonth').disabled = yearly ? Number(data.year) <= Number(data.earliest.slice(0, 4)) : data.month <= data.earliest;
    $('nextMonth').disabled = yearly ? Number(data.year) >= Number(data.current.slice(0, 4)) : data.month >= data.reportMonth;
    $('csvBtn').hidden = !data.me.canReview;
    $('xlsxBtn').hidden = !data.me.canReview;
    $('dlMenu').hidden = !data.me.canReview;
    renderTabs(); renderKpis(); renderCharts(); renderTable(); renderTrend(); renderTeamReports(); renderReporters();
  }

  /** 교회별 행사 — 같은 교회(CRS 번호, 없으면 이름)의 행사를 모아 참석·구원·헌신을 더한다 */
  function renderChurchStats() {
    var box = $('churchStats'); if (!box) return;
    var events = (data.churchEvents || []).filter(function (e) { return tab === 'all' || e.location === tab; });
    if (!events.length) { box.innerHTML = '<p class="gs-empty">' + esc(t('churchStatEmpty')) + '</p>'; return; }
    var map = {}, order = [];
    events.forEach(function (e) {
      var key = e.churchId || ('n:' + e.churchName.trim().toLowerCase());
      if (!map[key]) { map[key] = { name: e.churchName, events: [], students: 0, salv: 0, ded: 0 }; order.push(key); }
      var g = map[key]; g.events.push(e); g.students += e.students; g.salv += e.salvations; g.ded += e.dedications;
    });
    var groups = order.map(function (k) { return map[k]; }).sort(function (a, b) { return b.students - a.students || a.name.localeCompare(b.name, 'ko'); });
    var max = Math.max.apply(null, groups.map(function (g) { return g.students; }).concat([1]));
    box.innerHTML = '<div class="gs-tablewrap"><table class="gs-table gs-ctable"><thead><tr><th>' + esc(t('cCol')) + '</th><th>' + esc(t('cStudents')) + '</th><th>' + esc(t('cSalv')) + '</th><th>' + esc(t('cDed')) + '</th></tr></thead><tbody>'
      + groups.map(function (g) {
        var list = g.events.map(function (e) { return '<li><span>' + esc(e.event || '—') + '</span><em>' + esc(e.date || '') + '</em><b>' + num(e.students) + '</b></li>'; }).join('');
        return '<tr><td><strong>' + esc(g.name) + '</strong> <span class="gs-ccount">' + esc(t('cEventCount', g.events.length)) + '</span><span class="gs-meter"><i style="width:' + Math.round(g.students / max * 100) + '%"></i></span><ul class="gs-celist">' + list + '</ul></td>'
          + '<td class="gs-total">' + num(g.students) + '</td><td>' + num(g.salv) + '</td><td>' + num(g.ded) + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  /** 제출 현황(마스터·관리자) — 이 달 보고를 아직 안 낸 사람, 보고 제외(바꾸기는 마스터만) */
  function renderSubmission() {
    var wrap = $('subWrap'), box = $('subBox'); if (!wrap || !box) return;
    var sub = data.submission; wrap.hidden = !sub; if (!sub) return;
    var pctDone = sub.expected ? Math.round(sub.submitted / sub.expected * 100) : 100;
    var canExempt = data.me && data.me.role === 'master';   // 보고 제외는 마스터만 바꾼다 — 관리자는 목록만 본다
    var people = function (list, action, label) { return list.map(function (p) { return '<li><span><strong title="' + esc(p.email) + '">' + esc(p.name) + '</strong></span>' + (p.fixed ? '<span class="gs-fixed">' + esc(t('subFixed')) + '</span>' : !canExempt ? '' : '<button type="button" class="gs-small" data-exempt="' + action + '" data-email="' + esc(p.email) + '">' + esc(label) + '</button>') + '</li>'; }).join(''); };
    var kindOf = function (r) { return r.scope === 'ministry' ? t('ministryLabel') : r.scope === 'team' ? t('teamLabel', r.teamName) : t('individual'); };
    var reported = (sub.reports || []).map(function (r) {
      var rows = [];
      data.schema.sections.forEach(function (section) {
        var items = section.fields.filter(function (f) { return Number(r.values[f.id]) > 0; });
        if (items.length) rows.push('<div class="gs-rep-sec">' + esc(tx(section.title)) + '</div>' + items.map(function (f) { return '<div class="gs-rep-row"><span>' + esc(tx(f.short)) + '</span><b>' + num(r.values[f.id]) + '</b></div>'; }).join(''));
      });
      var who = r.name ? '<strong' + (r.email ? ' title="' + esc(r.email) + '"' : '') + '>' + esc(r.name) + '</strong>' : '<strong class="gs-muted">' + esc(t('subNoName')) + '</strong>';   // 이메일은 이름에 마우스를 올리면 보인다
      return '<li><details><summary><span class="gs-rep-who">' + who + '</span><span class="gs-repmeta"><span>' + esc(kindOf(r)) + '</span>' + pill(r.location) + '<span class="gs-fold-chev" aria-hidden="true"></span></span></summary>'
        + '<div class="gs-rep-body">' + (rows.length ? rows.join('') : '<p class="gs-empty">' + esc(t('subNoValues')) + '</p>') + '</div></details></li>';
    });
    box.innerHTML = '<p class="gs-subline">' + esc(t('subDone', sub.submitted, sub.expected)) + ' <span class="gs-subpct">' + pctDone + '%</span></p><span class="gs-meter"><i style="width:' + pctDone + '%"></i></span>'
      + '<h3 class="gs-subh">' + esc(t('subMissing')) + ' <b>' + sub.missing.length + '</b></h3>'
      + (sub.missing.length ? '<ul class="gs-people">' + people(sub.missing, 'on', t('subExempt')) + '</ul>' : '<p class="gs-empty">' + esc(t('subNone')) + '</p>')
      + '<h3 class="gs-subh">' + esc(t('subReported')) + ' <b>' + reported.length + '</b></h3>' + (reported.length ? '<p class="gs-ce-hint">' + esc(t('subReportedHelp')) + '</p><ul class="gs-reps">' + reported.join('') + '</ul>' : '<p class="gs-empty">' + esc(t('teamRepEmpty')) + '</p>')
      + (sub.exempt.length ? '<details class="gs-exempt"><summary>' + esc(t('subExemptList')) + ' (' + sub.exempt.length + ')</summary><ul class="gs-people">' + people(sub.exempt, 'off', t('subRestore')) + '</ul></details>' : '');
  }
  /** 캠프 자동 집계 — 확정 캠퍼 + (관리자가 입력한) 스태프. 마스터·관리자는 스태프 칸을 직접 고친다. "지난 캠프 포함 전체"로 바꾸면 모든 캠프를 보여 준다 */
  function renderCampAuto() {
    var box = $('campAuto'); if (!box) return;
    var yearly = view === 'year';   // 월별 보기면 그 달의 캠프, 연간 보기면 그 해의 캠프
    var camps = (data.campAuto || []).filter(function (c) { return tab === 'all' || c.location === tab; });
    var chips = '', note = '';
    if (!camps.length) { box.innerHTML = chips + note + '<p class="gs-empty">' + esc(t('campAutoEmpty')) + '</p>'; return; }
    var counted = camps.filter(function (c) { return c.counted !== false; });
    var sum = counted.reduce(function (n, c) { n.campers += c.campers; n.staff += c.staff; n.salv += c.salvations; n.ded += c.dedications; return n; }, { campers: 0, staff: 0, salv: 0, ded: 0 });
    box.innerHTML = chips + note + '<div class="gs-tablewrap"><table class="gs-table gs-ctable"><thead><tr><th>' + esc(t('caCamp')) + '</th>' + (yearly ? '<th>' + esc(t('caMonth')) + '</th>' : '') + '<th>' + esc(t('caCampers')) + '</th><th>' + esc(t('caStaff')) + '</th><th>' + esc(t('caSalv')) + '</th><th>' + esc(t('caDed')) + '</th></tr></thead><tbody>'
      + camps.map(function (c) {
        var staff = '<b class="gs-staffnum">' + num(c.staff) + '</b>';
        var pending = c.counted === false;
        var badge = pending ? ' <span class="gs-pendbadge" title="' + esc(t('caPendingTip')) + '">' + esc(t('caPending', t('mdShort', c.endDate))) + '</span>' : '';
        return '<tr' + (pending ? ' class="gs-pending"' : '') + '><td><strong>' + esc(lang === 'en' ? c.titleEn : c.titleKo) + '</strong> <span class="gs-pill ' + c.location + '">' + esc(c.location === 'jeju' ? t('tabJeju') : t('tabMainland')) + '</span>' + badge + '</td>' + (yearly ? '<td>' + esc(t('monthLabel', c.month || '')) + '</td>' : '') + '<td class="gs-total">' + (pending ? '–' : num(c.campers)) + '</td><td>' + (pending ? '–' : staff) + '</td><td>' + (pending ? '–' : num(c.salvations)) + '</td><td>' + (pending ? '–' : num(c.dedications)) + '</td></tr>';
      }).join('')
      + (counted.length > 1 ? '<tr class="gs-sumrow"><td><strong>' + esc(t('caTotal')) + '</strong></td>' + (yearly ? '<td></td>' : '') + '<td class="gs-total">' + num(sum.campers) + '</td><td>' + num(sum.staff) + '</td><td>' + num(sum.salv) + '</td><td>' + num(sum.ded) + '</td></tr>' : '')
      + '</tbody></table></div>';
  }
  function renderCharts() { renderSubmission(); renderCampAuto(); renderChurchStats(); if (window.GospelCharts) window.GospelCharts.render($('charts'), { data: data, tab: tab, lang: lang }); }

  function renderTabs() {
    // 탭의 숫자 = 그 지역에서 복음을 들은 인원(첫 번째 숫자 카드와 같은 값) — 제출된 보고 건수가 아니다
    var heard = function (key) { return sumHeard(totals(data.summary, key)); };
    var items = [['all', t('tabAll'), heard('all')], ['mainland', t('tabMainland'), heard('mainland')], ['jeju', t('tabJeju'), heard('jeju')]];
    $('tabs').innerHTML = items.map(function (i) { return '<button type="button" class="gs-tab' + (tab === i[0] ? ' is-active' : '') + '" role="tab" aria-selected="' + (tab === i[0]) + '" data-tab="' + i[0] + '" title="' + esc(t('kGospel')) + '">' + esc(i[1]) + ' <span>' + num(i[2]) + '</span></button>'; }).join('');
  }

  /** 설명을 숨겨 둔 (i) 단추 — 마우스를 올리거나 누르면 말풍선이 뜬다 */
  function infoBtn(text, label) { return text ? ' <button type="button" class="gs-info" data-tip="' + esc(text) + '" aria-label="' + esc(label || text) + '">i</button>' : ''; }
  function infoKey(key) { return ' <button type="button" class="gs-info" data-tip-key="' + key + '" aria-label="' + esc(t('infoShort')) + '">i</button>'; }
  function sumHeard(x) { return (x.evangelism || 0) + (x.campAttendance || 0) + (x.eeAttendance || 0); }

  function renderKpis() {
    var x = totals(data.summary, tab), c = data.summary.counts;
    $('kpiCaption').innerHTML = view === 'year' ? esc(t('ytdCaption', data.year, Number(String(data.ytd.from).slice(5)), Number(String(data.ytd.to).slice(5)))) + infoKey('ytdTip') : esc(t('monthLabel', data.month));
    var kpis = [[t('kGospel'), sumHeard(x), 'kGospelTip', 'heard'], [t('kSalv'), sumSalv(x), 'kSalvTip', 'saved'], [t('kDed'), sumDed(x), 'kDedTip', 'ded'], [t('kReach'), sumReach(x), 'kReachTip', 'reach']];   // 네 카드 모두 같은 구조(라벨 · 숫자 · 도넛)
    var box = $('kpis');
    if (box.dataset.lang !== lang || box.children.length !== kpis.length) {          // 처음이거나 언어가 바뀌면 카드를 새로 만든다
      box.dataset.lang = lang;
      box.innerHTML = kpis.map(function (k) { return '<div class="gs-kpi' + (k[3] ? ' has-break' : '') + '"><strong class="gf-num"></strong><span>' + esc(k[0]) + infoKey(k[2]) + '</span>' + (k[3] ? '<div class="gc-break" data-break="' + k[3] + '"></div>' : '') + '</div>'; }).join('');
    }
    kpis.forEach(function (k, i) { box.children[i].querySelector('.gf-num').textContent = num(k[1]); });
    var n = c[tab];
    $('countLine').textContent = n ? t('count', n, c.individual, c.team, tab === 'all') : t('countNone');
  }

  function renderTable() {
    var s = data.summary, cols = [['mainland', t('tabMainland')], ['jeju', t('tabJeju')], ['all', t('combined')]];
    var html = '<thead><tr><th>' + esc(t('item')) + '</th>' + cols.map(function (c) { return '<th class="' + (tab === c[0] ? 'is-col' : '') + '">' + esc(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>';
    data.schema.sections.forEach(function (section) {
      html += '<tr class="gs-section"><td colspan="4">' + esc(tx(section.title)) + '</td></tr>';
      section.fields.forEach(function (f) {
        var desc = tx(f.label).split(' — ').slice(1).join(' — ');   // 본부 양식처럼 설명은 이름 아래에 그대로 보여 주고, ⓘ 에는 월코 쪽 추가 설명만 넣는다
        var extra = tx(f.note);   // 월코 정의서 각주 — 해당 항목에만 ⓘ
        html += '<tr><td><span class="gs-itemname">' + esc(tx(f.short)) + '</span>' + infoBtn(extra, tx(f.short)) + (desc ? '<span class="gs-itemdesc">' + esc(desc) + '</span>' : '') + '</td>' + cols.map(function (c) { return '<td class="' + (tab === c[0] ? 'is-col ' : '') + (c[0] === 'all' ? 'gs-total' : '') + '">' + num(s[c[0]][f.id]) + '</td>'; }).join('') + '</tr>';
      });
    });
    $('statsTable').innerHTML = html + '</tbody>';
  }

  function renderTrend() {
    var rows = data.trend.map(function (m) { var x = totals(m, tab); return { month: m.month, gospel: sumHeard(x), salv: sumSalv(x), ded: sumDed(x), n: m.counts[tab] || 0 }; });
    var max = Math.max.apply(null, rows.map(function (r) { return r.gospel; }).concat([1]));
    $('trendTable').innerHTML = '<thead><tr><th>' + esc(t('month')) + '</th><th>' + esc(t('tHeard')) + '</th><th>' + esc(t('tSalv')) + '</th><th>' + esc(t('tDed')) + '</th><th>' + esc(t('reports')) + '</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td title="' + esc(t('monthLabel', r.month)) + '">' + esc(t('monthShort', r.month)) + '</td><td class="gs-bar-cell">' + num(r.gospel) + '<span class="gs-meter"><i style="width:' + Math.round(r.gospel / max * 100) + '%"></i></span></td><td>' + num(r.salv) + '</td><td>' + num(r.ded) + '</td><td>' + num(r.n) + '</td></tr>';
      }).join('') + '</tbody>';
  }

  function placeLabel(loc) { return loc === 'jeju' ? t('placeJeju') : t('placeMainland'); }
  function pill(loc) { return '<span class="gs-pill ' + (loc === 'jeju' ? 'jeju' : 'mainland') + '">' + esc(placeLabel(loc)) + '</span>'; }
  function whoLabel(r) { return r.scope === 'team' ? t('teamOf', r.teamName) : t('individual'); }
  function when(iso) { try { return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' }); } catch (e) { return ''; } }

  /* ───────── 팀 · 사역 현황 보고 내역 (누가 냈는지) ───────── */
  function renderTeamReports() {
    var wrap = $('teamWrap'), box = $('teamBox'); if (!wrap || !box) return;
    var list = view === 'month' ? data.teamReports : null;
    wrap.hidden = !list; if (!list) return;
    if (!list.length) { box.innerHTML = '<p class="gs-empty">' + esc(t('teamRepEmpty')) + '</p>'; return; }
    box.innerHTML = '<p class="gs-ce-hint">' + esc(t('teamRepHelp')) + '</p><div class="gs-tablewrap"><table class="gs-table gs-ctable"><thead><tr><th>' + esc(t('trKind')) + '</th><th>' + esc(t('rPlace')) + '</th><th>' + esc(t('trWho')) + '</th><th>' + esc(t('trUpdated')) + '</th></tr></thead><tbody>'
      + list.map(function (r) {
        var who = r.reporterName || r.reporterEmail ? '<strong>' + esc(r.reporterName || r.reporterEmail.split('@')[0]) + '</strong>' + (r.reporterEmail ? '<small class="gs-rmail">' + esc(r.reporterEmail) + '</small>' : '') : '<span class="gs-muted">' + esc(t('trUnknown')) + '</span>';
        return '<tr><td>' + esc(r.scope === 'ministry' ? t('ministryLabel') : t('teamLabel', r.teamName)) + '</td><td>' + pill(r.location) + '</td><td>' + who + '</td><td>' + esc(r.updatedAt ? when(r.updatedAt) : '') + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }

  /* ───────── 보고 담당자 지정 (마스터만) ───────── */
  var repInfo = null;
  async function loadReporterInfo() {
    try {
      var res = await fetch('/api/portal/gospel-reporters', { headers: headers() });
      var body = await res.json().catch(function () { return {}; });
      if (res.ok) repInfo = body;
    } catch (e) { /* 다음에 다시 시도 */ }
    renderReporters();
  }
  function renderReporters() {
    var wrap = $('repWrap'), box = $('repBox'); if (!wrap || !box) return;
    wrap.hidden = !data.reporters;
    if (!data.reporters) return;
    if (!repInfo) { box.innerHTML = '<p class="gs-empty">' + esc(t('loading')) + '</p>'; if (!renderReporters.busy) { renderReporters.busy = true; loadReporterInfo().then(function () { renderReporters.busy = false; }); } return; }
    var chips = repInfo.reporters.length
      ? '<ul class="gs-people gs-repchips">' + repInfo.reporters.map(function (p) { return '<li><span><strong>' + esc(p.name) + '</strong><em>' + esc(p.email) + '</em></span><button type="button" class="gs-small" data-rep-remove="' + esc(p.email) + '">' + esc(t('repRemove')) + '</button></li>'; }).join('') + '</ul>'
      : '<p class="gs-empty">' + esc(t('repNone')) + '</p>';
    box.innerHTML = '<p class="gs-ce-hint">' + esc(t('repHelp')) + '</p>' + chips
      + '<div class="gs-repadd"><input id="repInput" class="gs-text" list="repList" autocomplete="off" placeholder="' + esc(t('repPick')) + '" aria-label="' + esc(t('repPick')) + '"><datalist id="repList">'
      + repInfo.candidates.map(function (c) { return '<option value="' + esc(c.email) + '">' + esc(c.name) + '</option>'; }).join('') + '</datalist><button type="button" class="gs-small" id="repAdd">＋ ' + esc(t('repAdd')) + '</button></div>';
  }
  async function saveReporters(emails) {
    try {
      var res = await fetch('/api/portal/gospel-reporters', { method: 'POST', headers: headers(true), body: JSON.stringify({ emails: emails }) });
      var body = await res.json().catch(function () { return {}; });
      if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); show('login'); return; }
      if (!res.ok) throw new Error(body.error || t('denied'));
      repInfo = body; data.reporters = body.reporters.map(function (p) { return p.email; }); clearCache(); renderReporters(); say(t('repSaved'));
    } catch (error) { say(error.message); }
  }

  /* ───────── 보고 쓰기 ───────── */
  function monthOptions() {
    var out = [], m = data.reportMonth;
    while (m >= data.earliest) { out.push(m); var p = m.split('-'); var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 2, 1)); m = d.toISOString().slice(0, 7); }
    return out;
  }
  function lastPlace() { try { var v = localStorage.getItem('gsLocation'); return v === 'jeju' || v === 'mainland' ? v : ''; } catch (e) { return ''; } }

  /* ───────── 교회 행사 기록 ───────── */
  var churches = null;            // CRS 교회 목록 [{ id, name }] — 폼을 처음 열 때 한 번 불러온다
  function newEntryId() { return 'e' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function stepper(id, key, value, label) {
    return '<div class="gs-ce-num"><span>' + esc(label) + '</span><div class="gs-step"><button type="button" class="gs-stepbtn" data-step="-1" data-target="ce_' + id + '_' + key + '" aria-label="' + esc(t('minus')) + '">−</button>'
      + '<input id="ce_' + id + '_' + key + '" type="text" inputmode="numeric" autocomplete="off" data-ce="' + key + '" value="' + (value || 0) + '" aria-label="' + esc(label) + '">'
      + '<button type="button" class="gs-stepbtn" data-step="1" data-target="ce_' + id + '_' + key + '" aria-label="' + esc(t('plus')) + '">+</button></div></div>';
  }
  function churchRowHtml(e) {
    e = e || {};
    var id = e.id || newEntryId();
    return '<div class="gs-ce" data-id="' + esc(id) + '"><div class="gs-ce-top">'
      + '<input class="gs-ce-church" list="gsChurchList" maxlength="80" autocomplete="off" data-church-id="' + esc(e.churchId || '') + '" placeholder="' + esc(t('churchName')) + '" aria-label="' + esc(t('churchName')) + '" value="' + esc(e.churchName || '') + '">'
      + '<input class="gs-ce-event" maxlength="80" placeholder="' + esc(t('churchEvent')) + '" aria-label="' + esc(t('churchEvent')) + '" value="' + esc(e.event || '') + '">'
      + '<input class="gs-ce-date" type="date" aria-label="' + esc(t('churchDate')) + '" value="' + esc(e.date || '') + '">'
      + '<button type="button" class="gs-ce-del" aria-label="' + esc(t('churchDel')) + '">×</button></div>'
      + '<div class="gs-ce-nums">' + stepper(id, 'students', e.students, t('churchStudents')) + stepper(id, 'salvations', e.salvations, t('churchSalv')) + stepper(id, 'dedications', e.dedications, t('churchDed')) + '</div>'
      + '<input class="gs-ce-note" maxlength="300" placeholder="' + esc(t('churchNote')) + '" aria-label="' + esc(t('churchNote')) + '" value="' + esc(e.note || '') + '"></div>';
  }
  function churchEntriesFromForm() {
    return [].map.call(document.querySelectorAll('#churchRows .gs-ce'), function (row) {
      var q = function (sel) { return row.querySelector(sel); }, num = function (key) { return q('[data-ce="' + key + '"]').value; };
      return { id: row.dataset.id, churchId: q('.gs-ce-church').dataset.churchId || '', churchName: q('.gs-ce-church').value.trim(), event: q('.gs-ce-event').value.trim(), date: q('.gs-ce-date').value || '', students: num('students'), salvations: num('salvations'), dedications: num('dedications'), note: q('.gs-ce-note').value.trim() };
    });
  }
  function updateChurchTotal() {
    var rows = churchEntriesFromForm(), sum = { students: 0, salvations: 0, dedications: 0 };
    rows.forEach(function (r) { sum.students += n(r.students); sum.salvations += n(r.salvations); sum.dedications += n(r.dedications); });
    var el = $('churchTotal'), apply = $('churchApply'); if (!el) return;
    el.textContent = rows.length ? t('churchTotal', sum.students, sum.salvations, sum.dedications) : '';
    apply.hidden = !rows.length;
  }
  function fillChurchList() {
    var list = $('gsChurchList'); if (!list || !churches) return;
    list.innerHTML = churches.map(function (c) { return '<option value="' + esc(c.name) + '"></option>'; }).join('');
  }
  async function loadChurches() {
    if (churches) { fillChurchList(); return; }
    try {
      var res = await fetch('/api/portal/gospel-churches', { headers: headers() });
      var body = await res.json().catch(function () { return {}; });
      churches = res.ok && Array.isArray(body.churches) ? body.churches : [];
    } catch (e) { churches = []; }
    fillChurchList();
  }

  function buildForm(report) {
    var month = report ? report.month : (viewMonth >= data.earliest && viewMonth <= data.reportMonth ? viewMonth : data.reportMonth);
    var scope = report ? report.scope : 'individual';
    var place = report ? report.location : ((data.me && data.me.location) || lastPlace()); // 새 보고: 가입할 때 고른 소속(평택/제주)이 기본값
    var v = (report && report.values) || {};
    var designated = !!(data.me && data.me.designated);
    var html = '<div class="gs-meta"><fieldset class="gs-fieldset"><legend>' + esc(t('formMonth')) + '</legend><select id="fMonth" class="gs-select">' + monthOptions().map(function (m) { return '<option value="' + m + '"' + (m === month ? ' selected' : '') + '>' + esc(t('monthLabel', m)) + '</option>'; }).join('') + '</select></fieldset>' +
      '<fieldset class="gs-fieldset"><legend>' + esc(t('formWho')) + '</legend><div class="gs-choices">' +
        '<label class="gs-choice"><input type="radio" name="fScope" value="individual"' + (scope === 'individual' ? ' checked' : '') + '> ' + esc(t('individual')) + '</label>' +
        (designated ? '<label class="gs-choice"><input type="radio" name="fScope" value="team"' + (scope === 'team' ? ' checked' : '') + '> ' + esc(t('team')) + '</label>' +
        '<label class="gs-choice"><input type="radio" name="fScope" value="ministry"' + (scope === 'ministry' ? ' checked' : '') + '> ' + esc(t('scopeMinistry')) + '</label>' : '') + '</div>' +
        '<input id="fTeam" class="gs-text" type="text" maxlength="60" placeholder="' + esc(t('formTeamPh')) + '" aria-label="' + esc(t('formTeam')) + '" value="' + esc(report ? report.teamName : '') + '"' + (scope === 'team' ? '' : ' hidden') + '></fieldset>' +
      '<fieldset class="gs-fieldset"><legend>' + esc(t('formPlace')) + '</legend><div class="gs-choices">' +
        '<label class="gs-choice"><input type="radio" name="fPlace" value="mainland"' + (place === 'mainland' ? ' checked' : '') + '> ' + esc(t('placeMainland')) + '</label>' +
        '<label class="gs-choice"><input type="radio" name="fPlace" value="jeju"' + (place === 'jeju' ? ' checked' : '') + '> ' + esc(t('placeJeju')) + '</label></div></fieldset></div>';
    data.schema.sections.forEach(function (section) {
      html += '<section class="gs-sec" data-sec="' + section.id + '"><h4 class="gs-sec-head">' + esc(tx(section.title)) + '</h4>' + (section.id === 'camps' ? '<p class="gs-ce-hint gs-sec-note">' + esc(t('campFormHint')) + '</p>' : '')
        + (section.scope === 'ministry' && section.id === 'discipleship' ? '<p class="gs-ce-hint gs-sec-note">' + esc(t('formMinistryHint')) + '</p>' : '')
        + (section.id === 'church' ? '<div class="gs-crsbar"><p class="gs-ce-hint" id="crsNote"></p><button type="button" class="gs-small" id="crsReload">' + esc(t('crsReload')) + '</button></div>' : '') + section.fields.map(function (f) {
        var parts = tx(f.label).split(' — '), title = parts[0], desc = parts.slice(1).join(' — ');
        return '<div class="gs-row"><div class="gs-row-text"><label for="f_' + f.id + '"><strong>' + esc(title) + '</strong></label>' + (f.crs ? '<span class="gs-crsbadge" title="' + esc(t('crsHint')) + '">' + esc(t('crsBadge')) + '</span>' : '')
          + (desc ? '<button type="button" class="gs-info" data-tip="' + esc(desc) + '" aria-label="' + esc(t('infoLabel', title)) + '">i</button>' : '') + '</div>'
          + '<div class="gs-step"><button type="button" class="gs-stepbtn" data-step="-1" data-for="' + f.id + '" aria-label="' + esc(t('minus')) + '">−</button>'
          + '<input id="f_' + f.id + '" type="text" inputmode="numeric" autocomplete="off" data-field="' + f.id + '" value="' + (v[f.id] ? v[f.id] : 0) + '" placeholder="0" aria-label="' + esc(title) + '">'
          + '<button type="button" class="gs-stepbtn" data-step="1" data-for="' + f.id + '" aria-label="' + esc(t('plus')) + '">+</button></div></div>';
      }).join('') + '</section>';
    });
    html += '<section class="gs-sec" id="churchSec"><h4 class="gs-sec-head">' + esc(t('churchTitle')) + '</h4><div class="gs-ce-body"><p class="gs-ce-hint">' + esc(t('churchHint')) + '</p><div id="churchRows">' + ((report && report.churchEntries) || []).map(churchRowHtml).join('') + '</div>'
      + '<div class="gs-ce-foot"><button type="button" class="gs-small" id="churchAdd">＋ ' + esc(t('churchAdd')) + '</button><span class="gs-ce-total" id="churchTotal"></span><button type="button" class="gs-small" id="churchApply" hidden>' + esc(t('churchApply')) + '</button></div></div></section><datalist id="gsChurchList"></datalist>';
    html += '<p class="gs-warn" id="fWarn" hidden></p><div class="gs-formbtns"><button type="submit" class="gs-primary" id="fSave">' + esc(t('save')) + '</button><button type="button" class="gs-small" id="fCancel">' + esc(t('cancel')) + '</button><button type="button" class="gs-small gs-danger" id="fDelete" hidden>' + esc(t('formDelete')) + '</button></div>';
    $('reportForm').innerHTML = html;
    drafts = {}; applyScopeUi(); formKey = unitKey(currentUnit());
    updateWarn(); updateChurchTotal(); loadChurches();
    if (currentUnit().scope === 'ministry' && !report) applyCrs(false);
  }

  function formValues() { var out = {}; document.querySelectorAll('#reportForm [data-field]').forEach(function (i) { out[i.dataset.field] = i.value; }); return out; }
  function n(v) { var x = Number(String(v || '').replace(/[,\s]/g, '')); return Number.isFinite(x) ? x : 0; }
  function updateWarn() {
    var v = formValues(), msgs = [];
    if (n(v.salvation) > n(v.evangelism)) msgs.push(t('warnSalv'));
    if (n(v.campSalvations) > n(v.campAttendance) || n(v.campDedications) > n(v.campAttendance)) msgs.push(t('warnCamp'));
    if (n(v.eeSalvations) > n(v.eeAttendance) || n(v.eeDedications) > n(v.eeAttendance)) msgs.push(t('warnEvent'));
    var el = $('fWarn'); if (!el) return;
    el.hidden = !msgs.length; el.innerHTML = msgs.map(esc).join('<br>');
  }

  function openForm(report) {
    editing = report || null;
    buildForm(report);
    $('formError').textContent = '';
    if (!report) { formKey = null; syncExisting(); }     // 같은 달·같은 단위로 이미 낸 보고가 있으면 불러온다
    $('formPanel').hidden = false;
    $('formPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /* 개인 보고와 팀 보고(그리고 달·팀 이름마다)는 서로 다른 보고라서 따로 저장된다.
     폼에서 달·개인/팀·팀 이름을 바꾸면 방금까지 쓰던 내용은 그 단위의 초안으로 잠시 보관하고,
     바꾼 쪽은 ① 아직 저장 전에 쓰던 초안 ② 이미 낸 보고 ③ 0으로 비운 새 폼 순서로 채운다 — 한쪽 숫자가 다른 쪽으로 따라가지 않는다. */
  var drafts = {}, formKey = null, existing = null;
  function currentUnit() {
    var scope = document.querySelector('input[name="fScope"]:checked').value;
    var placeEl = document.querySelector('input[name="fPlace"]:checked');
    // 사역 현황은 위치마다 한 건이라 위치가 단위 이름 구실을 한다
    return { month: $('fMonth').value, scope: scope, team: scope === 'team' ? ($('fTeam').value || '').trim().toLowerCase() : (scope === 'ministry' ? (placeEl ? placeEl.value : '') : '') };
  }
  /** 고르기에 따라 쓸 수 있는 구역만 보이게 — 개인 전도는 누구나, 캠프·행사는 담당자의 개인/팀, 제자훈련·지역교회는 담당자의 사역 현황 */
  function applyScopeUi() {
    var scope = document.querySelector('input[name="fScope"]:checked').value, designated = !!(data.me && data.me.designated);
    data.schema.sections.forEach(function (sec) {
      var el = document.querySelector('#reportForm [data-sec="' + sec.id + '"]'); if (!el) return;
      var inScope = scope === 'ministry' ? sec.scope === 'ministry' : sec.scope === 'report';
      el.hidden = !(inScope && (sec.access === 'all' || designated));
    });
    var ce = $('churchSec'); if (ce) ce.hidden = !(designated && scope !== 'ministry');
    if ($('fTeam')) $('fTeam').hidden = scope !== 'team';
  }
  /** 사역 현황: CRS 교회 기록에서 연결 교회 A/B/C 수와 그 달 리더십 훈련 인원을 불러와 칸에 채운다 */
  var crsSeq = 0;
  async function applyCrs(fresh) {
    var u = currentUnit(); if (u.scope !== 'ministry' || !u.team) { if ($('crsNote')) $('crsNote').textContent = ''; return; }
    var note = $('crsNote'), seq = ++crsSeq; if (note) note.textContent = t('crsLoading');
    try {
      var res = await fetch('/api/portal/gospel-ministry?month=' + encodeURIComponent(u.month) + (fresh ? '&fresh=1' : ''), { headers: headers() });
      var body = await res.json().catch(function () { return {}; });
      if (seq !== crsSeq || !$('crsNote')) return;
      if (!res.ok) throw new Error(body.error || t('crsFail'));
      if (!body.configured) { $('crsNote').textContent = t('crsNone'); return; }
      var c = (body.crs && body.crs[u.team]) || {};
      ['churchA', 'churchB', 'churchC', 'leadershipTraining'].forEach(function (id) { var el = $('f_' + id); if (el) { el.value = String(c[id] || 0); el.dispatchEvent(new Event('input', { bubbles: true })); } });
      $('crsNote').textContent = t('crsLoaded', placeLabel(u.team), c.churchA || 0, c.churchB || 0, c.churchC || 0, c.leadershipTraining || 0);
    } catch (e) { if (seq === crsSeq && $('crsNote')) $('crsNote').textContent = t('crsFail'); }
  }
  function unitKey(u) { return u.month + '|' + u.scope + '|' + u.team; }
  function snapshot() {
    var place = document.querySelector('input[name="fPlace"]:checked');
    return { values: formValues(), place: place ? place.value : '', churchEntries: churchEntriesFromForm() };
  }
  function fillForm(values, place, churchEntries) {
    document.querySelectorAll('#reportForm [data-field]').forEach(function (i) { i.value = values && values[i.dataset.field] ? values[i.dataset.field] : 0; });
    var radio = place && document.querySelector('input[name="fPlace"][value="' + place + '"]');
    document.querySelectorAll('input[name="fPlace"]').forEach(function (r) { r.checked = false; });
    if (radio) radio.checked = true;
    $('churchRows').innerHTML = (churchEntries || []).map(churchRowHtml).join('');
    updateWarn(); updateChurchTotal();
  }
  function applyCrsNoteOnly() { var n = $('crsNote'); if (n) n.textContent = ''; }
  async function syncExisting() {
    var unit = currentUnit(), key = unitKey(unit);
    if (key === formKey) return;
    var before = formKey, prevTeamEmpty = before && /\|team\|$/.test(before) && unit.scope === 'team' && before.split('|')[0] === unit.month;
    if (before) drafts[before] = snapshot();
    formKey = key;
    var info;
    try { info = cache[unit.month] || await fetchMonth(unit.month); } catch (e) { return; }
    if (unitKey(currentUnit()) !== key) return;            // 기다리는 사이 또 바꿨으면 마지막 선택만 처리
    existing = null; if ($('fDelete')) $('fDelete').hidden = true;
    var pool = unit.scope === 'ministry' ? (info.ministry || []) : info.mine;
    var match = pool.filter(function (r) { return r.scope === unit.scope && (unit.scope === 'individual' || (unit.scope === 'ministry' ? r.location === unit.team : String(r.teamName).toLowerCase() === unit.team)); })[0];
    var draft = drafts[key];
    $('formError').textContent = '';
    applyScopeUi();
    existing = match || null; if ($('fDelete')) $('fDelete').hidden = !existing;
    var ministry = unit.scope === 'ministry', placeKeep = ministry ? unit.team : '';
    if (draft) fillForm(draft.values, ministry ? placeKeep : draft.place, draft.churchEntries);
    else if (match) { fillForm(match.values, match.location, match.churchEntries); $('formError').textContent = t('formLoaded'); if (ministry) { if (unit.month === data.reportMonth || unit.month === data.current) applyCrs(false); else applyCrsNoteOnly(); } }   // 열린 달은 통계가 CRS 지금 값을 쓰므로 화면도 같은 값으로
    else if (!prevTeamEmpty) { fillForm({}, ministry ? placeKeep : ((data.me && data.me.location) || lastPlace()), []); if (ministry) applyCrs(false); }   // 팀 이름만 막 정한 경우가 아니면 새 보고는 0 에서 시작
  }

  async function save(event) {
    event.preventDefault();
    var scope = document.querySelector('input[name="fScope"]:checked').value;
    var placeEl = document.querySelector('input[name="fPlace"]:checked');
    var team = ($('fTeam').value || '').trim();
    if (!placeEl) { $('formError').textContent = t('needPlace'); return; }
    if (scope === 'team' && !team) { $('formError').textContent = t('needTeam'); return; }
    if (scope !== 'individual' && !(data.me && data.me.designated)) { $('formError').textContent = t('needDesignated'); return; }
    $('fSave').disabled = true; $('fSave').textContent = t('saving'); $('formError').textContent = '';
    try {
      var month = $('fMonth').value;
      var res = await fetch(API, { method: 'POST', headers: headers(true), body: JSON.stringify({ month: month, scope: scope, teamName: scope === 'team' ? team : '', location: placeEl.value, values: formValues(), churchEntries: scope === 'ministry' ? [] : churchEntriesFromForm() }) });
      var body = await res.json().catch(function () { return {}; });
      if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); show('login'); return; }
      if (!res.ok) throw new Error(body.error || t('denied'));
      try { localStorage.setItem('gsLocation', placeEl.value); } catch (e) { /* 저장 못 해도 괜찮다 */ }
      clearCache();
      $('formPanel').hidden = true;
      await load(view === 'year' ? (data ? data.year : '') : month);
      say(body.updated ? t('savedUpdated') : t('saved'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      $('formError').textContent = error.message;
    } finally {
      var btn = $('fSave'); if (btn) { btn.disabled = false; btn.textContent = t('save'); }
    }
  }

  /* ───────── 이벤트 ───────── */
  function shift(delta) {
    if (view === 'year') {
      var y = Number(data.year) + delta;
      if (y < Number(data.earliest.slice(0, 4)) || y > Number(data.current.slice(0, 4))) return;
      load(String(y)); return;
    }
    var p = data.month.split('-'), d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1 + delta, 1));
    var next = d.toISOString().slice(0, 7);
    if (next < data.earliest || next > data.reportMonth) return;
    load(next);
  }
  /** 연·월 이름을 누르면 연·월 선택기가 열린다 — 일(日)은 고르지 않는다. 월별 보기는 해와 달, 연간 보기는 해만 */
  $('monthLabel').addEventListener('click', function () {
    if (!data || !window.GospelMonthPick) return;
    var yearly = view === 'year';
    window.GospelMonthPick.open($('monthLabel'), {
      mode: yearly ? 'year' : 'month', lang: lang, value: yearly ? data.year : data.month,
      min: yearly ? data.earliest.slice(0, 4) + '-01' : data.earliest, max: yearly ? data.current.slice(0, 4) + '-12' : data.reportMonth,
      onPick: function (v) { if (v !== (yearly ? data.year : data.month)) load(v); },
    });
  });
  /* 연간 / 월별 보기 전환 — 선택은 이 브라우저에 기억한다 */
  document.querySelector('.gs-viewtoggle').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-view]'); if (!b || b.dataset.view === view) return;
    view = b.dataset.view;
    try { sessionStorage.setItem('gsView', view); } catch (err) { /* 저장 못 해도 이 화면은 바뀐다 */ }
    load(view === 'year' ? (data ? data.current.slice(0, 4) : '') : (lastMonth || ''));
  });
  $('prevMonth').addEventListener('click', function () { shift(-1); });
  $('nextMonth').addEventListener('click', function () { shift(1); });
  $('thisMonth').addEventListener('click', function () { load(view === 'year' ? data.current.slice(0, 4) : data.reportMonth); });
  $('writeBtn').addEventListener('click', function () { openForm(null); });
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; renderTabs(); renderKpis(); renderCharts(); renderTable(); renderTrend(); });
  /* ───────── (i) 설명 말풍선 ───────── */
  var tip = document.createElement('div'); tip.className = 'gs-tip'; tip.id = 'gsTip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip);
  var tipFor = null;
  function hideTip() { if (tipFor) tipFor.removeAttribute('aria-describedby'); tipFor = null; tip.hidden = true; }
  function showTip(btn) {
    if (tipFor && tipFor !== btn) tipFor.removeAttribute('aria-describedby');
    tipFor = btn; btn.setAttribute('aria-describedby', 'gsTip');
    tip.textContent = btn.dataset.tip || t(btn.dataset.tipKey || ''); tip.style.left = '0px'; tip.style.top = '0px'; tip.hidden = false;
    var r = btn.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8);
    var top = r.bottom + 8; if (top + h > vh - 8) top = Math.max(8, r.top - h - 8);
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  var form = document;
  form.addEventListener('mouseover', function (e) { var b = e.target.closest('.gs-info'); if (b) showTip(b); });
  document.addEventListener('mouseout', function (e) { if (e.target.closest('.gs-info') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.gs-info'))) hideTip(); });
  form.addEventListener('focusin', function (e) { var b = e.target.closest('.gs-info'); if (b) showTip(b); });
  form.addEventListener('focusout', function (e) { if (e.target.closest('.gs-info')) hideTip(); });
  form.addEventListener('click', function (e) { var b = e.target.closest('.gs-info'); if (!b) return; if (tipFor === b && !tip.hidden && e.detail !== 0 && b.dataset.touched) { hideTip(); delete b.dataset.touched; } else { showTip(b); b.dataset.touched = '1'; } });
  document.addEventListener('click', function (e) { if (!e.target.closest('.gs-info')) hideTip(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('scroll', hideTip, true); window.addEventListener('resize', hideTip);

  $('subBox').addEventListener('click', async function (e) {
    var b = e.target.closest('[data-exempt]'); if (!b || b.disabled) return;
    b.disabled = true;
    try {
      var res = await fetch('/api/portal/gospel-exempt', { method: 'POST', headers: headers(true), body: JSON.stringify({ email: b.dataset.email, exempt: b.dataset.exempt === 'on' }) });
      var body = await res.json().catch(function () { return {}; });
      if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); show('login'); return; }
      if (!res.ok) throw new Error(body.error || t('denied'));
      clearCache(); await load(viewKey()); say(t('subSaved'));
    } catch (error) { say(error.message); b.disabled = false; }
  });

  /** MRIC 레이아웃은 새 창으로 — 지금 보고 있는 달(연간 보기면 지난달)과 평택·제주·통합 탭을 그대로 가져간다 */
  $('mricBtn').addEventListener('click', function () {
    var month = view === 'year' ? (lastMonth || data.reportMonth) : data.month;
    var win = window.open('/portal/gospel-stats/mric/?month=' + encodeURIComponent(month) + '&place=' + encodeURIComponent(tab), 'wolkoMric', 'width=1040,height=900,resizable=yes,scrollbars=yes');
    if (!win) say(t('mricBlocked'));
  });
  $('repWrap').addEventListener('click', function (e) {
    var rm = e.target.closest('[data-rep-remove]'), add = e.target.closest('#repAdd');
    if (rm && repInfo) { saveReporters(repInfo.reporters.map(function (p) { return p.email; }).filter(function (m) { return m !== rm.dataset.repRemove; })); return; }
    if (add && repInfo) {
      var v = ($('repInput').value || '').trim().toLowerCase();
      var hit = repInfo.candidates.filter(function (c) { return c.email === v || c.name.toLowerCase() === v; })[0];
      if (!hit) { say(t('repUnknown')); return; }
      saveReporters(repInfo.reporters.map(function (p) { return p.email; }).concat([hit.email]));
    }
  });
  $('reportForm').addEventListener('submit', save);
  $('reportForm').addEventListener('input', function (e) { if (e.target.matches('[data-field]')) updateWarn(); if (e.target.matches('[data-ce]')) updateChurchTotal(); });
  $('reportForm').addEventListener('change', function (e) {
    if (!e.target.matches('.gs-ce-church')) return;
    var hit = (churches || []).filter(function (c) { return c.name.toLowerCase() === e.target.value.trim().toLowerCase(); })[0];
    e.target.dataset.churchId = hit ? hit.id : '';
  });
  $('reportForm').addEventListener('focusin', function (e) { if (e.target.matches('[data-field]')) setTimeout(function () { e.target.select(); }, 0); });
  $('reportForm').addEventListener('change', function (e) {
    if (e.target.name === 'fScope') applyScopeUi();
    if (e.target.id === 'fMonth' || e.target.name === 'fScope' || (e.target.name === 'fPlace' && document.querySelector('input[name="fScope"]:checked').value === 'ministry')) syncExisting();
  });
  $('reportForm').addEventListener('focusout', function (e) { if (e.target.id === 'fTeam') syncExisting(); });
  $('reportForm').addEventListener('click', function (e) {
    if (e.target.id === 'fCancel') { $('formPanel').hidden = true; return; }
    if (e.target.id === 'crsReload') { applyCrs(true); return; }
    if (e.target.id === 'fDelete' && existing) {
      if (!confirm(t('formDelAsk'))) return;
      var delMonth = $('fMonth').value, delId = existing.id;
      fetch(API + '?month=' + encodeURIComponent(delMonth) + '&id=' + encodeURIComponent(delId), { method: 'DELETE', headers: headers() })
        .then(function (res) { return res.json().catch(function () { return {}; }).then(function (body) { if (!res.ok) throw new Error(body.error || t('denied')); }); })
        .then(function () { clearCache(); $('formPanel').hidden = true; return load(viewKey()); })
        .then(function () { say(t('formDeleted')); })
        .catch(function (error) { $('formError').textContent = error.message; });
      return;
    }
    if (e.target.id === 'churchAdd') { $('churchRows').insertAdjacentHTML('beforeend', churchRowHtml()); updateChurchTotal(); var last = $('churchRows').lastElementChild; if (last) last.querySelector('.gs-ce-church').focus(); return; }
    if (e.target.closest('.gs-ce-del')) { e.target.closest('.gs-ce').remove(); updateChurchTotal(); return; }
    if (e.target.id === 'churchApply') {
      var sums = { eeAttendance: 0, eeSalvations: 0, eeDedications: 0 };
      churchEntriesFromForm().forEach(function (r) { sums.eeAttendance += n(r.students); sums.eeSalvations += n(r.salvations); sums.eeDedications += n(r.dedications); });
      Object.keys(sums).forEach(function (id) { var el = $('f_' + id); if (el) { el.value = String(sums[id]); el.dispatchEvent(new Event('input', { bubbles: true })); } });
      $('formError').textContent = t('churchApplied');
      return;
    }
    var step = e.target.closest('[data-step]');
    if (step) {
      var input = $(step.dataset.target || ('f_' + step.dataset.for)), next = Math.max(0, n(input.value) + Number(step.dataset.step));
      input.value = String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  function download(format, filename) {
    return async function () {
      try {
        var res = await fetch(API + '?month=' + encodeURIComponent(data.month) + '&format=' + format, { headers: headers() });
        if (!res.ok) throw new Error(t('denied'));
        var url = URL.createObjectURL(await res.blob()), a = document.createElement('a');
        a.href = url; a.download = filename(data.month); document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      } catch (error) { say(error.message); }
    };
  }
  $('dlMenu').addEventListener('click', function (e) { if (e.target.closest('button')) setTimeout(function () { $('dlMenu').open = false; }, 0); });
  $('csvBtn').addEventListener('click', download('csv', function (m) { return 'gospel-stats-' + m + '.csv'; }));
  $('xlsxBtn').addEventListener('click', download('xlsx', function (m) { return 'WOLKO-Gospel-Report-' + m + '.xlsx'; }));

  function setLang(next) { if (next === lang) return; lang = next; try { localStorage.setItem('wolkoCarLang', lang); } catch (e) { /* 저장 못 해도 이 화면은 바뀐다 */ } render(); if (!$('formPanel').hidden) { var keep = { v: formValues() }; buildForm(editing); document.querySelectorAll('#reportForm [data-field]').forEach(function (i) { if (keep.v[i.dataset.field]) i.value = keep.v[i.dataset.field]; }); updateWarn(); } }
  $('langKoBtn').addEventListener('click', function () { setLang('ko'); });
  $('langEnBtn').addEventListener('click', function () { setLang('en'); });

  $('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault(); $('loginError').textContent = '';
    try {
      var res = await fetch('/api/hub/account-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }) });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(body.error || t('loginFail'));
      sessionStorage.setItem(TOKEN_KEY, body.hubToken); $('loginPassword').value = '';
      show('loading'); await load(initMonth);
    } catch (error) { $('loginError').textContent = error.message; }
  });

  render();
  if (sessionStorage.getItem(TOKEN_KEY)) { show('loading'); load(initMonth); } else { show('login'); }
})();
