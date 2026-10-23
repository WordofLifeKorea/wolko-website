/** 로그인 전에도 읽을 수 있는 공개 설정 — 비밀 값은 없고, 켜져 있는 기능만 알려 준다 */
export async function onRequestGet({ env }) {
  return new Response(JSON.stringify({ googleClientId: env.CAMPTEAM_GOOGLE_CLIENT_ID || '', aiEnabled: !!env.ANTHROPIC_API_KEY }), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
}
