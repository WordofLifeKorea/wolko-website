(function () {
  CT.addDict({
    ko: { trlTitle: '번역 도우미', trlSub: '설교문·공지·일정표를 한국어 ↔ 영어로 옮겨 드려요. 팀 용어집 단어는 그대로 지켜요.', trlKind: '글의 종류', trlDir: '방향', trlPh: '번역할 글을 붙여 넣으세요…', trlGo: '✨ 번역하기', trlCopy: '복사', trlSwap: '결과를 다시 넣기', trlGloss: '용어집 관리',
      kGeneral: '일반', kSermon: '설교·메시지', kNotice: '공지·안내문', kSchedule: '일정표', dAuto: '자동 (글의 언어 반대로)', dKoEn: '한국어 → 영어', dEnKo: '영어 → 한국어', trlBusy: '루미가 번역하는 중…', trlDone: function (n) { return '번역했어요 (' + n + '자). 꼭 한 번 읽고 고쳐서 쓰세요.'; }, trlCopied: '복사했어요.',
      trlNote: '글은 번역하는 동안 AI 서비스로 보내지고, 포털에는 저장되지 않아요. 성경 구절은 팀이 쓰는 공식 번역본으로 직접 바꿔 넣어 주세요. 하루 40번까지 쓸 수 있어요.', trlOff: 'AI 번역이 아직 켜지지 않았어요.', trlNoMember: '캠프팀 팀원만 쓸 수 있어요.' },
    en: { trlTitle: 'Translation helper', trlSub: 'Translates sermons, notices and schedules between Korean and English. Team glossary terms are kept as they are.', trlKind: 'Kind of text', trlDir: 'Direction', trlPh: 'Paste the text to translate…', trlGo: '✨ Translate', trlCopy: 'Copy', trlSwap: 'Use result as input', trlGloss: 'Manage glossary',
      kGeneral: 'General', kSermon: 'Sermon / message', kNotice: 'Notice', kSchedule: 'Schedule', dAuto: 'Auto (opposite of the text language)', dKoEn: 'Korean → English', dEnKo: 'English → Korean', trlBusy: 'Lumi is translating…', trlDone: function (n) { return 'Translated (' + n + ' characters). Please read and adjust it before using.'; }, trlCopied: 'Copied.',
      trlNote: 'The text is sent to the AI service while translating and is not stored in the portal. Please replace Bible verses with your team\'s approved translation. Up to 40 translations a day.', trlOff: 'AI translation is not turned on yet.', trlNoMember: 'Only camp team members can use this.' }
  });
  var $ = function (id) { return document.getElementById(id); }, esc = CT.esc, busy = false;
  function fill() {
    var k = $('trlKind').value, d = $('trlDir').value;
    $('trlKind').innerHTML = [['general', 'kGeneral'], ['sermon', 'kSermon'], ['notice', 'kNotice'], ['schedule', 'kSchedule']].map(function (x) { return '<option value="' + x[0] + '">' + esc(CT.t(x[1])) + '</option>'; }).join('');
    $('trlDir').innerHTML = [['', 'dAuto'], ['en', 'dKoEn'], ['ko', 'dEnKo']].map(function (x) { return '<option value="' + x[0] + '">' + esc(CT.t(x[1])) + '</option>'; }).join('');
    if (k) $('trlKind').value = k; if (d) $('trlDir').value = d;
  }
  async function go() {
    var text = $('trlIn').value.trim(); if (!text || busy) return; busy = true; $('trlGo').disabled = true; $('trlMsg').textContent = CT.t('trlBusy'); $('trlOut').value = '';
    try { var r = await CT.api('/api/campteam/translate', { method: 'POST', body: { text: text, kind: $('trlKind').value, to: $('trlDir').value } }); $('trlOut').value = r.text; $('trlMsg').textContent = CT.t('trlDone')(r.text.length); $('trlCopy').hidden = false; $('trlSwap').hidden = false; }
    catch (e) { $('trlMsg').textContent = e.message; }
    busy = false; $('trlGo').disabled = false;
  }
  CT.boot(async function () {
    fill(); CT.applyI18n();
    try { var st = await CT.api('/api/campteam/translate'); if (!st.member) { $('trlMsg').textContent = CT.t('trlNoMember'); $('trlGo').disabled = true; } else if (!st.configured) { $('trlMsg').textContent = CT.t('trlOff'); $('trlGo').disabled = true; } } catch (e) { /* 안내만 못 보여 줄 뿐 */ }
    $('trlIn').addEventListener('input', function () { $('trlCount').textContent = $('trlIn').value.length; });
    $('trlGo').onclick = go;
    $('trlCopy').onclick = async function () { try { await navigator.clipboard.writeText($('trlOut').value); $('trlMsg').textContent = CT.t('trlCopied'); } catch (e) { $('trlOut').select(); document.execCommand('copy'); } };
    $('trlSwap').onclick = function () { $('trlIn').value = $('trlOut').value; $('trlOut').value = ''; $('trlCount').textContent = $('trlIn').value.length; $('trlCopy').hidden = true; $('trlSwap').hidden = true; $('trlDir').value = ''; };
    document.addEventListener('ct-lang', function () { fill(); CT.applyI18n(); });
  });
})();
