/* 루미의 단계형 고정 질문 — 미리 써 둔 질문과 답이라 AI 를 쓰지 않는다(즉시·무료·정확).
   루미가 인사하면 맨 위 질문(root)이 나오고, 하나를 고르면 답과 함께 그 아래 질문들이 이어서 나온다. 끝까지 가면 형제 질문과 「처음으로」가 나온다.
   node: { q:{ko,en} 질문 글, a:{ko,en} 루미의 답, guide?: 화면 안내 번호(assistant-guides.js), next?: [하위 질문 번호] }
   ※ 지금 실제로 있는 기능만 쓴다. 새 기능을 만들면 여기에도 같이 적는다. */
(function () {
  var N = {};
  function n(id, q, a, o) { o = o || {}; N[id] = { q: { ko: q[0], en: q[1] }, a: { ko: a[0], en: a[1] }, guide: o.guide || '', next: o.next || [] }; }

  /* ───── 맨 위 질문 ───── */
  n('ai', ['AI 기능은 뭐가 있어요?', 'What AI features are there?'],
    ['포털에는 이런 AI 기능이 있어요. 궁금한 걸 골라 보세요.', 'These are the AI features in the portal. Pick one to learn more.'],
    { next: ['ai_intake', 'ai_title', 'ai_campname', 'ai_minutes', 'ai_translate', 'ai_translate_text', 'ai_pair', 'ai_checklist', 'ai_daily', 'ai_undo', 'ai_safe', 'ai_lumi'] });
  n('upload', ['자료를 올리고 싶어요', 'I want to add a file'],
    ['어떻게 올리실 건가요?', 'How would you like to add it?'], { next: ['up_file', 'up_many', 'up_link', 'up_share', 'up_undo'] });
  n('find', ['자료·업무를 찾고 싶어요', 'I want to find something'],
    ['무엇을 찾으세요?', 'What are you looking for?'], { next: ['find_all', 'find_tag', 'find_camp', 'find_portal', 'find_library', 'find_filelib'] });
  n('work', ['업무·회의·일정을 다루고 싶어요', 'Tasks, meetings and events'],
    ['어떤 일을 하실 건가요?', 'What would you like to do?'], { next: ['w_task', 'w_meeting', 'w_event', 'w_alerts', 'w_ooo', 'w_catchup'] });
  n('camp', ['캠프(행사)·TV 화면이 궁금해요', 'Camps and the TV screen'],
    ['캠프 준비에 필요한 기능이에요.', 'These help you prepare camps.'], { next: ['c_create', 'c_space', 'c_tv', 'c_prep', 'c_series', 'c_phonecal', 'c_formhand', 'c_wizard', 'c_close', 'c_survey', 'c_assign', 'c_forms'] });
  n('c_prep', ['진행표·준비물·연락처', 'Timeline, supplies, contacts'],
    ['왼쪽 메뉴의 「캠프 준비」(또는 캠프별 공간 맨 위의 「📋 캠프 준비」)를 열어요. 진행표 탭은 날짜별 시간표(엑셀에서 붙여넣기 가능, 지금 진행 중인 줄이 초록으로 표시), 준비물 탭은 필요/구입함/준비 끝 상태와 지난 캠프에서 복사, 연락처 탭은 교회·학교·업체·강사 연락처예요. 연락처는 캠프팀 명단에 있는 사람만 봐요.',
     'Open "Camp Prep" in the left menu (or "📋 Camp prep" at the top of a camp space). Timeline: a schedule by day (paste from Excel; the running row turns green). Supplies: Needed/Bought/Ready with copy from a past camp. Contacts: churches, schools, vendors, speakers, visible only to camp team members.']);
  n('c_series', ['반복되는 캠프 (교회·교회학교)', 'Recurring camps'],
    ['캠프 준비 화면의 「반복 캠프」 탭에서 시리즈를 만들고 열리는 달(예: 3·7·12월)을 골라 두세요. 새 회차는 연도와 달을 골라 「새 회차 만들기」로 직접 만들어요. 자동으로 만들지 않아요.',
     'In the "Recurring camps" tab of Camp prep, create a series and pick the months it runs (e.g. 3, 7, 12). Create each round yourself by choosing year and month. Nothing is created automatically.']);
  n('c_phonecal', ['폰 캘린더·폰에서 업무 추가는요?', 'Phone calendar / add tasks from phone'],
    ['이 두 기능은 아이폰에서만 되는 방식이라 지금은 꺼 두었어요. 갤럭시를 쓰는 팀원도 있어서, 포털 앱이 앱스토어·플레이스토어에 정식으로 나온 뒤에 다시 열 예정이에요. 켜더라도 관리자에게만 보여요.',
     'These two features only work well on iPhone, so they are switched off for now. Some teammates use Galaxy phones, so we will reopen them after the portal app is officially released in the app stores. When on, only admins will see them.']);
  n('c_forms', ['다음 캠프 신청서·지원서는 어디서 만들어요?', 'Where do I make the next camp forms?'],
    ['캠프 준비의 「신청서」 탭에서 만들어요. 「+ 새 신청서」를 누르면 같은 종류·유형의 가장 최근 신청서를 복사해서 시작하고, 필요한 칸·문단·동의만 고치면 돼요(스태프·크루 지원서도 같아요). 작성(Ella) → 검토(Jason) → 최종 승인(Aiden)을 모두 거치면 「승인 완료」로 보관돼요. 홈페이지에는 연결되어 있지 않아요.',
     'Make them in the "Forms" tab of Camp prep. "+ New form" starts as a copy of the most recent form of the same kind and type; edit only the items, paragraphs and consents that change (same for staff/crew forms). After Write (Ella) → Review (Jason) → Final approval (Aiden) it is kept as "Approved". It is not connected to the website.']);
  n('c_formhand', ['새 캠프 카드는 어떻게 홈페이지에 올라가요?', 'How does a new camp card get to the homepage?'],
    ['캠프 준비의 「신청서」 탭에서 Ella 가 지난 캠프 내용을 불러와 바뀐 것만 고쳐요(한국어·영어는 AI 가 빈 칸을 채워 줘요). Jason 이 검토하고 Aiden 이 마무리해서 승인하면, 월코 포털 종 알림으로 환규 선교사님께만 「캠프팀에서 온 요청」이 가요. 환규 선교사님이 확인하고 CMS 에 넣어 배포하면 끝나요. 이 화면은 홈페이지에 직접 쓰지 않아요. 확인이 끝나면 Ella·Jason·Aiden 에게 완료 알림이 가고, 홈페이지에 올라간 뒤에는 캠프별 공간에 캠프가 자동으로 만들어져요.',
     'In the "Forms" tab of Camp prep, Ella loads the last camp and changes only what differs (AI fills empty Korean/English boxes). Jason reviews, Aiden finishes and approves, and only HwanKyu gets a "request from the camp team" in the WOLKO portal bell. HwanKyu checks it, enters it in the CMS and deploys. This screen never writes to the homepage. When he confirms, Ella, Jason and Aiden get a completion alert, and once it is live the camp is created automatically in the camp spaces.']);
  n('c_wizard', ['새 캠프 시작 마법사', 'Start wizard for a new camp'],
    ['캠프 준비 화면의 「시작 마법사」 탭을 열고 위에서 새 캠프를 고르세요. 지난 캠프 후보가 나오고(「루미에게 추천받기」도 있어요), 하나를 고르면 업무·진행표·준비물·자료 후보가 보여요. 체크한 것만 복사돼요. 담당자는 비워지고 날짜는 시작일 차이만큼 옮겨져요.',
     'In the "Start wizard" tab of Camp prep, pick the new camp at the top. Past camps appear (you can also ask Lumi to recommend); choose one to see tasks, timeline, supplies and files. Only ticked items are copied: owners stay empty and dates shift by the difference in start dates.']);
  n('c_close', ['캠프 끝난 뒤 마감하기', 'Closing out a camp'],
    ['캠프 준비 화면의 「마감 마법사」 탭에서 끝나지 않은 업무, 자료·준비물·회의 현황을 점검해요. 업무를 「해당 없음」으로 정리하고, 감사 인사·결과 보고서 같은 후속 업무를 골라 추가하고, 캠프 상태를 완료로 바꿀 수 있어요. 고른 것만 적용돼요.',
     'In the "Close-out wizard" tab of Camp prep you review unfinished tasks and files/supplies/meetings, mark tasks not applicable, add follow-up tasks (thank-you notes, report) and set the camp to Done. Only what you choose is applied.']);
  n('c_survey', ['캠프 평가 설문', 'Camp evaluation survey'],
    ['캠프 준비 화면의 「평가 설문」 탭에서 설문을 만들고(기본 질문 6개), 「링크 켜기」로 만든 링크를 참가자·교회·스태프에게 보내세요. 로그인 없이 답할 수 있고 이름·연락처는 묻지 않아요. 결과는 캠프 담당자만 볼 수 있고, 필요 없어지면 링크를 끄면 돼요.',
     'In the "Survey" tab of Camp prep, create a survey (6 default questions), turn the link on and send it to participants, churches or staff. No login needed and no name or contact is asked. Only camp managers see results; turn the link off when done.']);
  n('c_assign', ['조·방·차량 배정과 경고', 'Groups, rooms, vehicles and warnings'],
    ['캠프 준비 화면의 「배정」 탭에서 참가자·스태프 명단을 엑셀에서 붙여넣고, 조·방·차량을 만든 뒤 사람마다 골라 배정해요. 「조 자동 배정 제안」은 성별·학년이 골고루 섞이게 제안만 하고, 「적용」을 눌러야 저장돼요. 미성년자와 성인이 단둘이 있는 차량·방, 정원 초과, 운전자 없음, 남녀 방 섞임, 진행표에서 담당·장소 시간이 겹치는 것은 경고로 알려 줘요(막지는 않아요). 이름·성별·학년·교회·역할만 저장해요.',
     'In the "Assign" tab of Camp prep, paste the participant and staff list from Excel, create groups, rooms and vehicles, and assign people. "Suggest groups" only proposes a balance by gender and grade; nothing is saved until you press Apply. Warnings (a minor alone with an adult in a vehicle or room, over capacity, no driver, mixed-gender rooms, overlapping owners or places in the timeline) only inform. Only name, gender, grade, church and role are stored.']);
  n('tips', ['화면·언어·권한이 궁금해요', 'Screen, language and permissions'],
    ['자주 헷갈리는 것들이에요.', 'Things that are often confusing.'], { next: ['t_lang', 't_phone', 't_trash', 't_perm', 't_off'] });

  /* ───── AI 기능 ───── */
  n('ai_intake', ['AI 정리함 (여러 파일 한 번에 정리)', 'AI intake (organize many files)'],
    ['자료실 「+ 자료 추가」에서 파일(또는 폴더)을 여러 개 고른 뒤 「✨ 파일 내용을 읽고 정리하기」를 누르면, AI 가 파일마다 제목·종류·태그·언어·성경 본문·설교자·관련 캠프를 제안해요. 확인하고 고친 뒤 「저장」을 눌러야 저장돼요.',
     'In Files › "+ Add material", pick several files (or a folder) and press "✨ Read the files and organize". The AI suggests title, type, tags, language, scripture, speaker and camp for each file. Nothing is saved until you check/edit and press Save.'],
    { guide: 'addFile', next: ['ai_intake_when', 'ai_intake_unknown', 'ai_undo', 'ai_safe'] });
  n('ai_intake_when', ['언제 쓰면 좋아요?', 'When should I use it?'],
    ['예전에 모아 둔 파일이 많거나, 이름만으로는 무슨 자료인지 알기 어려울 때 좋아요. 처음에는 파일 3~5개로 해 보고, 마음에 들면 폴더째 올려 보세요.',
     'It helps when you have many old files, or file names do not say what they are. Try 3-5 files first, then a whole folder.']);
  n('ai_intake_unknown', ['AI 가 모르는 건 어떻게 해요?', 'What if the AI does not know something?'],
    ['문서에 없는 설교자·성경 본문은 비워 둬요(지어내지 않아요). 모르는 칸은 비워 둔 채 저장해도 되고, 나중에 자료를 열어서 고칠 수 있어요. 오래된 파일은 기억이 안 나면 그냥 두셔도 괜찮아요.',
     'Speaker and scripture are left blank unless the document states them (the AI never guesses). You can save with blanks and edit later. For old files, it is fine to leave things empty.']);
  n('ai_title', ['제목·종류 추천 (파일 하나)', 'Title and type suggestions (one file)'],
    ['파일 하나를 고르면 AI 가 내용을 읽고 제목(한/영), 설명, 종류, 주제, 태그, 관련 캠프를 채워 줘요. 파일 없이 제목만 입력해도 맞는 캠프를 고르고 제목 후보를 보여 줘요(「AI 도우미」 스위치가 켜져 있을 때). AI 가 채운 칸에는 「AI」 표시가 붙고, 직접 고친 칸은 덮어쓰지 않아요.',
     'Pick one file and the AI reads it and fills title (KO/EN), description, type, topic, tags and camp. Even if you only type a title, it picks the camp and offers title ideas (when the "AI helper" switch is on). AI-filled fields get an "AI" mark and your edits are never overwritten.'],
    { guide: 'addFile', next: ['ai_intake', 'ai_safe'] });
  n('ai_campname', ['행사 이름 추천', 'Camp name suggestions'],
    ['캠프(행사)를 만들 때 「✨ 이름 추천」을 누르면 유형·연도·계절·장소·메모를 보고 「연도 계절 이름」 형식으로 2~3개 제안해요. 골라야 이름이 바뀌어요.',
     'When creating a camp, "✨ Suggest names" proposes 2-3 names in "year season name" style from the type, year, season, place and notes. The name changes only if you pick one.'],
    { guide: 'addCamp' });
  n('ai_minutes', ['회의록 AI 초안', 'AI draft of meeting minutes'],
    ['회의에 회의 글(녹취를 글로 옮긴 것)을 붙여 넣으면 AI 가 요약·결정·할 일·다음 안건 초안을 만들어요. 사람이 확인하고 골라서 적용해야 회의록에 들어가요.',
     'Paste a meeting transcript into a meeting and the AI drafts a summary, decisions, tasks and next agenda. Nothing enters the minutes until you review and apply it.'],
    { guide: 'addMeeting' });
  n('ai_translate', ['자동 번역', 'Automatic translation'],
    ['업무 제목은 한국어/영어로 자동 번역돼서 업무·홈·캠프 공간·달력·검색에서 언어를 바꿔 볼 수 있어요. 번역이 안 된 업무는 설정 화면의 「번역 안 된 업무 번역하기」로 한 번에 번역할 수 있어요.',
     'Task titles are translated automatically so you can switch language in Tasks, Home, Camp spaces, Calendar and Search. Untranslated tasks can be translated at once from Settings.'],
    { next: ['t_lang'] });
  n('ai_translate_text', ['번역 도우미 (문서 파일 번역)', 'Translation helper (documents)'],
    ['자료실 위의 「번역 도우미」(또는 /portal/campteam/translate/)에서 Word·PowerPoint·Excel 파일을 올리면 글꼴·표·배치는 그대로 두고 글만 한국어↔영어로 바꾼 새 파일을 내려받아요. PDF 는 글만 뽑아 새 Word 문서로 만들어 줘요(배치·표·그림은 사라져요). 장부·예산 같은 돈 관련 파일은 번역하지 않아요. 짧은 글(단톡에 올릴 말 등)은 루미의 「🌐 번역」 버튼을 쓰세요. 결과는 꼭 한 번 읽어 보고 쓰세요.',
     'Use the "Translation helper" above Files (or /portal/campteam/translate/): upload a Word, PowerPoint or Excel file and download a new file with only the text changed Korean ↔ English; fonts, tables and layout stay. PDFs become a new Word file with text only (layout, tables and images are lost). Finance files such as ledgers and budgets are not translated. For short text use Lumi\'s "🌐 Translate" button. Always read the result before using it.']);
  n('ai_pair', ['한·영 짝 묶기 · 중복 정리', 'Pairing and duplicates'],
    ['자료실 위의 「정리 제안」을 누르면 같은 내용의 한국어·영어 자료 짝 후보와 중복·최신본 후보가 나와요. 「짝으로 묶기」「나머지는 휴지통으로」를 눌러야만 바뀌고, 휴지통에서 되살릴 수 있어요.',
     'Press "Tidy suggestions" above Files to see Korean/English pair candidates and duplicates. Nothing changes until you press "Pair them" or "Move the rest to trash", and the trash can be restored.']);
  n('ai_checklist', ['체크리스트 파일 → 업무', 'Checklist file → tasks'],
    ['체크리스트 파일(체크 표시나 목록으로 된 글)을 AI 정리함으로 읽으면 「업무 N개를 추가할까요?」 질문이 나와요. 담당자·기한은 비워 두고, 같은 이름 업무는 건너뛰어요.',
     'When Lumi reads a checklist file she asks "Add N tasks?". Owners and due dates stay empty and tasks with the same name are skipped.'], { guide: 'addFile' });
  n('find_filelib', ['자료실과 보관함은 뭐가 달라요?', 'Files vs Library: what is the difference?'],
    ['자료실은 실제 파일(PPT·PDF·사진·영상)과 링크를 올려 두는 「파일 창고」이고, 보관함은 설교·찬양 콘티·게임·장소를 정보 카드로 정리해 두는 곳이에요. 파일을 올릴 때는 자료실, 다시 꺼내 쓸 내용(게임 규칙, 찬양 순서, 장소 답사 메모)은 보관함에 적어 두세요. 보관함 카드에서 자료실 파일을 연결할 수도 있고, 「자료실에서 가져오기」로 카드를 한 번에 만들 수도 있어요.',
     'Files is the warehouse for real files (PPT, PDF, photos, video) and links. Library holds info cards for sermons, worship setlists, games and venues. Upload files in Files; keep what you will reuse (game rules, song order, venue visit notes) as Library cards. A card can link a file, and "Import from Files" builds cards in one go.'], { next: ['find_folders'] });
  n('find_folders', ['폴더 만들기·옮기기·지우기 (자료실)', 'Files: create, move, delete folders'],
    ['자료실 「폴더별 보기」에서 「＋ 새 폴더」로 빈 폴더를 만들 수 있고, 폴더 안에도 폴더를 5단계까지 만들 수 있어요. 파일이나 폴더를 옮기려면 컴퓨터에서는 끌어다 놓고(폴더 카드 가운데에 놓으면 그 안으로, 위·아래 가장자리에 놓으면 순서 바꾸기), 폰에서는 「폴더로 이동」과 「위로/아래로」 버튼을 쓰세요. 폴더를 삭제하면 「안의 파일과 폴더를 한 단계 위로 옮기고 이 폴더만 지우기」와 「안의 파일과 폴더까지 모두 삭제」 중에서 고를 수 있고, 두 가지 모두 휴지통에서 복구할 수 있어요.',
     'In Files › "By folder", "＋ New folder" makes an empty folder, and folders can nest up to 5 levels. To move a file or folder, drag and drop on a computer (drop on the middle of a folder card to move inside it, on the top/bottom edge to reorder); on a phone use the "Move to folder" and "Up/Down" buttons. Deleting a folder lets you choose between moving what is inside up one level and deleting only the folder, or deleting everything inside. Both can be restored from the Trash.'], { guide: 'addFile' });
  n('find_library', ['설교·찬양·게임·장소 찾기 (보관함)', 'Sermons, worship, games, venues (Library)'],
    ['왼쪽 메뉴의 「보관함」을 열면 설교·메시지 / 찬양 콘티 / 게임·활동 / 장소·시설 탭이 있어요. 검색창에 제목·성경 본문·설교자·태그를 쓰면 찾아져요. 「자료실에서 가져오기」로 AI 정리함으로 태그를 단 자료를 옮겨 올 수 있어요. 노래 가사는 글로 저장하지 않고 자료실 파일로 연결해요.',
     'Open "Library" in the left menu: tabs for Sermons, Worship sets, Games & activities and Venues. Search by title, scripture, speaker or tag. "Import from Files" brings in files Lumi has tagged. Lyrics are not stored as text; link lyric files from Files instead.']);
  n('ai_daily', ['오늘 요약', 'Daily summary'],
    ['홈의 「오늘 내가 할 일」 카드 위에 AI 가 하루 요약을 짧게 알려 줘요.', 'On the Home "today" card the AI shows a short daily summary.']);
  n('ai_undo', ['AI 로 올린 걸 되돌리기', 'Undoing an upload'],
    ['여러 파일을 한 번에 올리면 자료실 위에 「방금 올린 N개 — 한 번에 되돌리기」 줄이 생겨요. 누르면 그 묶음이 모두 휴지통으로 가고, 휴지통에서 다시 살릴 수 있어요.',
     'After uploading several files, a "Just uploaded N — Undo all at once" bar appears above the list. It moves the whole batch to the trash, from where you can restore it.']);
  n('ai_safe', ['AI 가 틀리면요? 내 자료는 안전해요?', 'What if the AI is wrong? Is my data safe?'],
    ['AI 는 제안만 하고, 저장은 항상 사람이 눌러요. 금액(예산) 자료는 AI 에 보내지 않아요. 글(또는 PDF·사진)의 앞부분만 AI 서비스로 보내고 파일 자체는 저장되지 않아요. 저(루미)는 포털 자료를 볼 수 없어서 다른 사람의 업무·금액을 말하지 못해요.',
     'The AI only suggests; you always press Save. Budget (amount) files are never sent to the AI. Only the beginning of the text (or PDF/photo) is sent and the file is not stored. I (Lumi) cannot read portal data, so I cannot tell you anyone else\'s tasks or amounts.']);
  n('ai_lumi', ['루미는 뭘 할 수 있어요?', 'What can Lumi do?'],
    ['저는 포털 사용법을 알려 드리고(💡 도움말), 포털 자료를 찾아 주고(🔎 찾기), 업무·일정을 만들거나 고치고 지우는 부탁을 받아 확인 카드로 보여 주고(✍ 부탁), 글을 한국어↔영어로 바꿔 줘요(🌐 번역). 저장은 항상 사람이 확인 버튼을 눌러야 돼요. 아래 질문을 골라도 되고, 직접 물어보셔도 돼요.',
     'I explain how to use the portal. I answer questions and, when useful, dim the screen and highlight what to press. I cannot search or save things for you. Pick a question below or just ask me.'],
    { next: ['upload', 'find', 'work', 'ai_lumi_memory'] });
  n('ai_lumi_memory', ['루미는 내 부탁을 기억해요? 고치거나 지울 수도 있어요?', 'Does Lumi remember my requests? Can it edit or delete?'],
    ['네. 루미는 내 계정의 최근 대화를 기억해서, 다른 화면이나 다음 날 열어도 이어서 얘기할 수 있어요(내 계정에만 저장되고 다른 사람은 못 봐요). 「✍ 부탁」에서 「아까 그 일정 10시로 바꿔줘」「그 업무 지워줘」처럼 말하면, 내가 만들었거나 내가 담당인 업무와 내가 만든 일정을 찾아 어떻게 바뀌는지 카드로 보여 줘요. 확인을 눌러야만 바뀌고, 지운 것은 휴지통에서 되살릴 수 있어요. 대화를 지우고 싶으면 「새 대화」를 누르세요.',
     'Yes. Lumi remembers the recent chat of your account, so you can continue on another page or the next day (stored for your account only; nobody else can see it). In "Ask me to", say things like "move that event to 10" or "delete that task": Lumi finds tasks you created or own and events you created, and shows a card of the change. Nothing changes until you press confirm, and deleted items can be restored from Trash. Press "New chat" to clear the conversation.']);

  /* ───── 올리기 ───── */
  n('up_file', ['파일 하나 올리기', 'Add one file'],
    ['자료실에서 「+ 자료 추가」를 누르고 파일을 고르세요. AI 도우미를 켜 두면 제목·종류·캠프를 추천해 줘요. 마지막에 「저장」을 눌러요.',
     'In Files click "+ Add material" and choose a file. With the AI helper on it suggests title, type and camp. Finish with Save.'], { guide: 'addFile', next: ['ai_title'] });
  n('up_many', ['여러 파일·폴더 한꺼번에', 'Many files or a folder at once'],
    ['「+ 자료 추가」에서 여러 파일이나 「폴더 선택」을 고르면 파일마다 따로 저장돼요. 파일마다 이름을 고칠 수 있고 「전체 공개」도 따로 체크할 수 있어요. 「✨ 파일 내용을 읽고 정리하기」로 AI 가 한꺼번에 정리해 줄 수도 있어요.',
     'In "+ Add material" pick several files or "Choose folder"; each file is saved separately. You can edit each name and tick "Share with all" per file. "✨ Read the files and organize" lets the AI do it all at once.'],
    { guide: 'addFile', next: ['ai_intake', 'up_share', 'up_undo'] });
  n('up_link', ['구글 문서·Canva 링크 연결', 'Link a Google doc or Canva design'],
    ['「+ 자료 추가」에서 「링크 연결」 탭을 누르세요. 위쪽 「새로 만들기」로 새 구글 문서·시트·슬라이드·폼·Canva 를 열 수 있고, 만든 뒤 링크를 붙여 넣으면 돼요. 링크는 팀이 열 수 있게 공유 설정을 해 주세요.',
     'In "+ Add material" open the "Link" tab. "Create new" opens a new Google Doc/Sheet/Slides/Form or Canva; paste the link back. Make sure the link is shared so the team can open it.'], { guide: 'addFile' });
  n('up_share', ['「전체 공개」가 뭐예요?', 'What does "Share with all" mean?'],
    ['체크하지 않은 파일은 캠프팀 명단에 있는 사람만 볼 수 있고, 체크하면 월코 팀원 모두가 볼 수 있어요. 금액이 든 자료는 전체 공개로 할 수 없어요.',
     'Unchecked files can be seen only by the camp team roster; checked files can be seen by the whole WOLKO team. Files with amounts cannot be shared with all.']);
  n('up_undo', ['잘못 올렸어요', 'I uploaded something by mistake'],
    ['여러 파일을 한 번에 올렸다면 자료실 위의 「한 번에 되돌리기」를 누르세요. 하나만 잘못 올렸다면 자료를 열어서 삭제하세요. 둘 다 휴지통으로 가서 다시 살릴 수 있어요.',
     'If you uploaded several files, press "Undo all at once" above the list. For a single file, open it and delete it. Both go to the trash and can be restored.'], { next: ['t_trash'] });

  /* ───── 찾기 ───── */
  n('find_all', ['업무·회의·파일 한꺼번에 찾기', 'Search everything'],
    ['왼쪽 맨 위 검색창에 두 글자 이상 쓰고 Enter 를 누르면 업무·회의·결정·파일·폴더가 한꺼번에 나와요.', 'Type at least two letters in the search box at the top-left and press Enter: tasks, meetings, decisions, files and folders appear together.'], { guide: 'findFile' });
  n('find_tag', ['태그·성경 본문·설교자로 찾기', 'Find by tag, scripture or speaker'],
    ['자료실 목록 위의 「태그」 줄에서 태그를 누르면 그 태그의 자료만 보여요. 검색창에 성경 본문(예: 3:16)이나 설교자 이름을 써도 찾아져요.',
     'In Files, click a tag in the "Tags" row to see only that tag. You can also type a scripture (e.g. 3:16) or a speaker name in the search box.']);
  n('find_camp', ['캠프별로 모아 보기', 'View by camp'],
    ['자료실 위의 「모든 캠프」에서 캠프를 고르면 그 캠프의 자료만 보여요. 캠프별 공간에서는 그 캠프의 일정·업무·회의·결정·파일·예산을 한 화면에 모아 봐요.',
     'In Files, choose a camp in the "All camps" filter. The camp space shows that camp\'s schedule, tasks, meetings, decisions, files and budget on one screen.'], { next: ['c_space'] });
  n('find_portal', ['월코 포털 캠프 자료실 자료', 'WOLKO portal camp resources'],
    ['자료실의 「🌐 월코 포털 캠프 자료실」 폴더에 포털 자료가 읽기 전용으로 함께 보여요(캠프팀 명단에 있는 사람만). 캠프 → 형식 → 팀 폴더 순서로 나뉘어 있어요.',
     'The "🌐 WOLKO portal camp resources" folder in Files shows portal materials read-only (camp team roster only), grouped by camp, type and team folder.']);

  /* ───── 업무·회의·일정 ───── */
  n('w_task', ['업무 추가하기', 'Add a task'], ['업무 메뉴에서 「+ 업무 추가」를 누르고 이름·담당자·마감일·캠프를 정해요. 비워 둘 수 있는 칸이 많아요.', 'In Tasks click "+ Task" and set name, owner, due date and camp. Many fields can stay blank.'], { guide: 'addTask' });
  n('w_meeting', ['회의 기록 만들기', 'Create a meeting record'], ['회의록·결정 메뉴에서 「+ 회의 만들기」를 누르세요. 저장한 뒤 회의를 열어 안건·결정·할 일을 적거나 회의 글을 붙여 AI 초안을 만들 수 있어요.', 'In Meetings click "+ New meeting". After saving, open it to add agenda, decisions and tasks, or paste a transcript for an AI draft.'], { guide: 'addMeeting', next: ['ai_minutes'] });
  n('w_event', ['달력에 일정 넣기', 'Add a calendar event'], ['달력에서 「+ 일정 추가」를 누르세요. 종류를 「부재」로 하면 그날 홈에 「오늘 부재」로 표시돼요.', 'In Calendar click "+ Event". The type "Out of office" shows the person as out on the Home page.'], { guide: 'addEvent' });
  n('w_alerts', ['알림 확인하기', 'Check alerts'], ['오른쪽 위 종 모양(또는 「알림공지」)에서 마감·회의·공지 알림을 한곳에서 볼 수 있어요. 알림 시점과 이메일(매주 화요일·마감 알림 끄기)은 「알림공지」 오른쪽 위 「설정」에서 바꿔요. 이메일을 꺼도 목록은 그대로예요.', 'The bell (or "Alerts") shows deadlines, meetings and notices in one place. Change alert timing and switch e-mails off under Alerts → Settings (top right); the list stays as it is.'], { guide: 'openAlerts' });
  n('w_ooo', ['「오늘 부재」는 어떻게 나와요?', 'How does "out today" work?'],
    ['달력에서 종류를 「부재」로 일정을 만들거나, 월코 직원 캘린더에 「이름 Out of office」 같은 종일 일정을 만들면 홈에 「오늘 부재 N명」으로 나오고, 사무실 책상에는 「휴가」 팻말이 놓여요. 그날 직접 접속하면 「재택」으로 바뀌어요.',
     'Create an "Out of office" event in the calendar, or an all-day "Name Out of office" event in the WOLKO staff calendar: Home shows "N out today" and the desk gets a "OOO" sign, which turns into "WFH" if they log in that day.']);
  n('w_catchup', ['「내가 없는 동안」이 뭐예요?', 'What is "While you were away"?'],
    ['하루 넘게 접속하지 않았다가 돌아오면, 홈 위쪽에 그 사이 다른 사람이 바꾼 업무·결정·회의·자료·일정 개수가 나와요. 「확인했어요」를 누르면 닫혀요.',
     'If you come back after more than a day, Home shows how many tasks, decisions, meetings, files and events others changed meanwhile. Press "Got it" to close it.']);

  /* ───── 캠프·TV ───── */
  n('c_create', ['캠프(행사) 만들기', 'Create a camp'], ['캠프별 공간 메뉴에서 「+ 행사」를 누르세요. 유형·연도·계절을 고르면 「✨ 이름 추천」으로 이름을 제안받을 수 있어요.', 'In Camps click "+ Event". After choosing type, year and season, "✨ Suggest name" proposes names.'], { guide: 'addCamp', next: ['ai_campname'] });
  n('c_space', ['캠프별 공간이 뭐예요?', 'What is a camp space?'], ['캠프 하나의 일정·업무·회의·결정·파일·예산을 한 화면에 모아 보는 곳이에요.', 'One screen with a camp\'s schedule, tasks, meetings, decisions, files and budget.']);
  n('c_tv', ['TV 대시보드는 어떻게 꾸며요?', 'How do I set up the TV dashboard?'], ['TV 대시보드 메뉴에서 위젯을 추가하고 옮겨서 사무실 TV 화면을 꾸며요. 주소는 같은 화면 위쪽에 있고, 「TV에 저장」을 눌러야 TV 에 반영돼요.', 'In the TV dashboard menu add and arrange widgets. The TV address is at the top; press "Save to TV" to publish.']);

  /* ───── 화면·언어·권한 ───── */
  n('t_lang', ['한국어/영어 바꾸기', 'Switch language'], ['KO/EN 버튼을 누르면 화면 전체가 바로 바뀌어요.', 'The KO/EN buttons switch the whole screen right away.'], { guide: 'switchLang' });
  n('t_phone', ['폰에서 메뉴가 안 보여요', 'I cannot see the menu on my phone'], ['폰에서는 왼쪽 위의 ≡ 버튼을 누르면 메뉴가 열려요.', 'On a phone, tap the ≡ button at the top to open the menu.']);
  n('t_trash', ['지운 걸 되살리고 싶어요', 'I want to restore something I deleted'], ['왼쪽 메뉴의 「휴지통」에서 지운 자료·업무를 다시 살릴 수 있어요.', 'Use "Trash" in the left menu to restore deleted files and tasks.']);
  n('t_perm', ['버튼이 안 보여요', 'A button is missing'], ['조회 전용 계정이거나 그 영역의 쓰기 권한이 없으면 「추가」 같은 버튼이 안 보여요. 관리자에게 권한을 요청해 주세요.', 'View-only accounts, or accounts without write permission for that area, do not see buttons like "Add". Ask an admin for access.']);
  n('t_off', ['「AI 가 아직 안 켜졌어요」라고 나와요', 'It says the AI is not turned on'], ['서버에 AI 키가 아직 없을 때 나오는 안내예요. 관리자에게 알려 주세요. AI 없이도 고정 질문과 화면 안내는 그대로 쓸 수 있어요.', 'That message appears when the server has no AI key yet. Please tell an admin. The fixed questions and on-screen guides still work without AI.']);

  window.CTFaq = { root: ['upload', 'find', 'work', 'camp', 'ai', 'tips'], nodes: N };
})();
