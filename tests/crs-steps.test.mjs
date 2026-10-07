import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../src/pages/crs/index.astro', import.meta.url), 'utf8');
const arr = name => JSON.parse(src.slice(src.indexOf(`const ${name} = [`) + `const ${name} = `.length, src.indexOf('];', src.indexOf(`const ${name} = [`)) + 1).replace(/\\u201c|\\u201d/g, '\\"'));
const STEPS = arr('STEPS'), STEPS_KO = arr('STEPS_KO');
const block = src.slice(src.indexOf('  const OLD_STEPS = ['), src.indexOf('  // ── 지역 데이터 ──'));
const migrate = new Function('STEPS', `${block}; return migrateChurchSteps;`)(STEPS);

test('관계 단계: 12단계, 영어/한글 개수가 같고 요청한 순서와 이름이다', () => {
  assert.equal(STEPS.length, 12);
  assert.equal(STEPS_KO.length, 12);
  assert.deepEqual(STEPS.slice(0, 5).map(s => s.replace(/[“”]/g, '"')), [
    'Called pastor or talked to pastor', 'Visited pastor', 'Gave pastor ministry presentation', 'Gave pastor "God Ask" support presentation', 'Gave gift / thank you',
  ]);
  assert.ok(STEPS.includes('Gospel Conversation Training'));
  assert.ok(STEPS.includes('Church uses WOLKO curriculum'));
  assert.ok(!STEPS.some(s => /G\.O\.S\.P\.E\.L|Q\.T\.|WOLKO Day|Training church youth/.test(s)), '통합된 예전 단계는 없다');
  assert.ok(STEPS_KO.includes('교회의 WOLKO 커리큘럼 사용'));
});

test('예전 기록 옮기기: 1→2·3, 2·5→6(합침), 6·7→9(합침), 나머지는 번호 이동. 두 번 돌려도 그대로', () => {
  const e = d => ({ date: d, person: 'p' });
  const church = {
    steps: { 1: [e('2026-01-01')], 2: [e('2026-02-01')], 3: [e('2026-03-01')], 4: [e('2026-04-01')], 5: [e('2026-05-01')], 6: true, 7: [e('2026-07-01')], 8: [e('2026-08-01')], 9: [e('2026-09-01')], 10: [e('2026-10-01')] },
    visits: { a: { purpose: 'Step 1: Meet pastor & give presentation' }, b: { purpose: 'Step 5: Training church youth for gospel training' }, c: { purpose: 'Step 7: Church uses Q.T. curriculum' }, d: { purpose: 'free text' } },
  };
  migrate(church);
  const dates = n => church.steps[n].map(x => x.date || 'legacy');
  assert.deepEqual(dates(2), ['2026-01-01']);
  assert.deepEqual(dates(3), ['2026-01-01']);
  assert.equal(church.steps[1], undefined); assert.equal(church.steps[4], undefined); assert.equal(church.steps[5], undefined);
  assert.deepEqual(dates(6), ['2026-02-01', '2026-05-01']);            // 복음 대화 훈련 = 예전 2 + 5
  assert.deepEqual(dates(7), ['2026-03-01']);
  assert.deepEqual(dates(8), ['2026-04-01']);
  assert.deepEqual(dates(9), ['legacy', '2026-07-01']);                // WOLKO 커리큘럼 = 예전 6(예전 체크 기록) + 7
  assert.deepEqual([dates(10), dates(11), dates(12)], [['2026-08-01'], ['2026-09-01'], ['2026-10-01']]);
  assert.equal(church.stepsVersion, 2);
  assert.equal(church.visits.a.purpose, 'Step 2: Visited pastor');
  assert.equal(church.visits.b.purpose, 'Step 6: Gospel Conversation Training');
  assert.equal(church.visits.c.purpose, 'Step 9: Church uses WOLKO curriculum');
  assert.equal(church.visits.d.purpose, 'free text');
  const again = JSON.stringify(church); migrate(church);
  assert.equal(JSON.stringify(church), again, '두 번째 실행은 아무것도 바꾸지 않는다');
});

test('빈 기록 · 배열로 읽힌 steps(Firebase) 도 안전하게 옮긴다', () => {
  const church = { steps: [null, [{ date: 'd', person: 'p' }], null, [], undefined, [{ date: 'x', person: 'y' }]] };
  migrate(church);
  assert.deepEqual(Object.keys(church.steps).sort(), ['2', '3', '6']);
});

test('저장할 때 새 형식 표시(stepsVersion)를 함께 남기고, 새 교회도 새 형식으로 시작한다', () => {
  assert.match(src, /update\(ref\(db, `churches\/\$\{church\.id\}`\), \{ steps, stepsVersion: STEPS_VERSION, updatedAt \}\)/);
  assert.match(src, /data\.steps = \{\};\s*data\.stepsVersion = STEPS_VERSION;/);
  assert.match(src, /migrateChurchSteps\(\{ id, \.\.\.val \}\)/);
});

test('교회 카드는 위쪽(이름·담임·단계)만 접어 두고, 선택(활성)된 카드만 펼친다', () => {
  assert.match(src, /\.church-card:not\(\.selected\) \.church-card-body \{ display:none; \}/);
  assert.match(src, /selectedCard\?\.classList\.add\('selected'\)/);
  assert.match(src, /selectedCard\?\.scrollIntoView\(\{ block: 'nearest' \}\)/);
});

test('교회 목록은 번호 순으로 정렬되고, 번호 뱃지는 정원이다', () => {
  assert.match(src, /\.sort\(\(a, b\) => \(a\.number \|\| Infinity\) - \(b\.number \|\| Infinity\)/);
  assert.match(src, /:root:root \.rank-badge \{ width:24px; height:24px; min-width:24px; min-height:0; padding:0;[^}]*aspect-ratio:1 \/ 1; border-radius:50%;/);
});
