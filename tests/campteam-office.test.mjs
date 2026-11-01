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

test('팀 사무실: 명단 밖 월코 팀원에게는 사무실이 보이지 않고(403), 접속 기록도 남지 않는다', async () => {
  const env = makeEnv(fakeD1());
  assert.equal((await call('onRequestGet', env, U.out)).status, 403); assert.equal((await call('onRequestPost', env, U.out, {})).status, 403);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM office_presence').first()).n, 0);
});

test('팀 사무실: 자리가 정해지면 그 사람만 캐릭터, 방문형(환규)은 접속할 때만 책상이 생기고, 명단의 나머지는 게스트로 나온다', async () => {
  const env = makeEnv(fakeD1()), at = (e) => e.toLowerCase();
  const ins = (e, v) => env.DB.sqlite.prepare('INSERT INTO office_seats (email, visitor, createdAt) VALUES (?1,?2,?3)').run(at(e), v, 'x');
  ins(U.mem, 0); ins(U.dir, 0); ins(U.admin, 1);   // 평소 책상 2개 + 방문형 1개
  let j = await J(await call('onRequestGet', env, U.mem));
  assert.deepEqual(j.members.map((m) => m.id).sort(), [publicId(U.mem), publicId(U.dir)].sort(), '방문형은 접속 전에는 빈 책상도 없다'); assert.equal(j.guests.length, 0);
  await call('onRequestPost', env, U.admin, {});
  j = await J(await call('onRequestGet', env, U.mem)); const v = j.members.find((m) => m.id === publicId(U.admin)); assert.ok(v && v.seated, '방문형이 접속하면 책상과 캐릭터가 생기고 앉는다');
  await call('onRequestPost', env, U.fin, {});   // 명단에는 있지만 자리가 없는 사람
  j = await J(await call('onRequestGet', env, U.mem)); assert.equal(j.guests.length, 1, '자리가 없는 명단 사람은 접속하면 게스트'); assert.ok(!j.members.some((m) => m.id === publicId(U.fin)));
  await call('onRequestPost', env, U.fin, { hidden: true }); assert.equal((await J(await call('onRequestGet', env, U.mem))).guests.length, 0, '숨기면 게스트도 빠진다');
  await call('onRequestPost', env, U.admin, { hidden: true }); j = await J(await call('onRequestGet', env, U.mem)); assert.ok(!j.members.some((m) => m.id === publicId(U.admin)), '방문형이 자리를 숨기면 사라진다');
  env.DB.sqlite.prepare('UPDATE office_presence SET lastSeen = ?1, hidden = 0 WHERE email = ?2').run(new Date(Date.now() - SEAT_WINDOW_MS - 5000).toISOString(), at(U.admin));
  assert.ok(!(await J(await call('onRequestGet', env, U.dir))).members.some((m) => m.id === publicId(U.admin)), '방문형이 오래 접속하지 않으면 책상째 사라진다');
  assert.equal((await J(await call('onRequestGet', env, U.dir))).members.find((m) => m.id === publicId(U.mem)).seated, false, '평소 책상은 비어 있어도 남는다');
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

test('팀 사무실: 명단에 없는 고정 관리자는 접속해 있을 때만 자리가 보이고, 평소에는 빈 책상이 따로 생기지 않는다', async () => {
  const { FIXED_ADMIN_EMAILS } = await import('../functions/lib/campteamAuth.js');
  const env = makeEnv(fakeD1()), ids = FIXED_ADMIN_EMAILS.map((e) => publicId(e)), rosterIds = (await env.DB.prepare('SELECT email FROM camp_members WHERE active = 1').all()).results.map((r) => publicId(r.email));
  const extraIds = ids.filter((i) => !rosterIds.includes(i));
  let j = await J(await call('onRequestGet', env, U.mem));
  assert.ok(extraIds.length > 0, '시험용 명단에는 고정 관리자가 없다');
  assert.ok(j.members.every((m) => !extraIds.includes(m.id)), '평소에는 고정 관리자의 빈 책상이 없다');
  const email = FIXED_ADMIN_EMAILS.find((e) => extraIds.includes(publicId(e)));
  await env.DB.prepare('INSERT INTO office_presence (email,lastSeen,hidden) VALUES (?1,?2,0)').bind(email, new Date().toISOString()).run();
  j = await J(await call('onRequestGet', env, U.mem));
  assert.ok(j.members.some((m) => m.id === publicId(email) && m.seated), '접속하면 자리가 생기고 앉는다');
});

test('팀 사무실: 오늘 부재(휴가)인 팀원에게 ooo 표시가 붙고, 이메일은 나가지 않는다 (직접 접속하면 앉은 채로 표시는 유지 — 화면이 「재택」으로 바꾼다)', async () => {
  const env = makeEnv(fakeD1()), today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const m = env.DB.sqlite.prepare('SELECT email, name FROM camp_members WHERE active = 1 ORDER BY name LIMIT 1').get();
  env.DB.sqlite.prepare("INSERT INTO events (id,title,kind,startDate,endDate,createdAt,updatedAt,createdBy) VALUES ('ev-of-ooo',?1,'out',?2,?2,'2026-10-30','2026-10-30','t')").run(m.name + ' OOO', today);
  let j = await J(await call('onRequestGet', env, U.mem)), raw = JSON.stringify(j);
  const row = j.members.find((x) => x.name === (/[가-힣]/.test(m.name) ? m.name : m.name.split(/\s+/)[0]));
  assert.ok(row && row.ooo === true && row.seated === false, '부재인 사람은 자리가 비어 있고 ooo 표시');
  assert.equal(j.members.filter((x) => x.ooo).length, 1, '다른 사람에게는 표시가 없다');
  assert.ok(!raw.includes(m.email), '이메일은 응답에 없다');
  await call('onRequestPost', env, m.email, {});
  j = await J(await call('onRequestGet', env, U.mem));
  assert.equal(j.members.find((x) => x.ooo).seated, true, '휴가 날 직접 접속하면 앉는다(화면에서 재택 표시)');
});
