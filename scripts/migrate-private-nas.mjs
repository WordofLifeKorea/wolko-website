import { writeFile } from 'node:fs/promises';
import { PRIVATE_FILE_PREFIXES } from '../functions/lib/nasFileKV.js';

const token = process.env.TEACH_NAS_TOKEN;
if (!token || token.length < 32) throw new Error('Server credential required');
const origin = process.env.TEACH_SITE_ORIGIN || 'https://wolko.org';
if (new URL(origin).protocol !== 'https:') throw new Error('HTTPS required');
const path = process.env.PRIVATE_MIGRATION_REPORT || '/private/tmp/wolko-private-nas-migration.json';
async function call(input) {
  const response = await fetch(`${origin}/api/teach/nas-migrate`, { method:'POST',
    headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
    body:JSON.stringify(input), redirect:'manual', signal:AbortSignal.timeout(300000) });
  if (!response.ok) throw new Error(`Migration failed (${response.status})`);
  return response.json();
}
const report = { startedAt:new Date().toISOString(), groups:{}, verified:[], failed:[] };
for (const prefix of PRIVATE_FILE_PREFIXES) {
  const keys = new Set();
  let cursor = '';
  do {
    const page = await call({ action:'private-list', prefix, cursor });
    page.keys.forEach(key => keys.add(key));
    if (page.complete) break;
    if (!page.cursor || page.cursor === cursor) throw new Error('Invalid cursor');
    cursor = page.cursor;
  } while (true);
  report.groups[prefix] = keys.size;
  console.log(JSON.stringify({ prefix, discovered:keys.size }));
  for (const key of keys) {
    try {
      const record = await call({ action:'private-copy', key });
      report.verified.push({ key, ...record });
    } catch (error) { report.failed.push({ key, error:error.message }); }
    await writeFile(path, JSON.stringify(report, null, 2), { mode:0o600 });
    console.log(JSON.stringify({ verified:report.verified.length, failed:report.failed.length }));
  }
}
report.completedAt = new Date().toISOString();
await writeFile(path, JSON.stringify(report, null, 2), { mode:0o600 });
console.log(JSON.stringify({ report:path, groups:report.groups, verified:report.verified.length,
  failed:report.failed.length, bytes:report.verified.reduce((sum, x) => sum + x.bytes, 0) }));
if (report.failed.length) process.exitCode = 1;
