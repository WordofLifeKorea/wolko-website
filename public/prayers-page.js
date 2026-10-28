/* 기도제목 나누기 — 지난 기도제목까지 모두 모아 보고, 제목을 누르면 내용이 열린다. 데이터는 /api/portal/prayers?all=1 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TOKEN_KEY = 'wolko-hub-token', API = '/api/portal/prayers';
  var I18N = {
    ko: {
      docTitle: '기도제목 나누기 — WOLKO', pageTitle: '기도제목 나누기', intro: '함께 기도할 제목을 나누고, 지난 기도제목도 한곳에서 모아 봅니다.', loading: '불러오는 중…',
      loginTitle: '포탈 로그인', loginHelp: 'WOLKO 포탈 계정으로 로그인해 주세요.', email: '이메일', password: '비밀번호', loginBtn: '로그인하고 계속하기', loginFail: '로그인하지 못했어요.',
      shareTitle: '기도제목 나누기', titlePh: '제목 (예: 이번 주 캠프를 위해)', textPh: '내용 (선택) — 함께 기도해 주었으면 하는 일을 적어 주세요.', anon: '익명으로 올리기', post: '올리기', posting: '올리는 중…',
      listTitle: function (n) { return '모든 기도제목 (' + n + ')'; }, searchPh: '제목이나 내용으로 찾기', fAll: '전체', fMine: '내가 올린 것', fPrayed: '함께 기도한 것',
      empty: '아직 나눈 기도제목이 없어요.', noMatch: '조건에 맞는 기도제목이 없어요.', pray: '함께 기도해요', del: '삭제', delConfirm: '이 기도제목을 지울까요?', anonName: '익명', noBody: '제목만 나눈 기도제목이에요.', orig: '원문', tr: '자동 번역', edit: '수정', save: '저장', cancel: '취소', edited: '기도제목을 고쳤어요.', note: '한글로 쓰면 영어로, 영어로 쓰면 한글로 자동 번역돼요. 언어를 바꾸면 번역으로 보여요.',
      needTitle: '기도제목의 제목을 입력해 주세요.', sessionEnd: '로그인이 끝났어요. 다시 로그인해 주세요.', failed: '불러오지 못했어요.',
      today: '오늘', yesterday: '어제', daysAgo: function (n) { return n + '일 전'; }, month: function (y, m) { return y + '년 ' + m + '월'; },
    },
    en: {
      docTitle: 'Prayer Requests — WOLKO', pageTitle: 'Prayer Requests', intro: 'Share what to pray for, and browse past requests in one place.', loading: 'Loading…',
      loginTitle: 'Portal sign-in', loginHelp: 'Please sign in with your WOLKO portal account.', email: 'Email', password: 'Password', loginBtn: 'Sign in and continue', loginFail: 'Could not sign in.',
      shareTitle: 'Share a prayer request', titlePh: 'Title (e.g. For this week’s camp)', textPh: 'Details (optional) — what would you like us to pray for?', anon: 'Post anonymously', post: 'Post', posting: 'Posting…',
      listTitle: function (n) { return 'All prayer requests (' + n + ')'; }, searchPh: 'Search by title or details', fAll: 'All', fMine: 'Mine', fPrayed: 'I prayed',
      empty: 'No prayer requests shared yet.', noMatch: 'No prayer requests match.', pray: 'Praying together', del: 'Delete', delConfirm: 'Delete this prayer request?', anonName: 'Anonymous', noBody: 'Shared as a title only.', orig: 'Original', tr: 'Auto-translated', edit: 'Edit', save: 'Save', cancel: 'Cancel', edited: 'Prayer request updated.', note: 'Korean is translated to English and English to Korean automatically; switch the language to read it.',
      needTitle: 'Please enter a title for your request.', sessionEnd: 'Your session ended. Please sign in again.', failed: 'Could not load.',
      today: 'today', yesterday: 'yesterday', daysAgo: function (n) { return n + ' days ago'; }, month: function (y, m) { return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }); },
    },
  };
  var lang = 'ko';
  try { var saved = localStorage.getItem('wolkoCarLang'); if (saved === 'en' || saved === 'ko') lang = saved; else if ((document.documentElement.lang || '').indexOf('en') === 0) lang = 'en'; } catch (e) { /* 저장값을 못 읽어도 한국어로 */ }
  function t(key, a, b) { var v = I18N[lang][key]; return typeof v === 'function' ? v(a, b) : v; }
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function linkify(escaped) {
    return escaped.replace(/\b((?:https?:\/\/|www\.)[A-Za-z0-9\-._~:\/?#\[\]@!$&'()*+,;=%]+)/g, function (m) {
      var tail = (/(?:&quot;|&#39;|&gt;|&lt;|[.,;:!?)\]'])+$/.exec(m) || [''])[0], url = tail ? m.slice(0, m.length - tail.length) : m;
      if (!url) return m;
      return '<a href="' + (/^www\./i.test(url) ? 'https://' + url : url) + '" target="_blank" rel="noopener noreferrer">' + url + '</a>' + tail;
    });
  }
  function headers(json) { var h = { Authorization: 'Bearer ' + (sessionStorage.getItem(TOKEN_KEY) || '') }; if (json) h['Content-Type'] = 'application/json'; return h; }
  function show(which) { $('loadStatus').hidden = which !== 'loading'; $('loginPanel').hidden = which !== 'login'; $('app').hidden = which !== 'app'; }
  function kst(ms) { return new Date(ms + 9 * 3600000).toISOString().slice(0, 10); }
  function ago(iso) { var n = Math.round((Date.parse(kst(Date.now()) + 'T00:00:00Z') - Date.parse(kst(Date.parse(iso)) + 'T00:00:00Z')) / 86400000); return n <= 0 ? t('today') : n === 1 ? t('yesterday') : t('daysAgo', n); }

  var data = { prayers: [], total: 0 }, filter = 'all', query = '', openIds = {}, editingId = null;
  /** 화면 언어로 — 원문과 번역 중 화면 언어인 쪽이 주(main), 나머지는 아래에 작게(alt) */
  function pick(p) {
    var orig = /[가-힣]/.test(p.title + ' ' + p.text) ? 'ko' : 'en', has = !!(p.trTitle || p.trText), useTr = has && lang !== orig;
    var o = { title: p.title, text: p.text }, tr = { title: p.trTitle || '', text: p.trText || '' };
    return useTr ? { main: { title: tr.title || o.title, text: tr.text }, translated: true } : { main: o, translated: false };
  }

  function applyText() {
    document.documentElement.lang = lang;
    document.title = t('docTitle');
    document.querySelectorAll('[data-t]').forEach(function (el) { var v = t(el.dataset.t); if (typeof v === 'string') el.textContent = v; });
    document.querySelectorAll('[data-ph]').forEach(function (el) { el.placeholder = t(el.dataset.ph); });
    $('langKoBtn').classList.toggle('is-active', lang === 'ko'); $('langEnBtn').classList.toggle('is-active', lang === 'en');
  }

  function render() {
    applyText();
    $('listTitle').textContent = t('listTitle', data.total);
    document.querySelectorAll('.pr-filter button').forEach(function (b) { b.classList.toggle('is-on', b.dataset.filter === filter); });
    var q = query.trim().toLowerCase();
    var list = data.prayers.filter(function (p) {
      if (filter === 'mine' && !p.mine) return false;
      if (filter === 'prayed' && !p.prayed) return false;
      return !q || (p.title + ' ' + p.text + ' ' + (p.trTitle || '') + ' ' + (p.trText || '')).toLowerCase().indexOf(q) >= 0;
    });
    var html = '', lastMonth = '';
    list.forEach(function (p) {
      var v = pick(p);
      var ym = kst(Date.parse(p.createdAt)).slice(0, 7);
      if (ym !== lastMonth) { lastMonth = ym; html += '<p class="pr-month">' + esc(t('month', Number(ym.slice(0, 4)), Number(ym.slice(5)))) + '</p>'; }
      html += '<details class="pr-item" data-id="' + esc(p.id) + '"' + (openIds[p.id] ? ' open' : '') + '><summary><span class="pr-title">' + esc(v.main.title) + '</span>'
        + (p.count ? '<span class="pr-count">' + p.count + '</span>' : '')
        + '<span class="pr-when">' + esc(p.anonymous ? t('anonName') : p.name) + ' · ' + esc(ago(p.createdAt)) + '</span></summary>'
        + '<div class="pr-body">' + (editingId === p.id
          ? '<div class="pr-editform" data-id="' + esc(p.id) + '"><input class="pe-title" type="text" maxlength="60" value="' + esc(p.title) + '" placeholder="' + esc(t('titlePh')) + '"><textarea class="pe-text" rows="4" maxlength="600" placeholder="' + esc(t('textPh')) + '">' + esc(p.text) + '</textarea>'
            + '<div class="pr-actions"><label class="pr-anon"><input class="pe-anon" type="checkbox"' + (p.anonymous ? ' checked' : '') + '> <span>' + esc(t('anon')) + '</span></label><span class="pr-own"><button type="button" class="pr-cancel">' + esc(t('cancel')) + '</button><button type="button" class="pr-save" data-save="' + esc(p.id) + '">' + esc(t('save')) + '</button></span></div></div>'
          : (v.main.text ? '<p class="pr-text">' + linkify(esc(v.main.text)).replace(/\n/g, '<br>') + '</p>' : '<p class="pr-text is-none">' + esc(t('noBody')) + '</p>')
            + (v.translated ? '<p class="pr-trnote">' + esc(t('tr')) + '</p>' : '')
            + '<div class="pr-actions"><button type="button" class="pr-pray' + (p.prayed ? ' is-on' : '') + '" data-pray="' + esc(p.id) + '" aria-pressed="' + (p.prayed ? 'true' : 'false') + '">' + esc(t('pray')) + (p.count ? ' <b>' + p.count + '</b>' : '') + '</button>'
            + (p.canEdit || p.canDelete ? '<span class="pr-own">' + (p.canEdit ? '<button type="button" class="pr-edit" data-edit="' + esc(p.id) + '">' + esc(t('edit')) + '</button>' : '') + (p.canDelete ? '<button type="button" class="pr-del" data-del="' + esc(p.id) + '">' + esc(t('del')) + '</button>' : '') + '</span>' : '') + '</div>')
        + '</div></details>';
    });
    $('prList').innerHTML = html;
    $('prEmpty').hidden = list.length > 0;
    $('prEmpty').textContent = data.prayers.length ? t('noMatch') : t('empty');
  }

  async function api(method, url, body) {
    var res = await fetch(url, { method: method, headers: headers(!!body), cache: 'no-store', body: body ? JSON.stringify(body) : undefined });
    var out = await res.json().catch(function () { return {}; });
    if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); show('login'); throw new Error(t('sessionEnd')); }
    if (!res.ok) throw new Error(out.error || t('failed'));
    return out;
  }
  async function load() {
    try { var out = await api('GET', API + '?all=1'); data = { prayers: out.prayers || [], total: out.total || 0 }; show('app'); render(); }
    catch (e) { if ($('loginPanel').hidden) { show('app'); $('prList').innerHTML = ''; $('prEmpty').hidden = false; $('prEmpty').textContent = e.message; } }
  }

  document.addEventListener('toggle', function (e) { var d = e.target; if (d && d.classList && d.classList.contains('pr-item')) { if (d.open) openIds[d.dataset.id] = 1; else delete openIds[d.dataset.id]; } }, true);
  document.addEventListener('click', async function (e) {
    var f = e.target.closest && e.target.closest('.pr-filter button');
    if (f) { filter = f.dataset.filter; render(); return; }
    var pray = e.target.closest && e.target.closest('.pr-pray');
    if (pray) {
      pray.disabled = true;
      try { var out = await api('POST', API, { action: 'pray', id: pray.dataset.pray }); var p = data.prayers.filter(function (x) { return x.id === pray.dataset.pray; })[0]; if (p) { p.count = out.count; p.prayed = out.prayed; } render(); }
      catch (err) { pray.disabled = false; }
      return;
    }
    var edit = e.target.closest && e.target.closest('.pr-edit');
    if (edit) { editingId = edit.dataset.edit; openIds[editingId] = 1; render(); return; }
    if (e.target.closest && e.target.closest('.pr-cancel')) { editingId = null; render(); return; }
    var save = e.target.closest && e.target.closest('.pr-save');
    if (save) {
      var f = save.closest('.pr-editform'), title = f.querySelector('.pe-title').value.trim(), text = f.querySelector('.pe-text').value.trim();
      if (!title && !text) return;
      save.disabled = true;
      try { var done = await api('POST', API + '?all=1', { action: 'edit', id: save.dataset.save, title: title, text: text, anonymous: f.querySelector('.pe-anon').checked }); data = { prayers: done.prayers || [], total: done.total || 0 }; editingId = null; render(); }
      catch (err) { save.disabled = false; }
      return;
    }
    var del = e.target.closest && e.target.closest('.pr-del');
    if (del) {
      if (!confirm(t('delConfirm'))) return;
      try { var res = await api('DELETE', API + '?all=1&id=' + encodeURIComponent(del.dataset.del)); data = { prayers: res.prayers || [], total: res.total || 0 }; render(); } catch (err) { /* 목록은 그대로 */ }
    }
  });
  $('prSearch').addEventListener('input', function () { query = this.value; render(); });
  $('prForm').addEventListener('submit', async function (event) {
    event.preventDefault(); $('prError').textContent = '';
    var title = $('prTitle').value.trim(), text = $('prText').value.trim();
    if (!title && !text) { $('prError').textContent = t('needTitle'); return; }
    var btn = $('prPost'); btn.disabled = true; btn.textContent = t('posting');
    try {
      var out = await api('POST', API + '?all=1', { title: title, text: text, anonymous: $('prAnon').checked });
      data = { prayers: out.prayers || [], total: out.total || 0 };
      $('prTitle').value = ''; $('prText').value = ''; $('prAnon').checked = false; render();
    } catch (err) { $('prError').textContent = err.message; }
    btn.disabled = false; btn.textContent = t('post');
  });
  function setLang(next) { if (next === lang) return; lang = next; try { localStorage.setItem('wolkoCarLang', lang); } catch (e) { /* 저장 못 해도 이 화면은 바뀐다 */ } render(); }
  $('langKoBtn').addEventListener('click', function () { setLang('ko'); });
  $('langEnBtn').addEventListener('click', function () { setLang('en'); });
  $('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault(); $('loginError').textContent = '';
    try {
      var res = await fetch('/api/hub/account-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }) });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(body.error || t('loginFail'));
      sessionStorage.setItem(TOKEN_KEY, body.hubToken); $('loginPassword').value = '';
      show('loading'); await load();
    } catch (error) { $('loginError').textContent = error.message; }
  });

  applyText();
  if (sessionStorage.getItem(TOKEN_KEY)) { show('loading'); load(); } else { show('login'); }
})();
