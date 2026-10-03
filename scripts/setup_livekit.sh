#!/bin/bash
set -e

cd "$(dirname "$0")/.."
SCRIPT_DIR="$(pwd)"
EXTRACT_PATH="$SCRIPT_DIR/bin/livekit"

echo "Downloading latest LiveKit Server for Linux..."
LIVEKIT_API="https://api.github.com/repos/livekit/livekit/releases/latest"
DOWNLOAD_URL=$(curl -s $LIVEKIT_API | jq -r '.assets[] | select(.name | contains("linux_amd64.tar.gz")) | .browser_download_url')

if [ -n "$DOWNLOAD_URL" ]; then
    TAR_PATH="$SCRIPT_DIR/livekit-server.tar.gz"
    
    if [ ! -f "$EXTRACT_PATH/livekit-server" ]; then
        echo "Downloading LiveKit Server from $DOWNLOAD_URL ..."
        curl -L $DOWNLOAD_URL -o "$TAR_PATH"
        echo "Extracting LiveKit Server..."
        mkdir -p "$EXTRACT_PATH"
        tar -xzf "$TAR_PATH" -C "$EXTRACT_PATH"
        rm "$TAR_PATH"
        chmod +x "$EXTRACT_PATH/livekit-server"
        echo "LiveKit Server installed successfully in $EXTRACT_PATH."
    else
        echo "LiveKit Server is already installed in $EXTRACT_PATH."
    fi
else
    echo "Error finding LiveKit Linux release."
    exit 1
fi
