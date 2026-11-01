/** 평가 설문: 질문 정리, 답 정리, 결과 요약. 이름·연락처는 묻지 않고 받지도 않는다. */
import { S, L } from './campteamCrud.js';
export const TYPES = ['rating', 'choice', 'text'];
export const MAX_Q = 15, MAX_RESPONSES = 1000, MAX_PER_IP_DAY = 5;
export const DEFAULT_QUESTIONS = [
  { type: 'rating', ko: '캠프 전체 만족도는 어땠나요?', en: 'How satisfied were you with the camp overall?' },
  { type: 'rating', ko: '프로그램(말씀·활동)은 어땠나요?', en: 'How were the programs (messages and activities)?' },
  { type: 'rating', ko: '시설·식사·안전은 어땠나요?', en: 'How were the facilities, meals and safety?' },
  { type: 'choice', ko: '다음 캠프에도 참여(또는 추천)하고 싶나요?', en: 'Would you join (or recommend) the next camp?', options: [{ ko: '꼭 하고 싶어요', en: 'Definitely' }, { ko: '아마도요', en: 'Probably' }, { ko: '잘 모르겠어요', en: 'Not sure' }, { ko: '아니요', en: 'No' }] },
  { type: 'text', ko: '가장 좋았던 점은 무엇인가요?', en: 'What did you like most?' },
  { type: 'text', ko: '아쉬웠거나 바뀌었으면 하는 점은 무엇인가요?', en: 'What could be better?' },
];
export function cleanQuestions(list) {
  const out = []; let n = 0;
  for (const q of (Array.isArray(list) ? list : []).slice(0, MAX_Q)) {
    const type = TYPES.includes(q?.type) ? q.type : null, ko = S(q?.ko, 200), en = S(q?.en, 200); if (!type || (!ko && !en)) continue;
    const item = { id: '', type, ko: ko || en, en: en || '' };
    if (type === 'choice') { item.options = (Array.isArray(q.options) ? q.options : []).slice(0, 8).map((o) => ({ ko: S(typeof o === 'string' ? o : o?.ko, 80), en: S(typeof o === 'string' ? '' : o?.en, 80) })).filter((o) => o.ko || o.en); if (item.options.length < 2) continue; }
    item.id = 'q' + (++n); out.push(item);
  }
  return out;
}
export const parseQuestions = (raw) => { try { return JSON.parse(raw || '[]'); } catch { return []; } };
/** 답 정리: 질문에 있는 번호만, 형식에 맞는 값만 (별점 1~5, 선택은 보기 번호, 글은 1000자까지). 하나도 없으면 null */
export function cleanAnswers(questions, raw) {
  const a = (raw && typeof raw === 'object') ? raw : {}, out = {};
  for (const q of questions) {
    const v = a[q.id]; if (v == null || v === '') continue;
    if (q.type === 'rating') { const n = Math.round(Number(v)); if (n >= 1 && n <= 5) out[q.id] = n; }
    else if (q.type === 'choice') { const i = Math.round(Number(v)); if (Number.isInteger(i) && i >= 0 && i < q.options.length) out[q.id] = i; }
    else { const t = L(v, 1000); if (t) out[q.id] = t; }
  }
  return Object.keys(out).length ? out : null;
}
export function summarize(questions, responses) {
  return questions.map((q) => {
    const vals = responses.map((r) => r[q.id]).filter((v) => v !== undefined), base = { id: q.id, type: q.type, ko: q.ko, en: q.en, n: vals.length };
    if (q.type === 'rating') { const d = [0, 0, 0, 0, 0]; vals.forEach((v) => { d[v - 1]++; }); return { ...base, avg: vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length * 10) / 10 : null, dist: d }; }
    if (q.type === 'choice') return { ...base, options: q.options.map((o, i) => ({ ko: o.ko, en: o.en, n: vals.filter((v) => v === i).length })) };
    return { ...base, texts: vals.slice(0, 200) };
  });
}
