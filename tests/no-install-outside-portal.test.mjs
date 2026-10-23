import assert from 'node:assert/strict';
import test from 'node:test';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url).pathname;
const pages = ['src/pages/portal/car/index.astro', 'src/pages/portal/wolkoadmin.astro', 'src/pages/portal/camp-resources/index.astro', 'src/pages/portal/crs/index.astro', 'src/pages/portal/campstaff/index.astro'];

test('앱 설치 기능은 포탈 첫 화면에만 있다 (다른 페이지는 manifest · 설치용 메타 · 서비스워커 등록이 없다)', () => {
  for (const p of pages) {
    const s = readFileSync(root + p, 'utf8');
    assert.doesNotMatch(s, /rel="manifest"/, p);
    assert.doesNotMatch(s, /apple-mobile-web-app|mobile-web-app-capable/, p);
    assert.doesNotMatch(s, /serviceWorker\.register/, p);
  }
  for (const m of ['car', 'crs', 'admin', 'campstaff', 'camp-resources']) assert.equal(existsSync(`${root}public/${m}-manifest.json`), false, m);
  assert.match(readFileSync(root + 'src/pages/portal.astro', 'utf8'), /rel="manifest" href="\/portal-manifest\.json"/);
});
