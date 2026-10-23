import test from 'node:test';
import assert from 'node:assert/strict';
import * as H from '../functions/lib/hubAccounts.js';
import * as G from '../functions/api/portal/gospel-stats.js';
import { buildXlsx, columnName } from '../functions/lib/xlsxLite.js';
import { GOSPEL_FIELD_IDS } from '../functions/lib/gospelStats.js';

/** 압축 없는 zip 을 읽어 { 파일이름: 글 } 로 돌려준다(시험용) */
function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  assert.ok(end >= 0, 'zip 끝 표식');
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const out = {};
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(at, true), 0x02014b50);
    const size = view.getUint32(at + 24, true), nameLen = view.getUint16(at + 28, true), local = view.getUint32(at + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLen));
    const dataStart = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    out[name] = new TextDecoder().decode(bytes.subarray(dataStart, dataStart + size));
    at += 46 + nameLen;
  }
  return out;
}

test('xlsxLite: 열 이름, zip 구조, 서식·병합·고정·필터, 글자는 수식이 되지 않는다', () => {
  assert.deepEqual([0, 25, 26, 27, 701, 702].map(columnName), ['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
  const bytes = buildXlsx({ title: 't', sheets: [{ name: 'a/b?c', cols: [10, 20], rows: [[{ v: '제목 & <b>', s: { bold: true, fill: 'FF0000', border: 'CCCCCC', num: '#,##0' } }, { v: 5, s: { num: '#,##0' } }], [{ v: '=SUM(A1)' }, 7]], merges: ['A1:B1'], freezeRow: 1, filter: 'A1:B2' }] });
  const files = unzip(bytes);
  assert.deepEqual(Object.keys(files).sort(), ['[Content_Types].xml', '_rels/.rels', 'docProps/core.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml']);
  const sheet = files['xl/worksheets/sheet1.xml'];
  assert.match(sheet, /<mergeCell ref="A1:B1"\/>/);
  assert.match(sheet, /<pane ySplit="1"/);
  assert.match(sheet, /<autoFilter ref="A1:B2"\/>/);
  assert.match(sheet, /제목 &amp; &lt;b&gt;/, '특수문자는 이스케이프');
  assert.match(sheet, /t="inlineStr"><is><t xml:space="preserve">=SUM\(A1\)/, '= 로 시작해도 문자열 셀');
  assert.match(files['xl/workbook.xml'], /<sheet name="a b c"/, '시트 이름의 금지 문자는 공백으로');
  assert.match(files['xl/styles.xml'], /<b\/>/);
  assert.match(files['xl/styles.xml'], /formatCode="#,##0"/);
});

function env() {
  const store = new Map();
  const kv = {
    async get(k, t) { const v = store.get(k); if (v == null) return null; return t === 'json' ? JSON.parse(v) : v; },
    async put(k, v) { store.set(k, v); },
    async delete(k) { store.delete(k); },
    async list({ prefix }) { return { keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
  };
  return { CAMP_KV: kv, ADMIN_PASSWORD: 'secret' };
}

test('GET format=xlsx: 마스터·관리자만, 요약·추이·보고 목록 시트와 합계가 들어 있다', async () => {
  const e = env();
  const month = (await import("../functions/lib/gospelStats.js")).currentMonthKst();
  for (const [email, role] of [['admin@wolko.org', 'master'], ['anna@wol.org', 'counselor']]) await e.CAMP_KV.put(`hub:account:${email}`, JSON.stringify({ email, name: email, role, status: 'approved' }));
  const token = async who => 'Bearer ' + await H.createHubSessionToken('secret', who[0], who[1]);
  const post = async (who, body) => G.onRequestPost({ env: e, request: new Request('https://t.co/api/portal/gospel-stats', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: await token(who) }, body: JSON.stringify(body) }) });
  const values = Object.fromEntries(GOSPEL_FIELD_IDS.map((id, i) => [id, i + 1]));
  assert.equal((await post(['anna@wol.org', 'counselor'], { month, scope: 'individual', location: 'jeju', values })).status, 200);
  assert.equal((await post(['admin@wolko.org', 'master'], { month, scope: 'team', teamName: '평택 팀', location: 'mainland', values })).status, 200);
  const get = async who => G.onRequestGet({ env: e, request: new Request(`https://t.co/api/portal/gospel-stats?month=${month}&format=xlsx`, { headers: { Authorization: await token(who) } }) });
  assert.equal((await get(['anna@wol.org', 'counselor'])).status, 403, '일반 계정은 받을 수 없다');
  const res = await get(['admin@wolko.org', 'master']);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /spreadsheetml\.sheet/);
  assert.match(res.headers.get('content-disposition'), new RegExp(`WOLKO-Gospel-Report-${month}\\.xlsx`));
  const files = unzip(new Uint8Array(await res.arrayBuffer()));
  const workbook = files['xl/workbook.xml'];
  for (const name of ['월간 요약', '최근 6개월', '보고 목록']) assert.ok(workbook.includes(`name="${name}"`), name + ' 시트');
  const summary = files['xl/worksheets/sheet1.xml'];
  assert.match(summary, /Monthly Gospel Outreach Report/);
  assert.match(summary, /핵심 지표/);
  assert.match(summary, /<v>2<\/v>/, '통합 합계(두 보고의 합)가 숫자 셀로 들어간다');
  assert.match(files['xl/worksheets/sheet3.xml'], /평택 팀/);
});
