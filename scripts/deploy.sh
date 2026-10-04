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

# Push goes over SSH with the deploy key, so no GitHub token is required at all.
OWNER="xcrpty7"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/moonmars_deploy}"
git remote set-url origin "git@github-moon-mars:$OWNER/$REPO.git" 2>/dev/null || true
: "${RENDER_API_KEY:?нужен Render API key (rnd_...)}"

API="https://api.github.com"
RENDER="https://api.render.com/v1"

echo "── 1/4 проверяю SSH-доступ ──"
if ssh -T -o IdentitiesOnly=yes -o ConnectTimeout=10 -i "$SSH_KEY" git@github.com 2>&1 | grep -q "successfully authenticated"; then
  echo "   GitHub: $OWNER через SSH-ключ"
else
  echo "   ОШИБКА: SSH-ключ отклонён или read-only. Добавь ключ в настройках АККАУНТА:" >&2
  echo "   https://github.com/settings/ssh/keys/new" >&2
  echo "   Ключ: $(cat "$SSH_KEY.pub")" >&2
  exit 1
fi

echo "── 2/4 пушу коммиты ──"
git push -u origin main

echo "── 3/4 создаю сервисы Render ──"
# Render needs the workspace owner id (a team, not a GitHub login). /v1/connections
# does not exist; the owner id comes from /v1/owners.
OWNER_ID="$(curl -fsS "$RENDER/owners" -H "Authorization: Bearer $RENDER_API_KEY" \
  | node -pe 'const o=JSON.parse(require("fs").readFileSync(0)); (o[0] && (o[0].owner ? o[0].owner.id : o[0].id)) || ""')"
if [ -z "$OWNER_ID" ]; then
  echo "   ОШИБКА: не удалось получить workspace id из Render." >&2
  exit 1
fi
echo "   workspace: $OWNER_ID"

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
    -d "{\"type\":\"$plan\",\"name\":\"$name\",\"repo\":\"$OWNER/$REPO\",\"ownerId\":\"$OWNER_ID\",\"branch\":\"main\",\"rootDir\":\"$root\",\"plan\":\"free\",\"buildCommand\":\"$build\",\"startCommand\":\"$start\",\"autoDeploy\":true,\"envVars\":$envs}" \
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