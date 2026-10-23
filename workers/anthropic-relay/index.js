/**
 * Anthropic 중계 Worker — 월코 홈페이지(Cloudflare Pages)가 홍콩 등 Anthropic 미지원 지역의 데이터센터에서
 * 실행될 때 403 "Request not allowed" 가 나는 문제를 피하려고, 호출만 미국 쪽 데이터센터에서 하게 해 준다.
 * (wrangler.toml 의 placement.region 으로 이 Worker 가 미국 동부 가까이에서 실행된다.)
 *
 * 홈페이지 코드(functions/api/team/translate.js, functions/lib/odometerOcr.js)는 AI_GATEWAY_URL 이 있으면
 *   {AI_GATEWAY_URL}/anthropic/v1/messages   로 보내므로, AI_GATEWAY_URL 을 이 Worker 주소로 두면 된다.
 *
 * 비밀값
 *   RELAY_TOKEN (선택, 권장) — 있으면 요청의 `cf-aig-authorization: Bearer <RELAY_TOKEN>` 이 같아야 한다.
 *                            홈페이지 쪽 CF_AIG_TOKEN 에 같은 값을 넣으면 홈페이지 코드가 그 헤더를 자동으로 보낸다.
 * Anthropic API 키는 이 Worker 에 저장하지 않는다 — 홈페이지가 보내는 x-api-key 를 그대로 전달만 한다.
 */
const UPSTREAM = 'https://api.anthropic.com/v1/messages';
const FORWARD_HEADERS = ['x-api-key', 'anthropic-version', 'anthropic-beta', 'content-type'];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/anthropic/v1/messages') return new Response('Not found', { status: 404 });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    if (env.RELAY_TOKEN && request.headers.get('cf-aig-authorization') !== `Bearer ${env.RELAY_TOKEN}`) {
      return new Response('Forbidden', { status: 403 });
    }
    const headers = new Headers();
    for (const name of FORWARD_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }
    const upstream = await fetch(UPSTREAM, { method: 'POST', headers, body: request.body });
    const out = new Headers(upstream.headers);
    if (request.cf?.colo) out.set('x-relay-colo', request.cf.colo);   // 어느 데이터센터에서 호출했는지(진단용)
    return new Response(upstream.body, { status: upstream.status, headers: out });
  },
};
