// 로컬 시험 전용 "가짜 Claude 서버": 실제 AI 에 접속하지 않고, 정해진 회의록 초안을 Claude 와 같은 스트리밍 형식으로 돌려준다.
// 사용:  node camp-team/dev/mock-ai.mjs   →  WRANGLER_EXTRA="--binding ANTHROPIC_API_KEY=mock --binding CAMPTEAM_AI_URL=http://127.0.0.1:8799/v1/messages" ./camp-team/dev/run-local.sh
import http from 'node:http';
const draft = { title: { ko: '샘플 가짜 회의', en: 'Sample mock meeting' }, summary: { ko: '가짜 AI가 만든 요약입니다.', en: 'Summary made by the mock AI.' },
  sections: [{ titleKo: '참가비', titleEn: 'Fee', kind: 'discussion', bodyKo: '두 단계 금액이 논의되었다. (가상)', bodyEn: 'Two price tiers were discussed. (sample)', tags: ['예산'], evidence: ['"let\'s do two tiers"'] }, { titleKo: '배경', titleEn: 'Background', kind: 'context', bodyKo: '지난해 자료를 참고했다.', bodyEn: 'Last year\'s material was referenced.', tags: [], evidence: [] }],
  decisions: [{ kind: 'direction', textKo: '두 단계로 나눈다 (가상)', textEn: 'Use two tiers (sample)', sectionIndex: 0, tags: ['예산'], evidence: ['"two tiers"'] }, { kind: 'hold', textKo: '강사비 지급 방식은 보류 (가상)', textEn: 'Speaker payment on hold (sample)', sectionIndex: null, tags: [], evidence: [] }],
  tasks: [{ title: '안내문 초안 작성', titleEn: 'Draft the notice', sectionIndex: 0, ownerMentioned: 'Leader B', dueMentioned: 'next Friday', evidence: ['"B will write it"'] }], nextAgenda: [{ topicKo: '강사 일정 확정', topicEn: 'Confirm speaker schedule', noteKo: '날짜 조율', noteEn: 'Coordinate dates' }], uncertain: ['금액 단위가 분명하지 않았음 (가상)'] };
// 새 「AI 추천」(파일 제목·항목 / 행사 이름)용 가짜 답. 요청에 파일 이름이 있으면 그 이름을 제목에 넣어 준다.
const fileSuggestion = (name) => ({ titles: [{ ko: '2027 겨울 월코 영어 캠프 수업자료 (가짜 AI)', en: '2027 Winter WOLKO English Camp Class Materials (mock)' }, { ko: `${name} 정리본`, en: `${name} (tidy)` }], description: '가짜 AI가 만든 한 줄 설명이에요.', category: 'program', topic: '수업', year: 2027, season: '겨울', campId: '', campReason: '' });
const campNames = { names: [{ ko: '2027 겨울 월코 영어 캠프', en: '2027 Winter WOLKO English Camp' }, { ko: '2027 겨울 월코 주니어 영어 캠프', en: '2027 Winter WOLKO Junior English Camp' }] };
http.createServer((req, res) => {
  let body = ''; req.on('data', c => body += c); req.on('end', () => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream' }); let payload = draft;
    try { const j = JSON.parse(body), sys = String(j.system || ''); if (sys.includes('NO document')) { const m = /Typed title: ([^\n"]*)/.exec(JSON.stringify(j.messages).replace(/\\n/g, '\n')); const ty = m ? m[1].trim() : ''; payload = { titles: [{ ko: ty + ' 수업자료 (가짜 AI)', en: ty + ' Class Materials (mock)' }, { ko: ty + ' 안내문', en: ty + ' Notice' }], description: '', category: 'program', topic: '수업', year: null, season: '', campId: '', campReason: '' }; } else if (sys.includes('file a document')) { const m = /File name: ([^\n]*)/.exec(JSON.stringify(j.messages)) ; payload = fileSuggestion(m ? m[1].replace(/\\n.*/, '') : 'file'); } else if (sys.includes('suggest names for a camp')) payload = campNames; } catch (e) { /* 회의록 초안 */ }
    const text = JSON.stringify(payload); let i = 0;
    const t = setInterval(() => { if (i >= text.length) { res.write('event: message_stop\ndata: {"type":"message_stop"}\n\n'); res.end(); clearInterval(t); return; }
      res.write('event: content_block_delta\ndata: ' + JSON.stringify({ type: 'content_block_delta', index: 0, delta: { type: 'text_delta', text: text.slice(i, i + 120) } }) + '\n\n'); i += 120; }, 60);
  });
}).listen(8799, '127.0.0.1', () => console.log('mock AI on 8799'));
