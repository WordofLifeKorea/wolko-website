/**
 * 업무 확인(체크)과 「팀 점검」 화면.
 *  - 체크박스 하나로 완료/되돌리기 (누가·언제 확인했는지는 서버가 기록해서 돌려준다)
 *  - 팀 점검: 캠프 하나를 골라 업무를 구역별로 보여 주고 바로 체크. 쓰기 권한이 없으면 상태만 보인다.
 * tasks.js 가 CTCheck.mount(...) 로 연결한다. (탭 id 는 `check`)
 */
(function () {
  CT.addDict({
    ko: { tabCheck: '팀 점검', ckCamp: '점검할 캠프', ckAll: '전부', ckTodo: '안 한 것만', ckProgress: '확인', ckNone: '이 캠프에는 점검할 업무가 없어요.', ckAllDone: '안 한 업무가 없어요. 모두 확인했어요!', ckPick: '캠프를 골라 주세요', ckOther: '기타', ckTip: '다 했으면 눌러 주세요', ckViewOnly: '조회만 가능한 계정이에요. 확인 표시는 캠프팀 팀원이 할 수 있어요.', ckDoneWord: '확인', ckNoOwner: '담당 미정', ckHelp: '캠프 하나를 골라 업무를 구역별로 훑어보고, 끝낸 것은 체크해 주세요. 누가 언제 확인했는지 같이 남아요.' },
    en: { tabCheck: 'Team check', ckCamp: 'Camp to check', ckAll: 'All', ckTodo: 'Not done yet', ckProgress: 'checked', ckNone: 'This camp has no tasks to check.', ckAllDone: 'Nothing left to do. Everything is checked!', ckPick: 'Pick a camp', ckOther: 'Other', ckTip: 'Tick when it is done', ckViewOnly: 'View-only account. Camp team members can tick items.', ckDoneWord: 'checked', ckNoOwner: 'No owner', ckHelp: 'Pick one camp, go through its tasks by section and tick what is finished. Who ticked it and when is kept.' },
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc;
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var C = { ctx: null, campId: '', mode: 'all', items: null, seq: 0, keep: {} };

  /** 확인한 시각(ISO) → 11/3 14:20 */
  function stampAt(iso) { var d = iso ? new Date(iso) : null; return d && !isNaN(d) ? (d.getMonth() + 1) + '/' + d.getDate() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) : ''; }
  /** 「홍길동 · 11/3 14:20 확인」 — 완료인데 기록이 없는 예전 업무는 빈 글자 */
  function stampText(t) { return t && t.status === 'Completed' && t.completedBy ? t.completedBy + (t.completedAt ? ' · ' + stampAt(t.completedAt) : '') + ' ' + CT.t('ckDoneWord') : ''; }
  /** 체크(true) / 체크 풀기(false) → 서버가 돌려주는 { status, completedBy, completedAt } */
  async function toggle(id, checked) {
    var r = await CT.api('/api/campteam/tasks?id=' + encodeURIComponent(id), { method: 'PATCH', body: { status: checked ? 'Completed' : 'Not Started' } });
    return { status: r.status || (checked ? 'Completed' : 'Not Started'), completedBy: r.completedBy || null, completedAt: r.completedAt || null };
  }

  var camps = function () { var o = []; ((C.ctx && C.ctx.types()) || []).forEach(function (t) { (t.camps || []).forEach(function (c) { o.push(c); }); }); return o; };
  var campOf = function (id) { return camps().filter(function (c) { return c.id === id; })[0] || null; };
  var DO = function () { return window.CTDateOffset; };

  /** 점검 대상: 숨긴(비활성) 업무와 「해당 없음」은 뺀다 */
  function countable(items) { return (items || []).filter(function (t) { return !t.inactive && t.status !== 'Not Applicable'; }); }
  /** 구역(section)별로 묶기 — 처음 나온 순서, 구역 없는 것은 「기타」를 맨 뒤에 */
  function groupBySection(items, other) {
    var order = [], map = {};
    items.forEach(function (t) { var k = (t.section || '').trim() || '\u0000'; if (!map[k]) { map[k] = []; order.push(k); } map[k].push(t); });
    order.sort(function (a, b) { return (a === '\u0000') - (b === '\u0000'); });
    return order.map(function (k) { return { name: k === '\u0000' ? other : k, items: map[k] }; });
  }

  function fillCamps() {
    var sel = $('ckCamp'); if (!sel) return;
    var list = camps(), cur = C.campId;
    if (!cur) { var pref = C.ctx.preferCamp(); cur = list.some(function (c) { return c.id === pref; }) ? pref : (DO().pickDefaultCamp(list, C.ctx.today() || '') || list[0] || {}).id || ''; }
    C.campId = cur;
    sel.innerHTML = (list.length ? '' : '<option value="">' + esc(CT.t('ckPick')) + '</option>') + list.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === cur ? ' selected' : '') + '>' + esc(CT.pick(c, 'name')) + '</option>'; }).join('');
  }
  async function load() {
    var body = $('ckBody'); if (!C.campId) { C.items = []; render(); return; }
    var seq = ++C.seq; body.classList.add('is-loading');
    try {
      var r = await CT.api('/api/campteam/tasks?sort=due&campId=' + encodeURIComponent(C.campId)); if (seq !== C.seq) return;
      C.items = countable(r.items); C.keep = {}; body.classList.remove('is-loading'); render();
    } catch (e) { if (seq === C.seq) { body.classList.remove('is-loading'); body.innerHTML = '<div class="err">' + esc(e.message) + '</div>'; } }
  }
  function render() {
    var body = $('ckBody'); if (!body || !C.ctx) return;
    document.querySelectorAll('#ckMode [data-m]').forEach(function (b) { b.classList.toggle('on', b.dataset.m === C.mode); b.setAttribute('aria-pressed', b.dataset.m === C.mode ? 'true' : 'false'); });
    $('ckViewOnly').hidden = C.ctx.canWrite();
    if (!C.items) { body.innerHTML = '<div class="empty">' + esc(CT.t('loading')) + '</div>'; return; }
    var all = C.items, done = all.filter(function (t) { return t.status === 'Completed'; }).length, camp = campOf(C.campId), start = camp && camp.startDate;
    var pct = all.length ? Math.round(done / all.length * 100) : 0;
    $('ckProg').innerHTML = all.length ? '<div class="ck-num"><b>' + done + '/' + all.length + '</b> ' + esc(CT.t('ckProgress')) + '</div><div class="ck-bar" role="progressbar" aria-valuenow="' + pct + '" aria-valuemin="0" aria-valuemax="100"><span style="width:' + pct + '%"></span></div>' : '';
    // 「안 한 것만」: 방금 체크한 줄은 화면이 바뀌기 전까지 흐리게 남겨 둔다
    var shown = C.mode === 'todo' ? all.filter(function (t) { return t.status !== 'Completed' || C.keep[t.id]; }) : all;
    if (!all.length) { body.innerHTML = '<div class="empty">' + esc(CT.t('ckNone')) + '</div>'; return; }
    if (!shown.length) { body.innerHTML = '<div class="empty">' + esc(CT.t('ckAllDone')) + '</div>'; return; }
    var can = C.ctx.canWrite();
    body.innerHTML = groupBySection(shown, CT.t('ckOther')).map(function (g) {
      var gd = g.items.filter(function (t) { return t.status === 'Completed'; }).length;
      return '<section class="ck-sec"><h3>' + esc(g.name) + ' <small>' + gd + '/' + g.items.length + '</small></h3>' + g.items.map(function (t) {
        var d = t.status === 'Completed', due = t.dueDate ? DO().dueLabel(t.dueDate, start, CT.lang()) : '', st = stampText(t);
        return '<div class="ck-row' + (d ? ' done' : '') + '" data-tid="' + esc(t.id) + '"><label class="chk-hit" title="' + esc(CT.t('ckTip')) + '"><input type="checkbox" class="tchk" data-ck="' + esc(t.id) + '"' + (d ? ' checked' : '') + (can ? '' : ' disabled') + ' aria-label="' + esc(CT.t('ckTip')) + '"></label>' +
          '<div class="ck-main"><div class="ck-t wrap-word">' + esc(CT.tt(t)) + '</div>' + (st ? '<div class="tstamp">' + esc(st) + '</div>' : '') + '</div>' +
          '<div class="ck-meta wrap-word"><span class="ck-own' + (t.ownerName ? '' : ' none') + '">' + esc(t.ownerName || CT.t('ckNoOwner')) + '</span>' + (due ? '<span class="ck-due">' + esc(due) + '</span>' : '') + '</div></div>';
      }).join('') + '</section>';
    }).join('');
  }
  async function onTick(box) {
    var id = box.dataset.ck, t = (C.items || []).filter(function (x) { return x.id === id; })[0]; if (!t) return;
    var want = box.checked; box.disabled = true;
    try {
      var r = await toggle(id, want); t.status = r.status; t.completedBy = r.completedBy; t.completedAt = r.completedAt;
      if (want) C.keep[id] = 1; else delete C.keep[id];
      render();
    } catch (e) { box.checked = !want; box.disabled = false; alert(e.message); }
  }

  /** ctx: { types(), canWrite(), preferCamp(), today() } — tasks.js 가 알려 준다 */
  function mount(ctx) {
    C.ctx = ctx;
    var bar = $('ckCamp'); if (!bar || bar.dataset.bound) return; bar.dataset.bound = '1';
    bar.onchange = function () { C.campId = bar.value; C.items = null; C.keep = {}; render(); load(); };
    $('ckMode').onclick = function (e) { var b = e.target.closest('[data-m]'); if (!b) return; C.mode = b.dataset.m; C.keep = {}; render(); };
    $('ckBody').addEventListener('change', function (e) { var b = e.target.closest && e.target.closest('[data-ck]'); if (b) onTick(b); });
  }
  /** 「팀 점검」 탭을 열 때마다: 캠프 목록을 맞추고 최신 업무를 다시 읽는다 */
  function show() { if (!C.ctx) return; fillCamps(); C.items = null; C.keep = {}; render(); load(); }

  window.CTCheck = { mount: mount, show: show, render: function () { if (C.ctx) { fillCamps(); render(); } }, toggle: toggle, stampText: stampText, stampAt: stampAt, countable: countable, groupBySection: groupBySection };
})();
