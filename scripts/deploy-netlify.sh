#!/usr/bin/env bash
# Deploy hpsalesadmin (sales dashboard + embedded KOL Command Center + function)
# to the EXISTING Netlify site — fully automated.
# Needs ONE thing: a Netlify Personal Access Token.
#   Generate at: https://app.netlify.com/user/applications#personal-access-tokens
#
# Usage:
#   NETLIFY_AUTH_TOKEN=xxx SITE=hpsalesadmin bash scripts/deploy-netlify.sh
#
# Reads SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env (written by
# provision-supabase.sh), pushes them as build env vars, then deploys prod with
# the function bundled. Also connects nothing to git — this is a direct deploy;
# git auto-deploy can be linked in the UI later if wanted.
set -euo pipefail

export NETLIFY_AUTH_TOKEN="${NETLIFY_AUTH_TOKEN:?Set NETLIFY_AUTH_TOKEN}"
SITE="${SITE:-hpsalesadmin}"
HERE="$(cd "$(dirname "$0")/.." && pwd)"
cd "$HERE"

# 1. Ensure a modern Node (netlify-cli needs >=18; this box has 14).
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "→ Node $NODE_MAJOR too old; installing current Node via Homebrew…"
  brew install node
  hash -r
fi

# 2. Install deps so zip-it-and-ship-it can bundle @supabase/supabase-js into the function.
echo "→ npm install…"
npm install --no-audit --no-fund

# 3. Netlify CLI.
command -v netlify >/dev/null 2>&1 || { echo "→ installing netlify-cli…"; npm install -g netlify-cli; hash -r; }

# 4. Load Supabase env (written by provision-supabase.sh).
[ -f .env ] && set -a && . ./.env && set +a || { echo "Missing .env — run provision-supabase.sh first."; exit 1; }

# 5. Link the existing site by name.
echo "→ linking site '$SITE'…"
netlify link --name "$SITE"

# 6. Push env vars (server-side; never shipped to browser).
echo "→ setting env vars…"
netlify env:set SUPABASE_URL "$SUPABASE_URL" --force
netlify env:set SUPABASE_SERVICE_ROLE_KEY "$SUPABASE_SERVICE_ROLE_KEY" --force

# 7. Deploy prod (publish dir + functions per netlify.toml).
echo "→ deploying…"
netlify deploy --prod --build

echo ""
echo "✓ Deployed. Verify:"
echo "    curl -s https://$SITE.netlify.app/.netlify/functions/kol | head -c 300"
