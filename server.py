"""Pocket JARVIS: a lightweight, cross-platform Hermes dashboard bridge.

It has no local speech or LLM model. All Hermes credentials stay on this local
server, while the browser receives only dashboard data and audio playback uses
the platform's native speech synthesis.
"""

from __future__ import annotations

import json
import os
import secrets
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from datetime import timedelta
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from livekit import api as livekit_api

from agent.settings import livekit_public_url, new_room_name, safe_name

ROOT = Path(__file__).resolve().parent


def load_env(path: Path, override: bool = False) -> None:
    """Small .env reader; avoids an additional runtime dependency."""
    if not path.exists():
        return
    for source_line in path.read_text(encoding="utf-8").splitlines():
        line = source_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key and (override or key not in os.environ):
            os.environ[key] = value.strip().strip("\"").strip("'")


load_env(ROOT / ".env")

try:
    with open(ROOT / "active_mode.txt", "r", encoding="utf-8") as f:
        active_mode = f.read().strip()
except FileNotFoundError:
    active_mode = "local"

if active_mode == "cloud":
    load_env(ROOT / ".env.cloud", override=True)
else:
    load_env(ROOT / ".env.local", override=True)

# Auto-translate localhost to livekit-server when running inside Docker
livekit_url = os.environ.get("LIVEKIT_URL", "")
if os.path.exists("/.dockerenv") and "localhost" in livekit_url:
    os.environ["LIVEKIT_URL"] = livekit_url.replace("localhost", "livekit-server")


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def hermes_base() -> str:
    return env("HERMES_API_BASE", "http://127.0.0.1:8642").rstrip("/")


def hermes_headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    headers = {"Accept": "application/json"}
    if key := env("API_SERVER_KEY"):
        headers["Authorization"] = f"Bearer {key}"
    if extra:
        headers.update(extra)
    return headers


def require_livekit() -> tuple[str, str, str]:
    url = livekit_public_url()
    key = env("LIVEKIT_API_KEY")
    secret = env("LIVEKIT_API_SECRET")
    if not (url and key and secret):
        raise HTTPException(503, "LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET to .env.")
    return url, key, secret


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.http = httpx.AsyncClient(timeout=httpx.Timeout(35, connect=3))
    yield
    await app.state.http.aclose()


app = FastAPI(title="Pocket JARVIS", docs_url=None, redoc_url=None, lifespan=lifespan)


def http_problem(exc: httpx.HTTPStatusError, service: str = "Hermes") -> HTTPException:
    message = f"{service} rejected the request. Check its key and configuration."
    try:
        payload = exc.response.json()
        message = payload.get("detail") or payload.get("error", {}).get("message") or message
    except (ValueError, AttributeError):
        pass
    return HTTPException(exc.response.status_code, str(message))


async def hermes_json(method: str, path: str, **kwargs: Any) -> dict[str, Any]:
    try:
        response = await app.state.http.request(method, f"{hermes_base()}{path}", headers=hermes_headers(), **kwargs)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise http_problem(exc) from exc
    except httpx.RequestError as exc:
        raise HTTPException(503, f"Hermes is unreachable at {hermes_base()}: {exc}") from exc



@app.get("/api/status")
async def status() -> dict[str, Any]:
    started = time.perf_counter()
    gateway: dict[str, Any] = {"online": False, "base": hermes_base(), "detail": "offline"}
    try:
        response = await app.state.http.get(f"{hermes_base()}/v1/capabilities", headers=hermes_headers(), timeout=httpx.Timeout(3, connect=2))
        gateway["online"] = response.is_success
        gateway["detail"] = "connected" if response.is_success else f"HTTP {response.status_code}"
        if response.is_success:
            features = response.json().get("features", {})
            gateway["events"] = bool(features.get("run_events_sse", True))
            gateway["approvals"] = bool(features.get("run_approval_response", True))
    except httpx.RequestError:
        pass
    gateway["latency_ms"] = round((time.perf_counter() - started) * 1000)
    return {
        "profile": env("HERMES_PROFILE", "default"),
        "gateway": gateway,
        "livekit": {
            "configured": bool(livekit_public_url() and env("LIVEKIT_API_KEY") and env("LIVEKIT_API_SECRET")),
            "agent": env("AGENT_NAME", "hermes-jarvis"),
        },
        "gemini": {
            "configured": bool(env("GOOGLE_API_KEY")),
            "model": env("GEMINI_LIVE_MODEL", "gemini-3.8-live"),
            "voice": env("GEMINI_LIVE_VOICE", "Puck"),
        },
        "voice": {"input": "Gemini Live via LiveKit", "output": "Gemini Live native audio"},
        "platform": "termux" if "TERMUX_VERSION" in os.environ else os.name,
    }


@app.post("/api/livekit/token")
async def livekit_token(request: Request) -> dict[str, str]:
    """Create a short-lived browser token and explicitly dispatch JARVIS once.

    This endpoint is intentionally served only from the local bridge. If the
    bridge is exposed beyond loopback, add real user authentication first.
    """
    url, key, secret = require_livekit()
    try:
        payload = await request.json()
    except ValueError:
        payload = {}
    requested_name = str(payload.get("name", "user"))
    identity = f"web-{secrets.token_urlsafe(10).lower().replace('_', '-')}"
    room_name = new_room_name()
    dispatch = livekit_api.RoomAgentDispatch(
        agent_name=env("AGENT_NAME", "hermes-jarvis"),
        metadata=json.dumps({"profile": env("HERMES_PROFILE", "default")}),
    )
    if deployment := env("LIVEKIT_AGENT_DEPLOYMENT"):
        dispatch.deployment = deployment
    token = (
        livekit_api.AccessToken(key, secret)
        .with_identity(identity)
        .with_name(safe_name(requested_name, "user"))
        .with_ttl(timedelta(minutes=15))
        .with_grants(
            livekit_api.VideoGrants(
                room_join=True,
                room=room_name,
                can_publish=True,
                can_publish_data=True,
                can_subscribe=True,
            )
        )
        .with_room_config(livekit_api.RoomConfiguration(agents=[dispatch]))
        .to_jwt()
    )
    return {"server_url": url, "room_name": room_name, "participant_token": token, "identity": identity}


@app.post("/api/run")
async def create_run(request: Request) -> dict[str, Any]:
    payload = await request.json()
    prompt = str(payload.get("input", "")).strip()
    if not prompt:
        raise HTTPException(422, "input is required")
    body: dict[str, Any] = {"input": prompt}
    for name in ("session_id", "instructions", "previous_response_id", "model"):
        if payload.get(name) is not None:
            body[name] = payload[name]
    headers = hermes_headers({"Content-Type": "application/json"})
    if isinstance(payload.get("idempotency_key"), str):
        headers["Idempotency-Key"] = payload["idempotency_key"][:255]
    try:
        response = await app.state.http.post(f"{hermes_base()}/v1/runs", headers=headers, json=body)
        response.raise_for_status()
        return response.json()
    except httpx.HTTPStatusError as exc:
        raise http_problem(exc) from exc
    except httpx.RequestError as exc:
        raise HTTPException(503, f"Could not create Hermes run: {exc}") from exc


@app.get("/api/runs/{run_id}")
async def get_run(run_id: str) -> dict[str, Any]:
    return await hermes_json("GET", f"/v1/runs/{run_id}")


@app.get("/api/runs/{run_id}/events")
async def relay_events(run_id: str, request: Request) -> StreamingResponse:
    async def source() -> AsyncIterator[bytes]:
        try:
            async with app.state.http.stream("GET", f"{hermes_base()}/v1/runs/{run_id}/events", headers=hermes_headers({"Accept": "text/event-stream"}), timeout=None) as response:
                if response.status_code >= 400:
                    body = (await response.aread()).decode("utf-8", "replace")[:500]
                    yield f"event: bridge.error\ndata: {json.dumps({'detail': body})}\n\n".encode()
                    return
                async for chunk in response.aiter_raw():
                    if await request.is_disconnected():
                        return
                    yield chunk
        except httpx.RequestError as exc:
            yield f"event: bridge.error\ndata: {json.dumps({'detail': str(exc)})}\n\n".encode()
    return StreamingResponse(source(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.post("/api/approval")
async def approval(request: Request) -> dict[str, Any]:
    payload = await request.json()
    run_id = str(payload.pop("run_id", "")).strip()
    decision = payload.get("decision")
    if not run_id or decision not in {"once", "allow", "deny"}:
        raise HTTPException(422, "run_id and decision (once, allow, or deny) are required")
    return await hermes_json("POST", f"/v1/runs/{run_id}/approval", json=payload)
