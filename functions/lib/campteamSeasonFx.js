/**
 * 계절 배경 효과 — 관리자가 설정에서 팀 전체(홈·TV)에 적용할 모양을 고른다.
 *   auto    날짜로 자동 (봄 3~5월 · 여름 6~8월 · 가을 9월~11월 19일 · 겨울 11월 20일~2월)
 *   weather 오늘 날씨 따라 (눈이 오면 겨울, 비가 오면 장마, 그 밖에는 날짜대로)
 *   spring · summer · rain(장마) · autumn · winter   그 모양으로 고정
 *   off     효과 없음
 * 값은 notify_settings 표(key = 'seasonFx')에 한 줄로 저장한다 — 새 표가 필요 없다.
 */
export const FX_MODES = ['auto', 'weather', 'spring', 'summer', 'rain', 'autumn', 'winter', 'off'];
export const normFx = (v) => (FX_MODES.includes(v) ? v : 'auto');

export async function loadSeasonFx(env) {
  try {
    if (!env.DB) return 'auto';
    const r = await env.DB.prepare("SELECT value FROM notify_settings WHERE key = 'seasonFx'").first();
    if (!r) return 'auto';
    let v = r.value; try { v = JSON.parse(v); } catch { /* 그대로 */ }
    return normFx(v);
  } catch { return 'auto'; }
}

export async function saveSeasonFx(env, mode, actor, now) {
  await env.DB.prepare('INSERT INTO notify_settings (key,value,updatedAt,updatedBy) VALUES (?1,?2,?3,?4) ON CONFLICT(key) DO UPDATE SET value=?2, updatedAt=?3, updatedBy=?4')
    .bind('seasonFx', JSON.stringify(normFx(mode)), now, actor).run();
}
