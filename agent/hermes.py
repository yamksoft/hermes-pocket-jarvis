"""Server-side Hermes Runs client used only by the LiveKit agent."""

from __future__ import annotations

import asyncio
import os
import time
from typing import Any

import httpx


class HermesRunClient:
    def __init__(self) -> None:
        self.base = os.getenv("HERMES_API_BASE", "http://127.0.0.1:8642").rstrip("/")
        self.key = os.getenv("API_SERVER_KEY", "").strip()
        self.timeout_seconds = float(os.getenv("HERMES_RUN_TIMEOUT_SECONDS", "120"))

    @property
    def headers(self) -> dict[str, str]:
        headers = {"Accept": "application/json", "Content-Type": "application/json"}
        if self.key:
            headers["Authorization"] = f"Bearer {self.key}"
        return headers

    async def run(self, instruction: str) -> dict[str, Any]:
        """Create a Hermes run then poll its public run record until it settles.

        Hermes remains responsible for policy and approvals.  This worker never
        approves an action; it returns the pending run identifier to the UI.
        """
        async with httpx.AsyncClient(timeout=httpx.Timeout(30, connect=5)) as client:
            response = await client.post(
                f"{self.base}/v1/runs", headers=self.headers, json={"input": instruction}
            )
            response.raise_for_status()
            created = response.json()
            run_id = str(created.get("run_id") or created.get("id") or "")
            if not run_id:
                raise RuntimeError("Hermes did not return a run_id")

            deadline = time.monotonic() + self.timeout_seconds
            latest: dict[str, Any] = created
            while time.monotonic() < deadline:
                await asyncio.sleep(1)
                status_response = await client.get(
                    f"{self.base}/v1/runs/{run_id}", headers=self.headers
                )
                status_response.raise_for_status()
                latest = status_response.json()
                status = str(latest.get("status", "")).lower()
                if any(word in status for word in ("approval", "waiting")):
                    return {"run_id": run_id, "status": status, "approval_required": True, "run": latest}
                if status in {"completed", "failed", "cancelled", "interrupted", "error"}:
                    return {"run_id": run_id, "status": status, "run": latest, "text": self._text(latest)}

            return {"run_id": run_id, "status": "running", "text": "Hermes is still working."}

    @staticmethod
    def _text(payload: dict[str, Any]) -> str:
        for key in ("output_text", "text", "response", "result", "message"):
            value = payload.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()[:8000]
        return "Hermes completed the requested run."
