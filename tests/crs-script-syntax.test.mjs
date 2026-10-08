import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

test('CRS inline scripts parse before login and rendering', () => {
  const page = readFileSync(new URL('../src/pages/crs/index.astro', import.meta.url), 'utf8');
  const scripts = [...page.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].filter(m => m[2].trim());
  assert.ok(scripts.length > 0);
  for (const [, attrs, code] of scripts) {
    const args = ['--check', ...(attrs.includes('type="module"') ? ['--input-type=module'] : [])];
    const result = spawnSync(process.execPath, args, { input: code, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  }
});
