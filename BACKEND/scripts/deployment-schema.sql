-- Shared counters survive separate serverless instances; no IP address is stored.
CREATE TABLE IF NOT EXISTS af_rate_limits (
 key_hash TEXT PRIMARY KEY,
 total_hits INTEGER NOT NULL CHECK(total_hits >= 0),
 reset_time TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS af_rate_limits_reset_idx ON af_rate_limits(reset_time);
