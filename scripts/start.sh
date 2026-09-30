#!/usr/bin/env sh
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$HERE"
[ -x .venv/bin/python ] || { echo "Run ./scripts/setup.sh first." >&2; exit 1; }
# Parse only listener settings; never source .env because API keys may contain shell characters.
setting() { sed -n "s/^$1=//p" .env 2>/dev/null | tail -n 1; }
HOST=${JARVIS_BIND_HOST:-$(setting JARVIS_BIND_HOST)}
PORT=${JARVIS_PORT:-$(setting JARVIS_PORT)}
exec uv run uvicorn server:app --host "${HOST:-127.0.0.1}" --port "${PORT:-8787}"
