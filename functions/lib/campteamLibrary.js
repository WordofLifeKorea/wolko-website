/** 보관함 항목 정리: 종류별 칸(extra)은 정해 둔 것만 받고 길이를 제한한다. 모르는 값은 비워 둔다(지어내지 않는다). */
import { cleanTags, cleanLang, cleanScripture, cleanSpeaker } from './campteamFileMeta.js';
export const KINDS = ['sermon', 'worship', 'game', 'venue'];
const EXTRA = {
  sermon: { audience: 80 },
  worship: { songKey: 20, pronTitle: 120, ccli: 30, setlist: 1500, fileKo: 60, fileEn: 60, filePron: 60 },
  game: { players: 60, minutes: 30, supplies: 400, rules: 2000 },
  venue: { address: 200, contactName: 80, contactPhone: 40, contactEmail: 120, cost: 200, capacity: 40, visitNotes: 2000, website: 200 },
};
export const extraKeys = (kind) => Object.keys(EXTRA[kind] || {});
const str = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const long = (v, n) => String(v ?? '').replace(/\r/g, '').trim().slice(0, n);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
export function cleanExtra(kind, raw) {
  const src = (raw && typeof raw === 'object') ? raw : {}, out = {};
  for (const [k, n] of Object.entries(EXTRA[kind] || {})) { const v = (k === 'rules' || k === 'visitNotes' || k === 'setlist' || k === 'supplies') ? long(src[k], n) : str(src[k], n); if (v) out[k] = v; }
  if (out.website && !/^https?:\/\//i.test(out.website)) delete out.website;   // 링크는 http(s) 만
  return out;
}
export function cleanItem(b, base = {}) {
  const has = (k) => k in b, kind = base.kind || b.kind;
  if (!KINDS.includes(kind)) return { error: '종류가 올바르지 않습니다.' };
  const title = has('title') ? str(b.title, 120) : base.title || '';
  if (!title) return { error: '제목을 입력해주세요.' };
  const v = { kind, title, titleEn: has('titleEn') ? str(b.titleEn, 120) : base.titleEn || '', summary: has('summary') ? long(b.summary, 1500) : base.summary || '',
    tags: has('tags') ? cleanTags(b.tags) : base.tags || '', lang: has('lang') ? cleanLang(b.lang) : base.lang || '',
    scripture: has('scripture') ? cleanScripture(b.scripture) : base.scripture || '', speaker: has('speaker') ? cleanSpeaker(b.speaker) : base.speaker || '',
    itemDate: has('itemDate') ? (isDate(b.itemDate) ? b.itemDate : null) : base.itemDate ?? null,
    campId: has('campId') ? (str(b.campId, 60) || null) : base.campId ?? null, fileId: has('fileId') ? (str(b.fileId, 60) || null) : base.fileId ?? null };
  let prev = {}; try { prev = JSON.parse(base.extra || '{}'); } catch { prev = {}; }
  v.extra = JSON.stringify(has('extra') ? cleanExtra(kind, b.extra) : prev);
  return { v };
}
