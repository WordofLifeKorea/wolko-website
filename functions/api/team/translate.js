/**
 * POST /api/team/translate
 * Body: { text: string, from: "ko"|"en", context?: string }
 * Headers: Authorization: Bearer <token>
 *
 * Calls Anthropic API (claude-haiku) to translate text
 * between Korean and English for missionary bios.
 *
 * Required env vars:
 *   ADMIN_PASSWORD     — token signing secret
 *   ANTHROPIC_API_KEY  — Anthropic API key
 */

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

// ── Token verification (same as update.js) ────────────────────────────────
async function verifyToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !env.ADMIN_PASSWORD) return null;

  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    const sigHex = decoded.slice(lastColon + 1);
    const data = decoded.slice(0, lastColon);
    const parts = data.split(':');
    if (parts[0] !== 'wolko-team' || parts.length < 3) return null;
    const expires = parseInt(parts[2]);
    if (!expires || Date.now() > expires) return null;

    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(env.ADMIN_PASSWORD),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sig = new Uint8Array(sigHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const valid = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
    return valid ? parts[1] : null;
  } catch {
    return null;
  }
}

// ── Context labels for better translation quality ─────────────────────────
const CONTEXT_PROMPTS = {
  bio:      '선교사 개인 간증 및 사역 소개',
  prayer:   '선교사 기도제목',
  verse:    '성경 구절',
  tagline:  '선교사 프로필 한 줄 소개 문구 (짧고 임팩트 있게)',
  subtitle: '선교사 프로필 짧은 설명 문장',
  default:  '비영리 선교단체 홈페이지 텍스트',
};

export async function onRequestPost(context) {
  const { env, request } = context;

  const slug = await verifyToken(request, env);
  if (!slug) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401, headers: CORS });
  }

  if (!env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: 'ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.' },
      { status: 500, headers: CORS }
    );
  }

  let text, from, ctx;
  try {
    ({ text, from, context: ctx } = await request.json());
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400, headers: CORS });
  }

  if (!text || !text.trim()) {
    return Response.json({ error: '번역할 텍스트가 없습니다.' }, { status: 400, headers: CORS });
  }
  if (ctx !== 'verse_lookup' && from !== 'ko' && from !== 'en') {
    return Response.json({ error: 'from 값은 "ko" 또는 "en"이어야 합니다.' }, { status: 400, headers: CORS });
  }

  const to = from === 'ko' ? 'en' : 'ko';
  const fromLabel = from === 'ko' ? '한국어' : '영어';
  const toLabel   = to   === 'ko' ? '한국어' : '영어';
  const contextHint = CONTEXT_PROMPTS[ctx] || CONTEXT_PROMPTS.default;

  const systemPrompt = `당신은 비영리 기독교 선교단체(Word of Life Korea, 월코)의 전문 번역가입니다.
홈페이지에 실릴 ${contextHint} 텍스트를 ${fromLabel}에서 ${toLabel}로 번역합니다.

번역 원칙:
- 진실하고 자연스러운 어체 유지 (너무 딱딱하거나 기계적이지 않게)
- 기독교/선교 관련 용어는 정확하게 번역 (예: 복음→Gospel, 선교사→missionary, 제자훈련→discipleship)
- 단락 구분(\n\n)은 그대로 유지
- 성경 구절은 개역개정(KO) ↔ ESV(EN) 표준 번역 스타일 참고
- 번역문만 출력 — 설명, 주석, 따옴표 추가 없이`;

  try {
    const gatewayUrl = env.AI_GATEWAY_URL
      ? `${env.AI_GATEWAY_URL}/anthropic/v1/messages`
      : 'https://api.anthropic.com/v1/messages';

    const headers = {
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    };
    if (env.CF_AIG_TOKEN) {
      headers['cf-aig-authorization'] = `Bearer ${env.CF_AIG_TOKEN}`;
    }

    // ── verse_lookup: reference → 개역개정 + ESV 본문 동시 반환 ──────────
    if (ctx === 'verse_lookup') {
      const lookupPrompt = `성경 구절 참조(예: "요한복음 3:16", "John 3:16", "시편 23:1-3")가 주어지면
개역개정판 한국어 본문과 ESV 영어 본문을 정확히 제공합니다.

반드시 아래 JSON 형식만 출력하세요 (다른 텍스트 없이):
{"ko":"개역개정 본문","en":"ESV 본문"}

규칙:
- 여러 절이면 모두 포함
- 절 번호는 본문 앞에 붙이지 않음
- 설명이나 부연 없이 성경 본문만 출력
- 여러 줄이 필요하면 \\n 사용`;

      const lookupRes = await fetch(gatewayUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 1024,
          system: lookupPrompt,
          messages: [{ role: 'user', content: text.trim() }],
        }),
      });

      if (!lookupRes.ok) {
        const errText = await lookupRes.text();
        return Response.json({ error: `${lookupRes.status}: ${errText}` }, { status: 500, headers: CORS });
      }

      const lookupData = await lookupRes.json();
      const rawText = lookupData.content?.[0]?.text?.trim();

      try {
        // 코드블록(```json ... ```)으로 감싸져 있어도 추출
        let jsonStr = rawText;
        const blockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (blockMatch) {
          jsonStr = blockMatch[1].trim();
        } else {
          const objMatch = rawText.match(/\{[\s\S]*\}/);
          if (objMatch) jsonStr = objMatch[0];
        }
        const parsed = JSON.parse(jsonStr);
        if (!parsed.ko || !parsed.en) throw new Error('빈 응답');
        return Response.json({ ko: parsed.ko, en: parsed.en }, { headers: CORS });
      } catch {
        console.error('verse_lookup parse error, raw:', rawText);
        return Response.json({ error: '성경 구절을 찾지 못했습니다. 구절 참조를 확인해 주세요.' }, { status: 500, headers: CORS });
      }
    }

    const res = await fetch(gatewayUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: text.trim(),
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('Anthropic error response:', res.status, JSON.stringify(Object.fromEntries(res.headers)), errText);
      return Response.json({ error: `${res.status}: ${errText}` }, { status: 500, headers: CORS });
    }

    const data = await res.json();
    const translated = data.content?.[0]?.text?.trim();

    if (!translated) {
      throw new Error('번역 결과를 받지 못했습니다.');
    }

    return Response.json({ translated, from, to }, { headers: CORS });
  } catch (e) {
    console.error('translate error:', e);
    return Response.json(
      { error: e.message || '번역 중 오류가 발생했습니다.' },
      { status: 500, headers: CORS }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
