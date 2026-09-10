/**
 * 파일 미리보기 위에 남기는 위치 하이라이트 + 노트 — PDF/이미지는 페이지 안
 * 정규화 좌표(0~1) 영역에, 영상/음성은 재생 시점에, 그 외 형식은 파일 전체에
 * 붙는 일반 노트로 남긴다. 폴더/업로드 로그와 마찬가지로 blob이 아니라
 * 항목 레코드 안에 그대로 저장되는 가벼운 텍스트 메타데이터다.
 *
 * GET    /api/portal/resource-annotation?id=                          — 현재 노트 목록. 열린 뷰어의 사용자 간 동기화용.
 * POST   /api/portal/resource-annotation                              — 노트 작성. 로그인만 하면(상담사 포함) 누구나 가능.
 * PUT    /api/portal/resource-annotation                               — 노트 텍스트/상태(해결·재열기) 수정. 작성자 본인 또는 admin/master만.
 * DELETE /api/portal/resource-annotation?id=&annotationId=            — 노트 삭제. 작성자 본인 또는 admin/master만.
 */
import { sessionFor, canWrite, text, readData, saveData, error, filesOf, annotationsOf, commentsOf, MAX_ANNOTATIONS_PER_ITEM } from '../../lib/portalResources.js';
import { getAccount } from '../../lib/hubAccounts.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
const KIND_VALUES = ['area', 'time', 'general'];

function num01(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function onRequestGet({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);

  const id = text(new URL(request.url).searchParams.get('id'), 80);
  if (!id) return error('잘못된 요청입니다.', 400);

  const data = await readData(env);
  const item = data.items.find(candidate => candidate.id === id);
  if (!item) return error('작업 항목을 찾을 수 없습니다.', 404);
  const annotations = annotationsOf(item).map(annotation => ({
    ...annotation,
    comments: commentsOf(annotation),
  }));
  return Response.json({ annotations, updatedAt: item.updatedAt || data.updatedAt || '' }, { headers: CORS });
}

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);

  let body;
  try { body = await request.json(); } catch { return error('잘못된 요청입니다.', 400); }

  const id = text(body.id, 80);
  const fileId = text(body.fileId, 80);
  const kind = KIND_VALUES.includes(body.kind) ? body.kind : null;
  const noteText = text(body.text, 500);
  if (!id || !fileId || !kind) return error('잘못된 요청입니다.', 400);
  if (!noteText) return error('노트 내용을 입력해 주세요.', 400);

  let page = null, x = null, y = null, w = null, h = null, timeSec = null, rects = null, quote = '';
  if (kind === 'area') {
    x = num01(body.x); y = num01(body.y); w = num01(body.w); h = num01(body.h);
    if ([x, y, w, h].some(v => v === null || v < 0 || v > 1)) return error('하이라이트 위치가 올바르지 않습니다.', 400);
    if (x + w > 1.0001 || y + h > 1.0001) return error('하이라이트 위치가 올바르지 않습니다.', 400);
    const pageInput = Number(body.page);
    page = Number.isInteger(pageInput) && pageInput > 0 ? pageInput : null;
    // 텍스트를 드래그로 선택한 노트는 줄마다 사각형이 하나씩 생겨서(여러 줄에
    // 걸치면 개수가 늘어난다) x/y/w/h(전체를 감싸는 바깥 상자) 외에 실제
    // 하이라이트로 그릴 줄별 사각형 목록도 같이 받는다 — 최대 20개로 제한.
    if (Array.isArray(body.rects) && body.rects.length) {
      const cleaned = body.rects.slice(0, 20).map(r => ({ x: num01(r?.x), y: num01(r?.y), w: num01(r?.w), h: num01(r?.h) }));
      const rectsValid = cleaned.every(r => [r.x, r.y, r.w, r.h].every(v => v !== null && v >= 0 && v <= 1) && r.x + r.w <= 1.0001 && r.y + r.h <= 1.0001);
      if (!rectsValid) return error('하이라이트 위치가 올바르지 않습니다.', 400);
      rects = cleaned;
    }
    quote = text(body.quote, 300);
  } else if (kind === 'time') {
    timeSec = num01(body.timeSec);
    if (timeSec === null || timeSec < 0) return error('노트 시점이 올바르지 않습니다.', 400);
  }

  const data = await readData(env);
  const index = data.items.findIndex(item => item.id === id);
  if (index < 0) return error('작업 항목을 찾을 수 없습니다.', 404);

  const item = { ...data.items[index] };
  if (!filesOf(item).some(f => f.id === fileId)) return error('파일을 찾을 수 없습니다.', 404);
  const annotations = annotationsOf(item);
  if (annotations.length >= MAX_ANNOTATIONS_PER_ITEM) return error(`노트는 최대 ${MAX_ANNOTATIONS_PER_ITEM}개까지 남길 수 있습니다.`, 400);

  const account = await getAccount(env, session.email);
  const createdByName = account?.name || session.email;
  const now = new Date().toISOString();
  const annotation = {
    id: crypto.randomUUID(), fileId, kind, page, x, y, w, h, timeSec, rects, quote,
    text: noteText, status: 'open', comments: [],
    createdBy: session.email, createdByName, createdAt: now, updatedAt: now,
  };
  item.annotations = [...annotations, annotation];
  item.updatedAt = now;
  data.items[index] = item;
  const saved = await saveData(env, data.items);
  return Response.json({ item, updatedAt: saved.updatedAt }, { headers: CORS });
}

export async function onRequestPut({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);

  let body;
  try { body = await request.json(); } catch { return error('잘못된 요청입니다.', 400); }
  const id = text(body.id, 80);
  const annotationId = text(body.annotationId, 80);
  if (!id || !annotationId) return error('잘못된 요청입니다.', 400);

  const data = await readData(env);
  const index = data.items.findIndex(item => item.id === id);
  if (index < 0) return error('작업 항목을 찾을 수 없습니다.', 404);

  const item = { ...data.items[index] };
  const annotations = annotationsOf(item);
  const annotationIndex = annotations.findIndex(a => a.id === annotationId);
  if (annotationIndex < 0) return error('노트를 찾을 수 없습니다.', 404);
  const existing = annotations[annotationIndex];
  if (existing.createdBy !== session.email && !canWrite(session)) return error('이 노트를 수정할 권한이 없습니다.', 403);

  const updated = { ...existing, updatedAt: new Date().toISOString() };
  if (Object.hasOwn(body, 'text')) {
    const noteText = text(body.text, 500);
    if (!noteText) return error('노트 내용을 입력해 주세요.', 400);
    updated.text = noteText;
  }
  if (Object.hasOwn(body, 'status')) {
    if (!['open', 'resolved'].includes(body.status)) return error('잘못된 요청입니다.', 400);
    updated.status = body.status;
  }
  item.annotations = annotations.map((a, i) => i === annotationIndex ? updated : a);
  item.updatedAt = new Date().toISOString();
  data.items[index] = item;
  const saved = await saveData(env, data.items);
  return Response.json({ item, updatedAt: saved.updatedAt }, { headers: CORS });
}

export async function onRequestDelete({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);

  const url = new URL(request.url);
  const id = text(url.searchParams.get('id'), 80);
  const annotationId = text(url.searchParams.get('annotationId'), 80);
  if (!id || !annotationId) return error('잘못된 요청입니다.', 400);

  const data = await readData(env);
  const index = data.items.findIndex(item => item.id === id);
  if (index < 0) return error('작업 항목을 찾을 수 없습니다.', 404);

  const item = { ...data.items[index] };
  const annotations = annotationsOf(item);
  const existing = annotations.find(a => a.id === annotationId);
  if (!existing) return error('노트를 찾을 수 없습니다.', 404);
  if (existing.createdBy !== session.email && !canWrite(session)) return error('이 노트를 삭제할 권한이 없습니다.', 403);

  item.annotations = annotations.filter(a => a.id !== annotationId);
  item.updatedAt = new Date().toISOString();
  data.items[index] = item;
  const saved = await saveData(env, data.items);
  return Response.json({ item, updatedAt: saved.updatedAt }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
