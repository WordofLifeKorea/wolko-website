// 복음 통계의 "풀타임 선교사" 판정이 읽는 명단(이름만, 공개 정보) — 빌드할 때 인원 소개(team) 콘텐츠에서 만든다.
// 인원 소개 페이지의 category: missionary 가 풀타임 선교사, stw 는 단기 사역자다. 비활성(active: false)은 뺀다.
// 인원을 추가하거나 바꾸면 다음 배포 때 자동으로 따라온다.
import { getCollection } from 'astro:content';

export async function GET() {
  const missionaries = (await getCollection('team'))
    .filter(({ data }) => data.category === 'missionary' && data.active !== false)
    .map(({ data }) => ({ nameEn: data.name_en || '', nameKo: data.name_ko || '' }));
  return new Response(JSON.stringify(missionaries), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
