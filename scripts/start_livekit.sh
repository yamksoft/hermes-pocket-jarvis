#!/bin/bash
set -e

cd "$(dirname "$0")/.."
SCRIPT_DIR="$(pwd)"
LIVEKIT_PATH="$SCRIPT_DIR/bin/livekit/livekit-server"

if [ ! -f "$LIVEKIT_PATH" ]; then
    echo "Error: LiveKit Server not found. Please run ./scripts/setup_livekit.sh first."
    exit 1
fi

echo "Starting Local LiveKit Server on port 7880 (DEV MODE)..."
echo "API Key: devkey"
echo "API Secret: secret"
exec "$LIVEKIT_PATH" --dev --bind 0.0.0.0
