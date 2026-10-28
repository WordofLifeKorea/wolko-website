import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../src/pages/portal/resource.astro', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/portal.css', import.meta.url), 'utf8');
const lateCss = readFileSync(new URL('../public/pdf-viewer-layout.css', import.meta.url), 'utf8');

test('PDF viewer opens with notes closed and exposes an accessible toggle', () => {
  assert.match(page, /id="viewerNotesToggle"[^>]+aria-controls="notesPanel"[^>]+aria-expanded="false"/);
  assert.match(page, /id="notesPanel"[^>]+aria-hidden="true"/);
  assert.match(page, /toggleNotesPanel\(false\);/);
  assert.match(page, /setAttribute\('aria-expanded', String\(isOpen\)\)/);
});

test('notes use an overlay drawer without reducing the PDF width', () => {
  assert.match(css, /\.viewer-body \{[^}]*position:absolute;[^}]*inset:var\(--viewer-head-height\) 0 0;[^}]*overflow:hidden;/);
  assert.match(css, /\.viewer-stage \{[^}]*position:absolute;[^}]*inset:0;/);
  assert.match(css, /\.notes-panel \{[^}]*position:absolute;[^}]*width:clamp\(300px,30%,400px\)[^}]*transform:translateX\((420px|100%)\)/);
  assert.match(css, /\.notes-panel\.is-open \{[^}]*transform:translateX\(0\)/);
  assert.doesNotMatch(lateCss, /#viewerOverlay \.viewer-body\s*\{[^}]*grid-template-columns/);
  assert.doesNotMatch(lateCss, /#viewerOverlay \.notes-panel\s*\{[^}]*position:relative/);
  assert.match(page, /pdf-viewer-layout\.css\?v=8/);
});

test('viewer frame avoids Safari percentage-width flex sizing', () => {
  assert.match(css, /\.viewer-overlay \{[^}]*position:fixed;[^}]*inset:0;[^}]*display:block;[^}]*overflow:hidden;/);
  assert.match(css, /\.viewer-card \{[^}]*position:absolute;[^}]*inset:0;[^}]*width:auto;[^}]*max-width:none;[^}]*height:auto;/);
  assert.match(page, /window\.visualViewport\?\.addEventListener\('resize', scheduleViewerPdfResize\)/);
});

test('Safari viewer geometry is synchronized to the visible viewport', () => {
  assert.match(page, /document\.body\.classList\.toggle\('viewer-open', viewerOpen\)/);
  assert.match(page, /function syncViewerGeometry\(\)[\s\S]*card\.getBoundingClientRect\(\)[\s\S]*document\.documentElement\.clientWidth[\s\S]*Object\.assign\(body\.style/);
  assert.match(page, /Object\.assign\(stage\.style,[\s\S]*width: '100%'[\s\S]*height: '100%'/);
  assert.match(page, /window\.visualViewport\?\.addEventListener\('scroll', scheduleViewerPdfResize\)/);
  assert.match(lateCss, /body\.wolko-rail-active\.viewer-open \{ margin-left:0 !important; \}/);
  assert.match(lateCss, /body\.viewer-open #viewerOverlay,[\s\S]*width:100vw;height:100dvh/);
});

test('mobile notes open as a bottom sheet', () => {
  assert.match(css, /@media \(max-width:620px\)[\s\S]*\.notes-panel \{[^}]*position:fixed;[^}]*top:auto;[^}]*transform:translateY\(100%\)/);
  assert.match(css, /@media \(max-width:620px\)[\s\S]*\.notes-panel\.is-open \{[^}]*transform:translateY\(0\)/);
});

test('narrow Safari desktop uses the bottom sheet instead of a half-width blank area', () => {
  assert.match(lateCss, /#viewerOverlay \.viewer-body,[\s\S]*#viewerOverlay \.viewer-stage \{[^}]*left:0;right:0;width:auto;max-width:none/);
  assert.match(lateCss, /@media \(max-width:900px\)[\s\S]*#viewerOverlay \.notes-panel \{[^}]*position:fixed;[^}]*left:0;right:0;[^}]*max-height:min\(68dvh,620px\)[^}]*translate3d\(0,100%,0\)/);
  assert.match(lateCss, /@media \(max-width:900px\)[\s\S]*#viewerOverlay \.notes-panel\.is-open \{[^}]*translate3d\(0,0,0\)/);
});

test('note composer keeps its action buttons visible when the list is full', () => {
  assert.match(page, /class="note-composer-fields">[\s\S]*id="noteComposerQuote"[\s\S]*id="noteComposerText"[\s\S]*class="note-composer-actions"/);
  assert.match(css, /\.notes-panel > \.note-composer \{[^}]*flex:0 0 auto;[^}]*display:flex;[^}]*max-height:min\(52%,420px\);[^}]*overflow:hidden/);
  assert.match(css, /\.notes-panel > \.note-composer\[hidden\] \{[^}]*display:none/);
  assert.match(css, /\.note-composer-fields \{[^}]*overflow-y:auto/);
  assert.match(css, /\.note-composer-actions \{[^}]*flex-shrink:0/);
  assert.match(page, /portal\.css\?v=\d+/);
});

test('closing the notes panel clears a pending note composer', () => {
  assert.match(page, /function toggleNotesPanel\(force\)[\s\S]*if \(!isOpen && pendingNote\) cancelNoteComposer\(\)/);
});

test('mobile PDF viewer keeps the header and toolbar compact', () => {
  assert.match(page, /class="viewer-toolbar-icon"[^>]+aria-hidden="true"/);
  assert.match(page, /class="viewer-toolbar-label"/);
  assert.match(css, /@media \(max-width:620px\)[\s\S]*\.viewer-card \{[^}]*--viewer-head-height:44px/);
  assert.match(css, /@media \(max-width:620px\)[\s\S]*\.viewer-toolbar \{[^}]*min-height:40px;[^}]*flex-wrap:nowrap/);
  assert.match(css, /@media \(max-width:620px\)[\s\S]*\.viewer-page-nav button \{[^}]*display:none/);
  assert.match(css, /@media \(max-width:620px\)[\s\S]*\.viewer-head \.icon-close \{[^}]*width:32px !important;[^}]*height:32px !important/);
});

test('shared notes expose threaded comments and automatic refresh', () => {
  assert.match(page, /data-t="notesShared"/);
  assert.match(page, /fetch\('\/api\/portal\/resource-comment'/);
  assert.match(page, /window\.setInterval\(syncViewerAnnotations, 5000\)/);
  assert.match(page, /document\.addEventListener\('visibilitychange'/);
  assert.match(css, /\.note-comments \{/);
  assert.match(css, /\.note-comment-composer \{/);
});

test('PDF text selection is clipped to the actual pointer gesture', () => {
  assert.match(page, /captureTextSelectionRects\(surfaceEl, textLayerEl, null, range\)/);
  assert.match(page, /document\.createTreeWalker\(textLayerEl, NodeFilter\.SHOW_TEXT\)/);
  assert.match(page, /selectionRectTouchesGesture\(rect, gestureBounds\)/);
  assert.match(page, /renderPendingTextSelection\(surfaceEl, captured\.rects\)/);
  assert.match(page, /window\.getSelection\(\)\?\.removeAllRanges\(\)/);
  assert.match(css, /\.textLayer \{[^}]*-webkit-text-size-adjust:none;[^}]*-webkit-user-select:text;/);
});

test('hovering a highlight shows an "author: note" tooltip above it instead of a native title', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/portal/resource.astro', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/portal.css', import.meta.url), 'utf8');
  assert.match(page, /function showHighlightTooltip\(box, annotation, event\)/);
  assert.match(page, /box\.addEventListener\('mouseenter', event => showHighlightTooltip\(box, a, event\)\)/);
  assert.match(page, /box\.addEventListener\('mouseleave', scheduleHideHighlightTooltip\)/);
  assert.match(page, /hlTooltipKey === key/, '같은 노트(들)의 다른 줄로 옮겨도 말풍선을 새로 띄우지 않는다');
  assert.match(page, /function notesAtPoint\(x, y, fallbackId\)/, '겹친 하이라이트는 그 지점의 노트를 모두 모아 보여준다');
  assert.match(page, /function renderOverlapBadges\(surface, notes\)/);
  assert.match(css, /\.hl-overlap-badge\s*\{[^}]*pointer-events:none/);
  assert.doesNotMatch(page, /box\.title = `\$\{a\.createdByName\}: \$\{a\.text\}`/);
  assert.match(css, /\.hl-tooltip\s*\{[^}]*position:fixed/);
});

test('clicking a highlight pins its note with a close button; area notes are written in an inline composer under the highlight', async () => {
  assert.match(page, /box\.addEventListener\('click', event => \{ event\.stopPropagation\(\); pinNotes\(notesAtPoint\(event\.clientX, event\.clientY, a\.id\)\); \}\)/);
  assert.match(page, /function closePinnedNote\(\)/);
  assert.match(page, /class="note-pin-close"[^>]*onclick="closePinnedNote\(\)"/);
  assert.match(page, /id="inlineComposer"/);
  assert.match(page, /const inline = pending\.kind === 'area'/);
  // 문서 위에 표시한 영역은 오른쪽 패널을 열지 않는다
  assert.match(page, /if \(inline\) \{\s*closePinnedNote\(\);/);
  assert.match(page, /function preciseRangeFromGesture\(textLayerEl, gesture\)/);
  assert.match(page, /caretRangeFromPoint/);
});

test('text highlight uses caret-exact boundaries, resolves gaps to the nearest glyph, and paints a live preview while dragging', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/portal/resource.astro', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../public/portal.css', import.meta.url), 'utf8');
  assert.match(page, /function nearestTextBoundary\(textLayerEl, x, y\)/);
  assert.match(page, /function textBoundaryAt\(textLayerEl, x, y\)/);
  assert.match(page, /document\.addEventListener\('pointermove', onMove\)/);
  assert.match(page, /if \(captured\) renderPendingTextSelection\(surfaceEl, captured\.rects\); else clearPreview\(\);/);
  assert.match(css, /@media \(hover:hover\) and \(pointer:fine\) \{ \.textLayer ::selection \{ background:transparent; \} \}/);
});

test('mouse highlight anchors its start boundary on pointerdown, follows scroll, and stops at the page end', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/portal/resource.astro', import.meta.url), 'utf8');
  assert.match(page, /const start = textBoundaryAt\(textLayerEl, event\.clientX, event\.clientY\);/);
  assert.match(page, /scroller\(\)\?\.addEventListener\('scroll', onScroll\)/);
  assert.match(page, /function layerEdgeBoundary\(textLayerEl, x, y\)/);
  assert.match(page, /document\.addEventListener\('pointerup', onUp\)/);
});
