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
- 성경 구절은 개역개정4판(KO) ↔ ESV(EN) 표준 번역 스타일 참고
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

    // ── verse_lookup: reference → 개역개정4판(Sonnet) + NIV(api.bible) 병렬 반환 ──
    if (ctx === 'verse_lookup') {
      const BIBLE_API_KEY = env.BIBLE_API_KEY;
      const NIV_BIBLE_ID  = env.NIV_BIBLE_ID;

      if (!BIBLE_API_KEY || !NIV_BIBLE_ID) {
        return Response.json({ error: 'BIBLE_API_KEY 또는 NIV_BIBLE_ID 환경변수가 설정되지 않았습니다.' }, { status: 500, headers: CORS });
      }

      // Step 1: verse_ref → USFM passage ID (Haiku로 빠르게 변환)
      const usfmRes = await fetch(gatewayUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 50,
          system: `Convert a Bible verse reference to a USFM passage ID. Output only the ID, nothing else.
Examples:
"John 3:16" → JHN.3.16
"Psalm 96:2-3" → PSA.96.2-PSA.96.3
"시편 96:2-3" → PSA.96.2-PSA.96.3
"요한복음 3:16" → JHN.3.16
"Romans 8:28" → ROM.8.28
"창세기 1:1" → GEN.1.1`,
          messages: [{ role: 'user', content: text.trim() }],
        }),
      });
      const usfmData = await usfmRes.json();
      const passageId = usfmData.content?.[0]?.text?.trim();

      if (!passageId) {
        return Response.json({ error: '구절 참조를 인식하지 못했습니다.' }, { status: 400, headers: CORS });
      }

      // Step 2: NIV(api.bible) + 개역개정4판(Sonnet) 병렬 호출
      const [nivResponse, koResponse] = await Promise.all([
        fetch(
          `https://api.bible/v1/bibles/${NIV_BIBLE_ID}/passages/${encodeURIComponent(passageId)}?content-type=text&include-verse-numbers=false&include-titles=false`,
          { headers: { 'api-key': BIBLE_API_KEY } }
        ),
        fetch(gatewayUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 512,
            system: `개역개정4판 한국어 성경 본문을 정확히 출력합니다. 절 번호 없이 본문만 출력하세요. 설명이나 부연 없이.`,
            messages: [{ role: 'user', content: `개역개정4판 ${text.trim()}` }],
          }),
        }),
      ]);

      let en = '';
      if (nivResponse.ok) {
        const nivData = await nivResponse.json();
        en = (nivData.data?.content || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      } else {
        const errText = await nivResponse.text();
        console.error('NIV API error:', nivResponse.status, errText);
        en = `[DEBUG ${nivResponse.status}: ${errText.slice(0, 200)}]`;
      }

      const koData = await koResponse.json();
      const ko = koData.content?.[0]?.text?.trim() || '';

      if (!ko && !en) {
        return Response.json({ error: '성경 구절을 찾지 못했습니다. 구절 참조를 확인해 주세요.' }, { status: 500, headers: CORS });
      }

      return Response.json({ ko, en }, { headers: CORS });
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
