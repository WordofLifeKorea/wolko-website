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

test('협력 교회 지역: 시/군/구가 있으면 그것, 없으면 시/도를 짧게 — 연락처·주소·목사님은 나가지 않는다', async () => {
  const { partnerChurchAreas, loadPartnerChurchData } = await import('../functions/lib/partnerChurches.js');
  const areas = partnerChurchAreas({
    a: { churchName: '평택중앙교회', region: '경기도', district: '평택시', detailAddress: '비공개로 12', pastorPhone: '010-1', stepsVersion: 3, steps: { 1: true } },
    b: { churchName: '제주열방교회', region: '제주특별자치도', stepsVersion: 3, steps: { 1: true } },
    c: { churchName: '지역 모름 교회', stepsVersion: 3, steps: { 1: true } },
    d: { churchName: '단계 없는 교회', region: '서울특별시', district: '강남구' },
    e: { churchName: '평택중앙교회', region: '서울특별시', district: '강남구', stepsVersion: 3, steps: { 2: true } },
  });
  assert.deepEqual(areas, { '평택중앙교회': '평택시', '제주열방교회': '제주' });
  assert.equal(JSON.stringify(areas).includes('비공개') || JSON.stringify(areas).includes('010'), false);
  // 이름만 있는 예전 저장값 + CRS 연결 없음 → 이름만 돌려준다 / 지역까지 저장돼 있으면 지역도
  const old = env(); old.store.set(PARTNER_CHURCH_KEY, JSON.stringify({ names: ['소망 교회'] }));
  assert.deepEqual(await loadPartnerChurchData(old.env), { names: ['소망 교회'] });
  const fresh = env(); fresh.store.set(PARTNER_CHURCH_KEY, JSON.stringify({ names: ['소망 교회'], areas: { '소망 교회': '평택시' } }));
  const res = await (await onRequestGet({ env: fresh.env })).json();
  assert.deepEqual(res, { churches: ['소망 교회'], areas: { '소망 교회': '평택시' } });
});
