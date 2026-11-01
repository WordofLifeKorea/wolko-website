import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { root } from './helpers/campteam-fakes.mjs';

const read = (f) => readFileSync(root + f, 'utf8');

test('폰 화면: 짧은 화면에서 맨 위 막대가 늘어나지 않고, iPhone 에서 입력칸을 눌러도 확대되지 않는다', () => {
  const css = read('public/portal/campteam/campteam.css');
  assert.match(css, /@media\(max-width:900px\)\{\.app\{grid-template-rows:auto 1fr\}\}/, '남는 높이는 본문이 가진다');
  assert.match(css, /@supports \(-webkit-touch-callout:none\)\{@media\(max-width:900px\)\{input:not\(\[type=checkbox\]\)[^}]*font-size:16px !important/, '입력칸 글자 16px(iPhone)');
  assert.match(read('public/portal/campteam/assistant.css'), /@media \(max-width:900px\)\{\.asst-form textarea\{font-size:16px/, '루미 입력칸도 16px');
});

test('루미: 닫기 버튼 하나만, 쓰던 글 기억, 크기 조절 한도, 폰에서 뒷화면 고정, 번역·명단 밖 모드', () => {
  const js = read('public/portal/campteam/assistant.js'), css = read('public/portal/campteam/assistant.css');
  assert.ok(!js.includes('id="asstMin"') && !js.includes('$(\'#asstMin\')'), '최소화 막대는 없다');
  assert.ok(js.includes("ct-asst-draft") && js.includes('saveDraft'), '쓰던 글을 기억한다');
  assert.match(js, /LIM = \{ minW: 340, maxW: 640, minH: 420, maxH: 820 \}/, '크기 한도'); assert.ok(js.includes('asstGrip') && js.includes('ct-asst-size'));
  assert.ok(js.includes('lockScroll') && js.includes("document.body.style.position = 'fixed'"), 'iPhone 에서 뒷화면이 같이 밀리지 않게 고정'); assert.match(css, /html\.asst-lock/);
  assert.ok(js.includes("['help', 'asstModeHelp'], ['find', 'asstModeFind']") && js.includes("if (!cfg.guest) l.push(['do', 'asstModeDo'], ['tr', 'asstModeTr'])"), '명단 밖 월코 팀원은 도움말·찾기만, 팀원은 부탁·번역도');
  assert.match(css, /\.asst-msg \.asst-b,\.asst-prop,\.asst-note\{word-break:keep-all;overflow-wrap:break-word\}/, '단어 단위 줄바꿈');
  assert.ok(!js.includes("e.g. Add a task: book the bus by June 20"), '영어 안내 문구가 잘리지 않게 줄였다');
});

test('캠프 준비: 모든 탭이 분류에 들어가고, 캠프 고르기는 선택 상자이며, 신청서는 큰 창에서 열린다', () => {
  const prep = read('public/portal/campteam/prep.js'), forms = read('public/portal/campteam/prep-forms.js'), astro = read('src/pages/portal/campteam/prep.astro');
  const groups = (/var GROUPS = (\[\[.*?\]\]);/.exec(prep) || [])[1]; assert.ok(groups, '분류 목록이 있다');
  const keys = [...groups.matchAll(/'([a-z]+)'(?=[,\]])/g)].map((m) => m[1]).filter((k) => !/^g[A-Z]/.test(k));
  for (const k of ['timeline', 'supplies', 'contacts', 'assign', 'series', 'wizard', 'close', 'survey', 'forms']) assert.ok(keys.includes(k), k + ' 탭이 어느 분류에 있어야 한다');
  assert.ok(prep.includes('data-pk="') && prep.includes('<select data-pk') && !prep.includes('data-py='), '연도·유형·캠프는 선택 상자');
  assert.ok(astro.includes('class="ptabs" id="pTabs"'));
  assert.ok(forms.includes("dlg.className = 'fm-dlg'") && forms.includes('setInterval(autoSave, 15000') && forms.includes('fCloseSave'), '큰 창 + 15초 자동 저장 + 닫을 때 물어보기');
});

test('사무실: 자리 정하기 표(0035)와 게스트 상의 글자, 명단 밖은 사무실을 볼 수 없다', () => {
  assert.match(read('camp-team/db/0035_office_seats.sql'), /CREATE TABLE IF NOT EXISTS office_seats/);
  assert.ok(read('public/portal/campteam/office-art.js').includes('ofc-shirt-t') && read('public/portal/campteam/office-art.js').includes('ofi-shirt'));
  assert.ok(read('functions/api/campteam/office.js').includes('isTeamMember(s)'));
});
