#!/bin/zsh
# 캠프팀 포털 로컬 실행: 빌드 → 임시 DB·파일 보관소 만들기(처음 한 번) → 개발 서버 (http://localhost:8788)
# 운영 웹사이트·데이터에는 접속하지 않는다. 파일은 .state 안의 임시 보관소에 저장된다.
set -e
cd "$(dirname "$0")/../.."
STATE=camp-team/dev/.state
CFG=camp-team/dev/wrangler.local.toml
node node_modules/astro/astro.js build
node camp-team/dev/make-dev-login.mjs
# 마이그레이션은 한 번만: 적용한 파일은 $STATE/applied/ 에 표시한다 (새 마이그레이션이 생겨도 기존 로컬 DB에 이어서 적용됨)
FRESH=0
if [ ! -d "$STATE" ]; then FRESH=1; fi
mkdir -p "$STATE/applied"
if [ "$FRESH" = "0" ] && [ -z "$(ls -A $STATE/applied)" ]; then
  # 표시 기능이 생기기 전에 만든 로컬 DB: 0001~0008 은 이미 적용된 것으로 본다
  for f in camp-team/db/000[1-8]_*.sql; do touch "$STATE/applied/$(basename $f)"; done
fi
for f in camp-team/db/0*.sql; do
  [ -e "$STATE/applied/$(basename $f)" ] && continue
  npx wrangler@4 d1 execute campteam-local --local --config $CFG --persist-to $STATE --file "$f"
  touch "$STATE/applied/$(basename $f)"
  # 이미 만들어 둔 로컬 DB에 장부 마이그레이션을 이어서 적용한 경우, 장부 더미 자료도 한 번 넣는다
  if [ "$FRESH" = "0" ] && [ "$(basename $f)" = "0010_ledger.sql" ]; then
    npx wrangler@4 d1 execute campteam-local --local --config $CFG --persist-to $STATE --file camp-team/db/seed-dummy-ledger.sql
  fi
done
if [ "$FRESH" = "1" ]; then
  npx wrangler@4 d1 execute campteam-local --local --config $CFG --persist-to $STATE --file camp-team/db/seed-dummy.sql
  npx wrangler@4 d1 execute campteam-local --local --config $CFG --persist-to $STATE --file camp-team/db/seed-dummy-ledger.sql
fi
exec npx wrangler@4 pages dev dist --d1 DB=00000000-0000-0000-0000-000000000000 --r2 CAMPTEAM_FILES --persist-to $STATE --port 8788 --ip 0.0.0.0 \
  --binding ADMIN_PASSWORD=local-dev-secret --binding CAMPTEAM_DEV_AUTH=1 ${=WRANGLER_EXTRA}
