/**
 * 캠프팀 「팀 사무실」 — 캐릭터 모양 검사와 자동 모양, 접속 확인 창.
 * 캐릭터는 화면(office-art.js)이 코드로 그린다. 여기서는 허용된 값만 저장되게 거르고, 정해 두지 않은 사람에게 이메일로 정한 모양을 준다.
 */
export const SEAT_WINDOW_MS = 150000;   // 마지막 확인이 이 안이면 "앉아 있음"

export const SKINS = ['#f7d9c0', '#f2c9a5', '#e8b88f', '#d79f72', '#b9805a', '#8d5a3b'];
export const HAIR_COLORS = ['#1f1a17', '#3a2a20', '#5a3a26', '#8a5a2b', '#b5651d', '#c9a063', '#d9b44a', '#b9bcc2', '#d4552b'];
export const TOPS = ['#3b8ff0', '#22b573', '#f0a020', '#8b6cf0', '#ec5fa0', '#14b8c4', '#e5534b', '#2f3d4a', '#9bbf1f'];
export const HAIR_STYLES = ['bald', 'short', 'bangs', 'wavy', 'curly', 'long', 'bun', 'ponytail'];
export const GLASSES = ['none', 'round', 'square', 'varied'];   // varied: 쓰기 · 벗기 · 머리 위에 올리기를 번갈아
export const BEARDS = ['none', 'stubble', 'short'];

const HEX = /^#[0-9a-fA-F]{6}$/;
const pick = (v, list, d) => (list.includes(v) ? v : d);
const color = (v, d) => (typeof v === 'string' && HEX.test(v) ? v.toLowerCase() : d);

/** 받은 모양을 검사해 허용된 값만 남긴다 */
export function sanitizeAvatar(a) {
  const o = a && typeof a === 'object' ? a : {};
  return {
    skin: color(o.skin, SKINS[1]), hair: pick(o.hair, HAIR_STYLES, 'short'), hairColor: color(o.hairColor, HAIR_COLORS[0]),
    glasses: pick(o.glasses, GLASSES, 'none'), beard: pick(o.beard, BEARDS, 'none'), top: color(o.top, TOPS[0]),
  };
}

export const hashOf = (s) => { let h = 5381; for (const c of String(s)) h = ((h << 5) + h + c.charCodeAt(0)) >>> 0; return h; };
/** 화면에서 쓰는 짧은 번호 — 이메일은 밖으로 내보내지 않는다 */
export const publicId = (email) => hashOf('office:' + String(email).trim().toLowerCase()).toString(36);

/** 따로 정하지 않은 사람의 모양 — 이메일로 항상 같은 모양이 나온다 */
export function defaultAvatar(email) {
  const h = hashOf(String(email).trim().toLowerCase());
  const at = (list, shift) => list[(h >>> shift) % list.length];
  return { skin: at(SKINS.slice(0, 4), 3), hair: at(HAIR_STYLES.filter((x) => x !== 'bald'), 5), hairColor: at(HAIR_COLORS.slice(0, 5), 8), glasses: (h >>> 11) % 4 === 0 ? 'round' : 'none', beard: 'none', top: at(TOPS, 14) };
}

export const parseAvatar = (json, email) => { try { return sanitizeAvatar(JSON.parse(json)); } catch { return defaultAvatar(email); } };
