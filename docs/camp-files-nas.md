# Camp resource storage on Synology

Status: NAS gateway deployed; authenticated PUT/GET and unauthorized 401 verified
on 2026-10-08. Camp resource migration verified 33 files (100,614,927 bytes).
Original Cloudflare payloads are retained. Private file migration uses the separate
script and mode-600 report described below; no physical source purge is performed.

User-confirmed target: Synology DS423+, volume1, 28.4TB free reported on
2026-10-08. Hostname: files.wolko.org. Free space is shared, not a dedicated quota.

## Storage layout

- File bytes: a dedicated NAS directory mounted into the camp-files container.
- Resource cards, uploader identity, folders and permissions: existing CAMP_KV.
- Browser uploads: existing authenticated /api/teach/upload endpoint.
- Browser downloads: existing /api/teach/file/<key> endpoint; NAS token stays server-side.
- New NAS files have nas- prefixed keys. Existing KV/R2 URLs keep working.
- Limits: 20MiB per file, four concurrent gateway uploads. Total capacity is the
  available NAS volume capacity, shared with other NAS services. RAID is not a backup.
- Download links retain the existing capability-link behavior: anyone who knows a
  file URL can download it. The gateway itself requires a token for all operations.

## DSM setup

1. Confirm the data volume and free space in Storage Manager. Create a dedicated
   folder /volume1/docker/wolko-camp-files, including its data subdirectory.
2. Copy nas/camp-files/server.mjs, Dockerfile and compose.yaml into that folder.
   The one-shot storage-init container sets only the dedicated data directory's
   owner to UID/GID 1000 and mode 700, then exits. Synology-created directories
   can otherwise retain read-only permissions. The running file service uses the non-root
   node user with all Linux capabilities dropped. Do not grant broad write
   permissions to the volume or use the DSM admin password.
3. Create a local .env containing TEACH_NAS_TOKEN=<random secret of at least 32
   characters>. Generate a new dedicated random token; do not reuse other credentials.
   Keep the file private and outside version control.
4. In Container Manager, create a Project using compose.yaml and build/start it.
   The gateway listens only on NAS loopback port 8088; do not forward that port.
5. Reuse the existing wolko-docs-nas Cloudflare Tunnel. Its container and
   ONLYOFFICE are on the observed wolko-docs_default Docker network. The compose
   file joins the gateway to that external network. Publish files.wolko.org to
   http://wolko-camp-files-camp-files-1:8080. Keep the docs.wolko.org route unchanged.
   TLS terminates at Cloudflare; no new router port, DSM exposure or WebDAV is needed.
   Do not rotate the existing tunnel token. CPU quotas are omitted because this
   NAS kernel rejects NanoCPUs; memory remains capped at 256MiB. This kernel also
   reports PIDs limits unsupported, so do not rely on that optional limit.
6. Set encrypted Cloudflare Pages production variables TEACH_NAS_URL to the HTTPS
   origin and TEACH_NAS_TOKEN to the same dedicated secret; then deploy Pages.
   Do this only after the gateway is reachable and authenticated round trips pass.

## Verification and operations

### Existing files

`scripts/migrate-teach-nas.mjs` copies legacy resource uploads sequentially through
the server-only maintenance endpoint. Load TEACH_NAS_TOKEN from the private NAS
setup environment, never from client JavaScript. Each file is SHA-256 verified
before a CAMP_KV mapping switches its original URL to NAS. Retries use deterministic
destinations and verify existing NAS bytes rather than overwriting them. Source
files remain intact. The local JSON report records keys, hashes, sizes and failures.
External links and unrelated website assets are not downloaded or migrated.

Physical files live under `/volume1/docker/wolko-camp-files/data/nas-UUID.ext/`:
`data` contains the original bytes; `metadata.json` contains type and download name.
Year/camp/category/uploader organization remains in resource-card metadata in
CAMP_KV, not separate disk folders. Do not rename these directories manually.
Deleting a resource card does not purge its physical upload. No automatic storage
purge or backup cleanup is part of this migration.

- Unauthorized requests must return 401. A valid token must allow PUT and GET of
  a nas-UUID.ext key. Verify an uploaded PDF, DOCX and ZIP through the portal.
- Test existing Cloudflare file URLs after activation. No mass migration is automatic.
- If NAS is offline or full, new uploads fail visibly instead of silently using KV.
- Back up the whole data directory (bytes and metadata together) using Hyper Backup
  or an equivalent off-device backup. Monitor volume space in DSM and set alerts.
- Keep NAS, Container Manager and the Node image patched. Inspect disk health.
- To stop NEW NAS uploads, remove both Pages NAS variables and redeploy. Existing
  NAS downloads also need those variables, so do not do this while relying on NAS
  links without first migrating them. For outages, restore gateway connectivity.
- DNS, container deployment, backups and storage billing/capacity are not changed
  by merely pushing this repository to Pages.

## Official references

- Container Manager projects: https://kb.synology.com/en-uk/DSM/help/ContainerManager/docker_project?version=7
- Cloudflare Tunnel: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/
# Private Portal Files

Portal documents and saved versions, expense receipts (including recoverable trash),
vehicle photos (including recoverable trash), and QT PDFs now use the same NAS gateway.
Their existing application permissions and download URLs remain unchanged.
Private bytes are stored as `data/.storage/private-UUID.bin/data`; original filename and type
remain in application metadata. The binary payload can also be a legacy JSON envelope.
Do not manually rename these folders or edit payloads through File Station.

`scripts/migrate-private-nas.mjs` uses only the server credential, checks SHA-256 of
each copied payload before publishing its mapping, and keeps original KV bytes.
Its mode-600 report defaults to `/private/tmp/wolko-private-nas-migration.json`.
New uploads store bytes on NAS and only a small pointer in KV. Account records,
folder structure, receipt ownership, and vehicle-use records remain in KV.

Deletion and temporary-upload expiry remove application access, not physical NAS
bytes. Physical cleanup requires a separate reviewed retention policy. Keep both
the NAS `data` directory and KV metadata backed up; either alone is incomplete.

## Readable folders

Browse `/volume1/docker/wolko-camp-files/data/자료` in File Station. Its folders are
`캠프 자료실`, `포탈 문서`, `문서 수정 이력`, `영수증`, `차량 사진`, and `QT`.
Recoverable receipt/photo backups are in each category's `휴지통` subfolder; temporary
receipts use `임시`. Original filenames receive an eight-character suffix to avoid
overwriting files with the same name. Vehicle photos include date, vehicle and user.

The immutable gateway objects remain in the hidden `.storage` directory. Ordinary
readable files are hard links (not duplicate byte storage). Legacy JSON-wrapped Word
uploads require a decoded readable copy; the gateway's original payload stays intact.
These folders are a browsing/archive view, not a new edit or permission interface.
Do not edit the linked contents manually: doing so also changes the gateway object.
Use the website for edits/deletion and keep the entire `data` tree backed up.

New uploads create readable paths automatically. `scripts/organize-nas-files.mjs`
organizes existing migrated files and rechecks each original SHA-256 after the move.
