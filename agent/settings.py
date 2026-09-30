"""Small, testable configuration helpers shared by the web bridge and worker."""

from __future__ import annotations

import os
import re
import secrets


def setting(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def safe_name(value: str, fallback: str) -> str:
    """Return a LiveKit-compatible name without leaking user-supplied text."""
    normalized = re.sub(r"[^a-zA-Z0-9_-]+", "-", value.strip()).strip("-_")
    return normalized[:64] or fallback


def new_room_name() -> str:
    return f"jarvis-{secrets.token_urlsafe(12).lower().replace('_', '-')}"


def livekit_public_url() -> str:
    return setting("LIVEKIT_PUBLIC_URL") or setting("LIVEKIT_URL")
