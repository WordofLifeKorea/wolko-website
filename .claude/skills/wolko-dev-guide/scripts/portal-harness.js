#!/usr/bin/env node
/*
 * Render a WOLKO portal .astro page locally (no build): strips the frontmatter, serves public/ files,
 * mocks /api/* from a JSON file, and fakes a logged-in portal session.
 *
 * node portal-harness.js --repo <repo> --page src/pages/portal.astro --url /portal [--mocks mocks.json]
 *   [--width 390] [--height 900] [--out shot.png] [--session '{"key":"value"}'] [--click '#selector']
 *   [--wait 3000] [--role admin] [--lang ko|en] [--full]
 * Prints one JSON line: the final URL and any page errors.
 */
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');

const args = {}; for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i]; if (!k.startsWith('--')) continue; const v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) args[k.slice(2)] = '1'; else { args[k.slice(2)] = v; i++; } }
const repo = path.resolve(args.repo || '.');
if (!args.page) { console.error('need --page src/pages/<file>.astro'); process.exit(1); }
const pageUrl = args.url || '/' + args.page.replace(/^src\/pages\//, '').replace(/\/?index\.astro$|\.astro$/, '');
const html = fs.readFileSync(path.join(repo, args.page), 'utf8')
  .replace(/^---[\s\S]*?---\n/, '')              // Astro frontmatter
  .replace(/ is:inline/g, '')                    // Astro directive
  .replace(/\{[A-Za-z_$][\w.$]*\}/g, '');        // simple {expr} placeholders
const mocks = args.mocks ? JSON.parse(fs.readFileSync(args.mocks, 'utf8')) : {};
const session = args.session ? JSON.parse(args.session) : {};
const width = +(args.width || 1280), height = +(args.height || 900);
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.json': 'application/json' };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(width <= 430 ? { ...devices['iPhone 13'], viewport: { width, height } } : { viewport: { width, height } });
  const role = args.role || 'admin', lang = args.lang || 'ko';
  await ctx.addInitScript(([role, lang, session]) => {
    const tok = btoa('wolko-hub:test@example.com:' + role + ':' + (Date.now() + 864e5) + ':sig');
    sessionStorage.setItem('wolko-hub-token', tok); sessionStorage.setItem('wolko-hub-email', 'test@example.com'); sessionStorage.setItem('wolko-hub-role', role);
    try { localStorage.setItem('wolkoCarLang', lang); sessionStorage.setItem('wolko-lang-choice', lang); } catch (e) {}
    Object.entries(session).forEach(([k, v]) => sessionStorage.setItem(k, v));
  }, [role, lang, session]);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.route('**/*', route => {
    const u = new URL(route.request().url());
    if (u.hostname !== 'wolko.test') return route.abort();
    if (u.pathname.replace(/\/$/, '') === pageUrl.replace(/\/$/, '')) return route.fulfill({ contentType: 'text/html', body: html });
    if (u.pathname.startsWith('/api/')) {
      const key = Object.keys(mocks).sort((a, b) => b.length - a.length).find(k => u.pathname.startsWith(k));
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(key ? mocks[key] : {}) });
    }
    const f = path.join(repo, 'public', decodeURIComponent(u.pathname));
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return route.fulfill({ contentType: TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', body: fs.readFileSync(f) });
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('http://wolko.test' + pageUrl);
  await page.waitForTimeout(+(args.wait || 3000));
  if (args.click) { await page.click(args.click).catch(e => errors.push('click: ' + e.message.split('\n')[0])); await page.waitForTimeout(500); }
  if (args.out) await page.screenshot({ path: args.out, fullPage: !!args.full });
  console.log(JSON.stringify({ url: page.url(), errors }));
  await browser.close();
})();
