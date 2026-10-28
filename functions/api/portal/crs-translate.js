/**
 * POST /api/portal/crs-translate  { items: [{ text, kind }] }   kind: church | person | address | note
 *   → { results: [ { lang, text } | null, … ] }   items 와 같은 순서·길이. 번역 설정이 없거나 실패하면 { results: null, available: false }
 * CRS(교회 관계 시스템)에 입력한 글을 한↔영으로 자동 번역한다. 포탈 로그인한 계정만, 하루에 계정마다 호출 횟수를 제한한다.
 * 보내는 글은 교회·담당자 이름, 메모, 방문 기록처럼 사람이 적은 글뿐 — 연락처(전화번호)는 보내지 않는다(화면 쪽에서 거른다).
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { translateCrsItems, cleanItems, MAX_ITEMS } from '../../lib/crsTranslate.js';
import { todayKst } from '../../lib/carDrive.js';

const H = { 'Cache-Control': 'no-store' };
export const DAILY_CALLS = 300;
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

export async function onRequestPost({ env, request }) {
  const session = await portalSession(request, env);
  if (!session) return fail('포탈 로그인이 필요합니다.', 401);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  if (!Array.isArray(body?.items) || !body.items.length) return fail('번역할 글이 없습니다.');
  if (body.items.length > MAX_ITEMS) return fail(`한 번에 ${MAX_ITEMS}개까지 번역할 수 있습니다.`);
  if (!env.ANTHROPIC_API_KEY) return Response.json({ results: null, available: false }, { headers: H });
  const key = `crs-tr:${String(session.email).toLowerCase()}:${todayKst()}`;
  const used = Number(await env.CAMP_KV.get(key)) || 0;
  if (used >= DAILY_CALLS) return fail('오늘 번역 횟수를 모두 썼습니다. 내일 다시 시도해 주세요.', 429);
  await env.CAMP_KV.put(key, String(used + 1), { expirationTtl: 60 * 60 * 36 });
  const results = await translateCrsItems(env, cleanItems(body.items));
  return Response.json({ results, available: results !== null }, { headers: H });
}
