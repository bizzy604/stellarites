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


def test_ussd_flow_option_3_exit(client):
    """Main menu -> 3 -> END Goodbye."""
    client.post("/ussd", data={"sessionId": "ex", "phoneNumber": "254700000000", "text": ""})
    r = client.post("/ussd", data={"sessionId": "ex", "phoneNumber": "254700000000", "text": "3"})
    assert r.status_code == 200
    assert r.text.strip() == "END Goodbye."


def test_ussd_flow_option_1_then_phone_prompt(client):
    """Main menu -> 1 -> CON Enter your phone number."""
    client.post("/ussd", data={"sessionId": "s1", "phoneNumber": "254700000000", "text": ""})
    r = client.post("/ussd", data={"sessionId": "s1", "phoneNumber": "254700000000", "text": "1"})
    assert r.status_code == 200
    assert r.text.startswith("CON ")
    assert "Enter your phone number" in r.text


def test_ussd_flow_create_account_mocked(client, monkeypatch):
    """Full flow: main -> 1 -> phone -> create_account mocked -> END Account created."""
    def fake_create_account(phone, name=None, send_sms=True):
        return {"worker_id": "NW-ABCD1234", "stellar_public_key": "G...", "phone": phone, "already_exists": False}

    monkeypatch.setattr("app.ussd.handler.create_account", fake_create_account)
    client.post("/ussd", data={"sessionId": "reg", "phoneNumber": "254712345678", "text": ""})
    client.post("/ussd", data={"sessionId": "reg", "phoneNumber": "254712345678", "text": "1"})
    r = client.post(
        "/ussd",
        data={"sessionId": "reg", "phoneNumber": "254712345678", "text": "1*254712345678"},
    )
    assert r.status_code == 200
    assert r.text.startswith("END ")
    assert "Account created" in r.text
    assert "NW-ABCD1234" in r.text


def test_ussd_flow_signin_no_account(client, monkeypatch):
    """Full flow: main -> 2 -> phone -> no worker -> END No account found."""
    monkeypatch.setattr(
        "app.db.repositories.get_worker_by_phone",
        lambda phone: None,
    )
    client.post("/ussd", data={"sessionId": "si", "phoneNumber": "254700000000", "text": ""})
    client.post("/ussd", data={"sessionId": "si", "phoneNumber": "254700000000", "text": "2"})
    r = client.post(
        "/ussd",
        data={"sessionId": "si", "phoneNumber": "254700000000", "text": "2*254798765432"},
    )
    assert r.status_code == 200
    assert r.text.startswith("END ")
    assert "No account found" in r.text


def test_ussd_flow_signin_found(client, monkeypatch):
    """Full flow: main -> 2 -> phone -> worker found -> END Signed in."""
    monkeypatch.setattr(
        "app.db.repositories.get_worker_by_phone",
        lambda phone: {"worker_id": "NW-XYZ9876", "phone": phone},
    )
    client.post("/ussd", data={"sessionId": "sf", "phoneNumber": "254700000000", "text": ""})
    client.post("/ussd", data={"sessionId": "sf", "phoneNumber": "254700000000", "text": "2"})
    r = client.post(
        "/ussd",
        data={"sessionId": "sf", "phoneNumber": "254700000000", "text": "2*254712345678"},
    )
    assert r.status_code == 200
    assert r.text.startswith("END ")
    assert "Signed in" in r.text
    assert "NW-XYZ9876" in r.text


def test_ussd_invalid_phone_register(client, monkeypatch):
    """Register flow with invalid phone -> END Invalid phone number."""
    client.post("/ussd", data={"sessionId": "inv", "phoneNumber": "254700000000", "text": ""})
    client.post("/ussd", data={"sessionId": "inv", "phoneNumber": "254700000000", "text": "1"})
    r = client.post(
        "/ussd",
        data={"sessionId": "inv", "phoneNumber": "254700000000", "text": "1*123"},
    )
    assert r.status_code == 200
    assert "END " in r.text
    assert "Invalid phone number" in r.text
