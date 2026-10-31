import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('staff application scrolls as one window like the camp application — the banner scrolls away, close button and bottom buttons stay', async () => {
  const page = await readFile(new URL('../src/pages/camp-register/index.astro', import.meta.url), 'utf8');

  assert.match(page, /class="crp-modal-head crp-staff-modal-head"[\s\S]*class="crp-staff-modal-body"[\s\S]*id="staffFormWrap"/);
  // 머리말을 고정하던 규칙(카드 overflow:hidden + 본문만 스크롤 + 닫기 absolute)이 없어야 한다
  assert.doesNotMatch(page, /#staffModal \.crp-staff-modal-body \{[^}]*overflow-y: auto;/);
  assert.doesNotMatch(page, /#staffModal \.crp-modal-close \{[^}]*position: absolute;/);
  // 신청 모달과 같은 규칙: 카드가 스크롤되고, 닫기는 sticky, 아래 버튼 줄은 sticky
  assert.match(page, /\.crp-modal-card \{[^}]*overflow-y: auto;/);
  assert.match(page, /\.crp-modal-close \{[^}]*position: sticky;/);
  assert.match(page, /\.staff-form-actions \{[^}]*position: sticky; bottom: 0;/);
});
