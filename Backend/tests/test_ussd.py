"""Tests for POST /ussd."""
import pytest


@pytest.fixture(autouse=True)
def mock_redis(monkeypatch):
    """Avoid real Redis in tests."""
    session_store = {}

    def get_session(session_id):
        return session_store.get(session_id, {})

    def set_session(session_id, data):
        session_store[session_id] = data

    monkeypatch.setattr("app.ussd.handler.get_session", get_session)
    monkeypatch.setattr("app.ussd.handler.set_session", set_session)


def test_ussd_main_menu_returns_con(client):
    """First USSD request (no text) returns CON with menu."""
    r = client.post(
        "/ussd",
        data={"sessionId": "test-123", "phoneNumber": "254700000000", "text": ""},
    )
    assert r.status_code == 200
    text = r.text
    assert text.startswith("CON ")
    assert "NannyChain" in text
    assert "Create account" in text


def test_ussd_optional_auth_no_key_required_when_unset(client):
    """When USSD_API_KEY is not set, request without auth is accepted."""
    r = client.post(
        "/ussd",
        data={"sessionId": "s1", "phoneNumber": "254711111111", "text": ""},
    )
    assert r.status_code == 200
