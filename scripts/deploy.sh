#!/usr/bin/env bash
# Publish: push to GitHub, then let Vercel build the site from `main`.
#
# Usage:
#   ./scripts/deploy.sh
#
# Git credentials come from the system credential manager (Git Credential Manager on Windows,
# Keychain or libsecret elsewhere), so no token is passed on the command line. Vercel builds
# automatically on every push to `main`; set VERCEL_TOKEN to also run the production deploy
# from here instead of waiting for the webhook.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -n "$(git status --porcelain)" ]; then
  echo "ОШИБКА: есть незакоммиченные изменения — сначала закоммитьте их." >&2
  git status --short >&2
  exit 1
fi

echo "── 1/3 проверяю, что textures на месте ──"
# The globe renders black without them, and they are not in git: the build downloads them.
if [ ! -s web/public/textures/earth-blue-marble.jpg ]; then
  sh scripts/fetch-textures.sh
fi

echo "── 2/3 пушу в GitHub ──"
git push origin main

echo "── 3/3 деплой на Vercel ──"
if [ -n "${VERCEL_TOKEN:-}" ]; then
  npx --yes vercel@latest --prod --token "$VERCEL_TOKEN"
else
  echo "   VERCEL_TOKEN не задан — деплой запустится сам по вебхуку."
  echo "   Следить: https://vercel.com/sadriddinjamolsadriziyoda-creator/moon-mars-analogs/deployments"
fi