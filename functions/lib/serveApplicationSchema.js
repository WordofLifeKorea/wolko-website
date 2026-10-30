/**
 * 월코 섬김 지원 신청서 — 항목 정의 (서버 검증과 화면이 같은 정의를 쓴다. 화면은 API 응답의 schema 를 받아 그린다).
 *
 * 기존 Jotform 양식(5개 영역, 영문·한글 병기)과 같은 항목에, 월코 내부용 "인터뷰·추천인 확인·동의" 영역을 더했다.
 * sensitive: true 인 항목은 다른 항목과 분리해서 저장하고(키가 있으면 암호화), 알림·로그·외부 서비스에는 절대 내보내지 않는다.
 * 타입: text | email | tel | date | textarea | select | radio | checkbox
 * requiredUnless: [체크박스 id…] — 그중 하나라도 표시하면 필수가 아니다(예: 복음을 들어 본 적이 없으면 간증 생략)
 * under: '<항목 id>' — 지원서 화면에서 그 선택칸 바로 아래에 붙여 보여 준다
 * hideIf: '<체크박스 id>' — 그 체크박스를 표시하면 이 칸을 숨긴다(예: 교회를 다니지 않으면 교회·담임목사 칸)
 */
const YN = [{ v: 'yes', ko: '예', en: 'Yes' }, { v: 'no', ko: '아니오', en: 'No' }];
const L = (ko, en) => ({ ko, en });
const PREFIX = [{ v: 'Mr.', ko: 'Mr.', en: 'Mr.' }, { v: 'Mrs.', ko: 'Mrs.', en: 'Mrs.' }, { v: 'Ms.', ko: 'Ms.', en: 'Ms.' }, { v: 'Dr.', ko: 'Dr.', en: 'Dr.' }, { v: 'Rev.', ko: 'Rev.', en: 'Rev.' }];
const REF_STATUS = [{ v: 'none', ko: '아직 연락 전', en: 'Not contacted' }, { v: 'contacted', ko: '연락함', en: 'Contacted' }, { v: 'received', ko: '답변 받음', en: 'Reply received' }];

const YEARS_KNOWN = [{ v: 'lt1', ko: '1년 미만', en: 'Under 1 year' }, { v: '1-2', ko: '1–2년', en: '1–2 years' }, { v: '3-5', ko: '3–5년', en: '3–5 years' }, { v: '6-10', ko: '6–10년', en: '6–10 years' }, { v: '10+', ko: '10년 이상', en: 'Over 10 years' }];

const reference = n => [
  { id: `ref${n}Prefix`, type: 'select', label: L('호칭', 'Prefix'), options: PREFIX },
  { id: `ref${n}FirstName`, type: 'text', required: true, label: L('영문 이름(First)', 'First Name'), max: 80 },
  { id: `ref${n}LastName`, type: 'text', required: true, label: L('영문 성(Last)', 'Last Name'), max: 80 },
  { id: `ref${n}NameKo`, type: 'text', required: true, label: L('한글 이름', 'Korean Name'), max: 80 },
  { id: `ref${n}Relationship`, type: 'text', required: true, label: L('지원자와의 관계', 'Relationship to applicant'), max: 120 },
  { id: `ref${n}Email`, type: 'email', required: true, label: L('이메일', 'Email'), max: 200 },
  { id: `ref${n}Phone`, type: 'tel', required: true, label: L('연락처', 'Phone Number'), max: 40 },
  { id: `ref${n}Years`, type: 'radio', required: true, label: L('알고 지낸 기간', 'Years Known'), options: YEARS_KNOWN },
];

export const SERVE_APPLICATION_SECTIONS = [
  {
    id: 'application', title: L('기본 정보', 'Personal Information'),
    fields: [
      { id: 'prefix', type: 'select', label: L('호칭', 'Prefix'), options: PREFIX },
      { id: 'firstName', type: 'text', required: true, label: L('영문 이름(First)', 'First Name'), max: 80 },
      { id: 'lastName', type: 'text', required: true, label: L('영문 성(Last)', 'Last Name'), max: 80 },
      { id: 'nameKo', type: 'text', label: L('한글 이름', 'Korean Name'), max: 80 },
      { id: 'gender', type: 'radio', required: true, label: L('성별', 'Gender'), options: [{ v: 'male', ko: '남', en: 'Male' }, { v: 'female', ko: '여', en: 'Female' }] },
      { id: 'birthDate', type: 'date', required: true, label: L('생년월일', 'Birth Date') },
      { id: 'phone', type: 'tel', required: true, label: L('연락처', 'Phone Number'), max: 40 },
      { id: 'email', type: 'email', required: true, label: L('이메일', 'E-mail Address'), max: 200 },
      { id: 'maritalStatus', type: 'select', required: true, label: L('현재 결혼 상태', 'Current Marital Status'), options: [
        { v: 'single', ko: '미혼', en: 'Single' }, { v: 'married', ko: '기혼', en: 'Married' }, { v: 'divorced', ko: '이혼', en: 'Divorced' },
        { v: 'separated', ko: '별거', en: 'Separated' }, { v: 'widowed', ko: '사별', en: 'Widowed' }] },
      { id: 'hasChildren', type: 'radio', required: true, label: L('자녀가 있습니까?', 'Do you have any children?'), options: YN },
      { id: 'childrenNote', type: 'textarea', required: true, showIf: { field: 'hasChildren', equals: 'yes' }, label: L('자녀 (이름 · 성별 · 나이)', 'Children (name, gender, age)'), max: 1000 },   // 지원서 화면은 한 명씩 줄로 입력, 저장은 '이름 / 성별 / 나이' 줄글
      { id: 'occupation', type: 'text', required: true, label: L('현재 직업', 'Current occupation'), max: 200 },
      { id: 'heardFrom', type: 'select', required: true, label: L('월코를 어떻게 알게 되었습니까?', 'How did you hear about Word of Life Korea?'), options: [
        { v: 'church', ko: '지역 교회', en: 'Local Church' }, { v: 'wolUs', ko: '미국 Word of Life', en: 'Word of Life in the U.S.' }, { v: 'friend', ko: '지인', en: 'Friend' },
        { v: 'camp', ko: '캠프/수련회 (SYME)', en: 'Camp/Retreat (SYME)' }, { v: 'other', ko: '기타', en: 'Other' }] },
      { id: 'heardOther', type: 'text', showIf: { field: 'heardFrom', equals: 'other' }, label: L('기타(직접 입력)', 'Other (please specify)'), max: 200 },
    ],
  },
  {
    id: 'spiritual', title: L('교회와 신앙', 'Church & Faith'),
    intro: L('출석하는 교회와 담임목사님 성함은 선택 사항이지만, 적어 주시면 지원서 심사에 큰 도움이 됩니다.', 'Your church and your pastor’s name are optional, but including them helps us a great deal in reviewing your application.'),
    fields: [
      { id: 'noChurch', type: 'checkbox', label: L('교회를 다니고 있지 않습니다.', 'I do not currently attend a church.') },
      { id: 'church', type: 'text', hideIf: 'noChurch', label: L('출석하는 교회', 'Church you attend'), max: 200 },
      { id: 'pastor', type: 'text', hideIf: 'noChurch', label: L('담임목사님 성함', "Pastor's name"), max: 120 },
      { id: 'testimony', type: 'textarea', required: true, requiredUnless: ['noGospel', 'notSaved'], label: L('간증 (구원받기 전, 구원의 경험, 구원받은 후)', 'Testimony (life before salvation, the salvation experience, and life after)'), max: 6000 },
      { id: 'noGospel', type: 'checkbox', label: L('아직 복음을 들어 본 적이 없습니다.', 'I have not yet heard the gospel.') },   // 둘 중 하나를 표시하면 간증·영적 생활 습관·섬김 경험은 비워도 된다(교회를 다니지 않으면 섬김 경험도)
      { id: 'notSaved', type: 'checkbox', label: L('예수님을 구주로 영접하지 않았습니다.', 'I have not accepted Jesus as my Savior.') },
      { id: 'spiritualHabits', type: 'textarea', required: true, requiredUnless: ['noGospel', 'notSaved'], label: L('개인의 영적 생활 습관 (성경 공부, 경건의 시간, 기도, 전도 등)', 'Personal spiritual life habits (Bible study, quiet time, prayer, witnessing)'), max: 4000 },
      { id: 'serviceHistory', type: 'textarea', required: true, requiredUnless: ['noGospel', 'notSaved', 'noChurch'], label: L('교회·지역사회에서의 과거와 현재의 섬김', 'Past and current service in church or community'), max: 4000 },
    ],
  },
  {
    id: 'skills', title: L('학력과 은사', 'Education & Gifts'),
    fields: [
      { id: 'eduLevel', type: 'select', required: true, label: L('최종 학력', 'Highest education'), options: [
        { v: 'middle', ko: '중학교 졸업', en: 'Middle school' }, { v: 'hsStudent', ko: '고등학교 재학', en: 'High school (current)' }, { v: 'hs', ko: '고등학교 졸업', en: 'High school diploma' },
        { v: 'college', ko: '대학교 재학·휴학', en: 'University (current or on leave)' }, { v: 'bachelor', ko: '대학교 졸업 (학사)', en: "Bachelor's degree" }, { v: 'bible', ko: '성경학교 수료', en: 'Bible school' },
        { v: 'grad', ko: '대학원 재학', en: 'Graduate school (current)' }, { v: 'master', ko: '석사', en: "Master's degree" }, { v: 'doctor', ko: '박사', en: 'Doctorate' }, { v: 'other', ko: '기타', en: 'Other' }] },
      { id: 'education', type: 'text', under: 'eduLevel', label: L('학교명·전공 (성경학교, 학위·수료증 포함)', 'School and major (including Bible school, degrees or diplomas)'), max: 4000 },   // 예전 신청서의 줄글 학력도 여기 그대로 남는다
      { id: 'gifts', type: 'textarea', required: true, label: L('강점과 영적 은사', 'Strengths and spiritual gifts'), max: 4000 },
      { id: 'servingWays', type: 'textarea', required: true, label: L('즐겁게 섬기고 돕는 방식', 'Ways you enjoy serving and helping'), max: 4000 },
    ],
  },
  {
    id: 'health', title: L('건강', 'Health'),
    intro: L('선택 사항입니다. 함께 사역할 때 월코가 미리 알고 있으면 배려하거나 준비할 수 있는 내용이 있다면 적어 주세요(캠프 활동, 응급 상황 대비 등). 적지 않아도 지원에는 아무 영향이 없습니다.',
      'Optional. If there is anything we should know so we can care for you and be prepared when we serve together (camp activities, emergencies and so on), please tell us. Leaving this blank does not affect your application.'),
    fields: [
      { id: 'health', type: 'textarea', sensitive: true, label: L('함께 사역할 때 알고 있으면 좋을 건강상의 사항 (질환, 복용 중인 약, 의료적 필요 등)', 'Health matters that would help us serve well together (conditions, medication, medical needs)'), max: 3000 },
      { id: 'allergies', type: 'textarea', sensitive: true, label: L('알레르기 (음식, 약, 기타)', 'Allergies (food, medicine, other)'), max: 2000 },
    ],
  },
  { id: 'reference1', title: L('추천인 1 (목회자 또는 교회 지도자)', 'Reference 1 (pastor or church leader)'), fields: reference(1) },
  { id: 'reference2', title: L('추천인 2 (동역자 또는 친구)', 'Reference 2 (co-worker or friend)'), fields: reference(2) },
  {
    id: 'background', title: L('추가 질문', 'Additional Questions'),
    intro: L('청소년을 섬기는 사역이어서 모든 지원자에게 같은 질문을 드립니다. 답변은 검토 담당자만 열람합니다.', 'Because our staff serve young people, we ask every applicant these questions. Only our reviewers see your answers.'),
    fields: [
      { id: 'divorced', type: 'radio', required: true, sensitive: true, label: L('이혼 경험이 있습니까?', 'Have you ever been divorced?'), options: YN },
      { id: 'divorcedNote', type: 'textarea', sensitive: true, showIf: { field: 'divorced', equals: 'yes' }, label: L('있다면 설명해 주세요', 'If so, please explain'), max: 2000 },
      { id: 'criminal', type: 'radio', required: true, sensitive: true, label: L('형사 처벌을 받았거나 기소 중인 사건이 있습니까?', 'Have you ever been convicted of a crime or have pending charges?'), options: YN },
      { id: 'criminalNote', type: 'textarea', sensitive: true, showIf: { field: 'criminal', equals: 'yes' }, label: L('있다면 설명해 주세요', 'If so, please explain'), max: 2000 },
      { id: 'abuse', type: 'radio', required: true, sensitive: true, label: L('신체적·성적 학대로 유죄 판결을 받았거나 의혹을 받은 적이 있습니까?', 'Have you ever been guilty of, or accused of, physical or sexual abuse?'), options: YN },
      { id: 'abuseNote', type: 'textarea', sensitive: true, showIf: { field: 'abuse', equals: 'yes' }, label: L('있다면 설명해 주세요', 'If so, please explain'), max: 2000 },
    ],
  },
  {
    id: 'internal', title: L('인터뷰·추천인 확인·동의 (내부용)', 'Interview, references & consent (internal)'),
    fields: [
      { id: 'interviewDate', type: 'date', label: L('인터뷰 날짜', 'Interview date') },
      { id: 'interviewNotes', type: 'textarea', label: L('인터뷰 메모', 'Interview notes'), max: 6000 },
      { id: 'ref1Status', type: 'select', label: L('추천인 1 확인', 'Reference 1 check'), options: REF_STATUS },
      { id: 'ref1Note', type: 'textarea', label: L('추천인 1 메모', 'Reference 1 note'), max: 2000 },
      { id: 'ref2Status', type: 'select', label: L('추천인 2 확인', 'Reference 2 check'), options: REF_STATUS },
      { id: 'ref2Note', type: 'textarea', label: L('추천인 2 메모', 'Reference 2 note'), max: 2000 },
      { id: 'consent', type: 'checkbox', required: true, label: L('지원자에게 개인정보 및 민감정보(이혼·형사·학대 관련·건강) 수집·이용에 대한 동의를 받았음을 확인합니다.', 'I confirm the applicant has consented to the collection and use of personal and sensitive information (divorce, criminal, abuse-related, health).') },
    ],
  },
];

export const SERVE_APPLICATION_FIELDS = SERVE_APPLICATION_SECTIONS.flatMap(s => s.fields.map(f => ({ ...f, section: s.id })));
export const SENSITIVE_FIELD_IDS = new Set(SERVE_APPLICATION_FIELDS.filter(f => f.sensitive).map(f => f.id));
export const APPLICATION_STATUSES = ['draft', 'submitted', 'approved', 'hold', 'rejected'];

/** 지원자가 직접 쓰는 비공개 지원서(/apply/…)에 보여 주는 영역 — 내부용(인터뷰·추천인 확인·동의 확인)은 뺀다 */
const APPLICANT_HIDDEN = new Set(['prefix', 'ref1Prefix', 'ref2Prefix']);   // 호칭은 온라인 지원서에서 묻지 않는다(포탈 입력에는 남김)
export const APPLICANT_SECTIONS = SERVE_APPLICATION_SECTIONS
  .filter(s => s.id !== 'internal')
  .map(s => ({ ...s, fields: s.fields.filter(f => !APPLICANT_HIDDEN.has(f.id)) }));
