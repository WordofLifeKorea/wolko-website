/**
 * 캠프팀 파일 본문 보관소.
 *  - CAMPTEAM_FILES (R2 바인딩) 이 있으면 R2 를 쓴다 — 로컬 테스트와 NAS 가 없는 환경용.
 *  - 없고 기존 NAS 게이트웨이 설정(TEACH_NAS_URL/TOKEN)이 있으면 NAS 를 쓴다.
 *  - 둘 다 없으면 null → 파일 올리기는 막히고 링크 등록만 된다.
 * NAS 는 기존 게이트웨이를 그대로 호출하기만 한다 (게이트웨이 코드는 수정하지 않는다).
 */
import { nasStorageConfig, nasFileRequest } from './teachNasStorage.js';

export function storageFor(env) {
  if (env.CAMPTEAM_FILES) return r2Storage(env.CAMPTEAM_FILES);
  const nas = nasStorageConfig(env);
  return nas ? nasStorage(nas) : null;
}

function r2Storage(bucket) {
  return {
    backend: 'r2',
    async put(fileName, body, { mime }) {
      const key = `campteam/${crypto.randomUUID()}`;
      await bucket.put(key, body, { httpMetadata: { contentType: mime } });
      return key;
    },
    async get(key) {
      const obj = await bucket.get(key);
      return obj ? { body: obj.body, size: obj.size } : null;
    },
  };
}

function nasStorage(config) {
  return {
    backend: 'nas',
    async put(fileName, body, { mime, size }) {
      const ext = (/\.([a-z0-9]{1,16})$/i.exec(fileName) || [, 'bin'])[1].toLowerCase();
      const key = `nas-${crypto.randomUUID()}.${ext}`;
      const res = await nasFileRequest(config, key, { method: 'PUT', body, duplex: 'half',
        headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(size), 'X-Wolko-Group': 'camp', 'X-Wolko-Filename': encodeURIComponent(fileName) } });
      if (res.status !== 201) throw new Error('NAS upload unavailable');
      return key;
    },
    async get(key) {
      const res = await nasFileRequest(config, key);
      if (res.status !== 200) return null;
      return { body: res.body, size: Number(res.headers.get('content-length')) || 0 };
    },
  };
}
