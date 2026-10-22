import { campSession, json, needLogin, noDb, denyView } from '../../lib/campteamAuth.js';
import { signToken } from '../../lib/hubAccounts.js';
import { canPreview } from '../../lib/campteamFiles.js';

const LIFETIME_MS = 5 * 60 * 1000;

/**
 * 로그인한 사람에게 "5분짜리 열기 주소"를 만들어 준다.
 * 이미지·PDF 미리보기와 다운로드 링크는 로그인 정보를 실을 수 없어서, 이렇게 짧게 유효한 서명 주소를 쓴다.
 * 주소를 알아도 5분이 지나면 열리지 않는다.   ?id= &versionId=(없으면 현재 버전) &download=1
 */
export async function onRequestGet({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  { const dv = denyView(s.perms, 'files', '자료'); if (dv) return dv; }
  const p = new URL(request.url).searchParams, id = p.get('id');
  const f = await env.DB.prepare('SELECT id, restricted, currentVersionId, storage FROM files WHERE id = ?1 AND deletedAt IS NULL').bind(id).first();
  if (!f || (f.restricted && !s.perms.moneyRead) || f.storage === 'link') return json({ error: '찾을 수 없습니다.' }, 404);
  const v = await env.DB.prepare('SELECT id, mime FROM file_versions WHERE id = ?1 AND fileId = ?2 AND deletedAt IS NULL').bind(p.get('versionId') || f.currentVersionId, id).first();
  if (!v) return json({ error: '찾을 수 없습니다.' }, 404);
  const disposition = p.get('download') === '1' || !canPreview(v.mime) ? 'attachment' : 'inline';
  const exp = Date.now() + LIFETIME_MS;
  const sig = await signToken(env.ADMIN_PASSWORD, `campfile|${id}|${v.id}|${exp}|${disposition}`);
  return json({ url: `/api/campteam/file-get?t=${encodeURIComponent(sig)}`, expiresAt: exp, disposition, previewable: canPreview(v.mime), mime: v.mime });
}
