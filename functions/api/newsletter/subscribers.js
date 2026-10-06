/**
 * 내 구독자 관리 (작성자)
 * GET    /api/newsletter/subscribers[?slug=]            → { counts, subscribers: [...] }
 * POST   /api/newsletter/subscribers[?slug=]  { text, consent: true }   이메일 붙여넣기/CSV 가져오기 (바로 수신 대상)
 * DELETE /api/newsletter/subscribers?email=[&slug=]      삭제
 * 직접 올린 주소는 작성자가 수신 동의를 받은 사람이라는 확인(consent)이 있어야 하고, 이미 수신거부한 사람은 다시 넣지 않는다.
 */
import { portalSession, normalizeEmail } from '../../lib/hubAccounts.js';
import { SUB_PREFIX, subKey, authorFor, isEmail, clip, err, ok } from '../../lib/newsletter.js';

const MAX_IMPORT = 500;

async function allSubs(env, slug) {
  const list = await env.CAMP_KV.list({ prefix: `${SUB_PREFIX}${slug}:` });
  const out = [];
  for (const k of list.keys) { const s = await env.CAMP_KV.get(k.name, 'json'); if (s) out.push(s); }
  return out.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}
const counts = subs => ({ active: subs.filter(s => s.status === 'active').length, pending: subs.filter(s => s.status === 'pending').length, unsub: subs.filter(s => s.status === 'unsub').length });

async function who(env, request) {
  const s = await portalSession(request, env);
  if (!s) return { res: err('포탈 로그인이 필요합니다.', 401) };
  const a = await authorFor(env, s, new URL(request.url).searchParams.get('slug'));
  if (!a) return { res: err('본인 소개 페이지와 연결되어 있지 않아요.', 403) };
  return { s, a };
}

export async function onRequestGet({ env, request }) {
  const w = await who(env, request); if (w.res) return w.res;
  const subs = await allSubs(env, w.a.slug);
  return ok({ counts: counts(subs), subscribers: subs.map(s => ({ email: s.email, name: s.name || '', status: s.status, source: s.source, createdAt: s.createdAt })) });
}

export async function onRequestPost({ env, request }) {
  const w = await who(env, request); if (w.res) return w.res;
  let b; try { b = await request.json(); } catch { return err('잘못된 요청입니다.'); }
  if (b?.consent !== true) return err('수신 동의를 받은 분들이라는 확인에 체크해 주세요.');
  // "이름 <a@b.com>", "a@b.com, 이름", 줄바꿈/쉼표/세미콜론으로 구분된 목록을 모두 받는다
  const rows = String(b?.text || '').split(/[\n;]+/).map(r => r.trim()).filter(Boolean);
  let added = 0, skipped = 0, invalid = 0;
  const seen = new Set();
  for (const row of rows.slice(0, MAX_IMPORT * 2)) {
    const m = row.match(/[^\s,<>;"']+@[^\s,<>;"']+\.[^\s,<>;"']{2,}/);
    const email = m ? normalizeEmail(m[0]) : '';
    if (!email || !isEmail(email)) { invalid++; continue; }
    if (seen.has(email)) continue; seen.add(email);
    if (seen.size > MAX_IMPORT) break;
    const prev = await env.CAMP_KV.get(subKey(w.a.slug, email), 'json');
    if (prev && (prev.status === 'active' || prev.status === 'unsub')) { skipped++; continue; }
    const name = clip(row.replace(m[0], '').replace(/[<>,"';]/g, ' '), 60);
    await env.CAMP_KV.put(subKey(w.a.slug, email), JSON.stringify({ email, name, status: 'active', source: 'import', addedBy: w.s.email, createdAt: new Date().toISOString() }));
    added++;
  }
  return ok({ added, skipped, invalid });
}

export async function onRequestDelete({ env, request }) {
  const w = await who(env, request); if (w.res) return w.res;
  const email = normalizeEmail(new URL(request.url).searchParams.get('email'));
  if (!email) return err('이메일이 필요합니다.');
  await env.CAMP_KV.delete(subKey(w.a.slug, email));
  return ok();
}
