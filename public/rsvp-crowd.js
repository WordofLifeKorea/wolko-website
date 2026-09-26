// 실제 RSVP 참석 인원(totalGuests)만큼 미니어처 사람을 표지 아랫단에 채워 넣고,
// 화면을 자유롭게 가로지르며 돌아다니게 한다. 손 흔들기·불꽃놀이 구경 역할은 특정
// 인물에게 고정하지 않고, 몇 초마다 무작위로 다른 사람에게 옮겨가며 계속 바뀐다.

export const PALETTES = [
  { hair: '#2e1c12', shirt: '#c96a4a', pants: '#4a3226' },
  { hair: '#5a3a24', shirt: '#d9a441', pants: '#3d2c22' },
  { hair: '#1f1a17', shirt: '#8a9b6e', pants: '#4a4034' },
  { hair: '#3a2418', shirt: '#b5566b', pants: '#43302a' },
  { hair: '#2b1f18', shirt: '#6f8fa0', pants: '#3f2f28' },
  { hair: '#4a2f1f', shirt: '#e0b979', pants: '#3a2a22' },
];

export const MAX_VISIBLE = 10;
const ROLES = ['wave', 'lookup'];
const ROTATE_MIN_MS = 3200;
const ROTATE_JITTER_MS = 2200;

export function personMarkup(palette, index) {
  const dir = index % 2 === 0 ? 'r' : 'l';
  const duration = (16 + (index * 5) % 18).toFixed(1); // 16~34s, 인물마다 속도가 다르다
  const delay = (-((index * 6.7) % Number(duration))).toFixed(1); // 시작 지점을 서로 어긋나게 한다
  const bobDelay = (-(index % 5) * 0.13).toFixed(2);
  return `<span class="inv-person is-walk-${dir}" style="animation-duration:${duration}s;animation-delay:${delay}s">` +
    `<svg viewBox="0 0 20 30" style="animation-delay:${bobDelay}s">` +
    `<rect class="inv-person-leg inv-person-leg-l" x="6.3" y="19" width="2.6" height="9" rx="1.3" fill="${palette.pants}"/>` +
    `<rect class="inv-person-leg inv-person-leg-r" x="11.1" y="19" width="2.6" height="9" rx="1.3" fill="${palette.pants}"/>` +
    `<path class="inv-person-body" d="M5 21 C5 14 6.5 12 10 12 C13.5 12 15 14 15 21 Z" fill="${palette.shirt}"/>` +
    '<g class="inv-person-head-group">' +
    '<circle cx="10" cy="6.5" r="4.3" fill="currentColor"/>' +
    `<path d="M5.3 6.6 A4.7 4.7 0 0 1 14.7 6.6 L14.7 3.8 Q10 1 5.3 3.8 Z" fill="${palette.hair}"/>` +
    '</g>' +
    '</svg></span>';
}

export function renderCrowd(container, count) {
  const visible = Math.max(0, Math.min(Math.floor(count) || 0, MAX_VISIBLE));
  if (!visible) { container.innerHTML = ''; return; }
  let html = '';
  for (let i = 0; i < visible; i++) {
    html += personMarkup(PALETTES[i % PALETTES.length], i);
  }
  container.innerHTML = html;
}

// 사람 수보다 역할 종류가 적으면 있는 만큼만 배정한다(1명이면 손 흔들기만).
export function pickRoles(count, rng = Math.random) {
  const n = Math.max(0, Math.floor(count) || 0);
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const assignment = {};
  ROLES.slice(0, Math.min(ROLES.length, n)).forEach((role, i) => { assignment[indices[i]] = role; });
  return assignment;
}

function setRole(personEl, role) {
  personEl.classList.remove('is-lookup');
  // 팔(line)과 손(circle) 둘 다 같은 클래스를 쓰므로 first-match만 지우면
  // 손이 점처럼 남는다 — querySelectorAll로 둘 다 지운다.
  //
  // <g>로 묶어서 그룹 하나만 애니메이션하면 더 간단하겠지만, 실제로 확인해보니
  // 이 렌더러에서는 SVG <g>에 건 CSS animation(transform)이 아예 재생되지 않는다
  // (getAnimations()가 항상 빈 배열). line은 정상 재생되므로, line과 circle에
  // 똑같은 transform-origin·keyframe으로 각각 애니메이션을 걸어 항상 같은 각도로
  // 같이 돌게 만든다 — 결과적으로 그룹으로 묶은 것과 동일하게 움직인다.
  personEl.querySelectorAll('.inv-person-wave-arm').forEach(el => el.remove());
  if (role === 'wave') {
    const svg = personEl.querySelector('svg');
    const ns = 'http://www.w3.org/2000/svg';
    const arm = document.createElementNS(ns, 'line');
    arm.setAttribute('class', 'inv-person-arm inv-person-wave-arm');
    arm.setAttribute('x1', '13.5'); arm.setAttribute('y1', '14.5');
    arm.setAttribute('x2', '19'); arm.setAttribute('y2', '8.5');
    const hand = document.createElementNS(ns, 'circle');
    hand.setAttribute('class', 'inv-person-arm inv-person-wave-arm');
    hand.setAttribute('cx', '19'); hand.setAttribute('cy', '8.5'); hand.setAttribute('r', '1.5');
    hand.setAttribute('fill', 'currentColor');
    svg.appendChild(arm);
    svg.appendChild(hand);
  } else if (role === 'lookup') {
    personEl.classList.add('is-lookup');
  }
}

export function applyRoles(container, assignment) {
  Array.from(container.children).forEach((person, i) => setRole(person, assignment[i] || null));
}

export function initCrowd(doc = document, request = fetch) {
  const people = doc.getElementById('invPeople');
  if (!people) return;
  let newestRequest = 0;
  let rotateTimer = null;

  function scheduleRoleRotation() {
    clearTimeout(rotateTimer);
    const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) return;
    const count = people.children.length;
    if (!count) return;
    applyRoles(people, pickRoles(count));
    rotateTimer = setTimeout(scheduleRoleRotation, ROTATE_MIN_MS + Math.random() * ROTATE_JITTER_MS);
  }

  async function refresh() {
    const sequence = ++newestRequest;
    try {
      const response = await request('/api/rsvp-count?eventId=' + encodeURIComponent(people.dataset.eventId));
      if (!response.ok) return;
      const data = await response.json();
      if (sequence !== newestRequest) return;
      const total = Math.max(0, Math.floor(Number(data.totalGuests) || 0));
      people.hidden = total === 0;
      renderCrowd(people, total);
      scheduleRoleRotation();
    } catch { /* 장식용 정보이니 실패해도 초대장 사용에는 지장이 없다 */ }
  }

  doc.addEventListener('rsvp:submitted', refresh);
  refresh();
}

if (typeof document !== 'undefined') initCrowd();
