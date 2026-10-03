#!/usr/bin/env sh
# Run the Gemini Live worker. For a durable cloud agent, deploy the Dockerfile
# to LiveKit Cloud instead of relying on Android background execution.
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$HERE"
[ -x .venv/bin/python ] || { echo "Run ./scripts/setup.sh first." >&2; exit 1; }
export PATH="$HOME/.local/bin:$PATH"
exec uv run python agent/agent.py dev
