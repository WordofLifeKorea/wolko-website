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

// 교회 협력 페이지는 아직 준비 중 — 더 준비될 때까지 공개 페이지(메뉴 · 바닥글 · 홈 · 사역 · 추천사)에서 링크하지 않는다 (2026-11-05 결정)
test('churches page is not linked from public pages yet', async () => {
  for (const path of ['src/layouts/BaseLayout.astro', 'src/pages/index.astro', 'src/pages/ministry/index.astro', 'src/pages/endorsements/index.astro']) {
    assert.doesNotMatch(await read(path), /href="\/churches"/, path);
  }
});
