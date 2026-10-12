#!/usr/bin/env bash
set -euo pipefail

# 운영 배포 = main 푸시 (Vercel GitHub 연동이 production을 빌드한다).
# 이 스크립트는 다른 작업의 변경을 함께 묶지 않도록 git add -A를 쓰지 않는다.
#   ./scripts/deploy.sh "커밋 메시지"            # main에서: 빌드 → 빌드 산출물만 커밋 → 푸시
#   ./scripts/deploy.sh --preview                # 현재 브랜치: 빌드 → 산출물 커밋 → 푸시 (Vercel 프리뷰)

mode="prod"
commit_message=""
if [[ "${1:-}" == "--preview" ]]; then
  mode="preview"
  commit_message="${2:-chore: 빌드 산출물 갱신 (프리뷰)}"
else
  commit_message="${1:-}"
fi

if [[ -z "${commit_message// }" ]]; then
  echo "Usage: ./scripts/deploy.sh \"commit message\"   |   ./scripts/deploy.sh --preview [\"message\"]"
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: run inside the git repository."
  exit 1
fi

# IndexNow — 운영 푸시 뒤 바뀐 인사이트 URL을 Bing·네이버 등 참여 검색엔진에 알린다(구글은 미참여, 서치콘솔 수동).
# 키 파일(루트 <key>.txt)이 운영에 올라온 것을 확인한 뒤 보낸다. 실패해도 배포는 성공으로 둔다.
INDEXNOW_KEY="f20ebd7ac12aac5e6edb671375bcfcc6"
SITE_URL="https://www.nextcw.com"

notify_indexnow() {
  local from="$1" urls=() f
  if [[ -n "$from" ]]; then
    while IFS= read -r f; do urls+=("$SITE_URL/${f%index.html}"); done \
      < <(git diff --name-only "$from" HEAD -- 'insights/*/index.html')
  fi
  urls+=("$SITE_URL/insights/" "$SITE_URL/sitemap.xml")

  echo "==> IndexNow: 키 파일 운영 반영 대기"
  local i
  for i in $(seq 1 36); do
    [[ "$(curl -s -o /dev/null -w '%{http_code}' "$SITE_URL/$INDEXNOW_KEY.txt")" == "200" ]] && break
    sleep 5
  done

  local list
  list="$(printf '"%s",' "${urls[@]}")"
  local body="{\"host\":\"www.nextcw.com\",\"key\":\"$INDEXNOW_KEY\",\"keyLocation\":\"$SITE_URL/$INDEXNOW_KEY.txt\",\"urlList\":[${list%,}]}"
  local code
  code="$(curl -s -o /dev/null -w '%{http_code}' -X POST "https://api.indexnow.org/indexnow" \
    -H 'Content-Type: application/json; charset=utf-8' --data "$body")"
  echo "==> IndexNow 응답 $code (${#urls[@]}개 URL: ${urls[*]})"
  [[ "$code" == "200" || "$code" == "202" ]]
}

branch="$(git branch --show-current)"
if [[ "$mode" == "prod" && "$branch" != "main" ]]; then
  echo "Error: production deploy must run on main (current: $branch). Merge the approved CR branch first, or use --preview."
  exit 1
fi

# 추적 파일에 커밋되지 않은 변경이 있으면 중단 (미추적 파일은 허용 — 빌드 입력이 아니다)
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Error: uncommitted changes in tracked files. Commit the CR scope explicitly first:"
  git status --short | grep -v '^??' || true
  exit 1
fi

echo "==> Building site"
npm run build

echo "==> Checking diff"
git diff --check

# 빌드가 바꿀 수 있는 파일만 스테이징 (생성물·캐시값·lastmod). 그 외 변경은 사람이 커밋한다.
build_outputs=(sitemap.xml rss.xml llms.txt scripts/lastmod.json js/insights-data.js 404.html index.html
  about/index.html ai-campus/index.html coaching/index.html contact/index.html flexoffice/index.html
  privacy/index.html public/index.html insights/index.html)
while IFS= read -r f; do build_outputs+=("$f"); done < <(git ls-files 'insights/*/index.html')

changed=()
for f in "${build_outputs[@]}"; do
  if [[ -e "$f" ]] && ! git diff --quiet -- "$f"; then changed+=("$f"); fi
done

if [[ ${#changed[@]} -eq 0 ]]; then
  echo "==> No build output changed; nothing to commit."
else
  echo "==> Committing build outputs: ${changed[*]}"
  git add -- "${changed[@]}"
  git commit -m "$commit_message"
fi

pushed_from="$(git rev-parse --verify -q "origin/$branch" || true)"

echo "==> Pushing $branch to origin ($mode)"
git push -u origin "$branch"

if [[ "$mode" == "prod" ]]; then
  echo "==> Vercel will build production from main. Verify: vercel ls, then curl the live URL."
  notify_indexnow "$pushed_from" || echo "Warning: IndexNow 통지 실패 — 배포는 정상입니다."
else
  echo "==> Vercel will build a preview for $branch (SSO-protected)."
fi
echo "==> Done"
