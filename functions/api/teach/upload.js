const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXT = {
  presentation: /\.(pdf|pptx)$/i,
  bgm: /\.(mp3|wav|m4a)$/i,
};
const CONTENT_TYPES = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
};
const ERROR_MESSAGES = {
  presentation: 'PDF 또는 PPTX 파일만 업로드할 수 있습니다.',
  bgm: 'MP3, WAV, M4A 파일만 업로드할 수 있습니다.',
};

async function verifyToken(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !env.ADMIN_PASSWORD) return false;
  try {
    const decoded = atob(token);
    const lastColon = decoded.lastIndexOf(':');
    const sigHex = decoded.slice(lastColon + 1);
    const data = decoded.slice(0, lastColon);
    const parts = data.split(':');
    if (parts[0] !== 'wolko-teach' || parts[1] !== 'admin') return false;
    const expires = parseInt(parts[2], 10);
    if (!expires || Date.now() > expires) return false;
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(env.ADMIN_PASSWORD),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sig = new Uint8Array(sigHex.match(/.{2}/g).map(part => parseInt(part, 16)));
    return crypto.subtle.verify('HMAC', key, sig, new TextEncoder().encode(data));
  } catch {
    return false;
  }
}

function extOf(filename, kind) {
  const match = String(filename || '').match(ALLOWED_EXT[kind]);
  return match ? match[1].toLowerCase() : '';
}

export async function onRequestPost(context) {
  const { env, request } = context;
  if (!env.ADMIN_PASSWORD || !env.TEACH_FILES) {
    return Response.json({ error: '서버 설정이 필요합니다. (R2 버킷 미연결)' }, { status: 500, headers: CORS });
  }
  if (!(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    const kind = ALLOWED_EXT[form.get('kind')] ? form.get('kind') : 'presentation';
    if (!file || typeof file === 'string') {
      return Response.json({ error: '파일을 선택해주세요.' }, { status: 400, headers: CORS });
    }
    const ext = extOf(file.name, kind);
    if (!ext) {
      return Response.json({ error: ERROR_MESSAGES[kind] }, { status: 400, headers: CORS });
    }
    if (file.size > MAX_SIZE) {
      return Response.json({ error: '파일이 너무 큽니다. (최대 20MB)' }, { status: 400, headers: CORS });
    }

    const key = `${crypto.randomUUID()}.${ext}`;
    await env.TEACH_FILES.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || CONTENT_TYPES[ext],
        contentDisposition: `inline; filename="${encodeURIComponent(file.name)}"`,
      },
    });

    const url = new URL(`/api/teach/file/${key}`, request.url).toString();
    return Response.json({ url, filename: file.name }, { headers: CORS });
  } catch (error) {
    console.error('teach upload error:', error);
    return Response.json({ error: '업로드하지 못했습니다.' }, { status: 500, headers: CORS });
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
