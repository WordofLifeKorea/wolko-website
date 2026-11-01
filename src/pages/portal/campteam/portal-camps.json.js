import { getCollection } from 'astro:content';

/**
 * 캠프팀 "캠프별 공간"에서 월코 포털 캠프를 고를 때 쓰는 목록 (빌드 때 만들어지는 정적 파일).
 * 포털 캠프 관리자 화면이 쓰는 캠프 일정(camp_schedules)에서 제목·날짜·상태·캠프비 안내만 뽑는다. 신청자 정보는 들어 있지 않다.
 * 캠프팀이 앞서 준비하는 캠프는 여기 없을 수 있다 — 그런 캠프는 연결하지 않고 두면 된다.
 */
export async function GET() {
  const items = (await getCollection('camp_schedules')).map(({ id, data }) => ({
    id, titleKo: data.title_ko || id, titleEn: data.title_en || '', dateKo: data.date_ko || '', status: data.status || '', capacity: data.capacity ?? null,
    startDate: data.start_date ? new Date(data.start_date).toISOString().slice(0, 10) : '', priceKo: data.price_ko || '', deposit: data.deposit_amount ?? null,
    deadlineKo: data.deadline_ko || '', targetKo: data.target_ko || '',
    // 「신청서」 탭에서 지난 캠프 카드 내용으로 새 신청서를 시작할 때 쓰는 항목 (홈페이지 카드에 이미 공개된 안내 글)
    campType: data.camp_type || '', titleEnFull: data.title_en || '', dateEn: data.date_en || '', targetEn: data.target_en || '', priceEn: data.price_en || '', deadlineEn: data.deadline_en || '', notesKo: data.notes_ko || '', notesEn: data.notes_en || '', contactPhone: data.contact_phone || '', contactEmail: data.contact_email || '',
    raw: data,   // 홈페이지 캠프 파일의 모든 칸 — 새 신청서를 만들 때 지난 캠프 내용을 그대로 불러오는 데 쓴다(홈페이지 카드에 이미 공개된 안내 글)
  })).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  return new Response(JSON.stringify({ items }), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
