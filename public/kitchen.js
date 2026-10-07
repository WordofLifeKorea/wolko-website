(function () {
  const $ = id => document.getElementById(id);
  const tokenKey = 'wolko-hub-token';
  const SLOTS = ['am_prep', 'am_clean', 'lunch_prep', 'lunch_clean', 'dinner_prep', 'dinner_clean'];
  const MORNING = ['am_prep', 'am_clean'];
  const MEALS = ['am', 'lunch', 'dinner'];
  const I18N = {
    ko: {
      pageTitle: '주방 보조', docTitle: '주방 보조 — WOLKO',
      intro: '주방 준비와 클린업을 신청하세요. 식사 1시간 전에 카카오톡(안 되면 문자)으로 알려드려요.',
      loading: '불러오는 중…', loginTitle: '포탈 로그인', loginHelp: '평택센터 멤버의 포탈 계정으로 로그인해 주세요.', email: '이메일', password: '비밀번호', loginBtn: '로그인하고 계속하기', loginFail: '로그인하지 못했습니다.',
      deniedTitle: '평택센터 멤버 전용이에요', deniedHelp: '이 스케줄은 평택센터 멤버만 사용할 수 있어요. 소속이 맞는데 이 안내가 보이면 관리자에게 문의해 주세요.',
      thisPeriod: '오늘로', manage: '칸 관리', manageDone: '관리 끝내기', timesBtn: '시간·인원',
      manageHint: '칸을 눌러 닫거나 열고, 정원을 바꾸고, 사람을 직접 배정해요. 아침 칸과 금요일 저녁~화요일 아침은 기본으로 닫혀 있어서, 필요한 날만 열어 주세요.',
      note: n => `빈 자리의 “+ 신청”을 누르면 바로 신청돼요 · 내 이름을 다시 누르면 취소돼요 · 한 칸에 기본 ${n}명 · 화요일 점심 ~ 금요일 점심만 기본으로 열려 있고, 아침과 그 밖의 시간은 관리자가 열면 신청할 수 있어요.`,
      noteMeals: m => `알림은 식사 1시간 전에 가요 (아침 ${m.am || '—'} · 점심 ${m.lunch || '—'} · 저녁 ${m.dinner || '—'})`,
      week: n => n + '주차', signUp: '+ 신청', closedLabel: '닫힘', today: '오늘', full: '마감',
      am_prep: '아침 준비', am_clean: '아침 클린업', lunch_prep: '점심 준비', lunch_clean: '점심 클린업', dinner_prep: '저녁 준비', dinner_clean: '저녁 클린업',
      mealAm: '아침', mealLunch: '점심', mealDinner: '저녁', prepShort: '준비', cleanShort: '클린업',
      openAm: '아침 열기', closeAm: '아침 닫기', openDay: '하루 열기', closeDay: '하루 닫기',
      assignPick: '담당자 직접 배정', assignDo: '배정하기', assignNone: '— 담당자 선택 —', assignNoOne: '아직 신청한 분이 없어요', assignRemove: '해제',
      stateClosed: '닫혀 있어요 (배정하면 열려요)', stateOpen: (n, c) => `신청 ${n}/${c}명`, assignFull: '정원이 찼어요. 정원을 늘리거나 다른 분을 해제해 주세요.', assignOpen: '칸 열기', assignClose: '칸 닫기',
      capLabel: '이 칸 정원', capDefault: n => `기본 (${n}명)`, capN: n => `${n}명`,
      assignNoPhone: '배정했어요. 이 분은 포탈 계정에 휴대폰 번호가 없어서 알림은 가지 않아요.',
      closeConfirm: n => `신청한 ${n}명의 신청이 모두 취소돼요. 이 칸을 닫을까요?`, closeDayConfirm: n => `신청 ${n}건이 취소돼요. 닫을까요?`, removeConfirm: n => `${n} 님의 신청을 해제할까요?`,
      phoneTitle: '알림 받을 번호', phoneHelp: '식사 1시간 전에 이 번호로 카카오톡(안 되면 문자)을 보내드려요.', phoneLabel: '휴대폰 번호', phoneBad: '올바른 휴대폰 번호를 입력해 주세요.', cancel: '취소', close: '닫기', signUpDo: '신청하기', save: '저장',
      timesTitle: '식사 시간 · 기본 인원', timesHelp: '알림은 식사 시간 1시간 전에 신청한 분께 카카오 알림톡(실패하면 문자)으로 가요. 30분 단위로 고를 수 있어요.',
      mealTime: m => `${m} 식사 시간`, remindAt: t => `알림 ${t}`, timesOff: '알림 없음', capDefaultLabel: '한 칸의 기본 인원', timesReset: '기본값으로 되돌리기', timesDefaultNote: '기본: 아침 8:00 · 점심 12:00 · 저녁 6:00 · 한 칸 2명 (칸마다 따로 1~4명으로 바꿀 수 있어요)',
      cancelConfirm: '이 신청을 취소할까요?', failLoad: '스케줄을 불러오지 못했습니다.', failAct: '처리하지 못했습니다.',
      days: ['일', '월', '화', '수', '목', '금', '토'], whenText: (d, slot) => d + ' · ' + slot,
    },
    en: {
      pageTitle: 'Kitchen Duty', docTitle: 'Kitchen Duty — WOLKO',
      intro: 'Sign up for kitchen prep and clean-up. You get a KakaoTalk message (or text) 1 hour before the meal.',
      loading: 'Loading…', loginTitle: 'Portal Login', loginHelp: 'Log in with your Pyeongtaek Center portal account.', email: 'Email', password: 'Password', loginBtn: 'Log in and continue', loginFail: 'Could not log in.',
      deniedTitle: 'Pyeongtaek Center members only', deniedHelp: 'This schedule is for Pyeongtaek Center members. If you belong here and still see this, please contact an admin.',
      thisPeriod: 'Today', manage: 'Manage slots', manageDone: 'Done', timesBtn: 'Times & size',
      manageHint: 'Tap a slot to close/open it, change its size, or assign people. Breakfast and Fri dinner – Tue breakfast are closed by default; open only the days you need.',
      note: n => `Tap “+ Sign up” on an open spot · tap your own name to cancel · ${n} per slot by default · Tue lunch – Fri lunch is open by default; breakfast and other times open when a manager opens them.`,
      noteMeals: m => `Reminders go out 1 hour before the meal (breakfast ${m.am || '—'} · lunch ${m.lunch || '—'} · dinner ${m.dinner || '—'})`,
      week: n => 'Week ' + n, signUp: '+ Sign up', closedLabel: 'Closed', today: 'Today', full: 'Full',
      am_prep: 'Breakfast prep', am_clean: 'Breakfast clean-up', lunch_prep: 'Lunch prep', lunch_clean: 'Lunch clean-up', dinner_prep: 'Dinner prep', dinner_clean: 'Dinner clean-up',
      mealAm: 'Breakfast', mealLunch: 'Lunch', mealDinner: 'Dinner', prepShort: 'Prep', cleanShort: 'Clean-up',
      openAm: 'Open breakfast', closeAm: 'Close breakfast', openDay: 'Open day', closeDay: 'Close day',
      assignPick: 'Assign a person directly', assignDo: 'Assign', assignNone: '— Choose a person —', assignNoOne: 'No one has signed up yet', assignRemove: 'Remove',
      stateClosed: 'Closed (assigning opens it)', stateOpen: (n, c) => `Signed up ${n}/${c}`, assignFull: 'This slot is full. Raise its size or remove someone.', assignOpen: 'Open slot', assignClose: 'Close slot',
      capLabel: 'Slot size', capDefault: n => `Default (${n})`, capN: n => `${n}`,
      assignNoPhone: 'Assigned. This person has no mobile number on their portal account, so no reminder will be sent.',
      closeConfirm: n => `All ${n} sign-up(s) will be cancelled. Close this slot?`, closeDayConfirm: n => `${n} sign-up(s) will be cancelled. Close?`, removeConfirm: n => `Remove ${n}?`,
      phoneTitle: 'Number for reminders', phoneHelp: 'We will send a KakaoTalk message (or text) to this number 1 hour before the meal.', phoneLabel: 'Mobile number', phoneBad: 'Please enter a valid mobile number.', cancel: 'Cancel', close: 'Close', signUpDo: 'Sign up', save: 'Save',
      timesTitle: 'Meal times & slot size', timesHelp: 'People signed up get a KakaoTalk message (text if that fails) 1 hour before the meal. Pick times in 30-minute steps.',
      mealTime: m => `${m} time`, remindAt: t => `Reminder ${t}`, timesOff: 'No reminder', capDefaultLabel: 'Default slot size', timesReset: 'Reset to defaults', timesDefaultNote: 'Default: breakfast 8:00 AM · lunch 12:00 PM · dinner 6:00 PM · 2 per slot (each slot can be set to 1–4 separately)',
      cancelConfirm: 'Cancel this sign-up?', failLoad: 'Could not load the schedule.', failAct: 'Could not complete that.',
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], whenText: (d, slot) => d + ' · ' + slot,
    },
  };
  let lang = (() => { try { return localStorage.getItem('wolkoCarLang') === 'en' ? 'en' : 'ko'; } catch { return 'ko'; } })();
  const t = (k, a, b) => { const v = I18N[lang][k] ?? I18N.ko[k] ?? k; return typeof v === 'function' ? v(a, b) : v; };
  const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem(tokenKey) || ''}` });
  const md = iso => { const [, m, d] = iso.split('-'); return `${+m}/${+d}`; };
  const wk = iso => t('days')[new Date(iso + 'T00:00:00Z').getUTCDay()];
  const API = '/api/kitchen/duty';
  const mealName = m => t('meal' + m[0].toUpperCase() + m.slice(1));
  const mealOf = slot => slot.split('_')[0];
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

  let state = null; // { me, today, period, slots, closed, caps, defaultCapacity, maxCapacity, meals }
  // 링크에 날짜가 붙어 있으면(예: /kitchen/#2026-10-07) 그 날이 속한 2주 구간을 열고 그 날 카드로 이동한다
  const hashDate = () => { const m = /^#(\d{4}-\d{2}-\d{2})$/.exec(location.hash); return m ? m[1] : null; };
  let wantedStart = hashDate();
  function focusHashDay() {
    const d = hashDate();
    const card = d && document.getElementById('day-' + d);
    if (!card) return;
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    card.classList.add('is-linked');
    setTimeout(() => card.classList.remove('is-linked'), 2600);
  }

  function applyLang() {
    document.documentElement.lang = lang;
    document.title = t('docTitle');
    document.querySelectorAll('[data-t]').forEach(e => { e.textContent = t(e.dataset.t); });
    $('langKoBtn').classList.toggle('is-active', lang === 'ko');
    $('langEnBtn').classList.toggle('is-active', lang === 'en');
    $('phoneOk').textContent = t('signUpDo');
    if (!$('timesModal').hidden && defaultSettings) showTimes(currentSettings());
    if (state) { render(); if (!$('assignModal').hidden) fillAssign(); }
  }
  function setLang(next) { if (next === lang) return; lang = next; try { localStorage.setItem('wolkoCarLang', lang); } catch {} applyLang(); }

  function show(which) {
    $('loadStatus').hidden = which !== 'loading';
    $('loginPanel').hidden = which !== 'login';
    $('deniedPanel').hidden = which !== 'denied';
    $('driveApp').hidden = which !== 'app';
  }

  let focusedOnce = false;
  async function load(start) {
    wantedStart = start || wantedStart;
    const response = await fetch(API + (wantedStart ? `?start=${encodeURIComponent(wantedStart)}` : ''), { headers: headers() });
    if (response.status === 401) { show('login'); return; }
    if (response.status === 403) { show('denied'); return; }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.period) throw new Error(data.error || t('failLoad'));
    state = data;
    wantedStart = data.period.start;
    show('app');
    render();
    if (!$('assignModal').hidden) fillAssign(); // 칸 관리 창이 열려 있으면 바뀐 내용으로 다시 채운다
    if (!focusedOnce) { focusedOnce = true; focusHashDay(); }
  }

  let manage = false;
  const isClosed = (date, slot) => !!(state.closed && state.closed[`${date}:${slot}`]);
  const peopleOf = (date, slot) => state.slots[`${date}:${slot}`] || [];
  const capOf = (date, slot) => (state.caps && state.caps[`${date}:${slot}`]) || state.defaultCapacity;

  // 한 칸: 이름표(신청한 사람들) + 남은 자리가 있으면 "+ 신청". 관리 모드에서는 칸 전체가 버튼이다.
  function slotCell(date, slot) {
    const people = peopleOf(date, slot);
    const cap = capOf(date, slot);
    const past = date < state.today;
    const closed = isClosed(date, slot);
    const managing = manage && state.me.isManager;
    const meIn = people.some(p => p.mine);
    const full = people.length >= cap;
    const cell = el(managing ? 'button' : 'div', `kslot meal-${mealOf(slot)}` + (closed ? ' closed' : '') + (full && !closed ? ' is-full' : '') + (managing && !past ? ' managing' : ''));
    if (managing) { cell.type = 'button'; cell.disabled = past; cell.addEventListener('click', () => openAssign(date, slot)); }
    const head = el('span', 'khead');
    head.append(el('span', 'lbl', t(slot.endsWith('_prep') ? 'prepShort' : 'cleanShort')));
    if (!closed) head.append(el('span', 'cnt' + (full ? ' full' : ''), full ? `${people.length}/${cap} ${t('full')}` : `${people.length}/${cap}`));
    cell.append(head);
    const box = el('span', 'kpeople');
    if (closed) {
      box.append(el('span', 'kclosed', t('closedLabel')));
    } else {
      people.forEach(p => {
        if (p.mine && !managing) {
          const b = el('button', 'kp mine', p.name);
          b.type = 'button'; b.disabled = past; b.title = t('cancelConfirm');
          b.append(el('i', 'x', '✕'));
          b.addEventListener('click', () => cancelMine(date, slot));
          box.append(b);
        } else box.append(el('span', 'kp' + (p.mine ? ' mine' : ''), p.name));
      });
      if (!full && !meIn && !past) {
        if (managing) box.append(el('span', 'kp add', t('signUp')));
        else { const b = el('button', 'kp add', t('signUp')); b.type = 'button'; b.addEventListener('click', () => claim(date, slot)); box.append(b); }
      }
    }
    cell.append(box);
    return cell;
  }

  // ── 관리 모드에서 칸을 누르면: 신청자 해제 · 사람 직접 배정 · 정원 · 칸 닫기/열기 ──
  let membersCache = null;
  let assignCtx = null;
  async function openAssign(date, slot) {
    assignCtx = { date, slot };
    $('assignError').textContent = '';
    fillAssign();
    $('assignModal').hidden = false;
    if (!membersCache) {
      const res = await fetch('/api/kitchen/members', { headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { $('assignError').textContent = data.error || t('failLoad'); return; }
      membersCache = data.members;
      fillAssign();
    }
  }
  function fillAssign() {
    if (!assignCtx || !state) return;
    const { date, slot } = assignCtx;
    const people = peopleOf(date, slot);
    const closed = isClosed(date, slot);
    const cap = capOf(date, slot);
    $('assignTitle').textContent = `${md(date)} (${wk(date)}) · ${t(slot)}`;
    $('assignState').textContent = closed ? t('stateClosed') : t('stateOpen', people.length, cap);
    const list = $('assignPeople'); list.replaceChildren();
    if (!people.length) list.append(el('p', 'kempty', t('assignNoOne')));
    people.forEach(p => {
      const row = el('div', 'kperson');
      row.append(el('span', 'kname', p.name));
      const rm = el('button', 'kremove', t('assignRemove')); rm.type = 'button';
      rm.addEventListener('click', () => { if (confirm(t('removeConfirm', p.name))) modalAct('DELETE', `${API}?date=${encodeURIComponent(date)}&slot=${slot}&email=${encodeURIComponent(p.email)}`); });
      row.append(rm);
      list.append(row);
    });
    const taken = new Set(people.map(p => p.email));
    const sel = $('assignSelect');
    sel.replaceChildren(new Option(t('assignNone'), ''));
    (membersCache || []).filter(m => !taken.has(m.email)).forEach(m => sel.append(new Option(`${m.name} · ${m.email}${m.hasPhone ? '' : ' ⚠'}`, m.email)));
    const full = !closed && people.length >= cap;
    $('assignDo').disabled = full;
    $('assignFull').hidden = !full;
    $('assignFull').textContent = t('assignFull');
    const capSel = $('capSelect');
    capSel.replaceChildren(new Option(t('capDefault', state.defaultCapacity), ''));
    for (let n = 1; n <= state.maxCapacity; n++) capSel.append(new Option(t('capN', n), String(n)));
    capSel.value = state.caps && state.caps[`${date}:${slot}`] ? String(state.caps[`${date}:${slot}`]) : '';
    $('assignToggle').textContent = closed ? t('assignOpen') : t('assignClose');
  }
  // 창 안에서 하는 일: 실패하면 창에 오류를 보여주고, 성공하면 다시 불러와 창 내용을 갱신한다
  async function modalAct(method, url, body) {
    $('assignError').textContent = '';
    const res = await fetch(url, { method, headers: { ...headers(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { $('assignError').textContent = data.error || t('failAct'); await load().catch(() => {}); return false; }
    $('driveError').textContent = data.noPhone ? t('assignNoPhone') : '';
    await load();
    return true;
  }
  $('assignDo').addEventListener('click', () => { const v = $('assignSelect').value; if (!v) { $('assignError').textContent = t('assignNone'); return; } modalAct('PATCH', API, { date: assignCtx.date, slot: assignCtx.slot, email: v }); });
  $('capSelect').addEventListener('change', async () => { const v = $('capSelect').value; const ok = await modalAct('PUT', API, { date: assignCtx.date, slot: assignCtx.slot, capacity: v ? Number(v) : null }); if (!ok) fillAssign(); });
  $('assignToggle').addEventListener('click', async () => {
    const { date, slot } = assignCtx;
    const closed = isClosed(date, slot);
    const n = peopleOf(date, slot).length;
    if (!closed && n && !confirm(t('closeConfirm', n))) return;
    await modalAct('PUT', API, { date, slot, closed: !closed });
  });
  $('assignCancel').addEventListener('click', () => { $('assignModal').hidden = true; });
  $('assignModal').addEventListener('click', e => { if (e.target === $('assignModal')) $('assignModal').hidden = true; });

  async function setClosed(date, slot, closed) {
    if (closed) {
      const group = slot === 'am' ? MORNING : SLOTS;
      const n = group.reduce((sum, s) => sum + peopleOf(date, s).length, 0);
      if (n && !confirm(t('closeDayConfirm', n))) return;
    }
    await act('PUT', API, { date, slot, closed });
  }

  function render() {
    const p = state.period;
    const lastDay = p.days[p.days.length - 1];
    $('periodLabel').textContent = `${md(p.start)} (${wk(p.start)}) – ${md(lastDay)} (${wk(lastDay)})`;
    $('thisPeriod').hidden = state.today >= p.start && state.today <= p.end;
    const mgr = !!state.me.isManager;
    $('manageBtn').hidden = !mgr;
    $('timesBtn').hidden = !mgr;
    $('manageBtn').textContent = manage && mgr ? t('manageDone') : t('manage');
    $('manageBtn').classList.toggle('on', manage && mgr);
    $('manageHint').hidden = !(manage && mgr);
    $('note').textContent = t('note', state.defaultCapacity);
    const shown = Object.fromEntries(MEALS.map(m => [m, state.meals[m] ? timeLabel(state.meals[m]) : null]));
    $('noteMeals').textContent = t('noteMeals', shown);
    const per = p.days.length / 2;
    const box = $('weeks');
    box.replaceChildren();
    [0, 1].forEach(w => {
      const days = p.days.slice(w * per, w * per + per);
      const week = el('section', 'drive-week');
      const title = el('header', 'drive-week-title');
      title.innerHTML = `<strong>${t('week', w + 1)}</strong><span>${md(days[0])} – ${md(days[days.length - 1])}</span>`;
      const grid = el('div', 'drive-days');
      days.forEach(date => {
        const card = el('article', 'drive-day' + (date === state.today ? ' is-today' : '') + (date < state.today ? ' is-past' : ''));
        card.id = 'day-' + date;
        const head = el('div', 'drive-day-head');
        head.innerHTML = `<strong>${md(date)}</strong><span class="dow">${wk(date)}</span>${date === state.today ? `<em>${t('today')}</em>` : ''}`;
        // 날짜 머리 + (관리 모드일 때) 아침/하루 열기·닫기 줄을 한 묶음으로 — 모든 날의 칸이 같은 높이에서 시작하도록 줄을 항상 같은 수만큼 둔다
        const top = el('div', 'drive-day-top');
        top.append(head);
        if (manage && mgr) {
          const row = el('div', 'day-toggle-row kitchen-toggle-row');
          if (date >= state.today) {
            const amClosed = MORNING.every(s => isClosed(date, s));
            const allClosed = SLOTS.every(s => isClosed(date, s));
            const mk = (text, fn) => { const b = el('button', 'day-toggle', text); b.type = 'button'; b.addEventListener('click', fn); return b; };
            row.append(
              mk(amClosed ? t('openAm') : t('closeAm'), () => setClosed(date, 'am', !amClosed)),
              mk(allClosed ? t('openDay') : t('closeDay'), () => setClosed(date, 'all', !allClosed)),
            );
          }
          top.append(row);
        }
        const slots = el('div', 'drive-slots kitchen-slots');
        MEALS.forEach(m => {
          const group = el('section', `kmeal meal-${m}`);
          const title = el('div', 'kmeal-title');
          title.append(el('strong', '', mealName(m)));
          if (state.meals[m]) title.append(el('small', '', timeLabel(state.meals[m])));
          const pair = el('div', 'kmeal-slots');
          SLOTS.filter(s => mealOf(s) === m).forEach(s => pair.append(slotCell(date, s)));
          group.append(title, pair);
          slots.append(group);
        });
        card.append(top, slots);
        grid.append(card);
      });
      week.append(title, grid);
      box.append(week);
    });
  }

  async function act(method, url, body) {
    $('driveError').textContent = '';
    const response = await fetch(url, { method, headers: { ...headers(), 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { $('driveError').textContent = data.error || t('failAct'); await load().catch(() => {}); return false; }
    await load();
    return true;
  }

  let pending = null;
  function claim(date, slot) {
    // 포탈 계정에 번호가 있으면 묻지 않고 바로 신청(알림은 계정의 번호로 간다). 번호가 없을 때만 입력창을 연다.
    const known = /^[0-9+\-\s()]{7,20}$/.test(state.me.phone || '');
    if (!known) {
      pending = { date, slot };
      $('phoneWhen').textContent = t('whenText', `${md(date)} (${wk(date)})`, t(slot));
      $('phoneInput').value = state.me.phone || '';
      $('phoneError').textContent = '';
      $('phoneModal').hidden = false;
      setTimeout(() => $('phoneInput').focus(), 30);
      return;
    }
    act('POST', API, { date, slot });
  }
  async function cancelMine(date, slot) {
    if (!confirm(t('cancelConfirm'))) return;
    await act('DELETE', `${API}?date=${encodeURIComponent(date)}&slot=${slot}`);
  }

  $('phoneCancel').addEventListener('click', () => { $('phoneModal').hidden = true; pending = null; });
  $('phoneModal').addEventListener('click', e => { if (e.target === $('phoneModal')) { $('phoneModal').hidden = true; pending = null; } });
  $('phoneOk').addEventListener('click', async () => {
    const phone = $('phoneInput').value.trim();
    if (!/^[0-9+\-\s()]{7,20}$/.test(phone)) { $('phoneError').textContent = t('phoneBad'); return; }
    if (!pending) return;
    const { date, slot } = pending;
    $('phoneModal').hidden = true; pending = null;
    if (phone !== state.me.phone) state.me.phone = phone;
    await act('POST', API, { date, slot, phone });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('phoneModal').hidden) { $('phoneModal').hidden = true; pending = null; } if (e.key === 'Enter' && !$('phoneModal').hidden && e.target === $('phoneInput')) $('phoneOk').click(); });

  // ── 식사 시간 · 기본 인원 설정 (주방 관리자) ──
  const MEAL_OPTIONS = (() => { const out = []; for (let m = 7 * 60; m <= 21 * 60; m += 30) out.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')); return out; })();
  const timeLabel = v => { const [h, m] = v.split(':').map(Number); return lang === 'en' ? `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` : `${h < 12 ? '오전' : '오후'} ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`; };
  const minusHour = v => { const [h, m] = v.split(':').map(Number); return String(h - 1).padStart(2, '0') + ':' + String(m).padStart(2, '0'); };
  let defaultSettings = null;
  const currentSettings = () => ({
    meals: Object.fromEntries([...document.querySelectorAll('#timesGrid select')].map(s => [s.dataset.meal, s.value || null])),
    capacity: Number($('timeCapacity').value),
  });
  function showTimes(settings) {
    const box = $('timesGrid'); box.replaceChildren();
    MEALS.forEach(m => {
      const label = el('label');
      label.append(el('span', '', t('mealTime', mealName(m))));
      const sel = el('select'); sel.dataset.meal = m;
      sel.append(new Option(t('timesOff'), ''));
      MEAL_OPTIONS.forEach(v => sel.append(new Option(timeLabel(v), v)));
      sel.value = settings.meals[m] || '';
      const hint = el('small', 'remind');
      const sync = () => { hint.textContent = sel.value ? t('remindAt', timeLabel(minusHour(sel.value))) : ''; };
      sel.addEventListener('change', sync); sync();
      label.append(sel, hint);
      box.append(label);
    });
    const cap = $('timeCapacity'); cap.replaceChildren();
    for (let n = 1; n <= (state ? state.maxCapacity : 4); n++) cap.append(new Option(t('capN', n), String(n)));
    cap.value = String(settings.capacity);
  }
  async function openTimes() {
    $('timesError').textContent = '';
    const res = await fetch('/api/kitchen/settings', { headers: headers() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { $('driveError').textContent = data.error || t('failLoad'); return; }
    defaultSettings = data.defaults;
    showTimes(data.settings);
    $('timesModal').hidden = false;
  }
  async function saveTimes() {
    const res = await fetch('/api/kitchen/settings', { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify(currentSettings()) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { $('timesError').textContent = data.error || t('failAct'); return; }
    $('timesModal').hidden = true;
    await load();
  }
  $('timesBtn').addEventListener('click', openTimes);
  $('timesCancel').addEventListener('click', () => { $('timesModal').hidden = true; });
  $('timesModal').addEventListener('click', e => { if (e.target === $('timesModal')) $('timesModal').hidden = true; });
  $('timesSave').addEventListener('click', saveTimes);
  $('timesReset').addEventListener('click', () => { if (defaultSettings) showTimes(defaultSettings); }); // 저장 전까지는 화면에서만 되돌린다
  $('manageBtn').addEventListener('click', () => { manage = !manage; render(); });
  $('prevPeriod').addEventListener('click', () => load(state.period.prev));
  $('nextPeriod').addEventListener('click', () => load(state.period.next));
  $('thisPeriod').addEventListener('click', () => load(state.today));
  $('langKoBtn').addEventListener('click', () => setLang('ko'));
  $('langEnBtn').addEventListener('click', () => setLang('en'));

  $('loginForm').addEventListener('submit', async event => {
    event.preventDefault();
    $('loginError').textContent = '';
    const button = $('loginForm').querySelector('button');
    button.disabled = true;
    try {
      const response = await fetch('/api/hub/account-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t('loginFail'));
      sessionStorage.setItem(tokenKey, data.hubToken);
      if (window.wolkoCheckPasswordReset) window.wolkoCheckPasswordReset();
      $('loginPassword').value = '';
      show('loading');
      await load();
    } catch (error) { $('loginError').textContent = error.message; show('login'); }
    finally { button.disabled = false; }
  });

  addEventListener('hashchange', () => { const d = hashDate(); if (d) { focusedOnce = true; load(d).then(focusHashDay).catch(() => {}); } });
  applyLang();
  show('loading');
  load().catch(error => { show('login'); $('loginError').textContent = error.message; });
})();
