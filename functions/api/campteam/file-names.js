import { campSession, canWriteFile, json, needLogin, needPerm, badRequest, noDb } from '../../lib/campteamAuth.js';
import { suggestNames } from '../../lib/campteamFileNames.js';
import { restrictedFor, CATEGORIES } from '../../lib/campteamFiles.js';

/**
 * 폴더째 올리기 도우미 — 폴더 이름·파일 이름을 깔끔하게 정리해 **제안**한다 (저장하지 않는다).
 * POST { folderName, files:[{ name, dir? }], category? }  →  { folder:{ name, nameEn }, titles:[...], ai }
 * AI 에는 이름 글자만 보내고 파일 내용은 보내지 않는다. 금액(예산) 자료로 올리는 경우에는 AI 를 쓰지 않고 기본 정리만 한다.
 */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env);
  if (!s) return needLogin();
  if (!canWriteFile(s.perms, 0)) return needPerm('작성 권한이 없습니다.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const files = Array.isArray(b.files) ? b.files.slice(0, 300).map((f) => ({ name: String((f && f.name) || ''), dir: String((f && f.dir) || '') })) : [];
  if (!files.length) return badRequest('파일이 없습니다.');
  const category = CATEGORIES.includes(b.category) ? b.category : 'etc';
  return json(await suggestNames(env, { folderName: String(b.folderName || ''), files, useAi: !restrictedFor(category) }));
}
