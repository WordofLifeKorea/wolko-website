/**
 * 캠프 신청 자동 오픈 스크립트
 * open_date가 현재 시각을 지난 upcoming 캠프를 open으로 전환
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = 'src/content/camp_schedules';
const files = readdirSync(dir).filter(f => f.endsWith('.json'));
const now = Date.now();

let changed = 0;

for (const file of files) {
  const path = join(dir, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));

  if (data.status === 'upcoming' && data.open_date) {
    const openTime = new Date(data.open_date).getTime();

    if (openTime <= now) {
      console.log(`오픈 처리: ${data.title_ko ?? file}`);
      data.status = 'open';
      delete data.open_date;
      writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
      changed++;
    } else {
      const remainMs = openTime - now;
      const remainMin = Math.round(remainMs / 60000);
      console.log(`대기 중: ${data.title_ko ?? file} (오픈까지 약 ${remainMin}분)`);
    }
  }
}

console.log(changed > 0 ? `\n총 ${changed}개 캠프 오픈 처리 완료` : '\n오픈할 캠프 없음');
