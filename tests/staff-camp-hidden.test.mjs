import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const read = p => readFileSync(root + p, 'utf8');

test('캠프 스태프 지원 목록에서 제주 캠퍼스데이와 모멘텀 캠프는 표시하지 않는다', () => {
  for (const id of ['2026-jeju-campus-day', '2026-jeju-momentum-1', '2026-jeju-momentum-2']) {
    assert.equal(JSON.parse(read(`src/content/camp_schedules/${id}.json`)).staff_application_hidden, true, id);
  }
  // 다른 캠프는 그대로 지원 목록에 나온다
  for (const id of ['2026-jeju-english', '2026-inland-english-junior', '2026-inland-union']) {
    assert.notEqual(JSON.parse(read(`src/content/camp_schedules/${id}.json`)).staff_application_hidden, true, id);
  }
  assert.match(read('src/content/config.ts'), /staff_application_hidden: z\.boolean\(\)\.optional\(\)/);
  assert.match(read('src/pages/camp-register/index.astro'), /\.filter\(\(s\) => !s\.data\.staff_application_hidden\)\.map/);
});

test('우리학교 캠프는 공개 캠프 카드에서는 숨기고, 스태프 지원 체크박스 목록에는 그대로 둔다', () => {
  assert.equal(JSON.parse(read('src/content/camp_schedules/2027-our-school-winter.json')).public_card_hidden, true);
  assert.notEqual(JSON.parse(read('src/content/camp_schedules/2027-our-school-winter.json')).staff_application_hidden, true);
  assert.match(read('src/content/config.ts'), /public_card_hidden: z\.boolean\(\)\.optional\(\)/);
  assert.match(read('src/pages/camp/index.astro'), /\.filter\(s => !s\.data\.public_card_hidden\)/);
  const reg = read('src/pages/camp-register/index.astro');
  assert.match(reg, /const schedules = visibleAll\.filter\(s => !s\.data\.public_card_hidden\)/);
  assert.match(reg, /\{\[\.\.\.staffInland, \.\.\.staffJeju\]\.filter\(\(s\) => !s\.data\.staff_application_hidden\)/);
});

test('시흥중앙성결교회 초등영어캠프는 스태프 선택지에만 표시한다', () => {
  const id = '2027-siheung-jungang-elementary-english';
  const camp = JSON.parse(read(`src/content/camp_schedules/${id}.json`));
  assert.equal(camp.title_ko, '시흥중앙성결교회 초등영어캠프');
  assert.equal(camp.start_date, '2027-01-19T00:00:00.000Z');
  assert.match(camp.date_ko, /1월 19일\(화\).*22일\(금\)/);
  assert.equal(camp.public_card_hidden, true);
  assert.notEqual(camp.staff_application_hidden, true);
  const reg = read('src/pages/camp-register/index.astro');
  assert.match(reg, /data-group=\{\['2027-siheung-jungang-elementary-english', '2027-our-school-winter'\]\.includes\(s\.id\) \? 'partner'/);
  assert.match(reg, /partner: \['교회 및 학교 캠프'/);
});

test('스태프 지원서: 섹션마다 옅은 배경, 한 줄 입력칸은 아래 선만, 서술형(textarea)만 박스', () => {
  const reg = read('src/pages/camp-register/index.astro');
  assert.match(reg, /#staffForm \.crp-form-grid \{ background: #f6f9fb; border-radius: 14px;/);
  assert.match(reg, /#staffForm \.crp-field select\s*\{\s*border: 0; border-bottom: 1\.5px solid #d3e0e7;/);
  assert.match(reg, /#staffForm \.crp-field textarea \{ background: #fff; \}/);
});

test('스태프 지원서 첫 섹션: 이름 | 성별 / 생년월일 전체 / 전화번호 | 이메일, 칸은 열 폭을 채운다', () => {
  const reg = read('src/pages/camp-register/index.astro');
  assert.match(reg, /#staffForm \.crp-form-grid \{ display: grid; grid-template-columns: repeat\(2, minmax\(0, 1fr\)\); \}/);
  assert.match(reg, /#staffForm \.crp-form-grid > \.crp-field--full \{ grid-column: 1 \/ -1; \}/);
  assert.match(reg, /width: 100% !important; field-sizing: fixed;/);
});

test('폰에서도 청록색 제출 버튼의 그림자는 청록색 (빨간 그림자가 겹치지 않는다)', () => {
  const reg = read('src/pages/camp-register/index.astro');
  assert.match(reg, /\.crp-submit--teal \{ box-shadow: 0 10px 30px rgba\(13,148,136,0\.34\); \}/);
});
