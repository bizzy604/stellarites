-- Database schema for NannyChain backend
-- Workers (domestic workers) with Stellar wallet mapping

CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(20) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    stellar_public_key VARCHAR(56) UNIQUE NOT NULL,
    stellar_secret_encrypted TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);
CREATE INDEX IF NOT EXISTS idx_workers_worker_id ON workers(worker_id);
