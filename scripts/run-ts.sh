#!/usr/bin/env bash
set -euo pipefail

if command -v bun >/dev/null 2>&1; then
  exec bun "$@"
fi

exec node "$@"
