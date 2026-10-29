/**
 * 경비 리포트 — 고정 지출(자동결제 · 구독 · 연회비 등).
 *
 * 한 번 등록해 두면 정해진 주기(매달 / 1년에 한 번)마다 새 경비 리포트에 한 줄씩 자동으로 들어온다.
 *  - 주기의 "그 달"이 되고 결제일(day)이 지나면 그 회차가 '대기'가 된다.
 *  - 이미 어떤 리포트에 담겨 제출됐으면(그 리포트의 줄에 recurring {id, period} 가 있으면) 대기가 아니다 — 같은 회차는 두 번 들어오지 않는다.
 *  - 리포트에 담기지 않은 회차(안 냈거나, 작성 중 줄을 지웠거나, 리포트를 철회·삭제한 경우)는 대기로 남아 다음 리포트에 이월되어
 *    함께 들어온다(회차마다 한 줄, 리포트 합계에는 모두 합산).
 * '이미 보고됨'은 별도 장부 없이 계정의 리포트 줄을 보고 판단한다 — 철회·삭제·복구가 일어나도 자동으로 맞는다.
 *
 * 저장소(CAMP_KV): expense:recurring:{email} — 고정 지출 템플릿 배열
 */
import { FOREIGN_CURRENCIES, canonAccount } from '../../src/lib/expense-config.js';
import { clip, MAX_ROWS } from './expenses.js';

export const RECURRING_PREFIX = 'expense:recurring:';
export const MAX_TEMPLATES = 20;
export const LOOKBACK_MONTHS = 12;        // 이월은 최대 12개월 전 회차까지 챙긴다
export const FREQUENCIES = ['monthly', 'yearly'];
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export const recurringKey = email => `${RECURRING_PREFIX}${String(email).toLowerCase()}`;

export const kstToday = (now = Date.now()) => new Date(now + 9 * 3600000).toISOString().slice(0, 10);
const shiftMonth = (month, delta) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
};
const daysIn = month => { const [y, m] = month.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };

/** 화면이 보낸 템플릿을 검증·정리한다. { template } 또는 { error } */
export function cleanTemplate(raw, now = Date.now()) {
  const item = clip(raw?.item, 120);
  const rawAccount = clip(raw?.account, 120);
  const source = clip(raw?.source, 160) || rawAccount;
  if (!item) return { error: '구매 품목명을 입력해 주세요.' };
  if (!source) return { error: '어떤 선교 항목·계좌의 지출인지 적어 주세요.' };
  const currency = FOREIGN_CURRENCIES[raw?.currency] ? raw.currency : 'KRW';
  const amount = Math.round(Number(raw?.amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1e10) return { error: '금액을 확인해 주세요.' };
  const frequency = FREQUENCIES.includes(raw?.frequency) ? raw.frequency : null;
  if (!frequency) return { error: '주기(매달 / 1년에 한 번)를 선택해 주세요.' };
  const day = Math.floor(Number(raw?.day));
  if (!(day >= 1 && day <= 31)) return { error: '결제일(1~31일)을 확인해 주세요.' };
  const month = frequency === 'yearly' ? Math.floor(Number(raw?.month)) : null;
  if (frequency === 'yearly' && !(month >= 1 && month <= 12)) return { error: '1년에 한 번이면 결제하는 달(1~12월)을 골라 주세요.' };
  const current = kstToday(now).slice(0, 7);
  const startMonth = MONTH_RE.test(String(raw?.startMonth || '')) ? raw.startMonth : current;
  return {
    template: {
      item, source, account: canonAccount(rawAccount), currency, amount, frequency, day, month, startMonth,
      ministryPurpose: clip(raw?.ministryPurpose, 500), memo: clip(raw?.memo, 300), where: clip(raw?.where, 160), project: clip(raw?.project, 160),
      active: raw?.active !== false,
    },
  };
}

/** 한 템플릿의 회차들(최근 12개월 이내, 시작 달 이후, 결제일이 오늘 이전) — [{ period:'YYYY-MM', when:'YYYY-MM-DD' }] */
export function occurrencesOf(template, today = kstToday()) {
  const current = today.slice(0, 7);
  const first = [template.startMonth, shiftMonth(current, -LOOKBACK_MONTHS)].sort().pop();
  const out = [];
  for (let m = first; m <= current; m = shiftMonth(m, 1)) {
    if (template.frequency === 'yearly' && Number(m.slice(5)) !== template.month) continue;
    const when = `${m}-${String(Math.min(template.day, daysIn(m))).padStart(2, '0')}`;
    if (when <= today) out.push({ period: m, when });
  }
  return out;
}

/** 아직 어떤 리포트에도 담기지 않은 회차들 — 리포트 줄 모양으로 돌려준다(오래된 회차부터) */
export function pendingRows(templates, reportedKeys, today = kstToday()) {
  const rows = [];
  for (const t of templates) {
    if (!t.active) continue;
    for (const o of occurrencesOf(t, today)) {
      if (reportedKeys.has(`${t.id}:${o.period}`)) continue;
      rows.push({
        recurring: { id: t.id, period: o.period },
        source: t.source, account: t.account || '', currency: t.currency, amount: String(t.amount), rate: '',
        item: t.item, ministryPurpose: t.ministryPurpose || '', memo: t.memo || '', when: o.when, where: t.where || '', project: t.project || '',
      });
    }
  }
  return rows.sort((a, b) => a.when.localeCompare(b.when)).slice(0, MAX_ROWS * 4);
}

/** 계정의 리포트들에서 이미 담긴 회차 키('템플릿id:YYYY-MM') 모음 */
export function reportedKeysOf(reports, email) {
  const keys = new Set();
  const me = String(email).toLowerCase();
  for (const report of reports) {
    if (String(report.submitterEmail).toLowerCase() !== me) continue;
    for (const row of report.rows || []) if (row?.recurring?.id && row.recurring.period) keys.add(`${row.recurring.id}:${row.recurring.period}`);
  }
  return keys;
}

/** 다음에 올 회차(미리 보기용): 'YYYY-MM-DD' */
export function nextDue(template, today = kstToday()) {
  if (!template.active) return null;
  const current = today.slice(0, 7);
  for (let i = 0; i <= 24; i++) {
    const m = shiftMonth(current, i);
    if (m < template.startMonth) continue;
    if (template.frequency === 'yearly' && Number(m.slice(5)) !== template.month) continue;
    const when = `${m}-${String(Math.min(template.day, daysIn(m))).padStart(2, '0')}`;
    if (when > today) return when;
  }
  return null;
}
