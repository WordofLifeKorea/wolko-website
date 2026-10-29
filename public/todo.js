/*
 * /todo 화면 — Google Tasks(To Do)와 양방향 연동하는 세 번째 모니터용 할 일 보드.
 * 순수 계산 함수(seoulToday, dueState, dueLabel, nestTasks)는 window.WolkoTodo로 노출해 테스트한다.
 */
(function () {
  'use strict';

  const POLL_MS = 30000;
  const KEY_STORAGE = 'wolko-todo-key';
  const DAY_MS = 86400000;

  /** 한국은 서머타임이 없어서 +9시간만 더하면 서울 날짜(YYYY-MM-DD)가 된다. */
  function seoulToday(nowMs) {
    return new Date(nowMs + 9 * 3600000).toISOString().slice(0, 10);
  }

  function dayDiff(due, today) {
    return Math.round((Date.parse(due + 'T00:00:00Z') - Date.parse(today + 'T00:00:00Z')) / DAY_MS);
  }

  /** 마감일 상태: 'overdue' | 'today' | 'upcoming' | null(마감일 없음) */
  function dueState(due, today) {
    if (!due) return null;
    const diff = dayDiff(due, today);
    return diff < 0 ? 'overdue' : diff === 0 ? 'today' : 'upcoming';
  }

  function dueLabel(due, today) {
    const diff = dayDiff(due, today);
    const md = Number(due.slice(5, 7)) + '/' + Number(due.slice(8, 10));
    if (diff < 0) return md + ' · ' + (-diff) + '일 지남';
    if (diff === 0) return '오늘';
    if (diff === 1) return '내일';
    return md;
  }

  /**
   * 평평한 목록을 하위 작업 순서로 펼친다: [{ task, depth }].
   * 부모가 목록에 없는 하위 작업(부모만 완료돼 숨겨진 경우)은 맨 위 단계로 보여준다.
   */
  function nestTasks(tasks) {
    const known = {};
    tasks.forEach(function (task) { known[task.id] = true; });
    const children = {};
    const roots = [];
    tasks.forEach(function (task) {
      if (task.parent && known[task.parent]) (children[task.parent] = children[task.parent] || []).push(task);
      else roots.push(task);
    });
    const out = [];
    (function walk(list, depth) {
      list.forEach(function (task) {
        out.push({ task: task, depth: depth });
        walk(children[task.id] || [], depth + 1);
      });
    })(roots, 0);
    return out;
  }

  window.WolkoTodo = { seoulToday: seoulToday, dueState: dueState, dueLabel: dueLabel, nestTasks: nestTasks };

  if (typeof document === 'undefined' || !document.getElementById('board')) return;

  // ── 화면 ──────────────────────────────────────────────
  const board = document.getElementById('board');
  const notice = document.getElementById('notice');
  const statusEl = document.getElementById('status');
  const gate = document.getElementById('gate');
  const gateForm = document.getElementById('gateForm');
  const gateInput = document.getElementById('gateKey');
  const gateMsg = document.getElementById('gateMsg');
  const sections = new Map(); // listId → { el, title, count, ul, empty }

  let polling = false;
  let refreshQueued = false;
  let inflight = 0;   // 진행 중인 추가/완료 요청 수
  let mutations = 0;  // 추가/완료 요청을 시작한 횟수 — 조회 도중 바뀌면 그 조회 결과는 버린다
  let subDraft = null;       // 열어 둔 하위 항목 입력칸 { listId, taskId, value } — 30초마다 목록을 다시 그려도 유지한다
  const lastChildOf = {};    // 할 일 id → 그 아래 마지막 하위 항목 id (입력한 순서대로 쌓기 위해 previous 로 보낸다)

  function getKey() {
    try { return localStorage.getItem(KEY_STORAGE) || ''; } catch (e) { return ''; }
  }
  function setKey(value) {
    try {
      if (value) localStorage.setItem(KEY_STORAGE, value);
      else localStorage.removeItem(KEY_STORAGE);
    } catch (e) { /* 저장이 막힌 브라우저에서는 새로고침하면 다시 입력 */ }
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  async function api(method, body) {
    const headers = { Authorization: 'Bearer ' + getKey() };
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch('/api/todo', {
      method: method,
      headers: headers,
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* 본문이 JSON이 아니면 상태 코드만 쓴다 */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || 'http_' + res.status);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // ── 시계 ──
  const timeFmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hour12: false });
  const secondFmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  const dateFmt = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'long', day: 'numeric', weekday: 'long' });
  function tick() {
    const now = new Date();
    document.getElementById('clock').textContent = timeFmt.format(now);
    document.getElementById('date').textContent = dateFmt.format(now);
  }

  // ── 상태 표시 ──
  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle('is-error', !!isError);
  }
  function showNotice(text) {
    notice.textContent = text || '';
    notice.hidden = !text;
  }
  function showGate(message) {
    gateMsg.textContent = message || '이 기기에 한 번만 입력하면 저장됩니다.';
    gate.hidden = false;
    gateInput.value = '';
    gateInput.focus();
  }

  function handleError(err) {
    if (err.status === 401) {
      setKey('');
      showGate('키가 맞지 않습니다. 다시 입력해 주세요.');
      setStatus('인증 필요', true);
      return;
    }
    const data = err.data || {};
    if (data.error === 'not_configured') {
      showNotice('서버 설정이 아직 끝나지 않았습니다' + (data.missing ? ' (' + data.missing.join(', ') + ' 필요).' : '.'));
      setStatus('설정 필요', true);
    } else if (data.error === 'google_error') {
      showNotice(data.code === 'unauthorized_client'
        ? 'Google 도메인 전체 위임이 아직 등록되지 않았습니다. 관리 콘솔에서 서비스 계정 Client ID와 tasks scope를 확인해 주세요.'
        : 'Google Tasks에서 데이터를 가져오지 못했습니다. 잠시 후 다시 시도합니다.');
      setStatus('Google 연결 오류', true);
    } else {
      // 네트워크 끊김 등: 마지막으로 가져온 목록은 그대로 두고 다음 주기에 다시 시도한다.
      setStatus('연결 오류 — 다시 시도합니다', true);
    }
  }

  // ── 목록 그리기 ──
  function buildItem(listId, task, depth, today) {
    const li = el('li', 'todo-item');
    li.style.setProperty('--depth', String(depth));

    const check = el('button', 'todo-check', '✓');
    check.type = 'button';
    check.setAttribute('aria-label', '완료 체크: ' + task.title);
    check.addEventListener('click', function () { toggle(li, check, listId, task.id); });

    const text = el('div', 'todo-text');
    text.appendChild(el('span', 'todo-title', task.title));
    if (task.notes) text.appendChild(el('span', 'todo-notes', task.notes.split('\n')[0]));
    const state = dueState(task.due, today);
    if (state) text.appendChild(el('span', 'todo-due is-' + state, dueLabel(task.due, today)));

    li.appendChild(check);
    li.appendChild(text);
    if (depth === 0) {   // Google Tasks 는 하위 항목을 한 단계만 지원한다
      const add = el('button', 'todo-sub-btn', '＋');
      add.type = 'button';
      add.title = '하위 항목 추가';
      add.setAttribute('aria-label', '하위 항목 추가: ' + task.title);
      add.addEventListener('click', function () { toggleSubForm(li, listId, task); });
      li.appendChild(add);
      if (subDraft && subDraft.taskId === task.id && subDraft.listId === listId) li.appendChild(buildSubForm(listId, task));
    }
    return li;
  }

  /** 할 일 줄 아래에 열리는 하위 항목 입력칸. Enter 로 계속 이어서 추가하고 Esc 로 닫는다. */
  function buildSubForm(listId, task) {
    const form = el('form', 'todo-subform');
    const input = el('input', 'todo-sub-input');
    input.type = 'text';
    input.maxLength = 1024;
    input.placeholder = '하위 항목 추가';
    input.setAttribute('aria-label', '하위 항목 추가: ' + task.title);
    input.value = subDraft ? subDraft.value : '';
    input.addEventListener('input', function () { if (subDraft) subDraft.value = input.value; });
    input.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closeSubForm(); });
    const submit = el('button', 'todo-btn todo-btn-primary', '추가');
    submit.type = 'submit';
    form.appendChild(input);
    form.appendChild(submit);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      addSubtask(listId, task.id, input, submit);
    });
    return form;
  }

  function closeSubForm() {
    subDraft = null;
    document.querySelectorAll('.todo-subform').forEach(function (form) { form.remove(); });
  }

  function toggleSubForm(li, listId, task) {
    const same = subDraft && subDraft.taskId === task.id && subDraft.listId === listId;
    closeSubForm();
    if (same) return;
    subDraft = { listId: listId, taskId: task.id, value: '' };
    const form = buildSubForm(listId, task);
    li.appendChild(form);
    form.querySelector('input').focus();
  }

  function buildSection(list) {
    const section = el('section', 'todo-list');
    const head = el('header', 'todo-list-head');
    const title = el('h2');
    const count = el('span', 'todo-count');
    head.appendChild(title);
    head.appendChild(count);

    const ul = el('ul', 'todo-items');
    const empty = el('p', 'todo-empty', '남은 할 일이 없습니다');

    const form = el('form', 'todo-add');
    const input = el('input');
    input.type = 'text';
    input.maxLength = 1024;
    input.placeholder = '새 할 일 추가';
    input.setAttribute('aria-label', '새 할 일 추가');
    const submit = el('button', 'todo-btn todo-btn-primary', '추가');
    submit.type = 'submit';
    form.appendChild(input);
    form.appendChild(submit);
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      addTask(list.id, input, submit);
    });

    section.appendChild(head);
    section.appendChild(ul);
    section.appendChild(empty);
    section.appendChild(form);
    return { el: section, title: title, count: count, ul: ul, empty: empty };
  }

  /** 입력 중인 내용이 사라지지 않도록 목록 칸은 재사용하고, 할 일 줄만 다시 그린다. */
  function render(data) {
    const today = seoulToday(Date.now());
    const seen = new Set();
    const active = document.activeElement;
    const refocus = active && active.classList && active.classList.contains('todo-sub-input');   // 하위 항목을 입력하던 중이면 다시 그린 뒤에도 이어서 쓰게 한다
    const caret = refocus ? active.selectionStart : 0;
    Object.keys(lastChildOf).forEach(function (id) { delete lastChildOf[id]; });
    data.lists.forEach(function (list, index) {
      seen.add(list.id);
      let entry = sections.get(list.id);
      if (!entry) {
        entry = buildSection(list);
        sections.set(list.id, entry);
      }
      entry.title.textContent = list.title;
      entry.count.textContent = String(list.tasks.length);
      entry.empty.hidden = list.tasks.length > 0;
      entry.ul.textContent = '';
      nestTasks(list.tasks).forEach(function (item) {
        if (item.task.parent && item.depth > 0) lastChildOf[item.task.parent] = item.task.id;
        entry.ul.appendChild(buildItem(list.id, item.task, item.depth, today));
      });
      if (board.children[index] !== entry.el) board.insertBefore(entry.el, board.children[index] || null);
    });
    sections.forEach(function (entry, id) {
      if (!seen.has(id)) {
        entry.el.remove();
        sections.delete(id);
      }
    });
    if (refocus) {
      const input = document.querySelector('.todo-sub-input');
      if (input) { input.focus(); input.setSelectionRange(caret, caret); }
    }
  }

  // ── 가져오기 / 쓰기 ──
  async function refresh() {
    if (!getKey()) return;
    if (polling) { refreshQueued = true; return; }
    polling = true;
    const seq = mutations;
    try {
      const data = await api('GET');
      if (inflight === 0 && seq === mutations) {
        render(data);
        showNotice('');
        setStatus('갱신 ' + secondFmt.format(new Date()), false);
      }
    } catch (err) {
      handleError(err);
    } finally {
      polling = false;
      if (refreshQueued) { refreshQueued = false; refresh(); }
    }
  }

  function setDone(li, check, done) {
    li.classList.toggle('is-done', done);
    check.setAttribute('aria-pressed', done ? 'true' : 'false');
  }

  /**
   * 체크하면 바로 줄이 그어지고, 다음 갱신 때 목록에서 빠진다.
   * 그 사이에 다시 누르면 완료가 취소된다.
   */
  async function toggle(li, check, listId, taskId) {
    const completing = !li.classList.contains('is-done');
    setDone(li, check, completing);
    check.disabled = true;
    mutations++;
    inflight++;
    try {
      await api('POST', { action: 'complete', listId: listId, taskId: taskId, completed: completing });
    } catch (err) {
      setDone(li, check, !completing);
      handleError(err);
    } finally {
      inflight--;
      check.disabled = false;
    }
  }

  async function addTask(listId, input, submit) {
    const title = input.value.trim();
    if (!title) return;
    input.disabled = submit.disabled = true;
    mutations++;
    inflight++;
    let added = false;
    try {
      await api('POST', { action: 'add', listId: listId, title: title });
      added = true;
      input.value = '';
    } catch (err) {
      handleError(err);
    } finally {
      inflight--;
      input.disabled = submit.disabled = false;
    }
    if (added) {
      await refresh();
      input.focus();
    }
  }

  async function addSubtask(listId, parentId, input, submit) {
    const title = input.value.trim();
    if (!title) return;
    input.disabled = submit.disabled = true;
    mutations++;
    inflight++;
    let added = false;
    try {
      const body = { action: 'add', listId: listId, title: title, parent: parentId };
      if (lastChildOf[parentId]) body.previous = lastChildOf[parentId];
      const data = await api('POST', body);
      if (data && data.task && data.task.id) lastChildOf[parentId] = data.task.id;   // 다음 항목이 바로 뒤에 붙게
      added = true;
      input.value = '';
      if (subDraft) subDraft.value = '';
    } catch (err) {
      handleError(err);
    } finally {
      inflight--;
      input.disabled = submit.disabled = false;
    }
    if (added) {
      await refresh();
      const next = document.querySelector('.todo-sub-input');
      if (next) next.focus();
    }
  }

  // ── 시작 ──
  gateForm.addEventListener('submit', function (ev) {
    ev.preventDefault();
    const value = gateInput.value.trim();
    if (!value) return;
    setKey(value);
    gate.hidden = true;
    setStatus('불러오는 중…', false);
    refresh();
  });
  document.getElementById('keyBtn').addEventListener('click', function () { showGate(); });
  document.getElementById('refreshBtn').addEventListener('click', refresh);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) refresh(); });

  tick();
  setInterval(tick, 1000);
  setInterval(function () { if (!document.hidden) refresh(); }, POLL_MS);

  if (getKey()) {
    setStatus('불러오는 중…', false);
    refresh();
  } else {
    showGate();
  }
})();
