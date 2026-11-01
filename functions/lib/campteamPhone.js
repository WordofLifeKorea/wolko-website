import { json } from './campteamAuth.js';

/**
 * 폰 연결 기능(폰에서 업무 추가 · 폰 캘린더 구독)의 스위치.
 * 지금은 꺼 둔다 — 아이폰만 되는 방식이라서, 앱스토어 정식 앱이 나온 뒤에 다시 켠다. 켜려면 Cloudflare 변수 CAMPTEAM_PHONE_TOOLS 를 on 으로 둔다.
 * 켜져 있어도 관리자에게만 보이고 쓸 수 있다.
 */
export const phoneToolsOn = (env) => String(env.CAMPTEAM_PHONE_TOOLS || '').trim().toLowerCase() === 'on';
export const phoneOff = () => json({ error: '폰 연결 기능은 지금 꺼져 있어요. 앱이 나온 뒤에 다시 열릴 거예요.', code: 'phone_off' }, 403);
/** 로그인한 계정이 이 기능을 쓸 수 있는지: 꺼져 있으면 응답(Response)을, 관리자가 아니면 응답을, 되면 null 을 돌려준다 */
export function phoneGate(env, s) {
  if (!phoneToolsOn(env)) return phoneOff();
  if (!s.perms || !s.perms.manageMembers) return json({ error: '지금은 관리자만 쓸 수 있어요.', code: 'forbidden' }, 403);
  return null;
}
