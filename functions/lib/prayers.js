/**
 * 포탈 첫 화면의 "기도제목" 나눔 — 포탈에 로그인한 사람끼리 기도제목을 올리고 "함께 기도해요"를 누른다.
 * KV: portal:prayers (배열, 최대 500개 — 넘으면 가장 오래된 것부터 정리). 첫 화면에는 최근 10개 제목만, "기도제목 나누기" 페이지에는 지난 것까지 모두.
 * 올린 사람은 서버 비밀값으로 만든 표식(owner)으로만 저장한다. 익명으로 올리면 이름도 저장하지 않는다.
 */
import { anonHex } from './gospelStats.js';
import { needsTranslation, translatePrayer } from './prayerTranslate.js';

export const PRAYERS_KEY = 'portal:prayers';
export const MAX_PRAYERS = 500;
export const MAX_TITLE = 60;
export const MAX_TEXT = 600;
export const DAILY_LIMIT = 5;
export const DASH_SHOWN = 10;
const MAX_PRAYED_BY = 300;

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanBlock = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
export const prayerOwner = (env, email) => anonHex(env, 'prayer-owner', String(email || '').trim().toLowerCase(), 16);

/** 저장된 목록 — 배열이 아니면 빈 목록 (지난 기도제목도 지우지 않고 모두 남긴다) */
export async function readPrayers(env) {
  const list = await env.CAMP_KV.get(PRAYERS_KEY, 'json');
  return (Array.isArray(list) ? list : []).filter(p => p && p.id && (p.title || p.text));
}

/** 제목이 없던 예전 기도제목은 내용의 첫 줄을 제목으로 */
const titleOf = p => p.title || clean(String(p.text).split('\n')[0], 40) + (clean(String(p.text).split('\n')[0], 200).length > 40 ? '…' : '');

/** 화면에 보낼 모양 — 누가 기도했는지(표식)는 내보내지 않고, 건수와 "내가 눌렀는지"만. limit 이 없으면 전부 */
export function viewPrayers(list, owner, canModerate, limit = Infinity) {
  return list.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, limit).map(p => ({
    id: p.id, title: titleOf(p), text: p.text || '', trLang: p.tr?.lang || '', trTitle: p.tr?.title || '', trText: p.tr?.text || '', name: p.name || '', anonymous: !p.name, createdAt: p.createdAt,
    count: (p.prayedBy || []).length, prayed: !!owner && (p.prayedBy || []).includes(owner),
    mine: !!owner && p.owner === owner, canEdit: !!owner && p.owner === owner, canDelete: !!owner && p.owner === owner,   // 수정·삭제는 올린 본인만 (관리자도 남의 것은 못 건드린다)
  }));
}

export function parsePrayerInput(body) {
  const text = cleanBlock(body?.text, MAX_TEXT);
  let title = clean(body?.title, MAX_TITLE);
  if (!title && text) title = clean(text.split('\n')[0], 40);        // 제목을 비워 두면 내용의 첫 줄을 제목으로
  if (!title) return { error: '기도제목의 제목을 입력해 주세요.' };
  return { value: { title, text, anonymous: body?.anonymous === true } };
}

export async function addPrayer(env, session, body, now = Date.now(), { fetchImpl } = {}) {
  const parsed = parsePrayerInput(body);
  if (parsed.error) return { error: parsed.error, status: 400 };
  const owner = await prayerOwner(env, session.email);
  const list = await readPrayers(env);
  const kstDay = ms => new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
  const todays = list.filter(p => p.owner === owner && kstDay(Date.parse(p.createdAt)) === kstDay(now)).length;
  if (todays >= DAILY_LIMIT) return { error: `기도제목은 하루에 ${DAILY_LIMIT}개까지 올릴 수 있어요.`, status: 429 };
  const name = parsed.value.anonymous ? '' : clean(session.name, 40) || String(session.email || '').split('@')[0];
  const tr = await translatePrayer(env, parsed.value, { fetchImpl });          // 한↔영 번역 (키가 없거나 실패하면 null — 원문만 저장)
  const prayer = { id: crypto.randomUUID(), title: parsed.value.title, text: parsed.value.text, ...(tr ? { tr } : {}), name, owner, createdAt: new Date(now).toISOString(), prayedBy: [] };
  await env.CAMP_KV.put(PRAYERS_KEY, JSON.stringify([prayer, ...list].slice(0, MAX_PRAYERS)));
  return { prayer, translated: !!tr };
}

/** "함께 기도해요" — 누를 때마다 켜고 끈다. 새 건수와 내 상태를 돌려준다 */
export async function togglePrayed(env, session, id, now = Date.now()) {
  const owner = await prayerOwner(env, session.email);
  const list = await readPrayers(env);
  const item = list.find(p => p.id === id);
  if (!item) return { error: '기도제목을 찾을 수 없어요.', status: 404 };
  const set = new Set(item.prayedBy || []);
  if (set.has(owner)) set.delete(owner); else if (set.size < MAX_PRAYED_BY) set.add(owner);
  item.prayedBy = [...set];
  await env.CAMP_KV.put(PRAYERS_KEY, JSON.stringify(list));
  return { count: item.prayedBy.length, prayed: set.has(owner) };
}

/** 올린 사람 본인만 고친다 — 제목·내용·익명 여부를 바꾸고, 번역은 새로 만든다(실패하면 낡은 번역은 지운다) */
export async function editPrayer(env, session, id, body, { fetchImpl } = {}) {
  const parsed = parsePrayerInput(body);
  if (parsed.error) return { error: parsed.error, status: 400 };
  const owner = await prayerOwner(env, session.email);
  const list = await readPrayers(env);
  const item = list.find(p => p.id === id);
  if (!item) return { error: '기도제목을 찾을 수 없어요.', status: 404 };
  if (item.owner !== owner) return { error: '내가 올린 기도제목만 고칠 수 있어요.', status: 403 };
  const tr = await translatePrayer(env, parsed.value, { fetchImpl });
  item.title = parsed.value.title; item.text = parsed.value.text;
  item.name = parsed.value.anonymous ? '' : clean(session.name, 40) || String(session.email || '').split('@')[0];
  if (tr) item.tr = tr; else delete item.tr;
  item.editedAt = new Date().toISOString().slice(0, 10);
  await env.CAMP_KV.put(PRAYERS_KEY, JSON.stringify(list));
  return { ok: true, translated: !!tr };
}

/** 올린 사람 본인만 지운다 */
export async function removePrayer(env, session, id, now = Date.now()) {
  const owner = await prayerOwner(env, session.email);
  const list = await readPrayers(env);
  const item = list.find(p => p.id === id);
  if (!item) return { error: '기도제목을 찾을 수 없어요.', status: 404 };
  if (item.owner !== owner) return { error: '내가 올린 기도제목만 지울 수 있어요.', status: 403 };
  await env.CAMP_KV.put(PRAYERS_KEY, JSON.stringify(list.filter(p => p.id !== id)));
  return { ok: true };
}

/** 첫 화면용(최근 10개)이나 전체 — total 은 지금까지 나눈 기도제목 수 */
export async function prayerBoard(env, session, { all = false } = {}) {
  const owner = session?.email ? await prayerOwner(env, session.email) : '';
  const list = await readPrayers(env);
  return { prayers: viewPrayers(list, owner, session?.role === 'master' || session?.role === 'admin', all ? Infinity : DASH_SHOWN), total: list.length };
}

/** 번역이 없거나 번역 언어가 잘못 저장된 기도제목을 뒤에서 번역해 저장한다 — 첫 화면을 열 때 돌고, 실패하면 1시간 뒤에 다시 시도한다 */
export async function translateMissingPrayers(env, { now = Date.now(), limit = 3, fetchImpl } = {}) {
  if (!env.ANTHROPIC_API_KEY) return 0;
  const list = await env.CAMP_KV.get(PRAYERS_KEY, 'json');
  if (!Array.isArray(list)) return 0;
  const todo = list.filter(p => p && p.id && (p.title || p.text) && needsTranslation(p.title || '', p.text || '', p.tr?.lang) && !(p.trTry && now - p.trTry < 3600000)).slice(0, limit);
  let done = 0;
  for (const p of todo) {
    const tr = await translatePrayer(env, { title: p.title || '', text: p.text || '' }, { fetchImpl });
    if (tr) { p.tr = tr; delete p.trTry; done++; } else p.trTry = now;
  }
  if (todo.length) await env.CAMP_KV.put(PRAYERS_KEY, JSON.stringify(list));
  return done;
}
