/* 루미(캠프팀 AI 도우미) — 오른쪽 아래 루미를 누르면 작은 챗이 열린다. 루미는 상태(인사·듣는 중·답변 중·찾는 중·완료·모름…)에 따라 표정이 바뀐다.
   · 고정 질문(assistant-faq.js)은 루미가 인사한 뒤 단계별로 이어서 보여 준다 — 질문을 고르면 답과 함께 하위 질문이 나오고, 화면 안내가 있으면 바로 시작한다 (AI 를 쓰지 않아 즉시·무료·정확)
   · 그 밖의 질문은 서버의 AI 가 사용법으로 답하고, 맞는 화면 안내가 있으면 버튼으로 권한다
   · 화면 안내: 화면이 살짝 어두워지고 눌러야 할 곳이 밝게 빛나며 화살표가 나온다. 화면(페이지)이 바뀌어도 대화와 안내 진행을 저장해 두었다가 이어서 보여 준다
   포털의 자료는 읽지 않는다(1단계). 대화는 이 브라우저 탭(sessionStorage)에만 둔다. */
(function () {
  var CT = window.CT, G = window.CTGuides, F = window.CTFaq; if (!CT || !G || !F || document.getElementById('ctAsst')) return;
  CT.addDict({
    ko: { asstName: '루미', asstHello: '안녕하세요, 루미예요! 캠프팀 포털을 안내해 드려요. 궁금한 걸 골라 주세요. 직접 물어보셔도 돼요.', asstRoot: '↩ 처음 질문으로', asstMore: '이어서 궁금한 게 있나요?', asstPh: '궁금한 걸 물어보세요', asstSend: '보내기', asstNew: '새 대화', asstClose: '닫기',
      asstThinking: '생각하는 중…', asstShow: '👉 화면에서 보여 드릴게요', asstNext: '다음', asstStop: '그만하기', asstDone: '다 끝났어요! 더 궁금한 게 있으면 물어보세요.', asstStopped: '안내를 멈췄어요. 필요하면 다시 눌러 주세요.',
      asstMenu: '먼저 이 메뉴 버튼을 눌러 메뉴를 열어요', asstMissing: '이 버튼이 화면에 안 보여요. 이 계정에 권한이 없거나 화면이 아직 열리는 중일 수 있어요. 위 설명대로 해 보시고, 안 되면 「다음」을 눌러 주세요.',
      asstStarting: '화면에서 보여 드릴게요.', asstFail: '지금은 답을 드리지 못했어요. 잠시 뒤 다시 물어봐 주세요.', asstOff: 'AI 도우미가 아직 켜지지 않았어요. 위의 자주 묻는 질문은 쓸 수 있어요.', asstStep: function (i, n) { return i + ' / ' + n; },
      asstModeHelp: '💡 도움말', asstModeFind: '🔎 찾기', asstModeDo: '✍ 부탁', asstPhFind: '예: 보험 가입은 누가 맡았어요?', asstPhDo: '예: 6월 20일까지 버스 예약 업무 추가해줘', asstSources: '출처', asstNoFind: '포털에서 관련 자료를 찾지 못했어요. 다른 말로 물어보거나 위쪽 검색창을 써 보세요.',
      asstProp: '이렇게 추가할까요?', asstConfirm: '확인하고 추가', asstCancel: '취소', asstAdded: '추가했어요! 🎉', asstCanceled: '취소했어요. 아무것도 바뀌지 않았어요.', asstNoProp: '업무나 일정을 추가해 달라는 부탁으로 이해하지 못했어요. 예: 「내일까지 보험 가입 업무 추가해줘」', asstNoPerm: '이 계정에는 업무·일정을 만들 권한이 없어요.', asstKTask: '업무', asstKEvent: '일정', asstFDue: '기한', asstFDate: '날짜', asstFPlace: '장소', asstFOwner: '담당', asstHelpNote: '찾기·부탁은 포털 자료를 AI 에게 보내 답을 만들어요(볼 수 있는 자료만, 금액·연락처 전화는 제외).' },
    en: { asstName: 'Lumi', asstHello: "Hi, I'm Lumi! I'll guide you around the Camp Team portal. Pick a question, or just ask me.", asstRoot: '↩ Back to the start', asstMore: 'Anything else?', asstPh: 'Ask anything', asstSend: 'Send', asstNew: 'New chat', asstClose: 'Close',
      asstThinking: 'Thinking…', asstShow: '👉 Show me on screen', asstNext: 'Next', asstStop: 'Stop', asstDone: 'All done! Ask me if you have more questions.', asstStopped: 'Guide stopped. Tap it again any time.',
      asstMenu: 'First click this menu button to open the menu', asstMissing: "I can't see this button on screen. Your account may not have permission, or the page is still loading. Follow the description above, or click Next.",
      asstStarting: "I'll show you on screen.", asstFail: "I couldn't answer right now. Please try again in a moment.", asstOff: 'The AI helper is not turned on yet. The common questions above still work.', asstStep: function (i, n) { return i + ' / ' + n; },
      asstModeHelp: '💡 Help', asstModeFind: '🔎 Find', asstModeDo: '✍ Ask me to', asstPhFind: 'e.g. Who took care of insurance?', asstPhDo: 'e.g. Add a task: book the bus by June 20', asstSources: 'Sources', asstNoFind: 'I could not find anything about that in the portal. Try other words or the search box at the top.',
      asstProp: 'Add it like this?', asstConfirm: 'Confirm and add', asstCancel: 'Cancel', asstAdded: 'Added! 🎉', asstCanceled: 'Canceled. Nothing was changed.', asstNoProp: 'I could not understand that as a request to add a task or event. Try: "Add a task: insurance by tomorrow"', asstNoPerm: 'This account cannot create tasks or events.', asstKTask: 'Task', asstKEvent: 'Event', asstFDue: 'Due', asstFDate: 'Date', asstFPlace: 'Place', asstFOwner: 'Owner', asstHelpNote: 'Find and Ask-me-to send portal data to the AI to write an answer (only what you can see; money and contact phone numbers are excluded).' }
  });
  var KEY = 'ct-asst', esc = CT.esc, tr = function (o) { return o ? (o[CT.lang()] || o.ko || '') : ''; };
  // (20분 넘게 멈춘 안내는 이어가지 않는다 — 나중에 다른 화면에서 불쑥 나오지 않게)
  var st = (function () { try { var v = JSON.parse(sessionStorage.getItem(KEY) || 'null'); if (v && typeof v === 'object') return { open: !!v.open, msgs: Array.isArray(v.msgs) ? v.msgs.slice(-24) : [], guide: v.guide && G.guides[v.guide.id] && Date.now() - (v.guide.at || 0) < 20 * 60000 ? v.guide : null, mode: ['find', 'do'].indexOf(v.mode) >= 0 ? v.mode : 'help' }; } catch (e) {} return { open: false, msgs: [], guide: null, mode: 'help' }; })();
  var cfg = { member: false, configured: false }, busy = false;
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify({ open: st.open, msgs: st.msgs.slice(-24), guide: st.guide, mode: st.mode })); } catch (e) {} }
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var norm = function (p) { return String(p || '').replace(/\/+$/, '') || '/'; };

  /* ---------- 화면 틀 ---------- */
  /* 루미 픽셀 그림: /portal/campteam/lumi/lumi-<상태>-<light|dark>.png (확대하지 않고 image-rendering: pixelated). 밝은 바탕(떠 있는 버튼)은 light, 어두운 머리글은 dark */
  var LUMI_STATES = ['idle', 'blink', 'hello', 'listen', 'talk', 'explain', 'search', 'found', 'unknown', 'success', 'error', 'sleep', 'portrait'];
  var lumiSrc = function (state, mode) { return '/portal/campteam/lumi/lumi-' + state + '-' + (mode || 'light') + '.png'; };
  var lumiImg = function (state, mode, cls) { return '<img class="lumi ' + (cls || '') + '" data-lumi="' + state + '" data-mode="' + (mode || 'light') + '" src="' + lumiSrc(state, mode) + '" alt="" width="64" height="64" draggable="false">'; };
  /** 밝은 낮에는 light, 어두운 밤(메뉴 색·하늘 배경이 어두워질 때)에는 dark — 포털의 하루 색(--ws-night: 0 낮 ~ 1 깊은 밤, rail-sky.js 가 해 시각으로 계산)을 그대로 따른다 */
  var nightMode = function () { var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ws-night')); return v >= 0.5 ? 'dark' : 'light'; };
  var mood = 'idle', moodTimer = 0, blinkTimer = 0, reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  var root = document.createElement('div'); root.id = 'ctAsst'; root.hidden = true;
  root.innerHTML = '<button type="button" class="asst-fab" id="asstFab" aria-expanded="false"><span class="asst-fab-lb" id="asstLb"></span>' + lumiImg('idle', nightMode(), 'fab-img') + '</button>' +
    '<section class="asst-panel" id="asstPanel" role="dialog" aria-modal="false" hidden><header><span class="asst-av">' + lumiImg('portrait', 'dark', 'av-img') + '</span><b id="asstTitle"></b><span class="sp"></span><button type="button" id="asstNew" class="asst-hb"></button><button type="button" id="asstX" class="asst-hb" aria-label="close">✕</button></header><div class="asst-modes" id="asstModes"></div>' +
    '<div class="asst-body" id="asstBody"></div><form class="asst-form" id="asstForm"><input id="asstIn" maxlength="300" autocomplete="off"><button type="submit" id="asstSend"></button></form></section>';
  document.body.appendChild(root);
  var fab = $('#asstFab'), panel = $('#asstPanel'), body = $('#asstBody'), input = $('#asstIn');

  function paintStatic() { $('#asstLb').textContent = CT.t('asstName'); fab.setAttribute('aria-label', CT.t('asstName')); fab.title = CT.t('asstName'); $('#asstTitle').textContent = CT.t('asstName'); $('#asstNew').textContent = CT.t('asstNew'); $('#asstX').title = CT.t('asstClose'); input.placeholder = CT.t(st.mode === 'find' ? 'asstPhFind' : st.mode === 'do' ? 'asstPhDo' : 'asstPh'); $('#asstSend').textContent = CT.t('asstSend'); $('#asstModes').innerHTML = [['help', 'asstModeHelp'], ['find', 'asstModeFind'], ['do', 'asstModeDo']].map(function (m) { return '<button type="button" class="asst-mode' + (st.mode === m[0] ? ' on' : '') + '" data-mode="' + m[0] + '">' + esc(CT.t(m[1])) + '</button>'; }).join(''); }
  function bubble(m, last) {
    var txt = '<div class="asst-b">' + esc(m.t).replace(/\n/g, '<br>') + srcHtml(m) + propHtml(m) + (m.g && G.guides[m.g] ? '<button type="button" class="asst-go" data-g="' + esc(m.g) + '">' + esc(CT.t('asstShow')) + '</button>' : '') + '</div>';
    if (m.r === 'u') return '<div class="asst-msg u">' + txt + '</div>';
    return '<div class="asst-msg a"><span class="asst-mav">' + lumiImg(m.s || 'explain', 'light', 'mav-img') + '</span>' + txt + '</div>' + (last && m.o && m.o.length ? chips(m.o) : '');
  }
  function srcHtml(m) { return m.src && m.src.length ? '<div class="asst-src"><small>' + esc(CT.t('asstSources')) + '</small>' + m.src.map(function (x) { return '<a class="asst-srcl" href="' + esc(x.url) + '">' + esc(x.title || x.type) + '</a>'; }).join('') + '</div>' : ''; }
  function propHtml(m) {
    var p = m.p; if (!p) return '';
    var rows = p.type === 'addTask' ? [[CT.t('asstKTask'), p.title], [CT.t('asstFDue'), p.dueDate], [CT.t('asstFOwner'), p.ownerName]] : [[CT.t('asstKEvent'), p.title], [CT.t('asstFDate'), p.startDate + (p.endDate ? ' ~ ' + p.endDate : '') + (p.startTime ? ' ' + p.startTime + (p.endTime ? '–' + p.endTime : '') : '')], [CT.t('asstFPlace'), p.location]];
    return '<div class="asst-prop"><b>' + esc(p.say || CT.t('asstProp')) + '</b>' + rows.filter(function (r) { return r[1]; }).map(function (r) { return '<div><small>' + esc(r[0]) + '</small> ' + esc(r[1]) + '</div>'; }).join('') + (m.pd ? '<div class="asst-pd">' + esc(CT.t(m.pd === 'ok' ? 'asstAdded' : 'asstCanceled')) + '</div>' : '<div class="asst-pb"><button type="button" class="asst-go" data-pc="1">' + esc(CT.t('asstConfirm')) + '</button><button type="button" class="asst-chip" data-px="1">' + esc(CT.t('asstCancel')) + '</button></div>') + '</div>';
  }
  /** 고정 질문 칩들(루미가 보여 주는 다음 질문) — 맨 마지막 루미 말풍선 아래에만 보인다 */
  function chips(ids) { return '<div class="asst-st">' + ids.filter(function (id) { return id === 'root' || F.nodes[id]; }).map(function (id) { return id === 'root' ? '<button type="button" class="asst-chip home" data-faq="root">' + esc(CT.t('asstRoot')) + '</button>' : '<button type="button" class="asst-chip" data-faq="' + id + '">' + esc(tr(F.nodes[id].q)) + '</button>'; }).join('') + '</div>'; }
  function render() {
    paintStatic(); panel.hidden = !st.open; fab.setAttribute('aria-expanded', st.open ? 'true' : 'false'); root.classList.toggle('guiding', !!st.guide);
    if (!st.msgs.length) greet();
    var lastA = -1; st.msgs.forEach(function (m, i) { if (m.r === 'a') lastA = i; });
    body.innerHTML = st.msgs.map(function (m, i) { return bubble(m, i === lastA && !busy); }).join('') + (busy ? '<div class="asst-msg a asst-typing"><span class="asst-mav">' + lumiImg('talk', 'light', 'mav-img') + '</span><div class="asst-b">' + esc(CT.t('asstThinking')) + '</div></div>' : '') + (cfg.configured ? '' : '<div class="asst-note">' + esc(CT.t('asstOff')) + '</div>');
    $('#asstForm').classList.toggle('off', !cfg.configured); input.disabled = !cfg.configured || busy;
    body.scrollTop = body.scrollHeight;
  }
  function add(r, t, g, o, state, extra) { var m = { r: r, t: String(t || ''), g: g || '', o: o || null, s: state || '' }; if (extra) Object.keys(extra).forEach(function (k) { m[k] = extra[k]; }); st.msgs.push(m); if (st.msgs.length > 40) st.msgs.shift(); save(); }
  /** 루미가 먼저 인사하고 맨 위 질문들을 보여 준다 */
  function greet() { st.msgs.push({ r: 'a', t: CT.t('asstHello'), g: '', o: F.root.slice(), s: 'hello' }); save(); }
  /** 고정 질문 하나를 고르면: 질문(내 말풍선) → 루미의 답 + 하위 질문(없으면 형제 질문) 이 자동으로 이어진다 */
  function pickFaq(id) {
    if (id === 'root') { add('u', CT.t('asstRoot')); st.msgs.push({ r: 'a', t: CT.t('asstHello'), g: '', o: F.root.slice(), s: 'hello' }); save(); setMood('hello', 2200); render(); return; }
    var nd = F.nodes[id]; if (!nd) return;
    var next = nd.next.length ? nd.next.slice() : siblings(id);
    add('u', tr(nd.q)); add('a', tr(nd.a), nd.guide || '', next.concat(['root']), nd.guide ? 'found' : 'explain'); setMood(nd.guide ? 'found' : 'explain', 2600); render();
  }
  function siblings(id) { var out = null; Object.keys(F.nodes).concat(['__root']).some(function (k) { var list = k === '__root' ? F.root : F.nodes[k].next; if (list.indexOf(id) >= 0) { out = list.filter(function (x) { return x !== id; }); return true; } return false; }); return out || []; }
  /* 루미 표정: 상태를 잠깐 바꿨다가 기본(idle)으로 돌아온다. idle 일 때는 3~6초마다 눈을 깜빡인다 */
  function setMood(m, ms) { mood = LUMI_STATES.indexOf(m) >= 0 ? m : 'idle'; paintMood(); clearTimeout(moodTimer); if (ms && mood !== 'idle') moodTimer = setTimeout(function () { mood = baseMood(); paintMood(); }, ms); }
  function baseMood() { return !cfg.configured ? 'sleep' : st.guide ? 'search' : busy ? 'talk' : 'idle'; }
  function paintMood() { var im = $('.fab-img', root); if (!im) return; var want = lumiSrc(mood, nightMode()); if (im.getAttribute('src') !== want) { im.dataset.lumi = mood; im.dataset.mode = nightMode(); im.src = want; } root.dataset.mode = nightMode(); }
  function blinkLoop() { clearTimeout(blinkTimer); blinkTimer = setTimeout(function () { if (!reduce && mood === 'idle') { var im = $('.fab-img', root); if (im) { im.src = lumiSrc('blink', nightMode()); setTimeout(function () { if (mood === 'idle') im.src = lumiSrc('idle', nightMode()); }, 130); } } blinkLoop(); }, 3000 + Math.random() * 3000); }
  function setOpen(v) { st.open = !!v; save(); render(); if (st.open) setMood('hello', 2200); else setMood(baseMood()); if (st.open && cfg.configured) setTimeout(function () { input.focus(); }, 50); }

  /* ---------- 질문하기 (AI) ---------- */
  async function ask(q) {
    q = String(q || '').trim(); if (!q || busy) return; add('u', q); busy = true; setMood('talk'); render();
    if (st.mode === 'find' || st.mode === 'do') {
      try {
        if (st.mode === 'find') { var f = await CT.api('/api/campteam/ask', { method: 'POST', body: { question: q, lang: CT.lang() } }); busy = false; if (!f.found) add('a', CT.t('asstNoFind'), '', ['root'], 'unknown'), setMood('unknown', 2800); else add('a', f.answer, '', ['root'], 'found', { src: f.sources }), setMood('found', 2800); }
        else { var a = await CT.api('/api/campteam/ask', { method: 'POST', body: { action: 'act', text: q, lang: CT.lang() } }); busy = false; if (!a.proposal) add('a', CT.t(a.reason === 'no_permission' ? 'asstNoPerm' : 'asstNoProp'), '', ['root'], 'unknown'), setMood('unknown', 2800); else add('a', '', '', null, 'explain', { p: a.proposal }), setMood('explain', 2800); }
      } catch (e) { busy = false; add('a', (e && e.message) || CT.t('asstFail'), '', ['root'], 'error'); setMood('error', 2800); }
      busy = false; render(); return;
    }
    var msgs = st.msgs.filter(function (m) { return m.t; }).slice(-8).map(function (m) { return { role: m.r === 'u' ? 'user' : 'assistant', content: m.t }; });
    try {
      var r = await CT.api('/api/campteam/assistant', { method: 'POST', body: { messages: msgs, path: location.pathname, lang: CT.lang() } });
      busy = false; add('a', r.reply, r.guide, ['root'], r.guide ? 'found' : 'explain'); setMood(r.guide ? 'found' : 'explain', 2800);
    } catch (e) { busy = false; add('a', (e && e.message) || CT.t('asstFail'), '', ['root'], 'error'); setMood('error', 2800); }
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
  function advance() { if (!st.guide) return; st.guide.i++; st.guide.at = Date.now(); since = Date.now(); save(); if (!currentStep()) endGuide(true); else { clearLayer(); update(); } }
  function onTargetClick() { var i = st.guide && st.guide.i; setTimeout(function () { if (st.guide && st.guide.i === i) advance(); }, 350); }
  function startGuide(id, i) {
    if (!G.guides[id]) return; stopLoop(); setMood('search'); st.guide = { id: id, i: i || 0, at: Date.now() }; st.open = false; save(); render(); since = Date.now(); begin();
  }
  function begin() {
    document.addEventListener('keydown', onKey, true); tick = setInterval(update, 250); update();
    (function frame() { place(); raf = requestAnimationFrame(frame); })();
  }
  function endGuide(done) { stopLoop(); var had = !!st.guide; st.guide = null; setMood(done ? 'success' : baseMood(), 3000); if (had) add('a', CT.t(done ? 'asstDone' : 'asstStopped')); st.open = had; save(); render(); }
  /** 지금 단계에서 가리킬 곳과 설명을 정한다: 다른 화면이면 왼쪽 메뉴, 메뉴가 닫힌 폰이면 메뉴 버튼 */
  function resolve(step) {
    var onPage = !step.path || norm(location.pathname) === norm(step.path);
    if (!onPage) { var link = findVisible('.nav a[href="' + step.path + '"]'); if (link) return { el: link, text: tr(G.nav[step.path]), mode: 'nav' }; var mb = findVisible('#menuBtn'); return { el: mb, text: CT.t('asstMenu'), mode: 'menu' }; }
    var el = findVisible(step.sel);
    if (!el && /\.nav |\.gsearch|\.lang/.test(step.sel)) { var m2 = findVisible('#menuBtn'); if (m2 && !findVisible('#drawer.open')) return { el: m2, text: CT.t('asstMenu'), mode: 'menu' }; }
    return { el: el, text: tr(step.text), mode: 'target' };
  }
  function mount(h) { if (layer && host === h) return; if (layer && layer.parentNode) layer.parentNode.removeChild(layer); host = h; layer = document.createElement('div'); layer.className = 'asst-layer'; layer.innerHTML = '<div class="asst-hl"></div><div class="asst-tip" role="status" aria-live="polite"><i class="asst-arrow"></i><div class="asst-tipbody"><span class="asst-tl">' + lumiImg('found', 'light', 'tl-img') + '</span><p></p></div><div class="asst-tb"><span class="asst-cnt"></span><span class="sp"></span><button type="button" class="asst-tb-stop"></button><button type="button" class="asst-tb-next"></button></div></div>'; host.appendChild(layer); hl = layer.querySelector('.asst-hl'); tip = layer.querySelector('.asst-tip'); arrow = layer.querySelector('.asst-arrow');
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
  $('#asstModes').addEventListener('click', function (e) { var b = e.target.closest('[data-mode]'); if (!b || busy) return; st.mode = b.dataset.mode; save(); paintStatic(); input.focus(); });
  async function confirmProposal(ok, el) {
    var idx = -1; for (var i = st.msgs.length - 1; i >= 0; i--) if (st.msgs[i].p && !st.msgs[i].pd) { idx = i; break; } if (idx < 0) return; var m = st.msgs[idx], p = m.p;
    if (!ok) { m.pd = 'no'; save(); render(); return; }
    try {
      if (p.type === 'addTask') await CT.api('/api/campteam/tasks', { method: 'POST', body: { title: p.title, dueDate: p.dueDate || null, ownerName: p.ownerName || '', campId: p.campId || null } });
      else await CT.api('/api/campteam/events', { method: 'POST', body: { title: p.title, kind: 'team', startDate: p.startDate, endDate: p.endDate || null, startTime: p.startTime || '', endTime: p.endTime || '', location: p.location || '', campId: p.campId || null } });
      m.pd = 'ok'; save(); setMood('success', 3000); render();
    } catch (e) { add('a', (e && e.message) || CT.t('asstFail'), '', ['root'], 'error'); render(); }
  }
  fab.onclick = function () { setOpen(!st.open); };
  $('#asstX').onclick = function () { setOpen(false); };
  $('#asstNew').onclick = function () { st.msgs = []; save(); render(); setMood('hello', 2200); };
  input.addEventListener('focus', function () { if (!busy) setMood('listen'); }); input.addEventListener('blur', function () { if (mood === 'listen') setMood(baseMood()); });
  $('#asstForm').onsubmit = function (e) { e.preventDefault(); var q = input.value; input.value = ''; ask(q); };
  body.addEventListener('click', function (e) {
    var md = e.target.closest('[data-mode]'); if (md) { return; }
    var pc = e.target.closest('[data-pc]'), px = e.target.closest('[data-px]');
    if (pc || px) { confirmProposal(!!pc, e.target.closest('.asst-msg')); return; }
    var q = e.target.closest('[data-faq]'); if (q) { pickFaq(q.dataset.faq); return; }
    var b = e.target.closest('[data-g]'); if (!b) return; var id = b.dataset.g; if (!G.guides[id]) return;
    startGuide(id, 0);
  });
  document.addEventListener('ct-lang', function () { render(); lastSig = ''; });

  /* ---------- 시작: 팀원이면 캐릭터를 보이고, 안내 중이던 것이 있으면 이어서 ---------- */
  render();
  CT.api('/api/campteam/assistant').then(function (r) {
    cfg = { member: !!r.member, configured: !!r.configured }; if (!cfg.member) return;
    root.hidden = false; setMood(baseMood()); render(); blinkLoop(); setInterval(paintMood, 60000); document.addEventListener('visibilitychange', function () { if (!document.hidden) paintMood(); });
    if (st.guide) { since = Date.now(); begin(); }
  }).catch(function () {});
})();
