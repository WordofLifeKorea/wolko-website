import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('churches page explains how a church can partner, in both languages', async () => {
  const page = await read('src/pages/churches/index.astro');
  assert.match(page, /<BaseLayout[\s\S]*activeNav="ministry"/);
  for (const ko of ['전도 이벤트', '선생님 · 리더 훈련', '캠프 단체 참가', '월코 커리큘럼', '함께하는 순서']) assert.match(page, new RegExp(ko));
  for (const en of ['Outreach Events', 'Teacher & Leader Training', 'Camps for Your Group', 'WOLKO Curriculum', 'How It Works']) assert.ok(page.includes(en), en);
  assert.ok((page.match(/class="wl-ko"/g) || []).length > 0 && (page.match(/class="wl-ko"/g) || []).length === (page.match(/class="wl-en"/g) || []).length, '한글·영문 짝이 맞는다');
  assert.match(page, /href="\/contact"/);
  // 협력 교회 목록은 홈과 같은 스크립트가 채운다
  assert.match(page, /id="partnerChurches"[\s\S]*id="pcNames"/);
  assert.match(page, /src="\/partner-churches\.js\?v=\d+"/);
  assert.match(page, /@media \(prefers-reduced-motion: reduce\)/);
});

test('ministry hub links to the churches page', async () => {
  const ministry = await read('src/pages/ministry/index.astro');
  assert.match(ministry, /href="\/churches"/);
});
