/**
 * POST /api/car/odometer   body: 계기판 사진(JPEG 원본 바이트, Content-Type: image/jpeg)
 *   → { odometer: 정수 | null, confidence, note }   (읽을 수 없으면 odometer 는 null — 화면에서 직접 입력하게 한다)
 * 로그인한 포탈 사용자만. 사진은 저장하지 않는다. 남용 방지로 사용자당 하루 40회까지.
 */
import { usageSession } from '../../lib/carUsage.js';
import { readOdometer, ocrConfigured } from '../../lib/odometerOcr.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400, extra = {}) => Response.json({ error, ...extra }, { status, headers: H });
const MAX_BYTES = 4 * 1024 * 1024;
const DAILY_LIMIT = 40;

export async function onRequestPost({ env, request, fetchImpl }) {
  const session = await usageSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  if (!ocrConfigured(env)) return fail('자동 인식이 설정되지 않았습니다. 직접 입력해 주세요.', 503, { manual: true });

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.length < 100 || bytes.length > MAX_BYTES) return fail('JPG 사진은 4MB 이하로 올려주세요.');
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return fail('올바른 JPG 사진이 아닙니다.');

  const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const key = `car:ocr:${session.email}:${day}`;
  const used = parseInt(await env.CAMP_KV.get(key), 10) || 0;
  if (used >= DAILY_LIMIT) return fail('오늘 자동 인식 한도를 모두 사용했습니다. 직접 입력해 주세요.', 429, { manual: true });
  await env.CAMP_KV.put(key, String(used + 1), { expirationTtl: 60 * 60 * 36 });

  try {
    const result = await readOdometer(env, bytes, fetchImpl || fetch);
    return Response.json(result, { headers: H });
  } catch (error) {
    console.error('odometer read failed:', error.code || error.message);
    return fail('계기판 숫자를 읽지 못했습니다. 직접 입력해 주세요.', 502, { manual: true });
  }
}
