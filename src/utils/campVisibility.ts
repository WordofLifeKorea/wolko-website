type CampSchedule = {
  data: {
    status?: string;
    show_when_closed?: boolean;
    start_date?: string;
  };
};

export function hasCampStarted(startDate?: string) {
  if (!startDate) return false;

  const startTime = Date.parse(startDate);
  return Number.isFinite(startTime) && startTime <= Date.now();
}

export function isCampVisibleOnPublicSite(schedule: CampSchedule) {
  return (schedule.data.status !== 'closed' || schedule.data.show_when_closed === true) && !hasCampStarted(schedule.data.start_date);
}
