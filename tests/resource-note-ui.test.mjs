import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(process.env.RESOURCE_SOURCE || new URL('../src/pages/resource.astro', import.meta.url), 'utf8');
const code = source.slice(source.indexOf('    function renderNotesList()'), source.indexOf('    async function deleteNoteComment('));
function fixture(email = 'author') {
  const elements = { notesList: {}, viewerNotesCount: {} };
  const note = { id: 'a', createdBy: 'author', createdByName: 'Author', createdAt: '2026-09-10', kind: 'area', page: 1, status: 'open', quote: 'Source', text: 'Note' };
  const context = vm.createContext({
    $: id => elements[id], document: {}, notesTrashView: false,
    trashedAnnotationsForViewerFile: () => [], annotationsForViewerFile: () => [note],
    parseSession: () => ({ email }), canWrite: false, lang: 'ko',
    t: key => key === 'notePageLabel' ? page => `${page} page` : key,
    esc: value => String(value), formatLogTime: value => value, highlightColorFor: () => '#008e92',
    commentDrafts: { a: 'Draft A', b: 'Draft B' }, commentSubmitInFlight: false, expandedNotes: new Set(),
    currentItem: { id: 'resource' }, authHeaders: () => ({}),
    fetch: async () => ({ ok: true, json: async () => ({ item: {} }) }),
    applyNoteMutationItem() {}, renderFilesAndFolders() {}, toast() {},
  });
  vm.runInContext(code, context);
  return { context, elements };
}
test('inline reply, header delete and checkbox replace action links', () => {
  const { context, elements } = fixture();
  context.renderNotesList();
  const html = elements.notesList.innerHTML;
  assert.match(html, /note-comment-input/);
  assert.match(html, /의견 남기기/);
  assert.match(html, /note-delete-button/);
  assert.match(html, /type="checkbox"/);
  assert.doesNotMatch(html, /note-item-actions|openCommentComposer/);
  assert.match(html, /<details class="note-item/);
  assert.match(html, /<summary class="note-summary" onclick=/);
  assert.doesNotMatch(html, /data-note-id="a" open/);
  context.expandedNotes.add('a');
  context.renderNotesList();
  assert.match(elements.notesList.innerHTML, /data-note-id="a" open/);
});
test('other users can reply but cannot delete or resolve', () => {
  const { context, elements } = fixture('reader');
  context.renderNotesList();
  assert.match(elements.notesList.innerHTML, /note-comment-input/);
  assert.match(elements.notesList.innerHTML, /type="checkbox"\s+disabled/);
  assert.doesNotMatch(elements.notesList.innerHTML, /note-delete-button/);
});
test('posting one reply preserves other note drafts', async () => {
  const { context } = fixture();
  await context.submitNoteComment('a');
  assert.equal(context.commentDrafts.a, undefined);
  assert.equal(context.commentDrafts.b, 'Draft B');
  assert.equal(context.commentSubmitInFlight, false);
});
