/**
 * Solapi 알림톡 발송 헬퍼
 * HMAC-SHA256 인증 → POST /messages/v4/send
 */

async function buildSolapiAuth(apiKey, apiSecret) {
  const date = new Date().toISOString();
  const salt = Math.random().toString(36).slice(2, 12);
  const encoder = new TextEncoder();
  const keyBuf = await crypto.subtle.importKey(
    'raw', encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', keyBuf, encoder.encode(date + salt));
  const signature = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}

/**
 * 알림톡 발송
 * @param {object} env - Cloudflare env (SOLAPI_API_KEY, SOLAPI_API_SECRET, KAKAO_PF_ID 필요)
 * @param {string} phone - 수신자 전화번호 (하이픈 포함 가능)
 * @param {string} templateId - 솔라피 알림톡 템플릿 코드
 * @param {object} variables - 템플릿 변수 { '#{이름}': '홍길동', ... }
 */
export async function sendAlimtalk(env, phone, templateId, variables) {
  if (!env.SOLAPI_API_KEY || !env.SOLAPI_API_SECRET || !env.KAKAO_PF_ID || !templateId) return;

  const to = phone.replace(/[^0-9]/g, '');
  if (!to || to.length < 10) return;

  const authorization = await buildSolapiAuth(env.SOLAPI_API_KEY, env.SOLAPI_API_SECRET);

  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        to,
        kakaoOptions: {
          pfId: env.KAKAO_PF_ID,
          templateId,
          variables,
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Solapi ${res.status}: ${err}`);
  }
  return res.json();
}

/**
 * SMS/LMS 발송 (사전승인 템플릿 불필요, 솔라피에 등록된 발신번호 필요)
 * 90바이트 초과 시 솔라피가 자동으로 LMS로 전환 발송
 * @param {object} env - Cloudflare env (SOLAPI_API_KEY, SOLAPI_API_SECRET, SOLAPI_SENDER_PHONE 필요)
 * @param {string} phone - 수신자 전화번호 (하이픈 포함 가능)
 * @param {string} text - 메시지 본문
 */
export async function sendSms(env, phone, text) {
  if (!env.SOLAPI_API_KEY || !env.SOLAPI_API_SECRET || !env.SOLAPI_SENDER_PHONE) return;

  const to = phone.replace(/[^0-9]/g, '');
  const from = env.SOLAPI_SENDER_PHONE.replace(/[^0-9]/g, '');
  if (!to || to.length < 10) return;

  const authorization = await buildSolapiAuth(env.SOLAPI_API_KEY, env.SOLAPI_API_SECRET);

  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Authorization': authorization,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { to, from, text },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Solapi SMS ${res.status}: ${err}`);
  }
  return res.json();
}

/**
 * 알림톡 우선 발송 + 실패 시 문자(SMS/LMS) 자동 대체 발송.
 * 솔라피가 카카오 발송이 안 될 때(카톡 미설치·차단 등) 같은 요청의 text/from 으로 문자를 대신 보낸다.
 * 알림톡 설정(KAKAO_PF_ID·templateId)이 없거나 알림톡 요청 자체가 실패하면 문자로 바로 보낸다.
 * @param {string} templateId - 승인된 알림톡 템플릿 ID (없으면 문자만)
 * @param {object} variables - 템플릿 변수 { '#{이름}': '홍길동', ... }
 * @param {string} fallbackText - 대체 문자 본문
 * @returns {Promise<'kakao'|'sms'|null>} 먼저 시도한 채널 (설정이 없으면 null)
 */
export async function sendKakaoWithSmsFallback(env, phone, templateId, variables, fallbackText) {
  if (!env.SOLAPI_API_KEY || !env.SOLAPI_API_SECRET) return null;
  const to = String(phone || '').replace(/[^0-9]/g, '');
  if (!to || to.length < 10) return null;
  if (!env.KAKAO_PF_ID || !templateId) {
    const submitted = await sendSms(env, phone, fallbackText);
    return submitted ? 'sms' : null;
  }
  const message = { to, text: fallbackText, kakaoOptions: { pfId: env.KAKAO_PF_ID, templateId, variables, disableSms: false } };
  if (env.SOLAPI_SENDER_PHONE) message.from = env.SOLAPI_SENDER_PHONE.replace(/[^0-9]/g, '');
  const authorization = await buildSolapiAuth(env.SOLAPI_API_KEY, env.SOLAPI_API_SECRET);
  const res = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: { 'Authorization': authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    // 알림톡 요청이 거절되면(템플릿 불일치 등) 문자로 한 번 더 시도한다
    const submitted = await sendSms(env, phone, fallbackText);
    return submitted ? 'sms' : null;
  }
  return 'kakao';
}
