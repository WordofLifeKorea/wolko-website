/** 평가 설문: 질문 정리, 답 정리, 결과 요약. 이름·연락처는 묻지 않고 받지도 않는다. */
import { S, L } from './campteamCrud.js';
/**
 * 질문 종류. 앞의 셋(rating·choice·text)은 예전 설문이 쓰던 것이라 그대로 읽고 답을 받는다.
 *  short 짧은 글 · paragraph 긴 글 · choice 객관식(하나) · checkbox 체크박스(여러 개) · dropdown 드롭다운 · scale 선형 배율(1~5 또는 1~10) · rating 별점(1~5) · heading 제목·설명 블록(답 없음)
 * 답 모양(저장·전송 모두 같다): rating/scale → 숫자 · choice/dropdown → 보기 번호(0부터) 또는 {other:'직접 쓴 글'} · checkbox → [보기 번호…, {other:'…'}?] · 글 → 문자열
 */
export const TYPES = ['rating', 'choice', 'text', 'short', 'paragraph', 'checkbox', 'dropdown', 'scale', 'heading'];
export const TEXT_TYPES = ['text', 'short', 'paragraph'], PICK_TYPES = ['choice', 'checkbox', 'dropdown'];
export const AUDIENCES = ['staff', 'student', 'parent', 'church', 'other'];
export const AUDIENCE_KO = { staff: '스태프', student: '학생(캠퍼)', parent: '부모님', church: '교회·학교', other: '기타(링크만)' };
export const MAX_Q = 50, MAX_OPTIONS = 20, MAX_RESPONSES = 1000, MAX_PER_IP_DAY = 5;
export const DEFAULT_QUESTIONS = [
  { type: 'rating', ko: '캠프 전체 만족도는 어땠나요?', en: 'How satisfied were you with the camp overall?' },
  { type: 'rating', ko: '프로그램(말씀·활동)은 어땠나요?', en: 'How were the programs (messages and activities)?' },
  { type: 'rating', ko: '시설·식사·안전은 어땠나요?', en: 'How were the facilities, meals and safety?' },
  { type: 'choice', ko: '다음 캠프에도 참여(또는 추천)하고 싶나요?', en: 'Would you join (or recommend) the next camp?', options: [{ ko: '꼭 하고 싶어요', en: 'Definitely' }, { ko: '아마도요', en: 'Probably' }, { ko: '잘 모르겠어요', en: 'Not sure' }, { ko: '아니요', en: 'No' }] },
  { type: 'text', ko: '가장 좋았던 점은 무엇인가요?', en: 'What did you like most?' },
  { type: 'text', ko: '아쉬웠거나 바뀌었으면 하는 점은 무엇인가요?', en: 'What could be better?' },
];
const NEXT = { type: 'choice', ko: '다음 캠프에도 참여(또는 추천)하고 싶나요?', en: 'Would you join (or recommend) the next camp?', options: [{ ko: '꼭 하고 싶어요', en: 'Definitely' }, { ko: '아마도요', en: 'Probably' }, { ko: '잘 모르겠어요', en: 'Not sure' }, { ko: '아니요', en: 'No' }] };
const LIKED = { type: 'paragraph', ko: '가장 좋았던 점은 무엇인가요?', en: 'What did you like most?' }, BETTER = { type: 'paragraph', ko: '아쉬웠거나 바뀌었으면 하는 점은 무엇인가요?', en: 'What could be better?' };
const AGREE5 = { max: 5, lowKo: '부족했어요', lowEn: 'Not enough', highKo: '충분했어요', highEn: 'More than enough' };
/** 대상별 시작 질문 묶음 — 새 설문을 만들 때 대상을 고르면 이 질문들이 먼저 들어가고, 고치거나 지울 수 있다 */
export const STARTERS = {
  student: { title: '캠프 평가 (학생)', titleEn: 'Camp evaluation (students)', description: '캠프에 함께해 줘서 고마워요! 솔직하게 답해 주면 다음 캠프가 더 좋아져요. 이름은 묻지 않아요.', descriptionEn: 'Thank you for joining camp! Honest answers help us make the next camp better. We do not ask your name.', questions: [
    { type: 'rating', ko: '캠프 전체 만족도는 어땠나요?', en: 'How satisfied were you with the camp overall?', required: true },
    { type: 'rating', ko: '말씀과 찬양 시간은 어땠나요?', en: 'How were the message and worship times?' },
    { type: 'checkbox', ko: '가장 좋았던 시간을 모두 골라 주세요.', en: 'Pick all the times you liked best.', options: [{ ko: '말씀', en: 'Messages' }, { ko: '찬양', en: 'Worship' }, { ko: '소그룹', en: 'Small groups' }, { ko: '게임·활동', en: 'Games and activities' }, { ko: '식사·간식', en: 'Meals and snacks' }], other: true },
    { type: 'scale', ko: '친구에게 이 캠프를 추천하고 싶은 정도는?', en: 'How likely are you to recommend this camp to a friend?', max: 10, lowKo: '전혀 아니에요', lowEn: 'Not at all', highKo: '꼭 추천해요', highEn: 'Definitely' },
    NEXT, LIKED, BETTER] },
  parent: { title: '캠프 평가 (부모님)', titleEn: 'Camp evaluation (parents)', description: '자녀를 캠프에 보내 주셔서 감사합니다. 의견을 주시면 다음 캠프에 반영하겠습니다. 이름·연락처는 묻지 않습니다.', descriptionEn: 'Thank you for sending your child to camp. Your feedback will shape the next camp. We do not ask for your name or contact.', questions: [
    { type: 'rating', ko: '캠프 전체 만족도는 어떠셨나요?', en: 'How satisfied were you with the camp overall?', required: true },
    { type: 'rating', ko: '안전과 돌봄은 어떠셨나요?', en: 'How was the safety and care?' },
    { type: 'scale', ko: '캠프 전·중 안내와 소통은 충분했나요?', en: 'Was the communication before and during camp enough?', ...AGREE5 },
    { type: 'paragraph', ko: '자녀에게서 보인 변화나 들은 이야기가 있다면 적어 주세요.', en: 'Please share any change you noticed in your child, or anything they told you.' },
    NEXT, BETTER] },
  staff: { title: '캠프 평가 (스태프)', titleEn: 'Camp evaluation (staff)', description: '섬겨 주셔서 감사합니다. 다음 캠프를 위해 솔직한 이야기를 들려 주세요. 이름은 묻지 않아요.', descriptionEn: 'Thank you for serving. Please share honest feedback for the next camp. We do not ask your name.', questions: [
    { type: 'rating', ko: '이번 캠프를 섬긴 전체 경험은 어땠나요?', en: 'How was your overall experience serving at this camp?', required: true },
    { type: 'scale', ko: '사전 교육과 준비는 충분했나요?', en: 'Were the training and preparation enough?', ...AGREE5 },
    { type: 'rating', ko: '팀 안에서의 소통과 분위기는 어땠나요?', en: 'How were communication and atmosphere within your team?' },
    { type: 'dropdown', ko: '맡은 역할은 나에게 어땠나요?', en: 'How did your role fit you?', options: [{ ko: '잘 맞았어요', en: 'A good fit' }, { ko: '보통이었어요', en: 'It was okay' }, { ko: '다른 역할이 더 맞았을 것 같아요', en: 'Another role would fit better' }] },
    { type: 'choice', ko: '다음 캠프에도 섬기고 싶나요?', en: 'Would you like to serve at the next camp?', options: [{ ko: '꼭 하고 싶어요', en: 'Definitely' }, { ko: '아마도요', en: 'Probably' }, { ko: '잘 모르겠어요', en: 'Not sure' }, { ko: '어려울 것 같아요', en: 'Probably not' }] },
    LIKED, BETTER] },
  church: { title: '캠프 평가 (교회·학교)', titleEn: 'Camp evaluation (churches and schools)', description: '함께해 주셔서 감사합니다. 학생들을 보내며 느끼신 점을 알려 주세요. 이름·연락처는 묻지 않습니다.', descriptionEn: 'Thank you for partnering with us. Please tell us what you noticed as your students joined. We do not ask for your name or contact.', questions: [
    { type: 'rating', ko: '캠프 전체 만족도는 어떠셨나요?', en: 'How satisfied were you with the camp overall?', required: true },
    { type: 'rating', ko: '학생들에게 도움이 되었다고 느끼시나요?', en: 'Do you feel the camp helped your students?' },
    { type: 'rating', ko: '교회·학교와의 연락과 안내는 어땠나요?', en: 'How was the communication with your church or school?' },
    { type: 'choice', ko: '다음 캠프에도 학생들을 보내고 싶으신가요?', en: 'Would you send students to the next camp?', options: [{ ko: '꼭 보내고 싶어요', en: 'Definitely' }, { ko: '아마도요', en: 'Probably' }, { ko: '잘 모르겠어요', en: 'Not sure' }, { ko: '아니요', en: 'No' }] },
    LIKED, BETTER] },
  other: { title: '캠프 평가', titleEn: 'Camp evaluation', description: '', descriptionEn: '', questions: DEFAULT_QUESTIONS },
};
export const starterFor = (audience) => STARTERS[audience] || STARTERS.other;
export const cleanAudience = (a) => (AUDIENCES.includes(a) ? a : 'other');

const idNum = (id) => { const m = /^q(\d{1,4})$/.exec(String(id || '')); return m ? +m[1] : 0; };
const cleanOption = (o) => ({ ko: S(typeof o === 'string' ? o : o?.ko, 80), en: S(typeof o === 'string' ? '' : o?.en, 80) });
/**
 * 질문 정리. 번호(id)는 보낸 것이 q숫자 모양이고 겹치지 않으면 그대로 둔다 — 순서를 바꾸거나 중간 질문을 지워도 이미 받은 답이 엉뚱한 질문에 붙지 않게.
 * 번호가 없는 새 질문은 minSeq(지금까지 쓴 가장 큰 번호)보다 큰 번호를 받는다. (번호를 하나도 안 보낸 예전 방식 호출은 q1, q2, … 로 매긴다)
 */
export function cleanQuestions(list, minSeq = 0) {
  const items = [], used = new Set();
  for (const q of (Array.isArray(list) ? list : []).slice(0, MAX_Q)) {
    const type = TYPES.includes(q?.type) ? q.type : null, ko = S(q?.ko, 200), en = S(q?.en, 200); if (!type) continue;
    const item = { id: '', type, ko: ko || en, en: en || '' };
    if (type === 'heading') {
      const dk = L(q?.descKo, 500), de = L(q?.descEn, 500); if (!ko && !en && !dk && !de) continue;
      if (dk || de) { item.descKo = dk || de; item.descEn = dk ? de : ''; }
    } else {
      if (!ko && !en) continue;
      if (q.required === true) item.required = true;
      if (PICK_TYPES.includes(type)) {
        item.options = (Array.isArray(q.options) ? q.options : []).slice(0, MAX_OPTIONS).map(cleanOption).filter((o) => o.ko || o.en);
        if (type !== 'dropdown' && q.other === true) item.other = true;
        if (item.options.length + (item.other ? 1 : 0) < (type === 'checkbox' ? 1 : 2)) continue;
      } else if (type === 'scale') {
        item.max = Number(q.max) === 10 ? 10 : 5;
        for (const k of ['lowKo', 'lowEn', 'highKo', 'highEn']) { const v = S(q[k], 40); if (v) item[k] = v; }
      }
    }
    const n = idNum(q.id); if (n && !used.has(n)) { used.add(n); item.id = 'q' + n; }
    items.push(item);
  }
  let seq = Math.max(minSeq, 0);
  const free = () => { do { seq++; } while (used.has(seq)); used.add(seq); return 'q' + seq; };
  for (const it of items) if (!it.id) it.id = free();
  return items;
}
/** 질문 목록에서 가장 큰 번호 (qSeq 기록용) */
export const maxQ = (qs) => (Array.isArray(qs) ? qs : []).reduce((m, q) => Math.max(m, idNum(q?.id)), 0);
export const parseQuestions = (raw) => { try { return JSON.parse(raw || '[]'); } catch { return []; } };
const asIndex = (v, q) => { const i = typeof v === 'number' || (typeof v === 'string' && /^\d{1,3}$/.test(v.trim())) ? Math.round(Number(v)) : NaN; return Number.isInteger(i) && i >= 0 && i < (q.options?.length || 0) ? i : -1; };
const otherOf = (v, q) => (q.other && v && typeof v === 'object' && !Array.isArray(v) ? S(v.other, 200) : '');
/** 답 정리: 질문에 있는 번호만, 형식에 맞는 값만 (별점 1~5, 배율 1~최대, 선택은 보기 번호, 글은 1000자까지). 하나도 없으면 null */
export function cleanAnswers(questions, raw) {
  const a = (raw && typeof raw === 'object') ? raw : {}, out = {};
  for (const q of questions) {
    if (q.type === 'heading') continue;
    const v = a[q.id]; if (v == null || v === '') continue;
    if (q.type === 'rating') { const n = Math.round(Number(v)); if (n >= 1 && n <= 5) out[q.id] = n; }
    else if (q.type === 'scale') { const n = Math.round(Number(v)), max = q.max === 10 ? 10 : 5; if (n >= 1 && n <= max) out[q.id] = n; }
    else if (q.type === 'choice' || q.type === 'dropdown') { const i = asIndex(v, q), o = otherOf(v, q); if (i >= 0) out[q.id] = i; else if (o) out[q.id] = { other: o }; }
    else if (q.type === 'checkbox') {
      const list = Array.isArray(v) ? v : [v], picks = [...new Set(list.map((x) => asIndex(x, q)).filter((i) => i >= 0))].sort((x, y) => x - y), o = list.map((x) => otherOf(x, q)).find(Boolean) || '';
      if (picks.length || o) out[q.id] = o ? [...picks, { other: o }] : picks;
    }
    else if (q.type === 'short') { const t = S(v, 200); if (t) out[q.id] = t; }
    else { const t = L(v, 1000); if (t) out[q.id] = t; }
  }
  return Object.keys(out).length ? out : null;
}
/** 꼭 답해야 하는 질문(required) 중 답이 없는 것의 번호들 — 예전 설문에는 required 가 없으므로 항상 [] */
export const missingRequired = (questions, answers) => questions.filter((q) => q.required && q.type !== 'heading' && !(answers && q.id in answers)).map((q) => q.id);
const avgOf = (vals) => (vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10 : null);
export function summarize(questions, responses) {
  return questions.filter((q) => q.type !== 'heading').map((q) => {
    const vals = responses.map((r) => r[q.id]).filter((v) => v !== undefined), base = { id: q.id, type: q.type, ko: q.ko, en: q.en, n: vals.length };
    if (q.type === 'rating') { const d = [0, 0, 0, 0, 0]; vals.forEach((v) => { d[v - 1]++; }); return { ...base, avg: avgOf(vals), dist: d }; }
    if (q.type === 'scale') { const max = q.max === 10 ? 10 : 5, d = Array(max).fill(0); vals.forEach((v) => { if (v >= 1 && v <= max) d[v - 1]++; }); return { ...base, max, avg: avgOf(vals), dist: d }; }
    if (q.type === 'choice' || q.type === 'dropdown') {
      const out = { ...base, options: q.options.map((o, i) => ({ ko: o.ko, en: o.en, n: vals.filter((v) => v === i).length })) };
      if (q.other) { out.others = vals.filter((v) => v && typeof v === 'object').map((v) => v.other).slice(0, 200); out.otherN = out.others.length; }
      return out;
    }
    if (q.type === 'checkbox') {
      const picks = vals.map((v) => (Array.isArray(v) ? v : [])), out = { ...base, options: q.options.map((o, i) => ({ ko: o.ko, en: o.en, n: picks.filter((p) => p.includes(i)).length })) };
      if (q.other) { out.others = picks.flatMap((p) => p.filter((x) => x && typeof x === 'object').map((x) => x.other)).slice(0, 200); out.otherN = out.others.length; }
      return out;
    }
    return { ...base, texts: vals.slice(0, 200) };
  });
}
