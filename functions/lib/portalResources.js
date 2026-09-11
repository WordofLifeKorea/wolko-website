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

// 진행 상황은 번역/검토/디자인·퍼블리시 3단계로 고정하되, 각 단계 안에서도
// 10% 단위로 세부 퍼센트를 매길 수 있다(예: 번역 70% + 검토 0% + 퍼블리시
// 0% → 전체 23%). 예전엔 "단계를 몇 개 완료했는지"만 있었는데(stage:0~3),
// 그 값을 각 단계 100%/0%로 한 번만 옮겨서 세부 퍼센트 도입 전 데이터와도
// 호환한다.
export const STAGE_COUNT = 3;

export function legacyStageFromStatus(status) {
  if (status === 'complete') return 3;
  if (status === 'review') return 2;
  return 0; // planning, translating, 그 외 전부 "아직 번역 중"으로 취급
}

function snap10(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n / 10) * 10)) : 0;
}

// 두 번째(검토) 단계만은 손으로 정하지 않는다 — 이 항목의 파일 중 하나라도
// "검토 완료"를 체크한 서로 다른 선교사 수로 매긴다. 한 명당 33%, 3명이면
// 100%이고, 4명 이상이어도 100%를 넘지 않는다.
export const REVIEW_STAGE_INDEX = 1;
export const REVIEWERS_FOR_FULL_REVIEW = 3;

export function reviewerCountOf(item) {
  const slugs = new Set();
  for (const file of filesOf(item)) {
    for (const slug of Object.keys(file.reviewConfirmations || {})) slugs.add(slug);
  }
  return slugs.size;
}

export function reviewPercentOf(item) {
  const count = reviewerCountOf(item);
  return count >= REVIEWERS_FOR_FULL_REVIEW ? 100 : count * 33;
}

function storedStagePercentsOf(item) {
  if (Array.isArray(item?.stagePercents) && item.stagePercents.length === STAGE_COUNT) {
    return item.stagePercents.map(snap10);
  }
  const stageInput = Number(item?.stage);
  const stage = Number.isInteger(stageInput) && stageInput >= 0 && stageInput <= STAGE_COUNT
    ? stageInput
    : legacyStageFromStatus(item?.status);
  return Array.from({ length: STAGE_COUNT }, (_, i) => (i < stage ? 100 : 0));
}

export function stagePercentsOf(item) {
  const percents = storedStagePercentsOf(item);
  percents[REVIEW_STAGE_INDEX] = reviewPercentOf(item);
  return percents;
}

export function progressFromStagePercents(percents) {
  return Math.round(percents.reduce((sum, p) => sum + p, 0) / percents.length);
}

// 검토 체크가 바뀌는 곳(체크 토글, 파일 교체·삭제)에서 저장 직전에 불러서,
// 응답으로 돌려주는 항목의 진행률도 바로 최신이 되게 한다.
export function refreshProgress(item) {
  item.stagePercents = stagePercentsOf(item);
  item.progress = progressFromStagePercents(item.stagePercents);
  return item;
}

// 레슨/파트별로 파일을 묶어두는 폴더 — 파일 blob과 달리 KV에 항목 레코드
// 안에 그대로 저장되는 가벼운 메타데이터다.
export function foldersOf(item) {
  return Array.isArray(item?.folders) ? item.folders : [];
}

// 파일 미리보기 위 하이라이트+노트. 텍스트만 담는 가벼운 메타데이터라
// folders와 마찬가지로 항목 레코드 안에 그대로 저장한다.
export const MAX_ANNOTATIONS_PER_ITEM = 300;
export const MAX_COMMENTS_PER_ANNOTATION = 100;
// 노트를 삭제하면 바로 지우지 않고 deletedAt만 표시해 휴지통에 담아두고,
// 이 기간이 지난 것만 실제로 걷어낸다(복원 가능 기간).
export const ANNOTATION_TRASH_RETENTION_MS = 10 * 24 * 60 * 60 * 1000;

// annotationsOf를 거치는 모든 곳(조회 응답, 다른 항목 수정 시 재저장 등)에서
// 자연스럽게 오래된 휴지통 항목이 걸러지므로, 별도의 정리 배치가 없어도
// 저장소가 무한정 커지지 않는다.
export function annotationsOf(item) {
  const raw = Array.isArray(item?.annotations) ? item.annotations : [];
  const now = Date.now();
  return raw.filter(a => !a.deletedAt || now - new Date(a.deletedAt).getTime() < ANNOTATION_TRASH_RETENTION_MS);
}

export function commentsOf(annotation) {
  return Array.isArray(annotation?.comments) ? annotation.comments : [];
}
