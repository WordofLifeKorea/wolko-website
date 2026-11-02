/* 「사용법 카드」 글 모음 — howto.js 가 읽어서 화면(탭)마다 카드 하나를 보여 준다. 화면 이름 → 탭 이름 → { ko, en }.
   카드마다: l = 탭(메뉴) 이름(화면에 실제로 있는 글자와 같아야 해요 — 테스트가 지켜 줘요), t = 카드 제목, s = 순서 3~4줄, ex = 가짜 예시 한 줄 [제목, 설명].
   예시는 모두 지어낸 내용이라 저장되지 않고, 실제 자료와 헷갈리지 않게 카드에 「예시」 표시를 붙인다.
   탭이 없는 화면은 탭 이름을 main 으로 쓴다. 새 탭이나 새 기능이 생기면 여기에 줄을 더하면 돼요(화면에 없는 기능은 쓰지 않아요). */
(function () {
  var P = {};
  function put(page, tab, lang, d) { ((P[page] = P[page] || {})[tab] = P[page][tab] || {})[lang] = d; }
  /* 한 장 만들기: c(화면, 탭, 한국어 이름, 영어 이름, 한국어 순서[], 영어 순서[], 한국어 예시[], 영어 예시[], (선택) 한국어 제목, 영어 제목) */
  function c(page, tab, lk, le, sk, se, xk, xe, tk, te) {
    put(page, tab, 'ko', { l: lk, t: tk || lk + ' 사용법', s: sk, ex: xk });
    put(page, tab, 'en', { l: le, t: te || le + ': how to use', s: se, ex: xe });
  }

  /* ───────── 업무 ───────── */
  c('tasks', 'list', '업무 목록', 'Task list',
    ['오른쪽 위 「+ 업무 추가」에서 제목·담당자·기한·캠프를 적어요.', '담당자는 목록에서 고르거나 새 이름을 써요. 여러 명도 돼요.', '줄 오른쪽 상태 칸으로 진행을 바꾸고, 위의 버튼·검색으로 필요한 업무만 모아 봐요.', '말로 하고 싶으면 루미 「✍ 부탁」에 “내일까지 버스 예약 업무 추가해줘”라고 해 보세요.'],
    ['Press “+ Task” at the top right and fill in title, owner, due date and camp.', 'Pick an owner from the list or type a new name. Several people are fine.', 'Change progress with the status box on each row, and use the buttons and search above to see only the tasks you need.', 'Prefer talking? Tell Lumi under “Ask me to”: “add a task: book the bus by tomorrow”.'],
    ['버스 예약하기', '담당 Mina · 기한 6월 20일 · 상태 진행 중 · 캠프 겨울 연합 캠프'],
    ['Book the bus', 'Owner Mina · due June 20 · In progress · Winter Joint Camp']);
  c('tasks', 'tpl', '체크리스트 템플릿', 'Checklist templates',
    ['템플릿은 자주 쓰는 업무 묶음이에요. 항목마다 캠프 시작일 기준 「기준일」이 있어요.', '「+ 템플릿」으로 만들거나, 「체크리스트 붙여넣어 가져오기」로 Word·엑셀 표를 그대로 붙여 넣어요.', '템플릿의 「캠프에 적용」을 누르고 캠프를 고른 뒤 「미리보기」로 확인해요.', '「이대로 적용」을 누르면 업무가 만들어져요. 이미 있는 업무는 건너뛰고, 담당 제안은 체크한 것만 확정돼요.'],
    ['A template is a ready-made bundle of tasks. Each item has an offset counted from the camp start date.', 'Make one with “+ Template”, or paste a Word/Excel checklist table with “Import checklist by pasting”.', 'Press “Apply to camp” on a template, choose the camp, then check it with “Preview”.', 'Press “Apply as shown” to create the tasks. Tasks that already exist are skipped, and owner suggestions are confirmed only when ticked.'],
    ['접수 안내 데스크 준비', '캠프 시작 14일 전 · 제안 담당 Jason · 우선순위 높음 · 구역 현장 준비'],
    ['Set up the registration desk', '14 days before camp · suggested owner Jason · High priority · section On-site prep']);
  c('tasks', 'imp', '시트에서 가져오기', 'Import from sheet',
    ['기존 Google 시트에서 업무 칸 전체(맨 윗줄 머리글 포함)를 복사해요.', '아래 칸에 붙여넣고 「미리보기」를 눌러요. 아직 저장되지 않아요.', '담당자·기한은 시트에 적힌 그대로 가져와요. 같은 캠프에 같은 이름의 업무가 있으면 건너뛰어요.', '「이대로 가져오기」를 누르면 저장돼요. 「비활성 상태로 가져오기」를 켜 두면 확인한 뒤 활성으로 바꿀 수 있어요.'],
    ['In the existing Google Sheet, copy all task cells (including the header row).', 'Paste them below and press “Preview”. Nothing is saved yet.', 'Owners and due dates are imported exactly as written. A task with the same name in the same camp is skipped.', 'Press “Import as shown” to save. Keep “Import as inactive” ticked to review first and activate later.'],
    ['버스 예약하기 (시트의 한 줄)', 'Task,Owner,Due,Status,Camp,Priority → 버스 예약하기,Mina,2027-06-20,In Progress,겨울 연합 캠프,High'],
    ['Book the bus (one sheet row)', 'Task,Owner,Due,Status,Camp,Priority → Book the bus,Mina,2027-06-20,In Progress,Winter Joint Camp,High']);
  c('tasks', 'check', '팀 점검', 'Team check',
    ['위에서 점검할 캠프를 하나 골라요.', '끝낸 일의 체크박스를 눌러요. 누가 언제 눌렀는지 함께 남아요.', '체크한 항목은 목록에서 사라지지 않고 회색으로 남아요.', '맨 위 진행 막대로 캠프 준비가 얼마나 됐는지 한눈에 봐요.'],
    ['Pick the camp to check at the top.', 'Tick the box of each finished job. Who ticked it and when is kept with it.', 'Ticked items stay in the list, greyed out.', 'The progress bar at the top shows how far the camp preparation has come.'],
    ['✔ 버스 예약하기', '체크한 사람 Mina · 6월 12일 14:30 · 회색으로 목록에 남아요'],
    ['✔ Book the bus', 'Ticked by Mina · June 12, 14:30 · stays in the list, greyed out']);

  /* ───────── 회의록 · 결정 ───────── */
  c('meetings', 'list', '회의 목록', 'Meetings',
    ['「+ 회의 만들기」로 회의를 만들고 제목·날짜·캠프·참석자를 적어요.', '회의를 열어 「+ 구역 추가」로 안건별 이야기를 적어요.', '구역에서 「결정 기록」「업무 만들기」「다음 회의 안건으로」를 눌러 바로 이어요.', 'Word 회의록은 「회의록 붙여넣어 가져오기」로, 전사 글은 AI 초안으로 정리해요. 적용은 사람이 골라요.'],
    ['Press “+ New meeting” and add title, date, camp and attendees.', 'Open the meeting and use “+ Add section” to write each agenda item.', 'On a section, press “Record decision”, “Create task” or “Next-meeting item” to carry it on.', 'Paste Word minutes with “Import minutes by pasting”, or let AI draft from a transcript. A person chooses what to apply.'],
    ['6월 팀 회의', '6월 3일 · 겨울 연합 캠프 · 구역 2개 · 결정 1개 · 업무 1개'],
    ['June team meeting', 'June 3 · Winter Joint Camp · 2 sections · 1 decision · 1 task']);
  c('meetings', 'topic', '주제별', 'By topic',
    ['회의 구역이나 결정을 만들 때 「주제」(예: 예산, 인력)를 적어 둬요.', '이 탭에 적어 둔 주제가 칩으로 모여요.', '주제를 누르면 그 주제가 붙은 회의가 「회의 목록」에 모여요.', '「지우기」를 누르면 다시 전체 회의가 보여요.'],
    ['Add a topic (e.g. budget, staffing) when you create a meeting section or a decision.', 'The topics you used are gathered here as chips.', 'Click a topic to gather the meetings that carry it in the meeting list.', 'Press “Clear” to see all meetings again.'],
    ['예산 (주제)', '이 주제가 붙은 회의: 6월 팀 회의 · 7월 팀 회의'],
    ['Budget (topic)', 'Meetings with this topic: June team meeting · July team meeting']);
  c('meetings', 'dec', '결정 이력', 'Decision history',
    ['위에서 캠프와 보기 방식(현재 유효한 결정 · 변경 이력 · 모든 결정)을 골라요.', '「+ 결정 기록」으로 새 결정을 적고 종류(예: 최종 결정)를 골라요.', '결정이 바뀌면 「이 결정 바꾸기」를 눌러요. 예전 결정은 지우지 않고 이력으로 남아요.', '검색 칸으로 결정 내용을 찾아요.'],
    ['Choose the camp and the view (current decisions · change history · all decisions) at the top.', 'Press “+ Record decision”, write it and pick a type (e.g. final decision).', 'When a decision changes, press “Change this decision”. The old one is not deleted; it stays in the history.', 'Search decisions by their text.'],
    ['버스는 2대로 한다', '최종 결정 · 현재 유효 · 6월 3일 · 6월 팀 회의'],
    ['We will use 2 buses', 'Final decision · current · June 3 · June team meeting']);
  c('meetings', 'next', '다음 회의 안건', 'Next meeting agenda',
    ['위에서 캠프를 고르면 그 캠프의 다음 회의 안건만 보여요.', '「+ 다음 회의 안건」으로 다음에 이야기할 내용을 적어요.', '회의 구역에서 「다음 회의 안건으로」를 눌러 넘길 수도 있어요.', '이야기했으면 「논의함」, 정했으면 「결정됨」 버튼을 눌러요.'],
    ['Choose a camp at the top to see only its next-meeting items.', 'Press “+ Next-meeting item” and write what to discuss next time.', 'You can also send a meeting section here with “Next-meeting item”.', 'Press “Discussed” once talked about, or “Decided” once settled.'],
    ['숙소 배정 방법', '상태 논의 필요 · 캠프 겨울 연합 캠프 · 6월 팀 회의에서 넘어옴'],
    ['How to assign rooms', 'Status To discuss · Winter Joint Camp · carried over from the June team meeting']);

  /* ───────── 자료실 ───────── */
  c('files', 'folders', '폴더별 보기', 'By folder',
    ['오른쪽 위 「+ 자료 추가」나 끌어다 놓는 칸으로 파일을 올려요. 여러 파일·폴더째도 돼요.', '「＋ 새 폴더」로 폴더를 만들어요. 폴더 안에 폴더도 만들 수 있어요(5단계까지).', '컴퓨터에서는 끌어다 놓아 옮겨요. 폰에서는 「폴더로 이동」과 「↑ 위로」「↓ 아래로」를 써요.', '폴더를 지워도 휴지통에서 복구할 수 있어요. 안의 파일은 한 단계 위로 옮기거나 함께 지울 수 있어요.'],
    ['Upload with “+ Add material” at the top right, or drop files on the drop box. Many files or whole folders work.', 'Make folders with “＋ New folder”. Folders can hold folders (up to 5 levels).', 'On a computer, drag and drop to move. On a phone, use “Move to folder” and “↑ Up” / “↓ Down”.', 'A deleted folder can be restored from the Trash. You can lift its contents one level up or delete them with it.'],
    ['📁 겨울 연합 캠프', '폴더 2개 · 파일 8개 · 안에 「일정」「안내문」 폴더'],
    ['📁 Winter Joint Camp', '2 folders · 8 files · inside: “Schedule” and “Notices” folders']);
  c('files', 'all', '전체 파일 보기', 'All files',
    ['폴더 구분 없이 모든 파일을 한 줄씩 보여 줘요.', '위의 검색·캠프·종류·상태·정렬로 좁혀 찾아요. 태그 칩을 누르면 같은 태그만 모여요.', '파일을 누르면 자세히 보거나 내려받을 수 있어요.', '「+ 자료 추가」에서 「AI 도우미」를 켜면 제목·종류·캠프를 추천해 줘요. 직접 고친 칸은 그대로 둬요.'],
    ['Shows every file as one row, whatever folder it is in.', 'Narrow down with search, camp, kind, status and sort above. Click a tag chip to gather files with that tag.', 'Click a file to see details or download it.', 'Turn on the “AI helper” in “+ Add material” to get title, kind and camp suggestions. Boxes you edit are kept.'],
    ['2027 겨울캠프 일정표.pdf', '종류 일정 · 캠프 겨울 연합 캠프 · 태그 일정, 겨울 · 한국어'],
    ['2027 Winter Camp schedule.pdf', 'Kind: schedule · Camp: Winter Joint Camp · Tags: schedule, winter · Korean']);

  /* ───────── 보관함 ───────── */
  c('library', 'sermon', '설교·메시지', 'Sermons',
    ['위 탭에서 「설교·메시지」를 골라요.', '「+ 추가」에서 제목·성경 본문·설교자·날짜를 적어요. 제목만 있어도 돼요.', '「📥 자료실에서 가져오기」로 자료실 파일의 태그·본문·설교자를 카드로 옮겨요.', '태그 칩이나 검색(제목·성경 본문·설교자)으로 찾아요.'],
    ['Pick “Sermons” in the tabs above.', 'Press “+ Add” and fill in title, scripture, speaker and date. A title is enough.', 'Use “📥 Import from Files” to copy tags, scripture and speaker from a file in Files.', 'Find cards with the tag chips or search (title, scripture, speaker).'],
    ['다시 태어남 (요한복음 3장)', '성경 본문 요 3:1-16 · 설교자 Jason · 날짜 2027-01-15 · 태그 겨울, 복음'],
    ['Born again (John 3)', 'Scripture John 3:1-16 · speaker Jason · date 2027-01-15 · tags winter, gospel']);
  c('library', 'worship', '찬양 콘티', 'Worship sets',
    ['위 탭에서 「찬양 콘티」를 고르고 「+ 추가」를 눌러요.', '제목·곡 키·곡 순서(콘티)를 적어요.', '가사는 글로 저장하지 않아요. 가사·악보 파일은 자료실에 올리고 카드에 연결해요.', '한국어·영어·발음 파일을 따로 연결할 수 있어요. 모르는 칸은 비워 둬요.'],
    ['Pick “Worship sets” in the tabs and press “+ Add”.', 'Write the title, song key and the set order.', 'Lyrics are not stored as text. Upload lyric or score files to Files and link them on the card.', 'You can link Korean, English and pronunciation files separately. Leave unknown boxes empty.'],
    ['금요 저녁 찬양 (예시)', '곡 키 G · 순서 1.오프닝 곡 2.중보 곡 3.마무리 곡 · 📎 악보 파일(자료실)'],
    ['Friday evening worship (example)', 'Key G · order 1. opener 2. prayer song 3. closing song · 📎 score file (Files)']);
  c('library', 'game', '게임·활동', 'Games & activities',
    ['위 탭에서 「게임·활동」을 고르고 「+ 추가」를 눌러요.', '제목·인원·시간(분)·준비물·규칙을 적어요.', '「야외」 같은 태그를 달아 두면 나중에 모아 볼 수 있어요.', '캠프를 고르거나 설명 파일을 자료실에서 연결해 둘 수 있어요.'],
    ['Pick “Games & activities” in the tabs and press “+ Add”.', 'Write the title, number of players, minutes, supplies and rules.', 'Add a tag such as “outdoor” to gather them later.', 'Choose a camp, or link an explanation file from Files.'],
    ['물풍선 릴레이', '게임 · 인원 20명 · 15분 · 준비물 풍선, 양동이 · 태그 야외'],
    ['Water balloon relay', 'Game · 20 people · 15 min · supplies: balloons, buckets · tag: outdoor']);
  c('library', 'venue', '장소·시설', 'Venues',
    ['위 탭에서 「장소·시설」을 고르고 「+ 추가」를 눌러요.', '주소·담당자·비용·수용 인원·홈페이지·답사 메모를 적어요.', '견적서·계약서 같은 파일은 자료실에 올리고 카드에 연결해요.', '태그와 검색으로 후보 장소를 모아 비교해요.'],
    ['Pick “Venues” in the tabs and press “+ Add”.', 'Write address, contact person, cost, capacity, website and visit notes.', 'Upload quotes or contracts to Files and link them on the card.', 'Use tags and search to gather and compare candidate places.'],
    ['호수 수련원 (예시)', '수용 인원 120명 · 비용 1박 3만 원 · 답사 2027-02-10 · 메모 주차 넉넉'],
    ['Lakeside retreat center (example)', 'Capacity 120 · cost 30,000 won/night · visited 2027-02-10 · note: plenty of parking']);

  /* ───────── 캠프 준비 ───────── */
  c('prep', 'timeline', '진행표', 'Timeline',
    ['위에서 연도 → 유형 → 캠프 순서로 눌러 캠프 하나를 골라요.', '「+ 추가」로 날짜·시간·제목·장소·담당을 한 줄씩 넣어요.', '엑셀 표는 「📋 엑셀에서 붙여넣기」로 한 번에 넣어요.', '오늘 줄에는 「지금」 표시가 붙고, 사람·장소 시간이 겹치면 위에 경고가 떠요.'],
    ['Choose one camp at the top: Year → Type → Camp.', 'Press “+ Add” and enter date, time, title, place and owner, one row at a time.', 'Add a whole Excel table at once with “📋 Paste from Excel”.', 'Today’s row gets a “Now” mark, and overlapping people or places show a warning on top.'],
    ['09:00–09:30 등록·접수', '장소 로비 · 담당 Jason · 겨울 연합 캠프 첫째 날'],
    ['09:00–09:30 Registration', 'Place: Lobby · Owner Jason · Winter Joint Camp day 1']);
  c('prep', 'supplies', '준비물', 'Supplies',
    ['캠프를 고르고 「+ 추가」로 준비물 이름·수량·담당을 적어요.', '줄의 상태 칸을 필요 → 구입함 → 준비 끝 순서로 바꿔요. 안 쓰면 「안 씀」.', '위쪽에 준비 3 / 10 처럼 얼마나 됐는지 보여요.', '비슷한 캠프가 있으면 「지난 캠프에서 복사」로 목록을 가져와요.'],
    ['Choose a camp and press “+ Add” to write the supply name, quantity and owner.', 'Change the status box on each row: Needed → Bought → Ready. Choose “Skip” if not used.', 'The top shows progress such as Ready 3 / 10.', 'If a similar camp exists, bring its list with “Copy from a past camp”.'],
    ['물풍선 200개', '수량 × 200 · 상태 필요 · 담당 Ella · 메모 야외 게임용'],
    ['200 water balloons', 'Qty × 200 · status Needed · owner Ella · note: for outdoor games']);
  c('prep', 'contacts', '연락처', 'Contacts',
    ['「+ 추가」로 교회·학교·업체·강사·장소의 연락처를 적어요.', '위의 종류 칩이나 검색(이름·기관·전화)으로 찾아요.', '연락처는 캠프 하나가 아니라 전체가 같이 쓰는 한 목록이에요.', '연락처는 캠프팀 명단에 있는 사람만 볼 수 있어요.'],
    ['Press “+ Add” to enter a contact for a church, school, vendor, speaker or venue.', 'Find them with the kind chips above or search (name, organization, phone).', 'Contacts are one shared list for all camps, not one per camp.', 'Contacts are visible only to people on the camp team list.'],
    ['Sunrise Church (예시)', '종류 교회 · 전화 010-0000-0000 · 메모 버스 지원 가능'],
    ['Sunrise Church (example)', 'Kind: church · phone 010-0000-0000 · note: can lend a bus']);
  c('prep', 'series', '반복 캠프', 'Recurring camps',
    ['해마다 되풀이되는 교회·교회학교 캠프를 한 번 등록해 둬요.', '「+ 반복 캠프 만들기」에서 이름·구분·열리는 달(예: 3, 7, 12)을 적어요.', '「새 회차 만들기」에서 연도와 달을 고르면 그 회차의 캠프가 만들어져요.', '회차는 자동으로 만들지 않아요. 회차 칩을 누르면 그 캠프 공간으로 가요.'],
    ['Register church or Sunday-school camps that repeat every year once.', 'Press “+ New recurring camp” and write the name, kind and months held (e.g. 3, 7, 12).', 'Choose year and month and press “Create new round” to make that round’s camp.', 'Rounds are never created automatically. A round chip opens that camp’s space.'],
    ['Spring Water Church 여름 캠프 (예시)', '교회 · 열리는 달 7월 · 회차 2026년 7월, 2027년 7월'],
    ['Spring Water Church summer camp (example)', 'Church · month held: July · rounds July 2026, July 2027']);
  c('prep', 'wizard', '시작 마법사', 'Start wizard',
    ['먼저 위에서 새 캠프를 고르고, 「기준이 될 지난 캠프」를 골라요.', '「✨ 루미에게 추천받기」를 누르면 비슷한 캠프를 추천해 줘요.', '「이 캠프로 후보 보기」에서 가져올 업무·진행표·준비물·자료에 체크해요.', '「고른 것 가져오기」를 누르면 체크한 것만 복사돼요. 업무 담당자는 비어 있어요.'],
    ['First choose the new camp above, then the “Past camp to base it on”.', 'Press “✨ Ask Lumi to recommend” to get similar camps suggested.', 'In “Show candidates from this camp”, tick the tasks, timeline, supplies and files to bring over.', 'Press “Copy selected” and only what you ticked is copied. Copied tasks have no owner.'],
    ['업무 12 · 진행표 8 · 준비물 20 · 자료 3', '지난 캠프 「여름 캠프」에서 가져올 후보 (체크한 것만 복사돼요)'],
    ['Tasks 12 · Timeline 8 · Supplies 20 · Files 3', 'Candidates from the past camp “Summer Camp” (only ticked ones are copied)']);
  c('prep', 'close', '마감 마법사', 'Close-out wizard',
    ['캠프가 끝나면 이 탭에서 점검해요. 자동으로 바뀌는 건 없어요.', '「아직 끝나지 않은 업무」를 보고, 필요하면 「해당 없음」으로 바꿔요.', '자료·준비물·회의·예산·설문 점검 줄을 읽고, 후속 업무 제안을 골라요.', '「적용하기」를 누르면 고른 것만 반영돼요. 캠프 상태를 「완료」로도 바꿀 수 있어요.'],
    ['Use this tab to review after the camp ends. Nothing changes automatically.', 'Look at “Tasks not finished yet” and mark them “not applicable” if needed.', 'Read the checks for files, supplies, meetings, budget and survey, then pick suggested follow-ups.', 'Press “Apply” and only your choices are applied. You can also set the camp to Done.'],
    ['아직 끝나지 않은 업무 2개', '☑ 해당 없음 처리 · ☑ 후속 업무 「감사 인사 보내기」(담당·기한 비움) · ☐ 캠프 상태 완료'],
    ['2 tasks not finished yet', '☑ mark not applicable · ☑ follow-up “Send thank-you notes” (no owner or due date) · ☐ set camp to Done']);
  c('prep', 'assign', '배정', 'Assign',
    ['캠프를 고르고 「조 · 방 · 차량」 칸에서 「+ 추가」로 조·방·차량을 만들어요. 정원도 적어요.', '「+ 사람 추가」나 「📋 붙여넣기」로 이름·성별·학년·교회·역할을 넣어요.', '「조 자동 배정 제안」「방 자동 배정 제안」은 미리 보여 줄 뿐이에요. 「적용」을 눌러야 저장돼요.', '맨 위 「확인할 점」은 알려 주기만 하고 막지 않아요. 전화·주소는 저장하지 않아요.'],
    ['Choose a camp, then use “+ Add” under “Groups · Rooms · Vehicles” to create them. Add a capacity too.', 'Add people with “+ Add person” or “📋 Paste”: name, gender, grade, church and role.', '“Suggest groups” and “Suggest rooms” only show a proposal. Nothing is saved until you press “Apply”.', '“Things to check” at the top only informs and never blocks. No phone or address is stored.'],
    ['Ella · 여 · 중 2 · Sunrise Church', '조 3조 · 방 여자방 2 · 차량 —'],
    ['Ella · F · grade 8 · Sunrise Church', 'Group 3 · Room Girls 2 · Vehicle —']);
  c('prep', 'survey', '평가 설문', 'Survey',
    ['캠프를 고르고 「+ 설문 만들기」에서 누구에게 보낼지(스태프·학생·부모님·교회) 골라요.', '시작 질문이 채워져요. 질문을 눌러 고치고 「+ 질문 추가」로 늘려요.', '「미리보기」로 확인하고 「링크 켜기」 → 「링크 복사」로 보내요. 이름·연락처는 묻지 않아요.', '「결과 보기」에서 답을 보고, 끝나면 「링크 끄기」나 「설문 닫기」를 눌러요.'],
    ['Choose a camp and press “+ New survey”; pick who it goes to (staff, students, parents, churches).', 'Starter questions are filled in. Click a question to edit, and add more with “+ Add question”.', 'Check with “Preview”, then “Turn link on” → “Copy link” to send it. It asks for no name or contact.', 'See answers in “View results”; when done, press “Turn link off” or “Close survey”.'],
    ['2027 겨울 캠프 학생 평가', '대상 학생 · 질문 8개 · 링크 켜짐 · 답 12개 (결과는 캠프 담당자만 봐요)'],
    ['2027 Winter Camp student evaluation', 'For students · 8 questions · link on · 12 responses (only camp managers see results)']);
  c('prep', 'forms', '신청서', 'Forms',
    ['「+ 새 신청서」에서 종류(캠프 카드·신청서 / 스태프·크루 지원서)를 골라요. 지난 캠프 내용이 먼저 채워져요.', '바뀐 칸만 고쳐요. 코드가 필요한 건 「+ 요청 추가」에 글로 적어요.', '「검토 요청」을 누르면 검토 → 최종 확인 순서로 승인돼요.', '모두 승인되면 환규 선교사님께 인계돼요. 「확인했어요」가 눌리면 끝이에요. 홈페이지에는 직접 쓰지 않아요.'],
    ['Press “+ New form” and pick the kind (camp card & application / staff-crew form). The last camp’s content is loaded first.', 'Change only what differs. Things that need code go into “+ Add request” as text.', 'Press “Request review”; it is approved in order: review → final check.', 'Once approved it is handed to HwanKyu, and pressing “I checked it” finishes it. This screen never writes to the homepage.'],
    ['2027 겨울 연합 캠프 신청서 (예시)', '작성 중 → 검토 중 → 최종 확인 → 환규님 확인 대기 → 완료'],
    ['2027 Winter Joint Camp form (example)', 'Draft → In review → Final check → Waiting for HwanKyu → Done']);

  /* ───────── 달력 ───────── */
  c('calendar', 'main', '달력', 'Calendar',
    ['달력에서 날짜를 누르면 그날의 일정·업무 마감·회의가 아래에 나와요.', '「+ 일정 추가」(또는 「+ 이 날 일정 추가」)로 팀 일정·캠프 일정·부재를 넣어요.', '일정을 누르면 고치거나 지울 수 있어요. 구글 달력에 반영되는 일정은 여기서만 고쳐요.', '‹ › 로 달을 옮기고, 「오늘」 버튼으로 오늘로 돌아오고, 「달력」「목록」 버튼으로 보기를 바꿔요.'],
    ['Click a date to see that day’s events, task deadlines and meetings below.', 'Add a team event, camp event or out-of-office with “+ Add event” (or “+ Add event on this day”).', 'Click an event to edit or delete it. Events mirrored to Google Calendar should be edited here only.', 'Move months with ‹ ›, jump back with “Today”, and switch the view with the “Calendar” and “List” buttons.'],
    ['여름 캠프 답사', '6월 14일 · 10:00~12:00 · 팀 일정 · 장소 수련원'],
    ['Summer camp site visit', 'June 14 · 10:00–12:00 · Team event · place: retreat center']);

  /* ───────── 알림공지 ───────── */
  c('alerts', 'mine', '내 알림', 'My alerts',
    ['내 업무 마감, 곧 있을 회의·일정, 새 소식이 이곳에 모여요.', '알림은 「확인」이나 ✕를 눌러야 사라져요.', '오른쪽 위 「설정」에서 마감·일정을 며칠 전에 알릴지 골라요.', '설정에서 이메일을 끄거나 방해 금지 시간, 화요일 이메일도 정해요. 이메일을 꺼도 이 목록은 그대로예요.'],
    ['Your task deadlines, upcoming meetings/events and news are gathered here.', 'An alert goes away only when you press “Mark read” or ✕.', 'In “Settings” at the top right, choose how many days before to be alerted.', 'There you can also turn e-mails off, set quiet hours and the Tuesday e-mail. Turning e-mail off does not change this list.'],
    ['버스 예약하기', '마감이 지났어요 · 담당 Mina · 6월 20일 (예시 알림)'],
    ['Book the bus', 'Overdue · owner Mina · June 20 (example alert)']);
  c('alerts', 'team', '팀 공지', 'Team notices',
    ['「+ 새 공지」에서 제목과 내용을 쓰고, 받을 사람(팀 전체 · 선택한 사람)을 골라요.', '「맨 위에 고정」을 켜면 목록 맨 위에 계속 보여요.', '올린 공지는 고치거나 지울 수 있어요. 지워도 휴지통에서 복구돼요.', '오래된 공지는 「지난 공지」로 접혀요.'],
    ['Press “+ New notice”, write the title and message, and choose recipients (whole team · selected people).', 'Turn on “Pin to the top” to keep it at the top of the list.', 'You can edit or delete a notice. A deleted one can be restored from the Trash.', 'Old notices fold into “Older notices”.'],
    ['6월 20일 회의 시간 변경', '받는 사람 팀 전체 · 맨 위에 고정 · 올린 사람 Jason (예시 공지)'],
    ['June 20 meeting time changed', 'To: whole team · pinned · posted by Jason (example notice)']);

  /* ───────── 휴지통: 탭마다 「어디로 돌아가는지」만 달라서 한 번에 만든다 ───────── */
  // [탭 id, 한국어 이름, 영어 이름, 한국어 도착 자리, 영어 도착 자리, 예시 제목 한국어, 예시 제목 영어]
  [
    ['tasks', '업무', 'Tasks', '「업무」의 업무 목록으로', 'to the Tasks list', '버스 예약하기', 'Book the bus'],
    ['announcements', '팀 공지', 'Team notices', '「알림공지」의 팀 공지로', 'to Team notices in Alerts', '6월 20일 회의 시간 변경', 'June 20 meeting time changed'],
    ['events', '일정', 'Events', '「달력」으로', 'to the Calendar', '여름 캠프 답사', 'Summer camp site visit'],
    ['meetings', '회의', 'Meetings', '「회의록 · 결정」의 회의 목록으로', 'to the meeting list', '6월 팀 회의', 'June team meeting'],
    ['sections', '회의 구역', 'Meeting sections', '원래 회의 안으로', 'into its meeting', '숙소 배정 논의', 'Room assignment discussion'],
    ['decisions', '결정', 'Decisions', '「결정 이력」으로', 'to the Decision history', '버스는 2대로 한다', 'We will use 2 buses'],
    ['files', '파일', 'Files', '「자료실」로', 'to Files', '2027 겨울캠프 일정표.pdf', '2027 Winter Camp schedule.pdf'],
    ['folders', '폴더', 'Folders', '「자료실」의 원래 폴더 자리로', 'to its place in Files', '겨울 연합 캠프 (폴더)', 'Winter Joint Camp (folder)'],
    ['library', '보관함', 'Library', '「보관함」으로', 'to the Library', '물풍선 릴레이', 'Water balloon relay'],
    ['camps', '캠프 행사', 'Camp events', '「캠프별 공간」으로', 'to Camp Spaces', '2027 겨울 연합 캠프', '2027 Winter Joint Camp'],
    ['camp_types', '캠프 유형', 'Camp types', '「캠프별 공간」으로', 'to Camp Spaces', 'Winter Camp (유형)', 'Winter Camp (type)'],
    ['templates', '체크리스트 템플릿', 'Checklist templates', '「업무」의 체크리스트 템플릿으로', 'to Checklist templates in Tasks', '겨울 캠프 기본 체크리스트', 'Winter camp basic checklist'],
    ['template_items', '템플릿 항목', 'Template items', '원래 템플릿 안으로', 'into its template', '접수 안내 데스크 준비', 'Set up the registration desk'],
    ['notices', '공지', 'Announcements', '「TV 대시보드」의 팀 공지로', 'to the TV announcements', '오늘 저녁 7시 모임', 'Meeting tonight at 7'],
    ['budget', '예산 항목', 'Budget lines', '「캠프 예산」으로', 'to Camp Budget', '버스 대절', 'Bus charter'],
    ['ledger', '장부 거래', 'Ledger entries', '「회계 장부」의 장부로', 'to the Ledger', '버스 대절 계약금', 'Bus charter deposit']
  ].forEach(function (k) {
    c('trash', k[0], k[1], k[2],
      ['위 탭에서 「' + k[1] + '」을 눌러요. 숫자는 지운 개수예요.', '줄마다 지운 날짜와 지운 사람이 보여요.', '「복구」를 누르고 확인하면 ' + k[3] + ' 돌아가요.', '영구 삭제는 없어요. 관리자는 모두가 지운 것을, 그 밖의 사람은 내가 지운 것만 봐요.'],
      ['Press “' + k[2] + '” in the tabs above. The number is how many were deleted.', 'Each row shows when it was deleted and by whom.', 'Press “Restore” and confirm; it goes back ' + k[4] + '.', 'Nothing is permanently deleted. Admins see everything; everyone else sees only what they deleted.'],
      [k[5], '삭제 2027-01-05 10:20 · 삭제한 사람 Mina (예시)'],
      [k[6], 'Deleted 2027-01-05 10:20 · Deleted by Mina (example)'],
      '휴지통 · ' + k[1] + ' 사용법', 'Trash · ' + k[2] + ': how to use');
  });

  /* ───────── 설정 · 팀 명단 (탭 없이 한 화면) ───────── */
  c('settings', 'main', '설정 · 팀 명단', 'Settings · Team Roster',
    ['위의 표가 캠프팀 명단이에요. 줄의 「수정」으로 이름·「업무에 적는 이름」·역할을 바꿔요.', '새 사람은 「팀원 추가 · 역할 변경」에 포털 이메일·이름·역할을 적고 저장해요.', '역할을 고르면 기본 권한이 채워져요. 항목마다 「가리기·조회·편집」을 따로 고를 수도 있어요.', '아래쪽에는 업무 담당자 이름, 용어집, 백업 내려받기, 변경 기록이 있어요. 관리자만 쓰는 화면이에요.'],
    ['The table on top is the camp team roster. Use “Edit” on a row to change name, “Names used on tasks” and role.', 'To add someone, enter portal email, name and role under “Add member · change role” and save.', 'Choosing a role fills in its default permissions. You can also set hide / view / edit per item.', 'Further down: task owner names, glossary, backup download and the change log. Only admins use this page.'],
    ['Mina · 캠프팀 팀원', '이메일 mina@example.org · 업무에 적는 이름 Mina, 미나 · 역할 캠프팀 팀원'],
    ['Mina · Camp team member', 'Email mina@example.org · name used on tasks: Mina · role Camp team member']);

  /* ───────── 캠프 예산 · 회계 장부 (finance 화면의 탭 9개) ───────── */
  c('finance', 'summary', '요약', 'Summary',
    ['위 「지금 보는 기간」에서 볼 기간을 골라요.', '맨 위에 캠프 통장 잔액(장부 기준)과 수입·지출이 보여요.', '항목별로 예산과 실제를 견주고, 월별 흐름을 봐요.', '「분류를 확인해야 하는 거래」가 있다고 나오면 「장부」 탭에서 고쳐요.'],
    ['Choose the period to view under “Viewing period” at the top.', 'The top shows the camp bank balance (per ledger) with income and expenses.', 'Compare budget and actual per category, and see the monthly flow.', 'If it says there are entries needing classification, fix them in the “Ledger” tab.'],
    ['캠프 통장 잔액 (장부 기준)', '₩ 4,250,000 · 수입 ₩ 6,000,000 · 지출 ₩ 1,750,000 (예시 숫자)'],
    ['Camp bank balance (per ledger)', '₩ 4,250,000 · income ₩ 6,000,000 · expenses ₩ 1,750,000 (example numbers)']);
  c('finance', 'ledger', '장부', 'Ledger',
    ['「빠른 입력」이나 「+ 거래 추가」로 날짜·수입/지출·금액·항목·내용을 적어요.', '위의 구분·항목·월·검색으로 거래를 좁혀 봐요.', '줄의 「수정」「삭제」로 고쳐요. 삭제는 표시만 되고 변경 기록에 남아요.', '마감된 기간은 잠겨 있어요. 고치려면 「기간 · 마감」에서 먼저 다시 열어요.'],
    ['Enter date, income/expense, amount, category and description with “Quick entry” or “+ Add entry”.', 'Narrow down with type, category, month and search above.', 'Fix rows with “Edit” / “Delete”. Delete only marks it and keeps it in the change log.', 'A closed period is locked. To edit, reopen it first under “Periods · Close”.'],
    ['버스 대절 계약금', '지출 · 금액 ₩ 800,000 · 항목 교통 · 날짜 2027-01-10 (예시)'],
    ['Bus charter deposit', 'Expense · amount ₩ 800,000 · category Transport · date 2027-01-10 (example)']);
  c('finance', 'periods', '기간 · 마감', 'Periods · Close',
    ['「+ 새 기간」에서 기간 이름·시작일·끝나는 날을 정해요.', '목록에서 「보기」를 누르면 그 기간의 장부를 봐요.', '「마감하기」를 누르면 그 기간이 잠기고, 남은 금액이 다음 기간의 「이월금」으로 넘어가요.', '잘못 마감했다면 「다시 열기」를 눌러요. 넘어간 이월금은 거둬져요.'],
    ['Press “+ New period” and set the name, start and end dates.', 'Press “View” in the list to see that period’s ledger.', 'Press “Close” and the period is locked; the remaining balance is carried into the next period as “Carried over”.', 'If you closed by mistake, press “Reopen”. The carried amount is taken back.'],
    ['2027 상반기', '진행 중 · 2027-01-01 ~ 2027-06-30 · 남은 금액 ₩ 4,250,000 (예시)'],
    ['2027 first half', 'Open · 2027-01-01 – 2027-06-30 · remaining ₩ 4,250,000 (example)']);
  c('finance', 'plan', '기간 예산', 'Period budget',
    ['기간 예산은 이 기간에 항목별로 얼마를 쓰기로(받기로) 계획했는지예요.', '항목마다 금액을 적고 「저장」을 눌러요.', '「지난 기간에서 가져오기」로 시작하면 빨라요. 계산기 결과를 옮겨 올 수도 있어요.', '실제 돈(장부)은 바뀌지 않아요. 「요약」에서 이 숫자와 실제를 견줘요.'],
    ['The period budget is what you planned to spend (or receive) per category in this period.', 'Write an amount for each category and press “Save”.', 'Starting with “Copy from a previous period” is quicker. You can also bring in a calculator result.', 'The real money (ledger) does not change. “Summary” compares these numbers with actuals.'],
    ['교통', '예산 ₩ 1,000,000 · 실제 ₩ 800,000 → 요약에서 견줘요 (예시)'],
    ['Transport', 'Budget ₩ 1,000,000 · actual ₩ 800,000 → compared in Summary (example)']);
  c('finance', 'import', '엑셀 가져오기', 'Excel import',
    ['재정 담당이 쓰는 엑셀(.xlsx)을 올리거나, 장부 표를 복사해 붙여넣어요.', '가져올 것(장부·항목 목록·기간 예산)을 고르고 「비교하기」를 눌러요. 아직 저장되지 않아요.', '새 줄·바뀐 줄·충돌을 확인해요. 충돌은 포털 값과 엑셀 값 중 하나를 골라요.', '「이대로 반영하기」로 저장해요. 같은 파일을 또 올려도 중복되지 않아요.'],
    ['Upload the Excel file (.xlsx) the finance person uses, or copy and paste the ledger table.', 'Choose what to import (ledger, category list, period budget) and press “Compare”. Nothing is saved yet.', 'Check new rows, changed rows and conflicts. For a conflict, choose the portal value or the Excel value.', 'Press “Apply as shown” to save. Uploading the same file again never duplicates anything.'],
    ['장부 탭 · 42줄 읽음', '새 줄 5 · 바뀐 줄 2 · 충돌 0 · 그대로 35 (예시)'],
    ['Ledger tab · 42 rows read', 'New 5 · changed 2 · conflicts 0 · unchanged 35 (example)']);
  c('finance', 'expense', '경비 연동', 'Expense reports',
    ['월코 포털 「경비 리포트」에서 송금이 끝난 항목을 장부 지출로 가져와요. 읽기만 해요.', '먼저 「캠프 계좌로 볼 출금 계좌」를 고르고 「설정 저장」을 눌러요.', '경비 카테고리를 장부 항목에 맞춰 두면 분류가 맞아요. 안 정하면 「기타」로 들어가요.', '「지금 가져오기」 뒤 「확인이 필요한 항목」에서 같은 거래면 「같은 거래예요」, 아니면 「새 지출로 추가」나 「제외」를 눌러요.'],
    ['Items already paid out in the WOLKO portal “Expense Report” are added to the ledger as expenses. It only reads.', 'First choose the “Withdrawal accounts treated as camp accounts” and press “Save settings”.', 'Match expense categories to ledger categories so they are sorted right. Unset ones go to “기타”.', 'After “Import now”, under “Items needing attention” press “Same transaction”, or “Add as new expense” / “Exclude”.'],
    ['버스 대절비 (경비 리포트)', '송금일 2027-01-12 · 금액 ₩ 800,000 · 비슷한 장부 거래가 있어요 → 확인 필요 (예시)'],
    ['Bus charter fee (expense report)', 'Paid 2027-01-12 · ₩ 800,000 · a similar ledger entry exists → needs checking (example)']);
  c('finance', 'recon', '잔액 대조', 'Reconcile',
    ['재정 담당에게 통장의 실제 잔액을 받아요. 포털은 은행에 접속하지 않아요.', '기준 날짜와 통장 잔액을 적고 「장부 잔액 확인」을 눌러요.', '차이가 있으면 아래 안내를 보고 빠진 입출금이 없는지 살펴요.', '「기록하기」로 남겨 둬요. 한 달에 한 번쯤이 좋아요.'],
    ['Get the real bank balance from the finance person. The portal never connects to the bank.', 'Enter the date and the bank balance and press “Check ledger balance”.', 'If there is a difference, read the tips below and look for missing deposits or withdrawals.', 'Press “Record” to keep it. About once a month is good.'],
    ['2027-01-31 통장 ₩ 4,250,000', '장부 ₩ 4,250,000 · 차이 ₩ 0 · 일치해요 (예시)'],
    ['2027-01-31 bank ₩ 4,250,000', 'Ledger ₩ 4,250,000 · difference ₩ 0 · match (example)']);
  c('finance', 'calc', '계산기', 'Calculator',
    ['「기본 정보」에 캠퍼 수·스태프 수·일수·숙박 수를 적어요.', '수입·지출 줄마다 「계산 방법」을 고르고 숫자를 적어요. 줄 아래에 계산식이 보여요.', '오른쪽 「예상 남는 금액」을 봐요. 「저장」으로 이름 붙여 두고, 「복사해서 새 계산」으로 다른 안을 만들어요.', '정해지면 「기간 예산에 적용…」으로 옮겨요. 실제 장부는 바뀌지 않아요.'],
    ['Fill in campers, staff, days and nights under “Basics”.', 'For each income/expense row choose a “How to calculate” and type numbers. The formula shows under the row.', 'Check “Expected remaining” on the right. “Save” it with a name, and “Copy as new” to try another plan.', 'When settled, use “Apply to period budget…”. The real ledger does not change.'],
    ['얼리버드 캠프비', '1인 단가 × 인원: 80,000원 × 60명 = 4,800,000원 (예시)'],
    ['Early-bird camp fee', 'Unit price × people: 80,000 won × 60 = 4,800,000 won (example)']);
  c('finance', 'cats', '항목 목록', 'Categories',
    ['수입 항목과 지출 항목 목록이에요. 장부와 예산에서 이 항목을 골라 써요.', '「항목 추가」로 새 항목을 만들고 「이름 바꾸기」로 고쳐요. 이미 쓴 거래의 이름도 함께 바뀌어요.', '쓰던 항목은 지우지 않고 「사용 안 함」으로 바꿔요. 다시 쓰려면 「다시 사용」.', '「위로」「아래로」로 순서를 바꿔요.'],
    ['These are the income and expense categories. The ledger and budget pick from them.', 'Create one with “Add category” and fix a name with “Rename”. Renaming also renames it on existing entries.', 'Used categories are never deleted; set them to “Disable”. Use “Enable” to bring one back.', 'Change the order with “Up” / “Down”.'],
    ['교통', '지출 항목 · 12건 사용 · 사용 중 (예시)'],
    ['Transport', 'Expense category · used 12 times · enabled (example)']);

  /* ───────── 캠프별 예산안 (budget 화면, 탭 없음) ───────── */
  c('budget', 'main', '캠프 예산', 'Camp Budget',
    ['위의 필터로 캠프·분류·통화를 고르고, 검색으로 항목을 찾아요.', '「+ 예산 항목」에서 항목 이름·분류·예산 계획·예상 지출을 적어요.', '돈을 쓰면 실제 지출·업체·지급일과 상태(계획 · 주문·계약 · 지급 완료)를 고쳐 적어요.', '「총 예산 설정」「지난 캠프에서 복사」「엑셀(CSV)로 내려받기」도 있어요. 아래 「예상 리포트」가 주의할 항목을 알려 줘요.'],
    ['Use the filters above for camp, category and currency, and search to find items.', 'Press “+ Budget item” and write the name, category, planned amount and expected amount.', 'When money is spent, update actual amount, vendor, paid date and status (Planned · Ordered · Paid).', 'There are also “Set total budget”, “Copy from another camp” and “Download CSV”. The “Forecast report” below flags items to watch.'],
    ['버스 대절', '분류 교통·차량 · 예산 계획 ₩ 1,000,000 · 실제 ₩ 800,000 · 상태 주문·계약 (예시)'],
    ['Bus charter', 'Category Transport · planned ₩ 1,000,000 · actual ₩ 800,000 · status Ordered (example)']);

  /* ───────── 캠프별 공간 ───────── */
  c('camps', 'main', '캠프별 공간', 'Camp Spaces',
    ['먼저 「+ 캠프 유형」으로 캠프 종류(예: Unity Camp, Winter Camp)를 만들어요.', '「+ 행사」로 올해 캠프를 넣어요. 연도·시즌·날짜·장소·상태를 적어요.', '위의 연도·시즌으로 걸러 보고, 캠프를 누르면 그 캠프의 공간으로 가요.', '카드를 끌어서 순서를 바꿔요. 바뀐 순서는 내 화면에만 적용돼요.'],
    ['First make a camp type with “+ Camp type” (e.g. Unity Camp, Winter Camp).', 'Add this year’s camp with “+ Event”: year, season, dates, place and status.', 'Filter by year and season above, and click a camp to open its space.', 'Drag a card to change the order. Your order applies to your screen only.'],
    ['2027 겨울 연합 캠프', '준비 중 · 2027-01-20 ~ 2027-01-23 · 업무 3 / 10 완료 (예시)'],
    ['2027 Winter Joint Camp', 'Planning · 2027-01-20 – 2027-01-23 · 3 / 10 tasks done (example)']);
  c('space', 'main', '캠프별 공간', 'Camp spaces',
    ['맨 위 숫자(진행 중 업무·마감 지남·담당자 미정·완료율)로 준비 상태를 봐요.', '카드(업무·일정·회의·결정·다음 안건·자료·예산)의 「전체 보기」를 누르면 그 화면으로 가요.', '위 버튼으로 「📋 캠프 준비」나 「진행 중 업무」로 바로 가요. 월코 포털 캠프와 연결하면 「신청 현황 · 예산」도 보여요.', '「화면 편집」에서 카드를 위아래로 옮기거나 숨겨요. 내 화면만 바뀌어요.'],
    ['The numbers on top (open tasks, overdue, no owner, completion) show how preparation is going.', 'Press “View all” on a card (tasks, events, meetings, decisions, next agenda, files, budget) to go to that page.', 'The buttons above jump to “📋 Camp prep” or open tasks. If linked to a WOLKO portal camp, “Registrations · Budget” also appears.', 'Use “Edit view” to move cards up/down or hide them. Only your screen changes.'],
    ['진행 중 업무 4 · 마감 지남 1 · 담당자 미정 2', '완료율 60% · 예시 숫자예요'],
    ['Open tasks 4 · Overdue 1 · No owner 2', 'Completion 60% · example numbers'],
    '캠프 한 곳의 공간 사용법', 'One camp’s space: how to use');

  /* ───────── 번역 도우미 ───────── */
  c('translate', 'main', '번역 도우미', 'Translation helper',
    ['번역할 파일(Word·PowerPoint·Excel·PDF, 15MB까지)을 끌어다 놓거나 「파일 고르기」를 눌러요.', '방향(한국어 ⇄ 영어)과 글의 종류(일반·설교·공지·일정표)를 고르고 「✨ 번역 시작」을 눌러요.', '끝나면 「번역한 파일 받기」로 내려받아요. 파일은 포털에 올라가지 않아요.', '꼭 한 번 읽고 고쳐 쓰세요. 돈 관련 파일은 번역할 수 없어요. 짧은 글은 루미의 「번역」 탭에서 해요.'],
    ['Drop the file to translate (Word, PowerPoint, Excel, PDF, up to 15 MB) or press “Choose a file”.', 'Choose the direction (Korean ⇄ English) and the kind of text, then press “✨ Start translating”.', 'When done, press “Download translated file”. The file itself is never uploaded to the portal.', 'Always read and fix it before use. Money files cannot be translated. Short text goes in Lumi’s “Translate” tab.'],
    ['2027 겨울캠프 안내문.docx', '한국어 → 영어 · 글자 3,200자 · 5번에 나눠 번역 · 끝나면 새 파일로 받아요 (예시)'],
    ['2027 Winter Camp notice.docx', 'Korean → English · 3,200 characters · sent in 5 parts · downloaded as a new file (example)']);

  /* ───────── 통합 검색 ───────── */
  c('search', 'main', '통합 검색', 'Search',
    ['왼쪽 위 검색 칸이나 이 화면의 검색 칸에 두 글자 이상 써서 「검색」을 눌러요.', '업무·회의·회의 구역·결정·파일·폴더·예산 항목이 종류별로 모여 나와요.', '결과를 누르면 그 화면으로 가서 열려요.', '금액이 들어 있는 자료는 권한이 있는 사람에게만 보여요.'],
    ['Type at least two characters in the search box at the top left or on this page, then press “Search”.', 'Tasks, meetings, meeting sections, decisions, files, folders and budget lines appear grouped by kind.', 'Click a result to open it on its own page.', 'Files with amounts are shown only to people with permission.'],
    ['버스', '업무 2건 · 회의 1건 · 결정 1건 · 파일 3건 (예시)'],
    ['bus', 'Tasks 2 · Meetings 1 · Decisions 1 · Files 3 (example)']);

  /* ───────── TV 대시보드 ───────── */
  c('tv', 'main', 'TV 대시보드', 'TV Dashboard',
    ['「TV 주소」를 복사해 TV 브라우저(예: TV Bro)에서 한 번 열고 즐겨찾기에 저장해요.', '「+ 위젯 추가」로 화면을 꾸미고, 「+ 화면 추가」로 화면을 늘려요.', '「슬라이드쇼 미리보기」로 먼저 보고, 「TV에 저장」을 눌러야 TV에 반영돼요.', '아래 「팀 공지」에서 켜 둔 공지만 TV에 나와요. 주소가 새어 나갔다면 「새 주소 만들기」를 눌러요. (주소·꾸미기는 관리자만 보여요)'],
    ['Copy the “TV link”, open it once in a TV browser (e.g. TV Bro) and bookmark it.', 'Decorate with “+ Add widget”, and add screens with “+ Add screen”.', 'Look first with “Slideshow preview”; the TV only changes after you press “Save to TV”.', 'Only active announcements under “Team announcements” appear on the TV. If the link leaks, press “New link”. (Link and editor are for admins.)'],
    ['오늘 일정 위젯', '화면 1 · 10초 · 오늘의 일정과 팀 공지가 번갈아 나와요 (예시)'],
    ['Today’s schedule widget', 'Screen 1 · 10 s · shows today’s schedule and team announcements in turn (example)']);

  /* ───────── 홈 ───────── */
  c('home', 'main', '팀 홈', 'Team Home',
    ['맨 위 「오늘 내가 할 일」 상자에서 오늘 마감과 곧 올 일정을 봐요.', '「내가 없는 동안」 상자는 마지막으로 본 뒤 새로 생기거나 바뀐 것을 알려 줘요. 다 봤으면 「확인했어요」.', '아래 카드(진행 중 업무·가까운 업무 마감·다음 회의 안건·최근 파일 등)를 눌러 그 화면으로 가요.', '「홈 꾸미기」에서 카드를 숨기거나 순서를 바꿔요. 나에게만 적용돼요.'],
    ['The “What I do today” box at the top shows today’s deadlines and what is coming soon.', 'The “While you were away” box lists what is new or changed since your last visit. Press “Got it” when seen.', 'Click the cards below (open tasks, upcoming deadlines, next agenda, recent files…) to go to that page.', 'Use “Customize home” to hide cards or change their order. It applies only to you.'],
    ['진행 중 업무 12 · 마감 지남 2 · 담당자 미정 3', '전체 완료율 45% · 예시 숫자예요'],
    ['Open tasks 12 · Overdue 2 · No owner 3', 'Completion 45% · example numbers'],
    '홈 화면 사용법', 'Home: how to use');

  window.CT_HOWTO = P;
})();
