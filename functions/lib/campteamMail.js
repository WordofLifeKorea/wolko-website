/**
 * 캠프팀 주간 이메일 (매주 화요일 아침, 이번 주 내 할 일).
 * 보내는 곳은 Resend(기존 포털이 이미 쓰는 메일 서비스). 보내는 주소는 설정값 CAMPTEAM_MAIL_FROM 으로 정하고,
 * 없으면 기존 포털 주소(hub@wolko.org)로 보낸다. 도메인 인증이 안 된 주소로는 발송이 실패하므로, 설정 전에 Resend 의 Domains 화면에서 확인한다.
 */
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const DEFAULT_FROM = 'WOLKO Camp Team <hub@wolko.org>';
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
    ...[['지난 마감', week.overdue], ['이번 주 업무', week.tasks], ['회의', week.meetings], ['일정', week.events]].flatMap(([t, l]) => l.length ? ['', `[${t}]`, ...l.map((x) => `- ${md(x.date)}(${dow(x.date)}) ${x.title}`)] : []), '', `열기: ${link}`, '이 메일을 그만 받으려면 포털 알림공지 → 내 설정에서 끌 수 있어요.'].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');
  const html = `<div style="font-family:'Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif;max-width:560px;margin:0 auto;color:#1a2b38"><h2 style="margin:0 0 4px;font-size:19px">이번 주 할 일</h2><div style="color:#6b7f8e;font-size:13px">${esc(md(week.start))} ~ ${esc(md(week.end))}${name ? ' · ' + esc(name) : ''}</div>` +
    (summary ? `<p style="background:#f2f6f9;border-radius:10px;padding:12px 14px;font-size:15px;line-height:1.65;margin:16px 0 0">${esc(summary)}</p>` : '') +
    section('마감이 지난 일', week.overdue, 'over') + section('이번 주 업무', week.tasks, 'task') + section('이번 주 회의', week.meetings, 'meet') + section('이번 주 일정', week.events, 'event') +
    `<p style="margin:26px 0 0"><a href="${esc(link)}" style="display:inline-block;background:#1d4e6b;color:#fff;text-decoration:none;border-radius:10px;padding:12px 20px;font-size:15px;font-weight:600">캠프팀 열기</a></p><p style="color:#8a9aa6;font-size:12px;margin-top:22px;line-height:1.6">이 메일을 그만 받으려면 포털 알림공지 → 내 설정에서 「주간 이메일」을 끄세요.</p></div>`;
  return { subject: `[WOLKO 캠프팀] 이번 주 할 일 (${md(week.start)}~${md(week.end)})`, html, text };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/** 메일 한 통 보내기. 속도 제한(429)이나 서버 오류(5xx)면 잠깐 쉬었다가 최대 3번까지 다시 시도한다 */
export async function sendCampMail(env, { to, subject, html, text, fetchImpl = fetch, retryMs = 1200 }) {
  const rt = replyTo(env), body = JSON.stringify({ from: fromAddress(env), to: [to], subject, html, text, ...(rt ? { reply_to: rt } : {}) });
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
