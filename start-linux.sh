#!/usr/bin/env bash
set -euo pipefail
town_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if ! command -v node >/dev/null 2>&1; then
  printf '%s\n' '[ERROR] Install Node.js 24 with npm, then run this script again.' 'https://nodejs.org/' >&2
  exit 1
fi
cd -- "$town_root"
exec node "$town_root/scripts/start-town.mjs" "$@"
