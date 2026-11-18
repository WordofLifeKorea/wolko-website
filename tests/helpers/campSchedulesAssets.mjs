// 테스트용 env.ASSETS — 빌드 때 만들어지는 /camp-schedules.json 을 실제 캠프 일정 파일(src/content/camp_schedules)에서 흉내 낸다.
// capacity 가 없는 파일은 스키마 기본값(40)을 쓴다 — src/pages/camp-schedules.json.ts 와 같은 결과.
import { readFileSync, readdirSync } from 'node:fs';

const DIR = new URL('../../src/content/camp_schedules/', import.meta.url);

export function campSchedulesFromContent() {
  return readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => {
    const data = JSON.parse(readFileSync(new URL(f, DIR), 'utf8'));
    return { id: f.replace(/\.json$/, ''), capacity: data.capacity ?? 40 };
  });
}

/** list 를 주면 그 목록을, 없으면 실제 캠프 일정을 돌려준다. fail: true 면 읽기 실패(500)를 흉내 낸다. */
export function fakeAssets({ list, fail = false } = {}) {
  const calls = [];
  return {
    calls,
    fetch: async req => {
      const url = new URL(req.url ?? req);
      calls.push(url.pathname);
      if (fail || url.pathname !== '/camp-schedules.json') return new Response('not found', { status: fail ? 500 : 404 });
      return Response.json(list ?? campSchedulesFromContent());
    },
  };
}
