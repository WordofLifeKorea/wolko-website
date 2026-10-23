/**
 * Anthropic 호출 경로 — 홍콩 등 Anthropic 미지원 지역의 데이터센터에서 403 이 나지 않도록 AI_GATEWAY_URL(중계 Worker)이 있으면
 * 그쪽으로 보낸다(workers/anthropic-relay). override 는 기능별로 따로 정한 주소(예: CAMPTEAM_AI_URL)이며 있으면 그것을 그대로 쓴다.
 * 반환: { url, extraHeaders } — url 이 undefined 이면 호출하는 쪽의 기본 주소(api.anthropic.com)를 쓴다.
 */
export function anthropicRoute(env, override) {
  const base = String(env.AI_GATEWAY_URL || '').trim().replace(/\/+$/, '');
  const url = override || (base ? `${base}/anthropic/v1/messages` : undefined);
  const extraHeaders = {};
  if (!override && base && env.CF_AIG_TOKEN) extraHeaders['cf-aig-authorization'] = `Bearer ${String(env.CF_AIG_TOKEN).trim()}`;
  if (env.ANTHROPIC_WORKSPACE_ID) extraHeaders['anthropic-workspace-id'] = String(env.ANTHROPIC_WORKSPACE_ID).trim();
  return { url, extraHeaders };
}
