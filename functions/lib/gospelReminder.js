/**
 * 복음 통계 — 월말 보고 알림 메일 · 아직 보고하지 않은 사람 확인.
 *  - 받는 사람: 승인된 포탈 계정 중 "보고 제외"가 아닌 사람. 그 달에 이미 보고(개인 또는 팀)를 낸 사람은 뺀다.
 *  - 보고 제외: 마스터·관리자가 사람마다 켜고 끈다(KV gospel:exempt:{이메일}) — 보고할 일이 없는 계정(후원자·외부 담당자 등)용.
 *  - 메일은 사람마다 한 통씩(이름·링크), 같은 달에 같은 사람에게는 한 번만(KV gospel:mail:{달}:{이메일}).
 */
import { listAccounts, normalizeEmail } from './hubAccounts.js';

export const EXEMPT_PREFIX = 'gospel:exempt:';
export const MAIL_KEY = (month, email) => `gospel:mail:${month}:${email}`;
const MAIL_TTL = 60 * 60 * 24 * 60;

/** 'YYYY-MM-DD' 가 그 달의 마지막 날인지 */
export function isLastDayOfMonth(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  if (!m) return false;
  return Number(m[3]) === new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
}

export async function exemptEmails(env) {
  const out = new Set();
  let cursor;
  do {
    const page = await env.CAMP_KV.list({ prefix: EXEMPT_PREFIX, ...(cursor ? { cursor } : {}), limit: 1000 });
    page.keys.forEach(k => out.add(k.name.slice(EXEMPT_PREFIX.length)));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return out;
}

/** 보고해야 하는 사람 — 승인된 포탈 계정 전체(보고 제외 표시된 사람도 목록에는 넣고 exempt 로 표시) */
export async function reporterRoster(env) {
  const [accounts, exempt] = await Promise.all([listAccounts(env), exemptEmails(env)]);
  return accounts
    .filter(a => a && a.status === 'approved' && a.email)
    .map(a => ({ email: normalizeEmail(a.email), name: String(a.name || '').trim() || String(a.email).split('@')[0], exempt: exempt.has(normalizeEmail(a.email)) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

/** 그 달 보고를 이미 낸 사람의 이메일 모음 (팀 보고도 낸 사람 기준) */
export const submittedEmails = reports => new Set(reports.map(r => normalizeEmail(r.email)));

/** 아직 보고하지 않은 사람(보고 제외는 뺀다) */
export function missingReporters(roster, reports) {
  const done = submittedEmails(reports);
  return roster.filter(p => !p.exempt && !done.has(p.email));
}

export function reportLink(month, origin = 'https://wolko.org') {
  return `${origin}/portal/gospel-stats/?write=1&month=${encodeURIComponent(month)}`;
}

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function reminderMail({ name, month, link }) {
  const [y, m] = month.split('-');
  const en = new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const subject = `[월코] ${y}년 ${Number(m)}월 복음 전도 보고를 부탁드려요 · ${en} Gospel Outreach Report`;
  const html = `<div style="font-family:'Apple SD Gothic Neo',Arial,sans-serif;font-size:15px;line-height:1.75;color:#0d1b24;max-width:560px;">
    <p>${esc(name)}님, 안녕하세요.</p>
    <p>오늘은 ${Number(m)}월의 마지막 날입니다. <strong>${y}년 ${Number(m)}월 복음 전도 보고</strong>를 작성해 주세요. 숫자가 모두 0이어도 괜찮으니 보고만 남겨 주세요.</p>
    <p><a href="${esc(link)}" style="display:inline-block;padding:11px 20px;border-radius:10px;background:#004f68;color:#fff;font-weight:700;text-decoration:none;">보고하러 가기</a></p>
    <p style="color:#5a6f79;font-size:13px;">이미 보고하셨다면 이 메일은 다시 오지 않습니다. 보고할 일이 없는 계정이라면 관리자에게 "보고 제외"를 요청해 주세요.</p>
    <hr style="border:0;border-top:1px solid #dce6ea;margin:22px 0;">
    <p>Hi ${esc(name)},</p>
    <p>Today is the last day of the month. Please submit your <strong>${esc(en)} Gospel Outreach Report</strong>. Even if every number is 0, please submit it.</p>
    <p><a href="${esc(link)}" style="color:#004f68;font-weight:700;">Open the report form</a></p>
    <p style="color:#5a6f79;font-size:13px;">Word of Life Korea (WOLKO)</p>
  </div>`;
  return { subject, html };
}
