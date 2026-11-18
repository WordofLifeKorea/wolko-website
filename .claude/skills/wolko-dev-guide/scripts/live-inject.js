#!/usr/bin/env node
/*
 * Preview a local public/*.js change on the live wolko.org page: load the real page, remove fixed popups
 * (event invitations etc.), inject the local script, screenshot.
 *
 * node live-inject.js --repo <repo> --path / --inject public/wolko-season.js [--width 1366] [--height 820]
 *   [--out shot.png] [--session '{"key":"value"}'] [--wait 3000] [--full]
 */
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');

const args = {}; for (let i = 2; i < process.argv.length; i++) { const k = process.argv[i]; if (!k.startsWith('--')) continue; const v = process.argv[i + 1]; if (v === undefined || v.startsWith('--')) args[k.slice(2)] = '1'; else { args[k.slice(2)] = v; i++; } }
const repo = path.resolve(args.repo || '.');
const width = +(args.width || 1366), height = +(args.height || 820);
const session = args.session ? JSON.parse(args.session) : {};
const code = args.inject ? fs.readFileSync(path.join(repo, args.inject), 'utf8') : '';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext(width <= 430 ? { ...devices['iPhone 13'], viewport: { width, height } } : { viewport: { width, height } });
  await ctx.addInitScript(s => { Object.entries(s).forEach(([k, v]) => { try { sessionStorage.setItem(k, v); } catch (e) {} }); }, session);
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e).slice(0, 200)));
  await page.goto('https://wolko.org' + (args.path || '/'), { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(1500);
  // close popups / overlays that cover the page
  await page.keyboard.press('Escape').catch(() => {});
  await page.evaluate(() => {
    document.querySelectorAll('body *').forEach(el => {
      const c = getComputedStyle(el);
      if (c.position === 'fixed' && +c.zIndex >= 1000 && !el.closest('nav, header')) el.remove();
    });
    document.documentElement.style.overflow = ''; document.body.style.overflow = '';
    document.documentElement.classList.remove('wl-scroll-locked');
  });
  if (code) await page.addScriptTag({ content: code });
  await page.waitForTimeout(+(args.wait || 3000));
  if (args.out) await page.screenshot({ path: args.out, fullPage: !!args.full });
  console.log(JSON.stringify({ url: page.url(), errors }));
  await browser.close();
})();
