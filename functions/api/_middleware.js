/**
 * /api 전체 앞단 — 제주팀 일반 멤버(functions/lib/portalAccess.js)가 쓸 수 없는 도구의 API 를 막는다.
 * 포탈 로그인 토큰(Authorization: Bearer)이 있고 그 계정이 제한 대상일 때만 확인한다.
 * 토큰이 없거나 포탈 토큰이 아닌 요청(공개 신청·캠프팀 별도 로그인·카운슬러 로그인 등)은 그대로 통과한다.
 * 도구 안의 세부 권한(누가 수정할 수 있는지 등)은 각 API 가 원래대로 따로 확인한다.
 */
import { portalSession } from '../lib/hubAccounts.js';
import { allowedTools, canUseTool, toolOfApi } from '../lib/portalAccess.js';
import { campusOf } from '../lib/campus.js';

export async function onRequest(context) {
  const { request, env } = context;
  const tool = toolOfApi(new URL(request.url).pathname);
  if (!tool || !(request.headers.get('Authorization') || '').startsWith('Bearer ')) return context.next();
  let session = null;
  try { session = await portalSession(request, env); } catch { session = null; }
  if (!session) return context.next();                    // 포탈 계정이 아니면 각 API 의 원래 인증에 맡긴다
  const tools = allowedTools({ role: session.role, campus: await campusOf(env, session), email: session.email });
  if (canUseTool(tools, tool)) return context.next();
  return Response.json({ error: '이 메뉴는 제주팀 일반 멤버에게는 열려 있지 않습니다.', code: 'tool_not_allowed' }, { status: 403, headers: { 'Cache-Control': 'no-store' } });
}
