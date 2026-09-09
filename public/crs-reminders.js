export const REMINDER_DAYS = 180;
const DAY = 86400000;

function timestamp(value) {
  if (value == null || value === '') return 0;
  const result = typeof value === 'number' || /^\d{12,}$/.test(String(value).trim()) ? Number(value) : Date.parse(value);
  return Number.isFinite(result) && result > 0 ? result : 0;
}

export function lastActivity(church) {
  return Math.max(timestamp(church.updatedAt), timestamp(church.createdAt),
    timestamp(church.lastVisitDate), timestamp(church.visitDate), ...Object.values(church.visits || {}).filter(Boolean).flatMap(visit =>
      [timestamp(visit.date), timestamp(visit.recordedAt)]),
    ...Object.values(church.steps || {}).flat().filter(Boolean).flatMap(entry =>
      [timestamp(entry.date), timestamp(entry.recordedAt)]));
}

export function activityDays(church, now = Date.now()) {
  const activityAt = lastActivity(church);
  return activityAt ? Math.max(0, Math.floor((now - activityAt) / DAY)) : null;
}

export function lastVisitAt(church) {
  return Math.max(timestamp(church.lastVisitDate), timestamp(church.visitDate),
    ...Object.values(church.visits || {}).filter(Boolean).map(visit => timestamp(visit.date)));
}

export function visitDays(church, now = Date.now()) {
  const visitAt = lastVisitAt(church);
  // Count calendar days in Korea, independent of the viewer's timezone or edit time.
  const koreaDay = value => Math.floor((value + 9 * 3600000) / DAY);
  return visitAt ? koreaDay(now) - koreaDay(visitAt) : null;
}

export function overdueChurches(churches, now = Date.now()) {
  return churches.map(church => {
    const activityAt = lastActivity(church);
    return { ...church, activityAt, inactiveDays: Math.floor((now - activityAt) / DAY) };
  }).filter(church => church.activityAt > 0 && church.inactiveDays >= REMINDER_DAYS)
    .sort((a, b) => b.inactiveDays - a.inactiveDays);
}
