/* 화면마다 맨 위에 고정으로 보이는 「사용법 카드」 — 이 화면을 쓰는 순서와 예시 줄 하나.
   예시는 화면에 그려 보여 주기만 하는 가짜 내용이라 저장되지 않고, 카드 색을 다르게(노란 점선) 해서 실제 자료와 구분한다. 업무·회의록·자료실·보관함·캠프 준비 화면에 붙는다. */
(function () {
  var CT = window.CT; if (!CT) return;
  var KEY = { '/portal/campteam/tasks': 'tasks', '/portal/campteam/meetings': 'meetings', '/portal/campteam/files': 'files', '/portal/campteam/library': 'library', '/portal/campteam/prep': 'prep' };
  var sec = KEY[location.pathname.replace(/\/+$/, '')]; if (!sec) return;
  var top = document.querySelector('main .top'); if (!top) return;
  var C = {
    tasks: {
      ko: { t: '업무 화면 사용법', s: ['오른쪽 위 「+ 업무 추가」를 눌러 제목·담당자·기한·캠프를 적어요.', '담당자는 목록에서 고르거나 새 이름을 쓰면 돼요. 여러 명이면 이름을 이어서 넣어요.', '줄 아래 상태 버튼으로 진행 상황을 바꾸고, 위의 필터·검색으로 내 업무만 모아 봐요.', '말로 하고 싶으면 루미 「✍ 부탁」에 “내일까지 버스 예약 업무 추가해줘”라고 해 보세요.'], ex: ['버스 예약하기', '담당 Mina · 기한 6월 20일 · 상태 진행 중 · 캠프 겨울 연합 캠프'] },
      en: { t: 'How to use Tasks', s: ['Press “+ Add task” at the top right and fill in title, owner, due date and camp.', 'Pick an owner from the list or type a new name. For several people, keep adding names.', 'Change progress with the status buttons under each row, and use the filters and search above to see only your tasks.', 'Prefer talking? Tell Lumi under “Ask me to”: “add a task: book the bus by tomorrow”.'], ex: ['Book the bus', 'Owner Mina · due June 20 · In progress · Winter Joint Camp'] }
    },
    meetings: {
      ko: { t: '회의록·결정 사용법', s: ['「+ 회의 만들기」로 회의를 만들고 날짜·안건·참석자를 적어요.', '회의에서 정한 일(결정)과 할 일은 칸에 적고, 할 일은 업무로 만들 수 있어요.', '회의 글(전사문)을 붙여 넣으면 AI가 회의록 초안을 만들어 줘요. 확인하고 저장하는 건 사람이에요.', '지난 회의와 결정은 위의 검색으로 다시 찾아요.'], ex: ['6월 팀 회의', '결정: 버스는 2대로 · 할 일: 버스 예약 (Mina, 6월 20일) · 다음 안건: 숙소 배정'] },
      en: { t: 'How to use Meetings & decisions', s: ['Press “+ New meeting” and add the date, agenda and attendees.', 'Write what you decided and the to-dos in their boxes; to-dos can become tasks.', 'Paste the meeting transcript and the AI drafts the minutes. A person checks and saves.', 'Find past meetings and decisions with the search above.'], ex: ['June team meeting', 'Decision: 2 buses · To-do: book the bus (Mina, June 20) · Next agenda: room assignment'] }
    },
    files: {
      ko: { t: '자료실 사용법', s: ['「+ 자료 추가」에서 「파일 올리기」(여러 파일·폴더째 가능) 또는 「링크 연결」(구글 문서·시트 등)을 골라요.', '올릴 때 「AI 도우미」를 켜면 제목·종류·캠프를 추천해 줘요. 직접 고친 칸은 그대로 둬요.', '위의 검색·종류·태그로 찾고, 파일을 누르면 자세히 보거나 내려받을 수 있어요.', '설교·찬양·게임처럼 내용을 정리해 둘 카드는 「보관함」에 만들어요.'], ex: ['2027 겨울캠프 일정표.pdf', '종류 일정 · 캠프 겨울 연합 캠프 · 태그 일정, 겨울 · 한국어'] },
      en: { t: 'How to use Files', s: ['In “+ Add file” choose “Upload files” (many files or whole folders) or “Link” (Google Docs, Sheets, …).', 'Turn on the “AI helper” when uploading to get suggestions for title, kind and camp. Boxes you edit are kept.', 'Find files with search, kind and tags; click one to see details or download.', 'Cards that organize sermons, worship sets or games belong in the “Library”.'], ex: ['2027 Winter Camp schedule.pdf', 'Kind: schedule · Camp: Winter Joint Camp · Tags: schedule, winter · Korean'] }
    },
    library: {
      ko: { t: '보관함 사용법', s: ['위의 탭에서 설교·메시지 / 찬양 콘티 / 게임·활동 / 장소·시설 중 하나를 골라요.', '「+ 추가」로 카드를 만들어요. 제목과 간단한 내용만 적어도 돼요.', '「자료실에서 가져오기」로 자료실 파일의 태그·성경 본문·설교자를 카드로 옮길 수 있어요.', '노래 가사는 글로 저장하지 않고, 자료실 파일을 카드에 연결해 두세요.'], ex: ['물풍선 릴레이', '게임 · 인원 20명 · 15분 · 준비물 풍선, 양동이 · 태그 야외'] },
      en: { t: 'How to use the Library', s: ['Pick a tab above: sermons / worship setlists / games & activities / venues.', 'Press “+ Add” to make a card. A title and a short note are enough.', 'Use “Import from Files” to copy tags, scripture and speaker from a file in Files.', 'Do not store song lyrics as text; link the file from Files to the card instead.'], ex: ['Water balloon relay', 'Game · 20 people · 15 min · supplies: balloons, buckets · tag: outdoor'] }
    },
    prep: {
      ko: { t: '캠프 준비 사용법', s: ['위에서 연도 → 유형 → 캠프 순서로 눌러 캠프 하나를 골라요.', '탭으로 진행표·준비물·연락처·배정·설문 같은 준비 도구를 열어요.', '「+ 추가」로 한 줄씩 넣거나, 엑셀 표를 「엑셀에서 붙여넣기」로 한 번에 넣어요.', '연락처는 캠프팀 명단에 있는 사람만 볼 수 있어요.'], ex: ['09:00–09:30 등록·접수', '장소 로비 · 담당 Jason · 겨울 연합 캠프 첫째 날'] },
      en: { t: 'How to use Camp prep', s: ['Choose one camp at the top: Year → Type → Camp.', 'Open prep tools in the tabs: timeline, supplies, contacts, assignments, survey.', 'Press “+ Add” for one row, or use “Paste from Excel” to add a whole table at once.', 'Contacts are visible only to people on the camp team list.'], ex: ['09:00–09:30 Registration', 'Place: Lobby · Owner Jason · Winter Joint Camp day 1'] }
    }
  };
  CT.addDict({ ko: { htBadge: '예시 카드', htEx: '예시', htNote: '아래는 보여 주기 위한 가짜 예시예요. 실제 자료가 아니고 저장되지 않아요.', htHide: '접기 ▲', htShow: '펼치기 ▼', htBar: '이 화면 사용법 · 예시' },
    en: { htBadge: 'Example card', htEx: 'Example', htNote: 'The row below is a made-up example for illustration. It is not real data and is not saved.', htHide: 'Hide ▲', htShow: 'Show ▼', htBar: 'How to use this page · example' } });
  /* 접어 둔 상태는 계정마다 서버에 기억하고(다른 기기에서도 같음), 서버를 못 쓰면 이 브라우저에만 기억한다. 처음엔 펼쳐서 보여 준다 */
  var PK = 'howto:' + sec, LK = 'ct-' + PK, hidden = false;
  try { hidden = localStorage.getItem(LK) === '1'; } catch (e) {}
  function remember(v) { try { v ? localStorage.setItem(LK, '1') : localStorage.removeItem(LK); } catch (e) {} CT.api('/api/campteam/ui-prefs', { method: 'PUT', body: { key: PK, value: v ? '1' : '' } }).catch(function () {}); }
  var box = document.createElement('section'); box.className = 'ct-howto'; box.id = 'ctHowto'; box.setAttribute('aria-label', 'how to use'); top.insertAdjacentElement('afterend', box);
  function paint() {
    var d = C[sec][CT.lang() === 'en' ? 'en' : 'ko'], esc = CT.esc; box.classList.toggle('is-min', hidden);
    if (hidden) { box.innerHTML = '<div class="ht-bar"><span class="ht-bt">💡 ' + esc(CT.t('htBar')) + '</span><span class="ht-badge">' + esc(CT.t('htBadge')) + '</span><button type="button" class="ht-tg" data-ht="show" aria-expanded="false">' + esc(CT.t('htShow')) + '</button></div>'; return; }
    box.innerHTML = '<div class="ht-head"><b>💡 ' + esc(d.t) + '</b><span class="ht-badge">' + esc(CT.t('htBadge')) + '</span><button type="button" class="ht-tg" data-ht="hide" aria-expanded="true">' + esc(CT.t('htHide')) + '</button></div>' +
      '<ol class="ht-steps">' + d.s.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol>' +
      '<div class="ht-ex"><span class="ht-tag">' + esc(CT.t('htEx')) + '</span><div class="ht-exb"><b>' + esc(d.ex[0]) + '</b><small>' + esc(d.ex[1]) + '</small></div></div><p class="ht-note">' + esc(CT.t('htNote')) + '</p>';
  }
  box.addEventListener('click', function (e) { var b = e.target.closest('[data-ht]'); if (!b) return; hidden = b.dataset.ht === 'hide'; remember(hidden); paint(); });
  paint(); document.addEventListener('ct-lang', paint);
  document.addEventListener('ct-ready', function () { CT.api('/api/campteam/ui-prefs').then(function (r) { var v = r && r.prefs && r.prefs[PK]; if (v === undefined && !hidden) return; var h = v === '1'; if (v === undefined && hidden) { remember(true); return; } if (h !== hidden) { hidden = h; try { h ? localStorage.setItem(LK, '1') : localStorage.removeItem(LK); } catch (e) {} paint(); } }).catch(function () {}); });
})();
