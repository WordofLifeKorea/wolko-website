export const DENOMINATION_FILTERS = [
  { id: 'presbyterian', ko: '장로교', en: 'Presbyterian' },
  { id: 'baptist', ko: '침례교', en: 'Baptist' },
  { id: 'full-gospel', ko: '순복음', en: 'Full Gospel' },
  { id: 'methodist', ko: '감리', en: 'Methodist' },
  { id: 'holiness', ko: '성결교', en: 'Holiness' },
  { id: 'anglican', ko: '성공회', en: 'Anglican' },
  { id: 'independent', ko: '독립교단', en: 'Independent' },
];

export function denominationFamily(value) {
  const name = String(value || '').replace(/\s+/g, '').toLowerCase();
  if (/^(기장|예장|장로교|장로회|presbyterian)/.test(name)) return 'presbyterian';
  if (/^(기침|성침|침례|baptist)/.test(name)) return 'baptist';
  if (/^(순복음|fullgospel)/.test(name)) return 'full-gospel';
  if (/^(감리|기감|methodist)/.test(name)) return 'methodist';
  if (/^(기성|예성|성결|holiness)/.test(name)) return 'holiness';
  if (/^(성공회|대한성공회|anglican)/.test(name)) return 'anglican';
  if (/^(독립교단|독립교회|independent)/.test(name)) return 'independent';
  return null;
}
