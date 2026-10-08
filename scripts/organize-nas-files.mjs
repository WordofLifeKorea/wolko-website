import { readFile, writeFile } from 'node:fs/promises';
const token = process.env.TEACH_NAS_TOKEN;
if (!token || token.length < 32) throw new Error('Server credential required');
const site = process.env.TEACH_SITE_ORIGIN || 'https://wolko.org';
const nas = process.env.TEACH_NAS_URL || 'https://files.wolko.org';
if (![site, nas].every(url => new URL(url).protocol === 'https:')) throw new Error('HTTPS required');
const records = [];
for (const path of ['/private/tmp/wolko-nas-migration.json', '/private/tmp/wolko-private-nas-migration.json']) {
  records.push(...JSON.parse(await readFile(path, 'utf8')).verified);
}
const report = { organized:[], failed:[] };
for (const record of records) {
  try {
    const response = await fetch(`${site}/api/teach/nas-migrate`, { method:'POST',
      headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json' },
      body:JSON.stringify({ action:'organize', key:record.key }), redirect:'manual', signal:AbortSignal.timeout(120000) });
    if (response.status !== 200) throw new Error(`Organization failed (${response.status})`);
    const result = await response.json();
    const file = await fetch(`${nas}/files/${record.nasKey}`, { headers:{ Authorization:`Bearer ${token}` },
      redirect:'manual', signal:AbortSignal.timeout(120000) });
    if (file.status !== 200) throw new Error('Download verification failed');
    const bytes = await file.arrayBuffer();
    const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), n => n.toString(16).padStart(2, '0')).join('');
    if (hash !== record.sha256 || bytes.byteLength !== record.bytes) throw new Error('Bytes changed');
    report.organized.push({ key:record.key, ...result });
  } catch (error) { report.failed.push({ key:record.key, error:error.message }); }
  await writeFile('/private/tmp/wolko-nas-readable-paths.json', JSON.stringify(report, null, 2), { mode:0o600 });
  console.log(JSON.stringify({ organized:report.organized.length, failed:report.failed.length, total:records.length }));
}
if (report.failed.length) process.exitCode = 1;
