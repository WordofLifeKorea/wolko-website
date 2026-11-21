/**
 * POST /api/materials/request  공개 — 교재를 내려받겠다는 신청
 *   body { itemId, fileId, kind: 'individual'|'church'|'group', name, church, email, agree: true, lang, website(함정 칸) }
 *   → { ok, url: '/api/materials/get?t=…', code: 'WL-XXXXXX', fileName }
 * 신청 내용을 검사하고 10분짜리 일회용 주소를 준다. 실제 내려받기(와 횟수 세기)는 그 주소에서 한다.
 */
import { readData } from '../../lib/portalResources.js';
import {
  readPublished, findPublished, cleanRegistrant, newCode, newToken, ipHash, rateLimited, isPdfFile, TOKEN_PREFIX, TOKEN_TTL, clean,
} from '../../lib/materials.js';

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
const fail = (error, errorEn, status, extra = {}) => Response.json({ error, errorEn, ...extra }, { status, headers: HEADERS });

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV) return fail('서버 설정이 필요합니다.', 'Server is not configured.', 500);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.', 'Invalid request.', 400); }

  const checked = cleanRegistrant(body);
  if (!checked.ok) return fail(checked.error, checked.errorEn, 400, { field: checked.field });

  const hash = await ipHash(request, env);
  if (await rateLimited(env, hash)) return fail('짧은 시간에 너무 많이 신청하셨어요. 잠시 뒤 다시 해 주세요.', 'Too many requests. Please try again a little later.', 429);

  const itemId = clean(body?.itemId, 80), fileId = clean(body?.fileId, 80);
  const [data, pub] = await Promise.all([readData(env), readPublished(env)]);
  const found = findPublished(data.items, pub, itemId, fileId);
  if (!found) return fail('지금은 내려받을 수 없는 교재예요.', 'This material is not available right now.', 404);

  const code = newCode();
  const token = newToken();
  const record = {
    itemId, fileId, code, ip: hash, at: Date.now(),
    title: clean(found.item.title, 120), fileName: clean(found.file.fileName, 200), pdf: isPdfFile(found.file),
    ...checked.value, logged: false,
  };
  await env.CAMP_KV.put(`${TOKEN_PREFIX}${token}`, JSON.stringify(record), { expirationTtl: TOKEN_TTL });
  return Response.json({ ok: true, url: `/api/materials/get?t=${token}`, code, fileName: record.fileName, stamp: record.pdf }, { headers: HEADERS });
}
