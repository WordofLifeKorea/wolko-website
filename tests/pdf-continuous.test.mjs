import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function fixture() {
  let root;
  class Element {
    constructor() { this.style = { setProperty() {} }; this.dataset = {}; this.children = []; this.scrollTop = 0; this.clientHeight = 700; }
    append(...children) { children.forEach(child => { child.parent = this; this.children.push(child); }); }
    replaceChildren(...children) { this.children = []; this.append(...children); }
    setAttribute() {}
    addEventListener() {}
    removeEventListener() {}
    contains() { return false; }
    querySelectorAll() { return []; }
    getContext() { return {}; }
    getBoundingClientRect() {
      if (this === root) return { top: 100, bottom: 800 };
      const index = this.parent.children.indexOf(this);
      const top = 116 - root.scrollTop + this.parent.children.slice(0, index).reduce((sum, e) => sum + parseFloat(e.style.height || 0) + 20, 0);
      return { top, bottom: top + parseFloat(this.style.height || 0) };
    }
  }
  root = new Element();
  const rendered = [], ready = [], pageChanges = [];
  const pdf = { numPages: 33, destroyed: false, destroy() { this.destroyed = true; },
    async getPage(number) { return {
      getViewport: ({ scale }) => ({ scale, width: 600 * scale, height: 900 * scale }),
      streamTextContent() { return {}; },
      render() { rendered.push(number); return { promise: Promise.resolve(), cancel() {} }; },
    }; },
  };
  const context = vm.createContext({
    window: { devicePixelRatio: 2 }, console,
    document: { createElement: () => new Element(), activeElement: null },
    cancelAnimationFrame() {}, requestAnimationFrame: fn => { fn(); return 1; },
  });
  vm.runInContext(readFileSync(new URL('../public/pdf-continuous.js', import.meta.url), 'utf8'), context);
  const viewer = new context.window.WolkoPdfContinuous(root, pdf, { TextLayer: class { async render() {} cancel() {} } },
    number => pageChanges.push(number), (shell, number) => ready.push(number), () => {});
  return { viewer, root, pdf, rendered, ready, pageChanges };
}

test('all pages laid out, only nearby canvases rendered, navigation evicts old pages', async () => {
  const { viewer, rendered, pageChanges, pdf } = fixture();
  await viewer.init();
  await viewer.setScale(1, 1);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(viewer.entries.length, 33);
  assert.ok(rendered.length < 5);
  viewer.scrollToPage(20);
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(rendered.includes(20));
  assert.equal(viewer.entries[0].canvas.width, 0);
  viewer.updateCurrentPage();
  assert.equal(pageChanges.at(-1), 20);
  await viewer.setScale(.5, 20);
  await new Promise(resolve => setImmediate(resolve));
  viewer.updateCurrentPage();
  assert.equal(pageChanges.at(-1), 20);
  assert.equal(viewer.entries[19].viewport.height, 450);
  viewer.destroy();
  assert.equal(pdf.destroyed, true);
  assert.ok(viewer.entries.every(e => e.canvas.width === 0));
});

test('high zoom canvas pixel allocation stays bounded', async () => {
  const { viewer } = fixture();
  await viewer.init();
  await viewer.setScale(3, 1);
  await new Promise(resolve => setImmediate(resolve));
  assert.ok(viewer.entries[0].canvas.width * viewer.entries[0].canvas.height < 4010000);
  viewer.destroy();
});

test('single page toggle hides other pages and can return to scrolling', async () => {
  const { viewer, pageChanges } = fixture();
  await viewer.init();
  await viewer.setScale(1, 1);
  viewer.setSinglePage(true, 1);
  assert.equal(viewer.entries.filter(e => !e.shell.hidden).length, 1);
  viewer.scrollToPage(2);
  assert.equal(viewer.entries[0].shell.hidden, true);
  assert.equal(viewer.entries[1].shell.hidden, false);
  assert.equal(pageChanges.at(-1), 2);
  viewer.setSinglePage(false, 2);
  assert.equal(viewer.entries.filter(e => !e.shell.hidden).length, 33);
  viewer.destroy();
});
