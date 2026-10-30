/**
 * 섬김 지원 신청서 — 저장 · 검증 · 민감 항목 분리/암호화 · 열람 기록 · 보관 기간.
 *
 * 저장소(CAMP_KV)
 *   serve:app:{id}      일반 항목 + 상태 + 열람 기록(audit)
 *   serve:appsens:{id}  민감 항목(이혼·형사·학대 관련·건강·알레르기). SERVE_APP_KEY 가 있으면 AES-GCM 으로 암호화해 저장한다.
 *
 * 민감 항목은 알림 메일·알림톡·로그·외부 AI/번역 서비스로 절대 내보내지 않는다.
 * 거절(부적합)한 신청서는 결정 후 30일, 보류한 신청서는 12개월이 지나면 추천서 답변까지 모두 자동 삭제한다(목록을 읽을 때 정리).
 */
import { MASTER_EMAILS, normalizeEmail } from './hubAccounts.js';
import { reviewersFor } from './serveInquiry.js';
import { SERVE_APPLICATION_FIELDS, SENSITIVE_FIELD_IDS, APPLICATION_STATUSES } from './serveApplicationSchema.js';

export const APP_PREFIX = 'serve:app:';
export const APP_SENS_PREFIX = 'serve:appsens:';
export const RETENTION_DAYS = 365;          // 보류
export const REJECT_RETENTION_DAYS = 30;    // 거절(검토 후 부적합) — 지원자 안내·동의서 문구와 같다
const AUDIT_LIMIT = 300;

export function canAccessServeApplication(session, app) {
  if (!session) return false;
  if (session.role === 'master' || MASTER_EMAILS.includes(normalizeEmail(session.email))) return true;
  return reviewersFor(app?.lang).includes(normalizeEmail(session.email));
}

/* ───────────── 암호화 (AES-GCM, 키는 환경변수 SERVE_APP_KEY — base64 로 된 32바이트) ───────────── */
const b64 = {
  enc: bytes => btoa(String.fromCharCode(...new Uint8Array(bytes))),
  dec: text => Uint8Array.from(atob(text), c => c.charCodeAt(0)),
};
async function cryptoKey(env) {
  const raw = String(env.SERVE_APP_KEY || '').trim();
  if (!raw) return null;
  const bytes = b64.dec(raw.replace(/-/g, '+').replace(/_/g, '/'));
  if (bytes.length !== 32) throw new Error('SERVE_APP_KEY 는 base64 로 된 32바이트여야 합니다.');
  return crypto.subtle.importKey('raw', bytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function sealSensitive(env, data) {
  const key = await cryptoKey(env);
  if (!key) return { v: 1, enc: false, data };
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(data)));
  return { v: 1, enc: true, iv: b64.enc(iv), ct: b64.enc(ct) };
}
export async function openSensitive(env, sealed) {
  if (!sealed) return {};
  if (!sealed.enc) return sealed.data || {};
  const key = await cryptoKey(env);
  if (!key) throw new Error('암호화된 신청서를 열려면 SERVE_APP_KEY 가 필요합니다.');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64.dec(sealed.iv) }, key, b64.dec(sealed.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}

/* ───────────── 값 정리 · 검증 ───────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function visible(field, values) {
  if (field.hideIf && values[field.hideIf] === true) return false;
  return !field.showIf || values[field.showIf.field] === field.showIf.equals;
}
const waived = (field, values) => [].concat(field.requiredUnless || []).some(id => values[id] === true);

/** 화면이 보낸 값에서 정의된 항목만 골라 형식에 맞게 정리한다(없는 항목·잘못된 선택값은 버린다). */
export function cleanApplicationValues(raw) {
  const out = {};
  for (const f of SERVE_APPLICATION_FIELDS) {
    const v = raw?.[f.id];
    if (v === undefined || v === null) continue;
    if (f.type === 'checkbox') { out[f.id] = v === true || v === 'true'; continue; }
    const text = String(v).trim().slice(0, f.max || 200);
    if (!text) { out[f.id] = ''; continue; }
    if ((f.type === 'select' || f.type === 'radio') && !(f.options || []).some(o => o.v === text)) continue;
    if (f.type === 'date' && !DATE_RE.test(text)) continue;
    out[f.id] = text;
  }
  return out;
}

/** 제출할 때 필수 항목(보이는 항목만)을 검사한다 — 빠진 항목의 id 목록을 돌려준다. */
export function missingRequired(values) {
  const missing = [];
  for (const f of SERVE_APPLICATION_FIELDS) {
    if (!f.required || !visible(f, values) || waived(f, values)) continue;
    const v = values[f.id];
    if (f.type === 'checkbox' ? v !== true : !String(v ?? '').trim()) missing.push(f.id);
    else if (f.type === 'email' && !EMAIL_RE.test(v)) missing.push(f.id);
  }
  return missing;
}

export function splitValues(values) {
  const general = {}, sensitive = {};
  for (const [k, v] of Object.entries(values)) (SENSITIVE_FIELD_IDS.has(k) ? sensitive : general)[k] = v;
  return { general, sensitive };
}

/* ───────────── 저장 · 불러오기 ───────────── */
export async function createApplication(env, { inquiry, by }) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const now = new Date().toISOString();
  const [first = '', ...rest] = String(inquiry.name || '').trim().split(/\s+/);
  const app = {
    id, inquiryId: inquiry.id, lang: inquiry.lang, status: 'draft', createdAt: now, updatedAt: now, createdBy: by,
    values: cleanApplicationValues({ firstName: /[A-Za-z]/.test(first) ? first : '', lastName: /[A-Za-z]/.test(first) ? rest.join(' ') : '', nameKo: /[ㄱ-ㆎ가-힣]/.test(inquiry.name || '') ? inquiry.name : '', email: inquiry.email, phone: inquiry.phone }),
    audit: [{ at: now, by, action: 'create' }],
  };
  await env.CAMP_KV.put(`${APP_PREFIX}${id}`, JSON.stringify(app));
  return app;
}

export async function loadApplication(env, id) {
  return env.CAMP_KV.get(`${APP_PREFIX}${String(id)}`, 'json');
}

/** 일반 항목 + 복호화한 민감 항목을 합쳐 돌려준다 */
export async function loadFullApplication(env, id) {
  const app = await loadApplication(env, id);
  if (!app) return null;
  const sealed = await env.CAMP_KV.get(`${APP_SENS_PREFIX}${id}`, 'json');
  const sensitive = await openSensitive(env, sealed);
  return { ...app, values: { ...app.values, ...sensitive } };
}

export function addAudit(app, by, action, { minGapMinutes = 0, note } = {}) {
  const now = new Date();
  const last = [...(app.audit || [])].reverse().find(a => a.by === by && a.action === action);
  if (minGapMinutes && last && now - new Date(last.at) < minGapMinutes * 60000) return;
  app.audit = [...(app.audit || []), { at: now.toISOString(), by, action, ...(note ? { note } : {}) }].slice(-AUDIT_LIMIT);
}

export async function saveApplication(env, app, fullValues) {
  const { general, sensitive } = splitValues(fullValues);
  app.values = general;
  app.updatedAt = new Date().toISOString();
  await env.CAMP_KV.put(`${APP_PREFIX}${app.id}`, JSON.stringify(app));
  await env.CAMP_KV.put(`${APP_SENS_PREFIX}${app.id}`, JSON.stringify(await sealSensitive(env, sensitive)));
}

export function summarize(app) {
  const v = app.values || {};
  const name = [v.firstName, v.lastName].filter(Boolean).join(' ') || v.nameKo || '(이름 없음)';
  return { id: app.id, inquiryId: app.inquiryId, source: app.source || 'interview', refNo: app.refNo || '', lang: app.lang, status: app.status, name, nameKo: v.nameKo || '', createdAt: app.createdAt, updatedAt: app.updatedAt, decidedAt: app.decidedAt || null };
}

export async function deleteApplication(env, id) {
  await env.CAMP_KV.delete(`${APP_PREFIX}${id}`);
  await env.CAMP_KV.delete(`${APP_SENS_PREFIX}${id}`);
  await env.CAMP_KV.delete(`serve:refans:${id}:1`);   // 추천서 답변(serveReference.js REF_ANSWER_KEY)도 함께 폐기
  await env.CAMP_KV.delete(`serve:refans:${id}:2`);
}

export async function listApplications(env) {
  const keys = [];
  let cursor;
  do {
    const page = await env.CAMP_KV.list({ prefix: APP_PREFIX, ...(cursor ? { cursor } : {}), limit: 1000 });
    keys.push(...page.keys.map(k => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  const apps = (await Promise.all(keys.map(k => env.CAMP_KV.get(k, 'json')))).filter(Boolean);
  // 보관 기간이 지난 신청서는 삭제한다: 거절(부적합) 결정 후 30일, 보류 결정 후 12개월
  const days = { rejected: REJECT_RETENTION_DAYS, hold: RETENTION_DAYS };
  const alive = [];
  for (const app of apps) {
    const keep = days[app.status];
    if (keep && app.decidedAt && new Date(app.decidedAt).getTime() < Date.now() - keep * 86400000) await deleteApplication(env, app.id);
    else alive.push(app);
  }
  return alive.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export { APPLICATION_STATUSES };
