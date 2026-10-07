import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/pages/crs/index.astro', import.meta.url), 'utf8');
const arr = name => JSON.parse(src.slice(src.indexOf(`const ${name} = [`) + `const ${name} = `.length, src.indexOf('];', src.indexOf(`const ${name} = [`)) + 1).replace(/\\u201c|\\u201d/g, '\\"'));
const STEPS = arr('STEPS'), STEPS_KO = arr('STEPS_KO');
const block = src.slice(src.indexOf('  const V1_STEPS = ['), src.indexOf('  // ── 지역 데이터 ──'));
const migrate = new Function('STEPS', `${block}; return migrateChurchSteps;`)(STEPS);
const norm = s => s.replace(/[\u201c\u201d]/g, '"');

test('관계 단계: 12단계, 영어/한글 개수가 같고 요청한 순서다 (God Ask · 선물 단계는 선교사 설교 뒤)', () => {
  assert.equal(STEPS.length, 12);
  assert.equal(STEPS_KO.length, 12);
  assert.deepEqual(STEPS.map(norm), [
    'Called pastor or talked to pastor', 'Visited pastor', 'Gave pastor ministry presentation', 'Gospel Conversation Training',
    'Youth participate in camp or event', 'Core Training', 'Church uses WOLKO curriculum', 'WOLKO Missionary speaks at church service',
    'Gave pastor "God Ask" support presentation', 'Gave gift / thank you', 'Church supports WOLKO', 'Pastor introduces WOLKO to other churches',
  ]);
  assert.ok(STEPS_KO[8].includes('God Ask') && STEPS_KO[9].includes('감사'));
});

test('단계 목록은 세로로 채운다: 왼쪽 1~6, 오른쪽 7~12 (좁은 화면은 한 줄)', () => {
  assert.match(src, /grid-auto-flow:column; grid-template-rows:repeat\(var\(--step-rows, 6\), max-content\)/);
  assert.match(src, /style="--step-rows:\$\{Math\.ceil\(stepsArr\.length \/ 2\)\}"/);
  assert.match(src, /\.steps-list \{ grid-template-columns:1fr; grid-auto-flow:row; grid-template-rows:none; \}/);
});

test('처음 10단계 기록 → 지금 12단계로 한 번에 옮긴다 (두 번 돌려도 그대로)', () => {
  const e = d => ({ date: d, person: 'p' });
  const church = {
    steps: { 1: [e('01')], 2: [e('02')], 3: [e('03')], 4: [e('04')], 5: [e('05')], 6: true, 7: [e('07')], 8: [e('08')], 9: [e('09')], 10: [e('10')] },
    visits: { a: { purpose: 'Step 1: Meet pastor & give presentation' }, b: { purpose: 'Step 5: Training church youth for gospel training' }, c: { purpose: 'free text' } },
  };
  migrate(church);
  const dates = n => (church.steps[n] || []).map(x => x.date || 'legacy');
  assert.deepEqual(dates(2), ['01']); assert.deepEqual(dates(3), ['01']);       // 예전 1단계 → 방문 · 사역 소개
  assert.deepEqual(dates(4), ['02', '05']);                                        // 복음 대화 훈련 = 예전 2 + 5
  assert.deepEqual(dates(5), ['03']); assert.deepEqual(dates(6), ['04']);
  assert.deepEqual(dates(7), ['legacy', '07']);                                    // WOLKO 커리큘럼 = 예전 6 + 7
  assert.deepEqual([dates(8), dates(11), dates(12)], [['08'], ['09'], ['10']]);
  assert.deepEqual([dates(9), dates(10), dates(1)], [[], [], []]);                 // God Ask · 선물 · 전화 는 예전 기록이 없다
  assert.equal(church.stepsVersion, 3);
  assert.equal(church.visits.a.purpose, 'Step 2: Visited pastor');
  assert.equal(church.visits.b.purpose, 'Step 4: Gospel Conversation Training');
  assert.equal(church.visits.c.purpose, 'free text');
  const again = JSON.stringify(church); migrate(church);
  assert.equal(JSON.stringify(church), again);
});

test('이미 12단계(v2)로 저장된 기록도 새 순서(v3)로 옮긴다: 4·5 → 9·10, 6~10 → 4~8', () => {
  const e = d => ({ date: d, person: 'p' });
  const church = {
    stepsVersion: 2,
    steps: { 1: [e('a')], 2: [e('b')], 3: [e('c')], 4: [e('god')], 5: [e('gift')], 6: [e('gos')], 7: [e('camp')], 8: [e('core')], 9: [e('cur')], 10: [e('spk')], 11: [e('sup')], 12: [e('intro')] },
    visits: { x: { purpose: 'Step 4: Gave pastor \u201cGod Ask\u201d support presentation' }, y: { purpose: 'Step 6: Gospel Conversation Training' }, z: { purpose: 'Step 1: Meet pastor & give presentation' } },
  };
  migrate(church);
  const d = n => church.steps[n].map(x => x.date).join(',');
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(d), ['a', 'b', 'c', 'gos', 'camp', 'core', 'cur', 'spk', 'god', 'gift', 'sup', 'intro']);
  assert.equal(norm(church.visits.x.purpose), 'Step 9: Gave pastor "God Ask" support presentation');
  assert.equal(church.visits.y.purpose, 'Step 4: Gospel Conversation Training');
  assert.equal(church.visits.z.purpose, 'Step 2: Visited pastor');   // v2 때 남은 예전(v1) 문장도 한 번에 옮긴다
});

test('빈 기록 · 배열로 읽힌 steps(Firebase) 도 안전하게 옮긴다', () => {
  const church = { steps: [null, [{ date: 'd', person: 'p' }], null, [], undefined, [{ date: 'x', person: 'y' }]] };
  migrate(church);
  assert.deepEqual(Object.keys(church.steps).sort(), ['2', '3', '4']);
});

test('저장할 때 새 형식 표시(stepsVersion)를 함께 남기고, 새 교회도 새 형식으로 시작한다', () => {
  assert.match(src, /update\(ref\(db, `churches\/\$\{church\.id\}`\), \{ steps, stepsVersion: STEPS_VERSION, updatedAt \}\)/);
  assert.match(src, /data\.steps = \{\};\s*data\.stepsVersion = STEPS_VERSION;/);
  assert.match(src, /migrateChurchSteps\(\{ id, \.\.\.val \}\)/);
});

test('교회 카드는 위쪽(이름·담임·단계)만 접어 두고, 선택(활성)된 카드만 펼친다', () => {
  assert.match(src, /\.church-card:not\(\.selected\) \.church-card-body > :not\(\.step-bar-wrap\) \{ display:none; \}/);   // 접힌 카드에도 진행 막대는 남는다
  assert.match(src, /selectedCard\?\.classList\.add\('selected'\)/);
  assert.match(src, /selectedCard\?\.scrollIntoView\(\{ block: 'nearest' \}\)/);
});

test('교회 목록은 번호 순으로 정렬되고, 번호 뱃지는 정원이다', () => {
  assert.match(src, /\.sort\(\(a, b\) => \(a\.number \|\| Infinity\) - \(b\.number \|\| Infinity\)/);
  assert.match(src, /:root:root \.rank-badge \{ width:24px; height:24px; min-width:24px; min-height:0; padding:0;[^}]*aspect-ratio:1 \/ 1; border-radius:50%;/);
});
