import assert from 'node:assert/strict';
import test from 'node:test';
import * as TL from '../functions/api/campteam/timeline.js';
import * as SP from '../functions/api/campteam/supplies.js';
import * as CT from '../functions/api/campteam/contacts.js';
import * as SR from '../functions/api/campteam/series.js';
import * as FD from '../functions/api/campteam/calendar-feed.js';
import * as NM from '../functions/api/campteam/names.js';
import { parseTimelineText, buildIcs } from '../functions/lib/campteamPrep.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const call = async (m, env, who, o = {}) => { const r = await m({ env, request: await req(who, { url: 'http://localhost/api/campteam/x' + (o.qs || ''), method: o.method, body: o.body }) }); return { status: r.status, body: r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text(), headers: r.headers }; };
const campId = async (env) => (await env.DB.prepare('SELECT id FROM camps WHERE deletedAt IS NULL ORDER BY createdAt LIMIT 1').first()).id;

test('진행표 붙여넣기 읽기: 날짜 이어쓰기·머리글·못 읽은 줄', () => {
  const t = '날짜\t시작\t끝\t제목\t장소\t담당\n2026-07-20\t09:00\t09:30\t등록\t로비\t홍길동\n\t10:00\t11:00\t개회 예배\t강당\n2026-07-21\t9:30\t\t게임\t운동장\n\t곧\t\t이상한 줄\n';
  const r = parseTimelineText(t); assert.equal(r.rows.length, 3); assert.equal(r.rows[1].dayDate, '2026-07-20'); assert.equal(r.rows[2].startTime, '09:30'); assert.equal(r.rows[0].ownerName, '홍길동'); assert.equal(r.skipped.length, 1);
  assert.equal(parseTimelineText('09:00\t09:30\t등록', '2026-08-01').rows[0].dayDate, '2026-08-01', '날짜 칸이 없으면 캠프 시작일');
  assert.equal(parseTimelineText('09:00\t09:30\t등록').skipped[0].reason, '날짜를 알 수 없어요');
});

test('진행표: 만들기·고치기·지우기, 붙여넣기 미리보기/추가, 권한', async () => {
  const env = makeEnv(fakeD1()), cid = await campId(env);
  const a = await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, dayDate: '2026-07-20', startTime: '9:00', title: '등록', place: '로비' } }); assert.equal(a.status, 201);
  assert.equal((await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, dayDate: '07/20', title: 'x' } })).status, 400);
  assert.equal((await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, dayDate: '2026-07-20', startTime: '10:00', endTime: '09:00', title: 'x' } })).status, 400);
  const pv = await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { action: 'paste', campId: cid, preview: true, text: '2026-07-20\t10:00\t11:00\t개회\t강당' } }); assert.equal(pv.body.rows.length, 1);
  assert.equal((await call(TL.onRequestGet, env, U.mem, { qs: '?campId=' + cid })).body.items.length, 1, '미리보기는 저장하지 않는다');
  const pr = await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { action: 'paste', campId: cid, text: '2026-07-20\t10:00\t11:00\t개회\t강당' } }); assert.equal(pr.body.created, 1);
  const list = (await call(TL.onRequestGet, env, U.mem, { qs: '?campId=' + cid })).body.items; assert.deepEqual(list.map((x) => x.title), ['등록', '개회']);
  assert.equal((await call(TL.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + list[0].id, body: { place: '1층' } })).status, 200);
  assert.equal((await call(TL.onRequestDelete, env, U.mem, { method: 'DELETE', qs: '?id=' + list[1].id })).status, 200);
  assert.equal((await call(TL.onRequestPost, env, U.view, { method: 'POST', body: { campId: cid, dayDate: '2026-07-20', title: 'y' } })).status, 403);
  assert.equal((await call(TL.onRequestGet, env, U.out, { qs: '?campId=' + cid })).status, 403);
});

test('준비물: 지난 캠프에서 복사(필요 상태로, 같은 이름은 건너뜀), 상태 값 검사', async () => {
  const env = makeEnv(fakeD1()), camps = (await env.DB.prepare('SELECT id FROM camps WHERE deletedAt IS NULL ORDER BY createdAt LIMIT 2').all()).results, [c1, c2] = [camps[0].id, camps[1].id];
  await call(SP.onRequestPost, env, U.mem, { method: 'POST', body: { campId: c1, name: '생수', qty: '100병', status: 'ready', ownerName: '김' } });
  await call(SP.onRequestPost, env, U.mem, { method: 'POST', body: { campId: c1, name: '테이프', status: 'bogus' } });
  assert.equal((await call(SP.onRequestGet, env, U.mem, { qs: '?campId=' + c1 })).body.items.find((x) => x.name === '테이프').status, 'need', '모르는 상태는 「필요」');
  await call(SP.onRequestPost, env, U.mem, { method: 'POST', body: { campId: c2, name: '생수' } });
  const r = await call(SP.onRequestPost, env, U.mem, { method: 'POST', body: { action: 'copy', fromCampId: c1, campId: c2 } }); assert.deepEqual([r.body.created, r.body.skipped], [1, 1]);
  const mine = (await call(SP.onRequestGet, env, U.mem, { qs: '?campId=' + c2 })).body.items; assert.equal(mine.find((x) => x.name === '테이프').status, 'need');
  assert.equal((await call(SP.onRequestPost, env, U.mem, { method: 'POST', body: { action: 'copy', fromCampId: c1, campId: c1 } })).status, 400);
});

test('연락처: 종류·검색·이메일 검사, 명단 밖 차단, 자동 완성 이름에는 전화·이메일이 없다', async () => {
  const env = makeEnv(fakeD1());
  assert.equal((await call(CT.onRequestPost, env, U.mem, { method: 'POST', body: { kind: 'church', name: '김목사', org: '가상교회', phone: '010-0000-0000', email: 'k@example.com' } })).status, 201);
  assert.equal((await call(CT.onRequestPost, env, U.mem, { method: 'POST', body: { kind: 'vendor', name: '버스회사', email: 'bad' } })).status, 400);
  assert.equal((await call(CT.onRequestGet, env, U.mem, { qs: '?kind=church' })).body.items.length, 1); assert.equal((await call(CT.onRequestGet, env, U.mem, { qs: '?q=가상' })).body.items.length, 1);
  assert.equal((await call(CT.onRequestGet, env, U.out)).status, 403);
  const n = await call(NM.onRequestGet, env, U.mem, { qs: '?kind=church' }); assert.deepEqual(n.body.names, ['가상교회', '김목사']); assert.ok(!JSON.stringify(n.body).includes('010'));
  assert.deepEqual((await call(NM.onRequestGet, env, U.out, { qs: '?kind=church' })).body.names, []);
});

test('반복 캠프: 시리즈를 만들고 달을 고르면 회차 캠프가 만들어진다(같은 회차는 중복 불가)', async () => {
  const env = makeEnv(fakeD1()), typeId = (await env.DB.prepare('SELECT id FROM camp_types WHERE deletedAt IS NULL LIMIT 1').first()).id;
  const s = await call(SR.onRequestPost, env, U.dir, { method: 'POST', body: { nameKo: '가상교회 수련회', nameEn: 'Gasang Retreat', kind: 'church', months: '12, 3, 3, 15', typeId } }); assert.equal(s.status, 201);
  const sid = s.body.id; assert.equal((await call(SR.onRequestGet, env, U.dir)).body.items[0].months, '3,12');
  const r = await call(SR.onRequestPost, env, U.dir, { method: 'POST', body: { action: 'newRound', seriesId: sid, year: 2027, month: 3 } }); assert.equal(r.status, 201); assert.equal(r.body.nameKo, '가상교회 수련회 2027년 3월');
  assert.equal((await call(SR.onRequestPost, env, U.dir, { method: 'POST', body: { action: 'newRound', seriesId: sid, year: 2027, month: 3 } })).status, 400);
  assert.equal((await call(SR.onRequestPost, env, U.dir, { method: 'POST', body: { action: 'newRound', seriesId: sid, year: 2027, month: 13 } })).status, 400);
  assert.equal((await call(SR.onRequestGet, env, U.dir)).body.items[0].camps.length, 1);
});

test('폰 캘린더: 주소는 사람마다 하나, 새로 만들면 예전 주소가 멈추고, 일정(ICS)에 진행표가 들어간다', async () => {
  const env = makeEnv(fakeD1()), cid = await campId(env);
  await call(TL.onRequestPost, env, U.mem, { method: 'POST', body: { campId: cid, dayDate: '2099-07-20', startTime: '09:00', endTime: '09:30', title: '등록, 접수', place: '로비' } });
  const u1 = (await call(FD.onRequestGet, env, U.mem)).body.url, again = (await call(FD.onRequestGet, env, U.mem)).body.url; assert.equal(u1, again); assert.match(u1, /token=[a-f0-9]{64}/);
  const ics = await FD.onRequestGet({ env, request: new Request(u1) }); assert.equal(ics.status, 200); const t = await ics.text();
  assert.ok(t.startsWith('BEGIN:VCALENDAR') && t.includes('SUMMARY:등록\\, 접수') && t.includes('DTSTART:20990720T000000Z'), '09:00 KST = 00:00 UTC'); assert.ok(!t.includes('010-'));
  const u2 = (await call(FD.onRequestPost, env, U.mem, { method: 'POST', body: { regen: true } })).body.url; assert.notEqual(u1, u2);
  assert.equal((await FD.onRequestGet({ env, request: new Request(u1) })).status, 404, '예전 주소는 멈춘다'); assert.equal((await FD.onRequestGet({ env, request: new Request(u2) })).status, 200);
  assert.equal((await FD.onRequestGet({ env, request: new Request('http://x/api/campteam/calendar-feed?token=zzz') })).status, 404);
  assert.equal((await call(FD.onRequestGet, env, U.out)).status, 403, '명단 밖은 주소를 못 받는다');
  assert.ok(buildIcs([{ uid: 'a', title: '종일', start: '2099-01-01', end: '2099-01-02' }]).includes('DTEND;VALUE=DATE:20990103'));
});
