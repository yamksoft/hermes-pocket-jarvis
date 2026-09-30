#!/usr/bin/env sh
# Cross-platform setup for Linux, macOS, WSL, and Android Termux.
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$HERE"

if [ -n "${TERMUX_VERSION:-}" ]; then
  echo "Termux detected: installing Python, Node, and tmux..."
  pkg update
  pkg install -y python nodejs curl tmux
fi

PYTHON_BIN=${PYTHON_BIN:-python3}
command -v "$PYTHON_BIN" >/dev/null 2>&1 || PYTHON_BIN=python
if ! command -v uv >/dev/null 2>&1; then
  "$PYTHON_BIN" -m pip install --user uv
  export PATH="$HOME/.local/bin:$PATH"
fi
uv sync --all-groups
[ -f .env ] || cp .env.example .env
printf '%s\n' "Ready. Edit .env, then run ./scripts/register-hermes.sh, ./scripts/start.sh, and ./scripts/agent.sh"
