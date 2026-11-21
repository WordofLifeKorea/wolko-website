/**
 * POST /api/agreements/status  공개 — 이 이름 + 이메일이 '이미 서명한' 서약서가 무엇인지 알려 준다.
 *   body { name, email } → { signed: { faith: { at }, rules: { at }, childprotection: { '캠프id': { at } } } }
 * 서명 페이지가 맨 위에서 이름 · 이메일을 받은 뒤 '이미 작성하셨습니다'를 보여 주는 데 쓴다.
 *  - 이름과 이메일이 둘 다 맞아야 알려 준다(이메일만 아는 사람이 남의 서명 여부를 알아내지 못하게). 서명 그림 · 연락처는 돌려주지 않는다.
 *  - 한 곳(IP)에서 너무 자주 묻는 것은 막는다(이름을 바꿔 가며 알아내려는 시도 방지).
 */
import { signedFor } from '../../lib/staffAgreements.js';
import { clean, ipHash, rateLimited } from '../../lib/materials.js';

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
const fail = (error, errorEn, status) => Response.json({ error, errorEn }, { status, headers: HEADERS });
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV) return fail('서버 설정이 필요합니다.', 'Server is not configured.', 500);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.', 'Invalid request.', 400); }
  const name = clean(body?.name, 60), email = clean(body?.email, 100).toLowerCase();
  if (name.length < 2 || !EMAIL_RE.test(email)) return fail('이름과 이메일을 확인해 주세요.', 'Please check your name and email.', 400);
  const hash = await ipHash(request, env);
  if (await rateLimited(env, hash, Date.now(), { prefix: 'agree:st', perHour: 60, perDay: 300 })) return fail('짧은 시간에 너무 많이 확인하셨어요. 잠시 뒤 다시 해 주세요.', 'Too many checks. Please try again a little later.', 429);
  return Response.json({ signed: await signedFor(env, email, name) }, { headers: HEADERS });
}
