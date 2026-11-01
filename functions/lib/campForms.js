/**
 * 새 캠프 신청서 · 스태프/크루 지원서 (캠프 준비 「신청서」 탭).
 * 포털 안에서만 쓴다 — 여기서 만든 신청서는 camp_forms 에만 있고 홈페이지(camp_schedules·신청 페이지·register.js)와는 연결되어 있지 않다.
 * 세 사람(작성 → 검토 → 최종 승인)이 모두 승인하면 「승인 완료」로 보관된다. 참가비·장학금·정원 같은 계산 규칙은 이 기능에 없다(안내 글로만 쓴다).
 */
export const KINDS = ['camper', 'staff'];
export const CAMP_TYPES = ['english', 'union', 'jeju', 'other'];
export const STATUSES = ['draft', 'review', 'final', 'approved'];
export const ROLES = ['editor', 'reviewer', 'approver'];
export const BLOCK_TYPES = ['heading', 'paragraph', 'text', 'textarea', 'phone', 'email', 'date', 'select', 'radio', 'checkbox', 'consent'];
const CHOICE = ['select', 'radio', 'checkbox'], INPUT = ['text', 'textarea', 'phone', 'email', 'date', ...CHOICE, 'consent'];
export const isInput = (t) => INPUT.includes(t);
const LIM = { blocks: 80, label: 200, body: 2000, help: 600, opt: 100, opts: 30, card: 300, cardLong: 1500 };

const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').replace(/\r\n?/g, '\n').trim().slice(0, n);
const pair = (o, n) => ({ ko: clip(o && o.ko, n), en: clip(o && o.en, n) });
const rid = () => 'b' + Math.random().toString(36).slice(2, 10);
const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(Date.parse(s));

/** 카드에 보이는 안내 (홈페이지 캠프 카드와 같은 항목) */
export function cleanCard(c = {}) {
  const t = (k, n = LIM.card) => clip(c[k], n);
  return {
    titleKo: t('titleKo'), titleEn: t('titleEn'), dateKo: t('dateKo'), dateEn: t('dateEn'), targetKo: t('targetKo'), targetEn: t('targetEn'),
    priceKo: t('priceKo'), priceEn: t('priceEn'), deadlineKo: t('deadlineKo', LIM.cardLong), deadlineEn: t('deadlineEn', LIM.cardLong), notesKo: t('notesKo', LIM.cardLong), notesEn: t('notesEn', LIM.cardLong),
    contactPhone: t('contactPhone', 40), contactEmail: t('contactEmail', 120), startDate: isDay(c.startDate) ? c.startDate : '',
  };
}
/** 양식 칸들을 저장해도 되는 모양으로만 줄인다 (모르는 종류·넘치는 길이는 버린다) */
export function cleanContent(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}, blocks = [], seen = new Set();
  for (const b of (Array.isArray(r.blocks) ? r.blocks : []).slice(0, LIM.blocks)) {
    if (!b || !BLOCK_TYPES.includes(b.type)) continue;
    let id = /^[a-z0-9]{3,16}$/.test(String(b.id || '')) ? String(b.id) : rid(); while (seen.has(id)) id = rid(); seen.add(id);
    const o = { id, type: b.type, label: pair(b.label, b.type === 'paragraph' || b.type === 'consent' ? LIM.body : LIM.label), help: pair(b.help, LIM.help) };
    if (isInput(b.type)) o.required = !!b.required;
    if (CHOICE.includes(b.type)) { o.options = (Array.isArray(b.options) ? b.options : []).slice(0, LIM.opts).map((x) => pair(x, LIM.opt)).filter((x) => x.ko || x.en); }
    blocks.push(o);
  }
  return { card: cleanCard(r.card), blocks, thanks: pair(r.thanks, 400) };
}
/** 검토에 올리기 전에 꼭 있어야 하는 것 — 부족하면 이유 목록을 돌려준다 */
export function checkReady(content, kind) {
  const p = [], c = content.card;
  if (!c.titleKo) p.push('카드의 한국어 이름을 적어 주세요.');
  if (!c.dateKo && kind === 'camper') p.push('카드의 일정을 적어 주세요.');
  const inputs = content.blocks.filter((b) => isInput(b.type));
  if (!inputs.length) p.push('받을 정보 칸을 하나 이상 넣어 주세요.');
  for (const b of content.blocks) {
    if (b.type !== 'consent' && b.type !== 'paragraph' && !b.label.ko && !b.label.en) p.push('이름이 비어 있는 칸이 있어요.');
    if ((b.type === 'consent' || b.type === 'paragraph') && !b.label.ko && !b.label.en) p.push('내용이 비어 있는 안내·동의 칸이 있어요.');
    if (CHOICE.includes(b.type) && (b.options || []).length < 2 && b.type !== 'checkbox') p.push(`「${b.label.ko || b.label.en}」 칸의 선택지를 두 개 이상 넣어 주세요.`);
    if (CHOICE.includes(b.type) && !(b.options || []).length) p.push(`「${b.label.ko || b.label.en}」 칸의 선택지를 넣어 주세요.`);
  }
  if (!content.blocks.some((b) => b.type === 'consent' && b.required)) p.push('개인정보 수집·이용 동의(필수 동의 칸)를 하나 넣어 주세요.');
  return [...new Set(p)];
}

/** 자주 쓰는 칸 묶음 — 기존 캠프 신청서·스태프/크루 지원서에서 쓰던 항목들을 옮겨 놓았다 (새 신청서를 만들 때 골라 넣는다) */
const L = (ko, en) => ({ ko, en });
export const SNIPPETS = [
  { key: 'section_applicant', group: 'basic', name: L('제목: 신청자 정보', 'Heading: Applicant'), block: { type: 'heading', label: L('신청자 정보', 'Applicant information') } },
  { key: 'name', group: 'basic', name: L('이름', 'Name'), block: { type: 'text', label: L('이름', 'Name'), required: true } },
  { key: 'gender', group: 'basic', name: L('성별', 'Gender'), block: { type: 'select', label: L('성별', 'Gender'), required: true, options: [L('남', 'Male'), L('여', 'Female')] } },
  { key: 'birth', group: 'basic', name: L('생년월일', 'Date of birth'), block: { type: 'date', label: L('생년월일', 'Date of birth'), required: true } },
  { key: 'phone', group: 'basic', name: L('연락처(전화)', 'Phone'), block: { type: 'phone', label: L('연락 가능한 전화번호', 'Phone number'), required: true } },
  { key: 'email', group: 'basic', name: L('이메일', 'Email'), block: { type: 'email', label: L('이메일 주소', 'Email address'), required: true } },
  { key: 'church', group: 'basic', name: L('교회', 'Church'), block: { type: 'text', label: L('출석 교회', 'Church'), required: false } },
  { key: 'school', group: 'basic', name: L('학교·학년', 'School / grade'), block: { type: 'text', label: L('학교와 학년', 'School and grade'), required: false } },
  { key: 'guardian', group: 'safety', name: L('보호자 이름·연락처', 'Guardian contact'), block: { type: 'text', label: L('보호자 이름 및 연락처', 'Guardian name and phone'), required: true } },
  { key: 'emergency', group: 'safety', name: L('비상 연락처', 'Emergency contact'), block: { type: 'text', label: L('비상 연락처(이름과 전화)', 'Emergency contact (name and phone)'), required: true } },
  { key: 'health', group: 'safety', name: L('알레르기·건강', 'Allergies / health'), block: { type: 'textarea', label: L('알레르기, 건강 상태, 복용약', 'Allergies, health conditions, medication'), help: L('캠프에서 알아야 할 것을 적어 주세요.', 'Tell us what we should know at camp.'), required: false } },
  { key: 'notes', group: 'basic', name: L('문의·전달 사항', 'Notes / questions'), block: { type: 'textarea', label: L('문의하거나 전하고 싶은 말', 'Questions or notes'), required: false } },
  { key: 'referral', group: 'basic', name: L('알게 된 경로', 'How you heard of us'), block: { type: 'select', label: L('월코 캠프를 알게 된 경로', 'How did you hear about us?'), required: false, options: [L('지인', 'Friend'), L('교회', 'Church'), L('학교', 'School'), L('SNS', 'Social media'), L('네이버 카페', 'Naver Cafe'), L('기타', 'Other')] } },
  { key: 'consent_privacy', group: 'consent', name: L('개인정보 수집·이용 동의', 'Privacy consent'), block: { type: 'consent', label: L('개인정보 수집·이용에 동의합니다. 수집한 정보(이름·연락처 등)는 캠프 운영과 안내 목적으로만 쓰고, 캠프가 끝난 뒤 정해진 기간이 지나면 지웁니다.', 'I agree to the collection and use of my personal information. It is used only to run and communicate about the camp, and is deleted after the retention period.'), required: true } },
  { key: 'consent_media', group: 'consent', name: L('사진·영상 공유 동의', 'Photo / video consent'), block: { type: 'radio', label: L('캠프 사진·영상을 월코 홍보에 써도 될까요?', 'May we use camp photos and videos for WOLKO promotion?'), required: true, options: [L('동의', 'Agree'), L('동의 안 함', 'Do not agree')] } },
  { key: 'consent_rules', group: 'consent', name: L('캠프 규칙 동의', 'Camp rules consent'), block: { type: 'consent', label: L('캠프 안내와 규칙을 읽었고 지키겠습니다.', 'I have read the camp information and rules and will follow them.'), required: true } },
  { key: 'section_faith', group: 'staff', name: L('제목: 신앙과 교회', 'Heading: Faith and church'), block: { type: 'heading', label: L('신앙과 교회', 'Faith and church') } },
  { key: 'intro', group: 'staff', name: L('간단한 자기소개', 'Short introduction'), block: { type: 'textarea', label: L('간단한 자기소개', 'Short introduction'), required: true } },
  { key: 'faith', group: 'staff', name: L('신앙 간증', 'Faith story'), block: { type: 'textarea', label: L('언제, 어떻게 예수님을 믿게 되었나요?', 'When and how did you come to believe in Jesus?'), required: true } },
  { key: 'team', group: 'staff', name: L('섬기고 싶은 팀', 'Team to serve'), block: { type: 'checkbox', label: L('섬기고 싶은 팀(여러 개 선택 가능)', 'Teams you would like to serve (choose any)'), required: true, options: [L('프로그램', 'Program'), L('티칭', 'Teaching'), L('상담자', 'Counselor'), L('테크', 'Tech'), L('찬양팀', 'Worship'), L('키친', 'Kitchen'), L('기타', 'Other')] } },
  { key: 'training', group: 'staff', name: L('스태프 훈련 참석', 'Staff training attendance'), block: { type: 'radio', label: L('스태프 훈련에 모두 참석할 수 있나요?', 'Can you attend the whole staff training?'), required: true, options: [L('예', 'Yes'), L('아니오', 'No')] } },
];
const snip = (...keys) => keys.map((k) => ({ ...JSON.parse(JSON.stringify(SNIPPETS.find((s) => s.key === k).block)), id: rid() }));
/** 처음부터 만들 때의 기본 양식 (비슷한 종류의 지난 신청서가 있으면 그것을 복사하므로 여기는 첫 한 번만 쓰인다) */
export function starterContent(kind) {
  const blocks = kind === 'staff'
    ? snip('section_applicant', 'name', 'gender', 'birth', 'phone', 'email', 'church', 'section_faith', 'intro', 'faith', 'team', 'training', 'guardian', 'consent_privacy')
    : snip('section_applicant', 'name', 'phone', 'gender', 'birth', 'email', 'church', 'school', 'emergency', 'health', 'notes', 'consent_media', 'consent_privacy');
  if (kind === 'staff') blocks.find((b) => b.label.ko === '보호자 이름 및 연락처').required = false;
  return { card: cleanCard({ titleKo: '', titleEn: '' }), blocks, thanks: L(kind === 'staff' ? '지원해 주셔서 감사합니다. 담당자가 개별 연락드립니다.' : '신청해 주셔서 감사합니다. 안내 문자를 확인해 주세요.', kind === 'staff' ? 'Thank you for applying. We will contact you.' : 'Thank you for applying. Please check for our message.') };
}
/** 새 신청서를 복사해 시작할 때 쓸 내용: 칸 id 는 새로 만든다 */
export function copyContent(content) {
  const c = cleanContent(content); c.blocks = c.blocks.map((b) => ({ ...b, id: rid() })); return c;
}
