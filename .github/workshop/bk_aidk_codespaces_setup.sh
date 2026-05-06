#!/usr/bin/env bash
set -Eeuo pipefail

AIDK_DIR="${AIDK_DIR:-/workspaces/bk_aidk}"
SAMPLE_DIR="${SAMPLE_DIR:-/workspaces/Conversational-AI-IOT-Sample}"
TOOLCHAIN_DIR="${TOOLCHAIN_DIR:-/opt}"
TOOLCHAIN_URL="${TOOLCHAIN_URL:-https://download.agora.io/rtsasdk/release/gcc-arm-none-eabi-10.3-2021.10-x86_64-linux.tar.bz2}"
TOOLCHAIN_ARCHIVE_BZ2="${TOOLCHAIN_ARCHIVE_BZ2:-gcc-arm-none-eabi-10.3-2021.10-x86_64-linux.tar.bz2}"
TOOLCHAIN_ARCHIVE="${TOOLCHAIN_ARCHIVE:-gcc-arm-none-eabi-10.3-2021.10-x86_64-linux.tar}"
TOOLCHAIN_EXTRACTED="${TOOLCHAIN_EXTRACTED:-gcc-arm-none-eabi-10.3-2021.10}"
TARGET_BRANCH="${TARGET_BRANCH:-ai_release/v2.0.1.8}"
SAMPLE_BRANCH="${SAMPLE_BRANCH:-bk7258/quickstart}"
CONFIG_FILE="${CONFIG_FILE:-projects/common_components/network_transfer/agora_rtc/agora_config.h}"
WIFI_SSID="${WIFI_SSID:-}"
WIFI_PASSWORD="${WIFI_PASSWORD:-}"
SERVER_URL="${SERVER_URL:-}"

usage() {
  cat <<'USAGE'
Usage:
  ./bk_aidk_codespaces_setup.sh --ssid "your-wifi" --password "your-password" --server-url "wss://your-server"

Optional environment variables:
  AIDK_DIR=/workspaces/bk_aidk
  SAMPLE_DIR=/workspaces/Conversational-AI-IOT-Sample
  TARGET_BRANCH=ai_release/v2.0.1.8
  SAMPLE_BRANCH=bk7258/quickstart

If --ssid, --password, or --server-url are omitted, the script prepares the
repo and leaves those config values for manual editing in:
  projects/common_components/network_transfer/agora_rtc/agora_config.h
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --ssid)
      WIFI_SSID="${2:-}"
      shift 2
      ;;
    --password|--wifi-password)
      WIFI_PASSWORD="${2:-}"
      shift 2
      ;;
    --server-url)
      SERVER_URL="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 2
      ;;
  esac
done

log() {
  printf '\n[%s] %s\n' "$(date '+%H:%M:%S')" "$*"
}

need_dir() {
  if [[ ! -d "$1" ]]; then
    echo "Directory not found: $1" >&2
    echo "Please run this inside the GitHub Codespace after creating it from bekencorp/bk_aidk." >&2
    exit 1
  fi
}

as_root() {
  if [[ -w "$TOOLCHAIN_DIR" ]]; then
    "$@"
  else
    sudo "$@"
  fi
}

download_file() {
  local url="$1"
  local output="$2"

  if command -v wget >/dev/null 2>&1; then
    as_root wget -O "$output" "$url"
  elif command -v curl >/dev/null 2>&1; then
    as_root curl -L "$url" -o "$output"
  else
    echo "Neither wget nor curl is available." >&2
    exit 1
  fi
}

escape_c_string() {
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

configure_agora_config() {
  local config_path="$AIDK_DIR/$CONFIG_FILE"
  local escaped_ssid escaped_password escaped_server_url

  if [[ -z "$WIFI_SSID" && -z "$WIFI_PASSWORD" && -z "$SERVER_URL" ]]; then
    log "Wi-Fi/server URL not provided. Please edit: $config_path"
    return 0
  fi

  if [[ ! -f "$config_path" ]]; then
    echo "Wi-Fi config file not found: $config_path" >&2
    exit 1
  fi

  escaped_ssid="$(escape_c_string "$WIFI_SSID")"
  escaped_password="$(escape_c_string "$WIFI_PASSWORD")"
  escaped_server_url="$(escape_c_string "$SERVER_URL")"

  python3 - "$config_path" "$escaped_ssid" "$escaped_password" "$escaped_server_url" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
ssid = sys.argv[2]
password = sys.argv[3]
server_url = sys.argv[4]
text = path.read_text()

patterns = []
required = []

if ssid:
    patterns.extend([
        (r'(^\s*#\s*define\s+(?:CONFIG_)?(?:WIFI|WLAN)_SSID\s+)("[^"\n]*")', ssid, "Wi-Fi SSID"),
        (r'(^\s*#\s*define\s+(?:AGORA_)?WIFI_SSID\s+)("[^"\n]*")', ssid, "Wi-Fi SSID"),
    ])
    required.append("Wi-Fi SSID")

if password:
    patterns.extend([
        (r'(^\s*#\s*define\s+(?:CONFIG_)?(?:WIFI|WLAN)_(?:PASSWORD|PWD|PSK)\s+)("[^"\n]*")', password, "Wi-Fi password"),
        (r'(^\s*#\s*define\s+(?:AGORA_)?WIFI_(?:PASSWORD|PWD|PSK)\s+)("[^"\n]*")', password, "Wi-Fi password"),
    ])
    required.append("Wi-Fi password")

if server_url:
    patterns.extend([
        (r'(^\s*#\s*define\s+CONFIG_AGENT_SERVER_URL\s+)("[^"\n]*")', server_url, "agent server URL"),
        (r'(^\s*#\s*define\s+(?:AGENT|TEN|AGORA)_SERVER_URL\s+)("[^"\n]*")', server_url, "agent server URL"),
    ])
    required.append("agent server URL")

updated = text
hits_by_name = {name: 0 for name in required}
for pattern, value, name in patterns:
    updated, count = re.subn(
        pattern,
        lambda match, value=value: f'{match.group(1)}"{value}"',
        updated,
        flags=re.MULTILINE,
    )
    hits_by_name[name] += count

missing = [name for name, count in hits_by_name.items() if count == 0]
if missing:
    print(f"Could not confidently update {', '.join(missing)} in {path}.", file=sys.stderr)
    print("Please open the file and fill the missing values manually.", file=sys.stderr)
    sys.exit(3)

path.write_text(updated)
print(f"Updated Agora config in {path}: {', '.join(required)}")
PY
}

log "Checking Codespaces workspace"
need_dir "$AIDK_DIR"

log "Initializing first-level submodules in $AIDK_DIR"
cd "$AIDK_DIR"
git submodule init
git submodule update

log "Initializing second-level submodules in bk_avdk"
cd "$AIDK_DIR/bk_avdk"
git submodule init
git submodule update

log "Switching bk_aidk to $TARGET_BRANCH and updating submodules recursively"
cd "$AIDK_DIR"
git checkout "$TARGET_BRANCH"
git submodule update --recursive

log "Downloading and extracting ARM GCC toolchain under $TOOLCHAIN_DIR"
cd "$TOOLCHAIN_DIR"
if [[ -d "$TOOLCHAIN_DIR/$TOOLCHAIN_EXTRACTED" ]]; then
  log "Toolchain already exists: $TOOLCHAIN_DIR/$TOOLCHAIN_EXTRACTED"
else
  if [[ ! -f "$TOOLCHAIN_DIR/$TOOLCHAIN_ARCHIVE" ]]; then
    if [[ ! -f "$TOOLCHAIN_DIR/$TOOLCHAIN_ARCHIVE_BZ2" ]]; then
      download_file "$TOOLCHAIN_URL" "$TOOLCHAIN_DIR/$TOOLCHAIN_ARCHIVE_BZ2"
    fi
    as_root bzip2 -d "$TOOLCHAIN_DIR/$TOOLCHAIN_ARCHIVE_BZ2"
  fi
  as_root tar -xvf "$TOOLCHAIN_DIR/$TOOLCHAIN_ARCHIVE"
fi

log "Cloning/updating TEN demo sample"
cd /workspaces
if [[ -d "$SAMPLE_DIR/.git" ]]; then
  cd "$SAMPLE_DIR"
  git fetch origin
else
  git clone https://github.com/AgoraIO-Community/Conversational-AI-IOT-Sample.git "$SAMPLE_DIR"
  cd "$SAMPLE_DIR"
fi
git checkout "$SAMPLE_BRANCH"

log "Replacing BK original projects with TEN demo projects"
cd "$AIDK_DIR"
rm -rf ./projects/
cp -r "$SAMPLE_DIR/device/projects" .

log "Configuring Agora settings"
configure_agora_config

log "Done. Environment is prepared in $AIDK_DIR"
