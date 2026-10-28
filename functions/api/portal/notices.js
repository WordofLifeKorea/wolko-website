/**
 * 포탈 첫 화면의 주간 공지 보드 — 관리자(admin)·마스터, 그리고 공지 담당 계정(NOTICE_POSTER_EMAILS)이 올린다. 지우기는 관리자는 모두, 공지 담당 계정은 자기가 올린 것만. 읽기는 /api/portal/dashboard 가 한다.
 *   POST   /api/portal/notices  { title?, body, week: 'this'|'next', dueDate?, pinned?, campus?: 'all'|'wolko'|'jeju' }  → 공지 추가 (campus 를 안 주면 올리는 사람의 소속)
 *   POST   /api/portal/notices  { action:'edit', id, title?, body, dueDate?, pinned?, campus? }   → 공지 고치기 (관리자는 모두, 공지 담당 계정은 자기 것)
 *   DELETE /api/portal/notices?id=...                                            → 공지 삭제
 * KV: portal:notices (배열, 최대 60개 — 넘으면 오래된 것부터 정리)
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { MAX_NOTICES, NOTICES_KEY, canDeleteNotice, canPostNotices, parseNoticeInput, readNotices } from '../../lib/portalDashboard.js';
import { todayKst } from '../../lib/carDrive.js';
import { translateNotice } from '../../lib/prayerTranslate.js';
import { campusOf } from '../../lib/campus.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });

async function editor(request, env) {
  const session = await portalSession(request, env);
  if (!session) return { response: fail('포탈 로그인이 필요합니다.', 401) };
  if (!canPostNotices(session)) return { response: fail('공지는 관리자와 공지 담당 계정만 올릴 수 있습니다.', 403) };
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
  if (body?.action === 'edit') {        // 고치기 — 지울 수 있는 사람(관리자는 모두, 공지 담당 계정은 자기 것)만. 올린 주(週)는 그대로 두고, 번역은 새로 만든다
    const target = list.find(x => x.id === String(body.id || ''));
    if (!target) return fail('공지를 찾을 수 없습니다.', 404);
    if (!canDeleteNotice(session, target)) return fail('내가 올린 공지만 고칠 수 있습니다.', 403);
    const tr = await translateNotice(env, parsed.value);
    Object.assign(target, { title: parsed.value.title, body: parsed.value.body, dueDate: parsed.value.dueDate, pinned: parsed.value.pinned, ...(parsed.value.campus ? { campus: parsed.value.campus } : {}), editedAt: new Date().toISOString() });
    if (tr) target.tr = tr; else delete target.tr;
    await env.CAMP_KV.put(NOTICES_KEY, JSON.stringify(list));
    const { byEmail: _e, ...shownEdited } = target;
    return Response.json({ ok: true, notice: shownEdited }, { headers: H });
  }
  const tr = await translateNotice(env, parsed.value);          // 한↔영 번역 (키가 없거나 실패하면 원문만 저장 — 나중에 첫 화면을 열 때 다시 시도)
  const notice = { id: crypto.randomUUID(), ...parsed.value, campus: parsed.value.campus || await campusOf(env, session), ...(tr ? { tr } : {}), createdAt: new Date().toISOString(), by: session.name || session.email, byEmail: String(session.email || '').trim().toLowerCase() };
  const next = [notice, ...list].slice(0, MAX_NOTICES);
  await env.CAMP_KV.put(NOTICES_KEY, JSON.stringify(next));
  const { byEmail: _b, ...shown } = notice;
  return Response.json({ ok: true, notice: shown }, { status: 201, headers: H });
}

export async function onRequestDelete({ env, request }) {
  const { session, response } = await editor(request, env);
  if (response) return response;
  const id = new URL(request.url).searchParams.get('id') || '';
  const list = await readNotices(env);
  const target = list.find(n => n.id === id);
  if (!target) return fail('공지를 찾을 수 없습니다.', 404);
  if (!canDeleteNotice(session, target)) return fail('내가 올린 공지만 지울 수 있습니다.', 403);
  await env.CAMP_KV.put(NOTICES_KEY, JSON.stringify(list.filter(n => n.id !== id)));
  return Response.json({ ok: true }, { headers: H });
}
