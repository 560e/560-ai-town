#!/usr/bin/env bash
# Applies ONLY the existing site's proxy include. Preserves panel TLS/server config.
set -Eeuo pipefail
umask 077
[[ $EUID == 0 && $# == 1 ]] || { echo '用法：sudo bash scripts/deploy/apply-baota-proxy.sh 当前宝塔代理配置文件'; exit 1; }
TASK_PROXY="$(realpath -e -- "$1")"
[[ "$TASK_PROXY" == /www/server/panel/vhost/nginx/proxy/*/*.conf ]] || { echo '只允许宝塔站点已有代理配置'; exit 1; }
TASK_SCRIPT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
source "$TASK_SCRIPT/paths.sh"
TASK_ROOT="$(town_project_root "$TASK_SCRIPT/../..")"
town_check_existing "$TASK_ROOT"
export TOWN_DEPLOY_ROOT="$TASK_ROOT"
exec 9>/run/lock/560-town-deploy.lock
flock -n 9 || { echo '已有部署或维护操作正在运行'; exit 1; }
TASK_BACKUP="$TASK_ROOT/.deployment/backups/proxy-$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -m 700 "$TASK_BACKUP"
cp -p -- "$TASK_PROXY" "$TASK_BACKUP/original.conf"
"$TASK_ROOT/.deployment/runtime/bin/node" "$TASK_SCRIPT/render-proxy.mjs" "$TASK_PROXY" "$TASK_BACKUP/candidate.conf"
cp -- "$TASK_BACKUP/candidate.conf" "$TASK_PROXY"
if /www/server/nginx/sbin/nginx -t && /www/server/nginx/sbin/nginx -s reload; then
  echo "代理配置已应用；备份：$TASK_BACKUP/original.conf"
else
  cp -p -- "$TASK_BACKUP/original.conf" "$TASK_PROXY"
  /www/server/nginx/sbin/nginx -t && /www/server/nginx/sbin/nginx -s reload
  echo '代理验证失败，已尝试恢复原配置。'
  exit 1
fi
