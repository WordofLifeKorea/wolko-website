import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext, Script } from 'node:vm';

const page = readFileSync(new URL('../src/pages/camp-resources/index.astro', import.meta.url), 'utf8');
function setup(fetcher = async () => ({ ok:true, json:async () => ({ url:'/file.pdf', items:[] }) })) {
  const element = () => ({ value:'', disabled:false, textContent:'', hidden:false });
  const nodes = new Map();
  const checks = [{ value:'camp-1', disabled:false }];
  const els = Object.fromEntries(['itemTitle', 'itemUrl', 'itemArchiveUrl', 'itemBgmUrl', 'uploadBgmBtn',
    'uploadFileBtn', 'itemDialogError', 'itemTeam', 'itemPerson', 'itemDialogSaveBtn', 'itemDialogCancelBtn',
    'itemDialogBackdrop'].map(key => [key, element()]));
  els.itemTeam.value = 'WOLKO'; els.itemPerson.value = 'Member';
  els.campCheckboxList = { querySelectorAll:() => checks };
  const uploadedSingles = [];
  const source = page.slice(page.indexOf('    let batchFiles = [];'), page.indexOf('    async function uploadFile('));
  const api = runInNewContext(source + `\n({receivePresentationFiles, saveBatchFiles,
    entries:() => batchFiles, busy:() => batchBusy, setEdit:id => {editingItemId=id;}})`, {
    els, document:{ getElementById(id) { if (!nodes.has(id)) nodes.set(id, element()); return nodes.get(id); } },
    currentLang:'en', editingItemId:'', dialogTab:'teacher', TEAM_WOLKO:'WOLKO', token:'signed', items:[],
    tr:key => key, escapeHtml:String, render() {}, FormData, fetch:fetcher,
    uploadFile:async file => uploadedSingles.push(file.name),
  });
  return { api, els, checks, uploadedSingles };
}
const file = name => new File(['test'], name);

test('file picker and drop pass every selected file to the batch queue', () => {
  assert.match(page, /id="uploadFileInput"[^>]*multiple/);
  assert.doesNotMatch(page, /id="uploadFileInput"[^>]*accept=/);
  assert.match(page, /Array\.from\(event\.dataTransfer\.files \|\| \[\]\)/);
  assert.match(page, /await handleFiles\(files\)/);
  assert.match(page, /await receivePresentationFiles\(files\)/);
  const inline = [...page.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(match => match[1]);
  inline.forEach(source => new Script(source.replace(/^\s*import .*;$/gm, '')));
});

test('multiple files create separate cards sequentially with common folder and camps', async () => {
  const calls = [];
  const { api, els } = setup(async (url, opts) => {
    calls.push({ url, opts });
    return { ok:true, json:async () => ({ url:'/files/' + calls.length, items:[] }) };
  });
  await api.receivePresentationFiles([file('Lesson.pdf'), file('Slides.pptx')]);
  assert.equal(calls.length, 0);
  assert.equal(els.itemTitle.disabled, true);
  await api.saveBatchFiles();
  assert.deepEqual(calls.map(c => c.url), ['/api/teach/upload', '/api/teach/data', '/api/teach/upload', '/api/teach/data']);
  const cards = calls.filter(c => c.url.endsWith('/data')).map(c => JSON.parse(c.opts.body).item);
  assert.deepEqual(cards.map(c => c.title), ['Lesson', 'Slides']);
  assert.ok(cards.every(c => c.team === 'WOLKO' && c.campIds[0] === 'camp-1' && c.archiveUrl));
  assert.equal(els.itemDialogBackdrop.hidden, true);
  assert.equal(api.busy(), false);
});

test('retry skips saved files and reuses the uploaded URL after a save failure', async () => {
  let uploads = 0, saves = 0;
  const { api, els } = setup(async url => {
    if (url.endsWith('/upload')) { uploads++; return { ok:true, json:async () => ({ url:'/file-' + uploads }) }; }
    saves++;
    return { ok:saves !== 2, json:async () => saves === 2 ? { error:'Temporary failure' } : { items:[] } };
  });
  await api.receivePresentationFiles([file('a.pdf'), file('b.pdf')]);
  await api.saveBatchFiles();
  assert.equal(uploads, 2); assert.equal(saves, 2);
  assert.equal(els.itemDialogBackdrop.hidden, false);
  assert.deepEqual(Array.from(api.entries(), e => e.status), ['saved', 'failed']);
  await api.saveBatchFiles();
  assert.equal(uploads, 2); assert.equal(saves, 3);
  assert.equal(els.itemDialogBackdrop.hidden, true);
});

test('all formats and files over the former limit reach the upload service', async () => {
  let requests = 0;
  const { api } = setup(async () => { requests++; return { ok:true, json:async () => ({ url:'/good.pdf', items:[] }) }; });
  await api.receivePresentationFiles([file('bad.exe'), { name:'huge.pdf', size:21 * 1024 * 1024 }, file('good.pdf')]);
  await api.saveBatchFiles();
  assert.equal(requests, 6);
  assert.deepEqual(Array.from(api.entries(), e => e.status), ['saved', 'saved', 'saved']);
});

test('single-file behavior remains intact and editing rejects multiple replacements', async () => {
  const { api, uploadedSingles, els } = setup();
  await api.receivePresentationFiles([file('single.pdf')]);
  assert.deepEqual(uploadedSingles, ['single.pdf']);
  api.setEdit('existing');
  await api.receivePresentationFiles([file('a.pdf'), file('b.pdf')]);
  assert.equal(api.entries().length, 0);
  assert.match(els.itemDialogError.textContent, /new resources/);
});

test('no uploads begin without a selected camp', async () => {
  let requests = 0;
  const { api, checks } = setup(async () => { requests++; });
  checks.splice(0);
  await api.receivePresentationFiles([file('a.pdf'), file('b.pdf')]);
  await api.saveBatchFiles();
  assert.equal(requests, 0);
});

test('a running batch ignores duplicate save or drop requests', async () => {
  let release;
  let requests = 0;
  const { api } = setup(async () => {
    requests++;
    if (requests === 1) await new Promise(resolve => { release = resolve; });
    return { ok:true, json:async () => ({ url:'/file.pdf', items:[] }) };
  });
  await api.receivePresentationFiles([file('a.pdf'), file('b.pdf')]);
  const pending = api.saveBatchFiles();
  await api.saveBatchFiles();
  await api.receivePresentationFiles([file('c.pdf'), file('d.pdf')]);
  assert.equal(api.entries().length, 2);
  assert.equal(requests, 1);
  release();
  await pending;
  assert.equal(requests, 4);
});
