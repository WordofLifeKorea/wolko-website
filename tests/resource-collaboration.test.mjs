import assert from 'node:assert/strict';
import test from 'node:test';

import { onRequestGet as getAnnotations } from '../functions/api/portal/resource-annotation.js';
import {
  onRequestPost as postComment,
  onRequestDelete as deleteComment,
} from '../functions/api/portal/resource-comment.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { KV_KEY } from '../functions/lib/portalResources.js';

function createEnv() {
  const store = new Map();
  const item = {
    id: 'resource-1',
    title: 'Shared resource',
    files: [{ id: 'file-1', fileName: 'lesson.pdf' }],
    annotations: [{
      id: 'note-1', fileId: 'file-1', kind: 'area', text: 'Review this section',
      status: 'open', createdBy: 'author@wol.org', createdByName: 'Author',
      createdAt: '2026-09-10T01:00:00.000Z', updatedAt: '2026-09-10T01:00:00.000Z',
    }],
  };
  store.set(KV_KEY, JSON.stringify({ items: [item], updatedAt: item.updatedAt }));
  store.set('hub:account:author@wol.org', JSON.stringify({ email: 'author@wol.org', name: 'Author' }));
  store.set('hub:account:reviewer@wol.org', JSON.stringify({ email: 'reviewer@wol.org', name: 'Reviewer' }));

  return {
    ADMIN_PASSWORD: 'test-secret',
    CAMP_KV: {
      async get(key, type) {
        const value = store.get(key);
        if (value == null) return null;
        return type === 'json' ? JSON.parse(value) : value;
      },
      async put(key, value) { store.set(key, value); },
    },
  };
}

function request(path, token, method = 'GET', body) {
  return new Request(`https://wolko.test${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

test('comments on a note are shared with every signed-in portal user', async () => {
  const env = createEnv();
  const authorToken = await createHubSessionToken(env.ADMIN_PASSWORD, 'author@wol.org', 'counselor');
  const reviewerToken = await createHubSessionToken(env.ADMIN_PASSWORD, 'reviewer@wol.org', 'counselor');

  const createResponse = await postComment({
    env,
    request: request('/api/portal/resource-comment', reviewerToken, 'POST', {
      id: 'resource-1', annotationId: 'note-1', text: 'I agree with this revision.',
    }),
  });
  assert.equal(createResponse.status, 200);

  const readResponse = await getAnnotations({
    env,
    request: request('/api/portal/resource-annotation?id=resource-1', authorToken),
  });
  assert.equal(readResponse.status, 200);
  assert.equal(readResponse.headers.get('Cache-Control'), 'no-store');
  const data = await readResponse.json();
  assert.equal(data.annotations[0].comments.length, 1);
  assert.equal(data.annotations[0].comments[0].createdByName, 'Reviewer');
  assert.equal(data.annotations[0].comments[0].text, 'I agree with this revision.');
});

test('only a comment author or an admin can delete the comment', async () => {
  const env = createEnv();
  const authorToken = await createHubSessionToken(env.ADMIN_PASSWORD, 'author@wol.org', 'counselor');
  const reviewerToken = await createHubSessionToken(env.ADMIN_PASSWORD, 'reviewer@wol.org', 'counselor');
  const adminToken = await createHubSessionToken(env.ADMIN_PASSWORD, 'admin@wol.org', 'admin');

  const createResponse = await postComment({
    env,
    request: request('/api/portal/resource-comment', reviewerToken, 'POST', {
      id: 'resource-1', annotationId: 'note-1', text: 'A reviewer comment',
    }),
  });
  const created = await createResponse.json();
  const commentId = created.item.annotations[0].comments[0].id;
  const path = `/api/portal/resource-comment?id=resource-1&annotationId=note-1&commentId=${commentId}`;

  const denied = await deleteComment({ env, request: request(path, authorToken, 'DELETE') });
  assert.equal(denied.status, 403);

  const deleted = await deleteComment({ env, request: request(path, adminToken, 'DELETE') });
  assert.equal(deleted.status, 200);
  assert.equal((await deleted.json()).item.annotations[0].comments.length, 0);
});

test('annotation synchronization requires a portal session', async () => {
  const env = createEnv();
  const response = await getAnnotations({
    env,
    request: new Request('https://wolko.test/api/portal/resource-annotation?id=resource-1'),
  });
  assert.equal(response.status, 401);
});
