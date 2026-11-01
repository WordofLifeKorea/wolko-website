// 로컬 시험 전용 "가짜 Claude 서버": 실제 AI 에 접속하지 않고, 정해진 회의록 초안을 Claude 와 같은 스트리밍 형식으로 돌려준다.
// 사용:  node camp-team/dev/mock-ai.mjs   →  WRANGLER_EXTRA="--binding ANTHROPIC_API_KEY=mock --binding CAMPTEAM_AI_URL=http://127.0.0.1:8799/v1/messages" ./camp-team/dev/run-local.sh
import http from 'node:http';
const draft = { title: { ko: '샘플 가짜 회의', en: 'Sample mock meeting' }, summary: { ko: '가짜 AI가 만든 요약입니다.', en: 'Summary made by the mock AI.' },
  sections: [{ titleKo: '참가비', titleEn: 'Fee', kind: 'discussion', bodyKo: '두 단계 금액이 논의되었다. (가상)', bodyEn: 'Two price tiers were discussed. (sample)', tags: ['예산'], evidence: ['"let\'s do two tiers"'] }, { titleKo: '배경', titleEn: 'Background', kind: 'context', bodyKo: '지난해 자료를 참고했다.', bodyEn: 'Last year\'s material was referenced.', tags: [], evidence: [] }],
  decisions: [{ kind: 'direction', textKo: '두 단계로 나눈다 (가상)', textEn: 'Use two tiers (sample)', sectionIndex: 0, tags: ['예산'], evidence: ['"two tiers"'] }, { kind: 'hold', textKo: '강사비 지급 방식은 보류 (가상)', textEn: 'Speaker payment on hold (sample)', sectionIndex: null, tags: [], evidence: [] }],
  tasks: [{ title: '안내문 초안 작성', titleEn: 'Draft the notice', sectionIndex: 0, ownerMentioned: 'Leader B', dueMentioned: 'next Friday', evidence: ['"B will write it"'] }], nextAgenda: [{ topicKo: '강사 일정 확정', topicEn: 'Confirm speaker schedule', noteKo: '날짜 조율', noteEn: 'Coordinate dates' }], uncertain: ['금액 단위가 분명하지 않았음 (가상)'] };
// 새 「AI 추천」(파일 제목·항목 / 행사 이름)용 가짜 답. 요청에 파일 이름이 있으면 그 이름을 제목에 넣어 준다.
const fileSuggestion = (name, camps = []) => { // 파일 이름에 따라 다르게 답한다(로컬 시험용): 종류·태그·본문·설교자·연도/계절·캠프가 파일마다 달라진다
  const h = [...String(name)].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7), pick = (arr) => arr[h % arr.length];
  const game = /game|게임|activity|활동/i.test(name), sermon = /john|요한|sermon|message|설교|메시지|말씀/i.test(name), song = /song|찬양|lyric|가사|worship/i.test(name), sched = /schedule|시간표|일정/i.test(name);
  const season = /겨울|winter/i.test(name) ? '겨울' : /여름|summer/i.test(name) ? '여름' : (h % 3 === 0 ? '' : pick(['겨울', '여름'])), year = /2026/.test(name) ? 2026 : /2027/.test(name) ? 2027 : (h % 4 === 0 ? null : pick([2026, 2027]));
  const camp = camps.find((c) => year && season && c.ko.includes(String(year)) && c.ko.includes(season)) || null;
  const tags = game ? [{ ko: '게임', en: 'game' }, { ko: '활동', en: 'activity' }] : sermon ? [{ ko: '구원', en: 'salvation' }, { ko: '복음', en: 'gospel' }] : song ? [{ ko: '찬양', en: 'worship' }] : sched ? [{ ko: '일정', en: 'schedule' }] : [{ ko: pick(['기도', '리더십', '교육']), en: 'topic' }];
  const ko = String(name).replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
  return { titles: [{ ko: ko + ' 정리본 (가짜 AI)', en: ko + ' (mock)' }, { ko: (year ? year + ' ' : '') + (season ? season + ' ' : '') + ko, en: 'Camp material: ' + ko }], description: '가짜 AI가 만든 한 줄 설명: ' + ko, category: game || sermon || sched ? 'program' : song ? 'program' : (h % 5 === 0 ? '' : 'etc'), topic: game ? '게임' : sermon ? '설교' : song ? '찬양' : sched ? '시간표' : '', tags, lang: /kor|한|설교|찬양|시간표/.test(name) ? 'ko' : pick(['en', 'both']), scripture: /john|요한/i.test(name) ? '요한복음 3:16-21' : '', speaker: /설교|sermon/i.test(name) && h % 2 ? '' : '', year, season, campId: camp ? camp.id : '', campReason: '' }; };
const campNames = { names: [{ ko: '2027 겨울 월코 영어 캠프', en: '2027 Winter WOLKO English Camp' }, { ko: '2027 겨울 월코 주니어 영어 캠프', en: '2027 Winter WOLKO Junior English Camp' }] };
http.createServer((req, res) => {
  let body = ''; req.on('data', c => body += c); req.on('end', () => {
    // 포털에게 물어보기 · 부탁 제안(스트리밍 아님)
    try { const j2 = JSON.parse(body); const sys2 = String(j2.system || '');
      if (!j2.stream && sys2.includes('numbered snippets')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ content: [{ type: 'text', text: '포털에서 관련 자료를 찾았어요 [S1]. (가짜 AI 답)' }] })); return; }
      if (!j2.stream && sys2.includes('ONE proposed portal action')) { const t = String((j2.messages || []).slice(-1)[0]?.content || ''); const m = /(\d+)월\s*(\d+)일/.exec(t); const due = m ? '2027-' + String(m[1]).padStart(2, '0') + '-' + String(m[2]).padStart(2, '0') : null; const title = t.replace(/<\/?request>/g, '').replace(/업무.*$/, '').replace(/\d+월\s*\d+일(까지)?/, '').trim() || '새 업무';
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ type: 'addTask', title, due, ownerName: null, campId: null, say: '「' + title + '」 업무를 추가할까요? (가짜 AI)' }) }] })); return; } } catch (e) { /* 아래로 */ }
    // 번역 도우미(스트리밍 아님): 글을 그대로 돌려주며 가짜 표시를 붙인다
    try { const j1 = JSON.parse(body); if (!j1.stream && String(j1.system || '').includes('You translate text')) {
      const t = String((j1.messages || []).slice(-1)[0]?.content || '').replace(/<\/?text>/g, '').trim();
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ content: [{ type: 'text', text: '(mock translation) ' + t }] })); return; } } catch (e) { /* 아래로 */ }
    // 캠프 도우미 챗(스트리밍 아님: stream 항목이 없거나 false): 사용법 질문에 가짜 답 + 맞는 화면 안내 번호
    try { const j0 = JSON.parse(body); if (!j0.stream && String(j0.system || '').includes('in-app helper')) {
      const last = String((j0.messages || []).slice(-1)[0]?.content || ''), g = /자료|파일|upload|file/i.test(last) ? 'addFile' : /업무|task/i.test(last) ? 'addTask' : '';
      const text = g ? '「+ 자료 추가」(또는 업무 추가) 버튼으로 할 수 있어요. (가짜 AI 답)\n[[guide:' + g + ']]' : '안녕하세요! 사용법을 짧게 알려 드릴게요. (가짜 AI 답)';
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ content: [{ type: 'text', text }] })); return; } } catch (e) { /* 아래로 */ }
    res.writeHead(200, { 'Content-Type': 'text/event-stream' }); let payload = draft;
    try { const j = JSON.parse(body), sys = String(j.system || ''); if (sys.includes('NO document')) { const m = /Typed title: ([^\n"]*)/.exec(JSON.stringify(j.messages).replace(/\\n/g, '\n')); const ty = m ? m[1].trim() : ''; payload = { titles: [{ ko: ty + ' 수업자료 (가짜 AI)', en: ty + ' Class Materials (mock)' }, { ko: ty + ' 안내문', en: ty + ' Notice' }], description: '', category: 'program', topic: '수업', year: null, season: '', campId: '', campReason: '' }; } else if (sys.includes('file a document')) { const m = /File name: ([^\n]*)/.exec(JSON.stringify(j.messages)) ; const raw = String((j.messages || []).map((x) => (typeof x.content === 'string' ? x.content : JSON.stringify(x.content))).join('\n')), camps = raw.split('\n').map((l) => l.split(' | ')).filter((c) => c.length >= 3 && /^[A-Za-z0-9_-]{4,}$/.test(c[0].trim())).map((c) => ({ id: c[0].trim(), ko: c[1].trim() })); payload = fileSuggestion(m ? m[1].replace(/\\n.*/, '') : 'file', camps); } else if (sys.includes('suggest names for a camp')) payload = campNames; } catch (e) { console.error("mock error:", e.message); }
    const text = JSON.stringify(payload); let i = 0;
    const t = setInterval(() => { if (i >= text.length) { res.write('event: message_stop\ndata: {"type":"message_stop"}\n\n'); res.end(); clearInterval(t); return; }
      res.write('event: content_block_delta\ndata: ' + JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: text.slice(i, i + 120) } }) + '\n\n'); i += 120; }, 60);
  });
}).listen(8799, '127.0.0.1', () => console.log('mock AI on 8799'));
