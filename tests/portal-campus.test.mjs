import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDashboard, noticesForCampus, noticeAudience, noticesForWeek, recentChurches, parseNoticeInput, upcomingEvents } from '../functions/lib/portalDashboard.js';
import { campusOf } from '../functions/lib/campus.js';
import * as dashApi from '../functions/api/portal/dashboard.js';
import * as noticeApi from '../functions/api/portal/notices.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';

function kvEnv(initial = {}) {
  const store = new Map(Object.entries(initial).map(([k, v]) => [k, JSON.stringify(v)]));
  return { store, env: { ADMIN_PASSWORD: 'secret', CAMP_KV: {
    get: async (k, type) => { const v = store.get(k); if (v === undefined) return null; return type === 'json' ? JSON.parse(v) : v; },
    put: async (k, v) => { store.set(k, v); },
    delete: async k => { store.delete(k); },
    list: async ({ prefix }) => ({ keys: [...store.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }),
  } } };
}
const TODAY = '2026-10-28';
const NOW = Date.parse(`${TODAY}T03:00:00Z`);
const WEEK = '2026-10-26';   // TODAY(수)가 속한 주의 시작

test('소속: 가입 때 고른 캠퍼스를 따르고, 코드 예외가 먼저이며, 정보가 없으면 평택', async () => {
  const { env } = kvEnv({ 'hub:account:a@wol.org': { email: 'a@wol.org', campus: 'jeju', status: 'approved' }, 'hub:account:b@wol.org': { email: 'b@wol.org', campus: 'wolko', status: 'approved' }, 'hub:account:jeremyrodgers@wol.org': { email: 'jeremyrodgers@wol.org', campus: 'wolko', status: 'approved' } });
  assert.equal(await campusOf(env, { email: 'a@wol.org' }), 'jeju');
  assert.equal(await campusOf(env, { email: 'b@wol.org' }), 'wolko');
  assert.equal(await campusOf(env, { email: 'jeremyrodgers@wol.org' }), 'jeju', '코드로 정한 예외');
  assert.equal(await campusOf(env, { email: 'nobody@wol.org' }), 'wolko');
  assert.equal(await campusOf(env, {}), 'wolko');
});

test('공지 대상: 전체는 모두에게, 평택/제주는 그 소속에게만, 값이 없는 옛 공지는 평택', () => {
  const list = [{ id: '1', campus: 'all' }, { id: '2', campus: 'wolko' }, { id: '3', campus: 'jeju' }, { id: '4' }];
  assert.deepEqual(noticesForCampus(list, 'wolko').map(n => n.id), ['1', '2', '4']);
  assert.deepEqual(noticesForCampus(list, 'jeju').map(n => n.id), ['1', '3']);
  assert.equal(noticeAudience({}), 'wolko'); assert.equal(noticeAudience({ campus: 'mars' }), 'wolko');
  assert.equal(parseNoticeInput({ body: 'x', campus: 'jeju' }, TODAY).value.campus, 'jeju');
  assert.equal(parseNoticeInput({ body: 'x', campus: 'mars' }, TODAY).value.campus, undefined, '잘못된 대상은 무시(API 가 올린 사람 소속으로)');
});

test('교회 목록: 시/도가 제주인 교회는 제주 화면에, 나머지는 평택 화면에만', () => {
  const records = {
    a: { churchName: '평택교회', region: '경기도', updatedAt: 3 }, b: { churchName: '제주교회', region: '제주특별자치도', updatedAt: 2 },
    c: { churchName: '지역없음교회', updatedAt: 1 },
  };
  assert.deepEqual(recentChurches(records, 5, 'wolko').map(c => c.name), ['평택교회', '지역없음교회']);
  assert.deepEqual(recentChurches(records, 5, 'jeju').map(c => c.name), ['제주교회']);
});

test('제주 대시보드: 주방·차량은 읽지 않고 숨김 표시, 일정은 제주 캘린더가 연결되기 전에는 없고, 평택 전용 공지는 안 보인다', async () => {
  const { env } = kvEnv({
    'portal:notices': [
      { id: 'p', body: '평택 공지', weekStart: WEEK, createdAt: '2026-10-27T01:00:00Z', campus: 'wolko' },
      { id: 'j', body: '제주 공지', weekStart: WEEK, createdAt: '2026-10-27T02:00:00Z', campus: 'jeju' },
      { id: 'a', body: '전체 공지', weekStart: WEEK, createdAt: '2026-10-27T03:00:00Z', campus: 'all' },
    ],
    [`kitchen:day:${TODAY}`]: { lunch_prep: [{ name: 'Amy' }] },
  });
  env.GOOGLE_SERVICE_ACCOUNT_JSON = '{}'; env.GOOGLE_STAFF_CALENDAR_ID = 'pyeongtaek-cal';   // 평택 캘린더만 있다
  const session = { email: 'amy@wol.org', role: 'counselor', name: 'Amy' };
  const jeju = await buildDashboard(env, session, NOW, { campus: 'jeju' });
  assert.equal(jeju.campus, 'jeju');
  assert.deepEqual(jeju.hidden, ['kitchen', 'car']);
  assert.equal(jeju.kitchen, null); assert.equal(jeju.car, null);
  assert.equal(jeju.events, null, '제주 캘린더가 연결되기 전에는 일정 칸을 보이지 않는다');
  assert.deepEqual(jeju.notices.map(n => n.id).sort(), ['a', 'j']);
  const pt = await buildDashboard(env, session, NOW, { campus: 'wolko' });
  assert.deepEqual(pt.hidden, []);
  assert.deepEqual(pt.notices.map(n => n.id).sort(), ['a', 'p']);
  assert.ok(Array.isArray(pt.kitchen), '평택은 주방 당번을 그대로 읽는다');
  assert.equal(await upcomingEvents(env, TODAY, 5, 'jeju'), null);
});

test('API: 소속은 계정을 따르고, 다른 소속 화면 미리 보기(?campus=)는 관리자·마스터만', async () => {
  const { env } = kvEnv({ 'hub:account:jin@wol.org': { email: 'jin@wol.org', name: 'Jin', role: 'counselor', status: 'approved', campus: 'jeju' } });
  const get = async (who, role, query = '') => {
    const token = await createHubSessionToken('secret', who, role);
    const res = await dashApi.onRequestGet({ env, request: new Request(`https://t.co/api/portal/dashboard${query}`, { headers: { Authorization: `Bearer ${token}` } }) });
    return res.json();
  };
  assert.equal((await get('jin@wol.org', 'counselor')).campus, 'jeju');
  assert.equal((await get('jin@wol.org', 'counselor', '?campus=wolko')).campus, 'jeju', '일반 계정은 미리 보기를 못 한다');
  assert.equal((await get('jin@wol.org', 'counselor')).canSwitchCampus, false);
  const master = await get('admin@wolko.org', 'master', '?campus=jeju');
  assert.equal(master.campus, 'jeju'); assert.equal(master.canSwitchCampus, true);
  assert.equal((await get('admin@wolko.org', 'master')).campus, 'wolko');
});

test('공지 올리기: 대상(전체/평택/제주)을 고르고, 안 고르면 올린 사람의 소속, 고칠 때 바꿀 수 있다', async () => {
  const { env, store } = kvEnv({ 'hub:account:esooy@wol.org': { email: 'esooy@wol.org', name: 'Estelle', status: 'approved', campus: 'jeju' } });
  const post = async (body, who = ['esooy@wol.org', 'counselor']) => {
    const token = await createHubSessionToken('secret', who[0], who[1]);
    const res = await noticeApi.onRequestPost({ env, request: new Request('https://t.co/api/portal/notices', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }) });
    return { status: res.status, ...(await res.json()) };
  };
  const mine = await post({ body: '내 소속(제주)' });
  assert.equal(mine.notice.campus, 'jeju');
  const all = await post({ body: '전체', campus: 'all' });
  assert.equal(all.notice.campus, 'all');
  const edited = await post({ action: 'edit', id: mine.notice.id, body: '평택으로 옮김', campus: 'wolko' });
  assert.equal(edited.notice.campus, 'wolko');
  const saved = JSON.parse(store.get('portal:notices'));
  assert.equal(saved.find(n => n.id === mine.notice.id).campus, 'wolko');
});

test('포탈 홈 화면: 제주에서는 주방·차량·내용 없는 일정/교회/공지 칸을 그리지 않고, 공지 올리는 칸에 대상 선택이 있다', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/portal.astro', import.meta.url), 'utf8');
  assert.match(page, /\(d\.hidden \|\| \[\]\)\.includes\('kitchen'\)\) return ''/);
  assert.match(page, /\(d\.hidden \|\| \[\]\)\.includes\('car'\)\) return ''/);
  assert.match(page, /d\.campus === 'jeju' && \(!d\.events \|\| !d\.events\.length\)\) return ''/);
  assert.match(page, /d\.campus === 'jeju' && \(!d\.churches \|\| !d\.churches\.length\)\) return ''/);
  assert.match(page, /d\.campus === 'jeju' && Array\.isArray\(list\) && !list\.length && !d\.canEditNotices\) return ''/);
  assert.match(page, /id="noticeCampus"|campusSelect\('', 'noticeCampus'/);
  assert.match(page, /campus: \$\('noticeCampus'\)\.value/);
  assert.match(page, /campus: li\.querySelector\('\.ne-campus'\)\.value/);
  assert.match(page, /data-campus-view/);
  // 배너(날씨·알림 종)와 기도제목은 소속과 상관없이 같다
  assert.match(page, /renderPrayers\(dashData\)/);
});
