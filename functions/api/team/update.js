/**
 * POST /api/team/update
 * Body: { fields: { bio_ko, bio_en, bio_ko_2, bio_en_2, verse_ref, verse_ko, verse_en, ... } }
 * Headers: Authorization: Bearer <token>
 *
 * Verifies token → extracts slug → fetches src/content/team/{slug}.md from GitHub →
 * updates the specified frontmatter fields → commits back via GitHub API.
 *
 * Required env vars (set in Cloudflare Pages):
 *   ADMIN_PASSWORD — token signing secret
 *   GITHUB_TOKEN   — PAT with repo write access
 *   GITHUB_REPO    — e.g. "WordofLifeKorea/wolko-website"
 *   GITHUB_BRANCH  — default "main"
 */

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

// ── Token verification ────────────────────────────────────────────────────────
async function verifyToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !env.ADMIN_PASSWORD) return null;

  try {
    const decoded = atob(token);
    // format: wolko-team:{slug}:{expires}:{sigHex}
    const lastColon = decoded.lastIndexOf(':');
    const sigHex = decoded.slice(lastColon + 1);
    const data = decoded.slice(0, lastColon);

    const parts = data.split(':');
    // parts[0]=wolko-team, parts[1]=slug, parts[2]=expires
    if (parts[0] !== 'wolko-team' || parts.length < 3) return null;
    const slug = parts[1];
    const expires = parseInt(parts[2]);
    if (!expires || Date.now() > expires) return null;

    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(env.ADMIN_PASSWORD),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sig = new Uint8Array(sigHex.match(/.{2}/g).map(b => parseInt(b, 16)));
    const valid = await crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
    return valid ? slug : null;
  } catch {
    return null;
  }
}

// ── GitHub helpers ────────────────────────────────────────────────────────────
async function ghGet(path, env) {
  const branch = env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'wolko-worker',
    },
  });
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ghPut(path, content, sha, message, env) {
  const branch = env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'wolko-worker',
    },
    body: JSON.stringify({
      message,
      content: btoa(unescape(encodeURIComponent(content))), // UTF-8 safe base64
      sha,
      branch,
    }),
  });
  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status} ${await res.text()}`);
  return res.json();
}

// ── YAML frontmatter updater ──────────────────────────────────────────────────
/**
 * Updates specific fields in YAML frontmatter.
 * Handles:
 *   - Single-line strings: key: "value" or key: value
 *   - Multi-line block scalars: key: |-\n  ... or key: >-\n  ...
 *
 * Strategy: split file at --- boundaries, operate only on frontmatter block.
 */
function updateFrontmatter(raw, fields) {
  // Split into [pre, frontmatter, ...rest]
  const parts = raw.split(/^---\s*$/m);
  if (parts.length < 3) return raw; // no frontmatter found

  let fm = parts[1];
  const body = parts.slice(2).join('---\n');

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    const strVal = String(value);

    // Check if key currently exists in frontmatter
    // Use word-boundary style: key must be followed immediately by ':'
    const keyExistsRegex = new RegExp(`^${key}:`, 'm');
    const keyExists = keyExistsRegex.test(fm);

    // If the value is empty and the key doesn't already exist, skip it.
    // This prevents creating YAML null entries (key: ) that fail Zod validation.
    if (strVal === '' && !keyExists) continue;

    const encoded = encodeYamlStringField(key, strVal);

    if (keyExists) {
      // Replace existing key — need to handle multi-line block scalars carefully
      fm = replaceYamlField(fm, key, encoded);
    } else {
      // Append new key
      fm = fm.trimEnd() + '\n' + encoded + '\n';
    }
  }

  return `---\n${fm}\n---\n${body}`;
}

function encodeYamlStringField(key, value) {
  const normalized = String(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  if (normalized.includes('\n')) {
    const indented = normalized
      .replace(/\n+$/g, '')
      .split('\n')
      .map(line => (line ? `  ${line}` : ''))
      .join('\n');
    return `${key}: |-\n${indented}`;
  }

  // Always JSON-quote single-line strings so YAML will not coerce values like
  // "2026-05-20", "true", "no", "null", or strings containing # / :.
  return `${key}: ${JSON.stringify(normalized)}`;
}

/**
 * Replace a YAML field (including any block scalar that follows it).
 */
function replaceYamlField(fm, key, encoded) {
  const lines = fm.split('\n');
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Does this line start the target key?
    if (new RegExp(`^${key}:`).test(line)) {
      // Consume this line + any indented continuation lines
      out.push(...encoded.split('\n'));
      i++;
      // Skip continuation lines (indented with at least 2 spaces, or empty)
      while (i < lines.length && (/^[ \t]+/.test(lines[i]) || lines[i] === '')) {
        i++;
      }
    } else {
      out.push(line);
      i++;
    }
  }

  return out.join('\n');
}

// ── Main handler ──────────────────────────────────────────────────────────────
export async function onRequestPost(context) {
  const { env, request } = context;

  const slug = await verifyToken(request, env);
  if (!slug) {
    return Response.json({ error: '인증이 필요합니다.' }, { status: 401, headers: CORS });
  }

  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return Response.json(
      { error: 'GITHUB_TOKEN 또는 GITHUB_REPO 환경변수가 설정되지 않았습니다.' },
      { status: 500, headers: CORS }
    );
  }

  let fields;
  try {
    ({ fields } = await request.json());
  } catch {
    return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400, headers: CORS });
  }

  // Allowlist — only these fields can be updated
  const ALLOWED = [
    'bio_ko', 'bio_en', 'bio_ko_2', 'bio_en_2',
    'verse_ref', 'verse_ko', 'verse_en',
    'photo_url', 'photo_story', 'photo_url_2',
    'hero_tagline_ko', 'hero_tagline_en',
    'hero_tagline2_ko', 'hero_tagline2_en',
    'hero_subtitle_ko', 'hero_subtitle_en',
    'prayer_ko', 'prayer_en',
    'report_url',
  ];
  const safeFields = Object.fromEntries(
    Object.entries(fields || {}).filter(([k]) => ALLOWED.includes(k))
  );

  if (Object.keys(safeFields).length === 0) {
    return Response.json({ error: '업데이트할 필드가 없습니다.' }, { status: 400, headers: CORS });
  }

  try {
    const filePath = `src/content/team/${slug}.md`;
    const ghFile = await ghGet(filePath, env);
    const raw = decodeURIComponent(escape(atob(ghFile.content.replace(/\n/g, ''))));

    const updated = updateFrontmatter(raw, safeFields);

    await ghPut(
      filePath,
      updated,
      ghFile.sha,
      `content: update team profile (${slug})`,
      env
    );

    return Response.json({ ok: true, slug }, { headers: CORS });
  } catch (e) {
    console.error('team/update error:', e);
    return Response.json({ error: e.message || '서버 오류가 발생했습니다.' }, { status: 500, headers: CORS });
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
