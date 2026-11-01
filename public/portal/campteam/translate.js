/* 번역 도우미 = 문서 번역. 파일은 이 브라우저 안에서만 열고(doc-translate.js), 글 조각만 /api/campteam/translate (action:'doc') 로 보낸다.
   짧은 글 번역은 루미의 「번역」 탭이 맡는다(같은 API 의 글 번역 POST). */
(function () {
  CT.addDict({
    ko: { trlTitle: '번역 도우미', trlSub: '문서를 올리면 한국어 ↔ 영어로 번역한 새 파일을 만들어 드려요. 팀 용어집 단어는 그대로 지켜요.',
      trlLumi: '짧은 글 번역은 이제 루미 도우미의 「번역」 탭에서 해 주세요. 이 페이지는 문서 파일 번역 전용이에요.',
      trlDropT: '번역할 문서를 여기로 끌어다 놓으세요', trlAccept: 'Word(.docx) · PowerPoint(.pptx) · Excel(.xlsx) · PDF · 15MB까지', trlPick: '파일 고르기',
      trlHow: ['파일은 이 컴퓨터(브라우저) 안에서만 열어요. 파일 자체는 포털에 올라가지 않고, 글만 조각내어 AI 에 보내요. 글은 포털에 저장되지 않아요.',
        'Word·PowerPoint·Excel 은 글꼴·표·그림·서식을 그대로 두고 글만 바꿔요. 한 문단 안에서 글꼴이 섞여 있었다면 번역문은 그 문단 첫 글꼴로 통일돼요.',
        'PDF 는 글만 뽑아서 새 Word 파일(.docx)로 만들어요. PDF 의 모양·표·그림은 유지되지 않아요. 스캔한 PDF(사진 같은 PDF)는 읽을 수 없어요.',
        '구글 문서·슬라이드·시트는 먼저 「파일 → 다운로드」에서 Word(.docx)·PowerPoint(.pptx)·Excel(.xlsx)로 받아서 올려 주세요.',
        '장부·예산·영수증처럼 돈에 관한 파일은 AI 에 보내지 않아요. 그런 파일은 번역할 수 없어요.',
        'Excel 은 글자 칸만 번역하고 수식·숫자·날짜·시트 이름은 그대로예요. 수식이 글자로 값을 찾는 표(VLOOKUP 등)는 번역한 뒤 꼭 확인하세요.',
        '번역은 꼭 한 번 읽고 고쳐서 쓰세요. 성경 구절은 팀이 쓰는 공식 번역본으로 직접 바꿔 넣어 주세요.'],
      trlGloss: '용어집 관리', trlGlossNote: '「그대로 두기」로 정한 단어는 번역하지 않고, 고정 번역을 정한 단어는 늘 그 번역을 써요.',
      trlOff: 'AI 번역이 아직 켜지지 않았어요.', trlNoMember: '캠프팀 팀원만 쓸 수 있어요.', trlReading: '파일을 읽는 중…',
      trlImage: '사진·그림 파일은 번역할 수 없어요. 글이 들어 있는 Word·PowerPoint·Excel·PDF 파일을 올려 주세요.',
      trlGoogle: '구글 문서·슬라이드·시트 바로가기 파일은 열 수 없어요. 구글에서 「파일 → 다운로드」로 Word(.docx)·PowerPoint(.pptx)·Excel(.xlsx)을 받은 다음 올려 주세요.',
      trlOld: '예전 형식(.doc·.ppt·.xls·.hwp 등)은 열 수 없어요. 원래 프로그램에서 「다른 이름으로 저장」으로 .docx·.pptx·.xlsx 로 바꿔서 올려 주세요.',
      trlOther: '이 파일 형식은 번역할 수 없어요. Word(.docx)·PowerPoint(.pptx)·Excel(.xlsx)·PDF 파일만 올릴 수 있어요.',
      trlBig: function (mb) { return '파일이 너무 커요 (' + mb + 'MB). 15MB 이하로 줄여서 올려 주세요.'; },
      trlFin: '장부·예산·영수증처럼 돈에 관한 파일은 AI 에 보내지 않아요. 이 도우미로는 번역할 수 없어요. (돈 파일이 아닌데 막혔다면 파일 이름이나 내용의 「예산」「정산」「영수증」 같은 단어를 빼고 다시 올려 주세요.)',
      trlBadFile: '파일을 열 수 없어요. 암호가 걸렸거나 파일이 깨졌을 수 있어요. 암호를 풀고 다시 저장해서 올려 주세요.', trlEncrypted: '암호가 걸린 파일은 열 수 없어요. 암호를 풀고 다시 저장해서 올려 주세요.',
      trlNoText: '이 파일에서 번역할 글을 찾지 못했어요. (스캔한 PDF 라면 글자가 사진이라 읽을 수 없어요.)',
      trlFound: function (a, b, c) { return '글자 ' + a.toLocaleString('ko-KR') + '자를 찾았어요. 번역할 글자 ' + b.toLocaleString('ko-KR') + '자 · ' + c + '번에 나눠 보내요.'; },
      trlTooMany: function (n, max) { return '번역할 글이 너무 많아요 (' + n.toLocaleString('ko-KR') + '자, 최대 ' + max.toLocaleString('ko-KR') + '자). 문서를 나눠서 올려 주세요.'; },
      trlNothing: '번역할 글이 없어요. 이미 목표 언어이거나 숫자뿐이에요. 방향을 바꿔 보세요.',
      trlPdfWarn: 'PDF 는 글만 뽑아서 새 Word 파일(.docx)로 만들어요. PDF 의 모양·표·그림은 유지되지 않아요.', trlPdfLost: '일부 글꼴의 글자는 읽을 수 없어서 빠졌을 수 있어요.',
      trlKind: '글의 종류', kGeneral: '일반', kSermon: '설교·메시지', kNotice: '공지·안내문', kSchedule: '일정표', trlSwap: '⇄ 방향 바꾸기', trlKo: '한국어', trlEn: '영어', trlDirLbl: function (a, b) { return a + ' → ' + b; },
      trlStart: '✨ 번역 시작', trlCancel: '멈추기', trlResume: '이어서 번역', trlAgain: '다시 시도', trlOther2: '다른 파일 고르기',
      trlProg: function (d, n, p) { return d + ' / ' + n + '번 완료 (' + p + '%)'; }, trlRunning: '루미가 번역하는 중이에요. 이 창을 닫지 마세요.', trlPaused: '멈췄어요. 「이어서 번역」을 누르면 남은 부분부터 계속해요.',
      trlFailN: function (n) { return n + '번째 조각을 번역하지 못했어요.'; }, trlPrev: '번역 미리보기 (앞부분)',
      trlDone: '번역이 끝났어요. 꼭 한 번 읽고 고쳐서 쓰세요.', trlDl: '⬇ 번역한 파일 받기', trlDlPart: '번역 안 된 부분은 원문 그대로 받기', trlBuilding: '파일을 만드는 중…',
      trlKept: function (n) { return '문단 ' + n + '개는 번역하지 못해 원문 그대로 두었어요.'; }, trlDlFail: '파일을 만들지 못했어요. 다시 눌러 주세요.', trlLeave: '번역이 진행 중이에요. 나가면 멈춰요.' },
    en: { trlTitle: 'Translation helper', trlSub: 'Upload a document and get a new file translated between Korean and English. Team glossary terms are kept as they are.',
      trlLumi: 'Short text translation has moved to the "Translate" tab of the Lumi assistant. This page is only for document files.',
      trlDropT: 'Drop the document to translate here', trlAccept: 'Word (.docx) · PowerPoint (.pptx) · Excel (.xlsx) · PDF · up to 15 MB', trlPick: 'Choose a file',
      trlHow: ['The file is opened only inside this browser. The file itself is never uploaded to the portal; only pieces of its text are sent to the AI, and the text is not stored in the portal.',
        'Word, PowerPoint and Excel keep fonts, tables, pictures and formatting; only the text is replaced. If a paragraph mixed several fonts, the translation uses the first font of that paragraph.',
        'A PDF is read for its text only and turned into a new Word file (.docx). The PDF layout, tables and pictures are not kept. Scanned PDFs (pictures of pages) cannot be read.',
        'For Google Docs, Slides or Sheets, first use File → Download to get a .docx, .pptx or .xlsx, then upload that.',
        'Finance files such as ledgers, budgets and receipts are never sent to the AI, so they cannot be translated here.',
        'In Excel only text cells are translated; formulas, numbers, dates and sheet names stay as they are. If a formula looks up text (VLOOKUP etc.), check it after translating.',
        'Always read and adjust the translation. Please replace Bible verses with your team\'s approved translation.'],
      trlGloss: 'Manage glossary', trlGlossNote: 'Words marked "keep" are never translated; words with a fixed translation always use it.',
      trlOff: 'AI translation is not turned on yet.', trlNoMember: 'Only camp team members can use this.', trlReading: 'Reading the file…',
      trlImage: 'Pictures and images cannot be translated. Please upload a Word, PowerPoint, Excel or PDF file that contains text.',
      trlGoogle: 'Google Docs/Slides/Sheets shortcut files cannot be opened. In Google use File → Download to get .docx, .pptx or .xlsx, then upload that.',
      trlOld: 'Old formats (.doc, .ppt, .xls, .hwp, etc.) cannot be opened. Use "Save as" in the original program to make a .docx, .pptx or .xlsx, then upload it.',
      trlOther: 'This file type cannot be translated. Only Word (.docx), PowerPoint (.pptx), Excel (.xlsx) and PDF files can be uploaded.',
      trlBig: function (mb) { return 'The file is too big (' + mb + ' MB). Please make it 15 MB or smaller.'; },
      trlFin: 'Finance files such as ledgers, budgets and receipts are never sent to the AI, so this helper cannot translate them. (If this is not a finance file, remove words like "budget", "settlement" or "receipt" from the file name or text and try again.)',
      trlBadFile: 'The file could not be opened. It may be password-protected or damaged. Remove the password, save it again and upload it.', trlEncrypted: 'Password-protected files cannot be opened. Remove the password, save it again and upload it.',
      trlNoText: 'No text to translate was found in this file. (If it is a scanned PDF, the letters are a picture and cannot be read.)',
      trlFound: function (a, b, c) { return 'Found ' + a.toLocaleString('en-US') + ' characters. ' + b.toLocaleString('en-US') + ' to translate, sent in ' + c + ' parts.'; },
      trlTooMany: function (n, max) { return 'Too much text to translate (' + n.toLocaleString('en-US') + ' characters, max ' + max.toLocaleString('en-US') + '). Please split the document.'; },
      trlNothing: 'Nothing to translate: the text is already in the target language or only numbers. Try swapping the direction.',
      trlPdfWarn: 'A PDF is read for its text only and turned into a new Word file (.docx). The PDF layout, tables and pictures are not kept.', trlPdfLost: 'Text in some fonts could not be read and may be missing.',
      trlKind: 'Kind of text', kGeneral: 'General', kSermon: 'Sermon / message', kNotice: 'Notice', kSchedule: 'Schedule', trlSwap: '⇄ Swap direction', trlKo: 'Korean', trlEn: 'English', trlDirLbl: function (a, b) { return a + ' → ' + b; },
      trlStart: '✨ Start translating', trlCancel: 'Stop', trlResume: 'Continue', trlAgain: 'Retry', trlOther2: 'Choose another file',
      trlProg: function (d, n, p) { return d + ' / ' + n + ' parts done (' + p + '%)'; }, trlRunning: 'Lumi is translating. Please keep this window open.', trlPaused: 'Stopped. Press "Continue" to carry on with the rest.',
      trlFailN: function (n) { return 'Part ' + n + ' could not be translated.'; }, trlPrev: 'Preview (first paragraphs)',
      trlDone: 'Done. Please read and adjust the translation before using it.', trlDl: '⬇ Download translated file', trlDlPart: 'Download with untranslated parts left as the original', trlBuilding: 'Building the file…',
      trlKept: function (n) { return n + ' paragraph(s) could not be translated and were left as the original.'; }, trlDlFail: 'Could not build the file. Please try again.', trlLeave: 'Translation is in progress. Leaving will stop it.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, T = window.CTDocTranslate;
  var S = null, running = false, status = { member: true, configured: true };
  var MIME = { docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', pdf: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  var ERR = { encrypted: 'trlEncrypted', notext: 'trlNoText' }, KINDS = [['general', 'kGeneral'], ['sermon', 'kSermon'], ['notice', 'kNotice'], ['schedule', 'kSchedule']];
  var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function say(msg, cls) { var m = $('trlMsg'); m.hidden = !msg; m.className = 'trl-msg' + (cls ? ' ' + cls : ''); m.textContent = msg || ''; }
  function dirLabel(to) { return CT.t('trlDirLbl')(CT.t(to === 'en' ? 'trlKo' : 'trlEn'), CT.t(to === 'en' ? 'trlEn' : 'trlKo')); }
  function reset() { S = null; say(''); $('trlWork').innerHTML = ''; $('trlFile').value = ''; }

  async function pick(file) {
    if (running || !file) return; reset();
    if (!status.member) return say(CT.t('trlNoMember'), 'err'); if (!status.configured) return say(CT.t('trlOff'), 'err');
    var c = T.classify(file.name), bad = { image: 'trlImage', google: 'trlGoogle', oldoffice: 'trlOld', other: 'trlOther' }[c.kind];
    if (bad) return say(CT.t(bad), 'err');
    if (file.size > T.MAX_FILE) return say(CT.t('trlBig')((file.size / 1048576).toFixed(1)), 'err');
    if (T.financeReason(file.name, '')) return say(CT.t('trlFin'), 'err'); // 이름만 봐도 돈 파일이면 읽지도 않는다
    say(CT.t('trlReading'));
    var doc; try { doc = await T.load(new Uint8Array(await file.arrayBuffer()), file.name); } catch (e) { return say(CT.t(ERR[e.code] || 'trlBadFile'), 'err'); }
    if (T.financeReason('', doc.texts.join('\n'))) return say(CT.t('trlFin'), 'err'); // 글을 봐도 돈 문서면 한 글자도 보내지 않는다
    var src = T.detectSource(doc.texts); if (!src) return say(CT.t('trlNoText'), 'err');
    S = { file: file, doc: doc, to: src === 'ko' ? 'en' : 'ko', kind: 'general', found: doc.texts.reduce(function (n, t) { return n + t.length; }, 0) };
    say(''); replan();
  }
  function replan() { // 방향이 바뀌면 보낼 글과 조각 나누기를 다시 계산한다
    S.plan = T.plan(S.doc.texts, S.to); S.outs = []; S.st = S.plan.chunks.map(function () { return 'wait'; }); S.err = {}; S.kept = 0; S.stop = ''; S.state = 'ready';
    if (S.plan.chars > T.MAX_CHARS) S.state = 'toomany'; else if (!S.plan.pieces.length) S.state = 'nothing';
    render();
  }
  var count = function (k) { return S.st.filter(function (x) { return x === k; }).length; };

  function render() {
    if (!S) { $('trlWork').innerHTML = ''; return; }
    var n = S.st.length, done = count('ok'), fails = []; S.st.forEach(function (x, i) { if (x === 'fail') fails.push(i); });
    var canSwap = S.state === 'ready' || S.state === 'toomany' || S.state === 'nothing' || (S.state === 'pause' && !done);
    var h = '<div class="trl-box"><div class="trl-file"><b>' + esc(S.file.name) + '</b><span class="chip">' + esc(S.doc.type.toUpperCase()) + '</span></div>';
    h += '<div class="trl-dir"><span>' + esc(dirLabel(S.to)) + '</span>' + (canSwap ? '<button type="button" class="btn sm" data-act="swap">' + esc(CT.t('trlSwap')) + '</button>' : '') + '</div>';
    h += '<div class="hint">' + esc(S.state === 'toomany' ? CT.t('trlTooMany')(S.plan.chars, T.MAX_CHARS) : S.state === 'nothing' ? CT.t('trlNothing') : CT.t('trlFound')(S.found, S.plan.chars, n)) + '</div>';
    if (S.doc.type === 'pdf') h += '<div class="trl-warn">' + esc(CT.t('trlPdfWarn')) + (S.doc.partial ? ' ' + esc(CT.t('trlPdfLost')) : '') + '</div>';
    if (S.state === 'ready') h += '<div class="trl-row"><label><span>' + esc(CT.t('trlKind')) + '</span><select data-kind>' + KINDS.map(function (k) { return '<option value="' + k[0] + '"' + (S.kind === k[0] ? ' selected' : '') + '>' + esc(CT.t(k[1])) + '</option>'; }).join('') + '</select></label><button type="button" class="btn pri" data-act="start">' + esc(CT.t('trlStart')) + '</button></div>';
    if (S.state === 'run' || S.state === 'pause' || S.state === 'partial' || S.state === 'done') {
      var pct = n ? Math.round(done * 100 / n) : 0;
      h += '<div class="trl-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '"><i style="width:' + pct + '%"></i></div><div class="hint">' + esc(CT.t('trlProg')(done, n, pct) + ' · ' + (S.state === 'run' ? CT.t('trlRunning') : S.state === 'pause' ? (S.stop || CT.t('trlPaused')) : '')) + '</div>';
      h += '<div class="trl-chunks">' + S.st.map(function (x, i) { return '<span class="' + x + '" title="' + (i + 1) + '">' + (i + 1) + '</span>'; }).join('') + '</div>';
      if (S.state === 'run') h += '<div class="trl-row"><button type="button" class="btn" data-act="cancel"' + (S.cancel ? ' disabled' : '') + '>' + esc(CT.t('trlCancel')) + '</button></div>';
      if (S.state === 'pause') h += '<div class="trl-row"><button type="button" class="btn pri" data-act="resume">' + esc(CT.t('trlResume')) + '</button></div>';
    }
    if (fails.length && S.state !== 'run') h += '<div class="trl-fails">' + fails.map(function (i) { return '<div class="trl-fail"><span>' + esc(CT.t('trlFailN')(i + 1) + ' ' + (S.err[i] || '')) + '</span><button type="button" class="btn sm" data-act="retry" data-i="' + i + '">' + esc(CT.t('trlAgain')) + '</button></div>'; }).join('') + '</div>';
    if (S.state === 'done' || S.state === 'partial') {
      if (S.kept) h += '<div class="trl-warn">' + esc(CT.t('trlKept')(S.kept)) + '</div>';
      if (S.state === 'done') h += '<div class="trl-msg ok">' + esc(CT.t('trlDone')) + '</div>';
      h += '<div class="trl-row"><button type="button" class="btn' + (S.state === 'done' ? ' pri' : '') + '" data-act="dl">' + esc(CT.t(S.state === 'done' ? 'trlDl' : 'trlDlPart')) + '</button></div>';
    }
    h += '<div class="trl-row"><button type="button" class="btn sm" data-act="other"' + (running ? ' disabled' : '') + '>' + esc(CT.t('trlOther2')) + '</button></div></div>';
    $('trlWork').innerHTML = h + preview();
  }
  function preview() { // 번역된 앞부분 몇 문단을 원문과 나란히
    var map = T.merge(S.plan, S.outs), rows = [], seen = {};
    for (var i = 0; i < S.doc.texts.length && rows.length < 5; i++) { var t = S.doc.texts[i]; if (map.has(t) && !seen[t]) { seen[t] = 1; rows.push([t, map.get(t)]); } }
    return rows.length ? '<div class="trl-box"><b>' + esc(CT.t('trlPrev')) + '</b><div class="trl-prev">' + rows.map(function (r) { return '<div class="trl-pair"><div class="src" lang="' + (S.to === 'en' ? 'ko' : 'en') + '">' + esc(r[0]) + '</div><div lang="' + S.to + '">' + esc(r[1]) + '</div></div>'; }).join('') + '</div></div>' : '';
  }

  /* 조각 하나를 서버에 보낸다. 일시적 오류(502·끊김)는 한 번 자동으로 다시, 한도·돈 파일·설정 오류는 전체를 멈춘다. */
  async function doChunk(ci) {
    S.st[ci] = 'run'; render();
    var idx = S.plan.chunks[ci];
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        var r = await CT.api('/api/campteam/translate', { method: 'POST', body: { action: 'doc', units: idx.map(function (i) { return S.plan.pieces[i]; }), to: S.to, kind: S.kind, name: S.file.name } });
        if (!r || !Array.isArray(r.out) || r.out.length !== idx.length) throw new Error('bad');
        r.out.forEach(function (t, k) { S.outs[idx[k]] = t; }); S.kept += (r.kept || []).length; S.st[ci] = 'ok'; delete S.err[ci]; return;
      } catch (e) {
        if ([401, 403, 413, 422, 429, 503].indexOf(e.status) >= 0) { S.st[ci] = 'wait'; S.stop = e.message || CT.t('trlPaused'); S.fatal = true; return; }
        if (attempt === 0) { await sleep(1500); continue; }
        S.st[ci] = 'fail'; S.err[ci] = e.message || ''; return;
      }
    }
  }
  async function run(only) {
    if (running) return; running = true; S.state = 'run'; S.cancel = false; S.fatal = false; S.stop = '';
    var q = (only || S.st.map(function (x, i) { return i; })).filter(function (i) { return S.st[i] !== 'ok'; });
    render();
    async function worker() { while (!S.cancel && !S.fatal) { var ci = q.shift(); if (ci == null) return; await doChunk(ci); render(); } }
    try { await Promise.all([worker(), worker()]); } catch (e) { S.stop = e.message; S.fatal = true; }
    running = false;
    S.state = S.fatal || S.cancel || count('wait') ? 'pause' : count('fail') ? 'partial' : 'done';
    render();
  }
  async function download() {
    var b = document.querySelector('[data-act="dl"]'); if (b) { b.disabled = true; b.textContent = CT.t('trlBuilding'); }
    try {
      var bytes = await S.doc.build(T.merge(S.plan, S.outs), S.to), a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([bytes], { type: MIME[S.doc.type] })); a.download = T.outName(S.file.name, S.to, S.doc.type); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 60000);
    } catch (e) { say(CT.t('trlDlFail'), 'err'); }
    render();
  }

  function fillStatic() { $('trlHow').innerHTML = CT.t('trlHow').map(function (x) { return '<li>' + esc(x) + '</li>'; }).join(''); $('trlDrop').setAttribute('aria-label', CT.t('trlPick')); }
  CT.boot(async function () {
    CT.applyI18n(); fillStatic();
    try { var st = await CT.api('/api/campteam/translate'); status = st; if (!st.member) say(CT.t('trlNoMember'), 'err'); else if (!st.configured) say(CT.t('trlOff'), 'err'); } catch (e) { /* 안내만 못 보여 줄 뿐 */ }
    var drop = $('trlDrop'), input = $('trlFile');
    $('trlPickBtn').onclick = function (e) { e.stopPropagation(); input.click(); };
    drop.onclick = function () { input.click(); };
    drop.onkeydown = function (e) { if (e.target === drop && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); input.click(); } };
    input.onchange = function () { pick(input.files && input.files[0]); };
    ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
    ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
    drop.addEventListener('drop', function (e) { var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) pick(f); });
    window.addEventListener('dragover', function (e) { e.preventDefault(); }); window.addEventListener('drop', function (e) { if (!drop.contains(e.target)) e.preventDefault(); }); // 빈 곳에 놓아도 파일이 브라우저에서 열리지 않게
    $('trlWork').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b || !S) return; var act = b.dataset.act;
      if (act === 'swap' && !running) { S.to = S.to === 'en' ? 'ko' : 'en'; replan(); }
      else if (act === 'start' || act === 'resume') run();
      else if (act === 'cancel') { S.cancel = true; b.disabled = true; }
      else if (act === 'retry') run([Number(b.dataset.i)]);
      else if (act === 'dl') download();
      else if (act === 'other' && !running) reset();
    });
    $('trlWork').addEventListener('change', function (e) { if (e.target.matches('[data-kind]') && S) S.kind = e.target.value; });
    window.addEventListener('beforeunload', function (e) { if (running) { e.preventDefault(); e.returnValue = CT.t('trlLeave'); } });
    document.addEventListener('ct-lang', function () { CT.applyI18n(); fillStatic(); render(); });
  });
})();
