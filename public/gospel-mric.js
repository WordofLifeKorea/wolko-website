/* MRIC 레이아웃 — MRIC Statistics Report 입력 화면과 같은 순서·이름·설명으로 이번 달 숫자를 보여 주는 새 창.
   복음 통계 화면의 "MRIC 레이아웃" 버튼이 ?month=YYYY-MM&place=all|mainland|jeju 로 연다. 데이터는 /api/portal/gospel-stats 의 합계를 그대로 쓴다. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TOKEN_KEY = 'wolko-hub-token', API = '/api/portal/gospel-stats';
  var PLACES = { all: ['통합', 'Mainland + Jeju'], mainland: ['평택', 'Mainland (Pyeongtaek)'], jeju: ['제주', 'Jeju'] };
  var qs = new URLSearchParams(location.search);
  var month = /^\d{4}-\d{2}$/.test(qs.get('month') || '') ? qs.get('month') : '';
  var place = PLACES[qs.get('place')] ? qs.get('place') : 'all';
  var data = null;

  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function num(n) { return Number(n || 0).toLocaleString('en-US'); }
  function shift(m, d) { var p = m.split('-'); return new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1 + d, 1)).toISOString().slice(0, 7); }
  function monthParts(m) { var p = m.split('-'); return { name: new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, 1)).toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' }), year: p[0], ko: p[0] + '년 ' + Number(p[1]) + '월' }; }

  var HQ_SECTIONS = [
    { title: 'GOSPEL REACH', cols: ['Events', 'Audience', 'Salvation', 'Dedications'], rows: [
      { name: 'CAMPS', cells: [['campCount', 'Number of camps this month, one-day or longer.'], ['campAttendance', 'Campers plus camp crew. Monthly total.'], ['campSalvations', 'Total salvations this month in camp ministry.'], ['campDedications', 'Total dedications this month in camp ministry.']] },
      { name: 'EVANGELISTIC EVENTS', cells: [null, ['eeAttendance', 'Total attendance to all evangelistic events this month (sports, musical, family picnic, etc.)'], ['eeSalvations', 'Total salvations in all evangelistic events this month.'], ['eeDedications', 'Total dedications in all evangelistic events this month.']] },
      { name: 'PERSONAL EVANGELISM', cells: [null, ['evangelism', 'Total audience in one-on-one or small group Gospel conversations not included in other categories.'], ['salvation', 'Total salvations this month from personal evangelism.'], null] },
      { name: 'OTHER GOSPEL REACH', header: true },
      { name: 'Literature Distribution', sub: true, cells: [null, ['literature', 'Total number of tracts (or similar) distributed. No Gospel conversations.'], null, null] },
      { name: 'Social Media Outreach', sub: true, cells: [null, ['social', 'Total audience of evangelistic social media outreach that month (posts, reels, videos, etc.)'], null, null] },
    ] },
    { title: 'DISCIPLESHIP', cols: ['Enrollment'], rows: [
      { name: 'BIBLE INSTITUTE', cells: [['bibleInstitute', 'Number of students enrolled this month.']] },
      { name: 'DISCIPLESHIP TRAINING CENTER', note: 'Bible school, trade school, or similar.', cells: [['dtc', 'Number of students enrolled this month.']] },
      { name: 'SYME/E4L Discipleships Training Center (ESL focus)', cells: [['symeE4l', 'Number of students enrolled this month.']] },
      { name: 'PRIMARY/SECONDARY SCHOOL', cells: [['school', 'Number of students enrolled this month.']] },
      { name: 'EXTENSION TRAINING', note: 'Formal Bible courses held off-property.', cells: [['extension', 'Number of students enrolled this month.']] },
      { name: 'CONFERENCES AND OTHER BIBLE TEACHING EVENTS', cells: [['conferences', 'Total attendance to these events this month.']] },
    ] },
    { title: 'LOCAL CHURCH MINISTRIES', cols: ['A', 'B', 'C'], rows: [
      { name: 'LOCAL CHURCHES CONNECTED TO:', crs: true, cells: [['churchA', 'Number of local churches with close relationship: Bible Club training, use all resources, attend most events.'], ['churchB', 'Number of local churches with good relationship: sporadic training, use some resources, attend some events.'], ['churchC', 'Number of local churches with good contact: Some use of QT, attend some events.']] },
      { name: 'Count', header: true },
      { name: 'CHILDREN CLUBS', cells: [['childrenClubs', 'Club Count at the end of the month.']] },
      { name: 'YOUTH/TEEN/STUDENT CLUBS', cells: [['youthClubs', 'Club Count at the end of the month.']] },
      { name: 'LEADERSHIP TRAINING ATTENDANCE', crs: true, cells: [['leadershipTraining', 'Number of leaders trained this month.']] },
      { name: 'WEEKLY CLUB ATTENDANCE', cells: [['weeklyClubAttendance', 'Sum of the weekly average attendance of all club programs for this month.']] },
    ] },
  ];

  function setUrl() { try { history.replaceState(null, '', '?month=' + encodeURIComponent(data.month) + '&place=' + place); } catch (e) { /* 괜찮다 */ } }

  function render() {
    var x = (data.summary && data.summary[place]) || {}, mp = monthParts(data.month);
    document.title = 'MRIC Statistics Report — ' + mp.name + ' ' + mp.year;
    $('mricMonth').textContent = mp.ko;
    $('mricPrev').disabled = data.month <= data.earliest;
    $('mricNext').disabled = data.month >= data.reportMonth;

    document.querySelectorAll('[data-place]').forEach(function (b) { b.classList.toggle('is-on', b.dataset.place === place); b.setAttribute('aria-pressed', String(b.dataset.place === place)); });
    var html = '<dl class="gs-mricmeta"><div><dt>Location</dt><dd>' + esc(PLACES[place][1]) + '</dd></div><div><dt>Month</dt><dd>' + esc(mp.name) + '</dd></div><div><dt>Year</dt><dd>' + esc(mp.year) + '</dd></div></dl>';
    HQ_SECTIONS.forEach(function (sec) {
      html += '<h3 class="gs-mrichead">' + esc(sec.title) + '</h3><div class="gs-mrictablewrap"><table class="gs-mrictable"><thead><tr><th></th>' + sec.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>';
      sec.rows.forEach(function (row) {
        if (row.header) { html += '<tr class="is-group"><th colspan="' + (sec.cols.length + 1) + '">' + esc(row.name) + '</th></tr>'; return; }
        html += '<tr><th scope="row"' + (row.sub ? ' class="is-sub"' : '') + '>' + esc(row.name) + (row.note ? ' <span class="gs-mricnote">' + esc(row.note) + '</span>' : '') + (row.crs ? ' <span class="gs-crsbadge" title="CRS">CRS</span>' : '') + '</th>'
          + sec.cols.map(function (c, i) { var cell = row.cells[i]; return cell ? '<td><div class="gs-mricbox">' + num(x[cell[0]]) + '</div><small>' + esc(cell[1]) + '</small></td>' : '<td></td>'; }).join('') + '</tr>';
      });
      html += '</tbody></table></div>';
    });
    var hasMinistry = (data.summary.counts && data.summary.counts.ministry) > 0;
    html += '<p class="gs-hqnote">※ 교회·클럽 수와 등록 학생 수는 그 달 말 기준으로 입력된 값이에요.<br>※ 연결 교회 A/B/C와 리더십 훈련은 CRS 교회 기록에서 불러온 값이에요.' + (hasMinistry ? '' : '<br><b>이 달 사역 현황(제자훈련·지역교회)은 아직 입력되지 않았어요.</b>') + '</p>';
    $('mricBody').innerHTML = '<div class="gs-mric">' + html + '</div>';
    setUrl();
  }

  /* 달 이동: 누르는 즉시 달 이름을 바꾸고 로딩 표시를 띄운다. 한 번 받은 달은 기억해 두었다가 바로 보여 주고, 앞뒤 달은 미리 받아 둔다.
     빠르게 여러 번 눌러도 마지막으로 고른 달만 그린다. */
  var cache = {}, inflight = {}, seq = 0, want = '';
  function fetchMonth(m) {
    if (cache[m]) return Promise.resolve(cache[m]);
    if (inflight[m]) return inflight[m];   // 미리 받는 중인 달을 고르면 그 요청을 같이 기다린다
    return (inflight[m] = fetch(API + (m ? '?month=' + encodeURIComponent(m) : ''), { headers: { Authorization: 'Bearer ' + (sessionStorage.getItem(TOKEN_KEY) || '') }, cache: 'no-store' })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          if (res.status === 401) { var e = new Error('login'); e.login = true; throw e; }
          if (!res.ok) throw new Error(body.error || '불러오지 못했어요.');
          cache[body.month] = body; return body;
        });
      }).finally(function () { delete inflight[m]; }));
  }
  function prefetch() {
    if (!data) return;
    [shift(data.month, -1), shift(data.month, 1)].forEach(function (m) { if (m >= data.earliest && m <= data.reportMonth && !cache[m]) fetchMonth(m).catch(function () {}); });
  }
  function setBusy(on) { $('mricApp').classList.toggle('is-loading', on); $('mricMonth').classList.toggle('is-busy', on); $('mricApp').setAttribute('aria-busy', String(on)); }
  async function load(m) {
    var mine = ++seq;
    if (data) {   // 처음이 아니면: 화면은 그대로 두고 달 이름만 먼저 바꾼 뒤 로딩 표시
      want = m; $('mricMonth').textContent = monthParts(m).ko;
      $('mricPrev').disabled = m <= data.earliest; $('mricNext').disabled = m >= data.reportMonth;
      if (!cache[m]) setBusy(true);
    } else { $('mricStatus').hidden = false; $('mricStatus').textContent = '불러오는 중…'; }
    try {
      var body = await fetchMonth(m);
      if (mine !== seq) return;            // 그 사이에 다른 달을 골랐다
      data = body; want = ''; $('mricStatus').hidden = true; $('mricApp').hidden = false; setBusy(false); render(); prefetch();
    } catch (e) {
      if (mine !== seq) return;
      setBusy(false); want = '';
      if (e.login) { $('mricStatus').hidden = false; $('mricStatus').innerHTML = '로그인이 필요해요. 포탈에서 로그인한 뒤 복음 통계에서 다시 열어 주세요.'; return; }
      if (data) render();                  // 실패하면 보던 달로 되돌린다
      $('mricStatus').hidden = false; $('mricStatus').textContent = e.message;
    }
  }

  $('mricPrev').addEventListener('click', function () { if (data) { var from = want || data.month; if (from > data.earliest) load(shift(from, -1)); } });
  /** 연·월 이름을 누르면 연·월 선택기가 열린다 — 일(日)은 고르지 않는다 */
  $('mricMonth').addEventListener('click', function () {
    if (!data || !window.GospelMonthPick) return;
    window.GospelMonthPick.open($('mricMonth'), { mode: 'month', lang: 'ko', value: data.month, min: data.earliest, max: data.reportMonth, onPick: function (v) { if (v !== data.month) load(v); } });
  });
  $('mricNext').addEventListener('click', function () { if (data) { var from = want || data.month; if (from < data.reportMonth) load(shift(from, 1)); } });
  document.querySelectorAll('[data-place]').forEach(function (b) { b.addEventListener('click', function () { place = b.dataset.place; if (data) render(); }); });
  load(month);
})();
