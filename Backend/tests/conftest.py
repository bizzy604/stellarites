"""Pytest fixtures for NannyChain backend."""
import pytest
from fastapi.testclient import TestClient

from app.main import app


@pytest.fixture
def client():
    """
    Provide a FastAPI TestClient bound to the application's FastAPI instance for use in tests.
    
    Returns:
        TestClient: A TestClient instance configured with the application's FastAPI app.
    """
    return TestClient(app)