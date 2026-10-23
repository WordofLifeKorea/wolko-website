#!/usr/bin/env bash
# 캠프팀 DB 마이그레이션을 터미널에서 실제(원격) D1 에 순서대로 실행한다.
#   사용법: ./camp-team/deploy/migrate-remote.sh <설정파일> <시작번호> [끝번호]
#   예)     ./camp-team/deploy/migrate-remote.sh ~/Documents/wolko-camp-team/wrangler.migrate.toml 1 18
# - 번호가 붙은 파일(0001_*.sql ~)만 실행한다. seed-dummy*.sql 은 절대 실행하지 않는다.
# - 이미 적용한 번호를 다시 실행하면 오류가 나거나 데이터가 바뀔 수 있으니, 처음에는 1 부터, 이어서 할 때는 "빠진 번호부터" 지정한다.
# - 실행 전에 목록을 보여 주고 yes 를 입력해야 시작한다. 오류가 나면 그 자리에서 멈춘다.
# - DRY_RUN=1 이면 목록만 보여 주고 아무것도 실행하지 않는다.
set -euo pipefail
CONFIG="${1:-}"; FROM="${2:-}"; TO="${3:-}"
[ -n "$CONFIG" ] && [ -n "$FROM" ] || { sed -n 2,9p "$0"; exit 1; }
[ -f "$CONFIG" ] || { echo "설정 파일이 없어요: $CONFIG"; exit 1; }
cd "$(dirname "$0")/../.."
FILES=()
for f in camp-team/db/[0-9][0-9][0-9][0-9]_*.sql; do
  n=$((10#$(basename "$f" | cut -c1-4)))
  [ "$n" -ge "$((10#$FROM))" ] || continue
  [ -z "$TO" ] || [ "$n" -le "$((10#$TO))" ] || continue
  FILES+=("$f")
done
[ "${#FILES[@]}" -gt 0 ] || { echo "실행할 파일이 없어요."; exit 1; }
echo "실제 Cloudflare D1 에 아래 파일을 순서대로 실행합니다:"; printf '  %s\n' "${FILES[@]}"
[ "${DRY_RUN:-}" = "1" ] && { echo "(DRY_RUN — 실행하지 않았어요)"; exit 0; }
read -r -p "계속할까요? 계속하려면 yes 를 입력: " ans; [ "$ans" = "yes" ] || { echo "취소했어요."; exit 1; }
for f in "${FILES[@]}"; do
  echo "▶ $f"; npx wrangler@4 d1 execute DB --remote --config "$CONFIG" --file "$f" --yes
done
echo "✅ 끝났어요. 확인: npx wrangler@4 d1 execute DB --remote --config $CONFIG --command \"SELECT name FROM sqlite_master WHERE type='table' ORDER BY name\""
