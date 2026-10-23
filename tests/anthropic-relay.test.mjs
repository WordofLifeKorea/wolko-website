import test from 'node:test';
import assert from 'node:assert/strict';
import relay from '../workers/anthropic-relay/index.js';

const req = (path, init = {}) => new Request(`https://relay.test${path}`, init);

test('relay forwards only the needed headers to Anthropic and tags the colo', async t => {
  let seen;
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init) => { seen = { url, init }; return new Response('{"ok":1}', { status: 200, headers: { 'content-type': 'application/json' } }); };
  t.after(() => { globalThis.fetch = original; });
  const request = req('/anthropic/v1/messages', { method: 'POST', body: '{"a":1}', headers: { 'x-api-key': 'k', 'anthropic-workspace-id': 'wrkspc_x', 'anthropic-version': '2023-06-01', 'content-type': 'application/json', 'cf-aig-authorization': 'Bearer t', cookie: 'secret' } });
  Object.defineProperty(request, 'cf', { value: { colo: 'IAD' } });
  const res = await relay.fetch(request, { RELAY_TOKEN: 't' });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-relay-colo'), 'IAD');
  assert.equal(seen.url, 'https://api.anthropic.com/v1/messages');
  assert.equal(seen.init.headers.get('x-api-key'), 'k');
  assert.equal(seen.init.headers.get('anthropic-workspace-id'), 'wrkspc_x');
  assert.equal(seen.init.headers.get('cf-aig-authorization'), null);
  assert.equal(seen.init.headers.get('cookie'), null);
});

test('relay rejects a wrong token, wrong method and wrong path', async () => {
  const bad = await relay.fetch(req('/anthropic/v1/messages', { method: 'POST', body: '{}', headers: { 'cf-aig-authorization': 'Bearer x' } }), { RELAY_TOKEN: 't' });
  assert.equal(bad.status, 403);
  assert.equal((await relay.fetch(req('/anthropic/v1/messages'), {})).status, 405);
  assert.equal((await relay.fetch(req('/other', { method: 'POST' }), {})).status, 404);
});

test('relay passes an upstream error status through unchanged', async t => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"error":{"type":"forbidden"}}', { status: 403 });
  t.after(() => { globalThis.fetch = original; });
  const res = await relay.fetch(req('/anthropic/v1/messages', { method: 'POST', body: '{}' }), {});
  assert.equal(res.status, 403);
});
