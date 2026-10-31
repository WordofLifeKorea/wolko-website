/* 캠프 도우미 — 오른쪽 아래 캐릭터를 누르면 작은 챗이 열린다.
   · 자주 묻는 질문(고정)은 미리 만든 「화면 안내」를 바로 시작한다 (AI 를 쓰지 않아 즉시·무료·정확)
   · 그 밖의 질문은 서버의 AI 가 사용법으로 답하고, 맞는 화면 안내가 있으면 버튼으로 권한다
   · 화면 안내: 화면이 살짝 어두워지고 눌러야 할 곳이 밝게 빛나며 화살표가 나온다. 화면(페이지)이 바뀌어도 대화와 안내 진행을 저장해 두었다가 이어서 보여 준다
   포털의 자료는 읽지 않는다(1단계). 대화는 이 브라우저 탭(sessionStorage)에만 둔다. */
(function () {
  var CT = window.CT, G = window.CTGuides; if (!CT || !G || document.getElementById('ctAsst')) return;
  CT.addDict({
    ko: { asstName: '캠프 도우미', asstHello: '안녕하세요! 캠프팀 도우미예요. 아래에서 고르거나, 궁금한 걸 그냥 물어보세요.', asstFreq: '자주 묻는 질문', asstPh: '궁금한 걸 물어보세요', asstSend: '보내기', asstNew: '새 대화', asstClose: '닫기',
      asstThinking: '생각하는 중…', asstShow: '👉 화면에서 보여 드릴게요', asstNext: '다음', asstStop: '그만하기', asstDone: '다 끝났어요! 더 궁금한 게 있으면 물어보세요.', asstStopped: '안내를 멈췄어요. 필요하면 다시 눌러 주세요.',
      asstMenu: '먼저 이 메뉴 버튼을 눌러 메뉴를 열어요', asstMissing: '이 버튼이 화면에 안 보여요. 이 계정에 권한이 없거나 화면이 아직 열리는 중일 수 있어요. 위 설명대로 해 보시고, 안 되면 「다음」을 눌러 주세요.',
      asstStarting: '화면에서 보여 드릴게요.', asstFail: '지금은 답을 드리지 못했어요. 잠시 뒤 다시 물어봐 주세요.', asstOff: 'AI 도우미가 아직 켜지지 않았어요. 위의 자주 묻는 질문은 쓸 수 있어요.', asstStep: function (i, n) { return i + ' / ' + n; } },
    en: { asstName: 'Camp helper', asstHello: "Hi! I'm the Camp Team helper. Pick a question below or just ask.", asstFreq: 'Common questions', asstPh: 'Ask anything', asstSend: 'Send', asstNew: 'New chat', asstClose: 'Close',
      asstThinking: 'Thinking…', asstShow: '👉 Show me on screen', asstNext: 'Next', asstStop: 'Stop', asstDone: 'All done! Ask me if you have more questions.', asstStopped: 'Guide stopped. Tap it again any time.',
      asstMenu: 'First click this menu button to open the menu', asstMissing: "I can't see this button on screen. Your account may not have permission, or the page is still loading. Follow the description above, or click Next.",
      asstStarting: "I'll show you on screen.", asstFail: "I couldn't answer right now. Please try again in a moment.", asstOff: 'The AI helper is not turned on yet. The common questions above still work.', asstStep: function (i, n) { return i + ' / ' + n; } }
  });
  var KEY = 'ct-asst', esc = CT.esc, tr = function (o) { return o ? (o[CT.lang()] || o.ko || '') : ''; };
  var st = (function () { try { var v = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') return { open: !!v.open, msgs: Array.isArray(v.msgs) ? v.msgs.slice(-24) : [], guide: v.guide && G.guides[v.guide.id] ? v.guide : null }; } catch (e) {} return { open: false, msgs: [], guide: null }; })();
  var cfg = { member: false, configured: false }, busy = false;
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify({ open: st.open, msgs: st.msgs.slice(-24), guide: st.guide })); } catch (e) {} }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var norm = function (p) { return String(p || '').replace(/\/+$/, '') || '/'; };

  /* ---------- 화면 틀 ---------- */
  var MASCOT = '<svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="31" r="22" fill="#fff"/><circle cx="28" cy="31" r="20" fill="#1f8fa6"/><path d="M28 3 46 22H10z" fill="#f6c453" stroke="#c89a1c" stroke-width="1.6" stroke-linejoin="round"/><path d="M28 3v19" stroke="#c89a1c" stroke-width="1.2" opacity=".5"/><circle cx="21" cy="32" r="3.2" fill="#fff"/><circle cx="35" cy="32" r="3.2" fill="#fff"/><circle cx="21.8" cy="32.7" r="1.5" fill="#0b2430"/><circle cx="35.8" cy="32.7" r="1.5" fill="#0b2430"/><path d="M22 39q6 5 12 0" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>';
  var root = document.createElement('div'); root.id = 'ctAsst'; root.hidden = true;
  root.innerHTML = '<button type="button" class="asst-fab" id="asstFab" aria-expanded="false">' + MASCOT + '</button>' +
    '<section class="asst-panel" id="asstPanel" role="dialog" aria-modal="false" hidden><header><span class="asst-av">' + MASCOT + '</span><b id="asstTitle"></b><span class="sp"></span><button type="button" id="asstNew" class="asst-hb"></button><button type="button" id="asstX" class="asst-hb" aria-label="close">✕</button></header>' +
    '<div class="asst-body" id="asstBody"></div><form class="asst-form" id="asstForm"><input id="asstIn" maxlength="300" autocomplete="off"><button type="submit" id="asstSend"></button></form></section>';
  document.body.appendChild(root);
  var fab = $('#asstFab'), panel = $('#asstPanel'), body = $('#asstBody'), input = $('#asstIn');

  function paintStatic() { fab.setAttribute('aria-label', CT.t('asstName')); fab.title = CT.t('asstName'); $('#asstTitle').textContent = CT.t('asstName'); $('#asstNew').textContent = CT.t('asstNew'); $('#asstX').title = CT.t('asstClose'); input.placeholder = CT.t('asstPh'); $('#asstSend').textContent = CT.t('asstSend'); }
  function bubble(m) { return '<div class="asst-msg ' + (m.r === 'u' ? 'u' : 'a') + '">' + esc(m.t).replace(/\n/g, '<br>') + (m.g && G.guides[m.g] ? '<button type="button" class="asst-go" data-g="' + esc(m.g) + '">' + esc(CT.t('asstShow')) + '</button>' : '') + '</div>'; }
  function starters() { return '<div class="asst-st"><small>' + esc(CT.t('asstFreq')) + '</small><div>' + G.starters.map(function (id) { return '<button type="button" class="asst-chip" data-g="' + id + '">' + esc(tr(G.guides[id].title)) + '</button>'; }).join('') + '</div></div>'; }
  function render() {
    paintStatic(); panel.hidden = !st.open; fab.setAttribute('aria-expanded', st.open ? 'true' : 'false'); root.classList.toggle('guiding', !!st.guide);
    body.innerHTML = '<div class="asst-msg a">' + esc(CT.t('asstHello')) + '</div>' + starters() + st.msgs.map(bubble).join('') + (busy ? '<div class="asst-msg a asst-typing">' + esc(CT.t('asstThinking')) + '</div>' : '') + (cfg.configured ? '' : '<div class="asst-note">' + esc(CT.t('asstOff')) + '</div>');
    $('#asstForm').classList.toggle('off', !cfg.configured); input.disabled = !cfg.configured || busy;
    body.scrollTop = body.scrollHeight;
  }
  function add(r, t, g) { st.msgs.push({ r: r, t: String(t || ''), g: g || '' }); if (st.msgs.length > 24) st.msgs.shift(); save(); }
  function setOpen(v) { st.open = !!v; save(); render(); if (st.open && cfg.configured) setTimeout(function () { input.focus(); }, 50); }

  /* ---------- 질문하기 (AI) ---------- */
  async function ask(q) {
    q = String(q || '').trim(); if (!q || busy) return; add('u', q); busy = true; render();
    var msgs = st.msgs.filter(function (m) { return m.t; }).slice(-8).map(function (m) { return { role: m.r === 'u' ? 'user' : 'assistant', content: m.t }; });
    try {
      var r = await CT.api('/api/campteam/assistant', { method: 'POST', body: { messages: msgs, path: location.pathname, lang: CT.lang() } });
      add('a', r.reply, r.guide);
    } catch (e) { add('a', (e && e.message) || CT.t('asstFail')); }
    busy = false; render();
  }

  /* ---------- 화면 안내 (어두워지고, 눌러야 할 곳이 밝게 + 화살표) ---------- */
  var layer = null, host = null, hl = null, tip = null, arrow = null, tgt = null, raf = 0, tick = 0, since = 0, lastSig = '', clickEl = null;
  function visible(el) { if (!el || !el.getBoundingClientRect) return false; var r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; }
  function findVisible(sel) { try { var l = document.querySelectorAll(sel); for (var i = 0; i < l.length; i++) if (visible(l[i])) return l[i]; } catch (e) {} return null; }
  function clearLayer() { if (layer && layer.parentNode) layer.parentNode.removeChild(layer); layer = host = hl = tip = arrow = tgt = null; lastSig = ''; if (clickEl) { clickEl.removeEventListener('click', onTargetClick, true); clickEl = null; } }
  function stopLoop() { cancelAnimationFrame(raf); clearInterval(tick); raf = tick = 0; document.removeEventListener('keydown', onKey, true); clearLayer(); }
  function onKey(e) { if (e.key === 'Escape' && st.guide) endGuide(false); }
  function currentStep() { var g = st.guide && G.guides[st.guide.id]; return g ? g.steps[st.guide.i] : null; }
  function advance() { if (!st.guide) return; st.guide.i++; since = Date.now(); save(); if (!currentStep()) endGuide(true); else { clearLayer(); update(); } }
  function onTargetClick() { var i = st.guide && st.guide.i; setTimeout(function () { if (st.guide && st.guide.i === i) advance(); }, 350); }
  function startGuide(id, i) {
    if (!G.guides[id]) return; stopLoop(); st.guide = { id: id, i: i || 0 }; st.open = false; save(); render(); since = Date.now(); begin();
  }
  function begin() {
    document.addEventListener('keydown', onKey, true); tick = setInterval(update, 250); update();
    (function frame() { place(); raf = requestAnimationFrame(frame); })();
  }
  function endGuide(done) { stopLoop(); var had = !!st.guide; st.guide = null; if (had) add('a', CT.t(done ? 'asstDone' : 'asstStopped')); st.open = had; save(); render(); }
  /** 지금 단계에서 가리킬 곳과 설명을 정한다: 다른 화면이면 왼쪽 메뉴, 메뉴가 닫힌 폰이면 메뉴 버튼 */
  function resolve(step) {
    var onPage = !step.path || norm(location.pathname) === norm(step.path);
    if (!onPage) { var link = findVisible('.nav a[href="' + step.path + '"]'); if (link) return { el: link, text: tr(G.nav[step.path]), mode: 'nav' }; var mb = findVisible('#menuBtn'); return { el: mb, text: CT.t('asstMenu'), mode: 'menu' }; }
    var el = findVisible(step.sel);
    if (!el && /\.nav |\.gsearch|\.lang/.test(step.sel)) { var m2 = findVisible('#menuBtn'); if (m2 && !findVisible('#drawer.open')) return { el: m2, text: CT.t('asstMenu'), mode: 'menu' }; }
    return { el: el, text: tr(step.text), mode: 'target' };
  }
  function mount(h) { if (layer && host === h) return; if (layer && layer.parentNode) layer.parentNode.removeChild(layer); host = h; layer = document.createElement('div'); layer.className = 'asst-layer'; layer.innerHTML = '<div class="asst-hl"></div><div class="asst-tip" role="status" aria-live="polite"><i class="asst-arrow"></i><p></p><div class="asst-tb"><span class="asst-cnt"></span><span class="sp"></span><button type="button" class="asst-tb-stop"></button><button type="button" class="asst-tb-next"></button></div></div>'; host.appendChild(layer); hl = layer.querySelector('.asst-hl'); tip = layer.querySelector('.asst-tip'); arrow = layer.querySelector('.asst-arrow');
    tip.querySelector('.asst-tb-stop').onclick = function () { endGuide(false); }; tip.querySelector('.asst-tb-next').onclick = function () { advance(); }; }
  function update() {
    var step = currentStep(); if (!step) { if (st.guide) endGuide(true); return; }
    var r = resolve(step), g = G.guides[st.guide.id], waited = Date.now() - since;
    if (!r.el && step.optional && waited > 2500) { advance(); return; }
    tgt = r.el; var h = (r.el && r.el.closest && r.el.closest('dialog[open]')) || document.body; mount(h);
    var sig = [st.guide.id, st.guide.i, r.mode, !!r.el, r.text, CT.lang()].join('|');
    if (sig !== lastSig) {
      lastSig = sig; var miss = !r.el && waited > 3500;
      tip.querySelector('p').innerHTML = esc(r.text) + (miss ? '<br><small>' + esc(CT.t('asstMissing')) + '</small>' : '');
      tip.querySelector('.asst-cnt').textContent = CT.t('asstStep')(st.guide.i + 1, g.steps.length);
      tip.querySelector('.asst-tb-stop').textContent = CT.t('asstStop'); var nx = tip.querySelector('.asst-tb-next'); nx.textContent = CT.t('asstNext'); nx.hidden = r.mode === 'nav' || r.mode === 'menu';
      layer.classList.toggle('nohl', !r.el);
      if (clickEl && clickEl !== r.el) { clickEl.removeEventListener('click', onTargetClick, true); clickEl = null; }
      if (r.el && r.mode === 'target' && clickEl !== r.el) { clickEl = r.el; r.el.addEventListener('click', onTargetClick, true); }
      if (r.el) { var rc = r.el.getBoundingClientRect(); if (rc.top < 70 || rc.bottom > innerHeight - 70) r.el.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    }
  }
  function place() {
    if (!layer || !tip) return;
    if (!tgt || !visible(tgt)) { hl.style.display = 'none'; arrow.style.display = 'none'; tip.style.left = Math.max(8, (innerWidth - tip.offsetWidth) / 2) + 'px'; tip.style.top = Math.max(8, innerHeight - tip.offsetHeight - 90) + 'px'; return; }
    var r = tgt.getBoundingClientRect(), pad = 6; hl.style.display = ''; arrow.style.display = '';
    hl.style.left = r.left - pad + 'px'; hl.style.top = r.top - pad + 'px'; hl.style.width = r.width + pad * 2 + 'px'; hl.style.height = r.height + pad * 2 + 'px';
    var tw = tip.offsetWidth, th = tip.offsetHeight, below = r.bottom + pad + 14 + th <= innerHeight - 8 || r.top - pad - 14 - th < 8;
    var top = below ? r.bottom + pad + 12 : r.top - pad - 12 - th, left = Math.min(Math.max(8, r.left + r.width / 2 - tw / 2), Math.max(8, innerWidth - tw - 8));
    tip.style.left = left + 'px'; tip.style.top = Math.max(8, top) + 'px';
    arrow.style.left = Math.min(Math.max(14, r.left + r.width / 2 - left - 7), tw - 28) + 'px'; arrow.className = 'asst-arrow ' + (below ? 'up' : 'down');
  }

  /* ---------- 이벤트 ---------- */
  fab.onclick = function () { setOpen(!st.open); };
  $('#asstX').onclick = function () { setOpen(false); };
  $('#asstNew').onclick = function () { st.msgs = []; save(); render(); };
  $('#asstForm').onsubmit = function (e) { e.preventDefault(); var q = input.value; input.value = ''; ask(q); };
  body.addEventListener('click', function (e) {
    var b = e.target.closest('[data-g]'); if (!b) return; var id = b.dataset.g; if (!G.guides[id]) return;
    if (b.classList.contains('asst-chip')) { add('u', tr(G.guides[id].title)); add('a', CT.t('asstStarting'), ''); }
    startGuide(id, 0);
  });
  document.addEventListener('ct-lang', function () { render(); lastSig = ''; });

  /* ---------- 시작: 팀원이면 캐릭터를 보이고, 안내 중이던 것이 있으면 이어서 ---------- */
  render();
  CT.api('/api/campteam/assistant').then(function (r) {
    cfg = { member: !!r.member, configured: !!r.configured }; if (!cfg.member) return;
    root.hidden = false; render();
    if (st.guide) { since = Date.now(); begin(); }
  }).catch(function () {});
})();
