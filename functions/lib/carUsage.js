import { getAccount, isMasterEmail, normalizeEmail, parseHubSessionToken } from './hubAccounts.js';
import { pickName } from './expenses.js';

export const ENTRY_PREFIX = 'car:usage:entry:';
export const PHOTO_PREFIX = 'car:usage:photo:';
/** 운행 후 사진은 같은 기록 ID 뒤에 :after 를 붙인 키에 둔다 */
export const AFTER_SUFFIX = ':after';
export const TRASH_ENTRY_PREFIX = 'car:usage:trash:entry:';
export const TRASH_PHOTO_PREFIX = 'car:usage:trash:photo:';
const VEHICLES_KEY = 'car:vehicles:missionary';
const BUILTIN_VEHICLES = { 'silver-van': 'Silver Carnival', 'santa-fe': 'Santa Fe' };

export function fail(message, status = 400) {
  return Response.json({ error: message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

export async function usageSession(request, env) {
  if (!env.CAMP_KV || !env.ADMIN_PASSWORD) return null;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token) return null;
  const signed = await parseHubSessionToken(env.ADMIN_PASSWORD, token);
  if (!signed) return null;
  const email = normalizeEmail(signed.email);
  const account = await getAccount(env, email);
  if (account ? account.status !== 'approved' : !isMasterEmail(email)) return null;
  // 화면에는 이메일이 아니라 이름을 보여준다 (이름이 없는 계정은 지정된 표시 이름, 그것도 없으면 이메일 앞부분)
  return { email, name: pickName(email, account?.name), role: signed.role };
}

/**
 * 사역용 운행 비용을 처리할 계좌 — 사역용을 고르면 이 중 하나를 꼭 고른다.
 * id 는 기록에 저장되는 값이라 바꾸지 않는다(이름은 고쳐도 됨). personal = 기록한 본인의 개인 계좌.
 */
export const CHARGE_ACCOUNTS = [
  { id: 'personal', ko: '본인 개인 계좌', en: 'My personal account' },
  { id: 'camp-team', ko: '캠프팀', en: 'Camp Team' },
  { id: 'student-ministry', ko: '학생 사역', en: 'Student Ministry' },
  { id: 'wolko', ko: '월코', en: 'WOLKO' },
  { id: 'resources-media', ko: '자료·미디어', en: 'Resources & Media' },
];
export const isChargeAccount = id => CHARGE_ACCOUNTS.some(a => a.id === id);

/** 사용 일지에서 고를 수 있는 차량: 고정 차량(Silver Carnival · Santa Fe)만. 선교사 개인 차량은 예약 캘린더에서만 쓴다. */
export const selectableVehicles = () => new Map(Object.entries(BUILTIN_VEHICLES));

export async function vehicleLabels(env) {
  const vehicles = (await env.CAMP_KV.get(VEHICLES_KEY, 'json')) || [];
  return new Map([...Object.entries(BUILTIN_VEHICLES), ...vehicles.map(v => [v.id, `${v.name} 선교사 차량`])]);
}

export async function listEntries(env) {
  const entries = [];
  let cursor;
  do {
    const page = await env.CAMP_KV.list({ prefix: ENTRY_PREFIX, limit: 1000, ...(cursor ? { cursor } : {}) });
    const values = await Promise.all(page.keys.map(key => env.CAMP_KV.get(key.name, 'json')));
    entries.push(...values.filter(Boolean));
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  return entries.sort((a, b) => Date.parse(b.recordedAt) - Date.parse(a.recordedAt));
}
