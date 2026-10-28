#!/usr/bin/env bash
# Called from deploy-linux.sh before ordinary installation guards.
set -Eeuo pipefail
umask 077
TASK_MODE="$1"
TASK_SOURCE="$2"
TASK_ROOT="$3"
TASK_BASE="$TASK_ROOT/.deployment"
TASK_UNIT=/etc/systemd/system/560-town.service
TASK_NODE="$TASK_BASE/runtime/bin/node"
source "$TASK_SOURCE/scripts/deploy/paths.sh"
source /etc/os-release
town_check_platform "$ID" "$VERSION_ID" "$(uname -m)" >/dev/null
[[ -d /run/systemd/system ]] || { echo '需要systemd环境。'; exit 1; }
if [[ "$TASK_MODE" == '--repair' ]]; then
  exec 9>/run/lock/560-town-deploy.lock
  flock -n 9 || { echo '已有部署或修复操作正在运行。'; exit 1; }
  [[ -t 0 ]] || { echo '修复需在交互终端确认。'; exit 1; }
fi
confirm() { local answer; read -r -p "$1 输入 yes 继续：" answer; [[ "$answer" == yes ]]; }
backup() {
  TASK_BACKUP="$TASK_BASE/backups/repair-$(date +%Y%m%d-%H%M%S)-$$"
  install -d -m 700 "$TASK_BACKUP"
  [[ ! -e "$TASK_UNIT" ]] || cp -a "$TASK_UNIT" "$TASK_BACKUP/service.before"
  getent passwd town560 > "$TASK_BACKUP/account.before" || true
  echo "修复前记录已保存：$TASK_BACKUP"
}
echo "检查项目：$TASK_ROOT"
systemctl show 560-town -p ActiveState -p SubState -p Result
df -h "$TASK_ROOT"
if [[ ! -f "$TASK_BASE/shared/deploy.json" ]]; then
  echo '当前项目缺少部署记录；不能按普通升级处理。数据库是否存在需另外核实。'
  if [[ "$TASK_MODE" == '--check' ]]; then
    [[ ! -e "$TASK_UNIT" ]] || echo '发现同名服务；可用 --repair 检查是否属于本项目的失效旧服务。'
    exit 1
  fi
  [[ ! -e /opt/560-town/shared/deploy.json ]] || { echo '旧/opt部署配置仍存在，请先备份并迁移，拒绝直接接管。'; exit 1; }
  [[ -f "$TASK_UNIT" ]] || { echo '无旧服务可修复，请运行正常安装向导。'; exit 1; }
  TASK_OLD_HOME=''
  if grep -Fxq "WorkingDirectory=$TASK_ROOT" "$TASK_UNIT" && grep -q '^ExecStart=/opt/560-town-runtime/bin/node ' "$TASK_UNIT"; then
    [[ ! -e /opt/560-town-runtime/bin/node ]] || { echo '旧运行时仍存在，请先确认迁移方案。'; exit 1; }
    TASK_OLD_HOME=/opt/560-town/shared
  elif grep -Fxq "WorkingDirectory=$TASK_BASE/current" "$TASK_UNIT" && grep -Fq "ExecStart=$TASK_BASE/runtime/bin/node node_modules/next/dist/bin/next " "$TASK_UNIT"; then
    TASK_OLD_HOME="$TASK_BASE/shared"
  else
    echo '服务不是本项目已知部署布局，拒绝接管。'; exit 1
  fi
  TASK_STATE="$(systemctl show 560-town -p ActiveState --value)"
  TASK_SUBSTATE="$(systemctl show 560-town -p SubState --value)"
  [[ "$TASK_STATE" == inactive || "$TASK_STATE" == failed || "$TASK_SUBSTATE" == auto-restart ]] || { echo '服务仍在活动，先核实并停止后再修复；不会接管活动站点。'; exit 1; }
  TASK_ACCOUNT="$(getent passwd town560 || true)"
  if [[ -n "$TASK_ACCOUNT" ]]; then
    [[ "$(cut -d: -f6 <<< "$TASK_ACCOUNT")" == "$TASK_OLD_HOME" && "$(cut -d: -f7 <<< "$TASK_ACCOUNT")" == /usr/sbin/nologin && "$(cut -d: -f3 <<< "$TASK_ACCOUNT")" != 0 ]] || { echo '运行账户与已知部署不匹配。'; exit 1; }
  fi
  confirm '将备份并移走失效旧服务，保留town560用户和原文件，只校正其主目录。请确认已备份需保留的数据，或明确选择放弃旧数据重装。' || exit 1
  backup
  systemctl stop 560-town
  systemctl disable 560-town
  mv "$TASK_UNIT" "$TASK_BACKUP/service.disabled"
  if [[ -n "$TASK_ACCOUNT" ]] && ! usermod --home "$TASK_BASE/shared" town560; then
    cp -a "$TASK_BACKUP/service.before" "$TASK_UNIT"
    systemctl daemon-reload
    echo '账户修改失败，服务文件已恢复；没有启动旧服务。'; exit 1
  fi
  systemctl daemon-reload
  systemctl reset-failed 560-town || true
  echo '残留服务已处理。重新执行 sudo bash deploy-linux.sh，保留数据请选择已有数据库；数据库已删除可新建或连接新准备的空库。数据库及旧文件未删除。'
  exit 0
fi
town_check_existing "$TASK_ROOT"
[[ -x "$TASK_NODE" ]] || { echo '项目运行时缺失，请运行部署向导重新安装运行时。'; exit 1; }
"$TASK_NODE" "$TASK_SOURCE/scripts/deploy/recovery.mjs" config "$TASK_BASE"
if [[ ! -e "$TASK_BASE/current" ]]; then
  echo 'current缺失或失效。可恢复的已构建版本：'
  TASK_CANDIDATES="$("$TASK_NODE" "$TASK_SOURCE/scripts/deploy/recovery.mjs" list "$TASK_BASE")"
  [[ -n "$TASK_CANDIDATES" ]] || { echo '没有完整已构建版本，请重新运行正常部署向导继续安装。'; exit 1; }
  printf '%s\n' "$TASK_CANDIDATES"
  [[ "$TASK_MODE" == '--repair' ]] || exit 1
  TASK_STATE="$(systemctl show 560-town -p ActiveState --value)"
  [[ "$TASK_STATE" == inactive || "$TASK_STATE" == failed ]] || { echo '服务仍活动，不更改运行链接。'; exit 1; }
  [[ -f "$TASK_UNIT" ]] || { echo '服务文件缺失，请使用部署向导重新生成。'; exit 1; }
  read -r -p '输入要恢复的完整版本目录名（不会自动选择最新版本）：' TASK_VERSION
  [[ "$TASK_VERSION" =~ ^v[0-9][a-zA-Z0-9._-]*$ ]] || { echo '版本名无效。'; exit 1; }
  TASK_RELEASE="$TASK_BASE/releases/$TASK_VERSION"
  "$TASK_NODE" "$TASK_SOURCE/scripts/deploy/recovery.mjs" valid "$TASK_BASE" "$TASK_RELEASE"
  confirm "恢复 $TASK_VERSION 并启动服务？不会回退数据库结构。" || exit 1
  backup
  [[ ! -L "$TASK_BASE/current" ]] || mv "$TASK_BASE/current" "$TASK_BACKUP/current.before"
  ln -s "$TASK_RELEASE" "$TASK_BASE/current"
  systemctl reset-failed 560-town || true
  systemctl start 560-town
elif [[ ! -L "$TASK_BASE/current" ]]; then
  echo 'current不是受管理链接，拒绝修改。'; exit 1
fi
"$TASK_NODE" "$TASK_SOURCE/scripts/deploy/recovery.mjs" valid "$TASK_BASE" "$TASK_BASE/current"
if [[ "$TASK_MODE" == '--repair' ]]; then
  "$TASK_NODE" "$TASK_SOURCE/scripts/deploy/recovery.mjs" database-repair "$TASK_BASE"
else
  "$TASK_NODE" "$TASK_SOURCE/scripts/deploy/recovery.mjs" database "$TASK_BASE"
fi
if [[ "$TASK_MODE" == '--repair' ]] && ! systemctl is-active --quiet 560-town; then
  confirm '运行链接有效，是否启动当前服务？' || exit 1
  systemctl start 560-town
fi
if [[ "$TASK_MODE" == '--repair' ]]; then
  for ((i=0;i<10;i++)); do
    if "$TASK_NODE" "$TASK_SOURCE/scripts/deploy/recovery.mjs" health "$TASK_BASE"; then exit 0; fi
    sleep 2
  done
  echo '恢复后检查未通过；保留链接和日志供排查，不循环重新部署。'; exit 1
fi
"$TASK_NODE" "$TASK_SOURCE/scripts/deploy/recovery.mjs" health "$TASK_BASE"
