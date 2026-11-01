import { campSession, json, needLogin, needPerm, badRequest, noDb, canWrite } from '../../lib/campteamAuth.js';
import { audit } from '../../lib/campteamDb.js';
import { AUDIENCE_KO } from '../../lib/campteamSurvey.js';
import { collectRecipients, plan, sendSurvey, kakaoReady, maskName, maskPhone, hashPhone } from '../../lib/campteamSurveySend.js';

/**
 * 설문 보내기 (카카오 알림톡). 캠프 영역 수정 권한이 있는 캠프팀원만. 두 단계로만 움직인다.
 *  POST ?id=설문 { action:'preview', contactIds? }  → 아무것도 보내지 않고 받는 사람 수와 가린 예시(홍*동 · 010-****-1234)만 돌려준다
 *  POST ?id=설문 { action:'send', confirmCount, contactIds? } → confirmCount 가 지금 계산한 「보낼 사람 수」와 정확히 같을 때만 보낸다. 다르면 409(다시 미리보기)
 * 같은 번호에는 같은 설문을 한 번만, 하루 한도(기본 300통) 넘으면 아무에게도 보내지 않는다. 자세한 건 campteamSurveySend.js.
 */
export async function onRequestPost({ env, request }) {
  if (!env.DB) return noDb();
  const s = await campSession(request, env); if (!s) return needLogin();
  if (!s.campRole || !canWrite(s.perms, 'camps')) return needPerm('설문 보내기는 캠프 담당자만 할 수 있어요.');
  let b; try { b = await request.json(); } catch { return badRequest('요청 형식이 올바르지 않습니다.'); }
  const sv = await env.DB.prepare('SELECT id, campId, title, audience, status, publicToken FROM surveys WHERE id = ?1 AND deletedAt IS NULL').bind(new URL(request.url).searchParams.get('id')).first();
  if (!sv) return json({ error: '찾을 수 없습니다.' }, 404);
  const camp = await env.DB.prepare('SELECT id, registrationCampId FROM camps WHERE id = ?1 AND deletedAt IS NULL').bind(sv.campId).first(); if (!camp) return json({ error: '캠프를 찾지 못했어요.' }, 404);
  const action = b.action === 'send' ? 'send' : 'preview', ready = kakaoReady(env), linkOn = !!sv.publicToken && sv.status === 'open';
  const link = linkOn ? `${new URL(request.url).origin}/portal/campteam/survey/?t=${sv.publicToken}` : '';
  const recs = await collectRecipients(env, sv, camp, { contactIds: b.contactIds }), pl = await plan(env, sv, recs);
  const base = { audience: sv.audience, audienceLabel: AUDIENCE_KO[sv.audience] || sv.audience, ready: ready.ok, notReady: ready.ok ? null : ready.message, linkOn, problem: recs.problem || null, notes: recs.notes, counts: pl.stats };
  if (action === 'preview') {
    const sample = pl.toSend.slice(0, 5).map((r) => ({ name: r.real ? maskName(r.name) : r.name, phone: maskPhone(r.phone) }));
    const contacts = recs.candidates ? await Promise.all(recs.candidates.map(async (c) => ({ id: c.id, kind: c.kind, name: c.name, org: c.org, phone: maskPhone(c.phone), already: pl.doneHashes.has(await hashPhone(env, c.phone)) }))) : undefined;
    await audit(env, s.email, 'survey_send_preview', 'survey', sv.id, `${AUDIENCE_KO[sv.audience] || sv.audience}: 보낼 ${pl.stats.willSend} · 이미 ${pl.stats.already}`);
    return json({ ...base, sample, ...(contacts ? { contacts } : {}) });
  }
  // ---- 실제로 보내기: 위에서부터 하나라도 걸리면 아무것도 보내지 않는다 ----
  if (!ready.ok) return json({ error: ready.message, code: ready.code, ...base }, 409);
  if (recs.problem) return json({ error: recs.problem.message, code: recs.problem.code, ...base }, 409);
  if (!linkOn) return json({ error: '설문 링크가 꺼져 있거나 설문이 닫혀 있어요. 「링크 켜기」를 누르고 설문을 연 뒤 보내 주세요.', code: 'link_off', ...base }, 409);
  if (!Number.isInteger(b.confirmCount)) return json({ error: '보내기 전에 받는 사람 수를 확인하는 단계가 필요해요.', code: 'confirm', ...base }, 400);
  if (!pl.stats.willSend) return json({ error: '보낼 사람이 없어요(이미 보냈거나 번호가 없어요).', code: 'nobody', ...base }, 400);
  if (b.confirmCount !== pl.stats.willSend) return json({ error: `받는 사람 수가 달라졌어요(확인한 ${b.confirmCount}명 → 지금 ${pl.stats.willSend}명). 미리보기를 다시 확인해 주세요.`, code: 'changed', ...base }, 409);
  if (pl.stats.willSend > pl.stats.capLeft) return json({ error: `하루 한도(${pl.stats.cap}통)를 넘어서 아무에게도 보내지 않았어요. 오늘 더 보낼 수 있는 수: ${pl.stats.capLeft}통.`, code: 'cap', ...base }, 429);
  const r = await sendSurvey(env, sv, link, pl.toSend, s.email);
  return json({ ok: true, ...r });
}
