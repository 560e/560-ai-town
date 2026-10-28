#!/usr/bin/env bash
# Explicitly adopt an existing legacy installation into a chosen project root.
set -Eeuo pipefail
umask 077
[[ $EUID == 0 ]] || { echo '请用 root 执行'; exit 1; }
[[ $# == 1 ]] || { echo '用法：sudo bash migrate-baota.sh 目标项目根（不限宝塔）'; exit 1; }
exec 9>/run/lock/560-town-deploy.lock
flock -n 9 || { echo '已有部署或维护操作正在运行'; exit 1; }
TASK_SOURCE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
[[ -f /opt/560-town/shared/deploy.json && -x /opt/560-town-runtime/bin/node ]] || { echo '未发现受管理的旧 /opt 布局，不执行迁移。'; exit 1; }
exec /opt/560-town-runtime/bin/node "$TASK_SOURCE/scripts/deploy/baota.mjs" "$@"
