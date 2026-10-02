/**
 * GET /api/expense/rate?date=YYYY-MM-DD
 *   → { rate, date, requestedDate, source }   (1 USD = rate KRW)
 *
 * 영수 날짜 기준의 USD→KRW 환율을 돌려준다(ECB 기준 일별 환율, frankfurter.dev — 키 불필요).
 * 주말/휴일이면 직전 영업일 환율(date)을 돌려주고, 미래 날짜/조회 실패 시에는 최신 환율로 대체한다.
 * 같은 날짜는 KV에 캐시해서 외부 호출을 줄인다. 화면에서 값을 직접 고칠 수 있으므로 참고값이다.
 */
import { CORS, err, expenseSession } from '../../lib/expenses.js';
import { FOREIGN_CURRENCIES } from '../../../src/lib/expense-config.js';

const API = 'https://api.frankfurter.dev/v1';
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// USD · CAD는 ECB 기준 일별 환율(frankfurter), ECB에 없는 VND는 일별 환율 데이터(currency-api)로 조회한다.
async function fetchRate(path, currency) {
  if (currency === 'VND') {
    const day = path === 'latest' ? 'latest' : path;
    const res = await fetch(`https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${day}/v1/currencies/vnd.json`, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const body = await res.json().catch(() => null);
    const rate = body?.vnd?.krw;
    return rate > 0 ? { rate, date: body.date } : null;
  }
  const res = await fetch(`${API}/${path}?base=${currency}&symbols=KRW`, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const rate = body?.rates?.KRW;
  return rate > 0 ? { rate, date: body.date } : null;
}

export async function onRequestGet({ env, request }) {
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);

  const params = new URL(request.url).searchParams;
  const requested = params.get('date') || '';
  if (!DATE_RE.test(requested)) return err('날짜(YYYY-MM-DD)가 필요합니다.');
  const currency = params.get('currency') || 'USD';
  const fx = FOREIGN_CURRENCIES[currency];
  if (!fx) return err('지원하지 않는 통화입니다.');

  const cacheKey = currency === 'USD' ? `expense:rate:${requested}` : `expense:rate:${currency}:${requested}`;
  const cached = await env.CAMP_KV.get(cacheKey, 'json');
  if (cached) return Response.json({ ...cached, requestedDate: requested }, { headers: CORS });

  let found = null;
  try {
    found = await fetchRate(requested, currency);
    let source = 'date';
    if (!found) { found = await fetchRate('latest', currency); source = 'latest'; } // 미래 날짜 등
    if (!found) return err('환율을 불러오지 못했습니다. 환율을 직접 입력해 주세요.', 502);

    const payload = { rate: Math.round(found.rate * 10 ** fx.dp) / 10 ** fx.dp, date: found.date, source, currency };
    // 과거 확정 환율만 오래 캐시. 최신값으로 대체된 경우엔 짧게.
    await env.CAMP_KV.put(cacheKey, JSON.stringify(payload), { expirationTtl: source === 'date' ? 60 * 60 * 24 * 90 : 60 * 60 });
    return Response.json({ ...payload, requestedDate: requested }, { headers: CORS });
  } catch (e) {
    console.error('expense rate lookup failed:', e);
    return err('환율을 불러오지 못했습니다. 환율을 직접 입력해 주세요.', 502);
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Authorization',
    },
  });
}
