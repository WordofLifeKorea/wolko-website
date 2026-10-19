/**
 * 성경 구절 조회 — AI 없이 실제 성경 데이터에서 본문을 가져온다.
 *   한글: 개역한글(KRV, 저작권 만료 공개 번역본) — bolls.life 공개 API. 한 번 가져온 본문은 KV에 오래 보관해 같은 구절은 다시 부르지 않는다.
 *   영어: ESV — Crossway 공식 API(ESV_API_KEY 환경변수가 있을 때), 없으면 NIV — api.bible (BIBLE_API_KEY, NIV_BIBLE_ID)
 * 구절 주소("시편 96:2-3", "요한복음 3장 16절", "John 3:16", "1 John 1:9")는 아래 표로 직접 해석한다.
 */
// [번호(=bolls 책 번호), USFM, 한글 이름, 한글 약어들, 영어 이름/약어들]
const BOOKS = [
  [1, 'GEN', '창세기', ['창'], ['genesis', 'gen', 'gn']],
  [2, 'EXO', '출애굽기', ['출'], ['exodus', 'exod', 'exo', 'ex']],
  [3, 'LEV', '레위기', ['레'], ['leviticus', 'lev', 'lv']],
  [4, 'NUM', '민수기', ['민'], ['numbers', 'num', 'nm']],
  [5, 'DEU', '신명기', ['신'], ['deuteronomy', 'deut', 'deu', 'dt']],
  [6, 'JOS', '여호수아', ['수'], ['joshua', 'josh', 'jos']],
  [7, 'JDG', '사사기', ['삿'], ['judges', 'judg', 'jdg']],
  [8, 'RUT', '룻기', ['룻'], ['ruth', 'rut']],
  [9, '1SA', '사무엘상', ['삼상'], ['1samuel', '1sam', '1sa']],
  [10, '2SA', '사무엘하', ['삼하'], ['2samuel', '2sam', '2sa']],
  [11, '1KI', '열왕기상', ['왕상'], ['1kings', '1kgs', '1ki']],
  [12, '2KI', '열왕기하', ['왕하'], ['2kings', '2kgs', '2ki']],
  [13, '1CH', '역대상', ['대상'], ['1chronicles', '1chron', '1ch']],
  [14, '2CH', '역대하', ['대하'], ['2chronicles', '2chron', '2ch']],
  [15, 'EZR', '에스라', ['스'], ['ezra', 'ezr']],
  [16, 'NEH', '느헤미야', ['느'], ['nehemiah', 'neh']],
  [17, 'EST', '에스더', ['에'], ['esther', 'est']],
  [18, 'JOB', '욥기', ['욥'], ['job']],
  [19, 'PSA', '시편', ['시'], ['psalms', 'psalm', 'ps', 'psa']],
  [20, 'PRO', '잠언', ['잠'], ['proverbs', 'prov', 'pro', 'pr']],
  [21, 'ECC', '전도서', ['전'], ['ecclesiastes', 'eccl', 'ecc']],
  [22, 'SNG', '아가', ['아'], ['songofsolomon', 'songofsongs', 'song', 'sng', 'sos']],
  [23, 'ISA', '이사야', ['사'], ['isaiah', 'isa']],
  [24, 'JER', '예레미야', ['렘'], ['jeremiah', 'jer']],
  [25, 'LAM', '예레미야애가', ['애'], ['lamentations', 'lam']],
  [26, 'EZK', '에스겔', ['겔'], ['ezekiel', 'ezek', 'ezk']],
  [27, 'DAN', '다니엘', ['단'], ['daniel', 'dan']],
  [28, 'HOS', '호세아', ['호'], ['hosea', 'hos']],
  [29, 'JOL', '요엘', ['욜'], ['joel', 'jol']],
  [30, 'AMO', '아모스', ['암'], ['amos', 'amo']],
  [31, 'OBA', '오바댜', ['옵'], ['obadiah', 'obad', 'oba']],
  [32, 'JON', '요나', ['욘'], ['jonah', 'jon']],
  [33, 'MIC', '미가', ['미'], ['micah', 'mic']],
  [34, 'NAM', '나훔', ['나'], ['nahum', 'nah', 'nam']],
  [35, 'HAB', '하박국', ['합'], ['habakkuk', 'hab']],
  [36, 'ZEP', '스바냐', ['습'], ['zephaniah', 'zeph', 'zep']],
  [37, 'HAG', '학개', ['학'], ['haggai', 'hag']],
  [38, 'ZEC', '스가랴', ['슥'], ['zechariah', 'zech', 'zec']],
  [39, 'MAL', '말라기', ['말'], ['malachi', 'mal']],
  [40, 'MAT', '마태복음', ['마'], ['matthew', 'matt', 'mat', 'mt']],
  [41, 'MRK', '마가복음', ['막'], ['mark', 'mrk', 'mk']],
  [42, 'LUK', '누가복음', ['눅'], ['luke', 'luk', 'lk']],
  [43, 'JHN', '요한복음', ['요'], ['john', 'jhn', 'jn']],
  [44, 'ACT', '사도행전', ['행'], ['acts', 'act']],
  [45, 'ROM', '로마서', ['롬'], ['romans', 'rom']],
  [46, '1CO', '고린도전서', ['고전'], ['1corinthians', '1cor', '1co']],
  [47, '2CO', '고린도후서', ['고후'], ['2corinthians', '2cor', '2co']],
  [48, 'GAL', '갈라디아서', ['갈'], ['galatians', 'gal']],
  [49, 'EPH', '에베소서', ['엡'], ['ephesians', 'eph']],
  [50, 'PHP', '빌립보서', ['빌'], ['philippians', 'phil', 'php']],
  [51, 'COL', '골로새서', ['골'], ['colossians', 'col']],
  [52, '1TH', '데살로니가전서', ['살전'], ['1thessalonians', '1thess', '1th']],
  [53, '2TH', '데살로니가후서', ['살후'], ['2thessalonians', '2thess', '2th']],
  [54, '1TI', '디모데전서', ['딤전'], ['1timothy', '1tim', '1ti']],
  [55, '2TI', '디모데후서', ['딤후'], ['2timothy', '2tim', '2ti']],
  [56, 'TIT', '디도서', ['딛'], ['titus', 'tit']],
  [57, 'PHM', '빌레몬서', ['몬'], ['philemon', 'phlm', 'phm']],
  [58, 'HEB', '히브리서', ['히'], ['hebrews', 'heb']],
  [59, 'JAS', '야고보서', ['약'], ['james', 'jas', 'jm']],
  [60, '1PE', '베드로전서', ['벧전'], ['1peter', '1pet', '1pe']],
  [61, '2PE', '베드로후서', ['벧후'], ['2peter', '2pet', '2pe']],
  [62, '1JN', '요한일서', ['요일', '요한1서'], ['1john', '1jn']],
  [63, '2JN', '요한이서', ['요이', '요한2서'], ['2john', '2jn']],
  [64, '3JN', '요한삼서', ['요삼', '요한3서'], ['3john', '3jn']],
  [65, 'JUD', '유다서', ['유'], ['jude', 'jud']],
  [66, 'REV', '요한계시록', ['계', '요한계시록'], ['revelation', 'revelations', 'rev']],
];
const SINGLE_CHAPTER = new Set([31, 57, 63, 64, 65]); // 오바댜 · 빌레몬서 · 요한이서 · 요한삼서 · 유다서
const squash = value => String(value).toLowerCase().replace(/[\s.·]/g, '');
const BOOK_INDEX = new Map();
for (const book of BOOKS) {
  const [, , ko, koShort, en] = book;
  for (const name of [ko, ...koShort, ...en]) BOOK_INDEX.set(squash(name), book);
}
const MAX_VERSES = 40;
// '1samuel' → '1 Samuel', 'songofsolomon' → 'Song of Solomon' (ESV 조회용 영어 책 이름)
const englishName = key => key === 'songofsolomon' ? 'Song of Solomon' : key.replace(/^(\d)/, '$1 ').replace(/^(\d )?(.)/, (m, n, c) => (n || '') + c.toUpperCase());

/** "시편 96:2-3" → { book, chapter, verses:[2,3], label } — 해석할 수 없으면 Error(한글 메시지) */
export function parseReference(input) {
  let text = String(input || '').trim().replace(/[：]/g, ':').replace(/[~–—]/g, '-');
  if (!text) throw new Error('구절 주소를 입력해 주세요.');
  // "3장 16절" · "96편 2-3절" 같은 한글 표기를 3:16 · 96:2-3 으로
  text = text.replace(/(\d+)\s*[장편]\s*/g, '$1:').replace(/절/g, '').replace(/:\s*$/, '');
  // 책 이름과 숫자 부분을 나눈다 — 이름에 숫자가 들어간 "1 John", "요한1서" 때문에 가장 긴 책 이름부터 맞춰 본다.
  let book = null, rest = '';
  for (let cut = text.length; cut > 0; cut--) {
    const head = text.slice(0, cut);
    const found = BOOK_INDEX.get(squash(head));
    if (found && /^[\s\d:,\-]*$/.test(text.slice(cut))) { book = found; rest = text.slice(cut).replace(/\s+/g, ''); break; }
  }
  if (!book) throw new Error('책 이름을 알아볼 수 없어요. 예: 시편 96:2-3, 요한복음 3:16, John 3:16');
  const [bookId, usfm, koName, , enNames] = book;
  const enName = englishName(enNames[0]);
  let chapter, verseText;
  if (rest.includes(':')) {
    [chapter, verseText] = rest.split(':');
  } else if (SINGLE_CHAPTER.has(bookId) && rest) {
    chapter = '1'; verseText = rest; // "유 3" → 1장 3절
  } else {
    chapter = rest; verseText = '';
  }
  chapter = parseInt(chapter, 10);
  if (!chapter || chapter < 1 || chapter > 150) throw new Error('장 번호를 확인해 주세요. 예: 시편 96:2-3');
  const verses = [];
  for (const part of (verseText || '').split(',').filter(Boolean)) {
    const [from, to] = part.split('-').map(n => parseInt(n, 10));
    if (!from || from < 1) throw new Error('절 번호를 확인해 주세요. 예: 시편 96:2-3');
    const end = to || from;
    if (end < from) throw new Error('절 범위가 거꾸로예요. 예: 2-3');
    for (let v = from; v <= end; v++) verses.push(v);
  }
  if (verses.length > MAX_VERSES) throw new Error(`한 번에 ${MAX_VERSES}절까지만 불러올 수 있어요.`);
  const label = `${koName} ${chapter}${verses.length ? ':' + describeVerses(verses) : '장'}`;
  return { bookId, usfm, koName, enName, chapter, verses, label };
}

function describeVerses(verses) {
  const parts = [];
  for (let i = 0; i < verses.length;) {
    let j = i;
    while (j + 1 < verses.length && verses[j + 1] === verses[j] + 1) j++;
    parts.push(i === j ? String(verses[i]) : `${verses[i]}-${verses[j]}`);
    i = j + 1;
  }
  return parts.join(',');
}

/** api.bible 구절 ID 목록 — 이어지는 구절마다 하나 (예: ['PSA.96.2-PSA.96.3']) */
export function usfmPassages(ref) {
  if (!ref.verses.length) return [`${ref.usfm}.${ref.chapter}`];
  const groups = [];
  for (let i = 0; i < ref.verses.length;) {
    let j = i;
    while (j + 1 < ref.verses.length && ref.verses[j + 1] === ref.verses[j] + 1) j++;
    const a = `${ref.usfm}.${ref.chapter}.${ref.verses[i]}`;
    groups.push(i === j ? a : `${a}-${ref.usfm}.${ref.chapter}.${ref.verses[j]}`);
    i = j + 1;
  }
  return groups;
}

const BOLLS = 'https://bolls.life';
const KV_TTL = 60 * 60 * 24 * 365; // 개역한글은 바뀌지 않는 본문이라 오래 보관

/** 개역한글 본문 — 절 번호 없이 이어 붙인다. 구절이 없으면 빈 문자열 */
export async function fetchKrv(env, ref, fetchImpl = fetch) {
  const key = `bible:krv:${ref.bookId}:${ref.chapter}:${ref.verses.join(',')}`;
  const cached = env.CAMP_KV ? await env.CAMP_KV.get(key) : null;
  if (cached) return cached;
  let verses;
  if (ref.verses.length) {
    const res = await fetchImpl(`${BOLLS}/get-verses/`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ translation: 'KRV', book: ref.bookId, chapter: ref.chapter, verses: ref.verses }]),
    });
    if (!res.ok) throw new Error('한글 성경 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
    verses = (await res.json())[0] || [];
  } else {
    const res = await fetchImpl(`${BOLLS}/get-text/KRV/${ref.bookId}/${ref.chapter}/`);
    if (!res.ok) throw new Error('한글 성경 서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.');
    verses = (await res.json()).slice(0, MAX_VERSES);
  }
  const text = verses.sort((a, b) => a.verse - b.verse).map(v => String(v.text || '').replace(/<[^>]*>/g, '').trim()).filter(Boolean).join(' ');
  if (text && env.CAMP_KV) await env.CAMP_KV.put(key, text, { expirationTtl: KV_TTL });
  return text;
}

/** NIV 영어 본문 (api.bible) — 설정이 없거나 실패하면 빈 문자열 */
export async function fetchNiv(env, ref, fetchImpl = fetch) {
  if (!env.BIBLE_API_KEY || !env.NIV_BIBLE_ID) return '';
  const parts = [];
  for (const id of usfmPassages(ref)) {
    const res = await fetchImpl(`https://rest.api.bible/v1/bibles/${env.NIV_BIBLE_ID}/passages/${encodeURIComponent(id)}?content-type=text&include-verse-numbers=false&include-titles=false`, { headers: { 'api-key': env.BIBLE_API_KEY } });
    if (!res.ok) continue;
    const data = await res.json();
    parts.push((data.data?.content || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim());
  }
  return parts.filter(Boolean).join(' ');
}


/** ESV 영어 본문 (Crossway 공식 API) — 절 번호·머리글·각주 없이 본문만, 끝에 저작권 표기 "(ESV)"가 붙는다. 설정이 없으면 빈 문자열 */
export async function fetchEsv(env, ref, fetchImpl = fetch) {
  if (!env.ESV_API_KEY) return '';
  const query = ref.verses.length ? `${ref.enName} ${ref.chapter}:${describeVerses(ref.verses)}` : `${ref.enName} ${ref.chapter}`;
  const params = new URLSearchParams({
    q: query, 'include-passage-references': 'false', 'include-verse-numbers': 'false', 'include-first-verse-numbers': 'false',
    'include-footnotes': 'false', 'include-footnote-body': 'false', 'include-headings': 'false', 'include-short-copyright': 'true',
    'include-selahs': 'false', 'line-length': '0',
  });
  const res = await fetchImpl(`https://api.esv.org/v3/passage/text/?${params}`, { headers: { Authorization: `Token ${env.ESV_API_KEY}` } });
  if (!res.ok) return '';
  const data = await res.json();
  return String((data.passages || [])[0] || '').replace(/\s+/g, ' ').trim();
}

export async function lookupVerse(env, input, fetchImpl = fetch) {
  const ref = parseReference(input);
  // 영어는 ESV(키가 있을 때)를 먼저, 안 되면 NIV
  const english = async () => {
    const esv = await fetchEsv(env, ref, fetchImpl).catch(() => '');
    if (esv) return { text: esv, version: 'ESV' };
    const niv = await fetchNiv(env, ref, fetchImpl).catch(() => '');
    return { text: niv, version: niv ? 'NIV' : '' };
  };
  const [ko, en] = await Promise.all([fetchKrv(env, ref, fetchImpl), english()]);
  if (!ko && !en.text) throw new Error('성경 구절을 찾지 못했어요. 구절 주소를 확인해 주세요.');
  return { ko, en: en.text, ref: ref.label, koVersion: '개역한글', enVersion: en.version };
}
