/**
 * 복음 통계 — "WOLKO Monthly Gospel Outreach Report"(월간 보고서) 항목 정의 · 검증 · 집계.
 *
 * 보고 한 건 = (달, 보고자 계정, 개인 또는 팀 한 단위) 하나. 같은 단위·같은 달에 다시 저장하면 그 보고를 고친다.
 * 팀으로 낸 숫자는 팀원이 따로 내지 않는 것을 전제로 하므로, 합계는 보고 건수를 그대로 더한다(중복 계산 방지는 보고 단위로 한다).
 * 위치(location)는 보고서의 "Jeju or Mainland" — 월코(본토) / 제주를 따로 집계하고 합쳐서도 본다.
 *
 * 저장소(CAMP_KV): gospel:rep:{YYYY-MM}:{id}  — id 는 계정·단위로 정한 짧은 해시(같은 단위는 같은 키)
 */
const L = (ko, en) => ({ ko, en });

/* 구역(section)마다
 *   access: 'all' = 포탈 계정 누구나 쓴다 | 'designated' = 마스터가 지정한 보고 담당자만 쓴다(팀·캠프·행사·교회 보고)
 *   scope : 'report' = 개인/팀 보고에 들어간다 | 'ministry' = 평택·제주 월별 "사역 현황" 보고(제자훈련·지역교회)에만 들어간다
 * 항목(field)에는
 *   hq: false  = 본부(미국) 보고 양식에 없는 우리 내부 항목
 *   note       = 월코 Monthly Gospel Outreach Report 정의서(2026-10-16)의 각주 — 표의 ⓘ 에 그대로 보여 준다
 *   snapshot   = 달말 현재 수(등록 학생·교회 수·클럽 수 등) — 연간 보기에서는 더하지 않고 가장 최근 달의 값을 쓴다
 *   crs        = CRS(교회 관계 시스템)에서 불러와 채워 주는 항목(고쳐서 저장할 수 있다) */
export const GOSPEL_SECTIONS = [
  {
    id: 'personal', access: 'all', scope: 'report', title: L('개인 전도', 'Personal Evangelism'),
    fields: [
      { id: 'preEvangelism', label: L('영적 대화 (마음 밭 갈기) — 복음 이야기로 이어지길 바라며, 일부러 믿음과 영적인 주제로 대화를 나눈 사람', 'Pre-Evangelism (Till the Soil) — people you had intentional spiritual conversations with, hoping to lead to a Gospel conversation'), short: L('영적 대화', 'Spiritual conversations'), note: L('영적 대화에서 복음 대화로 이어졌다면 두 항목 모두에 셀 수 있어요. 같은 사람이라도 날마다·행사마다 따로 셀 수 있어요.', 'A person may be counted in both categories if your interaction progresses from pre-evangelism to a Gospel conversation. A person may be counted more than once for each day or event you do this.'), hq: false },
      { id: 'evangelism', label: L('복음 전하기 (씨 뿌리기) — 일대일이나 소그룹에서 직접 복음을 듣게 된 인원 (고전 15:1–4)', 'Evangelism (Plant the Seed) — people you personally shared the Gospel with, one-on-one or in a small group (1CO 15:1–4)'), short: L('복음 들은 인원', 'Heard the Gospel'), note: L('\'복음 대화\'는 아래 1·2번을 분명히 전해야 하고, 3~5번도 가능한 한 함께 전해야 해요.\n1. 그리스도의 사역: 예수 그리스도께서 우리 죄를 위해 죽으시고 다시 살아나셨어요 (고전 15:3–4).\n2. 믿음: 영원한 구원은 행위가 아니라 그리스도의 완성된 사역을 믿는 믿음으로만 받아요 (요 3:36; 엡 2:8–9).\n3. 하나님과 죄: 하나님은 모든 사람을 사랑하시지만 죄는 심판하세요 (요 3:16, 36; 롬 5:8).\n4. 사람의 필요: 모든 사람은 죄인이라 스스로를 구원할 수 없어요 (롬 3:23; 6:23; 5:6–8).\n5. 오직 그리스도: 죄 없으신 하나님의 아들 예수님만이 죄를 속하고 우리를 하나님과 화목하게 하실 수 있는 유일한 구주세요 (딤전 2:5).\n같은 사람에게 다른 날이나 다른 행사에서 다시 복음을 전했다면 그때마다 세어요.', 'A ‘Gospel conversation’ must clearly communicate #1 and #2 and should include as many of #3-#5 as appropriate.\n1. Christ\'s Work: Jesus Christ died for our sins and rose again (1CO 15:3–4).\n2. Faith: Eternal salvation is received by faith alone in the finished work of Christ, not by our works (JOH 3:36; EPH 2:8–9).\n3. God and Sin: God loves all people, but He also judges sin (JOH 3:16, 36; ROM 5:8).\n4. Human Need: All people are sinners and cannot save themselves (ROM 3:23; 6:23; 5:6–8).\n5. Christ Alone: Jesus, the sinless Son of God, is the only Savior who can atone for sin and reconcile us to God (1TI 2:5).\nIf you share the Gospel with the same person (people) on another day or at another event count it each time.') },
      { id: 'salvation', label: L('구원 (추수) — 이 복음 대화를 통해 예수님을 믿는다고 고백한 사람', 'Salvation (Reap the Harvest) — people who indicated they believed in Jesus Christ for salvation through these Gospel conversations'), short: L('구원', 'Salvations') },
      { id: 'literature', label: L('복음 전도지 — 복음 대화 없이 나눠 준 전도지 등 자료의 수', 'Gospel Literature — tracts or similar literature distributed without a Gospel conversation'), short: L('전도지', 'Literature') },
      { id: 'social', label: L('SNS 전도 — 위에서 세지 않은 전도 게시물·릴스·영상 등으로 도달한 사람', 'Evangelistic Social Media — people reached through evangelistic posts, reels, videos or other content not counted above'), short: L('SNS 도달', 'Social media reach') },
    ],
  },
  {
    id: 'camps', access: 'designated', scope: 'report', title: L('캠프', 'Camps'),
    fields: [
      { id: 'campCount', label: L('캠프 횟수 — 이번 달에 열린 캠프 수(하루 이상)', 'Camps — how many camps were held this month (one day or longer)'), short: L('캠프 횟수', 'Camps held') },
      { id: 'campAttendance', label: L('캠프 참석 인원 — 이 캠프들에 참석한 캠퍼와 캠프 크루', 'Camp Attendance — campers and camp crew members who attended these camps'), short: L('캠프 참석 인원', 'Camp attendance') },
      { id: 'campSalvations', label: L('구원 — 캠프에서 예수님을 믿는다고 고백한 사람', 'Salvations — people who indicated they believed in Jesus for salvation during these camps'), short: L('캠프 구원', 'Camp salvations') },
      { id: 'campDedications', label: L('헌신 — 캠프에서 삶을 예수님께 헌신한 사람', 'Dedications — people who dedicated their life to Jesus during these camps'), short: L('캠프 헌신', 'Camp dedications'), note: L('\'헌신\'은 믿는 사람이 자기 삶 전체를 주님께 드리기로 결단하는 것이에요 (롬 12:1–2).', 'A ‘dedication’ decision is when a professing believer commits their whole life to the LORD (ROM 12:1-2).') },
    ],
  },
  {
    id: 'events', access: 'all', scope: 'report', title: L('전도 행사', 'Evangelistic Events'),
    fields: [
      { id: 'eeAttendance', label: L('월코 행사 참석 인원 — 복음을 전한 전도 행사(스포츠, 수련회, 세미나, 지역 교회 사역 등)에 참석한 인원', 'EE Attendance — people who attended evangelistic events (sports, retreats, seminars, local church ministries, etc.) where you and/or your team shared the Gospel'), short: L('월코 행사 참석 인원', 'WOLKO event attendance'), note: L('복음 전도 보고 지침\nA. 세는 것: 개인이나 소그룹으로 복음을 전한 사람 수는 개인 전도의 ‘복음 들은 인원’에 세요. 큰 모임에서 팀원이 복음을 전하는 것을 들은 사람 수는 ‘월코 행사 참석 인원’에 세요. 같은 사람에게 다른 날이나 다른 행사에서 다시 전했다면 그때마다 세어요.\nB. 세지 않는 것: 월코의 공식 임무나 협력으로 섬기면서 복음을 전한 경우가 아니면 행사 참석 인원은 세지 않아요. 중복해서 세지 마세요. 팀에서는 한 명만 참석 인원을 보고하세요. 행사 중의 개인 복음 대화와 소그룹 발표는 ‘월코 행사 참석 인원’이 아니라 ‘복음 들은 인원’으로 보고하세요.\nC. 예외 — 다른 사람을 도울 때: 월코의 공식 임무나 협력으로 섬기는데 월코 밖의 사람이 복음을 전했다면, 그 참석 인원을 ‘월코 행사 참석 인원’에 셀 수 있어요. 다만 같은 청중이 대부분인 행사가 정기적으로 반복되면 첫 행사와 그 이후 분기마다 한 번만 세어요.', 'Guidelines for Reporting Gospel Reach\nA. What to Count: Count the number of people you or your team shared the Gospel with individually or in small groups under Personal Evangelism (Heard the Gospel). Count the number of people in a large group who heard someone on your team share the Gospel under Evangelistic Event Attendance. If you or your team share the Gospel with the same person (people) on another day or at another event count it each time.\nB. What NOT to Count: Do not count attendance at an event unless you are serving through an official Word of Life assignment or partnership AND sharing the Gospel with them. Do not double-count. Only one staff member should report attendance for the team. Personal Gospel conversations and small-group presentations during an event should be reported under Personal Evangelism (Heard the Gospel), not Evangelistic Event Attendance.\nC. Exception – Assisting Others: If you or your team are serving through an official Word of Life assignment or partnership AND someone OUTSIDE Word of Life presents the Gospel, you may count the attendance under Evangelistic Event Attendance. However, if this event is repeated regularly with mostly the same audience, ONLY count the attendance at the first event and once every quarter afterward.') },
      { id: 'eeSalvations', label: L('구원 — 이 행사에서 예수님을 믿는다고 고백한 사람', 'Salvations — people who indicated they believed in Jesus for salvation during these events'), short: L('행사 구원', 'Event salvations') },
      { id: 'eeDedications', label: L('헌신 — 이 행사에서 삶을 예수님께 헌신한 사람', 'Dedications — people who dedicated their life to Jesus during these events'), short: L('행사 헌신', 'Event dedications'), note: L('\'헌신\'은 믿는 사람이 자기 삶 전체를 주님께 드리기로 결단하는 것이에요 (롬 12:1–2).', 'A ‘dedication’ decision is when a professing believer commits their whole life to the LORD (ROM 12:1-2).') },
    ],
  },
  {
    id: 'discipleship', access: 'designated', scope: 'ministry', title: L('제자훈련', 'Discipleship'),
    fields: [
      { id: 'bibleInstitute', label: L('성경 학교(Bible Institute) — 이번 달 등록 학생 수', 'Bible Institute — number of students enrolled this month'), short: L('성경 학교', 'Bible Institute'), snapshot: true },
      { id: 'dtc', label: L('제자훈련센터(DTC) — 성경 학교·직업 학교 등, 이번 달 등록 학생 수', 'Discipleship Training Center (Bible school, trade school or similar) — students enrolled this month'), short: L('제자훈련센터(DTC)', 'Discipleship Training Center'), snapshot: true },
      { id: 'symeE4l', label: L('SYME/E4L 제자훈련센터(ESL 중심) — 이번 달 등록 학생 수', 'SYME/E4L Discipleship Training Center (ESL focus) — students enrolled this month'), short: L('SYME/E4L', 'SYME/E4L'), snapshot: true },
      { id: 'school', label: L('초·중등 학교 — 이번 달 등록 학생 수', 'Primary/Secondary School — students enrolled this month'), short: L('초·중등 학교', 'Primary/Secondary school'), snapshot: true },
      { id: 'extension', label: L('확장 훈련(Extension) — 사역지 밖에서 열린 정식 성경 과정, 이번 달 등록 학생 수', 'Extension Training — formal Bible courses held off-property, students enrolled this month'), short: L('확장 훈련', 'Extension training'), snapshot: true },
      { id: 'conferences', label: L('컨퍼런스·기타 성경 교육 행사 — 이번 달 참석 인원 합계', 'Conferences and other Bible teaching events — total attendance this month'), short: L('컨퍼런스·성경 교육', 'Conferences & Bible teaching') },
    ],
  },
  {
    id: 'church', access: 'designated', scope: 'ministry', title: L('지역교회 사역', 'Local Church Ministries'),
    fields: [
      { id: 'churchA', label: L('A 등급 교회 — 가까운 관계: Bible Club 훈련, 자료 모두 사용, 대부분의 행사에 참석 (CRS 등급에서 자동)', 'A — local churches with a close relationship: Bible Club training, use all resources, attend most events (from CRS grades)'), short: L('연결 교회 A', 'Churches A'), snapshot: true, crs: true },
      { id: 'churchB', label: L('B 등급 교회 — 좋은 관계: 간헐적 훈련, 자료 일부 사용, 일부 행사 참석 (CRS 등급에서 자동)', 'B — local churches with a good relationship: sporadic training, use some resources, attend some events (from CRS grades)'), short: L('연결 교회 B', 'Churches B'), snapshot: true, crs: true },
      { id: 'churchC', label: L('C 등급 교회 — 좋은 연락: QT 일부 사용, 일부 행사 참석 (CRS 등급에서 자동)', 'C — local churches with good contact: some use of QT, attend some events (from CRS grades)'), short: L('연결 교회 C', 'Churches C'), snapshot: true, crs: true },
      { id: 'childrenClubs', label: L('어린이 클럽 — 이번 달 말 기준 클럽 수', 'Children Clubs — club count at the end of the month'), short: L('어린이 클럽', 'Children clubs'), snapshot: true },
      { id: 'youthClubs', label: L('청소년·학생 클럽 — 이번 달 말 기준 클럽 수', 'Youth/Teen/Student Clubs — club count at the end of the month'), short: L('청소년 클럽', 'Youth clubs'), snapshot: true },
      { id: 'leadershipTraining', label: L('리더십 훈련 참석 — 이번 달 훈련받은 리더 수 (CRS 교회 기록에서 자동)', 'Leadership Training Attendance — leaders trained this month (from CRS church records)'), short: L('리더십 훈련', 'Leadership training'), crs: true },
      { id: 'weeklyClubAttendance', label: L('주간 클럽 참석 — 모든 클럽 프로그램의 주간 평균 참석 인원 합계', 'Weekly Club Attendance — sum of the weekly average attendance of all club programs this month'), short: L('주간 클럽 참석', 'Weekly club attendance'), snapshot: true },
    ],
  },
];

export const GOSPEL_FIELDS = GOSPEL_SECTIONS.flatMap(section => section.fields.map(field => ({ ...field, section: section.id })));
export const GOSPEL_FIELD_IDS = GOSPEL_FIELDS.map(field => field.id);
export const SNAPSHOT_IDS = new Set(GOSPEL_FIELDS.filter(field => field.snapshot).map(field => field.id));
export const LOCATIONS = ['mainland', 'jeju'];
export const SCOPES = ['individual', 'team', 'ministry'];   // ministry = 평택·제주 월별 사역 현황(제자훈련·지역교회) — 지정 담당자가 위치마다 한 건을 함께 고친다
export const REPORT_PREFIX = 'gospel:rep:';
export const MAX_VALUE = 1_000_000;
export const MONTHS_BACK = 12;

/** 보고서에서 한 사람이 볼 수 있는 모든 항목의 합계가 0 인 빈 집계 */
export const emptyTotals = () => Object.fromEntries(GOSPEL_FIELD_IDS.map(id => [id, 0]));

export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

/** 한국 시간 기준 이번 달 'YYYY-MM' */
export function currentMonthKst(now = Date.now()) {
  return new Date(now + 9 * 3600000).toISOString().slice(0, 7);
}

/** 'YYYY-MM' 에서 n 달 전/후 */
export function shiftMonth(month, delta) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

/** 보고하는 달 — 월간 보고는 끝난 달(지난달)의 숫자를 낸다. 지금이 10월이면 9월 */
export function reportMonth(now = Date.now()) {
  return shiftMonth(currentMonthKst(now), -1);
}

/** 보고할 수 있는 달: 지난달부터 12개월 전까지(이번 달·미래 달은 안 된다) */
export function reportableMonth(month, now = Date.now()) {
  if (!MONTH_RE.test(String(month || ''))) return false;
  return month <= reportMonth(now) && month >= shiftMonth(currentMonthKst(now), -MONTHS_BACK);
}

/** 화면이 보낸 값에서 정의된 항목만 0 이상의 정수로 정리한다(비어 있으면 0) */
export function cleanValues(raw, allowed = GOSPEL_FIELD_IDS) {
  const out = {};
  for (const id of GOSPEL_FIELD_IDS) {
    if (!allowed.includes(id)) { out[id] = 0; continue; }      // 이 보고 유형·이 사람이 쓸 수 없는 항목은 0 으로 둔다
    const text = String(raw?.[id] ?? '').replace(/[,\s]/g, '');
    if (text === '') { out[id] = 0; continue; }
    const n = Number(text);
    if (!Number.isInteger(n) || n < 0 || n > MAX_VALUE) throw new Error(`INVALID:${id}`);
    out[id] = n;
  }
  return out;
}

export function cleanText(value, max) {
  return String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** 보고 유형(scope)과 작성자 권한에서 쓸 수 있는 항목 id — 개인 전도는 누구나, 캠프·행사는 지정 담당자의 개인/팀 보고, 제자훈련·지역교회는 지정 담당자의 사역 현황 보고 */
export function allowedFieldIds(scope, designated) {
  return GOSPEL_SECTIONS
    .filter(section => (scope === 'ministry' ? section.scope === 'ministry' : section.scope === 'report') && (section.access === 'all' || designated))
    .flatMap(section => section.fields.map(field => field.id));
}

/** 사역 현황 보고는 위치(평택/제주)마다 한 건 — 누가 쓰든 같은 번호라 지정 담당자들이 함께 고친다 */
export const ministryId = (env, location) => anonHex(env, 'unit', `ministry|${location}`, 6);

/** 같은 (계정, 개인/팀, 팀 이름) 은 같은 id — 달 안에서 한 단위가 한 건이 되게 한다 */
/* ───────── 익명 보관 ─────────
 * 보고에는 이름·이메일을 저장하지 않는다. 대신 서버 비밀값으로 만든 열쇠 달린 해시(HMAC)를 쓴다 —
 *   owner  = 보고한 사람 표식(내 보고 찾기·보고 여부 확인용)
 *   id     = 사람 + 개인/팀 + 팀 이름 단위의 보고 번호(같은 단위는 덮어쓴다)
 * 비밀값 없이는 이메일을 거꾸로 알아낼 수 없고, 저장된 시각도 날짜까지만 남긴다.
 * 서버는 로그인한 사람의 이메일로 같은 값을 다시 만들어 "내 보고"를 찾는다. 마스터·관리자의 제출 현황도 같은 방식으로
 * 계정 명단의 이메일마다 표식을 만들어 누구의 보고인지 맞춰 보여 준다(저장값에는 여전히 이름이 없다). */
export async function anonHex(env, label, text, bytes) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`gospel-anon:${env.ADMIN_PASSWORD || ''}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${label}|${text}`));
  return [...new Uint8Array(sig)].slice(0, bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
export const ownerOf = (env, email) => anonHex(env, 'owner', String(email).trim().toLowerCase(), 16);
export const unitId = (env, email, scope, teamName) => anonHex(env, 'unit', `${String(email).trim().toLowerCase()}|${scope}|${scope === 'team' ? String(teamName || '').toLowerCase() : ''}`, 6);

export const reportKey = (month, id) => `${REPORT_PREFIX}${month}:${id}`;

export async function loadMonth(env, month) {
  const keys = [];
  let cursor;
  do {
    const page = await env.CAMP_KV.list({ prefix: `${REPORT_PREFIX}${month}:`, ...(cursor ? { cursor } : {}), limit: 1000 });
    keys.push(...page.keys.map(k => k.name));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  const items = await Promise.all(keys.map(async key => migrateAnonymous(env, key, await env.CAMP_KV.get(key, 'json'))));
  return items.filter(Boolean);
}

/** 예전에 이름·이메일과 함께 저장된 보고는 읽을 때 익명 형식으로 바꿔 다시 저장한다 (한 번만) */
async function migrateAnonymous(env, key, report) {
  if (!report || !report.email || !env.ADMIN_PASSWORD) return report;
  const { email, name, ...rest } = report;
  const id = await unitId(env, email, report.scope, report.teamName);
  const reporter = report.scope === 'team' ? { reporterName: cleanText(name, 80), reporterEmail: String(email).trim().toLowerCase() } : {};   // 팀 보고는 누가 냈는지 남긴다
  const clean = { ...rest, ...reporter, id, owner: await ownerOf(env, email), createdAt: String(report.createdAt || '').slice(0, 10), updatedAt: String(report.updatedAt || '').slice(0, 10) };
  const nextKey = reportKey(report.month, id);
  await env.CAMP_KV.put(nextKey, JSON.stringify(clean));
  if (nextKey !== key) await env.CAMP_KV.delete(key);
  return clean;
}

/** 보고 목록 → { all, mainland, jeju } 합계 + 건수 */
export function summarize(reports) {
  const out = { all: emptyTotals(), mainland: emptyTotals(), jeju: emptyTotals(), counts: { all: 0, mainland: 0, jeju: 0, individual: 0, team: 0, ministry: 0 } };
  for (const report of reports) {
    const place = report.location === 'jeju' ? 'jeju' : 'mainland';
    for (const id of GOSPEL_FIELD_IDS) {
      const n = Number(report.values?.[id]) || 0;
      out.all[id] += n; out[place][id] += n;
    }
    if (report.scope === 'ministry') { out.counts.ministry++; continue; }   // 사역 현황은 '낸 보고 수'에 세지 않는다
    out.counts.all++; out.counts[place]++; out.counts[report.scope === 'team' ? 'team' : 'individual']++;
  }
  return out;
}

// CSV — 엑셀에서 수식으로 읽히지 않게 = + - @ 로 시작하는 글자는 앞에 ' 를 붙인다
const csvCell = value => {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};
export function toCsv(month, reports) {
  // 보고한 사람·팀을 알 수 있는 열(이름·이메일·팀·시각)은 넣지 않는다 — 위치·구분과 숫자만. 줄 순서도 숫자 합이 큰 순서라 보고 순서로 사람을 짐작할 수 없다
  const head = ['month', 'location', 'type', ...GOSPEL_FIELD_IDS];
  const total = r => GOSPEL_FIELD_IDS.reduce((n, id) => n + (Number(r.values?.[id]) || 0), 0);
  const rows = reports.slice().sort((a, b) => (a.location === 'jeju') - (b.location === 'jeju') || (a.scope === 'team') - (b.scope === 'team') || total(b) - total(a))
    .map(r => [month, r.location === 'jeju' ? 'Jeju' : 'Mainland', r.scope, ...GOSPEL_FIELD_IDS.map(id => r.values?.[id] ?? 0)]);
  return '﻿' + [head, ...rows].map(row => row.map(csvCell).join(',')).join('\r\n');
}

/* ───────── 교회별 행사 기록 (CRS 교회 목록에서 고른다) ─────────
 * 보고 한 건 안의 churchEntries: [{ id, churchId, churchName, event, date, students, salvations, dedications, note }]
 * churchId 는 CRS(Firebase churches)의 교회 번호, CRS 에 없는 교회는 이름만 직접 적는다(churchId 는 빈 값).
 * 메모(note)는 보고자와 마스터·관리자만 본다 — 합계 화면에는 내보내지 않는다.
 */
export const MAX_CHURCH_ENTRIES = 30;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ENTRY_ID_RE = /^[a-z0-9-]{1,40}$/;

export function cleanChurchEntries(raw) {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) throw new Error('INVALID:churchEntries');
  const out = [];
  for (const e of raw.slice(0, MAX_CHURCH_ENTRIES)) {
    const churchName = cleanText(e?.churchName, 80), event = cleanText(e?.event, 80), note = cleanText(e?.note, 300);
    const nums = {};
    for (const key of ['students', 'salvations', 'dedications']) {
      const text = String(e?.[key] ?? '').replace(/[,\s]/g, '');
      const n = text === '' ? 0 : Number(text);
      if (!Number.isInteger(n) || n < 0 || n > MAX_VALUE) throw new Error(`INVALID:${key}`);
      nums[key] = n;
    }
    const blank = !churchName && !event && !note && !nums.students && !nums.salvations && !nums.dedications;
    if (blank) continue;                                  // 아무것도 안 쓴 줄은 건너뛴다
    if (!churchName) throw new Error('INVALID:churchName');
    const date = DATE_RE.test(String(e?.date || '')) ? String(e.date) : '';
    out.push({
      id: ENTRY_ID_RE.test(String(e?.id || '')) ? String(e.id) : crypto.randomUUID(),
      churchId: cleanText(e?.churchId, 60), churchName, event, date, ...nums, note,
    });
  }
  return out;
}

/** 합계 화면용 — 메모·보고자 없이 행사 목록만(위치는 탭 거르기에 쓴다) */
export function churchEvents(reports) {
  const out = [];
  for (const r of reports) {
    for (const e of r.churchEntries || []) {
      out.push({ churchId: e.churchId || '', churchName: e.churchName, event: e.event || '', date: e.date || '', students: e.students || 0, salvations: e.salvations || 0, dedications: e.dedications || 0, location: r.location === 'jeju' ? 'jeju' : 'mainland' });
    }
  }
  return out;
}

/** CRS churches 레코드 → [{ id, name }] (연락처 등 다른 정보는 꺼내지 않는다) */
export function parseCrsChurches(records) {
  return Object.entries(records || {})
    .map(([id, value]) => ({ id, name: cleanText(value?.churchName, 80) }))
    .filter(c => c.name)
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

/** 여러 달의 summarize(+캠프) 결과를 한 해 누적으로 합친다 */
export function mergeSummaries(list) {
  const out = { all: emptyTotals(), mainland: emptyTotals(), jeju: emptyTotals(), counts: { all: 0, mainland: 0, jeju: 0, individual: 0, team: 0, ministry: 0 } };
  for (const item of list) {
    for (const place of ['all', 'mainland', 'jeju']) {
      for (const id of GOSPEL_FIELD_IDS) {
        const n = Number(item?.[place]?.[id]) || 0;
        if (SNAPSHOT_IDS.has(id)) { if (n > 0) out[place][id] = n; }   // 달말 현재 수는 더하지 않고 가장 최근 달의 값을 쓴다
        else out[place][id] += n;
      }
    }
    for (const key of Object.keys(out.counts)) out.counts[key] += Number(item?.counts?.[key]) || 0;
  }
  return out;
}

/** 달별 집계(합계·끝난 캠프·교회 행사)를 담아 두는 KV 키 — 개인정보 없이 숫자만. 보고가 바뀌면 지운다 */
export const AGG_KEY = month => `gospel:agg:${month}`;
export const AGG_VERSION = 2;
/** 지난달들은 거의 안 바뀌니 길게, 이번 달·지난달은 짧게(캠프 구원·헌신 체크가 늦게 들어올 수 있다) */
export function aggTtlSeconds(month, current) {
  const diff = (Number(current.slice(0, 4)) - Number(month.slice(0, 4))) * 12 + Number(current.slice(5)) - Number(month.slice(5));
  return diff >= 2 ? 6 * 3600 : 600;
}
