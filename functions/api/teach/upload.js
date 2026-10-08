import { teachRole } from '../../lib/teachAuth.js';
import { nasStorageConfig, nasFileRequest } from '../../lib/teachNasStorage.js';

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
};

const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const BGM_EXT = /\.(mp3|wav|m4a)$/i;
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

function getTeachFileStore(env) {
  const nas = nasStorageConfig(env);
  if (nas) return { type:'nas', storage:nas };
  const bucket = env.TEACH_FILES || env.CAMP_RESOURCES_FILES || env.CAMP_FILES || env.R2_BUCKET || env.BUCKET;
  if (bucket) return { type: 'r2', storage: bucket };
  if (env.CAMP_KV) return { type: 'kv', storage: env.CAMP_KV };
  return null;
}


function extOf(filename) {
  const match = String(filename || '').match(/\.([a-z0-9]{1,16})$/i);
  return match ? match[1].toLowerCase() : '';
}

export async function onRequestPost(context) {
  const { env, request } = context;
  const role = await teachRole(request, env);
  if (!role) return Response.json({ error:'로그인이 필요합니다.' }, { status:401, headers:CORS });
  let store;
  try { store = getTeachFileStore(env); }
  catch { return Response.json({ error:'NAS 저장소 설정을 확인해주세요.' }, { status:503, headers:CORS }); }
  if (!env.ADMIN_PASSWORD || !store) {
    return Response.json({ error: '서버 설정이 필요합니다. (파일 저장소 미연결)' }, { status: 500, headers: CORS });
  }
  try {
    const form = await request.formData();
    const file = form.get('file');
    const kind = form.get('kind') === 'bgm' ? 'bgm' : 'presentation';
    if (!file || typeof file === 'string') {
      return Response.json({ error: '파일을 선택해주세요.' }, { status: 400, headers: CORS });
    }
    const ext = extOf(file.name);
    if (kind === 'bgm' && !BGM_EXT.test(file.name)) {
      return Response.json({ error: 'MP3, WAV, M4A 파일만 업로드할 수 있습니다.' }, { status: 400, headers: CORS });
    }
    if (file.size > MAX_SIZE) {
      return Response.json({ error: '파일이 너무 큽니다. (최대 20MB)' }, { status: 400, headers: CORS });
    }

    const key = `${store.type === 'nas' ? 'nas-' : store.type === 'kv' ? 'teach-file-' : ''}${crypto.randomUUID()}.${ext || 'bin'}`;
    // Unknown formats must download, never execute on the site's origin.
    const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
    const disposition = CONTENT_TYPES[ext] ? 'inline' : 'attachment';
    const contentDisposition = `${disposition}; filename*=UTF-8''${encodeURIComponent(file.name)}`;
    if (store.type === 'nas') {
      const response = await nasFileRequest(store.storage, key, {
        method:'PUT', body:file.stream(), headers:{
          'Content-Type':contentType, 'Content-Disposition':contentDisposition,
          'X-Wolko-Group':'camp', 'X-Wolko-Filename':encodeURIComponent(file.name),
        },
      });
      if (response.status !== 201) {
        return Response.json({ error:'NAS에 저장하지 못했습니다. 연결 상태와 남은 용량을 확인해주세요.' }, { status:503, headers:CORS });
      }
    } else if (store.type === 'r2') {
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
    if (store.type === 'nas') return Response.json({ error:'NAS 연결에 실패했습니다. 잠시 후 다시 시도해주세요.' }, { status:503, headers:CORS });
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
