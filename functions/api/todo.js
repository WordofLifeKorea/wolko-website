/**
 * /api/todo — 세 번째 모니터용 할 일 화면(/todo)이 쓰는 Google Tasks 중계 API
 *
 *   GET  → { lists: [{ id, title, tasks: [...] }], fetchedAt }
 *   POST → { action: 'add', listId, title, due? }
 *          { action: 'complete', listId, taskId, completed: true|false }
 *
 * 인증: 화면 전용 키(TODO_DISPLAY_KEY)를 Authorization: Bearer 로 보낸다.
 * 포탈 세션은 24시간 + 탭을 닫으면 사라져서 항상 켜두는 화면에는 맞지 않아 별도 키를 쓴다.
 *
 * Required env vars (Cloudflare Pages → Settings → Environment variables):
 *   TODO_DISPLAY_KEY            — 16자 이상의 긴 무작위 문자열(화면에 한 번 입력해 기기에 저장)
 *   GOOGLE_TASKS_USER           — 할 일을 가져올 Workspace 계정(예: hkim@wolko.org)
 *   GOOGLE_TASKS_SERVICE_ACCOUNT_JSON — Tasks 전용 서비스 계정 키(JSON 전체). 도메인 전체 위임에
 *                                 tasks scope 등록 필요. 없으면 기존 GOOGLE_SERVICE_ACCOUNT_JSON을 쓴다.
 */
import { listTaskBoard, addTask, setTaskCompleted } from '../lib/googleTasks.js';

const HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const MIN_KEY_LENGTH = 16;
const MAX_TITLE_LENGTH = 1024; // Google Tasks 제목 한도
const ID_PATTERN = /^[A-Za-z0-9_-]{1,200}$/;
const DUE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: HEADERS });
}

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

/** 키를 해시로 바꿔 길이와 무관하게 같은 시간에 비교한다. 통과하면 null, 아니면 응답을 돌려준다. */
async function authorize(request, env) {
  const expected = env.TODO_DISPLAY_KEY;
  if (!expected || expected.length < MIN_KEY_LENGTH) return json({ error: 'not_configured' }, 503);

  const auth = request.headers.get('Authorization') || '';
  const given = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const [a, b] = await Promise.all([sha256(given), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0 ? null : json({ error: 'unauthorized' }, 401);
}

/** Tasks 전용 서비스 계정을 우선 쓰고, 없으면 기존(캘린더/시트용) 서비스 계정으로 넘어간다. */
function googleConfig(env) {
  const serviceAccountJson = env.GOOGLE_TASKS_SERVICE_ACCOUNT_JSON || env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const missing = [];
  if (!serviceAccountJson) missing.push('GOOGLE_TASKS_SERVICE_ACCOUNT_JSON');
  if (!env.GOOGLE_TASKS_USER) missing.push('GOOGLE_TASKS_USER');
  if (missing.length) return { missing };
  return { serviceAccountJson, delegatedUser: env.GOOGLE_TASKS_USER };
}

function googleError(err) {
  console.error('todo api error:', err.message);
  // 구글이 돌려준 본문은 화면에 그대로 내보내지 않고 오류 코드만 알려준다.
  return json({ error: 'google_error', code: err.code || null }, 502);
}

function validDue(due) {
  return DUE_PATTERN.test(due) && new Date(`${due}T00:00:00Z`).toISOString().slice(0, 10) === due;
}

export async function onRequestGet({ request, env }) {
  const denied = await authorize(request, env);
  if (denied) return denied;
  const config = googleConfig(env);
  if (config.missing) return json({ error: 'not_configured', missing: config.missing }, 503);

  try {
    const lists = await listTaskBoard(config);
    return json({ lists, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return googleError(err);
  }
}

export async function onRequestPost({ request, env }) {
  const denied = await authorize(request, env);
  if (denied) return denied;
  const config = googleConfig(env);
  if (config.missing) return json({ error: 'not_configured', missing: config.missing }, 503);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad_request' }, 400);
  }
  if (!body || typeof body !== 'object' || !ID_PATTERN.test(body.listId || '')) {
    return json({ error: 'bad_request' }, 400);
  }

  try {
    if (body.action === 'add') {
      const title = typeof body.title === 'string' ? body.title.trim() : '';
      if (!title || title.length > MAX_TITLE_LENGTH) return json({ error: 'bad_request' }, 400);
      if (body.due != null && (typeof body.due !== 'string' || !validDue(body.due))) {
        return json({ error: 'bad_request' }, 400);
      }
      const task = await addTask({ ...config, listId: body.listId, title, due: body.due || null });
      return json({ task });
    }

    if (body.action === 'complete') {
      if (!ID_PATTERN.test(body.taskId || '') || typeof body.completed !== 'boolean') {
        return json({ error: 'bad_request' }, 400);
      }
      const task = await setTaskCompleted({ ...config, listId: body.listId, taskId: body.taskId, completed: body.completed });
      return json({ task });
    }
  } catch (err) {
    return googleError(err);
  }

  return json({ error: 'bad_request' }, 400);
}
