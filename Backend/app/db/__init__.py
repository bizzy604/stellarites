# Database package
import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import Config


def get_connection():
    """Return a DB connection. Caller should close or use as context manager."""
    return psycopg2.connect(Config.DATABASE_URL, cursor_factory=RealDictCursor)
