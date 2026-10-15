import test from 'node:test';
import assert from 'node:assert/strict';
import { noticeVariables, fallbackText, isEarlyBirdRegistration, sendApplicantNotice, formatKoreanDay } from '../functions/lib/applicantNotice.js';
import { APPLICANT_NOTICE_INFO } from '../functions/lib/winterCampPolicy.js';

const info = APPLICANT_NOTICE_INFO['2027-wolko-winter'];
const individualEarly = { campId: '2027-wolko-winter', name: '홍길동', phone: '010-1234-5678', registrationType: 'individual', depositAmount: 50000, campFeeFinal: 500000, scholarshipDiscounts: { early_bird: 1 } };
const groupGeneral = { campId: '2027-wolko-winter', name: '김담당', phone: '010-1234-5678', registrationType: 'group', groupCount: 3, depositAmount: 150000, campFeeFinal: 1650000, scholarshipDiscounts: {} };

test('balance is the final fee (after scholarships) minus the deposit, never negative', () => {
  assert.equal(noticeVariables(individualEarly, 'deposit', info)['#{잔금}'], '450,000원');
  assert.equal(noticeVariables(groupGeneral, 'deposit', info)['#{잔금}'], '1,500,000원');
  assert.equal(noticeVariables({ ...groupGeneral, campFeeFinal: 100000 }, 'deposit', info)['#{잔금}'], '0원');
});

test('early bird registrations get the fixed Nov 17 deadline, others get confirmation day + 7 days', () => {
  assert.equal(isEarlyBirdRegistration(individualEarly), true);
  assert.equal(isEarlyBirdRegistration(groupGeneral), false);
  assert.equal(noticeVariables(individualEarly, 'deposit', info)['#{잔금기한}'], '11월 17일(화)');
  const now = Date.parse('2026-10-20T10:00:00+09:00');
  assert.equal(noticeVariables(groupGeneral, 'deposit', info, now)['#{잔금기한}'], formatKoreanDay(Date.parse('2026-10-27T10:00:00+09:00')));
});

test('each template receives exactly its own variables; group uses the contact name and headcount', () => {
  assert.deepEqual(Object.keys(noticeVariables(groupGeneral, 'receipt', info)), ['#{이름}', '#{캠프명}', '#{신청구분}', '#{일정}', '#{예약금}']);
  assert.deepEqual(Object.keys(noticeVariables(individualEarly, 'receipt', info)), ['#{이름}', '#{캠프명}', '#{신청구분}', '#{일정}', '#{예약금}', '#{잔금기한}']);
  assert.deepEqual(Object.keys(noticeVariables(groupGeneral, 'confirm', info)), ['#{이름}', '#{캠프명}', '#{신청구분}', '#{일정}', '#{장소}']);
  const v = noticeVariables(groupGeneral, 'receipt', info);
  assert.equal(v['#{이름}'], '김담당');
  assert.equal(v['#{신청구분}'], '단체 3명');
  assert.equal(noticeVariables(individualEarly, 'receipt', info)['#{신청구분}'], '개인');
});

test('fallback LMS text has the [월코] prefix, the no-reply note and no unresolved placeholders', () => {
  for (const kind of ['receipt', 'deposit', 'confirm']) {
    for (const reg of [individualEarly, groupGeneral]) {
      const text = fallbackText(kind, isEarlyBirdRegistration(reg), noticeVariables(reg, kind, info));
      assert.ok(text.startsWith('[월코] '), kind);
      assert.ok(text.includes('※ 본 메시지 발신 번호로는 수신이 불가합니다.'), kind);
      assert.ok(text.includes('010-7310-9216'), kind);
      assert.ok(!text.includes('#{'), `${kind}: ${text}`);
    }
  }
});

test('nothing is sent when the new template id is not configured (legacy flow continues)', async () => {
  assert.equal(await sendApplicantNotice({}, individualEarly, 'deposit'), false);
  assert.equal(await sendApplicantNotice({ KAKAO_TEMPLATE_DEPOSIT_GENERAL: 'T' }, individualEarly, 'deposit'), false); // 얼리버드형 ID 가 없다
  assert.equal(await sendApplicantNotice({ KAKAO_TEMPLATE_DEPOSIT_EARLY: 'T' }, { ...individualEarly, campId: '2026-inland-union' }, 'deposit'), false);
});

test('with a template id the notice goes out through Solapi with the variables and the LMS fallback', async () => {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return new Response('{}', { status: 200 }); };
  try {
    const env = { SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', KAKAO_PF_ID: 'pf', SOLAPI_SENDER_PHONE: '01099998888', KAKAO_TEMPLATE_DEPOSIT_EARLY: 'TPL_DEP_EARLY' };
    assert.equal(await sendApplicantNotice(env, individualEarly, 'deposit'), true);
  } finally { globalThis.fetch = realFetch; }
  const { message } = calls[0].body;
  assert.equal(message.to, '01012345678');
  assert.equal(message.kakaoOptions.templateId, 'TPL_DEP_EARLY');
  assert.equal(message.kakaoOptions.variables['#{잔금}'], '450,000원');
  assert.ok(message.text.startsWith('[월코] 홍길동님'));
});
