#!/usr/bin/env bash
set -euo pipefail

bash scripts/doctor.sh

command -v python3 >/dev/null && echo "- python3 available" || {
  echo "- python3 not found"
  exit 1
}

test -f server/.env.local && echo "- server/.env.local present" || {
  echo "- missing server/.env.local"
  exit 1
}

grep -Eq "^AGORA_APP_ID=.+$" server/.env.local && echo "- AGORA_APP_ID configured" || {
  echo "- AGORA_APP_ID missing in server/.env.local"
  exit 1
}

grep -Eq "^AGORA_APP_CERTIFICATE=.+$" server/.env.local && echo "- AGORA_APP_CERTIFICATE configured" || {
  echo "- AGORA_APP_CERTIFICATE missing in server/.env.local"
  exit 1
}
