// Visual milestones only, not an attendance target or venue capacity.
export const giftMilestones = [1, 10, 20, 35, 50];

export function celebrationState(value) {
  const number = Number(value);
  const total = Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0;
  return { total, progress: Math.min(1, total / giftMilestones.at(-1)), gifts: giftMilestones.filter(milestone => total >= milestone).length };
}

export function initCelebration(doc = document, request = fetch) {
  const box = doc.getElementById('invGathering');
  if (!box) return;
  const status = doc.getElementById('invGatheringStatus');
  const gifts = [...box.querySelectorAll('.inv-gift')];
  let newestRequest = 0;
  let currentGifts = 0;

  async function refresh() {
    const sequence = ++newestRequest;
    try {
      const response = await request('/api/rsvp-count?eventId=' + encodeURIComponent(box.dataset.eventId));
      if (!response.ok) return;
      const data = await response.json();
      if (sequence !== newestRequest) return;
      const state = celebrationState(data.totalGuests);
      box.hidden = false;
      box.style.setProperty('--gathering-progress', state.progress);
      status.textContent = state.total ? `지금 ${state.total.toLocaleString('ko-KR')}명이 함께하기로 했어요` : '첫 번째 감사의 선물을 함께 채워 주세요';
      gifts.forEach((gift, index) => {
        gift.classList.toggle('is-new', index >= currentGifts && index < state.gifts);
        gift.classList.toggle('is-filled', index < state.gifts);
      });
      currentGifts = state.gifts;
    } catch { /* Keep the invitation usable when the decorative count is unavailable. */ }
  }

  if ('IntersectionObserver' in globalThis) {
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        box.classList.add('is-visible');
        observer.disconnect();
      }
    }, { threshold: 0.25 });
    observer.observe(box);
  } else {
    box.classList.add('is-visible');
  }
  doc.addEventListener('rsvp:submitted', refresh);
  refresh();
}

if (typeof document !== 'undefined') initCelebration();
