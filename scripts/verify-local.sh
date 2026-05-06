#!/usr/bin/env bash
set -euo pipefail

bash scripts/doctor-local.sh

cd server
PYTHONPYCACHEPREFIX="${TMPDIR:-/tmp}/agora-agent-pycache" python3 -m py_compile src/server.py src/agent.py
cd ..

(
  cd web
  bash ../scripts/run-ts.sh scripts/verify-local-fastapi.ts
  bash ../scripts/run-ts.sh scripts/verify-local-proxy.ts
  next build
)
