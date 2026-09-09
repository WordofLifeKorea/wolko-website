export const REMINDER_DAYS = 180;
const DAY = 86400000;

function timestamp(value) {
  if (value == null || value === '') return 0;
  const result = typeof value === 'number' ? value : Date.parse(value);
  return Number.isFinite(result) && result > 0 ? result : 0;
}

export function lastActivity(church) {
  return Math.max(timestamp(church.updatedAt), timestamp(church.createdAt),
    timestamp(church.lastVisitDate), timestamp(church.visitDate), ...Object.values(church.visits || {}).filter(Boolean).flatMap(visit =>
      [timestamp(visit.date), timestamp(visit.recordedAt)]));
}

export function overdueChurches(churches, now = Date.now()) {
  return churches.map(church => {
    const activityAt = lastActivity(church);
    return { ...church, activityAt, inactiveDays: Math.floor((now - activityAt) / DAY) };
  }).filter(church => church.activityAt > 0 && church.inactiveDays >= REMINDER_DAYS)
    .sort((a, b) => b.inactiveDays - a.inactiveDays);
}
