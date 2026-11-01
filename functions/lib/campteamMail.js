/**
 * 캠프팀 주간 이메일 (매주 화요일 아침, 이번 주 내 할 일).
 * 보내는 곳은 Resend(기존 포털이 이미 쓰는 메일 서비스). 보내는 주소는 설정값 CAMPTEAM_MAIL_FROM 으로 정하고,
 * 없으면 기존 포털 주소(hub@wolko.org)로 보낸다. 도메인 인증이 안 된 주소로는 발송이 실패하므로, 설정 전에 Resend 의 Domains 화면에서 확인한다.
 *
 * 보내는 모든 메일(주간 메일·시험 메일·앞으로 생길 알림 메일)은 sendCampMail 을 거치고, 거기서 맨 아래에 「이 메일 그만 받기」 안내(포털 알림 → 설정 + 로그인 없이 누르는 링크)를 자동으로 붙인다.
 */
import { signEmailOff } from './campteamUnsub.js';
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const DEFAULT_FROM = 'WOLKO Camp & Outreach Team <hub@wolko.org>';
const FROM_RE = /^(?:[^<>@\r\n]{1,60}<)?[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+>?$/;
/** 설정값 검사: "이름 <주소>" 또는 "주소". 줄바꿈이나 여러 주소는 거부하고 기본값을 쓴다 */
export function fromAddress(env) { const v = String(env.CAMPTEAM_MAIL_FROM || '').trim(); return v && FROM_RE.test(v) && (v.includes('<') === v.endsWith('>')) ? v : DEFAULT_FROM; }
export const replyTo = (env) => { const v = String(env.CAMPTEAM_MAIL_REPLY_TO || '').trim(); return /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(v) ? v : ''; };

const md = (d) => String(d || '').slice(5).replace('-', '/');
const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const dow = (d) => DOW[new Date(d + 'T00:00:00Z').getUTCDay()];

/** 이번 주 요약 메일 내용. week = buildWeek() 결과, summary = AI 한두 줄(없으면 null) */
export function buildWeeklyEmail({ name, week, summary, base = 'https://wolko.org' }) {
  const link = base.replace(/\/$/, '') + '/portal/campteam/';
  const row = (t, tag) => `<tr><td style="padding:8px 10px;border-bottom:1px solid #e8eef3;font-size:15px">${esc(t.title)}${t.camp ? `<div style="color:#6b7f8e;font-size:12px">${esc(t.camp)}</div>` : ''}</td><td style="padding:8px 10px;border-bottom:1px solid #e8eef3;white-space:nowrap;color:${tag === 'over' ? '#d0443c' : '#3a4f5e'};font-size:13px;text-align:right">${esc(md(t.date))}(${dow(t.date)})${t.time ? ' ' + esc(t.time) : ''}</td></tr>`;
  const section = (title, list, tag) => list.length ? `<h3 style="margin:22px 0 6px;font-size:15px;color:${tag === 'over' ? '#d0443c' : '#1d4e6b'}">${esc(title)} <span style="color:#6b7f8e;font-weight:400;font-size:12px">${list.length}건</span></h3><table style="width:100%;border-collapse:collapse">${list.map((t) => row(t, tag)).join('')}</table>` : '';
  const text = [`${name ? name + '님, ' : ''}이번 주(${md(week.start)}~${md(week.end)}) 할 일이에요.`, summary || '',
    ...[['지난 마감', week.overdue], ['이번 주 업무', week.tasks], ['회의', week.meetings], ['일정', week.events]].flatMap(([t, l]) => l.length ? ['', `[${t}]`, ...l.map((x) => `- ${md(x.date)}(${dow(x.date)}) ${x.title}`)] : []), '', `열기: ${link}`].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
  const html = `<div style="font-family:'Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a2b38"><h2 style="margin:0 0 4px;font-size:19px">이번 주 할 일</h2><div style="color:#6b7f8e;font-size:13px">${esc(md(week.start))} ~ ${esc(md(week.end))}${name ? ' · ' + esc(name) : ''}</div>` +
    (summary ? `<p style="background:#f2f6f9;border-radius:10px;padding:12px 14px;font-size:15px;line-height:1.65;margin:16px 0 0">${esc(summary)}</p>` : '') +
    section('마감이 지난 일', week.overdue, 'over') + section('이번 주 업무', week.tasks, 'task') + section('이번 주 회의', week.meetings, 'meet') + section('이번 주 일정', week.events, 'event') +
    `<p style="margin:26px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#1d4e6b;color:#fff;text-decoration:none;border-radius:10px;padding:12px 20px;font-size:15px;font-weight:600">캠프팀 열기</a></p></div>`;
  return { subject: `[WOLKO 캠프팀] 이번 주 할 일 (${md(week.start)}~${md(week.end)})`, html, text };
}

/** 메일 맨 아래 안내: 포털에서 끄는 길 + 로그인 없이 바로 끄는 링크(없으면 안내 글만) */
export function mailFooter({ base = 'https://wolko.org', offUrl = '' } = {}) {
  const portal = base.replace(/\/$/, '') + '/portal/campteam/alerts/';
  const lines = ['이 메일이 필요 없으시면 포털의 「알림 → 설정」에서 이메일을 끌 수 있어요.', '(You can turn these e-mails off in the portal: Alerts → Settings.)'];
  const text = ['', '--', ...lines, ...(offUrl ? ['', `이 메일 그만 받기 (로그인 없이 바로 꺼져요): ${offUrl}`] : []), `알림 설정 열기: ${portal}`].join('\n');
  const html = `<div style="font-family:'Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif;max-width:560px;margin:24px auto 0;padding-top:14px;border-top:1px solid #e8eef3;color:#8a9aa6;font-size:12px;line-height:1.7"><div>${esc(lines[0])}<br>${esc(lines[1])}</div>` +
    (offUrl ? `<p style="margin:10px 0 0"><a href="${esc(offUrl)}" style="color:#1d4e6b;font-weight:600">이 메일 그만 받기</a> <span>(로그인 없이 바로 꺼져요)</span></p>` : '') +
    `<p style="margin:6px 0 0"><a href="${esc(portal)}" style="color:#8a9aa6">알림 설정 열기</a></p></div>`;
  return { html, text };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** 메일 한 통 보내기. 속도 제한(429)이나 서버 오류(5xx)면 잠깐 쉬었다가 최대 3번까지 다시 시도한다 */
export async function sendCampMail(env, { to, subject, html, text, fetchImpl = fetch, retryMs = 1200 }) {
  const rt = replyTo(env), base = env.CAMPTEAM_BASE_URL || 'https://wolko.org', token = await signEmailOff(env, to);
  const offUrl = token ? `${base.replace(/\/$/, '')}/api/campteam/email-off?t=${token}` : '', foot = mailFooter({ base, offUrl });
  // 받은편지함의 「구독 취소」 단추(Gmail 등)도 같은 주소를 쓴다 (한 번 누르면 바로 꺼지는 방식, RFC 8058)
  const headers = offUrl ? { 'List-Unsubscribe': `<${offUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined;
  const body = JSON.stringify({ from: fromAddress(env), to: [to], subject, html: String(html || '') + foot.html, text: String(text || '') + foot.text, ...(rt ? { reply_to: rt } : {}), ...(headers ? { headers } : {}) });
  let last = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetchImpl('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body });
    if (res.ok) return;
    let m = ''; try { m = (await res.text()).slice(0, 200); } catch { /* 본문 없음 */ }
    last = `Resend ${res.status} ${m}`;
    if (res.status !== 429 && res.status < 500) break;       // 주소 오류 등은 다시 해도 소용없다
    if (attempt < 3) await sleep(retryMs * attempt);
  }
  throw new Error(last);
}

/** 「나에게 테스트 이메일 보내기」 내용 */
export function buildTestEmail({ name, base = 'https://wolko.org' }) {
  const link = base.replace(/\/$/, '') + '/portal/campteam/alerts/';
  const text = [`${name ? name + '님, ' : ''}시험 메일이에요. 이 메일이 보이면 이메일 알림이 잘 도착하는 거예요.`, '', `알림 설정: ${link}`].join('\n');
  const html = `<div style="font-family:'Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a2b38"><h2 style="margin:0 0 8px;font-size:19px">시험 메일</h2><p style="font-size:15px;line-height:1.65;margin:0">${name ? esc(name) + '님, ' : ''}시험 메일이에요. 이 메일이 보이면 이메일 알림이 잘 도착하는 거예요.</p></div>`;
  return { subject: '[WOLKO 캠프팀] 시험 메일', html, text };
}
