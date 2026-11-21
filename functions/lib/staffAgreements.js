/**
 * 캠프 스태프 · 크루 서약 문서 — 신청할 때 읽고 동의하고 서명하는 문서들의 내용과 서명 기록 규칙.
 *
 * 문서 내용(DOCS)은 공개 페이지(src/pages/staff-agreements/)와 서버(functions/api/agreements/sign.js)가 함께 쓴다.
 * 서명한 문서의 '버전'과 '글 해시'를 기록에 같이 남기므로, 문구를 고치면 version 을 올려야 한다(예전 서명은 예전 문구로 남는다).
 *
 * 저장(CAMP_KV, 마이그레이션 없음):
 *   agree:v1:{문서}:{YYYYMM(KST)}:{확인번호}   서명 한 건. 값 = 전체(서명 그림 포함), 메타데이터 = 목록에 필요한 칸만
 *   agree:rl:{ip해시}:{시간}                  남용 방지 횟수(하루 남짓 뒤 사라짐)
 */
import { CHILD_PROTECTION, CAMP_RULES } from './agreementDocsExtra.js';

export const AGREEMENT_PREFIX = 'agree:v1:';
export const ROLES = ['staff', 'crew'];
export const ROLE_LABEL = { staff: { ko: '스태프', en: 'Staff' }, crew: { ko: '크루', en: 'Crew' } };
export const MAX_SIGNATURE_BYTES = 240 * 1024;   // 서명 그림(PNG) 한도

/* 신앙고백서 11개 항목은 예전 About 페이지(월코소개 > 신앙고백)의 최종 문구를 그대로 옮긴 것이다(커밋 fc2a7a4c 에서 페이지를 내리기 전 상태). */
export const DOCS = {
  faith: {
    id: 'faith',
    version: '2026-11-v2',
    ko: {
      title: '신앙고백서',
      intro: '월코 캠프에서 스태프나 크루로 섬기는 모든 분은 아래 신앙고백을 읽고 동의하며 서명합니다.',
      pledge: '저는 위 신앙고백서를 처음부터 끝까지 읽었으며, 그 내용에 동의합니다. 월코 캠프에서 이 신앙에 어긋나지 않게 섬기겠습니다.',
    },
    en: {
      title: 'Statement of Faith',
      intro: 'Everyone who serves at a WOLKO camp as staff or crew reads, agrees to and signs the Statement of Faith below.',
      pledge: 'I have read the Statement of Faith above from beginning to end and I agree with it. I will serve at WOLKO camps in a way that is consistent with this faith.',
    },
    items: [
      { ko: "우리는 구약과 신약 성경이 하나님의 감동으로 기록되었으며, 원본에 오류가 없고, 신앙과 삶에 있어 최고의 최종 권위임을 믿습니다.",
        en: "We believe that the Scriptures of the Old and New Testament are verbally inspired of God, and they are without error in the original writings, and they are the supreme and final authority for faith and life." },
      { ko: "우리는 우주의 창조자이시며 섭리자이신 한 하나님, 곧 성부, 성자, 성령의 세 위격으로 영원히 존재하시는 분을 믿습니다.",
        en: "We believe in one God, Creator and Sustainer of the universe, Who is eternally existent in three persons — Father, Son, and Holy Spirit." },
      { ko: "우리는 예수 그리스도의 신성, 동정녀 탄생, 죄 없는 삶, 모든 사람의 죄를 위한 대속의 죽음, 육체적 부활, 하나님 우편으로의 승천을 믿습니다. 또한 우리는 그리스도께서 7년 대환난 이전에 그분의 교회를 휴거하시고, 그 후 새 하늘과 새 땅 이전에 천년왕국을 세우시기 위해 친히 이 땅에 재림하실 것을 믿습니다.",
        en: "We believe in the Deity of Jesus Christ, His virgin birth, sinless life, His death to pay the penalty for everyone's sins, His bodily resurrection, His exaltation at God's right hand. We believe Christ will take His Church to heaven before the seven-year tribulation, after which He will physically return to earth to establish His 1000-year-reign prior to the new heaven and new earth." },
      { ko: "우리는 모든 사람이 죄를 범하여 하나님 앞에 죄인이며, 그분의 심판 아래 있음을 믿습니다.",
        en: "We believe that all have sinned and are therefore guilty before God and are under His condemnation." },
      { ko: "우리는 믿음으로 예수 그리스도를 영접하는 모든 사람이 성령으로 거듭나 하나님의 자녀가 되고 영원히 구원받음을 믿습니다. 또한 성령께서 예수님을 믿는 모든 사람 안에 내주하시며, 삶과 간증과 섬김 가운데 조명하시고 인도하시며 능력을 주심을 믿습니다. 우리는 하나님께서 그분의 백성의 기도에 응답하시고, 그분의 뜻에 따라 필요를 채워 주심을 믿습니다.",
        en: "We believe that all who by faith receive Jesus Christ are born again of the Holy Spirit, therefore children of God and eternally saved, and that the Holy Spirit dwells within every believer to enlighten, guide, and enable the believer in life, testimony, and service. We believe that God answers the prayers of His people and meets their needs according to His purpose." },
      { ko: "우리는 하나님께서 예수님을 믿는 모든 사람에게 그리스도의 몸을 세우기 위한 영적 은사를 주심을 믿습니다. 다만 방언과 치유와 같은 기적적인 표적 은사는 초대 교회 시대에 국한되었음을 믿습니다. 또한 우리는 하나님께서 그분의 목적을 이루시고 영광을 나타내시기 위해 언제든지 인간의 역사에 기적적으로 개입하실 수 있음을 믿습니다.",
        en: "We believe that God gives spiritual gifts to all believers for the building up of the body of Christ. However, the miraculous sign-gifts of the Spirit, such as tongues and healings, were limited to the early church. We also believe that God may miraculously intervene in the affairs of humanity anytime to accomplish His purposes and to manifest His glory." },
      { ko: "우리는 의인과 악인 모두의 육체적 부활을 믿으며, 구원받은 자들의 영원한 복과 구원받지 못한 자들의 지옥에서의 영원한 의식적 형벌을 믿습니다.",
        en: "We believe in the bodily resurrection of the just and unjust, the everlasting blessedness of the saved in Glory and the everlasting conscious punishment of the lost in hell." },
      { ko: "우리는 예수님을 믿는 모든 사람이 세속적이고 죄악된 모든 관행과 연합으로부터 구별된 삶으로 부름받았음을 믿습니다.",
        en: "We believe that all believers are called to a life of separation from all worldly and sinful practices and alliances." },
      { ko: "우리는 태초에 아담과 하와를 통하여 하나님께서 결혼을 오직 한 남자와 한 여자 사이에서만 정하셨음을 믿습니다. 또한 동성애 행위를 포함하여 이 성경적 결혼의 범위 밖에서 이루어지는 모든 성적 행위는 하나님의 말씀과 가정 제도에 대한 그분의 의도에 명백히 어긋남을 믿습니다.",
        en: "We believe that from the beginning with Adam and Eve, God ordained marriage as only between one man and one woman. All sexual activity outside of this biblical definition of marriage, including homosexual practices, is in direct contradiction to God's Word and His intention for the institution of the home." },
      { ko: "우리는 하나님께서 각 사람을 그분의 영광을 위해 남성 또는 여성으로 놀랍고도 변함없이 창조하셨음을 믿습니다. 또한 이 두 가지 구별되고 상호 보완적인 성(性)은 함께 하나님의 형상과 본성을 반영하며, 자신의 생물학적 성별을 거부하는 것은 인류와 개인을 향한 하나님의 주권적 뜻과 선하신 계획을 거부하는 것임을 믿습니다.",
        en: "We believe that God wonderfully and immutably creates each person as male or female for His glory. These two distinct, complementary genders together reflect the image and nature of God, and the rejection of one's biological gender is a rejection of God's decreed will and good plan for humanity and the individual." },
      { ko: "우리는 모든 사람이 하나님의 형상으로 창조되었으므로 모든 인간 생명이 존엄함을 믿습니다. 또한 생명은 잉태 때부터 시작되어 죽음 너머 영원까지 이어지므로, 하나님께서는 나이나 상태에 관계없이 모든 사람이 인간의 생명을 소중히 여기고 존중하며 지키고 보호하도록 부르심을 믿습니다.",
        en: "Since every person is uniquely created in the image of God and formed by God, we hold to the sanctity of all human life. Since the Bible reflects that life begins at conception and lasts beyond death into eternity, God calls everyone to value, respect, defend, and protect all human life regardless of age or condition." }
    ],
  },
  childprotection: CHILD_PROTECTION,
  rules: CAMP_RULES,
};

/** 서명을 받는(초안이 아닌) 문서만. includeDrafts 는 로컬 미리보기용 */
export const docList = ({ includeDrafts = false } = {}) => Object.values(DOCS).filter((d) => includeDrafts || !d.draft);

/** 문서를 '소제목 + 항목' 묶음으로 — 항목만 있는 문서(신앙고백서)는 제목 없는 한 묶음 */
export function docSections(doc) {
  return doc.sections || [{ ko: '', en: '', items: doc.items || [] }];
}

/** 문서의 글 전체를 한 덩어리로 — 해시 · 서명본 인쇄에 쓴다 */
export function docText(doc) {
  if (!doc.sections) {   // 신앙고백서처럼 항목만 있는 문서: 글 모양을 바꾸지 않는다(이미 받은 서명의 해시가 그대로 맞도록)
    return [doc.ko.title, doc.ko.intro, ...doc.items.map((i, n) => `${n + 1}. ${i.ko}`), doc.ko.pledge, '', doc.en.title, doc.en.intro, ...doc.items.map((i, n) => `${n + 1}. ${i.en}`), doc.en.pledge].join('\n');
  }
  const lang = (k) => [doc[k].title, doc[k].intro, ...doc.sections.flatMap((sec) => [sec[k], ...sec.items.map((i) => i[k])]), ...(doc.declaration ? [doc.declaration[k]] : []), doc[k].pledge];
  return [...lang('ko'), '', ...lang('en')].join('\n');
}
export async function docHash(doc) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${doc.id}|${doc.version}|${docText(doc)}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}

/* ── 서명 기록 검사 도구 ── */
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const PNG_PREFIX = 'data:image/png;base64,';
const MIN_SIGNATURE_BYTES = 600;   // 너무 작은 그림(깨진 값)은 거른다. 아무것도 안 그린 흰 PNG 도 몇 KB 라 크기로는 못 가른다 — 서명을 그렸는지는 화면의 서명판이 확인한다

export const newAgreementCode = () => 'AG-' + Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');

/** 서명 그림 검사: PNG 데이터 주소 · 크기 · PNG 머리글. 통과하면 바이트 수를 돌려준다 */
export function checkSignature(value) {
  if (typeof value !== 'string' || !value.startsWith(PNG_PREFIX)) return 0;
  const b64 = value.slice(PNG_PREFIX.length);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return 0;
  if (b64.length % 4 !== 0) return 0;
  const bytes = Math.floor((b64.length * 3) / 4) - (b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0);
  if (bytes < MIN_SIGNATURE_BYTES || bytes > MAX_SIGNATURE_BYTES) return 0;
  // PNG 머리글 8바이트 + 첫 덩어리가 IHDR(가로 · 세로 크기가 상식적인 범위)인지 — 앞부분 24바이트(base64 32글자)만 풀어 본다
  try {
    const head = atob(b64.slice(0, 32));
    if (head.slice(0, 8) !== '\x89PNG\r\n\x1a\n' || head.slice(12, 16) !== 'IHDR') return 0;
    const u32 = (i) => ((head.charCodeAt(i) << 24) | (head.charCodeAt(i + 1) << 16) | (head.charCodeAt(i + 2) << 8) | head.charCodeAt(i + 3)) >>> 0;
    const w = u32(16), h = u32(20);
    if (w < 100 || w > 3000 || h < 40 || h > 1500) return 0;
  } catch { return 0; }
  return bytes;
}

/* ── 필수 서약: 스태프 · 크루는 캠프 트레이닝 위크에 (공개된) 서약 문서를 모두 작성한다 — 관리자 목록의 작성 현황용(수락 조건 아님) ── */
/** 지금 작성해야 하는 문서 = 공개된(draft 아닌) 문서. 초안 문서는 공개로 바뀌는 순간부터 필수가 된다 */
export const requiredDocs = () => docList();

/** 서명 현황의 키: 캠프마다 쓰는 문서(perCamp)는 'childprotection@캠프id', 그 밖의 문서는 문서 id */
export const signedKey = (doc, campId) => (doc.perCamp ? `${doc.id}@${campId || ''}` : doc.id);

/**
 * 이메일별로 '지금 버전'에 서명한 필수 문서 목록 — { 'a@b.org': ['faith', 'rules', 'childprotection@2027-wolko-winter'] }
 * 문서 버전이 바뀌면 예전 서명은 세지 않는다(다시 읽고 서명해야 한다). 캠프마다 쓰는 문서는 캠프별로 센다.
 */
export async function signedMap(env) {
  const map = {};
  for (const doc of requiredDocs()) {
    let cursor;
    for (let page = 0; page < 100; page++) {
      const res = await env.CAMP_KV.list({ prefix: `${AGREEMENT_PREFIX}${doc.id}:`, cursor, limit: 1000 });
      for (const k of res.keys || []) {
        const m = k.metadata || {};
        if (m.v !== doc.version || !m.e) continue;
        const email = String(m.e).toLowerCase();
        if (doc.perCamp && !m.c) continue;   // 캠프가 적히지 않은 서명은 캠프별 문서로 세지 않는다
        (map[email] ||= new Set()).add(signedKey(doc, m.c));
      }
      if (res.list_complete || !res.cursor) break;
      cursor = res.cursor;
    }
  }
  return Object.fromEntries(Object.entries(map).map(([e, set]) => [e, [...set]]));
}

/** 이름 · 이메일 비교용 정리: 앞뒤 공백 · 겹친 공백을 줄이고 소문자로, 기록에 남는 길이(40자)까지만 */
export const normName = (s) => String(s || '').normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase().slice(0, 40);
export const normEmail = (s) => String(s || '').trim().toLowerCase();

/**
 * 이름 + 이메일이 둘 다 같은 사람이 '지금 버전'에 이미 서명한 서약서 — { faith: { at }, childprotection: { 캠프id: { at } } }
 * 이름과 이메일을 둘 다 맞게 알아야 알려 준다(이메일만 아는 사람이 남의 서명 여부를 알아내지 못하게). 서명 그림 · 연락처는 돌려주지 않는다.
 */
export async function signedFor(env, email, name) {
  const e = normEmail(email), n = normName(name), out = {};
  if (!e || !n) return out;
  for (const doc of requiredDocs()) {
    let cursor;
    for (let page = 0; page < 100; page++) {
      const res = await env.CAMP_KV.list({ prefix: `${AGREEMENT_PREFIX}${doc.id}:`, cursor, limit: 1000 });
      for (const k of res.keys || []) {
        const m = k.metadata || {};
        if (m.v !== doc.version || normEmail(m.e) !== e || normName(m.n) !== n) continue;
        const at = new Date(Number(m.t) || 0).toISOString();
        if (doc.perCamp) { if (m.c) (out[doc.id] ||= {})[m.c] = { at }; }
        else if (!out[doc.id] || at > out[doc.id].at) out[doc.id] = { at };
      }
      if (res.list_complete || !res.cursor) break;
      cursor = res.cursor;
    }
  }
  return out;
}

/** 이 이메일이 (이 캠프에 대해) 아직 작성하지 않은 필수 문서들 — campId 는 캠프마다 쓰는 문서에만 쓴다 */
export const missingDocs = (signed, email, campId = '') => requiredDocs().filter((d) => !(signed?.[String(email || '').toLowerCase()] || []).includes(signedKey(d, campId)));
