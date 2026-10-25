/**
 * 캠프 일정 글("2026년 7월 27일(월) – 8월 1일(토) · 5박 6일", "2026년 8월 6일 - 8일", "… · 4일")에서 마지막 날을 구한다.
 *  1) 가운데 줄표 뒤의 "N월 M일" 또는 "M일"을 읽는다(월이 없으면 시작한 달, 시작보다 이르면 다음 해로 본다).
 *  2) 그게 없으면 "N박 M일"·"M일"의 일수로 시작일 + (M-1)일.
 *  3) 그것도 없으면 시작일 하루짜리로 본다.
 * startDate 는 한국 날짜가 UTC 자정으로 적힌 "YYYY-MM-DD…" 글이다. 결과는 'YYYY-MM-DD'(없으면 '').
 */
const pad = n => String(n).padStart(2, '0');
const ymd = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;

export function campEndDate(startDate, dateKo) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(startDate || ''));
  if (!m) return '';
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const start = new Date(Date.UTC(y, mo - 1, d));
  const text = String(dateKo || '');
  const range = /[–—-]\s*(?:(\d{1,2})\s*월\s*)?(\d{1,2})\s*일/.exec(text.replace(/^\s*\d{4}\s*년\s*\d{1,2}\s*월\s*\d{1,2}\s*일(?:\([^)]*\))?/, ''));
  if (range) {
    const endMonth = range[1] ? Number(range[1]) : mo, endDay = Number(range[2]);
    const endYear = endMonth < mo ? y + 1 : y;
    const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));
    if (!Number.isNaN(end.getTime()) && end >= start) return ymd(end);
  }
  const days = /(\d+)\s*박\s*(\d+)\s*일/.exec(text) || /·\s*(\d+)\s*일/.exec(text);
  const count = days ? Number(days[days.length - 1]) : 1;
  return ymd(new Date(start.getTime() + (Math.max(1, count) - 1) * 86400000));
}

/** 마지막 날이 지난 다음 날부터 "끝난 캠프" — today·endDate 는 'YYYY-MM-DD'(한국 날짜) */
export const isCampFinished = (endDate, today) => !!endDate && today > endDate;
export const todayKst = (now = Date.now()) => new Date(now + 9 * 3600000).toISOString().slice(0, 10);
