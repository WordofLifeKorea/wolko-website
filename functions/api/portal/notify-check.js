/**
 * 알림톡 점검 — 마스터 전용.
 *   GET  /api/portal/notify-check                 → 각 알림의 설정 여부(값은 절대 노출하지 않고 있음/없음만)
 *   POST /api/portal/notify-check { flow, phone } → 그 흐름의 알림톡 템플릿으로 시험 메시지 1건을 그 번호로만 보낸다(알림톡 흐름은 알림톡만, 'sms'는 문자만 — 대체 발송 없음)
 * 접수(성공)는 솔라피에 요청이 받아들여졌다는 뜻이다. 폰에 도착했는지는 솔라피 콘솔의 발송 내역에서 확인한다.
 */
import { portalSession } from '../../lib/hubAccounts.js';
import { sendAlimtalk, sendSms } from '../../lib/solapi.js';

const H = { 'Cache-Control': 'no-store' };
const fail = (error, status = 400) => Response.json({ error }, { status, headers: H });
const SAMPLE = { name: '테스트', camp: '알림톡 점검', date: '10/8 목', schedule: '2027년 1월 · 점검용' };

/** 흐름별: 라벨, 템플릿 환경변수, 시험 변수 */
export const FLOWS = {
  sms: { label: '문자 발송(발신번호) 점검 — 알림톡이 실패했을 때 대신 가는 문자', template: 'SOLAPI_SENDER_PHONE', sms: true, variables: () => ({}) },
  admin_notify: { label: '캠프 신청 접수 → 관리자 알림', template: 'KAKAO_TEMPLATE_ADMIN_NOTIFY', variables: () => ({ '#{이름}': SAMPLE.name, '#{캠프명}': SAMPLE.camp, '#{유형}': '개인', '#{연락처}': '010-0000-0000', '#{접수일시}': '점검' }) },
  deposit_individual: { label: '캠프 신청자 · 예약금 안내(개인)', template: 'KAKAO_TEMPLATE_DEPOSIT_INDIVIDUAL', variables: () => ({ '#{이름}': SAMPLE.name, '#{캠프명}': SAMPLE.camp, '#{일정}': SAMPLE.schedule }) },
  deposit_group: { label: '캠프 신청자 · 예약금 안내(단체)', template: 'KAKAO_TEMPLATE_DEPOSIT_GROUP', variables: () => ({ '#{담당자}': SAMPLE.name, '#{캠프명}': SAMPLE.camp, '#{일정}': SAMPLE.schedule, '#{인원}': '점검용', '#{교회명}': '—' }) },
  confirm_individual: { label: '캠프 신청자 · 확정 안내(개인)', template: 'KAKAO_TEMPLATE_INDIVIDUAL', variables: () => ({ '#{이름}': SAMPLE.name, '#{캠프명}': SAMPLE.camp, '#{일정}': SAMPLE.schedule }) },
  confirm_group: { label: '캠프 신청자 · 확정 안내(단체)', template: 'KAKAO_TEMPLATE_GROUP', variables: () => ({ '#{담당자}': SAMPLE.name, '#{캠프명}': SAMPLE.camp, '#{일정}': SAMPLE.schedule, '#{인원}': '점검용', '#{교회명}': '—' }) },
  staff: { label: '스태프 지원 접수', template: 'KAKAO_TEMPLATE_STAFF', variables: () => ({ '#{이름}': SAMPLE.name, '#{캠프명}': SAMPLE.camp }) },
  contact: { label: '문의 접수', template: 'KAKAO_TEMPLATE_CONTACT', variables: () => ({ '#{이름}': SAMPLE.name, '#{문의유형}': '점검' }) },
  kitchen: { label: '키친듀티 리마인더', template: 'KAKAO_TEMPLATE_KITCHEN', variables: () => ({ '#{담당자}': SAMPLE.name, '#{날짜}': SAMPLE.date, '#{업무}': '점심 준비', '#{시간}': '오후 12:30' }) },
  drive_pickup: { label: '차량 · 오전 픽업 알림', template: 'KAKAO_TEMPLATE_DRIVE_PICKUP', variables: () => ({ '#{담당자}': SAMPLE.name, '#{날짜}': SAMPLE.date }) },
  drive_dropoff: { label: '차량 · 오후 드롭오프 알림', template: 'KAKAO_TEMPLATE_DRIVE_DROPOFF', variables: () => ({ '#{담당자}': SAMPLE.name, '#{날짜}': SAMPLE.date }) },
};

async function masterOnly(request, env) {
  const session = await portalSession(request, env);
  if (!session) return { res: fail('포탈 로그인이 필요합니다.', 401) };
  if (session.role !== 'master') return { res: fail('마스터 관리자만 사용할 수 있습니다.', 403) };
  return { session };
}

export async function onRequestGet({ env, request }) {
  const g = await masterOnly(request, env);
  if (g.res) return g.res;
  const common = {
    solapiKey: !!env.SOLAPI_API_KEY, solapiSecret: !!env.SOLAPI_API_SECRET, senderPhone: !!env.SOLAPI_SENDER_PHONE,
    kakaoChannel: !!env.KAKAO_PF_ID, adminNotifyPhone: !!env.ADMIN_NOTIFY_PHONE, schedulerSecret: !!env.KITCHEN_SCHEDULER_SECRET,
  };
  const flows = Object.entries(FLOWS).map(([id, f]) => ({ id, label: f.label, template: f.template, templateSet: !!env[f.template] }));
  return Response.json({ common, flows }, { headers: H });
}

export async function onRequestPost({ env, request }) {
  const g = await masterOnly(request, env);
  if (g.res) return g.res;
  let body;
  try { body = await request.json(); } catch { return fail('잘못된 요청입니다.'); }
  const flow = FLOWS[String(body?.flow || '')];
  if (!flow) return fail('알 수 없는 알림입니다.');
  const phone = String(body?.phone || '').replace(/[^0-9]/g, '');
  if (!/^01[016789][0-9]{7,8}$/.test(phone)) return fail('휴대폰 번호를 정확히 입력해 주세요.');
  if (!env.SOLAPI_API_KEY || !env.SOLAPI_API_SECRET) return fail('솔라피 설정(SOLAPI_API_KEY/SECRET)이 없습니다.', 503);
  if (!flow.sms && !env.KAKAO_PF_ID) return fail('KAKAO_PF_ID(카카오 채널)가 설정되어 있지 않습니다.', 503);
  if (!env[flow.template]) return fail(`${flow.template} 템플릿 코드가 설정되어 있지 않습니다.`, 503);
  // 점검이 반복 발송으로 번지지 않게 하루 30건까지만
  const day = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const key = `notify-check:count:${day}`;
  const used = parseInt(await env.CAMP_KV.get(key), 10) || 0;
  if (used >= 30) return fail('오늘 점검 발송 한도(30건)를 모두 사용했습니다.', 429);
  await env.CAMP_KV.put(key, String(used + 1), { expirationTtl: 60 * 60 * 36 });
  try {
    const result = flow.sms
      ? await sendSms(env, phone, '[WOLKO] 문자 발송 점검입니다. 이 메시지가 보이면 발신번호 설정이 정상입니다.')
      : await sendAlimtalk(env, phone, env[flow.template], flow.variables());
    return Response.json({ ok: true, accepted: true, flow: body.flow, solapiGroupId: result?.groupInfo?._id || null }, { headers: H });
  } catch (error) {
    return Response.json({ ok: false, error: String(error?.message || error).slice(0, 300) }, { status: 502, headers: H });
  }
}
