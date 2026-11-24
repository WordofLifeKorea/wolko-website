/**
 * 연합캠프(교회 단체 신청) — 참여 신청한 교회 수.
 * 신청 기록(camp:<id>:reg:*)에서 교회 이름을 모아 같은 교회는 한 번만 센다(띄어쓰기 · 끝의 '교회' · 대소문자는 무시).
 * 공개 페이지는 매번 목록을 훑지 않도록, 신청 · 삭제 · 복원 · 수정 때 다시 세어 camp:<id>:churches 에 { count, at } 로 둔다.
 * 스태프 지원 기록은 세지 않는다.
 */
import { isUnionGroupCamp, UNITY_CAMP_POLICY, usesUnityCampPolicy } from './winterCampPolicy.js';

export const churchesKey = campId => `camp:${campId}:churches`;

export function churchKey(name) {
  return String(name || '').normalize('NFC').replace(/\s+/g, '').replace(/(교회|church)$/i, '').toLowerCase();
}

/** 이 캠프가 최소 참여 교회 수를 두는가 → { min, by } 또는 null */
export function churchMinimum(campId) {
  if (!usesUnityCampPolicy(campId) || !UNITY_CAMP_POLICY.minChurches) return null;
  return { min: UNITY_CAMP_POLICY.minChurches, by: UNITY_CAMP_POLICY.minChurchesBy };
}

export async function recountChurches(env, campId) {
  if (!isUnionGroupCamp(campId)) return null;
  const prefix = `camp:${campId}:reg:`;
  const keys = [];
  let cursor;
  do {
    const page = await env.CAMP_KV.list({ prefix, cursor });
    keys.push(...page.keys.map(k => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  const regs = await Promise.all(keys.map(k => env.CAMP_KV.get(k, 'json').catch(() => null)));
  const names = new Set();
  for (const reg of regs) {
    if (!reg || reg.registrationType === 'staff') continue;
    const key = churchKey(reg.church);
    if (key) names.add(key);
  }
  const out = { count: names.size, at: new Date().toISOString() };
  await env.CAMP_KV.put(churchesKey(campId), JSON.stringify(out));
  return out;
}

/** 저장된 교회 수(없으면 한 번 세어 둔다) */
export async function readChurches(env, campId) {
  if (!isUnionGroupCamp(campId)) return null;
  const saved = await env.CAMP_KV.get(churchesKey(campId), 'json').catch(() => null);
  if (saved && Number.isFinite(saved.count)) return saved;
  return recountChurches(env, campId);
}
