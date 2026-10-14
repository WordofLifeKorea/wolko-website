import { fileKV } from '../../lib/nasFileKV.js';
import { AFTER_SUFFIX, ENTRY_PREFIX, PHOTO_PREFIX, TRASH_ENTRY_PREFIX, TRASH_PHOTO_PREFIX, fail, listEntries, usageSession, selectableVehicles } from '../../lib/carUsage.js';

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export async function onRequestGet({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  const [entries, vehicles] = await Promise.all([listEntries(env), Promise.resolve(selectableVehicles())]);
  return Response.json({ user: session, vehicles: [...vehicles].map(([id, name]) => ({ id, name })), entries: entries.slice(0, 100) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

// 기록과 사진을 삭제 보관함 키로 옮긴다(백업) — 되돌릴 수 있게 지우지는 않는다.
async function moveToTrash(env, entry, session) {
  const photo = await fileKV(env).getWithMetadata(`${PHOTO_PREFIX}${entry.id}`, 'arrayBuffer');
  if (photo.value) await fileKV(env).put(`${TRASH_PHOTO_PREFIX}${entry.id}`, photo.value, { metadata: photo.metadata ?? undefined });
  await fileKV(env).put(`${TRASH_ENTRY_PREFIX}${entry.id}`, JSON.stringify({ ...entry, deletedAt: new Date().toISOString(), deletedBy: session.email }));
  await fileKV(env).delete(`${PHOTO_PREFIX}${entry.id}`);
  const after = await fileKV(env).getWithMetadata(`${PHOTO_PREFIX}${entry.id}${AFTER_SUFFIX}`, 'arrayBuffer');
  if (after.value) {
    await fileKV(env).put(`${TRASH_PHOTO_PREFIX}${entry.id}${AFTER_SUFFIX}`, after.value, { metadata: after.metadata ?? undefined });
    await fileKV(env).delete(`${PHOTO_PREFIX}${entry.id}${AFTER_SUFFIX}`);
  }
  await fileKV(env).delete(`${ENTRY_PREFIX}${entry.id}`);
}

export const MAX_BULK = 50;

// 삭제(마스터 전용): body.ids 로 고른 기록만 지우거나(한 번에 50건까지), 예전 방식(confirm: 'DELETE-ALL')으로 한 번에 몇 건씩 전부 비운다.
export async function onRequestDelete({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  if (session.role !== 'master') return fail('마스터 관리자만 삭제할 수 있습니다.', 403);
  let body;
  try { body = await request.json(); } catch { body = null; }
  if (Array.isArray(body?.ids)) {
    const ids = [...new Set(body.ids.map(String))].filter(Boolean);
    if (!ids.length) return fail('삭제할 기록을 골라 주세요.');
    if (ids.length > MAX_BULK) return fail(`한 번에 ${MAX_BULK}건까지 삭제할 수 있습니다.`);
    const removed = [];
    for (const id of ids) {
      const entry = await fileKV(env).get(`${ENTRY_PREFIX}${id}`, 'json');
      if (!entry) continue;
      await moveToTrash(env, entry, session);
      removed.push(id);
    }
    return Response.json({ ok: true, count: removed.length, removed }, { headers: { 'Cache-Control': 'no-store' } });
  }
  if (body?.confirm !== 'DELETE-ALL') return fail('확인 값이 필요합니다.');
  const entries = await listEntries(env);
  const batch = entries.slice(0, 5);
  for (const entry of batch) await moveToTrash(env, entry, session);
  return Response.json({ ok: true, count: batch.length, remaining: entries.length - batch.length }, { headers: { 'Cache-Control': 'no-store' } });
}

// 사용 후 마일리지(km) 입력: 기록한 본인(또는 마스터)만, 숫자만. 한 번 더 고치는 것도 허용한다.
export async function onRequestPatch({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  // 고른 기록 여러 건의 차량 · 사용 목적을 한 번에 고친다 (마스터 전용)
  if (Array.isArray(body?.ids)) {
    if (session.role !== 'master') return fail('마스터 관리자만 수정할 수 있습니다.', 403);
    const ids = [...new Set(body.ids.map(String))].filter(Boolean);
    if (!ids.length) return fail('수정할 기록을 골라 주세요.');
    if (ids.length > MAX_BULK) return fail(`한 번에 ${MAX_BULK}건까지 수정할 수 있습니다.`);
    const labels = selectableVehicles();
    const vehicleId = body.vehicleId ? String(body.vehicleId) : '';
    const useType = body.useType ? String(body.useType) : '';
    if (vehicleId && !labels.has(vehicleId)) return fail('차량을 확인해 주세요.');
    if (useType && !['ministry', 'personal'].includes(useType)) return fail('사역용 또는 개인용을 선택해 주세요.');
    if (!vehicleId && !useType) return fail('바꿀 내용을 골라 주세요.');
    const updated = [];
    for (const id of ids) {
      const entry = await fileKV(env).get(`${ENTRY_PREFIX}${id}`, 'json');
      if (!entry) continue;
      if (vehicleId) { entry.vehicleId = vehicleId; entry.vehicleName = labels.get(vehicleId); }
      if (useType) entry.useType = useType;
      entry.editedBy = session.email; entry.editedAt = new Date().toISOString();
      await fileKV(env).put(`${ENTRY_PREFIX}${id}`, JSON.stringify(entry));
      updated.push(entry);
    }
    return Response.json({ ok: true, count: updated.length, entries: updated }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const id = String(body?.id || '');
  const entry = id ? await fileKV(env).get(`${ENTRY_PREFIX}${id}`, 'json') : null;
  if (!entry) return fail('기록을 찾을 수 없습니다.', 404);
  if (entry.userEmail !== session.email && session.role !== 'master') return fail('본인이 기록한 일지만 수정할 수 있습니다.', 403);
  if (body?.tripKm !== undefined) {
    const trip = Math.round(Number(body.tripKm) * 10) / 10;
    if (!Number.isFinite(trip) || trip < 0 || trip > 5000) return fail('총 운행 거리(km)를 0 이상의 숫자로 입력해 주세요.');
    entry.tripKm = trip;
    entry.editedBy = session.email; entry.editedAt = new Date().toISOString();
    await fileKV(env).put(`${ENTRY_PREFIX}${id}`, JSON.stringify(entry));
    return Response.json({ entry }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const km = Number(body?.mileageAfter);
  if (!Number.isInteger(km) || km < 0 || km > 2_000_000) return fail('마일리지는 0 이상의 숫자(km)로 입력해 주세요.');
  entry.mileageAfter = km;
  entry.mileageAfterAt = new Date().toISOString();
  await fileKV(env).put(`${ENTRY_PREFIX}${id}`, JSON.stringify(entry));
  return Response.json({ entry }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPost({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);

  let form;
  try { form = await request.formData(); } catch { return fail('사진을 읽지 못했습니다.'); }
  const vehicleId = String(form.get('vehicleId') || '');
  const useType = String(form.get('useType') || '');
  const labels = selectableVehicles();
  if (!labels.has(vehicleId)) return fail('차량을 선택해 주세요.');
  if (!['ministry', 'personal'].includes(useType)) return fail('사역용 또는 개인용을 선택해 주세요.');
  const purpose = useType === 'ministry' ? String(form.get('purpose') || '').replace(/\s+/g, ' ').trim().slice(0, 60) : '';
  // 총 운행 거리(km)는 꼭 받는다. 사진(운행 전·후)은 있으면 받는 선택 항목이다.
  const tripKmRaw = String(form.get('tripKm') ?? '').trim();
  const tripKm = Math.round(Number(tripKmRaw) * 10) / 10;
  if (!tripKmRaw || !Number.isFinite(tripKm) || tripKm < 0 || tripKm > 5000) return fail('총 운행 거리(km)를 0 이상의 숫자로 입력해 주세요.');

  async function readJpeg(file) {
    if (!(file instanceof File) || file.size === 0) return { none: true };
    if (file.type !== 'image/jpeg' || file.size < 100 || file.size > MAX_PHOTO_BYTES) return { error: 'JPG 사진은 4MB 이하로 올려주세요.' };
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return { error: '올바른 JPG 사진이 아닙니다.' };
    return { bytes };
  }
  const before = await readJpeg(form.get('photo'));
  if (before.error) return fail(before.error);
  const afterPhoto = await readJpeg(form.get('photoAfter'));
  if (afterPhoto.error) return fail(afterPhoto.error);

  const recordedAt = new Date().toISOString();
  const candidate = new Date(String(form.get('photoTakenAt') || ''));
  const isRecentExif = !before.none && form.get('timeSource') === 'exif' && Number.isFinite(candidate.getTime())
    && candidate.getTime() <= Date.now() + 5 * 60_000
    && candidate.getTime() >= Date.now() - 24 * 60 * 60_000;
  const id = crypto.randomUUID();
  const entry = {
    id, vehicleId, vehicleName: labels.get(vehicleId), useType, ...(purpose ? { purpose } : {}), tripKm,
    hasPhoto: !before.none, hasPhotoAfter: !afterPhoto.none,
    photoTakenAt: isRecentExif ? candidate.toISOString() : recordedAt,
    timeSource: isRecentExif ? 'exif' : 'recorded',
    recordedAt, userEmail: session.email, userName: session.name,
  };

  try {
    const filename = suffix => `${entry.photoTakenAt.slice(0, 10)}_${entry.vehicleName}_${entry.userName}${suffix}.jpg`;
    if (!before.none) await fileKV(env).put(`${PHOTO_PREFIX}${id}`, before.bytes, { metadata: { type: 'image/jpeg', filename: filename('') } });
    if (!afterPhoto.none) await fileKV(env).put(`${PHOTO_PREFIX}${id}${AFTER_SUFFIX}`, afterPhoto.bytes, { metadata: { type: 'image/jpeg', filename: filename('_after') } });
    await fileKV(env).put(`${ENTRY_PREFIX}${id}`, JSON.stringify(entry));
  } catch (error) {
    await fileKV(env).delete(`${PHOTO_PREFIX}${id}`).catch(() => {});
    await fileKV(env).delete(`${PHOTO_PREFIX}${id}${AFTER_SUFFIX}`).catch(() => {});
    console.error('car usage save failed:', error);
    return fail('저장하지 못했습니다. 잠시 후 다시 시도해 주세요.', 500);
  }
  return Response.json({ entry }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
}
