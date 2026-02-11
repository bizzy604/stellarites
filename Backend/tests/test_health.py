"""Tests for GET /health."""


def test_health_returns_ok(client):
    """Health endpoint returns 200 and status ok."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data == {"status": "ok"}
