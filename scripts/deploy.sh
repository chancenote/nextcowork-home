#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 || -z "${1// }" ]]; then
  echo "Usage: ./scripts/deploy.sh \"commit message\""
  echo "Example: ./scripts/deploy.sh \"Update contact page copy\""
  exit 1
fi

commit_message="$1"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: this command must be run inside the git repository."
  exit 1
fi

if ! command -v vercel >/dev/null 2>&1; then
  echo "Error: vercel CLI is not installed or not available in PATH."
  echo "Install it with: npm i -g vercel"
  exit 1
fi

echo "==> Building site"
npm run build

echo "==> Checking diff"
git diff --check

echo "==> Staging non-ignored changes"
git add -A

if git diff --cached --quiet; then
  echo "==> No commit needed: there are no staged changes."
else
  echo "==> Committing: ${commit_message}"
  git commit -m "$commit_message"

  echo "==> Pushing to origin"
  git push
fi

echo "==> Deploying to Vercel production"
vercel --prod

echo "==> Done"
