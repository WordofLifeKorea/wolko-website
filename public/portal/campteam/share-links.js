/* 진행표 공개 링크 관리 (진행표를 고칠 수 있는 팀원만). 「지금」 화면의 「공개 링크」 버튼에서 열린다.
   링크를 아는 사람은 누구나 일정을 「보기만」 할 수 있다(로그인 없음). 내부 메모·연락처·금액·파일은 나가지 않고, 담당자 이름은 켠 경우에만 보인다. */
(function () {
  var CT = window.CT; if (!CT) return;
  CT.addDict({
    ko: { shTitle: '진행표 공개 링크', shWhat: '링크를 아는 사람은 누구나 일정을 볼 수 있어요(보기만, 로그인 없음). 내부 메모·연락처·금액·파일은 보이지 않아요. 안 쓰는 링크는 「끄기」로 바로 막을 수 있어요.',
      shNew: '새 링크 만들기', shLabel: '이름 (예: 찬양팀 단톡방용)', shExpire: '이 날까지 열려 있어요', shExpireHint: '비워 두면 기한이 없어요. 캠프가 끝나고 2주 뒤로 미리 채워 뒀어요.', shOwners: '담당자 이름 보이기', shOwnersHint: '꺼 두면 담당자 이름은 숨겨요.',
      shTeams: '보여 줄 팀 (아무것도 안 고르면 모든 팀)', shMake: '링크 만들기', shList: '만든 링크', shNone: '아직 만든 링크가 없어요.', shNoName: '이름 없음',
      shOn: '켜짐', shOff: '꺼짐', shExp: '기한 지남', shUntil: function (d) { return d ? d + '까지' : '기한 없음'; }, shViews: function (n, last) { return '열어 본 횟수 ' + n + '번' + (last ? ' · 마지막 ' + last : ' · 아직 안 열렸어요'); },
      shCopy: '링크 복사', shCopied: '복사했어요', shOpen: '열어 보기', shRevoke: '끄기', shReplace: '새 링크로 바꾸기', shClose: '닫기', shOwnerOn: '담당자 이름 보임', shTeamsOnly: function (t) { return '팀: ' + t; },
      shConfirmOff: '이 링크를 끌까요? 이미 받은 사람도 바로 못 열어요.', shConfirmNew: '지금 링크는 끄고 새 링크를 만들어요. 이미 보낸 링크는 못 열게 돼요. 계속할까요?', shCopyManual: '아래 주소를 길게 눌러 복사해 주세요.' },
    en: { shTitle: 'Public timeline links', shWhat: 'Anyone who has the link can see the schedule (read only, no login). Internal notes, contacts, money and files are never shown. Turn a link off any time to block it right away.',
      shNew: 'Create a new link', shLabel: 'Name (e.g. for the worship team chat)', shExpire: 'Open until', shExpireHint: 'Leave empty for no expiry. Prefilled with two weeks after camp ends.', shOwners: 'Show owner names', shOwnersHint: 'When off, owner names are hidden.',
      shTeams: 'Teams to show (none selected = all teams)', shMake: 'Create link', shList: 'Your links', shNone: 'No links yet.', shNoName: 'Untitled',
      shOn: 'On', shOff: 'Off', shExp: 'Expired', shUntil: function (d) { return d ? 'until ' + d : 'no expiry'; }, shViews: function (n, last) { return 'Opened ' + n + ' times' + (last ? ' · last ' + last : ' · not opened yet'); },
      shCopy: 'Copy link', shCopied: 'Copied', shOpen: 'Open', shRevoke: 'Turn off', shReplace: 'Replace with a new link', shClose: 'Close', shOwnerOn: 'Owner names shown', shTeamsOnly: function (t) { return 'Teams: ' + t; },
      shConfirmOff: 'Turn this link off? People who already have it will not be able to open it.', shConfirmNew: 'This turns off the current link and creates a new one. Links already sent stop working. Continue?', shCopyManual: 'Long-press the address below to copy it.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, ctx = null, data = null, msg = '';
  var urlOf = function (tok) { return location.origin + '/portal/campteam/cue/?t=' + encodeURIComponent(tok); };
  function when(iso) { var d = new Date(iso); return isNaN(d) ? '' : (d.getMonth() + 1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

  function paint() {
    var body = $('shBody'), items = data ? data.items : [];
    var teamBox = ctx.teams.length ? '<fieldset class="sh-teams"><legend>' + esc(CT.t('shTeams')) + '</legend>' + ctx.teams.map(function (t) { return '<label class="sh-ck"><input type="checkbox" name="team" value="' + esc(t.name) + '"><span>' + esc(t.name) + '</span></label>'; }).join('') + '</fieldset>' : '';
    var form = '<form id="shForm" class="form" method="dialog"><h4>' + esc(CT.t('shNew')) + '</h4>' +
      '<label>' + esc(CT.t('shLabel')) + '<input name="label" maxlength="60"></label>' +
      '<label>' + esc(CT.t('shExpire')) + '<input name="expiresDate" type="date" value="' + esc(data ? data.defaultExpiry : '') + '"></label><p class="meta">' + esc(CT.t('shExpireHint')) + '</p>' +
      '<label class="sh-ck big"><input type="checkbox" name="showOwners"><span><b>' + esc(CT.t('shOwners')) + '</b><small>' + esc(CT.t('shOwnersHint')) + '</small></span></label>' + teamBox +
      '<div class="err" id="shErr" hidden></div><div class="dlg-actions"><button type="submit" class="btn pri">' + esc(CT.t('shMake')) + '</button></div></form>';
    var list = items.length ? items.map(function (it) {
      var on = it.status === 'active', st = on ? CT.t('shOn') : it.status === 'expired' ? CT.t('shExp') : CT.t('shOff');
      var extra = [CT.t('shUntil')(it.expiresDate), it.showOwners ? CT.t('shOwnerOn') : '', it.teams ? CT.t('shTeamsOnly')(it.teams.split(',').join(', ')) : ''].filter(Boolean).join(' · ');
      return '<div class="sh-item ' + it.status + '"><div class="sh-top"><b>' + esc(it.label || CT.t('shNoName')) + '</b><span class="chip ' + (on ? 'ok' : '') + '">' + esc(st) + '</span></div><div class="meta">' + esc(extra) + '</div><div class="meta">' + esc(CT.t('shViews')(it.viewCount, when(it.lastViewedAt))) + '</div>' +
        (on ? '<input class="sh-url" readonly value="' + esc(urlOf(it.token)) + '" aria-label="url">' : '') +
        '<div class="sh-act">' + (on ? '<button type="button" class="btn sm pri" data-sh="copy" data-id="' + esc(it.id) + '">' + esc(CT.t('shCopy')) + '</button><a class="btn sm" target="_blank" rel="noopener" href="' + esc(urlOf(it.token)) + '">' + esc(CT.t('shOpen')) + '</a><button type="button" class="btn sm danger" data-sh="off" data-id="' + esc(it.id) + '">' + esc(CT.t('shRevoke')) + '</button>' : '') +
        (it.status !== 'revoked' ? '<button type="button" class="btn sm" data-sh="new" data-id="' + esc(it.id) + '">' + esc(CT.t('shReplace')) + '</button>' : '') + '</div></div>';
    }).join('') : '<div class="empty">' + esc(CT.t('shNone')) + '</div>';
    body.innerHTML = '<h3>' + esc(CT.t('shTitle')) + ' · ' + esc(ctx.campName || '') + '</h3><p class="meta">' + esc(CT.t('shWhat')) + '</p>' + form + '<h4>' + esc(CT.t('shList')) + '</h4><div id="shMsg" class="meta" role="status">' + esc(msg) + '</div><div class="sh-list">' + list + '</div>' +
      '<div class="dlg-actions"><button type="button" class="btn" id="shX">' + esc(CT.t('shClose')) + '</button></div>';
    $('shX').onclick = function () { $('shDlg').close(); };
    $('shForm').onsubmit = async function (e) {
      e.preventDefault(); var fd = new FormData($('shForm')), err = $('shErr'); err.hidden = true;
      try { await CT.api('/api/campteam/share-links', { method: 'POST', body: { campId: ctx.campId, label: fd.get('label'), expiresDate: fd.get('expiresDate'), showOwners: fd.get('showOwners') === 'on', teams: fd.getAll('team') } }); msg = ''; await load(); }
      catch (ex) { err.textContent = ex.message; err.hidden = false; }
    };
  }
  async function load() { data = await CT.api('/api/campteam/share-links?campId=' + encodeURIComponent(ctx.campId)); paint(); }
  async function copy(url, input) {
    try { await navigator.clipboard.writeText(url); msg = CT.t('shCopied'); }
    catch (e) { if (input) { input.focus(); input.select(); try { document.execCommand('copy'); msg = CT.t('shCopied'); } catch (e2) { msg = CT.t('shCopyManual'); } } }
    var m = $('shMsg'); if (m) m.textContent = msg;
  }
  document.addEventListener('click', async function (e) {
    var b = e.target.closest && e.target.closest('[data-sh]'); if (!b || !ctx || !data) return;
    var id = b.getAttribute('data-id'), it = data.items.filter(function (x) { return x.id === id; })[0], a = b.getAttribute('data-sh'); if (!it) return;
    try {
      if (a === 'copy') { await copy(urlOf(it.token), b.closest('.sh-item').querySelector('.sh-url')); return; }
      if (a === 'off') { if (!confirm(CT.t('shConfirmOff'))) return; await CT.api('/api/campteam/share-links?id=' + encodeURIComponent(id), { method: 'DELETE' }); msg = ''; await load(); }
      if (a === 'new') { if (!confirm(CT.t('shConfirmNew'))) return; await CT.api('/api/campteam/share-links', { method: 'POST', body: { action: 'replace', id: id } }); msg = ''; await load(); }
    } catch (ex) { var m = $('shMsg'); if (m) m.textContent = ex.message; }
  });
  window.CTShareLinks = { open: function (c) { ctx = c; data = null; msg = ''; $('shBody').innerHTML = '<p>' + esc(CT.t('loading')) + '</p>'; $('shDlg').showModal(); load().catch(function (ex) { $('shBody').innerHTML = '<div class="err">' + esc(ex.message) + '</div>'; }); } };
})();
