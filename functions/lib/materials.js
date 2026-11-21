/**
 * 교재 배포 — 교회 · 개인이 포탈의 교재를 내려받게 하고, 누가 몇 번 받았는지 기록한다.
 *
 * 흐름: 공개 자료실이 /api/materials 로 '배포 표시된' 파일 목록을 받아 보여 주고,
 *       신청 정보(구분 · 이름 · 교회 · 이메일 · 동의)를 /api/materials/request 로 보내면 10분짜리 일회용 주소를 받고,
 *       그 주소(/api/materials/get)로 받을 때 한 번만 센다(새로고침 · 중복 클릭 · 중간에 끊겨 다시 받기는 같은 번호라 한 번).
 *       PDF 는 받는 사람 이름 · 날짜 · 확인번호를 쪽마다 아래에 찍어 준다(functions/lib/pdfStamp.js).
 *
 * 저장(CAMP_KV, 마이그레이션 없음):
 *   matdl:pub:v1                       배포 표시 { files: { 'itemId:fileId': { on, at, by } } } — 포탈 자료 기록과 따로 둔다(파일을 교체해도 표시가 안 사라지게)
 *   matdl:tok:{토큰}                   일회용 주소(10분) — 신청 내용 + 확인번호
 *   matdl:log:{YYYYMM(KST)}:{확인번호}  내려받은 기록. 값 = 전체, 메타데이터 = 목록에 필요한 칸(KV 목록 한 번으로 표를 만들 수 있게)
 *   matdl:rl:{ip해시}:{시간}            남용 방지 횟수
 * IP 는 원문을 저장하지 않는다. 남용 방지 횟수(matdl:rl:*)에만 해시 앞 10자를 쓰고 하루 남짓 뒤 저절로 사라진다 — 내려받은 기록에는 IP 정보를 넣지 않는다.
 */
import { filesOf } from './portalResources.js';

export const PUB_KEY = 'matdl:pub:v1';
export const LOG_PREFIX = 'matdl:log:';
export const TOKEN_PREFIX = 'matdl:tok:';
export const TOKEN_TTL = 600;
export const KINDS = ['individual', 'church', 'group'];
export const KIND_LABEL = {
  individual: { ko: '개인', en: 'Individual' },
  church: { ko: '교회', en: 'Church' },
  group: { ko: '단체', en: 'Organization' },
};
export const STAMP_STATUS_CODE = { applied: 'a', 'applied-ascii': 'A', 'skipped-size': 's', 'skipped-encrypted': 'e', failed: 'f', none: '-' };
export const RATE_PER_HOUR = 30;   // 교회 한 곳(같은 인터넷 주소)에서 여러 교재를 연달아 받아도 걸리지 않을 만큼
export const RATE_PER_DAY = 100;

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';   // 헷갈리는 0 O 1 I L 뺌

/** 한 줄 글로 정리: 제어문자 · < > 를 지우고 공백을 하나로, 길이 제한 */
export function clean(value, max) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** 신청 정보 검사. { ok:true, value } 또는 { ok:false, error, errorEn, field } */
export function cleanRegistrant(body) {
  if (clean(body?.website, 40)) return { ok: false, error: '요청을 처리할 수 없습니다.', errorEn: 'We could not process this request.', field: 'website' };
  const kind = KINDS.includes(body?.kind) ? body.kind : '';
  if (!kind) return { ok: false, error: '개인 · 교회 · 단체 중 하나를 골라 주세요.', errorEn: 'Please choose individual, church or organization.', field: 'kind' };
  const name = clean(body?.name, 40);
  if (name.length < 2) return { ok: false, error: '이름을 적어 주세요(2글자 이상).', errorEn: 'Please enter your name (at least 2 characters).', field: 'name' };
  const needChurch = kind !== 'individual';
  const church = clean(body?.church, 50);
  if (needChurch && church.length < 2) {
    return { ok: false, error: kind === 'church' ? '교회 이름을 적어 주세요.' : '단체 이름을 적어 주세요.', errorEn: kind === 'church' ? 'Please enter your church name.' : 'Please enter your organization name.', field: 'church' };
  }
  const email = clean(body?.email, 100).toLowerCase();
  if (needChurch && !email) return { ok: false, error: '이메일을 적어 주세요(교재 소식과 문의 연락용).', errorEn: 'Please enter your email (for updates and questions about the materials).', field: 'email' };
  if (email && !EMAIL_RE.test(email)) return { ok: false, error: '이메일 주소 모양이 맞지 않아요.', errorEn: 'That email address does not look right.', field: 'email' };
  if (body?.agree !== true) return { ok: false, error: '사용 안내와 개인정보 수집에 동의해 주세요.', errorEn: 'Please agree to the usage terms and the collection of your information.', field: 'agree' };
  return { ok: true, value: { kind, name, church: needChurch ? church : clean(body?.church, 50), email, lang: body?.lang === 'en' ? 'en' : 'ko' } };
}

/** 확인번호 WL-XXXXXX (워터마크 · 기록에 같은 번호) */
export function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return 'WL-' + Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}
export function newToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 워터마크에 찍을 이름: 교회·단체는 교회(단체) 이름, 개인은 신청한 사람 이름 */
export const stampLabelOf = (r) => (r.kind === 'individual' ? r.name : r.church);

export async function ipHash(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'local';
  const data = new TextEncoder().encode(`${ip}|${env.ADMIN_PASSWORD || 'wolko'}|matdl`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest).slice(0, 5), (b) => b.toString(16).padStart(2, '0')).join('');
}

const kstParts = (ms) => new Date(ms + 9 * 3600 * 1000).toISOString();   // 'YYYY-MM-DDTHH:mm:ss.sssZ' 를 한국 시각으로 읽는다
export const kstMonthKey = (ms) => kstParts(ms).slice(0, 7).replace('-', '');   // '202611'
export const kstDate = (ms) => kstParts(ms).slice(0, 10);
export const kstDateTime = (ms) => kstParts(ms).slice(0, 16).replace('T', ' ');

/**
 * 한 시간 · 하루 신청 횟수 제한. 넘으면 true.
 * KV 에는 '읽고 더하기'를 한 번에 하는 기능이 없어 동시에 몰리면 조금 더 통과할 수 있다(어림잡은 방어 — 함정 칸과 함께 쓴다).
 * 횟수를 읽거나 쓰지 못해도(KV 쓰기 제한 등) 신청 자체는 막지 않는다.
 */
export async function rateLimited(env, hash, now = Date.now()) {
  try { return await rateLimitedUnsafe(env, hash, now); } catch { return false; }
}
async function rateLimitedUnsafe(env, hash, now) {
  const hourKey = `matdl:rl:${hash}:h${kstParts(now).slice(0, 13)}`;
  const dayKey = `matdl:rl:${hash}:d${kstParts(now).slice(0, 10)}`;
  const [h, d] = await Promise.all([env.CAMP_KV.get(hourKey), env.CAMP_KV.get(dayKey)]);
  const hour = parseInt(h || '0', 10), day = parseInt(d || '0', 10);
  if (hour >= RATE_PER_HOUR || day >= RATE_PER_DAY) return true;
  await Promise.all([
    env.CAMP_KV.put(hourKey, String(hour + 1), { expirationTtl: 3700 }),
    env.CAMP_KV.put(dayKey, String(day + 1), { expirationTtl: 90000 }),
  ]);
  return false;
}

/* ───────────── 배포 표시 ───────────── */
export async function readPublished(env) {
  const v = await env.CAMP_KV.get(PUB_KEY, 'json');
  return v && typeof v === 'object' && v.files && typeof v.files === 'object' ? v : { files: {} };
}
export async function savePublished(env, pub) {
  await env.CAMP_KV.put(PUB_KEY, JSON.stringify({ files: pub.files, updatedAt: new Date().toISOString() }));
}
export const pubKey = (itemId, fileId) => `${itemId}:${fileId}`;
export const isPdfFile = (f) => /\.pdf$/i.test(f?.fileName || '') || /pdf/i.test(f?.fileType || '');
const extOf = (name) => (String(name || '').match(/\.([a-z0-9]{1,8})$/i)?.[1] || '').toLowerCase();

/** 포탈 자료(items) 중 배포 표시된 파일만, 자료별로 묶어 공개용 모양으로 */
export function publishedGroups(items, pub) {
  const out = [];
  for (const item of Array.isArray(items) ? items : []) {
    const files = filesOf(item).filter((f) => pub.files?.[pubKey(item.id, f.id)]?.on);
    if (!files.length) continue;
    out.push({
      id: item.id,
      title: clean(item.title, 120) || '(제목 없음)',
      // 제목만 공개한다. 포탈 자료의 '진행 메모(detail)' · '번역/제작 내용(translation)'은 내부 메모라 공개 화면에 내지 않는다.
      hasThumb: /^data:image\//i.test(item.thumbnailData || ''),
      files: files.map((f) => ({
        id: f.id,
        fileName: clean(f.fileName, 200),
        size: Number(f.fileSize) || 0,
        ext: extOf(f.fileName),
        stamp: isPdfFile(f),
        updatedAt: f.uploadedAt || '',
      })),
    });
  }
  return out;
}
/** 배포 표시된 (item, file) 하나 찾기. 없으면 null */
export function findPublished(items, pub, itemId, fileId) {
  if (!pub.files?.[pubKey(itemId, fileId)]?.on) return null;
  const item = (items || []).find((i) => i.id === itemId);
  const file = item && filesOf(item).find((f) => f.id === fileId);
  return item && file ? { item, file } : null;
}

/* ───────────── 내려받은 기록 ───────────── */
const utf8Len = (s) => new TextEncoder().encode(s).length;

/** 기록 키: 달은 '신청한 때(rec.at)' 기준 — 주소를 달이 바뀐 뒤에 열어도 같은 키라 한 줄이다 */
export const logKeyOf = (rec, now = Date.now()) => `${LOG_PREFIX}${kstMonthKey(Number(rec.at) || now)}:${rec.code}`;

/** 기록 한 줄 저장. 메타데이터(1KB 한도)에는 표에 필요한 칸만 넣는다. IP 정보는 기록에 넣지 않는다 */
export async function writeDownloadLog(env, recIn, now = Date.now()) {
  const { ip: _ip, ...rec } = recIn;
  const meta = {
    t: now, i: rec.itemId, f: rec.fileId, ti: clean(rec.title, 40), k: rec.kind, n: clean(rec.name, 30), c: clean(rec.church, 50),
    e: rec.email || '', l: rec.lang, w: rec.stamp,
  };
  let metadata = meta;
  if (utf8Len(JSON.stringify(metadata)) > 1000) metadata = { ...meta, ti: '' };
  if (utf8Len(JSON.stringify(metadata)) > 1000) metadata = { ...metadata, e: meta.e.slice(0, 60) };
  const key = logKeyOf(rec, now);   // 확인번호가 키라 같은 신청이 두 번 기록되어도 한 줄로 덮어쓴다
  await env.CAMP_KV.put(key, JSON.stringify({ ...rec, t: now }), { metadata });
  return key;
}

/** 기록 읽기. month('YYYY-MM')를 주면 그 달만. 최대 max 줄 */
export async function readDownloadLogs(env, { month = '', max = 20000 } = {}) {
  const prefix = month ? `${LOG_PREFIX}${String(month).replace('-', '')}:` : LOG_PREFIX;
  const rows = [];
  let cursor;
  for (let page = 0; page < 40; page++) {
    const res = await env.CAMP_KV.list({ prefix, cursor, limit: 1000 });
    for (const k of res.keys || []) {
      const m = k.metadata || {};
      rows.push({
        code: k.name.slice(k.name.lastIndexOf(':') + 1), key: k.name, t: Number(m.t) || 0, itemId: m.i || '', fileId: m.f || '', title: m.ti || '',
        kind: m.k || '', name: m.n || '', church: m.c || '', email: m.e || '', lang: m.l || 'ko', stamp: m.w || '',
      });
    }
    if (res.list_complete || !res.cursor || rows.length >= max) break;
    cursor = res.cursor;
  }
  rows.sort((a, b) => b.t - a.t);
  return { rows: rows.slice(0, max), truncated: rows.length > max };
}

const churchKey = (s) => String(s || '').replace(/\s+/g, '').toLowerCase();

/** 표 · 그래프용 집계. titles = { 'itemId:fileId': '교재 이름' } (기록에 이름이 없을 때 쓴다) */
export function summarizeLogs(rows, titles = {}) {
  const totals = { downloads: 0, individual: 0, church: 0, group: 0 };
  const churchSet = new Set(), peopleSet = new Set();
  const byMaterial = new Map(), byMonth = new Map(), byChurch = new Map();
  for (const r of rows) {
    totals.downloads += 1;
    if (totals[r.kind] !== undefined) totals[r.kind] += 1;
    const person = r.email || `${r.name}|${r.church}`;
    peopleSet.add(person.toLowerCase());
    const mk = `${r.itemId}:${r.fileId}`;
    const mat = byMaterial.get(mk) || { key: mk, itemId: r.itemId, fileId: r.fileId, title: r.title || titles[mk] || '', total: 0, individual: 0, church: 0, group: 0, churches: new Set(), last: 0 };
    mat.total += 1; if (mat[r.kind] !== undefined) mat[r.kind] += 1;
    if (r.kind !== 'individual' && r.church) mat.churches.add(churchKey(r.church));
    mat.last = Math.max(mat.last, r.t);
    if (!mat.title) mat.title = r.title || titles[mk] || '';
    byMaterial.set(mk, mat);
    const mo = kstDate(r.t).slice(0, 7);
    const m = byMonth.get(mo) || { month: mo, total: 0, individual: 0, church: 0, group: 0 };
    m.total += 1; if (m[r.kind] !== undefined) m[r.kind] += 1;
    byMonth.set(mo, m);
    if (r.kind !== 'individual' && r.church) {
      churchSet.add(churchKey(r.church));
      const ck = churchKey(r.church);
      const c = byChurch.get(ck) || { church: r.church, kind: r.kind, downloads: 0, last: 0, people: new Set(), emails: new Set() };
      c.downloads += 1; c.last = Math.max(c.last, r.t); c.people.add(r.name); if (r.email) c.emails.add(r.email);
      byChurch.set(ck, c);
    }
  }
  return {
    totals: { ...totals, churches: churchSet.size, people: peopleSet.size },
    byMaterial: [...byMaterial.values()].map((m) => ({ ...m, churches: m.churches.size })).sort((a, b) => b.total - a.total),
    byMonth: [...byMonth.values()].sort((a, b) => (a.month < b.month ? 1 : -1)),
    churches: [...byChurch.values()].map((c) => ({ church: c.church, kind: c.kind, downloads: c.downloads, last: c.last, people: [...c.people], emails: [...c.emails] })).sort((a, b) => b.last - a.last),
  };
}

const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;   // 엑셀에서 수식으로 읽히지 않게
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
/** 엑셀에서 한글이 안 깨지도록 BOM 을 붙인 CSV */
export function logsToCsv(rows, titles = {}) {
  const head = ['시각(한국시간)', '교재', '파일 키', '구분', '이름', '교회·단체', '이메일', '언어', '워터마크', '확인번호'];
  const stampWord = { a: '찍음', A: '번호만', s: '크기 초과(원본)', e: '암호 PDF(원본)', f: '실패(원본)', '-': 'PDF 아님' };
  const lines = [head.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push([kstDateTime(r.t), r.title || titles[`${r.itemId}:${r.fileId}`] || '', `${r.itemId}:${r.fileId}`, KIND_LABEL[r.kind]?.ko || r.kind, r.name, r.church, r.email, r.lang, stampWord[r.stamp] || r.stamp, r.code].map(csvCell).join(','));
  }
  return '﻿' + lines.join('\r\n') + '\r\n';
}

/** 확인번호(WL-XXXXXX)로 기록 한 줄 지우기 — 이메일을 적지 않은 개인의 삭제 요청용. 지운 줄 수 */
export async function deleteLogsByCode(env, code) {
  const target = clean(code, 20).toUpperCase();
  if (!/^WL-[A-Z0-9]{6}$/.test(target)) return 0;
  const { rows } = await readDownloadLogs(env, { max: 100000 });
  let n = 0;
  for (const r of rows) if (r.code === target) { await env.CAMP_KV.delete(r.key); n += 1; }
  return n;
}

/** 이메일로 기록 지우기(삭제 요청용). 지운 줄 수 */
export async function deleteLogsByEmail(env, email) {
  const target = clean(email, 100).toLowerCase();
  if (!target) return 0;
  const { rows } = await readDownloadLogs(env, { max: 100000 });
  let n = 0;
  for (const r of rows) if (r.email === target) { await env.CAMP_KV.delete(r.key); n += 1; }
  return n;
}
