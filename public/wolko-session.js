(function () {
  if (window.WolkoSession) return;
  const EVENT_KEY = 'wolko-logout-event';
  const SEEN_KEY = 'wolko-logout-seen';
  const EMAIL_KEY = 'wolko-remembered-email';
  const AUTH_KEYS = new Set(['wolko-hub-token', 'wolko-hub-email', 'wolko-hub-role',
    'wolko-camp-progress-token', 'wolko-camp-progress-role', 'wolko_camp_resources_token', 'wolko_qt_book_token']);
  let cleanup = async () => {};
  let exiting = false;
  function read(storage, key) { try { return storage.getItem(key); } catch { return null; } }
  function write(storage, key, value) { try { storage.setItem(key, value); } catch {} }
  function clearAuth() {
    for (const storage of [sessionStorage, localStorage]) {
      try {
        const keys = Array.from({ length: storage.length }, (_, i) => storage.key(i));
        for (const key of keys) if (AUTH_KEYS.has(key) || key?.startsWith('wolko_team_token_')) storage.removeItem(key);
      } catch {}
    }
  }
  /* ── 포탈 로그인 유지(90일) ──
     포탈 로그인 때 '로그인 유지'가 켜져 있으면 허브 토큰을 localStorage에도 저장하고, 새 브라우저 세션이 시작되면
     (sessionStorage가 비어 있을 때) 만료 전 토큰을 sessionStorage로 복원한다. 다른 페이지들은 지금처럼 sessionStorage만 읽는다.
     로그아웃(logoutAll)은 두 저장소를 모두 비우고 epoch를 바꾸므로, 그 이전에 저장된 로그인은 복원되지 않는다. */
  const HUB_KEYS = ['wolko-hub-token', 'wolko-hub-email', 'wolko-hub-role'];
  const PERSIST_EPOCH_KEY = 'wolko-hub-persist-epoch';
  function tokenValid(token) {
    try {
      const data = atob(token);
      const parts = data.slice(0, data.lastIndexOf(':')).split(':');
      const expires = parseInt(parts[3], 10);
      return parts[0] === 'wolko-hub' && parts.length === 4 && !!expires && Date.now() < expires;
    } catch { return false; }
  }
  /* 서버가 토큰을 거부(401)해서 세션 쪽 토큰을 지울 때, 복원용 사본도 같이 지워 같은 토큰이 되살아나지 않게 한다 */
  try {
    const nativeRemove = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function (key) {
      nativeRemove.call(this, key);
      if (this === window.sessionStorage && HUB_KEYS.indexOf(key) !== -1) { try { nativeRemove.call(window.localStorage, key); } catch {} }
    };
  } catch {}

  const epoch = read(localStorage, EVENT_KEY) || '';
  const seen = read(sessionStorage, SEEN_KEY);
  const newBrowserSession = seen === null;
  let invalidatedOnLoad;
  if (newBrowserSession) invalidatedOnLoad = !!epoch && read(localStorage, PERSIST_EPOCH_KEY) !== epoch;
  else invalidatedOnLoad = !!epoch && seen !== epoch;
  if (invalidatedOnLoad) clearAuth();
  write(sessionStorage, SEEN_KEY, epoch);
  if (!invalidatedOnLoad && !read(sessionStorage, 'wolko-hub-token')) {
    const saved = read(localStorage, 'wolko-hub-token');
    if (saved && tokenValid(saved)) HUB_KEYS.forEach(k => { const v = read(localStorage, k); if (v !== null) write(sessionStorage, k, v); });
    else if (saved) HUB_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} });
  }

  async function logoutAll(remote = false) {
    if (exiting) return;
    exiting = true;
    clearAuth();
    const event = remote ? (read(localStorage, EVENT_KEY) || '') : `${Date.now()}-${Math.random()}`;
    write(sessionStorage, SEEN_KEY, event);
    if (!remote) write(localStorage, EVENT_KEY, event);
    try { await cleanup(); }
    finally { window.location.replace('/portal'); }
  }
  window.addEventListener('storage', event => {
    if (event.key === EVENT_KEY && event.newValue) logoutAll(true);
  });
  window.addEventListener('pageshow', () => {
    const latest = read(localStorage, EVENT_KEY) || '';
    if (latest !== (read(sessionStorage, SEEN_KEY) || '')) logoutAll(true);
  });
  window.WolkoSession = {
    logoutAll, invalidatedOnLoad,
    onLogout(fn) { cleanup = fn; },
    persistLogin(enabled) {
      if (!enabled) { HUB_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} }); return; }
      HUB_KEYS.forEach(k => { const v = read(sessionStorage, k); if (v !== null) write(localStorage, k, v); });
      write(localStorage, PERSIST_EPOCH_KEY, read(localStorage, EVENT_KEY) || '');
    },
    rememberedEmail() { return read(localStorage, EMAIL_KEY) || ''; },
    rememberEmail(email, enabled) {
      try {
        if (enabled) localStorage.setItem(EMAIL_KEY, String(email).trim().toLowerCase());
        else localStorage.removeItem(EMAIL_KEY);
      } catch {}
    },
  };
})();
