#!/usr/bin/env sh
# Cross-platform setup for Linux, macOS, WSL, and Android Termux.
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$HERE"

if [ -n "${TERMUX_VERSION:-}" ]; then
  echo "Termux detected: installing Python, Node, tmux, and jq..."
  pkg update
  pkg install -y python nodejs curl tmux jq
elif command -v apt-get >/dev/null 2>&1; then
  if ! command -v jq >/dev/null 2>&1 || ! command -v curl >/dev/null 2>&1; then
    echo "Debian/Ubuntu detected. Installing missing dependencies (jq, curl)..."
    echo "You may be prompted for your sudo password."
    sudo apt-get update
    sudo apt-get install -y curl jq
  fi
fi

PYTHON_BIN=${PYTHON_BIN:-python3}
command -v "$PYTHON_BIN" >/dev/null 2>&1 || PYTHON_BIN=python
if ! command -v uv >/dev/null 2>&1; then
  "$PYTHON_BIN" -m pip install --user uv
  export PATH="$HOME/.local/bin:$PATH"
fi
uv sync --all-groups
[ -f .env ] || cp .env.example .env

# Create environment configuration files for backend if they don't exist
cat <<EOF > .env.local.template
# Backend LiveKit Server Config (Local Mode)
LIVEKIT_URL=http://127.0.0.1:7880
LIVEKIT_PUBLIC_URL=http://127.0.0.1:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret

# Frontend LiveKit Server Config
NEXT_PUBLIC_LIVEKIT_URL=ws://127.0.0.1:7880
NEXT_PUBLIC_APP_CONFIG_ENDPOINT=/api/livekit/config
EOF

cat <<EOF > .env.cloud.template
# Backend LiveKit Server Config (Cloud Mode)
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_PUBLIC_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret

# Frontend LiveKit Server Config
NEXT_PUBLIC_LIVEKIT_URL=wss://your-project.livekit.cloud
NEXT_PUBLIC_APP_CONFIG_ENDPOINT=/api/livekit/config
EOF

[ -f .env.local ] || cp .env.local.template .env.local
[ -f .env.cloud ] || cp .env.cloud.template .env.cloud

# Copy them to frontend as well so it's ready natively
mkdir -p frontend
[ -f frontend/.env.local ] || cp .env.local frontend/.env.local
[ -f frontend/.env.cloud ] || cp .env.cloud frontend/.env.cloud

# Cleanup templates
rm -f .env.local.template .env.cloud.template

echo ""
echo "========================================================"
echo "✅ Setup Complete!"
echo "========================================================"
echo "Next Steps:"
echo "1. (Optional) If you want to use a Local LiveKit server (Offline Mode),"
echo "   run the following command to install it:"
echo "   ./scripts/setup_livekit.sh"
echo ""
echo "2. Edit your environment variables in the following 5 files:"
echo "   - .env, .env.local, .env.cloud (Backend)"
echo "   - frontend/.env.local, frontend/.env.cloud (Frontend)"
echo ""
echo "3. To start the system, open 3 separate terminal windows and run:"
echo "   Terminal 1 (Backend) : ./scripts/start.sh"
echo "   Terminal 2 (AI Agent): ./scripts/agent.sh"
echo "   Terminal 3 (Frontend): cd frontend && npm run dev"
echo "========================================================"
echo ""
