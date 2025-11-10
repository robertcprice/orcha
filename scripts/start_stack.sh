#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(
  cd "$(dirname "${BASH_SOURCE[0]}")/.." >/dev/null 2>&1 && pwd
)"
WEB_UI_DIR="${ROOT_DIR}/web-ui"
LOG_DIR="${ROOT_DIR}/logs/runtime"
mkdir -p "${LOG_DIR}"

# Load environment variables from .env if present
if [[ -f "${ROOT_DIR}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "${ROOT_DIR}/.env"
  set +a
fi

info() {
  printf '➡️  %s\n' "$*"
}

success() {
  printf '✅ %s\n' "$*"
}

skip() {
  printf '⏭️  %s\n' "$*"
}

error() {
  printf '❌ %s\n' "$*" >&2
}

pid_is_running() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file" 2>/dev/null || true)"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      echo "$pid"
      return 0
    fi
  fi
  return 1
}

write_pid() {
  local pid="$1"
  local pid_file="$2"
  echo "$pid" >"$pid_file"
}

start_redis() {
  info "Starting Redis (if needed)..."
  if redis-cli ping >/dev/null 2>&1; then
    skip "Redis already running."
    return
  fi

  redis-server --daemonize yes >/dev/null
  sleep 1
  if redis-cli ping >/dev/null 2>&1; then
    success "Redis started."
  else
    error "Failed to start Redis. Please check your installation."
    exit 1
  fi
}

start_websocket() {
  local pid_file="${LOG_DIR}/websocket.pid"
  if pid="$(pid_is_running "$pid_file")"; then
    skip "WebSocket server already running (pid ${pid})."
    return
  fi

  info "Starting WebSocket server..."
  (
    cd "$WEB_UI_DIR"
    nohup npm run websocket:start >>"${LOG_DIR}/websocket.log" 2>&1 &
    write_pid "$!" "$pid_file"
  )
  sleep 1
  success "WebSocket server started (pid $(cat "$pid_file")). Logs: ${LOG_DIR}/websocket.log"
}

start_next() {
  local pid_file="${LOG_DIR}/next.pid"
  if pid="$(pid_is_running "$pid_file")"; then
    skip "Next.js dev server already running (pid ${pid})."
    return
  fi

  info "Starting Next.js dev server..."
  (
    cd "$WEB_UI_DIR"
    nohup npm run dev >>"${LOG_DIR}/next.log" 2>&1 &
    write_pid "$!" "$pid_file"
  )
  sleep 2
  success "Next.js dev server started (pid $(cat "$pid_file")). Logs: ${LOG_DIR}/next.log"
}

start_task_monitor() {
  local pid_file="${LOG_DIR}/task_monitor.pid"
  if pid="$(pid_is_running "$pid_file")"; then
    skip "Task monitor already running (pid ${pid})."
    return
  fi

  local python_bin="${ROOT_DIR}/venv/bin/python"
  if [[ ! -x "$python_bin" ]]; then
    error "Python virtualenv not found at ${python_bin}. Please set up the venv first."
    exit 1
  fi

  info "Starting simulated task monitor..."
  (
    cd "$ROOT_DIR"
    nohup "$python_bin" orchestrator/task_monitor.py >>"${LOG_DIR}/task_monitor.log" 2>&1 &
    write_pid "$!" "$pid_file"
  )
  sleep 1
  success "Task monitor started (pid $(cat "$pid_file")). Logs: ${LOG_DIR}/task_monitor.log"
}

start_redis
start_websocket
start_next
start_task_monitor

printf '\n🎉  Stack is up! Access the UI at http://localhost:3002\n'
printf '    Logs live under %s\n' "${LOG_DIR}"
