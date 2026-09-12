import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/pages/resource.astro', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/portal.css', import.meta.url), 'utf8');
test('DOCX dispatch is case insensitive without treating legacy DOC as DOCX', () => {
  const start = source.indexOf('    const VIEWER_KIND_MAP');
  const end = source.indexOf('    let viewerFileId', start);
  const ctx = vm.createContext({});
  vm.runInContext(source.slice(start, end), ctx);
  assert.equal(ctx.viewerKindOf('notes.DOCX'), 'docx');
  assert.equal(ctx.viewerKindOf('notes.doc'), 'other');
});
test('DOCX opens in ONLYOFFICE and keeps version history controls', () => {
  assert.doesNotMatch(source, /__previewDocx|from ['"]docx-preview['"]/);
  assert.match(source, /fetch\(`\/api\/portal\/onlyoffice-config\?/);
  assert.match(source, /new window\.DocsAPI\.DocEditor\('onlyofficeEditor'/);
  assert.match(source, /onlyOfficeEditor\?\.destroyEditor\(\)/);
  assert.match(source, /fetch\('\/api\/portal\/resource-version'/);
  assert.match(source, /await renderDocxStage\(meta, versionId\)/);
  assert.match(source, /function openCurrentDocx\(\)/);
  assert.match(css, /\.viewer-stage-surface\.is-onlyoffice \{[^}]*padding:0;[^}]*overflow:hidden/);
  assert.match(css, /\.onlyoffice-editor-shell,#onlyofficeEditor \{[^}]*height:100%/);
});
