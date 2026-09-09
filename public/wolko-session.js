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
  const epoch = read(localStorage, EVENT_KEY) || '';
  const invalidatedOnLoad = !!epoch && read(sessionStorage, SEEN_KEY) !== epoch;
  if (invalidatedOnLoad) clearAuth();
  write(sessionStorage, SEEN_KEY, epoch);

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
    rememberedEmail() { return read(localStorage, EMAIL_KEY) || ''; },
    rememberEmail(email, enabled) {
      try {
        if (enabled) localStorage.setItem(EMAIL_KEY, String(email).trim().toLowerCase());
        else localStorage.removeItem(EMAIL_KEY);
      } catch {}
    },
  };
})();
