import assert from 'node:assert/strict';
import test from 'node:test';
import * as Portal from '../functions/api/campteam/camp-portal.js';
import * as Camps from '../functions/api/campteam/camps.js';
import { summarize, headsOf, totalOf, statusOf, depositOf } from '../functions/lib/campteamPortal.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const M = { onRequestGet: 'GET', onRequestPatch: 'PATCH' };
const call = async (mod, fn, env, who, { qs = '', body } = {}) => mod[fn]({ env, request: await req(who, { method: M[fn] || 'POST', body, url: `http://localhost:8788/api/campteam/x${qs}` }) });
const J = (r) => r.json();

// 가짜 포털 신청 저장소 — 모든 이름·번호·계좌는 가짜. 읽기(get/list)만 허용하고 쓰기·삭제를 시도하면 시험이 실패한다.
const P = 'sample-winter';
const regs = {
  [`camp:${P}:reg:r1`]: { regId: 'r1', campId: P, registrationType: 'individual', name: '가상캠퍼A', phone: '010-0000-0001', email: 'a@example.test', grade: '중1', gender: 'female', church: '가상교회', school: '가상중', emergency: '010-0000-0100', refundBank: '가상은행', refundAccount: '000-000-000001', refundHolder: '가상예금주', notes: '견과류 알레르기', scholarshipDiscounts: { early_bird: 1, sibling: 1 }, scholarshipDiscountText: 'Early Bird, 함께 참여', campFeeBase: 550000, campFeeFinal: 450000, status: 'confirmed', confirmed: true, registeredAt: '2026-10-15T01:00:00Z', counselorMemo: '상담 비공개 메모', saved: true },
  [`camp:${P}:reg:r2`]: { regId: 'r2', campId: P, registrationType: 'individual', name: '가상캠퍼B', phone: '010-0000-0002', grade: '초6', gender: 'male', notes: '', campFeeBase: 550000, campFeeFinal: 500000, scholarshipDiscounts: { early_bird: 1 }, status: 'deposit', depositAmount: 50000, registeredAt: '2026-10-16T01:00:00Z' },
  [`camp:${P}:reg:r3`]: { regId: 'r3', campId: P, registrationType: 'individual', name: '가상캠퍼C', phone: '010-0000-0003', grade: '중2', gender: 'male', campFeeBase: 550000, campFeeFinal: 550000, registeredAt: '2026-10-17T01:00:00Z', payOnSite: true },
  [`camp:${P}:reg:r4`]: { regId: 'r4', campId: P, registrationType: 'group', name: '가상단체대표', phone: '010-0000-0004', church: '가상교회2', groupCount: 3, participants: [{ name: '가상학생D', gender: 'female', grade: '중3', parentInfo: '가상보호자 010-0000-0040' }, { name: '가상학생E', gender: 'male', grade: '중3' }, { name: '' }], campFeeBase: 1650000, campFeeFinal: 1500000, scholarshipDiscounts: { early_bird: 3 }, status: 'deposit', registeredAt: '2026-10-18T01:00:00Z' },
  [`camp:${P}:reg:r5`]: { regId: 'r5', campId: P, registrationType: 'individual', name: '가상캠퍼F', gender: 'female', grade: '중1', campFeeFinal: 550000, isWaitlist: true, registeredAt: '2026-10-19T01:00:00Z' },
  [`camp:${P}:reg:s1`]: { regId: 's1', campId: P, registrationType: 'staff', name: '가상스태프G', phone: '010-0000-0007', email: 'g@example.test', gender: 'female', team1: '상담자', team2: '찬양', church: '가상교회3', pastorName: '가상목사', pastorContact: '010-0000-0070', englishAbility: '상', previousCamp: '참여', faithStory: '비공개 간증', cultHistory: '없음', registeredAt: '2026-09-01T01:00:00Z' },
  [`camp:other-camp:reg:x1`]: { regId: 'x1', campId: 'other-camp', registrationType: 'individual', name: '다른캠프사람', registeredAt: '2026-10-01T00:00:00Z' },
};
function fakeKV() {
  const log = { puts: 0, lists: 0 };
  return { log, async list({ prefix, cursor }) { log.lists++; return { keys: Object.keys(regs).filter((k) => k.startsWith(prefix)).map((name) => ({ name })), list_complete: true, cursor }; },
    async get(k) { return regs[k] ? JSON.parse(JSON.stringify(regs[k])) : null; }, async put() { log.puts++; throw new Error('쓰면 안 된다'); }, async delete() { log.puts++; throw new Error('지우면 안 된다'); } };
}
const mk = ({ linked = false } = {}) => { const kv = fakeKV(), env = makeEnv(fakeD1(), { CAMP_KV: kv }); if (!linked) env.DB.sqlite.prepare("UPDATE camps SET registrationCampId = '' WHERE id = 'camp-w27'").run(); return { kv, env }; };
const link = (env, who = U.fin, id = P) => call(Portal, 'onRequestPost', env, who, { qs: '?campId=camp-w27', body: { portalCampId: id } });
const get = (env, who, extra = '') => call(Portal, 'onRequestGet', env, who, { qs: '?campId=camp-w27' + extra });

test('연결 전: 명단에 있는 사람은 "연결 안 됨"을 보고, 명단 밖·로그인 전은 못 본다', async () => {
  const { env } = mk();
  assert.equal((await get(env, null)).status, 401); assert.equal((await J(await get(env, U.out))).linked, false, '명단 밖의 월코 팀원도 연결 여부는 본다(숫자·이름은 연결 후에도 인원 숫자만)');
  for (const who of [U.mem, U.tre, U.fin, U.dir, U.admin]) { const b = await J(await get(env, who)); assert.equal(b.linked, false, who); assert.equal(b.portalCampId, ''); }
  assert.equal((await call(Portal, 'onRequestGet', env, U.fin, { qs: '' })).status, 400); assert.equal((await call(Portal, 'onRequestGet', env, U.fin, { qs: '?campId=nope' })).status, 404);
});

test('연결 설정은 디렉터·캠프 재정·관리자만 (월코 재정·일반 팀원·명단 밖은 불가), 형식 검사와 해제', async () => {
  const { env } = mk();
  for (const who of [U.mem, U.tre, U.view, U.out]) assert.equal((await link(env, who)).status, 403, who);
  assert.equal((await link(env, U.fin, 'bad id!')).status, 400); assert.equal((await link(env, U.fin, '../x')).status, 400);
  assert.equal((await call(Portal, 'onRequestPost', env, U.fin, { qs: '?campId=nope', body: { portalCampId: P } })).status, 404);
  for (const who of [U.fin, U.dir, U.admin]) assert.equal((await link(env, who)).status, 200, who);
  assert.equal((await J(await get(env, U.mem))).portalCampId, P);
  // 캠프 수정 화면으로 연결 ID 를 바꾸는 것도 같은 권한만
  assert.equal((await call(Camps, 'onRequestPatch', env, U.mem, { qs: '?kind=camp&id=camp-w27', body: { registrationCampId: 'zzz' } })).status, 403);
  assert.equal((await call(Camps, 'onRequestPatch', env, U.mem, { qs: '?kind=camp&id=camp-w27', body: { nameEn: '이름만 수정' } })).status, 200, '연결을 안 바꾸는 수정은 팀원도 가능');
  assert.equal((await link(env, U.dir, '')).status, 200); assert.equal((await J(await get(env, U.fin))).linked, false);
  const audits = env.DB.sqlite.prepare("SELECT detail FROM audit_log WHERE entity = 'camp' AND detail LIKE '포털 캠프 연결%'").all().map((r) => r.detail);
  assert.ok(audits.some((d) => d.includes(P)) && audits.some((d) => d.includes('해제')));
});

test('요약: 확정만 / 예약금 수납 이상 / 신청 전부 세 가지 숫자, 대기 명단은 따로', async () => {
  const { env, kv } = mk(); await link(env);
  const b = await J(await get(env, U.mem, '&deposit=50000')), S = b.scenarios;
  assert.equal(b.linked, true); assert.deepEqual(b.counts, { applications: 5, waitlist: 1, staff: 1 });
  assert.equal(S.min.heads, 1); assert.equal(S.min.income, 450000); assert.equal(S.min.received, 450000);
  assert.equal(S.expected.heads, 5); assert.equal(S.expected.income, 450000 + 500000 + 1500000);
  assert.equal(S.expected.paidInFull.heads, 1); assert.equal(S.expected.depositOnly.heads, 4); assert.equal(S.expected.depositOnly.regs, 2);
  assert.equal(S.expected.received, 450000 + 50000 + 150000, '단체는 신청에 예약금 기록이 없어서 1인 예약금 × 인원으로 계산');
  assert.equal(S.expected.depositOnly.balanceDue, (500000 - 50000) + (1500000 - 150000));
  assert.equal(S.max.heads, 6); assert.equal(S.max.income, 3000000); assert.equal(S.max.pending.heads, 1);
  assert.deepEqual(b.byStatus, { pending: { regs: 1, heads: 1 }, deposit: { regs: 2, heads: 4 }, confirmed: { regs: 1, heads: 1 }, waitlist: { regs: 1, heads: 1 } });
  assert.deepEqual(b.feeRows.expected.buckets, [{ unit: 500000, qty: 4 }, { unit: 450000, qty: 1 }]); assert.equal(b.feeRows.expected.fixed, 0);
  assert.deepEqual(b.feeRows.min.buckets, [{ unit: 450000, qty: 1 }]); assert.equal(b.feeRows.max.buckets.find((x) => x.unit === 550000).qty, 1);
  assert.equal(b.discounts.early_bird, 1 + 1 + 3); assert.equal(b.discounts.sibling, 1); assert.equal(b.payOnSite, 1);
  assert.deepEqual(b.gender, { male: 3, female: 2, unknown: 1 }, '단체의 이름 없는 1자리는 미입력'); assert.equal(b.grades['중3'], 2);
  assert.equal(kv.log.puts, 0, '읽기만 한다'); assert.ok(kv.log.lists >= 1);
  assert.equal(b.campers.some((c) => c.name === '다른캠프사람'), false, '다른 캠프 신청은 섞이지 않는다');
});

test('개인정보 두 단계: 팀원·월코 재정은 이름·학년·특이사항까지, 연락처·계좌는 디렉터·캠프 재정·관리자만 (조회 기록)', async () => {
  const { env } = mk(); await link(env);
  for (const who of [U.mem, U.tre]) {
    const text = JSON.stringify(await J(await get(env, who)));
    for (const secret of ['010-0000-0001', 'a@example.test', '000-000-000001', '가상은행', '가상예금주', '010-0000-0100', '가상보호자', '상담 비공개 메모', '가상목사', '010-0000-0070', '비공개 간증', 'g@example.test']) assert.equal(text.includes(secret), false, `${who} 에게 ${secret} 노출`);
    assert.ok(text.includes('가상캠퍼A') && text.includes('가상스태프G') && text.includes('상담자')); assert.equal(text.includes('견과류 알레르기'), false, '특이사항(건강·알레르기 등)은 개인정보 권한이 있는 사람만');
  }
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE entity = 'camp_portal'").get().n, 0, '일반 조회는 기록하지 않는다');
  for (const who of [U.fin, U.dir, U.admin]) {
    const b = await J(await get(env, who)), a = b.campers.find((c) => c.name === '가상캠퍼A');
    assert.equal(a.private.phone, '010-0000-0001'); assert.equal(a.private.notes, '견과류 알레르기'); assert.equal(a.private.refundAccount, '000-000-000001'); assert.equal(a.private.counselorMemo, '상담 비공개 메모');
    assert.equal(b.campers.find((c) => c.name === '가상학생D').private.parentInfo.includes('가상보호자'), true);
    assert.equal(b.staff.items[0].private.pastorContact, '010-0000-0070'); assert.equal(JSON.stringify(b).includes('비공개 간증'), false, '간증·이단 이력은 누구에게도 내려가지 않는다');
  }
  assert.equal(env.DB.sqlite.prepare("SELECT COUNT(*) AS n FROM audit_log WHERE entity = 'camp_portal' AND action = 'view'").get().n, 3);
});

test('스태프 지원 현황: 팀별 인원, 캠퍼 명단 순서(접수 순, 대기는 뒤)', async () => {
  const { env } = mk(); await link(env);
  const b = await J(await get(env, U.mem));
  assert.equal(b.staff.total, 1); assert.deepEqual(b.staff.byTeam, { 상담자: 1, 찬양: 1 }); assert.deepEqual(b.staff.items[0].teams, ['상담자', '찬양']);
  assert.deepEqual(b.campers.map((c) => c.name || '(미입력)'), ['가상캠퍼A', '가상캠퍼B', '가상캠퍼C', '가상학생D', '가상학생E', '(미입력)', '가상캠퍼F']);
  assert.equal(b.campers.at(-1).waitlist, true); assert.equal(b.campers.find((c) => c.unnamed).unnamed, 1);
});

test('계산 규칙: 상태 판정(예전 데이터 포함), 자리 수, 총 납입금 대체 계산, 예약금 기본값, 정수로 안 나누어지는 단체는 고정 금액', () => {
  assert.equal(statusOf({ status: 'confirmed' }), 'confirmed'); assert.equal(statusOf({ confirmed: true }), 'confirmed'); assert.equal(statusOf({ status: 'deposit' }), 'deposit'); assert.equal(statusOf({}), 'pending'); assert.equal(statusOf({ status: 'pending' }), 'pending');
  assert.equal(headsOf({ registrationType: 'staff' }), 0); assert.equal(headsOf({}), 1); assert.equal(headsOf({ registrationType: 'group', groupCount: 4 }), 4); assert.equal(headsOf({ registrationType: 'group', participants: [{ name: 'a' }, { name: ' ' }] }), 1);
  assert.equal(totalOf({ campFeeFinal: 0 }), 0); assert.equal(totalOf({ campFeeBase: 550000, scholarshipDiscountAmount: 100000 }), 450000); assert.equal(totalOf({}), null);
  assert.equal(depositOf({ depositAmount: 40000 }, 50000), 40000); assert.equal(depositOf({ registrationType: 'group', groupCount: 2 }, 50000), 100000); assert.equal(depositOf({}, 0), null);
  const s = summarize([{ regId: 'g', registrationType: 'group', groupCount: 3, campFeeFinal: 1000000, status: 'confirmed' }, { regId: 'n', registrationType: 'individual', status: 'confirmed' }], { includeCampers: false });
  assert.deepEqual(s.feeRows.min, { buckets: [], fixed: 1000000 }); assert.equal(s.scenarios.min.unknownFee, 1, '금액 정보가 없는 신청은 따로 센다'); assert.equal(s.scenarios.min.heads, 4);
});

test('포털 쪽 신청 정보가 없거나 읽을 수 없어도 화면이 깨지지 않는다 / 새 코드는 기존 저장소에 쓰지 않는다', async () => {
  const env = makeEnv(fakeD1()); await link(env);
  const b = await J(await get(env, U.mem)); assert.equal(b.linked, true); assert.equal(b.unavailable, true, 'CAMP_KV 가 없는 환경');
  const broken = makeEnv(fakeD1(), { CAMP_KV: { async list() { throw new Error('KV down'); }, async get() { return null; } } }); await link(broken);
  assert.equal((await J(await get(broken, U.mem))).unavailable, true);
  const empty = makeEnv(fakeD1(), { CAMP_KV: { async list() { return { keys: [], list_complete: true }; }, async get() { return null; } } }); await link(empty);
  const e = await J(await get(empty, U.mem)); assert.equal(e.counts.applications, 0); assert.equal(e.scenarios.max.heads, 0);
});
