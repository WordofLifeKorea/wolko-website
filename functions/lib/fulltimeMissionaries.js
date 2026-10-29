/**
 * 풀타임 선교사 판정 — 홈페이지 인원 소개(team)에서 category: missionary 인 사람(부부는 두 사람 모두).
 * 인원 소개에는 이메일이 없어서, 빌드 때 만든 /team-roster.json(이름만)을 포털 계정의 이름·이메일과 맞춰 본다.
 *   - 이름: 영어·한글 모두. 순서와 띄어쓰기는 무시한다("Jacob Morse" = "Morse Jacob" = "JacobMorse").
 *   - 이메일 앞부분: jacobmorse@wol.org 처럼 이름을 이어 붙인 주소도 같은 사람으로 본다.
 *   - 부부 이름은 둘로 나눈다: "Jacob & Crystal Morse" → Jacob Morse, Crystal Morse / "Namkyu Baek & Joanna" → Namkyu Baek, Joanna Baek.
 * 단기 사역자(stw)는 해당하지 않는다. 명단을 못 읽으면 아무도 풀타임으로 보지 않는다(직접 지정한 담당자만 남는다).
 */
const norm = s => String(s || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();

/** "Jacob & Crystal Morse" → [['jacob','morse'], ['crystal','morse']] — 성이 한 사람에게만 있으면 나머지가 이어받는다 */
export function personsOf(teamName) {
  const parts = String(teamName || '').split(/\s*[&＆·,/]\s*|\s+and\s+/i).map(norm).filter(Boolean).map(p => p.split(' '));
  const full = parts.filter(p => p.length > 1);
  const surname = full.length === 1 ? full[0][full[0].length - 1] : '';
  return parts.map(p => (p.length === 1 && surname ? [p[0], surname] : p));
}

/** 이름 한 사람 → 비교용 열쇠들(이름·성 순서를 바꾼 것, 띄어쓰기 없는 것) */
const keysOf = tokens => {
  const t = tokens.filter(Boolean);
  if (!t.length) return [];
  const forward = t.join(''), backward = [...t].reverse().join('');
  return [forward, backward].filter(k => k.length >= 3);
};

/** 명단 [{ nameEn, nameKo }] → 열쇠 모음 */
export function rosterKeys(roster) {
  const keys = new Set();
  for (const entry of Array.isArray(roster) ? roster : []) {
    for (const name of [entry?.nameEn, entry?.nameKo]) for (const person of personsOf(name)) keysOf(person).forEach(k => keys.add(k));
  }
  return keys;
}

/** 계정(이름·이메일)이 풀타임 선교사인가 */
export function matchesMissionary(keys, { name, email } = {}) {
  if (!keys.size) return false;
  if (keysOf(norm(name).split(' ')).some(k => keys.has(k))) return true;
  const local = norm(String(email || '').split('@')[0]).replace(/\s+/g, '');
  return local.length >= 3 && keys.has(local);
}

let cache = { at: 0, keys: null };
export const resetMissionaryCache = () => { cache = { at: 0, keys: null }; };

/** 인원 소개에서 만든 /team-roster.json 을 읽는다. 5분 동안은 다시 읽지 않는다 */
export async function loadMissionaryKeys(env) {
  if (cache.keys && Date.now() - cache.at < 300000) return cache.keys;
  try {
    if (!env.ASSETS?.fetch) return new Set();                       // Cloudflare Pages 에서는 항상 있다
    const res = await env.ASSETS.fetch(new Request('https://assets.local/team-roster.json'));
    if (!res.ok) return new Set();
    cache = { at: Date.now(), keys: rosterKeys(await res.json()) };
    return cache.keys;
  } catch { return new Set(); }
}

export async function isFulltimeMissionary(env, account) {
  return matchesMissionary(await loadMissionaryKeys(env), account);
}
