import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(process.env.RESOURCE_SOURCE || new URL('../src/pages/resource.astro', import.meta.url), 'utf8');
const rendering = source.slice(source.indexOf('    let viewerRendering ='), source.indexOf('    // 실제 글자를 드래그로'));
const controls = source.slice(source.indexOf('    function viewerPrevPage()'), source.indexOf('    function toggleDrawMode'));

for (const width of [390, 1440]) {
  test(`fit page then navigate at viewport width ${width}`, async () => {
    const rendered = [];
    const surface = { clientWidth: width, getBoundingClientRect: () => ({ top: 120, bottom: 2000 }), scrollTo() {} };
    const elements = {
      viewerSurface: surface,
      viewerCanvas: { style: {}, getContext: () => ({}) },
      viewerOverlay: { getBoundingClientRect: () => ({ bottom: 800 }) },
      viewerPageLabel: {}, viewerZoomLabel: {},
    };
    const context = vm.createContext({
      $: id => elements[id],
      getComputedStyle: () => ({ paddingTop: '16px', paddingBottom: '16px', paddingLeft: '16px', paddingRight: '16px' }),
      window: { innerHeight: 800, devicePixelRatio: 2, visualViewport: { offsetTop: 0, height: 800 } },
      viewerPdfDoc: { numPages: 33, async getPage(number) {
        return { getViewport: ({ scale }) => ({ width: 600 * scale, height: 900 * scale, scale }),
          render: ({ viewport }) => { rendered.push({ number, ...viewport }); return { promise: Promise.resolve() }; } };
      } },
      viewerPage: 1, viewerZoom: 1, viewerFitMode: 'width',
      renderTextLayer: async () => {}, syncPageNav() {}, renderHighlights() {},
      t: () => (page, total) => `${page} / ${total}`,
    });
    vm.runInContext(rendering + controls, context);
    await context.viewerFitPage();
    assert.ok(rendered.at(-1).height <= 644);
    assert.ok(rendered.at(-1).width <= width - 32);
    context.viewerNextPage();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(elements.viewerPageLabel.textContent, '2 / 33');
    assert.equal(rendered.at(-1).number, 2);
    context.viewerPrevPage();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(elements.viewerPageLabel.textContent, '1 / 33');
    context.viewerZoomReset();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(elements.viewerZoomLabel.textContent, '100%');
  });
}
