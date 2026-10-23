/* 복음 통계 — 월간 복음 전도 보고. 화면 틀은 /portal/gospel-stats/, 데이터는 /api/portal/gospel-stats (항목 정의도 API 가 내려준다). */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var TOKEN_KEY = 'wolko-hub-token';
  var API = '/api/portal/gospel-stats';

  var I18N = {
    ko: {
      pageTitle: '복음 통계', docTitle: '복음 통계 — WOLKO',
      intro: '매달 복음을 전한 기록을 보고하고, 평택과 제주의 통계를 함께 확인합니다.',
      loading: '불러오는 중…', loginTitle: '포탈 로그인', loginHelp: 'WOLKO 포탈 계정으로 로그인해 주세요.', email: '이메일', password: '비밀번호', loginBtn: '로그인하고 계속하기', loginFail: '로그인하지 못했습니다.',
      minus: '1 줄이기', plus: '1 늘리기', infoLabel: function (name) { return name + ' 설명 보기'; }, thisMonth: '이번 달', write: '내 보고 쓰기', xlsx: '엑셀 보고서 내려받기', csv: '원본 CSV',
      tabAll: '통합', tabMainland: '평택', tabJeju: '제주',
      kGospel: '복음을 전한 사람', kSalv: '구원 고백 (전체)', kDed: '헌신 (전체)', kReach: '캠프·행사 참석',
      count: function (n, ind, team, all) { return n + '건 보고' + (all ? ' (개인 ' + ind + ' · 팀 ' + team + ')' : ''); }, countNone: '아직 이 달에 보고가 없어요.',
      tableTitle: '항목별 통계', trendTitle: '최근 6개월 추이', rowsTitle: '보고별 목록',
      rowsHelp: '마스터와 관리자에게만 보여요. 팀으로 낸 보고는 팀원이 따로 내지 않는 것을 전제로 합계에 그대로 더해요.',
      item: '항목', combined: '통합', month: '달', reports: '보고',
      rName: '보고자', rPlace: '위치', rType: '유형', rUpdated: '수정', individual: '개인', team: '팀', teamOf: function (n) { return '팀 · ' + n; },
      mineTitle: '내가 낸 보고', edit: '고치기', del: '지우기', delAsk: '이 보고를 지울까요?',
      formTitle: '월간 복음 전도 보고', formMonth: '보고하는 달', formWho: '개인 / 팀', formTeam: '팀 이름', formTeamPh: '예: 평택 캠프팀', formPlace: '위치 (평택 또는 제주)',
      placeMainland: '평택', placeJeju: '제주', save: '저장하기', saving: '저장 중…', cancel: '닫기',
      formLoaded: '이미 낸 보고를 불러왔어요. 고쳐서 저장하면 덮어써요.', saved: '저장했어요.', savedUpdated: '고쳐서 저장했어요.',
      needPlace: '위치(평택 또는 제주)를 선택해 주세요.', needTeam: '팀 이름을 입력해 주세요.',
      warnSalv: '구원 고백이 복음을 전한 사람보다 많아요. 맞는지 한 번 더 확인해 주세요.', warnCamp: '캠프의 구원·헌신이 캠프 참석자보다 많아요. 맞는지 확인해 주세요.', warnEvent: '행사의 구원·헌신이 행사 참석자보다 많아요. 맞는지 확인해 주세요.',
      denied: '불러오지 못했어요. 잠시 후 다시 시도해 주세요.', sessionEnd: '로그인이 필요해요.',
      monthLabel: function (m) { var p = m.split('-'); return p[0] + '년 ' + Number(p[1]) + '월'; },
    },
    en: {
      pageTitle: 'Gospel Stats', docTitle: 'Gospel Stats — WOLKO',
      intro: 'Report your monthly Gospel outreach and see Pyeongtaek and Jeju statistics together.',
      loading: 'Loading…', loginTitle: 'Portal login', loginHelp: 'Please sign in with your WOLKO portal account.', email: 'Email', password: 'Password', loginBtn: 'Sign in and continue', loginFail: 'Could not sign in.',
      minus: 'Decrease by 1', plus: 'Increase by 1', infoLabel: function (name) { return 'What is “' + name + '”?'; }, thisMonth: 'This month', write: 'Write my report', xlsx: 'Download Excel report', csv: 'Raw CSV',
      tabAll: 'Combined', tabMainland: 'Pyeongtaek', tabJeju: 'Jeju',
      kGospel: 'People shared the Gospel with', kSalv: 'Salvations (total)', kDed: 'Dedications (total)', kReach: 'Camp & event attendance',
      count: function (n, ind, team, all) { return n + ' report' + (n === 1 ? '' : 's') + (all ? ' (' + ind + ' individual · ' + team + ' team)' : ''); }, countNone: 'No reports for this month yet.',
      tableTitle: 'Statistics by item', trendTitle: 'Last 6 months', rowsTitle: 'Reports',
      rowsHelp: 'Visible to the master and admins only. Team reports are added to the totals as they are, assuming team members do not report separately.',
      item: 'Item', combined: 'Combined', month: 'Month', reports: 'Reports',
      rName: 'Reporter', rPlace: 'Location', rType: 'Type', rUpdated: 'Updated', individual: 'Individual', team: 'Team', teamOf: function (n) { return 'Team · ' + n; },
      mineTitle: 'My reports', edit: 'Edit', del: 'Delete', delAsk: 'Delete this report?',
      formTitle: 'Monthly Gospel Outreach Report', formMonth: 'Month', formWho: 'Individual / Team', formTeam: 'Team name', formTeamPh: 'e.g. Pyeongtaek Camp Team', formPlace: 'Location (Pyeongtaek or Jeju)',
      placeMainland: 'Pyeongtaek', placeJeju: 'Jeju', save: 'Save', saving: 'Saving…', cancel: 'Close',
      formLoaded: 'Loaded the report you already submitted. Saving will overwrite it.', saved: 'Saved.', savedUpdated: 'Updated.',
      needPlace: 'Please choose a location (Pyeongtaek or Jeju).', needTeam: 'Please enter a team name.',
      warnSalv: 'Salvations are higher than the number of people you shared the Gospel with. Please double-check.', warnCamp: 'Camp salvations/dedications are higher than camp attendance. Please double-check.', warnEvent: 'Event salvations/dedications are higher than event attendance. Please double-check.',
      denied: 'Could not load. Please try again shortly.', sessionEnd: 'Please sign in.',
      monthLabel: function (m) { var p = m.split('-'); return new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }); },
    },
  };
  var lang = (function () { try { return localStorage.getItem('wolkoCarLang') === 'en' ? 'en' : 'ko'; } catch (e) { return 'ko'; } })();
  var t = function (key) { var v = I18N[lang][key]; if (v === undefined) v = I18N.ko[key]; if (typeof v === 'function') return v.apply(null, Array.prototype.slice.call(arguments, 1)); return v === undefined ? key : v; };
  var tx = function (obj) { return (obj && (obj[lang] || obj.ko)) || ''; };
  var esc = function (v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var num = function (n) { return Number(n || 0).toLocaleString(lang === 'en' ? 'en-US' : 'ko-KR'); };

  var data = null;          // 지금 보는 달의 API 응답
  var cache = {};           // 달 → 응답 (보고 쓸 때 다른 달의 내 보고를 찾기 위해)
  var tab = 'all';          // all | mainland | jeju
  var viewMonth = null;
  var editing = null;       // 고치는 중인 보고(없으면 새 보고)

  function headers(json) { var h = { Authorization: 'Bearer ' + (sessionStorage.getItem(TOKEN_KEY) || '') }; if (json) h['Content-Type'] = 'application/json'; return h; }
  function show(which) { $('loadStatus').hidden = which !== 'loading'; $('loginPanel').hidden = which !== 'login'; $('app').hidden = which !== 'app'; }
  function say(msg) { $('note').textContent = msg || ''; if (msg) { clearTimeout(say.timer); say.timer = setTimeout(function () { $('note').textContent = ''; }, 4000); } }

  async function fetchMonth(month) {
    var res = await fetch(API + '?month=' + encodeURIComponent(month), { headers: headers() });
    var body = await res.json().catch(function () { return {}; });
    if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); var e = new Error(t('sessionEnd')); e.auth = true; throw e; }
    if (!res.ok) throw new Error(body.error || t('denied'));
    cache[month] = body;
    return body;
  }

  async function load(month) {
    try {
      data = await fetchMonth(month || (data && data.current) || '');
      viewMonth = data.month;
      show('app');
      render();
    } catch (error) {
      if (error.auth) { show('login'); return; }
      show('app'); say(error.message);
    }
  }

  /* ───────── 보기 ───────── */
  var SELECTED = { all: 'all', mainland: 'mainland', jeju: 'jeju' };
  function totals(src, key) { return (src && src[SELECTED[key]]) || {}; }
  function sumSalv(x) { return (x.salvation || 0) + (x.campSalvations || 0) + (x.eeSalvations || 0); }
  function sumDed(x) { return (x.campDedications || 0) + (x.eeDedications || 0); }
  function sumReach(x) { return (x.campAttendance || 0) + (x.eeAttendance || 0); }

  function render() {
    document.documentElement.lang = lang;
    document.title = t('docTitle');
    document.querySelectorAll('[data-t]').forEach(function (el) { var v = t(el.dataset.t); if (typeof v === 'string') el.textContent = v; });
    $('langKoBtn').classList.toggle('is-active', lang === 'ko');
    $('langEnBtn').classList.toggle('is-active', lang === 'en');
    if (!data) return;
    $('monthLabel').textContent = t('monthLabel', data.month);
    // 달 이름을 누르면 포탈 공용 달력이 열린다 — 아무 날짜나 고르면 그 날짜가 속한 달로 이동한다(허용 범위 밖이면 가장 가까운 달)
    var pick = $('monthPick');
    pick.dataset.calYears = data.earliest.slice(0, 4) + ',' + data.current.slice(0, 4);
    pick.value = data.month + '-' + (data.month === data.current ? String(new Date().getDate()).padStart(2, '0') : '01');
    $('prevMonth').disabled = data.month <= data.earliest;
    $('nextMonth').disabled = data.month >= data.current;
    $('csvBtn').hidden = !data.me.canReview;
    $('xlsxBtn').hidden = !data.me.canReview;
    renderTabs(); renderKpis(); renderCharts(); renderTable(); renderTrend(); renderRows(); renderMine();
  }

  function renderCharts() { if (window.GospelCharts && $('charts')) window.GospelCharts.render($('charts'), { data: data, tab: tab, lang: lang }); }

  function renderTabs() {
    var c = data.summary.counts;
    var items = [['all', t('tabAll'), c.all], ['mainland', t('tabMainland'), c.mainland], ['jeju', t('tabJeju'), c.jeju]];
    $('tabs').innerHTML = items.map(function (i) { return '<button type="button" class="gs-tab' + (tab === i[0] ? ' is-active' : '') + '" role="tab" aria-selected="' + (tab === i[0]) + '" data-tab="' + i[0] + '">' + esc(i[1]) + ' <span>' + i[2] + '</span></button>'; }).join('');
  }

  function renderKpis() {
    var x = totals(data.summary, tab), c = data.summary.counts;
    $('kpis').innerHTML = [[t('kGospel'), x.evangelism], [t('kSalv'), sumSalv(x)], [t('kDed'), sumDed(x)], [t('kReach'), sumReach(x)]]
      .map(function (k) { return '<div class="gs-kpi"><strong>' + num(k[1]) + '</strong><span>' + esc(k[0]) + '</span></div>'; }).join('');
    var n = c[tab];
    $('countLine').textContent = n ? t('count', n, c.individual, c.team, tab === 'all') : t('countNone');
  }

  function renderTable() {
    var s = data.summary, cols = [['mainland', t('tabMainland')], ['jeju', t('tabJeju')], ['all', t('combined')]];
    var html = '<thead><tr><th>' + esc(t('item')) + '</th>' + cols.map(function (c) { return '<th class="' + (tab === c[0] ? 'is-col' : '') + '">' + esc(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>';
    data.schema.sections.forEach(function (section) {
      html += '<tr class="gs-section"><td colspan="4">' + esc(tx(section.title)) + '</td></tr>';
      section.fields.forEach(function (f) {
        html += '<tr><td title="' + esc(tx(f.label)) + '">' + esc(tx(f.short)) + '</td>' + cols.map(function (c) { return '<td class="' + (tab === c[0] ? 'is-col ' : '') + (c[0] === 'all' ? 'gs-total' : '') + '">' + num(s[c[0]][f.id]) + '</td>'; }).join('') + '</tr>';
      });
    });
    $('statsTable').innerHTML = html + '</tbody>';
  }

  function renderTrend() {
    var rows = data.trend.map(function (m) { var x = totals(m, tab); return { month: m.month, gospel: x.evangelism || 0, salv: sumSalv(x), ded: sumDed(x), n: m.counts[tab] || 0 }; });
    var max = Math.max.apply(null, rows.map(function (r) { return r.gospel; }).concat([1]));
    $('trendTable').innerHTML = '<thead><tr><th>' + esc(t('month')) + '</th><th>' + esc(t('kGospel')) + '</th><th>' + esc(t('kSalv')) + '</th><th>' + esc(t('kDed')) + '</th><th>' + esc(t('reports')) + '</th></tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr><td>' + esc(t('monthLabel', r.month)) + '</td><td class="gs-bar-cell">' + num(r.gospel) + '<span class="gs-meter"><i style="width:' + Math.round(r.gospel / max * 100) + '%"></i></span></td><td>' + num(r.salv) + '</td><td>' + num(r.ded) + '</td><td>' + num(r.n) + '</td></tr>';
      }).join('') + '</tbody>';
  }

  function placeLabel(loc) { return loc === 'jeju' ? t('placeJeju') : t('placeMainland'); }
  function pill(loc) { return '<span class="gs-pill ' + (loc === 'jeju' ? 'jeju' : 'mainland') + '">' + esc(placeLabel(loc)) + '</span>'; }
  function whoLabel(r) { return r.scope === 'team' ? t('teamOf', r.teamName) : t('individual'); }
  function when(iso) { try { return new Date(iso).toLocaleDateString(lang === 'en' ? 'en-US' : 'ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric' }); } catch (e) { return ''; } }

  function renderRows() {
    $('rowsWrap').hidden = !data.rows;
    if (!data.rows) return;
    var list = data.rows.filter(function (r) { return tab === 'all' || r.location === tab; });
    $('rowsTable').innerHTML = '<thead><tr><th>' + esc(t('rName')) + '</th><th>' + esc(t('rPlace')) + '</th><th>' + esc(t('kGospel')) + '</th><th>' + esc(t('kSalv')) + '</th><th>' + esc(t('kDed')) + '</th><th>' + esc(t('rUpdated')) + '</th></tr></thead><tbody>' +
      (list.length ? list.map(function (r) {
        return '<tr><td>' + esc(r.name) + '<span class="gs-sub">' + esc(whoLabel(r)) + ' · ' + esc(r.email) + '</span></td><td>' + pill(r.location) + '</td><td>' + num(r.values.evangelism) + '</td><td>' + num(sumSalv(r.values)) + '</td><td>' + num(sumDed(r.values)) + '</td><td>' + esc(when(r.updatedAt)) + '</td></tr>';
      }).join('') : '<tr><td colspan="6" style="text-align:center;color:var(--muted)">' + esc(t('countNone')) + '</td></tr>') + '</tbody>';
  }

  function renderMine() {
    $('mineWrap').hidden = !data.mine.length;
    $('mine').innerHTML = data.mine.map(function (r) {
      return '<div class="gs-minecard"><div><strong>' + esc(whoLabel(r)) + '</strong> ' + pill(r.location) + '<small>' + esc(t('kGospel')) + ' ' + num(r.values.evangelism) + ' · ' + esc(t('kSalv')) + ' ' + num(sumSalv(r.values)) + ' · ' + esc(t('kDed')) + ' ' + num(sumDed(r.values)) + '</small></div>' +
        '<div class="gs-minebtns"><button type="button" class="gs-small" data-edit="' + esc(r.id) + '">' + esc(t('edit')) + '</button><button type="button" class="gs-small" data-del="' + esc(r.id) + '">' + esc(t('del')) + '</button></div></div>';
    }).join('');
  }

  /* ───────── 보고 쓰기 ───────── */
  function monthOptions() {
    var out = [], m = data.current;
    while (m >= data.earliest) { out.push(m); var p = m.split('-'); var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 2, 1)); m = d.toISOString().slice(0, 7); }
    return out;
  }
  function lastPlace() { try { var v = localStorage.getItem('gsLocation'); return v === 'jeju' || v === 'mainland' ? v : ''; } catch (e) { return ''; } }

  function buildForm(report) {
    var month = report ? report.month : (viewMonth >= data.earliest && viewMonth <= data.current ? viewMonth : data.current);
    var scope = report ? report.scope : 'individual';
    var place = report ? report.location : lastPlace();
    var v = (report && report.values) || {};
    var html = '<div class="gs-meta"><fieldset class="gs-fieldset"><legend>' + esc(t('formMonth')) + '</legend><select id="fMonth" class="gs-select">' + monthOptions().map(function (m) { return '<option value="' + m + '"' + (m === month ? ' selected' : '') + '>' + esc(t('monthLabel', m)) + '</option>'; }).join('') + '</select></fieldset>' +
      '<fieldset class="gs-fieldset"><legend>' + esc(t('formWho')) + '</legend><div class="gs-choices">' +
        '<label class="gs-choice"><input type="radio" name="fScope" value="individual"' + (scope === 'individual' ? ' checked' : '') + '> ' + esc(t('individual')) + '</label>' +
        '<label class="gs-choice"><input type="radio" name="fScope" value="team"' + (scope === 'team' ? ' checked' : '') + '> ' + esc(t('team')) + '</label></div>' +
        '<input id="fTeam" class="gs-text" type="text" maxlength="60" placeholder="' + esc(t('formTeamPh')) + '" aria-label="' + esc(t('formTeam')) + '" value="' + esc(report ? report.teamName : '') + '"' + (scope === 'team' ? '' : ' hidden') + '></fieldset>' +
      '<fieldset class="gs-fieldset"><legend>' + esc(t('formPlace')) + '</legend><div class="gs-choices">' +
        '<label class="gs-choice"><input type="radio" name="fPlace" value="mainland"' + (place === 'mainland' ? ' checked' : '') + '> ' + esc(t('placeMainland')) + '</label>' +
        '<label class="gs-choice"><input type="radio" name="fPlace" value="jeju"' + (place === 'jeju' ? ' checked' : '') + '> ' + esc(t('placeJeju')) + '</label></div></fieldset></div>';
    data.schema.sections.forEach(function (section) {
      html += '<section class="gs-sec"><h4 class="gs-sec-head">' + esc(tx(section.title)) + '</h4>' + section.fields.map(function (f) {
        var parts = tx(f.label).split(' — '), title = parts[0], desc = parts.slice(1).join(' — ');
        return '<div class="gs-row"><div class="gs-row-text"><label for="f_' + f.id + '"><strong>' + esc(title) + '</strong></label>'
          + (desc ? '<button type="button" class="gs-info" data-tip="' + esc(desc) + '" aria-label="' + esc(t('infoLabel', title)) + '">i</button>' : '') + '</div>'
          + '<div class="gs-step"><button type="button" class="gs-stepbtn" data-step="-1" data-for="' + f.id + '" aria-label="' + esc(t('minus')) + '">−</button>'
          + '<input id="f_' + f.id + '" type="text" inputmode="numeric" autocomplete="off" data-field="' + f.id + '" value="' + (v[f.id] ? v[f.id] : 0) + '" placeholder="0" aria-label="' + esc(title) + '">'
          + '<button type="button" class="gs-stepbtn" data-step="1" data-for="' + f.id + '" aria-label="' + esc(t('plus')) + '">+</button></div></div>';
      }).join('') + '</section>';
    });
    html += '<p class="gs-warn" id="fWarn" hidden></p><div class="gs-formbtns"><button type="submit" class="gs-primary" id="fSave">' + esc(t('save')) + '</button><button type="button" class="gs-small" id="fCancel">' + esc(t('cancel')) + '</button></div>';
    $('reportForm').innerHTML = html;
    updateWarn();
  }

  function formValues() { var out = {}; document.querySelectorAll('#reportForm [data-field]').forEach(function (i) { out[i.dataset.field] = i.value; }); return out; }
  function n(v) { var x = Number(String(v || '').replace(/[,\s]/g, '')); return Number.isFinite(x) ? x : 0; }
  function updateWarn() {
    var v = formValues(), msgs = [];
    if (n(v.salvation) > n(v.evangelism)) msgs.push(t('warnSalv'));
    if (n(v.campSalvations) > n(v.campAttendance) || n(v.campDedications) > n(v.campAttendance)) msgs.push(t('warnCamp'));
    if (n(v.eeSalvations) > n(v.eeAttendance) || n(v.eeDedications) > n(v.eeAttendance)) msgs.push(t('warnEvent'));
    var el = $('fWarn'); if (!el) return;
    el.hidden = !msgs.length; el.innerHTML = msgs.map(esc).join('<br>');
  }

  function openForm(report) {
    editing = report || null;
    buildForm(report);
    $('formError').textContent = '';
    $('formPanel').hidden = false;
    $('formPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** 달·개인/팀·팀 이름을 바꿨을 때, 이미 낸 같은 단위의 보고가 있으면 그 값을 불러온다 */
  async function syncExisting() {
    var month = $('fMonth').value, scope = document.querySelector('input[name="fScope"]:checked').value, team = ($('fTeam').value || '').trim().toLowerCase();
    var info;
    try { info = cache[month] || await fetchMonth(month); } catch (e) { return; }
    var match = info.mine.filter(function (r) { return r.scope === scope && (scope === 'individual' || String(r.teamName).toLowerCase() === team); })[0];
    if (!match) { $('formError').textContent = ''; return; }
    document.querySelectorAll('#reportForm [data-field]').forEach(function (i) { i.value = match.values[i.dataset.field] ? match.values[i.dataset.field] : 0; });
    var radio = document.querySelector('input[name="fPlace"][value="' + match.location + '"]'); if (radio) radio.checked = true;
    updateWarn();
    $('formError').textContent = t('formLoaded');
  }

  async function save(event) {
    event.preventDefault();
    var scope = document.querySelector('input[name="fScope"]:checked').value;
    var placeEl = document.querySelector('input[name="fPlace"]:checked');
    var team = ($('fTeam').value || '').trim();
    if (!placeEl) { $('formError').textContent = t('needPlace'); return; }
    if (scope === 'team' && !team) { $('formError').textContent = t('needTeam'); return; }
    $('fSave').disabled = true; $('fSave').textContent = t('saving'); $('formError').textContent = '';
    try {
      var month = $('fMonth').value;
      var res = await fetch(API, { method: 'POST', headers: headers(true), body: JSON.stringify({ month: month, scope: scope, teamName: team, location: placeEl.value, values: formValues() }) });
      var body = await res.json().catch(function () { return {}; });
      if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); show('login'); return; }
      if (!res.ok) throw new Error(body.error || t('denied'));
      try { localStorage.setItem('gsLocation', placeEl.value); } catch (e) { /* 저장 못 해도 괜찮다 */ }
      delete cache[month];
      $('formPanel').hidden = true;
      await load(month);
      say(body.updated ? t('savedUpdated') : t('saved'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      $('formError').textContent = error.message;
    } finally {
      var btn = $('fSave'); if (btn) { btn.disabled = false; btn.textContent = t('save'); }
    }
  }

  /* ───────── 이벤트 ───────── */
  function shift(delta) {
    var p = data.month.split('-'), d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1 + delta, 1));
    var next = d.toISOString().slice(0, 7);
    if (next < data.earliest || next > data.current) return;
    load(next);
  }
  $('monthLabel').addEventListener('click', function (e) { if (e.detail === 0) { $('monthPick').focus(); $('monthPick').click(); } });   // 키보드(Enter/Space)로 눌렀을 때
  $('monthPick').addEventListener('change', function () {
    var picked = String($('monthPick').value || '').slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(picked)) return;
    if (picked < data.earliest) picked = data.earliest;
    if (picked > data.current) picked = data.current;
    if (picked !== data.month) load(picked);
  });
  $('prevMonth').addEventListener('click', function () { shift(-1); });
  $('nextMonth').addEventListener('click', function () { shift(1); });
  $('thisMonth').addEventListener('click', function () { load(data.current); });
  $('writeBtn').addEventListener('click', function () { openForm(null); });
  $('tabs').addEventListener('click', function (e) { var b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; renderTabs(); renderKpis(); renderCharts(); renderTable(); renderTrend(); renderRows(); });
  $('mine').addEventListener('click', async function (e) {
    var edit = e.target.closest('[data-edit]'), del = e.target.closest('[data-del]');
    if (edit) { openForm(data.mine.filter(function (r) { return r.id === edit.dataset.edit; })[0]); return; }
    if (del) {
      if (!confirm(t('delAsk'))) return;
      del.disabled = true;
      try {
        var res = await fetch(API + '?month=' + encodeURIComponent(data.month) + '&id=' + encodeURIComponent(del.dataset.del), { method: 'DELETE', headers: headers() });
        var body = await res.json().catch(function () { return {}; });
        if (!res.ok) throw new Error(body.error || t('denied'));
        delete cache[data.month]; await load(data.month);
      } catch (error) { say(error.message); del.disabled = false; }
    }
  });
  /* ───────── (i) 설명 말풍선 ───────── */
  var tip = document.createElement('div'); tip.className = 'gs-tip'; tip.id = 'gsTip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true; document.body.appendChild(tip);
  var tipFor = null;
  function hideTip() { if (tipFor) tipFor.removeAttribute('aria-describedby'); tipFor = null; tip.hidden = true; }
  function showTip(btn) {
    if (tipFor && tipFor !== btn) tipFor.removeAttribute('aria-describedby');
    tipFor = btn; btn.setAttribute('aria-describedby', 'gsTip');
    tip.textContent = btn.dataset.tip; tip.style.left = '0px'; tip.style.top = '0px'; tip.hidden = false;
    var r = btn.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, vw = document.documentElement.clientWidth, vh = window.innerHeight;
    var left = Math.min(Math.max(8, r.left + r.width / 2 - w / 2), vw - w - 8);
    var top = r.bottom + 8; if (top + h > vh - 8) top = Math.max(8, r.top - h - 8);
    tip.style.left = left + 'px'; tip.style.top = top + 'px';
  }
  var form = $('reportForm');
  form.addEventListener('mouseover', function (e) { var b = e.target.closest('.gs-info'); if (b) showTip(b); });
  form.addEventListener('mouseout', function (e) { if (e.target.closest('.gs-info') && !(e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest('.gs-info'))) hideTip(); });
  form.addEventListener('focusin', function (e) { var b = e.target.closest('.gs-info'); if (b) showTip(b); });
  form.addEventListener('focusout', function (e) { if (e.target.closest('.gs-info')) hideTip(); });
  form.addEventListener('click', function (e) { var b = e.target.closest('.gs-info'); if (!b) return; if (tipFor === b && !tip.hidden && e.detail !== 0 && b.dataset.touched) { hideTip(); delete b.dataset.touched; } else { showTip(b); b.dataset.touched = '1'; } });
  document.addEventListener('click', function (e) { if (!e.target.closest('.gs-info')) hideTip(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(); });
  window.addEventListener('scroll', hideTip, true); window.addEventListener('resize', hideTip);

  $('reportForm').addEventListener('submit', save);
  $('reportForm').addEventListener('input', function (e) { if (e.target.matches('[data-field]')) updateWarn(); });
  $('reportForm').addEventListener('focusin', function (e) { if (e.target.matches('[data-field]')) setTimeout(function () { e.target.select(); }, 0); });
  $('reportForm').addEventListener('change', function (e) {
    if (e.target.name === 'fScope') $('fTeam').hidden = e.target.value !== 'team';
    if (e.target.id === 'fMonth' || e.target.name === 'fScope') syncExisting();
  });
  $('reportForm').addEventListener('focusout', function (e) { if (e.target.id === 'fTeam') syncExisting(); });
  $('reportForm').addEventListener('click', function (e) {
    if (e.target.id === 'fCancel') { $('formPanel').hidden = true; return; }
    var step = e.target.closest('[data-step]');
    if (step) {
      var input = $('f_' + step.dataset.for), next = Math.max(0, n(input.value) + Number(step.dataset.step));
      input.value = String(next);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  function download(format, filename) {
    return async function () {
      try {
        var res = await fetch(API + '?month=' + encodeURIComponent(data.month) + '&format=' + format, { headers: headers() });
        if (!res.ok) throw new Error(t('denied'));
        var url = URL.createObjectURL(await res.blob()), a = document.createElement('a');
        a.href = url; a.download = filename(data.month); document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      } catch (error) { say(error.message); }
    };
  }
  $('csvBtn').addEventListener('click', download('csv', function (m) { return 'gospel-stats-' + m + '.csv'; }));
  $('xlsxBtn').addEventListener('click', download('xlsx', function (m) { return 'WOLKO-Gospel-Report-' + m + '.xlsx'; }));

  function setLang(next) { if (next === lang) return; lang = next; try { localStorage.setItem('wolkoCarLang', lang); } catch (e) { /* 저장 못 해도 이 화면은 바뀐다 */ } render(); if (!$('formPanel').hidden) { var keep = { v: formValues() }; buildForm(editing); document.querySelectorAll('#reportForm [data-field]').forEach(function (i) { if (keep.v[i.dataset.field]) i.value = keep.v[i.dataset.field]; }); updateWarn(); } }
  $('langKoBtn').addEventListener('click', function () { setLang('ko'); });
  $('langEnBtn').addEventListener('click', function () { setLang('en'); });

  $('loginForm').addEventListener('submit', async function (event) {
    event.preventDefault(); $('loginError').textContent = '';
    try {
      var res = await fetch('/api/hub/account-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: $('loginEmail').value, password: $('loginPassword').value }) });
      var body = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(body.error || t('loginFail'));
      sessionStorage.setItem(TOKEN_KEY, body.hubToken); $('loginPassword').value = '';
      show('loading'); await load('');
    } catch (error) { $('loginError').textContent = error.message; }
  });

  render();
  if (sessionStorage.getItem(TOKEN_KEY)) { show('loading'); load(''); } else { show('login'); }
})();
