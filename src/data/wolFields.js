// 세계 Word of Life 사역지 — 홈 '한국에서 세계로' 지도에 십자가로 찍는다.
// 출처: Word of Life 선교 사이트의 사역지 목록 https://missions.wol.org/locations/ (2026-11-01 확인)
// 좌표는 지도에 점을 찍기 위한 대략의 위치(나라 가운데쯤)다.
//
// 안전을 위해 지도에서 뺀 곳 — 다시 넣을 때는 이 기준을 먼저 확인한다:
// - 오픈도어 2026 세계 기독교 박해 순위(World Watch List) 50위 안의 나라:
//   방글라데시, 차드, 콜롬비아, 에티오피아, 멕시코, 모잠비크, 니카라과, 니제르, 나이지리아
// - 미국 국무부 여행 경보 4단계(여행 금지) 나라: 러시아, 우크라이나, 베네수엘라
// - 베트남: 월코 홈페이지에서는 공개하지 않기로 함(2026-10)
// - 이름 없이 'Asia 1', 'Asia 2'로만 적힌 곳

export const KOREA = { ko: '대한민국', en: 'South Korea', lat: 36.5, lon: 127.8 };

export const WOL_REGIONS = [
  { id: 'asia', ko: '아시아 · 태평양', en: 'Asia & Pacific' },
  { id: 'europe', ko: '유럽', en: 'Europe' },
  { id: 'africa', ko: '아프리카', en: 'Africa' },
  { id: 'north', ko: '북미 · 카리브해', en: 'North America & Caribbean' },
  { id: 'latin', ko: '중남미', en: 'Central & South America' },
];

export const WOL_FIELDS = [
  // 아시아 · 태평양
  { region: 'asia', ko: '일본', en: 'Japan', lat: 36.2, lon: 138.3 },
  { region: 'asia', ko: '대만', en: 'Taiwan', lat: 23.7, lon: 121.0 },
  { region: 'asia', ko: '필리핀', en: 'Philippines', lat: 12.9, lon: 121.8 },
  { region: 'asia', ko: '태국', en: 'Thailand', lat: 15.9, lon: 101.0 },
  { region: 'asia', ko: '호주', en: 'Australia', lat: -27.0, lon: 135.0 },
  { region: 'asia', ko: '뉴질랜드', en: 'New Zealand', lat: -41.0, lon: 174.0 },
  { region: 'asia', ko: '파푸아뉴기니', en: 'Papua New Guinea', lat: -6.3, lon: 143.9 },
  { region: 'asia', ko: '피지', en: 'Fiji', lat: -17.7, lon: 178.1 },
  { region: 'asia', ko: '바누아투', en: 'Vanuatu', lat: -15.4, lon: 166.9 },
  // 유럽
  { region: 'europe', ko: '영국', en: 'United Kingdom', lat: 54.0, lon: -2.5 },
  { region: 'europe', ko: '프랑스', en: 'France', lat: 46.6, lon: 2.2 },
  { region: 'europe', ko: '스페인', en: 'Spain', lat: 40.4, lon: -3.7 },
  { region: 'europe', ko: '포르투갈', en: 'Portugal', lat: 39.4, lon: -8.2 },
  { region: 'europe', ko: '독일', en: 'Germany', lat: 51.2, lon: 10.4 },
  { region: 'europe', ko: '오스트리아', en: 'Austria', lat: 47.5, lon: 14.5 },
  { region: 'europe', ko: '이탈리아', en: 'Italy', lat: 42.8, lon: 12.6 },
  { region: 'europe', ko: '체코', en: 'Czech Republic', lat: 49.8, lon: 15.5 },
  { region: 'europe', ko: '폴란드', en: 'Poland', lat: 51.9, lon: 19.1 },
  { region: 'europe', ko: '헝가리', en: 'Hungary', lat: 47.2, lon: 19.5 },
  { region: 'europe', ko: '루마니아', en: 'Romania', lat: 45.9, lon: 25.0 },
  { region: 'europe', ko: '불가리아', en: 'Bulgaria', lat: 42.7, lon: 25.5 },
  { region: 'europe', ko: '세르비아', en: 'Serbia', lat: 44.0, lon: 21.0 },
  { region: 'europe', ko: '몬테네그로', en: 'Montenegro', lat: 42.7, lon: 19.4 },
  { region: 'europe', ko: '리투아니아', en: 'Lithuania', lat: 55.2, lon: 23.9 },
  // 아프리카
  { region: 'africa', ko: '케냐', en: 'Kenya', lat: 0.0, lon: 37.9 },
  { region: 'africa', ko: '우간다', en: 'Uganda', lat: 1.4, lon: 32.3 },
  { region: 'africa', ko: '르완다', en: 'Rwanda', lat: -1.9, lon: 29.9 },
  { region: 'africa', ko: '말라위', en: 'Malawi', lat: -13.3, lon: 34.3 },
  { region: 'africa', ko: '짐바브웨', en: 'Zimbabwe', lat: -19.0, lon: 29.2 },
  { region: 'africa', ko: '남아프리카 공화국', en: 'South Africa', lat: -30.6, lon: 22.9 },
  { region: 'africa', ko: '토고', en: 'Togo', lat: 8.6, lon: 0.8 },
  { region: 'africa', ko: '라이베리아', en: 'Liberia', lat: 6.4, lon: -9.4 },
  // 북미 · 카리브해
  { region: 'north', ko: '미국', en: 'United States', lat: 39.5, lon: -98.0 },
  { region: 'north', ko: '캐나다', en: 'Canada', lat: 46.5, lon: -75.0 },
  { region: 'north', ko: '버뮤다', en: 'Bermuda', lat: 32.3, lon: -64.8 },
  { region: 'north', ko: '바하마', en: 'Bahamas', lat: 25.0, lon: -77.4 },
  { region: 'north', ko: '케이맨 제도', en: 'Cayman Islands', lat: 19.3, lon: -81.3 },
  { region: 'north', ko: '자메이카', en: 'Jamaica', lat: 18.1, lon: -77.3 },
  { region: 'north', ko: '도미니카 공화국', en: 'Dominican Republic', lat: 18.7, lon: -70.2 },
  { region: 'north', ko: '푸에르토리코', en: 'Puerto Rico', lat: 18.2, lon: -66.6 },
  { region: 'north', ko: '신트마르턴', en: 'Sint Maarten', lat: 18.0, lon: -63.1 },
  { region: 'north', ko: '아루바', en: 'Aruba', lat: 12.5, lon: -70.0 },
  { region: 'north', ko: '퀴라소', en: 'Curaçao', lat: 12.2, lon: -69.0 },
  { region: 'north', ko: '보네르', en: 'Bonaire', lat: 12.2, lon: -68.3 },
  { region: 'north', ko: '트리니다드 토바고', en: 'Trinidad and Tobago', lat: 10.7, lon: -61.2 },
  // 중남미
  { region: 'latin', ko: '과테말라', en: 'Guatemala', lat: 15.8, lon: -90.2 },
  { region: 'latin', ko: '벨리즈', en: 'Belize', lat: 17.2, lon: -88.7 },
  { region: 'latin', ko: '엘살바도르', en: 'El Salvador', lat: 13.8, lon: -88.9 },
  { region: 'latin', ko: '온두라스', en: 'Honduras', lat: 15.2, lon: -86.2 },
  { region: 'latin', ko: '코스타리카', en: 'Costa Rica', lat: 9.9, lon: -84.1 },
  { region: 'latin', ko: '파나마', en: 'Panama', lat: 8.5, lon: -80.8 },
  { region: 'latin', ko: '에콰도르', en: 'Ecuador', lat: -1.8, lon: -78.2 },
  { region: 'latin', ko: '페루', en: 'Peru', lat: -9.2, lon: -75.0 },
  { region: 'latin', ko: '가이아나', en: 'Guyana', lat: 4.9, lon: -58.9 },
  { region: 'latin', ko: '브라질', en: 'Brazil', lat: -14.2, lon: -51.9 },
  { region: 'latin', ko: '볼리비아', en: 'Bolivia', lat: -16.5, lon: -64.7 },
  { region: 'latin', ko: '파라과이', en: 'Paraguay', lat: -23.4, lon: -58.4 },
  { region: 'latin', ko: '칠레', en: 'Chile', lat: -33.4, lon: -70.6 },
  { region: 'latin', ko: '아르헨티나', en: 'Argentina', lat: -34.6, lon: -63.6 },
  { region: 'latin', ko: '우루과이', en: 'Uruguay', lat: -32.5, lon: -55.8 },
];
