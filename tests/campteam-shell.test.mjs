import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as Me from '../functions/api/campteam/me.js';
import { fakeD1, makeEnv, req, U, root } from './helpers/campteam-fakes.mjs';

const read = (f) => readFileSync(root + f, 'utf8');

test('/me 는 위쪽 머리글에 보일 이름(팀 명단의 이름)을 돌려준다', async () => {
  const e = makeEnv(fakeD1());
  const me = await (await Me.onRequestGet({ env: e, request: await req(U.admin) })).json();
  assert.equal(typeof me.name, 'string');
  const viewer = await (await Me.onRequestGet({ env: e, request: await req(U.view) })).json();
  assert.equal(viewer.name, '테스트 조회');
});

test('왼쪽 메뉴: 캠프 준비 항목이 있고, 모든 메뉴 항목에 마우스 설명 키가 있다', () => {
  const layout = read('src/layouts/CampTeamLayout.astro'), shell = read('public/portal/campteam/shell.js');
  assert.match(layout, /href: '\/portal\/campteam\/prep\/', t: 'navPrep'/);
  const keys = [...layout.matchAll(/tip: '(tip\w+)'/g)].map((m) => m[1]).concat([...layout.matchAll(/data-tip="(tip\w+)"/g)].map((m) => m[1]));
  assert.ok(keys.length >= 14, '메뉴 항목마다 설명 키가 있어야 한다: ' + keys.length);
  for (const k of keys) { assert.ok(shell.includes(k + ':'), k + ' 한국어/영어 문구가 shell.js 에 있어야 한다'); assert.equal(shell.split(k + ':').length - 1, 2, k + ' 는 ko·en 두 번'); }
  assert.ok(read('public/portal/campteam/campteam.js').includes("'/portal/campteam/prep/': 'camps'"), '캠프 준비 메뉴는 캠프 보기 권한이 없으면 숨긴다');
});

test('위쪽 머리글: 계정·언어·로그아웃이 있고, 컴퓨터 화면에서는 왼쪽 아래 칸을 숨긴다', () => {
  const layout = read('src/layouts/CampTeamLayout.astro'), css = read('public/portal/campteam/campteam.css');
  for (const id of ['ctChip', 'langKoT', 'langEnT', 'ctLogout']) assert.ok(layout.includes(`id="${id}"`), id);
  assert.match(css, /@media \(min-width:901px\)\{\.side-foot\{display:none!important\}\}/);
  assert.match(css, /@media \(max-width:900px\)\{\.ct-top\{display:none\}\}/);
});

test('시간대 색: 메뉴 본체(#drawer)도 --ws-rail-bg 를 쓴다(남색 고정 금지)', () => {
  const css = read('public/wolko-site.css');
  assert.match(css, /body > aside:not\(\.apanel\), #drawer \{ background: var\(--ws-rail-bg, var\(--ws-navy\)\) !important/);
});

test('루미: 여러 줄 입력칸(3줄)·닫기 하나(최소화 막대 없음)·되묻기 선택지', () => {
  const js = read('public/portal/campteam/assistant.js'), css = read('public/portal/campteam/assistant.css');
  assert.ok(js.includes('<textarea id="asstIn"'));
  assert.ok(!js.includes('id="asstMin"'), '최소화 막대는 없고 닫기 하나만 둔다');
  assert.ok(js.includes('data-qo=') && js.includes('data-qc=') && js.includes('data-ps='), '담당자·캠프 선택과 건너뛰기');
  assert.match(css, /\.asst-form textarea\{max-height:92px\}/);
});
