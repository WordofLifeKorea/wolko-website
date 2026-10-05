(function () {
  const $ = id => document.getElementById(id);
  const tokenKey = 'wolko-hub-token';
  const I18N = {
    ko: {
      pageTitle: '차량 스케줄', docTitle: '운행 스케줄 — WOLKO', menuLabel: '차량 메뉴',
      tabLog: '사용 일지', tabReservations: '예약현황', tabMaintenance: '정비 관리', tabDrive: '운행 스케줄',
      h1: '운행 스케줄', intro: '평택센터 멤버가 2주 단위로 오전 픽업 · 드롭오프를 신청해요. 오전 픽업 담당자에게는 당일 아침 8시에 문자가 가요.',
      loading: '불러오는 중…', loginTitle: '포탈 로그인', loginHelp: '평택센터 멤버의 포탈 계정으로 로그인해 주세요.', email: '이메일', password: '비밀번호', loginBtn: '로그인하고 계속하기', loginFail: '로그인하지 못했습니다.',
      deniedTitle: '평택센터 멤버 전용이에요', deniedHelp: '이 스케줄은 평택센터 멤버만 사용할 수 있어요. 소속이 맞는데 이 안내가 보이면 관리자에게 문의해 주세요.',
      period2w: '2주 단위', thisPeriod: '이번 2주', note: '칸을 눌러 신청하고, 내가 신청한 칸을 다시 누르면 취소돼요. 오전 픽업은 휴대폰 번호가 필요해요.',
      week: n => n + '주차', pickup: '오전 픽업', dropoff: '드롭오프', signUp: '+ 신청', mineLabel: '내가 신청', today: '오늘',
      phoneTitle: '오전 픽업 알림 문자', phoneHelp: '픽업 당일 아침 8시에 이 번호로 문자를 보내드려요.', phoneLabel: '휴대폰 번호', phoneBad: '올바른 휴대폰 번호를 입력해 주세요.', cancel: '취소', signUpDo: '신청하기',
      cancelConfirm: '이 신청을 취소할까요?', cancelAdmin: '(관리자) 이 신청을 취소할까요?', failLoad: '스케줄을 불러오지 못했습니다.', failAct: '처리하지 못했습니다.',
      days: ['일', '월', '화', '수', '목', '금', '토'], whenText: (d, slot) => d + ' · ' + slot,
    },
    en: {
      pageTitle: 'Vehicle Schedule', docTitle: 'Driving Schedule — WOLKO', menuLabel: 'Vehicle menu',
      tabLog: 'Usage Log', tabReservations: 'Reservations', tabMaintenance: 'Maintenance', tabDrive: 'Driving',
      h1: 'Driving Schedule', intro: 'Pyeongtaek Center members sign up for morning pick-up and drop-off in two-week blocks. The pick-up person gets a text at 8 AM that day.',
      loading: 'Loading…', loginTitle: 'Portal Login', loginHelp: 'Log in with your Pyeongtaek Center portal account.', email: 'Email', password: 'Password', loginBtn: 'Log in and continue', loginFail: 'Could not log in.',
      deniedTitle: 'Pyeongtaek Center members only', deniedHelp: 'This schedule is for Pyeongtaek Center members. If you belong here and still see this, please contact an admin.',
      period2w: 'Two-week block', thisPeriod: 'This block', note: 'Tap a slot to sign up; tap your own slot again to cancel. Morning pick-up needs a mobile number.',
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
  let wantedStart = null;

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
  }

  function slotButton(date, slot) {
    const info = state.slots[`${date}:${slot}`];
    const past = date < state.today;
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'drive-slot' + (info ? (info.mine ? ' taken mine' : ' taken') : '');
    if (info) {
      b.textContent = info.name;
      if (info.mine) { const x = document.createElement('span'); x.className = 'x'; x.textContent = '✕'; b.append(x); }
      b.disabled = !info.mine && !state.me.isAdmin;
      if (info.mine || state.me.isAdmin) b.addEventListener('click', () => cancelSlot(date, slot, info.mine));
      if (past && !state.me.isAdmin) b.disabled = true;
    } else {
      b.textContent = t('signUp');
      b.disabled = past;
      b.addEventListener('click', () => claim(date, slot));
    }
    return b;
  }

  function render() {
    const p = state.period;
    const lastDay = p.days[p.days.length - 1];
    $('periodLabel').textContent = `${md(p.start)} (${wk(p.start)}) – ${md(lastDay)} (${wk(lastDay)})`;
    $('thisPeriod').hidden = state.today >= p.start && state.today <= p.end;
    const box = $('weeks');
    box.replaceChildren();
    [0, 1].forEach(w => {
      const week = document.createElement('section');
      week.className = 'drive-week';
      const title = document.createElement('p');
      title.className = 'drive-week-title';
      title.textContent = `${t('week', w + 1)} · ${md(p.days[w * 6])} – ${md(p.days[w * 6 + 5])}`;
      const grid = document.createElement('div');
      grid.className = 'drive-days';
      p.days.slice(w * 6, w * 6 + 6).forEach(date => {
        const card = document.createElement('article');
        card.className = 'drive-day' + (date === state.today ? ' is-today' : '') + (date < state.today ? ' is-past' : '');
        const head = document.createElement('div');
        head.className = 'drive-day-head';
        head.innerHTML = `<strong>${md(date)}</strong><span>${wk(date)}${date === state.today ? ' · ' + t('today') : ''}</span>`;
        const l1 = document.createElement('p'); l1.className = 'drive-slot-label'; l1.textContent = t('pickup');
        const l2 = document.createElement('p'); l2.className = 'drive-slot-label'; l2.textContent = t('dropoff');
        card.append(head, l1, slotButton(date, 'pickup'), l2, slotButton(date, 'dropoff'));
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
    if (slot === 'pickup') {
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
      $('loginPassword').value = '';
      show('loading');
      await load();
    } catch (error) { $('loginError').textContent = error.message; show('login'); }
    finally { button.disabled = false; }
  });

  applyLang();
  show('loading');
  load().catch(error => { show('login'); $('loginError').textContent = error.message; });
})();
