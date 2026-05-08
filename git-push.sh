#!/bin/bash
# WOLKO 사이트 빠른 커밋 & 푸시 스크립트
# 사용법: ./git-push.sh "커밋 메시지"

cd "$(dirname "$0")"

# lock 파일 정리
rm -f .git/HEAD.lock .git/index.lock .git/refs/remotes/origin/main.lock .git/refs/remotes/origin/*.lock 2>/dev/null

MSG="${1:-"chore: update"}"

git add -A
git commit -m "$MSG"
git push origin main
