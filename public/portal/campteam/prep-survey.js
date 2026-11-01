/* 캠프 준비 「평가 설문」 탭 — 구글 폼처럼: 설문 머리글 카드 + 질문 카드(눌러서 고치기), 질문 종류 7가지, 한/영 짝, 템플릿, 미리보기, AI 영어 채우기, 대상별 알림톡 보내기.
   예전에는 prep-extra.js 안에 있던 것을 옮겼다(탭 이름·순서는 그대로). 모양(CSS)은 survey-builder.css 를 여기서 불러온다. 서버: surveys · survey-templates · survey-ai · survey-send · survey-results. */
(function () {
  var P = window.CTPrep; if (!P) return;
  if (!document.getElementById('svCss')) { var lk = document.createElement('link'); lk.id = 'svCss'; lk.rel = 'stylesheet'; lk.href = '/portal/campteam/survey-builder.css?v=1'; document.head.appendChild(lk); }
  CT.addDict({
    ko: { svIntro: '캠프가 끝난 뒤 스태프·학생·부모님·교회에 보내는 평가 설문이에요. 구글 폼처럼 질문을 눌러서 고치면 돼요. 이름·연락처는 묻지 않고, 결과는 캠프 담당자만 봐요.', svNew: '+ 설문 만들기', svNone: '아직 만든 설문이 없어요.',
      svWho: '누구에게 보내는 설문인가요?', svWhoHint: '고르면 알맞은 시작 질문이 먼저 들어가요. 질문은 마음대로 고치고 지울 수 있어요.', svFromTpl: '저장해 둔 템플릿에서 시작', svTplQs: function (n) { return '질문 ' + n + '개'; },
      aStaff: '스태프', aStaffD: '함께 섬긴 스태프·크루', aStudent: '학생(캠퍼)', aStudentD: '캠프에 참가한 학생들', aParent: '부모님', aParentD: '참가 학생의 보호자', aChurch: '교회·학교', aChurchD: '학생들을 보낸 교회·학교', aOther: '기타(링크만)', aOtherD: '링크를 복사해서 직접 전해요',
      svBuildNew: '설문 만들기', svBuildEdit: '설문 고치기', svHeadTitle: '설문 제목', svHeadDesc: '설문 설명 (선택)', svKo: '한국어', svEn: 'English', svAudience: '대상', svUntitled: '(제목 없음)', svNoText: '질문을 적어 주세요', svQText: '질문', svDescL: '설명 (선택)', svHeading: '제목·설명',
      svTShort: '단답형 (짧은 글)', svTPara: '장문형 (긴 글)', svTChoice: '객관식 (하나만 고르기)', svTCheck: '체크박스 (여러 개 고르기)', svTDrop: '드롭다운', svTScale: '선형 배율 (1~5 / 1~10)', svTStar: '별점 (1~5)',
      svReq: '필수', svDup: '질문 복사', svUp: '위로', svDown: '아래로', svDelQ: '질문 삭제', svAddOpt: '+ 보기 추가', svAddOther: '+ 「기타 (직접 쓰기)」 추가', svOther: '기타 (직접 쓰기)', svOptN: function (n) { return '보기 ' + n; }, svRemove: '지우기',
      svScaleMax: '범위', svScale5: '1 ~ 5', svScale10: '1 ~ 10', svLow: '낮은 쪽 이름 (선택)', svHigh: '높은 쪽 이름 (선택)', svStarHint: '답하는 사람이 별 1~5개를 눌러요.', svTextHint: '답하는 사람이 글을 써요.',
      svAddQ: '+ 질문 추가', svAddH: '+ 제목·설명', svTplLoad: '템플릿 불러오기', svTplSave: '템플릿으로 저장', svPreview: '미리보기', svAi: '✨ AI로 영어 채우기', svAiHint: '비어 있는 영어(영어만 적었다면 한국어) 칸을 AI가 채워 줘요. 설문 문구만 AI에 보내고, 이름이나 연락처는 보내지 않아요.',
      svAiSends: '설문 문구만 AI에 보내요', svAiNone: '채울 빈 칸이 없어요(한국어만 있고 영어가 비어 있는 칸을 찾아요).', svAiBusy: 'AI가 채우는 중…', svAiDone: function (n, s) { return n + '칸을 채웠어요. 꼭 읽어 보고 고쳐 주세요.' + (s ? ' (연락처처럼 보이는 ' + s + '칸은 건너뛰었어요.)' : ''); },
      svBack: '← 편집으로 돌아가기', svPvNote: '답하는 사람이 보는 모습이에요 (여기서는 답할 수 없어요).', svCloseConfirm: '저장하지 않은 변경이 있어요. 그래도 닫을까요?',
      svErrTitle: '설문 제목을 적어 주세요.', svErrNoQ: '질문을 하나 이상 넣어 주세요.', svErrText: function (n) { return '질문 ' + n + '번의 내용을 적어 주세요.'; }, svErrOpt: function (n, min) { return '질문 ' + n + '번에 보기를 ' + min + '개 이상 적어 주세요.'; }, svSaving: '저장하는 중…',
      svTplTitle: '템플릿 불러오기', svTplMine: '우리 팀이 저장해 둔 템플릿', svTplMineNone: '아직 저장된 템플릿이 없어요. 설문을 만든 뒤 「템플릿으로 저장」을 누르면 여기에 남아요.', svTplStart: '기본 시작 질문', svReplace: '바꾸기', svAppend: '뒤에 추가', svTplReplaceConfirm: '지금 질문이 이 템플릿의 질문으로 바뀌어요. 계속할까요?', svTplDelConfirm: '이 템플릿을 지울까요? (설문에는 영향이 없어요)',
      svTplSaveTitle: '템플릿으로 저장', svTplName: '템플릿 이름', svTplNameHint: '예) 2027 겨울캠프 학생 평가', svTplSaved: '저장했어요. 다음부터 「템플릿 불러오기」에서 쓸 수 있어요.', svTplNeed: '질문을 먼저 넣어 주세요.',
      svQs: function (n) { return '질문 ' + n + '개'; }, svSent: function (n) { return '보낸 사람 ' + n + '명'; }, svOpen: '열림', svClosed: '닫힘', svSend: '설문 보내기', svRes: '결과 보기', svEdit: '고치기', svLinkOn: '링크 켜기', svLinkOff: '링크 끄기', svCloseS: '설문 닫기', svReopen: '다시 열기', svDel: '삭제', svCopy: '링크 복사', svCopied: '복사했어요.',
      svLinkNote: '링크를 아는 사람은 누구나 답할 수 있어요. 필요 없어지면 「링크 끄기」를 누르세요.', svDelConfirm: '이 설문을 삭제할까요? (받은 답은 남지만 화면에서 사라져요)',
      svAvg: '평균', svNoAns: '아직 답이 없어요.', svAnswered: function (n) { return n + '명 응답'; }, svResTitle: '설문 결과', svOtherL: '기타',
      svSendTitle: '설문 보내기', svSendIntro: '카카오톡 알림톡으로 설문 링크를 보내요. 먼저 받는 사람을 확인하고, 한 번 더 확인한 뒤에야 보내요. 이 확인 화면에서는 아무것도 보내지 않아요.', svChecking: '받는 사람을 확인하는 중…',
      svNTotal: '받는 사람', svNAlready: '이미 보냄', svNInvalid: '번호 없음·오류', svNDupes: '같은 번호', svNCap: '오늘 더 보낼 수 있는 수', svNWill: '지금 보낼 사람', svSample: '예시 (이름·번호는 가려서 보여요)', svNoSample: '보여 드릴 사람이 없어요.',
      svNext: function (n) { return '다음: ' + n + '명에게 보내기'; }, svGoBack: '돌아가기', svDoSend: function (n) { return n + '명에게 보내기'; }, svSending: '보내는 중…', svLinkOffMsg: '이 설문은 링크가 꺼져 있거나 닫혀 있어요. 「링크 켜기」를 누르고 설문이 열려 있는지 확인한 뒤 보내 주세요.',
      svConfirmQ: function (n, who) { return who + ' ' + n + '명에게 설문을 보낼까요?'; }, svConfirmNote: '카카오톡 알림톡으로 보내요. 카카오톡을 받을 수 없는 번호는 문자로 대신 갈 수 있어요. 같은 번호에는 이 설문을 다시 보내지 않아요. 보내면 되돌릴 수 없어요.',
      svResult: function (s, f, k) { return '보냈어요 ' + s + '명' + (f ? ' · 실패 ' + f + '명(나중에 다시 보낼 수 있어요)' : '') + (k ? ' · 이미 보내서 건너뜀 ' + k + '명' : '') + '.'; }, svMore: function (n) { return '남은 ' + n + '명에게 이어서 보내기'; }, svCapOver: function (n, c) { return '받는 사람(' + n + '명)이 오늘 더 보낼 수 있는 수(' + c + '통)보다 많아서 보낼 수 없어요. 내일 다시 하거나 받는 사람을 줄여 주세요.'; },
      svPickChurch: '보낼 교회·학교를 골라 주세요', svPickAll: '전체 선택', svPickNone: '선택 해제', svPickNo: '연락처 화면에 번호가 있는 교회·학교가 없어요.', svAlready: '이미 보냄', svReady: '알림톡 준비됨', svNotReady: '알림톡 준비 안 됨',
      svProblemCopy: '링크는 복사해서 직접 전해 주세요.' },
    en: { svIntro: 'An evaluation survey you send after camp to staff, students, parents and churches. Click a question to edit it, like Google Forms. It asks for no name or contact; only camp managers see results.', svNew: '+ New survey', svNone: 'No surveys yet.',
      svWho: 'Who is this survey for?', svWhoHint: 'Your choice adds a fitting set of starter questions. You can edit or delete them freely.', svFromTpl: 'Start from a saved template', svTplQs: function (n) { return n + ' questions'; },
      aStaff: 'Staff', aStaffD: 'Staff and crew who served', aStudent: 'Students (campers)', aStudentD: 'Students who joined camp', aParent: 'Parents', aParentD: 'Guardians of students', aChurch: 'Churches / schools', aChurchD: 'Churches and schools that sent students', aOther: 'Other (link only)', aOtherD: 'Copy the link and share it yourself',
      svBuildNew: 'New survey', svBuildEdit: 'Edit survey', svHeadTitle: 'Survey title', svHeadDesc: 'Survey description (optional)', svKo: 'Korean', svEn: 'English', svAudience: 'For', svUntitled: '(Untitled)', svNoText: 'Write the question', svQText: 'Question', svDescL: 'Description (optional)', svHeading: 'Title and description',
      svTShort: 'Short answer', svTPara: 'Paragraph', svTChoice: 'Multiple choice (pick one)', svTCheck: 'Checkboxes (pick many)', svTDrop: 'Dropdown', svTScale: 'Linear scale (1-5 / 1-10)', svTStar: 'Star rating (1-5)',
      svReq: 'Required', svDup: 'Duplicate question', svUp: 'Move up', svDown: 'Move down', svDelQ: 'Delete question', svAddOpt: '+ Add option', svAddOther: '+ Add "Other (write in)"', svOther: 'Other (write in)', svOptN: function (n) { return 'Option ' + n; }, svRemove: 'Remove',
      svScaleMax: 'Range', svScale5: '1 to 5', svScale10: '1 to 10', svLow: 'Label for the low end (optional)', svHigh: 'Label for the high end (optional)', svStarHint: 'Respondents tap 1 to 5 stars.', svTextHint: 'Respondents type an answer.',
      svAddQ: '+ Add question', svAddH: '+ Title and description', svTplLoad: 'Load template', svTplSave: 'Save as template', svPreview: 'Preview', svAi: '✨ Fill English with AI', svAiHint: 'AI fills empty English boxes (or Korean ones, if only English was typed). Only the survey wording is sent to AI, never names or contact details.',
      svAiSends: 'only the survey wording goes to AI', svAiNone: 'Nothing to fill (it looks for boxes that have Korean but no English).', svAiBusy: 'AI is filling…', svAiDone: function (n, s) { return 'Filled ' + n + ' boxes. Please read and fix them.' + (s ? ' (' + s + ' boxes that look like contact details were skipped.)' : ''); },
      svBack: '← Back to editing', svPvNote: 'This is what respondents see (you cannot answer here).', svCloseConfirm: 'You have unsaved changes. Close anyway?',
      svErrTitle: 'Please write a survey title.', svErrNoQ: 'Add at least one question.', svErrText: function (n) { return 'Please write the text of question ' + n + '.'; }, svErrOpt: function (n, min) { return 'Question ' + n + ' needs at least ' + min + ' options.'; }, svSaving: 'Saving…',
      svTplTitle: 'Load a template', svTplMine: 'Templates saved by our team', svTplMineNone: 'No saved templates yet. After building a survey, press "Save as template" and it will appear here.', svTplStart: 'Built-in starter questions', svReplace: 'Replace', svAppend: 'Add after', svTplReplaceConfirm: 'Your current questions will be replaced by this template. Continue?', svTplDelConfirm: 'Delete this template? (Surveys are not affected.)',
      svTplSaveTitle: 'Save as template', svTplName: 'Template name', svTplNameHint: 'e.g. 2027 Winter camp student evaluation', svTplSaved: 'Saved. You can use it next time from "Load template".', svTplNeed: 'Add questions first.',
      svQs: function (n) { return n + ' questions'; }, svSent: function (n) { return 'Sent to ' + n; }, svOpen: 'Open', svClosed: 'Closed', svSend: 'Send survey', svRes: 'View results', svEdit: 'Edit', svLinkOn: 'Turn link on', svLinkOff: 'Turn link off', svCloseS: 'Close survey', svReopen: 'Reopen', svDel: 'Delete', svCopy: 'Copy link', svCopied: 'Copied.',
      svLinkNote: 'Anyone with the link can answer. Turn the link off when you no longer need it.', svDelConfirm: 'Delete this survey? (Answers are kept but it disappears from the list.)',
      svAvg: 'Average', svNoAns: 'No answers yet.', svAnswered: function (n) { return n + ' answered'; }, svResTitle: 'Survey results', svOtherL: 'Other',
      svSendTitle: 'Send survey', svSendIntro: 'Sends the survey link by KakaoTalk notice. You check the recipients first and confirm once more before anything is sent. Nothing is sent from this check screen.', svChecking: 'Checking recipients…',
      svNTotal: 'Recipients', svNAlready: 'Already sent', svNInvalid: 'No number / invalid', svNDupes: 'Same number', svNCap: 'Can still send today', svNWill: 'To send now', svSample: 'Sample (names and numbers are masked)', svNoSample: 'Nobody to show.',
      svNext: function (n) { return 'Next: send to ' + n; }, svGoBack: 'Go back', svDoSend: function (n) { return 'Send to ' + n; }, svSending: 'Sending…', svLinkOffMsg: 'This survey link is off or the survey is closed. Turn the link on and make sure the survey is open, then send.',
      svConfirmQ: function (n, who) { return 'Send the survey to ' + n + ' (' + who + ')?'; }, svConfirmNote: 'It is sent as a KakaoTalk notice. Numbers that cannot receive KakaoTalk may get a text message instead. A number never gets the same survey twice. This cannot be undone.',
      svResult: function (s, f, k) { return 'Sent to ' + s + (f ? ' · failed ' + f + ' (you can retry later)' : '') + (k ? ' · skipped as already sent ' + k : '') + '.'; }, svMore: function (n) { return 'Continue with the remaining ' + n; }, svCapOver: function (n, c) { return 'There are ' + n + ' recipients but only ' + c + ' more messages can go out today. Try again tomorrow or reduce the recipients.'; },
      svPickChurch: 'Pick the churches and schools to send to', svPickAll: 'Select all', svPickNone: 'Clear', svPickNo: 'No church or school in Contacts has a phone number.', svAlready: 'Already sent', svReady: 'KakaoTalk ready', svNotReady: 'KakaoTalk not ready',
      svProblemCopy: 'Copy the link and share it yourself.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = P.esc, S = P.S, api = P.api, t = function (k) { return CT.t(k); }, en = function () { return CT.lang() === 'en'; };
  var AUD = [['student', '🧑‍🎓', 'aStudent', 'aStudentD'], ['parent', '👪', 'aParent', 'aParentD'], ['staff', '🙋', 'aStaff', 'aStaffD'], ['church', '⛪', 'aChurch', 'aChurchD'], ['other', '🔗', 'aOther', 'aOtherD']], AUDL = { student: 'aStudent', parent: 'aParent', staff: 'aStaff', church: 'aChurch', other: 'aOther' };
  var TYPES = [['short', 'svTShort'], ['paragraph', 'svTPara'], ['choice', 'svTChoice'], ['checkbox', 'svTCheck'], ['dropdown', 'svTDrop'], ['scale', 'svTScale'], ['rating', 'svTStar']], PICK = { choice: 1, checkbox: 1, dropdown: 1 }, TXT = { short: 1, paragraph: 1, text: 1 };
  var V = [], TPL = null, B = null, KC = 0;
  var pick = function (ko, e) { return en() && e ? e : (ko || e || ''); };

  /* ---------- 큰 창 두 개: d1 = 설문 만들기, d2 = 대상 고르기·템플릿·보내기·결과 (페이지가 열릴 때 한 번 만든다 — 팝업 공통 처리(✕·저장 안 한 변경 확인)가 이 창에도 붙는다) ---------- */
  function mkDlg(id, cls) { var d = $(id); if (d) return d; d = document.createElement('dialog'); d.id = id; d.className = 'sv-dlg ' + cls; d.innerHTML = '<div class="sv-root" id="' + id + 'R"></div>'; document.body.appendChild(d); return d; }
  var d1 = mkDlg('svDlg', ''), d2 = mkDlg('svDlg2', 'sv-small'), r1 = $('svDlgR'), r2 = $('svDlg2R');
  var touch = function () { d1._touched = true; };
  var openD2 = function (h, big) { r2.innerHTML = h; d2.classList.toggle('sv-small', !big); if (!d2.open) d2.showModal(); };
  var closeD2 = function () { if (d2.open) d2.close(); };

  /* ---------- 공통 도우미 ---------- */
  function copyText(text, btn) { return (async function () { try { await navigator.clipboard.writeText(text); } catch (x) { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); } if (btn) { var o = btn.textContent; btn.textContent = t('svCopied'); setTimeout(function () { btn.textContent = o; }, 1800); } })(); }
  function normQ(q, keepId) {
    var o = JSON.parse(JSON.stringify(q)); o._k = keepId && o.id ? o.id : 'k' + (++KC); if (!keepId) delete o.id; if (o.type === 'text') o.type = 'paragraph';
    o.ko = o.ko || ''; o.en = o.en || ''; if (PICK[o.type]) { o.options = (o.options || []).map(function (x) { return { ko: x.ko || '', en: x.en || '' }; }); } if (o.type === 'scale') o.max = o.max === 10 ? 10 : 5; return o;
  }
  function newQ(type) {
    var q = { _k: 'k' + (++KC), type: type, ko: '', en: '', required: false };
    if (PICK[type]) q.options = [{ ko: '', en: '' }, { ko: '', en: '' }]; if (type === 'scale') q.max = 5; return q;
  }
  var minOpts = function (type) { return type === 'checkbox' ? 1 : 2; };
  var qNum = function (i) { return B.qs.slice(0, i + 1).filter(function (x) { return x.type !== 'heading'; }).length; };

  /* ---------- 질문이 답하는 사람에게 보이는 모양 (카드 안 미리보기와 「미리보기」 화면이 같이 쓴다) ---------- */
  function respHtml(q, lg) {
    var L = function (ko, e) { return lg === 'en' && e ? e : (ko || e || ''); }, title = L(q.ko, q.en);
    if (q.type === 'heading') return '<div class="sv-t">' + esc(title || t('svNoText')) + (q.descKo || q.descEn ? '<small>' + esc(L(q.descKo, q.descEn)) + '</small>' : '') + '</div>';
    var h = '<div class="sv-t">' + esc(title || t('svNoText')) + (q.required ? '<em>*</em>' : '') + '</div><div class="sv-r">';
    if (q.type === 'short') h += '<div class="ln">' + esc(lg === 'en' ? 'Your answer' : '내 답') + '</div>';
    else if (q.type === 'paragraph' || q.type === 'text') h += '<div class="ln tall">' + esc(lg === 'en' ? 'Your answer' : '내 답') + '</div>';
    else if (q.type === 'choice' || q.type === 'checkbox') {
      h += (q.options || []).map(function (o, i) { return '<div class="o"><span class="mk' + (q.type === 'checkbox' ? ' sq' : '') + '"></span><span>' + esc(L(o.ko, o.en) || t('svOptN')(i + 1)) + '</span></div>'; }).join('');
      if (q.other) h += '<div class="o"><span class="mk' + (q.type === 'checkbox' ? ' sq' : '') + '"></span><span>' + esc(lg === 'en' ? 'Other:' : '기타:') + '</span></div>';
    }
    else if (q.type === 'dropdown') h += '<div class="dd">' + esc(lg === 'en' ? 'Choose ▾' : '선택 ▾') + '</div>' + (q.options || []).slice(0, 3).map(function (o, i) { return '<div class="o"><span style="color:var(--mid);font-size:12.5px">' + (i + 1) + '. ' + esc(L(o.ko, o.en) || t('svOptN')(i + 1)) + '</span></div>'; }).join('');
    else if (q.type === 'rating') h += '<div class="stars">★★★★★</div>';
    else if (q.type === 'scale') {
      var mx = q.max === 10 ? 10 : 5; h += '<div class="sc">' + Array.apply(null, Array(mx)).map(function (_, i) { return '<span>' + (i + 1) + '<i></i></span>'; }).join('') + '</div>';
      var lo = L(q.lowKo, q.lowEn), hi = L(q.highKo, q.highEn); if (lo || hi) h += '<div class="ends"><span>' + esc(lo) + '</span><span>' + esc(hi) + '</span></div>';
    }
    return h + '</div>';
  }

  /* ---------- 만들기 화면 ---------- */
  var pair = function (obj, kf, ef, attr, area, label) {
    var tag = area ? 'textarea' : 'input', cell = function (f, lab) { var v = obj[f] == null ? '' : obj[f]; return '<div><label>' + esc(t(lab)) + (label ? ' · ' + esc(t(label)) : '') + '</label><' + tag + ' data-f="' + f + '"' + attr + (area ? ' rows="2" maxlength="500">' + esc(v) + '</textarea>' : ' type="text" maxlength="200" value="' + esc(v) + '">') + '</div>'; };
    return '<div class="sv-pair">' + cell(kf, 'svKo') + cell(ef, 'svEn') + '</div>';
  };
  function headHtml() {
    if (B.active !== 'head') return '<div class="sv-card head" data-card="head"><div class="sv-t">' + esc(pick(B.title, B.titleEn) || t('svUntitled')) + '</div>' + (B.desc || B.descEn ? '<div class="sv-t"><small>' + esc(pick(B.desc, B.descEn)) + '</small></div>' : '') + '<span class="chip">' + esc(t(AUDL[B.audience] || 'aOther')) + '</span></div>';
    return '<div class="sv-card head on" data-card="head">' + pair(B, 'title', 'titleEn', '', false, 'svHeadTitle') + pair(B, 'desc', 'descEn', '', true, 'svHeadDesc') +
      '<div class="sv-typerow"><label style="font-size:12px;color:var(--mid);font-weight:600">' + esc(t('svAudience')) + '</label><select class="sv-sel" data-f="audience">' + AUD.map(function (a) { return '<option value="' + a[0] + '"' + (B.audience === a[0] ? ' selected' : '') + '>' + esc(t(a[2])) + '</option>'; }).join('') + '</select></div></div>';
  }
  function optHtml(q) {
    var k = ' data-k="' + esc(q._k) + '"', mk = '<span class="mk' + (q.type === 'checkbox' ? ' sq' : '') + '"></span>';
    var h = (q.options || []).map(function (o, i) { return '<div class="sv-opt">' + (q.type === 'dropdown' ? '<b style="font-size:12px;color:var(--mid)">' + (i + 1) + '</b>' : mk) + '<input class="ko" data-f="ko"' + k + ' data-o="' + i + '" maxlength="80" placeholder="' + esc(t('svOptN')(i + 1) + ' · ' + t('svKo')) + '" value="' + esc(o.ko) + '"><input class="en" data-f="en"' + k + ' data-o="' + i + '" maxlength="80" placeholder="' + esc(t('svOptN')(i + 1) + ' · ' + t('svEn')) + '" value="' + esc(o.en) + '"><button type="button" class="sv-x" data-a="rmopt" data-i="' + i + '"' + k + ' title="' + esc(t('svRemove')) + '" aria-label="' + esc(t('svRemove')) + '"' + ((q.options || []).length <= 1 ? ' disabled' : '') + '>✕</button></div>'; }).join('');
    if (q.other) h += '<div class="sv-opt">' + mk + '<span style="grid-column:2 / 4;color:var(--mid);font-size:13.5px">' + esc(t('svOther')) + '</span><button type="button" class="sv-x" data-a="rmother"' + k + ' title="' + esc(t('svRemove')) + '" aria-label="' + esc(t('svRemove')) + '">✕</button></div>';
    return h + '<div class="sv-addrow"><button type="button" class="sv-link" data-a="addopt"' + k + '>' + esc(t('svAddOpt')) + '</button>' + (q.type !== 'dropdown' && !q.other ? '<button type="button" class="sv-link" data-a="addother"' + k + '>' + esc(t('svAddOther')) + '</button>' : '') + '</div>';
  }
  function qEdit(q, i) {
    var k = ' data-k="' + esc(q._k) + '"', h;
    if (q.type === 'heading') h = '<div class="sv-t" style="color:var(--mid);font-size:12.5px">' + esc(t('svHeading')) + '</div>' + pair(q, 'ko', 'en', k, false, 'svHeadTitle') + pair(q, 'descKo', 'descEn', k, true, 'svDescL');
    else {
      h = pair(q, 'ko', 'en', k, false, 'svQText') + '<div class="sv-typerow"><select class="sv-sel" data-f="type"' + k + '>' + TYPES.map(function (x) { return '<option value="' + x[0] + '"' + (q.type === x[0] ? ' selected' : '') + '>' + esc(t(x[1])) + '</option>'; }).join('') + '</select></div>';
      if (PICK[q.type]) h += optHtml(q);
      else if (q.type === 'scale') {
        h += '<div class="sv-typerow"><label style="font-size:12px;color:var(--mid);font-weight:600">' + esc(t('svScaleMax')) + '</label><select class="sv-sel" data-f="max"' + k + ' style="max-width:140px"><option value="5"' + (q.max === 5 ? ' selected' : '') + '>' + esc(t('svScale5')) + '</option><option value="10"' + (q.max === 10 ? ' selected' : '') + '>' + esc(t('svScale10')) + '</option></select></div>' +
          '<div class="sv-scale"><b>1</b><input class="ko" data-f="lowKo"' + k + ' maxlength="40" placeholder="' + esc(t('svLow') + ' · ' + t('svKo')) + '" value="' + esc(q.lowKo || '') + '"><input class="en" data-f="lowEn"' + k + ' maxlength="40" placeholder="' + esc(t('svLow') + ' · ' + t('svEn')) + '" value="' + esc(q.lowEn || '') + '"></div>' +
          '<div class="sv-scale"><b>' + q.max + '</b><input class="ko" data-f="highKo"' + k + ' maxlength="40" placeholder="' + esc(t('svHigh') + ' · ' + t('svKo')) + '" value="' + esc(q.highKo || '') + '"><input class="en" data-f="highEn"' + k + ' maxlength="40" placeholder="' + esc(t('svHigh') + ' · ' + t('svEn')) + '" value="' + esc(q.highEn || '') + '"></div>';
      }
      else if (q.type === 'rating') h += '<div class="sv-r"><div class="stars">★★★★★</div></div><p class="sv-hint">' + esc(t('svStarHint')) + '</p>';
      else h += '<p class="sv-hint">' + esc(t('svTextHint')) + '</p>';
    }
    var ib = function (a, ic, lab, dis) { return '<button type="button" class="sv-ib' + (a === 'del' ? ' del' : '') + '" data-a="' + a + '"' + k + ' title="' + esc(t(lab)) + '" aria-label="' + esc(t(lab)) + '"' + (dis ? ' disabled' : '') + '>' + ic + '</button>'; };
    return h + '<div class="sv-foot">' + (q.type === 'heading' ? '' : '<label class="sv-sw"><input type="checkbox" data-f="required"' + k + (q.required ? ' checked' : '') + '><i></i>' + esc(t('svReq')) + '</label>') + ib('dup', '⧉', 'svDup') + ib('up', '↑', 'svUp', i === 0) + ib('down', '↓', 'svDown', i === B.qs.length - 1) + ib('del', '🗑', 'svDelQ') + '</div>';
  }
  function editHtml() {
    return headHtml() + B.qs.map(function (q, i) {
      var on = B.active === q._k, cls = 'sv-card' + (on ? ' on' : '') + (B.bad === q._k ? ' bad' : '');
      return '<div class="' + cls + '" data-card="' + esc(q._k) + '">' + (on ? qEdit(q, i) : respHtml(q, CT.lang())) + '</div>';
    }).join('');
  }
  function previewHtml() {
    var lg = B.plang || CT.lang();
    return '<div class="sv-pv-top"><button type="button" class="btn" data-a="unpreview">' + esc(t('svBack')) + '</button><button type="button" class="tab' + (lg === 'ko' ? ' on' : '') + '" data-a="plang" data-v="ko">한국어</button><button type="button" class="tab' + (lg === 'en' ? ' on' : '') + '" data-a="plang" data-v="en">English</button></div><p class="sv-hint">' + esc(t('svPvNote')) + '</p>' +
      '<div class="sv-card head"><div class="sv-t">' + esc(pick2(lg, B.title, B.titleEn) || t('svUntitled')) + '</div>' + (B.desc || B.descEn ? '<div class="sv-t"><small>' + esc(pick2(lg, B.desc, B.descEn)) + '</small></div>' : '') + '</div>' +
      B.qs.map(function (q) { return '<div class="sv-card">' + respHtml(q, lg) + '</div>'; }).join('');
  }
  var pick2 = function (lg, ko, e) { return lg === 'en' && e ? e : (ko || e || ''); };
  function bRender(focusKey) {
    var sc = d1.scrollTop, msg = $('svMsg') ? $('svMsg').textContent : '', msgErr = $('svMsg') ? $('svMsg').className : 'sv-msg grow';
    var tools = B.mode === 'preview' ? '' : '<div class="sv-bar-tools"><div class="row"><button type="button" class="btn pri" data-a="addq">' + esc(t('svAddQ')) + '</button><button type="button" class="btn" data-a="addh">' + esc(t('svAddH')) + '</button><button type="button" class="btn" data-a="tplload">' + esc(t('svTplLoad')) + '</button><button type="button" class="btn" data-a="tplsave">' + esc(t('svTplSave')) + '</button><button type="button" class="btn" data-a="preview">' + esc(t('svPreview')) + '</button><button type="button" class="btn" data-a="ai" title="' + esc(t('svAiHint')) + '">' + esc(t('svAi')) + '</button></div><div class="row" style="margin-top:8px"><div class="sv-msg grow" id="svMsg" role="status"></div><button type="button" class="btn" data-a="close">' + esc(t('close')) + '</button><button type="submit" class="btn pri" id="svSave">' + esc(t('save')) + '</button></div></div>';
    r1.innerHTML = '<form id="svForm" novalidate><h3>' + esc(t(B.id ? 'svBuildEdit' : 'svBuildNew')) + '</h3>' + (B.mode === 'preview' ? previewHtml() : editHtml()) + tools + '</form>';
    d1.scrollTop = sc; if ($('svMsg')) { $('svMsg').textContent = msg; $('svMsg').className = msgErr; }
    if (focusKey) { var el = r1.querySelector('[data-card="' + focusKey + '"]'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  }
  var say = function (m, err) { var e = $('svMsg'); if (e) { e.textContent = m || ''; e.className = 'sv-msg grow' + (err ? ' err' : ''); } };
  function openBuilder(init) { B = Object.assign({ id: '', audience: 'other', title: '', titleEn: '', desc: '', descEn: '', qs: [], active: 'head', mode: 'edit', plang: '' }, init); if (!d1.open) d1.showModal(); bRender(); }
  function fromStarter(aud, st) { return { audience: aud, title: st.title, titleEn: st.titleEn, desc: st.description || '', descEn: st.descriptionEn || '', qs: st.questions.map(function (q) { return normQ(q, false); }), active: 'head' }; }
  async function loadTpl() { if (!TPL) TPL = await CT.api('/api/campteam/survey-templates'); return TPL; }
  function byK(k) { for (var i = 0; i < B.qs.length; i++) if (B.qs[i]._k === k) return i; return -1; }
  function pairs() {
    var out = [], add = function (o, kf, ef) { out.push({ get: function (s) { return String((s === 'ko' ? o[kf] : o[ef]) || '').trim(); }, set: function (s, v) { o[s === 'ko' ? kf : ef] = v; } }); };
    add(B, 'title', 'titleEn'); add(B, 'desc', 'descEn');
    B.qs.forEach(function (q) { add(q, 'ko', 'en'); if (q.type === 'heading') add(q, 'descKo', 'descEn'); (q.options || []).forEach(function (o) { add(o, 'ko', 'en'); }); if (q.type === 'scale') { add(q, 'lowKo', 'lowEn'); add(q, 'highKo', 'highEn'); } });
    return out;
  }
  function bValidate() {
    if (!(B.title || B.titleEn).trim()) return { msg: t('svErrTitle'), k: 'head' };
    if (!B.qs.some(function (q) { return q.type !== 'heading'; })) return { msg: t('svErrNoQ') };
    for (var i = 0; i < B.qs.length; i++) {
      var q = B.qs[i]; if (q.type === 'heading') { if (!(q.ko || q.en || q.descKo || q.descEn).trim()) return { msg: t('svErrText')(i + 1), k: q._k }; continue; }
      var n = qNum(i); if (!(q.ko || q.en).trim()) return { msg: t('svErrText')(n), k: q._k };
      if (PICK[q.type]) { var c = (q.options || []).filter(function (o) { return (o.ko || o.en).trim(); }).length + (q.other ? 1 : 0); if (c < minOpts(q.type)) return { msg: t('svErrOpt')(n, minOpts(q.type)), k: q._k }; }
    }
    return null;
  }
  function payloadQs() { return B.qs.map(function (q) { var o = JSON.parse(JSON.stringify(q)); delete o._k; return o; }); }
  async function bSave() {
    B.bad = ''; var v = bValidate(); if (v) { B.bad = v.k || ''; if (v.k) B.active = v.k; bRender(v.k); say(v.msg, true); return; }
    var btn = $('svSave'); btn.disabled = true; say(t('svSaving'));
    var body = { title: B.title.trim(), titleEn: B.titleEn.trim(), description: B.desc.trim(), descriptionEn: B.descEn.trim(), audience: B.audience, questions: payloadQs() };
    try { if (B.id) await api('/api/campteam/surveys?id=' + encodeURIComponent(B.id), 'PATCH', body); else { body.campId = S.campId; await api('/api/campteam/surveys', 'POST', body); } d1.close(); await vLoad(); }
    catch (e) { say(e.message, true); btn.disabled = false; }
  }
  async function bAi() {
    var ps = pairs(), todo = [], map = {};
    ps.forEach(function (p, i) { var ko = p.get('ko'), e = p.get('en'); if (ko && !e) { todo.push({ key: 'p' + i, from: ko, lang: 'en' }); map['p' + i] = 'en'; } else if (e && !ko) { todo.push({ key: 'p' + i, from: e, lang: 'ko' }); map['p' + i] = 'ko'; } });
    if (!todo.length) return say(t('svAiNone'));
    say(t('svAiBusy') + ' (' + t('svAiSends') + ')'); try { var r = await api('/api/campteam/survey-ai', 'POST', { items: todo }), n = 0; Object.keys(r.fills || {}).forEach(function (k) { ps[+k.slice(1)].set(map[k], r.fills[k]); n++; }); touch(); bRender(); say(t('svAiDone')(n, (r.skipped || []).length)); }
    catch (e) { say(e.message, true); }
  }
  /* 템플릿 */
  function applyQs(list, mode) {
    var qs = list.map(function (q) { return normQ(q, false); });
    if (mode === 'replace') B.qs = qs; else B.qs = B.qs.concat(qs);
    B.active = qs.length ? qs[0]._k : B.active; touch(); closeD2(); bRender(B.active);
  }
  async function tplLoadDlg() {
    openD2('<h3>' + esc(t('svTplTitle')) + '</h3><p class="sv-hint">…</p>', true);
    try { await loadTpl(); } catch (e) { r2.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; return; }
    var card = function (kind, id, name, sub, del) { return '<div class="sv-tpl"><span class="grow"><b>' + esc(name) + '</b><small>' + esc(sub) + '</small></span><button type="button" class="btn sm" data-ta="replace" data-kind="' + kind + '" data-id="' + esc(id) + '">' + esc(t('svReplace')) + '</button><button type="button" class="btn sm" data-ta="append" data-kind="' + kind + '" data-id="' + esc(id) + '">' + esc(t('svAppend')) + '</button>' + (del ? '<button type="button" class="btn sm danger" data-ta="del" data-id="' + esc(id) + '">' + esc(t('svDel')) + '</button>' : '') + '</div>'; };
    var order = [B.audience].concat(AUD.map(function (a) { return a[0]; }).filter(function (a) { return a !== B.audience; }));
    r2.innerHTML = '<h3>' + esc(t('svTplTitle')) + '</h3><h4>' + esc(t('svTplMine')) + '</h4>' + (TPL.items.length ? TPL.items.map(function (x) { return card('mine', x.id, x.name, t(AUDL[x.audience] || 'aOther') + ' · ' + t('svTplQs')(x.questions.length), true); }).join('') : '<p class="sv-hint">' + esc(t('svTplMineNone')) + '</p>') +
      '<h4>' + esc(t('svTplStart')) + '</h4>' + order.map(function (a) { var st = TPL.starters[a]; return st ? card('starter', a, (en() ? st.titleEn : st.title) || st.title, t(AUDL[a]) + ' · ' + t('svTplQs')(st.questions.length), false) : ''; }).join('') +
      '<div class="dlg-actions"><button type="button" class="btn" data-ta="x">' + esc(t('close')) + '</button></div>';
  }
  function tplSaveDlg() {
    if (!B.qs.some(function (q) { return q.type !== 'heading' && (q.ko || q.en).trim(); })) return say(t('svTplNeed'), true);
    openD2('<h3>' + esc(t('svTplSaveTitle')) + '</h3><label>' + esc(t('svTplName')) + '<input id="tplName" maxlength="80" placeholder="' + esc(t('svTplNameHint')) + '" value="' + esc(pick(B.title, B.titleEn)) + '"></label><label>' + esc(t('svAudience')) + '<select id="tplAud">' + AUD.map(function (a) { return '<option value="' + a[0] + '"' + (B.audience === a[0] ? ' selected' : '') + '>' + esc(t(a[2])) + '</option>'; }).join('') + '</select></label><div class="err" id="tplErr" hidden></div><div class="dlg-actions"><button type="button" class="btn" data-ta="x">' + esc(t('cancel')) + '</button><button type="button" class="btn pri" data-ta="savetpl">' + esc(t('save')) + '</button></div>', false);
  }
  async function d2Handle(e) {
    var a = e.target.closest('[data-ta]'); if (!a) return; var act = a.dataset.ta;
    try {
      if (act === 'x') return closeD2();
      if (act === 'savetpl') { var name = $('tplName').value.trim(); if (!name) { $('tplErr').hidden = false; $('tplErr').textContent = t('svTplName'); return; } await api('/api/campteam/survey-templates', 'POST', { name: name, audience: $('tplAud').value, questions: payloadQs() }); TPL = null; closeD2(); say(t('svTplSaved')); return; }
      if (act === 'del') { if (!confirm(t('svTplDelConfirm'))) return; await CT.api('/api/campteam/survey-templates?id=' + encodeURIComponent(a.dataset.id), { method: 'DELETE' }); TPL = null; return tplLoadDlg(); }
      if (act === 'replace' || act === 'append') {
        var list = a.dataset.kind === 'mine' ? (TPL.items.filter(function (x) { return x.id === a.dataset.id; })[0] || {}).questions : (TPL.starters[a.dataset.id] || {}).questions; if (!list) return;
        if (act === 'replace' && B.qs.length && !confirm(t('svTplReplaceConfirm'))) return;
        if (a.dataset.kind === 'starter' && act === 'replace') { var st = TPL.starters[a.dataset.id]; if (!B.title && !B.titleEn) { B.title = st.title; B.titleEn = st.titleEn; } if (!B.desc && !B.descEn) { B.desc = st.description || ''; B.descEn = st.descriptionEn || ''; } }
        applyQs(list, act);
      }
    } catch (er) { alert(er.message); }
  }
  /* 만들기 창 이벤트 */
  r1.addEventListener('click', function (e) {
    var a = e.target.closest('[data-a]'), k = a && a.dataset.k, i = k ? byK(k) : -1, act = a && a.dataset.a;
    if (!a) { var c = e.target.closest('[data-card]'); if (c && B.mode === 'edit' && c.dataset.card !== B.active) { B.active = c.dataset.card; bRender(); } return; }
    if (act === 'close') return CT.tryClose ? CT.tryClose(d1) : d1.close();
    if (act === 'preview') { B.mode = 'preview'; B.plang = CT.lang(); return bRender(); }
    if (act === 'unpreview') { B.mode = 'edit'; return bRender(); }
    if (act === 'plang') { B.plang = a.dataset.v; return bRender(); }
    if (act === 'tplload') return tplLoadDlg();
    if (act === 'tplsave') return tplSaveDlg();
    if (act === 'ai') return bAi();
    if (act === 'addq' || act === 'addh') {
      var q = act === 'addq' ? newQ('short') : { _k: 'k' + (++KC), type: 'heading', ko: '', en: '', descKo: '', descEn: '' }, at = B.active === 'head' ? B.qs.length : byK(B.active) + 1; B.qs.splice(at, 0, q); B.active = q._k; touch(); return bRender(q._k);
    }
    if (i < 0) return;
    var q2 = B.qs[i];
    if (act === 'del') { B.qs.splice(i, 1); B.active = B.qs[Math.min(i, B.qs.length - 1)] ? B.qs[Math.min(i, B.qs.length - 1)]._k : 'head'; }
    else if (act === 'dup') { var cp = normQ(q2, false); B.qs.splice(i + 1, 0, cp); B.active = cp._k; }
    else if (act === 'up' && i > 0) { B.qs.splice(i - 1, 0, B.qs.splice(i, 1)[0]); }
    else if (act === 'down' && i < B.qs.length - 1) { B.qs.splice(i + 1, 0, B.qs.splice(i, 1)[0]); }
    else if (act === 'addopt') { q2.options.push({ ko: '', en: '' }); }
    else if (act === 'addother') { q2.other = true; }
    else if (act === 'rmother') { q2.other = false; }
    else if (act === 'rmopt') { if (q2.options.length > 1) q2.options.splice(+a.dataset.i, 1); }
    touch(); bRender(act === 'addopt' ? '' : B.active);
  });
  r1.addEventListener('input', function (e) {
    var el = e.target, f = el.dataset && el.dataset.f; if (!f || el.type === 'checkbox' || el.tagName === 'SELECT') return;
    if (el.dataset.k) { var q = B.qs[byK(el.dataset.k)]; if (!q) return; if (el.dataset.o != null) q.options[+el.dataset.o][f] = el.value; else q[f] = el.value; } else B[f] = el.value;
    B.bad = '';
  });
  r1.addEventListener('change', function (e) {
    var el = e.target, f = el.dataset && el.dataset.f; if (!f) return;
    if (!el.dataset.k) { if (f === 'audience') B.audience = el.value; return; }
    var q = B.qs[byK(el.dataset.k)]; if (!q) return;
    if (f === 'required') { q.required = el.checked; return; }
    if (f === 'max') { q.max = +el.value === 10 ? 10 : 5; touch(); return bRender(); }
    if (f === 'type') { q.type = el.value; if (PICK[q.type]) { if (!q.options || !q.options.length) q.options = [{ ko: '', en: '' }, { ko: '', en: '' }]; if (q.type === 'dropdown') q.other = false; } if (q.type === 'scale') q.max = q.max === 10 ? 10 : 5; touch(); bRender(); }
  });
  r1.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'checkbox') e.preventDefault(); });   // 칸에서 엔터를 쳐도 저장되지 않게
  r1.addEventListener('submit', function (e) { e.preventDefault(); if (B && B.mode === 'edit') bSave(); });
  r2.addEventListener('click', d2Handle);

  /* ---------- 결과 ---------- */
  function resultHtml(r) {
    if (!r.responses) return '<p class="sv-hint">' + esc(t('svNoAns')) + '</p>';
    var bars = function (rows, total) { return '<div class="sv-bars">' + rows.map(function (x) { var pc = total ? Math.round(x.n / total * 100) : 0; return '<div class="b"><span title="' + esc(x.l) + '">' + esc(x.l) + '</span><span class="t"><i style="width:' + pc + '%"></i></span><em>' + x.n + ' · ' + pc + '%</em></div>'; }).join('') + '</div>'; };
    return '<p><b>' + esc(t('vResp')(r.responses)) + '</b></p>' + r.summary.map(function (q) {
      var h = '<div class="sv-res"><h4>' + esc(pick(q.ko, q.en)) + ' <small>(' + esc(t('svAnswered')(q.n)) + ')</small></h4>';
      if (q.type === 'rating' || q.type === 'scale') h += '<div><span class="sv-avg">' + (q.avg == null ? '—' : q.avg) + '</span><small>' + esc(t('svAvg')) + ' / ' + (q.dist ? q.dist.length : 5) + '</small></div>' + bars(q.dist.map(function (n, i) { return { l: (i + 1) + (q.type === 'rating' ? '★' : ''), n: n }; }), q.n);
      else if (q.options) { h += bars(q.options.map(function (o) { return { l: pick(o.ko, o.en), n: o.n }; }).concat(q.others ? [{ l: t('svOtherL'), n: q.otherN || 0 }] : []), q.n); if (q.others && q.others.length) h += '<ul class="sv-texts">' + q.others.map(function (x) { return '<li>' + esc(t('svOtherL')) + ': ' + esc(x) + '</li>'; }).join('') + '</ul>'; }
      else h += '<ul class="sv-texts">' + (q.texts || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
      return h + '</div>';
    }).join('');
  }
  async function resultsDlg(id) {
    var s = V.filter(function (x) { return x.id === id; })[0]; openD2('<h3>' + esc(t('svResTitle')) + (s ? ' — ' + esc(pick(s.title, s.titleEn)) : '') + '</h3><p class="sv-hint">…</p>', true);
    try { var r = await CT.api('/api/campteam/survey-results?id=' + encodeURIComponent(id)); r2.innerHTML = '<h3>' + esc(t('svResTitle')) + ' — ' + esc(pick(r.survey.title, r.survey.titleEn)) + '</h3>' + resultHtml(r) + '<div class="dlg-actions"><button type="button" class="btn" data-ta="x">' + esc(t('close')) + '</button></div>'; }
    catch (e) { r2.innerHTML = '<div class="err">' + esc(e.message) + '</div><div class="dlg-actions"><button type="button" class="btn" data-ta="x">' + esc(t('close')) + '</button></div>'; }
  }

  /* ---------- 설문 보내기 (두 단계: 받는 사람 확인 → 한 번 더 확인 → 보내기) ---------- */
  var SD = null;   // { s: 설문, pv: 미리보기 결과, ticks: 고른 교회·학교 번호들 }
  var postSend = function (body) { return api('/api/campteam/survey-send?id=' + encodeURIComponent(SD.s.id), 'POST', body); };
  async function sendDlg(id, keepTicks) {
    var s = V.filter(function (x) { return x.id === id; })[0]; if (!s) return;
    SD = { s: s, pv: null, ticks: keepTicks && SD && SD.s.id === id ? SD.ticks : [] };
    openD2('<h3>' + esc(t('svSendTitle')) + ' — ' + esc(pick(s.title, s.titleEn)) + '</h3><p class="sv-hint">' + esc(t('svChecking')) + '</p>', true); await sendPreview();
  }
  async function sendPreview() {
    try { SD.pv = await postSend({ action: 'preview', contactIds: SD.ticks }); sendRender(); } catch (e) { r2.innerHTML = '<div class="err">' + esc(e.message) + '</div><div class="dlg-actions"><button type="button" class="btn" data-ta="x">' + esc(t('close')) + '</button></div>'; }
  }
  function sendRender() {
    var s = SD.s, pv = SD.pv, c = pv.counts, who = t(AUDL[pv.audience] || 'aOther'), can = pv.ready && pv.linkOn && !pv.problem && c.willSend > 0 && c.willSend <= c.capLeft;
    var h = '<h3>' + esc(t('svSendTitle')) + ' — ' + esc(pick(s.title, s.titleEn)) + '</h3><p class="sv-hint">' + esc(t('svSendIntro')) + '</p><p><span class="chip">' + esc(who) + '</span><span class="chip ' + (pv.ready ? 'ok' : 'warn') + '">' + esc(t(pv.ready ? 'svReady' : 'svNotReady')) + '</span></p>';
    if (!pv.ready) h += '<div class="sv-box warn"><b>' + esc(pv.notReady) + '</b></div>';
    if (pv.problem) h += '<div class="sv-box warn"><b>' + esc(pv.problem.message) + '</b></div>';
    if (!pv.linkOn) h += '<div class="sv-box warn"><b>' + esc(t('svLinkOffMsg')) + '</b></div>';
    if (pv.contacts) h += '<div class="sv-box"><b>' + esc(t('svPickChurch')) + '</b> <button type="button" class="sv-link" data-sa="all">' + esc(t('svPickAll')) + '</button><button type="button" class="sv-link" data-sa="none">' + esc(t('svPickNone')) + '</button>' + (pv.contacts.length ? pv.contacts.map(function (x) { return '<label class="sv-pick"><input type="checkbox" data-sc value="' + esc(x.id) + '"' + (SD.ticks.indexOf(x.id) >= 0 ? ' checked' : '') + (x.already ? ' disabled' : '') + '> <span>' + esc(x.name || x.org) + (x.name && x.org ? ' <small>' + esc(x.org) + '</small>' : '') + '</span> <small>' + esc(x.phone) + (x.already ? ' · ' + esc(t('svAlready')) : '') + '</small></label>'; }).join('') : '<p class="sv-hint">' + esc(t('svPickNo')) + '</p>') + '</div>';
    h += '<div class="sv-nums"><div class="big"><strong>' + c.willSend + '</strong><span>' + esc(t('svNWill')) + '</span></div><div><strong>' + c.total + '</strong><span>' + esc(t('svNTotal')) + '</span></div><div><strong>' + c.already + '</strong><span>' + esc(t('svNAlready')) + '</span></div><div><strong>' + c.invalid + '</strong><span>' + esc(t('svNInvalid')) + '</span></div><div><strong>' + c.dupes + '</strong><span>' + esc(t('svNDupes')) + '</span></div><div><strong>' + c.capLeft + '</strong><span>' + esc(t('svNCap')) + '</span></div></div>';
    if (c.willSend > c.capLeft) h += '<div class="sv-box bad"><b>' + esc(t('svCapOver')(c.willSend, c.capLeft)) + '</b></div>';
    if (pv.notes && pv.notes.length) h += '<ul class="p-list">' + pv.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul>';
    h += '<h4>' + esc(t('svSample')) + '</h4><div class="sv-sample">' + (pv.sample.length ? pv.sample.map(function (x) { return esc(x.name) + ' · ' + esc(x.phone); }).join('<br>') : esc(t('svNoSample'))) + '</div>';
    h += '<div class="dlg-actions"><button type="button" class="btn" data-ta="x">' + esc(t('close')) + '</button>' + (s.link ? '<button type="button" class="btn" data-sa="copy">' + esc(t('svCopy')) + '</button>' : '') + '<button type="button" class="btn pri" data-sa="next"' + (can ? '' : ' disabled') + '>' + esc(t('svNext')(c.willSend)) + '</button></div>';
    r2.innerHTML = h;
  }
  function sendConfirm() {
    var pv = SD.pv, n = pv.counts.willSend, who = t(AUDL[pv.audience] || 'aOther');
    r2.innerHTML = '<h3>' + esc(t('svSendTitle')) + '</h3><p class="sv-confirm">' + esc(t('svConfirmQ')(n, who)).replace(String(n), '<strong>' + n + '</strong>') + '</p><div class="sv-box warn">' + esc(t('svConfirmNote')) + '</div><div class="dlg-actions"><button type="button" class="btn" data-sa="back">' + esc(t('svGoBack')) + '</button><button type="button" class="btn pri" data-sa="go">' + esc(t('svDoSend')(n)) + '</button></div>';
  }
  async function sendGo(btn) {
    btn.disabled = true; btn.textContent = t('svSending');
    try {
      var r = await postSend({ action: 'send', confirmCount: SD.pv.counts.willSend, contactIds: SD.ticks }); await vLoad();
      r2.innerHTML = '<h3>' + esc(t('svSendTitle')) + '</h3><div class="sv-box"><b>' + esc(t('svResult')(r.sent, r.failed, r.skipped)) + '</b></div><div class="dlg-actions"><button type="button" class="btn" data-ta="x">' + esc(t('close')) + '</button>' + (r.remaining ? '<button type="button" class="btn pri" data-sa="more">' + esc(t('svMore')(r.remaining)) + '</button>' : '') + '</div>';
    } catch (e) { r2.innerHTML = '<h3>' + esc(t('svSendTitle')) + '</h3><div class="sv-box bad"><b>' + esc(e.message) + '</b></div><div class="dlg-actions"><button type="button" class="btn" data-sa="back">' + esc(t('svGoBack')) + '</button><button type="button" class="btn" data-ta="x">' + esc(t('close')) + '</button></div>'; }
  }
  r2.addEventListener('click', async function (e) {
    var a = e.target.closest('[data-sa]'); if (!a || !SD) return; var act = a.dataset.sa;
    if (act === 'copy') return copyText(SD.s.link, a);
    if (act === 'next') return sendConfirm();
    if (act === 'back' || act === 'more') return sendDlg(SD.s.id, true);
    if (act === 'go') return sendGo(a);
    if (act === 'all' || act === 'none') { SD.ticks = act === 'all' ? SD.pv.contacts.filter(function (x) { return !x.already; }).map(function (x) { return x.id; }) : []; return sendPreviewKeep(); }
  });
  r2.addEventListener('change', function (e) {
    if (!SD || !e.target.matches('[data-sc]')) return;
    SD.ticks = [].map.call(r2.querySelectorAll('[data-sc]:checked'), function (x) { return x.value; }); sendPreviewKeep();
  });
  var pvTimer = null; function sendPreviewKeep() { clearTimeout(pvTimer); pvTimer = setTimeout(sendPreview, 120); }

  /* ---------- 목록 ---------- */
  async function vLoad() { V = (await CT.api('/api/campteam/surveys?campId=' + encodeURIComponent(S.campId))).items; vRender(); }
  function vRender() {
    var w = P.canW(), h = '<p class="hint">' + esc(t('svIntro')) + '</p><div class="p-bar">' + (w ? '<button class="btn pri" id="svNew">' + esc(t('svNew')) + '</button>' : '') + '</div><div class="sv-list">';
    h += V.map(function (s) {
      return '<div class="card p-series sv-item"><div class="p-row"><span class="p-main"><b>' + esc(pick(s.title, s.titleEn)) + '</b> <span class="chip">' + esc(t(AUDL[s.audience] || 'aOther')) + '</span> <span class="chip ' + (s.status === 'open' ? 'ok' : '') + '">' + esc(t(s.status === 'open' ? 'svOpen' : 'svClosed')) + '</span><small>' + esc(t('svQs')(s.questions.filter(function (q) { return q.type !== 'heading'; }).length)) + ' · ' + esc(t('vResp')(s.responses)) + (s.sent ? ' · ' + esc(t('svSent')(s.sent)) : '') + '</small></span></div>' +
        (s.link ? '<div class="p-new"><input readonly value="' + esc(s.link) + '" data-lnk style="flex:1;min-width:200px"><button class="btn sm" data-copy="' + esc(s.id) + '">' + esc(t('svCopy')) + '</button></div><p class="hint">' + esc(t('svLinkNote')) + '</p>' : '') +
        (w ? '<div class="sv-act"><button class="btn sm pri" data-send="' + esc(s.id) + '">' + esc(t('svSend')) + '</button><button class="btn sm" data-res="' + esc(s.id) + '">' + esc(t('svRes')) + '</button><button class="btn sm" data-edit="' + esc(s.id) + '">' + esc(t('svEdit')) + '</button><button class="btn sm" data-link="' + esc(s.id) + '" data-on="' + (s.hasLink ? '0' : '1') + '">' + esc(t(s.hasLink ? 'svLinkOff' : 'svLinkOn')) + '</button><button class="btn sm" data-st="' + esc(s.id) + '" data-to="' + (s.status === 'open' ? 'closed' : 'open') + '">' + esc(t(s.status === 'open' ? 'svCloseS' : 'svReopen')) + '</button><button class="btn sm danger" data-del="' + esc(s.id) + '">' + esc(t('svDel')) + '</button></div>' : '') + '</div>';
    }).join('') || '<div class="empty">' + esc(t('svNone')) + '</div>';
    $('pView').innerHTML = h + '</div>';
  }
  async function audienceDlg() {
    openD2('<h3>' + esc(t('svWho')) + '</h3><p class="sv-hint">' + esc(t('svWhoHint')) + '</p><div class="sv-aud">' + AUD.map(function (a) { return '<button type="button" data-aud="' + a[0] + '"><span>' + a[1] + '</span><b>' + esc(t(a[2])) + '</b><small>' + esc(t(a[3])) + '</small></button>'; }).join('') + '</div><div id="svTplBox"></div><div class="dlg-actions"><button type="button" class="btn" data-ta="x">' + esc(t('cancel')) + '</button></div>', true);
    try { await loadTpl(); if (TPL.items.length && $('svTplBox')) $('svTplBox').innerHTML = '<h4>' + esc(t('svFromTpl')) + '</h4>' + TPL.items.map(function (x) { return '<div class="sv-tpl"><span class="grow"><b>' + esc(x.name) + '</b><small>' + esc(t(AUDL[x.audience] || 'aOther')) + ' · ' + esc(t('svTplQs')(x.questions.length)) + '</small></span><button type="button" class="btn sm pri" data-tpl="' + esc(x.id) + '">' + esc(t('svNew').replace('+ ', '')) + '</button></div>'; }).join(''); } catch (e) { /* 템플릿을 못 불러와도 기본 시작 질문으로 만들 수 있다 */ }
  }
  r2.addEventListener('click', async function (e) {
    var a = e.target.closest('[data-aud]'), tp = e.target.closest('[data-tpl]'); if (!a && !tp) return;
    try {
      await loadTpl(); closeD2();
      if (a) openBuilder(fromStarter(a.dataset.aud, TPL.starters[a.dataset.aud] || TPL.starters.other));
      else { var x = TPL.items.filter(function (y) { return y.id === tp.dataset.tpl; })[0]; openBuilder({ audience: x.audience, title: x.name, qs: x.questions.map(function (q) { return normQ(q, false); }) }); }
    } catch (er) { alert(er.message); }
  });
  async function vHandle(e) {
    var tg = function (a) { return e.target.closest('[' + a + ']'); }, id;
    try {
      if (e.target.closest('#svNew')) return audienceDlg();
      if ((id = tg('data-send'))) return sendDlg(id.dataset.send);
      if ((id = tg('data-edit'))) { var s = V.filter(function (x) { return x.id === id.dataset.edit; })[0]; return openBuilder({ id: s.id, audience: s.audience, title: s.title, titleEn: s.titleEn || '', desc: s.description || '', descEn: s.descriptionEn || '', qs: s.questions.map(function (q) { return normQ(q, true); }) }); }
      if ((id = tg('data-link'))) { await api('/api/campteam/surveys?id=' + encodeURIComponent(id.dataset.link), 'PATCH', { link: id.dataset.on === '1' }); return vLoad(); }
      if ((id = tg('data-st'))) { await api('/api/campteam/surveys?id=' + encodeURIComponent(id.dataset.st), 'PATCH', { status: id.dataset.to }); return vLoad(); }
      if ((id = tg('data-del'))) { if (!confirm(t('svDelConfirm'))) return; await CT.api('/api/campteam/surveys?id=' + encodeURIComponent(id.dataset.del), { method: 'DELETE' }); return vLoad(); }
      if ((id = tg('data-copy'))) { var inp = id.closest('.card').querySelector('[data-lnk]'); return copyText(inp.value, id); }
      if ((id = tg('data-res'))) return resultsDlg(id.dataset.res);
    } catch (er) { alert(er.message); }
  }

  P.add('survey', { label: 'vLabel', needCamp: true, load: async function () { await vLoad(); $('pView').onclick = vHandle; } });
})();
