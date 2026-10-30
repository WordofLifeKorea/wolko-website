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

test('CRS 상세의 "정보 수정"은 뒤로 가기를 쓰지 않는다(상세가 기록 없이 열렸으면 페이지를 벗어나던 문제)', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/portal/crs/index.astro', import.meta.url), 'utf8');
  const handler = page.slice(page.indexOf("getElementById('detailEditBtn').addEventListener"), page.indexOf("getElementById('detailDeleteBtn')"));
  assert.match(handler, /closeDetailModal\(\{ useHistory: false \}\)/);
  assert.doesNotMatch(handler, /closeDetailModal\(\);/);
  assert.match(handler, /openEditModal\(church\)/);
});
