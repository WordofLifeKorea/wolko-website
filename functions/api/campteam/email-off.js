import { json } from '../../lib/campteamAuth.js';
import { verifyEmailOff } from '../../lib/campteamUnsub.js';
import { nowIso } from '../../lib/campteamDb.js';

/**
 * 「이 메일 그만 받기」 — 로그인 없이, 메일 맨 아래 링크(서명 토큰)로 연다. 토큰 만들기·확인은 functions/lib/campteamUnsub.js.
 *  GET  ?t=토큰   → 맞으면 그 이메일 주소의 「매주 화요일 이메일」과 「마감·일정 알림 이메일」을 끄고 확인 화면(/portal/campteam/email-off/?ok=1&t=토큰)으로 보낸다.
 *                   틀리거나 만료됐으면 아무것도 바꾸지 않고 안내 화면(?err=1)으로 보낸다.
 *                   (메일 보안 프로그램이 링크를 미리 열어 보면 꺼질 수 있다 — 그래서 확인 화면에 「다시 받기」 단추를 둔다.)
 *  POST ?t=토큰   → 같은 일을 하고 JSON 으로 답한다 (받은편지함의 「구독 취소」 단추: List-Unsubscribe-Post)
 *  POST { t, action: 'on' } → 「다시 받기」: 두 이메일을 다시 켠다
 * 알림 목록(포털 안)은 이 링크와 상관없이 그대로다. 이 링크로 바꿀 수 있는 것은 이메일 두 가지뿐이다.
 */
const HEAD = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
const to = (path) => new Response(null, { status: 302, headers: { ...HEAD, Location: path } });

async function setMail(env, email, on) {
  const now = nowIso(), v = on ? 1 : 0;
  await env.DB.prepare(`INSERT INTO notify_prefs (email, weeklyEmail, emailDue, updatedAt) VALUES (?1,?2,?2,?3) ON CONFLICT(email) DO UPDATE SET weeklyEmail=?2, emailDue=?2, updatedAt=?3`).bind(email, v, now).run();
}
export async function onRequestGet({ env, request }) {
  const t = new URL(request.url).searchParams.get('t') || '';
  if (!env.DB) return to('/portal/campteam/email-off/?err=2');
  const email = await verifyEmailOff(env, t);
  if (!email) return to('/portal/campteam/email-off/?err=1');
  try { await setMail(env, email, false); } catch (e) { console.error('email-off failed:', e && e.message); return to('/portal/campteam/email-off/?err=2'); }
  return to('/portal/campteam/email-off/?ok=1&t=' + encodeURIComponent(t));
}
export async function onRequestPost({ env, request }) {
  if (!env.DB) return json({ error: '지금은 처리할 수 없어요. 잠시 뒤 다시 해 주세요.' }, 503);
  const url = new URL(request.url); let t = url.searchParams.get('t') || '', on = false;
  if (!t) { try { const b = await request.clone().json(); t = String(b.t || ''); on = b.action === 'on'; } catch { /* JSON 이 아니면 아래에서 폼으로 */ } }
  if (!t) { try { t = String((await request.formData()).get('t') || ''); } catch { /* 토큰 없음 */ } }
  const email = await verifyEmailOff(env, t);
  if (!email) return json({ error: '링크가 맞지 않거나 오래되었어요.', code: 'bad_token' }, 400);
  try { await setMail(env, email, on); } catch (e) { console.error('email-off failed:', e && e.message); return json({ error: '지금은 처리할 수 없어요. 잠시 뒤 다시 해 주세요.' }, 503); }
  return json({ ok: true, on });
}
