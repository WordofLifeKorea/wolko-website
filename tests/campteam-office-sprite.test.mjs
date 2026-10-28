import assert from 'node:assert/strict';
import test from 'node:test';
import * as Sprite from '../functions/api/campteam/office-sprite.js';
import { sanitizeAvatar } from '../functions/lib/campteamOffice.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 250, 255, 0]);
const M = { onRequestGet: 'GET', onRequestPut: 'PUT', onRequestDelete: 'DELETE' };
const call = async (fn, env, who, { k, body } = {}) => Sprite[fn]({ env, request: await req(who, { method: M[fn], url: 'http://localhost:8788/api/campteam/office-sprite' + (k ? '?k=' + k : '') }).then((r) => (body ? new Request(r.url, { method: M[fn], headers: r.headers, body }) : r)) });

test('캐릭터 그림: 관리자만 올리고 지우며, PNG·크기·이름을 검사하고, 로그인한 사람은 볼 수 있다', async () => {
  const env = makeEnv(fakeD1());
  assert.equal((await call('onRequestPut', env, U.mem, { k: 'sample-seated', body: PNG })).status, 403, '일반 팀원은 올릴 수 없다');
  assert.equal((await call('onRequestPut', env, U.admin, { k: 'sample-seated', body: PNG })).status, 200);
  assert.equal((await call('onRequestPut', env, U.admin, { k: 'Bad Name', body: PNG })).status, 400, '이름 검사');
  assert.equal((await call('onRequestPut', env, U.admin, { k: 'sample-x', body: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]) })).status, 400, 'PNG 가 아니면 거부');
  assert.equal((await call('onRequestPut', env, U.admin, { k: 'sample-big', body: new Uint8Array(210 * 1024).fill(1) })).status, 400, '200KB 초과 거부');
  const list = await (await call('onRequestGet', env, U.view)).json();
  assert.deepEqual(Object.keys(list.sprites), ['sample-seated'], '올라온 그림 목록'); assert.equal(list.canEdit, false);
  const g = await call('onRequestGet', env, U.mem, { k: 'sample-seated' });
  assert.equal(g.status, 200); assert.equal(g.headers.get('Content-Type'), 'image/png'); assert.match(g.headers.get('Cache-Control'), /private/);
  assert.deepEqual(new Uint8Array(await g.arrayBuffer()), PNG, '올린 그대로 돌려준다');
  assert.equal((await call('onRequestGet', env, U.mem, { k: 'nobody-seated' })).status, 404);
  assert.equal((await Sprite.onRequestGet({ env, request: new Request('http://localhost:8788/api/campteam/office-sprite?k=sample-seated') })).status, 401, '로그인 필요');
  assert.equal((await call('onRequestDelete', env, U.mem, { k: 'sample-seated' })).status, 403);
  assert.equal((await call('onRequestDelete', env, U.admin, { k: 'sample-seated' })).status, 200);
  assert.deepEqual(Object.keys((await (await call('onRequestGet', env, U.mem)).json()).sprites), []);
});

test('캐릭터 그림: 아바타의 sprite 이름은 안전한 모양만 저장된다', () => {
  assert.equal(sanitizeAvatar({ sprite: 'sample' }).sprite, 'sample');
  for (const bad of ['../x', 'A B', '<b>', 'x', 'a'.repeat(40), 5]) assert.equal(sanitizeAvatar({ sprite: bad }).sprite, '');
});
