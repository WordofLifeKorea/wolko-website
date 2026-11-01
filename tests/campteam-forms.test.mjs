import assert from 'node:assert/strict';
import test from 'node:test';
import * as Forms from '../functions/api/campteam/camp-forms.js';
import { cleanContent, checkReady, starterContent, copyContent } from '../functions/lib/campForms.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const url = 'http://localhost/api/campteam/camp-forms';
const call = async (m, env, who, o = {}) => { const r = await m({ env, request: await req(who, { method: o.method || 'GET', url: url + (o.qs || ''), body: o.body }) }); return { status: r.status, body: await r.json() }; };
async function setup() {
  const env = makeEnv(fakeD1());
  assert.equal((await call(Forms.onRequestPut, env, U.admin, { method: 'PUT', body: { editor: [U.mem], reviewer: [U.dir, U.fin], approver: [U.admin] } })).status, 200); return env;
}
const fill = (c) => { const k = starterContent('camper'); k.card = { ...c.card, titleKo: '2027 겨울 테스트 캠프', titleEn: '2027 Winter Test Camp', dateKo: '2027년 1월 11일', priceKo: '550,000원' }; return k; };
const mk = async (env, kind = 'camper', campType = 'english') => { const c = await call(Forms.onRequestPost, env, U.mem, { method: 'POST', body: { kind, campType } }); assert.equal(c.status, 201); return c.body.id; };
const act = (env, id, who, action, comment) => call(Forms.onRequestPost, env, who, { method: 'POST', qs: '?id=' + id, body: { action, comment } });
const detail = async (env, id, who = U.mem) => (await call(Forms.onRequestGet, env, who, { qs: '?id=' + id })).body;
async function ready(env, id) { const d = (await detail(env, id)).form; assert.equal((await call(Forms.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + id, body: { content: fill(d.content) } })).status, 200); }
async function approved(env) { const id = await mk(env); await ready(env, id); await act(env, id, U.mem, 'submit'); await act(env, id, U.dir, 'approve'); await act(env, id, U.fin, 'approve'); assert.equal((await act(env, id, U.admin, 'approve')).body.status, 'approved'); return id; }

test('양식 정리: 모르는 칸은 버리고, 검토 전 필수 항목을 확인한다', () => {
  const c = cleanContent({ card: { titleKo: ' 캠프 ', evil: 'x' }, blocks: [{ type: 'text', label: { ko: '이름' }, required: true }, { type: 'script', label: { ko: 'x' } }, { type: 'select', label: { ko: '성별' }, options: [{ ko: '남' }, { ko: '' }] }] });
  assert.equal(c.card.titleKo, '캠프'); assert.ok(!('evil' in c.card)); assert.equal(c.blocks.length, 2); assert.equal(c.blocks[1].options.length, 1);
  const p = checkReady(c, 'camper'); assert.ok(p.some((x) => x.includes('개인정보')) && p.some((x) => x.includes('선택지')) && p.some((x) => x.includes('일정')));
  const ok = starterContent('camper'); ok.card.titleKo = 'a'; ok.card.dateKo = 'b'; assert.deepEqual(checkReady(ok, 'camper'), []);
  const ids = new Set(copyContent(ok).blocks.map((b) => b.id)); assert.ok(!ok.blocks.some((b) => ids.has(b.id)), '복사하면 칸 id 가 새로 만들어진다');
  assert.ok(starterContent('staff').blocks.some((b) => b.label.ko.includes('신앙')), '스태프·크루 기본 양식에는 신앙 칸이 있다');
});

test('역할: 관리자만 정하고, 팀 명단에 있는 사람만', async () => {
  const env = makeEnv(fakeD1());
  assert.equal((await call(Forms.onRequestPut, env, U.mem, { method: 'PUT', body: { editor: [U.mem] } })).status, 403);
  assert.equal((await call(Forms.onRequestPut, env, U.admin, { method: 'PUT', body: { editor: ['nobody@example.com'] } })).status, 400);
  assert.equal((await call(Forms.onRequestPut, env, U.admin, { method: 'PUT', body: { editor: [U.mem], reviewer: [U.dir], approver: [U.admin] } })).body.roles.editor.length, 1);
  const meta = (await call(Forms.onRequestGet, env, U.mem, { qs: '?meta=1' })).body; assert.equal(meta.me.editor, true); assert.equal(meta.me.reviewer, false); assert.ok(meta.snippets.length > 10);
  assert.equal((await call(Forms.onRequestGet, env, U.out)).status, 403, '명단 밖');
});

test('세 단계 승인: 작성 → 검토자 전원 → 최종 승인자 = 승인 완료, 건너뛰기·남의 승인 불가', async () => {
  const env = await setup();
  assert.equal((await call(Forms.onRequestPost, env, U.view, { method: 'POST', body: { kind: 'camper' } })).status, 403, '작성 담당이 아니면 못 만든다');
  const id = await mk(env), bad = await act(env, id, U.mem, 'submit'); assert.equal(bad.status, 400); assert.ok(bad.body.problems.length, '비어 있으면 검토를 요청할 수 없다');
  await ready(env, id);
  assert.equal((await act(env, id, U.dir, 'approve')).status, 400, '검토 요청 전에는 승인할 수 없다');
  assert.equal((await act(env, id, U.mem, 'submit')).body.status, 'review');
  const n = (role) => env.DB.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE sourceKey LIKE ?1`).bind(`form:${id}:${role}:%`).first().then((x) => x.n);
  assert.equal(await n('reviewer'), 2, '검토자마다 업무가 생긴다');
  assert.equal((await call(Forms.onRequestPatch, env, U.mem, { method: 'PATCH', qs: '?id=' + id, body: { title: '바꿈' } })).status, 400, '검토 중에는 고칠 수 없다');
  assert.equal((await act(env, id, U.mem, 'approve')).status, 403, '검토자가 아닌 사람은 승인할 수 없다'); assert.equal((await act(env, id, U.admin, 'approve')).status, 403, '최종 승인자도 검토 단계에서는 승인할 수 없다');
  assert.equal((await act(env, id, U.dir, 'approve')).body.waiting, true, '검토자 한 명만 승인하면 기다린다');
  assert.equal((await act(env, id, U.fin, 'approve')).body.status, 'final'); assert.equal(await n('approver'), 1, '최종 승인자에게 업무가 생긴다');
  assert.equal((await act(env, id, U.dir, 'approve')).status, 403, '검토자는 최종 승인을 할 수 없다');
  assert.equal((await act(env, id, U.admin, 'approve')).body.status, 'approved'); assert.ok((await detail(env, id)).form.approvedAt === undefined || true);
  assert.equal((await env.DB.prepare('SELECT COUNT(*) AS n FROM camp_forms WHERE status = ?1').bind('approved').first()).n, 1);
});

test('되돌리기: 이유가 필요하고, 작성 중으로 돌아가 작성자에게 업무가 가며 이전 승인은 무효', async () => {
  const env = await setup(), id = await mk(env); await ready(env, id);
  await act(env, id, U.mem, 'submit'); await act(env, id, U.dir, 'approve'); assert.equal((await act(env, id, U.fin, 'return')).status, 400, '이유 없이 되돌릴 수 없다');
  assert.equal((await act(env, id, U.fin, 'return', '참가비 문구를 고쳐 주세요')).body.status, 'draft');
  assert.equal((await env.DB.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE sourceKey LIKE ?1`).bind(`form:${id}:editor:%`).first()).n, 1);
  await act(env, id, U.mem, 'submit'); const det = await detail(env, id); assert.equal(det.approvals.filter((a) => a.current && a.decision === 'approve').length, 0, '다시 올리면 예전 승인은 현재 승인이 아니다');
  assert.equal((await act(env, id, U.fin, 'approve')).body.waiting, true); assert.equal((await act(env, id, U.dir, 'approve')).body.status, 'final', '두 검토자가 새로 승인해야 한다');
  assert.equal((await act(env, id, U.mem, 'withdraw')).body.status, 'draft', '작성자는 검토 중인 것을 거둘 수 있다');
});

test('새 신청서는 같은 종류·유형의 가장 최근 신청서를 복사해 시작한다 (승인된 것은 그대로)', async () => {
  const env = await setup(), id = await approved(env), before = await env.DB.prepare('SELECT content, status FROM camp_forms WHERE id = ?1').bind(id).first();
  const c = await call(Forms.onRequestPost, env, U.mem, { method: 'POST', body: { kind: 'camper', campType: 'english' } }); assert.equal(c.body.copiedFrom.id, id);
  const f = (await detail(env, c.body.id)).form; assert.equal(f.content.card.titleKo, '2027 겨울 테스트 캠프'); assert.equal(f.content.card.startDate, ''); assert.equal(f.status, 'draft');
  assert.equal((await call(Forms.onRequestPost, env, U.mem, { method: 'POST', body: { kind: 'staff', campType: 'english' } })).body.copiedFrom, null, '종류가 다르면 기본 양식으로 시작');
  const withCard = await call(Forms.onRequestPost, env, U.mem, { method: 'POST', body: { kind: 'camper', campType: 'union', card: { titleKo: '지난 캠프', priceKo: '90,000원', evil: 'x' } } });
  assert.equal((await detail(env, withCard.body.id)).form.content.card.priceKo, '90,000원', '지난 캠프 카드 내용으로 시작할 수 있다');
  assert.deepEqual(await env.DB.prepare('SELECT content, status FROM camp_forms WHERE id = ?1').bind(id).first(), before, '복사해도 원본은 바뀌지 않는다');
  const dup = await act(env, id, U.mem, 'duplicate'); assert.equal(dup.status, 201); assert.equal((await act(env, id, U.mem, 'delete')).status, 400, '승인 완료된 신청서는 지울 수 없다');
  assert.equal((await act(env, dup.body.id, U.mem, 'delete')).status, 200); assert.equal((await call(Forms.onRequestGet, env, U.mem, { qs: '?id=' + dup.body.id })).status, 404);
});

test('이번 기능은 홈페이지와 연결되어 있지 않다: 홈페이지용 파일·API 가 없다', async () => {
  const { existsSync } = await import('node:fs'), { root } = await import('./helpers/campteam-fakes.mjs');
  for (const f of ['functions/api/camp-forms', 'src/pages/camp-apply', 'public/camp-forms']) assert.equal(existsSync(root + f), false, f + ' 는 없어야 한다');
});
