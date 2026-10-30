import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewerCountOf, reviewPercentOf, stagePercentsOf, REVIEWERS_FOR_FULL_REVIEW } from '../functions/lib/portalResources.js';

const note = (by, extra = {}) => ({ id: Math.random().toString(36).slice(2), createdBy: by, text: 'x', ...extra });

test('리소스 검토 단계: 노트를 남긴 서로 다른 사람이 2명이면 검토 완료(100%), 1명이면 50%', () => {
  assert.equal(REVIEWERS_FOR_FULL_REVIEW, 2);
  assert.equal(reviewPercentOf({ annotations: [] }), 0);
  assert.equal(reviewPercentOf({ annotations: [note('a@wol.org'), note('A@wol.org ')] }), 50, '같은 사람이 여러 개 남겨도 1명');
  assert.equal(reviewPercentOf({ annotations: [note('a@wol.org'), note('b@wol.org')] }), 100);
  assert.equal(reviewPercentOf({ annotations: [note('a@wol.org'), note('b@wol.org'), note('c@wol.org')] }), 100, '3명 이상도 100%');
  assert.equal(reviewerCountOf({ annotations: [note('a@wol.org'), note('b@wol.org', { deletedAt: new Date().toISOString() })] }), 1, '휴지통 노트는 세지 않는다');
  const item = { annotations: [note('a@wol.org'), note('b@wol.org')], files: [{ id: 'f', reviewConfirmations: {} }], stagePercents: [100, 0, 0] };
  assert.deepEqual(stagePercentsOf(item), [100, 100, 0], '검토 단계는 저장값이 아니라 노트 기준');
  assert.equal(reviewPercentOf({ annotations: [], files: [{ reviewConfirmations: { a: {}, b: {}, c: {} } }] }), 0, '예전 "검토 완료" 체크는 더 이상 세지 않는다');
});
