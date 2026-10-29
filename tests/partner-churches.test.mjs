import test from 'node:test';
import assert from 'node:assert/strict';
import { partnerChurchNames, loadPartnerChurches, PARTNER_CHURCH_KEY } from '../functions/lib/partnerChurches.js';
import { onRequestGet } from '../functions/api/partner-churches.js';

const records = {
  a: { churchName: '평택중앙교회', pastorName: '김 목사', phone: '010-0000-0000', stepsVersion: 3, steps: { 1: true } },
  b: { churchName: '  소망  교회 ', stepsVersion: 3, steps: { 2: true, 3: true } },
  c: { churchName: '접촉만 한 교회', stepsVersion: 3, steps: {} },
  d: { churchName: '단계 없음 교회' },
  e: { churchName: '평택중앙교회', stepsVersion: 3, steps: { 4: true } },
  f: { churchName: '', stepsVersion: 3, steps: { 1: true } },
  g: { churchName: 'Mission Baptist Church', stepsVersion: 3, steps: { 1: ['x'] } },
};

function env(extra = {}) {
  const store = new Map();
  const CAMP_KV = { async get(k, t) { const v = store.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { store.set(k, v); } };
  return { store, env: { CAMP_KV, ...extra } };
}

test('협력 교회 이름: 진행 단계가 있는 교회만, 이름만, 중복 없이 가나다순(영문은 뒤)', () => {
  const names = partnerChurchNames(records);
  assert.deepEqual(names, ['소망 교회', '평택중앙교회', 'Mission Baptist Church']);
  assert.equal(JSON.stringify(names).includes('김 목사') || JSON.stringify(names).includes('010'), false);
  assert.deepEqual(partnerChurchNames(null), []);
});

test('협력 교회 API: CRS 연결이 없으면 빈 목록, 저장된 목록이 있으면 그대로(로그인 없이)', async () => {
  const none = env();
  assert.equal(await loadPartnerChurches(none.env), null);
  const res = await onRequestGet({ env: none.env });
  assert.deepEqual(await res.json(), { churches: [] });
  assert.equal(res.headers.get('cache-control'), 'no-store');

  const cached = env(); cached.store.set(PARTNER_CHURCH_KEY, JSON.stringify({ names: ['소망 교회'] }));
  const ok = await onRequestGet({ env: cached.env });
  assert.deepEqual(await ok.json(), { churches: ['소망 교회'] });
  assert.match(ok.headers.get('cache-control'), /public/);
});

test('협력 교회 API: CRS 에서 읽은 뒤 저장하고, 읽기에 실패하면 빈 목록', async () => {
  const realFetch = globalThis.fetch;
  const { privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const pem = '-----BEGIN PRIVATE KEY-----\n' + Buffer.from(await crypto.subtle.exportKey('pkcs8', privateKey)).toString('base64') + '\n-----END PRIVATE KEY-----';
  const account = JSON.stringify({ client_email: 'x@y.iam.gserviceaccount.com', private_key: pem });
  let crsCalls = 0, fail = false;
  globalThis.fetch = async url => {
    if (String(url).includes('oauth2.googleapis.com')) return Response.json({ access_token: 't' });
    crsCalls++;
    return fail ? new Response('no', { status: 500 }) : Response.json(records);
  };
  try {
    const { env: e, store } = env({ FIREBASE_CRS_SERVICE_ACCOUNT: account });
    const first = await (await onRequestGet({ env: e })).json();
    assert.deepEqual(first.churches, ['소망 교회', '평택중앙교회', 'Mission Baptist Church']);
    await onRequestGet({ env: e });
    assert.equal(crsCalls, 1, '두 번째는 저장된 목록을 쓴다');
    assert.ok(store.has(PARTNER_CHURCH_KEY));
    const broken = env({ FIREBASE_CRS_SERVICE_ACCOUNT: account }); fail = true;
    const out = await onRequestGet({ env: broken.env });
    assert.deepEqual(await out.json(), { churches: [] }); assert.equal(out.status, 200);
  } finally { globalThis.fetch = realFetch; }
});

test('협력 교회 이름: 영문을 괄호로 병기한 긴 이름이 중간에서 잘리지 않는다', () => {
  const long = '평택대광교회 글로벌디사이플센터 (Global Disciple Center - Pyeongtaek Daekwang Church)';
  assert.ok(long.length > 60);
  const names = partnerChurchNames({ a: { churchName: long, stepsVersion: 3, steps: { 1: true } }, b: { churchName: 'x'.repeat(300), stepsVersion: 3, steps: { 1: true } } });
  assert.ok(names.includes(long), '60자를 넘어도 그대로');
  assert.ok(names.every(n => n.length <= 120), '너무 긴 값은 120자에서 자른다');
});

test('협력 교회 화면 CSS: 중괄호가 짝이 맞고, 색 점이 없다', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/partner-churches.css', import.meta.url), 'utf8');
  let depth = 0;
  for (const ch of css) { depth += (ch === '{') - (ch === '}'); assert.ok(depth >= 0); }
  assert.equal(depth, 0, '중괄호가 하나 빠지면 그 뒤 규칙이 전부 무시된다');
  const js = readFileSync(new URL('../public/partner-churches.js', import.meta.url), 'utf8');
  assert.doesNotMatch(css + js, /pc-dot|pc-strip-dots/);
});

test('히어로 아래 띠: 글자는 단색이고, 숫자가 올라가도 줄 폭이 변하지 않는다(Safari 에서 글자가 비어 보이던 문제)', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../public/partner-churches.css', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../public/partner-churches.js', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /background-clip\s*:\s*text/, '글자를 배경으로 오려 칠하지 않는다');
  assert.doesNotMatch(css, /text-fill-color\s*:\s*transparent/, '글자를 투명하게 두지 않는다');
  assert.match(css, /\.pc-strip-text b \{[^}]*display:\s*inline-block/, '숫자 칸은 폭이 고정되는 inline-block');
  assert.match(js, /e\.style\.minWidth = String\(to\)\.length \+ 'ch'/, '숫자 자릿수만큼 폭을 먼저 잡는다');
  assert.match(css, /animation: pc-rise [^;]*backwards/, '들어오는 효과가 끝나면 풀린다(both 를 쓰면 끝난 뒤에도 레이어가 남는다)');
  assert.doesNotMatch(css, /pc-strip-link::before/, '글자 뒤에서 움직이는 별도 요소를 두지 않는다');
  // 움직임은 글자와 겹치지 않는 별도 요소(점·가장자리 선)로만, transform·opacity 만 쓴다
  assert.match(css, /\.pc-strip-live::after \{[^}]*animation: pc-ping/);
  assert.match(css, /@keyframes pc-ping \{[^}]*transform: scale[^}]*opacity/);
  assert.match(css, /\.pc-strip:not\(\[hidden\]\)::after \{[^}]*animation: pc-travel/);
  const html = readFileSync(new URL('../src/pages/index.astro', import.meta.url), 'utf8');
  assert.match(html, /<span class="pc-strip-live" aria-hidden="true"><\/span>\s*<span class="pc-strip-text">/, '점은 글자 칸 밖에 있다');
  assert.match(css, /prefers-reduced-motion: reduce\) \{[^}]*pc-strip-live::after/, '모션 줄이기에서는 꺼진다');
  // 숫자 톡 — 다 올라간 뒤에만, 크기(transform)만 바꾼다
  assert.match(css, /\.pc-strip\.is-counted \.pc-strip-text b \{[^}]*animation: pc-pop/);
  assert.doesNotMatch(css.match(/@keyframes pc-pop \{[^]*?\n/)[0], /width|margin|padding|font-size|top|left/, '배치를 바꾸는 값은 쓰지 않는다');
  assert.match(js, /classList\.add\('is-counted'\)/, '숫자가 다 올라가면 표시한다');
  assert.match(js, /if \(still\) \{ if \(!reduce\)/, '모션 줄이기에서는 표시하지 않는다');
});
