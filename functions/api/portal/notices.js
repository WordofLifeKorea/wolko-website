/**
 * 포탈 첫 화면의 주간 공지 보드 — 관리자(admin)·마스터만 쓰고 지운다. 읽기는 /api/portal/dashboard 가 한다.
 *   POST   /api/portal/notices  { title?, body, week: 'this'|'next', pinned? }  → 공지 추가
 *   DELETE /api/portal/notices?id=...                                            → 공지 삭제
 * KV: portal:notices (배열, 최대 60개 — 넘으면 오래된 것부터 정리)
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { MAX_NOTICES, NOTICES_KEY, parseNoticeInput, readNotices } from '../../lib/portalDashboard.js';
import { todayKst } from '../../lib/carDrive.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

async function editor(request, env) {
  const session = await portalSession(request, env);
  if (!session) return { response: fail('포탈 로그인이 필요합니다.', 401) };
  if (session.role !== 'admin' && session.role !== 'master') return { response: fail('공지는 관리자만 올릴 수 있습니다.', 403) };
  return { session };
}

export async function onRequestPost({ env, request }) {
  const { session, response } = await editor(request, env);
  if (response) return response;
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const parsed = parseNoticeInput(body, todayKst());
  if (parsed.error) return fail(parsed.error);
  const list = await readNotices(env);
  const notice = { id: crypto.randomUUID(), ...parsed.value, createdAt: new Date().toISOString(), by: session.name || session.email };
  const next = [notice, ...list].slice(0, MAX_NOTICES);
  await env.CAMP_KV.put(NOTICES_KEY, JSON.stringify(next));
  return Response.json({ ok: true, notice }, { status: 201, headers: H });
}

export async function onRequestDelete({ env, request }) {
  const { response } = await editor(request, env);
  if (response) return response;
  const id = new URL(request.url).searchParams.get('id') || '';
  const list = await readNotices(env);
  if (!list.some(n => n.id === id)) return fail('공지를 찾을 수 없습니다.', 404);
  await env.CAMP_KV.put(NOTICES_KEY, JSON.stringify(list.filter(n => n.id !== id)));
  return Response.json({ ok: true }, { headers: H });
}
