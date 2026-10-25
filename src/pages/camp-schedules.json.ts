// 복음 통계의 "캠프 자동 집계"가 읽는 캠프 일정 목록(공개 정보) — 빌드할 때 캠프 일정 콘텐츠에서 만든다.
// 새 캠프 일정을 추가하면 다음 배포 때 자동으로 따라온다.
import { getCollection } from 'astro:content';
import { campEndDate } from '../../functions/lib/campDates.js';

export async function GET() {
  const camps = (await getCollection('camp_schedules')).map(({ id, data }) => ({
    id, titleKo: data.title_ko || '', titleEn: data.title_en || '', startDate: String(data.start_date || ''), endDate: campEndDate(String(data.start_date || ''), data.date_ko || ''), dateKo: data.date_ko || '',
  }));
  return new Response(JSON.stringify(camps), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
