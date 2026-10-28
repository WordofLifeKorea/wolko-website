import test from 'node:test';
import assert from 'node:assert/strict';
import { weatherKind, parseWeather, loadWeather, WEATHER_KEY } from '../functions/lib/weather.js';
import * as api from '../functions/api/portal/weather.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';

const sample = { current: { time: '2026-10-28T14:00', temperature_2m: 17.6, apparent_temperature: 16.2, weather_code: 61, is_day: 1, wind_speed_10m: 12.4 }, daily: { temperature_2m_max: [20.4], temperature_2m_min: [8.5], precipitation_probability_max: [70] } };
const kv = () => { const store = new Map(); return { store, env: { ADMIN_PASSWORD: 'secret', CAMP_KV: { async get(k, t) { const v = store.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { store.set(k, v); } } } }; };

test('날씨 코드는 화면용 종류로 묶인다', () => {
  const m = { 0: 'clear', 1: 'partly', 2: 'partly', 3: 'cloudy', 45: 'fog', 48: 'fog', 51: 'rain', 63: 'rain', 82: 'rain', 71: 'snow', 86: 'snow', 95: 'storm', 99: 'storm', 777: 'cloudy' };
  for (const [code, kind] of Object.entries(m)) assert.equal(weatherKind(code), kind, code);
});

test('예보 응답에서 필요한 값만 꺼내고, 숫자는 반올림한다', () => {
  assert.deepEqual(parseWeather(sample), { kind: 'rain', code: 61, isDay: true, temp: 18, feels: 16, hi: 20, lo: 9, rain: 70, wind: 12, at: '2026-10-28T14:00' });
  assert.equal(parseWeather({ current: { temperature_2m: 3, weather_code: 0, is_day: 0 } }).isDay, false);
  assert.equal(parseWeather({}), null); assert.equal(parseWeather(null), null);
});

test('날씨: 읽어서 15분 저장하고, 저장값이 있으면 다시 읽지 않고, 실패하면 null', async () => {
  const { env, store } = kv(); let calls = 0;
  const ok = async () => { calls++; return Response.json(sample); };
  assert.equal((await loadWeather(env, { fetchImpl: ok })).kind, 'rain');
  assert.ok(store.has(WEATHER_KEY));
  await loadWeather(env, { fetchImpl: ok }); assert.equal(calls, 1);
  const none = kv();
  assert.equal(await loadWeather(none.env, { fetchImpl: async () => new Response('x', { status: 500 }) }), null);
  assert.equal(await loadWeather(none.env, { fetchImpl: async () => { throw new Error('offline'); } }), null);
  assert.equal(none.store.size, 0, '실패는 저장하지 않는다');
});

test('날씨 API: 로그인이 필요하다', async () => {
  const { env } = kv(); env.CAMP_KV.store = null;
  env.CAMP_KV.put('hub:account:a@wol.org', JSON.stringify({ email: 'a@wol.org', name: 'A', role: 'counselor', status: 'approved' }));
  assert.equal((await api.onRequestGet({ env, request: new Request('https://t.co/api/portal/weather') })).status, 401);
  const token = await createHubSessionToken('secret', 'a@wol.org', 'counselor');
  const realFetch = globalThis.fetch; globalThis.fetch = async () => Response.json(sample);
  try {
    const res = await api.onRequestGet({ env, request: new Request('https://t.co/api/portal/weather', { headers: { Authorization: 'Bearer ' + token } }) });
    assert.equal(res.status, 200); assert.equal((await res.json()).weather.temp, 18);
  } finally { globalThis.fetch = realFetch; }
});
