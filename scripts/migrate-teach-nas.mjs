import { writeFile } from 'node:fs/promises';

const token = process.env.TEACH_NAS_TOKEN;
if (!token || token.length < 32) throw new Error('Set the server-side TEACH_NAS_TOKEN');
const origin = process.env.TEACH_SITE_ORIGIN || 'https://wolko.org';
if (new URL(origin).protocol !== 'https:') throw new Error('HTTPS required');
const reportPath = process.env.TEACH_MIGRATION_REPORT || '/private/tmp/wolko-nas-migration.json';
async function call(input) {
  const response = await fetch(`${origin}/api/teach/nas-migrate`, { method:'POST',
    headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
    body:JSON.stringify(input), redirect:'manual', signal:AbortSignal.timeout(300000) });
  if (!response.ok) throw new Error(`Migration request failed (${response.status})`);
  return response.json();
}
const keys = [];
let cursor = '';
do {
  const page = await call({ action:'list', cursor });
  keys.push(...page.keys);
  if (page.complete) break;
  if (!page.cursor || page.cursor === cursor) throw new Error('Invalid listing cursor');
  cursor = page.cursor;
} while (true);
console.log(JSON.stringify({ discovered:keys.length }));
const report = { startedAt:new Date().toISOString(), total:keys.length, verified:[], failed:[] };
for (const key of new Set(keys)) {
  try {
    const record = await call({ action:'copy', key });
    // Check the original public URL after switching its mapping, without browser caching.
    const response = await fetch(`${origin}/api/teach/file/${encodeURIComponent(key)}?migration-check=${Date.now()}`, {
      signal:AbortSignal.timeout(120000), redirect:'manual',
    });
    if (response.status !== 200) throw new Error(`Legacy URL verification failed (${response.status})`);
    const bytes = await response.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
    if (bytes.byteLength !== record.bytes || hash !== record.sha256) throw new Error('Legacy URL content mismatch');
    report.verified.push({ key, ...record });
  } catch (error) { report.failed.push({ key, error:error.message }); }
  await writeFile(reportPath, JSON.stringify(report, null, 2), { mode:0o600 });
  console.log(JSON.stringify({ verified:report.verified.length, failed:report.failed.length, total:report.total }));
}
report.completedAt = new Date().toISOString();
await writeFile(reportPath, JSON.stringify(report, null, 2), { mode:0o600 });
console.log(JSON.stringify({ report:reportPath, verified:report.verified.length, failed:report.failed.length,
  bytes:report.verified.reduce((sum, x) => sum + x.bytes, 0) }));
if (report.failed.length) process.exitCode = 1;
