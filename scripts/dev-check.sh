#!/usr/bin/env bash
set -euo pipefail

test -f server/.env.local || {
  echo
  echo "⚠️  Missing server/.env.local."
  echo "   Recommended: agora login && agora project create my-first-voice-agent --feature rtc --feature convoai && agora project use my-first-voice-agent && agora project env write server/.env.local --with-secrets"
  echo "   Reference template: server/.env.example"
  echo
  exit 1
}

test -d node_modules && echo "Workspace dependencies already installed." || {
  echo "Missing workspace dependencies. Run bun install or npm install from the repo root."
  exit 1
}
