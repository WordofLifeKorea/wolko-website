/**
 * 서약 문서 2 · 3 의 초안 — 아동보호 서약서 · 캠프 필수 규칙.
 * draft: true 인 동안은 공개 페이지에 나오지 않고 서버도 서명을 받지 않는다. 문구가 확정되면 draft 를 false 로 바꾸고 version 을 정한다.
 *
 * 정해진 것(디렉터 결정, 2026-11-21):
 *  - 범죄경력 확인에 필요한 서류는 월코가 요구하면 지체 없이 제공한다. 제출한 서류는 캠프 기간 동안만 보관하고 캠프가 끝나면 폐기한다(2026-11-21).
 *  - 아동보호 담당자: 캠프팀 디렉터 Jason Anderson · 부담당자: 코디네이터 Aiden Park.
 *  - 미성년 크루의 역할 범위는 나중에 정한다(그동안은 '어른 지도자의 지도에 따라 활동한다'는 원칙만 둔다).
 *  - 캠퍼와 개인 SNS 를 서로 공유하지 않는다 · 사역에 방해될 내용을 SNS 에 올리지 않는다.
 *  - 문신과 얼굴 장신구(귀걸이 두 세트 이상, 코걸이, 혀 피어싱 등)는 보이지 않게 한다. 귀걸이 한 쌍(한 세트)은 괜찮다. 모든 스태프와 크루에게 적용(2026-11-21).
 * 아직 정하지 못한 것은 문서 맨 아래 '정해야 할 것'(OPEN_QUESTIONS)에 적어 두었다.
 */

export const CHILD_PROTECTION = {
  id: 'childprotection',
  version: '2026-11-v1',
  draft: true,
  ko: {
    title: '아동보호 서약서',
    intro: '월코 캠프에서 스태프나 크루로 섬기는 모든 분은 아래 아동보호 기준을 읽고, 설명을 듣고, 지키겠다고 서명합니다.',
    pledge: '나는 이 서약서를 처음부터 끝까지 읽었고, 설명을 듣고 질문할 기회를 가졌으며, 내용을 이해했습니다. 아동·청소년을 지키기 위해 이 기준을 반드시 지키겠습니다. 이를 어기면 월코 캠프에서 퇴출될 수 있고 법적 책임을 질 수 있음을 이해합니다.',
  },
  en: {
    title: 'Child Protection Agreement',
    intro: 'Everyone who serves at a WOLKO camp as staff or crew reads, is briefed on, and signs to keep the child protection standards below.',
    pledge: 'I have read this agreement from beginning to end, I have been briefed on it and had the chance to ask questions, and I understand it. I will keep these standards to protect children and young people. I understand that breaking them can lead to removal from WOLKO camps and to legal responsibility.',
  },
  declaration: {
    ko: '나는 아동·청소년에 대한 학대나 성범죄로 유죄 판결을 받았거나 현재 수사·재판을 받고 있지 않습니다. 사실과 다르게 진술하면 해임·퇴출되며 법적 책임을 질 수 있음을 이해합니다.',
    en: 'I have not been convicted of, and am not currently under investigation or on trial for, any offense involving abuse of or sexual offenses against children. I understand that a false statement will lead to dismissal and may result in legal responsibility.',
  },
  sections: [
    {
      ko: '우리의 약속', en: 'Our commitment',
      items: [
        { ko: '우리는 모든 아동·청소년이 신체적·정서적·성적 해악으로부터 안전할 권리가 있다고 믿습니다. 이 서약서는 월코 캠프의 모든 스태프와 크루가 반드시 지켜야 할 최소 기준입니다.',
          en: 'We believe every child and young person has the right to be safe from physical, emotional and sexual harm. This agreement sets the minimum standard that every WOLKO staff member and crew member must follow.' },
        { ko: '나는 캠프 기간뿐 아니라 캠프 전후에도 이 기준을 지킵니다. 법이나 월코의 지침이 이 서약서보다 더 엄격하면 더 엄격한 쪽을 따릅니다.',
          en: 'I keep these standards not only during camp but also before and after it. If the law or WOLKO guidance is stricter than this agreement, I follow the stricter one.' },
      ],
    },
    {
      ko: '심사와 범죄경력 확인', en: 'Screening and criminal record checks',
      items: [
        { ko: '나는 아동·청소년과 함께하는 역할을 맡기 전에 지원서, 추천인 확인, 면접을 거치는 데 동의합니다. 지원서에 허위로 적거나 빠뜨린 것이 있으면 선발에서 제외되거나 해임될 수 있음을 이해합니다.',
          en: 'Before serving in any role with children, I agree to the application, reference checks and interview. I understand that false or missing information can lead to rejection or dismissal.' },
        { ko: '월코가 요구하면, 나는 범죄경력 확인에 필요한 서류(한국에서 발급받는 범죄경력회보서, 해외에서 지낸 적이 있으면 그 나라에서 발급받는 범죄경력 증명서 등)를 지체 없이 제공하겠습니다. 제출한 서류는 캠프 기간 동안만 보관하고, 캠프가 끝나면 폐기합니다.',
          en: 'Whenever WOLKO asks, I will provide without delay the documents needed for a criminal record check (such as a criminal record certificate issued in Korea and, if I have lived abroad, one issued by that country). The documents I submit are kept only for the duration of the camp and are destroyed when the camp ends.' },
      ],
    },
    {
      ko: '두 어른 규칙과 감독', en: 'Two-adult rule and supervision',
      items: [
        { ko: '나는 아동·청소년과 단둘이 사적인 공간에 있지 않습니다. 면담이나 상담도 다른 어른이 볼 수 있는 열린 공간에서 합니다.',
          en: 'I will not be alone with a child in a private space. Any one-to-one conversation takes place in an open area visible to another adult.' },
        { ko: '나는 캠퍼의 숙소, 화장실, 샤워실, 탈의 공간에 혼자 들어가지 않습니다. 확인이 필요할 때는 다른 어른과 함께 입구에서 확인하고, 캠퍼가 사적인 공간을 지킬 수 있게 합니다.',
          en: 'I will not enter campers’ cabins, toilets, showers or changing areas alone. When a check is needed, I do it from the entrance together with another adult, and I let campers keep their privacy.' },
        { ko: '나는 월코가 정한 캠퍼 배정과 감독 배치를 따르고, 내가 맡은 캠퍼가 누구와 어디에서 무엇을 하는지 늘 알고 있습니다.',
          en: 'I follow the camper assignments and supervision plan set by WOLKO, and I always know who my campers are with, where they are and what they are doing.' },
      ],
    },
    {
      ko: '신체 접촉과 훈육', en: 'Physical contact and discipline',
      items: [
        { ko: '신체 접촉은 공개된 곳에서, 필요한 만큼만 합니다. 캠퍼가 원하지 않으면 하지 않습니다. "내 문화에서는 괜찮다"는 이유로 접촉을 허용하지 않으며, 월코의 기준을 따릅니다.',
          en: 'Any physical contact is in public, only as much as needed, and never if the camper does not want it. "It is fine in my culture" is not a reason; I follow WOLKO’s standard.' },
        { ko: '나는 어떤 경우에도 아동·청소년을 때리거나 밀치거나 조롱하거나 위협하지 않으며, 식사·수면·화장실 이용을 벌로 제한하지 않습니다.',
          en: 'I will never hit, push, ridicule or threaten a child, and I will never withhold food, sleep or toilet access as discipline.' },
      ],
    },
    {
      ko: '소통, SNS, 사진', en: 'Communication, social media and photos',
      items: [
        { ko: '나는 캠퍼와 개인 SNS(카카오톡, 인스타그램 등)를 서로 공유하지 않습니다. 친구 추가, 팔로우, 개인 메시지를 하지 않고, 연락이 필요하면 월코 공식 그룹 채널에서 하거나 다른 어른과 보호자를 함께 참조합니다.',
          en: 'I do not share personal social media (KakaoTalk, Instagram, etc.) with campers. I do not add, follow or privately message them; when contact is needed I use official WOLKO group channels, or copy another adult and a parent.' },
        { ko: '캠프에서 찍은 사진과 영상은 월코가 정한 방법으로만 다룹니다. 캠퍼의 사진, 영상, 이름을 내 개인 SNS에 올리지 않으며, 촬영 동의가 없는 캠퍼는 찍거나 올리지 않습니다.',
          en: 'Photos and videos taken at camp are handled only in the way WOLKO sets. I do not post campers’ photos, videos or names on my personal social media, and I do not photograph or post any camper without consent.' },
      ],
    },
    {
      ko: '이동과 안전', en: 'Transport and safety',
      items: [
        { ko: '캠프 차량은 월코가 승인한 운전자만 운전합니다. 모든 이동에서 안전벨트를 확인하고 정원을 지키며, 어른 혼자 캠퍼 한 명만 태우고 이동하지 않습니다.',
          en: 'Only drivers approved by WOLKO drive camp vehicles. Seat belts are checked on every trip, capacity is never exceeded, and an adult does not drive a single camper alone.' },
      ],
    },
    {
      ko: '크루(미성년자)', en: 'Crew (minors)',
      items: [
        { ko: '크루는 18세 미만이어도 이 서약서를 똑같이 지킵니다. 크루의 구체적인 역할 범위는 월코가 따로 정해 안내하며, 크루는 어른 지도자의 지도에 따라 활동합니다.',
          en: 'Crew members under 18 keep this agreement in the same way. WOLKO will set and explain the specific scope of crew roles separately, and crew members act under the guidance of an adult leader.' },
      ],
    },
    {
      ko: '신고와 대응', en: 'Reporting and response',
      items: [
        { ko: '나는 아동학대가 의심되는 상황을 보거나 들으면 즉시 112와 아동보호 담당자에게 알립니다. 담당자에게 알렸다고 신고가 끝난 것이 아니며, 확신이 없어도 의심만으로 신고합니다.',
          en: 'If I see or hear anything that suggests a child may be harmed, I immediately call 112 and tell the Child Protection Officer. Telling the Officer does not replace reporting, and suspicion is enough.' },
        { ko: '월코의 아동보호 담당자는 캠프팀 디렉터 Jason Anderson, 부담당자는 코디네이터 Aiden Park입니다. 담당자가 의혹과 관련되어 있거나 연락이 닿지 않으면 부담당자에게, 또는 곧바로 112에 알립니다. 담당자의 연락처는 캠프 전에 따로 안내하고 캠프 현장에 게시합니다.',
          en: 'WOLKO’s Child Protection Officer is the Camp Team Director, Jason Anderson, and the Deputy Officer is the Coordinator, Aiden Park. If the Officer is involved in the concern or cannot be reached, I tell the Deputy Officer or call 112 directly. Their contact details are given before camp and posted at the camp site.' },
        { ko: '아동이 학대를 말하면 나는 끝까지 듣고, 비밀을 약속하지 않으며, 스스로 조사하지 않고, 들은 내용을 있는 그대로 기록해 즉시 담당자에게 알립니다.',
          en: 'If a child tells me about abuse, I listen to the end, I do not promise secrecy, I do not investigate myself, and I write down exactly what I heard and tell the Officer immediately.' },
        { ko: '선의로 신고하거나 알린 사람에게는 어떤 불이익도 보복도 없습니다. 나는 신고하는 사람을 방해하거나 보복하지 않습니다.',
          en: 'No one who reports in good faith will be penalized or retaliated against, and I will not obstruct or retaliate against anyone who reports.' },
        { ko: '나에 대한 의혹이 제기되면, 나는 조사가 끝날 때까지 아동·청소년과 접촉하는 일에서 물러나고 조사에 협조합니다.',
          en: 'If an allegation is made against me, I step back from all contact with children until the matter is resolved, and I cooperate with the investigation.' },
      ],
    },
    {
      ko: '어겼을 때', en: 'If this agreement is broken',
      items: [
        { ko: '이 서약서를 어기면 즉시 아동·청소년과 접촉하는 일에서 제외될 수 있고, 월코 캠프에서 퇴출될 수 있으며, 법적 책임을 질 수 있습니다.',
          en: 'If I break this agreement I can be removed at once from any contact with children, removed from WOLKO camps, and held legally responsible.' },
      ],
    },
  ],
};

export const CAMP_RULES = {
  id: 'rules',
  version: '2026-11-v1',
  draft: true,
  ko: {
    title: '월코 캠프 필수 규칙',
    intro: '월코 캠프 기간 동안 스태프와 크루가 반드시 지켜야 할 규칙입니다.',
    pledge: '나는 이 규칙을 처음부터 끝까지 읽었고 이해했으며, 캠프 기간 동안 지키겠습니다. 경고를 2회 받으면 중도에 하차해야 함을 이해합니다.',
  },
  en: {
    title: 'WOLKO Camp Essential Rules',
    intro: 'These are the rules that every staff member and crew member must keep during a WOLKO camp.',
    pledge: 'I have read these rules from beginning to end, I understand them, and I will keep them during camp. I understand that after receiving two warnings I must leave the camp.',
  },
  sections: [
    {
      ko: '경고와 중도 하차', en: 'Warnings and leaving camp early',
      items: [
        { ko: '이 규칙을 어기면 캠프팀이 경고를 줍니다. 경고가 2회 쌓이면 나는 캠프에서 중도 하차합니다.',
          en: 'If I break these rules, the camp team gives me a warning. When two warnings have been given, I leave the camp early.' },
      ],
    },
    {
      ko: '외모와 복장', en: 'Appearance',
      items: [
        { ko: '나는 문신이 보이지 않게 합니다.',
          en: 'I keep any tattoos covered and not visible.' },
        { ko: '나는 얼굴 장신구(두 세트 이상의 귀걸이, 코걸이, 혀 피어싱 등)가 보이지 않게 합니다. 귀걸이는 한 쌍(한 세트)까지는 괜찮습니다.',
          en: 'I keep facial jewelry (two or more sets of earrings, nose rings, tongue piercings, etc.) out of sight. One pair (one set) of earrings is fine.' },
      ],
    },
    {
      ko: 'SNS', en: 'Social media',
      items: [
        { ko: '나는 사역에 방해가 될 만한 내용을 SNS에 올리지 않습니다.',
          en: 'I do not post anything on social media that could get in the way of the ministry.' },
      ],
    },
  ],
};

/** 아직 정하지 못한 것 — 확정 전에 디렉터와 정해서 위 문서에 반영한다 */
export const OPEN_QUESTIONS = [
  '아동보호 담당자 · 부담당자의 연락처(휴대전화, 이메일)',
  '미성년 크루의 구체적인 역할 범위(차후 결정)',
  '아동에 대한 학대 · 성적으로 부적절한 행동 · 체벌은 경고 없이 즉시 퇴출(무관용)로 할지',
  '필수 규칙에 더 넣을 항목(술 · 담배 · 이성 교제 · 휴대폰 · 외출 · 복장 · 시간 · 숙소 등)과 경고를 주는 사람 · 기록 방법 · 하차 후 처리(보호자 연락, 귀가 방법)',
  '범죄경력 서류를 볼 수 있는 사람(열람자)과 외국인 스태프의 본국 서류 범위(보관은 캠프 기간 동안만, 끝나면 폐기로 정했다)',
  '두 문서에 보호자(법정대리인) 서명을 받을지(크루)',
];
