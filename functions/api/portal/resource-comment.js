/**
 * 공유 노트에 붙는 의견 스레드. 포탈에 로그인한 사용자는 누구나 의견을
 * 남길 수 있고, 작성자 본인 또는 admin/master만 삭제할 수 있다.
 */
import {
  sessionFor,
  canWrite,
  text,
  readData,
  saveData,
  error,
  annotationsOf,
  commentsOf,
  MAX_COMMENTS_PER_ANNOTATION,
} from '../../lib/portalResources.js';
import { getAccount } from '../../lib/hubAccounts.js';

const CORS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };

export async function onRequestPost({ env, request }) {
  if (!env.CAMP_KV) return error('서버 설정이 필요합니다.', 500);
  const session = await sessionFor(request, env);
  if (!session) return error('포탈 로그인이 필요합니다.', 401);

  let body;
  try { body = await request.json(); } catch { return error('잘못된 요청입니다.', 400); }
  const id = text(body.id, 80);
  const annotationId = text(body.annotationId, 80);
  const commentText = text(body.text, 500);
  if (!id || !annotationId) return error('잘못된 요청입니다.', 400);
  if (!commentText) return error('의견 내용을 입력해 주세요.', 400);

  const data = await readData(env);
  const itemIndex = data.items.findIndex(item => item.id === id);
  if (itemIndex < 0) return error('작업 항목을 찾을 수 없습니다.', 404);

  const item = { ...data.items[itemIndex] };
  const annotations = annotationsOf(item);
  const annotationIndex = annotations.findIndex(annotation => annotation.id === annotationId);
  if (annotationIndex < 0) return error('노트를 찾을 수 없습니다.', 404);

  const annotation = { ...annotations[annotationIndex] };
  const comments = commentsOf(annotation);
  if (comments.length >= MAX_COMMENTS_PER_ANNOTATION) {
    return error(`노트 하나에는 의견을 최대 ${MAX_COMMENTS_PER_ANNOTATION}개까지 남길 수 있습니다.`, 400);
  }

  const account = await getAccount(env, session.email);
  const now = new Date().toISOString();
  annotation.comments = [...comments, {
    id: crypto.randomUUID(),
    text: commentText,
    createdBy: session.email,
    createdByName: account?.name || session.email,
    createdAt: now,
    updatedAt: now,
  }];
  item.annotations = annotations.map((candidate, index) => index === annotationIndex ? annotation : candidate);
  item.updatedAt = now;
  data.items[itemIndex] = item;
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
  const commentId = text(url.searchParams.get('commentId'), 80);
  if (!id || !annotationId || !commentId) return error('잘못된 요청입니다.', 400);

  const data = await readData(env);
  const itemIndex = data.items.findIndex(item => item.id === id);
  if (itemIndex < 0) return error('작업 항목을 찾을 수 없습니다.', 404);

  const item = { ...data.items[itemIndex] };
  const annotations = annotationsOf(item);
  const annotationIndex = annotations.findIndex(annotation => annotation.id === annotationId);
  if (annotationIndex < 0) return error('노트를 찾을 수 없습니다.', 404);

  const annotation = { ...annotations[annotationIndex] };
  const comments = commentsOf(annotation);
  const existing = comments.find(comment => comment.id === commentId);
  if (!existing) return error('의견을 찾을 수 없습니다.', 404);
  if (existing.createdBy !== session.email && !canWrite(session)) return error('이 의견을 삭제할 권한이 없습니다.', 403);

  annotation.comments = comments.filter(comment => comment.id !== commentId);
  item.annotations = annotations.map((candidate, index) => index === annotationIndex ? annotation : candidate);
  item.updatedAt = new Date().toISOString();
  data.items[itemIndex] = item;
  const saved = await saveData(env, data.items);
  return Response.json({ item, updatedAt: saved.updatedAt }, { headers: CORS });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { ...CORS, 'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
