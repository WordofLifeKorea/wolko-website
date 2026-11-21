/**
 * 서약 문서 2 · 3 의 초안 — 아동보호 서약서 · 캠프 필수 규칙.
 * draft: true 인 동안은 공개 페이지에 나오지 않고 서버도 서명을 받지 않는다. 문구가 확정되면 draft 를 false 로 바꾸고 version 을 정한다.
 * 공개된(draft 아닌) 문서는 스태프 · 크루가 캠프 트레이닝 위크에 작성하는 필수 서약서가 된다(관리자 신청자 목록에 '서약서 n/m' 로 보인다. 수락 조건은 아니다).
 * 현재: 신앙고백서(staffAgreements.js) · 아동보호 서약서 · 필수 규칙 세 문서 모두 공개(아동보호 서약서는 2026-11-21 디렉터가 '초안이지만 일단 공개'로 결정 — 아래 OPEN_QUESTIONS 가 남아 있으니 확정되면 문구를 고치고 version 을 올린다).
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

export const CHILD_PROTECTION = {
  id: 'childprotection',
  version: '2026-11-v10',   // v10: '퇴출 · 해임'을 모두 '제명'으로 통일 · v9: 신체 접촉 항목을 '우리 문화에서는 괜찮다 또는 캠퍼가 먼저 원해서라는 이유로 하지 않고 월코의 기준을 따르겠습니다'로 · v8: '캠퍼 배정과 감독 배치' 항목을 '차량 운행을 이유로 1명의 캠퍼와 단독 운행 금지'로 바꾸고 이동 항목의 같은 문구는 뺐다 · v7: 소제목 '단독행위와 제3자 규칙' · v6: 모든 항목을 1인칭('저는')으로 · 2번 문장을 '캠프가 진행되는 국가의 법이나 규정'으로 · 범죄경력 서류 문구(성범죄경력 및 아동학대 범죄전력회신서 · 원본 반환) · v4: '캠프마다 새로 작성' 문장을 뺐다(한 번만 작성) · v5: 맺음말을 '월코 캠프에 참여하는 캠퍼를 지키기 위해'로 고쳤다
  perCamp: false,   // 2026-11-21: 캠프 선택 없이 한 번만 작성한다(처음에는 캠프마다였으나 사용자가 '캠프 선택은 필요 없다'고 정했다). true 로 돌리면 서명할 때 캠프를 고르는 방식이 다시 켜진다
  draft: false,   // 2026-11-21 '초안이지만 일단 공개' — 문구를 바꾸면 version 을 올려 예전 서명과 구분한다
  ko: {
    title: '아동보호 서약서',
    intro: '월코 캠프에서 스태프나 크루로 섬기는 모든 분은 아래 아동보호 기준을 읽고, 설명을 듣고, 지키겠다고 서명합니다.',
    pledge: '저는 이 서약서를 처음부터 끝까지 읽었고, 설명을 듣고 질문할 기회를 가졌으며, 내용을 이해했습니다. 월코 캠프에 참여하는 캠퍼를 지키기 위해 이 기준을 반드시 지키겠습니다. 이를 어기면 월코 캠프에서 제명될 수 있고 법적 책임을 질 수 있음을 이해합니다.',
  },
  en: {
    title: 'Child Protection Agreement',
    intro: 'Everyone who serves at a WOLKO camp as staff or crew reads, is briefed on, and signs to keep the child protection standards below.',
    pledge: 'I have read this agreement from beginning to end, I have been briefed on it and had the chance to ask questions, and I understand it. I will keep these standards to protect the campers who take part in WOLKO camps. I understand that breaking them can lead to removal from WOLKO camps and to legal responsibility.',
  },
  // 본인 진술(유죄 판결 · 수사 · 재판 없음) 체크 칸은 공개 페이지에 내놓지 않기로 했다(2026-11-21). 캠프 트레이닝 위크에 서명할 때 서명 칸 아래쪽에 넣는다 — 그때 아래 CHILD_PROTECTION_DECLARATION_LATER 를 이 자리에 `declaration:` 으로 되돌리고 version 을 올린다
  sections: [
    {
      ko: '우리의 약속', en: 'Our commitment',
      items: [
        { ko: '저는 모든 아동·청소년이 신체적·정서적·성적 해악으로부터 안전할 권리가 있다고 믿습니다. 이 서약서는 월코 캠프의 모든 스태프와 크루가 반드시 지켜야 할 최소 기준임을 이해합니다.',
          en: 'I believe every child and young person has the right to be safe from physical, emotional and sexual harm. I understand that this agreement sets the minimum standard that every WOLKO staff member and crew member must follow.' },
        { ko: '저는 캠프 기간뿐 아니라 캠프 전후에도 이 기준을 지킵니다. 캠프가 진행되는 국가의 법이나 규정이 이 서약서보다 더 엄격하면 더 엄격한 쪽을 따릅니다.',
          en: 'I keep these standards not only during camp but also before and after it. If the law or regulations of the country where the camp takes place are stricter than this agreement, I follow the stricter one.' },
      ],
    },
    {
      ko: '심사와 범죄경력 확인', en: 'Screening and criminal record checks',
      items: [
        { ko: '저는 아동·청소년과 함께하는 역할을 맡기 전에 지원서, 추천인 확인, 면접을 거치는 데 동의합니다. 지원서에 허위로 적거나 빠뜨린 것이 있으면 선발에서 제외되거나 제명될 수 있음을 이해합니다.',
          en: 'Before serving in any role with children, I agree to the application, reference checks and interview. I understand that false or missing information can lead to rejection or removal.' },
        { ko: '월코가 요구하면, 저는 성범죄, 아동학대 범죄경력 확인에 필요한 서류(성범죄경력 및 아동학대 범죄전력회신서, 외국인의 경우 본국 등 해당 나라에서 발급받은 범죄경력 증명서)를 지체 없이 제공하겠습니다. 제출한 서류는 캠프 기간 동안만 보관하고, 캠프가 끝나면 원본 문서를 반환합니다.',
          en: 'Whenever WOLKO asks, I will provide without delay the documents needed to check for sex-crime and child-abuse criminal records (the reply certificate on sex-crime records and child-abuse crime history and, for foreign nationals, a criminal record certificate issued by my home country or the relevant country). The documents I submit are kept only for the duration of the camp, and the original documents are returned when the camp ends.' },
      ],
    },
    {
      ko: '단독행위와 제3자 규칙', en: 'Solo activity and the third-person rule',
      items: [
        { ko: '저는 아동·청소년과 단둘이 사적인 공간에 있지 않습니다. 면담이나 상담도 다른 어른이 볼 수 있는 열린 공간에서 합니다.',
          en: 'I will not be alone with a child in a private space. Any one-to-one conversation takes place in an open area visible to another adult.' },
        { ko: '저는 캠퍼의 숙소, 화장실, 샤워실, 탈의 공간에 혼자 들어가지 않습니다. 확인이 필요할 때는 다른 어른과 함께 입구에서 확인하고, 캠퍼가 사적인 공간을 지킬 수 있게 합니다.',
          en: 'I will not enter campers’ cabins, toilets, showers or changing areas alone. When a check is needed, I do it from the entrance together with another adult, and I let campers keep their privacy.' },
        { ko: '저는 차량 운행을 이유로 1명의 캠퍼와 단독으로 차량 운행을 하지 않겠습니다.',
          en: 'I will not drive alone with a single camper, whatever the reason for the trip.' },
      ],
    },
    {
      ko: '신체 접촉과 훈육', en: 'Physical contact and discipline',
      items: [
        { ko: '저는 "우리 문화에서는 괜찮다" 또는 "캠퍼가 먼저 원해서"라는 이유로 신체 접촉을 하지 않고, 월코의 기준을 따르겠습니다.',
          en: 'I will not have physical contact on the grounds that "it is fine in our culture" or "the camper wanted it first", and I will follow WOLKO’s standard.' },
        { ko: '저는 어떤 경우에도 아동·청소년을 때리거나 밀치거나 조롱하거나 위협하지 않으며, 식사·수면·화장실 이용을 벌로 제한하지 않습니다.',
          en: 'I will never hit, push, ridicule or threaten a child, and I will never withhold food, sleep or toilet access as discipline.' },
      ],
    },
    {
      ko: '소통, SNS, 사진', en: 'Communication, social media and photos',
      items: [
        { ko: '저는 캠퍼와 개인 SNS(카카오톡, 인스타그램 등)를 서로 공유하지 않습니다. 친구 추가, 팔로우, 개인 메시지를 하지 않고, 연락이 필요하면 월코 공식 그룹 채널에서 하거나 다른 어른과 보호자를 함께 참조합니다.',
          en: 'I do not share personal social media (KakaoTalk, Instagram, etc.) with campers. I do not add, follow or privately message them; when contact is needed I use official WOLKO group channels, or copy another adult and a parent.' },
        { ko: '저는 캠프에서 찍은 사진과 영상을 월코가 정한 방법으로만 다룹니다. 캠퍼의 사진, 영상, 이름을 제 개인 SNS에 올리지 않으며, 촬영 동의가 없는 캠퍼는 찍거나 올리지 않습니다.',
          en: 'I handle photos and videos taken at camp only in the way WOLKO sets. I do not post campers’ photos, videos or names on my personal social media, and I do not photograph or post any camper without consent.' },
      ],
    },
    {
      ko: '이동과 안전', en: 'Transport and safety',
      items: [
        { ko: '저는 월코가 승인한 운전자일 때만 캠프 차량을 운전합니다. 모든 이동에서 안전벨트를 확인하고 정원을 지킵니다.',
          en: 'I drive camp vehicles only if I am a driver approved by WOLKO. I check seat belts on every trip and never exceed capacity.' },
      ],
    },
    {
      ko: '크루(미성년자)', en: 'Crew (minors)',
      items: [
        { ko: '저는 크루가 18세 미만이어도 이 서약서가 똑같이 적용됨을 이해합니다. 크루의 구체적인 역할 범위는 월코가 따로 정해 안내하며, 크루는 어른 지도자의 지도에 따라 활동합니다.',
          en: 'I understand that this agreement applies in the same way to crew members under 18. WOLKO will set and explain the specific scope of crew roles separately, and crew members act under the guidance of an adult leader.' },
      ],
    },
    {
      ko: '신고와 대응', en: 'Reporting and response',
      items: [
        { ko: '저는 아동학대가 의심되는 상황을 보거나 들으면 즉시 112와 아동보호 담당자에게 알립니다. 담당자에게 알렸다고 신고가 끝난 것이 아니며, 확신이 없어도 의심만으로 신고합니다.',
          en: 'If I see or hear anything that suggests a child may be harmed, I immediately call 112 and tell the Child Protection Officer. Telling the Officer does not replace reporting, and suspicion is enough.' },
        { ko: '월코의 아동보호 담당자는 캠프팀 디렉터 Jason Anderson, 부담당자는 코디네이터 Aiden Park입니다. 담당자가 의혹과 관련되어 있거나 연락이 닿지 않으면 부담당자에게, 또는 곧바로 112에 알립니다. 담당자의 연락처는 월코 포탈의 회원 정보에서 확인할 수 있고, 캠프 전에 따로 안내하고 캠프 현장에 게시합니다.',
          en: 'WOLKO’s Child Protection Officer is the Camp Team Director, Jason Anderson, and the Deputy Officer is the Coordinator, Aiden Park. If the Officer is involved in the concern or cannot be reached, I tell the Deputy Officer or call 112 directly. Their contact details can be found in their WOLKO Portal member information, and are also given before camp and posted at the camp site.' },
        { ko: '아동이 학대를 말하면 저는 끝까지 듣고, 비밀을 약속하지 않으며, 스스로 조사하지 않고, 들은 내용을 있는 그대로 기록해 즉시 담당자에게 알립니다.',
          en: 'If a child tells me about abuse, I listen to the end, I do not promise secrecy, I do not investigate myself, and I write down exactly what I heard and tell the Officer immediately.' },
        { ko: '선의로 신고하거나 알린 사람에게는 어떤 불이익도 보복도 없습니다. 저는 신고하는 사람을 방해하거나 보복하지 않습니다.',
          en: 'No one who reports in good faith will be penalized or retaliated against, and I will not obstruct or retaliate against anyone who reports.' },
        { ko: '저에 대한 의혹이 제기되면, 저는 조사가 끝날 때까지 아동·청소년과 접촉하는 일에서 물러나고 조사에 협조합니다.',
          en: 'If an allegation is made against me, I step back from all contact with children until the matter is resolved, and I cooperate with the investigation.' },
      ],
    },
    {
      ko: '어겼을 때', en: 'If this agreement is broken',
      items: [
        { ko: '저는 이 서약서를 어기면 즉시 아동·청소년과 접촉하는 일에서 제외될 수 있고, 월코 캠프에서 제명될 수 있으며, 법적 책임을 질 수 있음을 이해합니다.',
          en: 'I understand that if I break this agreement I can be removed at once from any contact with children, removed from WOLKO camps, and held legally responsible.' },
      ],
    },
  ],
};

export const CAMP_RULES = {
  id: 'rules',
  version: '2026-11-v6',   // v6: 1번은 '반복적으로 어기면 경고 또는 제명' 한 문장만(경고 절차 · 예외 설명은 문서에서 뺐다) · 교제 문구 '어떠한 경우에도' · 스태프·크루 사이 문구에 '준비기간' 추가 · 외출 · 시간 · 숙소 · 문신 · 위생과 복장 · 제명 뒤 첫 항목을 새 문구로 · 보호자 본인 확인 문장 삭제 · 소제목 '경고 없이 바로 제명될 수 있는 경우' · 외출 문구에 '밤에는 외출을 지양' 추가, 휴대폰 항목을 '최대한 지양' + 사역에 필요한 사용은 예외로 · 경찰 보고 문구를 '아동보호 서약과 관련된 문제를 야기할 경우 필요에 따라 보고할 수 있습니다'로 · v5: 항목에서 '저는'을 빼고 '~에 동의합니다' 투로 · 장신구 문구 교체 · v3: 맨 앞에 '반복적으로 어기면 경고 또는 제명' 문장 · v4: '성인 스태프 귀가' 항목을 뺐고, 경고 절차를 포함해 '경고와 제명' 설명을 1번 하나로 합치고 '중도 하차'를 모두 '제명'으로 통일
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
        { ko: '잘못된 신학이나 교리를 전파하는 경우. 월코 신앙고백서에 어긋나는 내용을 캠퍼, 스태프, 크루에게 가르치거나 퍼뜨리는 것을 말합니다. 질문하고 함께 배우는 것은 해당되지 않으며, 캠프 디렉터와 코디네이터가 함께 판단합니다.',
          en: 'Spreading false theology or doctrine, meaning teaching or spreading to campers, staff or crew anything that contradicts the WOLKO Statement of Faith. Asking questions and learning together is not included. The Camp Director and the Coordinator decide together.' },
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
        { ko: '캠프 지정장소 밖으로 나갈 때는 캠프 디렉터나 코디네이터와 꼭 소통한 후, 단독행동보다는 동일 성별 1인과 함께 나가고, 이성과 나가야 할 경우에는 제3자를 포함해 3인이 동행하며, 밤에는 외출을 지양하는 것에 동의합니다.',
          en: 'When going outside the designated camp area, I agree to talk with the Camp Director or the Coordinator first, to go out with one person of the same gender rather than acting alone, and, if I need to go out with someone of the opposite sex, to have a third person join so that three of us go together, and to avoid going out at night.' },
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
