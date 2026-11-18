---
name: wolko-dev-guide
description: Working guide for the WOLKO (Word of Life Korea) website and staff portal repo (wordoflifekorea/wolko-website, Astro + Cloudflare Pages Functions, KV and D1). Use whenever you work in that repo — before changing camp data, portal pages, shared portal scripts or styles, the gospel stats page, or anything you need to preview — and whenever the user mentions 월코, WOLKO, wolko.org, 포탈, 캠프 신청, 캠프팀, 복음 통계, 주방 보조, or 차량. Covers where things live, the gotchas that broke things before, how to preview pages without a build (scripts included), and how the owner wants work reported.
---

# WOLKO website & portal — working guide

Read the repo's `AGENTS.md` first. Its design and workflow rules are binding. This guide adds what was learned while working in the repo.

## How the owner wants to work

- **Language.** Report in Korean, in plain words a non-developer can follow. Lead with what changed for people, not file names. Code comments in the repo are written in Korean too.
- **Two-person review.** Every code change goes to a separate reviewer agent before it reaches `main`. Use the `two-person-review` skill. Pure content or number edits skip review.
- **Ship it.** When a change is done, reviewed and its tests pass, push to the working branch and fast-forward `main`. Fetch `origin/main` first, merge if it moved, and never force-push.
  - Automated GitHub Actions commit to `main`, for example "chore: update camp registration status [automated]" from `.github/workflows/auto-open-camps.yml`, so a merge is often needed.
- **Tests.** Run `node --test tests/*.mjs`. One failure is known and pre-existing: "공지 담당 계정(esooy) …" in `tests/portal-dashboard.test.mjs`. Say so instead of hiding it.
- **Design rules from AGENTS.md:**
  - No left accent stripes.
  - No leading dot or pill labels.
  - Quotes in upright, high-contrast type.
  - Adjacent badges and buttons share height, padding, radius and type.
  - The site radius token is `var(--ws-radius-sm, 8px)`.

## Where things live

| Thing | Where |
|---|---|
| Public pages | `src/pages/**`. Most use `src/layouts/BaseLayout.astro`. |
| Portal home | `src/pages/portal.astro` with `public/hub.css`, `public/hub-sky.css` and `public/hub-sky.js`. |
| Portal tool pages | `src/pages/portal/<tool>/index.astro`. Standalone HTML, each loading `public/wolko-rail.js` (side menu, header chip, access). |
| Shared portal scripts | `public/wolko-rail.js` injects shared extras (access, season decoration). Add new cross-portal features there, not in each page. |
| Camp cards and capacity | `src/content/camp_schedules/<campId>.json` (`capacity`, `status`, `open_date`, prices). |
| Registration windows, age ranges, gender caps, winter and unity pricing | `functions/lib/winterCampPolicy.js` (`REGISTRATION_WINDOWS`, `BIRTH_YEAR_RANGES`, `GENDER_CAPACITY`, `UNITY_CAMP_POLICY`). Tests assert these windows. |
| Camp registration API | `functions/api/register.js`. Counters live in `CAMP_KV` under `camp:<id>:submissions`. |
| Camp team portal (separate D1 database "wolko-camp-team") | `functions/api/campteam/*`, seeds in `camp-team/deploy/*.sql`. |
| Applicant admin list | `src/pages/portal/wolkoadmin.astro`. Group vs individual detail panels are built separately. |
| Gospel stats | `functions/lib/gospelStats.js` (fields), `functions/api/portal/gospel-stats.js` (API), `public/gospel-stats.js` (page), `public/gospel-charts.js` (charts), `functions/lib/gospelGoals.js` and `public/gospel-goals.js` (yearly reach goals). |
| Kitchen duty | `public/kitchen.js` and `public/kitchen.css`, on top of `public/car-drive.css`. API in `functions/api/kitchen/*`. |
| Season decoration | `public/wolko-season.js`. Christmas runs Dec 1–26 KST. Preview with `?season=christmas`, turn off with `?season=off`. Add new seasons here. |

## Gotchas that bit before

1. **A camp capacity lives in three places.** Change all of them:
   - the camp JSON, which registration uses,
   - `camp-team/deploy/defaults-camps.sql`, which only seeds new databases (`INSERT … WHERE NOT EXISTS`),
   - the live D1 row in "wolko-camp-team", which the camp team TV and portal read: `UPDATE camps SET capacity=… WHERE registrationCampId='<campId>'`. Use the Cloudflare D1 tools; find the database with `d1_databases_list`. Check the row before you update it.
2. **Cache-busting.** Pages load assets as `/file.js?v=N`. After editing anything in `public/`, bump `?v=` in every page that references it, for example:
   ```bash
   grep -rl "wolko-rail.js?v=52" src | xargs sed -i 's#wolko-rail.js?v=52#wolko-rail.js?v=53#'
   ```
   Otherwise users keep the old file.
3. **Tests that read live JSON break when automation flips a camp's status.** Write such tests against a fixture copy of the data, not the current file.
4. **Removing markup breaks tests that assert it**, for example `tests/portal-layout.test.mjs`. Grep `tests/` for removed class names before pushing.
5. **Async UI in portal pages.** One shared pending promise per resource. Drop stale results after `clearCache()` by checking a generation counter. Never re-fetch in a loop after a 401. Clear failure flags after logging in again. All of these were real bugs.
6. **Narrow slots.** The portal's 7-day desktop grids give slots only about 110–130px, and English labels are longer. Use container queries (`container: x / inline-size`) and test both languages.
7. **`npm run build` / `astro build` fails in the cloud sandbox** because the native rollup module is missing. Preview with the harnesses below instead.
8. **`functions/api/register.js` trusted a `capacity` sent by the client.** If that is still open, don't rely on it.

## Previewing pages without a build

Use Playwright: `require('playwright')`; `chromium.launch()` needs no options in the sandbox. Two scripts are in `scripts/`:

- **`scripts/portal-harness.js`** renders a local `.astro` portal page. It strips the frontmatter, serves `public/` files, mocks `/api/*` from a JSON file and fakes a portal login.
  ```bash
  node scripts/portal-harness.js --repo /path/to/wolko-website --page src/pages/portal.astro --url /portal \
    --mocks mocks.json --width 390 --out shot.png [--session '{"wolko-season-preview":"christmas"}'] [--click '#hubBell']
  ```
  - `mocks.json` maps a path prefix to a JSON body: `{ "/api/portal/dashboard": {...}, "/api/hub/me": {...} }`. Unmocked `/api/*` routes return `{}`.
  - The portal accepts a token shaped like `btoa('wolko-hub:<email>:<role>:<expiresMs>:sig')` in `sessionStorage['wolko-hub-token']`. The harness sets it for you.
  - Missing mock fields can throw page errors in unrelated cards. Add only the fields the part you check needs.
- **`scripts/live-inject.js`** loads the live https://wolko.org page, removes fixed popups (for example event invitations) and injects one local `public/*.js` file. It is the quickest way to preview a public-page script change with real content.
  ```bash
  node scripts/live-inject.js --repo /path/to/wolko-website --path / --inject public/wolko-season.js --width 1366 --out home.png \
    [--session '{"wolko-season-preview":"christmas"}']
  ```

Always look at both a phone (390px) and a desktop width. Use the `web-ui-verification` skill for overflow, contrast and date-logic checks.
