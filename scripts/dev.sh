#!/usr/bin/env bash
set -euo pipefail

bash scripts/dev-check.sh

concurrently -n backend,frontend -c blue,green \
  "cd server && bash -c '(test -d venv || python3 -m venv venv) && source venv/bin/activate && pip install -q -r requirements.txt && python src/server.py'" \
  "cd web && AGENT_BACKEND_URL=http://localhost:8000 next dev"
