// 페이지 안에 직접 쓴 스크립트(<script is:inline>)가 문법 오류 없이 읽히는지 확인한다.
// 영어 문구의 따옴표 하나(today's)로 경비 리포트 스크립트 전체가 멈춘 일이 있었다(2026-11).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : p.endsWith('.astro') ? [p] : [];
  });
}

const files = [...walk('src/pages'), ...walk('src/layouts'), ...walk('src/components')];

test('직접 쓴 스크립트는 모두 문법 오류 없이 읽힌다', () => {
  const bad = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
      const attrs = m[1];
      if (!/\bis:inline\b/.test(attrs) || /\bsrc=|type="application\/(ld\+)?json"|define:vars|set:html/.test(attrs)) continue;
      try { new vm.Script(m[2], { filename: f }); }
      catch (e) { bad.push(f + ': ' + e.message); }
    }
  }
  assert.deepEqual(bad, []);
});
