import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = readFileSync(new URL('../src/pages/resource.astro', import.meta.url), 'utf8');
const start = source.indexOf('    function handleNoteComposerKeydown(');
const end = source.indexOf("    document.addEventListener('keydown', handleNoteComposerKeydown", start);
function setup() {
  const input = { value: 'abc', selectionStart: 1, selectionEnd: 2, maxLength: 500,
    setRangeText(text, start, end) { this.value = this.value.slice(0, start) + text + this.value.slice(end); },
    dispatchEvent() {} }, composer = { hidden: false };
  let saved = 0, cancelled = 0;
  const context = vm.createContext({ Event, $: id => id === 'noteComposer' ? composer : input,
    submitNoteComposer: () => saved++, cancelNoteComposer: () => cancelled++ });
  vm.runInContext(source.slice(start, end), context);
  return { input, composer, fire: options => context.handleNoteComposerKeydown({ target: input, preventDefault() {}, stopImmediatePropagation() {}, ...options }), counts: () => [saved, cancelled] };
}
test('Enter saves and Escape cancels', () => {
  const s = setup(); s.fire({ key: 'Enter' }); s.fire({ key: 'Escape' });
  assert.deepEqual(s.counts(), [1, 1]);
});
test('Shift Enter, IME, held Enter and hidden composer do not submit', () => {
  const s = setup();
  for (const options of [{ shiftKey: true }, { isComposing: true }, { keyCode: 229 }, { repeat: true }]) s.fire({ key: 'Enter', ...options });
  s.fire({ key: 'Escape', isComposing: true });
  s.composer.hidden = true; s.fire({ key: 'Enter' });
  assert.deepEqual(s.counts(), [0, 0]);
});
test('Shift and Alt Enter insert a newline at the selection without saving', () => {
  for (const modifier of ['shiftKey', 'altKey']) {
    const s = setup();
    s.fire({ key: 'Enter', [modifier]: true });
    assert.equal(s.input.value, 'a\nc');
    assert.deepEqual(s.counts(), [0, 0]);
  }
});
