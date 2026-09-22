import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);
const read = path => readFile(new URL(path, root), 'utf8');

test('portal exposes an accessible PWA install action', async () => {
  const [page, css] = await Promise.all([
    read('src/pages/portal.astro'),
    read('public/hub.css'),
  ]);

  assert.match(page, /id="installAppBtn"[^>]+onclick="installPortalApp\(\)"[^>]+data-t-aria="installApp"/);
  assert.match(page, /addEventListener\('beforeinstallprompt'/);
  assert.match(page, /addEventListener\('appinstalled'/);
  assert.match(page, /navigator\.serviceWorker\.register\('\/portal-sw\.js', \{ scope: '\/portal\/' \}\)/);
  assert.match(page, /installHelpIOS/);
  assert.match(page, /installHelpSafari/);
  assert.match(css, /\.hub-install-button \{ width:36px;padding:0; \}/);
  assert.match(css, /\.hub-install-overlay\.hidden \{ display:none; \}/);
});

test('portal manifest and service worker meet install requirements', async () => {
  const [manifestText, worker, icon] = await Promise.all([
    read('public/portal-manifest.json'),
    read('public/portal-sw.js'),
    read('public/images/portal-icon.svg'),
  ]);
  const manifest = JSON.parse(manifestText);

  assert.equal(manifest.id, '/portal/');
  assert.equal(manifest.start_url, '/portal/');
  assert.equal(manifest.scope, '/portal/');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.icons[0].type, 'image/svg+xml');
  assert.match(manifest.icons[0].purpose, /maskable/);
  assert.match(worker, /const CACHE_NAME = 'wolko-portal-v1'/);
  assert.match(worker, /url\.pathname\.startsWith\('\/api\/'\)/);
  assert.match(icon, /viewBox="0 0 512 512"/);
});
