import { ENTRY_PREFIX, PHOTO_PREFIX, TRASH_ENTRY_PREFIX, TRASH_PHOTO_PREFIX, fail, listEntries, usageSession, selectableVehicles } from '../../lib/carUsage.js';

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export async function onRequestGet({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  const [entries, vehicles] = await Promise.all([listEntries(env), Promise.resolve(selectableVehicles())]);
  return Response.json({ user: session, vehicles: [...vehicles].map(([id, name]) => ({ id, name })), entries: entries.slice(0, 100) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

// 전체 비우기(마스터 전용): 기록과 사진을 삭제 보관함 키로 옮긴다(백업). 한 번에 몇 건씩 처리하고 남은 건수를 돌려준다.
export async function onRequestDelete({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  if (session.role !== 'master') return fail('마스터 관리자만 비울 수 있습니다.', 403);
  let body;
  try { body = await request.json(); } catch { body = null; }
  if (body?.confirm !== 'DELETE-ALL') return fail('확인 값이 필요합니다.');
  const entries = await listEntries(env);
  const batch = entries.slice(0, 5);
  for (const entry of batch) {
    const photo = await env.CAMP_KV.getWithMetadata(`${PHOTO_PREFIX}${entry.id}`, 'arrayBuffer');
    if (photo.value) await env.CAMP_KV.put(`${TRASH_PHOTO_PREFIX}${entry.id}`, photo.value, { metadata: photo.metadata ?? undefined });
    await env.CAMP_KV.put(`${TRASH_ENTRY_PREFIX}${entry.id}`, JSON.stringify({ ...entry, deletedAt: new Date().toISOString(), deletedBy: session.email }));
    await env.CAMP_KV.delete(`${PHOTO_PREFIX}${entry.id}`);
    await env.CAMP_KV.delete(`${ENTRY_PREFIX}${entry.id}`);
  }
  return Response.json({ ok: true, count: batch.length, remaining: entries.length - batch.length }, { headers: { 'Cache-Control': 'no-store' } });
}

// 사용 후 마일리지(km) 입력: 기록한 본인(또는 마스터)만, 숫자만. 한 번 더 고치는 것도 허용한다.
export async function onRequestPatch({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const id = String(body?.id || '');
  const entry = id ? await env.CAMP_KV.get(`${ENTRY_PREFIX}${id}`, 'json') : null;
  if (!entry) return fail('기록을 찾을 수 없습니다.', 404);
  if (entry.userEmail !== session.email && session.role !== 'master') return fail('본인이 기록한 일지만 수정할 수 있습니다.', 403);
  const km = Number(body?.mileageAfter);
  if (!Number.isInteger(km) || km < 0 || km > 2_000_000) return fail('마일리지는 0 이상의 숫자(km)로 입력해 주세요.');
  entry.mileageAfter = km;
  entry.mileageAfterAt = new Date().toISOString();
  await env.CAMP_KV.put(`${ENTRY_PREFIX}${id}`, JSON.stringify(entry));
  return Response.json({ entry }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);

  let form;
  try { form = await request.formData(); } catch { return fail('사진을 읽지 못했습니다.'); }
  const vehicleId = String(form.get('vehicleId') || '');
  const useType = String(form.get('useType') || '');
  const photo = form.get('photo');
  const labels = selectableVehicles();
  if (!labels.has(vehicleId)) return fail('차량을 선택해 주세요.');
  if (!['ministry', 'personal'].includes(useType)) return fail('사역용 또는 개인용을 선택해 주세요.');
  if (!(photo instanceof File) || photo.type !== 'image/jpeg' || photo.size < 100 || photo.size > MAX_PHOTO_BYTES) {
    return fail('JPG 사진은 4MB 이하로 올려주세요.');
  }

  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) {
    return fail('올바른 JPG 사진이 아닙니다.');
  }

  const recordedAt = new Date().toISOString();
  const candidate = new Date(String(form.get('photoTakenAt') || ''));
  const isRecentExif = form.get('timeSource') === 'exif' && Number.isFinite(candidate.getTime())
    && candidate.getTime() <= Date.now() + 5 * 60_000
    && candidate.getTime() >= Date.now() - 24 * 60 * 60_000;
  const id = crypto.randomUUID();
  const entry = {
    id, vehicleId, vehicleName: labels.get(vehicleId), useType,
    photoTakenAt: isRecentExif ? candidate.toISOString() : recordedAt,
    timeSource: isRecentExif ? 'exif' : 'recorded',
    recordedAt, userEmail: session.email, userName: session.name,
  };

  try {
    await env.CAMP_KV.put(`${PHOTO_PREFIX}${id}`, bytes, { metadata: { type: 'image/jpeg' } });
    await env.CAMP_KV.put(`${ENTRY_PREFIX}${id}`, JSON.stringify(entry));
  } catch (error) {
    await env.CAMP_KV.delete(`${PHOTO_PREFIX}${id}`).catch(() => {});
    console.error('car usage save failed:', error);
    return fail('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 500);
  }
  return Response.json({ entry }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
