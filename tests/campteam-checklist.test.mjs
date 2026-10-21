import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';
import * as ImportTpl from '../functions/api/campteam/import-template.js';
import * as Apply from '../functions/api/campteam/apply-template.js';
import * as Templates from '../functions/api/campteam/templates.js';
import * as Tasks from '../functions/api/campteam/tasks.js';
import { parseChecklistText, parsePriority, suggestOffset } from '../functions/lib/campteamChecklist.js';
import { fakeD1, makeEnv, req, U, root } from './helpers/campteam-fakes.mjs';

const SAMPLE = [
  'OK\tTask\tOwner\tDue Date\tPriority', '1. Planning and Operations', '☐\tSet the camp theme\tAll Together\t\t1 REQUIRED',
  '☐\tConfirm speakers\tLeader B (communication) / Leader C (scheduling)\t\t1 REQUIRED', '2. Recruitment and Promotion',
  '☐\tProduce a promo video\tMedia Team\t\t2 IMPORTANT', '☐\tPrepare extra supplies\t\t\t3 GENERAL', '3. Program Team',
  '☐\tCreate the rules slides\tTBD – Program Team\t\t', 'OK\tTask\tOwner\tDue Date\tPriority', '☐\tPrepare music\t\t\t',
].join('\n');

test('우선순위와 임시 기준일 추정', () => {
  assert.equal(parsePriority('1 REQUIRED').priority, 'High'); assert.equal(parsePriority('2 IMPORTANT').priority, 'Medium'); assert.equal(parsePriority('3 GENERAL').priority, 'Low');
  assert.equal(parsePriority('필수').priority, 'High'); assert.deepEqual(parsePriority(''), { priority: 'Medium', known: false });
  assert.equal(suggestOffset('Post-Camp'), 14); assert.equal(suggestOffset('1. Planning and Operations'), -90); assert.equal(suggestOffset('Whatever'), null);
});

test('표 붙여넣기: 구역·항목·담당(제안)·우선순위를 읽고, 머리글 반복 줄은 건너뛴다', () => {
  const r = parseChecklistText(SAMPLE);
  assert.deepEqual(r.sections.map(s => [s.name, s.items.length]), [['1. Planning and Operations', 2], ['2. Recruitment and Promotion', 2], ['3. Program Team', 2]]);
  assert.equal(r.itemCount, 6);
  assert.equal(r.sections[0].items[1].ownerSuggestion, 'Leader B (communication) / Leader C (scheduling)');
  assert.equal(r.sections[1].items[1].ownerSuggestion, '', '담당이 비어 있으면 비워 둔다'); assert.equal(r.sections[1].items[1].priority, 'Low');
  assert.equal(r.sections[2].items[0].ownerSuggestion, 'Program Team', 'TBD – 팀 이름은 제안으로만');
  assert.equal(r.sections[2].items[1].priorityKnown, false);
});

test('단순 목록 붙여넣기도 읽는다', () => {
  const r = parseChecklistText('1. Before camp\n☐ Book venue\n- Order shirts\n2. After camp\n• Send survey');
  assert.deepEqual(r.sections.map(s => [s.name, s.items.map(i => i.title)]), [['1. Before camp', ['Book venue', 'Order shirts']], ['2. After camp', ['Send survey']]]);
});

test('가져오기 API: 미리보기는 저장하지 않고, 저장하면 템플릿 → 캠프 적용까지 이어진다(구역 유지, 담당은 제안만)', async () => {
  const env = makeEnv(fakeD1());
  const call = async (mod, who, body, fn = 'onRequestPost', qs = '') => mod[fn]({ env, request: await req(who, { method: fn === 'onRequestGet' ? 'GET' : 'POST', body, url: 'http://localhost:8788/api/campteam/x' + qs }) });
  assert.equal((await call(ImportTpl, U.view, { text: SAMPLE, nameKo: 'x' })).status, 403);
  assert.equal((await call(ImportTpl, U.mem, { text: '   ', nameKo: 'x' })).status, 400);
  const tplCount = () => env.DB.sqlite.prepare('SELECT COUNT(*) n FROM checklist_templates').get().n, before = tplCount();
  const pv = await (await call(ImportTpl, U.mem, { text: SAMPLE, preview: true, suggestOffsets: true })).json();
  assert.equal(pv.summary.itemCount, 6); assert.equal(pv.summary.withOffset, 6, '구역 이름으로 추정된 임시 기준일'); assert.equal(tplCount(), before, '미리보기는 저장하지 않는다');
  assert.equal((await call(ImportTpl, U.mem, { text: SAMPLE, nameKo: '' })).status, 400);
  const saved = await (await call(ImportTpl, U.mem, { text: SAMPLE, nameKo: '가져온 템플릿', suggestOffsets: true })).json();
  const items = env.DB.sqlite.prepare('SELECT * FROM checklist_items WHERE templateId=? ORDER BY sortOrder').all(saved.id);
  assert.equal(items.length, 6); assert.equal(items[0].section, '1. Planning and Operations'); assert.equal(items[0].offsetDays, -90); assert.equal(items[0].provisional, 1); assert.equal(items[0].priority, 'High');
  assert.equal(items[5].offsetDays, -14, '"Program Team" → team 규칙');
  const list = await (await call(Templates, U.view, null, 'onRequestGet')).json();
  assert.ok(list.templates.find(t => t.id === saved.id).items.every(i => 'section' in i && 'provisional' in i));
  const ap = await (await call(Apply, U.mem, { campId: 'camp-w27', templateId: saved.id })).json();
  assert.equal(ap.created, 6);
  const t = env.DB.sqlite.prepare("SELECT title, section, ownerName, ownerSuggestion, dueDate FROM tasks WHERE sourceKey LIKE ? ORDER BY title").all(`tpl:${saved.id}:%`);
  assert.ok(t.every(x => x.ownerName === '') && t.every(x => x.section), '담당자는 비어 있고 구역은 따라온다');
  assert.equal(t.find(x => x.title === 'Set the camp theme').dueDate, '2026-10-16', '2027-01-14 의 90일 전');
  const listed = await (await Tasks.onRequestGet({ env, request: await req(U.view, { url: 'http://localhost/api/campteam/tasks?q=camp theme' }) })).json();
  assert.ok(listed.items.some(i => i.section));
});

const L = (f) => root + 'camp-team/samples-local/' + f;
test('실제 체크리스트 문서(로컬 전용 파일이 있을 때만): 구역과 항목 수', { skip: !existsSync(L('WOLKO_Camp_Checklist_A3.tsv')) }, () => {
  const w = parseChecklistText(readFileSync(L('WOLKO_Camp_Checklist_A3.tsv'), 'utf8'));
  assert.ok(w.sections.length === 18 && w.itemCount >= 110, `sections=${w.sections.length} items=${w.itemCount}`);
  assert.ok(w.sections.every(s => s.items.length > 0));
  const known = w.sections.flatMap(s => s.items).filter(i => i.priorityKnown).length; assert.ok(known / w.itemCount > 0.95, '대부분 우선순위를 읽는다');
  const u = parseChecklistText(readFileSync(L('Unity_Camp_Checklist_A3.tsv'), 'utf8'));
  assert.ok(u.sections.length >= 12 && u.itemCount >= 60, `unity sections=${u.sections.length} items=${u.itemCount}`);
});
