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

echo "==> Pushing $branch to origin ($mode)"
git push -u origin "$branch"

if [[ "$mode" == "prod" ]]; then
  echo "==> Vercel will build production from main. Verify: vercel ls, then curl the live URL."
else
  echo "==> Vercel will build a preview for $branch (SSO-protected)."
fi
echo "==> Done"
