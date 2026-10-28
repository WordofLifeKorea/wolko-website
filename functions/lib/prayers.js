/**
 * 포탈 첫 화면의 "기도제목" 나눔 — 포탈에 로그인한 사람끼리 기도제목을 올리고 "함께 기도해요"를 누른다.
 * KV: portal:prayers (배열, 최대 80개 · 45일이 지나면 자동으로 사라진다)
 * 올린 사람은 서버 비밀값으로 만든 표식(owner)으로만 저장한다. 익명으로 올리면 이름도 저장하지 않는다.
 */
import { anonHex } from './gospelStats.js';

export const PRAYERS_KEY = 'portal:prayers';
export const MAX_PRAYERS = 80;
export const MAX_AGE_DAYS = 45;
export const MAX_TEXT = 300;
export const DAILY_LIMIT = 5;
export const SHOWN = 30;
const MAX_PRAYED_BY = 300;
const DAY = 86400000;

const clean = (v, max) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const cleanBlock = (v, max) => String(v ?? '').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
export const prayerOwner = (env, email) => anonHex(env, 'prayer-owner', String(email || '').trim().toLowerCase(), 16);

/** 저장된 목록 — 배열이 아니거나 45일이 지난 것은 뺀다 */
export async function readPrayers(env, now = Date.now()) {
  const list = await env.CAMP_KV.get(PRAYERS_KEY, 'json');
  return (Array.isArray(list) ? list : []).filter(p => p && p.id && p.text && now - Date.parse(p.createdAt) < MAX_AGE_DAYS * DAY);
}

/** 화면에 보낼 모양 — 누가 기도했는지(표식)는 내보내지 않고, 건수와 "내가 눌렀는지"만 */
export function viewPrayers(list, owner, canModerate) {
  return list.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0, SHOWN).map(p => ({
    id: p.id, text: p.text, name: p.name || '', anonymous: !p.name, createdAt: p.createdAt,
    count: (p.prayedBy || []).length, prayed: !!owner && (p.prayedBy || []).includes(owner),
    mine: !!owner && p.owner === owner, canDelete: (!!owner && p.owner === owner) || !!canModerate,
  }));
}

export function parsePrayerInput(body) {
  const text = cleanBlock(body?.text, MAX_TEXT);
  if (!text) return { error: '기도제목을 입력해 주세요.' };
  return { value: { text, anonymous: body?.anonymous === true } };
}

export async function addPrayer(env, session, body, now = Date.now()) {
  const parsed = parsePrayerInput(body);
  if (parsed.error) return { error: parsed.error, status: 400 };
  const owner = await prayerOwner(env, session.email);
  const list = await readPrayers(env, now);
  const kstDay = ms => new Date(ms + 9 * 3600000).toISOString().slice(0, 10);
  const todays = list.filter(p => p.owner === owner && kstDay(Date.parse(p.createdAt)) === kstDay(now)).length;
  if (todays >= DAILY_LIMIT) return { error: `기도제목은 하루에 ${DAILY_LIMIT}개까지 올릴 수 있어요.`, status: 429 };
  const name = parsed.value.anonymous ? '' : clean(session.name, 40) || String(session.email || '').split('@')[0];
  const prayer = { id: crypto.randomUUID(), text: parsed.value.text, name, owner, createdAt: new Date(now).toISOString(), prayedBy: [] };
  await env.CAMP_KV.put(PRAYERS_KEY, JSON.stringify([prayer, ...list].slice(0, MAX_PRAYERS)));
  return { prayer };
}

/** "함께 기도해요" — 누를 때마다 켜고 끈다. 새 건수와 내 상태를 돌려준다 */
export async function togglePrayed(env, session, id, now = Date.now()) {
  const owner = await prayerOwner(env, session.email);
  const list = await readPrayers(env, now);
  const item = list.find(p => p.id === id);
  if (!item) return { error: '기도제목을 찾을 수 없어요.', status: 404 };
  const set = new Set(item.prayedBy || []);
  if (set.has(owner)) set.delete(owner); else if (set.size < MAX_PRAYED_BY) set.add(owner);
  item.prayedBy = [...set];
  await env.CAMP_KV.put(PRAYERS_KEY, JSON.stringify(list));
  return { count: item.prayedBy.length, prayed: set.has(owner) };
}

/** 올린 사람 본인이나 마스터·관리자만 지운다 */
export async function removePrayer(env, session, id, now = Date.now()) {
  const owner = await prayerOwner(env, session.email);
  const list = await readPrayers(env, now);
  const item = list.find(p => p.id === id);
  if (!item) return { error: '기도제목을 찾을 수 없어요.', status: 404 };
  if (item.owner !== owner && session.role !== 'master' && session.role !== 'admin') return { error: '내가 올린 기도제목만 지울 수 있어요.', status: 403 };
  await env.CAMP_KV.put(PRAYERS_KEY, JSON.stringify(list.filter(p => p.id !== id)));
  return { ok: true };
}

export async function prayerList(env, session, now = Date.now()) {
  const owner = session?.email ? await prayerOwner(env, session.email) : '';
  return viewPrayers(await readPrayers(env, now), owner, session?.role === 'master' || session?.role === 'admin');
}
