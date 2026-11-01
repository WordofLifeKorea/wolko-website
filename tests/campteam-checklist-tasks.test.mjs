import assert from 'node:assert/strict';
import test from 'node:test';
import * as C from '../functions/api/campteam/checklist-tasks.js';
import * as Tasks from '../functions/api/campteam/tasks.js';
import { fakeD1, makeEnv, req, U } from './helpers/campteam-fakes.mjs';

const post = async (env, who, body) => C.onRequestPost({ env, request: await req(who, { method: 'POST', url: 'http://localhost/api/campteam/checklist-tasks', body }) });
const LIST = '☐ 장소 답사 예약\n☐ 강사 섭외 확정\n☐ 보험 가입\n☐ 간식 주문\n';

test('체크리스트처럼 보이는 글만 알아본다 (일반 문장은 아니다)', async () => {
  const env = makeEnv(fakeD1());
  const a = await (await post(env, U.mem, { preview: true, text: LIST })).json(); assert.equal(a.looks, true); assert.equal(a.itemCount, 4);
  const b = await (await post(env, U.mem, { preview: true, text: '올해 캠프는 여름에 열립니다.\n장소는 아직 정해지지 않았고 강사도 미정입니다.\n자세한 내용은 추후 안내합니다.\n감사합니다.' })).json(); assert.equal(b.looks, false);
  const c = await (await post(env, U.mem, { preview: true, text: '☐ a\n☐ b' })).json(); assert.equal(c.looks, false, '3개 미만은 묻지 않는다');
});

test('업무로 추가: 담당자·기한은 비워 두고, 같은 이름은 건너뛰고, 권한을 지킨다', async () => {
  const env = makeEnv(fakeD1());
  const camp = (await env.DB.prepare('SELECT id FROM camps WHERE deletedAt IS NULL LIMIT 1').first()).id;
  const pv = await (await post(env, U.mem, { preview: true, text: LIST })).json();
  const r = await post(env, U.mem, { campId: camp, items: pv.items }); assert.equal(r.status, 201); assert.equal((await r.json()).created, 4);
  const again = await (await post(env, U.mem, { campId: camp, items: pv.items })).json(); assert.equal(again.created, 0); assert.equal(again.skipped, 4);
  const row = await env.DB.prepare("SELECT ownerName, dueDate, status FROM tasks WHERE title = '보험 가입' AND campId = ?1").bind(camp).first();
  assert.deepEqual({ ...row }, { ownerName: '', dueDate: null, status: 'Not Started' });
  assert.equal((await post(env, U.view, { preview: true, text: LIST })).status, 403);
  assert.equal((await post(env, U.mem, { campId: 'nope', items: pv.items })).status, 400);
  assert.equal((await post(env, U.mem, { items: [] })).status, 400);
});
