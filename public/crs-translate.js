/* CRS 입력 자동 번역 — 화면 쪽 도우미. 한글로 적은 글은 영어로, 영어로 적은 글은 한글로 번역해 같은 기록 안의 tr 에 함께 저장한다.
 *   tr = { 칸이름: { l: 번역 언어('en'|'ko'), t: 번역문, s: 번역할 때의 원문, v: 번역 방식 판(TR_V) } }
 * 교회 · 사람 · 장소 이름은 "Sarang Church (사랑의교회)"처럼 원문을 괄호로 함께 적는다. 판(v)이 TR_V 보다 낮은 예전 번역은 화면에는 그대로 쓰되,
 * 다음에 저장하거나 CRS 를 열 때 뒤에서 새 방식으로 다시 번역한다.
 * 원문이 나중에 고쳐지면 s 가 달라져 낡은 번역은 쓰지 않고(원문을 보여 주고), 저장할 때 새로 번역한다.
 * 번역 서버(/api/portal/crs-translate)가 없거나 실패하면 번역 없이 원문만 저장 — 저장을 막지 않는다. */
(function () {
  'use strict';
  var API = '/api/portal/crs-translate', TOKEN_KEY = 'wolko-hub-token', MAX = 30, TIMEOUT = 20000;
  var TR_V = 2;
  // 주소(location)는 지도 검색 · 위치에는 입력한 원문을 그대로 쓰고, 번역은 화면에 보여 줄 때만 쓴다. 교단은 거르기(필터)에 원문을 쓴다.
  var CHURCH_FIELDS = { churchName: 'church', pastorName: 'person', assignedMissionary: 'person', denomination: 'church', location: 'address', notes: 'note' };
  var VISIT_FIELDS = { visitor: 'person', notes: 'note' };
  var ENTRY_FIELDS = { person: 'person' };

  /** 한글 글자가 글자 수의 30% 이상이면 ko, 아니면 en — 괄호 속(함께 적은 고유명사)은 빼고 본다 (서버 detectLang 과 같은 규칙) */
  function detectRaw(s) { var ko = (s.match(/[가-힣]/g) || []).length, en = (s.match(/[A-Za-z]/g) || []).length; return ko > 0 && ko / (ko + en) >= 0.3 ? 'ko' : 'en'; }
  function detectLang(text) {
    var s = String(text == null ? '' : text), bare = s.replace(/\([^()]*\)/g, ' ');
    return /[가-힣A-Za-z]/.test(bare) ? detectRaw(bare) : detectRaw(s);
  }
  var hasLetters = function (s) { return /[가-힣A-Za-z]/.test(String(s == null ? '' : s)); };
  var textOf = function (obj, key) { return obj && obj[key] != null ? String(obj[key]).trim() : ''; };

  /** 지금 화면 언어로 보여 줄 글 — 원문과 같은 언어면 원문, 다른 언어이고 새 번역이 있으면 번역, 아니면 원문 */
  function pick(obj, key, lang) {
    var v = obj && obj[key] != null ? String(obj[key]) : '', e = obj && obj.tr && obj.tr[key];
    return e && e.t && e.l === lang && e.s === v.trim() ? e.t : v;
  }
  /** 번역이 있으면(어느 언어든 새 것) 그 글, 검색용 */
  function searchText(obj, keys) {
    var out = [];
    keys.forEach(function (k) { var e = obj && obj.tr && obj.tr[k]; out.push(obj && obj[k] != null ? String(obj[k]) : ''); if (e && e.t && e.s === textOf(obj, k)) out.push(e.t); });
    return out.join(' ').toLowerCase();
  }
  /** 지금 방식(판)의 새 번역인지 */
  function fresh(e, v) { return !!(e && e.t && e.s === v && (e.v || 1) >= TR_V); }
  /** 새 번역이 필요한 칸 — 글이 있고(글자가 포함) 아직 번역이 없거나, 원문이 달라졌거나, 예전 방식 번역인 것 */
  function missing(obj, fields, prevTr) {
    var tr = prevTr || (obj && obj.tr) || {};
    return Object.keys(fields).filter(function (k) { var v = textOf(obj, k); return v && hasLetters(v) && !fresh(tr[k], v); });
  }
  function authHeaders() { var h = { 'Content-Type': 'application/json' }; try { h.Authorization = 'Bearer ' + (sessionStorage.getItem(TOKEN_KEY) || ''); } catch (e) { /* 토큰 없이 시도 → 401 → 번역 없이 저장 */ } return h; }

  /** items: [{ text, kind }] → [{ lang, text } | null] 또는 null(번역 서버가 없거나 실패) */
  async function request(items) {
    if (!items.length) return [];
    var ctl = typeof AbortController === 'function' ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, TIMEOUT) : null;
    try {
      var res = await fetch(API, { method: 'POST', headers: authHeaders(), body: JSON.stringify({ items: items.slice(0, MAX) }), signal: ctl ? ctl.signal : undefined });
      if (!res.ok) return null;
      var body = await res.json().catch(function () { return null; });
      return body && Array.isArray(body.results) ? body.results : null;
    } catch (e) { return null; } finally { if (timer) clearTimeout(timer); }
  }

  /** 한 기록(obj)의 새 번역이 필요한 칸을 번역해, 새로 만든 tr 을 돌려준다(이미 새 번역인 칸은 그대로 유지). 번역이 하나도 없으면 null */
  async function fill(obj, fields, prevTr) {
    var tr = {}, keep = prevTr || (obj && obj.tr) || {};
    Object.keys(keep).forEach(function (k) { if (fields[k] && keep[k] && keep[k].t && keep[k].s === textOf(obj, k)) tr[k] = keep[k]; });   // 예전 판도 새 번역이 올 때까지는 남겨 둔다
    var keys = missing(obj, fields, keep);
    if (keys.length) {
      var got = await request(keys.map(function (k) { return { text: textOf(obj, k), kind: fields[k] }; }));
      if (got) keys.forEach(function (k, i) { if (got[i] && got[i].text) tr[k] = { l: got[i].lang, t: got[i].text, s: textOf(obj, k), v: TR_V }; });
    }
    return Object.keys(tr).length ? tr : null;
  }
  /** 여러 기록을 한 번에(한 번 호출에 최대 30칸) — jobs: [{ obj, fields }] → [tr | null, …] 같은 순서. 칸이 많으면 앞쪽부터 30칸까지만 */
  async function fillMany(jobs) {
    var flat = [], plan = jobs.map(function (j) {
      var keys = missing(j.obj, j.fields, j.obj && j.obj.tr), picked = [];
      keys.forEach(function (k) { if (flat.length < MAX) { picked.push(k); flat.push({ text: textOf(j.obj, k), kind: j.fields[k] }); } });
      return picked;
    });
    var got = flat.length ? await request(flat) : [];
    var at = 0;
    return jobs.map(function (j, n) {
      var tr = {}, keep = (j.obj && j.obj.tr) || {};
      Object.keys(keep).forEach(function (k) { if (j.fields[k] && keep[k] && keep[k].t && keep[k].s === textOf(j.obj, k)) tr[k] = keep[k]; });
      plan[n].forEach(function (k) { var r = got && got[at]; at++; if (r && r.text) tr[k] = { l: r.lang, t: r.text, s: textOf(j.obj, k), v: TR_V }; });
      return Object.keys(tr).length ? tr : null;
    });
  }

  window.CrsTr = { TR_V: TR_V, detectLang: detectLang, pick: pick, searchText: searchText, missing: missing, fill: fill, fillMany: fillMany, request: request, CHURCH_FIELDS: CHURCH_FIELDS, VISIT_FIELDS: VISIT_FIELDS, ENTRY_FIELDS: ENTRY_FIELDS };
})();
