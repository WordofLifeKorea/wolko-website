import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/pages/resource.astro', import.meta.url), 'utf8');
const start = source.indexOf('    function selectionGestureBounds(');
const end = source.indexOf('    function selectedCharactersInGesture(', start);
const context = vm.createContext({});
vm.runInContext(source.slice(start, end), context);
const rect = { left: 200, width: 12, top: 30, bottom: 50, height: 20 };
const gesture = (startX, startY, endX, endY, pointerType = 'mouse') =>
  context.selectionGestureBounds({ startX, startY, endX, endY, pointerType });

test('single-line selection excludes neighboring columns in both directions', () => {
  for (const bounds of [gesture(10, 40, 100, 40), gesture(100, 40, 10, 40)]) {
    assert.equal(context.selectionRectTouchesGesture(rect, bounds), false);
    assert.equal(context.selectionRectTouchesGesture({ ...rect, left: 50 }, bounds), true);
  }
});
test('wrapped selection preserves text beyond drag endpoints in both directions', () => {
  for (const bounds of [gesture(100, 10, 50, 70), gesture(50, 70, 100, 10)]) {
    assert.equal(context.selectionRectTouchesGesture(rect, bounds), true);
    assert.equal(context.selectionRectTouchesGesture({ ...rect, left: 0 }, bounds), true);
  }
});
test('word clicks and touch handles preserve native selection', () => {
  assert.equal(gesture(50, 40, 51, 40), null);
  assert.equal(gesture(50, 40, 100, 40, 'touch'), null);
  assert.equal(context.selectionRectTouchesGesture(rect, null), true);
});

test('punctuation range cannot pull in paragraphs below or above the drag', () => {
  for (const bounds of [gesture(10, 40, 100, 56), gesture(100, 56, 10, 40)]) {
    // Small glyphs previously bypassed all bounds when the pointer drifted down.
    assert.equal(context.selectionRectTouchesGesture({ left: 90, width: 3, top: 45, bottom: 50, height: 5 }, bounds), true);
    assert.equal(context.selectionRectTouchesGesture({ ...rect, top: 90, bottom: 110 }, bounds), false);
    assert.equal(context.selectionRectTouchesGesture({ ...rect, top: 0, bottom: 20 }, bounds), false);
  }
});

test('multiline selection still excludes content past the last selected line', () => {
  const bounds = gesture(100, 10, 50, 70);
  assert.equal(context.selectionRectTouchesGesture({ ...rect, top: 100, bottom: 120 }, bounds), false);
});
