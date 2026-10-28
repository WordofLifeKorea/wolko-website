import assert from 'node:assert/strict';
import test from 'node:test';
import * as Feed from '../functions/api/campteam/portal-feed.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';
import { todayKst, currentWeekStart } from '../functions/lib/carDrive.js';

// 가짜 KV — 쓰기가 한 번이라도 일어나면 puts 에 기록되어 시험이 잡아낸다.
function kv(data = {}) {
  const store = { ...data }, puts = [];
  return { puts, async get(k, type) { const v = store[k]; return v === undefined ? null : type === 'json' ? JSON.parse(JSON.stringify(v)) : String(v); }, async list() { return { keys: [], list_complete: true }; }, async put(k, v) { puts.push(k); store[k] = JSON.parse(v); } };
}
const get = async (env, who) => Feed.onRequestGet({ env, request: await req(who, { url: 'http://localhost:8788/api/campteam/portal-feed' }) });
const origFetch = globalThis.fetch;

test('포털 정보 피드: 로그인이 없으면 거부하고, 있으면 날씨·공지·내 듀티를 담아 내려준다(포털 데이터는 읽기만)', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ current: { temperature_2m: 6, apparent_temperature: 4, weather_code: 0, is_day: 0, wind_speed_10m: 3, time: '2026-10-28T20:00' }, daily: { temperature_2m_max: [12], temperature_2m_min: [0], precipitation_probability_max: [0] } }), { status: 200 });
  try {
    const today = todayKst(), week = currentWeekStart(today);
    const email = U.mem;
    const store = kv({
      'portal:notices': [
        { id: 'n1', title: '이번 주 공지', body: '모두 확인해 주세요', weekStart: week, createdAt: '2026-10-27T00:00:00Z', byEmail: 'secret@wolko.org', pinned: true },
        { id: 'n2', title: '지난 주 공지', body: '오래된 공지', weekStart: '2020-01-06', createdAt: '2020-01-06T00:00:00Z' },
      ],
    });
    const env = makeEnv(fakeD1(), { CAMP_KV: store });
    const noAuth = await Feed.onRequestGet({ env, request: new Request('http://localhost:8788/api/campteam/portal-feed') });
    assert.equal(noAuth.status, 401);

    const r = await get(env, email); assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.today, today);
    assert.ok(j.name, '이름이 있다');
    assert.equal(j.weather.kind, 'clear'); assert.equal(j.weather.isDay, false); assert.equal(j.weather.temp, 6);
    assert.deepEqual(j.notices.map((n) => n.id), ['n1'], '이번 주 공지만');
    assert.ok(!('byEmail' in j.notices[0]), '올린 사람 이메일은 내려가지 않는다');
    assert.ok(j.me && Array.isArray(j.me.kitchen) && Array.isArray(j.me.car), '내 오늘 듀티 칸');
    assert.deepEqual(store.puts, [], '공용 저장소에는 아무것도 쓰지 않는다(날씨 저장도 막는다)');
  } finally { globalThis.fetch = origFetch; }
});

test('포털 정보 피드: 조각 하나가 실패해도(날씨 읽기 실패) 나머지는 그대로 내려준다', async () => {
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const env = makeEnv(fakeD1(), { CAMP_KV: kv() });
    const j = await (await get(env, U.view)).json();
    assert.equal(j.weather, null); assert.ok(Array.isArray(j.notices)); assert.ok(j.name);
  } finally { globalThis.fetch = origFetch; }
});
