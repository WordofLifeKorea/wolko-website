import assert from 'node:assert/strict';
import test from 'node:test';
import * as Links from '../functions/api/newsletter/links.js';
import * as Posts from '../functions/api/newsletter/posts.js';
import * as Sub from '../functions/api/newsletter/subscribe.js';
import * as Subs from '../functions/api/newsletter/subscribers.js';
import * as Send from '../functions/api/newsletter/send.js';
import * as Img from '../functions/api/newsletter/image.js';
import { createHubSessionToken, putAccount } from '../functions/lib/hubAccounts.js';
import { renderText, renderBlocks, cleanBlocks } from '../functions/lib/newsletter.js';

function setup() {
  const values = new Map(), meta = new Map();
  const env = {
    ADMIN_PASSWORD: 'secret', RESEND_API_KEY: 'rk',
    CAMP_KV: {
      async get(k, t) { const v = values.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); },
      async getWithMetadata(k) { return { value: values.get(k) ?? null, metadata: meta.get(k) || null }; },
      async put(k, v, o) { values.set(k, v); if (o?.metadata) meta.set(k, o.metadata); },
      async delete(k) { values.delete(k); },
      async list({ prefix = '' } = {}) { return { keys: [...values.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })), list_complete: true }; },
    },
  };
  const sent = [];
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    if (String(url).endsWith('/emails/batch')) sent.push(...body); else sent.push(body);
    return new Response('{}', { status: 200 });
  };
  const call = (mod, method, path, token, body) => mod['onRequest' + method[0] + method.slice(1).toLowerCase()]({
    env, request: new Request('https://wolko.org' + path, { method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), 'CF-Connecting-IP': '1.1.1.1' }, body: body ? JSON.stringify(body) : undefined }),
  });
  return { env, sent, call };
}

async function author(env) {
  await putAccount(env, { email: 'aiden@wol.org', name: 'Aiden', role: 'counselor', status: 'approved' });
  await putAccount(env, { email: 'other@wol.org', name: 'Other', role: 'counselor', status: 'approved' });
  const t = e => createHubSessionToken(env.ADMIN_PASSWORD, e, 'counselor');
  return { me: await t('aiden@wol.org'), other: await t('other@wol.org'), master: await createHubSessionToken(env.ADMIN_PASSWORD, 'wolkorea1@gmail.com', 'master') };
}

test('서식 변환은 HTML 을 이스케이프하고 위험한 링크를 제거한다', () => {
  const html = renderText('<script>alert(1)</script> **굵게** [나쁜](javascript:alert(1)) [좋은](https://wolko.org/a?x=1&y=2)\n\n- 하나\n- 둘\n\n# 제목');
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(html, /<strong>굵게<\/strong>/);
  assert.doesNotMatch(html, /javascript:/);
  assert.match(html, /href="https:\/\/wolko\.org\/a\?x=1&amp;y=2"/);
  assert.match(html, /<ul[^>]*><li>하나<\/li><li>둘<\/li><\/ul>/);
  assert.match(html, /<h2[^>]*>제목<\/h2>/);
  const blocks = cleanBlocks([{ type: 'button', label: 'Go', url: 'javascript:x' }, { type: 'evil' }, { type: 'divider' }]);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0].url, '');
  assert.match(renderBlocks([{ type: 'divider' }]), /<hr/);
});

test('본인 소개 페이지와 연결된 계정만 글을 쓸 수 있고, 마스터는 연결만 관리한다', async () => {
  const { env, call } = setup();
  const t = await author(env);
  assert.equal((await call(Posts, 'POST', '/api/newsletter/posts', t.me, { title: 'x', body: 'y' })).status, 403, '연결 전');
  assert.equal((await call(Links, 'PUT', '/api/newsletter/links', t.me, { email: 'aiden@wol.org', slug: 'aiden' })).status, 403, '멤버는 연결 못 함');
  assert.equal((await call(Links, 'PUT', '/api/newsletter/links', t.master, { email: 'aiden@wol.org', slug: 'aiden', displayName: '에이든' })).status, 200);
  const adminView = await (await call(Links, 'GET', '/api/newsletter/links', t.master)).json();
  assert.ok(adminView.accounts.some(a => a.email === 'aiden@wol.org'), '연결할 포탈 계정 목록(드롭다운용)');
  assert.equal((await (await call(Links, 'GET', '/api/newsletter/links', t.me)).json()).accounts, undefined, '멤버에게는 계정 목록을 주지 않는다');
  const me = await (await call(Links, 'GET', '/api/newsletter/links', t.me)).json();
  assert.equal(me.me.slug, 'aiden');
  assert.equal((await call(Posts, 'POST', '/api/newsletter/posts', t.me, { title: '첫 소식', mode: 'simple', body: '안녕하세요' })).status, 200);
  assert.equal((await call(Posts, 'POST', '/api/newsletter/posts', t.other, { title: '남의 것', body: 'x' })).status, 403);
  assert.equal((await call(Posts, 'POST', '/api/newsletter/posts', t.me, { title: '남의 페이지', body: 'x', slug: 'other-slug' })).status, 403, '멤버가 다른 사람 페이지로 쓸 수 없다');
});

test('글: 초안은 공개 목록에 보이지 않고 게시하면 보인다', async () => {
  const { env, call } = setup();
  const t = await author(env);
  await call(Links, 'PUT', '/api/newsletter/links', t.master, { email: 'aiden@wol.org', slug: 'aiden', displayName: '에이든' });
  const { id } = await (await call(Posts, 'POST', '/api/newsletter/posts', t.me, { title: '소식', mode: 'blocks', blocks: [{ type: 'text', text: '본문' }] })).json();
  assert.equal((await (await call(Posts, 'GET', '/api/newsletter/posts?slug=aiden')).json()).posts.length, 0);
  assert.equal((await call(Posts, 'GET', `/api/newsletter/posts?slug=aiden&id=${id}`)).status, 404);
  assert.equal((await call(Posts, 'PATCH', '/api/newsletter/posts', t.me, { id, action: 'publish' })).status, 200);
  const list = await (await call(Posts, 'GET', '/api/newsletter/posts?slug=aiden')).json();
  assert.equal(list.posts.length, 1);
  const one = await (await call(Posts, 'GET', `/api/newsletter/posts?slug=aiden&id=${id}`)).json();
  assert.match(one.post.html, /본문/);
  const mine = await (await call(Posts, 'GET', '/api/newsletter/posts?mine=1', t.me)).json();
  assert.equal(mine.posts[0].status, 'published');
  assert.equal((await call(Posts, 'DELETE', `/api/newsletter/posts?id=${id}`, t.me)).status, 200);
  assert.equal((await (await call(Posts, 'GET', '/api/newsletter/posts?slug=aiden')).json()).posts.length, 0);
});

test('구독: 확인 메일 → 확인 → 수신, 수신거부, 숨김칸 봇은 무시', async () => {
  const { env, sent, call } = setup();
  const t = await author(env);
  await call(Links, 'PUT', '/api/newsletter/links', t.master, { email: 'aiden@wol.org', slug: 'aiden', displayName: '에이든' });
  assert.equal((await call(Sub, 'POST', '/api/newsletter/subscribe', null, { slug: 'nobody', email: 'a@b.com' })).status, 404, '연결되지 않은 페이지');
  assert.equal((await call(Sub, 'POST', '/api/newsletter/subscribe', null, { slug: 'aiden', email: 'bad' })).status, 400);
  await call(Sub, 'POST', '/api/newsletter/subscribe', null, { slug: 'aiden', email: 'bot@x.com', website: 'spam' });
  assert.equal(sent.length, 0, '봇은 메일이 가지 않는다');
  assert.equal((await call(Sub, 'POST', '/api/newsletter/subscribe', null, { slug: 'aiden', email: 'Fan@X.com', name: '팬' })).status, 200);
  assert.equal(sent.length, 1);
  const link = sent[0].html.match(/href="([^"]*confirm=[^"]*)"/)[1].replace(/&amp;/g, '&');
  const before = await (await call(Subs, 'GET', '/api/newsletter/subscribers', t.me)).json();
  assert.equal(before.counts.pending, 1); assert.equal(before.counts.active, 0);
  const conf = await Sub.onRequestGet({ env, request: new Request(link) });
  assert.match(await conf.text(), /구독이 시작/);
  assert.equal((await (await call(Subs, 'GET', '/api/newsletter/subscribers', t.me)).json()).counts.active, 1);
  assert.equal((await Sub.onRequestGet({ env, request: new Request('https://wolko.org/api/newsletter/subscribe?confirm=garbage') })).status, 200); // 안내 화면
  assert.equal((await (await call(Subs, 'GET', '/api/newsletter/subscribers', t.me)).json()).counts.active, 1);
});

test('가져오기: 동의 확인 필수, 형식 오류/중복/수신거부자는 건너뜀', async () => {
  const { env, call } = setup();
  const t = await author(env);
  await call(Links, 'PUT', '/api/newsletter/links', t.master, { email: 'aiden@wol.org', slug: 'aiden', displayName: '에이든' });
  assert.equal((await call(Subs, 'POST', '/api/newsletter/subscribers', t.me, { text: 'a@b.com' })).status, 400);
  const r = await (await call(Subs, 'POST', '/api/newsletter/subscribers', t.me, { consent: true, text: '김철수 <kim@x.com>\nlee@x.com, 이영희\nkim@x.com\nnot-an-email' })).json();
  assert.equal(r.added, 2); assert.equal(r.invalid, 1);
  assert.equal((await (await call(Subs, 'GET', '/api/newsletter/subscribers', t.me)).json()).counts.active, 2);
  // 수신거부한 사람은 다시 넣지 않는다
  const { SUB_PREFIX } = await import('../functions/lib/newsletter.js');
  await env.CAMP_KV.put(`${SUB_PREFIX}aiden:lee@x.com`, JSON.stringify({ email: 'lee@x.com', status: 'unsub' }));
  const r2 = await (await call(Subs, 'POST', '/api/newsletter/subscribers', t.me, { consent: true, text: 'lee@x.com\nnew@x.com' })).json();
  assert.equal(r2.added, 1); assert.equal(r2.skipped, 1);
});

test('발송: 테스트는 나에게만, 실제 발송은 수신 중인 구독자에게 수신거부 링크와 함께, 두 번 보내려면 확인', async () => {
  const { env, sent, call } = setup();
  const t = await author(env);
  await call(Links, 'PUT', '/api/newsletter/links', t.master, { email: 'aiden@wol.org', slug: 'aiden', displayName: '에이든' });
  await call(Subs, 'POST', '/api/newsletter/subscribers', t.me, { consent: true, text: 'a@x.com\nb@x.com' });
  const { SUB_PREFIX } = await import('../functions/lib/newsletter.js');
  await env.CAMP_KV.put(`${SUB_PREFIX}aiden:gone@x.com`, JSON.stringify({ email: 'gone@x.com', status: 'unsub' }));
  await env.CAMP_KV.put(`${SUB_PREFIX}aiden:wait@x.com`, JSON.stringify({ email: 'wait@x.com', status: 'pending' }));
  const { id } = await (await call(Posts, 'POST', '/api/newsletter/posts', t.me, { title: '10월 소식', mode: 'simple', body: '기도 부탁드려요\n\n[[image:abcdef123456|사진]]', button: { label: '후원하기', url: 'https://wolko.org/give' } })).json();

  const test1 = await (await call(Send, 'POST', '/api/newsletter/send', t.me, { id, test: true })).json();
  assert.equal(test1.sent, 1);
  assert.deepEqual(sent.at(-1).to, ['aiden@wol.org']);
  assert.match(sent.at(-1).subject, /^\[테스트\]/);
  sent.length = 0;

  const res = await (await call(Send, 'POST', '/api/newsletter/send', t.me, { id })).json();
  assert.equal(res.sent, 2);
  assert.deepEqual(sent.map(m => m.to[0]).sort(), ['a@x.com', 'b@x.com']);
  assert.match(sent[0].html, /unsub=/);
  assert.match(sent[0].html, /api\/newsletter\/image\?id=abcdef123456/);
  assert.match(sent[0].html, /후원하기/);
  assert.match(sent[0].headers['List-Unsubscribe'], /unsub=/);
  assert.equal(sent[0].reply_to, 'aiden@wol.org');
  assert.match(sent[0].from, /에이든/);
  assert.equal((await call(Send, 'POST', '/api/newsletter/send', t.me, { id })).status, 409);
  assert.equal((await call(Send, 'POST', '/api/newsletter/send', t.me, { id, resend: true })).status, 200);
  // 발송하면 웹에도 게시된다
  assert.equal((await (await call(Posts, 'GET', '/api/newsletter/posts?slug=aiden')).json()).posts.length, 1);
});

test('이미지: 작성자만 올리고, 누구나 볼 수 있으며 허용 형식만', async () => {
  const { env, call } = setup();
  const t = await author(env);
  await call(Links, 'PUT', '/api/newsletter/links', t.master, { email: 'aiden@wol.org', slug: 'aiden' });
  assert.equal((await call(Img, 'POST', '/api/newsletter/image', t.other, { data: 'data:image/png;base64,AAAA' })).status, 403);
  assert.equal((await call(Img, 'POST', '/api/newsletter/image', t.me, { data: 'data:application/pdf;base64,AAAA' })).status, 400);
  const { id } = await (await call(Img, 'POST', '/api/newsletter/image', t.me, { data: 'data:image/png;base64,iVBORw0KGgo=' })).json();
  const r = await call(Img, 'GET', `/api/newsletter/image?id=${id}`);
  assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), 'image/png');
  assert.equal((await call(Img, 'GET', '/api/newsletter/image?id=zzzzzzzzzz')).status, 404);
});

test('머리글 템플릿: 5종 모두 제목 · 부제 · 이름이 들어가고, 모르는 값은 클래식으로, 사진 배너는 우리 이미지만 쓴다', async () => {
  const { renderHeader, cleanHeader, emailHtml, HEADER_TEMPLATES } = await import('../functions/lib/newsletter.js');
  assert.deepEqual(HEADER_TEMPLATES, ['classic', 'banner', 'minimal', 'warm', 'night']);
  for (const template of HEADER_TEMPLATES) {
    const html = renderHeader({ title: '<b>소식</b>', header: { template, subtitle: '10월호', imageId: 'abcdef123456' } }, { displayName: '에이든' }, 'https://wolko.org');
    assert.match(html, /&lt;b&gt;소식&lt;\/b&gt;/, template);
    assert.match(html, /10월호/, template);
    assert.match(html, /에이든/, template);
    assert.doesNotMatch(html, /<b>소식/);
  }
  assert.equal(cleanHeader({ template: 'evil', imageId: '../x', subtitle: 'a'.repeat(200) }).template, 'classic');
  assert.equal(cleanHeader({ template: 'evil', imageId: '../x' }).imageId, '');
  assert.equal(cleanHeader({ subtitle: 'a'.repeat(200) }).subtitle.length, 80);
  assert.match(renderHeader({ title: 'x', header: { template: 'banner', imageId: 'abcdef123456' } }, { displayName: 'A' }, 'https://wolko.org'), /url\('https:\/\/wolko\.org\/api\/newsletter\/image\?id=abcdef123456'\)/);
  const mail = emailHtml({ post: { title: '제목', mode: 'simple', body: '본문', header: { template: 'night' } }, author: { displayName: '에이든' }, origin: 'https://wolko.org', webUrl: '', unsubUrl: 'https://u' });
  assert.match(mail, /#0b2230/);
  assert.match(mail, /본문/);
});

test('저장한 글에 머리글 설정이 남고 공개 글/미리보기에서 머리글 HTML 이 나온다', async () => {
  const { env, call } = setup();
  const t = await author(env);
  await call(Links, 'PUT', '/api/newsletter/links', t.master, { email: 'aiden@wol.org', slug: 'aiden', displayName: '에이든' });
  const body = { title: '소식', mode: 'simple', body: '본문', header: { template: 'warm', subtitle: '10월호' } };
  const pv = await (await call(Posts, 'POST', '/api/newsletter/posts?preview=1', t.me, body)).json();
  assert.match(pv.headerHtml, /#9a3b22/);
  const { id } = await (await call(Posts, 'POST', '/api/newsletter/posts', t.me, body)).json();
  assert.equal((await (await call(Posts, 'GET', `/api/newsletter/posts?mine=1&id=${id}`, t.me)).json()).post.header.template, 'warm');
  await call(Posts, 'PATCH', '/api/newsletter/posts', t.me, { id, action: 'publish' });
  const pub = await (await call(Posts, 'GET', `/api/newsletter/posts?slug=aiden&id=${id}`)).json();
  assert.match(pub.post.headerHtml, /10월호/);
});

test('블록 꾸미기: 배경색·글자색·정렬·크기·여백·둥근 모서리는 검증된 값만 남고, 잘못된 값은 버린다', async () => {
  const { cleanBlocks, renderBlocks, cleanStyle } = await import('../functions/lib/newsletter.js');
  assert.deepEqual(cleanStyle({ bg: '#EEF6F8', color: 'red', align: 'center', size: 'l', pad: 'huge', round: true, evil: 1 }), { bg: '#eef6f8', align: 'center', size: 'l', round: true });
  assert.deepEqual(cleanStyle({ align: 'left', size: 'm' }), {});
  const blocks = cleanBlocks([{ type: 'text', text: '안녕', style: { bg: '#fff4e5', color: '#c42a36', align: 'center', size: 'l', round: true } }, { type: 'button', label: 'Go', url: 'https://wolko.org', style: { bg: '#168a52', color: '#ffffff', round: true } }, { type: 'text', text: '평범' }]);
  assert.equal(blocks[2].style, undefined);
  const html = renderBlocks(blocks, '');
  assert.match(html, /background:#fff4e5;padding:16px 20px;border-radius:14px;text-align:center/);
  assert.match(html, /color:#c42a36/);
  assert.match(html, /font-size:20px/);
  assert.match(html, /background:#168a52;color:#ffffff;font-weight:700/);
  assert.match(html, /border-radius:999px/);
  assert.equal(renderBlocks([blocks[2]], '').includes('<table'), false, '꾸미지 않은 블록은 그대로');
});

test('작성 화면: 블록 편집기만 쓰고(간단 모드 없음), 인용 블록은 추가 목록에서 빠지고, PDF 저장과 머리글 템플릿이 있다', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/pages/newsletter/index.astro', import.meta.url), 'utf8');
  assert.doesNotMatch(src, /data-mode=/);
  assert.doesNotMatch(src, /\['quote', 'addQuote'\]/);
  assert.match(src, /data-act="pdf"/);
  assert.match(src, /html2pdf/);
  assert.match(src, /data-tpl=/);
  assert.match(src, /data-spick=/);
});
