/**
 * 설문 보내기(카카오 알림톡) — 받는 사람 모으기 · 미리보기 계산 · 안전하게 보내기.
 *
 * 안전 원칙
 *  - 미리보기는 아무것도 보내지 않는다(이 파일의 collect/plan 은 읽기만 한다. 홈페이지 신청(CAMP_KV)은 읽기 전용).
 *  - 같은 설문에 같은 번호는 한 번만: survey_sends 에 번호의 해시(되돌릴 수 없는 값)만 남기고 번호 자체는 저장하지 않는다.
 *  - 하루(24시간) 한도: 포털 전체 합계(기본 300통, 환경변수 CAMPTEAM_SURVEY_DAILY_CAP). 넘으면 하나도 보내지 않는다.
 *  - 한 번 요청에 보내는 수는 CAMPTEAM_SURVEY_CHUNK(기본 100)까지 — 남으면 같은 버튼을 한 번 더 누른다(서버 호출 수 제한 때문).
 *  - 알림톡 템플릿(KAKAO_TEMPLATE_SURVEY)이 없으면 보내지 않는다. 있을 때만 솔라피 도우미(sendKakaoWithSmsFallback)를 쓰는데, 이 도우미는
 *    카카오톡이 안 되는 번호에 문자로 대신 보내도록 만들어져 있다(신청 안내와 같은 방식).
 *  - 이름·전화번호는 AI 에도, 기록(audit·console)에도 넣지 않는다. 기록에는 개수만 남긴다.
 */
import { listRegs } from './campteamPortal.js';
import { toSolapiNumber } from './phone.js';
import { sendKakaoWithSmsFallback } from './solapi.js';
import { uuid, nowIso, audit } from './campteamDb.js';
import { AUDIENCE_KO } from './campteamSurvey.js';

export const DAILY_CAP = 300, CHUNK = 100;
const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; };
export const capOf = (env) => num(env.CAMPTEAM_SURVEY_DAILY_CAP, DAILY_CAP), chunkOf = (env) => num(env.CAMPTEAM_SURVEY_CHUNK, CHUNK);

const KR_MOBILE = /^01[016789]\d{7,8}$/;
/** 한국 휴대폰 번호만 숫자로(01012345678). 아니면 '' */
export const cleanPhone = (p) => { const d = toSolapiNumber(p); return KR_MOBILE.test(d) ? d : ''; };
export const maskPhone = (d) => (d.length === 11 ? `${d.slice(0, 3)}-****-${d.slice(7)}` : `${d.slice(0, 3)}-***-${d.slice(6)}`);
/** 홍길동 → 홍*동 · 홍길 → 홍* · 한 글자는 * */
export function maskName(n) { const t = [...String(n || '').trim()]; if (!t.length) return ''; if (t.length === 1) return '*'; if (t.length === 2) return t[0] + '*'; return t[0] + '*'.repeat(t.length - 2) + t[t.length - 1]; }
/** 자유 글(비상연락처·보호자 정보)에서 휴대폰 번호 뽑기 — "아버지 010-1234-5678 / 어머니 01098765432" 같은 글 */
export function phonesIn(text) {
  const out = [];
  for (const m of String(text || '').matchAll(/(?<!\d)(?:\+?82[\s-]*)?0?1[016789][\s.-]?\d{3,4}[\s.-]?\d{4}(?!\d)/g)) { const p = cleanPhone(m[0]); if (p && !out.includes(p)) out.push(p); }
  return out;
}
/** 번호 해시 — 같은 번호는 같은 값. 소금(비밀 문자열)이 있으면 섞어서 번호를 거꾸로 맞춰 보기 어렵게 한다 */
export async function hashPhone(env, digits) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.CAMPTEAM_HASH_SALT || env.ADMIN_PASSWORD || 'campteam'}|survey-phone|${digits}`));
  return [...new Uint8Array(buf)].slice(0, 16).map((b) => b.toString(16).padStart(2, '0')).join('');
}
/** 알림톡을 보낼 준비가 됐는지 — 솔라피 열쇠·카카오 채널·설문용 템플릿 코드가 모두 있어야 한다 */
export function kakaoReady(env) {
  if (env.SOLAPI_API_KEY && env.SOLAPI_API_SECRET && env.KAKAO_PF_ID && env.KAKAO_TEMPLATE_SURVEY) return { ok: true };
  return { ok: false, code: 'template_missing', message: '카카오 알림톡 설문 템플릿이 아직 설정되지 않아서 보낼 수 없어요. 승인받은 템플릿 코드를 등록하면 그때부터 보낼 수 있어요. 지금은 「링크 복사」로 직접 보내 주세요.' };
}

const rec = (name, phone, real = true) => ({ name: String(name || '').trim().slice(0, 40), phone, real });
/**
 * 대상별 받는 사람. 반환 { list:[{name,phone,real}], stats:{…}, notes:[…], problem?:{code,message}, candidates? }
 *  student 신청한 학생(예비 대기자 제외, 접수 대기 포함) — 개인은 본인 번호, 단체는 담당자 번호
 *  parent  비상연락처·보호자 정보 글에서 뽑은 번호 + 크루의 보호자 번호 (글에서 뽑는 것이라 틀릴 수 있다 — 가능한 만큼만)
 *  staff   수락된 스태프·크루 본인 번호 (지원만 하고 수락되지 않은 사람은 제외)
 *  church  연락처 화면의 교회·학교 중 번호가 있고 보낸 사람이 고른 것
 */
export async function collectRecipients(env, survey, camp, { contactIds } = {}) {
  const a = survey.audience, notes = [], stats = {};
  if (a === 'church') {
    const rows = (await env.DB.prepare(`SELECT id, kind, name, org, phone FROM contacts WHERE deletedAt IS NULL AND kind IN ('church','school') AND TRIM(phone) <> '' ORDER BY kind, name COLLATE NOCASE LIMIT 500`).all()).results;
    const picked = new Set(Array.isArray(contactIds) ? contactIds.map(String) : []), candidates = [], list = [];
    for (const r of rows) { const p = cleanPhone(r.phone); if (!p) { stats.invalid = (stats.invalid || 0) + 1; continue; } candidates.push({ id: r.id, kind: r.kind, name: r.name, org: r.org, phone: p }); if (picked.has(r.id)) list.push(rec(r.name || r.org, p)); }
    notes.push('연락처 화면에 번호가 있는 교회·학교 중에서 보낼 곳을 직접 골라요.');
    return { list, stats, notes, candidates };
  }
  if (a === 'other') return { list: [], stats, notes, problem: { code: 'link_only', message: '「기타(링크만)」 설문은 보내는 기능 없이 링크를 복사해서 직접 전해 주세요.' } };
  if (!camp.registrationCampId) return { list: [], stats, notes, problem: { code: 'no_link', message: '이 캠프는 아직 홈페이지 신청과 연결되지 않아서 신청자 번호를 읽을 수 없어요. (캠프별 공간에서 연결하면 돼요)' } };
  let regs = null; try { regs = await listRegs(env, camp.registrationCampId); } catch { regs = null; }
  if (!regs) return { list: [], stats, notes, problem: { code: 'unavailable', message: '신청 정보를 지금 읽지 못했어요. 잠시 뒤 다시 해 보세요.' } };
  const list = [], isStaff = (r) => r.registrationType === 'staff', live = regs.filter((r) => !isStaff(r) && !r.isWaitlist), staff = regs.filter(isStaff), accepted = staff.filter((r) => r.accepted === true);
  const add = (name, phone, real) => { const p = cleanPhone(phone); if (p) list.push(rec(name, p, real)); else stats.invalid = (stats.invalid || 0) + 1; };
  if (a === 'student') {
    for (const r of live) add(r.name, r.phone, true);
    notes.push(`접수된 모두(예비 대기자 제외) ${live.length}건의 신청자 번호예요. 단체 신청은 담당자 한 분에게만 가요.`);
  } else if (a === 'staff') {
    for (const r of accepted) add(r.name, r.phone, true);
    notes.push(`스태프·크루 지원 ${staff.length}명 중 수락된 ${accepted.length}명에게만 보내요.`);
  } else if (a === 'parent') {
    for (const r of live) {
      const own = cleanPhone(r.phone), texts = r.registrationType === 'group' ? (Array.isArray(r.participants) ? r.participants.map((p) => p?.parentInfo) : []) : [r.emergency];
      for (const t of texts) for (const p of phonesIn(t)) if (p !== own) list.push(rec('학부모', p, false));
    }
    for (const r of accepted) if (r.guardianPhone) add(r.guardianName || '보호자', r.guardianPhone, !!r.guardianName);
    notes.push('부모님 번호는 신청서의 비상연락처·보호자 칸에 적힌 글에서 뽑은 것이라 틀리거나 빠진 번호가 있을 수 있어요(최선의 방법이에요). 크루의 보호자 번호도 포함돼요.');
  }
  return { list, stats, notes };
}

/** 받는 사람 목록 → 실제로 보낼 사람 계산(번호 중복 제거 · 이미 보낸 번호 제외 · 하루 한도). 아무것도 보내거나 쓰지 않는다 */
export async function plan(env, survey, recs) {
  const seen = new Set(), uniq = []; let dupes = 0;
  for (const r of recs.list) { const h = await hashPhone(env, r.phone); if (seen.has(h)) { dupes++; continue; } seen.add(h); uniq.push({ ...r, hash: h }); }
  const done = new Set((await env.DB.prepare(`SELECT phoneHash FROM survey_sends WHERE surveyId = ?1 AND status IN ('sent','pending')`).bind(survey.id).all()).results.map((x) => x.phoneHash));
  const toSend = uniq.filter((r) => !done.has(r.hash)), cap = capOf(env);
  const used = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM survey_sends WHERE sentAt >= ?1 AND status IN ('sent','pending')`).bind(new Date(Date.now() - 24 * 3600 * 1000).toISOString()).first())?.n || 0;
  return { uniq, toSend, stats: { total: uniq.length, invalid: recs.stats.invalid || 0, dupes, already: uniq.length - toSend.length, willSend: toSend.length, cap, used, capLeft: Math.max(0, cap - used) }, doneHashes: done };
}

const fallbackText = (name, title, link) => `[월코] ${name}님, ${title} 설문에 참여해 주세요. 이름·연락처는 묻지 않아요.\n${link}`;
/**
 * 보내기. toSend 는 plan() 이 돌려준 사람들. 먼저 survey_sends 에 「보내는 중」으로 자리를 잡고(같은 번호는 자리가 이미 있으면 건너뜀 — 두 번 눌러도 한 번만),
 * 그 뒤에 한 명씩 보내서 결과(sent/failed)를 적는다. 실패한 번호는 failed 로 남아 다음에 다시 보낼 수 있다.
 * 반환 { sent, failed, skipped, remaining }
 */
export async function sendSurvey(env, survey, link, toSend, actor) {
  const templateId = env.KAKAO_TEMPLATE_SURVEY, chunk = toSend.slice(0, chunkOf(env)), now = nowIso();
  const claims = await env.DB.batch(chunk.map((r) => env.DB.prepare(`INSERT INTO survey_sends (id, surveyId, phoneHash, sentAt, status) VALUES (?1,?2,?3,?4,'pending') ON CONFLICT(surveyId, phoneHash) DO UPDATE SET status = 'pending', sentAt = excluded.sentAt WHERE survey_sends.status = 'failed'`).bind(uuid(), survey.id, r.hash, now)));
  const mine = chunk.filter((_, i) => (claims[i]?.meta?.changes || 0) > 0), title = String(survey.title || '').slice(0, 40), results = [];
  for (let i = 0; i < mine.length; i += 5) {
    results.push(...await Promise.all(mine.slice(i, i + 5).map(async (r) => {
      try { const ch = await sendKakaoWithSmsFallback(env, r.phone, templateId, { '#{이름}': r.name || '참가자', '#{설문명}': title, '#{링크}': link }, fallbackText(r.name || '참가자', title, link)); return { hash: r.hash, ok: !!ch }; }
      catch { return { hash: r.hash, ok: false }; }   // 오류 글에는 번호가 들어 있을 수 있어 기록하지 않는다
    })));
  }
  if (results.length) await env.DB.batch(results.map((x) => env.DB.prepare('UPDATE survey_sends SET status = ?3, sentAt = ?4 WHERE surveyId = ?1 AND phoneHash = ?2').bind(survey.id, x.hash, x.ok ? 'sent' : 'failed', nowIso())));
  const sent = results.filter((x) => x.ok).length, failed = results.length - sent, skipped = chunk.length - mine.length;
  await audit(env, actor, 'survey_send', 'survey', survey.id, `${AUDIENCE_KO[survey.audience] || survey.audience}: 보냄 ${sent} · 실패 ${failed} · 건너뜀 ${skipped} · 남음 ${toSend.length - chunk.length}`);
  return { sent, failed, skipped, remaining: toSend.length - chunk.length };
}
