/**
 * POST /api/schedule-planner/translate
 * Translates English schedule text to Korean using Cloudflare Workers AI.
 * Body: { texts: string[] }
 * Returns: { translations: string[] }
 */
const CORS = { 'Content-Type': 'application/json' };

export async function onRequestPost(context) {
  const { env, request } = context;

  if (!env.AI) {
    return Response.json({ error: 'AI binding not configured. Add AI binding in Cloudflare Pages settings.' }, { status: 500, headers: CORS });
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

  try {
    const translations = await Promise.all(
      texts.map(text =>
        env.AI.run('@cf/meta/m2m100-1.2b', {
          text,
          source_lang: 'en',
          target_lang: 'ko',
        }).then(r => r.translated_text || text).catch(() => text)
      )
    );
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
