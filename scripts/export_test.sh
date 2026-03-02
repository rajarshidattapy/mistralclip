#!/usr/bin/env bash
set -euo pipefail

API_BASE="${API_BASE:-http://localhost:8000}"
PROJECT_ID="${PROJECT_ID:-default}"

curl -sS "${API_BASE}/timeline/${PROJECT_ID}" >/dev/null
echo "Posting export request..."
curl -sS -X POST "${API_BASE}/export" \
  -H "Content-Type: application/json" \
  -d "{\"project_id\":\"${PROJECT_ID}\"}"
echo
