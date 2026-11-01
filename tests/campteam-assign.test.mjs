import assert from 'node:assert/strict';
import test from 'node:test';
import * as SL from '../functions/api/campteam/camp-slots.js';
import * as PP from '../functions/api/campteam/camp-people.js';
import * as CF from '../functions/api/campteam/camp-conflicts.js';
import { gradeNum, isMinor, proposeGroups, proposeRooms, findConflicts, parsePeopleText } from '../functions/lib/campteamAssign.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const call = async (m, env, who, o = {}) => { const r = await m({ env, request: await req(who, { url: 'http://localhost/api/campteam/x' + (o.qs || ''), method: o.method, body: o.body }) }); return { status: r.status, body: await r.json() }; };
const cid = async (env) => (await env.DB.prepare('SELECT id FROM camps WHERE deletedAt IS NULL ORDER BY createdAt LIMIT 1').first()).id;

test('학년 숫자 · 미성년 판단 · 붙여넣기 읽기', () => {
  assert.equal(gradeNum('초3'), 3); assert.equal(gradeNum('중1'), 7); assert.equal(gradeNum('고2'), 11); assert.equal(gradeNum('3학년'), 3); assert.equal(gradeNum('성인'), 0);
  assert.equal(isMinor({ role: 'participant', grade: '중2' }), true); assert.equal(isMinor({ role: 'participant', grade: '성인' }), false); assert.equal(isMinor({ role: 'staff', grade: '' }), false);
  const r = parsePeopleText('이름\t성별\t학년\t교회\t역할\n가온\t여\t중1\t가상교회\t\n나래\tM\t고1\t\t스태프\n\t여\t초1'); assert.deepEqual(r.rows.map((x) => [x.name, x.gender, x.role]), [['가온', 'F', 'participant'], ['나래', 'M', 'staff']]); assert.equal(r.skipped.length, 1);
});

test('조 자동 배정: 성별·학년이 골고루, 정원 지킴, 이미 배정된 사람 고려', () => {
  const people = [...Array(6)].map((_, i) => ({ id: 'm' + i, name: 'M' + i, gender: 'M', grade: '중' + (1 + (i % 3)) })).concat([...Array(6)].map((_, i) => ({ id: 'f' + i, name: 'F' + i, gender: 'F', grade: '초' + (3 + (i % 3)) })));
  const moves = proposeGroups(people, [{ id: 'g1' }, { id: 'g2' }, { id: 'g3' }]);
  assert.equal(moves.length, 12); for (const g of ['g1', 'g2', 'g3']) { const ids = moves.filter((m) => m.groupId === g).map((m) => m.personId); assert.equal(ids.length, 4); assert.equal(ids.filter((i) => i[0] === 'm').length, 2, '조마다 남 2·여 2'); }
  assert.equal(proposeGroups(people, [{ id: 'g1', capacity: 2 }]).length, 2, '정원 2명이면 2명만');
  assert.equal(proposeGroups([{ id: 'x', name: 'X', gender: 'M', grade: '' }], [{ id: 'g1', current: [{ gender: 'M' }, { gender: 'M' }] }, { id: 'g2', current: [{ gender: 'F' }] }])[0].groupId, 'g2', '남자가 적은 조로');
});

test('방 자동 배정: 성별을 섞지 않고 정원을 지킨다', () => {
  const people = [{ id: 'a', name: 'a', gender: 'M' }, { id: 'b', name: 'b', gender: 'F' }, { id: 'c', name: 'c', gender: 'M' }, { id: 'd', name: 'd', gender: 'F' }, { id: 'e', name: 'e', gender: '' }];
  const moves = proposeRooms(people, [{ id: 'r1', capacity: 2 }, { id: 'r2', capacity: 2 }]), by = (r) => moves.filter((m) => m.roomId === r).map((m) => people.find((p) => p.id === m.personId).gender);
  assert.equal(moves.length, 4, '성별 모르는 사람은 건드리지 않는다'); assert.ok(new Set(by('r1')).size === 1 && new Set(by('r2')).size === 1);
});

test('경고: 진행표 겹침 · 차량 정원/운전자/단둘 · 방 성별/정원', () => {
  const people = [{ id: 'k1', name: '지우', gender: 'M', grade: '중1', role: 'participant', vehicleId: 'v1', roomId: 'r1' }, { id: 's1', name: '교사', gender: 'F', grade: '', role: 'staff', vehicleId: 'v1' }, { id: 'k2', name: '하나', gender: 'F', grade: '고1', role: 'participant', roomId: 'r1', vehicleId: 'v2' }, { id: 'k3', name: '두리', gender: 'M', grade: '초5', role: 'participant', vehicleId: 'v2' }, { id: 'k4', name: '세리', gender: 'M', grade: '초5', role: 'participant', vehicleId: 'v2' }];
  const slots = [{ id: 'v1', kind: 'vehicle', name: '봉고', capacity: 5, leader: '교사' }, { id: 'v2', kind: 'vehicle', name: '카니발', capacity: 2, leader: '' }, { id: 'r1', kind: 'room', name: '101', capacity: 1, gender: 'M' }];
  const timeline = [{ id: 't1', dayDate: '2026-07-20', startTime: '09:00', endTime: '10:00', title: 'A', place: '강당', ownerName: '교사' }, { id: 't2', dayDate: '2026-07-20', startTime: '09:30', endTime: '10:30', title: 'B', place: '강당', ownerName: '교사' }, { id: 't3', dayDate: '2026-07-20', startTime: '10:30', endTime: '11:00', title: 'C', place: '강당', ownerName: '교사' }];
  const w = findConflicts({ people, slots, timeline }), types = w.map((x) => x.type);
  assert.ok(types.includes('person-overlap') && types.includes('place-overlap')); assert.equal(w.filter((x) => x.type === 'person-overlap').length, 1, '끝나는 시각에 바로 시작하는 건 겹침이 아니다');
  assert.ok(w.some((x) => x.type === 'minor-adult-alone' && x.text.includes('봉고')), '미성년자와 성인(운전자 포함) 단둘');
  assert.ok(w.some((x) => x.type === 'over-capacity' && x.text.includes('카니발'))); assert.ok(w.some((x) => x.type === 'no-driver' && x.text.includes('카니발')));
  assert.ok(w.some((x) => x.type === 'room-gender-mix')); assert.ok(w.some((x) => x.type === 'room-rule')); assert.ok(w.some((x) => x.type === 'over-capacity' && x.text.includes('101')));
  assert.deepEqual(findConflicts({ people: [], slots: [], timeline: [] }), []);
});

test('배정 API: 만들기·붙여넣기·제안·저장·경고, 권한·잘못된 배정 막기', async () => {
  const env = makeEnv(fakeD1()), campId = await cid(env);
  const mk = async (kind, name, extra = {}) => (await call(SL.onRequestPost, env, U.dir, { method: 'POST', body: { campId, kind, name, ...extra } })).body.id;
  const g1 = await mk('group', '1조'), g2 = await mk('group', '2조'), r1 = await mk('room', '101', { capacity: 2, gender: 'M' }), v1 = await mk('vehicle', '봉고', { capacity: 4, leader: '교사' });
  assert.equal((await call(SL.onRequestPost, env, U.dir, { method: 'POST', body: { campId, kind: 'bogus', name: 'x' } })).status, 400); assert.equal((await call(SL.onRequestPost, env, U.dir, { method: 'POST', body: { campId, kind: 'room', name: 'x', capacity: 0 } })).status, 400);
  const text = '가온\t여\t중1\t가상교회\n나래\t남\t중2\t가상교회\n다솜\t여\t중2\t\n라온\t남\t중1\t\n교사\t여\t성인\t\t스태프\n';
  assert.equal((await call(PP.onRequestPost, env, U.dir, { method: 'POST', body: { action: 'paste', campId, text, preview: true } })).body.count, 5);
  assert.equal((await call(PP.onRequestGet, env, U.dir, { qs: '?campId=' + campId })).body.items.length, 0, '미리보기는 저장하지 않는다');
  assert.equal((await call(PP.onRequestPost, env, U.dir, { method: 'POST', body: { action: 'paste', campId, text } })).body.created, 5); assert.equal((await call(PP.onRequestPost, env, U.dir, { method: 'POST', body: { action: 'paste', campId, text } })).body.duplicates, 5, '같은 사람은 두 번 안 들어간다');
  const prop = await call(PP.onRequestPost, env, U.dir, { method: 'POST', body: { action: 'propose', campId, what: 'groups' } }); assert.equal(prop.body.count, 4, '참가자 4명(스태프 제외)');
  assert.equal((await call(PP.onRequestGet, env, U.dir, { qs: '?campId=' + campId })).body.items.filter((p) => p.groupId).length, 0, '제안은 저장하지 않는다');
  assert.equal((await call(PP.onRequestPost, env, U.dir, { method: 'POST', body: { action: 'assign', campId, what: 'groups', moves: prop.body.moves } })).body.assigned, 4);
  assert.equal((await call(PP.onRequestPost, env, U.dir, { method: 'POST', body: { action: 'assign', campId, what: 'groups', moves: [{ personId: 'x', slotId: r1 }] } })).body.assigned, 0, '방 번호로 조를 배정할 수 없다');
  const people = (await call(PP.onRequestGet, env, U.dir, { qs: '?campId=' + campId })).body.items, teacher = people.find((p) => p.name === '교사'), kid = people.find((p) => p.name === '가온'), boy = people.find((p) => p.name === '나래');
  assert.equal((await call(PP.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + kid.id, body: { vehicleId: v1 } })).status, 200); assert.equal((await call(PP.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + kid.id, body: { vehicleId: g1 } })).status, 400, '조 번호를 차량에 넣을 수 없다');
  assert.equal((await call(PP.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + boy.id, body: { roomId: r1 } })).status, 200); await call(PP.onRequestPatch, env, U.dir, { method: 'PATCH', qs: '?id=' + kid.id, body: { roomId: r1 } });
  const warn = (await call(CF.onRequestGet, env, U.dir, { qs: '?campId=' + campId })).body.warnings; assert.ok(warn.some((w) => w.type === 'minor-adult-alone' && w.level === 'danger')); assert.ok(warn.some((w) => w.type === 'room-gender-mix'));
  assert.equal((await call(SL.onRequestDelete, env, U.dir, { method: 'DELETE', qs: '?id=' + v1 })).status, 200); assert.equal((await call(PP.onRequestGet, env, U.dir, { qs: '?campId=' + campId })).body.items.find((p) => p.id === kid.id).vehicleId, null, '차량을 지우면 배정이 풀린다');
  assert.equal((await call(PP.onRequestGet, env, U.out, { qs: '?campId=' + campId })).status, 403); assert.equal((await call(PP.onRequestPost, env, U.view, { method: 'POST', body: { campId, name: 'x' } })).status, 403); assert.equal((await call(CF.onRequestGet, env, U.out, { qs: '?campId=' + campId })).status, 403);
  assert.ok(teacher);
});
