#!/usr/bin/env bash
# Provision the KOL Command Center backend on Supabase — fully automated.
# Needs ONE thing: a Supabase Personal Access Token.
#   Generate at: https://supabase.com/dashboard/account/tokens  → "Generate new token"
#
# Usage:
#   SUPABASE_ACCESS_TOKEN=sbp_xxx bash scripts/provision-supabase.sh
#   (optional) ORG_ID=xxx REGION=ap-southeast-1 PROJECT_NAME="kol-command-center"
#
# Does: create project → wait healthy → run supabase/schema.sql → fetch keys →
#       write .env (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY). Idempotent-ish:
#       if a project named $PROJECT_NAME exists, it reuses it.
set -euo pipefail

API="https://api.supabase.com/v1"
TOKEN="${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN}"
PROJECT_NAME="${PROJECT_NAME:-kol-command-center}"
REGION="${REGION:-ap-southeast-1}"          # Singapore — closest to Indonesia
HERE="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA="$HERE/supabase/schema.sql"
ENV_OUT="$HERE/.env"
auth=(-H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json")

echo "→ Resolving organization…"
ORG_ID="${ORG_ID:-$(curl -s "${auth[@]}" "$API/organizations" | python3 -c 'import sys,json;d=json.load(sys.stdin);print(d[0]["id"] if d else "")')}"
[ -n "$ORG_ID" ] || { echo "No organization found for this token."; exit 1; }
echo "  org: $ORG_ID"

# reuse existing project of same name if present
REF="$(curl -s "${auth[@]}" "$API/projects" | python3 -c "import sys,json
d=json.load(sys.stdin)
print(next((p['id'] for p in d if p.get('name')=='$PROJECT_NAME'),''))")"

if [ -z "$REF" ]; then
  DB_PASS="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 28)"
  echo "→ Creating project '$PROJECT_NAME' in $REGION…"
  REF="$(curl -s "${auth[@]}" -X POST "$API/projects" -d "$(python3 -c "import json;print(json.dumps({'name':'$PROJECT_NAME','organization_id':'$ORG_ID','region':'$REGION','db_pass':'$DB_PASS'}))")" \
        | python3 -c 'import sys,json;print(json.load(sys.stdin).get("id",""))')"
  [ -n "$REF" ] || { echo "Project creation failed."; exit 1; }
  echo "  ref: $REF  (db pass stored in .env.provision)"
  echo "DB_PASS=$DB_PASS" > "$HERE/.env.provision"
else
  echo "→ Reusing existing project ref: $REF"
fi

echo "→ Waiting for project to be healthy (can take ~2 min)…"
for i in $(seq 1 40); do
  STATUS="$(curl -s "${auth[@]}" "$API/projects/$REF" | python3 -c 'import sys,json;print(json.load(sys.stdin).get("status",""))' 2>/dev/null || echo "")"
  echo "   [$i] status: ${STATUS:-?}"
  [ "$STATUS" = "ACTIVE_HEALTHY" ] && break
  sleep 8
done

echo "→ Running schema.sql…"
QUERY="$(python3 -c 'import json,sys;print(json.dumps({"query":open(sys.argv[1]).read()}))' "$SCHEMA")"
RESP="$(curl -s "${auth[@]}" -X POST "$API/projects/$REF/database/query" -d "$QUERY")"
echo "  schema response: ${RESP:0:200}"

echo "→ Fetching service_role key…"
SERVICE_KEY="$(curl -s "${auth[@]}" "$API/projects/$REF/api-keys" | python3 -c 'import sys,json
d=json.load(sys.stdin)
print(next((k["api_key"] for k in d if k.get("name")=="service_role"),""))')"
URL="https://$REF.supabase.co"

[ -n "$SERVICE_KEY" ] || { echo "Could not fetch service key."; exit 1; }

cat > "$ENV_OUT" <<EOF
SUPABASE_URL=$URL
SUPABASE_SERVICE_ROLE_KEY=$SERVICE_KEY
EOF
echo ""
echo "✓ Done. Wrote $ENV_OUT"
echo "  SUPABASE_URL=$URL"
echo "  (service_role key written to .env — gitignored)"
