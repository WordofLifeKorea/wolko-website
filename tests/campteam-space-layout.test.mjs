import assert from 'node:assert/strict';
import test from 'node:test';
import * as L from '../functions/api/campteam/space-layout.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const M = { onRequestGet: 'GET', onRequestPut: 'PUT', onRequestDelete: 'DELETE' };
const call = async (fn, env, who, body) => L[fn]({ env, request: await req(who, { method: M[fn], body, url: 'http://localhost:8788/api/campteam/space-layout' }) });
const J = (r) => r.json();

test('캠프 공간 내 화면: 로그인한 누구나 자기 것만 저장·읽기·초기화, 알 수 없는 카드는 버림', async () => {
  const env = makeEnv(fakeD1());
  assert.equal((await call('onRequestGet', env, null)).status, 401); assert.equal((await call('onRequestPut', env, null, {})).status, 401);
  assert.deepEqual((await J(await call('onRequestGet', env, U.mem))).layout, null);
  const r = await call('onRequestPut', env, U.mem, { order: ['files', 'tasks', 'files', 'evil', 'portal'], hidden: ['budget', 'zzz', 'budget'] }); assert.equal(r.status, 200);
  assert.deepEqual((await J(await call('onRequestGet', env, U.mem))).layout, { order: ['files', 'tasks', 'portal'], hidden: ['budget'] });
  assert.deepEqual((await J(await call('onRequestGet', env, U.dir))).layout, null, '다른 사람 화면은 그대로');
  assert.equal((await call('onRequestPut', env, U.view, { order: ['tasks'], hidden: [] })).status, 200, '명단 밖 로그인 사용자도 자기 화면은 고칠 수 있음');
  assert.equal((await call('onRequestPut', env, U.mem, 'bad')).status, 400);
  assert.equal((await call('onRequestDelete', env, U.mem)).status, 200); assert.deepEqual((await J(await call('onRequestGet', env, U.mem))).layout, null); assert.deepEqual((await J(await call('onRequestGet', env, U.view))).layout, { order: ['tasks'], hidden: [] });
});
