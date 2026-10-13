(function (root) {
  function seasonFor(camp) {
    if (camp.seasonId) return camp.seasonId;
    const text = `${camp.id || camp.campId || ''} ${camp.title || camp.campTitleKo || camp.campName || camp.campTitle || ''} ${camp.dateKo || ''}`;
    const date = String(camp.startDate || '');
    const year = date.match(/^20\d{2}/)?.[0] || text.match(/20\d{2}/)?.[0];
    if (!year) return 'other';
    if (/winter|겨울/i.test(text)) return `${year}-winter`;
    if (/summer|여름/i.test(text)) return `${year}-summer`;
    const month = Number(date.slice(5, 7));
    if (month) return `${year}-${month <= 2 || month === 12 ? 'winter' : 'summer'}`;
    return `${year}-other`;
  }

  function build(schedules, registrations, defaults = []) {
    const camps = new Map();
    for (const camp of [...defaults, ...schedules]) camps.set(camp.id, { ...camp });
    for (const reg of registrations) {
      if (!reg.campId || camps.has(reg.campId)) continue;
      camps.set(reg.campId, {
        id: reg.campId,
        title: reg.campTitleKo || reg.campName || reg.campTitle || reg.campId,
        seasonId: reg.seasonId,
        startDate: reg.startDate || reg.campStartDate,
        dateKo: reg.campDateKo || '',
        capacity: null,
      });
    }
    const seasons = new Map();
    for (const camp of camps.values()) {
      const seasonId = seasonFor(camp);
      const [year, term] = seasonId.split('-');
      if (!seasons.has(seasonId)) seasons.set(seasonId, {
        id: seasonId,
        label: seasonId === 'other' ? '기타 캠프' : `${year} ${term === 'winter' ? '겨울' : term === 'summer' ? '여름' : '기타'}`,
        groups: [],
      });
      const season = seasons.get(seasonId);
      const text = `${camp.id} ${camp.title}`;
      const groupId = camp.group || (/union|unity|연합/i.test(text) ? 'union' : /school|학교|siheung|시흥|초등영어/i.test(text) ? 'school' : /jeju|제주/i.test(text) ? 'jeju' : 'wolko');
      let group = season.groups.find(g => g.group === groupId);
      if (!group) {
        group = { group: groupId, label: { union: '연합캠프', school: '교회 및 학교 캠프', jeju: '제주 캠프', wolko: 'WOLKO 캠프' }[groupId] || groupId, camps: [] };
        season.groups.push(group);
      }
      group.camps.push(camp);
    }
    return [...seasons.values()].sort((a, b) => a.id.localeCompare(b.id));
  }
  root.WolkoCampCatalog = { build, seasonFor };
})(globalThis);
