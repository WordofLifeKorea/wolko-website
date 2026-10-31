import { nowIso } from './campteamDb.js';

/**
 * 자료실의 태그·언어·성경 본문·설교자 + 일괄 올리기 묶음. 0024 마이그레이션이 아직 없는 DB 에서는 조용히 건너뛴다(자료 올리기 자체는 된다).
 * 값은 모두 사람이 고치거나 비울 수 있고, AI 가 제안해도 저장은 사람이 누른다.
 */
export const LANGS = ['ko', 'en', 'both'];
const clip = (s, n) => String(s ?? '').normalize('NFC').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

/** 태그: 문자열(쉼표·#·줄바꿈로 나뉨) 또는 배열 → 「a,b,c」 (중복 제거·최대 6개·각 24자·쉼표 없음) */
export function cleanTags(v) {
  const list = Array.isArray(v) ? v : String(v ?? '').split(/[,\n#;、，]+/);
  const seen = new Set(), out = [];
  for (const t of list) { const x = clip(t, 24).replace(/,/g, ' ').trim(); const k = x.toLowerCase(); if (x && !seen.has(k)) { seen.add(k); out.push(x); } if (out.length >= 6) break; }
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
