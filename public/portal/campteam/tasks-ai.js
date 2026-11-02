/* 업무 > 체크리스트 템플릿 탭의 「AI 추천」 칸 (오른쪽, 폰에서는 아래).
   캠프를 고르고 「AI 추천 받기」를 누르면 AI 가 빠진 준비 업무를 추천한다. 추천은 서버에 저장돼서 접었다 펴도, 다른 기기에서 열어도 그대로 있다.
   ✓ = 이 캠프의 업무로 만들기(「템플릿에도 저장」을 켜면 템플릿 항목으로도) · ✕ = 넣지 않기(나중에 「다시 넣기」). ✓ 를 눌러야 업무가 만들어진다.
   서버: /api/campteam/ai-task-suggest · 칸을 펼쳐 둘지는 ui-prefs 의 ai-suggest-open 에 기억한다(이 브라우저에도 같이). */
(function () {
  CT.addDict({
    ko: { aisgTitle: 'AI 추천', aisgFold: '접기', aisgUnfold: '펼치기', aisgCamp: '추천받을 캠프', aisgTpl: '참고할 템플릿 (없어도 돼요)', aisgNoTpl: '템플릿 없이', aisgGo: 'AI 추천 받기', aisgLeft: '오늘 {n}번 남았어요', aisgLeftNone: '오늘은 다 썼어요 (내일 다시 받을 수 있어요)',
      aisgNote: 'AI가 만든 추천이에요. ✓를 눌러야 업무가 만들어져요.', aisgAlso: '템플릿에도 저장', aisgAlsoHelp: '켜면 ✓를 누른 업무가 이 템플릿 항목으로도 들어가요 (선택한 템플릿이 있을 때만)',
      aisgLoading: 'AI가 빠진 업무를 찾고 있어요… (1분쯤 걸릴 수 있어요)', aisgBusy: '잠시만요…', aisgEmpty: '아직 추천이 없어요. 「AI 추천 받기」를 눌러 보세요.', aisgNoCamp: '캠프를 먼저 골라 주세요.', aisgAdded: '추천 {n}개를 받았어요.', aisgMade: '업무로 만들었어요.', aisgMadeTpl: '업무로 만들었고, 템플릿에도 넣었어요.', aisgDropped: '넣지 않았어요. 아래 「넣지 않은 추천」에서 다시 넣을 수 있어요.', aisgRestored: '다시 추천 목록에 넣었어요.',
      aisgDroppedHead: '넣지 않은 추천', aisgRestore: '다시 넣기', aisgKeptLine: '이미 업무로 만든 추천 {n}개', aisgViewOnly: '업무를 작성할 수 있는 팀원만 추천을 받고 고를 수 있어요. 저장된 추천은 볼 수 있어요.', aisgOk: '업무로 만들기', aisgNo: '넣지 않기',
      aisgBefore: '캠프 {n}일 전', aisgAfter: '캠프 {n}일 후', aisgDay0: '캠프 첫날', aisgNoDue: '기한 미정', aisgNotReady: '관리자가 데이터베이스 업데이트를 하면 쓸 수 있어요.', aisgOff: 'AI 기능이 아직 켜지지 않았어요.',
      aisgPriHigh: '높음', aisgPriMedium: '보통', aisgPriLow: '낮음', aisgFail: '추천을 불러오지 못했어요.' },
    en: { aisgTitle: 'AI suggestions', aisgFold: 'Fold', aisgUnfold: 'Unfold', aisgCamp: 'Camp to get suggestions for', aisgTpl: 'Template to compare with (optional)', aisgNoTpl: 'No template', aisgGo: 'Get AI suggestions', aisgLeft: '{n} left today', aisgLeftNone: 'Used up for today (try again tomorrow)',
      aisgNote: 'These are AI suggestions. A task is created only when you press ✓.', aisgAlso: 'Also save to template', aisgAlsoHelp: 'When on, tasks you keep with ✓ are also added to this template (only when a template is selected)',
      aisgLoading: 'The AI is looking for missing tasks… (may take about a minute)', aisgBusy: 'One moment…', aisgEmpty: 'No suggestions yet. Press "Get AI suggestions".', aisgNoCamp: 'Please choose a camp first.', aisgAdded: 'Got {n} suggestions.', aisgMade: 'Task created.', aisgMadeTpl: 'Task created and added to the template.', aisgDropped: 'Dropped. You can bring it back under "Dropped suggestions" below.', aisgRestored: 'Moved back to the suggestions.',
      aisgDroppedHead: 'Dropped suggestions', aisgRestore: 'Put back', aisgKeptLine: '{n} suggestions already made into tasks', aisgViewOnly: 'Only team members who can edit tasks can request and choose suggestions. You can still see saved ones.', aisgOk: 'Create task', aisgNo: 'Drop',
      aisgBefore: '{n} days before camp', aisgAfter: '{n} days after camp', aisgDay0: 'Camp day 1', aisgNoDue: 'No due date', aisgNotReady: 'Available after the admin updates the database.', aisgOff: 'The AI feature is not switched on yet.',
      aisgPriHigh: 'High', aisgPriMedium: 'Medium', aisgPriLow: 'Low', aisgFail: 'Could not load suggestions.' },
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, KEY = 'ai-suggest-open', LK = 'ct-aisg-open';
  var S = { camps: [], tpls: [], campId: '', tplId: '', data: null, open: true, busy: false, started: false };
  var fill = function (k, n) { return CT.t(k).replace('{n}', n); };

  function offsetLabel(n) { return n == null ? CT.t('aisgNoDue') : n === 0 ? CT.t('aisgDay0') : n < 0 ? fill('aisgBefore', -n) : fill('aisgAfter', n); }
  function row(x, mode) {
    var pri = '<span class="tag p-' + esc(x.priority) + '">' + esc(CT.t('aisgPri' + x.priority)) + '</span>';
    var btns = !(S.data && S.data.canWrite) ? '' : mode === 'dropped'
      ? '<button type="button" class="btn aisg-btn aisg-restore" data-act="restore" data-id="' + esc(x.id) + '">' + esc(CT.t('aisgRestore')) + '</button>'
      : '<button type="button" class="aisg-ok" data-act="keep" data-id="' + esc(x.id) + '" aria-label="' + esc(CT.t('aisgOk')) + '" title="' + esc(CT.t('aisgOk')) + '">✓</button><button type="button" class="aisg-no" data-act="drop" data-id="' + esc(x.id) + '" aria-label="' + esc(CT.t('aisgNo')) + '" title="' + esc(CT.t('aisgNo')) + '">✕</button>';
    return '<div class="aisg-row" data-id="' + esc(x.id) + '"><div class="aisg-txt"><div class="aisg-title">' + esc(x.title) + '</div><div class="aisg-meta"><span class="chip gray">' + esc(offsetLabel(x.offsetDays)) + '</span>' + pri + (x.section ? '<span class="chip">' + esc(x.section) + '</span>' : '') + '</div>' +
      (x.reason ? '<div class="aisg-why">' + esc(x.reason) + '</div>' : '') + '</div>' + (btns ? '<div class="aisg-btns">' + btns + '</div>' : '') + '</div>';
  }
  function render() {
    var d = S.data, box = $('aisg'); if (!box) return;
    box.classList.toggle('is-closed', !S.open);
    $('aisgToggle').textContent = CT.t(S.open ? 'aisgFold' : 'aisgUnfold'); $('aisgToggle').setAttribute('aria-expanded', S.open ? 'true' : 'false');
    $('aisgBody').hidden = !S.open; if (!S.open) return;
    var sug = (d && d.suggestions) || { new: [], kept: [], dropped: [] }, left = d ? d.remainingToday : null, can = !!(d && d.canWrite);
    $('aisgCamp').innerHTML = S.camps.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === S.campId ? ' selected' : '') + '>' + esc(CT.pick(c, 'name') + (c.startDate ? ' · ' + c.startDate.slice(2).replace(/-/g, '.') : '')) + '</option>'; }).join('');
    $('aisgTpl').innerHTML = '<option value="">' + esc(CT.t('aisgNoTpl')) + '</option>' + S.tpls.map(function (t) { return '<option value="' + esc(t.id) + '"' + (t.id === S.tplId ? ' selected' : '') + '>' + esc(CT.pick(t, 'name')) + '</option>'; }).join('');
    $('aisgGo').disabled = S.busy || !can || !S.campId || (left !== null && left <= 0) || !!(d && (!d.ready || !d.aiOn));
    $('aisgGo').textContent = S.busy ? CT.t('aisgBusy') : CT.t('aisgGo');
    $('aisgLeft').textContent = d && !d.ready ? CT.t('aisgNotReady') : d && !d.aiOn ? CT.t('aisgOff') : left === null ? '' : left > 0 ? fill('aisgLeft', left) : CT.t('aisgLeftNone');
    $('aisgViewOnly').hidden = can || !d;
    $('aisgAlsoRow').hidden = !can; $('aisgAlso').disabled = !S.tplId; $('aisgAlsoRow').title = CT.t('aisgAlsoHelp');
    $('aisgList').innerHTML = S.campId ? (sug.new.length ? sug.new.map(function (x) { return row(x, 'new'); }).join('') : '<div class="empty">' + esc(CT.t('aisgEmpty')) + '</div>') : '<div class="empty">' + esc(CT.t('aisgNoCamp')) + '</div>';
    $('aisgKept').textContent = sug.kept.length ? fill('aisgKeptLine', sug.kept.length) : ''; $('aisgKept').hidden = !sug.kept.length;
    $('aisgDropped').hidden = !sug.dropped.length; $('aisgDroppedHead').textContent = CT.t('aisgDroppedHead') + ' (' + sug.dropped.length + ')';
    $('aisgDroppedList').innerHTML = sug.dropped.map(function (x) { return row(x, 'dropped'); }).join('');
  }
  var say = function (kind, text) { var m = $('aisgMsg'); m.className = kind === 'err' ? 'err' : 'hintbox'; m.textContent = text || ''; m.hidden = !text; };
  var qs = function () { return '?campId=' + encodeURIComponent(S.campId) + '&templateId=' + encodeURIComponent(S.tplId); };

  async function load() {
    if (!S.campId) { S.data = null; render(); return; }
    try { S.data = await CT.api('/api/campteam/ai-task-suggest' + qs()); say('', ''); } catch (e) { S.data = null; say('err', e.status === 403 ? '' : (e.message || CT.t('aisgFail'))); if (e.status === 403 && $('aisg')) $('aisg').hidden = true; }
    render();
  }
  function pickTemplateFor(campId) { // 캠프 유형과 같은 유형의 템플릿이 있으면 미리 골라 둔다
    var c = S.camps.filter(function (x) { return x.id === campId; })[0], t = c && S.tpls.filter(function (x) { return x.typeId && x.typeId === c.typeId; })[0];
    return t ? t.id : '';
  }
  function defaultCamp() { // 목록은 이미 가까운 앞으로의 캠프 → 날짜 미정 → 지난 캠프(최근 순) 순서라서, 날짜 있는 첫 캠프가 곧 가장 가까운 앞으로의 캠프(없으면 가장 최근 캠프)
    var d = S.camps.filter(function (c) { return c.startDate; }); return (d[0] || S.camps[0] || {}).id || '';
  }
  async function start() {
    if (S.started) { if (S.open) await load(); return; }
    S.started = true;
    try {
      var r = await Promise.all([CT.api('/api/campteam/camps'), CT.api('/api/campteam/templates')]), all = [];
      r[0].types.forEach(function (t) { t.camps.forEach(function (c) { if (c.status !== 'canceled') all.push(c); }); });
      var today = new Date().toLocaleDateString('sv-SE'); // 앞으로의 캠프(가까운 순) → 날짜 미정 → 지난 캠프(최근 순)
      var up = all.filter(function (c) { return c.startDate && c.startDate >= today; }).sort(function (a, b) { return a.startDate < b.startDate ? -1 : 1; }), none = all.filter(function (c) { return !c.startDate; }), past = all.filter(function (c) { return c.startDate && c.startDate < today; }).sort(function (a, b) { return a.startDate < b.startDate ? 1 : -1; });
      S.camps = up.concat(none, past); S.tpls = r[1].templates || [];
      S.campId = defaultCamp(); S.tplId = pickTemplateFor(S.campId);
    } catch (e) { S.started = false; say('err', e.message || CT.t('aisgFail')); return; }
    if (S.open) await load(); else render();
  }
  function remember(v) { try { localStorage.setItem(LK, v ? '1' : '0'); } catch (e) { /* 무시 */ } CT.api('/api/campteam/ui-prefs', { method: 'PUT', body: { key: KEY, value: v ? '1' : '0' } }).catch(function () {}); }
  async function readOpen() { // 서버에 기억해 둔 값이 있으면 그것을, 없으면 이 브라우저의 값을 (기본은 펼침)
    try { var v = localStorage.getItem(LK); if (v === '0') S.open = false; } catch (e) { /* 무시 */ }
    try { var p = await CT.api('/api/campteam/ui-prefs'), sv = p && p.prefs && p.prefs[KEY]; if (sv === '0') S.open = false; else if (sv === '1') S.open = true; } catch (e) { /* 무시 */ }
  }

  async function decide(ids, decision) {
    if (S.busy) return; S.busy = true; render();
    var also = decision === 'keep' && $('aisgAlso').checked && !!S.tplId;
    try {
      var r = await CT.api('/api/campteam/ai-task-suggest', { method: 'POST', body: { action: 'decide', ids: ids, decision: decision, alsoTemplate: also } });
      S.data = Object.assign({}, S.data, { suggestions: r.suggestions, remainingToday: r.remainingToday });
      say('ok', decision === 'keep' ? (r.templateAdded ? CT.t('aisgMadeTpl') : CT.t('aisgMade')) : CT.t(decision === 'drop' ? 'aisgDropped' : 'aisgRestored'));
      if (decision === 'keep' && r.created) document.dispatchEvent(new CustomEvent('ct-ai-suggest-changed', { detail: { template: !!r.templateAdded } })); // 업무 목록·템플릿 표를 새로 읽게 알린다
    } catch (e) { say('err', e.message); }
    S.busy = false; render();
  }
  async function generate() {
    if (S.busy || !S.campId) return; S.busy = true; say('ok', CT.t('aisgLoading')); render();
    try {
      var r = await CT.api('/api/campteam/ai-task-suggest', { method: 'POST', body: { action: 'generate', campId: S.campId, templateId: S.tplId || undefined } });
      S.data = Object.assign({}, S.data, { suggestions: r.suggestions, remainingToday: r.remainingToday, dailyLimit: r.dailyLimit });
      say('ok', r.added ? fill('aisgAdded', r.added) : (r.note || ''));
    } catch (e) { say('err', e.message); if (e.status === 429 || e.status === 502) { try { var d = await CT.api('/api/campteam/ai-task-suggest' + qs()); S.data = d; } catch (x) { /* 무시 */ } } }
    S.busy = false; render();
  }

  function build() {
    var pane = $('paneTpl'); if (!pane || $('aisg')) return false;
    var wrap = document.createElement('div'); wrap.className = 'aisg-layout'; var main = document.createElement('div'); main.className = 'aisg-main';
    while (pane.firstChild) main.appendChild(pane.firstChild);
    var side = document.createElement('aside'); side.className = 'card aisg'; side.id = 'aisg';
    side.innerHTML = '<div class="aisg-head"><h2 data-t="aisgTitle"></h2><button type="button" class="btn aisg-btn" id="aisgToggle" aria-expanded="true"></button></div>' +
      '<div id="aisgBody"><div class="form"><label><span data-t="aisgCamp"></span><select id="aisgCamp"></select></label><label><span data-t="aisgTpl"></span><select id="aisgTpl"></select></label></div>' +
      '<div class="aisg-go"><button type="button" class="btn pri aisg-btn" id="aisgGo"></button><span class="meta" id="aisgLeft"></span></div>' +
      '<div id="aisgMsg" hidden></div><div class="hintbox aisg-note" data-t="aisgNote"></div><div class="hintbox" id="aisgViewOnly" data-t="aisgViewOnly" hidden></div>' +
      '<label class="aisg-also" id="aisgAlsoRow"><input type="checkbox" id="aisgAlso"> <span data-t="aisgAlso"></span></label>' +
      '<div id="aisgList"></div><div class="meta" id="aisgKept" hidden></div>' +
      '<details class="aisg-dropped" id="aisgDropped" hidden><summary id="aisgDroppedHead"></summary><div id="aisgDroppedList"></div></details></div>';
    wrap.appendChild(main); wrap.appendChild(side); pane.appendChild(wrap); CT.applyI18n();
    $('aisgToggle').onclick = function () { S.open = !S.open; remember(S.open); if (S.open) { render(); start(); } else render(); };
    $('aisgCamp').onchange = function () { S.campId = this.value; S.tplId = pickTemplateFor(S.campId); load(); };
    $('aisgTpl').onchange = function () { S.tplId = this.value; load(); };
    $('aisgGo').onclick = generate;
    side.addEventListener('click', function (e) { var b = e.target.closest('[data-act]'); if (b) decide([b.dataset.id], b.dataset.act); });
    return true;
  }
  document.addEventListener('ct-ready', async function () {
    if (!build()) return;
    await readOpen(); render();
    // 템플릿 탭을 열 때마다(그리고 칸이 펼쳐져 있을 때) 저장된 추천을 서버에서 다시 읽는다
    $('tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (b && b.dataset.tab === 'tpl' && S.open) start(); });
    if (!$('paneTpl').hidden && S.open) start();
    document.addEventListener('ct-lang', render);
  });
})();
