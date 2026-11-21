/**
 * POST /api/agreements/sign  공개 — 캠프 스태프 · 크루 서약 문서에 서명한다.
 *   body { doc: 'faith', version, role: 'staff'|'crew', name, email, phone?, agree: true, consent: true, signature: 'data:image/png;base64,…', lang, website(함정 칸) }
 *   → { ok, code: 'AG-XXXXXX', signedAt, doc, version }
 * 서명 시각은 서버 시각이 기준이다. 문서의 버전과 글 해시를 같이 남겨서, 나중에 문구가 바뀌어도 '무엇에 서명했는지'가 남는다.
 */
import { DOCS, docHash, ROLES, AGREEMENT_PREFIX, newAgreementCode, checkSignature } from '../../lib/staffAgreements.js';
import { clean, ipHash, rateLimited, kstMonthKey } from '../../lib/materials.js';
import { loadSchedules, CAMP_ID_RE } from '../../lib/gospelCamps.js';

const HEADERS = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' };
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;
const fail = (error, errorEn, status, extra = {}) => Response.json({ error, errorEn, ...extra }, { status, headers: HEADERS });

export async function onRequestPost({ env, request }) { 
  if (!env.CAMP_KV) return fail('서버 설정이 필요합니다.', 'Server is not configured.', 500);
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.', 'Invalid request.', 400); }
  if (clean(body?.website, 40)) return fail('요청을 처리할 수 없습니다.', 'We could not process this request.', 400, { field: 'website' });

  const doc = DOCS[String(body?.doc || '')];
  if (!doc || doc.draft) return fail('알 수 없는 문서입니다.', 'Unknown document.', 400, { field: 'doc' });   // 초안은 서명을 받지 않는다
  if (body?.version !== doc.version) return fail('문서가 새로 바뀌었어요. 페이지를 새로고침한 뒤 다시 읽고 서명해 주세요.', 'This document has been updated. Please refresh the page, read it again and sign.', 409, { field: 'version' });
  const role = ROLES.includes(body?.role) ? body.role : '';
  if (!role) return fail('스태프인지 크루인지 골라 주세요.', 'Please choose staff or crew.', 400, { field: 'role' });
  const name = clean(body?.name, 60);
  if (name.length < 2) return fail('이름을 적어 주세요(2글자 이상).', 'Please enter your name (at least 2 characters).', 400, { field: 'name' });
  const email = clean(body?.email, 100).toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return fail('이메일 주소를 정확히 적어 주세요.', 'Please enter a valid email address.', 400, { field: 'email' });
  const phone = clean(body?.phone, 30);
  if (phone && !/^[+0-9()\-\s.]{6,30}$/.test(phone)) return fail('휴대폰 번호 모양이 맞지 않아요.', 'That phone number does not look right.', 400, { field: 'phone' });
  if (body?.agree !== true) return fail('문서를 읽고 동의해 주세요.', 'Please confirm that you have read and agree to the document.', 400, { field: 'agree' });
  if (doc.declaration && body?.declared !== true) return fail('본인 진술을 확인해 주세요.', 'Please confirm your statement.', 400, { field: 'declared' });
  if (body?.consent !== true) return fail('서명과 개인정보 수집에 동의해 주세요.', 'Please agree to the collection of your signature and personal information.', 400, { field: 'consent' });
  if (!checkSignature(body?.signature)) return fail('서명을 그려 주세요.', 'Please draw your signature.', 400, { field: 'signature' });

  // 캠프마다 쓰는 문서(아동보호 서약서)는 어느 캠프인지 고르게 한다 — 캠프 일정에 있는 캠프만 받는다(일정을 못 읽으면 모양만 본다)
  let campId = '', campName = '';
  if (doc.perCamp) {
    campId = clean(body?.campId, 80);
    if (!campId || !CAMP_ID_RE.test(campId)) return fail('참여하는 캠프를 골라 주세요.', 'Please choose the camp you are taking part in.', 400, { field: 'campId' });
    const camps = await loadSchedules(env, request);
    if (camps.length) {
      const hit = camps.find((c) => c.id === campId);
      if (!hit) return fail('알 수 없는 캠프예요. 목록에서 골라 주세요.', 'Unknown camp. Please choose from the list.', 400, { field: 'campId' });
      campName = clean(hit.titleKo, 80);
    }
  }

  const hash = await ipHash(request, env);
  if (await rateLimited(env, hash, Date.now(), { prefix: 'agree:rl', perHour: 60, perDay: 200 })) return fail('짧은 시간에 너무 많이 시도하셨어요. 잠시 뒤 다시 해 주세요.', 'Too many attempts. Please try again a little later.', 429);

  const now = Date.now();
  const code = newAgreementCode();
  const record = {
    code, doc: doc.id, version: doc.version, textHash: await docHash(doc), role, name, email, phone, ...(doc.declaration ? { declared: true } : {}),
    ...(doc.perCamp ? { campId, campName } : {}),
    lang: body?.lang === 'en' ? 'en' : 'ko', signedAt: new Date(now).toISOString(), signature: body.signature,
  };
  const key = `${AGREEMENT_PREFIX}${doc.id}:${kstMonthKey(now)}:${code}`;
  try {
    await env.CAMP_KV.put(key, JSON.stringify(record), { metadata: { t: now, d: doc.id, v: doc.version, r: role, n: name.slice(0, 40), e: email.slice(0, 100), p: phone.slice(0, 30), ...(campId ? { c: campId } : {}) } });
  } catch {
    return fail('저장하지 못했어요. 잠시 뒤 다시 해 주세요.', 'We could not save your signature. Please try again shortly.', 503);
  }
  return Response.json({ ok: true, code, signedAt: record.signedAt, doc: doc.id, version: doc.version }, { headers: HEADERS });
}
