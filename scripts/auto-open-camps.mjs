import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const dir = 'src/content/camp_schedules';
const files = readdirSync(dir).filter(file => file.endsWith('.json'));
const now = Date.now();

let opened = 0;
let closed = 0;

for (const file of files) {
  const path = join(dir, file);
  const data = JSON.parse(readFileSync(path, 'utf8'));

  if (data.status !== 'closed' && data.start_date) {
    const startTime = Date.parse(data.start_date);

    if (Number.isFinite(startTime) && startTime <= now) {
      console.log(`Closing camp: ${data.title_ko ?? file}`);
      data.status = 'closed';
      delete data.open_date;
      delete data.staff_registration_open;
      writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
      closed++;
      continue;
    }
  }

  if (data.status === 'upcoming' && data.open_date) {
    const openTime = Date.parse(data.open_date);

    if (Number.isFinite(openTime) && openTime <= now) {
      console.log(`Opening camp: ${data.title_ko ?? file}`);
      data.status = 'open';
      delete data.open_date;
      writeFileSync(path, JSON.stringify(data, null, 2) + '\n');
      opened++;
    } else if (Number.isFinite(openTime)) {
      const remainMs = openTime - now;
      const remainMin = Math.round(remainMs / 60000);
      console.log(`Waiting to open: ${data.title_ko ?? file} (${remainMin} minutes left)`);
    }
  }
}

console.log(opened > 0 ? `Opened ${opened} camp(s)` : 'No camps to open');
console.log(closed > 0 ? `Closed ${closed} camp(s)` : 'No camps to close');
