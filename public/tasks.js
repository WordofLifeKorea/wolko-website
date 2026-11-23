
/* 업무관리(/portal/tasks) — 프로젝트를 노드로 펼쳐 계획하고 진행을 보는 개인 보드.
   claude.ai 에서 만든 '가지치기'를 포탈로 옮긴 것: 보드는 /api/portal/tasks 로 포탈 계정마다 따로 저장된다.
   화면 글자는 L('한국어', 'English') 로 쓰고, 언어를 바꾸면 페이지를 다시 연다. */
(() => {
  'use strict';
  const LANG = (() => { try { return localStorage.getItem('wolkoCarLang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } })();
  const L = (ko, en) => (LANG === 'en' ? en : ko);
  const MONTHS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const WEEK = L(['일', '월', '화', '수', '목', '금', '토'], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']);
  const $ = (s) => document.querySelector(s);
  const STATUSES = [['idea', L('아이디어', 'Idea')], ['todo', L('할 일', 'To do')], ['doing', L('진행 중', 'Doing')], ['blocked', L('막힘', 'Blocked')], ['done', L('완료', 'Done')], ['hold', L('보류', 'On hold')]];
  const S_LABEL = Object.fromEntries(STATUSES);
  const WORK = new Set(['todo', 'doing', 'blocked', 'done']);
  const KINDS = [['goal', L('목표', 'Goal')], ['branch', L('갈래', 'Branch')], ['task', L('작업', 'Task')], ['idea', L('아이디어', 'Idea')], ['question', L('질문', 'Question')]];
  const K_LABEL = Object.fromEntries(KINDS);
  const COUNTED = new Set(['task', 'idea', 'question']);   // 진행률에 세는 종류(목표 · 갈래는 묶음이라 세지 않는다)
  const GROUPS = new Set(['goal', 'branch']);
  const NODE_W = 220, GAP_X = 84, GAP_Y = 20, SNAP = 8;
  const LS_LAST = 'wolko-tasks:last';
  const newId = (p) => p + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  const now = () => Date.now();
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const isMobile = () => window.matchMedia('(max-width: 760px)').matches;
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 저장 안 돼도 괜찮다 */ } };
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const todayStr = () => ymd(new Date());
  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const svgCheck = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
  const svgChevron = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const svgMore = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>';

  const stage = $('#stage'), world = $('#world'), wires = $('#wires'), nodesLayer = $('#nodes');
  const panel = $('#panel'), panelIn = $('#panelIn'), kanban = $('#kanban'), menu = $('#menu');
  const outlinePane = $('#outlinePane'), boardPane = $('#boardPane'), schedPane = $('#schedPane');

  // ───────────────── 상태
  let board = null;               // 지금 보는 보드
  const boards = new Map();       // 저장된 보드들
  let sel = null;                 // 주 선택 { type: 'node' | 'edge', id }
  const multi = new Set();        // 여러 개 선택한 노드
  const view = { x: 0, y: 0, z: 1 };
  let mode = 'canvas';
  let focusStatus = null;         // 상태 키 또는 'star'
  let hideDone = false;
  let undoStack = [], redoStack = [];
  const sizes = new Map();
  const nodeEls = new Map();
  let editing = null;
  let mobileSummary = false;
  let sheetFull = false;
  let searchQ = '';
  let clip = null;
  let schedShowDone = false;
  // 기간 보기: 연도 · 월로 거른다. 날짜는 마감 · 끝낸 날 · 만든 날 가운데 고른 것(기본은 셋 중 아무거나)
  let period = { y: 0, m: 0, basis: 'any' };
  let periodCtx = null;            // { hit: 기간에 드는 노드, ctx: 그 노드와 위쪽 갈래 }
  const sessionNew = new Set();    // 이번에 새로 만든 노드는 기간을 걸어 두어도 바로 사라지지 않게

  // ───────────────── 틀(템플릿) · 예시
  function build(spec, title, note) {
    const nodes = [], edges = [];
    const add = (parent, s) => {
      const [kind, t, status, extra] = s;
      const n = { id: newId('n'), created: todayStr(), x: 0, y: 0, kind, title: t, status: status || ((kind === 'idea' || kind === 'question') ? 'idea' : 'todo'), note: (extra && extra.note) || '', due: (extra && extra.due) || '', collapsed: false, star: !!(extra && extra.star), checklist: (extra && extra.checklist ? extra.checklist.map(([ct, d]) => ({ id: newId('c'), t: ct, d: !!d })) : []) };
      nodes.push(n); if (parent) edges.push({ id: newId('e'), from: parent.id, to: n.id });
      (s[4] || []).forEach((c) => add(n, c));
    };
    spec.forEach((s) => add(null, s));
    const b = { id: newId('b'), title, note: note || '', nodes, edges, createdAt: now(), updatedAt: now(), v: 2 };
    layoutBoard(b, false);
    return b;
  }
  const TEMPLATES = {
    blank: { name: L('빈 프로젝트', 'Blank project'), desc: L('목표 하나에서 시작', 'Start from one goal'), make: () => build([['goal', L('새 프로젝트', 'New project'), 'todo']], L('새 프로젝트', 'New project')) },
    plan: {
      name: L('기본 기획', 'Basic plan'), desc: L('조사 → 기획 → 실행 → 마무리', 'Research → Plan → Do → Wrap up'),
      make: () => build([['goal', L('새 프로젝트', 'New project'), 'todo', { note: L('왜 하는지, 언제까지, 무엇이 되면 성공인지 적어 보세요.', 'Write down why, by when, and what success looks like.') }, [
        ['branch', L('조사', 'Research'), 'todo', null, [['task', L('비슷한 사례 찾기', 'Look at similar examples')], ['task', L('필요한 것 정리하기', 'List what we need')], ['question', L('꼭 지켜야 할 조건은?', 'What must we stick to?')]]],
        ['branch', L('기획', 'Plan'), 'todo', null, [['task', L('범위 정하기', 'Set the scope')], ['task', L('일정 잡기', 'Set the schedule')], ['task', L('맡을 사람 정하기', 'Decide who does what')]]],
        ['branch', L('실행', 'Do'), 'todo', null, [['task', L('첫 작업 시작하기', 'Start the first task')]]],
        ['branch', L('마무리', 'Wrap up'), 'todo', null, [['task', L('결과 공유하기', 'Share the results')], ['task', L('돌아보기 (잘된 점 · 아쉬운 점)', 'Look back (what went well · what to improve)')]]]
      ]]], L('새 프로젝트', 'New project'))
    },
    brain: {
      name: L('브레인스토밍', 'Brainstorm'), desc: L('주제 하나에 질문 다섯 갈래', 'One topic, five questions'),
      make: () => build([['goal', L('생각할 주제', 'Topic to think about'), 'todo', null, [
        ['branch', L('왜 하려고 하나?', 'Why do it?'), 'todo'], ['branch', L('누구를 위한 것인가?', 'Who is it for?'), 'todo'], ['branch', L('무엇을 만들까?', 'What will we make?'), 'todo'],
        ['branch', L('어떻게 할까?', 'How will we do it?'), 'todo'], ['branch', L('걱정되는 것', 'Concerns'), 'todo']
      ]]], L('브레인스토밍', 'Brainstorm'))
    },
    event: {
      name: L('행사 준비', 'Event prep'), desc: L('장소 · 홍보 · 프로그램 · 사람 · 예산', 'Venue · promotion · program · people · budget'),
      make: () => build([['goal', L('새 행사', 'New event'), 'todo', null, [
        ['branch', L('장소 · 일정', 'Venue · dates'), 'todo', null, [['task', L('날짜 정하기', 'Pick the date')], ['task', L('장소 알아보기', 'Find a venue')], ['task', L('이동 수단 정하기', 'Arrange transport')]]],
        ['branch', L('신청 · 홍보', 'Sign-ups · promotion'), 'todo', null, [['task', L('신청 받을 곳 만들기', 'Set up sign-ups')], ['task', L('안내 문구 쓰기', 'Write the announcement')], ['idea', L('홍보 아이디어', 'Promotion ideas')]]],
        ['branch', L('프로그램', 'Program'), 'todo', null, [['task', L('시간표 짜기', 'Draft the timetable')], ['task', L('순서 맡을 사람 정하기', 'Assign program leaders')]]],
        ['branch', L('사람', 'People'), 'todo', null, [['task', L('봉사자 모집', 'Recruit volunteers')], ['task', L('사전 모임', 'Prep meeting')]]],
        ['branch', L('예산', 'Budget'), 'todo', null, [['task', L('예상 비용 정리', 'Estimate costs')], ['task', L('참가비 정하기', 'Set the fee')]]]
      ]]], L('새 행사', 'New event'))
    }
  };
  function makeExample() {
    const b = build([['goal', L('2027 겨울 캠프 준비', '2027 Winter Camp prep'), 'doing', { note: L('1월 둘째 주, 3박 4일. 참가 목표 120명.', 'Second week of January, 4 days. Goal: 120 campers.') }, [
      ['branch', L('장소 · 일정', 'Venue · dates'), 'doing', null, [['task', L('수련원 후보 3곳 비교', 'Compare 3 retreat centers'), 'done'], ['task', L('계약금 보내기', 'Pay the deposit'), 'done'], ['task', L('버스 대절 견적 받기', 'Get bus rental quotes'), 'doing', { due: '2026-12-05', checklist: [[L('A 업체', 'Company A'), true], [L('B 업체', 'Company B'), false], [L('C 업체', 'Company C'), false]] }]]],
      ['branch', L('신청 · 홍보', 'Sign-ups · promotion'), 'doing', null, [['task', L('신청 페이지 열기', 'Open the sign-up page'), 'done'], ['task', L('교회별 안내 메일 보내기', 'Email each church'), 'doing', { due: '2026-11-30', star: true }], ['idea', L('인스타 홍보 영상 30초', '30-second Instagram video'), 'idea'], ['question', L('조기 마감 기준은 몇 명?', 'When do we close early?'), 'idea']]],
      ['branch', L('프로그램', 'Program'), 'todo', null, [['task', L('주제 정하기', 'Pick the theme'), 'done'], ['task', L('저녁 집회 강사 섭외', 'Book the evening speaker'), 'blocked', { due: '2026-11-20', note: L('두 분께 연락, 답장 기다리는 중', 'Contacted two people, waiting for replies'), star: true }], ['task', L('레크리에이션 3개 기획', 'Plan 3 games'), 'todo', { due: '2026-12-15' }], ['question', L('비 오는 날 대체 프로그램?', 'Rainy-day backup program?'), 'idea']]],
      ['branch', L('스태프', 'Staff'), 'todo', null, [['task', L('카운슬러 모집', 'Recruit counselors'), 'doing'], ['task', L('트레이닝 위크 일정', 'Training week schedule'), 'todo'], ['task', L('서약서 서명 받기', 'Collect signed agreements'), 'todo', { due: '2026-12-20' }]]],
      ['branch', L('예산', 'Budget'), 'todo', null, [['task', L('참가비 정하기', 'Set the fee'), 'done'], ['task', L('후원 요청 편지', 'Support letter'), 'hold']]]
    ]]], L('2027 겨울 캠프 준비', '2027 Winter Camp prep'), L('예시 보드예요. 마음대로 고쳐 보세요.', 'This is a sample board. Change anything you like.'));
    b.id = 'example'; b.preview = true;
    return b;
  }

  // ───────────────── 그래프 계산
  function graph(b) {
    const byId = new Map(b.nodes.map((n) => [n.id, n]));
    const kids = new Map(), parents = new Map();
    for (const n of b.nodes) { kids.set(n.id, []); parents.set(n.id, []); }
    for (const e of b.edges) {
      if (!byId.has(e.from) || !byId.has(e.to)) continue;
      kids.get(e.from).push(e.to); parents.get(e.to).push(e.from);
    }
    for (const arr of kids.values()) arr.sort((p, q) => (byId.get(p).y - byId.get(q).y) || (byId.get(p).x - byId.get(q).x));
    return { byId, kids, parents };
  }
  function descendants(G, id) {
    const out = new Set(), st = [...(G.kids.get(id) || [])];
    while (st.length) { const c = st.pop(); if (out.has(c) || c === id) continue; out.add(c); st.push(...G.kids.get(c)); }
    return out;
  }
  function rollup(G, id) {
    let total = 0, done = 0, blocked = 0;
    for (const d of descendants(G, id)) {
      const n = G.byId.get(d);
      if (!COUNTED.has(n.kind) || !WORK.has(n.status)) continue;
      if (periodCtx && !periodCtx.hit.has(d)) continue;
      total++; if (n.status === 'done') done++; if (n.status === 'blocked') blocked++;
    }
    return { total, done, blocked };
  }
  function hiddenSet(G) {
    const h = new Set();
    for (const n of board.nodes) if (n.collapsed) for (const d of descendants(G, n.id)) h.add(d);
    if (hideDone) {
      for (const n of board.nodes) {
        if (n.status !== 'done') continue;
        let all = true; for (const d of descendants(G, n.id)) if (G.byId.get(d).status !== 'done') { all = false; break; }
        if (all) h.add(n.id);
      }
    }
    return h;
  }
  function pathOf(G, id) {
    const out = []; let cur = G.parents.get(id)[0]; const seen = new Set([id]);
    while (cur && !seen.has(cur)) { seen.add(cur); out.unshift(G.byId.get(cur).title || L('제목 없음', 'Untitled')); cur = G.parents.get(cur)[0]; }
    return out;
  }
  function primaryChildren(G, id) { return G.kids.get(id).filter((k) => G.parents.get(k)[0] === id); }
  function rootsOf(G) { return board.nodes.filter((n) => !G.parents.get(n.id).length).sort((a, b) => a.y - b.y || a.x - b.x); }
  function dueInfo(n) {
    if (!n.due) return null;
    const [y, m, d] = n.due.split('-').map(Number);
    if (!y || !m || !d) return null;
    const over = n.status !== 'done' && n.status !== 'hold' && n.due < todayStr();
    return { text: m + '/' + d + (over ? L(' 지남', ' overdue') : L(' 마감', ' due')), short: m + '/' + d, over };
  }
  function clDone(n) { const c = n.checklist || []; return { d: c.filter((x) => x.d).length, t: c.length }; }
  function isDim(n) {
    if (periodCtx && !periodCtx.ctx.has(n.id)) return true;
    return focusStatus === 'star' ? !n.star : (!!focusStatus && n.status !== focusStatus);
  }
  function periodOn() { return !!(period.y || period.m); }
  function inPeriod(d) {
    if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    if (period.y && Number(d.slice(0, 4)) !== period.y) return false;
    if (period.m && Number(d.slice(5, 7)) !== period.m) return false;
    return true;
  }
  function createdOf(n) { return n.created || (board.createdAt ? ymd(new Date(board.createdAt)) : ''); }
  function matchPeriod(n) {
    if (!periodOn() || sessionNew.has(n.id)) return true;
    if (period.basis === 'due') return inPeriod(n.due);
    if (period.basis === 'done') return inPeriod(n.doneOn);
    if (period.basis === 'created') return inPeriod(createdOf(n));
    return inPeriod(n.due) || inPeriod(n.doneOn) || inPeriod(createdOf(n));
  }
  function refreshPeriod() {
    if (!board || !periodOn()) { periodCtx = null; return; }
    const G = graph(board);
    const hit = new Set(board.nodes.filter(matchPeriod).map((n) => n.id));
    const ctx = new Set(hit);
    for (const id of hit) { let cur = G.parents.get(id)[0]; const seen = new Set(); while (cur && !seen.has(cur)) { seen.add(cur); ctx.add(cur); cur = G.parents.get(cur)[0]; } }
    periodCtx = { hit, ctx };
  }
  function periodLabel() {
    if (!periodOn()) return '';
    if (LANG === 'en') return ((period.m ? MONTHS_EN[period.m - 1] + ' ' : '') + (period.y || '')).trim();
    return ((period.y ? period.y + '년 ' : '') + (period.m ? period.m + '월' : '')).trim();
  }
  function applyStatus(n, st) {
    if (!n || n.status === st) return;
    if (st === 'done') { n.prevStatus = n.status; if (!n.doneOn) n.doneOn = todayStr(); }
    else if (n.status === 'done') delete n.doneOn;
    n.status = st;
  }
  function matches(n) {
    if (!searchQ) return false;
    const q = searchQ.toLowerCase();
    return (n.title || '').toLowerCase().includes(q) || (n.note || '').toLowerCase().includes(q) || (n.checklist || []).some((c) => (c.t || '').toLowerCase().includes(q));
  }
  function isSelNode(id) { return multi.has(id) || (!!sel && sel.type === 'node' && sel.id === id); }
  function selectedIds() { if (multi.size) return [...multi]; return sel && sel.type === 'node' ? [sel.id] : []; }

  // ───────────────── 캔버스 그리기
  const NODE_HTML = L('<div class="n-top"><span class="n-kind"></span><span class="n-status"></span></div><div class="n-title"></div><div class="n-meta"></div><div class="n-prog" hidden><div class="n-bar"><i></i></div><span class="n-count"></span></div><button class="n-fold" type="button" hidden></button><span class="n-handle" title="누르면 아래 가지, 끌면 연결" aria-hidden="true">+</span>', '<div class="n-top"><span class="n-kind"></span><span class="n-status"></span></div><div class="n-title"></div><div class="n-meta"></div><div class="n-prog" hidden><div class="n-bar"><i></i></div><span class="n-count"></span></div><button class="n-fold" type="button" hidden></button><span class="n-handle" title="Tap to add a child, drag to connect" aria-hidden="true">+</span>');

  function applyView() {
    world.style.transform = 'translate(' + view.x + 'px,' + view.y + 'px) scale(' + view.z + ')';
    const g = 24 * view.z;
    stage.style.backgroundSize = g + 'px ' + g + 'px';
    stage.style.backgroundPosition = view.x + 'px ' + view.y + 'px';
    $('#zoomNum').textContent = Math.round(view.z * 100) + '%';
  }
  let canvasDirty = false, needFit = false;
  function renderNodes() {
    if (mode !== 'canvas') { canvasDirty = true; return; }
    canvasDirty = false;
    const G = graph(board), hidden = hiddenSet(G);
    const seen = new Set();
    for (const n of board.nodes) { seen.add(n.id); updateNodeEl(n, G, hidden); }
    for (const [id, el] of nodeEls) if (!seen.has(id)) { el.remove(); nodeEls.delete(id); sizes.delete(id); }
    measure();
    renderWires(G, hidden);
  }
  function updateNodeEl(n, G, hidden) {
    {
      let el = nodeEls.get(n.id);
      if (!el) {
        el = document.createElement('div'); el.className = 'node'; el.dataset.id = n.id; el.innerHTML = NODE_HTML;
        nodesLayer.appendChild(el); nodeEls.set(n.id, el);
      }
      el.hidden = hidden.has(n.id);
      el.style.transform = 'translate(' + n.x + 'px,' + n.y + 'px)';
      el.dataset.kind = n.kind; el.dataset.st = n.status;
      el.classList.toggle('is-sel', isSelNode(n.id));
      el.classList.toggle('is-dim', isDim(n));
      el.classList.toggle('is-hit', matches(n));
      el.querySelector('.n-kind').innerHTML = escapeHtml(K_LABEL[n.kind] || '') + (n.star ? L('<span class="n-star" title="중요">★</span>', '<span class="n-star" title="Important">★</span>') : '');
      el.querySelector('.n-status').textContent = S_LABEL[n.status] || '';
      const t = el.querySelector('.n-title');
      if (!(editing && editing.id === n.id)) { t.textContent = n.title || L('제목 없음', 'Untitled'); t.classList.toggle('is-empty', !n.title); }
      const meta = el.querySelector('.n-meta'); meta.textContent = '';
      const di = dueInfo(n);
      if (di) { const s = document.createElement('span'); s.className = 'n-due' + (di.over ? ' is-over' : ''); s.textContent = di.text; meta.appendChild(s); }
      const cl = clDone(n);
      if (cl.t) { const s = document.createElement('span'); s.textContent = L('체크 ', 'Checklist ') + cl.d + '/' + cl.t; meta.appendChild(s); }
      if (n.note) { const s = document.createElement('span'); s.textContent = L('메모', 'Note'); meta.appendChild(s); }
      const r = rollup(G, n.id), prog = el.querySelector('.n-prog');
      prog.hidden = r.total === 0;
      if (r.total) {
        prog.querySelector('i').style.width = Math.round(r.done / r.total * 100) + '%';
        prog.querySelector('.n-count').innerHTML = r.done + '/' + r.total + (r.blocked ? L(' <span class="warn">막힘 ', ' <span class="warn">Blocked ') + r.blocked + '</span>' : '');
      }
      const fold = el.querySelector('.n-fold'), kc = G.kids.get(n.id).length;
      fold.hidden = kc === 0;
      if (kc) {
        const hc = n.collapsed ? descendants(G, n.id).size : 0;
        fold.textContent = n.collapsed ? '+' + hc : '−';
        fold.title = n.collapsed ? L('가지 ', 'Show ') + hc + L('개 펼치기', ' hidden') : L('아래 가지 접기', 'Collapse branch');
        fold.setAttribute('aria-label', fold.title);
      }
    }
  }
  // 글자 하나 칠 때: 그 노드만 다시 그리고 연결선만 맞춘다
  function renderOneNode(id) {
    if (mode !== 'canvas') { canvasDirty = true; return; }
    const n = board.nodes.find((x) => x.id === id); if (!n) return renderNodes();
    const G = graph(board), hidden = hiddenSet(G);
    updateNodeEl(n, G, hidden);
    const el = nodeEls.get(id); if (el && !el.hidden) sizes.set(id, { w: el.offsetWidth, h: el.offsetHeight });
    renderWires(G, hidden);
  }
  function measure() { for (const [id, el] of nodeEls) if (!el.hidden && el.offsetWidth) sizes.set(id, { w: el.offsetWidth, h: el.offsetHeight }); }
  function estimateH(n) { return 78 + (n.title && n.title.length > 16 ? 18 : 0) + (n.due || n.note || (n.checklist && n.checklist.length) ? 18 : 0); }
  function rectOf(n) {
    const s = sizes.get(n.id) || { w: NODE_W, h: estimateH(n) };
    return { l: n.x, t: n.y, r: n.x + s.w, b: n.y + s.h, cx: n.x + s.w / 2, cy: n.y + s.h / 2 };
  }
  function wirePath(A, B) {
    if (B.l >= A.r - 8 || B.r <= A.l + 8) {
      const right = B.l >= A.r - 8;
      const sx = right ? A.r : A.l, ex = right ? B.l : B.r;
      const k = Math.max(28, Math.abs(ex - sx) * 0.5) * (right ? 1 : -1);
      return 'M' + sx + ',' + A.cy + ' C' + (sx + k) + ',' + A.cy + ' ' + (ex - k) + ',' + B.cy + ' ' + ex + ',' + B.cy;
    }
    const down = B.cy >= A.cy;
    const sy = down ? A.b : A.t, ey = down ? B.t : B.b;
    const k = Math.max(28, Math.abs(ey - sy) * 0.5) * (down ? 1 : -1);
    return 'M' + A.cx + ',' + sy + ' C' + A.cx + ',' + (sy + k) + ' ' + B.cx + ',' + (ey - k) + ' ' + B.cx + ',' + ey;
  }
  function renderWires(G, hidden) {
    if (mode !== 'canvas') { canvasDirty = true; return; }
    let html = '';
    for (const e of board.edges) {
      const a = G.byId.get(e.from), b = G.byId.get(e.to);
      if (!a || !b || hidden.has(a.id) || hidden.has(b.id)) continue;
      const d = wirePath(rectOf(a), rectOf(b));
      const isSel = sel && sel.type === 'edge' && sel.id === e.id;
      html += '<path class="wire' + (isSel ? ' is-sel' : '') + (isDim(b) ? ' is-dim' : '') + '" data-st="' + escapeHtml(b.status) + '" d="' + d + '"/>' +
              '<path class="wire-hit" data-edge="' + escapeHtml(e.id) + '" d="' + d + '"/>';
    }
    html += '<path class="wire-temp" id="tempWire" d="" />';
    wires.innerHTML = html;
  }

  function renderSummary() {
    const counts = Object.fromEntries(STATUSES.map(([k]) => [k, 0]));
    let work = 0, done = 0, stars = 0;
    for (const n of board.nodes) {
      if (periodCtx && !periodCtx.hit.has(n.id)) continue;
      if (n.star) stars++;
      if (!COUNTED.has(n.kind)) continue;
      counts[n.status] = (counts[n.status] || 0) + 1;
      if (WORK.has(n.status)) { work++; if (n.status === 'done') done++; }
    }
    $('#ovBar').style.width = (work ? Math.round(done / work * 100) : 0) + '%';
    $('#ovNum').textContent = (periodOn() ? periodLabel() + ' · ' : '') + L('완료 ', 'Done ') + done + ' / ' + work + (work ? ' · ' + Math.round(done / work * 100) + '%' : '');
    renderPeriodControls();
    $('#chips').innerHTML = STATUSES.map(([k, l]) =>
      '<button type="button" class="chip' + (counts[k] ? '' : ' is-zero') + '" data-st="' + k + '" aria-pressed="' + (focusStatus === k) + '" title="' + l + L('만 강조">', ' only">') + l + ' <b>' + counts[k] + '</b></button>').join('') +
      '<button type="button" class="chip' + (stars ? '' : ' is-zero') + '" data-st="star" aria-pressed="' + (focusStatus === 'star') + L('" title="중요 표시한 것만 강조">★ 중요 <b>', '" title="Highlight important items only">★ Important <b>') + stars + '</b></button>';
    const pt = $('#projTitle');
    if (document.activeElement !== pt) pt.value = board.title || '';
    $('#banner').hidden = !board.preview || mode !== 'canvas';
  }

  function renderPeriodControls() {
    const years = new Set([new Date().getFullYear()]);
    for (const n of board.nodes) for (const d of [n.due, n.doneOn, createdOf(n)]) if (d && /^\d{4}/.test(d)) years.add(Number(d.slice(0, 4)));
    if (period.y) years.add(period.y);
    const ys = [...years].sort((a, b) => b - a);
    const py = $('#pYear'), pm = $('#pMonth'), pb = $('#pBasis');
    const yHtml = L('<option value="0">모든 해</option>', '<option value="0">All years</option>') + ys.map((y) => '<option value="' + y + '"' + (period.y === y ? ' selected' : '') + '>' + y + L('년</option>', '</option>')).join('');
    if (py.innerHTML !== yHtml) py.innerHTML = yHtml;
    py.value = String(period.y || 0);
    if (!pm.options.length) pm.innerHTML = L('<option value="0">모든 달</option>', '<option value="0">All months</option>') + Array.from({ length: 12 }, (_, i) => '<option value="' + (i + 1) + '">' + L((i + 1) + '월', MONTHS_EN[i]) + '</option>').join('');
    pm.value = String(period.m || 0);
    pb.value = period.basis;
    pb.hidden = !periodOn();
    $('#period').classList.toggle('is-on', periodOn());
    const t = new Date();
    $('#pThis').hidden = period.y === t.getFullYear() && period.m === t.getMonth() + 1;
    $('#pClear').hidden = !periodOn();
  }
  function setPeriod(p) {
    period = { y: p.y || 0, m: p.m || 0, basis: p.basis || period.basis || 'any' };
    lsSet('wolko-tasks:period', JSON.stringify(period));
    refreshPeriod(); renderNodes(); renderSummary(); renderPane(); renderPanel(true);
  }
  $('#pYear').addEventListener('change', (e) => setPeriod({ ...period, y: Number(e.target.value) }));
  $('#pMonth').addEventListener('change', (e) => { const m = Number(e.target.value); setPeriod({ ...period, m, y: m && !period.y ? new Date().getFullYear() : period.y }); });
  $('#pBasis').addEventListener('change', (e) => setPeriod({ ...period, basis: e.target.value }));
  $('#pThis').addEventListener('click', () => { const t = new Date(); setPeriod({ ...period, y: t.getFullYear(), m: t.getMonth() + 1 }); });
  $('#pClear').addEventListener('click', () => setPeriod({ ...period, y: 0, m: 0 }));

  function renderAll() {
    refreshPeriod();
    renderNodes();
    renderSummary();
    renderPanel();
    renderPane();
    updateUndoBtns();
  }
  function renderPane() {
    if (mode === 'outline') renderOutline();
    else if (mode === 'board') renderKanban();
    else if (mode === 'schedule') renderSchedule();
  }

  // ───────────────── 패널 (폰: 낮은 시트 → 펼치면 높아짐)
  let panelFor = null;
  function setPanelOpen(open) {
    panel.classList.toggle('is-open', open);
    panel.classList.toggle('is-full', open && (sheetFull || mobileSummary));
    document.body.classList.toggle('sheet-open', open);
  }
  function renderPanel(force) {
    const key = multi.size > 1 ? 'multi:' + [...multi].sort().join(',') : sel ? sel.type + ':' + sel.id : 'overview';
    const ae = document.activeElement;
    const typing = panel.contains(ae) && /INPUT|TEXTAREA/.test(ae.tagName);
    if (!force && key === panelFor && typing) { refreshPanelBits(); return; }
    panelFor = key;
    setPanelOpen(multi.size > 1 || !!sel || mobileSummary);
    if (multi.size > 1) { panelIn.innerHTML = multiPanelHtml(); bindMultiPanel(); }
    else if (sel && sel.type === 'node') {
      const n = board.nodes.find((x) => x.id === sel.id);
      if (!n) { sel = null; return renderPanel(true); }
      panelIn.innerHTML = nodePanelHtml(n);
      bindNodePanel(n);
    } else if (sel && sel.type === 'edge') {
      const e = board.edges.find((x) => x.id === sel.id);
      if (!e) { sel = null; return renderPanel(true); }
      const G = graph(board), a = G.byId.get(e.from), b = G.byId.get(e.to);
      panelIn.innerHTML = sheetHead(L('연결', 'Connection')) +
        '<p class="hint"><b>' + escapeHtml(a ? a.title || L('제목 없음', 'Untitled') : '') + '</b> → <b>' + escapeHtml(b ? b.title || L('제목 없음', 'Untitled') : '') + '</b></p>' +
        L('<div class="row-btns"><button class="btn danger" type="button" id="delEdge">연결 끊기</button></div>', '<div class="row-btns"><button class="btn danger" type="button" id="delEdge">Remove connection</button></div>');
      $('#delEdge').onclick = () => { const id = e.id; mutate(() => { board.edges = board.edges.filter((x) => x.id !== id); }); setSel(null); };
      bindHead();
    } else {
      panelIn.innerHTML = overviewHtml();
      bindOverview();
    }
  }
  function sheetHead(title, withExpand) {
    return '<button class="grab" type="button" id="grab" aria-label="' + (sheetFull ? L('시트 낮추기', 'Lower the sheet') : L('시트 펼치기', 'Expand the sheet')) + '"></button>' +
      '<div class="panel-head"><h2>' + escapeHtml(title) + '</h2><span class="acts">' +
      (withExpand ? '<button class="btn sheet-only" type="button" id="sheetMore">' + (sheetFull ? L('접기', 'Less') : L('자세히', 'More')) + '</button>' : '') +
      L('<button class="icon-btn sheet-only" type="button" id="panelClose" aria-label="닫기"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></span></div>', '<button class="icon-btn sheet-only" type="button" id="panelClose" aria-label="Close"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></span></div>');
  }
  function bindHead() {
    const c = $('#panelClose'); if (c) c.onclick = () => { mobileSummary = false; sheetFull = false; setSel(null); setPanelOpen(false); };
    const toggle = () => { sheetFull = !sheetFull; setPanelOpen(true); const m = $('#sheetMore'); if (m) m.textContent = sheetFull ? L('접기', 'Less') : L('자세히', 'More'); const g = $('#grab'); if (g) g.setAttribute('aria-label', sheetFull ? L('시트 낮추기', 'Lower the sheet') : L('시트 펼치기', 'Expand the sheet')); if (sel && sel.type === 'node') setTimeout(() => keepAboveSheet(sel.id), 240); };
    const m = $('#sheetMore'); if (m) m.onclick = toggle;
    const g = $('#grab'); if (g) g.onclick = () => { if (mobileSummary && !sel) { mobileSummary = false; setPanelOpen(false); return; } toggle(); };
  }

  function nodePanelHtml(n) {
    const G = graph(board), r = rollup(G, n.id), kids = G.kids.get(n.id);
    const path = pathOf(G, n.id);
    const cl = n.checklist || [];
    return sheetHead(path.length ? path.join(' › ') : L('맨 위 노드', 'Top-level node'), true) +
      L('<div class="field"><label for="fTitle" class="sr">이름</label><input class="wl-tall inp title" id="fTitle" maxlength="160" value="', '<div class="field"><label for="fTitle" class="sr">Name</label><input class="wl-tall inp title" id="fTitle" maxlength="160" value="') + escapeHtml(n.title) + L('" placeholder="무엇을 할지, 무엇을 생각할지"></div>', '" placeholder="What to do or think about"></div>') +
      L('<div class="seg scroll" role="group" aria-label="상태" id="fStatus">', '<div class="seg scroll" role="group" aria-label="Status" id="fStatus">') +
        STATUSES.map(([k, l], i) => '<button type="button" data-st="' + k + '" data-v="' + k + '" aria-pressed="' + (n.status === k) + '" title="' + l + ' (' + (i + 1) + ')">' + l + '</button>').join('') + '</div>' +
      '<div class="row-btns">' +
        L('<button class="btn" type="button" id="pChild">아래 가지</button>', '<button class="btn" type="button" id="pChild">Add child</button>') +
        L('<button class="btn" type="button" id="pSib">같은 줄</button>', '<button class="btn" type="button" id="pSib">Add sibling</button>') +
        '<button class="btn star-btn" type="button" id="pStar" aria-pressed="' + !!n.star + '">' + (n.star ? L('★ 중요', '★ Important') : L('☆ 중요', '☆ Important')) + '</button>' +
      '</div>' +
      (mode === 'outline' ? L('<div class="row-btns" aria-label="개요에서 위치 바꾸기"><button class="btn" type="button" data-ol="out">← 내어쓰기</button><button class="btn" type="button" data-ol="in">들여쓰기 →</button><button class="btn" type="button" data-ol="up" aria-label="위로">↑</button><button class="btn" type="button" data-ol="down" aria-label="아래로">↓</button></div>', '<div class="row-btns" aria-label="Move in the outline"><button class="btn" type="button" data-ol="out">← Outdent</button><button class="btn" type="button" data-ol="in">Indent →</button><button class="btn" type="button" data-ol="up" aria-label="Move up">↑</button><button class="btn" type="button" data-ol="down" aria-label="Move down">↓</button></div>') : '') +
      '<div class="more-fields">' +
        L('<div class="field"><span class="lbl" id="lblKind">종류</span><div class="seg" role="group" aria-labelledby="lblKind" id="fKind">', '<div class="field"><span class="lbl" id="lblKind">Type</span><div class="seg" role="group" aria-labelledby="lblKind" id="fKind">') +
          KINDS.map(([k, l]) => '<button type="button" data-v="' + k + '" aria-pressed="' + (n.kind === k) + '">' + l + '</button>').join('') + '</div></div>' +
        L('<div class="field"><label for="fDue">마감</label><input class="wl-tall inp" type="date" id="fDue" value="', '<div class="field"><label for="fDue">Due</label><input class="wl-tall inp" type="date" id="fDue" value="') + escapeHtml(n.due || '') + '"></div>' +
        L('<div class="field-two"><div class="field"><label for="fCreated">만든 날</label><input class="wl-tall inp" type="date" id="fCreated" value="', '<div class="field-two"><div class="field"><label for="fCreated">Created</label><input class="wl-tall inp" type="date" id="fCreated" value="') + escapeHtml(createdOf(n)) + '"></div>' +
        L('<div class="field"><label for="fDoneOn">끝낸 날</label><input class="wl-tall inp" type="date" id="fDoneOn" value="', '<div class="field"><label for="fDoneOn">Finished</label><input class="wl-tall inp" type="date" id="fDoneOn" value="') + escapeHtml(n.doneOn || '') + '"' + (n.status === 'done' ? '' : L(' disabled title="완료로 바꾸면 그날이 들어가요"', ' disabled title="Filled in when you mark it done"')) + '></div></div>' +
        L('<div class="field"><span class="lbl">체크리스트', '<div class="field"><span class="lbl">Checklist') + (cl.length ? ' · ' + clDone(n).d + '/' + cl.length : '') + '</span>' +
          '<ul class="checklist" id="fCl">' + cl.map((c) => '<li class="' + (c.d ? 'is-done' : '') + '" data-c="' + escapeHtml(c.id) + '"><input type="checkbox" ' + (c.d ? 'checked' : '') + L(' aria-label="완료"><input class="wl-tall ci" value="', ' aria-label="Done"><input class="wl-tall ci" value="') + escapeHtml(c.t) + L('" aria-label="항목"><button class="cx" type="button" aria-label="항목 지우기">✕</button></li>', '" aria-label="Item"><button class="cx" type="button" aria-label="Delete item">✕</button></li>')).join('') + '</ul>' +
          L('<input class="wl-tall inp" id="fClNew" placeholder="항목 추가하고 Enter" maxlength="200"></div>', '<input class="wl-tall inp" id="fClNew" placeholder="Add an item and press Enter" maxlength="200"></div>') +
        L('<div class="field"><label for="fNote">메모</label><textarea class="txt" id="fNote" placeholder="생각, 링크, 다음에 할 일…">', '<div class="field"><label for="fNote">Note</label><textarea class="txt" id="fNote" placeholder="Thoughts, links, next steps…">') + escapeHtml(n.note || '') + '</textarea></div>' +
        (r.total ? '<div class="stat" id="nStat">' + statHtml(r) + '</div>' : '<div class="stat" id="nStat" hidden></div>') +
        '<div class="row-btns">' +
          (kids.length ? '<button class="btn" type="button" id="pFold">' + (n.collapsed ? L('가지 펼치기', 'Expand branch') : L('가지 접기', 'Collapse branch')) + '</button>' : '') +
          (mode !== 'canvas' ? L('<button class="btn" type="button" id="pShow">캔버스에서 보기</button>', '<button class="btn" type="button" id="pShow">Show on canvas</button>') : '') +
          L('<button class="btn" type="button" id="pCopy">복사</button>', '<button class="btn" type="button" id="pCopy">Copy</button>') +
          L('<button class="btn danger" type="button" id="pDel">지우기</button>', '<button class="btn danger" type="button" id="pDel">Delete</button>') +
        '</div>' +
        L('<p class="hint">진행률은 아래 가지의 작업 · 아이디어 · 질문 가운데 할 일 · 진행 중 · 막힘 · 완료로 둔 것만 셉니다.</p>', '<p class="hint">Progress counts only tasks, ideas and questions below this node that are set to To do, Doing, Blocked or Done.</p>') +
      '</div>';
  }
  function statHtml(r) {
    return L('<div class="stat-line"><span>아래 가지 진행</span><b>', '<div class="stat-line"><span>Progress below</span><b>') + r.done + ' / ' + r.total + ' · ' + Math.round(r.done / r.total * 100) + '%</b></div>' +
      '<div class="big-bar"><i style="width:' + Math.round(r.done / r.total * 100) + '%"></i></div>' +
      (r.blocked ? L('<div class="stat-line"><span class="st-txt" data-st="blocked">막힌 일</span><b>', '<div class="stat-line"><span class="st-txt" data-st="blocked">Blocked</span><b>') + r.blocked + '</b></div>' : '');
  }
  function refreshPanelBits() {
    if (sel && sel.type === 'node' && multi.size < 2) {
      const st = $('#nStat'); if (!st) return;
      const r = rollup(graph(board), sel.id);
      st.hidden = !r.total; if (r.total) st.innerHTML = statHtml(r);
    }
  }
  // 입력칸: 입력하는 동안은 바로 반영하고, 칸을 떠날 때 되돌리기 한 칸을 남긴다
  function bindField(el, apply, nodeId) {
    let snap = null;
    el.addEventListener('focus', () => { snap = snapshot(); });
    el.addEventListener('input', () => { apply(el.value); softChanged(nodeId); });
    el.addEventListener('change', () => { apply(el.value); softChanged(nodeId); });
    el.addEventListener('blur', () => { if (snap && snap !== snapshot()) { undoStack.push(snap); trimUndo(); redoStack = []; updateUndoBtns(); } snap = null; });
  }
  function bindNodePanel(n) {
    bindHead();
    bindField($('#fTitle'), (v) => { n.title = v; }, n.id);
    bindField($('#fNote'), (v) => { n.note = v; }, n.id);
    bindField($('#fDue'), (v) => { n.due = v; }, n.id);
    bindField($('#fCreated'), (v) => { if (v) n.created = v; else delete n.created; }, n.id);
    bindField($('#fDoneOn'), (v) => { if (v) n.doneOn = v; else delete n.doneOn; }, n.id);
    $('#fTitle').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); e.target.blur(); } });
    $('#fStatus').onclick = (e) => { const b = e.target.closest('button'); if (b) setStatus(n.id, b.dataset.v); };
    $('#fKind').onclick = (e) => { const b = e.target.closest('button'); if (!b || n.kind === b.dataset.v) return; mutate(() => { n.kind = b.dataset.v; }); };
    $('#pChild').onclick = () => addChild(n.id);
    $('#pSib').onclick = () => addSibling(n.id);
    $('#pStar').onclick = () => toggleStar([n.id]);
    panelIn.querySelectorAll('[data-ol]').forEach((b) => { b.onclick = () => {
      const a = b.dataset.ol;
      if (a === 'in') olIndent(n.id); else if (a === 'out') olOutdent(n.id); else olMove(n.id, a === 'up' ? -1 : 1);
      const ae = document.activeElement; if (ae && ae.classList.contains('ol-title')) ae.blur();
      panelFor = null; renderPanel(true);
      const row = outlinePane.querySelector('.ol-row[data-id="' + CSS.escape(n.id) + '"]'); if (row) row.scrollIntoView({ block: 'nearest' });
    }; });
    const f = $('#pFold'); if (f) f.onclick = () => toggleFold(n.id);
    const s = $('#pShow'); if (s) s.onclick = () => { setMode('canvas'); centerOn(n.id); };
    $('#pCopy').onclick = () => copySel(false);
    $('#pDel').onclick = () => deleteNodes([n.id]);
    // 체크리스트
    const ul = $('#fCl');
    ul.addEventListener('change', (e) => {
      const li = e.target.closest('li'); if (!li || e.target.type !== 'checkbox') return;
      const c = (n.checklist || []).find((x) => x.id === li.dataset.c); if (!c) return;
      mutate(() => { c.d = e.target.checked; });
    });
    ul.querySelectorAll('.ci').forEach((inp) => {
      const li = inp.closest('li');
      bindField(inp, (v) => { const c = (n.checklist || []).find((x) => x.id === li.dataset.c); if (c) c.t = v; }, n.id);
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); $('#fClNew').focus(); } });
    });
    ul.addEventListener('click', (e) => {
      const x = e.target.closest('.cx'); if (!x) return;
      const id = x.closest('li').dataset.c;
      mutate(() => { n.checklist = (n.checklist || []).filter((c) => c.id !== id); });
      renderPanel(true);
    });
    const add = $('#fClNew');
    add.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      const v = add.value.trim(); if (!v) return;
      mutate(() => { n.checklist = (n.checklist || []).concat([{ id: newId('c'), t: v, d: false }]); });
      renderPanel(true);
      const again = $('#fClNew'); if (again) again.focus();
    });
  }

  function multiPanelHtml() {
    const ids = [...multi];
    const nodes = ids.map((id) => board.nodes.find((n) => n.id === id)).filter(Boolean);
    const allStar = nodes.length && nodes.every((n) => n.star);
    return sheetHead(nodes.length + L('개 선택함', ' selected')) +
      L('<div class="field"><span class="lbl">상태를 한꺼번에 바꾸기</span><div class="seg scroll" role="group" aria-label="상태" id="mStatus">', '<div class="field"><span class="lbl">Change status for all</span><div class="seg scroll" role="group" aria-label="Status" id="mStatus">') +
        STATUSES.map(([k, l]) => '<button type="button" data-st="' + k + '" data-v="' + k + '" aria-pressed="' + nodes.every((n) => n.status === k) + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="row-btns">' +
        '<button class="btn star-btn" type="button" id="mStar" aria-pressed="' + !!allStar + '">' + (allStar ? L('★ 중요', '★ Important') : L('☆ 중요', '☆ Important')) + '</button>' +
        L('<button class="btn" type="button" id="mCopy">복사</button>', '<button class="btn" type="button" id="mCopy">Copy</button>') +
        L('<button class="btn" type="button" id="mClear">선택 풀기</button>', '<button class="btn" type="button" id="mClear">Clear selection</button>') +
        L('<button class="btn danger" type="button" id="mDel">모두 지우기</button>', '<button class="btn danger" type="button" id="mDel">Delete all</button>') +
      '</div>' +
      '<ul class="list">' + nodes.slice(0, 30).map((n) => '<li><button type="button" data-go="' + escapeHtml(n.id) + '"><span class="li-top"><span class="li-title">' + escapeHtml(n.title || L('제목 없음', 'Untitled')) + '</span><span class="li-sub st-txt" data-st="' + n.status + '">' + S_LABEL[n.status] + '</span></span></button></li>').join('') + '</ul>' +
      L('<p class="hint">끌면 고른 노드가 가지째 함께 움직여요. Ctrl+C로 복사해서 다른 노드를 고른 뒤 Ctrl+V 하면 그 아래에 붙어요.</p>', '<p class="hint">Dragging moves the selected nodes with their branches. Copy with Ctrl+C, pick another node, then Ctrl+V to paste under it.</p>');
  }
  function bindMultiPanel() {
    bindHead();
    $('#mStatus').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const ids = [...multi];
      mutate(() => { for (const id of ids) applyStatus(board.nodes.find((x) => x.id === id), b.dataset.v); });
    };
    $('#mStar').onclick = () => toggleStar([...multi]);
    $('#mCopy').onclick = () => copySel(false);
    $('#mClear').onclick = () => setSel(null);
    $('#mDel').onclick = () => deleteNodes([...multi]);
    panelIn.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => reveal(b.dataset.go); });
  }

  function overviewHtml() {
    const G = graph(board);
    let work = 0, done = 0;
    const inP = (n) => !periodCtx || periodCtx.hit.has(n.id);
    for (const n of board.nodes) if (inP(n) && COUNTED.has(n.kind) && WORK.has(n.status)) { work++; if (n.status === 'done') done++; }
    const groups = [];
    const seen = new Set();
    const walk = (id, depth) => {
      if (seen.has(id)) return; seen.add(id);
      const n = G.byId.get(id);
      if (GROUPS.has(n.kind) && (!periodCtx || periodCtx.ctx.has(id))) groups.push({ n, depth: Math.min(depth, 2), r: rollup(G, id) });
      for (const k of G.kids.get(id)) walk(k, GROUPS.has(n.kind) ? depth + 1 : depth);
    };
    rootsOf(G).forEach((r) => walk(r.id, 0));
    const blocked = board.nodes.filter((n) => inP(n) && COUNTED.has(n.kind) && n.status === 'blocked');
    const starred = board.nodes.filter((n) => inP(n) && n.star && n.status !== 'done');
    const t = todayStr();
    const soon = board.nodes.filter((n) => inP(n) && n.due && n.status !== 'done' && n.status !== 'hold').sort((a, b) => a.due.localeCompare(b.due)).slice(0, 6);
    const itemBtn = (n, sub) => '<li><button type="button" data-go="' + escapeHtml(n.id) + '"><span class="li-top"><span class="li-title">' + escapeHtml(n.title || L('제목 없음', 'Untitled')) + '</span><span class="li-sub">' + sub + '</span></span></button></li>';
    return sheetHead(L('프로젝트 요약', 'Project summary') + (periodOn() ? ' · ' + periodLabel() : '')) +
      L('<div class="field"><label for="pNote">프로젝트 메모</label><textarea class="txt" id="pNote" placeholder="왜 하는지, 언제까지, 무엇이 되면 성공인지">', '<div class="field"><label for="pNote">Project note</label><textarea class="txt" id="pNote" placeholder="Why, by when, and what success looks like">') + escapeHtml(board.note || '') + '</textarea></div>' +
      L('<div class="stat"><div class="stat-line"><span>전체 진행</span><b>', '<div class="stat"><div class="stat-line"><span>Overall</span><b>') + done + ' / ' + work + (work ? ' · ' + Math.round(done / work * 100) + '%' : '') + '</b></div><div class="big-bar"><i style="width:' + (work ? Math.round(done / work * 100) : 0) + '%"></i></div></div>' +
      L('<div class="sec"><h3>갈래별 진행</h3>', '<div class="sec"><h3>Progress by branch</h3>') + (groups.length ? '<ul class="list">' + groups.map((g) =>
        '<li><button type="button" data-go="' + escapeHtml(g.n.id) + '" class="li-indent-' + g.depth + '"><span class="li-top"><span class="li-title">' + escapeHtml(g.n.title || L('제목 없음', 'Untitled')) + '</span><span class="li-sub">' +
        (g.r.total ? g.r.done + '/' + g.r.total + (g.r.blocked ? L(' · 막힘 ', ' · blocked ') + g.r.blocked : '') : L('작업 없음', 'No tasks')) + '</span></span>' + (g.r.total ? '<span class="li-bar"><i style="width:' + Math.round(g.r.done / g.r.total * 100) + '%"></i></span>' : '') + '</button></li>').join('') + '</ul>'
        : L('<p class="none">목표나 갈래 노드를 만들면 여기서 갈래마다 진행을 볼 수 있어요.</p>', '<p class="none">Add goal or branch nodes to see progress for each branch here.</p>')) + '</div>' +
      L('<div class="sec"><h3>막힌 일</h3>', '<div class="sec"><h3>Blocked</h3>') + (blocked.length ? '<ul class="list">' + blocked.map((n) => itemBtn(n, escapeHtml(pathOf(G, n.id).slice(-1)[0] || ''))).join('') + '</ul>' : L('<p class="none">막힌 일이 없어요.</p>', '<p class="none">Nothing is blocked.</p>')) + '</div>' +
      L('<div class="sec"><h3>중요</h3>', '<div class="sec"><h3>Important</h3>') + (starred.length ? '<ul class="list">' + starred.map((n) => itemBtn(n, S_LABEL[n.status])).join('') + '</ul>' : L('<p class="none">S 키나 ☆ 버튼으로 중요한 일을 표시해 두세요.</p>', '<p class="none">Mark important items with the S key or the ☆ button.</p>')) + '</div>' +
      L('<div class="sec"><h3>다가오는 마감</h3>', '<div class="sec"><h3>Coming up</h3>') + (soon.length ? '<ul class="list">' + soon.map((n) => { const [, m, d] = n.due.split('-').map(Number); return itemBtn(n, (n.due < t ? L('지남 ', 'overdue ') : '') + m + '/' + d); }).join('') + '</ul>' : L('<p class="none">마감을 정한 일이 없어요.</p>', '<p class="none">No due dates yet.</p>')) + '</div>' +
      L('<p class="hint">노드를 누르면 여기에서 이름 · 상태 · 마감 · 체크리스트 · 메모를 고칠 수 있어요.</p>', '<p class="hint">Tap a node to edit its name, status, due date, checklist and note here.</p>');
  }
  function bindOverview() {
    bindHead();
    bindField($('#pNote'), (v) => { board.note = v; });
    panelIn.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => reveal(b.dataset.go); });
  }

  // ───────────────── 개요(목록) 보기
  function outlineRows() {
    const G = graph(board), rows = [], seen = new Set();
    const walk = (id, d) => {
      if (seen.has(id)) return; seen.add(id);
      if (periodCtx && !periodCtx.ctx.has(id)) return;   // 기간 밖 줄은 감춘다(위쪽 갈래는 남김)
      const n = G.byId.get(id);
      const kids = primaryChildren(G, id);
      rows.push({ n, d, kids: kids.length });
      if (!n.collapsed) kids.forEach((k) => walk(k, d + 1));
    };
    rootsOf(G).forEach((r) => walk(r.id, 0));
    for (const n of board.nodes) if (!seen.has(n.id) && !G.parents.get(n.id).length) walk(n.id, 0);
    return { G, rows };
  }
  function renderOutline(focusId, caret) {
    const ae = document.activeElement;
    if (focusId === undefined && ae && ae.classList && ae.classList.contains('ol-title') && outlinePane.contains(ae)) {
      focusId = ae.closest('.ol-row').dataset.id;
      caret = caretOffset(ae);
    }
    const { G, rows } = outlineRows();
    const html = rows.map(({ n, d, kids }) => {
      const r = GROUPS.has(n.kind) ? rollup(G, n.id) : null;
      const di = dueInfo(n), cl = clDone(n);
      const group = GROUPS.has(n.kind);
      return '<div class="ol-row' + (isSelNode(n.id) ? ' is-sel' : '') + (isDim(n) ? ' is-dim' : '') + (matches(n) ? ' is-hit' : '') + '" data-id="' + escapeHtml(n.id) + '" data-kind="' + escapeHtml(n.kind) + '" data-st="' + escapeHtml(n.status) + '" style="--d:' + d + '">' +
        (kids ? '<button class="ol-fold" type="button" aria-expanded="' + !n.collapsed + '" aria-label="' + (n.collapsed ? L('펼치기', 'Expand') : L('접기', 'Less')) + '">' + svgChevron + '</button>' : '<span></span>') +
        '<button class="ol-check' + (group ? ' is-group' : '') + '" type="button" data-st="' + n.status + '" aria-pressed="' + (n.status === 'done') + L('" aria-label="완료로 표시">', '" aria-label="Mark done">') + svgCheck + '</button>' +
        '<div class="ol-main"><span class="ol-kind">' + K_LABEL[n.kind] + (n.star ? ' <span class="n-star">★</span>' : '') + '</span>' +
          L('<span class="ol-title" contenteditable="true" spellcheck="false" data-ph="이름 없음">', '<span class="ol-title" contenteditable="true" spellcheck="false" data-ph="Untitled">') + escapeHtml(n.title) + '</span></div>' +
        '<div class="ol-meta">' +
          (r && r.total ? '<span>' + r.done + '/' + r.total + (r.blocked ? L(' <span class="warn">막힘 ', ' <span class="warn">Blocked ') + r.blocked + '</span>' : '') + '</span>' : '') +
          (cl.t ? L('<span>체크 ', '<span>Checklist ') + cl.d + '/' + cl.t + '</span>' : '') +
          (di ? '<span class="n-due' + (di.over ? ' is-over' : '') + '">' + di.short + '</span>' : '') +
          '<span class="ol-st" data-st="' + escapeHtml(n.status) + '">' + S_LABEL[n.status] + '</span>' +
          L('<button class="ol-more" type="button" aria-label="자세히">', '<button class="ol-more" type="button" aria-label="More">') + svgMore + '</button>' +
        L('</div><button class="ol-more ol-more-m" type="button" aria-label="자세히">', '</div><button class="ol-more ol-more-m" type="button" aria-label="More">') + svgMore + '</button></div>';
    }).join('');
    outlinePane.innerHTML = L('<div class="outline"><p class="ol-tip mob">줄을 눌러 바로 고치고, 줄바꿈으로 다음 줄을 만들어요. ⋯ 를 누르면 들여쓰기 · 상태 · 마감을 바꿀 수 있어요.</p><p class="ol-tip desk"><kbd>Enter</kbd> 다음 줄 · <kbd>Tab</kbd> 들여쓰기 · <kbd>Shift</kbd>+<kbd>Tab</kbd> 내어쓰기 · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> 완료 · <kbd>Alt</kbd>+<kbd>↑</kbd><kbd>↓</kbd> 순서 바꾸기 · 빈 줄에서 <kbd>Backspace</kbd> 지우기</p>', '<div class="outline"><p class="ol-tip mob">Tap a line to edit it; a line break starts the next line. Tap ⋯ to indent, change status or set a due date.</p><p class="ol-tip desk"><kbd>Enter</kbd> next line · <kbd>Tab</kbd> indent · <kbd>Shift</kbd>+<kbd>Tab</kbd> outdent · <kbd>Ctrl</kbd>+<kbd>Enter</kbd> done · <kbd>Alt</kbd>+<kbd>↑</kbd><kbd>↓</kbd> reorder · <kbd>Backspace</kbd> on an empty line deletes it</p>') +
      '<div class="ol-list" id="olList">' + (html || (periodOn() && board.nodes.length
        ? '<div class="ol-empty">' + escapeHtml(periodLabel()) + L('에 드는 노드가 없어요. <button class="btn" type="button" id="olClearPeriod">전체 기간 보기</button></div>', ': no nodes in this period. <button class="btn" type="button" id="olClearPeriod">Show all dates</button></div>')
        : L('<div class="ol-empty">노드가 없어요. 아래 버튼으로 시작하세요.</div>', '<div class="ol-empty">No nodes yet. Start with the button below.</div>'))) + '</div>' +
      L('<div class="row-btns" style="margin-top:10px"><button class="btn" type="button" id="olAdd">+ 맨 아래에 추가</button></div></div>', '<div class="row-btns" style="margin-top:10px"><button class="btn" type="button" id="olAdd">+ Add at the end</button></div></div>');
    if (focusId) focusRow(focusId, caret);
  }
  function caretOffset(el) {
    const s = window.getSelection(); if (!s.rangeCount) return el.textContent.length;
    const r = s.getRangeAt(0); if (!el.contains(r.startContainer)) return el.textContent.length;
    const pre = r.cloneRange(); pre.selectNodeContents(el); pre.setEnd(r.startContainer, r.startOffset);
    return pre.toString().length;
  }
  function focusRow(id, caret) {
    const row = outlinePane.querySelector('.ol-row[data-id="' + CSS.escape(id) + '"]'); if (!row) return;
    const t = row.querySelector('.ol-title'); t.focus({ preventScroll: true });
    row.scrollIntoView({ block: 'nearest' });
    const len = t.textContent.length, pos = caret == null ? len : Math.min(caret, len);
    const textNode = t.firstChild;
    const s = window.getSelection(), r = document.createRange();
    if (textNode) { r.setStart(textNode, pos); r.collapse(true); } else { r.selectNodeContents(t); r.collapse(false); }
    s.removeAllRanges(); s.addRange(r);
  }
  function olStructure(fn, focusId, caret) {
    const ae = document.activeElement; if (ae && ae._snap) ae._snap = null;   // 구조를 바꾸는 한 칸에 입력한 글도 함께 담는다
    pushUndo(); fn(); board.needsTidy = true;
    ensureReal(); board.updatedAt = now(); refreshPeriod();
    renderNodes(); renderSummary(); renderPanel(); updateUndoBtns(); scheduleSave();
    renderOutline(focusId, caret);
  }
  function siblingsOf(G, id) {
    const pid = G.parents.get(id)[0];
    return pid ? primaryChildren(G, pid) : rootsOf(G).map((n) => n.id);
  }
  // 기간으로 거른 개요에서는 보이는 줄끼리만 들여쓰기 · 순서 바꾸기를 한다
  function visibleSiblingsOf(G, id) { const all = siblingsOf(G, id); return periodCtx && mode === 'outline' ? all.filter((k) => k === id || periodCtx.ctx.has(k)) : all; }
  function shiftSubtree(G, id, dy) { const n = G.byId.get(id); n.y += dy; for (const d of descendants(G, id)) G.byId.get(d).y += dy; }
  // 형제 순서는 y 로 정해진다. 사이에 끼울 때는 뒤 형제들을 아래로 밀어서 자리를 만든다(반올림해도 순서가 바뀌지 않게)
  function makeRoomAfter(G, id) {
    const sibs = siblingsOf(G, id), i = sibs.indexOf(id), n = G.byId.get(id);
    const nextId = sibs[i + 1];
    const step = 110;
    if (!nextId) return Math.round(n.y + step);
    const y = Math.max(Math.round(n.y) + 1, Math.round(G.byId.get(nextId).y));
    for (const s of sibs.slice(i + 1)) shiftSubtree(G, s, step);
    return y;
  }
  function olNewAfter(id) {
    const G = graph(board), n = G.byId.get(id), pid = G.parents.get(id)[0];
    const m = makeNode(n.kind, n.x, 0);
    olStructure(() => { m.y = makeRoomAfter(G, id); board.nodes.push(m); if (pid) board.edges.push({ id: newId('e'), from: pid, to: m.id }); }, m.id, 0);
  }
  function olIndent(id, caret) {
    const G = graph(board), sibs = visibleSiblingsOf(G, id), i = sibs.indexOf(id);
    if (i <= 0) return;
    const prevId = sibs[i - 1], prev = G.byId.get(prevId), pid = G.parents.get(id)[0];
    const lastKid = primaryChildren(G, prevId).slice(-1)[0];
    olStructure(() => {
      const n = G.byId.get(id);
      board.edges = board.edges.filter((e) => !(e.to === id && e.from === pid));
      if (!board.edges.some((e) => e.from === prevId && e.to === id)) board.edges.unshift({ id: newId('e'), from: prevId, to: id });
      const ny = lastKid ? Math.round(G.byId.get(lastKid).y) + 1 : Math.round(prev.y);
      shiftSubtree(G, id, ny - n.y); n.x = prev.x + NODE_W + GAP_X;
      prev.collapsed = false;
      if (n.kind === 'branch' && GROUPS.has(prev.kind) && prev.kind === 'branch') n.kind = 'task';
    }, id, caret);
  }
  function olOutdent(id, caret) {
    const G = graph(board), pid = G.parents.get(id)[0]; if (!pid) return;
    const gid = G.parents.get(pid)[0], parent = G.byId.get(pid);
    olStructure(() => {
      const n = G.byId.get(id);
      board.edges = board.edges.filter((e) => !(e.to === id && e.from === pid));
      if (gid && !board.edges.some((e) => e.from === gid && e.to === id)) board.edges.unshift({ id: newId('e'), from: gid, to: id });
      const G2 = graph(board);
      const ny = makeRoomAfter(G2, pid);
      shiftSubtree(G2, id, ny - n.y); n.x = parent.x;
    }, id, caret);
  }
  function olMove(id, dir) {
    const G = graph(board), sibs = visibleSiblingsOf(G, id), i = sibs.indexOf(id), j = i + dir;
    if (i < 0 || j < 0 || j >= sibs.length) return;
    const a = G.byId.get(id), b = G.byId.get(sibs[j]);
    olStructure(() => { const ay = Math.round(a.y), by = Math.round(b.y); shiftSubtree(G, a.id, by - a.y); shiftSubtree(G, b.id, ay - b.y); if (a.y === b.y) shiftSubtree(G, a.id, dir); }, id);
  }
  function olDelete(id) {
    const { rows } = outlineRows(); const i = rows.findIndex((r) => r.n.id === id);
    const prev = i > 0 ? rows[i - 1].n.id : (rows[1] ? rows[1].n.id : null);
    const title = (board.nodes.find((n) => n.id === id) || {}).title;
    olStructure(() => { removeNodes([id]); }, prev);
    if (sel && sel.id === id) { sel = null; renderPanel(true); }
    toast('"' + (title || L('이름 없음', 'Untitled')) + L('"을 지웠어요', '" deleted'), L('되돌리기', 'Undo'), undo);
  }
  function toggleDone(id) {
    const n = board.nodes.find((x) => x.id === id); if (!n) return;
    mutate(() => {
      if (n.status === 'done') applyStatus(n, n.prevStatus && n.prevStatus !== 'done' ? n.prevStatus : 'todo');
      else applyStatus(n, 'done');
    });
  }
  outlinePane.addEventListener('click', (e) => {
    if (e.target.closest('#olClearPeriod')) { setPeriod({ ...period, y: 0, m: 0 }); return; }
    if (e.target.closest('#olAdd')) {
      const G = graph(board), roots = rootsOf(G);
      if (!roots.length) { const m = makeNode('goal', 0, 0); olStructure(() => { board.nodes.push(m); }, m.id); return; }
      const last = roots[roots.length - 1], kids = primaryChildren(G, last.id);
      if (kids.length) { olNewAfter(kids[kids.length - 1]); } else { const m = makeNode(defaultKind(last), last.x + NODE_W + GAP_X, last.y); olStructure(() => { board.nodes.push(m); board.edges.push({ id: newId('e'), from: last.id, to: m.id }); }, m.id); }
      return;
    }
    const row = e.target.closest('.ol-row'); if (!row) return;
    const id = row.dataset.id;
    if (e.target.closest('.ol-fold')) { toggleFold(id); return; }
    if (e.target.closest('.ol-check')) { toggleDone(id); return; }
    if (e.target.closest('.ol-more')) { setSel({ type: 'node', id }); if (isMobile()) { sheetFull = true; setPanelOpen(true); } return; }
    if (!e.target.closest('.ol-title')) setSel({ type: 'node', id });
  });
  outlinePane.addEventListener('focusin', (e) => {
    const t = e.target.closest('.ol-title'); if (!t) return;
    const id = t.closest('.ol-row').dataset.id;
    t._snap = snapshot(); t._before = (board.nodes.find((n) => n.id === id) || {}).title;
    if (!(sel && sel.type === 'node' && sel.id === id) || multi.size) {
      multi.clear(); sel = { type: 'node', id };
      outlinePane.querySelectorAll('.ol-row').forEach((r) => r.classList.toggle('is-sel', r.dataset.id === id));
      if (!isMobile()) renderPanel(true);
      for (const [nid, el] of nodeEls) el.classList.toggle('is-sel', nid === id);
    }
  });
  outlinePane.addEventListener('focusout', (e) => {
    const t = e.target.closest('.ol-title'); if (!t) return;
    if (t._snap && t._snap !== snapshot()) { undoStack.push(t._snap); trimUndo(); redoStack = []; updateUndoBtns(); }
    t._snap = null;
  });
  outlinePane.addEventListener('input', (e) => {
    const t = e.target.closest('.ol-title'); if (!t) return;
    const n = board.nodes.find((x) => x.id === t.closest('.ol-row').dataset.id); if (!n) return;
    n.title = t.textContent.replace(/\s+/g, ' ').trim();
    ensureReal(); board.updatedAt = now(); renderOneNode(n.id); scheduleSave();
    const f = $('#fTitle'); if (f && sel && sel.id === n.id && document.activeElement !== f) f.value = n.title;
  });
  outlinePane.addEventListener('paste', (e) => {
    const t = e.target.closest('.ol-title'); if (!t) return;
    const text = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
    if (/\n/.test(text.trim())) {   // 여러 줄 목록은 이 줄 아래 가지로 붙인다
      e.preventDefault(); e.stopPropagation();
      pasteText(text, t.closest('.ol-row').dataset.id);
      return;
    }
    e.preventDefault(); e.stopPropagation();
    document.execCommand('insertText', false, text.replace(/\s+/g, ' '));
  });
  outlinePane.addEventListener('beforeinput', (e) => {
    const t = e.target.closest && e.target.closest('.ol-title'); if (!t) return;
    if (e.inputType === 'insertParagraph' || e.inputType === 'insertLineBreak') {   // 폰 자판의 줄바꿈 (keydown 이 오지 않는 경우)
      e.preventDefault();
      const id = t.closest('.ol-row').dataset.id;
      const G = graph(board);
      if (!t.textContent.trim() && G.parents.get(id)[0]) olOutdent(id, 0); else olNewAfter(id);
    }
  });
  outlinePane.addEventListener('keydown', (e) => {
    const t = e.target.closest('.ol-title'); if (!t || e.isComposing) return;
    const id = t.closest('.ol-row').dataset.id;
    const caret = caretOffset(t);
    const mod = e.ctrlKey || e.metaKey;
    if (mod && (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')) {
      e.preventDefault();
      if (t._snap && t._snap !== snapshot()) { undoStack.push(t._snap); trimUndo(); redoStack = []; }   // 이 줄에서 친 글도 한 칸으로
      t._snap = null;
      if (e.key.toLowerCase() === 'y' || e.shiftKey) redo(); else undo();
      const again = outlinePane.querySelector('.ol-row[data-id="' + CSS.escape(id) + '"] .ol-title'); if (again) { focusRow(id); again._snap = snapshot(); }
      return;
    }
    if (e.key === 'Enter' && mod) { e.preventDefault(); toggleDone(id); renderOutline(id, caret); return; }
    if (e.key === 'Enter') {
      e.preventDefault();
      const G = graph(board);
      if (!t.textContent.trim() && G.parents.get(id)[0]) { olOutdent(id, 0); return; }
      olNewAfter(id); return;
    }
    if (e.key === 'Tab') { e.preventDefault(); if (e.shiftKey) olOutdent(id, caret); else olIndent(id, caret); return; }
    if (e.key === 'Backspace' && !t.textContent && !mod) { e.preventDefault(); olDelete(id); return; }
    if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); olMove(id, e.key === 'ArrowUp' ? -1 : 1); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const rows = [...outlinePane.querySelectorAll('.ol-row')], i = rows.findIndex((r) => r.dataset.id === id);
      const next = rows[i + (e.key === 'ArrowUp' ? -1 : 1)];
      if (next) { e.preventDefault(); focusRow(next.dataset.id, caret); }
      return;
    }
    if (e.key === 'Escape') { t.blur(); }
    e.stopPropagation();
  });

  // ───────────────── 상태별 보드
  function renderKanban() {
    const G = graph(board);
    const cards = board.nodes.filter((n) => COUNTED.has(n.kind) && (!periodCtx || periodCtx.hit.has(n.id)));
    kanban.innerHTML = STATUSES.map(([k, l]) => {
      const list = cards.filter((n) => n.status === k).sort((a, b) => (b.star - a.star) || (a.due || '9999').localeCompare(b.due || '9999') || a.y - b.y);
      return '<section class="col" data-st="' + k + '" data-col="' + k + '"><div class="col-head"><span>' + l + '</span><b>' + list.length + '</b></div>' +
        (list.length ? list.map((n) => {
          const p = pathOf(G, n.id), di = dueInfo(n), cl = clDone(n);
          return '<article class="card' + (isSelNode(n.id) ? ' is-sel' : '') + (isDim(n) ? '" style="opacity:.35' : '') + '" data-card="' + escapeHtml(n.id) + '" tabindex="0">' +
            '<div class="card-title">' + (n.star ? '<span class="n-star">★</span> ' : '') + escapeHtml(n.title || L('제목 없음', 'Untitled')) + '</div>' +
            (p.length ? '<div class="card-path">' + escapeHtml(p.slice(-2).join(' › ')) + '</div>' : '') +
            '<div class="card-meta"><span>' + K_LABEL[n.kind] + '</span>' + (di ? '<span class="n-due' + (di.over ? ' is-over' : '') + '">' + di.text + '</span>' : '') + (cl.t ? L('<span>체크 ', '<span>Checklist ') + cl.d + '/' + cl.t + '</span>' : '') + '</div></article>';
        }).join('') : L('<div class="col-empty">여기로 끌어 놓기</div>', '<div class="col-empty">Drop here</div>')) + '</section>';
    }).join('');
  }
  let cardDrag = null;
  kanban.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('[data-card]'); if (!c || e.button === 2) return;
    const touch = e.pointerType !== 'mouse';
    cardDrag = { id: c.dataset.card, sx: e.clientX, sy: e.clientY, el: c, ghost: null, over: null, pid: e.pointerId, touch, armed: !touch, timer: 0 };
    if (touch) {   // 손가락: 길게 누르면 끌기, 그냥 밀면 화면이 움직인다
      cardDrag.timer = setTimeout(() => { if (!cardDrag) return; cardDrag.armed = true; c.classList.add('is-armed'); try { c.setPointerCapture(cardDrag.pid); } catch (err) { /* 무시 */ } if (navigator.vibrate) navigator.vibrate(10); }, 380);
    } else c.setPointerCapture(e.pointerId);
  });
  kanban.addEventListener('touchmove', (e) => { if (cardDrag && cardDrag.armed && cardDrag.touch) e.preventDefault(); }, { passive: false });
  kanban.addEventListener('contextmenu', (e) => { if (cardDrag && cardDrag.touch) e.preventDefault(); });
  kanban.addEventListener('pointermove', (e) => {
    if (!cardDrag || e.pointerId !== cardDrag.pid) return;
    if (!cardDrag.armed) { if (Math.hypot(e.clientX - cardDrag.sx, e.clientY - cardDrag.sy) > 8) { clearTimeout(cardDrag.timer); cardDrag = null; } return; }
    if (!cardDrag.ghost && Math.hypot(e.clientX - cardDrag.sx, e.clientY - cardDrag.sy) > 6) {
      const g = cardDrag.el.cloneNode(true); g.classList.add('card-ghost'); (document.getElementById('tkApp') || document.body).appendChild(g); cardDrag.ghost = g;
      cardDrag.el.style.opacity = '.35';
    }
    if (cardDrag.ghost) {
      cardDrag.ghost.style.left = (e.clientX - 115) + 'px'; cardDrag.ghost.style.top = (e.clientY - 20) + 'px';
      const col = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-col]');
      if (cardDrag.over && cardDrag.over !== col) cardDrag.over.classList.remove('is-over');
      if (col) col.classList.add('is-over'); cardDrag.over = col;
      const r = boardPane.getBoundingClientRect();
      if (e.clientX > r.right - 40) boardPane.scrollLeft += 12; else if (e.clientX < r.left + 40) boardPane.scrollLeft -= 12;
    }
  });
  function endCardDrag(e, cancel) {
    if (!cardDrag || e.pointerId !== cardDrag.pid) return;
    const d = cardDrag; cardDrag = null;
    clearTimeout(d.timer); d.el.classList.remove('is-armed');
    if (d.ghost) {
      d.ghost.remove(); d.el.style.opacity = '';
      if (d.over) d.over.classList.remove('is-over');
      if (!cancel && d.over) setStatus(d.id, d.over.dataset.col);
    } else if (!cancel) setSel({ type: 'node', id: d.id });
  }
  kanban.addEventListener('pointerup', (e) => endCardDrag(e, false));
  kanban.addEventListener('pointercancel', (e) => endCardDrag(e, true));
  kanban.addEventListener('keydown', (e) => { const c = e.target.closest('[data-card]'); if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setSel({ type: 'node', id: c.dataset.card }); } });

  // ───────────────── 일정
  function renderSchedule() {
    const G = graph(board);
    const t = new Date(); t.setHours(0, 0, 0, 0);
    const today = ymd(t);
    const endWeek = new Date(t); endWeek.setDate(t.getDate() + ((7 - t.getDay()) % 7));   // 이번 주 일요일
    const endNext = new Date(endWeek); endNext.setDate(endWeek.getDate() + 7);
    const ew = ymd(endWeek), en = ymd(endNext);
    const list = board.nodes.filter((n) => (schedShowDone || n.status !== 'done') && (n.due || COUNTED.has(n.kind)) && (!periodCtx || periodCtx.hit.has(n.id)));
    const groups = [['over', L('지남', 'Overdue'), []], ['today', L('오늘', 'Today'), []], ['week', L('이번 주', 'This week'), []], ['next', L('다음 주', 'Next week'), []], ['later', L('그 뒤', 'Later'), []], ['none', L('마감 없음', 'No due date'), []], ['past', L('지난 날짜 (끝남 · 보류)', 'Past dates (done · on hold)'), []]];
    const gi = Object.fromEntries(groups.map((g, i) => [g[0], i]));
    for (const n of list) {
      let k;
      const closed = n.status === 'done' || n.status === 'hold';
      if (!n.due) { if (!WORK.has(n.status) || !COUNTED.has(n.kind)) continue; k = 'none'; }
      else if (n.due < today) k = closed ? 'past' : 'over';
      else if (n.due === today) k = 'today';
      else if (n.due <= ew) k = 'week';
      else if (n.due <= en) k = 'next';
      else k = 'later';
      groups[gi[k]][2].push(n);
    }
    groups.forEach((g) => g[2].sort((a, b) => (a.due || '').localeCompare(b.due || '') || (b.star - a.star) || a.y - b.y));
    const fmt = (n) => { if (!n.due) return '—'; const [y, m, d] = n.due.split('-').map(Number); const w = WEEK[new Date(y, m - 1, d).getDay()]; return m + '/' + d + ' ' + w; };
    schedPane.innerHTML = '<div class="sched"><div class="sched-bar"><p>' + (periodOn() ? escapeHtml(periodLabel()) + L('에 드는 일만 보여 줘요. ', ': showing only this period. ') : '') + L('마감을 정한 일과, 아직 날짜가 없는 작업을 날짜순으로 보여 줘요.</p>', 'Items with a due date, and tasks without one, in date order.</p>') +
      '<label class="toggle"><input type="checkbox" id="schedDone"' + (schedShowDone ? ' checked' : '') + L('> 끝난 일도 보기</label></div>', '> Show finished items</label></div>') +
      groups.filter((g) => g[2].length).map(([k, label, items]) =>
        '<section class="sched-group' + (k === 'over' ? ' is-over' : '') + '"><h3>' + label + ' <b>' + items.length + '</b></h3><ul class="sched-list">' +
        items.map((n) => {
          const p = pathOf(G, n.id);
          return '<li><button type="button" data-go="' + escapeHtml(n.id) + '" class="' + (isSelNode(n.id) ? 'is-sel' : '') + '"><span class="s-date">' + fmt(n) + '</span>' +
            '<span class="s-title">' + (n.star ? '<span class="n-star">★</span> ' : '') + escapeHtml(n.title || L('제목 없음', 'Untitled')) + (p.length ? '<span class="s-path">' + escapeHtml(p.slice(-2).join(' › ')) + '</span>' : '') + '</span>' +
            '<span class="ol-st" data-st="' + escapeHtml(n.status) + '">' + S_LABEL[n.status] + '</span></button></li>';
        }).join('') + '</ul></section>').join('') +
      (groups.every((g) => !g[2].length) ? L('<p class="s-none">표시할 일이 없어요. 노드에 마감을 정하면 여기에 모여요.</p>', '<p class="s-none">Nothing to show. Set a due date on a node and it appears here.</p>') : '') + '</div>';
  }
  schedPane.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) setSel({ type: 'node', id: b.dataset.go }); });
  schedPane.addEventListener('change', (e) => { if (e.target.id === 'schedDone') { schedShowDone = e.target.checked; renderSchedule(); } });

  // ───────────────── 바꾸기 · 되돌리기
  function snapshot() { return JSON.stringify({ title: board.title, note: board.note, nodes: board.nodes, edges: board.edges, needsTidy: !!board.needsTidy }); }
  function trimUndo() { if (undoStack.length > 150) undoStack.shift(); }
  function pushUndo() { undoStack.push(snapshot()); trimUndo(); redoStack = []; }
  function mutate(fn) { pushUndo(); fn(); changed(); }
  function ensureReal() {
    if (!board.preview) return;
    delete board.preview;
    board.id = newId('b');
    board.createdAt = now();
    boards.set(board.id, board);
    lsSet(LS_LAST, board.id);
  }
  function changed() { ensureReal(); board.updatedAt = now(); renderAll(); scheduleSave(); }
  function softChanged(nodeId) {
    ensureReal(); board.updatedAt = now();
    const before = periodCtx ? [...periodCtx.hit].sort().join(',') : '';
    refreshPeriod();
    const moved = (periodCtx ? [...periodCtx.hit].sort().join(',') : '') !== before;   // 날짜를 바꿔 기간에 드는 노드가 달라졌다
    if (nodeId && !moved) renderOneNode(nodeId); else renderNodes();
    if (moved && mode === 'outline') renderOutline(); renderSummary(); refreshPanelBits(); if (mode === 'board') renderKanban(); else if (mode === 'schedule') renderSchedule(); scheduleSave(); }
  function restore(s) {
    const o = JSON.parse(s);
    board.title = o.title; board.note = o.note; board.nodes = o.nodes; board.edges = o.edges;
    if (o.needsTidy) board.needsTidy = true; else delete board.needsTidy;
    for (const id of [...multi]) if (!board.nodes.some((n) => n.id === id)) multi.delete(id);
    if (multi.size === 1) multi.clear();
    if (sel && sel.type === 'node' && !board.nodes.some((n) => n.id === sel.id)) sel = null;
    if (sel && sel.type === 'edge' && !board.edges.some((x) => x.id === sel.id)) sel = null;
    ensureReal(); board.updatedAt = now(); panelFor = null; renderAll(); scheduleSave();
  }
  function undo() { if (!undoStack.length) return; if (editing) finishEdit(true); redoStack.push(snapshot()); restore(undoStack.pop()); }
  function redo() { if (!redoStack.length) return; undoStack.push(snapshot()); restore(redoStack.pop()); }
  function updateUndoBtns() { $('#undoBtn').disabled = !undoStack.length; $('#redoBtn').disabled = !redoStack.length; }

  function refreshSelectionMarks() {
    for (const [id, el] of nodeEls) el.classList.toggle('is-sel', isSelNode(id));
    outlinePane.querySelectorAll('.ol-row').forEach((r) => r.classList.toggle('is-sel', isSelNode(r.dataset.id)));
  }
  function setSel(s) {
    multi.clear();
    sel = s;
    if (!s) { mobileSummary = false; sheetFull = false; }
    refreshSelectionMarks();
    const G = graph(board); renderWires(G, hiddenSet(G));
    renderPanel(true);
    if (mode === 'board') renderKanban(); else if (mode === 'schedule') renderSchedule();
    if (sel && sel.type === 'node' && mode === 'canvas' && isMobile()) setTimeout(() => keepAboveSheet(sel.id), 30);
  }
  function setMulti(ids) {
    multi.clear();
    ids.forEach((id) => multi.add(id));
    if (multi.size <= 1) { const one = [...multi][0]; multi.clear(); return setSel(one ? { type: 'node', id: one } : null); }
    sel = { type: 'node', id: ids[ids.length - 1] };
    refreshSelectionMarks(); renderPanel(true);
    if (mode === 'board') renderKanban(); else if (mode === 'schedule') renderSchedule();
  }
  function toggleMulti(id) {
    const cur = new Set(selectedIds());
    if (cur.has(id)) cur.delete(id); else cur.add(id);
    setMulti([...cur]);
  }
  function keepAboveSheet(id) {
    const n = board.nodes.find((x) => x.id === id); if (!n || !nodeEls.get(id) || nodeEls.get(id).hidden) return;
    const s = stageSize(), q = rectOf(n);
    const open = panel.classList.contains('is-open');
    const sheetH = open ? Math.min(panel.scrollHeight, window.innerHeight * (panel.classList.contains('is-full') ? 0.86 : 0.40)) : 0;
    const sheetTop = window.innerHeight - sheetH;
    const limit = sheetTop - s.t - 12;
    const top = q.t * view.z + view.y, bottom = q.b * view.z + view.y, h = (q.b - q.t) * view.z;
    if (bottom > limit || top < 8) view.y += Math.max(8, (limit - h) / 2) - top;
    const left = q.l * view.z + view.x, right = q.r * view.z + view.x;
    if (left < 8 || right > s.w - 8) view.x += (s.w - (q.r - q.l) * view.z) / 2 - left;
    applyView();
  }
  function setStatus(id, st) {
    const n = board.nodes.find((x) => x.id === id); if (!n || n.status === st) return;
    mutate(() => applyStatus(n, st));
  }
  function toggleStar(ids) {
    const nodes = ids.map((id) => board.nodes.find((n) => n.id === id)).filter(Boolean); if (!nodes.length) return;
    const on = !nodes.every((n) => n.star);
    mutate(() => { nodes.forEach((n) => { n.star = on; }); });
  }
  function kidsOf(id) { return graph(board).kids.get(id) || []; }
  function placeBelow(ids, fallbackX, fallbackY) {
    let y = fallbackY, x = fallbackX, found = false;
    for (const k of ids) { const n = board.nodes.find((q) => q.id === k); if (!n) continue; const r = rectOf(n); if (!found || r.b + GAP_Y > y) { y = r.b + GAP_Y; x = n.x; found = true; } }
    return { x, y };
  }
  function defaultKind(parent) {
    if (!parent) return 'goal';
    if (parent.kind === 'goal') return 'branch';
    if (parent.kind === 'branch') return 'task';
    return parent.kind === 'idea' || parent.kind === 'question' ? 'idea' : 'task';
  }
  function makeNode(kind, x, y) { const nid = newId('n'); sessionNew.add(nid); return { id: nid, created: todayStr(), x, y, kind, title: '', status: (kind === 'idea' || kind === 'question') ? 'idea' : 'todo', note: '', due: '', collapsed: false, star: false, checklist: [] }; }
  function addChild(pid, at) {
    const p = board.nodes.find((x) => x.id === pid); if (!p) return;
    const kids = kidsOf(pid);
    const pr = rectOf(p);
    const pos = at || (kids.length ? placeBelow(kids, pr.r + GAP_X, p.y) : { x: pr.r + GAP_X, y: p.y });
    const n = makeNode(defaultKind(p), Math.round(pos.x), Math.round(pos.y));
    mutate(() => { if (p.collapsed) p.collapsed = false; board.nodes.push(n); board.edges.push({ id: newId('e'), from: pid, to: n.id }); });
    afterCreate(n.id);
  }
  function afterCreate(id) {
    setSel({ type: 'node', id });
    if (mode === 'outline') { focusRow(id); return; }
    if (mode !== 'canvas') return;
    ensureVisible(id);
    startEdit(id);
  }
  function addSibling(id) {
    const G = graph(board), n = G.byId.get(id); if (!n) return;
    const pid = G.parents.get(id)[0];
    const r = rectOf(n);
    if (!pid) {
      const m = makeNode(n.kind, n.x, Math.round(r.b + GAP_Y * 2));
      mutate(() => { board.nodes.push(m); });
      afterCreate(m.id); return;
    }
    const sibs = G.kids.get(pid); const idx = sibs.indexOf(id);
    const m = makeNode(n.kind, n.x, Math.round(r.b + GAP_Y));
    mutate(() => {
      const shift = estimateH(m) + GAP_Y;
      for (const s of sibs.slice(idx + 1)) shiftSubtree(G, s, shift);
      board.nodes.push(m); board.edges.push({ id: newId('e'), from: pid, to: m.id });
    });
    afterCreate(m.id);
  }
  function addRootAt(x, y) {
    const m = makeNode(board.nodes.length ? 'idea' : 'goal', Math.round(x), Math.round(y));
    mutate(() => { board.nodes.push(m); });
    afterCreate(m.id);
  }
  function removeNodes(ids) {
    for (const id of ids) {
      const G = graph(board); if (!G.byId.has(id)) continue;
      const pid = G.parents.get(id)[0];
      const kids = G.kids.get(id);
      board.edges = board.edges.filter((e) => e.from !== id && e.to !== id);
      if (pid && G.byId.has(pid)) for (const k of kids) if (!board.edges.some((e) => e.from === pid && e.to === k)) board.edges.push({ id: newId('e'), from: pid, to: k });
      board.nodes = board.nodes.filter((x) => x.id !== id);
    }
  }
  function deleteNodes(ids) {
    ids = ids.filter((id) => board.nodes.some((n) => n.id === id)); if (!ids.length) return;
    const first = board.nodes.find((n) => n.id === ids[0]);
    mutate(() => removeNodes(ids));
    setSel(null);
    toast(ids.length > 1 ? ids.length + L('개를 지웠어요', ' deleted') : '"' + (first.title || L('제목 없음', 'Untitled')) + L('"을 지웠어요', '" deleted'), L('되돌리기', 'Undo'), undo);
  }
  function toggleFold(id) {
    const n = board.nodes.find((x) => x.id === id); if (!n) return;
    mutate(() => { n.collapsed = !n.collapsed; });
  }
  function connect(from, to) {
    if (from === to) return;
    const G = graph(board);
    if (board.edges.some((e) => e.from === from && e.to === to)) return;
    if (descendants(G, to).has(from)) { toast(L('거꾸로 이어지는 연결은 만들 수 없어요', 'That connection would loop back on itself')); return; }
    mutate(() => { board.edges.push({ id: newId('e'), from, to }); });
  }
  function reveal(id) {
    const G = graph(board);
    // 접힌 조상은 펼친다
    let cur = G.parents.get(id)[0]; const seen = new Set(); let opened = false;
    while (cur && !seen.has(cur)) { seen.add(cur); const p = G.byId.get(cur); if (p.collapsed) { p.collapsed = false; opened = true; } cur = G.parents.get(cur)[0]; }
    if (opened) { ensureReal(); board.updatedAt = now(); renderAll(); scheduleSave(); }
    setSel({ type: 'node', id });
    if (mode === 'canvas') centerOn(id);
    else if (mode === 'outline') { renderOutline(); const row = outlinePane.querySelector('.ol-row[data-id="' + CSS.escape(id) + '"]'); if (row) row.scrollIntoView({ block: 'center' }); }
  }

  // ───────────────── 복사 · 붙여넣기
  function collectSubtrees(ids) {
    const G = graph(board), set = new Set();
    for (const id of ids) { if (!G.byId.has(id)) continue; set.add(id); for (const d of descendants(G, id)) set.add(d); }
    const nodes = board.nodes.filter((n) => set.has(n.id)).map((n) => JSON.parse(JSON.stringify(n)));
    const edges = board.edges.filter((e) => set.has(e.from) && set.has(e.to)).map((e) => ({ ...e }));
    return { nodes, edges };
  }
  function copySel(cut) {
    const ids = selectedIds(); if (!ids.length) return;
    clip = collectSubtrees(ids);
    const payload = JSON.stringify({ gaji: 'nodes', v: 2, nodes: clip.nodes, edges: clip.edges });
    try { const p = navigator.clipboard && navigator.clipboard.writeText(payload); if (p && p.catch) p.catch(() => {}); } catch (e) { /* 앱 안 복사만 쓴다 */ }
    if (cut) { mutate(() => removeNodes(clip.nodes.map((n) => n.id))); setSel(null); toast(clip.nodes.length + L('개를 잘라냈어요. 붙일 곳을 고르고 Ctrl+V', ' cut. Pick where to paste and press Ctrl+V')); }
    else toast(clip.nodes.length + L('개를 복사했어요', ' copied'));
  }
  function pasteGroup(group, parentId, select) {
    if (!group || !group.nodes || !group.nodes.length) return;
    group = sanitizeGraph(group);
    if (!group.nodes.length) return;
    const map = new Map();
    const nodes = group.nodes.map((n) => { const m = JSON.parse(JSON.stringify(n)); const nid = newId('n'); map.set(n.id, nid); m.id = nid; sessionNew.add(nid); m.checklist = (m.checklist || []).map((c) => ({ ...c, id: newId('c') })); return m; });
    const edges = (group.edges || []).filter((e) => map.has(e.from) && map.has(e.to)).map((e) => ({ id: newId('e'), from: map.get(e.from), to: map.get(e.to) }));
    const hasIn = new Set(edges.map((e) => e.to));
    const tops = nodes.filter((n) => !hasIn.has(n.id));
    let l = Infinity, t = Infinity;
    for (const n of nodes) { l = Math.min(l, n.x); t = Math.min(t, n.y); }
    const parent = parentId ? board.nodes.find((n) => n.id === parentId) : null;
    let anchor;
    if (parent) { const pr = rectOf(parent); const kids = kidsOf(parent.id); anchor = kids.length ? placeBelow(kids, pr.r + GAP_X, parent.y) : { x: pr.r + GAP_X, y: parent.y }; }
    else { const s = stageSize(); anchor = mode === 'canvas' ? toWorld(s.l + s.w / 2 - 110 * view.z, s.t + s.h / 3) : { x: l + 40, y: t + 40 }; }
    for (const n of nodes) { n.x = Math.round(n.x - l + anchor.x); n.y = Math.round(n.y - t + anchor.y); }
    mutate(() => {
      if (parent && parent.collapsed) parent.collapsed = false;
      board.nodes.push(...nodes); board.edges.push(...edges);
      if (parent) for (const n of tops) board.edges.push({ id: newId('e'), from: parent.id, to: n.id });
    });
    if (mode !== 'canvas') board.needsTidy = true;
    if (select !== false) { setMulti(tops.map((n) => n.id)); if (mode === 'canvas' && tops[0]) ensureVisible(tops[0].id); }
    return tops;
  }
  // 들여쓴 글 목록 → 가지
  function parseList(text) {
    const lines = text.replace(/\r/g, '').split('\n').filter((l) => l.trim());
    if (!lines.length) return null;
    const items = lines.map((raw) => {
      const m = raw.match(/^[\t ]*/)[0];
      const indent = m.replace(/\t/g, '    ').length;
      let s = raw.trim(), status = null;
      s = s.replace(/^#{1,6}\s+/, '');
      const box = s.match(/^[-*+•]?\s*\[( |x|X)\]\s+/);
      if (box) { status = box[1].trim() ? 'done' : 'todo'; s = s.slice(box[0].length); }
      else s = s.replace(/^([-*+•·]|\d+[.)])\s+/, '');
      return { indent, title: s.slice(0, 160), status };
    });
    const levels = [...new Set(items.map((i) => i.indent))].sort((a, b) => a - b);
    const nodes = [], edges = [], stack = [];
    items.forEach((it, i) => {
      const lvl = levels.indexOf(it.indent);
      while (stack.length && stack[stack.length - 1].lvl >= lvl) stack.pop();
      const parent = stack.length ? stack[stack.length - 1].node : null;
      const hasKids = items[i + 1] && levels.indexOf(items[i + 1].indent) > lvl;
      let kind = it.status ? 'task' : /\?$/.test(it.title) ? 'question' : parent ? defaultKind(parent) : (hasKids ? 'branch' : 'task');
      const n = makeNode(kind, lvl * (NODE_W + GAP_X), i * 90);
      n.title = it.title; if (it.status) n.status = it.status; if (it.status === 'done') n.doneOn = todayStr();
      nodes.push(n); if (parent) edges.push({ id: newId('e'), from: parent.id, to: n.id });
      stack.push({ lvl, node: n });
    });
    const tmp = { nodes, edges };
    layoutBoard(tmp, false);
    return tmp;
  }
  function pasteText(text, parentId) {
    const g = parseList(text); if (!g) return;
    const p = parentId ? board.nodes.find((n) => n.id === parentId) : null;
    if (p) {   // 붙일 곳 바로 아래 줄은 그 노드에 맞는 종류로(질문 · 체크 항목은 그대로)
      g.nodes.filter((n) => !g.edges.some((e) => e.to === n.id)).forEach((n) => { if (n.kind !== 'question' && n.kind !== 'task') n.kind = defaultKind(p); else if (n.kind === 'task' && !/^(todo|done)$/.test(n.status)) n.kind = defaultKind(p); });
    }
    const tops = pasteGroup(g, parentId);
    toast(g.nodes.length + L('개 가지를 만들었어요', ' nodes added'));
    if (mode === 'outline') renderOutline(tops && tops[0] ? tops[0].id : undefined);
  }
  document.addEventListener('paste', (e) => {
    const t = e.target;
    if (t.closest && t.closest('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]')) return;
    if (!board) return;
    const text = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
    const parentId = sel && sel.type === 'node' && multi.size < 2 ? sel.id : null;
    let data = null;
    try { const o = JSON.parse(text); if (o && o.gaji === 'nodes' && Array.isArray(o.nodes)) data = o; } catch (err) { data = null; }
    if (data) { e.preventDefault(); pasteGroup(data, parentId); toast(data.nodes.length + L('개를 붙였어요', ' pasted')); return; }
    if (text.trim()) { e.preventDefault(); pasteText(text, parentId); return; }
    if (clip) { e.preventDefault(); pasteGroup(clip, parentId); toast(clip.nodes.length + L('개를 붙였어요', ' pasted')); }
  });
  function duplicate() {
    const ids = selectedIds(); if (!ids.length) return;
    const G = graph(board);
    const group = collectSubtrees(ids);
    const pid = G.parents.get(ids[0])[0];
    if (pid) pasteGroup(group, pid);
    else { for (const n of group.nodes) { n.x += 40; n.y += 40; } const s = clip; pasteGroup(group, null); clip = s; }
  }

  // ───────────────── 자동 정리
  function layoutBoard(b, useMeasured) {
    const byId = new Map(b.nodes.map((n) => [n.id, n]));
    const primary = new Map();
    for (const e of b.edges) if (byId.has(e.from) && byId.has(e.to) && !primary.has(e.to)) primary.set(e.to, e.from);
    const tkids = new Map(b.nodes.map((n) => [n.id, []]));
    for (const [c, p] of primary) tkids.get(p).push(c);
    for (const arr of tkids.values()) arr.sort((p, q) => (byId.get(p).y - byId.get(q).y) || (byId.get(p).x - byId.get(q).x));
    const roots = b.nodes.filter((n) => !primary.has(n.id)).sort((p, q) => p.y - q.y || p.x - q.x);
    const h = (id) => (useMeasured && sizes.get(id) && sizes.get(id).h) || estimateH(byId.get(id));
    const w = (id) => (useMeasured && sizes.get(id) && sizes.get(id).w) || NODE_W;
    let cursor = 0; const visited = new Set();
    const colX = [0];
    const place = (id, depth) => {
      if (visited.has(id)) return null; visited.add(id);
      const n = byId.get(id);
      n.x = colX[depth] || 0;
      colX[depth + 1] = Math.max(colX[depth + 1] || 0, n.x + w(id) + GAP_X);
      const ks = n.collapsed ? [] : tkids.get(id).filter((k) => !visited.has(k));
      const leaf = () => { n.y = cursor; cursor += h(id) + GAP_Y; return n.y + h(id) / 2; };
      if (!ks.length) return leaf();
      const centers = ks.map((k) => place(k, depth + 1)).filter((v) => v != null);
      if (!centers.length) return leaf();
      const c = (centers[0] + centers[centers.length - 1]) / 2;
      n.y = c - h(id) / 2;
      if (n.y + h(id) + GAP_Y > cursor) cursor = n.y + h(id) + GAP_Y;
      return c;
    };
    for (let pass = 0; pass < 2; pass++) {
      cursor = 0; visited.clear();
      for (const r of roots) { place(r.id, 0); cursor += GAP_Y * 2; }
      for (const n of b.nodes) if (!visited.has(n.id)) { place(n.id, 0); cursor += GAP_Y * 2; }
    }
    // 접힌 가지 아래 노드는 부모 옆에 모아 둔다(펼쳤을 때 엉뚱한 곳에 있지 않게)
    for (const n of b.nodes) {
      if (!n.collapsed) continue;
      const st = [...tkids.get(n.id)]; let i = 0;
      while (st.length) { const c = byId.get(st.shift()); c.x = n.x + NODE_W + GAP_X; c.y = n.y + (i++) * 10; st.push(...tkids.get(c.id)); }
    }
    for (const n of b.nodes) { n.x = Math.round(n.x); n.y = Math.round(n.y); }
  }
  function tidy(silent) {
    if (!board.nodes.length) return;
    const from = new Map(board.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    pushUndo();
    layoutBoard(board, true);
    delete board.needsTidy;
    const to = new Map(board.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finish = () => { changed(); fit(false); if (silent) toast(L('개요에서 바꾼 구조에 맞춰 정리했어요', 'Rearranged to match the changes made in the outline'), L('되돌리기', 'Undo'), undo); };
    if (reduce) return finish();
    const t0 = performance.now(), dur = 320;
    const G = graph(board), hidden = hiddenSet(G);
    const step = (t) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      for (const n of board.nodes) {
        const a = from.get(n.id), b = to.get(n.id);
        n.x = a.x + (b.x - a.x) * e; n.y = a.y + (b.y - a.y) * e;
        const el = nodeEls.get(n.id); if (el) el.style.transform = 'translate(' + n.x + 'px,' + n.y + 'px)';
      }
      renderWires(G, hidden);
      if (k < 1) requestAnimationFrame(step);
      else { for (const n of board.nodes) { const b = to.get(n.id); n.x = b.x; n.y = b.y; } finish(); }
    };
    requestAnimationFrame(step);
  }

  // ───────────────── 화면 이동 · 확대
  function stageSize() { const r = stage.getBoundingClientRect(); return { w: r.width, h: r.height, l: r.left, t: r.top }; }
  function zoomAt(px, py, z) {
    z = clamp(z, 0.2, 2.2);
    const wx = (px - view.x) / view.z, wy = (py - view.y) / view.z;
    view.z = z; view.x = px - wx * z; view.y = py - wy * z; applyView();
  }
  function visibleNodes() { const G = graph(board), h = hiddenSet(G); return board.nodes.filter((n) => !h.has(n.id)); }
  function fit(readable) {
    const list = visibleNodes(); const s = stageSize();
    if (!list.length) { view.x = s.w / 2; view.y = s.h / 2; view.z = 1; return applyView(); }
    let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
    for (const n of list) { const q = rectOf(n); l = Math.min(l, q.l); t = Math.min(t, q.t); r = Math.max(r, q.r); b = Math.max(b, q.b); }
    const pad = s.w < 500 ? 24 : 56, bottomPad = 72;
    const bn = $('#banner'); const topPad = pad + (bn.hidden ? 0 : bn.offsetHeight + 10);
    const z = clamp(Math.min((s.w - pad * 2) / (r - l), (s.h - topPad - bottomPad) / (b - t)), 0.25, 1.1);
    view.z = z; view.x = (s.w - (r - l) * z) / 2 - l * z; view.y = topPad + ((s.h - topPad - bottomPad) - (b - t) * z) / 2 - t * z;
    const minZ = s.w < 500 ? 0.62 : 0.72;
    if (readable && z < minZ) {   // 처음 열 때는 글자가 읽히는 크기를 지키고, 맨 위 노드를 왼쪽 가운데에 둔다
      view.z = minZ;
      const G = graph(board), root = list.filter((n) => !G.parents.get(n.id).length).sort((a, c) => a.y - c.y)[0] || list[0];
      const q = rectOf(root);
      view.x = pad - l * minZ;
      view.y = topPad + (s.h - topPad - bottomPad) / 2 - q.cy * minZ;
    }
    applyView();
  }
  function centerOn(id) {
    const n = board.nodes.find((x) => x.id === id); if (!n) return;
    const s = stageSize(), q = rectOf(n);
    view.x = s.w / 2 - q.cx * view.z; view.y = s.h / 2.4 - q.cy * view.z; applyView();
    if (isMobile()) keepAboveSheet(id);
  }
  function ensureVisible(id) {
    const n = board.nodes.find((x) => x.id === id); if (!n) return;
    const s = stageSize(), q = rectOf(n);
    const sx = q.l * view.z + view.x, sy = q.t * view.z + view.y, ex = q.r * view.z + view.x, ey = q.b * view.z + view.y;
    if (isMobile()) { keepAboveSheet(id); return; }
    if (sx < 20 || sy < 20 || ex > s.w - 20 || ey > s.h - 80) centerOn(id);
  }
  function toWorld(cx, cy) { const s = stageSize(); return { x: (cx - s.l - view.x) / view.z, y: (cy - s.t - view.y) / view.z }; }

  // ───────────────── 캔버스 손동작
  const pointers = new Map();
  let gesture = null;
  let wireRaf = 0, dragG = null, dragHidden = null;
  function scheduleWires() {
    if (wireRaf) return;
    wireRaf = requestAnimationFrame(() => { wireRaf = 0; const G = dragG || graph(board); renderWires(G, dragHidden || hiddenSet(G)); });
  }
  stage.addEventListener('pointerdown', (e) => {
    if (e.button === 2 || mode !== 'canvas') return;
    if (e.target.closest('.toolbar, .banner, .help, .store-note, .pane')) return;
    if (editing && editing.el.contains(e.target)) return;
    if (editing) finishEdit(true);
    closeMenu(); closeSearch();
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { stage.setPointerCapture(e.pointerId); } catch (err) { /* 무시 */ }
    if (pointers.size === 2) {
      const [p1, p2] = [...pointers.values()];
      if (gesture && gesture.type === 'drag' && gesture.moved) commitDrag();
      $('#marquee').hidden = true;
      gesture = { type: 'pinch', d0: Math.hypot(p1.x - p2.x, p1.y - p2.y), z0: view.z, m0: { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }, v0: { x: view.x, y: view.y } };
      return;
    }
    const t = e.target;
    const additive = e.shiftKey || e.ctrlKey || e.metaKey;
    const fold = t.closest('.n-fold');
    if (fold) { gesture = { type: 'fold', id: fold.closest('.node').dataset.id }; return; }
    const handle = t.closest('.n-handle');
    if (handle) { const id = handle.closest('.node').dataset.id; gesture = { type: 'connect', from: id, sx: e.clientX, sy: e.clientY, moved: false }; if (!isSelNode(id)) setSel({ type: 'node', id }); return; }
    const nodeEl = t.closest('.node');
    if (nodeEl) {
      const id = nodeEl.dataset.id;
      if (additive) { toggleMulti(id); gesture = null; return; }
      if (!isSelNode(id)) setSel({ type: 'node', id });
      const base = multi.size > 1 ? [...multi] : [id];
      const G = graph(board);
      const moveSet = new Set(base);
      if (!e.altKey) for (const b of base) for (const d of descendants(G, b)) moveSet.add(d);
      const origin = new Map([...moveSet].map((nid) => { const n = G.byId.get(nid); return [nid, { x: n.x, y: n.y }]; }));
      gesture = { type: 'drag', id, sx: e.clientX, sy: e.clientY, moved: false, moveSet, origin, G };
      return;
    }
    const hit = t.closest('.wire-hit');
    if (hit) { setSel({ type: 'edge', id: hit.dataset.edge }); gesture = null; return; }
    if (e.shiftKey && e.pointerType === 'mouse') {
      const s = stageSize();
      gesture = { type: 'marquee', sx: e.clientX - s.l, sy: e.clientY - s.t, base: e.ctrlKey || e.metaKey ? selectedIds() : [] };
      const m = $('#marquee'); m.hidden = false; m.style.left = gesture.sx + 'px'; m.style.top = gesture.sy + 'px'; m.style.width = '0px'; m.style.height = '0px';
      return;
    }
    gesture = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y, moved: false };
    stage.classList.add('is-panning');
  });
  stage.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!gesture) return;
    if (gesture.type === 'pinch') {
      if (pointers.size < 2) return;
      const [p1, p2] = [...pointers.values()];
      const d = Math.hypot(p1.x - p2.x, p1.y - p2.y), m = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
      const s = stageSize();
      const z = clamp(gesture.z0 * d / gesture.d0, 0.2, 2.2);
      const wx = (gesture.m0.x - s.l - gesture.v0.x) / gesture.z0, wy = (gesture.m0.y - s.t - gesture.v0.y) / gesture.z0;
      view.z = z; view.x = m.x - s.l - wx * z; view.y = m.y - s.t - wy * z; applyView();
      return;
    }
    if (gesture.type === 'marquee') {
      const s = stageSize(), x = e.clientX - s.l, y = e.clientY - s.t;
      const m = $('#marquee');
      m.style.left = Math.min(x, gesture.sx) + 'px'; m.style.top = Math.min(y, gesture.sy) + 'px';
      m.style.width = Math.abs(x - gesture.sx) + 'px'; m.style.height = Math.abs(y - gesture.sy) + 'px';
      gesture.ex = x; gesture.ey = y;
      return;
    }
    const dx = e.clientX - gesture.sx, dy = e.clientY - gesture.sy;
    const far = Math.hypot(dx, dy) > 4;
    if (gesture.type === 'pan') {
      if (far) gesture.moved = true;
      view.x = gesture.vx + dx; view.y = gesture.vy + dy; applyView();
    } else if (gesture.type === 'drag') {
      if (!gesture.moved && !far) return;
      if (!gesture.moved) {
        gesture.moved = true; pushUndo();
        for (const id of gesture.moveSet) { const el = nodeEls.get(id); if (el) el.classList.add('is-dragging'); }
        dragG = gesture.G; dragHidden = hiddenSet(dragG);
      }
      const o = gesture.origin.get(gesture.id);
      const tx = Math.round((o.x + dx / view.z) / SNAP) * SNAP, ty = Math.round((o.y + dy / view.z) / SNAP) * SNAP;
      const ddx = tx - o.x, ddy = ty - o.y;
      for (const id of gesture.moveSet) {
        const n = gesture.G.byId.get(id), oo = gesture.origin.get(id);
        n.x = oo.x + ddx; n.y = oo.y + ddy;
        const el = nodeEls.get(id); if (el) el.style.transform = 'translate(' + n.x + 'px,' + n.y + 'px)';
      }
      scheduleWires();
    } else if (gesture.type === 'connect') {
      if (far) gesture.moved = true;
      const from = board.nodes.find((x) => x.id === gesture.from); if (!from) return;
      const A = rectOf(from), p = toWorld(e.clientX, e.clientY);
      const B = { l: p.x, r: p.x, t: p.y, b: p.y, cx: p.x, cy: p.y };
      const tw = document.getElementById('tempWire'); if (tw) tw.setAttribute('d', wirePath(A, B));
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('.node');
      nodeEls.forEach((el) => el.classList.toggle('is-drop', el === over && el.dataset.id !== gesture.from));
    }
  });
  function commitDrag() {
    if (!gesture || gesture.type !== 'drag') return;
    for (const id of gesture.moveSet) { const el = nodeEls.get(id); if (el) el.classList.remove('is-dragging'); }
    dragG = null; dragHidden = null;
    if (gesture.moved) changed();
  }
  function endPointer(e, cancel) {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    stage.classList.remove('is-panning');
    const g = gesture;
    if (!g) return;
    if (g.type === 'pinch') { if (pointers.size === 0) gesture = null; return; }
    gesture = null;
    if (g.type === 'fold') { if (!cancel) toggleFold(g.id); return; }
    if (g.type === 'drag') { gesture = g; commitDrag(); gesture = null; return; }
    if (g.type === 'pan') { if (!g.moved && !cancel) setSel(null); return; }
    if (g.type === 'marquee') {
      $('#marquee').hidden = true;
      if (cancel || g.ex == null) return;
      const a = toWorld(Math.min(g.sx, g.ex) + stageSize().l, Math.min(g.sy, g.ey) + stageSize().t);
      const b = toWorld(Math.max(g.sx, g.ex) + stageSize().l, Math.max(g.sy, g.ey) + stageSize().t);
      const picked = visibleNodes().filter((n) => { const q = rectOf(n); return q.l < b.x && q.r > a.x && q.t < b.y && q.b > a.y; }).map((n) => n.id);
      setMulti([...new Set([...g.base, ...picked])]);
      return;
    }
    if (g.type === 'connect') {
      nodeEls.forEach((el) => el.classList.remove('is-drop'));
      const tw = document.getElementById('tempWire'); if (tw) tw.setAttribute('d', '');
      if (cancel) return;
      if (!g.moved) { addChild(g.from); return; }
      const over = document.elementFromPoint(e.clientX, e.clientY)?.closest('.node');
      if (over && over.dataset.id !== g.from) connect(g.from, over.dataset.id);
      else if (!over) { const p = toWorld(e.clientX, e.clientY); addChild(g.from, { x: p.x, y: p.y - 30 }); }
    }
  }
  stage.addEventListener('pointerup', (e) => endPointer(e, false));
  stage.addEventListener('pointercancel', (e) => endPointer(e, true));
  stage.addEventListener('dblclick', (e) => {
    if (mode !== 'canvas') return;
    const under = document.elementFromPoint(e.clientX, e.clientY) || e.target;   // 손동작을 위해 포인터를 잡아 두어서 e.target 은 캔버스가 된다
    if (!stage.contains(under) || under.closest('.toolbar, .banner, .help, .n-fold, .n-handle, .pane, .store-note')) return;
    const nodeEl = under.closest('.node');
    if (nodeEl) { startEdit(nodeEl.dataset.id); return; }
    if (under.closest('.wire-hit')) return;
    const p = toWorld(e.clientX, e.clientY);
    addRootAt(p.x - NODE_W / 2, p.y - 30);
  });
  stage.addEventListener('wheel', (e) => {
    if (mode !== 'canvas' || e.target.closest('.help, .pane')) return;
    e.preventDefault();
    const s = stageSize();
    if (e.ctrlKey || e.metaKey) zoomAt(e.clientX - s.l, e.clientY - s.t, view.z * Math.exp(-e.deltaY * 0.0045));
    else { view.x -= e.deltaX; view.y -= e.deltaY; applyView(); }
  }, { passive: false });

  // ───────────────── 이름 바로 고치기 (캔버스)
  function startEdit(id) {
    if (mode !== 'canvas') return;
    if (isMobile()) { const f = $('#fTitle'); if (f && !f.value) f.focus(); return; }   // 폰: 빈 새 노드만 시트의 이름 칸으로
    const el = nodeEls.get(id); if (!el || el.hidden) return;
    const n = board.nodes.find((x) => x.id === id); if (!n) return;
    if (editing) finishEdit(true);
    const t = el.querySelector('.n-title');
    editing = { id, el: t, before: n.title, snap: snapshot() };
    t.textContent = n.title; t.classList.remove('is-empty');
    t.contentEditable = 'plaintext-only';
    if (t.contentEditable !== 'plaintext-only') t.contentEditable = 'true';
    t.focus();
    const r = document.createRange(); r.selectNodeContents(t); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  function finishEdit(commit) {
    if (!editing) return;
    const { id, el, before, snap } = editing; editing = null;
    const val = el.textContent.replace(/\s+/g, ' ').trim();
    el.contentEditable = 'false';
    const n = board.nodes.find((x) => x.id === id);
    if (n && commit && val !== before) { undoStack.push(snap); trimUndo(); redoStack = []; n.title = val; changed(); }
    else renderNodes();
  }
  nodesLayer.addEventListener('keydown', (e) => {
    if (!editing || !editing.el.contains(e.target)) return;
    if (e.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); const id = editing.id; finishEdit(true); if (e.altKey) addSibling(id); }
    else if (e.key === 'Escape') { e.preventDefault(); finishEdit(false); }
    else if (e.key === 'Tab') { e.preventDefault(); const id = editing.id; finishEdit(true); addChild(id); }
    e.stopPropagation();
  });
  nodesLayer.addEventListener('focusout', (e) => { if (editing && editing.el === e.target) finishEdit(true); });
  nodesLayer.addEventListener('paste', (e) => {
    if (!editing || !editing.el.contains(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    const text = (e.clipboardData && e.clipboardData.getData('text/plain')) || '';
    if (/\n/.test(text.trim())) { const id = editing.id; finishEdit(true); pasteText(text, id); return; }
    document.execCommand('insertText', false, text.replace(/\s+/g, ' '));
  });

  // ───────────────── 키보드
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'f') { e.preventDefault(); openSearch(); return; }
    if (t.closest && (t.closest('input, textarea, [contenteditable="true"], [contenteditable="plaintext-only"]'))) return;
    if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return; }
    if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
    if (mod && e.key.toLowerCase() === 'c') { if (selectedIds().length) { e.preventDefault(); copySel(false); } return; }
    if (mod && e.key.toLowerCase() === 'x') { if (selectedIds().length) { e.preventDefault(); copySel(true); } return; }
    if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(); return; }
    if (mod && e.key.toLowerCase() === 'a' && mode === 'canvas') { e.preventDefault(); setMulti(visibleNodes().map((n) => n.id)); return; }
    if (mod || e.altKey) return;
    if ((e.key === 'Enter' || e.key === ' ' || e.key === 'Tab') && t.closest && t.closest('button, a[href], select, [role="button"], .card')) return;   // 단추 · 카드의 키는 그 단추에 맡긴다
    if (e.key === '/') { e.preventDefault(); openSearch(); return; }
    if (e.key === 'Escape') { closeMenu(); closeSearch(); $('#help').hidden = true; setSel(null); return; }
    if (mode === 'board' || mode === 'schedule' || mode === 'outline') {
      if (sel && sel.type === 'node' && /^[1-6]$/.test(e.key)) setStatus(sel.id, STATUSES[Number(e.key) - 1][0]);
      return;
    }
    if (e.key === 'f' || e.key === 'F') { fit(false); return; }
    const ids = selectedIds();
    if (!ids.length) {
      if (sel && sel.type === 'edge' && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); const id = sel.id; mutate(() => { board.edges = board.edges.filter((x) => x.id !== id); }); setSel(null); }
      return;
    }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteNodes(ids); return; }
    if (/^[1-6]$/.test(e.key)) { const st = STATUSES[Number(e.key) - 1][0]; mutate(() => { ids.forEach((id) => applyStatus(board.nodes.find((x) => x.id === id), st)); }); return; }
    if (e.key === 's' || e.key === 'S') { toggleStar(ids); return; }
    if (ids.length > 1) return;
    const id = ids[0];
    if (e.key === 'Tab') { e.preventDefault(); addChild(id); }
    else if (e.key === 'Enter') { e.preventDefault(); addSibling(id); }
    else if (e.key === 'F2') { e.preventDefault(); startEdit(id); }
    else if (e.key === ' ') { e.preventDefault(); toggleFold(id); }
    else if (e.key.startsWith('Arrow')) {
      e.preventDefault();
      const G = graph(board), h = hiddenSet(G);
      let next = null;
      if (e.key === 'ArrowLeft') next = G.parents.get(id)[0];
      else if (e.key === 'ArrowRight') next = G.byId.get(id).collapsed ? null : G.kids.get(id).find((k) => !h.has(k));
      else { const sibs = siblingsOf(G, id).filter((k) => !h.has(k)); const i = sibs.indexOf(id); next = sibs[i + (e.key === 'ArrowDown' ? 1 : -1)]; }
      if (next) { setSel({ type: 'node', id: next }); ensureVisible(next); }
    }
  });

  // ───────────────── 찾기
  const searchBox = $('#search'), searchInp = $('#searchInp'), searchRes = $('#searchRes');
  let searchActive = 0;
  function openSearch() {
    closeMenu();
    searchBox.hidden = false; $('#searchBtn').setAttribute('aria-expanded', 'true');
    searchInp.focus(); searchInp.select(); renderSearch();
  }
  function closeSearch() {
    if (searchBox.hidden) return;
    searchBox.hidden = true; $('#searchBtn').setAttribute('aria-expanded', 'false');
    if (searchQ) { searchQ = ''; renderNodes(); if (mode === 'outline') renderOutline(); }
  }
  function highlight(text, q) {
    const s = String(text || ''); const i = s.toLowerCase().indexOf(q.toLowerCase());
    if (!q || i < 0) return escapeHtml(s);
    return escapeHtml(s.slice(0, i)) + '<mark>' + escapeHtml(s.slice(i, i + q.length)) + '</mark>' + escapeHtml(s.slice(i + q.length));
  }
  function renderSearch() {
    const q = searchInp.value.trim(); searchQ = q;
    renderNodes(); if (mode === 'outline') renderOutline();
    if (!q) { searchRes.innerHTML = L('<li><p class="none">이름, 메모, 체크리스트 항목에서 찾아요.</p></li>', '<li><p class="none">Searches names, notes and checklist items.</p></li>'); return; }
    const G = graph(board);
    const hits = board.nodes.filter(matches).slice(0, 30);
    searchActive = Math.min(searchActive, Math.max(0, hits.length - 1));
    searchRes.innerHTML = hits.length ? hits.map((n, i) => {
      const p = pathOf(G, n.id);
      const where = (n.title || '').toLowerCase().includes(q.toLowerCase()) ? '' : (n.note || '').toLowerCase().includes(q.toLowerCase()) ? L(' · 메모: ', ' · note: ') + highlight(n.note.slice(Math.max(0, n.note.toLowerCase().indexOf(q.toLowerCase()) - 12)).slice(0, 50), q) : L(' · 체크리스트', ' · checklist');
      return '<li><button type="button" data-go="' + escapeHtml(n.id) + '" class="' + (i === searchActive ? 'is-active' : '') + '"><span class="r-title">' + highlight(n.title || L('제목 없음', 'Untitled'), q) + '</span><span class="r-sub">' + escapeHtml(K_LABEL[n.kind] + ' · ' + S_LABEL[n.status]) + (p.length ? ' · ' + escapeHtml(p.slice(-2).join(' › ')) : '') + where + '</span></button></li>';
    }).join('') : L('<li><p class="none">찾는 노드가 없어요.</p></li>', '<li><p class="none">No matching nodes.</p></li>');
  }
  searchInp.addEventListener('input', () => { searchActive = 0; renderSearch(); });
  searchInp.addEventListener('keydown', (e) => {
    const btns = [...searchRes.querySelectorAll('[data-go]')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!btns.length) return; searchActive = (searchActive + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length; btns.forEach((b, i) => b.classList.toggle('is-active', i === searchActive)); btns[searchActive].scrollIntoView({ block: 'nearest' }); }
    else if (e.key === 'Enter') { e.preventDefault(); const b = btns[searchActive]; if (b) { reveal(b.dataset.go); } }
    else if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
  });
  searchRes.addEventListener('click', (e) => { const b = e.target.closest('[data-go]'); if (b) { reveal(b.dataset.go); if (isMobile()) closeSearchKeep(); } });
  function closeSearchKeep() { searchBox.hidden = true; $('#searchBtn').setAttribute('aria-expanded', 'false'); }
  $('#searchBtn').onclick = (e) => { e.stopPropagation(); if (searchBox.hidden) openSearch(); else closeSearch(); };

  // ───────────────── 머리줄 · 도구
  $('#chips').addEventListener('click', (e) => {
    const b = e.target.closest('[data-st]'); if (!b) return;
    focusStatus = focusStatus === b.dataset.st ? null : b.dataset.st;
    renderNodes(); renderSummary(); renderPane();
    if (mode === 'board' && focusStatus && focusStatus !== 'star') { const col = kanban.querySelector('[data-col="' + focusStatus + '"]'); if (col) col.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }
  });
  (() => {
    const pt = $('#projTitle'); let snap = null;
    pt.addEventListener('focus', () => { snap = snapshot(); });
    pt.addEventListener('input', () => { board.title = pt.value; softChanged(); renderMenuIfOpen(); });
    pt.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.isComposing) pt.blur(); });
    pt.addEventListener('blur', () => {
      if (!pt.value.trim()) { board.title = L('이름 없는 프로젝트', 'Untitled project'); pt.value = board.title; softChanged(); }
      if (snap && snap !== snapshot()) { undoStack.push(snap); trimUndo(); redoStack = []; updateUndoBtns(); }
      snap = null;
    });
  })();
  function setMode(m) {
    if (editing) finishEdit(true);
    const prev = mode;
    mode = m;
    document.querySelectorAll('.tabs [data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    outlinePane.hidden = m !== 'outline';
    boardPane.hidden = m !== 'board';
    schedPane.hidden = m !== 'schedule';
    $('#toolbar').classList.toggle('is-lite', m !== 'canvas');
    $('#help').hidden = true;
    $('#banner').hidden = !board.preview || m !== 'canvas';
    renderPane();
    panelFor = null; renderPanel(true);
    if (m === 'canvas' && prev !== 'canvas') {
      renderNodes();
      if (needFit && !board.needsTidy) { needFit = false; requestAnimationFrame(() => { measure(); fit(true); }); }
      if (board.needsTidy) { requestAnimationFrame(() => { measure(); tidy(true); }); }
    }
  }
  document.querySelectorAll('.tabs [data-mode]').forEach((b) => { b.onclick = () => setMode(b.dataset.mode); });
  $('#summaryBtn').onclick = () => { multi.clear(); sel = null; mobileSummary = true; refreshSelectionMarks(); renderPanel(true); };
  $('#addBtn').onclick = () => {
    if (sel && sel.type === 'node' && multi.size < 2) return addChild(sel.id);
    const s = stageSize(), p = toWorld(s.l + s.w / 2, s.t + s.h / 2.6);
    addRootAt(p.x - NODE_W / 2, p.y - 30);
  };
  $('#tidyBtn').onclick = () => tidy(false);
  $('#hideDoneBtn').onclick = () => {
    hideDone = !hideDone; $('#hideDoneBtn').setAttribute('aria-pressed', String(hideDone));
    lsSet('wolko-tasks:hideDone', hideDone ? '1' : '');
    renderNodes(); toast(hideDone ? L('모두 끝난 가지를 숨겼어요', 'Finished branches hidden') : L('끝난 가지를 다시 보여 줘요', 'Showing finished branches again'));
  };
  $('#fitBtn').onclick = () => fit(false);
  $('#zoomIn').onclick = () => { const s = stageSize(); zoomAt(s.w / 2, s.h / 2, view.z * 1.2); };
  $('#zoomOut').onclick = () => { const s = stageSize(); zoomAt(s.w / 2, s.h / 2, view.z / 1.2); };
  $('#undoBtn').onclick = undo;
  $('#redoBtn').onclick = redo;
  $('#helpBtn').onclick = () => { const h = $('#help'); h.hidden = !h.hidden; $('#helpBtn').setAttribute('aria-expanded', String(!h.hidden)); };
  $('#bannerNew').onclick = () => { openMenu(true); };

  let toastTimer = null;
  function toast(msg, actionLabel, action) {
    const t = $('#toast');
    t.textContent = '';
    const s = document.createElement('span'); s.textContent = msg; t.appendChild(s);
    if (actionLabel) { const b = document.createElement('button'); b.type = 'button'; b.textContent = actionLabel; b.onclick = () => { t.hidden = true; action(); }; t.appendChild(b); }
    t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, actionLabel ? 6000 : 3000);
  }

  // ───────────────── 프로젝트 메뉴
  let confirmDel = false, menuTpl = false;
  function sortedBoards() { return [...boards.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); }
  function ago(t) {
    const s = Math.max(0, (now() - (t || 0)) / 1000);
    if (s < 60) return L('방금', 'just now'); if (s < 3600) return Math.floor(s / 60) + L('분 전', 'm ago'); if (s < 86400) return Math.floor(s / 3600) + L('시간 전', 'h ago');
    if (s < 86400 * 30) return Math.floor(s / 86400) + L('일 전', 'd ago');
    const d = new Date(t); return d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate();
  }
  function boardProgress(b) { let w = 0, d = 0; for (const n of b.nodes || []) if (COUNTED.has(n.kind) && WORK.has(n.status)) { w++; if (n.status === 'done') d++; } return { w, d }; }
  const ICON = {
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
    tree: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="6" r="2"/><circle cx="19" cy="18" r="2"/><path d="M7 12h4c2 0 2-6 6-6M11 12c2 0 2 6 6 6"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v12M7 11l5 5 5-5M4 20h16"/></svg>',
    doc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>'
  };
  function renderMenu() {
    if (menuTpl) {
      menu.innerHTML = L('<h4>어떤 틀로 시작할까요?</h4><div class="tpl-grid">', '<h4>Start from a template</h4><div class="tpl-grid">') +
        Object.entries(TEMPLATES).map(([k, t]) => '<button type="button" data-tpl="' + k + '"><b>' + t.name + '</b><span>' + t.desc + '</span></button>').join('') +
        L('<button type="button" data-tpl="example"><b>캠프 준비 예시</b><span>진행 중인 모습을 담은 예시</span></button></div>', '<button type="button" data-tpl="example"><b>Camp prep sample</b><span>A sample with work in progress</span></button></div>') +
        L('<div class="menu-actions"><button type="button" data-act="back">← 프로젝트 목록</button></div>', '<div class="menu-actions"><button type="button" data-act="back">← Projects</button></div>');
      return;
    }
    const list = sortedBoards();
    const cur = board && !board.preview ? board.id : null;
    menu.innerHTML = L('<h4>내 프로젝트</h4><div class="menu-list">', '<h4>My projects</h4><div class="menu-list">') +
      (list.length ? list.map((b) => { const p = boardProgress(b); return '<button type="button" data-open="' + escapeHtml(b.id) + '" aria-current="' + (b.id === cur) + '"><span class="m-title">' + escapeHtml(b.title || L('이름 없는 프로젝트', 'Untitled project')) + '</span><span class="m-sub">' + (p.w ? L('완료 ', 'Done ') + p.d + '/' + p.w + ' · ' : '') + ago(b.updatedAt) + '</span></button>'; }).join('')
        : L('<p class="hint" style="padding:4px 10px">아직 저장된 프로젝트가 없어요.</p>', '<p class="hint" style="padding:4px 10px">No saved projects yet.</p>')) + '</div>' +
      '<div class="menu-actions">' +
        '<button type="button" data-act="new">' + ICON.plus + L('새 프로젝트 (틀 고르기)</button>', 'New project (pick a template)</button>') +
        (cur ? '<button type="button" data-act="dup">' + ICON.copy + L('이 프로젝트 복제</button>', 'Duplicate this project</button>') : '') +
        '<button type="button" data-act="import">' + ICON.up + L('JSON 파일 가져오기</button>', 'Import a JSON file</button>') +
        (cur ? '<button type="button" data-act="export">' + ICON.down + L('백업 내려받기 (JSON)</button>', 'Download a backup (JSON)</button>') : '') +
        (cur ? '<button type="button" data-act="md">' + ICON.doc + L('개요를 마크다운으로 내려받기</button>', 'Download the outline as Markdown</button>') : '') +
        (cur ? (confirmDel
          ? '<div class="confirm"><span>' + L('', 'Delete ') + '"' + escapeHtml(board.title || '') + L('"을 지울까요? 되돌릴 수 없어요.</span><div class="row-btns"><button class="btn danger" type="button" data-act="del-yes">지우기</button><button class="btn" type="button" data-act="del-no">그만두기</button></div></div>', '"? This cannot be undone.</span><div class="row-btns"><button class="btn danger" type="button" data-act="del-yes">Delete</button><button class="btn" type="button" data-act="del-no">Cancel</button></div></div>')
          : '<button type="button" class="danger" data-act="del">' + ICON.trash + L('이 프로젝트 지우기</button>', 'Delete this project</button>')) : '') +
      '</div>';
  }
  function renderMenuIfOpen() { if (!menu.hidden) renderMenu(); }
  function openMenu(tpl) { closeSearch(); confirmDel = false; menuTpl = !!tpl; renderMenu(); menu.hidden = false; $('#menuBtn').setAttribute('aria-expanded', 'true'); }
  function closeMenu() { if (menu.hidden) return; menu.hidden = true; confirmDel = false; menuTpl = false; $('#menuBtn').setAttribute('aria-expanded', 'false'); }
  $('#menuBtn').onclick = (e) => { e.stopPropagation(); if (menu.hidden) openMenu(false); else closeMenu(); };
  document.addEventListener('pointerdown', (e) => {
    if (!menu.hidden && !menu.contains(e.target) && !e.target.closest('#menuBtn, #bannerNew')) closeMenu();
    if (!searchBox.hidden && !searchBox.contains(e.target) && !e.target.closest('#searchBtn') && !e.target.closest('#stage')) closeSearch();
  });
  menu.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open]');
    if (o) { openBoard(o.dataset.open); closeMenu(); return; }
    const tp = e.target.closest('[data-tpl]');
    if (tp) {
      closeMenu();
      let b;
      if (tp.dataset.tpl === 'example') { b = makeExample(); delete b.preview; b.id = newId('b'); b.title += L(' (예시)', ' (sample)'); }
      else b = TEMPLATES[tp.dataset.tpl].make();
      boards.set(b.id, b); openBoard(b.id); scheduleSave();
      const root = b.nodes[0];
      if (tp.dataset.tpl !== 'example' && root) { setSel({ type: 'node', id: root.id }); startEdit(root.id); }
      return;
    }
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'new') { menuTpl = true; renderMenu(); }
    else if (act === 'back') { menuTpl = false; renderMenu(); }
    else if (act === 'dup') { closeMenu(); const c = JSON.parse(JSON.stringify(serialize(board))); c.id = newId('b'); c.title = (c.title || '') + L(' (사본)', ' (copy)'); c.createdAt = c.updatedAt = now(); boards.set(c.id, c); openBoard(c.id); scheduleSave(); toast(L('사본을 만들었어요', 'Copy created')); }
    else if (act === 'import') { closeMenu(); $('#importFile').click(); }
    else if (act === 'export') { closeMenu(); saveFile(JSON.stringify({ app: 'gaji', v: 2, board: serialize(board) }, null, 2), 'json'); }
    else if (act === 'md') { closeMenu(); saveFile(toMarkdown(board), 'md'); }
    else if (act === 'del') { confirmDel = true; renderMenu(); }
    else if (act === 'del-no') { confirmDel = false; renderMenu(); }
    else if (act === 'del-yes') { closeMenu(); deleteBoard(board.id); }
  });

  function openBoard(id) {
    const b = boards.get(id); if (!b) return;
    if (editing) finishEdit(true);
    for (const n of b.nodes) { if (!Array.isArray(n.checklist)) n.checklist = []; }
    board = b; sel = null; multi.clear(); undoStack = []; redoStack = []; focusStatus = null; panelFor = null;
    nodesLayer.textContent = ''; nodeEls.clear(); sizes.clear(); canvasDirty = true;
    lsSet(LS_LAST, id);
    renderAll();
    if (mode === 'canvas') { if (b.needsTidy) requestAnimationFrame(() => { measure(); tidy(true); }); else fit(true); } else needFit = true;
  }
  function showPreview() {
    board = makeExample(); sel = null; multi.clear(); undoStack = []; redoStack = []; focusStatus = null; panelFor = null;
    nodesLayer.textContent = ''; nodeEls.clear(); sizes.clear(); canvasDirty = true;
    renderAll(); if (mode === 'canvas') fit(true); else needFit = true;
  }
  function deleteBoard(id) {
    boards.delete(id); dirty.delete(id);
    if (store.ready && store.remove) store.remove(id).catch(() => toast(L('지우지 못했어요. 잠시 뒤 다시 해 보세요.', 'Could not delete. Please try again shortly.')));
    const next = sortedBoards()[0];
    if (next) openBoard(next.id); else showPreview();
    toast(L('프로젝트를 지웠어요', 'Project deleted'));
  }
  function toMarkdown(b) {
    const G = graph(b === board ? board : b);
    const lines = ['# ' + (b.title || L('프로젝트', 'Project')), ''];
    if (b.note) lines.push(b.note, '');
    const seen = new Set();
    const walk = (id, d) => {
      if (seen.has(id)) return; seen.add(id);
      const n = G.byId.get(id);
      const box = COUNTED.has(n.kind) && WORK.has(n.status) ? (n.status === 'done' ? '[x] ' : '[ ] ') : '';
      const extra = [S_LABEL[n.status], n.due ? L('마감 ', 'due ') + n.due : '', n.star ? L('중요', 'important') : ''].filter(Boolean).join(' · ');
      lines.push('  '.repeat(d) + '- ' + box + (n.title || L('제목 없음', 'Untitled')) + (GROUPS.has(n.kind) ? '' : '  _(' + extra + ')_'));
      for (const c of n.checklist || []) lines.push('  '.repeat(d + 1) + '- ' + (c.d ? '[x] ' : '[ ] ') + c.t);
      if (n.note) lines.push('  '.repeat(d + 1) + '> ' + n.note.replace(/\n/g, ' '));
      primaryChildren(G, id).forEach((k) => walk(k, d + 1));
    };
    rootsOf(G).forEach((r) => walk(r.id, 0));
    return lines.join('\n') + '\n';
  }
  async function saveFile(data, ext) {
    const name = (board.title || 'project').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 60) + '.' + ext;
    try {
      const url = URL.createObjectURL(new Blob([data], { type: ext === 'json' ? 'application/json' : 'text/markdown;charset=utf-8' }));
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast(L('파일을 저장했어요', 'File saved')); return;
    } catch (e) { /* 아래 복사로 */ }
    try { await navigator.clipboard.writeText(data); toast(L('여기서는 내려받기를 쓸 수 없어서 내용을 복사해 두었어요', 'Downloads are not available here, so the content was copied instead')); }
    catch (e) { toast(L('내려받기와 복사를 둘 다 쓸 수 없는 화면이에요', 'Neither downloading nor copying works here')); }
  }
  const SAFE_ID = /^[A-Za-z0-9_-]{1,48}$/;
  // 밖에서 들어온 보드(붙여넣기 · 가져오기 · 저장소)를 믿을 수 있는 모양으로 바꾼다. 이상한 id 는 새로 붙이고 연결도 따라 바꾼다
  function sanitizeGraph(src) {
    const map = new Map();
    const nodes = (Array.isArray(src.nodes) ? src.nodes : []).filter((n) => n && typeof n === 'object').map((n) => {
      const c = cleanNode(n);
      const oid = String(n.id || '');
      if (!SAFE_ID.test(oid) || map.has(oid)) c.id = newId('n');
      if (!map.has(oid)) map.set(oid, c.id);   // 같은 id 가 또 나오면 연결은 첫 노드에만 붙인다
      return c;
    });
    const ids = new Set(nodes.map((n) => n.id));
    const edges = (Array.isArray(src.edges) ? src.edges : []).filter((e) => e && map.has(String(e.from)) && map.has(String(e.to))).map((e) => ({
      id: SAFE_ID.test(String(e.id || '')) ? String(e.id) : newId('e'), from: map.get(String(e.from)), to: map.get(String(e.to))
    })).filter((e) => ids.has(e.from) && ids.has(e.to) && e.from !== e.to);
    return { nodes, edges };
  }
  function cleanNode(n) {
    return {
      id: String(n.id), x: Number(n.x) || 0, y: Number(n.y) || 0, kind: K_LABEL[n.kind] ? n.kind : 'task', title: String(n.title || '').slice(0, 300),
      status: S_LABEL[n.status] ? n.status : 'todo', note: String(n.note || ''), due: /^\d{4}-\d{2}-\d{2}$/.test(n.due || '') ? n.due : '', collapsed: !!n.collapsed,
      created: /^\d{4}-\d{2}-\d{2}$/.test(n.created || '') ? n.created : undefined, doneOn: /^\d{4}-\d{2}-\d{2}$/.test(n.doneOn || '') ? n.doneOn : undefined,
      star: !!n.star, prevStatus: S_LABEL[n.prevStatus] ? n.prevStatus : undefined,
      checklist: Array.isArray(n.checklist) ? n.checklist.filter((c) => c && c.t != null).map((c) => ({ id: SAFE_ID.test(String(c.id || '')) ? String(c.id) : newId('c'), t: String(c.t).slice(0, 200), d: !!c.d })) : []
    };
  }
  function sanitizeBoard(id, src) {
    const g = sanitizeGraph(src);
    return { id, title: String(src.title || '').slice(0, 80), note: String(src.note || ''), nodes: g.nodes, edges: g.edges, createdAt: Number(src.createdAt) || now(), updatedAt: Number(src.updatedAt) || 0, v: 2, needsTidy: !!src.needsTidy, rev: Number(src.rev) || 0 };
  }
  $('#importFile').addEventListener('change', async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const raw = await f.text();
      let o = null;
      try { o = JSON.parse(raw); } catch (err) { o = null; }
      // 가져온 노드와 연결은 모두 새 id 로 바꾼다
      const importOne = (src, suffix) => {
        if (!src || !Array.isArray(src.nodes) || !Array.isArray(src.edges)) return null;
        const idMap = new Map();
        const nodes = src.nodes.filter((n) => n && typeof n === 'object' && n.id != null).map((n) => { const c = cleanNode(n); c.id = newId('n'); idMap.set(String(n.id), c.id); return c; });
        const edges = src.edges.filter((x) => x && idMap.has(String(x.from)) && idMap.has(String(x.to)) && String(x.from) !== String(x.to)).map((x) => ({ id: newId('e'), from: idMap.get(String(x.from)), to: idMap.get(String(x.to)) }));
        const b = { id: newId('b'), title: String(src.title || L('가져온 프로젝트', 'Imported project')).slice(0, 80) + suffix, note: String(src.note || ''), nodes, edges, createdAt: Number(src.createdAt) || now(), updatedAt: now(), v: 2, rev: 0 };
        boards.set(b.id, b); dirty.add(b.id);
        return b;
      };
      // 여러 프로젝트를 한 번에(가지치기에서 옮겨 올 때): { boards: [...] } — 이름은 그대로 둔다
      if (o && Array.isArray(o.boards)) {
        const made = o.boards.map((x) => importOne(x, '')).filter(Boolean);
        if (made.length) { openBoard(made[0].id); scheduleSave(); toast(L(made.length + '개 프로젝트를 가져왔어요', made.length + ' projects imported')); return; }
      }
      const one = importOne(o && o.board ? o.board : o, L(' (가져옴)', ' (imported)'));
      if (one) { openBoard(one.id); scheduleSave(); toast(L('가져왔어요', 'Imported')); return; }
      throw new Error('shape');
    } catch (err) { toast(L('이 파일은 읽을 수 없어요. 가지치기에서 내려받은 JSON인지 확인해 주세요.', 'This file could not be read. Make sure it is a JSON backup from this tool.')); }
  });

  // ───────────────── 저장
  const store = { ready: false, kind: null, put: null, remove: null, readOnly: false };
  const dirty = new Set(), writing = new Set();
  let saveTimer = null, saveError = '', retryTimer = null, saveDead = false;
  function setSaveState(s, msg) {
    const el = $('#saveState');
    el.classList.toggle('is-error', s === 'error');
    el.textContent = s === 'pending' ? L('바뀜', 'Changed') : s === 'saving' ? L('저장 중…', 'Saving…') : s === 'saved' ? L('저장됨', 'Saved') : s === 'error' ? msg : s === 'readonly' ? L('보기 전용', 'Read only') : '';
  }
  function serialize(b) {
    return {
      id: b.id, title: b.title || '', note: b.note || '', v: 2, createdAt: b.createdAt || now(), updatedAt: b.updatedAt || now(),
      nodes: b.nodes.map((n) => {
        const o = { id: n.id, x: Math.round(n.x * 100) / 100, y: Math.round(n.y * 100) / 100, kind: n.kind, title: n.title || '', status: n.status, note: n.note || '', due: n.due || '', collapsed: !!n.collapsed, star: !!n.star, checklist: (n.checklist || []).map((c) => ({ id: c.id, t: c.t || '', d: !!c.d })) };
        if (n.prevStatus) o.prevStatus = n.prevStatus;
        if (n.created) o.created = n.created;
        if (n.doneOn) o.doneOn = n.doneOn;
        return o;
      }),
      edges: b.edges.map((e) => ({ id: e.id, from: e.from, to: e.to })),
      needsTidy: !!b.needsTidy, rev: b.rev || 0
    };
  }
  function scheduleSave() {
    if (!board || board.preview) return;
    dirty.add(board.id); boards.set(board.id, board);
    if (store.readOnly || saveDead || retryTimer) return;
    if (saveError) saveError = '';   // 고치면 다시 저장해 본다(가득 참 · 너무 큼에서 줄인 뒤)
    setSaveState(store.ready ? 'pending' : 'saving');
    clearTimeout(saveTimer); saveTimer = setTimeout(flush, 700);
  }
  async function flush() {
    if (!store.ready || store.readOnly || saveDead || retryTimer) return;
    for (const id of [...dirty]) {
      if (writing.has(id)) continue;
      const b = boards.get(id); dirty.delete(id);
      if (!b) continue;
      writing.add(id); setSaveState('saving');
      const data = serialize(b); data.rev = (b.rev || 0) + 1;
      try { await store.put(data); b.rev = data.rev; saveError = ''; retryDelay = 0; }
      catch (err) { handleSaveError(err, id, data); }
      finally { writing.delete(id); }
    }
    if (retryTimer || saveDead || store.readOnly || saveError) return;   // 실패 뒤 기다리는 중이면 다시 서두르지 않는다
    if (dirty.size) { clearTimeout(saveTimer); saveTimer = setTimeout(flush, 400); }
    else setSaveState('saved');
    renderMenuIfOpen();
  }
  let retryDelay = 0;
  function retryLater(ms) {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => { retryTimer = null; saveError = ''; flush(); }, ms);
  }
  function handleSaveError(err, id, data) {
    const code = err && err.code;
    dirty.add(id);   // 저장 못 한 보드는 '고치는 중'으로 남겨 둔다(다른 기기 소식으로 지워지지 않게, 닫을 때 경고)
    if (code === 'auth') { saveError = L('로그인 필요', 'Log in needed'); setSaveState('error', saveError); showLogin(); return; }
    if (code === 'conflict' && err.board) { resolveConflict(id, err.board); return; }
    if (code === 'too_big') { saveError = L('보드가 너무 큼', 'Board too large'); setSaveState('error', saveError); toast(err.message || L('이 보드가 너무 커서 저장되지 않아요. 가지를 다른 프로젝트로 나누거나 긴 메모를 줄여 주세요.', 'This board is too large to save. Split branches into another project or shorten long notes.')); return; }
    if (code === 'invalid_argument') {
      let big = false; try { big = JSON.stringify(data).length > 240 * 1024; } catch (e) { big = false; }
      if (big) { saveError = L('보드가 너무 큼', 'Board too large'); setSaveState('error', saveError); toast(L('이 보드가 너무 커서 저장되지 않아요. 가지를 다른 프로젝트로 나누거나 긴 메모를 줄여 주세요.', 'This board is too large to save. Split branches into another project or shorten long notes.')); return; }
      store.readOnly = true; setSaveState('readonly'); toast(L('이 화면에서는 저장할 수 없어요(보기 전용). 백업 내려받기로 보관해 주세요.', 'Saving is not possible here (read only). Download a backup to keep your work.')); return;
    }
    if (code === 'quota_exceeded') { saveError = L('저장 공간 가득 참', 'Storage full'); setSaveState('error', saveError); toast(L('저장 공간이 가득 찼어요. 안 쓰는 프로젝트를 지운 뒤 다시 고치면 저장돼요.', 'Storage is full. Delete projects you no longer use, then edit again to save.')); return; }
    if (code === 'revoked' || code === 'not_granted' || code === 'capability_disabled' || code === 'capability_removed') { saveDead = true; saveError = L('저장 끊김', 'Saving stopped'); setSaveState('error', saveError); toast(L('저장할 수 없게 됐어요. 백업을 내려받은 뒤 페이지를 다시 열어 주세요.', 'Saving stopped working. Download a backup, then reopen the page.')); return; }
    if (code === 'local') { saveError = L('저장 안 됨', 'Not saved'); setSaveState('error', saveError); toast(err.message); return; }
    retryDelay = Math.min(60000, retryDelay ? retryDelay * 2 : (code === 'resource_exhausted' ? 8000 : 2500));
    saveError = L('저장 실패 · 다시 시도 중', 'Save failed · retrying'); setSaveState('error', saveError);
    retryLater(retryDelay + Math.random() * 1500);
  }
  window.addEventListener('beforeunload', (e) => { if (dirty.size || writing.size) { e.preventDefault(); e.returnValue = ''; } });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' && dirty.size) { clearTimeout(saveTimer); flush(); } });
  function setStoreNote(t) { const n = $('#storeNote'); n.textContent = t; n.hidden = !t; }
  function onStoreReady() {
    if (store.ready) return;
    store.ready = true;
    if (board && board.preview) {
      const list = sortedBoards();
      if (list.length) { const last = lsGet(LS_LAST); openBoard(boards.has(last) ? last : list[0].id); }
    }
    if (dirty.size) flush(); else if (board && !board.preview) setSaveState('saved');
    renderMenuIfOpen();
  }
  function adopt(id, data) {
    if (!data || !Array.isArray(data.nodes) || !Array.isArray(data.edges)) return;
    if (dirty.has(id) || writing.has(id)) return;   // 이 화면에서 고치는 중인 보드는 덮어쓰지 않는다
    const local = boards.get(id);
    if (local) {   // 저장 횟수(rev)로 먼저 비교하고, 같을 때만 시각으로 정한다
      const lr = local.rev || 0, rr = Number(data.rev) || 0;
      if (rr < lr) return;
      if (rr === lr && (Number(data.updatedAt) || 0) <= (local.updatedAt || 0)) return;
    }
    if (!SAFE_ID.test(id)) return;
    const copy = sanitizeBoard(id, data);
    if (board && board.id === id && !board.preview) {
      if (editing || (document.activeElement && (panel.contains(document.activeElement) || outlinePane.contains(document.activeElement)) && /INPUT|TEXTAREA/.test(document.activeElement.tagName))) return;   // 입력 중이면 다음 소식을 기다린다
      Object.assign(board, copy);
      for (const mid of [...multi]) if (!board.nodes.some((n) => n.id === mid)) multi.delete(mid);
      if (sel && sel.type === 'node' && !board.nodes.some((n) => n.id === sel.id)) sel = null;
      panelFor = null; renderAll();
    } else boards.set(id, copy);
  }
  // ───────────────── 포탈 서버 저장소
  const API = '/api/portal/tasks', TOKEN_KEY = 'wolko-hub-token';
  const authHeaders = () => { let tk = ''; try { tk = sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { tk = ''; } return { Authorization: 'Bearer ' + tk }; };
  async function api(method, body, query) {
    let res;
    try {
      res = await fetch(API + (query || ''), { method, headers: Object.assign(authHeaders(), body ? { 'Content-Type': 'application/json' } : {}), body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
    } catch (e) { throw { code: 'network', message: L('인터넷 연결을 확인해 주세요.', 'Check your internet connection.') }; }
    let data = {};
    try { data = await res.json(); } catch (e) { data = {}; }
    if (res.status === 401) throw { code: 'auth', message: data.error };
    if (res.status === 409) throw { code: 'conflict', board: data.board, message: data.error };
    if (res.status === 413) throw { code: 'too_big', message: data.error };
    if (!res.ok) throw { code: 'http', status: res.status, message: data.error };
    return data;
  }
  // 다른 기기에서 먼저 저장했다: 이 기기에서 고친 것은 사본으로 남기고, 서버 것을 연다
  function resolveConflict(id, serverBoard) {
    const mine = boards.get(id);
    const server = sanitizeBoard(id, serverBoard);
    if (mine) {
      const copy = JSON.parse(JSON.stringify(serialize(mine)));
      copy.id = newId('b'); copy.title = (copy.title || '') + L(' (이 기기 사본)', ' (this device copy)'); copy.rev = 0; copy.createdAt = copy.updatedAt = now();
      boards.set(copy.id, copy); dirty.add(copy.id);
    }
    dirty.delete(id);
    boards.set(id, server);
    if (board && board.id === id) { Object.assign(board, server); panelFor = null; renderAll(); }
    saveError = '';
    toast(L('다른 기기에서 먼저 고친 내용을 불러왔어요. 이 기기에서 고친 것은 사본 프로젝트로 남겨 두었어요.', 'Loaded changes made on another device first. Your edits here were kept as a copy project.'));
    renderMenuIfOpen(); clearTimeout(saveTimer); saveTimer = setTimeout(flush, 400);
  }
  let pulling = null;
  async function pull(first) {
    if (pulling) return pulling;
    pulling = (async () => {
      const data = await api('GET');
      const ids = new Set();
      for (const b of (data.boards || [])) { if (!b || !SAFE_ID.test(String(b.id || ''))) continue; ids.add(b.id); adopt(b.id, b); }
      for (const id of [...boards.keys()]) {   // 다른 기기에서 지운 보드
        if (ids.has(id) || dirty.has(id) || writing.has(id)) continue;
        boards.delete(id);
        if (board && board.id === id && !board.preview) { const next = sortedBoards()[0]; if (next) openBoard(next.id); else showPreview(); }
      }
      if (first) onStoreReady();
      renderMenuIfOpen();
    })();
    try { await pulling; } finally { pulling = null; }
  }
  function showLogin(msg) {
    const lp = $('#tkLogin'); if (!lp) return;
    lp.hidden = false; $('#tkLoginError').textContent = msg || '';
    setTimeout(() => { const e = $('#tkLoginEmail'); if (e && !e.value) e.focus(); }, 50);
  }
  function hideLogin() { const lp = $('#tkLogin'); if (lp) lp.hidden = true; }
  async function initStore() {
    store.kind = 'portal';
    store.put = (b) => api('PUT', { board: b });
    store.remove = (id) => api('DELETE', null, '?id=' + encodeURIComponent(id));
    try { await pull(true); hideLogin(); }
    catch (err) {
      if (err && err.code === 'auth') { showLogin(); return; }
      setStoreNote(L('서버에서 보드를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요.', 'Could not load your boards. Please reopen the page shortly.'));
    }
  }
  $('#tkLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button'); btn.disabled = true; $('#tkLoginError').textContent = '';
    try {
      const res = await fetch('/api/hub/account-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('#tkLoginEmail').value, password: $('#tkLoginPassword').value }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || L('로그인하지 못했습니다.', 'Could not log in.'));
      try { sessionStorage.setItem(TOKEN_KEY, data.hubToken); } catch (err) { /* 무시 */ }
      if (window.wolkoCheckPasswordReset) window.wolkoCheckPasswordReset();
      $('#tkLoginPassword').value = '';
      saveError = '';
      if (store.ready) { hideLogin(); await pull(false); flush(); } else { await initStore(); }
    } catch (err) { $('#tkLoginError').textContent = err.message || L('로그인하지 못했습니다.', 'Could not log in.'); }
    finally { btn.disabled = false; }
  });
  // 다른 기기에서 고친 내용: 화면으로 돌아올 때와 1분마다 확인한다
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && store.ready) pull(false).catch(() => {}); });
  setInterval(() => { if (store.ready && document.visibilityState === 'visible' && !dirty.size && !writing.size) pull(false).catch(() => {}); }, 60000);

  // ───────────────── 시작
  hideDone = lsGet('wolko-tasks:hideDone') === '1';
  try { const sp = JSON.parse(lsGet('wolko-tasks:period') || 'null'); if (sp && typeof sp === 'object') period = { y: Number(sp.y) || 0, m: clamp(Number(sp.m) || 0, 0, 12), basis: ['any', 'due', 'done', 'created'].includes(sp.basis) ? sp.basis : 'any' }; } catch (e) { /* 무시 */ }
  $('#hideDoneBtn').setAttribute('aria-pressed', String(hideDone));
  showPreview();
  requestAnimationFrame(() => { measure(); fit(true); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { renderNodes(); if (!undoStack.length && mode === 'canvas') fit(true); });
  window.addEventListener('resize', () => { applyView(); });
  // 머리글의 KO/EN: 저장할 게 없으면 바로, 있으면 저장한 뒤 다시 연다
  function switchLang(next) {
    if (next === LANG) return;
    try { localStorage.setItem('wolkoCarLang', next); } catch (e) { /* 무시 */ }
    const go = () => location.reload();
    if (dirty.size || writing.size) { clearTimeout(saveTimer); flush().finally(() => setTimeout(go, 300)); } else go();
  }
  const kb = document.getElementById('langKoBtn'), eb = document.getElementById('langEnBtn');
  if (kb) { kb.classList.toggle('is-active', LANG === 'ko'); kb.addEventListener('click', () => switchLang('ko')); }
  if (eb) { eb.classList.toggle('is-active', LANG === 'en'); eb.addEventListener('click', () => switchLang('en')); }
  // 화면에 미리 적힌 글자(data-ko / data-en)
  document.querySelectorAll('#tkApp [data-ko], #tkLogin [data-ko]').forEach((el) => { el.textContent = LANG === 'en' ? el.getAttribute('data-en') : el.getAttribute('data-ko'); });
  document.querySelectorAll('#tkApp [data-lang-only]').forEach((el) => { el.hidden = el.getAttribute('data-lang-only') !== LANG; });
  document.querySelectorAll('#tkApp [data-ko-title]').forEach((el) => { el.title = LANG === 'en' ? el.getAttribute('data-en-title') : el.getAttribute('data-ko-title'); });
  document.querySelectorAll('#tkApp [data-ko-aria]').forEach((el) => { el.setAttribute('aria-label', LANG === 'en' ? el.getAttribute('data-en-aria') : el.getAttribute('data-ko-aria')); });
  document.querySelectorAll('#tkApp [data-ko-ph]').forEach((el) => { el.placeholder = LANG === 'en' ? el.getAttribute('data-en-ph') : el.getAttribute('data-ko-ph'); });
  document.title = L('업무관리 — WOLKO', 'Tasks — WOLKO');
  initStore();
})();
