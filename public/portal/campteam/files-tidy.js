/* 자료 정리 제안: 한·영 짝 묶기 + 중복·최신본. 제안만 보여 주고, 사람이 「묶기」「휴지통으로」를 눌러야 적용된다. */
(function () {
  CT.addDict({
    ko: { tdBtn: '🧹 정리 제안', tdTitle: '자료 정리 제안', tdIntro: '같은 내용의 한국어·영어 자료를 짝으로 묶고, 똑같거나 비슷한 자료를 찾아 드려요. 확인하고 누른 것만 바뀌어요.', tdLoad: '찾는 중…', tdAi: '✨ 루미에게 더 찾아 달라고 하기',
      tdAiBusy: '루미가 제목을 보고 짝을 찾는 중…', tdAiNone: 'AI 가 새로 찾은 짝이 없어요.', tdPairs: '한·영 짝 후보', tdDupes: '중복·최신본 후보', tdNone: '지금 정리할 게 없어요.', tdPair: '짝으로 묶기', tdSure: '이름이 같아요', tdMaybe: 'AI 추천', tdKeep: '남길 것(가장 최근)',
      tdTrash: '나머지는 휴지통으로', tdIdent: '똑같은 파일', tdSimilar: '이름이 비슷해요', tdTrashConfirm: function (n) { return n + '개를 휴지통으로 보낼까요? (휴지통에서 되살릴 수 있어요)'; }, tdPaired: '묶었어요.', tdTrashed: '휴지통으로 보냈어요.', tdClose: '닫기',
      tdPartner: '한·영 짝', tdUnpair: '짝 풀기', tdUnpairConfirm: '이 짝을 풀까요?' },
    en: { tdBtn: '🧹 Tidy suggestions', tdTitle: 'Tidy suggestions', tdIntro: 'Pairs Korean and English versions of the same document and finds identical or similar files. Only what you confirm changes.', tdLoad: 'Looking…', tdAi: '✨ Ask Lumi to find more',
      tdAiBusy: 'Lumi is matching titles…', tdAiNone: 'AI found no new pairs.', tdPairs: 'Korean ↔ English pair candidates', tdDupes: 'Duplicates / latest version', tdNone: 'Nothing to tidy right now.', tdPair: 'Pair them', tdSure: 'Same name', tdMaybe: 'AI suggestion', tdKeep: 'Keep (most recent)',
      tdTrash: 'Move the rest to trash', tdIdent: 'Identical file', tdSimilar: 'Similar name', tdTrashConfirm: function (n) { return 'Move ' + n + ' file(s) to the trash? (You can restore them from the trash.)'; }, tdPaired: 'Paired.', tdTrashed: 'Moved to trash.', tdClose: 'Close',
      tdPartner: 'Korean ↔ English pair', tdUnpair: 'Unpair', tdUnpairConfirm: 'Unpair these files?' }
  });
  var esc = CT.esc, $ = function (id) { return document.getElementById(id); };
  var S = { ai: false };
  function langTag(f) { return f.lang === 'ko' ? '🇰🇷' : f.lang === 'en' ? '🇺🇸' : ''; }
  function fileLine(f) { return '<span class="td-f">' + langTag(f) + ' <b>' + esc(f.title) + '</b>' + (f.fileName ? ' <small>' + esc(f.fileName) + '</small>' : '') + '</span>'; }
  function render(d) {
    var h = '<p class="meta">' + esc(CT.t('tdIntro')) + '</p>';
    h += '<h4>' + esc(CT.t('tdPairs')) + ' (' + d.pairs.length + ')</h4>';
    h += d.pairs.length ? d.pairs.map(function (p, i) {
      return '<div class="td-row">' + fileLine(p.a) + ' ↔ ' + fileLine(p.b) + ' <span class="chip ' + (p.sure ? 'ok' : '') + '">' + esc(CT.t(p.sure ? 'tdSure' : 'tdMaybe')) + '</span>' + (p.reason ? ' <small>' + esc(p.reason) + '</small>' : '') +
        ' <button class="btn sm pri" data-pair="' + i + '">' + esc(CT.t('tdPair')) + '</button></div>';
    }).join('') : '<p class="meta">' + esc(CT.t('tdNone')) + '</p>';
    if (d.aiOn && !S.ai) h += '<p><button class="btn sm" id="tdAi">' + esc(CT.t('tdAi')) + '</button></p>';
    h += '<h4>' + esc(CT.t('tdDupes')) + ' (' + d.dupes.length + ')</h4>';
    h += d.dupes.length ? d.dupes.map(function (g, i) {
      return '<div class="td-row"><div><span class="chip ok">' + esc(CT.t('tdKeep')) + '</span> ' + fileLine(g.keep) + '</div>' + g.others.map(function (o) { return '<div class="td-sub">· ' + fileLine(o) + ' <small>' + esc(o.updatedAt.slice(0, 10)) + '</small></div>'; }).join('') +
        '<span class="chip">' + esc(CT.t(g.why === 'identical' ? 'tdIdent' : 'tdSimilar')) + '</span> <button class="btn sm danger" data-trash="' + i + '">' + esc(CT.t('tdTrash')) + '</button></div>';
    }).join('') : '<p class="meta">' + esc(CT.t('tdNone')) + '</p>';
    h += '<div class="dlg-actions"><button class="btn" id="tdClose">' + esc(CT.t('tdClose')) + '</button></div>';
    $('tidyBody').innerHTML = h; S.data = d;
    $('tdClose').onclick = function () { $('tidyDlg').close(); };
    if ($('tdAi')) $('tdAi').onclick = function () { load(true); };
  }
  async function load(ai) {
    $('tidyBody').innerHTML = '<p class="meta">' + esc(CT.t(ai ? 'tdAiBusy' : 'tdLoad')) + '</p>';
    try { var d = await CT.api('/api/campteam/file-tidy' + (ai ? '?ai=1' : '')); if (ai) { S.ai = true; if (!d.aiUsed || d.pairs.length === 0) { /* 새 제안 없음 */ } } render(d); }
    catch (e) { $('tidyBody').innerHTML = '<p class="err">' + esc(e.message) + '</p><div class="dlg-actions"><button class="btn" id="tdClose">' + esc(CT.t('tdClose')) + '</button></div>'; $('tdClose').onclick = function () { $('tidyDlg').close(); }; }
  }
  async function act(body, okKey) { try { await CT.api('/api/campteam/file-tidy', { method: 'POST', body: body }); await load(S.ai); document.dispatchEvent(new CustomEvent('ct-files-changed')); } catch (e) { alert(e.message); } }
  CT.boot(function () {
    var bar = document.querySelector('.top .actions'); if (!bar || !CT.can('files', 'edit')) return;
    var dlg = document.createElement('dialog'); dlg.id = 'tidyDlg'; dlg.className = 'wide'; dlg.innerHTML = '<h3 data-t="tdTitle"></h3><div id="tidyBody"></div>'; document.body.appendChild(dlg);
    var b = document.createElement('button'); b.className = 'btn'; b.id = 'tidyBtn'; b.textContent = CT.t('tdBtn'); bar.insertBefore(b, bar.firstChild);
    b.onclick = function () { CT.applyI18n(); dlg.showModal(); S.ai = false; load(false); };
    dlg.addEventListener('click', function (e) {
      var x = e.target.closest('button'); if (!x) return;
      if (x.dataset.pair != null) { var pr = S.data.pairs[+x.dataset.pair]; act({ action: 'pair', a: pr.a.id, b: pr.b.id }); }
      else if (x.dataset.trash != null) { var g = S.data.dupes[+x.dataset.trash]; if (confirm(CT.t('tdTrashConfirm')(g.others.length))) act({ action: 'trash', ids: g.others.map(function (o) { return o.id; }) }); }
    });
    document.addEventListener('ct-lang', function () { b.textContent = CT.t('tdBtn'); if (dlg.open && S.data) render(S.data); });
  });
  /* 상세 창에 한·영 짝 표시 (files.js 가 detail 을 그린 뒤) */
  window.CTTidy = { partnerHtml: function (partner) { return partner ? '<dt>' + esc(CT.t('tdPartner')) + '</dt><dd>' + langTag(partner) + ' <a href="#" data-open-partner="' + esc(partner.id) + '">' + esc(partner.title) + '</a> <button class="btn sm" data-unpair="1">' + esc(CT.t('tdUnpair')) + '</button></dd>' : ''; } };
})();
