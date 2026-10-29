/**
 * 경비 리포트 고정 지출(자동결제 · 구독 · 연회비) — 로그인한 계정에 귀속된다. (규칙: functions/lib/expenseRecurring.js)
 *   GET    /api/expense/recurring            → { templates:[…, nextDue], pending:[리포트 줄 모양…], today }
 *   POST   /api/expense/recurring            body: { id?, item, source, account, currency, amount, frequency, day, month?, startMonth, … }  (id 가 있으면 수정)
 *   PATCH  /api/expense/recurring            body: { id, active }   일시 중지 / 다시 켜기
 *   DELETE /api/expense/recurring?id=…       삭제(이미 리포트에 담긴 줄은 그대로 남는다)
 * pending 은 아직 어떤 리포트에도 담기지 않은 회차 — 새 리포트를 열 때 화면이 이 줄들을 자동으로 채운다(지난 회차는 이월되어 함께 들어온다).
 */
import { err, clip, expenseSession, listReports } from '../../lib/expenses.js';
import { recurringKey, cleanTemplate, pendingRows, reportedKeysOf, nextDue, kstToday, MAX_TEMPLATES } from '../../lib/expenseRecurring.js';

const H = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' };
const load = async (env, email) => (await env.CAMP_KV.get(recurringKey(email), 'json')) || [];
const save = (env, email, list) => env.CAMP_KV.put(recurringKey(email), JSON.stringify(list));

export async function onRequestGet({ env, request }) {
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);
  const templates = await load(env, session.email);
  const today = kstToday();
  const pending = templates.some(t => t.active) ? pendingRows(templates, reportedKeysOf(await listReports(env), session.email), today) : [];
  return Response.json({ templates: templates.map(t => ({ ...t, nextDue: nextDue(t, today) })), pending, today }, { headers: H });
}

export async function onRequestPost({ env, request }) {
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);
  let body;
  try { body = await request.json(); } catch { return err('잘못된 요청입니다.'); }
  const cleaned = cleanTemplate(body);
  if (cleaned.error) return err(cleaned.error);
  const list = await load(env, session.email);
  const id = clip(body?.id, 64);
  const existing = id ? list.find(t => t.id === id) : null;
  if (id && !existing) return err('고정 지출을 찾을 수 없습니다.', 404);
  if (!existing && list.length >= MAX_TEMPLATES) return err(`고정 지출은 최대 ${MAX_TEMPLATES}개까지 등록할 수 있어요.`);
  const now = new Date().toISOString();
  const template = existing
    ? { ...existing, ...cleaned.template, id: existing.id, updatedAt: now }
    : { ...cleaned.template, id: `rec-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`, createdAt: now, updatedAt: now };
  await save(env, session.email, existing ? list.map(t => (t.id === template.id ? template : t)) : [...list, template]);
  return Response.json({ ok: true, template: { ...template, nextDue: nextDue(template) } }, { headers: H });
}

export async function onRequestPatch({ env, request }) {
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);
  let body;
  try { body = await request.json(); } catch { return err('잘못된 요청입니다.'); }
  const list = await load(env, session.email);
  const target = list.find(t => t.id === clip(body?.id, 64));
  if (!target) return err('고정 지출을 찾을 수 없습니다.', 404);
  target.active = body?.active !== false;
  target.updatedAt = new Date().toISOString();
  await save(env, session.email, list);
  return Response.json({ ok: true, template: { ...target, nextDue: nextDue(target) } }, { headers: H });
}

export async function onRequestDelete({ env, request }) {
  const session = await expenseSession(request, env);
  if (!session) return err('포탈 로그인이 필요합니다.', 401);
  const id = clip(new URL(request.url).searchParams.get('id'), 64);
  const list = await load(env, session.email);
  if (!list.some(t => t.id === id)) return err('고정 지출을 찾을 수 없습니다.', 404);
  await save(env, session.email, list.filter(t => t.id !== id));
  return Response.json({ ok: true }, { headers: H });
}

export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' } });
}
