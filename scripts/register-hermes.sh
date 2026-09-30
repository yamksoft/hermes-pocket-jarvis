#!/usr/bin/env sh
# Enable the local Hermes API listener and copy only the required values to this project.
set -eu
HERE=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
HERMES_ENV="${HERMES_HOME:-$HOME/.hermes}/.env"
mkdir -p "$(dirname "$HERMES_ENV")"
python3 - "$HERMES_ENV" "$HERE/.env" <<'PY'
import secrets, sys
from pathlib import Path
def read(path):
    values = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1); values[key.strip()] = value.strip()
    return values
def write(path, values): path.write_text("\n".join(f"{k}={v}" for k,v in values.items()) + "\n", encoding="utf-8")
hermes, project = map(Path, sys.argv[1:]); h=read(hermes); key=h.get("API_SERVER_KEY") or secrets.token_urlsafe(48)
h.update({"API_SERVER_ENABLED":"true","API_SERVER_HOST":"127.0.0.1","API_SERVER_PORT":"8642","API_SERVER_CORS_ORIGINS":"http://127.0.0.1:8787,http://localhost:8787","API_SERVER_KEY":key}); write(hermes,h)
p=read(project); p.update({"HERMES_API_BASE":"http://127.0.0.1:8642","API_SERVER_KEY":key,"HERMES_PROFILE":p.get("HERMES_PROFILE","default"),"JARVIS_BIND_HOST":p.get("JARVIS_BIND_HOST","127.0.0.1"),"JARVIS_PORT":p.get("JARVIS_PORT","8787"),"STT_API_URL":p.get("STT_API_URL",""),"STT_API_KEY":p.get("STT_API_KEY",""),"STT_MODEL":p.get("STT_MODEL","whisper-1")}); write(project,p)
PY
chmod 600 "$HERMES_ENV" "$HERE/.env" 2>/dev/null || true
echo "Hermes API registration complete. Restart the gateway: hermes gateway restart (desktop) or stop/start hermes gateway run (Termux)."
