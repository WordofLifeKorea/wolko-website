/* 담당자 여러 명 고르기: 이름 칸에 버블(×)로 쌓이고, 목록에서 체크해서 고르거나 직접 입력해서 새 이름을 더한다.
   값은 숨은 칸(name="ownerName")에 " / " 로 이어서 들어가고, 서버가 저장할 때 처음 보는 이름은 관리자 확인 목록에 올린다. */
(function () {
  CT.addDict({
    ko: { opPh: '이름을 고르거나 입력 후 Enter', opNew: '새 이름으로 추가', opNone: '맞는 이름이 없어요. 입력한 이름을 Enter 로 추가하세요.', opRemove: '빼기', opHint: '여러 명이면 이어서 고르거나 입력하세요. 목록에 없는 이름은 관리자가 확인해요.' },
    en: { opPh: 'Pick a name or type one and press Enter', opNew: 'Add as new name', opNone: 'No match. Type a name and press Enter to add it.', opRemove: 'Remove', opHint: 'For several people, keep picking or typing. Names not in the list are reviewed by an admin.' },
  });
  var esc = CT.esc, key = function (s) { return String(s || '').replace(/\([^)]*\)|\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase(); };
  var split = function (v) { return String(v || '').split(/\s*\/\s*/).map(function (x) { return x.trim(); }).filter(Boolean); };

  /** root: 안에 .obox(.otags + input.oin) .odrop 와 숨은 input[name=ownerName] 이 있는 요소 */
  CT.ownerPicker = function (root, opts) {
    var options = (opts.options || []).slice(), chips = split(opts.value), box = root.querySelector('.obox'), tags = root.querySelector('.otags'), inp = root.querySelector('.oin'), drop = root.querySelector('.odrop'), hid = root.querySelector('input[name=ownerName]');
    var has = function (name) { return chips.some(function (c) { return key(c) === key(name); }); };
    var sync = function () { var t = inp.value.trim(); hid.value = chips.concat(t && !has(t) ? [t] : []).join(' / '); };
    function renderTags() { tags.innerHTML = chips.map(function (c, i) { return '<span class="otag">' + esc(c) + '<button type="button" data-rm="' + i + '" aria-label="' + esc(CT.t('opRemove')) + '">×</button></span>'; }).join(''); sync(); }
    function renderDrop() {
      var q = key(inp.value), list = options.filter(function (o) { return !q || key(o).indexOf(q) >= 0; }), exact = options.some(function (o) { return key(o) === q; });
      var h = list.map(function (o, i) { return '<label class="oopt"><input type="checkbox" data-o="' + i + '"' + (has(o) ? ' checked' : '') + '> ' + esc(o) + '</label>'; }).join('');
      if (q && !exact && !has(inp.value.trim())) h = '<button type="button" class="oopt onew" data-new="1">＋ ' + esc(CT.t('opNew')) + ': “' + esc(inp.value.trim()) + '”</button>' + h;
      drop._list = list; drop.innerHTML = h || '<div class="oopt onone">' + esc(CT.t('opNone')) + '</div>';
    }
    function add(name) { name = String(name || '').trim(); if (!name || has(name)) return; var m = options.filter(function (o) { return key(o) === key(name); })[0]; chips.push(m || name); }
    function commit() { var t = inp.value.trim(); if (t) { add(t); inp.value = ''; } renderTags(); }
    function open(v) { drop.hidden = !v; if (v) renderDrop(); }
    box.addEventListener('click', function (e) { var rm = e.target.closest('[data-rm]'); if (rm) { chips.splice(Number(rm.dataset.rm), 1); renderTags(); if (!drop.hidden) renderDrop(); inp.focus(); return; } inp.focus(); open(true); });
    inp.addEventListener('focus', function () { open(true); });
    inp.addEventListener('input', function () { sync(); open(true); });
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',' || e.key === ';') { if (inp.value.trim() || e.key === 'Enter') { e.preventDefault(); if (inp.value.trim()) { commit(); renderDrop(); } } }
      else if (e.key === 'Backspace' && !inp.value && chips.length) { chips.pop(); renderTags(); if (!drop.hidden) renderDrop(); }
      else if (e.key === 'Escape' && !drop.hidden) { e.stopPropagation(); e.preventDefault(); open(false); }
    });
    drop.addEventListener('change', function (e) { var c = e.target.closest('[data-o]'); if (!c) return; var name = drop._list[Number(c.dataset.o)]; if (c.checked) add(name); else chips = chips.filter(function (x) { return key(x) !== key(name); }); inp.value = ''; renderTags(); renderDrop(); });
    drop.addEventListener('click', function (e) { var n = e.target.closest('[data-new]'); if (n) { commit(); renderDrop(); inp.focus(); } });
    document.addEventListener('click', function off(e) { if (!document.body.contains(root)) { document.removeEventListener('click', off); return; } if (!root.contains(e.target)) open(false); });
    inp.placeholder = opts.placeholder || CT.t('opPh');
    renderTags(); open(false);
    return { value: function () { sync(); return hid.value; } };
  };
  CT.ownerPickerHtml = function (labelText, value, placeholder) {
    return '<div class="opick"><span class="olabel">' + esc(labelText) + '</span><div class="obox"><span class="otags"></span><input class="oin" autocomplete="off" placeholder="' + esc(placeholder || '') + '"></div><div class="odrop" hidden></div><input type="hidden" name="ownerName" value="' + esc(value || '') + '"><small class="ohint">' + esc(CT.t('opHint')) + '</small></div>';
  };
})();
