-- Database schema for NannyChain backend
-- Workers / Employers with Stellar wallet mapping

CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    worker_id VARCHAR(20) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'worker',   -- 'worker' | 'employer'
    stellar_public_key VARCHAR(56) UNIQUE NOT NULL,
    stellar_secret_encrypted TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workers_phone ON workers(phone);
CREATE INDEX IF NOT EXISTS idx_workers_worker_id ON workers(worker_id);
CREATE INDEX IF NOT EXISTS idx_workers_stellar_pk ON workers(stellar_public_key);

-- If running against an existing database, add the column with:
-- ALTER TABLE workers ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'worker';
