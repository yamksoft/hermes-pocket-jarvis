from fastapi.testclient import TestClient

import server


def test_livekit_token_is_short_lived_and_does_not_return_server_secrets(monkeypatch) -> None:
    monkeypatch.setenv("LIVEKIT_URL", "wss://demo.livekit.cloud")
    monkeypatch.setenv("LIVEKIT_PUBLIC_URL", "wss://demo.livekit.cloud")
    monkeypatch.setenv("LIVEKIT_API_KEY", "APIkey")
    monkeypatch.setenv("LIVEKIT_API_SECRET", "a-secret-that-is-at-least-thirty-two-bytes")
    monkeypatch.setenv("AGENT_NAME", "hermes-jarvis")

    with TestClient(server.app) as client:
        response = client.post("/api/livekit/token", json={"name": "Yahya / هاتف"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["server_url"] == "wss://demo.livekit.cloud"
    assert payload["room_name"].startswith("jarvis-")
    assert payload["participant_token"].count(".") == 2
    assert "a-secret-that-is-at-least-thirty-two-bytes" not in response.text
