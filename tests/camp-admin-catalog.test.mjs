import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readdir } from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';

const page = await readFile(new URL('../src/pages/portal/wolkoadmin.astro', import.meta.url), 'utf8');
const catalogScript = await readFile(new URL('../public/wolko-camp-catalog.js', import.meta.url), 'utf8');
test('team operations panel follows staff applications and backup links at the bottom', () => {
  const panel = page.indexOf('id="campTeamPanel"');
  assert.ok(panel > page.indexOf('id="staffRegBody"'));
  assert.ok(panel > page.indexOf('<!-- ── CMS / SHEETS LINKS ── -->'));
  assert.match(page.slice(panel), /^id="campTeamPanel" hidden><\/div>\s*<\/div>\s*<!-- ── ACCOUNT/);
  assert.equal((page.match(/id="campTeamPanel"/g) || []).length, 1);
});
function contextFor(schedules, registrations) {
  const context = vm.createContext({
    document: { getElementById: () => ({ textContent: JSON.stringify(schedules) }) },
  });
  vm.runInContext(catalogScript, context);
  const start = page.indexOf('    const scheduledCamps');
  const end = page.indexOf('    const SEASON_LABEL_KEYS', start);
  const filterStart = page.indexOf('    function seasonCampIds');
  const filterEnd = page.indexOf('    function sortValue', filterStart);
  vm.runInContext(page.slice(start, end) + '\nlet allRegs = []; let activeSeason = "2027-winter"; let activeCamp = "all";\n' + page.slice(filterStart, filterEnd), context);
  context.input = registrations;
  vm.runInContext('allRegs = input; refreshCampCatalog(allRegs)', context);
  return context;
}
const schedules = [
  { id: '2026-inland-union', title: '2026 여름 연합캠프', capacity: 40, status: 'closed' },
  { id: '2027-school-winter', title: '2027 겨울 학교 캠프', capacity: 30 },
];
const registrations = [
  { regId: 'winter-staff', campId: '2027-winter-english', campTitleKo: '2027 겨울 영어 캠프', registrationType: 'staff' },
  { regId: 'school-staff', campId: '2027-school-winter', registrationType: 'staff' },
  { regId: 'union-staff', campId: '2026-inland-union', registrationType: 'staff' },
  { regId: 'unknown-staff', campId: 'partner-school', registrationType: 'staff' },
];
test('winter staff with a camp ID absent from the old fixed list are visible', () => {
  const ctx = contextFor(schedules, registrations);
  assert.equal(vm.runInContext('filteredRegs().some(r => r.regId === "winter-staff")', ctx), true);
  assert.equal(vm.runInContext('CAMP_LABELS["2027-winter-english"]', ctx), '2027 겨울 영어 캠프');
  assert.equal(vm.runInContext('CAMP_CAP["2027-winter-english"]', ctx), null);
});
test('all seasons include closed union camps, school camps and unknown IDs without duplicating staff', () => {
  const ctx = contextFor(schedules, registrations);
  vm.runInContext('activeSeason = "all"', ctx);
  assert.equal(vm.runInContext('filteredRegs().length', ctx), 4);
  assert.equal(vm.runInContext('visibleSeasonGroups("all").some(g => g.group === "school")', ctx), true);
  vm.runInContext('activeCamp = "2027-school-winter"', ctx);
  assert.equal(vm.runInContext('filteredRegs()[0].regId', ctx), 'school-staff');
  assert.equal(vm.runInContext('filteredRegs().length', ctx), 1);
});
test('schedule titles and capacities take priority over application metadata', () => {
  const ctx = contextFor(schedules, [{ campId: '2027-school-winter', campTitleKo: 'wrong title' }]);
  assert.equal(vm.runInContext('CAMP_LABELS["2027-school-winter"]', ctx), '2027 겨울 학교 캠프');
  assert.equal(vm.runInContext('CAMP_CAP["2027-school-winter"]', ctx), 30);
});
test('month identifies the season when schedule titles do not name it', () => {
  const ctx = contextFor([], []);
  assert.equal(vm.runInContext('WolkoCampCatalog.seasonFor({id:"2027-school",startDate:"2027-01-05"})', ctx), '2027-winter');
});

test('all real winter and archived summer schedules are selectable, including staff-only partner camps', async () => {
  const folder = new URL('../src/content/camp_schedules/', import.meta.url);
  const files = (await readdir(folder)).filter(name => name.endsWith('.json'));
  const actual = await Promise.all(files.map(async file => {
    const data = JSON.parse(await readFile(new URL(file, folder), 'utf8'));
    return { id: file.replace(/\.json$/, ''), title: data.title_ko, startDate: data.start_date, capacity: data.capacity ?? null };
  }));
  const input = actual.filter(c => /2027|2026-inland/.test(c.id)).map(c => ({ campId: c.id, regId: c.id, registrationType: 'staff' }));
  const ctx = contextFor(actual, input);
  const winterIds = vm.runInContext('[...seasonCampIds("2027-winter")]', ctx);
  for (const id of ['2027-wolko-winter', '2027-unity-winter', '2027-our-school-winter', '2027-siheung-jungang-elementary-english']) {
    assert.ok(winterIds.includes(id), id);
  }
  assert.equal(winterIds.includes('2027-winter-camp-1'), false, 'no empty placeholder camp');
  vm.runInContext('activeSeason = "2026-summer"', ctx);
  assert.equal(vm.runInContext('filteredRegs().length', ctx), 2);
  vm.runInContext('activeSeason = "2027-winter"; activeCamp = "2027-our-school-winter"', ctx);
  assert.equal(vm.runInContext('filteredRegs().length', ctx), 1);
});

test('start date provides a year for partner camps whose titles contain no year', () => {
  const ctx = contextFor([], []);
  assert.equal(vm.runInContext('WolkoCampCatalog.seasonFor({id:"partner",title:"교회 영어캠프",startDate:"2027-01-19"})', ctx), '2027-winter');
});

test('winter policy is in the same script scope as scholarship rendering', () => {
  assert.doesNotMatch(page, /define:vars=\{\{ winterCampPolicy/);
  assert.match(page, /id="adminWinterCampPolicy"/);
  const script = page.slice(page.indexOf('    const winterCampPolicy = JSON.parse'));
  const declarationEnd = script.indexOf('\n');
  const rendererStart = page.indexOf('    function renderScholarshipEditor(');
  const rendererEnd = page.indexOf('\n    function ', rendererStart + 1);
  const ctx = vm.createContext({
    document: { getElementById: () => ({ textContent: JSON.stringify({ version: 'winter-test', discounts: {} }) }) },
    registrationScholarshipLimit: () => 1,
    SCHOLARSHIP_DISCOUNTS: {},
    normalizeScholarshipDiscountsAdmin: () => ({}),
    scholarshipDiscountTextAdmin: () => '',
    camperEditMode: false,
    t: key => key,
    esc: String,
    formatAdminWon: String,
  });
  vm.runInContext(script.slice(0, declarationEnd), ctx);
  vm.runInContext(page.slice(rendererStart, rendererEnd), ctx);
  for (const version of ['', 'winter-test']) {
    ctx.reg = { scholarshipPolicyVersion: version };
    assert.match(vm.runInContext('renderScholarshipEditor(reg, () => "detail", 550000, 0, 550000)', ctx), /registration-detail-section/);
  }
});

test('admin camp cards can be reordered by long-press drag and the order is saved per season', async () => {
  const { readFileSync } = await import('node:fs');
  const page = readFileSync(new URL('../src/pages/portal/wolkoadmin.astro', import.meta.url), 'utf8');
  assert.match(page, /setupCardReorder/);
  assert.match(page, /CARD_ORDER_KEY = season => 'wolko-admin-card-order:' \+ season/);
  assert.match(page, /applySavedCardOrder\(wrap\);/);
  assert.match(page, /\.filter\(s => !isOtherSeason\(s\)\)/, "'기타' 시즌은 선택 목록에서 뺀다");
});

test('waitlist rank follows deposit confirmation order, then application order, per camp and gender', async () => {
  const vm = await import('node:vm');
  const { readFileSync } = await import('node:fs');
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(new URL('../public/wolko-waitlist.js', import.meta.url), 'utf8'), ctx);
  const regs = [
    { regId: 'a', campId: 'c', gender: 'male', isWaitlist: true, registeredAt: '2026-10-15T10:01:00Z' },
    { regId: 'b', campId: 'c', gender: 'male', isWaitlist: true, registeredAt: '2026-10-15T10:02:00Z', status: 'deposit', depositConfirmedAt: '2026-10-16T09:00:00Z' },
    { regId: 'c', campId: 'c', gender: 'male', isWaitlist: true, registeredAt: '2026-10-15T10:03:00Z', status: 'deposit', depositConfirmedAt: '2026-10-15T12:00:00Z' },
    { regId: 'd', campId: 'c', gender: 'female', isWaitlist: true, registeredAt: '2026-10-15T10:04:00Z' },
    { regId: 'e', campId: 'c', gender: 'male', isWaitlist: false, registeredAt: '2026-10-15T09:00:00Z' },
    { regId: 'f', campId: 'c', gender: 'male', isWaitlist: true, registeredAt: '2026-10-15T10:05:00Z', status: 'confirmed' },
  ];
  ctx.regs = regs;
  const rank = id => vm.runInContext(`WolkoWaitlist.rankFor(regs.find(r => r.regId === '${id}'), regs)`, ctx);
  assert.equal(rank('c'), 1, '예약금을 먼저 확인받은 사람이 1번');
  assert.equal(rank('b'), 2);
  assert.equal(rank('a'), 3, '예약금 확인 전은 신청 순서로 뒤에');
  assert.equal(rank('d'), 1, '여학생은 따로 센다');
  assert.equal(rank('e'), null, '예비가 아니면 순위 없음');
  assert.equal(rank('f'), null, '최종확정되면 예비에서 빠진다');
});
