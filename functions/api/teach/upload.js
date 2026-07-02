const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXT = {
  presentation: /\.(pdf|pptx|png|jpe?g|webp|gif|heic|heif)$/i,
  bgm: /\.(mp3|wav|m4a)$/i,
};
const CONTENT_TYPES = {
  pdf: 'application/pdf',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
};
const ERROR_MESSAGES = {
  presentation: 'PDF, PPTX 또는 이미지 파일만 업로드할 수 있습니다.',
  bgm: 'MP3, WAV, M4A 파일만 업로드할 수 있습니다.',
};

function getTeachFileStore(env) {
  const bucket = env.TEACH_FILES || env.CAMP_RESOURCES_FILES || env.CAMP_FILES || env.R2_BUCKET || env.BUCKET;
  if (bucket) return { type: 'r2', storage: bucket };
  if (env.CAMP_KV) return { type: 'kv', storage: env.CAMP_KV };
  return null;
}

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
  const store = getTeachFileStore(env);
  if (!env.ADMIN_PASSWORD || !store) {
    return Response.json({ error: '서버 설정이 필요합니다. (파일 저장소 미연결)' }, { status: 500, headers: CORS });
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

    const key = `${store.type === 'kv' ? 'teach-file:' : ''}${crypto.randomUUID()}.${ext}`;
    const contentType = file.type || CONTENT_TYPES[ext] || 'application/octet-stream';
    const contentDisposition = `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`;
    if (store.type === 'r2') {
      await store.storage.put(key, file.stream(), {
        httpMetadata: { contentType, contentDisposition },
      });
    } else {
      await store.storage.put(key, file.stream(), {
        metadata: { contentType, contentDisposition, filename: file.name },
      });
    }

    const url = new URL(`/api/teach/file/${encodeURIComponent(key)}`, request.url).toString();
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
