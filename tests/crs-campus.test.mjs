import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crsLocation } from '../functions/lib/crsMinistry.js';

const src = readFileSync(new URL('../src/pages/portal/crs/index.astro', import.meta.url), 'utf8');

test('CRS 평택|제주: 화면의 구분 규칙이 서버(복음 통계 · 포탈 홈)의 crsLocation 과 같다', () => {
  const line = src.split('\n').find(l => l.includes('const churchCampus = c =>'));
  assert.ok(line, 'churchCampus 가 있다');
  const churchCampus = new Function(`${line.trim()}; return churchCampus;`)();
  for (const region of ['제주특별자치도', '제주', 'Jeju', 'JEJU Province', '경기도', '서울특별시', '', undefined]) {
    const mine = churchCampus({ region });
    assert.equal(mine, crsLocation({ region }) === 'jeju' ? 'jeju' : 'wolko', String(region));
  }
});

test('CRS 평택|제주: 목록 · 지도 · 필터 · 번호 · 새 교회 기본값이 모두 고른 지역을 따른다', () => {
  assert.match(src, /const filtered = campusChurches\(\)/, '목록');
  assert.match(src, /const pinnable = campusChurches\(\)\.filter/, '지도 마커');
  assert.match(src, /const missionaries = \[\.\.\.new Set\(campusChurches\(\)/, '담당 선교사 필터');
  assert.match(src, /data\.number = churches\.filter\(c => churchCampus\(c\) === churchCampus\(data\)\)/, '번호는 지역마다 이어서');
  assert.match(src, /activeCampus === 'jeju' \? '제주특별자치도'/, '새 교회의 시/도 기본값');
  assert.match(src, /id="campusSeg"/); assert.match(src, /data-campus="\$\{k\}"/);
  assert.match(src, /localStorage\.setItem\('wolko-crs-campus'/, '고른 지역은 기억한다');
  assert.match(src, /renderFilterSelects\(\); renderChurchList\(\); updateCrsMarkers\(\);/, '바꾸면 목록·필터·지도를 다시 그린다');
});

test('CRS 상세의 "정보 수정"은 상세를 닫지 않고 그 위에 수정 창을 띄우고, 저장하면 상세를 다시 그린다', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/portal/crs/index.astro', import.meta.url), 'utf8');
  const handler = page.slice(page.indexOf("getElementById('detailEditBtn').addEventListener"), page.indexOf("getElementById('stepsToggle')"));
  assert.doesNotMatch(handler, /closeDetailModal/, '상세를 닫지 않는다(뒤로 가기도 쓰지 않는다)');
  assert.match(handler, /openEditModal\(church\)/);
  assert.match(page, /if \(fresh\) openDetailModal\(fresh, \{ updateHistory: false \}\)/, '저장 후 상세를 고친 내용으로 다시 그린다');
  assert.match(page, /#editModal\.modal-backdrop \{ z-index:1300; \}/, '휴대폰에서 상세(1200) 위에 뜬다');
});

test('CRS 홈페이지 주소: http(s)만 저장하고, 앞에 https:// 를 붙이고, 상세에서는 새 창 링크로 연다', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/portal/crs/index.astro', import.meta.url), 'utf8');
  const src = page.slice(page.indexOf('  function cleanWebsite(raw) {'), page.indexOf('  async function saveChurch() {'));
  const { cleanWebsite, websiteLabel } = new Function(src + '\nreturn { cleanWebsite, websiteLabel };')();
  assert.equal(cleanWebsite('www.church.or.kr'), 'https://www.church.or.kr/');
  assert.equal(cleanWebsite('  http://church.kr/about  '), 'http://church.kr/about');
  assert.equal(cleanWebsite('javascript:alert(1)'), '', '위험한 주소는 버린다');
  assert.equal(cleanWebsite('ftp://church.kr'), '');
  assert.equal(cleanWebsite('그냥 글자'), '');
  assert.equal(cleanWebsite(''), '');
  assert.equal(websiteLabel('https://www.church.or.kr/'), 'church.or.kr');
  assert.match(page, /id="fWebsite"/); assert.match(page, /website: cleanWebsite\(document\.getElementById\('fWebsite'\)\.value\)/);
  assert.match(page, /target="_blank" rel="noopener noreferrer"/);
});

test('CRS 교회 삭제: 상세 화면에는 없고, 수정 창에서 교회 이름을 그대로 입력해야 켜지며 비밀번호도 묻는다', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/portal/crs/index.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(page, /detailDeleteBtn/, '상세 화면의 삭제 버튼은 없다');
  assert.match(page, /<div class="danger-zone" id="dangerZone" hidden>/);
  assert.match(page, /id="dangerGo" disabled/, '처음엔 꺼져 있다');
  assert.match(page, /dangerGo'\)\.disabled = !editingChurch \|\| e\.target\.value\.trim\(\) !== String\(editingChurch\.churchName/, '이름이 같아야 켜진다');
  assert.match(page, /zone\.hidden = !church;/, '새 교회 추가 창에는 없다');
  assert.match(page, /async function deleteChurch\(church\) \{\s*const pw = prompt\(/, '비밀번호도 한 번 더 묻는다');
});
