/* 캠프 도우미의 「화면에서 보여 주기」 안내 모음 — 미리 사람이 만든 단계들이다(AI 가 지어내지 않는다).
   단계: { path?: 이 화면에서만(다른 화면이면 왼쪽 메뉴로 먼저 이동을 안내), sel: 가리킬 버튼(CSS 선택자, 쉼표로 여러 개면 보이는 첫 번째), text: {ko,en}, optional?: 없으면 건너뜀 }
   번호(키)는 functions/lib/campteamAssist.js 의 GUIDES 와 같아야 한다. */
(function () {
  var SUBMIT = 'dialog[open] [type=submit]', FIRST = 'dialog[open] form input:not([type=hidden]):not([type=file]), dialog[open] form textarea';
  var P = { files: '/portal/campteam/files/', tasks: '/portal/campteam/tasks/', meetings: '/portal/campteam/meetings/', camps: '/portal/campteam/camps/', calendar: '/portal/campteam/calendar/' };
  window.CTGuides = {
    nav: {
      '/portal/campteam/files/': { ko: '먼저 「자료실」을 눌러 이동해요', en: 'First click "Files" to go there' },
      '/portal/campteam/tasks/': { ko: '먼저 「업무」를 눌러 이동해요', en: 'First click "Tasks" to go there' },
      '/portal/campteam/meetings/': { ko: '먼저 「회의록 · 결정」을 눌러 이동해요', en: 'First click "Meetings & decisions" to go there' },
      '/portal/campteam/camps/': { ko: '먼저 「캠프별 공간」을 눌러 이동해요', en: 'First click "Camps" to go there' },
      '/portal/campteam/calendar/': { ko: '먼저 「달력」을 눌러 이동해요', en: 'First click "Calendar" to go there' }
    },
    guides: {
      addFile: { title: { ko: '자료 올리기', en: 'Add a file' }, steps: [
        { path: P.files, sel: '#addFile', text: { ko: '「+ 자료 추가」를 눌러요.', en: 'Click "+ Add material".' } },
        { sel: '#formDlg #pkFiles', text: { ko: '「파일 선택」으로 파일을 고르세요(여러 개 가능). 폴더째 올리려면 옆의 「폴더 선택」을 누르고, 링크를 붙이려면 위쪽의 「링크 연결」 탭을 누르세요.', en: 'Choose files here (several at once). Use "Choose folder" to upload a whole folder, or the "Link" tab above to paste a link.' } },
        { sel: '#aiBox', optional: true, text: { ko: 'AI 도우미를 켜 두면 파일을 고르는 즉시 제목·종류·캠프를 추천해 줘요. 직접 고친 칸은 그대로 두니까 안심하세요.', en: 'With the AI helper on, it suggests a title, type and camp as soon as you pick a file. Fields you edit are never overwritten.' } },
        { sel: 'dialog[open] #formSave', text: { ko: '마지막으로 「저장」을 눌러요. 끝!', en: 'Finally click "Save". Done!' } }
      ] },
      addTask: { title: { ko: '업무 추가하기', en: 'Add a task' }, steps: [
        { path: P.tasks, sel: '#addTask', text: { ko: '「+ 업무 추가」를 눌러요.', en: 'Click "+ Task".' } },
        { sel: FIRST, text: { ko: '업무 이름을 적고, 담당자·마감일·캠프를 골라요. 비워 둘 수 있는 칸도 많아요.', en: 'Type the task name, then pick the owner, due date and camp. Many fields can stay blank.' } },
        { sel: SUBMIT, text: { ko: '「저장」을 눌러요. 끝!', en: 'Click "Save". Done!' } }
      ] },
      addMeeting: { title: { ko: '회의 기록 만들기', en: 'Create a meeting record' }, steps: [
        { path: P.meetings, sel: '#addMeeting', text: { ko: '「+ 회의 만들기」를 눌러요.', en: 'Click "+ New meeting".' } },
        { sel: FIRST, text: { ko: '회의 제목과 날짜를 적어요. 저장한 뒤 회의를 열면 안건·결정·할 일을 적거나, 회의 글을 붙여 넣어 AI 회의록 초안을 만들 수 있어요.', en: 'Enter a title and date. After saving, open the meeting to add agenda, decisions and tasks, or paste a transcript to get an AI draft of the minutes.' } },
        { sel: SUBMIT, text: { ko: '「저장」을 눌러요. 끝!', en: 'Click "Save". Done!' } }
      ] },
      addCamp: { title: { ko: '캠프(행사) 만들기', en: 'Create a camp (event)' }, steps: [
        { path: P.camps, sel: '#addCamp', text: { ko: '「+ 행사」를 눌러요.', en: 'Click "+ Event".' } },
        { sel: FIRST, text: { ko: '캠프 유형·연도·계절을 고르면 「✨ 이름 추천」으로 「연도 계절 이름」 형식 이름을 제안받을 수 있어요.', en: 'Pick the type, year and season; "✨ Suggest name" proposes names in "year season name" form.' } },
        { sel: SUBMIT, text: { ko: '「저장」을 눌러요. 끝!', en: 'Click "Save". Done!' } }
      ] },
      addEvent: { title: { ko: '달력에 일정 넣기', en: 'Add a calendar event' }, steps: [
        { path: P.calendar, sel: '#addEvent', text: { ko: '「+ 일정 추가」를 눌러요.', en: 'Click "+ Event".' } },
        { sel: FIRST, text: { ko: '일정 이름과 날짜를 적어요. 종류를 「부재」로 하면 그날 홈에 「오늘 부재」로 표시돼요.', en: 'Enter a name and date. Choose the type "Out of office" to show the person as out on the home page.' } },
        { sel: SUBMIT, text: { ko: '「저장」을 눌러요. 끝!', en: 'Click "Save". Done!' } }
      ] },
      findFile: { title: { ko: '자료·업무·회의 찾기', en: 'Search' }, steps: [
        { sel: '.gsearch input', text: { ko: '여기에 찾고 싶은 말(제목·캠프 이름·폴더 이름 등)을 두 글자 이상 쓰고 Enter를 눌러요. 업무·회의·결정·파일·폴더가 한꺼번에 나와요.', en: 'Type at least two letters of what you want (title, camp or folder name) and press Enter. Tasks, meetings, decisions, files and folders appear together.' } }
      ] },
      switchLang: { title: { ko: '한국어/영어 바꾸기', en: 'Switch language' }, steps: [
        { sel: '.lang, .langmini', text: { ko: 'KO는 한국어, EN은 영어예요. 누르면 화면 전체가 바로 바뀌어요.', en: 'KO is Korean and EN is English. The whole screen switches right away.' } }
      ] },
      openAlerts: { title: { ko: '알림 확인하기', en: 'Check alerts' }, steps: [
        { sel: '#bellBtn, #alertsNav', text: { ko: '종 모양(또는 「알림공지」)을 누르면 마감·회의·공지 알림을 한곳에서 볼 수 있어요.', en: 'Click the bell (or "Alerts") to see deadlines, meetings and notices in one place.' } }
      ] }
    },
    starters: ['addFile', 'addTask', 'addMeeting', 'addCamp', 'findFile', 'switchLang']
  };
})();
