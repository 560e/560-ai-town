#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
if [[ "${1:-}" == '--help' ]]; then echo 'sudo bash manage-linux.sh [--install-root 既有项目根] <status|logs|restart|stop|start|backup|admin|password>'; exit 0; fi
[[ $EUID == 0 ]] || { echo '请使用 sudo bash manage-linux.sh'; exit 1; }
TASK_SOURCE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
source "$TASK_SOURCE/scripts/deploy/paths.sh"
TASK_EXISTING_ROOT=''
if [[ "${1:-}" == '--install-root' && $# -ge 3 ]]; then TASK_EXISTING_ROOT="$2"; shift 2; fi
TASK_ROOT="$(town_project_root "$TASK_SOURCE" "$TASK_EXISTING_ROOT")"
town_check_existing "$TASK_ROOT"
[[ -f "$TASK_ROOT/.deployment/shared/deploy.json" ]] || { echo '没有已保存的项目内安装。旧布局请用旧包维护入口。'; exit 1; }
case "${1:-}" in
  backup|admin|password|restart|stop|start)
    exec 9>/run/lock/560-town-deploy.lock
    flock -n 9 || { echo '已有部署或维护操作正在运行。'; exit 1; };;
esac
export TOWN_DEPLOY_ROOT="$TASK_ROOT"
exec "$TASK_ROOT/.deployment/runtime/bin/node" "$TASK_ROOT/.deployment/current/scripts/deploy/manage.mjs" "$@"
