import { ENTRY_PREFIX, PHOTO_PREFIX, fail, listEntries, usageSession, vehicleLabels } from '../../lib/carUsage.js';

const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export async function onRequestGet({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  const [entries, vehicles] = await Promise.all([listEntries(env), vehicleLabels(env)]);
  return Response.json({ user: session, vehicles: [...vehicles].map(([id, name]) => ({ id, name })), entries: entries.slice(0, 100) }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function onRequestPost({ env, request }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);

  let form;
  try { form = await request.formData(); } catch { return fail('사진을 읽지 못했습니다.'); }
  const vehicleId = String(form.get('vehicleId') || '');
  const useType = String(form.get('useType') || '');
  const photo = form.get('photo');
  const labels = await vehicleLabels(env);
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
