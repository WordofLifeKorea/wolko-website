import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const source = readFileSync(new URL('../src/pages/resource.astro', import.meta.url), 'utf8');
test('DOCX dispatch is case insensitive without treating legacy DOC as DOCX', () => {
  const start = source.indexOf('    const VIEWER_KIND_MAP');
  const end = source.indexOf('    let viewerFileId', start);
  const ctx = vm.createContext({});
  vm.runInContext(source.slice(start, end), ctx);
  assert.equal(ctx.viewerKindOf('notes.DOCX'), 'docx');
  assert.equal(ctx.viewerKindOf('notes.doc'), 'other');
});
test('DOCX renders into a sandbox and preserves original download', async () => {
  const elements = { viewerOverlay: { hidden: false }, viewerSurface: { replaceChildren(x) { this.child = x; } }, viewerToolbar: { append(x) { this.link = x; } } };
  const ctx = vm.createContext({ viewerFileId: 'a', lang: 'ko', $: id => elements[id],
    document: { createElement: () => ({ style: {}, setAttribute(k,v) { this[k] = v; } }) },
    fetch: async () => ({ blob: async () => 'blob' }),
    window: { __previewDocx: async (blob, frame) => { assert.equal(frame.sandbox, ''); } } });
  const start = source.indexOf('    async function renderDocxStage');
  vm.runInContext(source.slice(start, source.indexOf('    function renderFallbackStage', start)), ctx);
  await ctx.renderDocxStage('blob:test', { id: 'a', fileName: 'notes.docx' });
  assert.equal(elements.viewerSurface.child.title, 'notes.docx');
  assert.equal(elements.viewerToolbar.link.download, 'notes.docx');
  elements.viewerSurface.child = null; ctx.viewerFileId = 'other';
  await ctx.renderDocxStage('blob:test', { id: 'a', fileName: 'notes.docx' });
  assert.equal(elements.viewerSurface.child, null);
});
