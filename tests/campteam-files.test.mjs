import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import * as Files from '../functions/api/campteam/files.js';
import * as File from '../functions/api/campteam/file.js';
import * as Upload from '../functions/api/campteam/upload.js';
import * as FileUrl from '../functions/api/campteam/file-url.js';
import * as FileGet from '../functions/api/campteam/file-get.js';
import { signToken } from '../functions/lib/hubAccounts.js';
import { cleanFileName, kindFor, mimeFor, linkKindFor, validExternalUrl } from '../functions/lib/campteamFiles.js';
import { fakeD1, fakeR2, makeEnv, req, U, root, SECRET } from './helpers/campteam-fakes.mjs';

const setup = (extra) => { const r2 = fakeR2(); return { r2, env: makeEnv(fakeD1(), { CAMPTEAM_FILES: r2, ...extra }) }; };
const bytes = (text) => new TextEncoder().encode(text);
async function upload(env, who, data, { name = 'test.pdf', query = '', headers = {} } = {}) {
  const r = await req(who, { method: 'POST', url: `http://localhost:8788/api/campteam/upload${query}`, body: data,
    headers: { 'X-File-Name': encodeURIComponent(name), 'Content-Length': String(data.length), ...headers } });
  return Upload.onRequestPost({ env, request: r });
}
const list = async (env, who, qs = '') => (await (await Files.onRequestGet({ env, request: await req(who, { url: 'http://localhost/api/campteam/files' + qs }) })).json());
const urlFor = async (env, who, id, qs = '') => FileUrl.onRequestGet({ env, request: await req(who, { url: `http://localhost/api/campteam/file-url?id=${id}${qs}` }) });
const get = (env, url) => FileGet.onRequestGet({ env, request: new Request('http://localhost' + url) });

test('도우미: 종류·MIME·이름 정리·링크 판별', () => {
  assert.equal(kindFor('시간표.PDF'), 'pdf'); assert.equal(kindFor('a.xlsx'), 'xls'); assert.equal(kindFor('x.unknown'), 'etc');
  assert.equal(mimeFor('a.html'), 'application/octet-stream', 'HTML 같은 건 안전하게 다운로드 형식으로');
  assert.equal(cleanFileName('../../etc/passwd'), '_.._etc_passwd', '경로 문자(/)는 모두 바뀐다');
  assert.equal(linkKindFor('https://docs.google.com/document/d/1/edit'), 'google-doc');
  assert.equal(linkKindFor('https://drive.google.com/file/d/1/view'), 'drive');
  assert.equal(validExternalUrl('http://insecure.com'), ''); assert.equal(validExternalUrl('javascript:alert(1)'), '');
  assert.equal(validExternalUrl('https://user:pw@x.com'), '');
});

test('팀원이 올리고, 5분짜리 주소로 내려받는다 (내용 그대로)', async () => {
  const { env, r2 } = setup();
  const res = await upload(env, U.mem, bytes('%PDF-1.4 hello'), { name: '시간표 v1.pdf', query: '?title=Winter 시간표&campId=camp-w27&category=program&topic=시간표&status=active' });
  assert.equal(res.status, 201);
  const { id, versionNo } = await res.json(); assert.equal(versionNo, 1);
  assert.equal(r2.m.size, 1);
  const u = await (await urlFor(env, U.view, id)).json(); // 조회만 계정도 일반 자료는 열 수 있다
  assert.equal(u.disposition, 'inline'); assert.equal(u.previewable, true);
  const dl = await get(env, u.url);
  assert.equal(dl.status, 200);
  assert.equal(await dl.text(), '%PDF-1.4 hello');
  assert.match(dl.headers.get('content-disposition'), /^inline; filename\*=UTF-8''/);
  assert.equal(dl.headers.get('x-content-type-options'), 'nosniff');
});

test('서명이 틀리거나 5분이 지났으면 열리지 않는다', async () => {
  const { env } = setup();
  const { id } = await (await upload(env, U.mem, bytes('x'), { name: 'a.pdf' })).json();
  const u = await (await urlFor(env, U.mem, id)).json();
  assert.equal((await get(env, u.url.slice(0, -4) + 'AAAA')).status, 403);
  const v = env.DB.sqlite.prepare('SELECT id FROM file_versions WHERE fileId = ?').get(id).id;
  const expired = await signToken(SECRET, `campfile|${id}|${v}|${Date.now() - 1000}|inline`);
  assert.equal((await get(env, '/api/campteam/file-get?t=' + encodeURIComponent(expired))).status, 403);
  const wrongKind = await signToken(SECRET, `wolko-hub:x@wolko.org:admin:${Date.now() + 99999}`);
  assert.equal((await get(env, '/api/campteam/file-get?t=' + encodeURIComponent(wrongKind))).status, 403, '다른 종류의 토큰으로는 안 열린다');
});

test('조회만 계정은 올릴 수 없고, 미리보기 불가 형식은 다운로드로만 열린다', async () => {
  const { env } = setup();
  assert.equal((await upload(env, U.view, bytes('x'))).status, 403);
  assert.equal((await upload(env, null, bytes('x'))).status, 401);
  const { id } = await (await upload(env, U.mem, bytes('PK'), { name: '자료.docx' })).json();
  const u = await (await urlFor(env, U.mem, id)).json();
  assert.equal(u.disposition, 'attachment'); assert.equal(u.previewable, false);
  const { id: htmlId } = await (await upload(env, U.mem, bytes('<script>alert(1)</script>'), { name: 'evil.html' })).json();
  const h = await get(env, (await (await urlFor(env, U.mem, htmlId)).json()).url);
  assert.match(h.headers.get('content-disposition'), /^attachment/); assert.equal(h.headers.get('content-type'), 'application/octet-stream');
});

test('크기 제한과 보관소 없음', async () => {
  const { env } = setup({ CAMPTEAM_MAX_UPLOAD_BYTES: '10' });
  assert.equal((await upload(env, U.mem, bytes('0123456789ABC'))).status, 413);
  assert.equal((await upload(env, U.mem, bytes('ok'), { headers: { 'Content-Length': '0' } })).status, 411);
  const noStore = makeEnv(fakeD1());
  const r = await upload(noStore, U.mem, bytes('x'));
  assert.equal(r.status, 503); assert.equal((await r.json()).code, 'no_storage');
});

test('새 버전을 올려도 이전 버전이 남고, 되돌릴 수 있다', async () => {
  const { env, r2 } = setup();
  const { id } = await (await upload(env, U.mem, bytes('version one'), { name: 'plan.pdf' })).json();
  const v2 = await upload(env, U.mem, bytes('version two!'), { name: 'plan.pdf', query: `?fileId=${id}&note=오탈자 수정` });
  assert.equal((await v2.json()).versionNo, 2);
  assert.equal(r2.m.size, 2, '이전 버전 본문이 그대로 남아 있다');
  const detail = await (await File.onRequestGet({ env, request: await req(U.view, { url: `http://localhost/api/campteam/file?id=${id}` }) })).json();
  assert.deepEqual(detail.versions.map(v => v.versionNo), [2, 1]);
  assert.equal(detail.versions[0].note, '오탈자 수정');
  assert.equal(await (await get(env, (await (await urlFor(env, U.mem, id)).json()).url)).text(), 'version two!');
  const v1id = detail.versions[1].id;
  const back = await Files.onRequestPatch({ env, request: await req(U.mem, { method: 'PATCH', url: `http://localhost/api/campteam/files?id=${id}`, body: { currentVersionId: v1id } }) });
  assert.equal(back.status, 200);
  assert.equal(await (await get(env, (await (await urlFor(env, U.mem, id)).json()).url)).text(), 'version one');
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM file_versions WHERE fileId=? AND deletedAt IS NULL').get(id).n, 2);
});

test('금액 자료(예산): 권한 없는 사람은 목록·상세·열기 모두 막힌다', async () => {
  const { env } = setup();
  assert.equal((await upload(env, U.view, bytes('x'), { query: '?category=budget' })).status, 403);
  const ok = await upload(env, U.mem, bytes('budget!'), { name: 'budget.xlsx', query: '?category=budget&title=예산표&campId=camp-w27' });
  assert.equal(ok.status, 201); const { id } = await ok.json();
  assert.equal(env.DB.sqlite.prepare('SELECT restricted FROM files WHERE id=?').get(id).restricted, 1);
  const viewerList = await list(env, U.view);
  assert.ok(!viewerList.items.some(f => f.id === id || f.restricted), '조회만 계정 목록에 금액 자료가 없다');
  assert.ok((await list(env, U.fin)).items.some(f => f.id === id), '재정 담당은 보인다');
  assert.equal((await File.onRequestGet({ env, request: await req(U.view, { url: `http://localhost/api/campteam/file?id=${id}` }) })).status, 404);
  assert.equal((await urlFor(env, U.view, id)).status, 404);
  assert.equal((await Files.onRequestDelete({ env, request: await req(U.view, { method: 'DELETE', url: `http://localhost/api/campteam/files?id=${id}` }) })).status, 404);
  // 일반 자료를 금액 자료로 바꾸는 것도 금액 권한이 필요
  const { id: gid } = await (await upload(env, U.mem, bytes('g'), { name: 'g.pdf' })).json();
  assert.equal((await Files.onRequestPatch({ env, request: await req(U.view, { method: 'PATCH', url: `http://localhost/api/campteam/files?id=${gid}`, body: { category: 'budget' } }) })).status, 403);
});

test('재정 담당: 금액 자료는 올릴 수 있지만 일반 자료는 올릴 수 없다', async () => {
  const { env } = setup();
  assert.equal((await upload(env, U.fin, bytes('x'), { query: '?category=budget' })).status, 201);
  assert.equal((await upload(env, U.fin, bytes('x'), { query: '?category=program' })).status, 403);
});

test('외부 링크 등록: https 만, 구글 문서 종류 자동 판별', async () => {
  const { env } = setup();
  const post = async (body, who = U.mem) => Files.onRequestPost({ env, request: await req(who, { method: 'POST', url: 'http://localhost/api/campteam/files', body }) });
  assert.equal((await post({ title: 'x', externalUrl: 'http://bad.com' })).status, 400);
  assert.equal((await post({ title: 'x', externalUrl: 'javascript:alert(1)' })).status, 400);
  assert.equal((await post({ title: '', externalUrl: 'https://docs.google.com/document/d/1' })).status, 400);
  assert.equal((await post({ title: 'x', externalUrl: 'https://docs.google.com/document/d/1' }, U.view)).status, 403);
  const res = await post({ title: '강사 소개', externalUrl: 'https://docs.google.com/presentation/d/1/edit', campId: 'camp-w27', category: 'program' });
  assert.equal(res.status, 201);
  const item = (await list(env, U.view, '?q=강사')).items[0];
  assert.equal(item.linkKind, 'google-slide'); assert.equal(item.kind, 'ppt'); assert.equal(item.storage, 'link');
  assert.equal((await urlFor(env, U.mem, item.id)).status, 404, '링크 문서는 서명 주소 대상이 아니다(원래 주소로 연다)');
});

test('같은 파일을 여러 캠프에 연결(중복 업로드 없이), 캠프 유형 공통 자료', async () => {
  const { env, r2 } = setup();
  const { id } = await (await upload(env, U.mem, bytes('shared'), { name: 'common.pdf', query: '?campId=camp-w27&title=공통 안내' })).json();
  const patch = async (body) => Files.onRequestPatch({ env, request: await req(U.mem, { method: 'PATCH', url: `http://localhost/api/campteam/files?id=${id}`, body }) });
  assert.equal((await patch({ addCampId: 'camp-u26' })).status, 200);
  assert.equal((await patch({ addCampId: 'camp-u26' })).status, 200, '두 번 연결해도 중복되지 않는다');
  assert.equal((await patch({ addCampId: 'nope' })).status, 400);
  assert.equal(r2.m.size, 1, '본문은 한 번만 저장');
  assert.ok((await list(env, U.view, '?campId=camp-u26')).items.some(f => f.id === id), '연결된 캠프에서도 보인다');
  assert.ok((await list(env, U.view, '?campId=camp-w27')).items.some(f => f.id === id));
  assert.ok(!(await list(env, U.view, '?campId=camp-p26')).items.some(f => f.id === id));
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM file_links WHERE fileId=?').get(id).n, 1);
  assert.equal((await patch({ removeCampId: 'camp-u26' })).status, 200);
  assert.ok(!(await list(env, U.view, '?campId=camp-u26')).items.some(f => f.id === id));
  // 캠프 유형 공통 자료 + 캠프 미지정 필터
  const { id: tid } = await (await upload(env, U.mem, bytes('t'), { name: 't.pdf', query: '?typeId=type-unity&title=Unity 전체 안내' })).json();
  assert.ok((await list(env, U.view, '?typeId=type-unity')).items.some(f => f.id === tid), '유형 공통 자료는 유형 필터에 나온다');
  const none = await list(env, U.view, '?campId=none');
  assert.ok(none.items.some(f => f.id === tid) && !none.items.some(f => f.id === id));
});

test('검색 · 종류/상태 필터 · 정렬 · 삭제 표시(복구 가능)', async () => {
  const { env } = setup();
  await upload(env, U.mem, bytes('a'), { name: 'b.pdf', query: '?title=Banana&topic=Camp Crew&status=active' });
  await upload(env, U.mem, bytes('b'), { name: 'a.xlsx', query: '?title=apple&status=draft' });
  const names = async (qs) => (await list(env, U.view, qs)).items.map(f => f.title);
  assert.deepEqual((await names('?q=crew')).sort(), ['Banana', '스태프 배정표'], '주제(Camp Crew)로 검색 — 더미 자료 포함');
  assert.deepEqual(await names('?q=b.pdf'), ['Banana'], '파일 이름으로도 검색');
  assert.deepEqual(await names('?kind=xls&category=etc'), ['apple']);
  assert.deepEqual(await names('?status=draft&q=apple'), ['apple']);
  assert.deepEqual((await names('?sort=name&q=a')).filter(n => ['apple', 'Banana'].includes(n)), ['apple', 'Banana']);
  assert.deepEqual(await names('?q=%25'), [], '검색어의 % 는 글자 그대로 취급');
  const { id } = (await list(env, U.view, '?q=Banana')).items[0];
  assert.equal((await Files.onRequestDelete({ env, request: await req(U.view, { method: 'DELETE', url: `http://localhost/api/campteam/files?id=${id}` }) })).status, 403);
  assert.equal((await Files.onRequestDelete({ env, request: await req(U.mem, { method: 'DELETE', url: `http://localhost/api/campteam/files?id=${id}` }) })).status, 200);
  assert.deepEqual(await names('?q=Banana'), []);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM files WHERE id=? AND deletedAt IS NOT NULL').get(id).n, 1, '행은 남아 있다');
  assert.equal((await urlFor(env, U.mem, id)).status, 404, '삭제 표시된 파일은 열기 주소도 만들어지지 않는다');
});

test('저장 실패 시 빈 기록을 남기지 않는다', async () => {
  const bad = { async put() { throw new Error('disk full'); }, async get() { return null; } };
  const env = makeEnv(fakeD1(), { CAMPTEAM_FILES: bad });
  const before = env.DB.sqlite.prepare('SELECT COUNT(*) n FROM files WHERE deletedAt IS NULL').get().n;
  assert.equal((await upload(env, U.mem, bytes('x'))).status, 502);
  assert.equal(env.DB.sqlite.prepare('SELECT COUNT(*) n FROM files WHERE deletedAt IS NULL').get().n, before);
});

test('파일 새 코드도 기존 저장소(CAMP_KV/기존 파일 키)에 쓰지 않는다', () => {
  for (const f of ['files', 'file', 'upload', 'file-url', 'file-get']) {
    assert.doesNotMatch(readFileSync(root + `functions/api/campteam/${f}.js`, 'utf8'), /CAMP_KV|CAMP_FILES\b|TEACH_FILES|QT_BOOK_FILES|R2_BUCKET|\bBUCKET\b/);
  }
});
