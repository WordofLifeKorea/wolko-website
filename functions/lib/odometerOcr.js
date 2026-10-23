/**
 * 계기판 사진에서 주행거리(odometer) 숫자 읽기 — Claude 이미지 인식.
 * 사진은 저장하지 않고 인식에만 쓴다(운행 일지의 사진 저장과는 별개). 결과는 "제안값"이라 화면에서 사용자가 확인·수정한다.
 *
 * 환경변수
 *   CAR_OCR_API_KEY  — 이 기능 전용 Anthropic API 키(있으면 우선). 없으면 ANTHROPIC_API_KEY 를 쓴다.
 *   ODOMETER_MODEL   — 모델 이름 덮어쓰기(선택)
 *   AI_GATEWAY_URL · CF_AIG_TOKEN — Cloudflare AI Gateway(소개글 번역과 같은 방식, 선택)
 */
export const DEFAULT_ODOMETER_MODEL = 'claude-haiku-4-5-20251001';
export const MAX_ODOMETER_KM = 2_000_000;

const SYSTEM = `You read a vehicle dashboard photo and report the TOTAL odometer (cumulative mileage).
Rules:
- Return the cumulative odometer, NOT a trip meter (TRIP A / TRIP B / "트립" / "구간"), NOT speed, fuel range, clock or temperature.
- If both a trip meter and the odometer are visible, choose the odometer (usually the larger, labelled ODO / "총 주행거리").
- Digits only; ignore decimals, separators and unit text. If a digit is unclear, return null instead of guessing.
- unit is "km" or "mi" as shown; null if no unit is visible.
Reply with ONLY a JSON object: {"odometer": <integer or null>, "unit": "km"|"mi"|null, "confidence": "high"|"medium"|"low", "note": "<very short reason, max 12 words>"}`;

/** 모델 답변(문자열)에서 JSON 을 꺼내 정리한다. 읽을 수 없으면 odometer 는 null */
export function parseOdometerReply(text) {
  const match = String(text || '').match(/\{[\s\S]*\}/);
  let data = {};
  try { data = JSON.parse(match ? match[0] : '{}'); } catch { data = {}; }
  const raw = Number(String(data.odometer ?? '').replace(/[^\d.]/g, ''));
  let odometer = /\d/.test(String(data.odometer ?? '')) && Number.isFinite(raw) && raw >= 0 && raw <= MAX_ODOMETER_KM ? Math.round(raw) : null;
  const unit = data.unit === 'mi' || data.unit === 'km' ? data.unit : null;
  let note = String(data.note || '').slice(0, 120);
  if (odometer !== null && unit === 'mi') { odometer = null; note = '계기판이 마일(mi) 단위로 보입니다. km 값을 직접 입력해 주세요.'; }
  const confidence = ['high', 'medium', 'low'].includes(data.confidence) ? data.confidence : 'low';
  return { odometer, unit, confidence: odometer === null ? 'low' : confidence, note };
}

function base64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

export function ocrConfigured(env) { return !!(env.CAR_OCR_API_KEY || env.ANTHROPIC_API_KEY); }

export async function readOdometer(env, bytes, fetchImpl = fetch) {
  const key = env.CAR_OCR_API_KEY || env.ANTHROPIC_API_KEY;
  if (!key) throw Object.assign(new Error('자동 인식이 설정되지 않았습니다.'), { code: 'not-configured' });
  const url = env.AI_GATEWAY_URL ? `${env.AI_GATEWAY_URL}/anthropic/v1/messages` : 'https://api.anthropic.com/v1/messages';
  const headers = { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  if (env.CF_AIG_TOKEN) headers['cf-aig-authorization'] = `Bearer ${env.CF_AIG_TOKEN}`;
  const res = await fetchImpl(url, {
    method: 'POST', headers,
    body: JSON.stringify({
      model: env.ODOMETER_MODEL || DEFAULT_ODOMETER_MODEL, max_tokens: 200, system: SYSTEM,
      messages: [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64(bytes) } },
        { type: 'text', text: 'Read the odometer value in this dashboard photo.' },
      ] }],
    }),
  });
  if (!res.ok) {
    // 서비스가 알려 주는 오류 종류·메시지(키·요청 내용은 들어 있지 않다)를 화면 진단용으로 함께 넘긴다
    const body = await res.json().catch(() => ({}));
    const detail = [body?.error?.type, String(body?.error?.message || '').slice(0, 120)].filter(Boolean).join(': ');
    throw Object.assign(new Error('계기판 인식 서비스에 연결하지 못했습니다.'), { code: 'upstream', status: res.status, detail });
  }
  const data = await res.json();
  return parseOdometerReply((data.content || []).map(part => part.text || '').join(''));
}
