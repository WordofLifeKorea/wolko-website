/* 자료실 「폴더별 보기」: 폴더 안에 폴더(최대 5단계)를 들여쓴 카드로 보여 주고, 폴더 만들기·이름 바꾸기·옮기기·순서 바꾸기·삭제를 한다.
   files.js 가 데이터(S)와 파일 줄 그리기를 넘겨 주고(CTTree.init), 이 파일은 트리 그리기·끌어다 놓기·창(새 폴더/폴더로 이동/삭제)을 맡는다. */
(function () {
  CT.addDict({
    ko: {
      folderNew: '＋ 새 폴더', folderNewIn: '＋ 새 폴더', folderNewTitle: '새 폴더 만들기', folderNewInTitle: function (n) { return '「' + n + '」 안에 새 폴더'; }, folderRenameTitle: '폴더 이름 바꾸기', folderRenameBtn: '이름 바꾸기',
      folderMove: '폴더로 이동', moveUp: '↑ 위로', moveDown: '↓ 아래로', folderOpenAll: '모두 펼치기', folderCloseAll: '모두 접기', folderOpen: '펼치기', folderClose: '접기',
      ftHint: '컴퓨터에서는 끌어다 놓아서 옮기거나 순서를 바꿀 수 있어요. 폰에서는 「폴더로 이동」과 「위로/아래로」 버튼을 쓰세요.', ftRoot: '여기에 놓으면 맨 위(폴더 밖)로 옮겨져요', ftLoose: '폴더 없는 자료', ftEmptyFolder: '비어 있는 폴더예요.', ftNone: '아직 폴더가 없어요. 「＋ 새 폴더」로 만들어 보세요.',
      ftCount: function (nf, nfile) { return (nf ? '폴더 ' + nf + '개 · ' : '') + '파일 ' + nfile + '개'; }, ftSaved: '저장했어요', ftMoved: '옮겼어요', ftOrdered: '순서를 바꿨어요', ftDeleted: '삭제했어요. 휴지통에서 복구할 수 있어요.', ftMade: '폴더를 만들었어요',
      moveTitle: function (n) { return '「' + n + '」을(를) 어디로 옮길까요?'; }, moveTop: '맨 위 (폴더 밖)', moveHere: '지금 여기 있어요', moveNoSelf: '자기 안으로는 옮길 수 없어요', moveTooDeep: '폴더는 5단계까지만 돼요', moveHint: '옮길 폴더를 누르세요.',
      folderDelTitle: function (n) { return '「' + n + '」 폴더를 삭제할까요?'; }, folderDelInside: function (nf, nfile) { return nf || nfile ? '안에 ' + (nf ? '폴더 ' + nf + '개, ' : '') + '파일 ' + nfile + '개가 있어요.' : '안에 아무것도 없어요.'; },
      folderDelLift: '안의 파일과 폴더를 한 단계 위로 옮기고 이 폴더만 지우기', folderDelAll: '안의 파일과 폴더까지 모두 삭제', folderDelNote: '삭제해도 언제든지 휴지통에서 복구할 수 있어요.', folderDelGo: '삭제', folderDelBtn: '삭제'
    },
    en: {
      folderNew: '＋ New folder', folderNewIn: '＋ New folder', folderNewTitle: 'New folder', folderNewInTitle: function (n) { return 'New folder in "' + n + '"'; }, folderRenameTitle: 'Rename folder', folderRenameBtn: 'Rename',
      folderMove: 'Move to folder', moveUp: '↑ Up', moveDown: '↓ Down', folderOpenAll: 'Expand all', folderCloseAll: 'Collapse all', folderOpen: 'Expand', folderClose: 'Collapse',
      ftHint: 'On a computer you can drag and drop to move or reorder. On a phone, use the "Move to folder" and "Up/Down" buttons.', ftRoot: 'Drop here to move to the top level (outside folders)', ftLoose: 'Files without a folder', ftEmptyFolder: 'This folder is empty.', ftNone: 'No folders yet. Create one with "＋ New folder".',
      ftCount: function (nf, nfile) { return (nf ? nf + ' folder' + (nf > 1 ? 's' : '') + ' · ' : '') + nfile + ' file' + (nfile === 1 ? '' : 's'); }, ftSaved: 'Saved', ftMoved: 'Moved', ftOrdered: 'Order changed', ftDeleted: 'Deleted. You can restore it from the Trash.', ftMade: 'Folder created',
      moveTitle: function (n) { return 'Where do you want to move "' + n + '"?'; }, moveTop: 'Top level (outside folders)', moveHere: 'It is here now', moveNoSelf: 'Cannot move into itself', moveTooDeep: 'Folders go 5 levels deep at most', moveHint: 'Tap the destination folder.',
      folderDelTitle: function (n) { return 'Delete the folder "' + n + '"?'; }, folderDelInside: function (nf, nfile) { return nf || nfile ? 'It contains ' + (nf ? nf + ' folder' + (nf > 1 ? 's' : '') + ' and ' : '') + nfile + ' file' + (nfile === 1 ? '' : 's') + '.' : 'It is empty.'; },
      folderDelLift: 'Move the files and folders inside up one level, and delete only this folder', folderDelAll: 'Delete this folder together with everything inside', folderDelNote: 'You can always restore it from the Trash.', folderDelGo: 'Delete', folderDelBtn: 'Delete'
    }
  });
  var MAX = 5, ctx = null, M = { byId: {}, kids: {}, filesBy: {}, fileById: {} }, drag = null, msg = '', OPEN = {};
  var esc = CT.esc;
  try { var saved = JSON.parse(localStorage.getItem('ct-files-open') || '[]'); (saved || []).forEach(function (id) { OPEN[id] = 1; }); } catch (e) { /* 저장 못 해도 괜찮다 */ }
  function saveOpen() { try { localStorage.setItem('ct-files-open', JSON.stringify(Object.keys(OPEN).slice(0, 400))); } catch (e) { /* 무시 */ } }
  function can() { return !!(ctx && ctx.can()); }
  function label(f) { return ctx.label(f); }

  /* ---- 자료를 트리로 정리 ---- */
  function build(folders, items) {
    M = { byId: {}, kids: { '': [] }, filesBy: { '': [] }, fileById: {} };
    folders.forEach(function (f) { M.byId[f.id] = f; });
    folders.forEach(function (f) { var p = f.parentId && M.byId[f.parentId] && f.parentId !== f.id ? f.parentId : ''; (M.kids[p] = M.kids[p] || []).push(f); });
    items.forEach(function (x) { var k = x.folderId && M.byId[x.folderId] ? x.folderId : ''; (M.filesBy[k] = M.filesBy[k] || []).push(x); M.fileById[x.id] = x; });
  }
  function parentOf(kind, id) {
    if (kind === 'folder') { var f = M.byId[id]; return f && f.parentId && M.byId[f.parentId] ? f.parentId : ''; }
    var x = M.fileById[id]; return x && x.folderId && M.byId[x.folderId] ? x.folderId : '';
  }
  function depthOf(id) { var d = 0, cur = M.byId[id], seen = {}; while (cur && !seen[cur.id]) { seen[cur.id] = 1; d++; cur = cur.parentId ? M.byId[cur.parentId] : null; } return d; }
  function heightOf(id, seen) { seen = seen || {}; if (seen[id]) return 0; seen[id] = 1; var h = 0; (M.kids[id] || []).forEach(function (k) { h = Math.max(h, heightOf(k.id, seen)); }); return h + 1; }
  function isUnder(id, anc) { var cur = M.byId[id], seen = {}; while (cur && !seen[cur.id]) { if (cur.id === anc) return true; seen[cur.id] = 1; cur = cur.parentId ? M.byId[cur.parentId] : null; } return false; }
  function subFolders(id) { var n = 0; (M.kids[id] || []).forEach(function (k) { n += 1 + subFolders(k.id); }); return n; }
  function subFiles(id) { var n = (M.filesBy[id] || []).length; (M.kids[id] || []).forEach(function (k) { n += subFiles(k.id); }); return n; }
  function sibs(kind, parent) { return (kind === 'folder' ? (M.kids[parent || ''] || []) : (M.filesBy[parent || ''] || [])).map(function (x) { return x.id; }); }
  /** 폴더 id 를 parent('' = 맨 위) 밑으로 옮겨도 되는지 */
  function folderMoveOk(id, parent) { if (!parent) return true; if (parent === id || isUnder(parent, id)) return false; return depthOf(parent) + heightOf(id) <= MAX; }
  function hasContent(id) { return !!ctx.S.filtered ? subFiles(id) > 0 : true; }

  /* ---- 그리기 ---- */
  function btn(attr, text, extra) { return '<button type="button" class="btn sm ' + (extra || '') + '" ' + attr + '>' + esc(text) + '</button>'; }
  function fileCount(f) { return ctx.S.filtered ? subFiles(f.id) : (f.treeCount != null ? f.treeCount : subFiles(f.id)); }
  function node(f, depth) {
    var open = !!OPEN[f.id], subs = (M.kids[f.id] || []).filter(function (k) { return hasContent(k.id); }), fl = M.filesBy[f.id] || [], ed = can(), sib = sibs('folder', parentOf('folder', f.id)), at = sib.indexOf(f.id);
    var camp = f.campKo || f.campEn ? ' · ' + (CT.lang() === 'en' ? (f.campEn || f.campKo) : (f.campKo || f.campEn)) : '';
    var h = '<div class="fnode" data-depth="' + depth + '"><div class="fcard' + (ctx.S.focus === f.id ? ' focus' : '') + '"' + (ed ? ' draggable="true" data-drag="folder:' + esc(f.id) + '"' : '') + '>' +
      '<button type="button" class="fcaret" data-toggle="' + esc(f.id) + '" aria-expanded="' + open + '" title="' + esc(CT.t(open ? 'folderClose' : 'folderOpen')) + '">' + (open ? '▾' : '▸') + '</button>' +
      '<div class="fmain" data-toggle="' + esc(f.id) + '"><span class="fi">' + (open ? '📂' : '📁') + '</span><span class="ft"><b>' + esc(label(f)) + '</b><small>' + esc(CT.t('ftCount')((M.kids[f.id] || []).length, fileCount(f)) + camp) + '</small></span></div>';
    if (ed) h += '<div class="fact">' + (depth < MAX ? btn('data-fnew="' + esc(f.id) + '"', CT.t('folderNewIn')) : '') + btn('data-frename="' + esc(f.id) + '"', CT.t('folderRenameBtn')) + btn('data-fmove="folder:' + esc(f.id) + '"', CT.t('folderMove')) +
      (at > 0 ? btn('data-fup="folder:' + esc(f.id) + '"', CT.t('moveUp')) : '') + (at >= 0 && at < sib.length - 1 ? btn('data-fdown="folder:' + esc(f.id) + '"', CT.t('moveDown')) : '') + btn('data-fdel="' + esc(f.id) + '"', CT.t('folderDelBtn'), 'danger') + '</div>';
    h += '</div>';
    if (open) {
      h += '<div class="fkids">' + subs.map(function (k) { return node(k, depth + 1); }).join('') + fl.map(function (x, i) { return ctx.fileRow(x, { tree: true, up: i > 0, down: i < fl.length - 1 }); }).join('') + (!subs.length && !fl.length ? '<div class="fempty">' + esc(CT.t('ftEmptyFolder')) + '</div>' : '') + '</div>';
    }
    return h + '</div>';
  }
  function html() {
    var S = ctx.S; build(S.folders, S.items);
    var ed = can(), tops = (M.kids[''] || []).filter(function (k) { return hasContent(k.id); }), loose = M.filesBy[''] || [];
    var h = '<div class="ft-tool">' + (ed ? btn('data-fnew=""', CT.t('folderNew'), 'pri') : '') + (S.folders.length ? btn('data-openall="1"', CT.t('folderOpenAll')) + btn('data-openall="0"', CT.t('folderCloseAll')) : '') + '<span class="hint" id="ftMsg" role="status" aria-live="polite">' + esc(msg) + '</span></div>';
    if (ed) h += '<div class="hint ft-dnd">' + esc(CT.t('ftHint')) + '</div>';
    if (S.portalTotal) h += '<div class="folder-grid ft-portal"><button type="button" class="folder-card" data-folder="portal"><span class="fi">🌐</span><b>' + esc(CT.t('portalFolder')) + '</b><small>' + S.portalTotal + esc(CT.t('folderFiles')) + ' · ' + esc(CT.t('portalRO')) + '</small></button></div>';
    if (ed) h += '<div class="ft-root" data-droproot="1">' + esc(CT.t('ftRoot')) + '</div>';
    h += '<div class="ft-tree">' + tops.map(function (f) { return node(f, 1); }).join('') + '</div>';
    if (!tops.length && !loose.length && !S.portalTotal) h += '<div class="empty">' + esc(CT.t(S.filtered ? 'noFiles' : 'ftNone')) + '</div>';
    if (loose.length || (ed && tops.length)) h += '<div class="ft-loose"' + (ed ? ' data-droproot="1"' : '') + '><h4 class="subhead">' + esc(CT.t('ftLoose')) + '</h4>' + loose.map(function (x, i) { return ctx.fileRow(x, { tree: true, up: i > 0, down: i < loose.length - 1 }); }).join('') + '</div>';
    return h;
  }
  function note(t) { msg = t; var el = document.getElementById('ftMsg'); if (el) el.textContent = t; }
  function afterRender() {
    var f = ctx.S.focus; if (!f) return; ctx.S.focus = '';
    var el = document.querySelector('.fcard.focus'); if (el && el.scrollIntoView) el.scrollIntoView({ block: 'center' });
  }
  /** 검색 결과 등에서 폴더를 골라 열 때: 위 폴더를 모두 펼친다 */
  function reveal(id) { var cur = M.byId[id], seen = {}; OPEN[id] = 1; while (cur && cur.parentId && !seen[cur.id]) { seen[cur.id] = 1; OPEN[cur.parentId] = 1; cur = M.byId[cur.parentId]; } saveOpen(); }

  /* ---- 서버 호출 ---- */
  function post(body) { return CT.api('/api/campteam/folder-tree', { method: 'POST', body: body }); }
  async function run(fn, done) { try { await fn(); if (done) note(CT.t(done)); } catch (err) { alert(err.message); } await ctx.reload(); }
  function swap(spec, dir) {
    var p = spec.split(':'), kind = p[0], id = p.slice(1).join(':'), parent = parentOf(kind, id), ids = sibs(kind, parent), i = ids.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= ids.length) return;
    ids[i] = ids[j]; ids[j] = id;
    return run(function () { return post({ action: 'reorder', kind: kind, parentId: parent, ids: ids }); }, 'ftOrdered');
  }

  /* ---- 창: 새 폴더 · 이름 바꾸기 · 폴더로 이동 · 삭제 ---- */
  function dlg() { return document.getElementById('ftDlg'); }
  function body() { return document.getElementById('ftBody'); }
  function open(htmlStr) { body().innerHTML = htmlStr; var d = dlg(); if (!d.open) d.showModal(); }
  function close() { var d = dlg(); if (d.open) d.close(); }
  function nameForm(title, ko, en, onSave) {
    open('<h3>' + esc(title) + '</h3><form class="form" id="ftForm" method="dialog"><label>' + esc(CT.t('folderName')) + '<input id="ftKo" maxlength="120" required value="' + esc(ko) + '"></label><label>' + esc(CT.t('folderNameEn')) + '<input id="ftEn" maxlength="120" value="' + esc(en) + '"></label>' +
      '<div class="err" id="ftErr" hidden></div><div class="dlg-actions"><button type="button" class="btn" id="ftCancel">' + esc(CT.t('cancel')) + '</button><button type="submit" class="btn pri" id="ftSave">' + esc(CT.t('save')) + '</button></div></form>');
    document.getElementById('ftCancel').onclick = close;
    document.getElementById('ftForm').onsubmit = async function (e) {
      e.preventDefault(); var ko = document.getElementById('ftKo').value.trim(), en = document.getElementById('ftEn').value.trim(); if (!ko) return;
      document.getElementById('ftSave').disabled = true;
      try { await onSave(ko, en); close(); await ctx.reload(); }
      catch (err) { var el = document.getElementById('ftErr'); el.textContent = err.message; el.hidden = false; document.getElementById('ftSave').disabled = false; }
    };
    setTimeout(function () { var i = document.getElementById('ftKo'); if (i) i.focus(); }, 30);
  }
  function newFolder(parent) {
    var p = parent && M.byId[parent];
    nameForm(p ? CT.t('folderNewInTitle')(label(p)) : CT.t('folderNewTitle'), '', '', async function (ko, en) {
      await CT.api('/api/campteam/folders', { method: 'POST', body: { name: ko, nameEn: en, parentId: parent || undefined } });
      if (parent) { OPEN[parent] = 1; saveOpen(); } note(CT.t('ftMade'));
    });
  }
  function rename(id) {
    var f = M.byId[id]; if (!f) return;
    nameForm(CT.t('folderRenameTitle'), f.name || '', f.nameEn || '', async function (ko, en) { await CT.api('/api/campteam/folders?id=' + encodeURIComponent(id), { method: 'PATCH', body: { name: ko, nameEn: en } }); note(CT.t('ftSaved')); });
  }
  async function movePicker(spec) {
    var p = spec.split(':'), kind = p[0], id = p.slice(1).join(':');
    var fresh; try { fresh = (await CT.api('/api/campteam/folders')).folders || []; } catch (e) { alert(e.message); return; } // 검색 중에도 모든 폴더가 보이도록 새로 가져온다
    var prev = M, file = kind === 'file' ? (ctx.S.items.filter(function (x) { return x.id === id; })[0] || {}) : null;
    build(fresh, ctx.S.items);
    var name = kind === 'folder' ? (M.byId[id] ? label(M.byId[id]) : '') : (file.title || ''), cur = kind === 'folder' ? parentOf('folder', id) : (file.folderId && M.byId[file.folderId] ? file.folderId : '');
    var h = '<h3>' + esc(CT.t('moveTitle')(name)) + '</h3><p class="hint">' + esc(CT.t('moveHint')) + '</p><div class="mvlist">';
    function opt(to, text, depth, reason) { h += '<button type="button" class="mvopt" data-to="' + esc(to) + '" style="padding-left:' + (12 + depth * 18) + 'px"' + (reason ? ' disabled' : '') + '><span>' + (to ? '📁 ' : '⬆ ') + esc(text) + '</span>' + (reason ? '<small>' + esc(reason) + '</small>' : '') + '</button>'; }
    opt('', CT.t('moveTop'), 0, cur === '' ? CT.t('moveHere') : '');
    (function walk(parent, depth) {
      (M.kids[parent] || []).forEach(function (f) {
        var reason = '';
        if (kind === 'folder' && (f.id === id || isUnder(f.id, id))) reason = CT.t('moveNoSelf');
        else if (kind === 'folder' && depthOf(f.id) + heightOf(id) > MAX) reason = CT.t('moveTooDeep');
        else if (f.id === cur) reason = CT.t('moveHere');
        opt(f.id, label(f), depth, reason); walk(f.id, depth + 1);
      });
    })('', 1);
    h += '</div><div class="dlg-actions"><button type="button" class="btn" id="ftCancel">' + esc(CT.t('cancel')) + '</button></div>';
    M = prev;
    open(h);
    document.getElementById('ftCancel').onclick = close;
    document.querySelector('.mvlist').onclick = function (e) {
      var b = e.target.closest('[data-to]'); if (!b || b.disabled) return; var to = b.dataset.to; close();
      if (to) { OPEN[to] = 1; saveOpen(); }
      run(function () { return post({ action: 'move', kind: kind, id: id, parentId: to }); }, 'ftMoved');
    };
  }
  function delDialog(id) {
    var f = M.byId[id]; if (!f) return;
    var nf = subFolders(id), nfile = f.treeCount != null ? f.treeCount : subFiles(id);
    open('<h3>' + esc(CT.t('folderDelTitle')(label(f))) + '</h3><p class="meta">' + esc(CT.t('folderDelInside')(nf, nfile)) + '</p><div class="delopts">' +
      '<label class="delopt"><input type="radio" name="ftMode" value="lift" checked><span>' + esc(CT.t('folderDelLift')) + '</span></label>' +
      '<label class="delopt"><input type="radio" name="ftMode" value="all"><span>' + esc(CT.t('folderDelAll')) + '</span></label></div>' +
      '<div class="hintbox delnote">' + esc(CT.t('folderDelNote')) + '</div><div class="dlg-actions"><button type="button" class="btn" id="ftCancel">' + esc(CT.t('cancel')) + '</button><button type="button" class="btn danger" id="ftDelGo">' + esc(CT.t('folderDelGo')) + '</button></div>');
    document.getElementById('ftCancel').onclick = close;
    document.getElementById('ftDelGo').onclick = function () {
      var mode = (document.querySelector('input[name=ftMode]:checked') || {}).value === 'all' ? 'all' : 'lift'; close();
      run(function () { return CT.api('/api/campteam/folders?id=' + encodeURIComponent(id) + '&mode=' + mode, { method: 'DELETE' }); }, 'ftDeleted');
    };
  }

  /* ---- 클릭 ---- */
  function onClick(e) {
    var t = e.target, g = function (a) { var el = t.closest && t.closest('[' + a + ']'); return el ? el.getAttribute(a) : null; };
    var tg = g('data-toggle'), nw = g('data-fnew'), rn = g('data-frename'), mv = g('data-fmove'), mf = g('data-fmovefile'), up = g('data-fup'), dn = g('data-fdown'), dl = g('data-fdel'), oa = g('data-openall');
    if (tg) { if (OPEN[tg]) delete OPEN[tg]; else OPEN[tg] = 1; saveOpen(); ctx.render(); return true; }
    if (oa != null) { if (oa === '1') ctx.S.folders.forEach(function (f) { OPEN[f.id] = 1; }); else OPEN = {}; saveOpen(); ctx.render(); return true; }
    if (nw != null) { newFolder(nw); return true; }
    if (rn) { rename(rn); return true; }
    if (mv) { movePicker(mv); return true; }
    if (mf) { movePicker('file:' + mf); return true; }
    if (up) { swap(up, -1); return true; }
    if (dn) { swap(dn, 1); return true; }
    if (dl) { delDialog(dl); return true; }
    return false;
  }

  /* ---- 끌어다 놓기: 폴더 카드 가운데 = 그 폴더 안으로, 위·아래 가장자리 = 그 앞·뒤로(순서), 맨 위 칸 = 폴더 밖으로 ---- */
  function planFor(d, el, e) {
    if (el.hasAttribute('data-droproot') && !el.hasAttribute('data-drag')) return { mode: 'root', parent: '' };
    var s = el.getAttribute('data-drag'), i = s.indexOf(':'), tk = s.slice(0, i), tid = s.slice(i + 1);
    if (tk === d.kind && tid === d.id) return null;
    var r = el.getBoundingClientRect(), fr = (e.clientY - r.top) / Math.max(r.height, 1);
    if (tk === 'folder') {
      if (d.kind === 'file') return { mode: 'in', parent: tid, targetId: tid };
      var par = parentOf('folder', tid);
      if (fr < 0.25 && folderMoveOk(d.id, par)) return { mode: 'before', parent: par, targetId: tid };
      if (fr > 0.75 && !OPEN[tid] && folderMoveOk(d.id, par)) return { mode: 'after', parent: par, targetId: tid };
      return folderMoveOk(d.id, tid) ? { mode: 'in', parent: tid, targetId: tid } : null;
    }
    if (d.kind !== 'file') return null;
    return { mode: fr < 0.5 ? 'before' : 'after', parent: parentOf('file', tid), targetId: tid };
  }
  function clearMarks() { [].forEach.call(document.querySelectorAll('.ft-in,.ft-before,.ft-after,.ft-root-on'), function (x) { x.classList.remove('ft-in', 'ft-before', 'ft-after', 'ft-root-on'); }); }
  function endDrag() { drag = null; clearMarks(); document.documentElement.classList.remove('ft-dragging'); [].forEach.call(document.querySelectorAll('.ft-src'), function (x) { x.classList.remove('ft-src'); }); }
  function targetEl(e) { var t = e.target; return t && t.closest ? t.closest('[data-drag],[data-droproot]') : null; }
  async function perform(d, pl) {
    var cur = parentOf(d.kind, d.id), same = pl.parent === cur;
    if (same && pl.mode !== 'before' && pl.mode !== 'after') return;
    try {
      if (!same) await post({ action: 'move', kind: d.kind, id: d.id, parentId: pl.parent });
      if (pl.mode === 'before' || pl.mode === 'after') {
        var ids = sibs(d.kind, pl.parent).filter(function (x) { return x !== d.id; }), i = ids.indexOf(pl.targetId);
        ids.splice(i < 0 ? ids.length : (pl.mode === 'after' ? i + 1 : i), 0, d.id);
        await post({ action: 'reorder', kind: d.kind, parentId: pl.parent, ids: ids });
      }
      if (pl.mode === 'in' && pl.parent) { OPEN[pl.parent] = 1; saveOpen(); }
      note(CT.t(pl.mode === 'before' || pl.mode === 'after' ? (same ? 'ftOrdered' : 'ftMoved') : 'ftMoved'));
    } catch (err) { alert(err.message); }
    await ctx.reload();
  }
  function bindDrag(box) {
    box.addEventListener('dragstart', function (e) {
      var el = e.target.closest && e.target.closest('[data-drag]'); if (!el || !can() || el.getAttribute('draggable') !== 'true') return;
      var s = el.getAttribute('data-drag'), i = s.indexOf(':'); drag = { kind: s.slice(0, i), id: s.slice(i + 1) };
      e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', s); } catch (x) { /* 무시 */ }
      el.classList.add('ft-src'); document.documentElement.classList.add('ft-dragging');
    });
    box.addEventListener('dragend', endDrag);
    box.addEventListener('dragover', function (e) {
      if (!drag) return; var el = targetEl(e); clearMarks(); if (!el) return;
      var pl = planFor(drag, el, e); if (!pl) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'move';
      el.classList.add(pl.mode === 'root' ? 'ft-root-on' : pl.mode === 'in' ? 'ft-in' : pl.mode === 'before' ? 'ft-before' : 'ft-after');
    });
    box.addEventListener('dragleave', function (e) { if (!drag || (e.relatedTarget && box.contains(e.relatedTarget))) return; clearMarks(); });
    box.addEventListener('drop', function (e) {
      if (!drag) return; var el = targetEl(e), d = drag; endDrag(); if (!el) return;
      var pl = planFor(d, el, e); if (!pl) return; e.preventDefault(); perform(d, pl);
    });
  }

  window.CTTree = {
    /** files.js 가 한 번 부른다: { S, label(folder), can(), fileRow(file, opts), reload(), render(), boxes:[…] } */
    init: function (c) { ctx = c; c.boxes.forEach(function (b) { b.addEventListener('click', onClick); }); bindDrag(c.boxes[0]); },
    html: html, afterRender: afterRender, reveal: function (id) { build(ctx.S.folders, ctx.S.items); reveal(id); }, movePicker: movePicker, note: note
  };
})();
