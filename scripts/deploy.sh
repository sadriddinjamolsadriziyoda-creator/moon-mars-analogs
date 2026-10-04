#!/bin/bash
# One-shot deploy: push to GitHub, then create both Render services.
#
# Usage:
#   GH_TOKEN=<classic PAT with 'repo'>  RENDER_API_KEY=<rnd_...>  ./scripts/deploy.sh [repo-name]
#
# Both secrets are read from the environment and never written to disk or echoed.
# A GitHub fine-grained PAT cannot create repositories (403 on POST /user/repos), so the
# empty repository must already exist — this script pushes into it.
set -euo pipefail

REPO="${1:-moon-mars-analogs}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

: "${GH_TOKEN:?нужен classic GitHub PAT (ghp_...), fine-grained не умеет создавать репозитории}"
: "${RENDER_API_KEY:?нужен Render API key (rnd_...)}"

API="https://api.github.com"
RENDER="https://api.render.com/v1"

echo "── 1/4 проверяю доступ ──"
OWNER="$(curl -fsS "$API/user" -H "Authorization: Bearer $GH_TOKEN" | node -pe 'JSON.parse(require("fs").readFileSync(0)).login')"
echo "   GitHub: $OWNER"

if curl -fsS -o /dev/null "$API/repos/$OWNER/$REPO" -H "Authorization: Bearer $GH_TOKEN"; then
  echo "   репозиторий $OWNER/$REPO существует"
else
  echo "   ОШИБКА: $OWNER/$REPO не найден. Создай пустой репозиторий: https://github.com/new?name=$REPO&visibility=public" >&2
  echo "   (без README, .gitignore и лицензии — они уже есть локально)" >&2
  exit 1
fi

echo "── 2/4 пушу коммиты ──"
# The token goes into the URL for this one command and is never written to .git/config.
git push --force "https://x-access-token:$GH_TOKEN@github.com/$OWNER/$REPO.git" HEAD:main

echo "── 3/4 создаю сервисы Render ──"
# Render needs the GitHub connection id, not the owner login.
CONN="$(curl -fsS "$RENDER/connections" -H "Authorization: Bearer $RENDER_API_KEY" \
  | node -pe 'const c=JSON.parse(require("fs").readFileSync(0)).find(x=>x.provider==="github"); c ? c.id : ""')"
if [ -z "$CONN" ]; then
  echo "   ОШИБКА: у Render нет подключения к GitHub. Открой https://render.com/connections и подключи." >&2
  exit 1
fi

create_service() {
  local name="$1" root="$2" build="$3" start="$4" plan="$5" envs="$6"
  if curl -fsS -o /dev/null "$RENDER/services?limit=100" -H "Authorization: Bearer $RENDER_API_KEY" \
    | grep -q "\"name\":\"$name\""; then
    echo "   сервис $name уже есть, пропускаю"
    return
  fi
  curl -fsS -X POST "$RENDER/services" \
    -H "Authorization: Bearer $RENDER_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"type\":\"$plan\",\"name\":\"$name\",\"repo\":\"$OWNER/$REPO\",\"ownerId\":\"$CONN\",\"branch\":\"main\",\"rootDir\":\"$root\",\"plan\":\"free\",\"buildCommand\":\"$build\",\"startCommand\":\"$start\",\"autoDeploy\":true,\"envVars\":$envs}" \
    | node -pe '"   создан: " + (JSON.parse(require("fs").readFileSync(0)).service?.name ?? JSON.parse(require("fs").readFileSync(0)).message ?? "ошибка")'
}

create_service "moon-mars-api" "server" \
  "pnpm install --no-frozen-lockfile" "pnpm start" "web" \
  '[{"key":"NODE_VERSION","value":"22.14.0"},{"key":"NODE_ENV","value":"production"},{"key":"PORT","value":"10000"},{"key":"MONGODB_URI","value":""},{"key":"CORS_ORIGIN","value":""}]'

# VITE_API_URL must point at the API service or the frontend silently falls back to its
# bundled catalog and the Mars basemap never loads. Filled in after the API has a URL.
create_service "moon-mars-web" "web" \
  "pnpm install --no-frozen-lockfile && sh ../scripts/fetch-textures.sh && pnpm build" \
  "pnpm exec vite preview --host 0.0.0.0 --port 10000" "static" \
  '[{"key":"NODE_VERSION","value":"22.14.0"},{"key":"VITE_API_URL","value":""}]'

echo "── 4/4 адреса ──"
curl -fsS "$RENDER/services?limit=100" -H "Authorization: Bearer $RENDER_API_KEY" \
  | node -pe '
    const list = JSON.parse(require("fs").readFileSync(0));
    for (const s of list) {
      const url = (s.serviceDetails && s.serviceDetails.url) || (s.url ? "https://" + s.url : "pending");
      console.log("   " + s.name.padEnd(16) + url);
    }'

cat <<'EOF'

Готово. Дальше в Render Dashboard:
  1. moon-mars-api  → Environment → CORS_ORIGIN = https://<адрес moon-mars-web>
  2. moon-mars-web  → Environment → VITE_API_URL = https://<адрес moon-mars-api>
     и Deploy again — переменная запекается в бандл на этапе сборки.
EOF