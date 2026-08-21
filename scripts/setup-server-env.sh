#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="$repo_root/server/.env"
legacy_env_file="$repo_root/server/.env.local"
example_env_file="$repo_root/server/.env.example"

credential_is_configured() {
  local target_file="$1"
  local key="$2"
  local placeholder="$3"

  [[ -f "$target_file" ]] &&
    grep -Eq "^${key}=[^[:space:]]+([[:space:]]*)?$" "$target_file" &&
    ! grep -Eq "^${key}=${placeholder}([[:space:]]*)?$" "$target_file"
}

credentials_are_configured() {
  local target_file="$1"

  credential_is_configured "$target_file" AGORA_APP_ID your_agora_app_id &&
    credential_is_configured "$target_file" AGORA_APP_CERTIFICATE your_agora_app_certificate
}

uses_example_credentials() {
  local target_file="$1"

  grep -Eq '^AGORA_APP_ID=your_agora_app_id([[:space:]]*)?$' "$target_file" &&
    grep -Eq '^AGORA_APP_CERTIFICATE=your_agora_app_certificate([[:space:]]*)?$' "$target_file"
}

prepare_env() {
  if [[ -f "$env_file" ]]; then
    if uses_example_credentials "$env_file" && credentials_are_configured "$legacy_env_file"; then
      cp "$legacy_env_file" "$env_file"
      printf '\nCopied configured server/.env.local to server/.env.\n'
    fi
    return
  fi

  if [[ -f "$legacy_env_file" ]]; then
    cp "$legacy_env_file" "$env_file"
    printf '\nCopied existing server/.env.local to server/.env.\n'
    return
  fi

  cp "$example_env_file" "$env_file"
  printf '\nCreated server/.env. Add Agora credentials before running the app.\n'
}

check_credential() {
  local key="$1"
  local placeholder="$2"

  if ! credential_is_configured "$env_file" "$key" "$placeholder"; then
    if grep -Eq "^${key}=${placeholder}([[:space:]]*)?$" "$env_file"; then
      printf -- '- %s still has the example value in server/.env\n' "$key" >&2
      return 1
    fi
    printf -- '- %s missing in server/.env\n' "$key" >&2
    return 1
  fi

  printf -- '- %s configured\n' "$key"
}

check_env() {
  local status=0

  if [[ ! -f "$env_file" ]]; then
    printf -- '- missing server/.env\n' >&2
    return 1
  fi

  printf -- '- server/.env present\n'
  check_credential AGORA_APP_ID your_agora_app_id || status=1
  check_credential AGORA_APP_CERTIFICATE your_agora_app_certificate || status=1
  return "$status"
}

print_next_steps() {
  local doctor_command="$1"
  local dev_command="$2"

  printf '\nSetup complete.\n'
  if check_env >/dev/null 2>&1; then
    printf 'Agora credentials are configured.\n'
    printf 'Next steps:\n'
    printf '  1. Run: %s\n' "$doctor_command"
    printf '  2. Run: %s\n' "$dev_command"
  else
    printf 'Next steps:\n'
    printf '  1. Run: agora quickstart env write .\n'
    printf '  2. Run: %s\n' "$doctor_command"
    printf '  3. Run: %s\n' "$dev_command"
  fi
}

case "${1:-}" in
  prepare)
    prepare_env
    ;;
  check)
    check_env
    ;;
  next-steps)
    print_next_steps "${2:?doctor command is required}" "${3:?dev command is required}"
    ;;
  *)
    printf 'Usage: %s {prepare|check|next-steps}\n' "$0" >&2
    exit 2
    ;;
esac
