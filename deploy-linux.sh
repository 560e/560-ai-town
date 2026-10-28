#!/usr/bin/env bash
# Project-root Linux installer. Never run with bash -x: interactive configuration is private.
set -Eeuo pipefail
umask 077
if [[ "${1:-}" == '--help' ]]; then
  printf '%s\n' 'sudo bash deploy-linux.sh [--check|--repair|--migrate-from 旧项目根]' 'Debian 12/13, Ubuntu 22.04/24.04 LTS, systemd, x86_64/arm64. Interactive install, update and root migration.'
  exit 0
fi
TASK_ACTION=''
if [[ "${1:-}" == '--check' || "${1:-}" == '--repair' ]]; then TASK_ACTION="$1"; shift; fi
TASK_EXISTING_ROOT=''
TASK_MIGRATE_FROM=''
if [[ "${1:-}" == '--migrate-from' && $# -ge 2 ]]; then TASK_MIGRATE_FROM="$2"; shift 2; fi
if [[ "${1:-}" == '--install-root' && $# == 2 ]]; then TASK_EXISTING_ROOT="$2"; shift 2; fi
[[ $# == 0 ]] || { echo '用法：deploy-linux.sh [--check|--repair] [--install-root 既有项目根] | --migrate-from 旧项目根 | --help'; exit 1; }
[[ $EUID == 0 ]] || { echo '请使用 sudo bash deploy-linux.sh'; exit 1; }
TASK_SOURCE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
TASK_INTERACTIVE=0

# Acquire the terminal before loading helper scripts.  A malformed or
# Windows-line-ended helper must report its error in BaoTa instead of exiting
# before the user sees a menu or diagnostic.
if [[ -z "$TASK_ACTION" && -z "$TASK_MIGRATE_FROM" && -z "$TASK_EXISTING_ROOT" ]]; then
  if ! { : </dev/tty; } || ! { : >/dev/tty; } || ! { : 2>/dev/tty; }; then
    cat >&2 <<'EOF'
当前会话没有可交互终端（/dev/tty），部署向导未启动，未修改系统。
请在 SSH 或宝塔的交互终端中重新运行：sudo bash deploy-linux.sh
若只需诊断，请运行：sudo bash deploy-linux.sh --check
EOF
    exit 2
  fi
  # BaoTa can keep stdout/stderr attached to a command collector while stdin
  # points elsewhere.  Bind all three descriptors to the same terminal so
  # the header and read prompt cannot become invisible waiting states.
  exec 0</dev/tty 1>/dev/tty 2>/dev/tty
  TASK_INTERACTIVE=1
fi

source "$TASK_SOURCE/scripts/deploy/paths.sh"

if [[ "$TASK_INTERACTIVE" == 1 ]]; then
  TASK_SERVICE_STATE="$(systemctl is-active 560-town 2>/dev/null || true)"
  # Do not use `sed | head` here: with pipefail enabled, head can close the
  # pipe after the matching line and make sed end with SIGPIPE, which would
  # trigger `set -e` before the menu is printed.
  TASK_SERVICE_ROOT="$(sed -n '\#^WorkingDirectory=# { s#^WorkingDirectory=\(.*\)/\.deployment/current$#\1#p; q; }' /etc/systemd/system/560-town.service 2>/dev/null || true)"
  printf '\n\033[1;36m╔══════════════════════════════════════════════════╗\033[0m\n'
  printf '\033[1;36m║  五六零人工智能 AI 小镇 · Linux 部署向导        ║\033[0m\n'
  printf '\033[1;36m╚══════════════════════════════════════════════════╝\033[0m\n'
  printf '源码目录：%s\n' "$TASK_SOURCE"
  printf '当前服务：%s%s\n\n' "${TASK_SERVICE_STATE:-未安装}" "${TASK_SERVICE_ROOT:+ · $TASK_SERVICE_ROOT}"
  printf '  \033[1;32m[1]\033[0m 开始部署此项目\n'
  [[ -z "$TASK_SERVICE_ROOT" || "$TASK_SERVICE_ROOT" == "$TASK_SOURCE" ]] || printf '  \033[1;33m[2]\033[0m 迁移旧项目到此新目录\n'
  printf '  \033[1;34m[3]\033[0m 查看部署状态与诊断\n'
  printf '  \033[0;37m[0]\033[0m 退出\n\n'
  if ! read -r -p '请选择操作 [1]: ' TASK_MENU; then
    echo '未读取到菜单选择，部署向导未启动，未修改系统。' >&2
    exit 2
  fi
  case "${TASK_MENU:-1}" in
    1) ;;
    2) [[ -n "$TASK_SERVICE_ROOT" && "$TASK_SERVICE_ROOT" != "$TASK_SOURCE" ]] || { echo '没有可迁移的旧项目根。'; exit 1; }; exec bash "$TASK_SOURCE/deploy-linux.sh" --migrate-from "$TASK_SERVICE_ROOT" ;;
    3) exec bash "$TASK_SOURCE/deploy-linux.sh" --check ;;
    0) echo '已退出，未修改系统。'; exit 0 ;;
    *) echo '无效选择，未修改系统。'; exit 1 ;;
  esac
fi
if [[ -n "$TASK_MIGRATE_FROM" ]]; then
  [[ -z "$TASK_ACTION" && -z "$TASK_EXISTING_ROOT" ]] || { echo '迁移模式不能同时使用 --check、--repair 或 --install-root。'; exit 1; }
  TASK_ROOT="$(town_project_root "$TASK_SOURCE")"
  TASK_MIGRATE_FROM="$(cd -- "$TASK_MIGRATE_FROM" && pwd -P)"
  [[ -f "$TASK_MIGRATE_FROM/.deployment/shared/deploy.json" ]] || { echo '旧项目根没有受管理部署配置，不能迁移。'; exit 1; }
  [[ "$TASK_MIGRATE_FROM" != "$TASK_ROOT" ]] || { echo '新旧项目根不能相同。'; exit 1; }
  [[ ! -e "$TASK_ROOT/.deployment/shared/deploy.json" ]] || { echo '新项目根已有部署配置，请使用普通升级。'; exit 1; }
else
  TASK_ROOT="$(town_project_root "$TASK_SOURCE" "$TASK_EXISTING_ROOT")"
fi
if [[ -n "$TASK_ACTION" ]]; then
  exec bash "$TASK_SOURCE/scripts/deploy/doctor.sh" "$TASK_ACTION" "$TASK_SOURCE" "$TASK_ROOT"
fi
if [[ -f "$TASK_SOURCE/FILES.sha256" ]]; then
  (cd "$TASK_SOURCE"; sha256sum --check --strict --quiet FILES.sha256) || { echo '发布文件校验失败，请重新上传完整包；不要混用旧文件或补丁。'; exit 1; }
fi
if [[ -z "$TASK_MIGRATE_FROM" ]] && ! town_check_existing "$TASK_ROOT"; then
  if [[ -t 0 ]]; then
    read -r -p '是否进入已知残留服务的修复检查？输入 yes（不会删除数据库）：' TASK_FIX
    if [[ "$TASK_FIX" == yes ]]; then
      bash "$TASK_SOURCE/scripts/deploy/doctor.sh" --repair "$TASK_SOURCE" "$TASK_ROOT"
      town_check_existing "$TASK_ROOT"
    else exit 1; fi
  else exit 1; fi
fi
source /etc/os-release
ARCH="$(town_check_platform "$ID" "$VERSION_ID" "$(uname -m)")"
[[ -d /run/systemd/system ]] || { echo '需要已启动的 systemd；不支持普通 Docker 容器。'; exit 1; }
exec 9>/run/lock/560-town-deploy.lock
flock -n 9 || { echo '已有部署正在运行。'; exit 1; }
ROOT="$TASK_SOURCE"
[[ -f "$ROOT/package-lock.json" && -f "$ROOT/scripts/deploy/wizard.mjs" ]] || { echo '请使用解压后的完整发布包。'; exit 1; }
echo '安装基础工具；不会升级整套操作系统，也不会修改防火墙或已有网站。'
export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl xz-utils tar rsync python3 make g++ postgresql-client
RUNTIME="$TASK_ROOT/.deployment/runtime"
mkdir -p -m 755 "$TASK_ROOT/.deployment"
[[ $(df -Pk "$TASK_ROOT" | awk 'NR==2 {print $4}') -ge 4194304 ]] || { echo '项目磁盘可用空间至少需要 4GiB。'; exit 1; }
if [[ ! -x "$RUNTIME/bin/node" ]] || [[ "$("$RUNTIME/bin/node" -p 'process.versions.node.split(".")[0]')" != 24 ]]; then
  if [[ -e "$RUNTIME" || -L "$RUNTIME" ]]; then
    [[ ! -L "$RUNTIME" ]] || { echo '运行时是外部链接，拒绝替换。'; exit 1; }
    if systemctl is-active --quiet 560-town; then echo '活动服务的运行时不兼容，需先安排维护窗口。'; exit 1; fi
    read -r -p '专用Node运行时不完整或版本不兼容，是否归档后重新下载？输入 yes：' TASK_RUNTIME_FIX
    [[ "$TASK_RUNTIME_FIX" == yes ]] || exit 1
    install -d -m 700 "$TASK_ROOT/.deployment/backups"
    mv "$RUNTIME" "$TASK_ROOT/.deployment/backups/runtime-$(date +%Y%m%d-%H%M%S)-$$"
  fi
  TMP_NODE="$(mktemp -d)"
  trap 'rm -rf -- "$TMP_NODE"' EXIT
  BASE=https://nodejs.org/dist/latest-v24.x
  curl --fail --silent --show-error --location --retry 3 "$BASE/SHASUMS256.txt" -o "$TMP_NODE/SHASUMS256.txt"
  FILE="$(awk -v arch="$ARCH" '$2 ~ ("^node-v24\\.[0-9]+\\.[0-9]+-linux-" arch "\\.tar\\.xz$") {print $2}' "$TMP_NODE/SHASUMS256.txt")"
  [[ "$FILE" =~ ^node-v24\.[0-9]+\.[0-9]+-linux-(x64|arm64)\.tar\.xz$ ]] || { echo '无法识别官方 Node.js 24 发布文件。'; exit 1; }
  curl --fail --silent --show-error --location --retry 3 "$BASE/$FILE" -o "$TMP_NODE/$FILE"
  (cd "$TMP_NODE"; awk -v file="$FILE" '$2 == file' SHASUMS256.txt | sha256sum --check --strict -)
  mkdir -m 755 "$TMP_NODE/runtime"
  tar -xJf "$TMP_NODE/$FILE" --strip-components=1 -C "$TMP_NODE/runtime"
  chmod -R a+rX "$TMP_NODE/runtime"
  "$TMP_NODE/runtime/bin/node" --version
  mv "$TMP_NODE/runtime" "$RUNTIME"
fi
export PATH="$RUNTIME/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export TOWN_DEPLOY_ROOT="$TASK_ROOT"
[[ -z "$TASK_MIGRATE_FROM" ]] || export TOWN_MIGRATE_FROM="$TASK_MIGRATE_FROM"
unset TOWN_PASSWORD_AUTH TOWN_TRUST_PROXY NODE_ENV DATABASE_URL BETTER_AUTH_SECRET BETTER_AUTH_URL TOWN_LOCAL_AUTH TOWN_LOCAL_TEST_RESIDENT TOWN_MANAGE_ENTRY TOWN_SYSTEM_ENTRY
cd "$ROOT"
node "$TASK_SOURCE/scripts/deploy/wizard.mjs"
