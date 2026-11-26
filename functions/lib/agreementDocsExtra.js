/**
 * 서약 문서 2 · 3 의 초안 — 아동보호 서약서 · 캠프 필수 규칙.
 * draft: true 인 동안은 공개 페이지에 나오지 않고 서버도 서명을 받지 않는다. 문구가 확정되면 draft 를 false 로 바꾸고 version 을 정한다.
 * 공개된(draft 아닌) 문서는 스태프 · 크루가 캠프 트레이닝 위크에 작성하는 필수 서약서가 된다(관리자 신청자 목록에 '서약서 n/m' 로 보인다. 수락 조건은 아니다).
 * 현재: 신앙고백서(staffAgreements.js) · 아동보호 서약서 · 필수 규칙 세 문서 모두 공개.
 * 아동보호 서약서는 2026-11-26 부터 원본 문서 'Child Protection Code of Conduct'의 글을 그대로 쓴다(v15). 아래 '정해진 것' 가운데 아동보호 서약서에 관한 내용은 v14 까지의 글(보관본)에 대한 것이다.
 *
 * 정해진 것(디렉터 결정, 2026-11-21):
 *  - 범죄경력 확인에 필요한 서류는 월코가 요구하면 지체 없이 제공한다. 제출한 서류는 캠프 기간 동안만 보관하고 캠프가 끝나면 폐기한다(2026-11-21).
 *  - 아동보호 담당자: 캠프팀 디렉터 Jason Anderson · 부담당자: 코디네이터 Aiden Park.
 *  - 크루(미성년자)의 보호자 동의는 지원서 단계에서 받는다(이 문서들에서 따로 받지 않는다). 아동보호 담당자의 연락처는 포탈 회원 정보에서 찾는다.
 *  - 경고·제명은 디렉터·코디네이터·풀타임 선교사에게 적용하지 않는다. 즉시 제명에 절도 등 범죄 행위와 허위 서류 제출도 넣는다. 본국 범죄경력 서류는 월코가 필요하다고 한 경우에만.
 *  - 지각은 경미한 실수라 경고에 넣지 않는다(허락 없이 자리를 비우는 것은 규칙 위반으로 둔다).
 *  - 미성년 크루의 역할 범위는 나중에 정한다(그동안은 '어른 지도자의 지도에 따라 활동한다'는 원칙만 둔다).
 *  - 캠퍼와 개인 SNS 를 서로 공유하지 않는다 · 사역에 방해될 내용을 SNS 에 올리지 않는다.
 *  - 경고는 캠프 디렉터와 코디네이터가 준다(2026-11-21). 즉시 제명: 아동보호 서약 위반, 성적 학대·폭력, 잘못된 신학·교리 전파, 술·약물.
 *    미성년 크루는 보호자가 동의하면 혼자 귀가할 수 있다. 나머지 항목은 추천안 그대로.
 *  - 문신과 얼굴 장신구(귀걸이 두 세트 이상, 코걸이, 혀 피어싱 등)는 보이지 않게 한다. 귀걸이 한 쌍(한 세트)은 괜찮다. 모든 스태프와 크루에게 적용(2026-11-21).
 * 아직 정하지 못한 것은 문서 맨 아래 '정해야 할 것'(OPEN_QUESTIONS)에 적어 두었다.
 */
import { CAMP_RULES_V8_SECTIONS, CHILD_PROTECTION_V13_SECTIONS, CHILD_PROTECTION_V14_SECTIONS, CHILD_PROTECTION_V14_TEXT } from './agreementArchive.js';

export const CHILD_PROTECTION = {
  id: 'childprotection',
  version: '2026-11-v15',   // v15(2026-11-26): 글 전체를 원본 문서 'Child Protection Code of Conduct'(한 · 영 병기 PDF)로 바꿨다. 내용이 달라졌으므로 v14 까지의 서명은 '서명 완료'로 세지 않는다(다시 읽고 서명) · v14 까지는 월코가 따로 쓴 19개 항목의 서약서였다(글은 agreementArchive.js 에 보관)
  acceptVersions: [],   // 원본 문서로 글이 통째로 바뀌었다 — 예전 버전 서명을 그대로 인정하지 않는다
  archive: {
    '2026-11-v14': { ...CHILD_PROTECTION_V14_TEXT, sections: CHILD_PROTECTION_V14_SECTIONS },
    '2026-11-v13': { ...CHILD_PROTECTION_V14_TEXT, sections: CHILD_PROTECTION_V13_SECTIONS },   // v13 의 제목 · 안내 · 맺음말은 v14 와 같았다
  },
  perCamp: false,   // 2026-11-21: 캠프 선택 없이 한 번만 작성한다(처음에는 캠프마다였으나 사용자가 '캠프 선택은 필요 없다'고 정했다). true 로 돌리면 서명할 때 캠프를 고르는 방식이 다시 켜진다
  draft: false,
  /* 원본 문서의 글을 그대로 옮겼다. 원본에 없어서 붙인 것은 이것뿐이다: 문서 안내(intro), 첫 묶음의 한국어 제목, 'TALK' 두 묶음의 한국어 제목,
     영어 첫 다섯 항목 앞의 'I will'(원본은 'I WILL' 아래에 소문자로 이어 쓴다), 영어 오타 하나(complements → compliments). */
  ko: {
    title: '아동보호 서약서',
    intro: '월코 캠프에서 스태프나 크루로 섬기는 모든 분은 아래 아동보호 행동 수칙을 읽고 서명합니다.',
    pledge: '저는 WOLKO 행동 수칙을 주의 깊게 읽고 명확하게 이해했습니다.\n본인은 위의 행동 수칙에 설명된 행동 기준을 항상 준수할 것에 동의합니다.',
  },
  en: {
    title: 'Child Protection Code of Conduct',
    intro: 'Everyone who serves at a WOLKO camp as staff or crew reads and signs the Child Protection Code of Conduct below.',
    pledge: 'I have carefully read and clearly understand the WOL Code of Conduct.\nI agree to uphold at all times the standards of behavior described in the Code of Conduct above.',
  },
  // 본인 진술(유죄 판결 · 수사 · 재판 없음) 체크 칸은 공개 페이지에 내놓지 않기로 했다(2026-11-21). 캠프 트레이닝 위크에 서명할 때 서명 칸 아래쪽에 넣는다 — 그때 아래 CHILD_PROTECTION_DECLARATION_LATER 를 이 자리에 `declaration:` 으로 되돌리고 version 을 올린다
  sections: [
    {
      ko: '나의 약속', en: 'I will',
      items: [
        { ko: '나는 어린이(캠퍼들)에게 모범이 되고, WOLKO와 그리스도를 대표하는 사람으로서 좋은 본이 되는 행동을 취할 것입니다.',
          en: 'I will conduct myself in a manner consistent with my position as a positive role model to children and as a representative of WOL and the Lord Jesus Christ.' },
        { ko: '나는 어린이(캠퍼들)가 하나님의 형상을 따라 만들어진 하나의 인격체로서 경청되고, 존중받는 안전하고 긍정적인 환경을 조성할 것입니다.',
          en: 'I will contribute to create and/or uphold a safe, positive and encouraging environment where children are listened to and respected as individuals made in the image of God.' },
        { ko: '나는 모든 어린이(캠퍼들)를 존중하며, 나의 말투와 태도에 대한 어린이(캠퍼들)의 반응을 잘 살필 것입니다.',
          en: 'I will treat all children with respect and take notice of their reactions to my tone of voice and manner.' },
        { ko: '나는 48시간 이내 상태를 보고해야 하는 방침에 따라 모든 우려 사항이나 증거 없는 혐의 사실에 대해 대응할 것입니다.',
          en: 'I will respond to all concerns or allegations according to the Reporting Protocol within 48 hours.' },
        { ko: '나는 이번 캠프에 참여하는 캠퍼들과 스태프(손님)들의 안전을 위해 다음의 행동 수칙을 따를 것입니다.',
          en: 'I will follow the following guidelines in this Code of Conduct to protect the safety of the children and guests who participate in our programs.' },
      ],
    },
    {
      ko: '3가지 T: 허용되는 신체접촉', en: 'Three T’s: Appropriate TOUCH',
      items: [
        { ko: '악수, 하이파이브, 주먹 인사', en: 'handshakes, high-fives, fist bumps' },
        { ko: '손잡고 걷기 (동성끼리)', en: 'walking hand-and-hand (same sex)' },
        { ko: '축하나 인사할 때 가벼운 포옹', en: 'short, congratulatory or greeting hugs' },
        { ko: '사이드허그, 어깨동무', en: 'side hugs, arm around the shoulders' },
        { ko: '업어 주기 (어린이들)', en: 'piggybacks with young children' },
      ],
    },
    {
      ko: '3가지 T: 허용되지 않는 신체접촉', en: 'Three T’s: Not Appropriate TOUCH',
      items: [
        { ko: '이성간 등 문지르기 및 마사지해주기, 간지럽히기, 레슬링', en: 'back rubs, massages, tickling, intimate wrestling' },
        { ko: '성적 포옹, 정면포옹, 키스', en: 'sexual embraces, frontal hugs, kissing' },
        { ko: '다른 사람의 아이를 때리거나 훈육', en: 'hit or discipline someone else’s child' },
        { ko: '분노나 혐오감을 가지고 만지는 행위', en: 'touch a child in anger, disgust, or frustration' },
        { ko: '아이가 혼자 할 수 있는 일을 과하게 돕는 것 (화장실에 가는 것, 목욕, 옷을 갈아 입기)', en: 'assist a child in tasks they can do alone (taking them to the toilet, bathing or changing clothes)' },
        { ko: '무릎에 앉는 것', en: 'lap sitting' },
        { ko: '신체 은밀한 부분을 만지는 것 (절대금지 예외 없음)', en: 'touching of private parts (no exceptions!)' },
      ],
    },
    {
      ko: '3가지 T: 허용되는 말', en: 'Three T’s: Appropriate TALK',
      items: [
        { ko: '성취나 행동에 대한 칭찬', en: 'verbal praise for achievement or behavior' },
        { ko: '격려의 말', en: 'verbal encouragement' },
        { ko: '성경에 기초한 가르침 (남녀의 성적인 내용 제외)', en: 'scripturally based teaching (non-sexual)' },
      ],
    },
    {
      ko: '3가지 T: 허용되지 않는 말', en: 'Three T’s: Not Appropriate TALK',
      items: [
        { ko: '신체발육 (몸)에 관한 칭찬이나 질문', en: 'compliments or questions relating to physical or body development' },
        { ko: '성적인 발언이나 농담', en: 'sexual comments or jokes' },
        { ko: '욕설 또는 저속한 말', en: 'swearing or vulgar language' },
        { ko: '언어적 괴롭힘 또는 언어폭력', en: 'verbal harassment or abuse' },
        { ko: '사적인 비밀이나 특별한 선물 교환하는 일', en: 'individual secrets or special gifts' },
        { ko: '성적 코칭이나 성적인 대화', en: 'sexual coaching or conversation' },
      ],
    },
    {
      ko: '3가지 T: 허용되는 활동', en: 'Three T’s: Appropriate TERRITORY',
      items: [
        { ko: '공공장소에서 1대1 대화', en: 'public one-on-one interaction' },
        { ko: '그룹으로 모이거나 또는 다같이 참여하는 행사', en: 'group or public events' },
      ],
    },
    {
      ko: '3가지 T: 허용되지 않는 활동', en: 'Three T’s: Not Appropriate TERRITORY',
      items: [
        { ko: '캠퍼(어린이)와 함께 침대에 눕기', en: 'lying on a bed with a child' },
        { ko: '사적인 일대일 대화 (교실 창문을 가려서는 안 됩니다.)', en: 'private one-on-one talks (do NOT cover windows)' },
        { ko: '캠퍼들이 옷을 갈아입거나 샤워하는 것을 보는 행위', en: 'watching children get undressed or take showers.' },
        { ko: '캠퍼들 앞에서 나체로 있는 행위 (장난으로도 안됨)', en: 'being naked in front of children, even as a joke.' },
      ],
    },
    {
      ko: '3가지 W', en: 'Three W’s: Who, What & Where',
      items: [
        { ko: '프로그램 현장에서 각자가 누구인지 명확히 밝혀야 합니다.', en: 'WHO each person is must be clearly identified' },
        { ko: '행동 수칙과 일정에 따라 하고 있는 행동과 일이 분명해야 합니다.', en: 'WHAT they are doing must be evident, within the Code of Conduct and their schedule' },
        { ko: '그들이 어디 있는지가 중요합니다(공공장소 또는 비공공 장소)', en: 'WHERE they are is critical (public or non-public areas)' },
      ],
    },
    {
      ko: '3가지 R', en: 'Three R’s: Recognize, Respond & Report',
      items: [
        { ko: '행동수칙에 따라 허용되는 행동과 허용되지 않는 행동을 알아야 합니다.', en: 'RECOGNIZE what is acceptable and what is not (from this Code of Conduct)' },
        { ko: '허용되지 않는 행동을 목격하거나 알고 있다면 대응해야 합니다.', en: 'RESPOND to unacceptable behavior' },
        { ko: '아동학대를 보거나 들은 경우 리더에게 보고 해야 합니다', en: 'REPORT to your authority if you see or hear that a child has been abused.' },
      ],
    },
  ],
};

export const CAMP_RULES = {
  id: 'rules',
  acceptVersions: ['2026-11-v8'],   // 문구만 다듬은 것이라 v8 에 서명한 분은 다시 서명하지 않아도 '서명 완료'
  archive: { '2026-11-v8': { sections: CAMP_RULES_V8_SECTIONS } },
  version: '2026-11-v9',   // v9: 외출 항목에 팀 리더 · '1인 이상' ·    // v8: 잘못된 신학 항목에 '즉,' 추가 · v7: 잘못된 신학 항목을 '고의로 가르치거나 전달' · '좋은 의도의 토론은 해당 안 됨'으로 · v6: 1번은 '반복적으로 어기면 경고 또는 제명' 한 문장만(경고 절차 · 예외 설명은 문서에서 뺐다) · 교제 문구 '어떠한 경우에도' · 스태프·크루 사이 문구에 '준비기간' 추가 · 외출 · 시간 · 숙소 · 문신 · 위생과 복장 · 제명 뒤 첫 항목을 새 문구로 · 보호자 본인 확인 문장 삭제 · 소제목 '경고 없이 바로 제명될 수 있는 경우' · 외출 문구에 '밤에는 외출을 지양' 추가, 휴대폰 항목을 '최대한 지양' + 사역에 필요한 사용은 예외로 · 경찰 보고 문구를 '아동보호 서약과 관련된 문제를 야기할 경우 필요에 따라 보고할 수 있습니다'로 · v5: 항목에서 '저는'을 빼고 '~에 동의합니다' 투로 · 장신구 문구 교체 · v3: 맨 앞에 '반복적으로 어기면 경고 또는 제명' 문장 · v4: '성인 스태프 귀가' 항목을 뺐고, 경고 절차를 포함해 '경고와 제명' 설명을 1번 하나로 합치고 '중도 하차'를 모두 '제명'으로 통일
  draft: false,   // 2026-11-21 디렉터 결정으로 공개 — 스태프 · 크루가 작성해야 하는 필수 서약서
  ko: {
    title: '월코 캠프 필수 규칙',
    intro: '월코 캠프 기간 동안 스태프와 크루가 반드시 지켜야 할 규칙입니다.',
    pledge: '저는 이 규칙을 처음부터 끝까지 읽었고 이해했으며, 캠프 기간 동안 지키겠습니다. 경고를 2회 받으면 캠프에서 제명되고, 즉시 제명 사유에 해당하면 경고 없이 바로 제명됨을 이해합니다.',
  },
  en: {
    title: 'WOLKO Camp Essential Rules',
    intro: 'These are the rules that every staff member and crew member must keep during a WOLKO camp.',
    pledge: 'I have read these rules from beginning to end, I understand them, and I will keep them during camp. I understand that after receiving two warnings I will be removed from the camp, and that any reason for immediate removal means I will be removed without a warning.',
  },
  sections: [
    {
      ko: '경고와 제명', en: 'Warnings and removal',
      items: [
        { ko: '아래 캠프 규칙을 반복적으로 어기면 경고를 받거나 월코 캠프에서 제명당할 수 있습니다.',
          en: 'If I repeatedly break the camp rules below, I may receive a warning or be removed from WOLKO camps.' },
      ],
    },
    {
      ko: '경고 없이 바로 제명될 수 있는 경우', en: 'Cases that can lead to removal without a warning',
      items: [
        { ko: '아동·청소년에 대한 학대, 성적으로 부적절한 행동, 체벌 등 아동보호 서약서를 어긴 경우.',
          en: 'Breaking the Child Protection Agreement, including abuse of children or young people, sexually inappropriate behavior, or corporal punishment.' },
        { ko: '성적 학대, 성폭력, 성희롱.',
          en: 'Sexual abuse, sexual violence or sexual harassment.' },
        { ko: '다른 사람에게 폭력을 쓰거나 폭행·위협하는 경우.',
          en: 'Using violence against, assaulting or threatening another person.' },
        { ko: '잘못된 신학이나 교리를 전하는 경우. 즉, 월코 신앙고백서에 어긋나는 내용을 캠퍼, 스태프, 크루에게 고의로 가르치거나 전달하는 것을 의미합니다. 좋은 의도로 토론하고 함께 배우는 것은 이 항목에 해당되지 않습니다.',
          en: 'Teaching false theology or doctrine. In other words, this means deliberately teaching or passing on to campers, staff or crew anything that contradicts the WOLKO Statement of Faith. Discussing and learning together with good intentions is not included.' },
        { ko: '술이나 불법 약물을 하는 경우.',
          en: 'Using alcohol or illegal drugs.' },
        { ko: '절도 등 범죄 행위를 한 경우.',
          en: 'Committing a crime such as theft.' },
        { ko: '월코에 허위 서류를 내거나 사실과 다르게 진술한 경우.',
          en: 'Submitting false documents to WOLKO or making false statements.' },
        { ko: '특히 아동보호 서약과 관련된 문제를 야기할 경우 필요에 따라 경찰에 보고할 수 있습니다.',
          en: 'In particular, if I cause a problem related to the Child Protection Agreement, WOLKO may report it to the police as needed.' },
      ],
    },
    {
      ko: '술, 담배, 약물', en: 'Alcohol, tobacco and drugs',
      items: [
        { ko: '캠프 장소에 도착한 때부터 해산 후 귀가할 때까지 술, 담배·전자담배, 불법 약물을 어디서든(캠프장 밖, 쉬는 시간 포함) 하지 않는 것에 동의합니다.',
          en: 'I agree not to use alcohol, tobacco or e-cigarettes, or illegal drugs anywhere (including outside the camp site and during breaks) from the time I arrive at the camp site until I travel home after the camp is dismissed.' },
      ],
    },
    {
      ko: '이성 교제', en: 'Dating and romantic relationships',
      items: [
        { ko: '어떠한 경우에도 캠퍼와 교제하지 않는 것에 동의합니다.',
          en: 'I agree not to date campers under any circumstances.' },
        { ko: '캠프 기간 및 준비기간에 스태프·크루 사이에서도 연인 같은 행동(손잡기, 포옹, 단둘이 있기)을 하지 않는 것에 동의합니다. 부부와 가족은 예외로 합니다.',
          en: 'I agree not to show romantic behavior (holding hands, hugging, being alone together) during camp and the preparation period, even with other staff or crew. Married couples and family members are the exception.' },
      ],
    },
    {
      ko: '휴대폰', en: 'Mobile phones',
      items: [
        { ko: '캠프 기간 동안 휴대폰 사용, SNS, 게임을 최대한 지양하는 것에 동의합니다. 캠프 사역에 필요한 휴대폰 및 전자기기 사용은 예외로 간주합니다.',
          en: 'I agree to avoid using my phone, social media and games as much as possible during camp. Phone and electronic device use needed for the camp ministry is considered an exception.' },
      ],
    },
    {
      ko: '외출', en: 'Going out',
      items: [
        { ko: '캠프 지정장소 밖으로 나갈 때는 캠프 디렉터나 코디네이터 또는 팀 리더와 꼭 소통한 후, 단독행동보다는 동일 성별 1인 이상과 함께 나가고, 이성과 나가야 할 경우에는 제3자를 포함해 3인이 동행하며, 밤에는 외출을 지양하는 것에 동의합니다.',
          en: 'When going outside the designated camp area, I agree to talk with the Camp Director or the Coordinator or Team Leader first, to go out with at least one person of the same gender rather than acting alone, and, if I need to go out with someone of the opposite sex, to have a third person join so that three of us go together, and to avoid going out at night.' },
      ],
    },
    {
      ko: '시간', en: 'Schedule',
      items: [
        { ko: '캠프 일정(기상, 모임, 사역, 팀 미팅, 소등)을 지키려고 노력하는 것에 동의합니다.',
          en: 'I agree to do my best to keep the camp schedule (wake-up, meetings, ministry, team meetings, lights-out).' },
      ],
    },
    {
      ko: '숙소', en: 'Lodging',
      items: [
        { ko: '숙소는 성별로 나뉩니다. 이성의 숙소에 들어가지 않고, 캠퍼는 스태프 방에, 스태프는 캠퍼 숙소에 혼자 들어가지 않으며, 외부인과 가족을 숙소에 들이지 않고, 소등과 정숙 시간을 지키며 숙소를 깨끗하게 사용하는 것에 동의합니다.',
          en: 'Lodging is separated by gender. I agree not to enter lodging of the opposite sex; campers do not enter staff rooms and staff do not enter campers’ lodging alone; I agree not to bring outside visitors or family into lodging, to keep lights-out and quiet hours, and to keep the lodging clean.' },
      ],
    },
    {
      ko: '외모와 복장', en: 'Appearance and dress',
      items: [
        { ko: '문신이 보이지 않게 가리는 것에 동의합니다.',
          en: 'I agree to keep any tattoos covered and not visible.' },
        { ko: '불필요한 과도한 장신구(두 세트 이상의 귀걸이, 코걸이, 혓바닥 피어싱 등)로 인해서 생길 수 있는 문제를 미연에 방지하고자 과도한 액세서리를 착용하지 않는 것에 동의합니다. (귀걸이는 한 쌍(한 세트)까지는 괜찮습니다.)',
          en: 'To prevent problems that can come from unnecessary, excessive jewelry (two or more sets of earrings, nose rings, tongue piercings, etc.), I agree not to wear excessive accessories. (One pair (one set) of earrings is fine.)' },
        { ko: '개인위생을 청결히 유지하고, 단정한 복장을 착용하는 것에 동의합니다.',
          en: 'I agree to keep my personal hygiene clean and to wear modest clothing.' },
      ],
    },
    {
      ko: '사역 태도', en: 'Ministry attitude',
      items: [
        { ko: '맡은 일에 책임을 지고 캠프팀의 지시를 따르며, 험담하거나 분란을 일으키지 않는 것에 동의합니다.',
          en: 'I agree to take responsibility for the work given to me, to follow the camp team’s direction, and not to gossip or cause division.' },
      ],
    },
    {
      ko: 'SNS', en: 'Social media',
      items: [
        { ko: '사역에 방해가 될 만한 내용을 SNS에 올리지 않는 것에 동의합니다.',
          en: 'I agree not to post anything on social media that could get in the way of the ministry.' },
      ],
    },
    {
      ko: '제명된 뒤', en: 'After removal',
      items: [
        { ko: '만에 하나 제명이 결정되면, 월코의 결정을 존중하고, 제명된 일을 SNS에 올리거나 캠퍼에게 험담을 하는 행위를 자제하는 것에 동의합니다.',
          en: 'If, in the unlikely case, I am removed, I agree to respect WOLKO’s decision and to refrain from posting about it on social media or speaking ill of it to campers.' },
        { ko: '미성년 크루는 제명이 결정되면 디렉터가 보호자에게 직접 연락합니다. 보호자가 동의하면 혼자 귀가할 수 있고, 동의하지 않으면 보호자가 오시거나 보호자가 정한 방법으로 귀가합니다.',
          en: 'When a minor crew member is removed, the Director contacts the guardian directly. If the guardian agrees, the crew member may travel home alone; if not, the guardian comes to pick them up or arranges how they travel.' },
      ],
    },
  ],
};

/** 아직 정하지 못한 것 — 확정 전에 디렉터와 정해서 위 문서에 반영한다 */
/** 나중에 아동보호 서약서 서명 칸 아래쪽에 넣을 본인 진술 체크 문구(지금은 문서에 붙어 있지 않다) */
export const CHILD_PROTECTION_DECLARATION_LATER = {
    ko: '저는 아동·청소년에 대한 학대나 성범죄로 유죄 판결을 받았거나 현재 수사·재판을 받고 있지 않습니다. 사실과 다르게 진술하면 제명되며 법적 책임을 질 수 있음을 이해합니다.',
    en: 'I have not been convicted of, and am not currently under investigation or on trial for, any offense involving abuse of or sexual offenses against children. I understand that a false statement will lead to removal and may result in legal responsibility.',
  };

export const OPEN_QUESTIONS = [
  '미성년 크루의 구체적인 역할 범위(차후 결정)',
  '범죄경력 서류를 볼 수 있는 사람(열람자) — 제안: 아동보호 담당자 두 분만(보관은 캠프 기간 동안만, 끝나면 폐기로 정했다)',
  '미성년 크루의 귀가: 보호자 동의를 확인하는 방법과 귀가 후 도착 확인(제안 — 지금은 디렉터가 보호자에게 직접 연락해 확인)',
  '잘못된 신학 · 교리 전파의 판단 방법(지금은 디렉터와 코디네이터가 함께 판단)',
  '디렉터 · 코디네이터 · 풀타임 선교사의 적용 제외 범위 확인(지금은 필수 규칙의 경고·제명만 제외하고, 아동보호 서약서와 법에 따른 조치는 모두에게 적용)',
];
