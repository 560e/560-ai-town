#!/usr/bin/env bash
# Shared by entry points before downloading anything or changing the system.
town_project_root() {
  local task_source task_root
  task_source="$(cd -- "$1" && pwd -P)" || return 1
  if [[ -n "${2:-}" ]]; then
    task_root="$(cd -- "$2" && pwd -P)" || return 1
    [[ -f "$task_root/.deployment/shared/deploy.json" ]] || { echo '指定安装根没有已保存部署；拒绝从候选目录新建实例。' >&2; return 1; }
  elif [[ "$task_source" == */.deployment/releases/* ]]; then
    task_root="${task_source%%/.deployment/releases/*}"
    [[ -f "$task_root/.deployment/shared/deploy.json" ]] || { echo '运行版本缺少安装根配置。' >&2; return 1; }
  else task_root="$task_source"
  fi
  [[ "$task_root" =~ ^/([a-zA-Z0-9_.-]+/)*[a-zA-Z0-9_.-]+$ && "$task_root" != */.deployment* ]] || { echo '项目绝对路径不允许空格、特殊字符或嵌套部署。' >&2; return 1; }
  case "$task_root" in /etc|/usr|/bin|/sbin|/var|/opt|/srv|/home|/root|/www/wwwroot) echo '请使用独立项目目录。' >&2; return 1;; esac
  printf '%s\n' "$task_root"
}
town_check_platform() {
  case "$1:$2" in debian:12|debian:13|ubuntu:22.04|ubuntu:24.04) ;; *) echo '仅支持 Debian 12/13、Ubuntu 22.04/24.04 LTS。' >&2; return 1;; esac
  case "$3" in x86_64) printf 'x64\n';; aarch64|arm64) printf 'arm64\n';; *) echo '仅支持 x86_64/arm64' >&2; return 1;; esac
}
town_check_existing() {
  local task_root="$1"
  if [[ -e /opt/560-town/shared/deploy.json && ! -f "$task_root/.deployment/shared/deploy.json" ]]; then
    echo '检测到旧 /opt 部署。先明确迁移方案并备份；不会新建第二实例或覆盖原服务。' >&2; return 1
  fi
  if [[ -e /etc/systemd/system/560-town.service ]]; then
    [[ -f "$task_root/.deployment/shared/deploy.json" ]] || { echo '已有同名服务，但当前目录缺少部署记录。可能是文件删除后的残留；请运行 deploy-linux.sh --repair 核对，不代表一定属于其他安装根。' >&2; return 1; }
    grep -Fxq "WorkingDirectory=$task_root/.deployment/current" /etc/systemd/system/560-town.service || { echo '服务与安装根不一致，拒绝覆盖。' >&2; return 1; }
  fi
}
