# Camp resource storage on Synology

Status: integration code is ready, but NAS deployment, DNS/TLS, storage permissions
and Cloudflare production secrets must be configured before enabling it.
No existing file has been migrated or deleted.

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
   folder, for example /volume1/docker/wolko-camp-files. The volume1 path is only
   an example, not an assumed deployment target.
2. Copy nas/camp-files/server.mjs, Dockerfile and compose.yaml into that folder.
   The one-shot storage-init container sets only the dedicated data directory's
   owner to UID/GID 1000, then exits. The running file service uses the non-root
   node user with all Linux capabilities dropped. Do not grant broad write
   permissions to the volume or use the DSM admin password.
3. Create a local .env containing TEACH_NAS_TOKEN=<random secret of at least 32
   characters>. Generate a new dedicated random token; do not reuse other credentials.
   Keep the file private and outside version control.
4. In Container Manager, create a Project using compose.yaml and build/start it.
   The gateway listens only on NAS loopback port 8088; do not forward that port.
5. Configure DSM reverse proxy: HTTPS files.wolko.org:443 to HTTP localhost:8088.
   The user approved this hostname. Keep docs.wolko.org for ONLYOFFICE.
   Set a valid TLS certificate and allow at least 20MiB bodies and 120s upload time.
   Expose only HTTPS through the router; do not expose DSM administration or WebDAV
   for this feature. Ensure the existing docs reverse proxy is unchanged.
6. Set encrypted Cloudflare Pages production variables TEACH_NAS_URL to the HTTPS
   origin and TEACH_NAS_TOKEN to the same dedicated secret; then deploy Pages.
   Do this only after the gateway is reachable and authenticated round trips pass.

## Verification and operations

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
- DSM reverse proxy: https://kb.synology.com/DSM/tutorial/Quick_Start_Synology_SSO
