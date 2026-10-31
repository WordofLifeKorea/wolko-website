import { nowIso } from './campteamDb.js';

/**
 * 자료실의 태그·언어·성경 본문·설교자 + 일괄 올리기 묶음. 0024 마이그레이션이 아직 없는 DB 에서는 조용히 건너뛴다(자료 올리기 자체는 된다).
 * 값은 모두 사람이 고치거나 비울 수 있고, AI 가 제안해도 저장은 사람이 누른다.
 */
export const LANGS = ['ko', 'en', 'both'];
const clip = (s, n) => String(s ?? '').normalize('NFC').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

/* 태그는 「한글/영어」 짝으로 저장한다(예: 기도/prayer). 화면은 언어에 맞는 쪽을 보여 주고, 검색은 어느 쪽 글자로도 찾아진다.
   AI 는 처음부터 짝으로 만들어 주고, 사람이 한쪽만 쓴 흔한 태그는 아래 사전으로 짝을 채운다(사전에 없으면 쓴 그대로). */
export const TAG_PAIRS = [['구원', 'salvation'], ['복음', 'gospel'], ['기도', 'prayer'], ['찬양', 'worship'], ['예배', 'worship service'], ['게임', 'game'], ['활동', 'activity'], ['수업', 'class'],
  ['설교', 'sermon'], ['메시지', 'message'], ['말씀', 'Bible study'], ['성경공부', 'Bible study'], ['큐티', 'devotion'], ['리더십', 'leadership'], ['영어', 'English'], ['학생', 'students'], ['청소년', 'youth'],
  ['스태프', 'staff'], ['크루', 'crew'], ['자원봉사', 'volunteer'], ['안전', 'safety'], ['예산', 'budget'], ['홍보', 'promotion'], ['포스터', 'poster'], ['일정', 'schedule'], ['시간표', 'timetable'],
  ['준비물', 'supplies'], ['평가', 'evaluation'], ['회의', 'meeting'], ['체크리스트', 'checklist'], ['캠프', 'camp'], ['스킷', 'skit'], ['간증', 'testimony'], ['전도', 'evangelism'], ['제자훈련', 'discipleship'],
  ['교육', 'education'], ['훈련', 'training'], ['영상', 'video'], ['사진', 'photo'], ['악보', 'sheet music'], ['가사', 'lyrics'], ['차량', 'vehicle'], ['식사', 'meals'], ['숙소', 'lodging'], ['교회', 'church'], ['학교', 'school'],
  ['한국문화', 'Korean culture'], ['레크리에이션', 'recreation'], ['소그룹', 'small group'], ['결단', 'commitment'], ['감사', 'thanks'], ['보고서', 'report'], ['안내문', 'notice']];
const PAIR_BY = new Map(); for (const [k, e] of TAG_PAIRS) { PAIR_BY.set(k.toLowerCase(), `${k}/${e}`); PAIR_BY.set(e.toLowerCase(), `${k}/${e}`); }
const tagKey = (t) => t.toLowerCase();
/** 태그 하나 정리: 「한글/영어」가 이미 있으면 그대로, 한쪽만 있으면 사전에서 짝을 채운다 */
export function cleanTag(raw) {
  let x = clip(raw, 44).replace(/,/g, ' ').trim(); if (!x) return '';
  const parts = x.split('/').map((p) => p.trim()).filter(Boolean).slice(0, 2);
  if (parts.length === 2) return `${clip(parts[0], 20)}/${clip(parts[1], 22)}`;
  const one = clip(parts[0] || '', 24); if (!one) return '';
  return PAIR_BY.get(one.toLowerCase()) || one;
}
/** 태그 목록: 문자열(쉼표·#·줄바꿈) · 배열(글자 또는 {ko,en}) → 「a/b,c」 (중복 제거·최대 6개) */
export function cleanTags(v) {
  const list = Array.isArray(v) ? v : String(v ?? '').split(/[,\n#;、，]+/);
  const seen = new Set(), out = [];
  for (const t of list) {
    const raw = t && typeof t === 'object' ? [t.ko, t.en].filter(Boolean).join('/') : t;
    const x = cleanTag(raw), k = x && tagKey(x); if (x && !seen.has(k)) { seen.add(k); out.push(x); }
    if (out.length >= 6) break;
  }
  return out.join(',');
}
export const cleanLang = (v) => (LANGS.includes(v) ? v : '');
export const cleanScripture = (v) => clip(v, 60);
export const cleanSpeaker = (v) => clip(v, 40);
export const cleanBatchId = (v) => (/^[A-Za-z0-9-]{8,64}$/.test(String(v || '')) ? String(v) : '');

/** 이 자료에 태그·언어·본문·설교자를 쓴다. src 에 있는 칸만 바꾼다(get 으로 값을 꺼내는 함수 또는 객체). 열이 없는 DB 면 false */
export async function applyMeta(env, fileId, src) {
  const has = (k) => (typeof src.has === 'function' ? src.has(k) : k in src), get = (k) => (typeof src.get === 'function' ? src.get(k) : src[k]);
  const sets = [], args = [];
  if (has('tags')) { sets.push('tags = ?'); args.push(cleanTags(get('tags'))); }
  if (has('lang')) { sets.push('lang = ?'); args.push(cleanLang(get('lang'))); }
  if (has('scripture')) { sets.push('scripture = ?'); args.push(cleanScripture(get('scripture'))); }
  if (has('speaker')) { sets.push('speaker = ?'); args.push(cleanSpeaker(get('speaker'))); }
  if (!sets.length) return true;
  try { await env.DB.prepare(`UPDATE files SET ${sets.join(', ')} WHERE id = ?`).bind(...args, fileId).run(); return true; } catch { return false; }
}

/** 일괄 올리기 묶음에 이 파일을 넣는다 (묶음 기록이 없으면 만든다) */
export async function joinBatch(env, batchId, fileId, actor) {
  const id = cleanBatchId(batchId); if (!id) return false;
  try {
    await env.DB.prepare(`INSERT OR IGNORE INTO ai_batches (id, kind, actor, count, createdAt) VALUES (?1,'intake',?2,0,?3)`).bind(id, actor, nowIso()).run();
    const b = await env.DB.prepare('SELECT actor, undoneAt FROM ai_batches WHERE id = ?1').bind(id).first();
    if (!b || String(b.actor).toLowerCase() !== String(actor).toLowerCase() || b.undoneAt) return false;   // 남의 묶음·이미 되돌린 묶음에는 넣지 않는다
    await env.DB.prepare('UPDATE files SET aiBatchId = ?2 WHERE id = ?1').bind(fileId, id).run();
    await env.DB.prepare('UPDATE ai_batches SET count = count + 1 WHERE id = ?1').bind(id).run();
    return true;
  } catch { return false; }
}
