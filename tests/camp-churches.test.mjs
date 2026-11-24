import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { churchKey, churchMinimum, readChurches, recountChurches } from '../functions/lib/campChurches.js';
import { onRequestGet as capacity } from '../functions/api/capacity/[campId].js';

function kv() {
  const store = new Map();
  return { store, CAMP_KV: {
    get: async (k, t) => { const v = store.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); },
    put: async (k, v) => { store.set(k, v); },
    list: async ({ prefix }) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }),
  } };
}

test('연합캠프 참여 교회: 같은 교회는 한 번만(띄어쓰기 · 끝의 교회 무시), 스태프 · 빈 이름은 세지 않는다', async () => {
  const env = kv();
  const put = (id, reg) => env.store.set(`camp:2027-unity-winter:reg:${id}`, JSON.stringify(reg));
  put('a', { church: '시흥중앙교회' }); put('b', { church: '시흥 중앙' }); put('c', { church: '새빛교회' });
  put('d', { church: '', registrationType: 'group' }); put('e', { church: '다른교회', registrationType: 'staff' });
  assert.equal(churchKey(' 시흥 중앙 교회 '), churchKey('시흥중앙'));
  assert.equal((await recountChurches(env, '2027-unity-winter')).count, 2);
  assert.equal((await readChurches(env, '2027-unity-winter')).count, 2);
  assert.deepEqual(churchMinimum('2027-unity-winter'), { min: 3, by: '2026-12-18' });
  assert.equal(churchMinimum('2027-wolko-winter'), null);
  const res = await capacity({ params: { campId: '2027-unity-winter' }, env });
  assert.equal((await res.json()).churches, 2);
  const other = await capacity({ params: { campId: '2027-wolko-winter' }, env });
  assert.equal((await other.json()).churches, undefined, '다른 캠프는 교회 수를 내보내지 않는다');
});

test('연합캠프 신청 카드: 신청 현황 위에 참여 교회와 진행 조건 안내', () => {
  const page = readFileSync(new URL('../src/pages/camp-register/index.astro', import.meta.url), 'utf8');
  assert.match(page, /class="crp-churches" data-church-id=\{s\.id\}/);
  assert.match(page, /까지 \$\{churchMinimum\(s\.id\)\.min\}개 교회 이상 참여 신청 시 캠프가 진행됩니다\./);
  assert.ok(page.indexOf('class="crp-churches"') < page.indexOf("const isLive = d.status === 'open' && !d.use_external_form;"), '정원(신청 현황)보다 위');
  const reg = readFileSync(new URL('../functions/api/register.js', import.meta.url), 'utf8');
  assert.match(reg, /recountChurches\(env, campId\)/, '신청할 때 다시 센다');
  const admin = readFileSync(new URL('../functions/api/admin/registrations.js', import.meta.url), 'utf8');
  assert.match(admin, /export const onRequestDelete = withChurchRecount\(onRequestDeleteBase\);/, '지우기 · 되살리기 · 고치기 뒤에도');
});
