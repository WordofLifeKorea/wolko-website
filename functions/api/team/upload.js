/**
 * POST /api/team/upload
 * Body: multipart/form-data  { file: File, field: "photo_url" | "photo_story" | "photo_url_2" }
 * Headers: Authorization: Bearer <token>
 *
 * Uploads photo to public/images/uploads/ via GitHub API,
 * then updates the corresponding photo field in the team .md file.
 *
 * Required env vars:
 *   ADMIN_PASSWORD, GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH
 */

const CORS = {
  'Access-Control-Allow-Origin': '*',
};

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

// ArrayBuffer → base64
function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

async function ghGetSha(path, env) {
  const branch = env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'wolko-worker',
    },
  });
  if (res.status === 404) return null; // new file
  if (!res.ok) return null;
  const json = await res.json();
  return json.sha || null;
}

async function ghPutBinary(path, base64Content, sha, message, env) {
  const branch = env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}`;
  const body = { message, content: base64Content, branch };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'wolko-worker',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub PUT failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ghGetFile(path, env) {
  const branch = env.GITHUB_BRANCH || 'main';
  const url = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'wolko-worker',
    },
  });
  if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
  return res.json();
}

function replaceYamlField(fm, key, encoded) {
  const lines = fm.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (new RegExp(`^${key}:`).test(line)) {
      out.push(...encoded.split('\n'));
      i++;
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

function updateFrontmatterField(raw, key, value) {
  const parts = raw.split(/^---\s*$/m);
  if (parts.length < 3) return raw;
  let fm = parts[1];
  const body = parts.slice(2).join('---\n');
  const encoded = `${key}: ${JSON.stringify(String(value))}`;
  if (new RegExp(`^${key}:`, 'm').test(fm)) {
    fm = replaceYamlField(fm, key, encoded);
  } else {
    fm = fm.trimEnd() + '\n' + encoded + '\n';
  }
  return `---\n${fm}\n---\n${body}`;
}

export async function onRequestPost(context) {
  const { env, request } = context;

  const slug = await verifyToken(request, env);
  if (!slug) {
    return new Response(JSON.stringify({ error: '인증이 필요합니다.' }), {
      status: 401, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) {
    return new Response(JSON.stringify({ error: 'GitHub 환경변수 미설정' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const field = formData.get('field'); // photo_url | photo_story | photo_url_2

    const PHOTO_FIELDS = ['photo_url', 'photo_story', 'photo_url_2'];
    const ALLOWED_FIELDS = [...PHOTO_FIELDS, 'report_url'];
    if (!file || !ALLOWED_FIELDS.includes(field)) {
      return new Response(JSON.stringify({ error: 'file과 유효한 field가 필요합니다.' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    const mimeType = file.type || '';
    const isPhoto = PHOTO_FIELDS.includes(field);
    const isPdf = field === 'report_url';

    if (isPhoto && !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) {
      return new Response(JSON.stringify({ error: '이미지 파일만 업로드 가능합니다 (jpg, png, webp).' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }
    if (isPdf && mimeType !== 'application/pdf') {
      return new Response(JSON.stringify({ error: 'PDF 파일만 업로드 가능합니다.' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' }
      });
    }

    // Build filename and path
    const timestamp = Date.now();
    let uploadPath, publicUrl;
    if (isPdf) {
      const filename = `${slug}-newsletter-${timestamp}.pdf`;
      uploadPath = `public/reports/${filename}`;
      publicUrl = `/reports/${filename}`;
    } else {
      const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
      const filename = `${slug}-${field}-${timestamp}.${ext}`;
      uploadPath = `public/images/uploads/${filename}`;
      publicUrl = `/images/uploads/${filename}`;
    }

    // Get existing SHA if file exists (unlikely for new upload)
    const existingSha = await ghGetSha(uploadPath, env);

    // Upload to GitHub
    const arrayBuffer = await file.arrayBuffer();
    const base64Content = arrayBufferToBase64(arrayBuffer);
    await ghPutBinary(uploadPath, base64Content, existingSha, `media: upload photo for ${slug}`, env);

    // Now update the .md file to point to new photo URL
    const mdPath = `src/content/team/${slug}.md`;
    const ghFile = await ghGetFile(mdPath, env);
    const raw = decodeURIComponent(escape(atob(ghFile.content.replace(/\n/g, ''))));
    const updated = updateFrontmatterField(raw, field, publicUrl);
    await ghPutBinary(
      mdPath,
      btoa(unescape(encodeURIComponent(updated))),
      ghFile.sha,
      `content: update ${field} for ${slug}`,
      env
    );

    return new Response(JSON.stringify({ ok: true, url: publicUrl }), {
      headers: { ...CORS, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('team/upload error:', e);
    return new Response(JSON.stringify({ error: e.message || '서버 오류' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' }
    });
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
