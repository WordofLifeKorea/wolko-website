(function () {
  const $ = id => document.getElementById(id);
  const tokenKey = 'wolko-hub-token';
  const I18N = {
    ko: {
      pageTitle: '차량 스케줄', docTitle: '운행 스케줄 — WOLKO', menuLabel: '차량 메뉴',
      tabLog: '사용 일지', tabReservations: '예약현황', tabMaintenance: '정비 관리', tabDrive: '운행 스케줄',
      h1: '운행 스케줄', intro: '오전 픽업과 드롭오프를 신청하세요. 픽업 당일 아침 8시에 문자로 알려드려요.',
      loading: '불러오는 중…', loginTitle: '포탈 로그인', loginHelp: '평택센터 멤버의 포탈 계정으로 로그인해 주세요.', email: '이메일', password: '비밀번호', loginBtn: '로그인하고 계속하기', loginFail: '로그인하지 못했습니다.',
      deniedTitle: '평택센터 멤버 전용이에요', deniedHelp: '이 스케줄은 평택센터 멤버만 사용할 수 있어요. 소속이 맞는데 이 안내가 보이면 관리자에게 문의해 주세요.',
      thisPeriod: '오늘로', assignPick: '담당자 직접 배정', assignDo: '배정하기', assignClear: '배정 해제', assignNone: '— 담당자 선택 —', assignEmpty: '비어 있어요', assignNow: n => `현재 담당: ${n}`, assignClosed: '닫혀 있어요', assignSaved: n => `${n} 님을 배정했어요.`, assignNoPhone: '※ 휴대폰 번호가 없는 계정이라 알림이 가지 않아요.', assignOpen: '이 칸 열기', assignClose: '이 칸 닫기', timesBtn: '알림 시간', timesReset: '기본 시간으로 되돌리기', timesDefaultNote: '기본: 오전 8:00 · 화~목 오후 5:00 · 금 낮 12:00 · 월·토·일 오후는 보내지 않음', timesTitle: '알림 보내는 시간', timesHelp: '신청한 사람에게 카카오 알림톡(실패하면 문자)으로 보내요. 30분 단위로 고를 수 있어요.', timesPickup: '오전 픽업 — 신청이 있는 날 매일', timesDropoff: '오후 드롭오프 — 요일별', timesOff: '보내지 않음', timesSaved: '저장했어요.', save: '저장', manage: '칸 관리', manageDone: '관리 끝내기', manageHint: '칸을 눌러 닫거나 열어요. 월·토·일은 기본으로 닫혀 있어서, 라이드가 필요한 날만 눌러 열어 주세요. 신청이 있는 칸을 닫으면 그 신청은 취소돼요.', closedLabel: '닫힘', closeDay: '하루 닫기', openDay: '하루 열기', closeConfirm: n => `${n} 님의 신청이 취소돼요. 이 칸을 닫을까요?`, closeDayConfirm: n => `이 날의 신청 ${n}건이 취소돼요. 하루를 닫을까요?`, note: '빈 칸을 누르면 바로 신청돼요 · 내 칸을 다시 누르면 취소돼요 · 월·토·일은 기본으로 닫혀 있고, 관리자가 열면 신청할 수 있어요',
      week: n => n + '주차', pickup: '오전 픽업', dropoff: '드롭오프', signUp: '+ 신청', mineLabel: '내가 신청', today: '오늘',
      phoneTitle: '오전 픽업 알림 문자', phoneHelp: '픽업 당일 아침 8시에 이 번호로 문자를 보내드려요.', phoneLabel: '휴대폰 번호', phoneBad: '올바른 휴대폰 번호를 입력해 주세요.', cancel: '취소', signUpDo: '신청하기',
      cancelConfirm: '이 신청을 취소할까요?', cancelAdmin: '(관리자) 이 신청을 취소할까요?', failLoad: '스케줄을 불러오지 못했습니다.', failAct: '처리하지 못했습니다.',
      days: ['일', '월', '화', '수', '목', '금', '토'], whenText: (d, slot) => d + ' · ' + slot,
    },
    en: {
      pageTitle: 'Vehicle Schedule', docTitle: 'Driving Schedule — WOLKO', menuLabel: 'Vehicle menu',
      tabLog: 'Usage Log', tabReservations: 'Reservations', tabMaintenance: 'Maintenance', tabDrive: 'Driving',
      h1: 'Driving Schedule', intro: 'Sign up for morning pick-up and drop-off. The pick-up person gets a text at 8 AM that day.',
      loading: 'Loading…', loginTitle: 'Portal Login', loginHelp: 'Log in with your Pyeongtaek Center portal account.', email: 'Email', password: 'Password', loginBtn: 'Log in and continue', loginFail: 'Could not log in.',
      deniedTitle: 'Pyeongtaek Center members only', deniedHelp: 'This schedule is for Pyeongtaek Center members. If you belong here and still see this, please contact an admin.',
      thisPeriod: 'Today', assignPick: 'Assign a person directly', assignDo: 'Assign', assignClear: 'Remove assignment', assignNone: '— Choose a person —', assignEmpty: 'Empty', assignNow: n => `Assigned: ${n}`, assignClosed: 'Closed', assignSaved: n => `${n} was assigned.`, assignNoPhone: 'Note: this account has no mobile number, so no reminder will be sent.', assignOpen: 'Open this slot', assignClose: 'Close this slot', timesBtn: 'Reminder times', timesReset: 'Reset to default times', timesDefaultNote: 'Default: 8:00 AM · Tue–Thu 5:00 PM · Fri 12:00 PM · afternoon off on Mon, Sat, Sun', timesTitle: 'When reminders are sent', timesHelp: 'Sent to the person signed up by KakaoTalk (text message if it fails). Pick times in 30-minute steps.', timesPickup: 'Morning pick-up — every day with a sign-up', timesDropoff: 'Afternoon drop-off — by weekday', timesOff: 'Do not send', timesSaved: 'Saved.', save: 'Save', manage: 'Manage slots', manageDone: 'Done', manageHint: 'Tap a slot to close or open it. Mon, Sat and Sun are closed by default — open the days that need a ride. Closing a slot with a sign-up cancels that sign-up.', closedLabel: 'Closed', closeDay: 'Close day', openDay: 'Open day', closeConfirm: n => `${n}'s sign-up will be cancelled. Close this slot?`, closeDayConfirm: n => `${n} sign-up(s) on this day will be cancelled. Close the whole day?`, note: 'Tap an empty slot to sign up · tap your own slot again to cancel · Mon, Sat and Sun are closed by default until a manager opens them',
      week: n => 'Week ' + n, pickup: 'Pick up', dropoff: 'Drop off', signUp: '+ Sign up', mineLabel: 'Mine', today: 'Today',
      phoneTitle: 'Morning pick-up text', phoneHelp: 'We will text this number at 8 AM on the pick-up day.', phoneLabel: 'Mobile number', phoneBad: 'Please enter a valid mobile number.', cancel: 'Cancel', signUpDo: 'Sign up',
      cancelConfirm: 'Cancel this sign-up?', cancelAdmin: '(Admin) Cancel this sign-up?', failLoad: 'Could not load the schedule.', failAct: 'Could not complete that.',
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], whenText: (d, slot) => d + ' · ' + slot,
    },
  };
  let lang = (() => { try { return localStorage.getItem('wolkoCarLang') === 'en' ? 'en' : 'ko'; } catch { return 'ko'; } })();
  const t = (k, a, b) => { const v = I18N[lang][k] ?? I18N.ko[k] ?? k; return typeof v === 'function' ? v(a, b) : v; };
  const headers = () => ({ Authorization: `Bearer ${sessionStorage.getItem(tokenKey) || ''}` });
  const md = iso => { const [, m, d] = iso.split('-'); return `${+m}/${+d}`; };
  const wk = iso => t('days')[new Date(iso + 'T00:00:00Z').getUTCDay()];

  let state = null; // { me, today, period, slots }
  // 링크에 날짜가 붙어 있으면(예: /car-drive/#2026-10-06) 그 날이 속한 2주 구간을 열고 그 날 카드로 이동한다
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
    document.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
    document.querySelectorAll('[data-t-aria]').forEach(el => el.setAttribute('aria-label', t(el.dataset.tAria)));
    $('langKoBtn').classList.toggle('is-active', lang === 'ko');
    $('langEnBtn').classList.toggle('is-active', lang === 'en');
    $('phoneOk').textContent = t('signUpDo');
    if (state) render();
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
    const response = await fetch('/api/car/drive' + (wantedStart ? `?start=${encodeURIComponent(wantedStart)}` : ''), { headers: headers() });
    if (response.status === 401) { show('login'); return; }
    if (response.status === 403) { show('denied'); return; }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.period) throw new Error(data.error || t('failLoad'));
    state = data;
    wantedStart = data.period.start;
    show('app');
    render();
    if (!focusedOnce) { focusedOnce = true; focusHashDay(); }
  }

  let manage = false;
  const isClosed = (date, slot) => !!(state.closed && state.closed[`${date}:${slot}`]);
  function slotButton(date, slot) {
    const info = state.slots[`${date}:${slot}`];
    const past = date < state.today;
    const closed = isClosed(date, slot);
    const managing = manage && state.me.isManager;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'drive-slot' + (closed ? ' closed' : info ? (info.mine ? ' taken mine' : ' taken') : '') + (managing && !past ? ' managing' : '');
    const lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = t(slot);
    const who = document.createElement('span'); who.className = 'who';
    b.append(lbl, who);
    if (managing) {
      who.textContent = closed ? t('closedLabel') : info ? info.name : t('signUp');
      b.disabled = past;
      b.addEventListener('click', () => openAssign(date, slot, closed, info));
      return b;
    }
    if (closed) {
      who.textContent = t('closedLabel');
      b.disabled = true;
    } else if (info) {
      who.textContent = info.name;
      if (info.mine) { const x = document.createElement('i'); x.className = 'x'; x.textContent = '✕'; b.append(x); }
      b.disabled = !info.mine && !state.me.isAdmin;
      if (info.mine || state.me.isAdmin) b.addEventListener('click', () => cancelSlot(date, slot, info.mine));
      if (past && !state.me.isAdmin) b.disabled = true;
    } else {
      who.textContent = t('signUp');
      b.disabled = past;
      b.addEventListener('click', () => claim(date, slot));
    }
    return b;
  }
  // ── 관리 모드에서 칸을 누르면: 사람을 직접 배정 · 배정 해제 · 칸 닫기/열기 ──
  let membersCache = null;
  let assignCtx = null;
  async function openAssign(date, slot, closed, info) {
    assignCtx = { date, slot, closed, info };
    $('assignTitle').textContent = `${md(date)} (${wk(date)}) · ${t(slot)}`;
    $('assignState').textContent = closed ? t('assignClosed') : info ? t('assignNow', info.name) : t('assignEmpty');
    $('assignError').textContent = '';
    $('assignClear').hidden = !info;
    $('assignToggle').textContent = closed ? t('assignOpen') : t('assignClose');
    const sel = $('assignSelect');
    sel.innerHTML = `<option value="">${t('assignNone')}</option>`;
    $('assignModal').hidden = false;
    if (!membersCache) {
      const res = await fetch('/api/car/drive-members', { headers: headers() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { $('assignError').textContent = data.error || t('failLoad'); return; }
      membersCache = data.members;
    }
    sel.innerHTML = `<option value="">${t('assignNone')}</option>` + membersCache.map(m => `<option value="${m.email}">${m.name} · ${m.email}${m.hasPhone ? '' : ' ⚠'}</option>`).join('');
  }
  async function assignRequest(email) {
    const { date, slot } = assignCtx;
    const res = await fetch('/api/car/drive', { method: 'PATCH', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ date, slot, email }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { $('assignError').textContent = data.error || t('failAct'); return; }
    $('assignModal').hidden = true;
    if (data.noPhone) $('driveError').textContent = t('assignNoPhone');
    await load();
  }
  $('assignDo').addEventListener('click', () => { const v = $('assignSelect').value; if (!v) { $('assignError').textContent = t('assignNone'); return; } assignRequest(v); });
  $('assignClear').addEventListener('click', () => assignRequest(null));
  $('assignToggle').addEventListener('click', async () => { const c = assignCtx; $('assignModal').hidden = true; await setClosed(c.date, c.slot, !c.closed, c.info); });
  $('assignCancel').addEventListener('click', () => { $('assignModal').hidden = true; });
  $('assignModal').addEventListener('click', e => { if (e.target === $('assignModal')) $('assignModal').hidden = true; });

  async function setClosed(date, slot, closed, info) {
    if (closed && slot !== 'all' && info && !confirm(t('closeConfirm', info.name))) return;
    if (closed && slot === 'all') {
      const n = ['pickup', 'dropoff'].filter(s => state.slots[`${date}:${s}`]).length;
      if (n && !confirm(t('closeDayConfirm', n))) return;
    }
    await act('PUT', '/api/car/drive', { date, slot, closed });
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
    const per = p.days.length / 2;
    const box = $('weeks');
    box.replaceChildren();
    [0, 1].forEach(w => {
      const days = p.days.slice(w * per, w * per + per);
      const week = document.createElement('section');
      week.className = 'drive-week';
      const title = document.createElement('header');
      title.className = 'drive-week-title';
      title.innerHTML = `<strong>${t('week', w + 1)}</strong><span>${md(days[0])} – ${md(days[days.length - 1])}</span>`;
      const grid = document.createElement('div');
      grid.className = 'drive-days';
      days.forEach(date => {
        const card = document.createElement('article');
        card.id = 'day-' + date;
        card.className = 'drive-day' + (date === state.today ? ' is-today' : '') + (date < state.today ? ' is-past' : '');
        const head = document.createElement('div');
        head.className = 'drive-day-head';
        head.innerHTML = `<strong>${md(date)}</strong><span class="dow">${wk(date)}</span>${date === state.today ? `<em>${t('today')}</em>` : ''}`;
        // 날짜 머리 + (관리 모드일 때) 하루 열기/닫기 줄을 한 묶음으로 — 모든 날의 칸이 같은 높이에서 시작하도록 줄을 항상 같은 수만큼 둔다
        const top = document.createElement('div');
        top.className = 'drive-day-top';
        top.append(head);
        if (manage && mgr) {
          const row = document.createElement('div');
          row.className = 'day-toggle-row';
          if (date >= state.today) {
            const bothClosed = isClosed(date, 'pickup') && isClosed(date, 'dropoff');
            const tg = document.createElement('button');
            tg.type = 'button'; tg.className = 'day-toggle'; tg.textContent = bothClosed ? t('openDay') : t('closeDay');
            tg.addEventListener('click', () => setClosed(date, 'all', !bothClosed));
            row.append(tg);
          }
          top.append(row);
        }
        const slots = document.createElement('div');
        slots.className = 'drive-slots';
        slots.append(slotButton(date, 'pickup'), slotButton(date, 'dropoff'));
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
    // 포탈 계정에 번호가 있으면 묻지 않고 바로 신청(문자는 계정의 번호로 간다). 번호가 없을 때만 입력창을 연다.
    const known = /^[0-9+\-\s()]{7,20}$/.test(state.me.phone || '');
    if (slot === 'pickup' && !known) {
      pending = { date, slot };
      $('phoneWhen').textContent = t('whenText', `${md(date)} (${wk(date)})`, t('pickup'));
      $('phoneInput').value = state.me.phone || '';
      $('phoneError').textContent = '';
      $('phoneModal').hidden = false;
      setTimeout(() => $('phoneInput').focus(), 30);
      return;
    }
    act('POST', '/api/car/drive', { date, slot });
  }
  async function cancelSlot(date, slot, mine) {
    if (!confirm(mine ? t('cancelConfirm') : t('cancelAdmin'))) return;
    await act('DELETE', `/api/car/drive?date=${encodeURIComponent(date)}&slot=${slot}`);
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
    await act('POST', '/api/car/drive', { date, slot, phone });
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('phoneModal').hidden) { $('phoneModal').hidden = true; pending = null; } if (e.key === 'Enter' && !$('phoneModal').hidden && e.target === $('phoneInput')) $('phoneOk').click(); });

  // ── 알림 시간 설정 (운행 스케줄 관리자) ──
  const TIME_OPTIONS = (() => { const out = []; for (let m = 5 * 60; m <= 21 * 60; m += 30) out.push(String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0')); return out; })();
  const timeLabel = v => { const [h, m] = v.split(':').map(Number); return lang === 'en' ? `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}` : `${h < 12 ? '오전' : '오후'} ${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`; };
  const fillSelect = (sel, value, allowOff) => {
    sel.innerHTML = (allowOff ? `<option value="">${t('timesOff')}</option>` : '') + TIME_OPTIONS.map(v => `<option value="${v}">${timeLabel(v)}</option>`).join('');
    sel.value = value || '';
  };
  let defaultTimes = null;
  function showTimes(settings) {
    fillSelect($('timePickup'), settings.pickup, true);
    const box = $('timesDropoff'); box.replaceChildren();
    [1, 2, 3, 4, 5, 6, 0].forEach(d => {
      const label = document.createElement('label');
      const span = document.createElement('span'); span.textContent = t('days')[d];
      const sel = document.createElement('select'); sel.dataset.day = d;
      fillSelect(sel, settings.dropoff[d], true);
      label.append(span, sel); box.append(label);
    });
  }
  async function openTimes() {
    $('timesError').textContent = '';
    const res = await fetch('/api/car/drive-settings', { headers: headers() });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { $('driveError').textContent = data.error || t('failLoad'); return; }
    defaultTimes = data.defaults;
    showTimes(data.settings);
    $('timesModal').hidden = false;
  }
  async function saveTimes() {
    const dropoff = {};
    document.querySelectorAll('#timesDropoff select').forEach(s => { dropoff[s.dataset.day] = s.value || null; });
    const res = await fetch('/api/car/drive-settings', { method: 'PUT', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ pickup: $('timePickup').value || null, dropoff }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { $('timesError').textContent = data.error || t('failAct'); return; }
    $('timesModal').hidden = true;
  }
  $('timesBtn').addEventListener('click', openTimes);
  $('timesCancel').addEventListener('click', () => { $('timesModal').hidden = true; });
  $('timesModal').addEventListener('click', e => { if (e.target === $('timesModal')) $('timesModal').hidden = true; });
  $('timesSave').addEventListener('click', saveTimes);
  $('timesReset').addEventListener('click', () => { if (defaultTimes) showTimes(defaultTimes); }); // 저장 전까지는 화면에서만 되돌린다
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
