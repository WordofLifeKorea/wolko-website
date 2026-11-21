// 후원 페이지 선교사 구역(단체사진 · 전체 폭 격자 목록) · 캠프 신청 창(남녀 색 구분 · 기기별 크기) · PDF 배율 아이콘
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const give = read('src/pages/give/index.astro');
const camp = read('src/pages/camp-register/index.astro');
const resource = read('src/pages/portal/resource.astro');

test('후원 페이지: 위쪽 사진(드론)과 선교사 구역 사진(단체사진)이 서로 다른 파일이고 둘 다 있다', () => {
  const fund = /img: '(\/images\/heroes\/[^']+)'/.exec(give)[1];
  const mission = /<figure class="gv-mission-photo"><img src="([^"]+)"/.exec(give)[1];
  assert.notEqual(fund, mission, '같은 사진이 한 페이지에 두 번 나오면 안 된다');
  for (const f of [fund, mission]) assert.ok(existsSync(new URL('../public' + f, import.meta.url)), f + ' 파일이 있어야 한다');
  assert.match(mission, /give-mission-group/);
  assert.match(give, /\.gv-fund-photo \{[^}]*aspect-ratio: 16 \/ 9/, '드론 사진은 원이 잘리지 않게 16:9');
});

test('후원 페이지: 사역자 고르기는 오른쪽 좁은 칸이 아니라 섹션 아래 전체 폭에 격자로 놓이고, 폰에서는 접을 수 있다', () => {
  const layoutStart = give.indexOf('<div class="gv-shell gv-mission-layout">');
  const pickWrap = give.indexOf('<div class="gv-shell gv-pick-wrap">');
  const giveCol = give.indexOf('<div class="gv-mission-give">');
  assert.ok(layoutStart > 0 && giveCol > layoutStart && pickWrap > giveCol);
  // 목록이 '후원 방법' 칸 안에 남아 있지 않다: gv-mission-give 가 닫힌 뒤에 gv-pick-wrap 이 온다
  const between = give.slice(giveCol, pickWrap);
  assert.ok(!between.includes('class="gv-pick"'), '사역자 목록은 오른쪽 칸 밖으로 옮겼다');
  assert.match(give, /\.gv-pick-list \{[^}]*display: grid; grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(give, /@media \(max-width: 1180px\) \{ \.gv-pick-list \{ grid-template-columns: repeat\(2/);
  assert.match(give, /const PICK_FIRST = 6;/);
  assert.match(give, /gv-pick-extra/);
  // 스크립트가 켜진 폰에서만 접는다(스크립트가 없으면 모두 보인다)
  assert.match(give, /\.gv-pick-group\[data-collapsible\]:not\(\[data-expanded\]\) \.gv-pick-extra \{ display: none; \}/);
  assert.match(give, /g\.setAttribute\('data-collapsible', ''\)/);
});

test('캠프 신청: 남학생 · 여학생 색이 파랑 / 주황으로 서로 다르고 카드 막대 · 신청 창 막대 · 범례가 같은 색을 쓴다', () => {
  const male = /--c-male:\s*(#[0-9a-f]{6})/i.exec(camp)[1];
  const female = /--c-female:\s*(#[0-9a-f]{6})/i.exec(camp)[1];
  const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [mr, , mb] = rgb(male), [fr, , fb] = rgb(female);
  assert.ok(mb > mr && fr > fb, '남학생은 파랑 계열, 여학생은 주황 계열');
  assert.match(camp, /\.crp-cap-fill-m \{ background: var\(--c-male\); \}/);
  assert.match(camp, /\.crp-cap-fill-f \{ background: var\(--c-female\); \}/);
  assert.match(camp, /\.crp-modal-cap-fill-m \{ background: var\(--c-male\); \}/);
  assert.match(camp, /\.crp-modal-cap-fill-f \{ background: var\(--c-female\); \}/);
  assert.match(camp, /\.crp-cap-bar-label--m::before \{ background: var\(--c-male\); \}/);
  assert.match(camp, /id="crpModalCapLegend" hidden/);
  assert.match(camp, /modalCapLegend\.hidden = !split \|\| capacity <= 0/, '성별 정원이 없는 캠프(연합캠프 등)에서는 범례를 숨긴다');
});

test('캠프 신청 창: 낮은 화면 · 가로 폰 · 키 작은 폰에서 창을 줄이는 규칙이 있다', () => {
  assert.match(camp, /@media \(min-width: 741px\) and \(max-height: 820px\)/, '노트북 높이');
  assert.match(camp, /@media \(max-width: 740px\) and \(max-height: 700px\)/, '키 작은 폰');
  assert.match(camp, /@media \(max-height: 500px\) and \(max-width: 1000px\) \{[\s\S]*?\.crp-reg-modal \{ padding: 0; align-items: stretch; \}/, '가로로 돌린 폰은 화면 전체');
  // 아래 고정 단추 줄이 낮아졌다(52 → 48px) 그래도 누르기 좋은 44px 이상
  assert.match(camp, /\.crp-cancel-btn, \.crp-form-actions \.crp-submit, \.staff-form-actions \.crp-submit, \.staff-draft-btn \{ height: 48px; min-height: 48px !important; \}/);
  // 큰 화면: 성별 | 이메일을 한 줄에
  assert.match(camp, /#crpSectionIndividual \.crp-field--email \{ grid-column: auto; \}/);
  assert.ok(camp.indexOf('crp-field--email">') < camp.indexOf('crp-field--birth" id="crpBirthField"'), '이메일이 생년월일보다 앞(Tab 순서 = 눈에 보이는 순서)');
  assert.match(camp, /\.crp-confirm-actions \.crp-cancel-btn, \.crp-confirm-actions \.crp-submit \{ height: 48px !important; min-height: 48px !important; \}/, '닫기 확인 상자의 두 단추는 같은 높이');
  assert.match(camp, /margin: 2px 8px -46px auto; width: 44px !important; height: 44px !important/, '가로 화면 닫기 단추 44px, 머리글 안에 들어가고 머리글이 위로 밀리지 않게 -46px');
  assert.match(camp, /#crpModal \.crp-modal-card, #staffModal \.crp-modal-card \{ scroll-padding-block: 72px 104px; \}/, '스태프 창도 Tab 이동 때 고정 단추 줄에 안 가려진다');
  assert.match(camp, /modalCapLegend\.hidden = !split \|\| capacity <= 0;\s*modalCapLegend\.style\.visibility = rawCount === '…' \? 'hidden' : '';/, '남·여 범례는 불러오는 동안 자리만 잡아 입력칸이 밀리지 않게');
  assert.match(camp, /\.crp-cap-fill-m\.is-total, \.crp-modal-cap-fill-m\.is-total \{ background: var\(--c-deep\); \}/, '남녀 정원이 따로 없는 캠프의 전체 막대는 청록');
  assert.match(camp, /\.crp-waitlist-notice \{ margin-left: 32px; margin-right: 32px; \}/, '예비 신청 안내 좌우 여백이 다른 영역과 같다');
  assert.match(camp, /crp-field--full crp-field--email/);
});

test('PDF 보기 배율 아이콘: 세 개가 서로 다른 그림이고 예전의 헷갈리는 그림(문서 모양 · 모서리 괄호)을 쓰지 않는다', () => {
  const grab = (label) => new RegExp("\\['\\[aria-label=\"" + label + "\"\\]', '([^']+)'\\]").exec(resource)[1];
  const w = grab('너비 맞춤 / Fit width'), m = grab('중간 배율 / Balanced zoom'), p = grab('한 페이지 맞춤 / Fit page');
  assert.equal(new Set([w, m, p]).size, 3);
  assert.ok(m.includes('<circle'), '중간 배율은 돋보기');
  assert.ok(w.includes('M2.5 20h19'), '너비 맞춤은 가로 화살표');
  assert.ok(p.includes('M19 3v18'), '한 페이지 맞춤은 세로 화살표');
  // 배율 아이콘 배열 안에서 예전 그림(문서 모양 · 모서리 괄호)이 사라졌는지
  const arr = resource.slice(resource.indexOf('const controlIcons = ['), resource.indexOf('controlIcons.forEach'));
  assert.ok(!arr.includes('M7 3H3v4m14-4h4v4'), '모서리 괄호(전체 화면과 같은 모양)는 더 쓰지 않는다');
  assert.ok(!arr.includes('M9 8h6M9 12h6M9 16h4'), '문서 줄 모양은 더 쓰지 않는다');
});
