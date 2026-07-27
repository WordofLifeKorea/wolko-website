type CampSchedule = {
  data: {
    status?: string;
    start_date?: string;
  };
};

export function hasCampStarted(startDate?: string) {
  if (!startDate) return false;

  const startTime = Date.parse(startDate);
  return Number.isFinite(startTime) && startTime <= Date.now();
}

export function isCampVisibleOnPublicSite(schedule: CampSchedule) {
  return schedule.data.status !== 'closed' && !hasCampStarted(schedule.data.start_date);
}
