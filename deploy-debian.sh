#!/usr/bin/env bash
# Compatibility entry; Linux installer also supports Ubuntu.
set -Eeuo pipefail
exec bash "$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)/deploy-linux.sh" "$@"
