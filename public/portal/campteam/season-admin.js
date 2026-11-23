/* 설정 화면(관리자): 홈·TV 계절 배경을 팀 전체에 한꺼번에 정한다. 고른 값은 캠프팀 DB 에 한 줄로 저장된다. */
(function () {
  CT.addDict({
    ko: { fxTitle: '계절 배경 (홈 · TV 전체)', fxHelp: '홈 화면과 TV 에 보이는 계절 배경을 팀 전체에 한꺼번에 정해요. 「자동」은 날짜로 바뀌어요 (봄 3~5월 · 여름 6~8월 · 가을 9월~11월 19일 · 겨울 11월 20일~2월). 「날씨 따라」는 눈이 오면 겨울, 비가 오면 장마 배경이 돼요. 사람마다 홈 오른쪽 위 버튼으로 효과를 끌 수는 있어요. TV 는 「자동」일 때도 눈이나 비가 오는 날에는 그 날씨가 먼저 나와요. 「효과 없음」은 움직이는 눈·비·꽃잎만 없애고, TV 하늘 배경(해·구름)은 TV 설정의 「하늘 배경」에서 따로 켜고 꺼요.',
      fxAuto: '자동 (날짜대로)', fxWeather: '날씨 따라 (눈·비가 오면 바뀜)', fxSpring: '🌸 봄 (벚꽃)', fxSummer: '☀ 여름 (햇살)', fxRain: '🌧 장마 (빗줄기)', fxAutumn: '🍁 가을 (단풍)', fxWinter: '❄ 겨울 (눈)', fxNone: '효과 없음',
      fxSaved: '저장했어요. 홈과 TV 는 곧 바뀌어요 (TV 는 10분 안에).', fxFail: '저장하지 못했어요: ' },
    en: { fxTitle: 'Seasonal background (Home · TV, whole team)', fxHelp: 'Choose the seasonal background for the Home screen and the TV for the whole team at once. "Auto" follows the date (spring Mar–May · summer Jun–Aug · autumn Sep 1–Nov 19 · winter Nov 20–Feb). "Follow weather" shows winter when it snows and rainy season when it rains. Each person can still turn the effect off with the button at the top right of Home. On the TV, snow or rain on the day still shows first even with "Auto". "No effect" only removes the moving snow, rain and petals; the TV sky (sun, clouds) is turned on or off separately in the TV settings ("Sky background").',
      fxAuto: 'Auto (by date)', fxWeather: 'Follow weather (changes with snow/rain)', fxSpring: '🌸 Spring (petals)', fxSummer: '☀ Summer (sunshine)', fxRain: '🌧 Rainy season (rain)', fxAutumn: '🍁 Autumn (leaves)', fxWinter: '❄ Winter (snow)', fxNone: 'No effect',
      fxSaved: 'Saved. Home and TV will update shortly (TV within 10 minutes).', fxFail: 'Could not save: ' }
  });
  var $ = function (id) { return document.getElementById(id); }, MODES = ['auto', 'weather', 'spring', 'summer', 'rain', 'autumn', 'winter', 'off'], KEY = { auto: 'fxAuto', weather: 'fxWeather', spring: 'fxSpring', summer: 'fxSummer', rain: 'fxRain', autumn: 'fxAutumn', winter: 'fxWinter', off: 'fxNone' };
  function opts(cur) { $('fxSel').innerHTML = MODES.map(function (m) { return '<option value="' + m + '"' + (m === cur ? ' selected' : '') + '>' + CT.t(KEY[m]) + '</option>'; }).join(''); }
  document.addEventListener('ct-ready', async function () {
    var sec = $('fxSec'); if (!sec || !CT.me || !CT.me.perms || !CT.me.perms.manageMembers) return; sec.hidden = false; CT.applyI18n();
    var cur = 'auto'; try { cur = (await CT.api('/api/campteam/season-fx')).mode || 'auto'; } catch (e) { /* 기본값 */ } opts(cur);
    document.addEventListener('ct-lang', function () { opts($('fxSel').value); });
    $('fxSave').onclick = async function () {
      $('fxStat').textContent = ''; $('fxSave').disabled = true;
      try { await CT.api('/api/campteam/season-fx', { method: 'POST', body: { mode: $('fxSel').value } }); $('fxStat').textContent = CT.t('fxSaved'); }
      catch (e) { $('fxStat').textContent = CT.t('fxFail') + e.message; }
      $('fxSave').disabled = false;
    };
  });
})();
