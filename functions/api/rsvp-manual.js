/**
 * POST /api/rsvp-manual — 이벤트 관리 페이지에서 참석자를 직접 추가 (peterchae 등 지정 계정 · 마스터 · 관리자)
 * body: { eventId? (감사의 밤 · 제주 캠퍼스데이), name, phone?, email?, partySize?, notes? } — 이름만 있으면 된다. 알림 메일은 보내지 않는다.
 * 같은 형식(rsvp:{eventId}:{rsvpId})으로 저장되어 참석 목록·CSV 에 그대로 나타나고, source: 'manual' 로 구분한다.
 */
import { portalSession } from '../lib/hubAccounts.js';
import { normalizePhone } from '../lib/phone.js';
import { canAddRsvp } from '../lib/rsvpAccess.js';

const H = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const EVENTS = {
  'thanksgiving-night': { ko: '감사의 밤', en: 'Night of Thanksgiving' },
  'jeju-campus-day': { ko: '제주 캠퍼스데이', en: 'Jeju Campus Day' },   // 신청은 외부 신청서로 받았고, 참석자 명단은 이벤트 관리에서 직접 추가한다
};
const clean = (v, max) => String(v ?? '').trim().slice(0, max);
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

export async function onRequestPost({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  if (!canAddRsvp(session)) return fail('참석자를 추가할 수 있는 계정이 아닙니다.', 403);
  let data;
  try { data = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const eventId = clean(data?.eventId || 'thanksgiving-night', 60), event = EVENTS[eventId];
  if (!event) return fail('이벤트를 찾을 수 없습니다.', 404);
  const name = clean(data?.name, 60);
  if (!name) return fail('이름을 입력해 주세요.');
  const phone = clean(data?.phone, 30) ? normalizePhone(clean(data.phone, 30)) : '';
  const email = clean(data?.email, 120).toLowerCase();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('이메일 주소 형식이 올바르지 않습니다.');
  const partySize = data?.partySize === undefined || data?.partySize === '' ? 1 : Number(data.partySize);
  if (!Number.isInteger(partySize) || partySize < 1 || partySize > 200) return fail('참석 인원은 1명 이상으로 입력해 주세요.');
  const dupeKey = email ? `rsvp:${eventId}:email:${email}` : '';
  if (dupeKey && await env.CAMP_KV.get(dupeKey)) return fail('이미 신청된 이메일 주소입니다.', 409);
  const rsvpId = `rsvp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const rsvp = { rsvpId, eventId, eventTitleKo: event.ko, eventTitleEn: event.en, name, phone, email, partySize, notes: clean(data?.notes, 1000), source: 'manual', addedBy: String(session.email || '').toLowerCase(), createdAt: new Date().toISOString() };
  await env.CAMP_KV.put(`rsvp:${eventId}:${rsvpId}`, JSON.stringify(rsvp));
  if (dupeKey) await env.CAMP_KV.put(dupeKey, rsvpId);
  return Response.json({ success: true, rsvp }, { status: 201, headers: H });
}
