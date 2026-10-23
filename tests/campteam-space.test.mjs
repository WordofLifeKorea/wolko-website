import assert from 'node:assert/strict';
import test from 'node:test';
import * as Space from '../functions/api/campteam/camp-space.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const mk = (o) => makeEnv(fakeD1(o));
const get = async (env, who, qs) => Space.onRequestGet({ env, request: await req(who, { url: 'http://localhost:8788/api/campteam/camp-space' + qs }) });
const J = r => r.json();

test('캠프별 운영 공간(행사): 일정·업무·회의·결정·파일·예산이 한 번에 모인다', async () => {
  const env = mk(); const d = await J(await get(env, U.dir, '?id=camp-w27'));
  assert.equal(d.camp.nameKo, '2027 Winter Camp'); assert.equal(d.type.id, 'type-winter');
  assert.ok(d.stats.total >= 14 && d.stats.open >= 10 && d.stats.noOwner >= 1 && d.stats.completed >= 1);
  assert.ok(d.tasks.length && d.tasks.every(t => !['Completed', 'Not Applicable'].includes(t.status))); assert.ok(d.events.some(e => e.title.includes('Speaker Call')));
  assert.ok(d.meetings.some(m => m.id === 'm2')); assert.ok(d.decisions.some(x => x.id === 'd4'), '현재 유효한 결정만(제안·대체된 것 제외)'); assert.ok(!d.decisions.some(x => x.id === 'd3'));
  assert.ok(d.files.length >= 3 && d.stats.files >= 3); assert.deepEqual(d.budget.map(b => b.currency).sort(), ['KRW', 'USD']); assert.equal(d.budget.find(b => b.currency === 'KRW').target, 15000000);
  assert.ok(!d.tasks.some(t => t.title.includes('Unity Camp dates')), '다른 캠프의 업무는 섞이지 않는다');
});

test('캠프 유형 전체 기록(예: Winter Camp 전체): 그 유형의 모든 행사와 공통 자료', async () => {
  const env = mk(); const d = await J(await get(env, U.mem, '?typeId=type-winter'));
  assert.equal(d.camp, null); assert.equal(d.type.id, 'type-winter'); assert.deepEqual(d.camps.map(c => c.id).sort(), ['camp-w26', 'camp-w27']);
  assert.ok(d.stats.total >= 14); assert.ok(d.meetings.some(m => m.id === 'm2'));
  env.DB.sqlite.exec(`INSERT INTO files (id,typeId,title,kind,storage,uploadedBy,createdAt,updatedAt) VALUES ('ftype','type-winter','Winter 공통 안내','pdf','link','x','2026-10-22','2026-10-22')`);
  assert.ok((await J(await get(env, U.mem, '?typeId=type-winter'))).files.some(f => f.id === 'ftype'), '유형 공통 자료가 보인다');
});

test('권한: 조회만 계정은 금액·금액 파일이 없고, 잘못된 요청은 거부', async () => {
  const env = mk(); const seen = []; const env2 = makeEnv(fakeD1({ spy: q => seen.push(q) }));
  const v = await J(await get(env2, U.view, '?id=camp-w27')); assert.equal('budget' in v, false); assert.ok(!v.files.some(f => f.restricted)); assert.equal(seen.some(q => /budget_/.test(q)), false, '금액 표는 읽지도 않는다');
  const m = await J(await get(env, U.mem, '?id=camp-w27')); assert.ok(m.files.length > v.files.length || m.stats.files >= v.stats.files);
  assert.equal((await get(env, null, '?id=camp-w27')).status, 401); assert.equal((await get(env, U.mem, '')).status, 400); assert.equal((await get(env, U.mem, '?id=nope')).status, 404); assert.equal((await get(env, U.mem, '?typeId=nope')).status, 404);
  env.DB.sqlite.exec(`UPDATE camps SET deletedAt='x' WHERE id='camp-u26'`); assert.equal((await get(env, U.mem, '?id=camp-u26')).status, 404);
});
