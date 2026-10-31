import assert from 'node:assert/strict';
import test from 'node:test';
import * as TvData from '../functions/api/campteam/tv-data.js';
import { sanitizeLayout, defaultLayout, cleanSettings, WIDGETS, LIST_WIDGETS } from '../functions/lib/campteamTv.js';
import { todayKst, currentWeekStart } from '../functions/lib/carDrive.js';
import { tvPortal } from '../functions/lib/campteamTvPortal.js';
import { fakeD1, makeEnv, U } from './helpers/campteam-fakes.mjs';

const tv = async (env) => TvData.onRequestGet({ env, request: new Request('http://localhost:8788/api/campteam/tv-data?t=testtoken1') });
function kv(data) { const puts = []; return { puts, async get(k, t) { const v = data[k]; return v === undefined ? null : t === 'json' ? JSON.parse(JSON.stringify(v)) : String(v); }, async list() { return { keys: [], list_complete: true }; }, async put(k) { puts.push(k); }, async delete() { puts.push('del'); } }; }
const origFetch = globalThis.fetch;

test('TV 포털 정보: 공지·날씨·팀원 듀티가 담기고, 듀티는 팀 명단에 있는 사람 이름만 — 이메일은 없다', async () => {
  globalThis.fetch = async () => new Response(JSON.stringify({ current: { temperature_2m: 3, apparent_temperature: 0, weather_code: 71, is_day: 1, wind_speed_10m: 2, time: '2026-10-28T09:00' }, daily: { temperature_2m_max: [8], temperature_2m_min: [-1], precipitation_probability_max: [60] } }), { status: 200 });
  try {
    const today = todayKst(), week = currentWeekStart(today);
    const store = kv({
      'portal:notices': [{ id: 'n1', title: '이번 주 공지', body: '모두 확인해 주세요', weekStart: week, createdAt: '2026-10-27T00:00:00Z', pinned: true, byEmail: 'secret@wolko.org', tr: { lang: 'en', title: 'This week', text: 'Please check' } }, { id: 'n2', title: '지난 공지', body: '예전', weekStart: '2020-01-06', createdAt: '2020-01-06T00:00:00Z' }],
      [`kitchen:day:${today}`]: { lunch_prep: [{ email: U.mem, name: 'Team Member' }, { email: 'outsider-x@example.test', name: 'Outside Person' }], dinner_clean: [{ email: 'outsider-x@example.test', name: 'Outside Person' }] },
      [`drive:slot:${today}:pickup`]: { email: U.dir, name: 'Team Director' },
      [`drive:slot:${today}:dropoff`]: { email: 'outsider-x@example.test', name: 'Outside Person' },
    });
    const env = makeEnv(fakeD1(), { CAMP_KV: store }), res = await tv(env), raw = await res.clone().text(), body = await res.json(), p = body.data.portal;
    assert.equal(res.status, 200); assert.ok(p, '포털 정보 조각');
    assert.deepEqual(p.notices.map((n) => n.id === undefined ? n.title : n.title), ['이번 주 공지'], '이번 주 공지만'); assert.equal(p.notices[0].pinned, true); assert.equal(p.notices[0].tr.text, 'Please check');
    assert.equal(p.weather.kind, 'snow'); assert.equal(p.weather.temp, 3); assert.equal(p.weather.isDay, true);
    assert.deepEqual(p.duty.kitchen.map((k) => k.meal), ['lunch'], '명단 밖 사람만 있는 식사(저녁)는 나오지 않는다');
    assert.ok(p.duty.kitchen[0].prep.length === 1 && !JSON.stringify(p.duty).includes('Outside Person'), '명단 밖 사람 이름은 TV 에 나가지 않는다');
    assert.ok(p.duty.car.pickup, '팀원 운전자'); assert.equal(p.duty.car.dropoff, null, '명단 밖 운전자는 null');
    assert.doesNotMatch(raw, /@wolko\.org|@wol\.org|@example\.test|secret|byEmail/, '이메일·올린 사람은 응답에 없다');
    assert.deepEqual(store.puts, [], '공용 저장소(KV)에는 아무것도 쓰지 않는다(날씨 저장도 막는다)');
  } finally { globalThis.fetch = origFetch; }
});

test('TV 포털 정보: 날씨를 못 읽거나 저장소가 없어도 TV 데이터는 나온다(조각만 비어 있다)', async () => {
  globalThis.fetch = async () => { throw new Error('offline'); };
  try {
    const env = makeEnv(fakeD1()), res = await tv(env), b = await res.json();   // CAMP_KV 없음
    assert.equal(res.status, 200); assert.ok(b.data.tasks.length > 0); assert.ok(b.data.portal === null || (b.data.portal.weather === null && b.data.portal.notices === null));
  } finally { globalThis.fetch = origFetch; }
});

test('TV 위젯·설정: 새 위젯 종류는 검사를 통과하고 기본 배치에 들어 있으며, 하늘 배경 설정은 on/off 만', () => {
  for (const t of ['hero', 'pnotices', 'duty', 'ooo', 'pevents']) assert.ok(WIDGETS[t], t);
  assert.ok(LIST_WIDGETS.includes('pnotices') && LIST_WIDGETS.includes('pevents') && !LIST_WIDGETS.includes('duty'));
  const types = defaultLayout().pages.flatMap((p) => p.items.map((i) => i.type)); for (const t of ['hero', 'pnotices', 'duty']) assert.ok(types.includes(t), t + ' 기본 배치');
  assert.ok(sanitizeLayout(defaultLayout()).layout);
  const one = sanitizeLayout({ pages: [{ id: 'a', name: 'A', secs: 20, items: [{ uid: 'p', type: 'pnotices', x: 0, y: 0, w: 5, h: 4, opts: { n: 3 } }] }] }); assert.equal(one.layout.pages[0].items[0].opts.n, 3, '목록 위젯은 개수 설정 가능');
  assert.equal(cleanSettings({ sky: 'off' }).settings.sky, 'off'); assert.match(cleanSettings({ sky: 'fog' }).error, /하늘/);
});

test('TV 「오늘 부재」: 이름만 내려가고 이메일은 담기지 않는다', async () => {
  const e = makeEnv(fakeD1(), {}), today = '2026-11-02';
  e.DB.sqlite.prepare("INSERT INTO events (id,title,kind,startDate,endDate,createdAt,updatedAt,createdBy) VALUES ('ev-tv-ooo','Guest Teacher','out',?1,?1,'2026-10-30','2026-10-30','t')").run(today);
  const p = await tvPortal(e, today, []);
  assert.ok(Array.isArray(p.ooo) && p.ooo.includes('Guest Teacher'));
  assert.ok(!JSON.stringify(p.ooo).includes('@'), '이메일은 TV 로 나가지 않는다');
});
