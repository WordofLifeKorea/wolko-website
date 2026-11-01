/* 캠프 준비의 나머지 탭: 시작 마법사 · 마감 마법사. prep.js 가 만든 CTPrep 에 탭을 더한다. (평가 설문 탭은 prep-survey.js 로 옮겼다 — 여기에는 마감 마법사가 쓰는 「답 n개」 문구만 남겼다) */
(function () {
  var P = window.CTPrep; if (!P) return;
  CT.addDict({
    ko: { wLabel: '시작 마법사', xLabel: '마감 마법사', vLabel: '평가 설문',
      wIntro: '새 캠프를 시작할 때 지난 캠프에서 쓸 만한 것만 골라 가져와요. 가져온 업무는 담당자가 비어 있고, 날짜는 시작일 차이만큼 옮겨요. 고른 것만 복사돼요.', wBase: '기준이 될 지난 캠프', wRecommend: '✨ 루미에게 추천받기', wRecBusy: '루미가 고르는 중…', wRecAi: '루미 추천', wRecRule: '비슷한 순서(AI 꺼짐 또는 연결 안 됨)', wCounts: function (c) { return '업무 ' + c.tasks + ' · 진행표 ' + c.timeline + ' · 준비물 ' + c.supplies + ' · 자료 ' + c.files; },
      wPick: '이 캠프로 후보 보기', wTasks: '업무', wTimeline: '진행표', wSupplies: '준비물', wFiles: '자료(연결만 해요)', wAll: '전체 선택', wNone: '없음', wApply: '고른 것 가져오기', wDone: function (c) { return '가져왔어요 — 업무 ' + c.tasks + ', 진행표 ' + c.timeline + ', 준비물 ' + c.supplies + ', 자료 ' + c.files + '.'; },
      wNoStart: '이 캠프의 시작 날짜가 없어서 진행표는 옮기지 못해요(날짜를 먼저 정해 주세요). 업무 기한도 옮기지 않아요.', wNoSrc: '비교할 지난 캠프가 없어요.', wSkipDate: function (n) { return '진행표 ' + n + '줄은 시작 날짜가 없어 건너뛰었어요.'; },
      xIntro: '캠프가 끝났을 때 점검하고 정리해요. 자동으로 바뀌는 건 없고, 고른 것만 적용돼요.', xOpen: '아직 끝나지 않은 업무', xNA: '해당 없음 처리(지우지 않고 상태만 바꿔요)', xNone: '남은 업무가 없어요 👍', xCheck: '점검', xFollow: '후속 업무 제안 (담당·기한은 비워 만들어요)', xExists: '이미 있음', xStatus: '캠프 상태를 「완료」로 바꾸기', xApply: '적용하기',
      xFiles: function (n, u) { return '자료 ' + n + '개' + (u ? ' (태그 없는 것 ' + u + '개 — AI 정리함으로 태그를 달 수 있어요)' : ''); }, xSupplies: function (n) { return n ? '아직 준비 끝나지 않은 준비물 ' + n + '개' : '준비물 정리 끝'; }, xMeet: function (n) { return '회의 ' + n + '개'; }, xMoney: function (b, l) { return '예산 항목 ' + b + '개 · 장부 거래 ' + l + '건 — 정산은 재정 화면에서 확인하세요'; }, xSurvey: '평가 설문', xDone: function (r) { return '적용했어요 — 해당 없음 ' + r.markedNA + ', 후속 업무 ' + r.added + (r.status === 'done' ? ', 캠프 완료' : '') + '.'; },
      vResp: function (n) { return '답 ' + n + '개'; } },
    en: { wLabel: 'Start wizard', xLabel: 'Close-out wizard', vLabel: 'Survey',
      wIntro: 'When you start a new camp, pick only what is useful from a past camp. Copied tasks have no owner and dates shift by the difference in start dates. Only what you tick is copied.', wBase: 'Past camp to base it on', wRecommend: '✨ Ask Lumi to recommend', wRecBusy: 'Lumi is choosing…', wRecAi: 'Lumi recommends', wRecRule: 'Similarity order (AI off or unavailable)', wCounts: function (c) { return 'Tasks ' + c.tasks + ' · Timeline ' + c.timeline + ' · Supplies ' + c.supplies + ' · Files ' + c.files; },
      wPick: 'Show candidates from this camp', wTasks: 'Tasks', wTimeline: 'Timeline', wSupplies: 'Supplies', wFiles: 'Files (link only)', wAll: 'Select all', wNone: 'None', wApply: 'Copy selected', wDone: function (c) { return 'Copied — tasks ' + c.tasks + ', timeline ' + c.timeline + ', supplies ' + c.supplies + ', files ' + c.files + '.'; },
      wNoStart: 'This camp has no start date, so the timeline cannot be shifted (set the date first). Task due dates are not shifted either.', wNoSrc: 'There is no past camp to compare.', wSkipDate: function (n) { return n + ' timeline rows were skipped because there is no start date.'; },
      xIntro: 'Review and tidy up after a camp. Nothing changes automatically; only what you choose is applied.', xOpen: 'Tasks not finished yet', xNA: 'Mark as not applicable (status only, nothing is deleted)', xNone: 'No open tasks 👍', xCheck: 'Checks', xFollow: 'Suggested follow-up tasks (created without owner or due date)', xExists: 'Already exists', xStatus: 'Set the camp status to Done', xApply: 'Apply',
      xFiles: function (n, u) { return n + ' files' + (u ? ' (' + u + ' without tags — Lumi can tag them)' : ''); }, xSupplies: function (n) { return n ? n + ' supplies not ready yet' : 'Supplies all settled'; }, xMeet: function (n) { return n + ' meetings'; }, xMoney: function (b, l) { return b + ' budget lines · ' + l + ' ledger entries — settle in Finance'; }, xSurvey: 'Evaluation survey', xDone: function (r) { return 'Applied — not applicable ' + r.markedNA + ', follow-ups ' + r.added + (r.status === 'done' ? ', camp marked done' : '') + '.'; },
      vResp: function (n) { return n + ' responses'; } }
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

  P.add('wizard', { label: 'wLabel', needCamp: true, load: async function () { await wLoad(); $('pView').onclick = wHandle; } });
  P.add('close', { label: 'xLabel', needCamp: true, load: async function () { await xLoad(); $('pView').onclick = xHandle; } });
})();
