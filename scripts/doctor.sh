#!/usr/bin/env bash
set -euo pipefail

echo "Checking shared repo prerequisites..."

if command -v bun >/dev/null 2>&1; then
  echo "- bun available"
fi

if command -v npm >/dev/null 2>&1; then
  echo "- npm available"
fi

if ! command -v bun >/dev/null 2>&1 && ! command -v npm >/dev/null 2>&1; then
  echo "- neither bun nor npm found"
  exit 1
fi

if test -d node_modules; then
  echo "- workspace dependencies installed"
else
  echo "- root node_modules missing; run bun install or npm install"
  exit 1
fi
