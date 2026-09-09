/**
 * 포탈의 "Resource & Media" 작업 현황 리포트 — 항목 목록/파일 첨부가 공유하는
 * KV 접근 헬퍼. resources.js(항목 CRUD)와 resource-file.js(작업 파일 첨부)가
 * 같은 로직을 중복하지 않도록 여기 모아둔다.
 */
import { parseHubSessionToken } from './hubAccounts.js';

export const KV_KEY = 'portal:resources:v1';
export const MAX_ITEMS = 120;

export async function sessionFor(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  return token && env.ADMIN_PASSWORD ? parseHubSessionToken(env.ADMIN_PASSWORD, token) : null;
}

export function canWrite(session) {
  return session && (session.role === 'admin' || session.role === 'master');
}

export function text(value, max) {
  return String(value || '').trim().slice(0, max);
}

export async function readData(env) {
  const data = await env.CAMP_KV.get(KV_KEY, 'json');
  return data && Array.isArray(data.items) ? data : { items: [] };
}

export async function saveData(env, items) {
  const data = { items: items.slice(0, MAX_ITEMS), updatedAt: new Date().toISOString() };
  await env.CAMP_KV.put(KV_KEY, JSON.stringify(data));
  return data;
}

export function error(message, status) {
  return Response.json({ error: message }, { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
}

// 항목의 첨부 파일 목록을 항상 배열 형태로 돌려준다. 예전엔 "작업 파일"/
// "원본 파일" 두 칸(workFile/originalFile)이 고정이었는데, 지금은 개수 제한
// 없는 자유 목록(files)이다 — 예전 데이터도 이 형태로 변환해서 보여준다
// (실제 파일 blob은 이미 portal:resource-file:{id}:work / :original 키에
// 그대로 있으므로, id로 그 키 이름을 재사용하면 데이터 이전 없이 바로 호환된다).
export function filesOf(item) {
  if (Array.isArray(item?.files)) return item.files;
  const legacy = [];
  if (item?.workFile) legacy.push({ id: 'work', ...item.workFile });
  if (item?.originalFile) legacy.push({ id: 'original', ...item.originalFile });
  return legacy;
}

// 진행 상황은 번역/검토/디자인·퍼블리시 3단계(각 33.3%)로 고정한다. 예전엔
// 진행 상태(기획/번역/검수/완료)와 0~100 자유 진행률이 따로 있었는데, 그
// 조합을 가장 가까운 단계로 한 번만 옮겨준다 — 옛 진행률 숫자는 버리고
// 상태만 기준으로 삼는다(3단계는 정확히 0/33/67/100%뿐이라 옛 자유
// 진행률을 그대로 대응시킬 방법이 없다).
export const STAGE_COUNT = 3;

export function legacyStageFromStatus(status) {
  if (status === 'complete') return 3;
  if (status === 'review') return 2;
  return 0; // planning, translating, 그 외 전부 "아직 번역 중"으로 취급
}

export function stageOf(item) {
  const n = Number(item?.stage);
  if (Number.isInteger(n) && n >= 0 && n <= STAGE_COUNT) return n;
  return legacyStageFromStatus(item?.status);
}

export function progressFromStage(stage) {
  return Math.round((stage / STAGE_COUNT) * 100);
}

// 레슨/파트별로 파일을 묶어두는 폴더 — 파일 blob과 달리 KV에 항목 레코드
// 안에 그대로 저장되는 가벼운 메타데이터다.
export function foldersOf(item) {
  return Array.isArray(item?.folders) ? item.folders : [];
}
