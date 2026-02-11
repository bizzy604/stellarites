# Database package – SQLite backend
import sqlite3
import os
from app.config import Config

_DB_PATH = Config.DB_PATH

# Schema executed once when the database file is first created
_SCHEMA = """
CREATE TABLE IF NOT EXISTS workers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    worker_id TEXT UNIQUE NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    name TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'worker',
    stellar_public_key TEXT UNIQUE NOT NULL,
    stellar_secret_encrypted TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);
CREATE INDEX IF NOT EXISTS idx_workers_worker_id ON workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_stellar_pk ON workers(stellar_public_key);

CREATE TABLE IF NOT EXISTS scheduled_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id TEXT UNIQUE NOT NULL,
    employer_id TEXT NOT NULL,
    worker_id TEXT NOT NULL,
    amount TEXT NOT NULL,
    frequency TEXT NOT NULL DEFAULT 'monthly',
    next_payment_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    memo TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (employer_id) REFERENCES workers(worker_id),
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id)
);
CREATE INDEX IF NOT EXISTS idx_sched_employer ON scheduled_payments(employer_id);
CREATE INDEX IF NOT EXISTS idx_sched_worker ON scheduled_payments(worker_id);
CREATE INDEX IF NOT EXISTS idx_sched_next ON scheduled_payments(next_payment_date);

CREATE TABLE IF NOT EXISTS payment_claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    claim_id TEXT UNIQUE NOT NULL,
    schedule_id TEXT,
    worker_id TEXT NOT NULL,
    employer_id TEXT NOT NULL,
    amount TEXT NOT NULL,
    message TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (schedule_id) REFERENCES scheduled_payments(schedule_id),
    FOREIGN KEY (worker_id) REFERENCES workers(worker_id),
    FOREIGN KEY (employer_id) REFERENCES workers(worker_id)
);
CREATE INDEX IF NOT EXISTS idx_claims_employer ON payment_claims(employer_id);
CREATE INDEX IF NOT EXISTS idx_claims_worker ON payment_claims(worker_id);

CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    review_id TEXT UNIQUE NOT NULL,
    reviewer_id TEXT NOT NULL,
    reviewee_id TEXT NOT NULL,
    reviewer_role TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comment TEXT DEFAULT '',
    schedule_id TEXT,
    stellar_tx_hash TEXT DEFAULT '',
    explorer_url TEXT DEFAULT '',
    nft_asset_code TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (reviewer_id) REFERENCES workers(worker_id),
    FOREIGN KEY (reviewee_id) REFERENCES workers(worker_id),
    UNIQUE(reviewer_id, reviewee_id, schedule_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
"""

_initialised = False


def _ensure_schema(conn: sqlite3.Connection):
    """Create tables if they don't exist yet."""
    global _initialised
    if not _initialised:
        conn.executescript(_SCHEMA)
        # Migrations: add columns that may be missing on existing tables
        for col, default in [
            ("stellar_tx_hash", "''"),
            ("explorer_url", "''"),
            ("nft_asset_code", "''"),
        ]:
            try:
                conn.execute(f"ALTER TABLE reviews ADD COLUMN {col} TEXT DEFAULT {default}")
            except Exception:
                pass  # column already exists
        _initialised = True


def get_connection() -> sqlite3.Connection:
    """
    Return a new SQLite connection.

    Rows are accessible by column name (sqlite3.Row).
    The schema is auto-created on the first call.
    """
    conn = sqlite3.connect(_DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    _ensure_schema(conn)
    return conn