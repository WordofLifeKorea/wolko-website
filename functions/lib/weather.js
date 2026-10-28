/**
 * 포탈 첫 화면의 오늘 날씨 — 평택(월코센터) 기준. Open-Meteo(키 없이 쓰는 무료 예보)에서 읽어 15분 동안 KV 에 담아 둔다.
 * 화면은 종류(kind)로 하늘색·애니메이션을 고르고, 숫자는 그대로 보여 준다. 읽지 못하면 null — 첫 화면은 날씨 없이 그대로 동작한다.
 */
export const WEATHER_KEY = 'portal:weather';
export const WEATHER_SECONDS = 900;
const LAT = 36.9921, LON = 127.1129;   // 평택
export const WEATHER_URL = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FSeoul&forecast_days=1`;

/** WMO 날씨 코드 → 화면에서 쓰는 종류: clear · partly · cloudy · fog · rain · snow · storm */
export function weatherKind(code) {
  const c = Number(code);
  if (c === 0) return 'clear';
  if (c === 1 || c === 2) return 'partly';
  if (c === 3) return 'cloudy';
  if (c === 45 || c === 48) return 'fog';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if (c >= 95 && c <= 99) return 'storm';
  return 'cloudy';
}

const round = v => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : null);

/** Open-Meteo 응답 → 화면용 모양 (필요한 값만) */
export function parseWeather(raw) {
  const cur = raw?.current, day = raw?.daily;
  if (!cur || !Number.isFinite(Number(cur.temperature_2m))) return null;
  return {
    kind: weatherKind(cur.weather_code), code: Number(cur.weather_code), isDay: cur.is_day !== 0,
    temp: round(cur.temperature_2m), feels: round(cur.apparent_temperature),
    hi: round(day?.temperature_2m_max?.[0]), lo: round(day?.temperature_2m_min?.[0]),
    rain: round(day?.precipitation_probability_max?.[0]), wind: round(cur.wind_speed_10m),
    at: String(cur.time || ''),
  };
}

/** 저장해 둔 값이 있으면 그것을, 없으면 읽어서 저장한다. 실패하면 null */
export async function loadWeather(env, { fetchImpl = fetch } = {}) {
  const cached = await env.CAMP_KV.get(WEATHER_KEY, 'json');
  if (cached && cached.kind) return cached;
  try {
    const res = await fetchImpl(WEATHER_URL, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`weather ${res.status}`);
    const weather = parseWeather(await res.json());
    if (!weather) return null;
    await env.CAMP_KV.put(WEATHER_KEY, JSON.stringify(weather), { expirationTtl: WEATHER_SECONDS });
    return weather;
  } catch (error) {
    console.error('weather failed:', error.message);
    return null;
  }
}
