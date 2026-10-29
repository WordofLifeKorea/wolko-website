import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const ctx = { console }; ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(readFileSync(new URL('../public/portal/campteam/title-match.js', import.meta.url), 'utf8'), ctx);
const { match } = ctx.CTTitleMatch;
const types = [
  { id: 'T1', nameKo: '월코 영어 캠프', nameEn: 'WOLKO English Camp', camps: [
    { id: 'C1', nameKo: '2027 겨울 월코 영어 캠프', nameEn: '2027 Winter WOLKO English Camp', year: 2027, season: '겨울' },
    { id: 'C2', nameKo: '2026 여름 월코 영어 캠프', nameEn: '2026 Summer WOLKO English Camp', year: 2026, season: '여름' }] },
  { id: 'T2', nameKo: '월코 주니어 영어 캠프', nameEn: 'WOLKO Jr. English Camp', camps: [{ id: 'C3', nameKo: '2027 여름 월코 주니어 영어 캠프', nameEn: '2027 Summer WOLKO Jr. English Camp', year: 2027, season: '여름' }] },
];

test('제목에 캠프 이름이 들어 있으면 그 캠프를 고른다 (한글·영어·띄어쓰기 달라도)', () => {
  assert.equal(match('2027 겨울 월코 영어 캠프', types), 'camp:C1');
  assert.equal(match('2027 겨울 월코 영어 캠프 수업자료', types), 'camp:C1');
  assert.equal(match('2027winter wolko english camp schedule', types), 'camp:C1');
  assert.equal(match('2027 겨울 월코 영어캠프', types), 'camp:C1', '붙여 써도 같다');
});
test('더 긴(구체적인) 이름이 이긴다: 주니어 캠프를 일반 영어 캠프로 착각하지 않는다', () => {
  assert.equal(match('2027 여름 월코 주니어 영어 캠프 시간표', types), 'camp:C3');
});
test('캠프가 아직 없으면 연도·계절로 찾고, 그것도 없으면 유형만 고른다', () => {
  assert.equal(match('2026 여름 월코 영어 캠프 포스터', types), 'camp:C2');
  assert.equal(match('2030 겨울 월코 영어 캠프 포스터', types), 'type:T1');
  assert.equal(match('월코 영어 캠프 공통 안내', types), 'type:T1');
});
test('관련 없는 제목은 아무것도 고르지 않는다', () => {
  assert.equal(match('회의록', types), null);
  assert.equal(match('', types), null);
  assert.equal(match('캠프', types), null, '너무 짧고 흔한 말은 무시');
  assert.equal(match('2027 겨울 월코 영어 캠프', []), null);
});
