/**
 * 차량 사용 일지 임시 저장 — 작성 중인 내용과 사진을 로그인 계정에 30일 동안 보관한다.
 *  GET    /api/car/usage-draft              → { draft } | { draft: null }
 *  GET    /api/car/usage-draft?photo=before|after → 임시 사진(JPEG)
 *  PUT    /api/car/usage-draft  (JSON)      → 입력 칸 저장 (저장할 때마다 30일 다시 시작)
 *  PUT    /api/car/usage-draft?photo=before|after (body = JPEG) → 사진 저장
 *  DELETE /api/car/usage-draft[?photo=before|after] → 전체 또는 사진 한 장 삭제
 * 본인 것만 읽고 쓴다. 정식 저장(POST /api/car/usage)이 성공하면 usage.js 가 임시본을 지운다.
 */
import { fail, selectableVehicles, usageSession } from '../../lib/carUsage.js';

export const DRAFT_TTL_SECONDS = 30 * 24 * 60 * 60;
export const DRAFT_PREFIX = 'car:usage:draft:';
export const DRAFT_PHOTO_PREFIX = 'car:usage:draft:photo:';
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;
const NO_STORE = { 'Cache-Control': 'no-store' };

export const draftKey = email => `${DRAFT_PREFIX}${email}`;
export const draftPhotoKey = (email, which) => `${DRAFT_PHOTO_PREFIX}${email}${which === 'after' ? ':after' : ''}`;
const photoWhich = request => {
  const value = new URL(request.url).searchParams.get('photo');
  return value === 'before' || value === 'after' ? value : value === null ? '' : null;
};

/** 계정의 임시본(사진 포함)을 모두 지운다 — 정식 저장 후, 또는 사용자가 지울 때 */
export async function clearDraft(env, email) {
  await Promise.all([
    env.CAMP_KV.delete(draftKey(email)),
    env.CAMP_KV.delete(draftPhotoKey(email, 'before')),
    env.CAMP_KV.delete(draftPhotoKey(email, 'after')),
  ]);
}

const cleanFields = body => ({
  vehicleId: selectableVehicles().has(String(body?.vehicleId || '')) ? String(body.vehicleId) : '',
  useType: ['ministry', 'personal'].includes(body?.useType) ? body.useType : '',
  purpose: String(body?.purpose || '').replace(/\s+/g, ' ').trim().slice(0, 60),
  tripKm: String(body?.tripKm ?? '').trim().slice(0, 12),
});

async function loadDraft(env, email) {
  return (await env.CAMP_KV.get(draftKey(email), 'json')) || null;
}

async function saveDraft(env, email, draft) {
  const savedAt = new Date();
  const next = { ...draft, savedAt: savedAt.toISOString(), expiresAt: new Date(savedAt.getTime() + DRAFT_TTL_SECONDS * 1000).toISOString() };
  await env.CAMP_KV.put(draftKey(email), JSON.stringify(next), { expirationTtl: DRAFT_TTL_SECONDS });
  return next;
}

export async function onRequestGet({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  const which = photoWhich(request);
  if (which === null) return fail('사진 구분이 올바르지 않습니다.');
  if (which) {
    const photo = await env.CAMP_KV.get(draftPhotoKey(session.email, which), 'arrayBuffer');
    if (!photo) return fail('임시 사진을 찾을 수 없습니다.', 404);
    return new Response(photo, { headers: { 'Content-Type': 'image/jpeg', 'Content-Disposition': 'inline', 'X-Content-Type-Options': 'nosniff', ...NO_STORE, 'Cache-Control': 'private, no-store' } });
  }
  return Response.json({ draft: await loadDraft(env, session.email) }, { headers: NO_STORE });
}

export async function onRequestPut({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  const which = photoWhich(request);
  if (which === null) return fail('사진 구분이 올바르지 않습니다.');

  if (which) {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length < 100 || bytes.length > MAX_PHOTO_BYTES) return fail('JPG 사진은 4MB 이하로 올려주세요.');
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return fail('올바른 JPG 사진이 아닙니다.');
    const takenAt = new Date(request.headers.get('X-Photo-Taken-At') || '');
    const draft = (await loadDraft(env, session.email)) || cleanFields({});
    // 사진을 올린 시점부터 사진·입력 칸 모두 30일을 새로 센다
    await env.CAMP_KV.put(draftPhotoKey(session.email, which), bytes, { expirationTtl: DRAFT_TTL_SECONDS });
    const flags = which === 'after' ? { hasPhotoAfter: true } : { hasPhoto: true, photoTakenAt: Number.isFinite(takenAt.getTime()) ? takenAt.toISOString() : null };
    return Response.json({ draft: await saveDraft(env, session.email, { ...draft, ...flags }) }, { headers: NO_STORE });
  }

  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const previous = (await loadDraft(env, session.email)) || {};
  // 입력 칸만 바꾼다: 사진 표시(hasPhoto…)는 서버에 있는 값을 그대로 둔다
  const draft = await saveDraft(env, session.email, { ...previous, ...cleanFields(body) });
  return Response.json({ draft }, { headers: NO_STORE });
}

export async function onRequestDelete({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  const which = photoWhich(request);
  if (which === null) return fail('사진 구분이 올바르지 않습니다.');
  if (!which) {
    await clearDraft(env, session.email);
    return Response.json({ ok: true }, { headers: NO_STORE });
  }
  await env.CAMP_KV.delete(draftPhotoKey(session.email, which));
  const draft = await loadDraft(env, session.email);
  if (!draft) return Response.json({ ok: true }, { headers: NO_STORE });
  const next = which === 'after' ? { ...draft, hasPhotoAfter: false } : { ...draft, hasPhoto: false, photoTakenAt: null };
  return Response.json({ draft: await saveDraft(env, session.email, next) }, { headers: NO_STORE });
}
