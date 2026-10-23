/**
 * Google Tasks API helper for Cloudflare Workers runtime.
 * googleCalendar.js와 같은 서비스 계정 RS256 JWT 방식이지만, Tasks는 캘린더처럼
 * "공유"할 수 없는 사용자별 데이터라서 Workspace 도메인 전체 위임(domain-wide
 * delegation)으로 지정한 사용자(delegatedUser)인 척 접근한다.
 *
 * 사전 설정: 관리 콘솔 > 보안 > API 제어 > 도메인 전체 위임에 이 서비스 계정의
 * Client ID와 scope(https://www.googleapis.com/auth/tasks)가 등록돼 있어야 하고,
 * Cloud 프로젝트에서 Google Tasks API가 켜져 있어야 한다.
 *
 * 양방향: /todo 화면에서 추가·완료 체크한 내용은 Google To Do에 바로 반영된다.
 * 폰이나 Gmail에서 바꾼 내용은 화면이 다시 불러올 때 반영된다(Tasks API에는
 * 푸시 알림이 없어서 화면이 주기적으로 가져온다).
 */

const TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks';
const TASKS_BASE = 'https://tasks.googleapis.com/tasks/v1';
const MAX_TASK_PAGES = 5; // 목록당 100개 × 5페이지 = 500개까지만 가져온다

function pemToDer(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function b64url(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// 화면이 30초마다 불러와도 매번 토큰을 새로 받지 않도록 같은 isolate 안에서 재사용한다.
let cachedToken = null;

async function getAccessToken(serviceAccount, delegatedUser) {
  const cacheKey = `${serviceAccount.client_email}|${delegatedUser}`;
  if (cachedToken && cachedToken.key === cacheKey && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  const enc = new TextEncoder();
  const header = b64url(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const claims = b64url(enc.encode(JSON.stringify({
    iss: serviceAccount.client_email,
    sub: delegatedUser,
    scope: TASKS_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })));
  const signingInput = `${header}.${claims}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToDer(serviceAccount.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(signingInput));
  const jwt = `${signingInput}.${b64url(sig)}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const json = await res.json();
  if (!json.access_token) {
    // unauthorized_client = 도메인 전체 위임이 아직 등록되지 않았거나 scope가 다름
    const err = new Error(`Google token error: ${JSON.stringify(json)}`);
    err.code = json.error || 'token_error';
    throw err;
  }
  cachedToken = { key: cacheKey, token: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 };
  return json.access_token;
}

async function tasksFetch({ serviceAccountJson, delegatedUser }, path, init = {}) {
  const token = await getAccessToken(JSON.parse(serviceAccountJson), delegatedUser);
  const headers = { Authorization: `Bearer ${token}` };
  if (init.body) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${TASKS_BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    throw new Error(`Tasks API error ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

function mapTask(item) {
  return {
    id: item.id,
    title: item.title || '',
    notes: item.notes || '',
    // Tasks의 마감일은 날짜만 의미가 있다(시간은 저장돼도 To Do 앱에서 쓰지 않음).
    due: item.due ? item.due.slice(0, 10) : null,
    status: item.status,
    parent: item.parent || null,
  };
}

async function listAllTasks(auth, listId) {
  const items = [];
  let pageToken = '';
  for (let page = 0; page < MAX_TASK_PAGES; page++) {
    const params = new URLSearchParams({ showCompleted: 'false', showHidden: 'false', maxResults: '100' });
    if (pageToken) params.set('pageToken', pageToken);
    const json = await tasksFetch(auth, `/lists/${encodeURIComponent(listId)}/tasks?${params}`);
    items.push(...(json.items || []));
    pageToken = json.nextPageToken;
    if (!pageToken) break;
  }
  return items;
}

/**
 * 모든 목록과 각 목록의 미완료 할 일을 가져온다(읽기). 순서는 To Do 앱과 같다.
 * 제목이 빈 할 일(To Do 앱에서 Enter만 눌러 생기는 빈 줄)은 화면에 의미가 없어 뺀다.
 */
export async function listTaskBoard({ serviceAccountJson, delegatedUser }) {
  const auth = { serviceAccountJson, delegatedUser };
  const lists = await tasksFetch(auth, '/users/@me/lists?maxResults=100');
  return Promise.all((lists.items || []).map(async (list) => {
    const items = await listAllTasks(auth, list.id);
    return {
      id: list.id,
      title: list.title || '',
      tasks: items.map(mapTask).filter(task => task.title.trim()),
    };
  }));
}

/** 새 할 일 추가. due는 'YYYY-MM-DD' 또는 없음. */
export async function addTask({ serviceAccountJson, delegatedUser, listId, title, due }) {
  const body = { title };
  if (due) body.due = `${due}T00:00:00.000Z`;
  const item = await tasksFetch(
    { serviceAccountJson, delegatedUser },
    `/lists/${encodeURIComponent(listId)}/tasks`,
    { method: 'POST', body: JSON.stringify(body) }
  );
  return mapTask(item);
}

/** 완료 체크/해제. 해제할 때는 completed 시각도 같이 지워야 To Do 앱에서 다시 미완료로 보인다. */
export async function setTaskCompleted({ serviceAccountJson, delegatedUser, listId, taskId, completed }) {
  const body = completed
    ? { status: 'completed' }
    : { status: 'needsAction', completed: null };
  const item = await tasksFetch(
    { serviceAccountJson, delegatedUser },
    `/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`,
    { method: 'PATCH', body: JSON.stringify(body) }
  );
  return mapTask(item);
}
