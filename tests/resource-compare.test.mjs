import assert from 'node:assert/strict';
import test from 'node:test';

import { onRequestPost } from '../functions/api/portal/resource-compare.js';
import { createHubSessionToken } from '../functions/lib/hubAccounts.js';
import { verifyJwt } from '../functions/lib/onlyoffice.js';
import { KV_KEY } from '../functions/lib/portalResources.js';
import { resourceFileKey, resourceVersionKey } from '../functions/lib/portalResourceVersions.js';

function createEnv() {
  const values = new Map();
  const metadata = new Map();
  const file = {
    id: 'file-1',
    fileName: 'lesson.docx',
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    versions: [{ id: 'original', label: '원본', isOriginal: true }],
  };
  values.set(KV_KEY, JSON.stringify({ items: [{ id: 'resource-1', files: [file] }] }));
  values.set('hub:account:editor@wol.org', JSON.stringify({ email: 'editor@wol.org', name: 'Editor' }));
  values.set(resourceFileKey('resource-1', 'file-1'), new TextEncoder().encode('current'));
  values.set(resourceVersionKey('resource-1', 'file-1', 'original'), new TextEncoder().encode('original'));
  metadata.set(resourceFileKey('resource-1', 'file-1'), { fileName: file.fileName, fileType: file.fileType });
  metadata.set(resourceVersionKey('resource-1', 'file-1', 'original'), { fileName: file.fileName, fileType: file.fileType });
  return {
    ADMIN_PASSWORD: 'portal-secret',
    ONLYOFFICE_JWT_SECRET: 'office-secret',
    ONLYOFFICE_PUBLIC_URL: 'https://docs.wolko.org',
    PUBLIC_SITE_URL: 'https://wolko.org',
    CAMP_KV: {
      async get(key, type) {
        const value = values.get(key);
        if (value == null) return null;
        return type === 'json' ? JSON.parse(value) : value;
      },
      async getWithMetadata(key) {
        const value = values.get(key);
        return {
          value: value instanceof Uint8Array ? value.slice().buffer : null,
          metadata: metadata.get(key) || null,
        };
      },
    },
  };
}

test('DOCX comparison is temporary, signed, and opens with visible change markup', async t => {
  const env = createEnv();
  const session = await createHubSessionToken(env.ADMIN_PASSWORD, 'editor@wol.org', 'admin');
  let sentBuilderBody;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    assert.match(String(url), /^https:\/\/docs\.wolko\.org\/docbuilder\?shardkey=/);
    sentBuilderBody = JSON.parse(init.body);
    return Response.json({
      key: 'comparison-key',
      end: true,
      urls: { 'WOLKO-Comparison.docx': 'https://docs.wolko.org/cache/WOLKO-Comparison.docx' },
    });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const response = await onRequestPost({
    env,
    request: new Request('https://wolko.org/api/portal/resource-compare', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'resource-1', fileId: 'file-1', versionId: 'original', lang: 'ko' }),
    }),
  });
  assert.equal(response.status, 200);

  const builderToken = await verifyJwt(sentBuilderBody.token, env.ONLYOFFICE_JWT_SECRET);
  assert.deepEqual(builderToken.payload, {
    async: false,
    url: 'https://wolko.org/onlyoffice/compare-docx.js?v=1',
    argument: sentBuilderBody.argument,
  });
  const previousUrl = new URL(sentBuilderBody.argument.previousUrl);
  const previousToken = await verifyJwt(previousUrl.searchParams.get('token'), env.ONLYOFFICE_JWT_SECRET);
  assert.equal(previousToken.versionId, 'original');

  const data = await response.json();
  assert.equal(data.comparisonLabel, '원본 → 현재 저장본 변경 사항');
  assert.equal(data.config.editorConfig.mode, 'view');
  assert.equal(data.config.editorConfig.customization.review.showReviewChanges, true);
  assert.equal(data.config.editorConfig.customization.review.hideReviewDisplay, false);
  assert.equal(data.config.document.url, 'https://docs.wolko.org/cache/WOLKO-Comparison.docx');
});
