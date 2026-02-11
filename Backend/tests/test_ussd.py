"""Tests for POST /ussd."""
import pytest


@pytest.fixture(autouse=True)
def mock_redis(monkeypatch):
    """
    Replace Redis-backed session access with in-memory stubs for tests.
    
    Patches app.ussd.handler.get_session and app.ussd.handler.set_session to use a module-local
    in-memory session_store dict, preventing network access to Redis and keeping session data
    isolated to the test process.
    """
    session_store = {}

    def get_session(session_id):
        """
        Retrieve session data for a given session ID from the in-memory session store.
        
        Parameters:
            session_id (str): The session identifier to look up.
        
        Returns:
            dict: The session data associated with `session_id`, or an empty dict if none exists.
        """
        return session_store.get(session_id, {})

    def set_session(session_id, data):
        """
        Store the given session data in the in-memory session store under the provided session ID.
        
        Parameters:
            session_id (str): Identifier for the session; used as the key in the session store.
            data (dict): Session data to store; will replace any existing data for the session ID.
        """
        session_store[session_id] = data

    monkeypatch.setattr("app.ussd.handler.get_session", get_session)
    monkeypatch.setattr("app.ussd.handler.set_session", set_session)


def test_ussd_main_menu_returns_con(client):
    """Check that an initial USSD request with empty text presents a CON menu containing 'NannyChain' and 'Create account'."""
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