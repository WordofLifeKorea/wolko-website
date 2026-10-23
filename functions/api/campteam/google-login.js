import { json, badRequest } from '../../lib/campteamAuth.js';
import { verifyGoogleIdToken, issueCampToken } from '../../lib/campteamGoogleAuth.js';

/** Google 로그인: { credential } (브라우저가 Google 에서 받은 신분증) → 캠프팀 전용 출입증. CAMPTEAM_GOOGLE_CLIENT_ID 가 없으면 꺼져 있다. */
export async function onRequestPost({ env, request }) {
  if (!env.CAMPTEAM_GOOGLE_CLIENT_ID || !env.ADMIN_PASSWORD) return json({ error: 'Google 로그인이 아직 켜지지 않았어요.', code: 'google_off' }, 503);
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const who = await verifyGoogleIdToken(String(b.credential || ''), { clientId: env.CAMPTEAM_GOOGLE_CLIENT_ID });
  if (!who) return json({ error: 'wolko.org Google 계정으로만 로그인할 수 있어요.', code: 'google_denied' }, 403);
  return json({ token: await issueCampToken(env.ADMIN_PASSWORD, who.email), email: who.email, name: who.name });
}
