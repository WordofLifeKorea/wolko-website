import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import * as Cfg from '../functions/api/campteam/config.js';
import * as Fx from '../functions/api/campteam/season-fx.js';
import { FX_MODES, loadSeasonFx, normFx } from '../functions/lib/campteamSeasonFx.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../public/portal/campteam/season-fx-core.js', import.meta.url), 'utf8'), ctx);
const R = ctx.CTSeasonFx;
const at = (iso) => new Date(iso + 'T12:00:00+09:00');

test('자동: 봄 3~5월 · 여름 6~8월 · 가을 9월~11월 19일 · 겨울 11월 20일~2월 (한국 시간 기준)', () => {
  const t = { '2027-03-01': 'spring', '2027-05-31': 'spring', '2027-06-01': 'summer', '2027-08-31': 'summer', '2026-09-01': 'autumn', '2026-11-19': 'autumn', '2026-11-20': 'winter', '2026-12-31': 'winter', '2027-01-15': 'winter', '2027-02-28': 'winter' };
  for (const [d, exp] of Object.entries(t)) assert.equal(R.resolve('auto', { date: at(d) }), exp, d);
  assert.equal(R.resolve(undefined, { date: at('2026-11-20') }), 'winter', '값이 없으면 자동');
  assert.equal(R.resolve('엉뚱한값', { date: at('2026-07-01') }), 'summer', '모르는 값은 자동');
});
test('고정 모양은 날짜와 관계없이 그대로, 끄기는 효과 없음', () => {
  for (const m of ['spring', 'summer', 'rain', 'autumn', 'winter']) assert.equal(R.resolve(m, { date: at('2027-01-10') }), m);
  assert.equal(R.resolve('off', { date: at('2026-12-01') }), '');
});
test('날씨 따라: 눈이 오면 겨울, 비·천둥이면 장마, 그 밖에는 날짜대로 (첫눈 바로 겨울)', () => {
  assert.equal(R.resolve('weather', { date: at('2026-11-05'), weatherKind: 'snow' }), 'winter');
  assert.equal(R.resolve('weather', { date: at('2026-11-05'), weatherKind: 'rain' }), 'rain');
  assert.equal(R.resolve('weather', { date: at('2026-11-05'), weatherKind: 'storm' }), 'rain');
  assert.equal(R.resolve('weather', { date: at('2026-11-05'), weatherKind: 'clear' }), 'autumn');
  assert.equal(R.resolve('weather', { date: at('2026-11-05') }), 'autumn', '날씨를 못 받았으면 날짜대로');
});

const env = () => makeEnv(fakeD1(), {});
const post = async (e, who, body) => Fx.onRequestPost({ env: e, request: await req(who, { method: 'POST', body, url: 'http://localhost:8788/api/campteam/season-fx' }) });
const cfg = async (e) => (await Cfg.onRequestGet({ env: e })).json();

test('설정 기본값은 자동이고, 관리자가 바꾸면 홈·TV 가 읽는 공개 설정에 바로 나온다', async () => {
  const e = env();
  assert.equal((await cfg(e)).seasonFx, 'auto');
  const r = await post(e, U.admin, { mode: 'winter' }); assert.equal(r.status, 200);
  assert.equal((await cfg(e)).seasonFx, 'winter'); assert.equal(await loadSeasonFx(e), 'winter');
  assert.equal((await post(e, U.admin, { mode: 'off' })).status, 200); assert.equal((await cfg(e)).seasonFx, 'off');
  assert.equal((await post(e, U.admin, { mode: 'rain' })).status, 200); assert.equal((await cfg(e)).seasonFx, 'rain', '다시 바꿔도 한 줄만 갱신된다');
  assert.equal(e.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM notify_settings WHERE key = 'seasonFx'").get().n, 1);
});
test('관리자가 아니면 바꿀 수 없고, 이상한 값·로그인 없음은 거절된다', async () => {
  const e = env();
  assert.equal((await post(e, U.mem, { mode: 'winter' })).status, 403);
  assert.equal((await post(e, U.dir, { mode: 'winter' })).status, 403);
  assert.equal((await post(e, null, { mode: 'winter' })).status, 401);
  assert.equal((await post(e, U.admin, { mode: 'blizzard' })).status, 400);
  assert.equal((await post(e, U.admin, {})).status, 400);
  assert.equal((await post(e, U.admin, null)).status, 400, 'JSON null 본문도 500 이 아니라 400');
  assert.equal((await cfg(e)).seasonFx, 'auto', '거절된 요청은 아무것도 바꾸지 않는다');
});
test('저장된 값이 깨졌거나 표가 없어도 자동으로 돌아간다', async () => {
  const e = env();
  e.DB.sqlite.exec("INSERT INTO notify_settings (key,value,updatedAt,updatedBy) VALUES ('seasonFx','\"zzz\"','x','x')");
  assert.equal(await loadSeasonFx(e), 'auto');
  e.DB.sqlite.exec('DROP TABLE notify_settings'); assert.equal(await loadSeasonFx(e), 'auto'); assert.equal((await cfg(e)).seasonFx, 'auto');
  assert.deepEqual(FX_MODES, ['auto', 'weather', 'spring', 'summer', 'rain', 'autumn', 'winter', 'off']); assert.equal(normFx('spring'), 'spring');
});
