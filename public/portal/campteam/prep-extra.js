/* 캠프 준비의 나머지 탭: 시작 마법사 · 마감 마법사 · 평가 설문. prep.js 가 만든 CTPrep 에 탭을 더한다. */
(function () {
  var P = window.CTPrep; if (!P) return;
  CT.addDict({
    ko: { wLabel: '시작 마법사', xLabel: '마감 마법사', vLabel: '평가 설문',
      wIntro: '새 캠프를 시작할 때 지난 캠프에서 쓸 만한 것만 골라 가져와요. 가져온 업무는 담당자가 비어 있고, 날짜는 시작일 차이만큼 옮겨요. 고른 것만 복사돼요.', wBase: '기준이 될 지난 캠프', wRecommend: '✨ 루미에게 추천받기', wRecBusy: '루미가 고르는 중…', wRecAi: '루미 추천', wRecRule: '비슷한 순서(AI 꺼짐 또는 연결 안 됨)', wCounts: function (c) { return '업무 ' + c.tasks + ' · 진행표 ' + c.timeline + ' · 준비물 ' + c.supplies + ' · 자료 ' + c.files; },
      wPick: '이 캠프로 후보 보기', wTasks: '업무', wTimeline: '진행표', wSupplies: '준비물', wFiles: '자료(연결만 해요)', wAll: '전체 선택', wNone: '없음', wApply: '고른 것 가져오기', wDone: function (c) { return '가져왔어요 — 업무 ' + c.tasks + ', 진행표 ' + c.timeline + ', 준비물 ' + c.supplies + ', 자료 ' + c.files + '.'; },
      wNoStart: '이 캠프의 시작 날짜가 없어서 진행표는 옮기지 못해요(날짜를 먼저 정해 주세요). 업무 기한도 옮기지 않아요.', wNoSrc: '비교할 지난 캠프가 없어요.', wSkipDate: function (n) { return '진행표 ' + n + '줄은 시작 날짜가 없어 건너뛰었어요.'; },
      xIntro: '캠프가 끝났을 때 점검하고 정리해요. 자동으로 바뀌는 건 없고, 고른 것만 적용돼요.', xOpen: '아직 끝나지 않은 업무', xNA: '해당 없음 처리(지우지 않고 상태만 바꿔요)', xNone: '남은 업무가 없어요 👍', xCheck: '점검', xFollow: '후속 업무 제안 (담당·기한은 비워 만들어요)', xExists: '이미 있음', xStatus: '캠프 상태를 「완료」로 바꾸기', xApply: '적용하기',
      xFiles: function (n, u) { return '자료 ' + n + '개' + (u ? ' (태그 없는 것 ' + u + '개 — AI 정리함으로 태그를 달 수 있어요)' : ''); }, xSupplies: function (n) { return n ? '아직 준비 끝나지 않은 준비물 ' + n + '개' : '준비물 정리 끝'; }, xMeet: function (n) { return '회의 ' + n + '개'; }, xMoney: function (b, l) { return '예산 항목 ' + b + '개 · 장부 거래 ' + l + '건 — 정산은 재정 화면에서 확인하세요'; }, xSurvey: '평가 설문', xDone: function (r) { return '적용했어요 — 해당 없음 ' + r.markedNA + ', 후속 업무 ' + r.added + (r.status === 'done' ? ', 캠프 완료' : '') + '.'; },
      vIntro: '캠프가 끝난 뒤 참가자·교회·스태프에게 링크로 보내는 평가 설문이에요. 이름·연락처는 묻지 않고, 결과는 캠프 담당자만 봐요.', vNew: '+ 설문 만들기', vTitle: '설문 제목', vDefaultTitle: '캠프 평가', vQs: '질문 (한 줄에 하나, 앞에 [별점] [선택: 보기1/보기2] [글] 을 붙여요)', vQsHint: '예) [별점] 전체 만족도는 어땠나요?',
      vOpen: '열림', vClosed: '닫힘', vResp: function (n) { return '답 ' + n + '개'; }, vLinkOn: '링크 켜기', vLinkOff: '링크 끄기', vCopy: '링크 복사', vResults: '결과 보기', vClose: '설문 닫기', vReopen: '다시 열기', vDel: '삭제', vCopied: '복사했어요.', vNoQ: '질문을 한 줄 이상 적어 주세요.', vAvg: '평균', vNoAns: '아직 답이 없어요.', vLinkNote: '링크를 아는 사람은 누구나 답할 수 있어요. 필요 없어지면 「링크 끄기」를 누르세요.', vQuestions: '질문 수', vDelConfirm: '이 설문을 삭제할까요? (받은 답은 남지만 화면에서 사라져요)', vEdit: '질문 고치기' },
    en: { wLabel: 'Start wizard', xLabel: 'Close-out wizard', vLabel: 'Survey',
      wIntro: 'When you start a new camp, pick only what is useful from a past camp. Copied tasks have no owner and dates shift by the difference in start dates. Only what you tick is copied.', wBase: 'Past camp to base it on', wRecommend: '✨ Ask Lumi to recommend', wRecBusy: 'Lumi is choosing…', wRecAi: 'Lumi recommends', wRecRule: 'Similarity order (AI off or unavailable)', wCounts: function (c) { return 'Tasks ' + c.tasks + ' · Timeline ' + c.timeline + ' · Supplies ' + c.supplies + ' · Files ' + c.files; },
      wPick: 'Show candidates from this camp', wTasks: 'Tasks', wTimeline: 'Timeline', wSupplies: 'Supplies', wFiles: 'Files (link only)', wAll: 'Select all', wNone: 'None', wApply: 'Copy selected', wDone: function (c) { return 'Copied — tasks ' + c.tasks + ', timeline ' + c.timeline + ', supplies ' + c.supplies + ', files ' + c.files + '.'; },
      wNoStart: 'This camp has no start date, so the timeline cannot be shifted (set the date first). Task due dates are not shifted either.', wNoSrc: 'There is no past camp to compare.', wSkipDate: function (n) { return n + ' timeline rows were skipped because there is no start date.'; },
      xIntro: 'Review and tidy up after a camp. Nothing changes automatically; only what you choose is applied.', xOpen: 'Tasks not finished yet', xNA: 'Mark as not applicable (status only, nothing is deleted)', xNone: 'No open tasks 👍', xCheck: 'Checks', xFollow: 'Suggested follow-up tasks (created without owner or due date)', xExists: 'Already exists', xStatus: 'Set the camp status to Done', xApply: 'Apply',
      xFiles: function (n, u) { return n + ' files' + (u ? ' (' + u + ' without tags — Lumi can tag them)' : ''); }, xSupplies: function (n) { return n ? n + ' supplies not ready yet' : 'Supplies all settled'; }, xMeet: function (n) { return n + ' meetings'; }, xMoney: function (b, l) { return b + ' budget lines · ' + l + ' ledger entries — settle in Finance'; }, xSurvey: 'Evaluation survey', xDone: function (r) { return 'Applied — not applicable ' + r.markedNA + ', follow-ups ' + r.added + (r.status === 'done' ? ', camp marked done' : '') + '.'; },
      vIntro: 'An evaluation survey you send by link to participants, churches and staff after camp. It asks for no name or contact; only camp managers see results.', vNew: '+ New survey', vTitle: 'Survey title', vDefaultTitle: 'Camp evaluation', vQs: 'Questions (one per line, prefix [rating] [choice: A/B] or [text])', vQsHint: 'e.g. [rating] How satisfied were you overall?',
      vOpen: 'Open', vClosed: 'Closed', vResp: function (n) { return n + ' responses'; }, vLinkOn: 'Turn link on', vLinkOff: 'Turn link off', vCopy: 'Copy link', vResults: 'View results', vClose: 'Close survey', vReopen: 'Reopen', vDel: 'Delete', vCopied: 'Copied.', vNoQ: 'Please write at least one question.', vAvg: 'Average', vNoAns: 'No answers yet.', vLinkNote: 'Anyone with the link can answer. Turn the link off when you no longer need it.', vQuestions: 'Questions', vDelConfirm: 'Delete this survey? (Answers are kept but it disappears from the list.)', vEdit: 'Edit questions' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = P.esc, S = P.S, api = P.api;

  /* ---------- 시작 마법사 ---------- */
  var W = { sources: [], picks: {}, from: '', cand: null };
  async function wLoad() {
    var v = $('pView'); v.innerHTML = '<p class="hint">…</p>';
    var d = await CT.api('/api/campteam/camp-wizard?campId=' + encodeURIComponent(S.campId)); W.sources = d.sources; W.aiOn = d.aiOn; W.camp = d.camp; W.cand = null; W.picks = {}; wRender();
  }
  function wRender() {
    var v = $('pView'), h = '<p class="hint">' + esc(CT.t('wIntro')) + '</p>';
    if (!W.sources.length) { v.innerHTML = h + '<div class="empty">' + esc(CT.t('wNoSrc')) + '</div>'; return; }
    h += '<div class="p-bar"><b>' + esc(CT.t('wBase')) + '</b>' + (P.canW() && W.aiOn ? ' <button class="btn" id="wRec">' + esc(CT.t('wRecommend')) + '</button>' : '') + '<span class="hint" id="wRecMsg"></span></div>';
    h += W.sources.map(function (c) { var pk = W.picks[c.id];
      return '<div class="p-row' + (W.from === c.id ? ' now' : '') + '"><span class="p-main"><b>' + esc(P.campLabel(c)) + (pk ? ' <span class="chip ok">' + esc(CT.t('wRecAi')) + '</span>' : '') + '</b><small>' + esc([c.year, c.season].filter(Boolean).join(' ')) + ' ' + esc(CT.t('wCounts')(c.counts)) + (pk && pk.reason ? ' — ' + esc(pk.reason) : '') + '</small></span><button class="btn sm' + (W.from === c.id ? '' : ' pri') + '" data-pickc="' + esc(c.id) + '">' + esc(CT.t('wPick')) + '</button></div>';
    }).join('');
    if (W.cand) h += wCandHtml();
    v.innerHTML = h;
  }
  function checks(kind, items, label) {
    if (!items.length) return '';
    return '<h4 class="p-day">' + esc(CT.t(label)) + ' (' + items.length + ') <button type="button" class="btn sm" data-all="' + kind + '">' + esc(CT.t('wAll')) + '</button> <button type="button" class="btn sm" data-none="' + kind + '">' + esc(CT.t('wNone')) + '</button></h4>' + items.map(function (x, i) { var key = kind === 'files' ? x.id : i;
      var txt = kind === 'tasks' ? x.title + (x.dueDate ? ' · ' + x.dueDate : '') : kind === 'timeline' ? x.dayDate + ' ' + (x.startTime || '') + ' ' + x.title : kind === 'supplies' ? x.name + (x.qty ? ' × ' + x.qty : '') : x.title;
      return '<label class="imp-row"><input type="checkbox" data-k="' + kind + '" value="' + esc(key) + '"> <span>' + esc(txt) + '</span></label>'; }).join('');
  }
  function wCandHtml() {
    var c = W.cand, h = '<div class="card p-series">';
    if (!c.dated) h += '<p class="hint">' + esc(CT.t('wNoStart')) + (c.timelineSkipped ? ' ' + esc(CT.t('wSkipDate')(c.timelineSkipped)) : '') + '</p>';
    h += checks('tasks', c.tasks, 'wTasks') + checks('timeline', c.timeline, 'wTimeline') + checks('supplies', c.supplies, 'wSupplies') + checks('files', c.files, 'wFiles');
    if (P.canW()) h += '<div class="dlg-actions"><button class="btn pri" id="wApply">' + esc(CT.t('wApply')) + '</button></div><div class="hint" id="wMsg"></div>';
    return h + '</div>';
  }
  function chosen(kind) { return [].map.call($('pView').querySelectorAll('input[data-k="' + kind + '"]:checked'), function (e) { return kind === 'files' ? e.value : +e.value; }); }
  async function wHandle(e) {
    var pc = e.target.closest('[data-pickc]'), rec = e.target.closest('#wRec'), ap = e.target.closest('#wApply'), all = e.target.closest('[data-all]'), none = e.target.closest('[data-none]');
    if (pc) { W.from = pc.dataset.pickc; W.cand = await CT.api('/api/campteam/camp-wizard?campId=' + encodeURIComponent(S.campId) + '&fromCampId=' + encodeURIComponent(W.from)); wRender(); }
    if (all || none) { var k = (all || none).dataset.all || (all || none).dataset.none; [].forEach.call($('pView').querySelectorAll('input[data-k="' + k + '"]'), function (c) { c.checked = !!all; }); }
    if (rec) { $('wRecMsg').textContent = CT.t('wRecBusy'); try { var r = await api('/api/campteam/camp-wizard', 'POST', { action: 'recommend', campId: S.campId }); W.picks = {}; r.picks.forEach(function (p) { W.picks[p.id] = p; }); wRender(); $('wRecMsg').textContent = r.ai ? '' : CT.t('wRecRule'); } catch (er) { $('wRecMsg').textContent = er.message; } }
    if (ap) { ap.disabled = true; try { var r2 = await api('/api/campteam/camp-wizard', 'POST', { action: 'apply', campId: S.campId, fromCampId: W.from, tasks: chosen('tasks'), timeline: chosen('timeline'), supplies: chosen('supplies'), files: chosen('files') }); $('wMsg').textContent = CT.t('wDone')(r2.created); } catch (er2) { $('wMsg').textContent = er2.message; } ap.disabled = false; }
  }

  /* ---------- 마감 마법사 ---------- */
  var X = null;
  async function xLoad() { $('pView').innerHTML = '<p class="hint">…</p>'; X = await CT.api('/api/campteam/camp-close?campId=' + encodeURIComponent(S.campId)); xRender(); }
  function xRender() {
    var v = $('pView'), c = X.counts, h = '<p class="hint">' + esc(CT.t('xIntro')) + '</p>';
    h += '<h4 class="p-day">' + esc(CT.t('xCheck')) + '</h4><ul class="p-list"><li>' + esc(CT.t('xFiles')(c.files, c.filesUntagged)) + '</li><li>' + esc(CT.t('xSupplies')(c.suppliesOpen)) + '</li><li>' + esc(CT.t('xMeet')(c.meetings)) + '</li>' + (X.money ? '<li>' + esc(CT.t('xMoney')(X.money.budgetLines, X.money.ledgerEntries)) + ' — <a href="/portal/campteam/budget/?campId=' + encodeURIComponent(S.campId) + '">→</a></li>' : '') +
      '<li>' + esc(CT.t('xSurvey')) + ': ' + (X.surveys.length ? X.surveys.map(function (s) { return esc(s.title) + ' (' + esc(CT.t('vResp')(s.responses)) + ')'; }).join(', ') : '—') + '</li></ul>';
    h += '<h4 class="p-day">' + esc(CT.t('xOpen')) + ' (' + X.openTasks.length + ')</h4>' + (X.openTasks.length ? '<p class="hint">' + esc(CT.t('xNA')) + '</p>' + X.openTasks.map(function (t) { return '<label class="imp-row"><input type="checkbox" data-na value="' + esc(t.id) + '"> <span>' + esc(t.title) + '<small>' + [t.ownerName, t.dueDate, t.status].filter(Boolean).map(esc).join(' · ') + '</small></span></label>'; }).join('') : '<p class="hint">' + esc(CT.t('xNone')) + '</p>');
    h += '<h4 class="p-day">' + esc(CT.t('xFollow')) + '</h4>' + X.followups.map(function (f) { return '<label class="imp-row"><input type="checkbox" data-fu value="' + esc(f.id) + '"' + (f.exists ? ' disabled' : '') + '> <span>' + esc(CT.lang() === 'en' ? f.titleEn : f.title) + (f.exists ? ' <span class="chip">' + esc(CT.t('xExists')) + '</span>' : '') + '</span></label>'; }).join('');
    if (P.canW()) h += (X.camp.status !== 'done' ? '<label class="imp-row"><input type="checkbox" id="xDoneBox"> <span>' + esc(CT.t('xStatus')) + '</span></label>' : '') + '<div class="dlg-actions"><button class="btn pri" id="xApply">' + esc(CT.t('xApply')) + '</button></div><div class="hint" id="xMsg"></div>';
    v.innerHTML = h;
  }
  async function xHandle(e) {
    if (!e.target.closest('#xApply')) return; var b = e.target.closest('#xApply'); b.disabled = true;
    var pick = function (sel) { return [].map.call($('pView').querySelectorAll(sel + ':checked'), function (x) { return x.value; }); };
    try { var r = await api('/api/campteam/camp-close', 'POST', { campId: S.campId, markNA: pick('[data-na]'), addFollowups: pick('[data-fu]'), setStatus: $('xDoneBox') && $('xDoneBox').checked ? 'done' : undefined }); await xLoad(); $('xMsg') && ($('xMsg').textContent = CT.t('xDone')(r)); }
    catch (er) { $('xMsg').textContent = er.message; b.disabled = false; }
  }

  /* ---------- 평가 설문 ---------- */
  var V = [];
  function qsToText(qs) { return qs.map(function (q) { var l = CT.lang() === 'en' && q.en ? q.en : q.ko; return (q.type === 'rating' ? '[별점] ' : q.type === 'choice' ? '[선택: ' + q.options.map(function (o) { return o.ko || o.en; }).join('/') + '] ' : '[글] ') + l; }).join('\n'); }
  function textToQs(t) {
    return String(t || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var m = /^\[(별점|rating|선택|choice|글|text)\s*:?\s*([^\]]*)\]\s*(.*)$/i.exec(l); if (!m) return { type: 'text', ko: l };
      var k = m[1].toLowerCase(), type = /별점|rating/.test(k) ? 'rating' : /선택|choice/.test(k) ? 'choice' : 'text', q = { type: type, ko: m[3] };
      if (type === 'choice') q.options = m[2].split('/').map(function (o) { return { ko: o.trim() }; }).filter(function (o) { return o.ko; }); return q;
    });
  }
  async function vLoad() { V = (await CT.api('/api/campteam/surveys?campId=' + encodeURIComponent(S.campId))).items; vRender(); }
  function vRender() {
    var w = P.canW(), h = '<p class="hint">' + esc(CT.t('vIntro')) + '</p><div class="p-bar">' + (w ? '<button class="btn pri" id="vNew">' + esc(CT.t('vNew')) + '</button>' : '') + '</div>';
    h += V.map(function (s) {
      return '<div class="card p-series"><div class="p-row"><span class="p-main"><b>' + esc(CT.lang() === 'en' && s.titleEn ? s.titleEn : s.title) + '</b> <span class="chip ' + (s.status === 'open' ? 'ok' : '') + '">' + esc(CT.t(s.status === 'open' ? 'vOpen' : 'vClosed')) + '</span><small>' + esc(CT.t('vQuestions')) + ' ' + s.questions.length + ' · ' + esc(CT.t('vResp')(s.responses)) + '</small></span></div>' +
        (s.link ? '<div class="p-new"><input readonly value="' + esc(s.link) + '" data-lnk style="flex:1;min-width:200px"><button class="btn sm" data-copy="' + esc(s.id) + '">' + esc(CT.t('vCopy')) + '</button></div><p class="hint">' + esc(CT.t('vLinkNote')) + '</p>' : '') +
        (w ? '<div class="p-new"><button class="btn sm" data-link="' + esc(s.id) + '" data-on="' + (s.hasLink ? '0' : '1') + '">' + esc(CT.t(s.hasLink ? 'vLinkOff' : 'vLinkOn')) + '</button> <button class="btn sm" data-res="' + esc(s.id) + '">' + esc(CT.t('vResults')) + '</button> <button class="btn sm" data-edit="' + esc(s.id) + '">' + esc(CT.t('vEdit')) + '</button> <button class="btn sm" data-st="' + esc(s.id) + '" data-to="' + (s.status === 'open' ? 'closed' : 'open') + '">' + esc(CT.t(s.status === 'open' ? 'vClose' : 'vReopen')) + '</button> <button class="btn sm danger" data-del="' + esc(s.id) + '">' + esc(CT.t('vDel')) + '</button></div>' : '') + '<div class="vres" id="vres-' + esc(s.id) + '"></div></div>';
    }).join('') || '<div class="empty">—</div>';
    $('pView').innerHTML = h;
  }
  function surveyDlg(s) {
    var title = s ? s.title : CT.t('vDefaultTitle'), txt = s ? qsToText(s.questions) : '';
    P.dialog(CT.t(s ? 'vEdit' : 'vNew'), [{ n: 'title', l: 'vTitle' }, { n: 'qs', l: 'vQs', t: 'area' }], { title: title, qs: txt }, async function (o) {
      var qs = textToQs(o.qs); if (!qs.length && !s) { await api('/api/campteam/surveys', 'POST', { campId: S.campId, title: o.title }); await vLoad(); return; } if (!qs.length) throw new Error(CT.t('vNoQ'));
      if (s) await api('/api/campteam/surveys?id=' + encodeURIComponent(s.id), 'PATCH', { title: o.title, questions: qs }); else await api('/api/campteam/surveys', 'POST', { campId: S.campId, title: o.title, questions: qs });
      await vLoad();
    });
    var ta = document.querySelector('#pForm [name=qs]'); if (ta) { ta.rows = 9; ta.placeholder = CT.t('vQsHint'); }
  }
  async function vHandle(e) {
    var t = function (a) { return e.target.closest('[' + a + ']'); }, id;
    try {
      if (e.target.closest('#vNew')) return surveyDlg(null);
      if ((id = t('data-edit'))) return surveyDlg(V.filter(function (x) { return x.id === id.dataset.edit; })[0]);
      if ((id = t('data-link'))) { await api('/api/campteam/surveys?id=' + encodeURIComponent(id.dataset.link), 'PATCH', { link: id.dataset.on === '1' }); return vLoad(); }
      if ((id = t('data-st'))) { await api('/api/campteam/surveys?id=' + encodeURIComponent(id.dataset.st), 'PATCH', { status: id.dataset.to }); return vLoad(); }
      if ((id = t('data-del'))) return P.del('/api/campteam/surveys', id.dataset.del, vLoad);
      if ((id = t('data-copy'))) { var inp = id.closest('.card').querySelector('[data-lnk]'); try { await navigator.clipboard.writeText(inp.value); } catch (x) { inp.select(); document.execCommand('copy'); } id.textContent = CT.t('vCopied'); return; }
      if ((id = t('data-res'))) { var box = $('vres-' + id.dataset.res), r = await CT.api('/api/campteam/survey-results?id=' + encodeURIComponent(id.dataset.res)); box.innerHTML = resultHtml(r); }
    } catch (er) { alert(er.message); }
  }
  function resultHtml(r) {
    if (!r.responses) return '<p class="hint">' + esc(CT.t('vNoAns')) + '</p>';
    return '<p><b>' + esc(CT.t('vResp')(r.responses)) + '</b></p>' + r.summary.map(function (q) {
      var title = '<div><b>' + esc(CT.lang() === 'en' && q.en ? q.en : q.ko) + '</b> <small>(' + q.n + ')</small></div>';
      if (q.type === 'rating') return title + '<div class="v-bar"><b>' + esc(CT.t('vAvg')) + ' ' + (q.avg == null ? '—' : q.avg) + '</b>' + q.dist.map(function (n, i) { return '<span class="chip">' + (i + 1) + '★ ' + n + '</span>'; }).join(' ') + '</div>';
      if (q.type === 'choice') return title + '<div class="v-bar">' + q.options.map(function (o) { return '<span class="chip">' + esc(CT.lang() === 'en' && o.en ? o.en : o.ko) + ' ' + o.n + '</span>'; }).join(' ') + '</div>';
      return title + '<ul class="p-list">' + q.texts.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
    }).join('');
  }

  P.add('wizard', { label: 'wLabel', needCamp: true, load: async function () { await wLoad(); $('pView').onclick = wHandle; } });
  P.add('close', { label: 'xLabel', needCamp: true, load: async function () { await xLoad(); $('pView').onclick = xHandle; } });
  P.add('survey', { label: 'vLabel', needCamp: true, load: async function () { await vLoad(); $('pView').onclick = vHandle; } });
})();
