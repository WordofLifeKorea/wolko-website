import test from 'node:test';
import assert from 'node:assert/strict';
import { anthropicRoute } from '../functions/lib/anthropicRoute.js';

test('anthropicRoute sends through the relay when AI_GATEWAY_URL is set', () => {
  const r = anthropicRoute({ AI_GATEWAY_URL: 'https://relay.example/', CF_AIG_TOKEN: ' tok ', ANTHROPIC_WORKSPACE_ID: ' wrkspc_1 ' });
  assert.equal(r.url, 'https://relay.example/anthropic/v1/messages');
  assert.deepEqual(r.extraHeaders, { 'cf-aig-authorization': 'Bearer tok', 'anthropic-workspace-id': 'wrkspc_1' });
});

test('anthropicRoute keeps the direct address when nothing is configured, and honours an explicit override', () => {
  assert.deepEqual(anthropicRoute({}), { url: undefined, extraHeaders: {} });
  const o = anthropicRoute({ AI_GATEWAY_URL: 'https://relay.example', CF_AIG_TOKEN: 't' }, 'https://custom.example/v1/messages');
  assert.equal(o.url, 'https://custom.example/v1/messages');
  assert.equal(o.extraHeaders['cf-aig-authorization'], undefined, '직접 지정한 주소에는 중계 토큰을 보내지 않는다');
});
