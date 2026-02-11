# Database package
import psycopg2
from psycopg2.extras import RealDictCursor
from app.config import Config


def get_connection():
    """
    Create and return a new PostgreSQL database connection using the configured DSN.
    
    Returns:
        connection (psycopg2.extensions.connection): A psycopg2 connection configured with RealDictCursor so query rows are returned as dicts. Caller is responsible for closing the connection or using it as a context manager.
    """
    return psycopg2.connect(Config.DATABASE_URL, cursor_factory=RealDictCursor)