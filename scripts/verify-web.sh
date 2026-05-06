#!/usr/bin/env bash
set -euo pipefail

bash scripts/doctor.sh

(
  cd web
  bash ../scripts/run-ts.sh scripts/verify-api-contracts.ts
  next build
)
