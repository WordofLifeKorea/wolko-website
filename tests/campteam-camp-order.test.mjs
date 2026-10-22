import assert from 'node:assert/strict';
import test from 'node:test';
import * as O from '../functions/api/campteam/camp-order.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const M = { onRequestGet: 'GET', onRequestPut: 'PUT', onRequestDelete: 'DELETE' };
const call = async (fn, env, who, { qs = '', body } = {}) => O[fn]({ env, request: await req(who, { method: M[fn], body, url: `http://localhost:8788/api/campteam/camp-order${qs}` }) });
const J = (r) => r.json();

test('캠프 카드 순서: 기본은 관리자만, 내 순서는 내 것만 기억, 지우면 기본으로, 이상한 값은 버림', async () => {
  const env = makeEnv(fakeD1());
  assert.equal((await call('onRequestGet', env, null)).status, 401);
  assert.deepEqual(await J(await call('onRequestGet', env, U.mem)), { default: null, mine: null, canEditDefault: false });
  assert.equal((await call('onRequestPut', env, U.mem, { body: { scope: 'default', types: ['type-winter'] } })).status, 403, '모두의 기본 순서는 관리자만');
  assert.equal((await call('onRequestPut', env, U.admin, { body: { scope: 'default', types: ['type-unity', 'type-winter', 'bad id!'], camps: { 'type-winter': ['camp-w27', 'camp-w26', '../x'] } } })).status, 200);
  const d = await J(await call('onRequestGet', env, U.mem)); assert.deepEqual(d.default, { types: ['type-unity', 'type-winter'], camps: { 'type-winter': ['camp-w27', 'camp-w26'] } }); assert.equal(d.mine, null, '내가 바꾸기 전에는 기본을 따른다');
  assert.equal((await call('onRequestPut', env, U.mem, { body: { types: ['type-winter', 'type-unity'], camps: { 'type-winter': ['camp-w26', 'camp-w27'] } } })).status, 200);
  const m = await J(await call('onRequestGet', env, U.mem)); assert.deepEqual(m.mine, { types: ['type-winter', 'type-unity'], camps: { 'type-winter': ['camp-w26', 'camp-w27'] } }); assert.deepEqual(m.default.types, ['type-unity', 'type-winter']);
  assert.equal((await J(await call('onRequestGet', env, U.dir))).mine, null, '다른 사람 순서는 그대로');
  assert.equal((await call('onRequestPut', env, U.mem, { body: 'bad' })).status, 400);
  assert.equal((await call('onRequestDelete', env, U.mem, { qs: '?scope=default' })).status, 403);
  assert.equal((await call('onRequestDelete', env, U.mem)).status, 200); assert.equal((await J(await call('onRequestGet', env, U.mem))).mine, null, '지우면 기본 순서로 돌아간다');
  assert.equal((await call('onRequestPut', env, U.out, { body: { types: ['x'] } })).status, 200, '명단 밖도 캠프 목록을 보므로 자기 순서는 기억');
});
