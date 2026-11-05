import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { campPublicStatus, campStatusTone } from '../src/utils/campPublicStatus.js';

const root = new URL('..', import.meta.url).pathname;
const read = p => readFileSync(root + p, 'utf8');
const camp = id => ({ id, data: JSON.parse(read(`src/content/camp_schedules/${id}.json`)) });
const at = iso => Date.parse(iso);

const winter = camp('2027-wolko-winter');
const jeju = camp('2027-jeju-english');
const unity = camp('2027-unity-winter');

// 계획서 A2-3 · A2-6의 세 시각 — 캠프 신청 화면 배지와 같은 글자여야 한다
test('2026-11-10 12:00 KST: 겨울 영어캠프는 1 · 2차 사이라 일시 마감, 연합 · 제주는 준비 중', () => {
  const now = at('2026-11-10T12:00:00+09:00');
  assert.deepEqual(campPublicStatus(winter, now), { key: 'paused', ko: '신청 일시 마감', en: 'Closed for now' });
  assert.deepEqual(campPublicStatus(unity, now), { key: 'upcoming', ko: '준비 중', en: 'Upcoming' });
  assert.deepEqual(campPublicStatus(jeju, now), { key: 'upcoming', ko: '준비 중', en: 'Upcoming' });
});

test('2026-11-20 12:00 KST: 겨울 영어캠프 2차 접수 중, 연합 캠프 열림, 제주는 아직 준비 중', () => {
  const now = at('2026-11-20T12:00:00+09:00');
  assert.deepEqual(campPublicStatus(winter, now), { key: 'open', ko: '신청 중', en: 'Open' });
  assert.deepEqual(campPublicStatus(unity, now), { key: 'open', ko: '신청 중', en: 'Open' });
  assert.deepEqual(campPublicStatus(jeju, now), { key: 'upcoming', ko: '준비 중', en: 'Upcoming' });
});

test('2026-11-28 08:00 KST: 제주 캠프도 열린 뒤라 세 캠프 모두 신청 중', () => {
  const now = at('2026-11-28T08:00:00+09:00');
  for (const c of [winter, unity, jeju]) {
    assert.deepEqual(campPublicStatus(c, now), { key: 'open', ko: '신청 중', en: 'Open' }, c.id);
  }
});

test('경계: 신청창 · 카운트다운이 열리는 그 시각부터 신청 중', () => {
  assert.equal(campPublicStatus(winter, at('2026-11-18T09:59:59+09:00')).key, 'paused');
  assert.equal(campPublicStatus(winter, at('2026-11-18T10:00:00+09:00')).key, 'open');
  assert.equal(campPublicStatus(winter, at('2026-10-15T09:00:00+09:00')).key, 'opens-soon');
  assert.equal(campPublicStatus(winter, at('2026-10-15T09:00:00+09:00')).ko, '오픈 예정');
  assert.equal(campPublicStatus(jeju, at('2026-11-28T06:59:59+09:00')).key, 'upcoming');
  assert.equal(campPublicStatus(jeju, at('2026-11-28T07:00:00+09:00')).key, 'open');
});

test('신청창 · 카운트다운이 없는 캠프는 JSON status 글자 그대로 (캠프 신청 화면 statusLabel)', () => {
  const now = at('2026-11-20T12:00:00+09:00');
  assert.deepEqual(campPublicStatus({ id: 'x', data: { status: 'closed', camp_type: 'english' } }, now), { key: 'closed', ko: '마감', en: 'Closed' });
  assert.deepEqual(campPublicStatus({ id: 'x', data: { status: 'full', camp_type: 'english' } }, now), { key: 'full', ko: '정원 마감', en: 'Full' });
  assert.deepEqual(campPublicStatus({ id: 'x', data: { status: 'open', camp_type: 'english' } }, now), { key: 'open', ko: '신청 중', en: 'Open' });
  // 내륙 upcoming + 신청서 주소가 있으면 캠프 신청 화면은 카운트다운 대신 '카페에서 소식 받기' — 배지는 준비 중 그대로
  assert.equal(campPublicStatus({ id: 'x', data: { status: 'upcoming', camp_type: 'union', open_date: '2026-11-01T00:00:00+09:00', registration_url: 'https://cafe.naver.com/wolkojrcamp' } }, now).key, 'upcoming');
  // 외부 신청서를 쓰는 내륙 캠프는 신청창 규칙을 쓰지 않는다
  assert.equal(campPublicStatus({ id: '2027-wolko-winter', data: { ...winter.data, use_external_form: true } }, at('2026-11-10T12:00:00+09:00')).key, 'open');
});

test('색 단계는 캠프 신청 화면과 같은 세 갈래', () => {
  assert.equal(campStatusTone('open'), 'open');
  assert.equal(campStatusTone('opens-soon'), 'upcoming');
  assert.equal(campStatusTone('upcoming'), 'upcoming');
  for (const key of ['paused', 'closed', 'full']) assert.equal(campStatusTone(key), 'closed');
});

test('캠프 신청 화면의 배지 글자가 바뀌면 이 규칙도 함께 고쳐야 한다', () => {
  const reg = read('src/pages/camp-register/index.astro');
  assert.match(reg, /\['신청 중', 'Open'\] : info\.state === 'before' \? \['오픈 예정', 'Opens soon'\] : info\.nextOpenAt \? \['신청 일시 마감', 'Closed for now'\] : \['마감', 'Closed'\]/);
  assert.match(reg, /badge\.innerHTML = '<span class="wl-ko">신청 중<\/span><span class="wl-en">Open<\/span>'/);
  assert.match(reg, /upcoming: \{ ko: '준비 중',\s+en: 'Upcoming'/);
});

test('/camp 다가오는 캠프: 같은 거름 · 같은 도우미 · 신청 링크 · 빈 화면 연결', () => {
  const page = read('src/pages/camp/index.astro');
  assert.match(page, /\.filter\(isCampVisibleOnPublicSite\)\s*\.filter\(s => !s\.data\.public_card_hidden\)/);
  assert.match(page, /id="upcoming-camps"/);
  assert.match(page, /import \{ campPublicStatus, campStatusTone \} from '\.\.\/\.\.\/utils\/campPublicStatus\.js'/);
  assert.match(page, /\/camp-register\/#camps-wolko/);
  assert.match(page, /\/camp-register\/#camps-jeju/);
  // 빈 화면: 같은 페이지 문의 띠 + 카페 두 곳 (문의 양식 inland 링크는 2곳 그대로)
  const empty = page.slice(page.indexOf('class="uc-empty"'), page.indexOf('<!-- 소개 + 프로그램 바로가기 -->'));
  assert.ok(empty.length > 0);
  assert.match(empty, /href="#camp-contact"/);
  assert.match(empty, /cafe\.naver\.com\/wolkojrcamp/);
  assert.match(empty, /cafe\.naver\.com\/wolcamp/);
  assert.equal((page.match(/href="\/contact\?type=camp&amp;camp=inland#contact-form"/g) || []).length, 2);
});
