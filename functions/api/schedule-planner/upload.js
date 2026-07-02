const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const MAX_SIZE = 35 * 1024 * 1024;

function getFileStore(env) {
  const bucket = env.SCHEDULE_FILES || env.TEACH_FILES || env.CAMP_RESOURCES_FILES || env.CAMP_FILES || env.R2_BUCKET || env.BUCKET;
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
    if (parts[0] !== 'wolko-schedule-planner' || parts[1] !== 'admin') return false;
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

export async function onRequestPost(context) {
  const { env, request } = context;
  const store = getFileStore(env);
  if (!env.ADMIN_PASSWORD || !store) {
    return Response.json({ error: '서버 설정이 필요합니다. (파일 저장소 미연결)' }, { status: 500, headers: CORS });
  }
  if (!(await verifyToken(request, env))) {
    return Response.json({ error: '로그인이 필요합니다.' }, { status: 401, headers: CORS });
  }

  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!file || typeof file === 'string') {
      return Response.json({ error: 'PDF 파일을 선택해주세요.' }, { status: 400, headers: CORS });
    }
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
      return Response.json({ error: 'PDF 파일만 업로드할 수 있습니다.' }, { status: 400, headers: CORS });
    }
    if (file.size > MAX_SIZE) {
      return Response.json({ error: '파일이 너무 큽니다. (최대 35MB)' }, { status: 400, headers: CORS });
    }

    const key = `${store.type === 'kv' ? 'schedule-pdf-' : ''}${crypto.randomUUID()}.pdf`;
    const contentDisposition = `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`;
    if (store.type === 'r2') {
      await store.storage.put(key, file.stream(), {
        httpMetadata: { contentType: 'application/pdf', contentDisposition },
      });
    } else {
      await store.storage.put(key, file.stream(), {
        metadata: { contentType: 'application/pdf', contentDisposition, filename: file.name },
      });
    }

    const url = new URL(`/api/schedule-planner/file/${encodeURIComponent(key)}`, request.url).pathname;
    return Response.json({
      pdf: {
        url,
        filename: file.name,
        uploadedAt: new Date().toISOString(),
      },
    }, { headers: CORS });
  } catch (error) {
    console.error('schedule pdf upload error:', error);
    return Response.json({ error: 'PDF를 업로드하지 못했습니다.' }, { status: 500, headers: CORS });
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
