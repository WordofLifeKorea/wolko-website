/** 캠프팀 파일 관리 — 종류 판별, 이름 정리, 외부 링크 검사 같은 순수 도우미 */
export const CATEGORIES = ['program', 'staff', 'transport', 'supplies', 'budget', 'church', 'meeting', 'evaluation', 'promo', 'photo', 'audio', 'etc'];
export const RESTRICTED_CATEGORIES = ['budget']; // 금액 자료
export const FILE_STATUSES = ['', 'draft', 'active', 'archived'];
export const DEFAULT_MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // Cloudflare 무료 요청 크기 한도(100MB)에 맞춤

export const restrictedFor = (category) => RESTRICTED_CATEGORIES.includes(category);

const EXT = {
  pdf: ['pdf', 'application/pdf'],
  doc: ['doc', 'application/msword'], docx: ['doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], hwp: ['doc', 'application/octet-stream'], rtf: ['doc', 'application/rtf'],
  xls: ['xls', 'application/vnd.ms-excel'], xlsx: ['xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'], csv: ['xls', 'text/csv'],
  ppt: ['ppt', 'application/vnd.ms-powerpoint'], pptx: ['ppt', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'], key: ['ppt', 'application/octet-stream'],
  png: ['img', 'image/png'], jpg: ['img', 'image/jpeg'], jpeg: ['img', 'image/jpeg'], gif: ['img', 'image/gif'], webp: ['img', 'image/webp'], heic: ['img', 'image/heic'], heif: ['img', 'image/heif'],
  mp3: ['audio', 'audio/mpeg'], m4a: ['audio', 'audio/mp4'], wav: ['audio', 'audio/wav'], aac: ['audio', 'audio/aac'],
  mp4: ['video', 'video/mp4'], mov: ['video', 'video/quicktime'],
  txt: ['txt', 'text/plain'], md: ['txt', 'text/plain'], zip: ['zip', 'application/zip'],
};
// 브라우저 안에서 바로 열어도 안전한 형식만 "미리보기"로 보여준다. 나머지는 항상 다운로드.
export const INLINE_MIME = new Set(['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/aac', 'video/mp4']);

export const extOf = (name) => { const m = /\.([A-Za-z0-9]{1,8})$/.exec(String(name || '')); return m ? m[1].toLowerCase() : ''; };
export const kindFor = (name) => (EXT[extOf(name)] || ['etc'])[0];
/** 파일 이름 확장자로 정한 MIME — 브라우저가 보낸 값은 믿지 않는다 */
export const mimeFor = (name) => (EXT[extOf(name)] || [, 'application/octet-stream'])[1];
export const canPreview = (mime) => INLINE_MIME.has(mime);

export function cleanFileName(raw) {
  let name = String(raw || '');
  try { name = decodeURIComponent(name); } catch { /* 이미 풀린 이름 */ }
  name = name.normalize('NFC').replace(/[\\/<>:"|?*\x00-\x1f]/g, '_').replace(/^\.+/, '').trim().slice(0, 120);
  return name || 'file';
}

export function validExternalUrl(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 500) return '';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' || u.username || u.password) return '';
    return u.toString();
  } catch { return ''; }
}

export function linkKindFor(url) {
  let u; try { u = new URL(url); } catch { return 'other'; }
  const host = u.hostname.toLowerCase(), path = u.pathname;
  if (host === 'docs.google.com') {
    if (path.startsWith('/document')) return 'google-doc';
    if (path.startsWith('/spreadsheets')) return 'google-sheet';
    if (path.startsWith('/presentation')) return 'google-slide';
    if (path.startsWith('/forms')) return 'google-form';
    return 'other';
  }
  if (host === 'drive.google.com' || host === 'docs.google.com') return 'drive';
  if (host === 'canva.com' || host.endsWith('.canva.com') || host === 'canva.link') return 'canva'; // canva.com/design/…, canva.link/… (짧은 공유 주소)
  return 'other';
}
export const kindForLink = (linkKind) => ({ 'google-doc': 'doc', 'google-sheet': 'xls', 'google-slide': 'ppt' })[linkKind] || 'etc';

// ── 월코 팀 전체 공개 ──────────────────────────────────────────────────────
// 캠프팀 명단 밖의 월코 팀원은 "월코 팀 전체 공개"로 표시한 파일(포스터 등)만 볼 수 있다. 금액 자료는 공개로 표시할 수 없다.
export const PUBLIC_SQL = 'f.id IN (SELECT fileId FROM file_public)';
export async function setFilePublic(env, fileId, on, actor) {
  try {
    if (on) await env.DB.prepare('INSERT INTO file_public (fileId,setBy,updatedAt) VALUES (?1,?2,?3) ON CONFLICT(fileId) DO UPDATE SET setBy=?2, updatedAt=?3').bind(fileId, String(actor || ''), new Date().toISOString()).run();
    else await env.DB.prepare('DELETE FROM file_public WHERE fileId = ?1').bind(fileId).run();
  } catch { /* 공개 표시 표가 아직 없는 DB */ }
}
export async function isFilePublic(env, fileId) {
  try { return !!(await env.DB.prepare('SELECT 1 AS x FROM file_public WHERE fileId = ?1').bind(fileId).first()); } catch { return false; }
}
