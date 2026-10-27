#!/usr/bin/env node
// 배포 전 자동 점검 (읽기 전용 — 아무것도 올리거나 바꾸지 않습니다)
//   실행: node camp-team/dev/predeploy-check.mjs [--skip-build]
// 확인 항목:
//  1) 기준 커밋 대비 "추가된 파일"만 있는지 (기존 파일 수정/삭제 0건)
//  2) 루트 wrangler.toml 이 없는지 (있으면 Pages 대시보드 설정을 덮어씀)
//  3) 개발용 로그인 우회가 배포 소스에 섞이지 않았는지
//  4) 실제 인명·내부 문구·비밀값이 저장소 파일에 없는지
//  5) 자동 테스트 전부 통과
//  6) 빌드 결과에 캠프팀/TV 페이지가 생기는지 (임시 폴더에 빌드)
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const BASE = '24fd01ed'; // 이 작업을 시작한 원본 커밋
const skipBuild = process.argv.includes('--skip-build');
const sh = (cmd, args) => execFileSync(cmd, args, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });

let failed = 0;
const ok = (m) => console.log('  ✅ ' + m);
const bad = (m) => { failed++; console.log('  ❌ ' + m); };
const head = (m) => console.log('\n■ ' + m);

// ── 1) 기존 파일 보호 ────────────────────────────────────────
head('1. 기존 파일은 그대로인가 (기준 ' + BASE + ' 대비)');
{
  const lines = sh('git', ['diff', '--name-status', BASE, 'HEAD']).split('\n').filter(Boolean);
  const notAdded = lines.filter((l) => !l.startsWith('A\t'));
  const added = lines.length - notAdded.length;
  if (notAdded.length) bad('추가가 아닌 변경 ' + notAdded.length + '건:\n      ' + notAdded.join('\n      '));
  else ok('커밋된 변경은 전부 "새 파일 추가" ' + added + '개 (수정·삭제 0)');
  const inNm = lines.filter((l) => /\tnode_modules\//.test(l));
  if (inNm.length) bad('node_modules 가 커밋에 섞임 ' + inNm.length + '건');
  // 아직 커밋 안 된 추적 파일 변경(node_modules 제외)
  const dirty = sh('git', ['status', '--porcelain']).split('\n').filter(Boolean)
    .filter((l) => !/ node_modules\//.test(l) && !/^\?\?/.test(l));
  if (dirty.length) bad('커밋 안 된 변경:\n      ' + dirty.join('\n      '));
  else ok('커밋 안 된 추적 파일 변경 없음 (node_modules 의 맥용 도구 설치분 제외)');
}

// ── 2) 루트 wrangler.toml ────────────────────────────────────
head('2. 루트 wrangler.toml 없음');
existsSync(join(root, 'wrangler.toml')) || existsSync(join(root, 'wrangler.jsonc'))
  ? bad('루트에 wrangler 설정 파일이 있습니다 (Pages 대시보드 설정을 덮어쓸 수 있음)')
  : ok('없음 (로컬용 설정은 camp-team/dev/ 안에만 있음)');

// ── 3) 개발용 우회 ───────────────────────────────────────────
head('3. 개발용 로그인 우회가 배포 소스에 없음');
{
  const files = sh('git', ['ls-files', 'functions', 'src', 'public']).split('\n').filter(Boolean);
  const hits = [];
  for (const f of files) {
    if (!/\.(js|mjs|astro|html|ts)$/.test(f)) continue;
    const t = readFileSync(join(root, f), 'utf8');
    if (/CAMPTEAM_DEV_AUTH/.test(t) && f !== 'functions/lib/campteamAuth.js') hits.push(f + ' (CAMPTEAM_DEV_AUTH)');
    // 로그인 안내창의 "시험용 로그인" 링크는 로컬/내부망 주소에서만 보이도록 막혀 있으므로 이 파일 한 곳만 허용
    if (/dev-login/.test(t) && !f.startsWith('public/dev-login') && f !== 'public/portal/campteam/campteam.js') hits.push(f + ' (dev-login)');
    if (f === 'public/portal/campteam/campteam.js' && /dev-login/.test(t) && !/location\.hostname/.test(t)) hits.push(f + ' (dev-login 링크에 로컬 주소 제한이 없음)');
  }
  const auth = readFileSync(join(root, 'functions/lib/campteamAuth.js'), 'utf8');
  if (!/localhost|127\.0\.0\.1/.test(auth)) hits.push('campteamAuth.js: 로컬 호스트 제한 코드가 안 보임');
  hits.length ? bad('확인 필요:\n      ' + hits.join('\n      '))
    : ok('우회 코드는 campteamAuth.js 한 곳에만 있고, 로컬/내부망 주소에서만 동작하도록 제한됨');
  const dl = ['public/dev-login', 'dist/dev-login'].filter((p) => existsSync(join(root, p)));
  const tracked = sh('git', ['ls-files', 'public/dev-login']).trim();
  tracked ? bad('public/dev-login 이 git 에 들어 있음') : ok('dev-login 페이지는 git 에 없음 (필요할 때 make-dev-login.mjs 로 임시 생성)');
  void dl;
}

// ── 3b) 기존 저장소(CAMP_KV)에는 쓰지 않는다 ──────────────────
head('3b. 기존 저장소(CAMP_KV·경비 리포트)에 쓰기·삭제 코드가 없음');
{
  const files = sh('git', ['ls-files', 'functions/lib', 'functions/api/campteam']).split('\n').filter((f) => /campteam/.test(f) && f.endsWith('.js'));
  const hits = [];
  for (const f of files) {
    const t = readFileSync(join(root, f), 'utf8');
    if (!/CAMP_KV|\bkv\b/.test(t)) continue;
    if (/(CAMP_KV|\bkv)\s*\.\s*(put|delete)\s*\(/.test(t)) hits.push(f + ' (put/delete)');
  }
  hits.length ? bad('쓰기·삭제가 의심되는 코드:\n      ' + hits.join('\n      ')) : ok('캠프팀 코드에서 CAMP_KV 를 읽기(get/list)만 함 (' + files.length + '개 파일 검사)');
}

// ── 4) 금지 문구·비밀값 ─────────────────────────────────────
head('4. 실제 이름·내부 문구·비밀값 검사 (추적 파일 전체, 테스트·검사 스크립트 제외)');
{
  const names = [/\b(Ella|Jason|Aiden|Niki)\b/, /Somyeong/, /Tourism High School/, /deaconess/i,
    /2027 PURE/, /Priceless Unblemished/];
  const secrets = [/sk-ant-[A-Za-z0-9_-]{10,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /AIza[0-9A-Za-z_-]{30,}/,
    /ghp_[A-Za-z0-9]{30,}/, /"private_key"\s*:/];
  const files = sh('git', ['ls-files', '-z']).split('\0').filter(Boolean)
    .filter((f) => !f.startsWith('node_modules/') && !/\.(png|jpe?g|gif|webp|ico|woff2?|pdf|zip|mp4)$/i.test(f))
    .filter((f) => f !== 'camp-team/dev/predeploy-check.mjs');
  // 원본 저장소에 이미 있던 파일은 이 작업의 책임이 아니므로, 새로 추가한 파일만 본다
  const added = new Set(sh('git', ['diff', '--name-only', '--diff-filter=A', BASE, 'HEAD']).split('\n').filter(Boolean));
  const hits = [];
  for (const f of files) {
    if (!added.has(f)) continue;
    let t; try { t = readFileSync(join(root, f), 'utf8'); } catch { continue; }
    const testFile = f.startsWith('tests/');
    for (const re of names) if (re.test(t)) hits.push(f + '  ← 이름/문구 ' + re);
    if (!testFile) for (const re of secrets) if (re.test(t)) hits.push(f + '  ← 비밀값 의심 ' + re);
  }
  hits.length ? bad('발견 ' + hits.length + '건:\n      ' + hits.join('\n      '))
    : ok('새로 추가한 파일에서 실제 인명·내부 문구·비밀값 의심 문자열 없음');
  // 재정/팀원 이메일이 코드에 박혀 있지 않은지: 고정 관리자 2명 외 이메일 주소
  const mail = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
  const allowed = new Set(['aidenpark@wolko.org', 'hkim3@wol.org', 'hub@wolko.org']); // hub@ 는 기존 포털이 이미 코드에 쓰는 시스템 발신 주소(개인 주소 아님)
  const extra = [];
  for (const f of files) {
    if (!added.has(f) || f.startsWith('tests/') || f.startsWith('camp-team/db/seed')) continue;
    let t; try { t = readFileSync(join(root, f), 'utf8'); } catch { continue; }
    for (const m of t.match(mail) || []) {
      if (allowed.has(m.toLowerCase()) || /@(example\.(com|org)|wolko\.test|test\.invalid|placeholder\.invalid)$/i.test(m) || /^(test-[a-z]+|name)@wolko\.org$/i.test(m)) continue;
      if (/@(2x|3x)\./.test(m)) continue; // 이미지 파일명(@2x.png) 오탐 방지
      extra.push(f + ' → ' + m);
    }
  }
  extra.length ? bad('코드/문서에 실제 이메일로 보이는 주소:\n      ' + extra.join('\n      '))
    : ok('고정 관리자 2명 외 실제 이메일 주소 없음 (더미 시드·테스트 제외)');
}

// ── 5) 자동 테스트 ───────────────────────────────────────────
head('5. 자동 테스트');
{
  const run = (files) => {
    const r = spawnSync('node', ['--test', ...files], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 26 });
    const out = (r.stdout || '') + (r.stderr || '');
    return { status: r.status, pass: (out.match(/^(?:#|ℹ) pass (\d+)/m) || [])[1], fail: (out.match(/^(?:#|ℹ) fail (\d+)/m) || [])[1], out };
  };
  const all = readdirSync(join(root, 'tests')).filter((f) => f.endsWith('.test.mjs')).map((f) => 'tests/' + f);
  const mine = all.filter((f) => f.startsWith('tests/campteam-'));
  const theirs = all.filter((f) => !f.startsWith('tests/campteam-'));
  const a = run(mine);
  a.status === 0 ? ok('캠프팀 테스트 통과 ' + a.pass + '개 / 실패 ' + a.fail + '개')
    : bad('캠프팀 테스트 실패 (통과 ' + a.pass + ', 실패 ' + a.fail + ')\n' + a.out.split('\n').slice(-30).join('\n'));
  // 원래 있던 테스트는 참고용: 이 작업이 건드리지 않은 파일을 검사하므로, 실패해도 이 작업의 책임이 아님
  const b = run(theirs);
  console.log('  ℹ️  기존(원본) 테스트 ' + theirs.length + '개 파일: 통과 ' + b.pass + ' / 실패 ' + b.fail + (b.status === 0 ? '' : ' (원본 코드 쪽 문제, 이 작업과 무관 — 참고용)'));
}

// ── 6) 빌드 ─────────────────────────────────────────────────
head('6. 빌드 결과 (임시 폴더에 생성, 끝나면 삭제)');
if (skipBuild) console.log('  (건너뜀: --skip-build)');
else {
  const out = mkdtempSync(join(tmpdir(), 'campteam-build-'));
  const r = spawnSync('node', ['node_modules/astro/astro.js', 'build', '--outDir', out], { cwd: root, encoding: 'utf8', timeout: 480000, maxBuffer: 1 << 26 });
  if (r.status !== 0) bad('빌드 실패\n' + ((r.stdout || '') + (r.stderr || '')).split('\n').slice(-25).join('\n'));
  else {
    const need = ['campteam/index.html', 'campteam/camps/index.html', 'campteam/tasks/index.html', 'campteam/meetings/index.html',
      'campteam/files/index.html', 'campteam/resources/index.html', 'campteam/budget/index.html', 'campteam/finance/index.html', 'campteam/tv/index.html', 'campteam/space/index.html', 'tv/index.html'];
    const miss = need.filter((p) => !existsSync(join(out, p)));
    miss.length ? bad('빌드 결과에 없음: ' + miss.join(', ')) : ok('캠프팀 페이지 ' + need.length + '개 생성 확인');
    if (existsSync(join(out, 'dev-login'))) bad('빌드 결과에 dev-login 이 들어 있음');
  }
  rmSync(out, { recursive: true, force: true });
}

console.log('\n' + (failed ? '❌ 점검 실패 ' + failed + '건 — 위 내용을 확인하세요.' : '✅ 모든 점검 통과 (배포는 하지 않았습니다).'));
process.exit(failed ? 1 : 0);
