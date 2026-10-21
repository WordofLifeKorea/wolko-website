#!/bin/zsh
# 캠프팀 포털 로컬 실행: 빌드 → 임시 DB·파일 보관소 만들기(처음 한 번) → 개발 서버 (http://localhost:8788)
# 운영 웹사이트·데이터에는 접속하지 않는다. 파일은 .state 안의 임시 보관소에 저장된다.
set -e
cd "$(dirname "$0")/../.."
STATE=camp-team/dev/.state
CFG=camp-team/dev/wrangler.local.toml
node node_modules/astro/astro.js build
node camp-team/dev/make-dev-login.mjs
if [ ! -d "$STATE" ]; then
  for f in camp-team/db/0*.sql; do
    npx wrangler@4 d1 execute campteam-local --local --config $CFG --persist-to $STATE --file "$f"
  done
  npx wrangler@4 d1 execute campteam-local --local --config $CFG --persist-to $STATE --file camp-team/db/seed-dummy.sql
fi
exec npx wrangler@4 pages dev dist --d1 DB=00000000-0000-0000-0000-000000000000 --r2 CAMPTEAM_FILES --persist-to $STATE --port 8788 --ip 0.0.0.0 \
  --binding ADMIN_PASSWORD=local-dev-secret --binding CAMPTEAM_DEV_AUTH=1 ${=WRANGLER_EXTRA}
