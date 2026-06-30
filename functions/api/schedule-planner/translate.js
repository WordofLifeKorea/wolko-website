/**
 * POST /api/schedule-planner/translate
 * Translates English schedule text to Korean using Claude.
 * Body: { texts: string[] }
 * Returns: { translations: string[] }
 */
const CORS = { 'Content-Type': 'application/json' };

export async function onRequestPost(context) {
  const { env, request } = context;
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500, headers: CORS });
  }

  let texts;
  try {
    ({ texts } = await request.json());
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400, headers: CORS });
  }
  if (!Array.isArray(texts) || !texts.length) {
    return Response.json({ translations: [] }, { headers: CORS });
  }

  const prompt = `You are translating camp schedule text from English to Korean.
Rules:
- Translate each item to natural Korean.
- Keep proper nouns (names of people, places like "WOLKO Center", "Songtan") as-is.
- Keep time expressions (e.g. "3:20-4:15") as-is.
- Return ONLY a valid JSON array of translated strings, same length and order as input.
- No explanation, no markdown, no extra text.

Input: ${JSON.stringify(texts)}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Anthropic API error:', res.status, err);
      return Response.json({ error: 'Translation API error' }, { status: 502, headers: CORS });
    }

    const data = await res.json();
    const raw = data.content?.[0]?.text?.trim() || '[]';
    const translations = JSON.parse(raw);

    if (!Array.isArray(translations) || translations.length !== texts.length) {
      throw new Error('Unexpected translation response shape');
    }

    return Response.json({ translations }, { headers: CORS });
  } catch (err) {
    console.error('translate error:', err);
    return Response.json({ error: String(err) }, { status: 500, headers: CORS });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
