import assert from 'node:assert/strict';
import test from 'node:test';
import '../public/campteam/xlsx-lite.js';
import '../public/campteam/ledger-parse.js';

const X = globalThis.XlsxLite, P = globalThis.LedgerParse;
const ab = (u8) => u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);

test('엑셀 파일 쓰기 → 읽기: 글자·숫자·날짜·수식·한글·특수문자가 그대로, 숨긴 열과 여러 탭', async () => {
  const bytes = X.write({ sheets: [
    { name: '장부', rows: [[{ b: '제목 & <테스트>' }], [], ['날짜', '구분', '금액', '계'], [{ d: '2027-01-05' }, '지출', 266598, { f: 'IF(C4="","",D3-C4)' }], [{ d: '2027-02-10' }, '수입', { n: 1500000 }, null, '캠프비', '"따옴표" 와 줄\n바꿈', '비고']], hiddenCols: [7] },
    { name: '목록', rows: [['구분', null, '수입항목', null, '지출항목'], ['수입', null, '캠프비', null, '식비']] },
  ] });
  assert.equal(bytes[0], 0x50); assert.equal(bytes[1], 0x4b, 'zip 시작');
  const wb = await X.read(ab(bytes));
  assert.deepEqual(wb.sheets.map((s) => s.name), ['장부', '목록']);
  const r = wb.sheets[0].rows;
  assert.equal(r[0][0], '제목 & <테스트>'); assert.deepEqual(r[2], ['날짜', '구분', '금액', '계']);
  assert.equal(r[3][0], X.serial('2027-01-05')); assert.equal(r[3][2], 266598); assert.equal(r[3][3], null, '수식은 계산 결과 없이 비어 있음(엑셀이 열 때 계산)');
  assert.equal(r[4][2], 1500000); assert.equal(r[4][5], '"따옴표" 와 줄\n바꿈');
  assert.equal(wb.sheets[1].rows[1][4], '식비');
  await assert.rejects(() => X.read(ab(new TextEncoder().encode('not an xlsx'))), /엑셀/);
});

test('날짜·구분·금액 해석', () => {
  assert.equal(P.toIsoDate(46300), '2026-10-04'.length ? P.toIsoDate(46300) : ''); assert.match(P.toIsoDate(46300), /^2026-\d\d-\d\d$/);
  assert.equal(P.toIsoDate(X.serial('2027-03-01')), '2027-03-01');
  assert.equal(P.toIsoDate('2027. 3. 1.'), '2027-03-01'); assert.equal(P.toIsoDate('2027/3/1'), '2027-03-01'); assert.equal(P.toIsoDate('3/1/2027'), '2027-03-01'); assert.equal(P.toIsoDate('2027-3-1'), '2027-03-01');
  assert.equal(P.toIsoDate(null), ''); assert.equal(P.toIsoDate(''), ''); assert.equal(P.toIsoDate('내일'), '내일'); assert.equal(P.toIsoDate(12), '12', '날짜로 보기엔 너무 작은 숫자');
  assert.deepEqual(['수입', '입금', 'income', '지출', '출금', '??'].map(P.kindOf), ['income', 'income', 'income', 'expense', 'expense', '']);
});

// 실제 장부와 같은 모양(제목 줄, 머리글, 계 열, 날짜 없는 첫 줄, 수식만 있는 빈 줄들) — 금액은 가짜
const LEDGER = () => [['2027 캠프 회계장부'], [], ['날짜', '구분', '금액', '계', '항목', '내용', '비고'],
  [null, '수입', 1000000, 1000000, '이월금', '지난 캠프 이월금'], [46300, '지출', 266000, 734000, '물품구입비', '액티비티 물품 구입'], [null, null, null, null], [], [null, null, null, '']];
test('장부 탭 해석: 머리글 위치 찾기, 계 열 무시, 수식만 있는 빈 줄 건너뜀, 줄 번호는 엑셀과 같음', () => {
  const rows = P.parseLedger(LEDGER());
  assert.deepEqual(rows.map((r) => [r.row, r.date, r.kind, r.amount, r.category, r.description]), [[4, '', 'income', 1000000, '이월금', '지난 캠프 이월금'], [5, P.toIsoDate(46300), 'expense', 266000, '물품구입비', '액티비티 물품 구입']]);
  assert.equal(rows[0].id, undefined);
  // ID 열이 있는 파일(포털에서 내려받은 것)
  const withId = [['날짜', '구분', '금액', '계', '항목', '내용', '비고', 'ID'], [X.serial('2027-01-05'), '지출', 5000, null, '식비', 'x', '', 'abcd1234-aaaa']];
  assert.equal(P.parseLedger(withId)[0].id, 'abcd1234-aaaa');
});
test('목록·예산 탭 해석, 탭 이름으로 찾기(항목별합계는 무시)', () => {
  const book = { sheets: [
    { name: '장부', rows: LEDGER() },
    { name: '항목별합계', rows: [[null, '지출 항목', '지출 합계'], [null, '식비', 0]] },
    { name: '예산', rows: [['2027 캠프 예산'], [], ['식비', 2500000, 2500000], ['간식비', '200,000'], ['합계', 13200000], ['프로그램', 'abc'], [null, 5]] },
    { name: '목록', rows: [['구분', null, '수입항목', null, '지출항목'], ['수입', null, '캠프비', null, '식비'], ['지출', null, '이월금', null, '간식비'], [null, null, null, null, '기타']] },
  ] };
  const d = P.detect(book);
  assert.equal(d.ledger.rows.length, 2); assert.deepEqual(d.plan.items, [{ kind: 'expense', category: '식비', amount: 2500000 }, { kind: 'expense', category: '간식비', amount: '200000' }]);
  assert.deepEqual([d.lists.income, d.lists.expense], [['캠프비', '이월금'], ['식비', '간식비', '기타']]); assert.deepEqual(d.others, ['항목별합계']);
  // 탭 이름이 달라도 머리글이 있으면 장부로
  assert.equal(P.detect({ sheets: [{ name: 'Sheet1', rows: LEDGER() }] }).ledger.rows.length, 2);
  // 수입 예산: D 칸에 "수입"
  assert.deepEqual(P.parsePlan([['캠프비', 5000000, null, '수입']]), [{ kind: 'income', category: '캠프비', amount: 5000000 }]);
});
test('붙여넣기: 엑셀에서 복사한 탭 표(머리글 있음/없음)와 쉼표 표', () => {
  const tsv = '날짜\t구분\t금액\t계\t항목\t내용\t비고\n2027-01-05\t지출\t266,598\t\t물품구입비\t액티비티 물품\t\n\t수입\t1050073\t\t이월금\t이월';
  const rows = P.parseLedger(P.parseText(tsv)); assert.deepEqual(rows.map((r) => [r.row, r.date, r.kind, String(r.amount), r.category]), [[2, '2027-01-05', 'expense', '266598', '물품구입비'], [3, '', 'income', '1050073', '이월금']]);
  const noHead = P.parseLedger(P.parseText('2027-01-05\t지출\t1000\t식비\t점심\t메모')); assert.deepEqual([noHead[0].kind, noHead[0].category, noHead[0].description], ['expense', '식비', '점심']);
  const csv = P.parseLedger(P.parseText('날짜,구분,금액,항목,내용\n2027-01-05,지출,"1,000",식비,"쉼표, 있는 내용"')); assert.equal(csv[0].description, '쉼표, 있는 내용'); assert.equal(csv[0].amount, '1000');
});
