#!/usr/bin/env bash
set -euo pipefail

echo "[mistralclip] starting backend on :8000"
python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "[mistralclip] starting frontend on :3000"
cd frontend
npm run dev

trap "kill ${BACKEND_PID}" EXIT
