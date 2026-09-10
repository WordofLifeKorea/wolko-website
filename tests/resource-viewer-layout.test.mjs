import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(new URL('../src/pages/resource.astro', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/portal.css', import.meta.url), 'utf8');

test('PDF viewer opens with notes closed and exposes an accessible toggle', () => {
  assert.match(page, /id="viewerNotesToggle"[^>]+aria-controls="notesPanel"[^>]+aria-expanded="false"/);
  assert.match(page, /id="notesPanel"[^>]+aria-hidden="true"/);
  assert.match(page, /toggleNotesPanel\(false\);/);
  assert.match(page, /setAttribute\('aria-expanded', String\(isOpen\)\)/);
});

test('notes use an overlay drawer without reducing the PDF width', () => {
  assert.match(css, /\.viewer-body \{[^}]*position:relative;[^}]*overflow:hidden;/);
  assert.match(css, /\.notes-panel \{[^}]*position:absolute;[^}]*width:clamp\(300px,30vw,400px\)[^}]*transform:translateX\(100%\)/);
  assert.match(css, /\.notes-panel\.is-open \{[^}]*transform:translateX\(0\)/);
});

test('mobile notes open as a bottom sheet', () => {
  assert.match(css, /@media \(max-width:620px\)[\s\S]*\.notes-panel \{[^}]*position:fixed;[^}]*top:auto;[^}]*transform:translateY\(100%\)/);
  assert.match(css, /@media \(max-width:620px\)[\s\S]*\.notes-panel\.is-open \{[^}]*transform:translateY\(0\)/);
});
