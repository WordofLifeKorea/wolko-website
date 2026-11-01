/**
 * 새 캠프 신청서 · 스태프/크루 지원서 (캠프 준비 「신청서」 탭).
 * 포털 안에서만 쓴다 — 여기서 만든 신청서는 camp_forms 에만 있고 홈페이지(camp_schedules·신청 페이지·register.js)와는 연결되어 있지 않다.
 * 세 사람(작성 → 검토 → 최종 승인)이 모두 승인하면 「승인 완료」로 보관된다. 참가비·장학금·정원 같은 계산 규칙은 이 기능에 없다(안내 글로만 쓴다).
 */
export const KINDS = ['camper', 'staff'];
export const CAMP_TYPES = ['english', 'union', 'jeju', 'other'];
export const STATUSES = ['draft', 'review', 'final', 'handed', 'confirmed'];
export const ROLES = ['editor', 'reviewer', 'approver', 'deployer'];
export const BLOCK_TYPES = ['heading', 'paragraph', 'text', 'textarea', 'phone', 'email', 'date', 'select', 'radio', 'checkbox', 'consent'];
const CHOICE = ['select', 'radio', 'checkbox'], INPUT = ['text', 'textarea', 'phone', 'email', 'date', ...CHOICE, 'consent'];
export const isInput = (t) => INPUT.includes(t);
const LIM = { blocks: 80, label: 200, body: 2000, help: 600, opt: 100, opts: 30, card: 300, cardLong: 1500 };

const clip = (v, n) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ').replace(/\r\n?/g, '\n').trim().slice(0, n);
const pair = (o, n) => ({ ko: clip(o && o.ko, n), en: clip(o && o.en, n) });
const rid = () => 'b' + Math.random().toString(36).slice(2, 10);
const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) && !Number.isNaN(Date.parse(s));

/**
 * 캠프 카드 항목 — 월코 홈페이지 CMS(캠프 일정)에 넣는 칸과 같은 목록이다. cms 는 홈페이지가 읽는 파일 안의 이름.
 * 항목을 늘리려면 여기에 한 줄을 더하면 화면·저장·내보내기·시험이 모두 따라온다. pair 는 짝이 되는 영어(또는 한국어) 칸, for 는 어떤 신청서에 보이는지(camper·staff·both).
 */
export const FIELDS = [
  { key: 'titleKo', cms: 'title_ko', type: 'string', group: 'basic', label: '캠프명 (한국어)', pair: 'titleEn', hint: '예: 2027 여름 월코 영어 캠프', req: true, for: 'both' },
  { key: 'titleEn', cms: 'title_en', type: 'string', group: 'basic', label: 'Camp title (English)', pair: 'titleKo', req: true, for: 'both' },
  { key: 'campType', cms: 'camp_type', type: 'select', group: 'basic', label: '캠프 종류', options: [['english', '영어캠프'], ['jeju', '제주캠프'], ['union', '연합캠프']], req: true, for: 'camper' },
  { key: 'dateKo', cms: 'date_ko', type: 'string', group: 'when', label: '날짜 (한국어)', pair: 'dateEn', hint: '예: 2027년 7월 12일(월) – 17일(토) · 5박 6일', req: true, for: 'camper' },
  { key: 'dateEn', cms: 'date_en', type: 'string', group: 'when', label: 'Date (English)', pair: 'dateKo', req: true, for: 'camper' },
  { key: 'targetKo', cms: 'target_ko', type: 'string', group: 'when', label: '대상 (한국어)', pair: 'targetEn', hint: '예: 초6 – 중3', req: true, for: 'camper' },
  { key: 'targetEn', cms: 'target_en', type: 'string', group: 'when', label: 'Target group (English)', pair: 'targetKo', req: true, for: 'camper' },
  { key: 'startDate', cms: 'start_date', type: 'datetime', group: 'when', label: '캠프 시작 일시', hint: '이 시간이 지나면 홈페이지에서 숨겨지고 접수가 마감돼요.', req: true, for: 'both' },
  { key: 'status', cms: 'status', type: 'select', group: 'apply', label: '신청 상태', options: [['upcoming', '준비 중'], ['open', '신청 중'], ['closed', '마감'], ['full', '정원 마감']], req: true, for: 'camper' },
  { key: 'openDate', cms: 'open_date', type: 'datetime', group: 'apply', label: '신청 오픈 일시', hint: '정하면 그 시각에 신청 버튼이 자동으로 열려요(준비 중일 때).', for: 'camper' },
  { key: 'deadlineKo', cms: 'deadline_ko', type: 'text', group: 'apply', label: '신청 오픈 안내 (한국어)', pair: 'deadlineEn', hint: '예: 2027년 5월 20일 오전 11시 신청 오픈 · 선착순', for: 'camper' },
  { key: 'deadlineEn', cms: 'deadline_en', type: 'text', group: 'apply', label: 'Registration opens (English)', pair: 'deadlineKo', for: 'camper' },
  { key: 'useExternalForm', cms: 'use_external_form', type: 'bool', group: 'apply', label: '외부 링크로 신청받기 (네이버 카페 등)', hint: '끄면 홈페이지 자체 신청서를 써요(기본).', for: 'camper' },
  { key: 'registrationUrl', cms: 'registration_url', type: 'string', group: 'apply', label: '신청 링크 URL', hint: '외부 링크로 받을 때만 적어요.', for: 'camper' },
  { key: 'staffRegistrationOpen', cms: 'staff_registration_open', type: 'bool', group: 'apply', label: '스태프 신청 임시 오픈', hint: '켜면 캠프 시작일이 지나도 스태프 지원 카드를 열어 둬요.', for: 'both' },
  { key: 'priceKo', cms: 'price_ko', type: 'string', group: 'money', label: '참가비 (한국어)', pair: 'priceEn', hint: '예: 550,000원', for: 'camper' },
  { key: 'priceEn', cms: 'price_en', type: 'string', group: 'money', label: 'Price (English)', pair: 'priceKo', for: 'camper' },
  { key: 'depositAmount', cms: 'deposit_amount', type: 'number', group: 'money', label: '예약금 (원)', hint: '비우면 캠프 종류별 기본값이 쓰여요.', for: 'camper' },
  { key: 'capacity', cms: 'capacity', type: 'number', group: 'money', label: '정원 (명)', hint: '기본 40', def: 40, req: true, for: 'camper' },
  { key: 'contactPhone', cms: 'contact_phone', type: 'string', group: 'info', label: '문의 전화', hint: '비우면 기본 번호가 보여요.', for: 'camper' },
  { key: 'contactEmail', cms: 'contact_email', type: 'string', group: 'info', label: '문의 이메일', hint: '비우면 기본 주소가 보여요.', for: 'camper' },
  { key: 'notesKo', cms: 'notes_ko', type: 'text', group: 'info', label: '안내 사항 (한국어)', pair: 'notesEn', for: 'camper' },
  { key: 'notesEn', cms: 'notes_en', type: 'text', group: 'info', label: 'Notes (English)', pair: 'notesKo', for: 'camper' },
  { key: 'order', cms: 'order', type: 'number', group: 'info', label: '표시 순서', hint: '숫자가 낮을수록 먼저 보여요(기본 99).', def: 99, for: 'camper' },
  { key: 'capacityMale', cms: 'capacity_male', type: 'number', group: 'adv', label: '남학생 정원', hint: '남녀를 따로 받을 때만. (이런 규칙은 코드 요청도 필요할 수 있어요)', for: 'camper' },
  { key: 'capacityFemale', cms: 'capacity_female', type: 'number', group: 'adv', label: '여학생 정원', for: 'camper' },
  { key: 'staffTrainingKo', cms: 'staff_training_ko', type: 'string', group: 'adv', label: '스태프 교육 일정 (한국어)', pair: 'staffTrainingEn', hint: '예: 2027년 1월 4일(월) – 8일(금)', for: 'both' },
  { key: 'staffTrainingEn', cms: 'staff_training_en', type: 'string', group: 'adv', label: 'Staff training (English)', pair: 'staffTrainingKo', for: 'both' },
  { key: 'staffCommitmentRequired', cms: 'staff_commitment_required', type: 'bool', group: 'adv', label: '스태프 전 일정 참여 필수', for: 'both' },
  { key: 'staffApplicationHidden', cms: 'staff_application_hidden', type: 'bool', group: 'adv', label: '스태프 지원 목록에서 숨기기', for: 'both' },
  { key: 'publicCardHidden', cms: 'public_card_hidden', type: 'bool', group: 'adv', label: '공개 캠프 카드에서 숨기기', hint: '스태프 지원 목록에는 남아요.', for: 'camper' },
  { key: 'showWhenClosed', cms: 'show_when_closed', type: 'bool', group: 'adv', label: '마감 뒤에도 카드 계속 보이기', for: 'camper' },
];
export const GROUPS = { basic: '캠프 이름·종류', when: '일정·대상', apply: '신청 방법', money: '금액·인원', info: '안내·문의', adv: '고급' };
const FIELD = Object.fromEntries(FIELDS.map((f) => [f.key, f]));
const KST = 9 * 3600000;
/** 홈페이지 파일의 날짜시간(…Z 또는 +09:00) ↔ 화면의 한국 시간 'YYYY-MM-DDTHH:mm'. 파일에는 CMS 가 쓰는 +09:00 모양으로 적는다 */
export function isoToKst(iso) { const t = Date.parse(iso); return Number.isNaN(t) ? '' : new Date(t + KST).toISOString().slice(0, 16); }
export function kstToIso(local) { const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(String(local || '')); return m && !Number.isNaN(Date.parse(`${m[1]}T${m[2]}:00Z`)) ? `${m[1]}T${m[2]}:00+09:00` : ''; }
const normDate = (v) => { const s = String(v || '').trim(); return isDay(s) ? s + 'T00:00' : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + ':00Z')) ? s : ''; };

/** 카드 항목 정리 — 항목마다 종류에 맞게 다듬고, 모르는 값은 버린다 */
export function cleanCard(c = {}) {
  const out = {};
  for (const f of FIELDS) {
    const v = c[f.key];
    if (f.type === 'bool') out[f.key] = v === true || v === 'true';
    else if (f.type === 'number') { const n = v === '' || v === null || v === undefined ? NaN : Number(v); out[f.key] = Number.isFinite(n) && n >= 0 ? (f.key === 'order' ? Math.round(n * 100) / 100 : Math.round(n)) : (f.def !== undefined && (v === undefined) ? f.def : ''); }
    else if (f.type === 'datetime') out[f.key] = normDate(v);
    else if (f.type === 'select') out[f.key] = f.options.some((o) => o[0] === v) ? v : (f.key === 'status' ? 'upcoming' : f.key === 'campType' ? 'english' : '');
    else out[f.key] = clip(v, f.type === 'text' ? LIM.cardLong : f.key === 'registrationUrl' ? 300 : LIM.card);
  }
  if (out.capacity === '') out.capacity = FIELD.capacity.def; if (out.order === '') out.order = FIELD.order.def;
  return out;
}
/** 홈페이지 캠프 파일(JSON) → 카드 항목 */
export function cardFromCms(raw = {}) {
  const c = {};
  for (const f of FIELDS) { const v = raw[f.cms]; c[f.key] = f.type === 'datetime' ? isoToKst(v) : f.type === 'bool' ? v === true || v === 'true' : v ?? (f.def ?? ''); }
  return cleanCard(c);
}
/** 카드 항목 → 홈페이지 캠프 파일(JSON) 모양. 필수 항목은 늘 넣고, 선택 항목은 값이 있을 때만 넣는다(CMS 가 저장하는 모양과 같게) */
export function cardToCms(card) {
  const c = cleanCard(card), out = {};
  for (const f of FIELDS) {
    const v = c[f.key];
    if (f.type === 'bool') { if (v) out[f.cms] = f.key === 'useExternalForm' ? 'true' : true; }
    else if (f.type === 'number') { if (v !== '' || f.req) out[f.cms] = v === '' ? f.def : v; }
    else if (f.type === 'datetime') { const iso = kstToIso(v); if (iso) out[f.cms] = iso; }
    else if (v !== '' || f.req) out[f.cms] = v;
  }
  return out;
}
/** 지난 캠프와 같은 값으로 남아 있는 항목 이름들 (Ella 가 확인해야 하는 목록). 늘 같은 종류·순서·상태는 뺀다 */
const SAME_OK = new Set(['campType', 'order', 'status']);
export function unchangedFields(card, base) {
  if (!base) return [];
  const a = cleanCard(card), b = cleanCard(base), out = [];
  for (const f of FIELDS) {
    if (SAME_OK.has(f.key)) continue; const v = a[f.key];
    if (f.type === 'bool' ? !v : v === '' ) continue;
    if (JSON.stringify(v) === JSON.stringify(b[f.key])) out.push(f.key);
  }
  return out;
}
/** 지난 캠프 파일 이름의 형식에 맞춰 새 파일 이름을 제안한다: 연도는 시작일 기준, 계절 단어(winter/summer…)는 시작 달에 맞춘다 */
export function suggestCampId(card, baseId, taken = []) {
  const year = (/^(\d{4})-/.exec(card.startDate || '') || /(\d{4})/.exec(card.titleKo || '') || [])[1] || String(new Date().getUTCFullYear() + 1);
  const month = +((/^\d{4}-(\d{2})-/.exec(card.startDate || '') || [])[1] || 0);
  const season = !month ? '' : month >= 12 || month <= 2 ? 'winter' : month <= 5 ? 'spring' : month <= 8 ? 'summer' : 'fall';
  let slug = String(baseId || '').replace(/^\d{4}-/, '');
  if (slug) { if (season && /(winter|summer|spring|fall|autumn)/.test(slug)) slug = slug.replace(/winter|summer|spring|fall|autumn/, season); }
  else slug = [{ english: 'english', union: 'unity', jeju: 'jeju', other: 'camp' }[card.campType] || 'camp', season].filter(Boolean).join('-');
  let id = `${year}-${slug}`.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''), n = 2; const base = id;
  while (taken.includes(id)) id = `${base}-${n++}`;
  return id;
}
export const CAMP_ID_RE = /^[a-z0-9][a-z0-9-]{3,60}$/;

/** 양식 칸들을 저장해도 되는 모양으로만 줄인다 (모르는 종류·넘치는 길이는 버린다). base 는 불러온 지난 캠프 카드(바뀌지 않은 항목 확인용) */
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
  const out = { card: cleanCard(r.card), blocks, thanks: pair(r.thanks, 400) };
  if (r.base && typeof r.base === 'object') out.base = cleanCard(r.base);
  return out;
}
/** 검토에 올리기 전에 꼭 맞아야 하는 것 — 부족하면 이유 목록을 돌려준다. ctx: { campId, taken, ack } */
export function checkReady(content, kind, ctx = {}) {
  const p = [], c = content.card;
  const need = (key) => { const f = FIELD[key]; if (f.for !== 'both' && f.for !== kind) return; if (c[key] === '' || c[key] === undefined) p.push(`「${f.label}」 칸을 채워 주세요.`); };
  ['titleKo', 'titleEn'].forEach(need);
  if (kind === 'camper') {
    ['dateKo', 'dateEn', 'targetKo', 'targetEn'].forEach(need);
    if (c.useExternalForm && !/^https:\/\//.test(c.registrationUrl)) p.push('외부 링크로 신청받으려면 「신청 링크 URL」을 https:// 로 시작하게 적어 주세요.');
    if (c.registrationUrl && !/^https:\/\//.test(c.registrationUrl)) p.push('「신청 링크 URL」은 https:// 로 시작해야 해요.');
    if (c.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.contactEmail)) p.push('「문의 이메일」 모양이 올바르지 않아요.');
    if (!(c.capacity >= 1)) p.push('「정원」은 1명 이상이어야 해요.');
    if (c.capacityMale !== '' && c.capacityFemale !== '' && c.capacityMale + c.capacityFemale > c.capacity) p.push('남학생 정원과 여학생 정원의 합이 전체 정원보다 커요.');
    if (c.openDate && c.startDate && c.openDate >= c.startDate) p.push('「신청 오픈 일시」는 캠프 시작 일시보다 앞서야 해요.');
  }
  if (!c.startDate) p.push('「캠프 시작 일시」를 정해 주세요.');
  else if (Date.parse(c.startDate + ':00Z') - KST < Date.now()) p.push('「캠프 시작 일시」가 이미 지났어요. 지난 캠프의 날짜를 그대로 두지 않았는지 확인해 주세요.');
  if (ctx.campId !== undefined) {
    if (!CAMP_ID_RE.test(ctx.campId || '')) p.push('「파일 이름」은 영어 소문자·숫자·하이픈(-)으로 4글자 이상 적어 주세요. 예: 2027-summer-english');
    else if ((ctx.taken || []).includes(ctx.campId) && kind === 'camper') p.push('이미 있는 캠프의 파일 이름이에요. 다른 이름을 써 주세요.');
  }
  const inputs = content.blocks.filter((b) => isInput(b.type));
  if (!inputs.length) p.push('받을 정보 칸을 하나 이상 넣어 주세요.');
  for (const b of content.blocks) {
    if (b.type !== 'consent' && b.type !== 'paragraph' && !b.label.ko && !b.label.en) p.push('이름이 비어 있는 질문 칸이 있어요.');
    if ((b.type === 'consent' || b.type === 'paragraph') && !b.label.ko && !b.label.en) p.push('내용이 비어 있는 안내·동의 칸이 있어요.');
    if (CHOICE.includes(b.type) && (b.options || []).length < 2 && b.type !== 'checkbox') p.push(`「${b.label.ko || b.label.en}」 칸의 선택지를 두 개 이상 넣어 주세요.`);
    if (CHOICE.includes(b.type) && !(b.options || []).length) p.push(`「${b.label.ko || b.label.en}」 칸의 선택지를 넣어 주세요.`);
  }
  if (!content.blocks.some((b) => b.type === 'consent' && b.required)) p.push('개인정보 수집·이용 동의(필수 동의 칸)를 하나 넣어 주세요.');
  const unchanged = unchangedFields(c, content.base);
  return { problems: [...new Set(p)], unchanged, needAck: unchanged.length > 0 && !ctx.ack };
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
  return { card: cleanCard({}), blocks, thanks: L(kind === 'staff' ? '지원해 주셔서 감사합니다. 담당자가 개별 연락드립니다.' : '신청해 주셔서 감사합니다. 안내 문자를 확인해 주세요.', kind === 'staff' ? 'Thank you for applying. We will contact you.' : 'Thank you for applying. Please check for our message.') };
}
/** 새 신청서를 복사해 시작할 때 쓸 내용: 칸 id 는 새로 만든다 */
export function copyContent(content) {
  const c = cleanContent(content); c.blocks = c.blocks.map((b) => ({ ...b, id: rid() })); return c;
}
