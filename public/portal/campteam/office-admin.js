/* 설정 화면(관리자): 팀 사무실 캐릭터 그림 올리기. 그림 파일 이름은 이름-종류.png (예: sample-seated.png). 올린 그림은 캠프팀 DB 에만 보관된다. */
(function () {
  CT.addDict({
    ko: { spTitle: '팀 사무실 캐릭터 그림', spHelp: '캐릭터 그림 PNG 파일을 여러 장 한꺼번에 골라 올려요. 파일 이름은 그대로 쓰세요(예: sample-seated.png, sample-walk1.png, guest-stand.png, desk.png). 올린 그림은 로그인한 캠프팀 사람에게만 보이고, 팀원 연결은 별도로 해요. 같은 이름으로 다시 올리면 바뀌어요.', spPick: '그림 파일 고르기 (여러 장)', spCount: '올라와 있는 그림: ', spUnit: '장', spBusy: '올리는 중… ', spDone: '올렸어요: ', spFail: '올리지 못한 파일: ', spNone: '아직 올라온 그림이 없어요.' },
    en: { spTitle: 'Team office character images', spHelp: 'Pick many character PNG files at once and upload them. Keep the file names as they are (e.g. sample-seated.png, sample-walk1.png, guest-stand.png, desk.png). Uploaded images are visible only to signed-in camp team members; linking them to members is done separately. Uploading the same name again replaces it.', spPick: 'Choose image files (several)', spCount: 'Images uploaded: ', spUnit: '', spBusy: 'Uploading… ', spDone: 'Uploaded: ', spFail: 'Failed: ', spNone: 'No images uploaded yet.' },
  });
  var $ = function (id) { return document.getElementById(id); };
  async function count() {
    try { var r = await CT.api('/api/campteam/office-sprite'), n = Object.keys(r.sprites || {}); $('spStat').textContent = n.length ? CT.t('spCount') + n.length + CT.t('spUnit') : CT.t('spNone'); } catch (e) { $('spStat').textContent = ''; }
  }
  document.addEventListener('ct-ready', function () {
    var sec = $('spSec'); if (!sec || !CT.me || !CT.me.perms || !CT.me.perms.manageMembers) return; sec.hidden = false; CT.applyI18n(); count();
    $('spFiles').onchange = async function () {
      var files = [].slice.call($('spFiles').files), ok = 0, bad = []; if (!files.length) return;
      for (var i = 0; i < files.length; i++) {
        $('spStat').textContent = CT.t('spBusy') + (i + 1) + '/' + files.length;
        var f = files[i], name = f.name.replace(/\.png$/i, '').toLowerCase();
        try { var r = await fetch('/api/campteam/office-sprite?k=' + encodeURIComponent(name), { method: 'PUT', headers: { Authorization: 'Bearer ' + CT.token() }, body: f }); if (r.ok) ok++; else bad.push(f.name); } catch (e) { bad.push(f.name); }
      }
      $('spFiles').value = ''; await count();
      $('spStat').textContent += ' · ' + CT.t('spDone') + ok + (bad.length ? ' · ' + CT.t('spFail') + bad.join(', ') : '');
    };
  });
})();
