import assert from 'node:assert/strict';
import test from 'node:test';
import * as Office from '../functions/api/campteam/office.js';
import { sanitizeAvatar, defaultAvatar, publicId, SEAT_WINDOW_MS } from '../functions/lib/campteamOffice.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const M = { onRequestGet: 'GET', onRequestPost: 'POST', onRequestPut: 'PUT' };
const call = async (fn, env, who, body) => Office[fn]({ env, request: await req(who, { method: M[fn], body, url: 'http://localhost:8788/api/campteam/office' }) });
const J = (r) => r.json();

test('팀 사무실: 접속 확인(POST)을 보낸 팀원만 앉고, 이메일은 밖으로 나가지 않는다', async () => {
  const env = makeEnv(fakeD1());
  let j = await J(await call('onRequestGet', env, U.mem));
  assert.ok(j.members.length >= 3, '명단 전원이 자리를 가진다'); assert.ok(j.members.every((m) => !m.seated), '아직 아무도 앉지 않았다');
  assert.equal((await call('onRequestPost', env, U.mem, {})).status, 200);
  j = await J(await call('onRequestGet', env, U.dir));
  const mem = j.members.find((m) => m.you === false && m.seated); assert.ok(mem, '접속 확인을 보낸 팀원이 앉아 있다');
  assert.ok(j.members.every((m) => !('email' in m)) && j.guests.every((g) => !('email' in g)), '이메일은 응답에 없다');
  assert.ok(!JSON.stringify(j).includes('@'), '어디에도 이메일 모양이 없다');
  const noAuth = await Office.onRequestGet({ env, request: new Request('http://localhost:8788/api/campteam/office') }); assert.equal(noAuth.status, 401);
});

test('팀 사무실: 오래된 접속은 자리가 비고, 「내 자리 숨기기」는 다른 사람에게 보이지 않는다', async () => {
  const env = makeEnv(fakeD1());
  await call('onRequestPost', env, U.mem, {});
  env.DB.sqlite.prepare('UPDATE office_presence SET lastSeen = ?1').run(new Date(Date.now() - SEAT_WINDOW_MS - 5000).toISOString());
  assert.ok((await J(await call('onRequestGet', env, U.dir))).members.every((m) => !m.seated), '오래되면 비어 보인다');
  await call('onRequestPost', env, U.mem, {});
  assert.equal((await J(await call('onRequestPost', env, U.mem, { hidden: true }))).hidden, true);
  const others = await J(await call('onRequestGet', env, U.dir));
  assert.ok(!others.members.some((m) => m.id === publicId(U.mem)), '숨긴 사람은 다른 사람 화면에서 아예 안 보인다');
  const mine = await J(await call('onRequestGet', env, U.mem));
  assert.ok(mine.me.hidden && mine.members.some((m) => m.you && !m.seated), '본인은 자기 자리가 비어 있게 보인다');
  await call('onRequestPost', env, U.mem, { hidden: false });
  assert.ok((await J(await call('onRequestGet', env, U.dir))).members.some((m) => m.id === publicId(U.mem) && m.seated));
});

test('팀 사무실: 명단 밖 로그인 사용자는 앉지 않고 게스트로 들어오며, 숨기면 빠진다', async () => {
  const env = makeEnv(fakeD1());
  await call('onRequestPost', env, U.out, {});
  let j = await J(await call('onRequestGet', env, U.mem));
  assert.equal(j.guests.length, 1); assert.ok(j.guests[0].name && j.guests[0].id);
  assert.ok(!j.members.some((m) => m.id === publicId(U.out)), '게스트는 자리가 없다');
  await call('onRequestPost', env, U.out, { hidden: true });
  assert.equal((await J(await call('onRequestGet', env, U.mem))).guests.length, 0);
});

test('팀 사무실: 캐릭터 모양은 허용된 값만 저장되고, 남의 것은 관리자만 바꾼다', async () => {
  const env = makeEnv(fakeD1());
  const a = sanitizeAvatar({ skin: 'red', hair: 'rainbow', glasses: 'varied', beard: 'stubble', top: '#ABCDEF', hairColor: 'javascript:1' });
  assert.deepEqual([a.hair, a.glasses, a.beard, a.top], ['short', 'varied', 'stubble', '#abcdef']); assert.match(a.skin, /^#[0-9a-f]{6}$/); assert.match(a.hairColor, /^#[0-9a-f]{6}$/);
  assert.deepEqual(defaultAvatar('a@x.test'), defaultAvatar('A@x.test'), '같은 이메일은 항상 같은 모양');
  const r = await call('onRequestPut', env, U.mem, { avatar: { hair: 'bun', glasses: 'round' } }); assert.equal(r.status, 200);
  assert.equal((await call('onRequestPut', env, U.mem, { email: U.dir, avatar: { hair: 'bun' } })).status, 403, '남의 캐릭터는 못 바꾼다');
  assert.equal((await call('onRequestPut', env, U.admin, { email: U.dir, avatar: { hair: 'bald', beard: 'short' } })).status, 200);
  const j = await J(await call('onRequestGet', env, U.admin));
  assert.equal(j.members.find((m) => m.id === publicId(U.mem)).avatar.hair, 'bun');
  assert.equal(j.members.find((m) => m.id === publicId(U.dir)).avatar.beard, 'short');
});

test('팀 사무실: 0022 가 아직 적용되지 않은 DB 에서도 오류 없이 빈 사무실이 나온다', async () => {
  const env = makeEnv(fakeD1()); env.DB.sqlite.exec('DROP TABLE office_presence; DROP TABLE office_avatars;');
  const r = await call('onRequestGet', env, U.mem); assert.equal(r.status, 200);
  const j = await J(r); assert.ok(j.members.length >= 1 && j.members.every((m) => !m.seated));
  assert.equal((await call('onRequestPost', env, U.mem, {})).status, 200);
});
