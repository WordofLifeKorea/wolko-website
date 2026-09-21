import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../src/pages/resource.astro', import.meta.url), 'utf8');
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
  assert.match(css, /\.notes-panel \{[^}]*position:absolute;[^}]*width:clamp\(300px,30%,400px\)[^}]*transform:translateX\(420px\)/);
  assert.match(css, /\.notes-panel\.is-open \{[^}]*transform:translateX\(0\)/);
  assert.doesNotMatch(lateCss, /#viewerOverlay \.viewer-body\s*\{[^}]*grid-template-columns/);
  assert.doesNotMatch(lateCss, /#viewerOverlay \.notes-panel\s*\{[^}]*position:relative/);
  assert.match(page, /pdf-viewer-layout\.css\?v=7/);
});

test('viewer frame avoids Safari percentage-width flex sizing', () => {
  assert.match(css, /\.viewer-overlay \{[^}]*position:fixed;[^}]*inset:0;[^}]*display:block;[^}]*overflow:hidden;/);
  assert.match(css, /\.viewer-card \{[^}]*position:absolute;[^}]*inset:0;[^}]*width:auto;[^}]*max-width:none;[^}]*height:auto;/);
  assert.match(page, /window\.visualViewport\?\.addEventListener\('resize', scheduleViewerPdfResize\)/);
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
  assert.match(page, /portal\.css\?v=61/);
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
  assert.match(page, /captureTextSelectionRects\(surfaceEl, textLayerEl, completedGesture\)/);
  assert.match(page, /document\.createTreeWalker\(textLayerEl, NodeFilter\.SHOW_TEXT\)/);
  assert.match(page, /selectionRectTouchesGesture\(rect, gestureBounds\)/);
  assert.match(page, /renderPendingTextSelection\(surfaceEl, captured\.rects\)/);
  assert.match(page, /window\.getSelection\(\)\?\.removeAllRanges\(\)/);
  assert.match(css, /\.textLayer \{[^}]*-webkit-text-size-adjust:none;[^}]*-webkit-user-select:text;/);
});
