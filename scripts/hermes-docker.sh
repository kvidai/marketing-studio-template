#!/usr/bin/env bash
# Hermes Agent — Docker isolation runner for marketing-studio
# Docs: https://hermes-agent.nousresearch.com/docs/user-guide/docker
#
# Usage:
#   ./scripts/hermes-docker.sh [MODE]
#
# Modes:
#   setup        — First-time Hermes setup (run once)
#   interactive  — Interactive CLI chat, workspace mounted  (default)
#   gateway      — Background gateway service on :8642
#   dashboard    — Gateway + web dashboard on :8642 / :9119
#   stop         — Stop background gateway container
#   logs         — Tail gateway logs
#   status       — Show running Hermes containers
#   shell        — Bare bash shell inside the container (for manual login)
#
# Authentication for Claude Code / Codex CLI inside Docker:
#   Method A — API key (recommended, fully headless):
#     export ANTHROPIC_API_KEY=sk-ant-...
#     export OPENAI_API_KEY=sk-...
#     ./scripts/hermes-docker.sh
#
#   Method B — mount host credentials (reuse existing login):
#     MOUNT_CLAUDE=1 ./scripts/hermes-docker.sh
#     MOUNT_CODEX=1  ./scripts/hermes-docker.sh
#
#   Method C — login interactively inside a running container:
#     ./scripts/hermes-docker.sh shell
#     # inside: claude   (browser OAuth or API key prompt)
#     # inside: codex    (OPENAI_API_KEY prompt)
#     # Commit the container to preserve login state (see below)
#
# Env overrides:
#   HERMES_DATA=<path>      Hermes data dir           (default: ~/.hermes)
#   MOUNT_CLAUDE=1          Mount ~/.claude into container
#   MOUNT_CODEX=1           Mount ~/.codex  into container
#   ANTHROPIC_API_KEY=...   Passed into container if set in host env
#   OPENAI_API_KEY=...      Passed into container if set in host env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
HERMES_DATA="${HERMES_DATA:-$HOME/.hermes}"
IMAGE="nousresearch/hermes-agent"
CONTAINER_NAME="hermes-marketing-studio"
WORKSPACE="/workspace"

MODE="${1:-interactive}"

mkdir -p "$HERMES_DATA"

# ── Credential mounts (Method B) ────────────────────────────────────────────
CREDENTIAL_MOUNTS=()

# Claude Code stores OAuth token / API key in ~/.claude
if [[ "${MOUNT_CLAUDE:-0}" == "1" ]] && [[ -d "$HOME/.claude" ]]; then
  CREDENTIAL_MOUNTS+=(-v "$HOME/.claude:/root/.claude")
  echo "[hermes] Mounting ~/.claude (Claude Code credentials)"
fi

# Codex CLI stores config in ~/.codex
if [[ "${MOUNT_CODEX:-0}" == "1" ]] && [[ -d "$HOME/.codex" ]]; then
  CREDENTIAL_MOUNTS+=(-v "$HOME/.codex:/root/.codex")
  echo "[hermes] Mounting ~/.codex (Codex CLI credentials)"
fi

# ── API key passthrough (Method A) ──────────────────────────────────────────
API_KEY_ENV=()
[[ -n "${ANTHROPIC_API_KEY:-}" ]] && API_KEY_ENV+=(-e "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY")
[[ -n "${OPENAI_API_KEY:-}" ]]    && API_KEY_ENV+=(-e "OPENAI_API_KEY=$OPENAI_API_KEY")

# ── Helpers ──────────────────────────────────────────────────────────────────
_check_already_running() {
  if docker ps -q --filter "name=^/${CONTAINER_NAME}$" | grep -q .; then
    echo "[hermes] Gateway already running. Use 'stop' first."
    exit 1
  fi
}

# ── Modes ────────────────────────────────────────────────────────────────────
case "$MODE" in

  setup)
    echo "[hermes] First-time setup..."
    docker run -it --rm \
      -v "$HERMES_DATA:/opt/data" \
      "${CREDENTIAL_MOUNTS[@]+"${CREDENTIAL_MOUNTS[@]}"}" \
      "${API_KEY_ENV[@]+"${API_KEY_ENV[@]}"}" \
      "$IMAGE" setup
    ;;

  interactive|i)
    echo "[hermes] Starting interactive CLI — workspace: $PROJECT_DIR"
    docker run -it --rm \
      --name "${CONTAINER_NAME}-cli" \
      --memory=4g --cpus=2 \
      -v "$HERMES_DATA:/opt/data" \
      -v "$PROJECT_DIR:$WORKSPACE" \
      -w "$WORKSPACE" \
      "${CREDENTIAL_MOUNTS[@]+"${CREDENTIAL_MOUNTS[@]}"}" \
      "${API_KEY_ENV[@]+"${API_KEY_ENV[@]}"}" \
      "$IMAGE"
    ;;

  gateway|gw)
    _check_already_running
    echo "[hermes] Starting gateway (daemon) on :8642..."
    docker run -d \
      --name "$CONTAINER_NAME" \
      --restart unless-stopped \
      --memory=4g --cpus=2 \
      -v "$HERMES_DATA:/opt/data" \
      -v "$PROJECT_DIR:$WORKSPACE" \
      -w "$WORKSPACE" \
      -p 8642:8642 \
      "${CREDENTIAL_MOUNTS[@]+"${CREDENTIAL_MOUNTS[@]}"}" \
      "${API_KEY_ENV[@]+"${API_KEY_ENV[@]}"}" \
      "$IMAGE" gateway run
    echo "[hermes] Gateway running → http://localhost:8642"
    ;;

  dashboard)
    _check_already_running
    echo "[hermes] Starting gateway + dashboard..."
    docker run -d \
      --name "$CONTAINER_NAME" \
      --restart unless-stopped \
      --memory=4g --cpus=2 \
      -v "$HERMES_DATA:/opt/data" \
      -v "$PROJECT_DIR:$WORKSPACE" \
      -w "$WORKSPACE" \
      -p 8642:8642 \
      -p 9119:9119 \
      -e HERMES_DASHBOARD=1 \
      -e HERMES_DASHBOARD_HOST=0.0.0.0 \
      "${CREDENTIAL_MOUNTS[@]+"${CREDENTIAL_MOUNTS[@]}"}" \
      "${API_KEY_ENV[@]+"${API_KEY_ENV[@]}"}" \
      "$IMAGE" gateway run
    echo "[hermes] Gateway   → http://localhost:8642"
    echo "[hermes] Dashboard → http://localhost:9119"
    ;;

  # Method C: drop into a shell, login manually, then optionally commit the image
  shell)
    echo "[hermes] Opening bash shell in container..."
    echo "[hermes] To login manually:"
    echo "           claude            # Claude Code (browser OAuth or API key)"
    echo "           codex             # Codex CLI   (prompts for OPENAI_API_KEY)"
    echo ""
    echo "[hermes] To persist login state after exit:"
    echo "           docker commit ${CONTAINER_NAME}-shell hermes-ms-authed"
    echo "           IMAGE=hermes-ms-authed ./scripts/hermes-docker.sh"
    echo ""
    docker run -it --rm \
      --name "${CONTAINER_NAME}-shell" \
      --memory=4g --cpus=2 \
      -v "$HERMES_DATA:/opt/data" \
      -v "$PROJECT_DIR:$WORKSPACE" \
      -w "$WORKSPACE" \
      "${CREDENTIAL_MOUNTS[@]+"${CREDENTIAL_MOUNTS[@]}"}" \
      "${API_KEY_ENV[@]+"${API_KEY_ENV[@]}"}" \
      --entrypoint bash \
      "$IMAGE"
    ;;

  stop)
    echo "[hermes] Stopping gateway..."
    docker stop "$CONTAINER_NAME" 2>/dev/null && docker rm "$CONTAINER_NAME" 2>/dev/null || true
    echo "[hermes] Stopped."
    ;;

  logs)
    docker logs -f "$CONTAINER_NAME"
    ;;

  status)
    echo "[hermes] Running containers:"
    docker ps --filter "name=hermes" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    ;;

  *)
    grep "^#" "$0" | sed 's/^# \?//'
    exit 1
    ;;

esac
